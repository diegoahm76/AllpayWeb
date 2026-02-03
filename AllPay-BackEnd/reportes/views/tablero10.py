from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, F, Case, When, Value, IntegerField
from django.utils import timezone
from decimal import Decimal

from recaudos.models.recaudos_models import FacturaUnica, PorcentajesCobro, FechasCierre
from recaudos.models.acuerdos_pago_models import SolicitudAcuerdosPago, DetalleAcuerdoPago, PlanesPago
from seguridad.models.transversal_models import Personas, TipoDocumento
from reportes.utils import formato_peso, formato_numero, CustomPagination


def calcular_dias_mora_e_intereses(factura):
    """
    Calcula los días de mora e intereses para una factura específica
    basándose en la lógica encontrada en otras vistas del sistema
    """
    try:
        dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        
        if dias_pago_interes is None or dias_pago is None:
            return 0, Decimal("0")
        
        mes_siguiente = factura.fecha_compra + relativedelta(months=1)
        try:
            fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
        except ValueError:
            primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
            fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
        
        fecha_actual = timezone.now().date()
        fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
        dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
        
        intereses = Decimal("0")
        if fecha_actual > fecha_limite_pago.date():
            porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
            if porcentaje_cobro:
                tasa_interes_dian = porcentaje_cobro.valor
                intereses = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365
        
        return dias_mora, intereses
    except Exception:
        return 0, Decimal("0")


class TableroAcuerdosPago(APIView):
    """
    Tablero 10: Vista para mostrar información detallada de acuerdos de pago
    con filtros y totales calculados
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
        # Obtener parámetros de filtrado
        tipo_documento = request.query_params.get('tipo_documento', None)
        numero_documento = request.query_params.get('numero_documento', None)
        correo_electronico = request.query_params.get('correo_electronico', None)
        nombres = request.query_params.get('nombres', None)
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Validar y convertir fechas
        fecha_inicio = None
        fecha_fin = None
        
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios y deben usar el formato YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD. Error específico: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Construir el queryset base
        queryset = FacturaUnica.objects.select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).filter(
            # Solo facturas que tienen acuerdos de pago
            detalleacuerdopago__isnull=False
        ).distinct()
        
        # Aplicar filtros
        if tipo_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__id_tipo_documento__codigo=tipo_documento) |
                Q(id_persona_proveedor__id_tipo_documento__codigo=tipo_documento)
            )
        
        if numero_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__numero_documento__icontains=numero_documento) |
                Q(id_persona_proveedor__numero_documento__icontains=numero_documento)
            )
        
        if correo_electronico:
            queryset = queryset.filter(
                Q(id_persona_recaudador__email__icontains=correo_electronico) |
                Q(id_persona_proveedor__email__icontains=correo_electronico)
            )
        
        if nombres:
            queryset = queryset.filter(
                Q(id_persona_recaudador__primer_nombre__icontains=nombres) |
                Q(id_persona_recaudador__segundo_nombre__icontains=nombres) |
                Q(id_persona_recaudador__primer_apellido__icontains=nombres) |
                Q(id_persona_recaudador__segundo_apellido__icontains=nombres) |
                Q(id_persona_proveedor__primer_nombre__icontains=nombres) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombres) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombres) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombres)
            )
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_compra__date__gte=fecha_inicio)
        
        if fecha_fin:
            queryset = queryset.filter(fecha_compra__date__lte=fecha_fin)
        
        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros que coincidan con los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Construir los datos de respuesta
        datos_tabla = []
        total_kilos = 0
        total_cuota_fomento = Decimal("0")
        total_intereses = Decimal("0")
        
        for factura in queryset:
            # Obtener información del recaudador
            recaudador = factura.id_persona_recaudador
            recaudador_nombre = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
            
            # Obtener información del proveedor
            proveedor = factura.id_persona_proveedor
            proveedor_nombre = f"{proveedor.primer_nombre or ''} {proveedor.segundo_nombre or ''} {proveedor.primer_apellido or ''} {proveedor.segundo_apellido or ''}".strip()
            
            # Calcular días de mora e intereses
            dias_mora, valor_intereses = calcular_dias_mora_e_intereses(factura)
            
            # Obtener estado del acuerdo de pago
            detalle_acuerdo = DetalleAcuerdoPago.objects.filter(id_factura_unica=factura).first()
            estado_acuerdo = "Sin Acuerdo"
            if detalle_acuerdo and detalle_acuerdo.id_Solicitud_acuerdo_pago:
                solicitud = detalle_acuerdo.id_Solicitud_acuerdo_pago
                estado_acuerdo = dict(SolicitudAcuerdosPago._meta.get_field('estado').choices).get(solicitud.estado, solicitud.estado)
            
            # Calcular precio por kilo
            precio_kilo = factura.valor_bruto / factura.total_kilos if factura.total_kilos > 0 else 0
            
            registro = {
                "no_documento_recaudador": recaudador.numero_documento,
                "razon_social": recaudador_nombre,
                "no_factura_unica": factura.nro_factura_unica,
                "fecha_compra": factura.fecha_compra.strftime('%Y-%m-%d') if hasattr(factura.fecha_compra, 'strftime') else str(factura.fecha_compra),
                "nit_proveedor": proveedor.numero_documento,
                "nombre_proveedor": proveedor_nombre,
                "municipio_procedencia_cacao": factura.id_municipio_cacao.nombre if factura.id_municipio_cacao else "",
                "departamento_procedencia_cacao": factura.id_departamento_cacao.nombre if factura.id_departamento_cacao else "",
                "kilos": factura.total_kilos,
                "precio_kilo": formato_numero(precio_kilo),
                "valor_bruto": formato_peso(factura.valor_bruto),
                "valor_cuota_fomento": formato_peso(factura.cuota_fomento),
                "valor_neto": formato_peso(factura.valor_neto),
                "dias_mora": dias_mora,
                "valor_intereses": formato_peso(valor_intereses),
                "estado_acuerdo_pago": estado_acuerdo
            }
            
            datos_tabla.append(registro)
            
            # Acumular totales
            total_kilos += factura.total_kilos
            total_cuota_fomento += factura.cuota_fomento
            total_intereses += valor_intereses
        
        # Preparar totales
        totales = {
            "total_kilos": formato_numero(total_kilos),
            "total_cuota_fomento": formato_peso(total_cuota_fomento),
            "total_intereses": formato_peso(total_intereses)
        }
        
        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(datos_tabla, request)
        
        if page is not None:
            return paginator.get_paginated_response({
                "success": True,
                "detail": f"Datos del tablero de acuerdos de pago obtenidos correctamente. Total registros: {len(datos_tabla)}",
                "data": {
                    "registros": page,
                    "totales": totales
                }
            })
        
        # Si no hay paginación, devolver todos los datos
        return Response({
            "success": True,
            "detail": "Datos del tablero de acuerdos de pago obtenidos correctamente.",
            "data": {
                "registros": datos_tabla,
                "totales": totales,
                "total_registros": len(datos_tabla)
            }
        }, status=status.HTTP_200_OK)


class TableroAcuerdosPagoResumen(APIView):
    """
    Tablero 10 Resumen: Vista para mostrar resumen de acuerdos de pago agrupados por estado
    con totales calculados y sin paginación
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Obtener parámetros de filtrado
        tipo_documento = request.query_params.get('tipo_documento', None)
        numero_documento = request.query_params.get('numero_documento', None)
        correo_electronico = request.query_params.get('correo_electronico', None)
        nombres = request.query_params.get('nombres', None)
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Validar y convertir fechas
        fecha_inicio = None
        fecha_fin = None
        
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios y deben usar el formato YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD. Error específico: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Construir el queryset base
        queryset = FacturaUnica.objects.select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).filter(
            # Solo facturas que tienen acuerdos de pago
            detalleacuerdopago__isnull=False
        ).distinct()
        
        # Aplicar filtros
        if tipo_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__id_tipo_documento__codigo=tipo_documento) |
                Q(id_persona_proveedor__id_tipo_documento__codigo=tipo_documento)
            )
        
        if numero_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__numero_documento__icontains=numero_documento) |
                Q(id_persona_proveedor__numero_documento__icontains=numero_documento)
            )
        
        if correo_electronico:
            queryset = queryset.filter(
                Q(id_persona_recaudador__email__icontains=correo_electronico) |
                Q(id_persona_proveedor__email__icontains=correo_electronico)
            )
        
        if nombres:
            queryset = queryset.filter(
                Q(id_persona_recaudador__primer_nombre__icontains=nombres) |
                Q(id_persona_recaudador__segundo_nombre__icontains=nombres) |
                Q(id_persona_recaudador__primer_apellido__icontains=nombres) |
                Q(id_persona_recaudador__segundo_apellido__icontains=nombres) |
                Q(id_persona_proveedor__primer_nombre__icontains=nombres) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombres) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombres) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombres)
            )
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_compra__date__gte=fecha_inicio)
        
        if fecha_fin:
            queryset = queryset.filter(fecha_compra__date__lte=fecha_fin)
        
        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros que coincidan con los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Diccionario para agrupar por estado
        estados_agrupados = {}
        total_kilos = 0
        total_cuota_fomento = Decimal("0")
        total_intereses = Decimal("0")
        
        for factura in queryset:
            # Calcular días de mora e intereses
            dias_mora, valor_intereses = calcular_dias_mora_e_intereses(factura)
            
            # Obtener estado del acuerdo de pago
            detalle_acuerdo = DetalleAcuerdoPago.objects.filter(id_factura_unica=factura).first()
            estado_acuerdo = "Sin Acuerdo"
            if detalle_acuerdo and detalle_acuerdo.id_Solicitud_acuerdo_pago:
                solicitud = detalle_acuerdo.id_Solicitud_acuerdo_pago
                estado_acuerdo = dict(SolicitudAcuerdosPago._meta.get_field('estado').choices).get(solicitud.estado, solicitud.estado)
            
            # Agrupar por estado
            if estado_acuerdo not in estados_agrupados:
                estados_agrupados[estado_acuerdo] = {
                    "estado": estado_acuerdo,
                    "valorIntereses": Decimal("0"),
                    "valorCuotaFomento": Decimal("0"),
                    "diasMora": 0,
                    "cantidad_facturas": 0
                }
            
            # Acumular valores por estado
            estados_agrupados[estado_acuerdo]["valorIntereses"] += valor_intereses
            estados_agrupados[estado_acuerdo]["valorCuotaFomento"] += factura.cuota_fomento
            estados_agrupados[estado_acuerdo]["diasMora"] += dias_mora
            estados_agrupados[estado_acuerdo]["cantidad_facturas"] += 1
            
            # Acumular totales generales
            total_kilos += factura.total_kilos
            total_cuota_fomento += factura.cuota_fomento
            total_intereses += valor_intereses
        
        # Calcular promedio de días de mora por estado
        detalles = []
        for estado_data in estados_agrupados.values():
            if estado_data["cantidad_facturas"] > 0:
                promedio_dias_mora = estado_data["diasMora"] / estado_data["cantidad_facturas"]
                detalles.append({
                    "estado": estado_data["estado"],
                    "valorIntereses": int(estado_data["valorIntereses"]),
                    "valorCuotaFomento": int(estado_data["valorCuotaFomento"]),
                    "diasMora": int(promedio_dias_mora)
                })
        
        # Preparar totales
        totales = {
            "totalKilos": round(total_kilos, 1),
            "totalCuotaFomento": int(total_cuota_fomento),
            "totalInteres": int(total_intereses)
        }
        
        return Response({
            "success": True,
            "detail": "Resumen del tablero de acuerdos de pago obtenido correctamente.",
            "data": {
                "totales": totales,
                "detalles": detalles
            }
        }, status=status.HTTP_200_OK)


class TableroDeudoresPorRecaudador(APIView):
    """
    Tablero Deudores por Recaudador: Vista para mostrar deudores agrupados por recaudador
    con totales de intereses y cuota de fomento
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Obtener parámetros de filtrado
        tipo_documento = request.query_params.get('tipo_documento', None)
        numero_documento = request.query_params.get('numero_documento', None)
        correo_electronico = request.query_params.get('correo_electronico', None)
        nombres = request.query_params.get('nombres', None)
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Validar y convertir fechas
        fecha_inicio = None
        fecha_fin = None
        
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios y deben usar el formato YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD. Error específico: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Construir el queryset base
        queryset = FacturaUnica.objects.select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).filter(
            # Solo facturas que tienen acuerdos de pago
            detalleacuerdopago__isnull=False
        ).distinct()
        
        # Aplicar filtros
        if tipo_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__id_tipo_documento__codigo=tipo_documento) |
                Q(id_persona_proveedor__id_tipo_documento__codigo=tipo_documento)
            )
        
        if numero_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__numero_documento__icontains=numero_documento) |
                Q(id_persona_proveedor__numero_documento__icontains=numero_documento)
            )
        
        if correo_electronico:
            queryset = queryset.filter(
                Q(id_persona_recaudador__email__icontains=correo_electronico) |
                Q(id_persona_proveedor__email__icontains=correo_electronico)
            )
        
        if nombres:
            queryset = queryset.filter(
                Q(id_persona_recaudador__primer_nombre__icontains=nombres) |
                Q(id_persona_recaudador__segundo_nombre__icontains=nombres) |
                Q(id_persona_recaudador__primer_apellido__icontains=nombres) |
                Q(id_persona_recaudador__segundo_apellido__icontains=nombres) |
                Q(id_persona_proveedor__primer_nombre__icontains=nombres) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombres) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombres) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombres)
            )
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_compra__date__gte=fecha_inicio)
        
        if fecha_fin:
            queryset = queryset.filter(fecha_compra__date__lte=fecha_fin)
        
        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros que coincidan con los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Diccionario para agrupar por recaudador
        recaudadores_agrupados = {}
        
        for factura in queryset:
            # Obtener información del recaudador
            recaudador = factura.id_persona_recaudador
            recaudador_nombre = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
            
            # Si no hay nombre, usar el número de documento
            if not recaudador_nombre.strip():
                recaudador_nombre = recaudador.numero_documento
            
            # Calcular días de mora e intereses
            dias_mora, valor_intereses = calcular_dias_mora_e_intereses(factura)
            
            # Agrupar por recaudador
            if recaudador_nombre not in recaudadores_agrupados:
                recaudadores_agrupados[recaudador_nombre] = {
                    "recaudador": recaudador_nombre,
                    "intereses": Decimal("0"),
                    "cuotaFomento": Decimal("0")
                }
            
            # Acumular valores por recaudador
            recaudadores_agrupados[recaudador_nombre]["intereses"] += valor_intereses
            recaudadores_agrupados[recaudador_nombre]["cuotaFomento"] += factura.cuota_fomento
        
        # Convertir a lista y ordenar por cuota de fomento (descendente)
        deudores_por_recaudador = list(recaudadores_agrupados.values())
        deudores_por_recaudador.sort(key=lambda x: x["cuotaFomento"], reverse=True)
        
        # Convertir Decimal a int para la respuesta
        for item in deudores_por_recaudador:
            item["intereses"] = int(item["intereses"])
            item["cuotaFomento"] = int(item["cuotaFomento"])
        
        return Response({
            "success": True,
            "detail": "Deudores por recaudador obtenidos correctamente.",
            "data": {
                "deudoresPorRecaudador": deudores_por_recaudador
            }
        }, status=status.HTTP_200_OK)


class TableroDeudoresPorUbicacion(APIView):
    """
    Tablero Deudores por Ubicación: Vista para mostrar deudores agrupados por departamento
    con totales de kilos, intereses, cuota de fomento, total moroso y cantidad de deudores
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Obtener parámetros de filtrado
        tipo_documento = request.query_params.get('tipo_documento', None)
        numero_documento = request.query_params.get('numero_documento', None)
        correo_electronico = request.query_params.get('correo_electronico', None)
        nombres = request.query_params.get('nombres', None)
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Validar y convertir fechas
        fecha_inicio = None
        fecha_fin = None
        
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios y deben usar el formato YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD. Error específico: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Construir el queryset base
        queryset = FacturaUnica.objects.select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).filter(
            # Solo facturas que tienen acuerdos de pago
            detalleacuerdopago__isnull=False
        ).distinct()
        
        # Aplicar filtros
        if tipo_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__id_tipo_documento__codigo=tipo_documento) |
                Q(id_persona_proveedor__id_tipo_documento__codigo=tipo_documento)
            )
        
        if numero_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__numero_documento__icontains=numero_documento) |
                Q(id_persona_proveedor__numero_documento__icontains=numero_documento)
            )
        
        if correo_electronico:
            queryset = queryset.filter(
                Q(id_persona_recaudador__email__icontains=correo_electronico) |
                Q(id_persona_proveedor__email__icontains=correo_electronico)
            )
        
        if nombres:
            queryset = queryset.filter(
                Q(id_persona_recaudador__primer_nombre__icontains=nombres) |
                Q(id_persona_recaudador__segundo_nombre__icontains=nombres) |
                Q(id_persona_recaudador__primer_apellido__icontains=nombres) |
                Q(id_persona_recaudador__segundo_apellido__icontains=nombres) |
                Q(id_persona_proveedor__primer_nombre__icontains=nombres) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombres) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombres) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombres)
            )
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_compra__date__gte=fecha_inicio)
        
        if fecha_fin:
            queryset = queryset.filter(fecha_compra__date__lte=fecha_fin)
        
        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros que coincidan con los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Diccionario para agrupar por departamento
        departamentos_agrupados = {}
        
        for factura in queryset:
            # Calcular días de mora e intereses
            dias_mora, valor_intereses = calcular_dias_mora_e_intereses(factura)
            
            # Obtener información de ubicación
            departamento = factura.id_departamento_cacao
            
            # Agrupar por departamento
            if departamento:
                dept_nombre = departamento.nombre
                if dept_nombre not in departamentos_agrupados:
                    departamentos_agrupados[dept_nombre] = {
                        "nombre": dept_nombre,
                        "kilos": Decimal("0"),
                        "intereses": Decimal("0"),
                        "cuotaFomento": Decimal("0"),
                        "totalMoroso": Decimal("0"),
                        "deudores": set()
                    }
                
                departamentos_agrupados[dept_nombre]["kilos"] += factura.total_kilos
                departamentos_agrupados[dept_nombre]["intereses"] += valor_intereses
                departamentos_agrupados[dept_nombre]["cuotaFomento"] += factura.cuota_fomento
                departamentos_agrupados[dept_nombre]["totalMoroso"] += valor_intereses + factura.cuota_fomento
                departamentos_agrupados[dept_nombre]["deudores"].add(factura.id_persona_recaudador.id_persona)
            

        
        # Procesar departamentos
        por_departamento = []
        for dept_data in departamentos_agrupados.values():
            por_departamento.append({
                "nombre": dept_data["nombre"],
                "kilos": int(dept_data["kilos"]),
                "intereses": int(dept_data["intereses"]),
                "cuotaFomento": int(dept_data["cuotaFomento"]),
                "totalMoroso": int(dept_data["totalMoroso"]),
                "deudores": len(dept_data["deudores"])
            })
        
        # Ordenar departamentos por total moroso (descendente)
        por_departamento.sort(key=lambda x: x["totalMoroso"], reverse=True)
        

        
        return Response({
            "success": True,
            "detail": "Deudores por departamento obtenidos correctamente.",
            "data": por_departamento
        }, status=status.HTTP_200_OK)


class TableroCarteraPorEdad(APIView):
    """
    Tablero Cartera por Edad: Vista para mostrar la cartera agrupada por rangos de edad (días de mora)
    con totales de cuota de fomento e intereses por rango
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Obtener parámetros de filtrado
        tipo_documento = request.query_params.get('tipo_documento', None)
        numero_documento = request.query_params.get('numero_documento', None)
        correo_electronico = request.query_params.get('correo_electronico', None)
        nombres = request.query_params.get('nombres', None)
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Validar y convertir fechas
        fecha_inicio = None
        fecha_fin = None
        
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios y deben usar el formato YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD. Error específico: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Construir el queryset base
        queryset = FacturaUnica.objects.select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).filter(
            # Solo facturas que tienen acuerdos de pago
            detalleacuerdopago__isnull=False
        ).distinct()
        
        # Aplicar filtros
        if tipo_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__id_tipo_documento__codigo=tipo_documento) |
                Q(id_persona_proveedor__id_tipo_documento__codigo=tipo_documento)
            )
        
        if numero_documento:
            queryset = queryset.filter(
                Q(id_persona_recaudador__numero_documento__icontains=numero_documento) |
                Q(id_persona_proveedor__numero_documento__icontains=numero_documento)
            )
        
        if correo_electronico:
            queryset = queryset.filter(
                Q(id_persona_recaudador__email__icontains=correo_electronico) |
                Q(id_persona_proveedor__email__icontains=correo_electronico)
            )
        
        if nombres:
            queryset = queryset.filter(
                Q(id_persona_recaudador__primer_nombre__icontains=nombres) |
                Q(id_persona_recaudador__segundo_nombre__icontains=nombres) |
                Q(id_persona_recaudador__primer_apellido__icontains=nombres) |
                Q(id_persona_recaudador__segundo_apellido__icontains=nombres) |
                Q(id_persona_proveedor__primer_nombre__icontains=nombres) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombres) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombres) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombres)
            )
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_compra__date__gte=fecha_inicio)
        
        if fecha_fin:
            queryset = queryset.filter(fecha_compra__date__lte=fecha_fin)
        
        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros que coincidan con los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Definir rangos de edad de la cartera
        rangos_edad = [
            {"rango": "0-15 días", "min_dias": 0, "max_dias": 15},
            {"rango": "15-30 días", "min_dias": 15, "max_dias": 30},
            {"rango": "31-45 días", "min_dias": 31, "max_dias": 45},
            {"rango": "46-60 días", "min_dias": 46, "max_dias": 60},
            {"rango": "61-75 días", "min_dias": 61, "max_dias": 75},
            {"rango": "76-90 días", "min_dias": 76, "max_dias": 90},
            {"rango": "+91 días", "min_dias": 91, "max_dias": None}
        ]
        
        # Diccionario para agrupar por rango de edad
        cartera_por_edad = {}
        
        # Inicializar todos los rangos con valores en 0
        for rango in rangos_edad:
            cartera_por_edad[rango["rango"]] = {
                "rango": rango["rango"],
                "cuotaFomento": Decimal("0"),
                "intereses": Decimal("0")
            }
        
        for factura in queryset:
            # Calcular días de mora e intereses
            dias_mora, valor_intereses = calcular_dias_mora_e_intereses(factura)
            
            # Determinar a qué rango pertenece
            rango_asignado = None
            for rango in rangos_edad:
                if rango["max_dias"] is None:
                    # Para el rango "+91 días"
                    if dias_mora >= rango["min_dias"]:
                        rango_asignado = rango["rango"]
                        break
                else:
                    # Para rangos con límite superior
                    if rango["min_dias"] <= dias_mora <= rango["max_dias"]:
                        rango_asignado = rango["rango"]
                        break
            
            # Si se encontró un rango, acumular valores
            if rango_asignado:
                cartera_por_edad[rango_asignado]["cuotaFomento"] += factura.cuota_fomento
                cartera_por_edad[rango_asignado]["intereses"] += valor_intereses
        
        # Convertir a lista y ordenar por el orden definido en rangos_edad
        cartera_ordenada = []
        for rango in rangos_edad:
            rango_nombre = rango["rango"]
            if rango_nombre in cartera_por_edad:
                cartera_ordenada.append({
                    "rango": rango_nombre,
                    "cuotaFomento": int(cartera_por_edad[rango_nombre]["cuotaFomento"]),
                    "intereses": int(cartera_por_edad[rango_nombre]["intereses"])
                })
        
        return Response({
            "success": True,
            "detail": "Cartera por edad obtenida correctamente.",
            "data": {
                "carteraPorEdad": cartera_ordenada
            }
        }, status=status.HTTP_200_OK)


class TiposDocumentoView(APIView):
    """
    Vista auxiliar para obtener los tipos de documento disponibles
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        tipos_documento = TipoDocumento.objects.all().values('codigo', 'nombre')
        return Response({
            "success": True,
            "detail": "Tipos de documento obtenidos correctamente.",
            "data": list(tipos_documento)
        }, status=status.HTTP_200_OK)
