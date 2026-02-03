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

    
class TableroControlSicexPos(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):        

        # Obtener los parámetros de fecha de inicio y fin del request
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        comparativo_periodos = request.query_params.get('comparativo_periodos', None)
        tipo_cargue = request.query_params.get('tipo_cargue', None)
        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None
        posicion = request.query_params.get('posicion', None)
        aduana_embarque = request.query_params.get('aduana_embarque', None)
        continente = request.query_params.get('continente', None)
        via = request.query_params.get('via', None)
        fecha_inicio_1 = None
        fecha_fin_1 = None

        if fecha_inicio_str and fecha_fin_str:
            fecha_inicio_1 = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin_1 = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()

        if fecha_inicio_1 is None or fecha_fin_1 is None or tipo_cargue is None:
            return Response({
                "success": False,
                "detail": "Parámetros requeridos: fecha_inicio, fecha_fin y tipo_cargue."
            }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio_1 > fecha_fin_1:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cargues_sicex_1 = CargueSicex.objects.filter(cod_tipo_cargue=tipo_cargue)
            
        if fecha_inicio_1:
            cargues_sicex_1 = cargues_sicex_1.filter(fecha__date__gte=fecha_inicio_1)
        if fecha_fin_1:
            cargues_sicex_1 = cargues_sicex_1.filter(fecha__date__lte=fecha_fin_1)

        if posicion:
            cargues_sicex_1 = cargues_sicex_1.filter(pos=posicion)
        if aduana_embarque:
            cargues_sicex_1 = cargues_sicex_1.filter(aduana_embarque=aduana_embarque)
        if continente:
            cargues_sicex_1 = cargues_sicex_1.filter(continente=continente)
        if via:
            cargues_sicex_1 = cargues_sicex_1.filter(via=via)

        if not cargues_sicex_1:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)
        
        total_toneladas = cargues_sicex_1.aggregate(total_toneladas_neto=Sum('total_toneladas_neto'))['total_toneladas_neto'] or 0

        # Agrupar por posición con suma
        tabla_posicion = list(cargues_sicex_1.values('pos').annotate(
            total_toneladas_neto=Sum('total_toneladas_neto'),
            total_valor_fob=Sum('total_valor_fob')
        ).order_by('pos'))

        # Calcular porcentaje para cada posición
        for item in tabla_posicion:
            toneladas = float(item['total_toneladas_neto']) or 0
            item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas)), 2) if total_toneladas else 0

        data_periodos = {}

        if comparativo_periodos is not None and str(comparativo_periodos).lower() == 'si':
            for i in range(1, 5):
                fecha_inicio_comp = fecha_inicio_1 - relativedelta(years=i)
                fecha_fin_comp = fecha_fin_1 - relativedelta(years=i)

                cargues_sicex_comp = CargueSicex.objects.filter(cod_tipo_cargue=tipo_cargue)

                if fecha_inicio_comp:
                    cargues_sicex_comp = cargues_sicex_comp.filter(fecha__date__gte=fecha_inicio_comp)
                if fecha_fin_comp:
                    cargues_sicex_comp = cargues_sicex_comp.filter(fecha__date__lte=fecha_fin_comp)

                if posicion:
                    cargues_sicex_comp = cargues_sicex_comp.filter(pos=posicion)
                if aduana_embarque:
                    cargues_sicex_comp = cargues_sicex_comp.filter(aduana_embarque=aduana_embarque)
                if continente:
                    cargues_sicex_comp = cargues_sicex_comp.filter(continente=continente)
                if via:
                    cargues_sicex_comp = cargues_sicex_comp.filter(via=via)

                total_toneladas_comparativa =  cargues_sicex_comp.aggregate(total_toneladas_neto=Sum('total_toneladas_neto'))['total_toneladas_neto'] or 0

                # Agrupar por posicion con suma
                tabla_posicion_comparativa = list(cargues_sicex_comp.values('pos').annotate(
                    total_toneladas_neto=Sum('total_toneladas_neto'),
                    total_valor_fob=Sum('total_valor_fob')
                ).order_by('pos'))

                # Calcular porcentaje para cada posicion
                for item in tabla_posicion_comparativa:
                    toneladas = float(item['total_toneladas_neto']) or 0
                    item['porcentaje'] = round((toneladas * 100.0 / float(total_toneladas_comparativa)), 2) if total_toneladas_comparativa else 0

                data = {
                    "tabla_periodo": list(tabla_posicion_comparativa),
                }
                
                data_periodos[f"periodo_{i}"] = data

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": {
                "tabla_principal": list(tabla_posicion),
                "data_periodos": data_periodos,
            }
        })
