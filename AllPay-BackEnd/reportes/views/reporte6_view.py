import math
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.models.recaudos_models import FacturaUnica, Pagos
from recaudos.utils import Utils
from recaudos.views.cartera_view import obtener_url_documento
from rest_framework.pagination import PageNumberPagination
from seguridad.models.transversal_models import Personas
from seguridad.utils import Util
from reportes.serializers.reportes_serializers import ReportePagosEnLineaSerializer
from datetime import datetime


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size' 
    max_page_size = 100  

    def get_paginated_response(self, data):
        total_pages = math.ceil(self.page.paginator.count / self.page.paginator.per_page)
        current_page = self.page.number

        return Response({
            "success": True,
            "count": self.page.paginator.count,
            "total_pages": total_pages,
            "current_page": current_page,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "data": data
        })
    

class ReportePagosEnLineaView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    serializer_class = ReportePagosEnLineaSerializer

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() == 'true'

        facturas_pagas = FacturaUnica.objects.filter(estado_factura='PA').select_related(
            'id_liq_factura_unica', 'id_persona_recaudador'
        )

        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Debe proporcionar al menos una fecha de inicio y una fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio:
            try:
                fecha_inicio_parsed = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                facturas_pagas = facturas_pagas.filter(
                    id_liq_factura_unica__fecha_liquidacion__date__gte=fecha_inicio_parsed
                )
            except ValueError:
                pass

        if fecha_fin:
            try:
                fecha_fin_parsed = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
                facturas_pagas = facturas_pagas.filter(
                    id_liq_factura_unica__fecha_liquidacion__date__lte=fecha_fin_parsed
                )
            except ValueError:
                pass

        facturas_pagas = facturas_pagas.order_by('-id_liq_factura_unica__fecha_liquidacion')

        if not facturas_pagas.exists():
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas pagas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        v_totalcuota = 0
        v_totalinteres = 0
        
        for factura in facturas_pagas:
            v_totalcuota += factura.cuota_fomento
            v_totalinteres += factura.id_liq_factura_unica.valor_intereses or 0

        # Verificar si se solicita sin paginación
        if sin_paginacion:
            serializer = self.serializer_class(facturas_pagas, many=True)
            return Response({
                "success": True,
                "detail": "Registros obtenidos correctamente.",
                "data": {
                    'pagos': serializer.data,
                    "total_cuota": Utils.formato_peso(v_totalcuota),
                    "total_interes": Utils.formato_peso(v_totalinteres)
                }
            }, status=status.HTTP_200_OK)
        else:
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(facturas_pagas, request)
            serializer = self.serializer_class(page, many=True)
            return paginator.get_paginated_response({
                'pagos': serializer.data,
                "total_cuota": Utils.formato_peso(v_totalcuota),
                "total_interes": Utils.formato_peso(v_totalinteres)
            })
    
class DescargarReportePagosEnLineaView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    serializer_class = ReportePagosEnLineaSerializer

    def get_nombre_recaudador(self, obj):
        persona = obj.id_persona_recaudador
        if persona:
            if persona.tipo_persona == 'N':
                return ' '.join(filter(None, [
                    persona.primer_nombre,
                    persona.segundo_nombre,
                    persona.primer_apellido,
                    persona.segundo_apellido
                ])).strip()
            else:
                return persona.razon_social or persona.nombre_comercial
        return ''

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        facturas_pagas = FacturaUnica.objects.filter(estado_factura='PA').select_related(
            'id_liq_factura_unica', 'id_persona_recaudador'
        )

        if not fecha_inicio or not fecha_fin:
            return Response({
                "success": False,
                "detail": "Debe proporcionar al menos una fecha de inicio y una fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio:
            try:
                fecha_inicio_parsed = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                facturas_pagas = facturas_pagas.filter(
                    id_liq_factura_unica__fecha_liquidacion__date__gte=fecha_inicio_parsed
                )
            except ValueError:
                pass

        if fecha_fin:
            try:
                fecha_fin_parsed = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
                facturas_pagas = facturas_pagas.filter(
                    id_liq_factura_unica__fecha_liquidacion__date__lte=fecha_fin_parsed
                )
            except ValueError:
                pass

        facturas_pagas = facturas_pagas.order_by('-id_liq_factura_unica__fecha_liquidacion')

        if not facturas_pagas.exists():
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas pagas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        id_plantilla = PlantillasDoc.objects.filter(nombre="Reporte Pagos Linea").first()
        # Obtener el archivo asociado a la factura 
        variables = {
            "fechainicio": Utils.formatear_fecha(fecha_inicio),
            "fechafinal": Utils.formatear_fecha(fecha_fin),
        }

        items = []
        v_totalcuota = 0
        v_totalinteres = 0

        for factura in facturas_pagas:
            # Asignar los valores de cada campo del pago a las variables
            items.append({
                'fregistro': factura.id_liq_factura_unica.fecha_liquidacion.strftime('%d-%m-%Y') if factura.id_liq_factura_unica.fecha_liquidacion else '',
                'nitrecaudador': factura.id_persona_recaudador.numero_documento if factura.id_persona_recaudador else '',
                'nrecaudador': self.get_nombre_recaudador(factura),
                'fcompra': factura.fecha_compra.strftime('%d-%m-%Y') if factura.fecha_compra else '',
                'nfactura': factura.nro_factura_unica,
                'vcuota': str(Utils.formato_peso(factura.cuota_fomento)),
                'valorinteres': str(Utils.formato_peso(factura.id_liq_factura_unica.valor_intereses)),
                'fpago': factura.id_liq_factura_unica.fecha_pago.strftime('%d-%m-%Y') if factura.id_liq_factura_unica.fecha_pago else '',
                'ncomprobante': factura.id_liq_factura_unica.nro_doc_pago if factura.id_liq_factura_unica else '',
            })
            v_totalcuota += factura.cuota_fomento or 0
            v_totalinteres += factura.id_liq_factura_unica.valor_intereses or 0

        variables['items'] = items
        variables['totalcuota'] = str(Utils.formato_peso(v_totalcuota))
        variables['totalinteres'] = str(Utils.formato_peso(v_totalinteres))
        url_documento = obtener_url_documento(request, id_plantilla.id_plantilla_doc, variables, False)
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        if not documento_generado:
            raise ValidationError("Documento no encontrado.")
        
        documento_generado.id_documento_generado
        if not documento_generado.documento_generado:
            return Response({
                "success": False,
                "detail": "No se encontró el documento generado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        data_response = {
            "id_documento_generado": documento_generado.id_documento_generado,
            "documento_generado": documento_generado.documento_generado.name,
            "archivo": Util.obtener_archivos(documento_generado.documento_generado.name)
        }

        return Response({
            "success": True,
            "detail": "Documento generado correctamente.",
            "data": data_response
        }, status=status.HTTP_200_OK)