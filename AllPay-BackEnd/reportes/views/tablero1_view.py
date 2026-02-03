from datetime import datetime
from dateutil.relativedelta import relativedelta
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from recaudos.models.recaudos_models import CargueSicex
from recaudos.serializers.tipos_cacao_serializers import CargueSicexSerializer
from django.db.models import Sum
from reportes.choices.continente_choices import continente_choices
from reportes.choices.via_choices import via_choices
from reportes.utils import formato_numero


class AduanaEmbarqueview(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aduanas = CargueSicex.objects.values('aduana_embarque').distinct().order_by('aduana_embarque')
        lista_aduanas = [aduana['aduana_embarque'] for aduana in aduanas]
        return Response({
                "success": True,
                "detail": "Lista de puertos o aduanas",
                "data": lista_aduanas
            }, status=status.HTTP_200_OK)
    

class Posicionview(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        posiciones = CargueSicex.objects.values('pos').distinct().order_by('pos')
        lista_posiciones = [posicion['pos'] for posicion in posiciones]
        return Response({
                "success": True,
                "detail": "Lista de posiciones",
                "data": lista_posiciones
            }, status=status.HTTP_200_OK)
        

class ContinenteView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = continente_choices
        return Response({'success':True, 'detail':'Se encontraron los siguientes continentes', 'data': choices}, status=status.HTTP_200_OK)


class ViaView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = via_choices
        return Response({'success':True, 'detail':'Se encontraron los siguientes tipos de vía', 'data': choices}, status=status.HTTP_200_OK)


class TableroControlSicex(APIView):

    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer

    def get(self, request):        

        # Obtener los parámetros de fecha de inicio y fin del request
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        posicion = request.query_params.get('posicion', None)
        aduana_embarque = request.query_params.get('aduana_embarque', None)
        continente = request.query_params.get('continente', None)
        via = request.query_params.get('via', None)
        comparativo_agno = request.query_params.get('comparativo_agno', None)
        tipo_cargue = request.query_params.get('tipo_cargue', None)
        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None
        pais = request.query_params.get('pais', None)
        empresa = request.query_params.get('empresa', None)
        fecha_inicio = None
        fecha_fin = None

        if fecha_inicio_str and fecha_fin_str:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()

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
        
        cargues_sicex = CargueSicex.objects.filter(cod_tipo_cargue=tipo_cargue)
            
        if fecha_inicio:
            cargues_sicex = cargues_sicex.filter(fecha__date__gte=fecha_inicio)
        if fecha_fin:
            cargues_sicex = cargues_sicex.filter(fecha__date__lte=fecha_fin)
        if posicion:
            cargues_sicex = cargues_sicex.filter(pos__icontains=posicion)
        if aduana_embarque:
            cargues_sicex = cargues_sicex.filter(aduana_embarque__icontains=aduana_embarque)
        if continente:
            cargues_sicex = cargues_sicex.filter(continente__icontains=continente)
        if via:
            cargues_sicex = cargues_sicex.filter(via__icontains=via)    
        if pais:
            cargues_sicex = cargues_sicex.filter(pais__icontains=pais)
        if empresa:
            cargues_sicex = cargues_sicex.filter(empresa_declarante__icontains=empresa)

        if not cargues_sicex:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)
        
        total_toneladas = cargues_sicex.aggregate(total_toneladas_neto=Sum('total_toneladas_neto'))['total_toneladas_neto'] or 0
     
        # 1. Agrupar por país con suma
        tabla_pais = list(cargues_sicex.values('pais').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto')
        ).order_by('-total_toneladas_neto'))

        # Calcular porcentaje para cada país
        for item in tabla_pais:
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

        # Tomar los 10 primeros y sumar el resto
        top_10_paises = tabla_pais[:10]
        otros_paises = tabla_pais[10:]

        if otros_paises:
            total_otros_toneladas = sum(float(item['total_toneladas_neto']) or 0 for item in otros_paises)
            total_otros_porcentaje = sum(float(item['porcentaje']) or 0 for item in otros_paises)
            top_10_paises.append({
            'pais': 'OTROS PAISES',
            'total_toneladas_neto': total_otros_toneladas,
            'porcentaje': round(total_otros_porcentaje, 2)
            })

        tabla_pais = top_10_paises

        # 2. Agrupar por empresa con suma
        tabla_empresa = list(cargues_sicex.values('empresa_declarante').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto')
        ).order_by('-total_toneladas_neto'))

        for item in tabla_empresa:
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

        top_10_empresas = tabla_empresa[:10]
        otras_empresas = tabla_empresa[10:]

        if otras_empresas:
            total_otras_toneladas = sum(float(item['total_toneladas_neto']) or 0 for item in otras_empresas)
            total_otras_porcentaje = sum(float(item['porcentaje']) or 0 for item in otras_empresas)
            top_10_empresas.append({
                'empresa_declarante': 'OTRAS EMPRESAS',
                'total_toneladas_neto': total_otras_toneladas,
                'porcentaje': round(total_otras_porcentaje, 2)
            })

        tabla_empresa = top_10_empresas

        data_agno_comparativo = {}

        if comparativo_agno is not None and str(comparativo_agno).lower() == 'si':
            fecha_inicio_comparativa = fecha_inicio - relativedelta(years=1)
            fecha_fin_comparativa = fecha_fin - relativedelta(years=1)

            cargues_sicex_comparativa = CargueSicex.objects.filter(cod_tipo_cargue=tipo_cargue)

            if fecha_inicio_comparativa:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(fecha__date__gte=fecha_inicio_comparativa)
            if fecha_fin_comparativa:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(fecha__date__lte=fecha_fin_comparativa)
            if posicion:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(pos__icontains=posicion)
            if aduana_embarque:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(aduana_embarque__icontains=aduana_embarque)
            if continente:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(continente__icontains=continente)
            if via:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(via__icontains=via)
            if pais:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(pais__icontains=pais)
            if empresa:
                cargues_sicex_comparativa = cargues_sicex_comparativa.filter(empresa_declarante__icontains=empresa)

            if cargues_sicex_comparativa:
                total_toneladas_comparativa =  cargues_sicex_comparativa.aggregate(total_toneladas_neto=Sum('total_toneladas_neto'))['total_toneladas_neto'] or 0

                # 1. Agrupar por país con suma
                tabla_pais_comparativa = list(cargues_sicex_comparativa.values('pais').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto')
                ).order_by('-total_toneladas_neto'))

                # Calcular porcentaje para cada país
                for item in tabla_pais_comparativa:
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas_comparativa)), 2) if total_toneladas_comparativa else 0

                # Tomar los 10 primeros y sumar el resto
                top_10_paises_com = tabla_pais_comparativa[:10]
                otros_paises_com = tabla_pais_comparativa[10:]

                if otros_paises_com:
                    total_otros_toneladas = sum(float(item['total_toneladas_neto']) or 0 for item in otros_paises_com)
                    total_otros_porcentaje = sum(float(item['porcentaje']) or 0 for item in otros_paises_com)
                    top_10_paises_com.append({
                    'pais': 'OTROS PAISES',
                    'total_toneladas_neto': total_otros_toneladas,
                    'porcentaje': round(total_otros_porcentaje, 2)
                    })

                tabla_pais_comparativa = top_10_paises_com

                # 2. Agrupar por empresa con suma
                tabla_empresa_comparativa = list(cargues_sicex_comparativa.values('empresa_declarante').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto')
                ).order_by('-total_toneladas_neto'))

                for item in tabla_empresa_comparativa:
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

                top_10_empresas_com = tabla_empresa_comparativa[:10]
                otras_empresas_com = tabla_empresa_comparativa[10:]

                if otras_empresas_com:
                    total_otras_toneladas = sum(float(item['total_toneladas_neto']) or 0 for item in otras_empresas_com)
                    total_otras_porcentaje = sum(float(item['porcentaje']) or 0 for item in otras_empresas_com)
                    top_10_empresas_com.append({
                        'empresa_declarante': 'OTRAS EMPRESAS',
                        'total_toneladas_neto': total_otras_toneladas,
                        'porcentaje': round(total_otras_porcentaje, 2)
                    })

                tabla_empresa_comparativa = top_10_empresas_com
                data_agno_comparativo = {
                    "total_toneladas": formato_numero(total_toneladas_comparativa),
                    "tabla_pais": list(tabla_pais_comparativa),
                    "tabla_empresa": list(tabla_empresa_comparativa),
                }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": {
                "total_toneladas": formato_numero(total_toneladas),
                "tabla_pais": list(tabla_pais),
                "tabla_empresa": list(tabla_empresa),
                "data_agno_comparativo": data_agno_comparativo,
            }
        })
