from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from recaudos.models.recaudos_models import DetallesFacturaUnica, FacturaUnica, PorcentajesCobro
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.views.cartera_view import obtener_url_documento
from reportes.serializers.reportes_serializers import ReporteConsolidadoSerializer
from seguridad.utils import Util
from django.utils.dateparse import parse_date
from django.db.models import Sum, Q, Value
from django.db.models.functions import Concat
from reportes.utils import CustomPagination, formato_miles, formato_precio
from datetime import datetime, time as dt_time
from django.utils import timezone
import time


#Reporte 2: REPORTE CONSOLIDADO PAGO CUOTA DE FOMENTO
class ReporteConsolidadoPagoCuotaFomentoView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
        import time
        start_time = time.time()
        print("=== INICIO REPORTE CONSOLIDADO PAGO CUOTA FOMENTO ===")
        filtros = {}

        # Parámetros de ubicación
        id_departamento_cacao = request.query_params.get('id_departamento_cacao')
        id_municipio_cacao = request.query_params.get('id_municipio_cacao')
        sin_paginacion_raw = request.query_params.get('sin_paginacion', 'false')
        sin_paginacion = sin_paginacion_raw.lower() in ['true', '1', 'si', 'yes']
        
        print(f"Parámetros recibidos:")
        print(f"  - sin_paginacion_raw: '{sin_paginacion_raw}'")
        print(f"  - sin_paginacion: {sin_paginacion}")
        print(f"  - id_departamento_cacao: {id_departamento_cacao}")
        print(f"  - id_municipio_cacao: {id_municipio_cacao}")
        print(f"  - Todos los query_params: {dict(request.query_params)}")

        if id_departamento_cacao:
            filtros['id_departamento_cacao'] = id_departamento_cacao
        if id_municipio_cacao:
            filtros['id_municipio_cacao'] = id_municipio_cacao

        # Fechas (respecto a LiquidacionesFacturaUnica.fecha_pago)
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_final = request.query_params.get('fecha_final')

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_final:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_final' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_inicio = parse_date(fecha_inicio)
            fecha_final = parse_date(fecha_final)
            if not fecha_inicio or not fecha_final:
                raise ValueError
            if fecha_inicio > fecha_final:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio no puede ser mayor que la fecha final."
                }, status=status.HTTP_400_BAD_REQUEST)
            filtros['id_liq_factura_unica__fecha_pago__date__gte'] = fecha_inicio
            filtros['id_liq_factura_unica__fecha_pago__date__lte'] = fecha_final
            print(f"Fechas procesadas:")
            print(f"  - fecha_inicio: {fecha_inicio}")
            print(f"  - fecha_final: {fecha_final}")
        except:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio' o 'fecha_final'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Parámetros de proveedor
        numero_documento_proveedor = request.query_params.get('numero_documento_proveedor')
        nombres_proveedor = request.query_params.get('nombres_proveedor')

        if numero_documento_proveedor:
            filtros['id_persona_proveedor__numero_documento'] = numero_documento_proveedor

        # Parámetro unificado de recaudador
        recaudador = request.query_params.get('recaudador')
        numero_documento_recaudador = request.query_params.get('numero_documento_recaudador')

        if numero_documento_recaudador:
            filtros['id_persona_recaudador__numero_documento'] = numero_documento_recaudador

        # Consulta base
        facturas_time = time.time()
        facturas = FacturaUnica.objects.filter(estado_factura = 'PA')
        facturas = facturas.filter(**filtros)
        print(f"Filtros aplicados: {filtros}")
        print(f"Total facturas base encontradas: {facturas.count()}")
        print(f"⏱️ Tiempo consulta facturas base: {time.time() - facturas_time:.2f}s")

        # Filtro avanzado recaudador 
        if recaudador:
            facturas = facturas.annotate(
                nombre_completo=Concat(
                    'id_persona_recaudador__primer_nombre', Value(' '),
                    'id_persona_recaudador__segundo_nombre', Value(' '),
                    'id_persona_recaudador__primer_apellido', Value(' '),
                    'id_persona_recaudador__segundo_apellido'
                ),
                nombres=Concat(
                    'id_persona_recaudador__primer_nombre', Value(' '),
                    'id_persona_recaudador__segundo_nombre'
                ),
                primer_nombre_apellido=Concat(
                    'id_persona_recaudador__primer_nombre', Value(' '),
                    'id_persona_recaudador__primer_apellido'
                ),
                primer_nombre_segundo_apellido=Concat(
                    'id_persona_recaudador__primer_nombre', Value(' '),
                    'id_persona_recaudador__segundo_apellido'
                ),
                segundo_nombre_apellido=Concat(
                    'id_persona_recaudador__segundo_nombre', Value(' '),
                    'id_persona_recaudador__primer_apellido'
                ),
                segundo_nombre_segundo_apellido=Concat(
                    'id_persona_recaudador__segundo_nombre', Value(' '),
                    'id_persona_recaudador__segundo_apellido'
                ),
            ).filter(
                Q(nombre_completo__icontains=recaudador) |
                Q(nombres__icontains=recaudador) |
                Q(primer_nombre_apellido__icontains=recaudador) |
                Q(primer_nombre_segundo_apellido__icontains=recaudador) |
                Q(segundo_nombre_apellido__icontains=recaudador) |
                Q(segundo_nombre_segundo_apellido__icontains=recaudador) |
                Q(id_persona_recaudador__primer_nombre__icontains=recaudador) |
                Q(id_persona_recaudador__segundo_nombre__icontains=recaudador) |
                Q(id_persona_recaudador__primer_apellido__icontains=recaudador) |
                Q(id_persona_recaudador__segundo_apellido__icontains=recaudador) |
                Q(id_persona_recaudador__razon_social__icontains=recaudador)
            )

        # Filtro avanzado proveedor (combinaciones)
        if nombres_proveedor:
            facturas = facturas.annotate(
                proveedor_nombre_completo=Concat(
                    'id_persona_proveedor__primer_nombre', Value(' '),
                    'id_persona_proveedor__segundo_nombre', Value(' '),
                    'id_persona_proveedor__primer_apellido', Value(' '),
                    'id_persona_proveedor__segundo_apellido'
                ),
                proveedor_nombres=Concat(
                    'id_persona_proveedor__primer_nombre', Value(' '),
                    'id_persona_proveedor__segundo_nombre'
                ),
                proveedor_primer_nombre_apellido=Concat(
                    'id_persona_proveedor__primer_nombre', Value(' '),
                    'id_persona_proveedor__primer_apellido'
                ),
                proveedor_primer_nombre_segundo_apellido=Concat(
                    'id_persona_proveedor__primer_nombre', Value(' '),
                    'id_persona_proveedor__segundo_apellido'
                ),
                proveedor_segundo_nombre_apellido=Concat(
                    'id_persona_proveedor__segundo_nombre', Value(' '),
                    'id_persona_proveedor__primer_apellido'
                ),
                proveedor_segundo_nombre_segundo_apellido=Concat(
                    'id_persona_proveedor__segundo_nombre', Value(' '),
                    'id_persona_proveedor__segundo_apellido'
                ),
            ).filter(
                Q(proveedor_nombre_completo__icontains=nombres_proveedor) |
                Q(proveedor_nombres__icontains=nombres_proveedor) |
                Q(proveedor_primer_nombre_apellido__icontains=nombres_proveedor) |
                Q(proveedor_primer_nombre_segundo_apellido__icontains=nombres_proveedor) |
                Q(proveedor_segundo_nombre_apellido__icontains=nombres_proveedor) |
                Q(proveedor_segundo_nombre_segundo_apellido__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__primer_nombre__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__razon_social__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__nombre_comercial__icontains=nombres_proveedor)
            )

        # Consulta final
        facturas = facturas.order_by('-nro_factura_unica')
        print(f"Total facturas después de filtros avanzados: {facturas.count()}")

        if not facturas.exists():
            print("ERROR: No se encontraron facturas")
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Optimizar consulta de detalles con select_related y ordenación
        detalles_time = time.time()
        detalle_facturas = DetallesFacturaUnica.objects.filter(
            id_factura_unica__in=facturas
        ).select_related(
            'id_factura_unica__id_persona_recaudador',
            'id_factura_unica__id_persona_proveedor', 
            'id_factura_unica__id_municipio_cacao',
            'id_factura_unica__id_departamento_cacao',
            'id_factura_unica__id_liq_factura_unica',
            'id_tipo_cacao'
        ).order_by('-id_factura_unica__nro_factura_unica', 'id_detalle_factura_unica')
        print(f"Total detalles de facturas encontrados: {detalle_facturas.count()}")
        print(f"⏱️ Tiempo consulta detalles: {time.time() - detalles_time:.2f}s")

        # Calcular totales tanto de facturas como de detalles
        totales_facturas = facturas.aggregate(
            total_cuota_fomento=Sum('cuota_fomento'),
            total_kilos_facturas=Sum('total_kilos'),
            total_valor_bruto=Sum('valor_bruto'),
            total_valor_neto=Sum('valor_neto')
        )
        print(f"Totales calculados: {totales_facturas}")
        
        # Optimizar cálculo de kilos ajustado usando agregación en BD
        from django.db.models import Case, When, F, DecimalField
        
        porcentaje_cacao = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').first()
        porcentaje_valor = porcentaje_cacao.valor if porcentaje_cacao else 1
        print(f"Porcentaje cacao encontrado: {porcentaje_valor}")
        
        # Calcular kilos ajustados directamente en la BD (más eficiente)
        total_kilos_ajustado = detalle_facturas.aggregate(
            total_kilos_ajustado=Sum(
                Case(
                    When(id_tipo_cacao__nombre='Cacao en baba', 
                         then=F('nro_kilos') * porcentaje_valor),
                    default=F('nro_kilos'),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
        )['total_kilos_ajustado'] or 0
        
        print(f"Total kilos ajustado calculado (optimizado): {total_kilos_ajustado}")

        # Lógica condicional para paginación
        if sin_paginacion:
            print("=== PROCESANDO SIN PAGINACIÓN ===")
            
            # Sin paginación: convertir a lista para evitar múltiples consultas
            lista_time = time.time()
            detalle_facturas_list = list(detalle_facturas)
            total_registros = len(detalle_facturas_list)
            print(f"Detalles convertidos a lista. Total registros: {total_registros}")
            print(f"⏱️ Tiempo conversión a lista: {time.time() - lista_time:.2f}s")
            
            # Serialización optimizada manual para sin paginación
            serializer_time = time.time()
            
            # Crear datos manualmente sin usar DRF serializer (más rápido)
            serialized_data = []
            porcentaje_cacao = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').first()
            porcentaje_valor = porcentaje_cacao.valor if porcentaje_cacao else 1
            
            for detalle in detalle_facturas_list:
                # Calcular total_kilos
                if detalle.id_tipo_cacao.nombre == 'Cacao en baba':
                    total_kilos = detalle.nro_kilos * porcentaje_valor
                else:
                    total_kilos = detalle.nro_kilos
                
                # Nombre recaudador
                recaudador = detalle.id_factura_unica.id_persona_recaudador
                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial
                
                # Nombre proveedor
                proveedor = detalle.id_factura_unica.id_persona_proveedor
                if proveedor.tipo_persona == 'N':
                    nombre_proveedor = f"{proveedor.primer_nombre} {proveedor.primer_apellido}"
                else:
                    nombre_proveedor = proveedor.razon_social or proveedor.nombre_comercial
                
                item = {
                    'id_persona_recaudador': str(recaudador.id_persona),
                    'nombre_recaudador': nombre_recaudador,
                    'tipo_documento_recaudador': recaudador.tipo_documento.nombre if recaudador.tipo_documento else None,
                    'nro_documento_recaudador': recaudador.numero_documento,
                    'id_tipo_cacao': detalle.id_tipo_cacao.id_tipo_cacao,
                    'nombre_tipo_cacao': detalle.id_tipo_cacao.nombre,
                    'nro_factura_unica': detalle.id_factura_unica.nro_factura_unica,
                    'fecha_compra': str(detalle.id_factura_unica.fecha_compra) if detalle.id_factura_unica.fecha_compra else None,
                    'fecha_creacion': str(detalle.id_factura_unica.fecha_creacion) if detalle.id_factura_unica.fecha_creacion else None,
                    'tipo_documento_proveedor': proveedor.tipo_documento.nombre if proveedor.tipo_documento else None,
                    'nro_documento_proveedor': proveedor.numero_documento,
                    'nombre_proveedor': nombre_proveedor,
                    'id_municipio_cacao': detalle.id_factura_unica.id_municipio_cacao.cod_municipio if detalle.id_factura_unica.id_municipio_cacao else None,
                    'municipio_cacao_nombre': detalle.id_factura_unica.id_municipio_cacao.nombre if detalle.id_factura_unica.id_municipio_cacao else None,
                    'id_departamento_cacao': detalle.id_factura_unica.id_departamento_cacao.cod_departamento if detalle.id_factura_unica.id_departamento_cacao else None,
                    'departamento_cacao_nombre': detalle.id_factura_unica.id_departamento_cacao.nombre if detalle.id_factura_unica.id_departamento_cacao else None,
                    'total_kilos': float(total_kilos),
                    'nro_kilos': float(detalle.nro_kilos),
                    'valor_bruto': float(detalle.id_factura_unica.valor_bruto) if detalle.id_factura_unica.valor_bruto else 0,
                    'cuota_fomento': float(detalle.id_factura_unica.cuota_fomento) if detalle.id_factura_unica.cuota_fomento else 0,
                    'valor_neto': float(detalle.id_factura_unica.valor_neto) if detalle.id_factura_unica.valor_neto else 0,
                    'valor_kilo': float(detalle.valor_kilo) if detalle.valor_kilo else 0,
                    'nro_documento_soporte': detalle.id_factura_unica.nro_documento_soporte,
                    'doc_pago_url': None,  # Temporalmente null por performance
                    'fecha_pago': str(detalle.id_factura_unica.id_liq_factura_unica.fecha_pago) if detalle.id_factura_unica.id_liq_factura_unica and detalle.id_factura_unica.id_liq_factura_unica.fecha_pago else None,
                    'nro_doc_pago': detalle.id_factura_unica.id_liq_factura_unica.nro_doc_pago if detalle.id_factura_unica.id_liq_factura_unica else None,
                }
                serialized_data.append(item)
            
            print(f"Serialización manual completada. Total items: {len(serialized_data)}")
            print(f"⏱️ Tiempo serialización manual: {time.time() - serializer_time:.2f}s")
            
            response_data = {
                'success': True,
                'data': {
                    'facturas': serialized_data,
                    'totales': {
                        'valor_cuota_fomento_total': totales_facturas['total_cuota_fomento'] or 0,
                        'total_kilos_facturas': totales_facturas['total_kilos_facturas'] or 0,
                        'total_kilos_ajustado': total_kilos_ajustado,
                        'total_valor_bruto': totales_facturas['total_valor_bruto'] or 0,
                        'total_valor_neto': totales_facturas['total_valor_neto'] or 0
                    },
                    'total_registros': total_registros
                },
                'message': 'Reporte consolidado consultado exitosamente (sin paginación).'
            }
            print("=== RESPUESTA SIN PAGINACIÓN LISTA ===")
            print(f"⏱️ TIEMPO TOTAL: {time.time() - start_time:.2f}s")
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            print("=== PROCESANDO CON PAGINACIÓN ===")
            # Con paginación: usar el paginador
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(detalle_facturas, request)
            serializer = ReporteConsolidadoSerializer(page, many=True)
            print(f"Paginación aplicada. Items en página: {len(page) if page else 0}")

            response = paginator.get_paginated_response({
                'facturas': serializer.data,
                'totales': {
                    'valor_cuota_fomento_total': totales_facturas['total_cuota_fomento'] or 0,
                    'total_kilos_facturas': totales_facturas['total_kilos_facturas'] or 0,
                    'total_kilos_ajustado': total_kilos_ajustado,
                    'total_valor_bruto': totales_facturas['total_valor_bruto'] or 0,
                    'total_valor_neto': totales_facturas['total_valor_neto'] or 0
                }
            })
            print("=== RESPUESTA CON PAGINACIÓN LISTA ===")
            return response
    


class DescargarReporteConsolidadoPagoCuotaFomentoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Métricas de rendimiento
        t0 = time.perf_counter()

        # Filtros de ubicación (opcionales)
        id_departamento_cacao = request.query_params.get('id_departamento_cacao')
        id_municipio_cacao = request.query_params.get('id_municipio_cacao')

        # Fechas del pago (obligatorias) sobre LiquidacionesFacturaUnica.fecha_pago
        fecha_inicio_str = request.query_params.get('fecha_inicio')
        fecha_final_str = request.query_params.get('fecha_final')
        if not fecha_inicio_str or not fecha_final_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_final' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Parsear y validar fechas; usar rango aware para evitar __date (mejor desempeño)
        try:
            fi_date = parse_date(fecha_inicio_str)
            ff_date = parse_date(fecha_final_str)
            if not fi_date or not ff_date:
                raise ValueError
            if fi_date > ff_date:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio no puede ser mayor que la fecha final."
                }, status=status.HTTP_400_BAD_REQUEST)
            tz = timezone.get_current_timezone()
            fi_dt = timezone.make_aware(datetime.combine(fi_date, dt_time.min), tz)
            ff_dt = timezone.make_aware(datetime.combine(ff_date, dt_time.max), tz)
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio' o 'fecha_final'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Filtros opcionales adicionales
        numero_documento_proveedor = request.query_params.get('numero_documento_proveedor')
        nombres_proveedor = request.query_params.get('nombres_proveedor')
        recaudador = request.query_params.get('recaudador')
        numero_documento_recaudador = request.query_params.get('numero_documento_recaudador')

        # Query base (lazy)
        facturas = (
            FacturaUnica.objects
            .filter(
                estado_factura='PA',
                id_liq_factura_unica__fecha_pago__gte=fi_dt,
                id_liq_factura_unica__fecha_pago__lte=ff_dt,
                **({ 'id_departamento_cacao': id_departamento_cacao } if id_departamento_cacao else {}),
                **({ 'id_municipio_cacao': id_municipio_cacao } if id_municipio_cacao else {}),
                **({ 'id_persona_proveedor__numero_documento': numero_documento_proveedor } if numero_documento_proveedor else {}),
                **({ 'id_persona_recaudador__numero_documento': numero_documento_recaudador } if numero_documento_recaudador else {}),
            )
        )

        # Búsquedas por texto (anotate + filter)
        if recaudador:
            facturas = facturas.annotate(
                nombre_completo=Concat(
                    'id_persona_recaudador__primer_nombre', Value(' '),
                    'id_persona_recaudador__segundo_nombre', Value(' '),
                    'id_persona_recaudador__primer_apellido', Value(' '),
                    'id_persona_recaudador__segundo_apellido'
                )
            ).filter(
                Q(nombre_completo__icontains=recaudador) |
                Q(id_persona_recaudador__razon_social__icontains=recaudador)
            )

        if nombres_proveedor:
            facturas = facturas.annotate(
                proveedor_nombre_completo=Concat(
                    'id_persona_proveedor__primer_nombre', Value(' '),
                    'id_persona_proveedor__segundo_nombre', Value(' '),
                    'id_persona_proveedor__primer_apellido', Value(' '),
                    'id_persona_proveedor__segundo_apellido'
                )
            ).filter(
                Q(proveedor_nombre_completo__icontains=nombres_proveedor) |
                Q(id_persona_proveedor__razon_social__icontains=nombres_proveedor)
            )

        if not facturas.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron datos con los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Totales agregados (una sola pasada)
        t_agg0 = time.perf_counter()
        totales = facturas.aggregate(
            total_kilos=Sum('total_kilos'),
            total_bruto=Sum('valor_bruto'),
            total_cuota=Sum('cuota_fomento'),
            total_neto=Sum('valor_neto'),
        )
        t_agg = time.perf_counter() - t_agg0
        print(f"[console.log][Reporte 2] aggregate totales: {t_agg*1000:.1f} ms", flush=True)

        total_kilos = totales['total_kilos'] or 0
        total_bruto = totales['total_bruto'] or 0
        total_cuota = totales['total_cuota'] or 0
        total_neto = totales['total_neto'] or 0

        # Factor de ajuste para cacao en baba
        porcentaje_cacao = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').values_list('valor', flat=True).first() or 1
        factor_apr = float(porcentaje_cacao)

        # Detalles optimizados (values) evitando N+1
        t_vals0 = time.perf_counter()
        detalles_qs = (
            DetallesFacturaUnica.objects
            .filter(
                id_factura_unica__in=facturas.values('id_factura_unica'),
                id_factura_unica__id_liq_factura_unica__fecha_pago__gte=fi_dt,
                id_factura_unica__id_liq_factura_unica__fecha_pago__lte=ff_dt,
            )
            .values(
                'nro_kilos', 'valor_kilo', 'id_tipo_cacao__nombre',
                'id_factura_unica__fecha_compra', 'id_factura_unica__nro_factura_unica',
                'id_factura_unica__total_kilos', 'id_factura_unica__valor_bruto',
                'id_factura_unica__cuota_fomento', 'id_factura_unica__valor_neto',
                'id_factura_unica__id_persona_recaudador__numero_documento',
                'id_factura_unica__id_persona_recaudador__tipo_persona',
                'id_factura_unica__id_persona_recaudador__primer_nombre',
                'id_factura_unica__id_persona_recaudador__primer_apellido',
                'id_factura_unica__id_persona_recaudador__razon_social',
                'id_factura_unica__id_persona_recaudador__nombre_comercial',
                'id_factura_unica__id_persona_proveedor__numero_documento',
                'id_factura_unica__id_persona_proveedor__tipo_persona',
                'id_factura_unica__id_persona_proveedor__primer_nombre',
                'id_factura_unica__id_persona_proveedor__primer_apellido',
                'id_factura_unica__id_persona_proveedor__razon_social',
                'id_factura_unica__id_persona_proveedor__nombre_comercial',
                'id_factura_unica__id_municipio_cacao__nombre',
                'id_factura_unica__id_departamento_cacao__nombre',
                'id_factura_unica__id_liq_factura_unica__nro_doc_pago',
                'id_factura_unica__id_liq_factura_unica__fecha_pago',
            )
        )
        detalles_list = list(detalles_qs)
        t_vals = time.perf_counter() - t_vals0
        print(f"[console.log][Reporte 2] fetch detalles: {t_vals*1000:.1f} ms ({len(detalles_list)} filas)", flush=True)

        # Construir items (rápido y claro)
        t_proc0 = time.perf_counter()
        items = []
        for df in detalles_list:
            tipo_cacao = df.get('id_tipo_cacao__nombre') or ''
            nro_kilos = float(df.get('nro_kilos') or 0)
            total_kilos_apr = nro_kilos * factor_apr if tipo_cacao == 'Cacao en baba' else nro_kilos

            tipo_rec = df.get('id_factura_unica__id_persona_recaudador__tipo_persona')
            nombrerecaudador = (
                f"{df.get('id_factura_unica__id_persona_recaudador__primer_nombre', '')} {df.get('id_factura_unica__id_persona_recaudador__primer_apellido', '')}".strip()
                if tipo_rec == 'N'
                else (df.get('id_factura_unica__id_persona_recaudador__razon_social') or df.get('id_factura_unica__id_persona_recaudador__nombre_comercial') or '')
            )

            tipo_prov = df.get('id_factura_unica__id_persona_proveedor__tipo_persona')
            nombreproveedor = (
                f"{df.get('id_factura_unica__id_persona_proveedor__primer_nombre', '')} {df.get('id_factura_unica__id_persona_proveedor__primer_apellido', '')}".strip()
                if tipo_prov == 'N'
                else (df.get('id_factura_unica__id_persona_proveedor__razon_social') or df.get('id_factura_unica__id_persona_proveedor__nombre_comercial') or '')
            )

            fecha_compra = df.get('id_factura_unica__fecha_compra')
            fcompra = fecha_compra.strftime('%d/%m/%Y') if fecha_compra else ''

            items.append({
                "ndocumento": df.get('id_factura_unica__id_persona_recaudador__numero_documento', ''),
                "nombrerecaudador": nombrerecaudador,
                "tcacao": tipo_cacao,
                "fcompra": fcompra,
                "nfactura": df.get('id_factura_unica__nro_factura_unica'),
                "nitproveedor": df.get('id_factura_unica__id_persona_proveedor__numero_documento', ''),
                "nombreproveedor": nombreproveedor,
                "municipio": df.get('id_factura_unica__id_municipio_cacao__nombre', ''),
                "departamento": df.get('id_factura_unica__id_departamento_cacao__nombre', ''),
                "kilos": formato_miles(total_kilos_apr),
                "precio": formato_precio(float(df.get('valor_kilo') or 0)),
                "vbruto": formato_precio(float(df.get('id_factura_unica__valor_bruto') or 0)),
                "cuota": formato_precio(float(df.get('id_factura_unica__cuota_fomento') or 0)),
                "vneto": formato_precio(float(df.get('id_factura_unica__valor_neto') or 0)),
                "docpago": df.get('id_factura_unica__id_liq_factura_unica__nro_doc_pago', ''),
                "fpago": (df.get('id_factura_unica__id_liq_factura_unica__fecha_pago').strftime('%d/%m/%Y') if df.get('id_factura_unica__id_liq_factura_unica__fecha_pago') else ''),
            })
        t_proc = time.perf_counter() - t_proc0
        print(f"[console.log][Reporte 2] construir items: {t_proc*1000:.1f} ms ({len(items)} items)", flush=True)

        # Variables para la plantilla (estructura estándar con 'i')
        variables = {
            "items": items,
            "i": {
                "fechainicio": fi_date.strftime('%d/%m/%Y'),
                "fechafinal": ff_date.strftime('%d/%m/%Y'),
                "totalkilos": formato_miles(total_kilos),
                "tvbruto": formato_precio(total_bruto),
                "tvcuotas": formato_precio(total_cuota),
                "tvneto": formato_precio(total_neto),
                "No": len(items)
            }
        }

        # Plantilla y generación de documento
        plantilla = PlantillasDoc.objects.filter(nombre="Consolidado Pago De Cuota De Fomento").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el reporte."
            }, status=status.HTTP_404_NOT_FOUND)

        t_doc0 = time.perf_counter()
        url_documento = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        t_doc = time.perf_counter() - t_doc0
        print(f"[console.log][Reporte 2] obtener_url_documento: {t_doc*1000:.1f} ms", flush=True)

        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        if not documento_generado or not documento_generado.documento_generado:
            return Response({
                "success": False,
                "detail": "No se encontró el documento generado."
            }, status=status.HTTP_404_NOT_FOUND)

        t_total = time.perf_counter() - t0
        print(f"[console.log][Reporte 2] TOTAL request: {t_total*1000:.1f} ms", flush=True)

        return Response({
            "success": True,
            "detail": "Reporte generado correctamente.",
            "data": {
                "id_documento_generado": documento_generado.id_documento_generado,
                "documento_generado": documento_generado.documento_generado.name,
                "archivo": Util.obtener_archivos(documento_generado.documento_generado.name)
            }
        }, status=status.HTTP_200_OK)


