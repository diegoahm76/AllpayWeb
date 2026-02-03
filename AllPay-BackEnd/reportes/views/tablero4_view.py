from datetime import datetime, date
from decimal import Decimal
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from recaudos.models.recaudos_models import FacturaUnica
from django.db.models import Sum


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

def generar_meses_completos(fecha_inicio, fecha_fin, queryset):
    # Crear dict con datos reales
    datos_por_mes = {item['fecha_compra__month']: item for item in queryset}

    # Lista de meses entre fecha_inicio y fecha_fin (incluyendo año si fuera distinto)
    meses_rango = []
    año, mes = fecha_inicio.year, fecha_inicio.month
    while date(año, mes, 1) <= date(fecha_fin.year, fecha_fin.month, 1):
        meses_rango.append((año, mes))
        # Avanzar un mes
        if mes == 12:
            año += 1
            mes = 1
        else:
            mes += 1

    # Construir lista final
    resultado = []
    for año, mes in meses_rango:
        if mes in datos_por_mes:
            item = datos_por_mes[mes]
            resultado.append({
                "mes": mes_en_letras(mes),
                "total_toneladas": (item.get('total_kilos', 0) or 0) / 1000,
                "total_cuota_fomento": item.get('total_cuota', 0) or 0
            })
        else:
            resultado.append({
                "mes": mes_en_letras(mes),
                "total_toneladas": 0,
                "total_cuota_fomento": 0
            })
    return resultado


def obtener_datos_periodo(fecha_inicio, fecha_fin):
    facturas = FacturaUnica.objects.filter(
        estado_factura='PA', 
        fecha_compra__range=(fecha_inicio, fecha_fin)
    )
    total_toneladas = (facturas.aggregate(total_kilos=Sum('total_kilos'))['total_kilos'] or 0) / 1000
    total_cuota = facturas.aggregate(cuota_fomento=Sum('cuota_fomento'))['cuota_fomento'] or 0
    qs = facturas.values('fecha_compra__month').annotate(
        total_kilos=Sum('total_kilos'),
        total_cuota=Sum('cuota_fomento')
    ).order_by('fecha_compra__month')
    tabla_meses = generar_meses_completos(fecha_inicio, fecha_fin, qs)
    return total_toneladas, total_cuota, tabla_meses



class TableroControlEstimados(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Obtener parámetros
        fecha_inicio_str = request.query_params.get('fecha_inicio')
        fecha_fin_str = request.query_params.get('fecha_fin')

        # Validar parámetros presentes
        if not all([fecha_inicio_str, fecha_fin_str]):
            return Response({
                "success": False,
                "detail": "Parámetros requeridos: fecha_inicio y fecha_fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Convertir a fecha
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({
                "success": False,
                "detail": "Formato de fecha inválido. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)

        fecha_actual = datetime.now().date()

        # Validar que ninguna fecha sea mayor a la actual
        if fecha_inicio > fecha_actual or fecha_fin > fecha_actual:
            return Response({
                "success": False,
                "detail": "Las fechas no pueden ser mayores que la fecha actual."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que fecha inicio <= fecha fin
        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener datos del periodo
        total_toneladas, total_cuota_fomento, tabla_meses = obtener_datos_periodo(fecha_inicio, fecha_fin)

        return Response({
            "success": True,
            "detail": "Datos de producción obtenidos correctamente.",
            "data": {
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "total_toneladas": total_toneladas,
                "total_cuota_fomento": total_cuota_fomento,
                "detalle_por_meses": tabla_meses
            }
        })


