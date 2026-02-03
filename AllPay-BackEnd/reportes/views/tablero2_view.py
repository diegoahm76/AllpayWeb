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

def mes_en_letras(mes):

    if mes is None:
        return None
    
    if mes < 1 or mes > 12:
        raise ValidationError("El mes debe estar entre 1 y 12.")
    
    # Diccionario para mapear números de mes a nombres
    meses = {
        1: "ENERO",
        2: "FEBRERO",
        3: "MARZO",
        4: "ABRIL",
        5: "MAYO",
        6: "JUNIO",
        7: "JULIO",
        8: "AGOSTO",
        9: "SEPTIEMBRE",
        10: "OCTUBRE",
        11: "NOVIEMBRE",
        12: "DICIEMBRE"
    }
    return meses.get(mes, None)

    
class TableroControlSicexMes(APIView):

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
     
        # 1. Agrupar por mes con suma
        tabla_meses = list(cargues_sicex.values('fecha__month').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto')
        ).order_by('fecha__month'))

        # Calcular porcentaje para cada mes
        for item in tabla_meses:
            item['mes'] = mes_en_letras(item['fecha__month'])
            item.pop('fecha__month', None)
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

        # 2. Agrupar por posición con suma
        tabla_posicion = list(cargues_sicex.values('pos').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto')
        ).order_by('pos'))

        # Calcular porcentaje para cada posición
        for item in tabla_posicion:
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

        # 3. Agrupar por continente con suma
        tabla_continente = list(cargues_sicex.values('continente').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto')
        ).order_by('continente'))

        for item in tabla_continente:
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

        # 4. Agrupar por via con suma
        tabla_via = list(cargues_sicex.values('via').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto')
        ).order_by('via'))

        for item in tabla_via:
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

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

                # 1. Agrupar por mes con suma
                tabla_meses_comparativa = list(cargues_sicex_comparativa.values('fecha__month').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto')
                ).order_by('fecha__month'))

                # Calcular porcentaje para cada mes
                for item in tabla_meses_comparativa :
                    item['mes'] = mes_en_letras(item['fecha__month'])
                    item.pop('fecha__month', None)
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0
                        
                # 2. Agrupar por posicion con suma
                tabla_posicion_comparativa = list(cargues_sicex_comparativa.values('pos').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto')
                ).order_by('pos'))

                # Calcular porcentaje para cada posicion
                for item in tabla_posicion_comparativa:
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas_comparativa)), 2) if total_toneladas_comparativa else 0

                # 3. Agrupar por continente con suma
                tabla_continente_comparativa = list(cargues_sicex_comparativa.values('continente').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto')
                ).order_by('continente'))

                for item in tabla_continente_comparativa:
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

                # 4. Agrupar por via con suma
                tabla_via_comparativa = list(cargues_sicex_comparativa.values('via').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto')
                ).order_by('via'))

                for item in tabla_via_comparativa:
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

                data_agno_comparativo = {
                    "total_toneladas": formato_numero(total_toneladas_comparativa),
                    "tabla_meses": tabla_meses_comparativa,
                    "tabla_posicion": list(tabla_posicion_comparativa),
                    "tabla_continente": list(tabla_continente_comparativa),
                    "tabla_via": list(tabla_via_comparativa),
                }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": {
                "total_toneladas": formato_numero(total_toneladas),
                "tabla_meses": list(tabla_meses),
                "tabla_posicion": list(tabla_posicion),
                "tabla_continente": list(tabla_continente),
                "tabla_via": list(tabla_via),
                "data_agno_comparativo": data_agno_comparativo,
            }
        })
