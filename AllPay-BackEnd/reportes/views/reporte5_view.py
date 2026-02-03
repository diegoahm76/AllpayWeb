import math
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.models.recaudos_models import CargueSicex
from recaudos.utils import Utils
from recaudos.views.cartera_view import obtener_url_documento
from recaudos.serializers.tipos_cacao_serializers import CargueSicexSerializer
from rest_framework.pagination import PageNumberPagination
from seguridad.utils import Util
from django.db.models import Sum


def formato_peso(valor):
    if valor is None:
        valor = 0.0
    try:
        valor = float(valor)
        valor_formateado = "${:,.2f}".format(valor).replace(",", "TEMP").replace(".", ",").replace("TEMP", ".")
        return valor_formateado
    except (ValueError, TypeError):
        raise ValidationError("El valor no es un número válido.")

   
def formato_numero(numero):
    if numero is None:
        return "0,00"
    return f"{numero:,.2f}".replace(",", "TEMP").replace(".", ",").replace("TEMP", ".")


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
    

class ReporteSicexView(APIView):

    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer
    pagination_class = CustomPagination

    def get(self, request):        

        # Obtener los parámetros de fecha de inicio y fin del request
        fecha_inicio = request.query_params.get('fecha_inicio', None)
        fecha_fin = request.query_params.get('fecha_fin', None)
        tipo_cargue = request.query_params.get('tipo_cargue', None)
        empresa_declarante = request.query_params.get('empresa_declarante', None)
        pais = request.query_params.get('pais', None)
        posicion = request.query_params.get('posicion', None)
        via = request.query_params.get('via', None)

        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None
        empresa_declarante = empresa_declarante.upper() if empresa_declarante else None
        pais = pais.upper() if pais else None
        via = via.upper() if via else None
        
        cargues_sicex = CargueSicex.objects.all()

        if fecha_inicio is None or fecha_fin is None or tipo_cargue is None:
            return Response({
                "success": False,
                "detail": "Parámetros requeridos: fecha_inicio, fecha_fin y tipo_cargue."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio:
            cargues_sicex = cargues_sicex.filter(fecha__date__gte=fecha_inicio)
        if fecha_fin:
            cargues_sicex = cargues_sicex.filter(fecha__date__lte=fecha_fin)
        if tipo_cargue:
            cargues_sicex = cargues_sicex.filter(cod_tipo_cargue=tipo_cargue)
        if pais:
            cargues_sicex = cargues_sicex.filter(pais=pais)
        if posicion:
            cargues_sicex = cargues_sicex.filter(pos=posicion)
        if via:
            cargues_sicex = cargues_sicex.filter(via=via)
        if empresa_declarante:
            cargues_sicex = cargues_sicex.filter(empresa_declarante=empresa_declarante)

        if not cargues_sicex:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)
        
        total_peso = cargues_sicex.aggregate(total_peso_neto=Sum('total_peso_neto'))['total_peso_neto'] or 0
        total_toneladas = cargues_sicex.aggregate(total_toneladas_neto=Sum('total_toneladas_neto'))['total_toneladas_neto'] or 0
        total_valor_cif = cargues_sicex.aggregate(total_valor_cif=Sum('total_valor_cif'))['total_valor_cif'] or 0
        total_valor_fob = cargues_sicex.aggregate(total_valor_fob=Sum('total_valor_fob'))['total_valor_fob'] or 0
        
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(cargues_sicex, request)
        serializer = self.serializer_class(page, many=True)

        return paginator.get_paginated_response({
            'cargue_sicex': serializer.data,
            "total_peso": formato_numero(total_peso),
            "total_toneladas": formato_numero(total_toneladas),
            "total_valor_cif": formato_peso(total_valor_cif),
            "total_valor_fob": formato_peso(total_valor_fob)
        })

class DescargarReporteSicexView(APIView):

    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer 

    def get(self, request):        

        # Obtener los parámetros de fecha de inicio y fin del request
        fecha_inicio = request.query_params.get('fecha_inicio', None)
        fecha_fin = request.query_params.get('fecha_fin', None)
        tipo_cargue = request.query_params.get('tipo_cargue', None)
        empresa_declarante = request.query_params.get('empresa_declarante', None)
        pais = request.query_params.get('pais', None)
        posicion = request.query_params.get('posicion', None)
        via = request.query_params.get('via', None)
        
        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None
        empresa_declarante = empresa_declarante.upper() if empresa_declarante else None
        pais = pais.upper() if pais else None
        via = via.upper() if via else None
        
        cargues_sicex = CargueSicex.objects.all()

        if fecha_inicio is None or fecha_fin is None or tipo_cargue is None:
            return Response({
                "success": False,
                "detail": "Parámetros requeridos: fecha_inicio, fecha_fin y tipo_cargue."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio:
            cargues_sicex = cargues_sicex.filter(fecha__date__gte=fecha_inicio)
        if fecha_fin:
            cargues_sicex = cargues_sicex.filter(fecha__date__lte=fecha_fin)
        if tipo_cargue:
            cargues_sicex = cargues_sicex.filter(cod_tipo_cargue=tipo_cargue)
        if pais:
            cargues_sicex = cargues_sicex.filter(pais=pais)
        if posicion:
            cargues_sicex = cargues_sicex.filter(pos=posicion)
        if via:
            cargues_sicex = cargues_sicex.filter(via=via)
        if empresa_declarante:
            cargues_sicex = cargues_sicex.filter(empresa_declarante=empresa_declarante)

        if not cargues_sicex:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)

        # Obtener el archivo asociado a la factura 
        variables = {
            "fechainicio": Utils.formatear_fecha(fecha_inicio),
            "fechafinal": Utils.formatear_fecha(fecha_fin),
            "tipocargue": tipo_cargue,
        }

        items = []
        v_totalpeso = 0
        v_totaltonelada = 0
        v_totalcif = 0
        v_totalfob = 0

        if tipo_cargue == 'IMP':
            id_plantilla = PlantillasDoc.objects.filter(nombre="Reporte Sicex Importacion").first()  
            for cargue in cargues_sicex:
                # Asignar los valores de cada campo del cargue a las variables
                items.append({
                    'agno': str(cargue.agno),
                    'aduana': str(cargue.aduana_embarque),
                    'ciudad': str(cargue.ciudad_ingreso),
                    'continente': str(cargue.continente),
                    'dpto': str(cargue.departamento),
                    'arancel': str(cargue.descripcion_arancel),
                    'importador': str(cargue.empresa_declarante),
                    'exportador': str(cargue.empresa_operadora),
                    'fecha': cargue.fecha.strftime('%d-%m-%Y') if cargue.fecha else '',
                    'mes': str(cargue.mes),
                    'nit': str(cargue.nit),
                    'declara': str(cargue.nro_declaracion),
                    'pais': str(cargue.pais),
                    'posicion': str(cargue.posicion),
                    'pos': str(cargue.pos),
                    'proveedor': str(cargue.proveedor),
                    'tpesobruto': str(formato_numero(cargue.total_peso_bruto)),
                    'ttonbruto': str(formato_numero(cargue.total_toneladas_bruto)),
                    'tpesoneto': str(formato_numero(cargue.total_peso_neto)),
                    'ttonneto': str(formato_numero(cargue.total_toneladas_neto)),
                    'factor': str(formato_numero(cargue.factor_conversion)),
                    'vcif': str(formato_peso(cargue.total_valor_cif)),
                    'vfob': str(formato_peso(cargue.total_valor_fob)),
                    'via': str(cargue.via)
                })
                v_totalpeso += cargue.total_peso_neto or 0
                v_totaltonelada += cargue.total_toneladas_neto or 0
                v_totalcif += cargue.total_valor_cif or 0
                v_totalfob += cargue.total_valor_fob or 0
               
        elif tipo_cargue == 'EXP': 

            id_plantilla = PlantillasDoc.objects.filter(nombre="Reporte Sicex Exportacion").first()
            for cargue in cargues_sicex:
                # Asignar los valores de cada campo del cargue a las variables
                items.append({
                    'agno': str(cargue.agno),
                    'aduana': str(cargue.aduana_embarque),
                    'autoembarque': str(cargue.auto_embarque),
                    'continente': str(cargue.continente),
                    'arancel': str(cargue.descripcion_arancel),
                    'exportador': str(cargue.empresa_declarante),
                    'importador': str(cargue.empresa_operadora),
                    'fecha': cargue.fecha.strftime('%d-%m-%Y') if cargue.fecha else '',
                    'mes': str(cargue.mes),
                    'nit': str(cargue.nit),
                    'declara': str(cargue.nro_declaracion),
                    'pais': str(cargue.pais),
                    'posicion': str(cargue.posicion),
                    'pos': str(cargue.pos),
                    'tpesobruto': str(formato_numero(cargue.total_peso_bruto)),
                    'ttonbruto': str(formato_numero(cargue.total_toneladas_bruto)),
                    'tpesoneto': str(formato_numero(cargue.total_peso_neto)),
                    'ttonneto': str(formato_numero(cargue.total_toneladas_neto)),
                    'factor': str(formato_numero(cargue.factor_conversion)),
                    'vcif': str(formato_peso(cargue.total_valor_cif)),
                    'vfob': str(formato_peso(cargue.total_valor_fob)),
                    'via': str(cargue.via)
                })
                v_totalpeso += cargue.total_peso_neto or 0
                v_totaltonelada += cargue.total_toneladas_neto or 0
                v_totalcif += cargue.total_valor_cif or 0
                v_totalfob += cargue.total_valor_fob or 0
        else:
            return Response({
                "success": False,
                "detail": "Tipo de cargue no válido. Debe ser 'IMP' o 'EXP'."
            }, status=status.HTTP_400_BAD_REQUEST)

        variables['items'] = items
        variables['totalpeso'] = str(formato_numero(v_totalpeso))
        variables['totaltonelada'] = str(formato_numero(v_totaltonelada))
        variables['totalcif'] = str(formato_peso(v_totalcif))
        variables['totalfob'] = str(formato_peso(v_totalfob))
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