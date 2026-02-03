from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.dateparse import parse_date
from django.db.models import (
    Sum, Count, F, Case, When, Value, FloatField, ExpressionWrapper
)
from datetime import datetime, time as dt_time
from django.utils import timezone
import time
import logging

from recaudos.models.recaudos_models import DetallesFacturaUnica, FacturaUnica
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from seguridad.models.transversal_models import Personas
from permissions.permissions_reportes import PermisoConsultarReporteLibroCompra
from recaudos.views.cartera_view import obtener_url_documento
from reportes.serializers.reportes_serializers import (
    FacturaUnicaRecaudadorSerializer,
    LibroCompraConsolidadoSerializer,
)
from reportes.utils import CustomPagination, formato_miles, formato_precio
from seguridad.utils import Util

logger = logging.getLogger(__name__)


# Reporte 1.1: Libro de compra
class FacturasPorRecaudadorView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarReporteLibroCompra]
    pagination_class = CustomPagination

    def get(self, request):
        id_recaudador = request.query_params.get('id_recaudador')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_final = request.query_params.get('fecha_final')
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']

        if not id_recaudador:
            return Response({
                "success": False,
                'detail': 'Parámetro requerido: id_recaudador'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not fecha_inicio or not fecha_final:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_final' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            Personas.objects.get(id_persona=id_recaudador)
        except Personas.DoesNotExist:
            return Response({
                "success": False,
                'detail': 'El recaudador no existe.'
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            fi = parse_date(fecha_inicio)
            ff = parse_date(fecha_final)
            if not fi or not ff:
                raise ValueError
            if fi > ff:
                return Response({
                    "success": False,
                    'detail': 'La fecha de inicio no puede ser mayor que la fecha final.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio' o 'fecha_final'."
            }, status=status.HTTP_400_BAD_REQUEST)

        filtros = {
            'id_persona_recaudador': id_recaudador,
            'fecha_compra__date__gte': fi,
            'fecha_compra__date__lte': ff,
        }

        facturas = FacturaUnica.objects.filter(**filtros).order_by('-nro_factura_unica')
        if not facturas.exists():
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)

        totales = facturas.aggregate(
            total_cuota_fomento=Sum('cuota_fomento'),
            total_kilos=Sum('total_kilos')
        )
        valor_cuota_fomento_total = totales['total_cuota_fomento'] or 0
        total_kilos = totales['total_kilos'] or 0

        if sin_paginacion:
            serializer = FacturaUnicaRecaudadorSerializer(facturas, many=True)
            return Response({
                'success': True,
                'data': {
                    'facturas': serializer.data,
                    'Valor_cuota_fomento_total': valor_cuota_fomento_total,
                    'total_kilos': total_kilos,
                    'total_registros': facturas.count()
                },
                'message': 'Facturas consultadas exitosamente (sin paginación).'
            }, status=status.HTTP_200_OK)
        else:
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(facturas, request)
            serializer = FacturaUnicaRecaudadorSerializer(page, many=True)
            return paginator.get_paginated_response({
                'facturas': serializer.data,
                'Valor_cuota_fomento_total': valor_cuota_fomento_total,
                'total_kilos': total_kilos
            })


class DescargarLibroCompraRecaudadorView(APIView):
    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_final = request.query_params.get('fecha_final')
        id_recaudador = request.query_params.get('id_recaudador')

        if not fecha_inicio or not fecha_final or not id_recaudador:
            return Response({
                "success": False,
                "detail": "Debe enviar los parámetros 'fecha_inicio', 'fecha_final' y 'id_recaudador'."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fi = parse_date(fecha_inicio)
            ff = parse_date(fecha_final)
            if not fi or not ff:
                raise ValueError
            if fi > ff:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio no puede ser mayor que la fecha final."
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio' o 'fecha_final'."
            }, status=status.HTTP_400_BAD_REQUEST)

        recaudador = Personas.objects.filter(id_persona=id_recaudador).first()
        if not recaudador:
            return Response({
                "success": False,
                "detail": "No se encontró el recaudador."
            }, status=status.HTTP_404_NOT_FOUND)

        facturas = FacturaUnica.objects.filter(
            id_persona_recaudador=recaudador,
            fecha_compra__date__gte=fi,
            fecha_compra__date__lte=ff
        ).select_related(
            'id_persona_proveedor',
            'id_municipio_cacao',
            'id_departamento_cacao',
            'id_liq_factura_unica'
        ).order_by('fecha_compra')

        if not facturas.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron facturas para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)

        items = []
        total_kilos = 0
        total_bruto = 0
        total_cuota = 0
        total_neto = 0

        for f in facturas:
            kilos = f.total_kilos or 0
            bruto = f.valor_bruto or 0
            cuota = f.cuota_fomento or 0
            neto = f.valor_neto or 0
            detalle = DetallesFacturaUnica.objects.filter(id_factura_unica=f).first()
            tipo_cacao = detalle.id_tipo_cacao.nombre if detalle and detalle.id_tipo_cacao else ""
            precio_kilo = detalle.valor_kilo if detalle else 0

            proveedor = f.id_persona_proveedor
            if proveedor:
                if proveedor.tipo_persona == 'N':
                    nombreproveedor = f"{proveedor.primer_nombre or ''} {proveedor.segundo_nombre or ''} {proveedor.primer_apellido or ''} {proveedor.segundo_apellido or ''}".strip()
                    nombreproveedor = ' '.join(nombreproveedor.split())
                else:
                    nombreproveedor = proveedor.razon_social or proveedor.nombre_comercial or ''
            else:
                nombreproveedor = ''

            items.append({
                "tcacao": tipo_cacao,
                "fcompra": f.fecha_compra.strftime('%d/%m/%Y') if f.fecha_compra else '',
                "nfactura": f.nro_factura_unica,
                "nitproveedor": proveedor.numero_documento if proveedor else '',
                "nombreproveedor": nombreproveedor,
                "municipio": f.id_municipio_cacao.nombre if f.id_municipio_cacao else '',
                "departamento": f.id_departamento_cacao.nombre if f.id_departamento_cacao else '',
                "kilos": formato_miles(kilos),
                "precio": formato_precio(precio_kilo),
                "vbruto": formato_precio(bruto),
                "cuota": formato_precio(cuota),
                "vneto": formato_precio(neto),
                "fpago": f.id_liq_factura_unica.fecha_pago.strftime('%d/%m/%Y') if f.id_liq_factura_unica and f.id_liq_factura_unica.fecha_pago else '',
                "docpago": f.id_liq_factura_unica.nro_doc_pago if f.id_liq_factura_unica else ''
            })

            total_kilos += kilos
            total_bruto += bruto
            total_cuota += cuota
            total_neto += neto

        if recaudador.tipo_persona == 'N':
            nombrerecaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
            nombrerecaudador = ' '.join(nombrerecaudador.split())
        else:
            nombrerecaudador = recaudador.razon_social or recaudador.nombre_comercial or ''

        if recaudador.tipo_persona == 'N':
            telefono_recaudador = recaudador.telefono_celular or ''
        else:
            telefono_recaudador = (
                recaudador.telefono_empresa or
                recaudador.telefono_celular_empresa or
                recaudador.telefono_empresa_2 or
                recaudador.telefono_celular or ''
            )

        if recaudador.tipo_persona == 'N':
            ciudad_recaudador = recaudador.municipio_residencia.nombre if hasattr(recaudador, 'municipio_residencia') and recaudador.municipio_residencia else ''
        else:
            if hasattr(recaudador, 'cod_municipio_notificacion_nal') and recaudador.cod_municipio_notificacion_nal:
                ciudad_recaudador = recaudador.cod_municipio_notificacion_nal.nombre
            elif hasattr(recaudador, 'cod_municipio_laboral_nal') and recaudador.cod_municipio_laboral_nal:
                ciudad_recaudador = recaudador.cod_municipio_laboral_nal.nombre
            elif hasattr(recaudador, 'municipio_residencia') and recaudador.municipio_residencia:
                ciudad_recaudador = recaudador.municipio_residencia.nombre
            else:
                ciudad_recaudador = ''

        variables = {
            "i": {
                "nombrerecaudador": nombrerecaudador,
                "tipodoc": recaudador.tipo_documento.nombre if recaudador.tipo_documento else '',
                "numerorecaudador": recaudador.numero_documento,
                "dirrecaudador": recaudador.direccion_notificaciones or '',
                "ciudadecaudador": ciudad_recaudador,
                "telerecaudador": telefono_recaudador,
                "emailrecaudador": recaudador.email or '',
                "fechainicio": fi.strftime('%d/%m/%Y'),
                "fechafinal": ff.strftime('%d/%m/%Y'),
                "totalkilos": formato_miles(total_kilos),
                "tvbruto": formato_precio(total_bruto),
                "tvcuotas": formato_precio(total_cuota),
                "tvneto": formato_precio(total_neto),
            },
            "items": items
        }

        plantilla = PlantillasDoc.objects.filter(nombre="Libro Compra Cacao Recaudador").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el reporte."
            }, status=status.HTTP_404_NOT_FOUND)

        url_documento = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()

        if not documento_generado or not documento_generado.documento_generado:
            return Response({
                "success": False,
                "detail": "No se encontró el documento generado."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "success": True,
            "detail": "Documento generado correctamente.",
            "data": {
                "id_documento_generado": documento_generado.id_documento_generado,
                "documento_generado": documento_generado.documento_generado.name,
                "archivo": Util.obtener_archivos(documento_generado.documento_generado.name)
            }
        }, status=status.HTTP_200_OK)


# Reporte 1.2: Libro de compra consolidado (listado)
class ReporteLibroCompraConsolidadoView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_final = request.query_params.get('fecha_final')
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']

        if not fecha_inicio or not fecha_final:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_final' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fi = parse_date(fecha_inicio)
            ff = parse_date(fecha_final)
            if not fi or not ff:
                raise ValueError
            if fi > ff:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio no puede ser mayor que la fecha final."
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio' o 'fecha_final'."
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = (
            FacturaUnica.objects.filter(
                fecha_compra__date__gte=fi,
                fecha_compra__date__lte=ff
            )
            .select_related(
                'id_persona_recaudador__tipo_documento',
                'id_persona_proveedor__tipo_documento',
                'id_municipio_cacao',
                'id_departamento_cacao'
            )
            .only(
                'id_factura_unica',
                'fecha_compra',
                'nro_factura_unica',
                'total_kilos',
                'valor_bruto',
                'cuota_fomento',
                'valor_neto',
                'estado_factura',
                'id_persona_recaudador__tipo_documento__nombre',
                'id_persona_recaudador__numero_documento',
                'id_persona_recaudador__tipo_persona',
                'id_persona_recaudador__primer_nombre',
                'id_persona_recaudador__segundo_nombre',
                'id_persona_recaudador__primer_apellido',
                'id_persona_recaudador__segundo_apellido',
                'id_persona_recaudador__razon_social',
                'id_persona_recaudador__nombre_comercial',
                'id_persona_proveedor__tipo_documento__nombre',
                'id_persona_proveedor__numero_documento',
                'id_persona_proveedor__tipo_persona',
                'id_persona_proveedor__primer_nombre',
                'id_persona_proveedor__primer_apellido',
                'id_persona_proveedor__razon_social',
                'id_persona_proveedor__nombre_comercial',
                'id_municipio_cacao__nombre',
                'id_departamento_cacao__nombre'
            )
            .order_by('-fecha_compra')
        )

        if not facturas.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron facturas para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)

        totales = facturas.aggregate(
            total_cuota_fomento=Sum('cuota_fomento'),
            total_kilos=Sum('total_kilos'),
            total_valor_bruto=Sum('valor_bruto'),
            total_valor_neto=Sum('valor_neto')
        )

        totales_data = {
            'valor_cuota_fomento_total': totales['total_cuota_fomento'] or 0,
            'total_kilos': totales['total_kilos'] or 0,
            'total_valor_bruto': totales['total_valor_bruto'] or 0,
            'total_valor_neto': totales['total_valor_neto'] or 0
        }

        if sin_paginacion:
            serializer = LibroCompraConsolidadoSerializer(facturas, many=True)
            return Response({
                'success': True,
                'data': {
                    'facturas': serializer.data,
                    'totales': totales_data,
                    'total_registros': facturas.count()
                },
                'message': 'Reporte consolidado consultado exitosamente (sin paginación).'
            }, status=status.HTTP_200_OK)
        else:
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(facturas, request)
            serializer = LibroCompraConsolidadoSerializer(page, many=True)
            return paginator.get_paginated_response({
                'facturas': serializer.data,
                'totales': totales_data
            })


# Descargar libro de compra consolidado
class DescargarReporteLibroCompraConsolidadoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha_inicio_str = request.query_params.get('fecha_inicio')
        fecha_final_str = request.query_params.get('fecha_final')

        if not fecha_inicio_str or not fecha_final_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_final' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            t0 = time.perf_counter()
            fi = parse_date(fecha_inicio_str)
            ff = parse_date(fecha_final_str)
            if not fi or not ff:
                raise ValueError
            if fi > ff:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio no puede ser mayor que la fecha final."
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio' o 'fecha_final'."
            }, status=status.HTTP_400_BAD_REQUEST)

        fi_dt = timezone.make_aware(datetime.combine(fi, dt_time.min), timezone.get_current_timezone())
        ff_dt = timezone.make_aware(datetime.combine(ff, dt_time.max), timezone.get_current_timezone())
        t_parse = time.perf_counter() - t0
        print(f"[console.log][Reporte 1.2] parse fechas: {t_parse*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] parse fechas: %.1f ms", t_parse*1000)

        t_qs0 = time.perf_counter()
        base_qs = (
            FacturaUnica.objects
            .filter(
                fecha_compra__gte=fi_dt,
                fecha_compra__lte=ff_dt
            )
            .annotate(
                precio_kilo=Case(
                    When(
                        total_kilos__gt=0,
                        then=ExpressionWrapper(F('valor_bruto') / F('total_kilos'), output_field=FloatField())
                    ),
                    default=Value(0.0),
                    output_field=FloatField()
                )
            )
            .order_by('fecha_compra')
        )
        t_qs_built = time.perf_counter() - t_qs0
        print(f"[console.log][Reporte 1.2] construir queryset: {t_qs_built*1000:.1f} ms (lazy)", flush=True)
        logger.info("[Reporte 1.2] construir queryset (lazy): %.1f ms", t_qs_built*1000)

        t_agg0 = time.perf_counter()
        agg = base_qs.aggregate(
            total_kilos=Sum('total_kilos'),
            total_bruto=Sum('valor_bruto'),
            total_cuota=Sum('cuota_fomento'),
            total_neto=Sum('valor_neto'),
            registros=Count('id_factura_unica')
        )
        t_agg = time.perf_counter() - t_agg0
        print(f"[console.log][Reporte 1.2] aggregate: {t_agg*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] aggregate: %.1f ms", t_agg*1000)
        if not agg.get('registros'):
            return Response({
                "success": False,
                "detail": "No se encontraron facturas para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)

        total_kilos = agg['total_kilos'] or 0
        total_bruto = agg['total_bruto'] or 0
        total_cuota = agg['total_cuota'] or 0
        total_neto = agg['total_neto'] or 0

        t_vals0 = time.perf_counter()
        facturas_qs = base_qs.values(
            'fecha_compra',
            'nro_factura_unica',
            'total_kilos',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            'precio_kilo',
            'id_persona_recaudador__numero_documento',
            'id_persona_recaudador__tipo_persona',
            'id_persona_recaudador__primer_nombre',
            'id_persona_recaudador__primer_apellido',
            'id_persona_recaudador__razon_social',
            'id_persona_recaudador__nombre_comercial',
            'id_persona_proveedor__numero_documento',
            'id_persona_proveedor__tipo_persona',
            'id_persona_proveedor__primer_nombre',
            'id_persona_proveedor__primer_apellido',
            'id_persona_proveedor__razon_social',
            'id_persona_proveedor__nombre_comercial',
            'id_municipio_cacao__nombre',
            'id_departamento_cacao__nombre',
        )

        t_iter0 = time.perf_counter()
        
        # Pre-cargar datos en batch para evitar iteración lenta
        t_fetch0 = time.perf_counter()
        facturas_list = list(facturas_qs)  # Cargar todo en memoria de una vez
        t_fetch = time.perf_counter() - t_fetch0
        print(f"[console.log][Reporte 1.2] fetch all data: {t_fetch*1000:.1f} ms ({len(facturas_list)} filas)", flush=True)
        logger.info("[Reporte 1.2] fetch all data: %.1f ms (%d filas)", t_fetch*1000, len(facturas_list))
        
        # Procesar con list comprehension (más rápido que loop)
        t_process0 = time.perf_counter()
        
        def process_row(f):
            """Procesar una fila de manera optimizada"""
            kilos = f.get('total_kilos') or 0
            bruto = f.get('valor_bruto') or 0
            cuota = f.get('cuota_fomento') or 0
            neto = f.get('valor_neto') or 0
            precio_kilo = float(f.get('precio_kilo') or 0)
            
            # Optimizar construcción de nombres (una sola operación)
            tipo_rec = f.get('id_persona_recaudador__tipo_persona')
            tipo_prov = f.get('id_persona_proveedor__tipo_persona')
            
            # Usar operador ternario (más rápido que if/else)
            nombrerecaudador = (
                f"{f.get('id_persona_recaudador__primer_nombre', '')} {f.get('id_persona_recaudador__primer_apellido', '')}".strip()
                if tipo_rec == 'N' 
                else (f.get('id_persona_recaudador__razon_social') or f.get('id_persona_recaudador__nombre_comercial') or '')
            )
            
            nombreproveedor = (
                f"{f.get('id_persona_proveedor__primer_nombre', '')} {f.get('id_persona_proveedor__primer_apellido', '')}".strip()
                if tipo_prov == 'N'
                else (f.get('id_persona_proveedor__razon_social') or f.get('id_persona_proveedor__nombre_comercial') or '')
            )

            # Formatear fecha de manera eficiente
            fecha_compra = f.get('fecha_compra')
            fcompra = fecha_compra.strftime('%d/%m/%Y') if fecha_compra else ''

            return {
                "ndocumento": f.get('id_persona_recaudador__numero_documento', ''),
                "nombrerecaudador": nombrerecaudador,
                "fcompra": fcompra,
                "nfactura": f.get('nro_factura_unica'),
                "nitproveedor": f.get('id_persona_proveedor__numero_documento', ''),
                "nombreproveedor": nombreproveedor,
                "municipio": f.get('id_municipio_cacao__nombre', ''),
                "departamento": f.get('id_departamento_cacao__nombre', ''),
                "kilos": formato_miles(kilos),
                "precio": formato_precio(precio_kilo),
                "vbruto": formato_precio(bruto),
                "cuota": formato_precio(cuota),
                "vneto": formato_precio(neto)
            }
        
        # Usar list comprehension (más rápido que for loop con append)
        items = [process_row(f) for f in facturas_list]
        
        t_process = time.perf_counter() - t_process0
        print(f"[console.log][Reporte 1.2] process rows: {t_process*1000:.1f} ms ({len(items)} items)", flush=True)
        logger.info("[Reporte 1.2] process rows: %.1f ms (%d items)", t_process*1000, len(items))
        
        t_vals = time.perf_counter() - t_vals0
        print(f"[console.log][Reporte 1.2] values()+iteración TOTAL: {t_vals*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] values()+iteración TOTAL: %.1f ms", t_vals*1000)

        variables = {
            "i": {
                "fechainicio": fi.strftime('%d/%m/%Y'),
                "fechafinal": ff.strftime('%d/%m/%Y'),
                "totalkilos": formato_miles(total_kilos),
                "tvbruto": formato_precio(total_bruto),
                "tvcuotas": formato_precio(total_cuota),
                "tvneto": formato_precio(total_neto)
            },
            "items": items
        }

        t_tpl0 = time.perf_counter()
        plantilla = PlantillasDoc.objects.filter(nombre="Libro Compra Fecha").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el documento."
            }, status=status.HTTP_404_NOT_FOUND)
        t_tpl = time.perf_counter() - t_tpl0
        print(f"[console.log][Reporte 1.2] cargar plantilla: {t_tpl*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] cargar plantilla: %.1f ms", t_tpl*1000)

        t_doc0 = time.perf_counter()
        url_documento = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        t_docgen = time.perf_counter() - t_doc0
        print(f"[console.log][Reporte 1.2] obtener_url_documento: {t_docgen*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] obtener_url_documento: %.1f ms", t_docgen*1000)

        t_dbdoc0 = time.perf_counter()
        # Evitamos otra consulta si no es necesario; pero si queremos el FileField actualizado, hacemos un get directo
        documento_generado = DocumentosGenerados.objects.only('id_documento_generado', 'documento_generado').filter(id_documento_generado=url_documento).first()
        t_dbdoc = time.perf_counter() - t_dbdoc0
        print(f"[console.log][Reporte 1.2] consultar DocumentosGenerados: {t_dbdoc*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] consultar DocumentosGenerados: %.1f ms", t_dbdoc*1000)

        if not documento_generado or not documento_generado.documento_generado:
            return Response({
                "success": False,
                "detail": "No se encontró el documento generado."
            }, status=status.HTTP_404_NOT_FOUND)

        t_arch0 = time.perf_counter()
        archivo_val = Util.obtener_archivos(documento_generado.documento_generado.name)
        t_arch = time.perf_counter() - t_arch0
        print(f"[console.log][Reporte 1.2] Util.obtener_archivos: {t_arch*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] Util.obtener_archivos: %.1f ms", t_arch*1000)

        data_response = {
            "id_documento_generado": documento_generado.id_documento_generado,
            "documento_generado": documento_generado.documento_generado.name,
            "archivo": archivo_val
        }

        t_total = time.perf_counter() - t0
        print(f"[console.log][Reporte 1.2] TOTAL request: {t_total*1000:.1f} ms", flush=True)
        logger.info("[Reporte 1.2] TOTAL request: %.1f ms", t_total*1000)

        return Response({
            "success": True,
            "detail": "Documento generado correctamente.",
            "data": data_response
        }, status=status.HTTP_200_OK)
