from datetime import datetime
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.db.models import Sum, Count, Avg, Min, Max
from decimal import Decimal
from reportes.utils import formato_numero
from reportes.models import BolsaNY


class Tablero8View(APIView):
    """
    Vista para el Tablero 8 con filtros de fechas para comparar dos períodos.
    
    Filtros disponibles:
    - Periodo 1: Fecha de inicio (obligatoria) y Fecha final (obligatoria)
    - Periodo 2: Fecha de inicio (opcional) y Fecha final (opcional)
    """
    
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Endpoint GET para obtener datos del tablero 8.
        
        Parámetros de query:
        - fecha_inicio_periodo_1: Fecha de inicio del primer período (obligatoria)
        - fecha_fin_periodo_1: Fecha final del primer período (obligatoria)
        - fecha_inicio_periodo_2: Fecha de inicio del segundo período (opcional)
        - fecha_fin_periodo_2: Fecha final del segundo período (opcional)
        """
        
        # Validar fechas del período 1 (obligatorio)
        fechas_periodo_1 = self.validar_periodo_1(request)
        if isinstance(fechas_periodo_1, Response):
            return fechas_periodo_1
        
        fecha_inicio_1, fecha_fin_1 = fechas_periodo_1
        
        # Validar fechas del período 2 (opcional)
        fechas_periodo_2 = self.validar_periodo_2(request)
        if isinstance(fechas_periodo_2, Response):
            return fechas_periodo_2
        
        # Verificar si se ajustaron las fechas
        fecha_original_1 = request.query_params.get('fecha_fin_periodo_1')
        fecha_original_2 = request.query_params.get('fecha_fin_periodo_2') if fechas_periodo_2 else None
        
        fecha_actual = datetime.now().date()
        fechas_ajustadas = []
        
        if fecha_original_1:
            fecha_original_1 = datetime.strptime(fecha_original_1, "%Y-%m-%d").date()
            if fecha_original_1 > fecha_actual:
                fechas_ajustadas.append(f"Período 1: {fecha_original_1.strftime('%Y-%m-%d')} → {fecha_fin_1.strftime('%Y-%m-%d')}")
        
        if fecha_original_2 and fechas_periodo_2:
            fecha_original_2 = datetime.strptime(fecha_original_2, "%Y-%m-%d").date()
            if fecha_original_2 > fecha_actual:
                fechas_ajustadas.append(f"Período 2: {fecha_original_2.strftime('%Y-%m-%d')} → {fechas_periodo_2[1].strftime('%Y-%m-%d')}")
        
        # Procesar datos del período 1
        datos_periodo_1 = self.procesar_periodo_1(fecha_inicio_1, fecha_fin_1)
        
        # Procesar datos del período 2 si se proporciona
        datos_periodo_2 = None
        comparacion = None
        
        if fechas_periodo_2:
            fecha_inicio_2, fecha_fin_2 = fechas_periodo_2
            datos_periodo_2 = self.procesar_periodo_2(fecha_inicio_2, fecha_fin_2)
            comparacion = self.calcular_comparacion(datos_periodo_1, datos_periodo_2)
        
        # Construir mensaje de respuesta
        mensaje = "Datos del Tablero 8 obtenidos correctamente."
        if fechas_ajustadas:
            mensaje += f" Fechas ajustadas automáticamente: {'; '.join(fechas_ajustadas)}"
        
        return Response({
            "success": True,
            "detail": mensaje,
            "data": {
                "periodo_1": {
                    "fecha_inicio": fecha_inicio_1.strftime("%Y-%m-%d"),
                    "fecha_fin": fecha_fin_1.strftime("%Y-%m-%d"),
                    "datos": datos_periodo_1
                },
                "periodo_2": {
                    "fecha_inicio": fechas_periodo_2[0].strftime("%Y-%m-%d") if fechas_periodo_2 else None,
                    "fecha_fin": fechas_periodo_2[1].strftime("%Y-%m-%d") if fechas_periodo_2 else None,
                    "datos": datos_periodo_2
                } if fechas_periodo_2 else None,
                "comparacion": comparacion
            }
        }, status=status.HTTP_200_OK)

    def validar_periodo_1(self, request):
        """
        Valida las fechas del primer período (obligatorio).
        """
        fecha_inicio_str = request.query_params.get('fecha_inicio_periodo_1')
        fecha_fin_str = request.query_params.get('fecha_fin_periodo_1')
        
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "El primer período es obligatorio. Se requieren fecha_inicio_periodo_1 y fecha_fin_periodo_1."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({
                "success": False,
                "detail": "Formato de fecha inválido. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        fecha_actual = datetime.now().date()
        
        # Validaciones de negocio
        # Solo validar que la fecha de inicio no sea futura
        if fecha_inicio > fecha_actual:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser futura."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Si la fecha final es futura, ajustarla a la fecha actual
        if fecha_fin > fecha_actual:
            fecha_fin = fecha_actual
        
        return fecha_inicio, fecha_fin

    def validar_periodo_2(self, request):
        """
        Valida las fechas del segundo período (opcional).
        """
        fecha_inicio_str = request.query_params.get('fecha_inicio_periodo_2')
        fecha_fin_str = request.query_params.get('fecha_fin_periodo_2')
        
        # Si no se proporciona ningún parámetro del período 2, es válido
        if not fecha_inicio_str and not fecha_fin_str:
            return None
        
        # Si se proporciona uno, se debe proporcionar el otro
        if not fecha_inicio_str or not fecha_fin_str:
            return Response({
                "success": False,
                "detail": "Si se proporciona un parámetro del segundo período, se deben proporcionar ambos: fecha_inicio_periodo_2 y fecha_fin_periodo_2."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({
                "success": False,
                "detail": "Formato de fecha inválido. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        fecha_actual = datetime.now().date()
        
        # Validaciones de negocio
        # Solo validar que la fecha de inicio no sea futura
        if fecha_inicio > fecha_actual:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser futura."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Si la fecha final es futura, ajustarla a la fecha actual
        if fecha_fin > fecha_actual:
            fecha_fin = fecha_actual
        
        return fecha_inicio, fecha_fin

    def procesar_periodo_1(self, fecha_inicio, fecha_fin):
        """
        Procesa los datos del primer período consultando precios de cierre de la Bolsa NY.
        """
        # Consultar precios de cierre en el rango de fechas
        precios_cierre = BolsaNY.objects.filter(
            fecha_registro__range=(fecha_inicio, fecha_fin)
        ).order_by('fecha_registro')
        
        if not precios_cierre.exists():
            return {
                "resumen": {
                    "total_registros": 0,
                    "total_valor": 0,
                    "promedio_diario": 0
                },
                "desglose_por_dia": [],
                "desglose_por_mes": [],
                "metricas_clave": {
                    "maximo_valor": 0,
                    "minimo_valor": 0,
                    "tendencia": "sin datos"
                }
            }
        
        # Calcular métricas del resumen
        total_registros = precios_cierre.count()
        total_valor = precios_cierre.aggregate(total=Sum('precio_cierre'))['total'] or 0
        promedio_diario = total_valor / total_registros if total_registros > 0 else 0
        
        # Obtener valores máximo y mínimo
        maximo_valor = precios_cierre.aggregate(maximo=Max('precio_cierre'))['maximo'] or 0
        minimo_valor = precios_cierre.aggregate(minimo=Min('precio_cierre'))['minimo'] or 0
        
        # Calcular tendencia
        tendencia = self.calcular_tendencia(precios_cierre)
        
        # Generar desglose por día
        desglose_por_dia = []
        for precio in precios_cierre:
            desglose_por_dia.append({
                "fecha": precio.fecha_registro.strftime("%Y-%m-%d"),
                "precio_cierre": precio.precio_cierre,
                "anio": precio.anio,
                "mes": precio.mes
            })
        
        # Generar desglose por mes
        desglose_por_mes = self.calcular_estadisticas_por_mes(precios_cierre)
        
        return {
            "resumen": {
                "total_registros": total_registros,
                "total_valor": total_valor,
                "promedio_diario": round(promedio_diario, 2)
            },
            "desglose_por_dia": desglose_por_dia,
            "desglose_por_mes": desglose_por_mes,
            "metricas_clave": {
                "maximo_valor": maximo_valor,
                "minimo_valor": minimo_valor,
                "tendencia": tendencia
            }
        }

    def procesar_periodo_2(self, fecha_inicio, fecha_fin):
        """
        Procesa los datos del segundo período.
        Similar a procesar_periodo_1 pero para el segundo período.
        """
        return self.procesar_periodo_1(fecha_inicio, fecha_fin)

    def calcular_estadisticas_por_mes(self, precios_queryset):
        """
        Calcula estadísticas mensuales de los precios de cierre.
        """
        from django.db.models import Avg, Max, Min, Count
        
        # Agrupar por año y mes
        estadisticas_mensuales = precios_queryset.values('anio', 'mes').annotate(
            num_datos=Count('precio_cierre'),
            promedio=Avg('precio_cierre'),
            maximo=Max('precio_cierre'),
            minimo=Min('precio_cierre')
        ).order_by('anio', 'mes')
        
        desglose_mensual = []
        
        for stats in estadisticas_mensuales:
            anio = stats['anio']
            mes = stats['mes']
            num_datos = stats['num_datos']
            promedio = stats['promedio'] or 0
            maximo = stats['maximo'] or 0
            minimo = stats['minimo'] or 0
            
            # Calcular variación absoluta y porcentual
            var_abs = maximo - minimo
            var_porcentual = (var_abs / minimo * 100) if minimo > 0 else 0
            
            # Obtener nombre del mes
            nombre_mes = self.obtener_nombre_mes(mes)
            
            desglose_mensual.append({
                "anio": anio,
                "mes": mes,
                "nombre_mes": nombre_mes,
                "num_datos": num_datos,
                "promedio": round(promedio, 2),
                "maximo": maximo,
                "minimo": minimo,
                "var_abs": var_abs,
                "var_porcentual": round(var_porcentual, 1)
            })
        
        return desglose_mensual

    def obtener_nombre_mes(self, numero_mes):
        """
        Convierte el número del mes a su nombre en español.
        """
        meses = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        return meses.get(numero_mes, f"Mes {numero_mes}")

    def calcular_tendencia(self, precios_queryset):
        """
        Calcula la tendencia de los precios basándose en los primeros y últimos valores.
        """
        if precios_queryset.count() < 2:
            return "insuficientes datos"
        
        # Obtener primer y último precio
        primer_precio = precios_queryset.first().precio_cierre
        ultimo_precio = precios_queryset.last().precio_cierre
        
        # Calcular variación
        variacion = ultimo_precio - primer_precio
        variacion_porcentual = (variacion / primer_precio * 100) if primer_precio > 0 else 0
        
        if variacion_porcentual > 5:
            return "creciente"
        elif variacion_porcentual < -5:
            return "decreciente"
        else:
            return "estable"

    def calcular_comparacion(self, datos_periodo_1, datos_periodo_2):
        """
        Calcula la comparación entre los dos períodos.
        """
        if not datos_periodo_2:
            return None
        
        # Obtener promedios de ambos períodos
        promedio_1 = datos_periodo_1['resumen']['promedio_diario']
        promedio_2 = datos_periodo_2['resumen']['promedio_diario']
        
        # Calcular variación
        variacion_total = promedio_2 - promedio_1
        variacion_porcentual = (variacion_total / promedio_1 * 100) if promedio_1 > 0 else 0
        
        # Determinar tendencia
        if variacion_porcentual > 5:
            tendencia = "creciente"
        elif variacion_porcentual < -5:
            tendencia = "decreciente"
        else:
            tendencia = "sin cambios"
        
        # Generar análisis
        if tendencia == "creciente":
            analisis = f"El período 2 muestra un incremento del {abs(round(variacion_porcentual, 2))}% respecto al período 1"
        elif tendencia == "decreciente":
            analisis = f"El período 2 muestra una disminución del {abs(round(variacion_porcentual, 2))}% respecto al período 1"
        else:
            analisis = "Los períodos muestran comportamiento similar con variaciones menores al 5%"
        
        return {
            "variacion_total": round(variacion_total, 2),
            "variacion_porcentual": round(variacion_porcentual, 2),
            "tendencia": tendencia,
            "analisis": analisis,
            "promedio_periodo_1": promedio_1,
            "promedio_periodo_2": promedio_2
        }


class Tablero8FiltrosView(APIView):
    """
    Vista auxiliar para obtener filtros disponibles del Tablero 8.
    """
    
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Endpoint para obtener información sobre los filtros disponibles.
        """
        return Response({
            "success": True,
            "detail": "Filtros disponibles para el Tablero 8",
            "data": {
                "filtros": {
                    "periodo_1": {
                        "descripcion": "Primer período de análisis",
                        "fecha_inicio": {
                            "tipo": "date",
                            "formato": "YYYY-MM-DD",
                            "obligatorio": True,
                            "descripcion": "Fecha de inicio del primer período"
                        },
                        "fecha_fin": {
                            "tipo": "date",
                            "formato": "YYYY-MM-DD",
                            "obligatorio": True,
                            "descripcion": "Fecha final del primer período"
                        }
                    },
                    "periodo_2": {
                        "descripcion": "Segundo período de análisis (opcional)",
                        "fecha_inicio": {
                            "tipo": "date",
                            "formato": "YYYY-MM-DD",
                            "obligatorio": False,
                            "descripcion": "Fecha de inicio del segundo período"
                        },
                        "fecha_fin": {
                            "tipo": "date",
                            "formato": "YYYY-MM-DD",
                            "obligatorio": False,
                            "descripcion": "Fecha final del segundo período"
                        }
                    }
                },
                "notas": [
                    "El primer período es obligatorio para obtener datos",
                    "El segundo período es opcional y se usa para comparaciones",
                    "Si se proporciona un parámetro del segundo período, se deben proporcionar ambos",
                    "Las fechas no pueden ser futuras",
                    "La fecha de inicio no puede ser mayor que la fecha de fin",
                    "Los datos se obtienen de la tabla de precios de cierre de la Bolsa de Nueva York"
                ]
            }
        }, status=status.HTTP_200_OK)
