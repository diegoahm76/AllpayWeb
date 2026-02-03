from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from datetime import datetime
from recaudos.models.acuerdos_pago_models import CuotasAcuerdoPago, DetalleAcuerdoPago, SolicitudAcuerdosPago
from recaudos.models.recaudos_models import FacturaUnica
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.models.recaudos_models import FacturaUnica
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.views.cartera_view import obtener_url_documento
from seguridad.utils import Util
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime
from reportes.utils import CustomPagination, formato_miles, formato_precio



class ReporteConsolidadoAcuerdosPagoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        # Obtener filtros de fecha
        fecha_inicio = self.request.query_params.get('fecha_inicio', None)
        fecha_fin = self.request.query_params.get('fecha_fin', None)
        estado = self.request.query_params.get('estado', None)
        nombre_recaudador = self.request.query_params.get('nombre_recaudador', None)
        
        # Query base desde SolicitudAcuerdosPago
        queryset = SolicitudAcuerdosPago.objects.select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        ).prefetch_related(
            'planespago_set',
            'planespago_set__cuotasacuerdopago_set',
            'detalleacuerdopago_set',
            'detalleacuerdopago_set__id_factura_unica'
        )
        
        # Aplicar filtros de fecha
        if fecha_inicio:
            try:
                fecha_inicio_parsed = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_solicitud__date__gte=fecha_inicio_parsed)
            except ValueError:
                pass  
                
        if fecha_fin:
            try:
                fecha_fin_parsed = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_solicitud__date__lte=fecha_fin_parsed)
            except ValueError:
                pass  
        
        if estado:
            try:
                queryset = queryset.filter(estado=estado)
            except SolicitudAcuerdosPago.DoesNotExist:
                pass

            if nombre_recaudador:
                try:
                    # nombre completo
                    nombre_por_espacios = nombre_recaudador.split()
                    for nombre in nombre_por_espacios:
                        queryset = queryset.filter(id_persona_solicita__primer_nombre__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__segundo_nombre__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__primer_apellido__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__segundo_apellido__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__razon_social__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__nombre_comercial__icontains=nombre)
                except SolicitudAcuerdosPago.DoesNotExist:
                    pass

        return queryset.order_by('-fecha_solicitud')

    def get_base_data(self, solicitudes):
        base_data = []
        
        for solicitud in solicitudes:
            # Obtener datos del recaudador (persona que solicita)
            recaudador = solicitud.id_persona_solicita
            
            # Obtener planes de pago de esta solicitud
            planes_pago = solicitud.planespago_set.all()
            
            for plan in planes_pago:
                # Obtener cuotas del plan
                cuotas = plan.cuotasacuerdopago_set.all()
                
                # Obtener facturas asociadas al plan a través de DetalleAcuerdoPago
                detalles = solicitud.detalleacuerdopago_set.filter(
                    id_cuota_acuerdo_pago__id_plan_pago=plan
                ).select_related('id_factura_unica')
                
                # Si no hay detalles específicos del plan, obtener todos los detalles de la solicitud
                if not detalles.exists():
                    detalles = solicitud.detalleacuerdopago_set.all().select_related('id_factura_unica')
                
                facturas_numeros = [str(detalle.id_factura_unica.nro_factura_unica) for detalle in detalles]
                facturas_concatenadas = "-".join(facturas_numeros) if facturas_numeros else ""
                
                # Calcular totales de cuotas
                total_cuotas_fomento = sum([cuota.valor_cuota for cuota in cuotas])
                
                # Calcular total de intereses (asumiendo que está en las liquidaciones relacionadas)
                total_intereses = 0
                for cuota in cuotas:
                    if cuota.id_liquidacion and cuota.id_liquidacion.valor_intereses:
                        total_intereses += float(cuota.id_liquidacion.valor_intereses)
                
                # Construir nombre completo del recaudador
                if recaudador.tipo_persona == 'N':  # Persona Natural
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                    nombre_recaudador = ' '.join(nombre_recaudador.split())  # Limpiar espacios extras
                else:  # Persona Jurídica
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ""
                
                # Agregar a la lista base
                base_data.append({
                    'solicitud': solicitud,
                    'plan': plan,
                    'recaudador': recaudador,
                    'cuotas': cuotas,
                    'facturas_concatenadas': facturas_concatenadas,
                    'total_cuotas_fomento': float(total_cuotas_fomento),
                    'total_intereses': total_intereses,
                    'nombre_recaudador': nombre_recaudador
                })
        
        return base_data

    def serialize_data(self, solicitudes):
        # Obtener datos base para las solicitudes
        base_data = self.get_base_data(solicitudes)
        data = []
        
        for item_data in base_data:
            solicitud = item_data['solicitud']
            plan = item_data['plan']
            recaudador = item_data['recaudador']

            # Obtener la primera cuota con fecha de pago (como está en la base de datos)
            cuotas = item_data['cuotas']
            fecha_pago = None
            for cuota in cuotas:
                if cuota.fecha_pago:
                    fecha_pago = cuota.fecha_pago  
                    break
            
            item = {
                'numero_solicitud': solicitud.nro_solicitud,
                'fecha_solicitud': solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M:%S'),
                'estado': solicitud.estado,
                'estado_display': solicitud.get_estado_display() if hasattr(solicitud, 'get_estado_display') else solicitud.estado,
                'id_recaudador': recaudador.id_persona,
                'tipo_documento_recaudador': recaudador.tipo_documento.nombre if recaudador.tipo_documento else '',
                'nombre_recaudador': item_data['nombre_recaudador'],
                'numero_plan_pago': plan.nro_plan_pago,
                'numero_cuotas': plan.nro_cuotas,
                'facturas_asociadas': item_data['facturas_concatenadas'],
                'total_pagar_cuotas_fomento': item_data['total_cuotas_fomento'],
                'total_pagar_intereses': item_data['total_intereses']
            }
            
            data.append(item)
        
        return data

    def get(self, request, *args, **kwargs):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        estado = request.query_params.get('estado', None)
        nombre_recaudador = request.query_params.get('nombre_recaudador', None)


        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset()

        if not queryset.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron solicitudes de acuerdos de pago con los filtros especificados',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serialized_data = self.serialize_data(page)
            return self.get_paginated_response(serialized_data)

        serialized_data = self.serialize_data(queryset)
        return Response({
            'success': True,
            'detail': f'Reporte consolidado de acuerdos de pago encontrado. Total de registros: {len(serialized_data)}',
            'data': serialized_data
        }, status=status.HTTP_200_OK)


class SumatoriasReporteAcuerdosPagoView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Obtener filtros de fecha (mismos que el reporte principal)
        fecha_inicio = self.request.query_params.get('fecha_inicio', None)
        fecha_fin = self.request.query_params.get('fecha_fin', None)
        estado = self.request.query_params.get('estado', None)
        nombre_recaudador = self.request.query_params.get('nombre_recaudador', None)

        # Query base desde SolicitudAcuerdosPago
        queryset = SolicitudAcuerdosPago.objects.select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        ).prefetch_related(
            'planespago_set',
            'planespago_set__cuotasacuerdopago_set',
            'detalleacuerdopago_set',
            'detalleacuerdopago_set__id_factura_unica'
        )
        
        # Aplicar filtros de fecha
        if fecha_inicio:
            try:
                fecha_inicio_parsed = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_solicitud__date__gte=fecha_inicio_parsed)
            except ValueError:
                pass 
                
        if fecha_fin:
            try:
                fecha_fin_parsed = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_solicitud__date__lte=fecha_fin_parsed)
            except ValueError:
                pass 
        if estado:
            try:
                queryset = queryset.filter(estado=estado)
            except SolicitudAcuerdosPago.DoesNotExist:
                pass

            if nombre_recaudador:
                try:
                    # nombre completo
                    nombre_por_espacios = nombre_recaudador.split()
                    for nombre in nombre_por_espacios:
                        queryset = queryset.filter(id_persona_solicita__primer_nombre__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__segundo_nombre__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__primer_apellido__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__segundo_apellido__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__razon_social__icontains=nombre) | \
                                   queryset.filter(id_persona_solicita__nombre_comercial__icontains=nombre)
                except SolicitudAcuerdosPago.DoesNotExist:
                    pass
        
        return queryset

    def calcular_sumatorias(self, solicitudes):
        
        total_cuotas_fomento = 0
        total_intereses = 0
        
        for solicitud in solicitudes:
            # Obtener planes de pago de esta solicitud
            planes_pago = solicitud.planespago_set.all()
            
            for plan in planes_pago:
                
                # Calcular totales de cuotas
                cuotas = plan.cuotasacuerdopago_set.all()
                total_cuotas_fomento += sum([float(cuota.valor_cuota) for cuota in cuotas])
                
                # Calcular total de intereses
                for cuota in cuotas:
                    if cuota.id_liquidacion and cuota.id_liquidacion.valor_intereses:
                        total_intereses += float(cuota.id_liquidacion.valor_intereses)
        
        return {
            'total_cuotas_fomento': total_cuotas_fomento,
            'total_intereses': total_intereses,
        }

    def get(self, request, *args, **kwargs):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset()

        if not queryset.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron solicitudes de acuerdos de pago con los filtros especificados'
            }, status=status.HTTP_404_NOT_FOUND)

        sumatorias = self.calcular_sumatorias(queryset)

        return Response({
            'success': True,
            'detail': 'Sumatorias calculadas correctamente',
            'sumatorias': sumatorias
        }, status=status.HTTP_200_OK)
    
class DescargarReporteConsolidadoAcuerdosPagoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        estado = request.query_params.get('estado', None)
        nombre_recaudador = request.query_params.get('nombre_recaudador', None)

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_inicio_date = parse_date(fecha_inicio) if fecha_inicio else None
            fecha_fin_date = parse_date(fecha_fin) if fecha_fin else None
        except:
            return Response({
                "success": False,
                "detail": "Fechas inválidas"
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = SolicitudAcuerdosPago.objects.select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        ).prefetch_related(
            'planespago_set',
            'planespago_set__cuotasacuerdopago_set',
            'detalleacuerdopago_set',
            'detalleacuerdopago_set__id_factura_unica'
        )

        if fecha_inicio_date:
            queryset = queryset.filter(fecha_solicitud__date__gte=fecha_inicio_date)
        if fecha_fin_date:
            queryset = queryset.filter(fecha_solicitud__date__lte=fecha_fin_date)
        if estado:
            queryset = queryset.filter(estado=estado)
        if nombre_recaudador:
            nombre_por_espacios = nombre_recaudador.split()
            for nombre in nombre_por_espacios:
                queryset = queryset.filter(id_persona_solicita__primer_nombre__icontains=nombre) | \
                            queryset.filter(id_persona_solicita__segundo_nombre__icontains=nombre) | \
                            queryset.filter(id_persona_solicita__primer_apellido__icontains=nombre) | \
                            queryset.filter(id_persona_solicita__segundo_apellido__icontains=nombre) | \
                            queryset.filter(id_persona_solicita__razon_social__icontains=nombre) | \
                            queryset.filter(id_persona_solicita__nombre_comercial__icontains=nombre)

        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros en el rango solicitado"
            }, status=status.HTTP_404_NOT_FOUND)

        items = []
        total_cuotas = 0
        total_intereses = 0

        for solicitud in queryset:
            recaudador = solicitud.id_persona_solicita
            planes = solicitud.planespago_set.all()

            for plan in planes:
                cuotas = plan.cuotasacuerdopago_set.all()
                detalles = solicitud.detalleacuerdopago_set.filter(
                    id_cuota_acuerdo_pago__id_plan_pago=plan
                ).select_related('id_factura_unica')

                if not detalles.exists():
                    detalles = solicitud.detalleacuerdopago_set.all().select_related('id_factura_unica')

                if not detalles.exists():
                    detalles = solicitud.detalleacuerdopago_set.all().select_related('id_factura_unica')

                facturas_numeros = [
                    str(detalle.id_factura_unica.nro_factura_unica)
                    for detalle in detalles if detalle.id_factura_unica
                ]
                facturas_concatenadas = "-".join(facturas_numeros) if facturas_numeros else ""

                suma_cuotas = sum([cuota.valor_cuota for cuota in cuotas])
                suma_intereses = sum([float(c.id_liquidacion.valor_intereses or 0) for c in cuotas if c.id_liquidacion])

                total_cuotas += suma_cuotas
                total_intereses += suma_intereses

                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ""

                items.append({
                    "nrosolicitud": solicitud.nro_solicitud,
                    "fechasolicitud": solicitud.fecha_solicitud.strftime('%d/%m/%Y') if solicitud.fecha_solicitud else '',
                    "estado_display": solicitud.get_estado_display() if hasattr(solicitud, 'get_estado_display') else solicitud.estado,
                    "ndocumento": recaudador.numero_documento or '',
                    "nombrerecaudador": nombre_recaudador,
                    "nroplan": plan.nro_plan_pago,
                    "nrocuotas": plan.nro_cuotas,
                    "facturas": facturas_concatenadas,
                    "cuota": formato_precio(suma_cuotas),
                    "precio": formato_precio(suma_intereses)
                })

        variables = {
            "items": items,
            "i": {
                "fechainicio": fecha_inicio_date.strftime('%d/%m/%Y') if fecha_inicio_date else (fecha_inicio or ''),
                "fechafinal": fecha_fin_date.strftime('%d/%m/%Y') if fecha_fin_date else (fecha_fin or ''),
                "tvcuotas": formato_precio(total_cuotas),
                "tvintereses": formato_precio(total_intereses)
            }
        }

        plantilla = PlantillasDoc.objects.filter(nombre="Reporte Acuerdo Pago Por Fecha").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el reporte."
            }, status=status.HTTP_404_NOT_FOUND)

        import time
        t_doc0 = time.perf_counter()
        url_documento = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        t_doc = time.perf_counter() - t_doc0
        print(f"[console.log][Reportes Views] obtener_url_documento: {t_doc*1000:.1f} ms", flush=True)

        t_db0 = time.perf_counter()
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        t_db = time.perf_counter() - t_db0
        print(f"[console.log][Reportes Views] buscar DocumentosGenerados: {t_db*1000:.1f} ms", flush=True)

        if not documento_generado or not documento_generado.documento_generado:
            return Response({
                "success": False,
                "detail": "No se encontró el documento generado."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "success": True,
            "detail": "Reporte generado correctamente.",
            "data": {
                "id_documento_generado": documento_generado.id_documento_generado,
                "documento_generado": documento_generado.documento_generado.name,
                "archivo": Util.obtener_archivos(documento_generado.documento_generado.name)
            }
        }, status=status.HTTP_200_OK)

    

class RecaudoCuotaFomentoRegularView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_nombres_tipo_comprador(self, persona_obj):
        cod_tipo_comprador = getattr(persona_obj, 'cod_tipo_comprador', None)
        if not cod_tipo_comprador:
            return None

        from seguridad.models.transversal_models import TipoComprador
        nombres_tipo_comprador = []
        codigos = cod_tipo_comprador.split('|')
        for codigo in codigos:
            try:
                tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=codigo.strip())
                nombres_tipo_comprador.append(tipo_comprador.nombre)
            except TipoComprador.DoesNotExist:
                nombres_tipo_comprador.append(f"Desconocido ({codigo.strip()})")

        return " | ".join(nombres_tipo_comprador)

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() == 'true'

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio:
            fecha_inicio = parse_date(fecha_inicio)
        if fecha_fin:
            fecha_fin = parse_date(fecha_fin)

        # RECAUDO CUOTA DE FOMENTO REGULAR - Corregir filtros
        queryset = FacturaUnica.objects.all()
        
        # Aplicar filtros solo si las fechas son válidas
        if fecha_inicio:
            queryset = queryset.filter(id_liq_factura_unica__fecha_pago__date__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(id_liq_factura_unica__fecha_pago__date__lte=fecha_fin)
        
        # Asegurar que tienen liquidación
        queryset = queryset.filter(id_liq_factura_unica__isnull=False)
        
        facturas_regulares = queryset.select_related(
            'id_persona_recaudador',
            'id_persona_recaudador__tipo_documento',
            'id_liq_factura_unica'
        )

        arreglo_regular = []
        sum_kilos = sum_cuota = sum_precio_promedio = sum_intereses = 0

        for f in facturas_regulares:
            precio_promedio = float(f.valor_bruto) / float(f.total_kilos) if f.total_kilos else 0
            intereses = f.id_liq_factura_unica.valor_intereses if f.id_liq_factura_unica and f.id_liq_factura_unica.valor_intereses else 0
            
            recaudador = f.id_persona_recaudador
            if recaudador:
                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                    nombre_recaudador = ' '.join(nombre_recaudador.split())
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
            else:
                nombre_recaudador = ''

            item = {
                'tipo_documento_recaudador': str(f.id_persona_recaudador.tipo_documento),
                'numero_documento_recaudador': f.id_persona_recaudador.numero_documento,
                'cod_tipo_comprador_recaudador': f.id_persona_recaudador.cod_tipo_comprador if hasattr(f.id_persona_recaudador, 'cod_tipo_comprador') else '',
                'nombres_tipo_comprador': self.get_nombres_tipo_comprador(f.id_persona_recaudador),
                'nombre_recaudador': nombre_recaudador,
                'total_kilos': f.total_kilos,
                'valor_cuota_fomento': f.cuota_fomento,
                'precio_promedio': precio_promedio,
                'valor_intereses': intereses,
                'nro_doc_pago': f.id_liq_factura_unica.nro_doc_pago if f.id_liq_factura_unica else None,
                'fecha_pago': f.id_liq_factura_unica.fecha_pago if f.id_liq_factura_unica else None,
                'agno_pago': f.id_liq_factura_unica.fecha_pago.year if f.id_liq_factura_unica else None,
            }
            
            arreglo_regular.append(item)
            sum_kilos += f.total_kilos or 0
            sum_cuota += f.cuota_fomento or 0
            sum_precio_promedio += precio_promedio
            sum_intereses += intereses

        sum_regular = {
            'sumatoria_kilos': sum_kilos,
            'sumatoria_valor_cuota_fomento': sum_cuota,
            'sumatoria_precio_promedio': sum_precio_promedio,
            'sumatoria_valor_intereses': sum_intereses,
        }

        # Verificar si hay datos
        if not arreglo_regular:
            return Response({
                'success': False,
                'detail': 'No se encontraron registros de recaudo cuota fomento regular con los filtros especificados',
                'data': [],
                'sumatorias': {
                    'sumatoria_kilos': 0,
                    'sumatoria_valor_cuota_fomento': 0,
                    'sumatoria_precio_promedio': 0,
                    'sumatoria_valor_intereses': 0,
                }
            }, status=404)

        # Verificar si se solicita sin paginación
        if sin_paginacion:
            return Response({
                "success": True,
                "detail": f"Recaudo cuota fomento regular encontrado. Total registros: {len(arreglo_regular)}",
                "data": arreglo_regular,
                "sumatorias": sum_regular
            }, status=status.HTTP_200_OK)
        
        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(arreglo_regular, request)
        
        if page is not None:
            return paginator.get_paginated_response({ 
                "success": True,
                "detail": f"Recaudo cuota fomento regular encontrado. Total registros: {len(arreglo_regular)}",
                "data": page,
                "sumatorias": sum_regular
            })
        
        # Si no hay paginación, devolver todos los datos
        return Response({
            "success": True,
            "detail": f"Recaudo cuota fomento regular encontrado. Total registros: {len(arreglo_regular)}",
            "data": arreglo_regular,
            "sumatorias": sum_regular
        })

class DescargarRecaudoCuotaFomentoRegularView(APIView):
    permission_classes = [IsAuthenticated]

    def get_nombres_tipo_comprador(self, persona_obj):
        cod_tipo_comprador = getattr(persona_obj, 'cod_tipo_comprador', None)
        if not cod_tipo_comprador:
            return None

        from seguridad.models.transversal_models import TipoComprador
        nombres_tipo_comprador = []
        codigos = cod_tipo_comprador.split('|')
        for codigo in codigos:
            try:
                tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=codigo.strip())
                nombres_tipo_comprador.append(tipo_comprador.nombre)
            except TipoComprador.DoesNotExist:
                nombres_tipo_comprador.append(f"Desconocido ({codigo.strip()})")
        return " | ".join(nombres_tipo_comprador)

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        fecha_inicio_parsed = parse_date(fecha_inicio) if fecha_inicio else None
        fecha_fin_parsed = parse_date(fecha_fin) if fecha_fin else None

        queryset = FacturaUnica.objects.filter(id_liq_factura_unica__isnull=False)

        if fecha_inicio_parsed:
            queryset = queryset.filter(id_liq_factura_unica__fecha_pago__date__gte=fecha_inicio_parsed)
        if fecha_fin_parsed:
            queryset = queryset.filter(id_liq_factura_unica__fecha_pago__date__lte=fecha_fin_parsed)

        facturas = queryset.select_related(
            'id_persona_recaudador',
            'id_persona_recaudador__tipo_documento',
            'id_liq_factura_unica'
        )

        items = []
        total_kilos = total_cuota = total_precio = total_intereses = 0

        for f in facturas:
            if not f.id_persona_recaudador:
                continue

            rec = f.id_persona_recaudador
            if rec.tipo_persona == 'N':
                nombre = f"{rec.primer_nombre or ''} {rec.segundo_nombre or ''} {rec.primer_apellido or ''} {rec.segundo_apellido or ''}".strip()
                nombre = ' '.join(nombre.split())
            else:
                nombre = rec.razon_social or rec.nombre_comercial or ''

            kilos = f.total_kilos or 0
            cuota = f.cuota_fomento or 0
            precio_promedio = float(f.valor_bruto or 0) / kilos if kilos else 0
            intereses = f.id_liq_factura_unica.valor_intereses if f.id_liq_factura_unica else 0

            items.append({
                "agno": f.id_liq_factura_unica.fecha_pago.year if f.id_liq_factura_unica else None,
                "nitrecaudador": rec.numero_documento,
                "nrecaudador": nombre,
                "tiporecaudador": self.get_nombres_tipo_comprador(rec),
                "kilos": formato_miles(kilos),
                "cuota": formato_precio(cuota),
                "precio": formato_precio(precio_promedio),
                "valorinteres": formato_precio(intereses),
                "ncomprobante": f.id_liq_factura_unica.nro_doc_pago if f.id_liq_factura_unica else '',
                "fpago": f.id_liq_factura_unica.fecha_pago.strftime('%d/%m/%Y') if f.id_liq_factura_unica and f.id_liq_factura_unica.fecha_pago else '',
            })

            total_kilos += kilos
            total_cuota += cuota
            total_precio += precio_promedio
            total_intereses += intereses or 0

        if not items:
            return Response({
                "success": False,
                "detail": "No se encontraron datos con los filtros dados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        def mes_en_letras(numero_mes):
            meses = [
                '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ]
            try:
                return meses[int(numero_mes)]
            except:
                return ''
        mes_letras = mes_en_letras(fecha_inicio_parsed.month) if fecha_inicio_parsed else ''

        variables = {
            "items": items,
            "i": {
                "finicio": fecha_inicio_parsed.strftime('%d/%m/%Y') if fecha_inicio_parsed else '',
                "ffinal": fecha_fin_parsed.strftime('%d/%m/%Y') if fecha_fin_parsed else '',
                "mes": mes_letras,
                "ano": fecha_inicio_parsed.year if fecha_inicio_parsed else '',
                "totalkilos": formato_miles(total_kilos),
                "totalcuota": formato_precio(total_cuota),
                "tprecio": formato_precio(total_precio),
                "totalinteres": formato_precio(total_intereses)
            }
        }

        plantilla = PlantillasDoc.objects.filter(nombre="Cuota Fomento Regular").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el documento."
            }, status=status.HTTP_404_NOT_FOUND)

        import time
        t_doc0 = time.perf_counter()
        url_doc = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        t_doc = time.perf_counter() - t_doc0
        print(f"[console.log][Reportes Views] obtener_url_documento: {t_doc*1000:.1f} ms", flush=True)

        t_db0 = time.perf_counter()
        documento = DocumentosGenerados.objects.filter(id_documento_generado=url_doc).first()
        t_db = time.perf_counter() - t_db0
        print(f"[console.log][Reportes Views] buscar DocumentosGenerados: {t_db*1000:.1f} ms", flush=True)

        if not documento or not documento.documento_generado:
            return Response({
                "success": False,
                "detail": "No se pudo generar el documento."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "success": True,
            "detail": "Documento generado correctamente.",
            "data": {
                "id_documento_generado": documento.id_documento_generado,
                "documento_generado": documento.documento_generado.name,
                "archivo": Util.obtener_archivos(documento.documento_generado.name)
            }
        }, status=status.HTTP_200_OK)



class RecaudoPorAcuerdosPagoView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_nombres_tipo_comprador(self, persona_obj):
        cod_tipo_comprador = getattr(persona_obj, 'cod_tipo_comprador', None)
        if not cod_tipo_comprador:
            return None

        from seguridad.models.transversal_models import TipoComprador
        nombres_tipo_comprador = []
        codigos = cod_tipo_comprador.split('|')
        for codigo in codigos:
            try:
                tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=codigo.strip())
                nombres_tipo_comprador.append(tipo_comprador.nombre)
            except TipoComprador.DoesNotExist:
                nombres_tipo_comprador.append(f"Desconocido ({codigo.strip()})")

        return " | ".join(nombres_tipo_comprador)

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio:
            fecha_inicio = parse_date(fecha_inicio)
        if fecha_fin:
            fecha_fin = parse_date(fecha_fin)

        # RECAUDO POR ACUERDOS DE PAGO - Corregir filtros
        cuotas_queryset = CuotasAcuerdoPago.objects.all()
        
        # Aplicar filtros de fecha solo si tienen valores válidos
        if fecha_inicio:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__gte=fecha_inicio)
        if fecha_fin:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__lte=fecha_fin)
        
        # Filtrar solo cuotas que tienen fecha de pago
        cuotas = cuotas_queryset.filter(fecha_pago__isnull=False)
        
        acuerdos_ids = cuotas.values_list('id_plan_pago__id_solicitud_acuerdo_pago', flat=True).distinct()
        acuerdos = SolicitudAcuerdosPago.objects.filter(
            id_solicitud_acuerdo_pago__in=acuerdos_ids
        ).select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        )
        
        arreglo_acuerdo = []
        sum_kilos_a = sum_cuota_a = sum_precio_promedio_a = sum_intereses_a = 0

        for acuerdo in acuerdos:
            # Obtener todas las facturas asociadas a los detalles del acuerdo
            facturas_ids = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=acuerdo
            ).values_list('id_factura_unica', flat=True)
            
            facturas_acuerdo = FacturaUnica.objects.filter(
                pk__in=facturas_ids
            ).select_related('id_liq_factura_unica')
            
            total_kilos = sum([f.total_kilos or 0 for f in facturas_acuerdo])
            valor_cuota_fomento = sum([f.cuota_fomento or 0 for f in facturas_acuerdo])
            valor_intereses = sum([
                f.id_liq_factura_unica.valor_intereses or 0 
                for f in facturas_acuerdo 
                if f.id_liq_factura_unica and f.id_liq_factura_unica.valor_intereses
            ])
            total_valor_bruto = sum([f.valor_bruto or 0 for f in facturas_acuerdo])
            precio_promedio = (total_valor_bruto / total_kilos) if total_kilos else 0

            # Obtener fechas de pago de las cuotas asociadas al acuerdo - Corregir filtros
            cuotas_acuerdo_queryset = CuotasAcuerdoPago.objects.filter(
                id_plan_pago__id_solicitud_acuerdo_pago=acuerdo,
                fecha_pago__isnull=False
            )
            
            # Aplicar filtros de fecha solo si tienen valores válidos
            if fecha_inicio:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__gte=fecha_inicio)
            if fecha_fin:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__lte=fecha_fin)
            
            cuotas_acuerdo = cuotas_acuerdo_queryset
            fechas_pago_cuotas = ','.join([str(cuota.fecha_pago) for cuota in cuotas_acuerdo if cuota.fecha_pago])

            # Obtener recaudador
            recaudador = acuerdo.id_persona_solicita
            if recaudador:
                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                    nombre_recaudador = ' '.join(nombre_recaudador.split())
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
            else:
                nombre_recaudador = ''

            # Obtener comprobantes y fechas de pago
            comprobantes = [
                f.id_liq_factura_unica.nro_doc_pago
                for f in facturas_acuerdo
                if f.id_liq_factura_unica and f.id_liq_factura_unica.nro_doc_pago
            ]
            fechas_pago = [
                cuota.fecha_pago
                for cuota in CuotasAcuerdoPago.objects.filter(
                    id_plan_pago__id_solicitud_acuerdo_pago=acuerdo,
                    fecha_pago__isnull=False
                ).order_by('fecha_pago')
                if cuota.fecha_pago
            ]
            fpago = fechas_pago[0] if fechas_pago else ''
            nro_doc_pago = comprobantes[0] if comprobantes else ''

            item = {
                'tipo_documento_recaudador': str(acuerdo.id_persona_solicita.tipo_documento),
                'numero_documento_recaudador': acuerdo.id_persona_solicita.numero_documento,
                'cod_tipo_comprador_recaudador': acuerdo.id_persona_solicita.cod_tipo_comprador if hasattr(acuerdo.id_persona_solicita, 'cod_tipo_comprador') else '',
                'nombres_tipo_comprador': self.get_nombres_tipo_comprador(acuerdo.id_persona_solicita),
                'nombre_recaudador': nombre_recaudador,
                'total_kilos': total_kilos,
                'valor_cuota_fomento': valor_cuota_fomento,
                'precio_promedio': precio_promedio,
                'valor_intereses': valor_intereses,
                'nro_doc_pago': nro_doc_pago,
                'fecha_pago': fpago,
                'agno_pago': fpago.year if fpago else None,
            }
            
            arreglo_acuerdo.append(item)
            sum_kilos_a += total_kilos
            sum_cuota_a += valor_cuota_fomento
            sum_precio_promedio_a += precio_promedio
            sum_intereses_a += valor_intereses

        sum_acuerdo = {
            'sumatoria_kilos': sum_kilos_a,
            'sumatoria_valor_cuota_fomento': sum_cuota_a,
            'sumatoria_precio_promedio': sum_precio_promedio_a,
            'sumatoria_valor_intereses': sum_intereses_a,
        }

        # Verificar si hay datos
        if not arreglo_acuerdo:
            return Response({
                'success': False,
                'detail': 'No se encontraron registros de recaudo por acuerdos de pago con los filtros especificados',
                'data': [],
                'sumatorias': {
                    'sumatoria_kilos': 0,
                    'sumatoria_valor_cuota_fomento': 0,
                    'sumatoria_precio_promedio': 0,
                    'sumatoria_valor_intereses': 0,
                }
            }, status=404)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(arreglo_acuerdo, request)
        
        if page is not None:
            return paginator.get_paginated_response({
                "success": True,
                "detail": f"Recaudo por acuerdos de pago encontrado. Total registros: {len(arreglo_acuerdo)}",
                "data": page,
                "sumatorias": sum_acuerdo
            })
        
        # Si no hay paginación, devolver todos los datos
        return Response({
            "success": True,
            "detail": f"Recaudo por acuerdos de pago encontrado. Total registros: {len(arreglo_acuerdo)}",
            "data": arreglo_acuerdo,
            "sumatorias": sum_acuerdo
        })


class DescargarRecaudoPorAcuerdosPagoView(APIView):
    permission_classes = [IsAuthenticated]

    def get_nombres_tipo_comprador(self, persona_obj):
        cod_tipo_comprador = getattr(persona_obj, 'cod_tipo_comprador', None)
        if not cod_tipo_comprador:
            return ""

        from seguridad.models.transversal_models import TipoComprador
        nombres_tipo_comprador = []
        codigos = cod_tipo_comprador.split('|')
        for codigo in codigos:
            try:
                tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=codigo.strip())
                nombres_tipo_comprador.append(tipo_comprador.nombre)
            except TipoComprador.DoesNotExist:
                nombres_tipo_comprador.append(f"Desconocido ({codigo.strip()})")

        return " | ".join(nombres_tipo_comprador)

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar y parsear fechas
        if fecha_inicio:
            try:
                fecha_inicio = parse_date(fecha_inicio)
                if not fecha_inicio:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_inicio'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_fin:
            try:
                fecha_fin = parse_date(fecha_fin)
                if not fecha_fin:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_fin'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha final."
            }, status=status.HTTP_400_BAD_REQUEST)

        # RECAUDO POR ACUERDOS DE PAGO
        cuotas_queryset = CuotasAcuerdoPago.objects.all()
        
        # Aplicar filtros de fecha solo si tienen valores válidos
        if fecha_inicio:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__gte=fecha_inicio)
        if fecha_fin:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__lte=fecha_fin)
        
        # Filtrar solo cuotas que tienen fecha de pago
        cuotas = cuotas_queryset.filter(fecha_pago__isnull=False)
        
        acuerdos_ids = cuotas.values_list('id_plan_pago__id_solicitud_acuerdo_pago', flat=True).distinct()
        acuerdos = SolicitudAcuerdosPago.objects.filter(
            id_solicitud_acuerdo_pago__in=acuerdos_ids
        ).select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        )

        if not acuerdos.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros de recaudo por acuerdos de pago para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        items = []
        sum_kilos_a = sum_cuota_a = sum_precio_promedio_a = sum_intereses_a = 0

        for acuerdo in acuerdos:
            # Obtener todas las facturas asociadas a los detalles del acuerdo
            facturas_ids = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=acuerdo
            ).values_list('id_factura_unica', flat=True)
            
            facturas_acuerdo = FacturaUnica.objects.filter(
                pk__in=facturas_ids
            ).select_related('id_liq_factura_unica')
            
            total_kilos = sum([f.total_kilos or 0 for f in facturas_acuerdo])
            valor_cuota_fomento = sum([f.cuota_fomento or 0 for f in facturas_acuerdo])
            valor_intereses = sum([
                f.id_liq_factura_unica.valor_intereses or 0 
                for f in facturas_acuerdo 
                if f.id_liq_factura_unica and f.id_liq_factura_unica.valor_intereses
            ])
            total_valor_bruto = sum([f.valor_bruto or 0 for f in facturas_acuerdo])
            precio_promedio = (total_valor_bruto / total_kilos) if total_kilos else 0

            # Obtener fechas de pago de las cuotas asociadas al acuerdo
            cuotas_acuerdo_queryset = CuotasAcuerdoPago.objects.filter(
                id_plan_pago__id_solicitud_acuerdo_pago=acuerdo,
                fecha_pago__isnull=False
            )
            
            # Aplicar filtros de fecha solo si tienen valores válidos
            if fecha_inicio:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__gte=fecha_inicio)
            if fecha_fin:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__lte=fecha_fin)
            
            cuotas_acuerdo = cuotas_acuerdo_queryset
            fechas_pago_cuotas = ', '.join([cuota.fecha_pago.strftime('%d/%m/%Y') for cuota in cuotas_acuerdo if cuota.fecha_pago])

            # Obtener recaudador
            recaudador = acuerdo.id_persona_solicita
            if recaudador:
                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                    nombre_recaudador = ' '.join(nombre_recaudador.split())
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
            else:
                nombre_recaudador = ''

            # Obtener comprobantes y fechas de pago
            comprobantes = [
                f.id_liq_factura_unica.nro_doc_pago
                for f in facturas_acuerdo
                if f.id_liq_factura_unica and f.id_liq_factura_unica.nro_doc_pago
            ]
            fechas_pago = [
                cuota.fecha_pago.strftime('%d/%m/%Y')
                for cuota in cuotas_acuerdo if cuota.fecha_pago
            ]

            ncomprobante = comprobantes[0] if comprobantes else ''
            fpago = fechas_pago[0] if fechas_pago else ''
            
            items.append({
                "agno": fpago.split('/')[-1] if fpago else '',
                "nitrecaudador": recaudador.numero_documento if recaudador else '',
                "nrecaudador": nombre_recaudador,
                "tiporecaudador": self.get_nombres_tipo_comprador(recaudador) if recaudador else '',
                "kilos": formato_miles(total_kilos),
                "cuota": formato_precio(valor_cuota_fomento),
                "precio": formato_precio(precio_promedio),
                "valorinteres": formato_precio(valor_intereses),
                "ncomprobante": ncomprobante,
                "fpago": fpago,
            })
            
            sum_kilos_a += total_kilos
            sum_cuota_a += valor_cuota_fomento
            sum_precio_promedio_a += precio_promedio
            sum_intereses_a += valor_intereses

        def mes_en_letras(numero_mes):
            meses = [
                '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ]
            try:
                return meses[int(numero_mes)]
            except:
                return ''

        mes_letras = mes_en_letras(fecha_inicio.month) if fecha_inicio else ''

        variables = {
            "i": {
                # Fechas para encabezado
                "finicio": fecha_inicio.strftime('%d/%m/%Y') if fecha_inicio else '',
                "ffinal": fecha_fin.strftime('%d/%m/%Y') if fecha_fin else '',
                "mes": mes_letras,
                "ano": fecha_inicio.strftime('%Y') if fecha_inicio else '',
                
                # Totales
                "totalkilos": formato_miles(sum_kilos_a),
                "totalcuota": formato_precio(sum_cuota_a),
                "tprecio": formato_precio(sum_precio_promedio_a),
                "totalinteres": formato_precio(sum_intereses_a),
            },
            "items": items
        }

        # Buscar la plantilla
        plantilla = PlantillasDoc.objects.filter(nombre="Cuota Fomento Regular").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el reporte."
            }, status=status.HTTP_404_NOT_FOUND)

        # Generar el documento con métricas
        import time
        t_doc0 = time.perf_counter()
        url_documento = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        t_doc = time.perf_counter() - t_doc0
        print(f"[console.log][Reportes Views] obtener_url_documento: {t_doc*1000:.1f} ms", flush=True)

        t_db0 = time.perf_counter()
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        t_db = time.perf_counter() - t_db0
        print(f"[console.log][Reportes Views] buscar DocumentosGenerados: {t_db*1000:.1f} ms", flush=True)

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

class RecaudoPorInteresesAcuerdoPagoView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
        from datetime import date
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        fecha_inicio = parse_date(fecha_inicio)
        fecha_fin = parse_date(fecha_fin)
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Fechas inválidas."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener todas las cuotas pagadas en el rango
        cuotas_queryset = CuotasAcuerdoPago.objects.filter(fecha_pago__isnull=False)
        if fecha_inicio:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__gte=fecha_inicio)
        if fecha_fin:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__lte=fecha_fin)

        # Agrupar por acuerdo y obtener la primera fecha de pago de cada acuerdo
        acuerdos_fechas = {}
        for cuota in cuotas_queryset.select_related('id_plan_pago__id_solicitud_acuerdo_pago'):
            acuerdo_id = cuota.id_plan_pago.id_solicitud_acuerdo_pago_id
            fecha_pago = cuota.fecha_pago.date() if cuota.fecha_pago else None
            if acuerdo_id and fecha_pago:
                if acuerdo_id not in acuerdos_fechas or fecha_pago < acuerdos_fechas[acuerdo_id]:
                    acuerdos_fechas[acuerdo_id] = fecha_pago

        # Solo incluir acuerdos cuya primera cuota pagada esté dentro del rango
        acuerdos_ids = [aid for aid, f in acuerdos_fechas.items()
                       if (not fecha_inicio or f >= fecha_inicio) and (not fecha_fin or f <= fecha_fin)]
        acuerdos = SolicitudAcuerdosPago.objects.filter(
            id_solicitud_acuerdo_pago__in=acuerdos_ids
        ).select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        )

        arreglo_intereses = []
        sum_intereses_total = 0
        for acuerdo in acuerdos:
            facturas_ids = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=acuerdo
            ).values_list('id_factura_unica', flat=True)
            facturas_acuerdo = FacturaUnica.objects.filter(
                pk__in=facturas_ids
            ).select_related('id_liq_factura_unica')
            intereses_facturas = []
            nro_doc_pago_facturas = []
            for f in facturas_acuerdo:
                if f.id_liq_factura_unica and f.id_liq_factura_unica.valor_intereses:
                    intereses_facturas.append(float(f.id_liq_factura_unica.valor_intereses))
                if f.id_liq_factura_unica and f.id_liq_factura_unica.nro_doc_pago:
                    nro_doc_pago_facturas.append(str(f.id_liq_factura_unica.nro_doc_pago))
            valor_intereses_acuerdo = sum(intereses_facturas)
            nro_doc_pago_primero = nro_doc_pago_facturas[0] if nro_doc_pago_facturas else ''

            # Obtener fechas de pago de las cuotas asociadas al acuerdo 
            cuotas_acuerdo_queryset = CuotasAcuerdoPago.objects.filter(
                id_plan_pago__id_solicitud_acuerdo_pago=acuerdo,
                fecha_pago__isnull=False
            )
            
            # Aplicar filtros de fecha solo si tienen valores válidos
            if fecha_inicio:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__gte=fecha_inicio)
            if fecha_fin:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__lte=fecha_fin)
            
            cuotas_acuerdo = cuotas_acuerdo_queryset
            fechas_pago_cuotas = ','.join([str(cuota.fecha_pago) for cuota in cuotas_acuerdo if cuota.fecha_pago])

            cuotas_acuerdo = cuotas_acuerdo_queryset
            fechas_pago = [cuota.fecha_pago for cuota in cuotas_acuerdo if cuota.fecha_pago]
            fecha_pago_primera = fechas_pago[0] if fechas_pago else None

            # Obtener recaudador
            # Obtener la primera fecha de pago del acuerdo (ya filtrada)
            fecha_pago_primera = acuerdos_fechas.get(acuerdo.id_solicitud_acuerdo_pago)
            if fecha_pago_primera:
                try:
                    mes_letras = mes_en_letras(fecha_pago_primera.month)
                except Exception:
                    mes_letras = ''
            else:
                mes_letras = ''
            recaudador = acuerdo.id_persona_solicita
            if recaudador:
                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                    nombre_recaudador = ' '.join(nombre_recaudador.split())
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
            else:
                nombre_recaudador = ''

            def mes_en_letras(numero_mes):
                meses = [
                    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ]
                try:
                    return meses[int(numero_mes)]
                except:
                    return ''    
                
            mes_letras = mes_en_letras(fecha_pago_primera.month) if fecha_pago_primera else ''

            # Solo agregar el registro si valor_intereses es mayor a 0
            if valor_intereses_acuerdo > 0:
                # Buscar la cuota con la primera fecha de pago para este acuerdo
                cuota_primera = CuotasAcuerdoPago.objects.filter(
                    id_plan_pago__id_solicitud_acuerdo_pago=acuerdo,
                    fecha_pago__isnull=False
                ).order_by('fecha_pago').first()
                fecha_pago_db = cuota_primera.fecha_pago if cuota_primera else None
                
                item = {
                    'fecha_creacion': acuerdo.fecha_solicitud,
                    'tipo_documento_recaudador': str(acuerdo.id_persona_solicita.tipo_documento),
                    'numero_documento_recaudador': acuerdo.id_persona_solicita.numero_documento,
                    'nombre_recaudador': nombre_recaudador,
                    'fecha_pago': fecha_pago_db,
                    'nro_doc_pago': nro_doc_pago_primero,
                    'valor_intereses': valor_intereses_acuerdo,
                    'mes': mes_letras,
                }
                arreglo_intereses.append(item)
                sum_intereses_total += valor_intereses_acuerdo

        sum_intereses_dict = {
            'sumatoria_valor_intereses': sum_intereses_total
        }

        if not arreglo_intereses:
            return Response({
                'success': False,
                'detail': 'No se encontraron registros de recaudo por intereses de acuerdo de pago con los filtros especificados',
                'data': [],
                'sumatorias': {
                    'sumatoria_valor_intereses': 0
                }
            }, status=404)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(arreglo_intereses, request)
        if page is not None:
            return paginator.get_paginated_response({
                "success": True,
                "detail": f"Recaudo por intereses de acuerdo de pago encontrado. Total registros: {len(arreglo_intereses)}",
                "data": page,
                "sumatorias": sum_intereses_dict
            })
        return Response({
            "success": True,
            "detail": f"Recaudo por intereses de acuerdo de pago encontrado. Total registros: {len(arreglo_intereses)}",
            "data": arreglo_intereses,
            "sumatorias": sum_intereses_dict
        })

def mes_en_letras(numero_mes):
    meses = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    try:
        return meses[int(numero_mes)]
    except:
        return ''

# --- INICIO: función auxiliar para obtener datos de intereses de acuerdo de pago ---
def obtener_datos_intereses_acuerdo_pago(fecha_inicio, fecha_fin):
    items = []
    sum_intereses_total = 0
    cuotas_queryset = CuotasAcuerdoPago.objects.all()
    if fecha_inicio:
        cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__gte=fecha_inicio)
    if fecha_fin:
        cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__lte=fecha_fin)
    cuotas_queryset = cuotas_queryset.filter(fecha_pago__isnull=False)
    # Agrupar por acuerdo y obtener la primera fecha de pago de cada acuerdo
    acuerdos_fechas = {}
    for cuota in cuotas_queryset.select_related('id_plan_pago__id_solicitud_acuerdo_pago'):
        acuerdo_id = cuota.id_plan_pago.id_solicitud_acuerdo_pago_id
        fecha_pago = cuota.fecha_pago.date() if cuota.fecha_pago else None
        if acuerdo_id and fecha_pago:
            if acuerdo_id not in acuerdos_fechas or fecha_pago < acuerdos_fechas[acuerdo_id]:
                acuerdos_fechas[acuerdo_id] = fecha_pago
    # Solo incluir acuerdos cuya primera cuota pagada esté dentro del rango
    acuerdos_ids = [aid for aid, f in acuerdos_fechas.items()
                   if (not fecha_inicio or f >= fecha_inicio) and (not fecha_fin or f <= fecha_fin)]
    acuerdos = SolicitudAcuerdosPago.objects.filter(
        id_solicitud_acuerdo_pago__in=acuerdos_ids
    ).select_related(
        'id_persona_solicita',
        'id_persona_solicita__tipo_documento'
    )
    for acuerdo in acuerdos:
        facturas_ids = DetalleAcuerdoPago.objects.filter(
            id_Solicitud_acuerdo_pago=acuerdo
        ).values_list('id_factura_unica', flat=True)
        facturas_acuerdo = FacturaUnica.objects.filter(
            pk__in=facturas_ids
        ).select_related('id_liq_factura_unica')
        intereses_facturas = []
        nro_doc_pago_facturas = []
        for f in facturas_acuerdo:
            if f.id_liq_factura_unica and f.id_liq_factura_unica.valor_intereses:
                intereses_facturas.append(float(f.id_liq_factura_unica.valor_intereses))
            if f.id_liq_factura_unica and f.id_liq_factura_unica.nro_doc_pago:
                nro_doc_pago_facturas.append(str(f.id_liq_factura_unica.nro_doc_pago))
        valor_intereses_acuerdo = sum(intereses_facturas)
        nro_doc_pago_primero = nro_doc_pago_facturas[0] if nro_doc_pago_facturas else ''
        # Obtener la primera fecha de pago del acuerdo (ya filtrada)
        fecha_pago_primera = acuerdos_fechas.get(acuerdo.id_solicitud_acuerdo_pago)
        if fecha_pago_primera:
            try:
                mes_letras = mes_en_letras(fecha_pago_primera.month)
            except Exception:
                mes_letras = ''
        else:
            mes_letras = ''
        recaudador = acuerdo.id_persona_solicita
        if recaudador:
            if recaudador.tipo_persona == 'N':
                nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                nombre_recaudador = ' '.join(nombre_recaudador.split())
            else:
                nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
        else:
            nombre_recaudador = ''
        if valor_intereses_acuerdo > 0:
            items.append({
                "fregistro": acuerdo.fecha_solicitud.strftime('%d/%m/%Y') if acuerdo.fecha_solicitud else '',
                "nitrecaudador": recaudador.numero_documento if recaudador else '',
                "nrecaudador": nombre_recaudador,
                "fpago": fecha_pago_primera.strftime('%d/%m/%Y') if fecha_pago_primera else '',
                "ncomprobante": nro_doc_pago_primero,
                "valorinteres": formato_precio(valor_intereses_acuerdo),
                "mes": mes_letras,
            })
            sum_intereses_total += valor_intereses_acuerdo
    return items, sum_intereses_total
# --- FIN función auxiliar ---
class DescargarRecaudoPorInteresesAcuerdoPagoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        # Validar que ambos parámetros de fecha sean obligatorios
        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Los parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar y parsear fechas
        if fecha_inicio:
            try:
                fecha_inicio = parse_date(fecha_inicio)
                if not fecha_inicio:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_inicio'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_fin:
            try:
                fecha_fin = parse_date(fecha_fin)
                if not fecha_fin:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_fin'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha final."
            }, status=status.HTTP_400_BAD_REQUEST)

        # RECAUDO POR INTERESES DE ACUERDO DE PAGO
        cuotas_queryset = CuotasAcuerdoPago.objects.all()
        
        # Aplicar filtros de fecha solo si tienen valores válidos
        if fecha_inicio:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__gte=fecha_inicio)
        if fecha_fin:
            cuotas_queryset = cuotas_queryset.filter(fecha_pago__date__lte=fecha_fin)
        
        # Filtrar solo cuotas que tienen fecha de pago
        cuotas = cuotas_queryset.filter(fecha_pago__isnull=False)
        
        acuerdos_ids = cuotas.values_list('id_plan_pago__id_solicitud_acuerdo_pago', flat=True).distinct()
        acuerdos = SolicitudAcuerdosPago.objects.filter(
            id_solicitud_acuerdo_pago__in=acuerdos_ids
        ).select_related(
            'id_persona_solicita',
            'id_persona_solicita__tipo_documento'
        )

        if not acuerdos.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros de recaudo por intereses para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)
        
        items = []
        sum_intereses_total = 0

        for acuerdo in acuerdos:
            # Obtener todas las facturas asociadas a los detalles del acuerdo
            facturas_ids = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=acuerdo
            ).values_list('id_factura_unica', flat=True)
            
            facturas_acuerdo = FacturaUnica.objects.filter(
                pk__in=facturas_ids
            ).select_related('id_liq_factura_unica')
            
            intereses_facturas = []
            nro_doc_pago_facturas = []
            
            for f in facturas_acuerdo:
                if f.id_liq_factura_unica and f.id_liq_factura_unica.valor_intereses:
                    intereses_facturas.append(float(f.id_liq_factura_unica.valor_intereses))
                if f.id_liq_factura_unica and f.id_liq_factura_unica.nro_doc_pago:
                    nro_doc_pago_facturas.append(str(f.id_liq_factura_unica.nro_doc_pago))
            
            valor_intereses_acuerdo = sum(intereses_facturas)
            nro_doc_pago_liquidaciones = ', '.join(nro_doc_pago_facturas)
            nro_doc_pago_primero = nro_doc_pago_facturas[0] if nro_doc_pago_facturas else ''
            
            # Obtener fechas de pago de las cuotas asociadas al acuerdo 
            cuotas_acuerdo_queryset = CuotasAcuerdoPago.objects.filter(
                id_plan_pago__id_solicitud_acuerdo_pago=acuerdo,
                fecha_pago__isnull=False
            )
            
            # Aplicar filtros de fecha solo si tienen valores válidos
            if fecha_inicio:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__gte=fecha_inicio)
            if fecha_fin:
                cuotas_acuerdo_queryset = cuotas_acuerdo_queryset.filter(fecha_pago__date__lte=fecha_fin)
            
            cuotas_acuerdo = cuotas_acuerdo_queryset
            fechas_pago_cuotas = ', '.join([cuota.fecha_pago.strftime('%d/%m/%Y') for cuota in cuotas_acuerdo if cuota.fecha_pago])
            fechas_pago = [cuota.fecha_pago.strftime('%d/%m/%Y') for cuota in cuotas_acuerdo if cuota.fecha_pago]
            fecha_pago_primera = fechas_pago[0] if fechas_pago else ''
            if fecha_pago_primera:
                try:
                    fecha_pago_dt = datetime.strptime(fecha_pago_primera, '%d/%m/%Y')
                    mes_letras = mes_en_letras(fecha_pago_dt.month)
                except Exception:
                    mes_letras = ''
            else:
                mes_letras = ''

            # Obtener recaudador
            recaudador = acuerdo.id_persona_solicita
            if recaudador:
                if recaudador.tipo_persona == 'N':
                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                    nombre_recaudador = ' '.join(nombre_recaudador.split())
                else:
                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
            else:
                nombre_recaudador = ''

            
            # Solo agregar items que tengan intereses
            if valor_intereses_acuerdo > 0:
                items.append({
                    "fregistro": acuerdo.fecha_solicitud.strftime('%d/%m/%Y') if acuerdo.fecha_solicitud else '',
                    "nitrecaudador": recaudador.numero_documento if recaudador else '',
                    "nrecaudador": nombre_recaudador,
                    "fpago": fecha_pago_primera,
                    "ncomprobante": nro_doc_pago_primero,
                    "valorinteres": formato_precio(valor_intereses_acuerdo),
                    "mes": mes_letras, 
                })
                # Sumar después de agregar el item
                sum_intereses_total += valor_intereses_acuerdo

        # Verificar si hay items antes de generar el documento
        if not items:
            return Response({
                "success": False,
                "detail": "No se encontraron registros con intereses para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)

        variables = {
            "i": {
                # Fechas para encabezado
                "fechainicio": fecha_inicio.strftime('%d/%m/%Y') if fecha_inicio else '',
                "fechafinal": fecha_fin.strftime('%d/%m/%Y') if fecha_fin else '',
                "mes": fecha_inicio.strftime('%m') if fecha_inicio else '',
                
                # Total
                "totalinteres": formato_precio(sum_intereses_total),
            },
            "items": items
        }

        # Buscar la plantilla
        plantilla = PlantillasDoc.objects.filter(nombre="Recaudo Por Intereses").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el reporte."
            }, status=status.HTTP_404_NOT_FOUND)

        # Generar el documento
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

        # Validar y parsear fechas
        if fecha_inicio:
            try:
                fecha_inicio = parse_date(fecha_inicio)
                if not fecha_inicio:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_inicio'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_fin:
            try:
                fecha_fin = parse_date(fecha_fin)
                if not fecha_fin:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_fin'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha final."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Usar función auxiliar para obtener los datos
        items, sum_intereses_total = obtener_datos_intereses_acuerdo_pago(fecha_inicio, fecha_fin)

        if not items:
            return Response({
                "success": False,
                "detail": "No se encontraron registros con intereses para los parámetros dados."
            }, status=status.HTTP_404_NOT_FOUND)

        variables = {
            "i": {
                # Fechas para encabezado
                "fechainicio": fecha_inicio.strftime('%d/%m/%Y') if fecha_inicio else '',
                "fechafinal": fecha_fin.strftime('%d/%m/%Y') if fecha_fin else '',
                "mes": fecha_inicio.strftime('%m') if fecha_inicio else '',
                # Total
                "totalinteres": formato_precio(sum_intereses_total),
            },
            "items": items
        }

        # Buscar la plantilla
        plantilla = PlantillasDoc.objects.filter(nombre="Recaudo Por Intereses").first()
        if not plantilla:
            return Response({
                "success": False,
                "detail": "No se encontró la plantilla para generar el reporte."
            }, status=status.HTTP_404_NOT_FOUND)

        # Generar el documento
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