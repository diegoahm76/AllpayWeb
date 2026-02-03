from datetime import datetime
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from recaudos.models.recaudos_models import FacturaUnica
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from decimal import Decimal
from reportes.utils import mes_en_letras


class TableroControlPromedio(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # --- Validar y obtener fechas ---
        fechas = self.validar_fechas(request)
        if isinstance(fechas, Response):
            return fechas
        fecha_inicio_1, fecha_fin_1, fecha_inicio_2, fecha_fin_2 = fechas

        # --- Consultar facturas ---
        facturas_periodo_1 = FacturaUnica.objects.filter(fecha_compra__range=(fecha_inicio_1, fecha_fin_1))
        facturas_periodo_2 = FacturaUnica.objects.filter(fecha_compra__range=(fecha_inicio_2, fecha_fin_2))

        # --- Procesar resultados ---
        resultados_periodo_1, promedio_periodo_1 = self.procesar_periodo(facturas_periodo_1, fecha_inicio_1, fecha_fin_1)
        resultados_periodo_2, promedio_periodo_2 = self.procesar_periodo(facturas_periodo_2, fecha_inicio_2, fecha_fin_2)
        variacion, mes_var_mayor, mes_var_menor, incremento_max = self.calcular_variacion_periodos(resultados_periodo_1, resultados_periodo_2)

        return Response({
            "success": True,
            "data": {
                "promedio_periodo_1": promedio_periodo_1,
                "promedio_periodo_2": promedio_periodo_2,
                "mes_var_mayor": mes_en_letras(mes_var_mayor),
                "mes_var_menor": mes_en_letras(mes_var_menor),
                "incremento_max": incremento_max,
                "periodo_1": resultados_periodo_1,
                "periodo_2": resultados_periodo_2,
                "variacion": variacion,
            }
        }, status=status.HTTP_200_OK)

    # ------------------ MÉTODOS AUXILIARES ------------------

    def procesar_periodo(self, facturas_queryset, fecha_inicio, fecha_fin):
        """Agrupa facturas por mes, calcula precio promedio y completa meses vacíos en 0."""
        resultados = { }  # dict mes_num -> precio_promedio

        facturas_por_mes = (
            facturas_queryset.annotate(mes=TruncMonth("fecha_compra"))
            .values("mes")
            .annotate(
                total_kilos=Sum("total_kilos"),
                total_cuota_fomento=Sum("cuota_fomento"),
            )
            .order_by("mes")
        )

        for grupo in facturas_por_mes:
            mes = grupo["mes"]
            total_kilos = grupo["total_kilos"] or Decimal("0")
            total_cuota_fomento = grupo["total_cuota_fomento"] or Decimal("0")

            facturas_mes = facturas_queryset.filter(
                fecha_compra__year=mes.year, fecha_compra__month=mes.month
            )
            total_cuotas_pagadas = self.calcular_cuotas_pagadas_totales(facturas_mes)

            precio_promedio = self.calcular_precio_promedio(
                total_kilos, total_cuota_fomento, total_cuotas_pagadas
            )

            resultados[(mes.year, mes.month)] = precio_promedio

        # 🔥 Completar todos los meses del rango aunque no tengan facturas
        meses_completos = []
        actual = fecha_inicio.replace(day=1)
        fin = fecha_fin.replace(day=1)

        while actual <= fin:
            key = (actual.year, actual.month)
            precio = resultados.get(key, 0)
            meses_completos.append({
                "mes": actual.month,
                "mes_letras": mes_en_letras(actual.month),
                "precio_promedio": precio,
            })
            # Avanzar un mes
            if actual.month == 12:
                actual = actual.replace(year=actual.year + 1, month=1)
            else:
                actual = actual.replace(month=actual.month + 1)
        
        promedio = sum(item['precio_promedio'] for item in meses_completos) / len(meses_completos) if meses_completos else 0

        return meses_completos, promedio


    def calcular_precio_promedio(self, total_kilos, total_cuota_fomento, total_cuotas_pagadas):
        """Aplica la fórmula de cálculo del precio promedio."""
        if total_kilos > 0 and total_cuotas_pagadas > 0:
            precio = total_cuotas_pagadas / Decimal("0.03") / total_kilos
        elif total_kilos > 0:
            precio = total_cuota_fomento / Decimal("0.03") / total_kilos
        else:
            precio = Decimal("0")
        return int(round(precio))

    def calcular_cuotas_pagadas_totales(self, facturas):
        """Calcula la suma de las cuotas pagadas de un queryset de facturas."""
        return (
            facturas.aggregate(total=Sum("cuota_fomento"))["total"]
            or Decimal("0")
        )
    
    def calcular_variacion_periodos(self, periodo_1, periodo_2):
        """Calcula la variación porcentual entre dos periodos."""
        # 1. Extraer todos los meses únicos de ambos periodos
        meses = {item["mes"] for item in periodo_1} | {item["mes"] for item in periodo_2}

        # 2. Crear diccionarios de acceso rápido (mes -> precio_promedio)
        valores_1 = {item["mes"]: item["precio_promedio"] for item in periodo_1}
        valores_2 = {item["mes"]: item["precio_promedio"] for item in periodo_2}

        # 3. Calcular variación para cada mes
        variaciones = []
        mes_var_mayor = ""
        mes_var_menor = ""
        variacion_mayor = Decimal("-Infinity")
        variacion_menor = Decimal("Infinity")
        incremento_max = Decimal("0")

        for mes in sorted(meses):
            valor_1 = valores_1.get(mes, 0)  # si no está, tomamos 0
            valor_2 = valores_2.get(mes, 0)
            variacion = valor_2 - valor_1
            porcentaje = (variacion / valor_1 * 100) if valor_1 != 0 else 0
            variaciones.append({"mes": mes, "mes_letras": mes_en_letras(mes), "variacion": variacion, "porcentaje": porcentaje})

            # Actualizar mes y variación mayor/menor
            if porcentaje > variacion_mayor:
                variacion_mayor = porcentaje
                mes_var_mayor = mes
            if porcentaje < variacion_menor:
                variacion_menor = porcentaje
                mes_var_menor = mes

            if variacion > incremento_max:
                incremento_max = variacion

        return variaciones, mes_var_mayor, mes_var_menor, incremento_max

    def validar_fechas(self, request):
        """Valida y convierte los parámetros de fecha de la request."""
        params = [
            "fecha_inicio_periodo_1", "fecha_fin_periodo_1",
            "fecha_inicio_periodo_2", "fecha_fin_periodo_2"
        ]
        fechas_str = [request.query_params.get(p) for p in params]

        if not all(fechas_str):
            return Response({
                "success": False,
                "detail": f"Parámetros requeridos: {', '.join(params)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fechas = [datetime.strptime(f, "%Y-%m-%d").date() for f in fechas_str]
        except ValueError:
            return Response({
                "success": False,
                "detail": "Formato de fecha inválido. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)

        fecha_inicio_1, fecha_fin_1, fecha_inicio_2, fecha_fin_2 = fechas
        fecha_actual = datetime.now().date()

        # Validaciones de negocio
        if any(f > fecha_actual for f in fechas):
            return Response({"success": False, "detail": "Las fechas no pueden ser futuras."},
                            status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio_1 > fecha_fin_1 or fecha_inicio_2 > fecha_fin_2:
            return Response({"success": False, "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."},
                            status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio_1 >= fecha_inicio_2:
            return Response({"success": False, "detail": "El periodo 2 debe iniciar después que el periodo 1."},
                            status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio_1.year != fecha_fin_1.year:
            return Response({"success": False, "detail": "El periodo 1 debe estar dentro del mismo año."},
                            status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio_2.year != fecha_fin_2.year:
            return Response({"success": False, "detail": "El periodo 2 debe estar dentro del mismo año."},
                            status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio_1 <= fecha_fin_2 and fecha_inicio_2 <= fecha_fin_1:
            return Response({"success": False, "detail": "Los periodos no pueden solaparse."},
                            status=status.HTTP_400_BAD_REQUEST)

        return fechas
