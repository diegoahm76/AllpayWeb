from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Max
from django.db import connection
from decimal import Decimal
import math

def excel_round(value, decimals=0):
    """Redondeo como Excel: siempre hacia arriba en .5"""
    if value is None:
        return None
    if decimals == 0:
        return math.floor(value + 0.5)
    else:
        # Para decimales, multiplicar por 10^decimals, redondear, y dividir
        multiplier = 10 ** decimals
        return math.floor(value * multiplier + 0.5) / multiplier

from reportes.models import ProduccionDepartamentoAnual, RendimientoCensoDepartamento
from seguridad.models.transversal_models import Departamento


class Tablero11ProduccionDepartamentosView(APIView):
    """
    Tablero 11: Vista para obtener datos de producción por departamento
    incluyendo área total, área de producción, rendimientos y producción
    
    Fórmulas aplicadas:
    1. Area de producción = Producción del año × Estimación de producción
    2. Producción toneladas con rendimiento censo = Area de producción × Rendimiento censo ÷ 1000
    3. Producción kilos = Area de producción × Rendimiento promedio nacional
    4. Producción toneladas = Producción kilos ÷ 1000
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene los datos de producción por departamento para el tablero 11
        Parámetros opcionales:
        - ano: año a consultar (default: último año disponible)
        - estimacion: porcentaje (0-1] para estimar producción. Ej: 0.85 (default: 0.85)
        - rendimiento_prom_nal: rendimiento promedio nacional. Ej: 448.17 (default: 448.17)
        """
        try:
            # Obtener el año del parámetro o usar el último año disponible
            ano_param = request.query_params.get('ano')
            estimacion_param = request.query_params.get('estimacion')
            rendimiento_prom_nal_param = request.query_params.get('rendimiento_prom_nal')
            
            if ano_param:
                try:
                    ano = int(ano_param)
                except ValueError:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'ano' debe ser un número entero válido."
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Obtener el último año disponible
                ultimo_registro = ProduccionDepartamentoAnual.objects.order_by('-ano').first()
                if not ultimo_registro:
                    return Response({
                        "success": False,
                        "detail": "No hay datos de producción disponibles."
                    }, status=status.HTTP_404_NOT_FOUND)
                ano = ultimo_registro.ano

            # Consultar datos de producción por departamento para el año especificado
            producciones = ProduccionDepartamentoAnual.objects.select_related('departamento')\
                .filter(ano=ano)\
                .order_by('-produccion')

            if not producciones.exists():
                return Response({
                    "success": False,
                    "detail": f"No se encontraron datos de producción para el año {ano}."
                }, status=status.HTTP_404_NOT_FOUND)

            # Calcular rendimiento promedio nacional (overridable por parámetro)
            total_produccion = sum(float(p.produccion) for p in producciones)

            # Parseo de estimación y rendimiento promedio nacional
            def _parse_float_param(value: str, default: float, name: str) -> float:
                if value is None or value == "":
                    return default
                try:
                    # Permitir comas decimales (ej: 0,85)
                    value = value.replace(',', '.')
                    parsed = float(value)
                except Exception:
                    raise ValueError(f"El parámetro '{name}' debe ser un número válido.")
                return parsed

            try:
                estimacion = _parse_float_param(estimacion_param, 0.85, 'estimacion')
                rendimiento_prom_nal = _parse_float_param(rendimiento_prom_nal_param, 448.17, 'rendimiento_prom_nal')
            except ValueError as ve:
                return Response({
                    "success": False,
                    "detail": str(ve)
                }, status=status.HTTP_400_BAD_REQUEST)

            if estimacion <= 0:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'estimacion' debe ser mayor que 0."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Obtener todos los rendimientos censo de una vez para optimizar consultas
            rendimientos_censo = {
                rc.departamento.cod_departamento: float(rc.rendimiento_censo)
                for rc in RendimientoCensoDepartamento.objects.select_related('departamento').all()
            }

            data = []
            total_anio_consultado = 0
            total_area_produccion = 0
            total_rendimiento_censo = 0
            total_produccion_censo = 0
            total_produccion_kilos = 0
            total_produccion_ton = 0

            for produccion in producciones:
                # Calcular datos según las fórmulas correctas
                produccion_ton_real = float(produccion.produccion)
                
                # Area total se obtiene directamente de la tabla ProduccionDepartamentoAnual
                area_total = excel_round(produccion_ton_real)
                
                # Fórmula 1: Area de producción = anio_consultado × Estimación de producción
                area_produccion = excel_round(area_total * estimacion)
                
                # Obtener rendimiento del censo real de la tabla
                cod_departamento = produccion.departamento.cod_departamento
                if cod_departamento in rendimientos_censo:
                    rendimiento_censo = rendimientos_censo[cod_departamento]
                else:
                    # Si no hay datos de censo, usar el promedio nacional
                    rendimiento_censo = rendimiento_prom_nal
                
                # Fórmula 2: Producción toneladas con rendimiento censo = Area de producción × Rendimiento censo ÷ 1000
                produccion_ton_censo = excel_round(area_produccion * rendimiento_censo / 1000)
                
                # Fórmula 3: Producción kilos = Area de producción × Rendimiento promedio nacional
                produccion_kilos = excel_round(area_produccion * rendimiento_prom_nal)
                
                # Producción en toneladas (convertir kilos a toneladas)
                produccion_ton = excel_round(produccion_kilos / 1000)

                departamento_data = {
                    "departamento": produccion.departamento.nombre,
                    "anio_consultado": area_total,
                    "area_produccion": area_produccion,
                    "rendimiento_censo": float(f"{rendimiento_censo:.2f}"),
                    "produccion_ton_censo": produccion_ton_censo,
                    "rendimiento_prom_nal": float(f"{rendimiento_prom_nal:.2f}"),
                    "produccion_kilos": produccion_kilos,
                    "produccion_ton": int(produccion_ton)
                }

                data.append(departamento_data)

                # Acumular totales
                total_anio_consultado += area_total
                total_area_produccion += area_produccion
                total_rendimiento_censo += rendimiento_censo
                total_produccion_censo += produccion_ton_censo
                total_produccion_kilos += produccion_kilos
                total_produccion_ton += produccion_ton

            # Agregar fila de totales
            totales = {
                "departamento": "TOTALES",
                "anio_consultado": total_anio_consultado,
                "area_produccion": total_area_produccion,
                "rendimiento_censo": excel_round(total_rendimiento_censo),
                "produccion_ton_censo": total_produccion_censo,
                "rendimiento_prom_nal": rendimiento_prom_nal,
                "produccion_kilos": total_produccion_kilos,
                "produccion_ton": total_produccion_ton
            }

            data.append(totales)

            return Response({
                "success": True,
                "detail": f"Datos de producción por departamento obtenidos para el año {ano} usando rendimientos censo reales.",
                "ano_consultado": ano,
                "parametros": {
                    "estimacion": estimacion,
                    "rendimiento_prom_nal": rendimiento_prom_nal
                },
                "total_departamentos": len(data) - 1,  # Excluir la fila de totales
                "data": data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener los datos: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Tablero11ProduccionDepartamentosConCensoView(APIView):
    """
    Tablero 11: Vista para obtener datos de producción por departamento
    usando datos reales de la tabla RendimientoCensoDepartamento
    
    Fórmulas aplicadas:
    1. Area de producción = Producción del año × Estimación de producción
    2. Producción toneladas con rendimiento censo = Area de producción × Rendimiento censo real ÷ 1000
    3. Producción kilos = Area de producción × Rendimiento promedio nacional
    4. Producción toneladas = Producción kilos ÷ 1000
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene los datos de producción por departamento usando rendimientos censo reales
        Parámetros opcionales:
        - ano: año a consultar (default: último año disponible)
        - estimacion: porcentaje (0-1] para estimar producción. Ej: 0.85 (default: 0.85)
        - rendimiento_prom_nal: rendimiento promedio nacional. Ej: 448.17 (default: 448.17)
        """
        try:
            # Obtener el año del parámetro o usar el último año disponible
            ano_param = request.query_params.get('ano')
            estimacion_param = request.query_params.get('estimacion')
            rendimiento_prom_nal_param = request.query_params.get('rendimiento_prom_nal')
            
            if ano_param:
                try:
                    ano = int(ano_param)
                except ValueError:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'ano' debe ser un número entero válido."
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Obtener el último año disponible
                ultimo_registro = ProduccionDepartamentoAnual.objects.order_by('-ano').first()
                if not ultimo_registro:
                    return Response({
                        "success": False,
                        "detail": "No hay datos de producción disponibles."
                    }, status=status.HTTP_404_NOT_FOUND)
                ano = ultimo_registro.ano

            # Consultar datos de producción por departamento para el año especificado
            producciones = ProduccionDepartamentoAnual.objects.select_related('departamento')\
                .filter(ano=ano)\
                .order_by('-produccion')

            if not producciones.exists():
                return Response({
                    "success": False,
                    "detail": f"No se encontraron datos de producción para el año {ano}."
                }, status=status.HTTP_404_NOT_FOUND)

            # Parseo de estimación y rendimiento promedio nacional
            def _parse_float_param(value: str, default: float, name: str) -> float:
                if value is None or value == "":
                    return default
                try:
                    # Permitir comas decimales (ej: 0,85)
                    value = value.replace(',', '.')
                    parsed = float(value)
                except Exception:
                    raise ValueError(f"El parámetro '{name}' debe ser un número válido.")
                return parsed

            try:
                estimacion = _parse_float_param(estimacion_param, 0.85, 'estimacion')
                rendimiento_prom_nal = _parse_float_param(rendimiento_prom_nal_param, 448.17, 'rendimiento_prom_nal')
            except ValueError as ve:
                return Response({
                    "success": False,
                    "detail": str(ve)
                }, status=status.HTTP_400_BAD_REQUEST)

            if estimacion <= 0:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'estimacion' debe ser mayor que 0."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Obtener todos los rendimientos censo de una vez para optimizar consultas
            rendimientos_censo = {
                rc.departamento.cod_departamento: float(rc.rendimiento_censo)
                for rc in RendimientoCensoDepartamento.objects.select_related('departamento').all()
            }

            data = []
            total_anio_consultado = 0
            total_area_produccion = 0
            total_rendimiento_censo = 0
            total_produccion_censo = 0
            total_produccion_kilos = 0
            total_produccion_ton = 0

            for produccion in producciones:
                # Calcular datos según las fórmulas correctas
                produccion_ton_real = float(produccion.produccion)
                
                # Area total se obtiene directamente de la tabla ProduccionDepartamentoAnual
                area_total = excel_round(produccion_ton_real)
                
                # Fórmula 1: Area de producción = anio_consultado × Estimación de producción
                area_produccion = excel_round(area_total * estimacion)
                
                # Obtener rendimiento del censo real de la tabla
                cod_departamento = produccion.departamento.cod_departamento
                if cod_departamento in rendimientos_censo:
                    rendimiento_censo = rendimientos_censo[cod_departamento]
                else:
                    # Si no hay datos de censo, usar el promedio nacional
                    rendimiento_censo = rendimiento_prom_nal
                
                # Fórmula 2: Producción toneladas con rendimiento censo = Area de producción × Rendimiento censo ÷ 1000
                produccion_ton_censo = excel_round(area_produccion * rendimiento_censo / 1000)
                
                # Fórmula 3: Producción kilos = Area de producción × Rendimiento promedio nacional
                produccion_kilos = excel_round(area_produccion * rendimiento_prom_nal)
                
                # Producción en toneladas (convertir kilos a toneladas)
                produccion_ton = excel_round(produccion_kilos / 1000)

                departamento_data = {
                    "departamento": produccion.departamento.nombre,
                    "anio_consultado": area_total,
                    "area_produccion": area_produccion,
                    "rendimiento_censo": float(f"{rendimiento_censo:.2f}"),
                    "produccion_ton_censo": produccion_ton_censo,
                    "rendimiento_prom_nal": float(f"{rendimiento_prom_nal:.2f}"),
                    "produccion_kilos": produccion_kilos,
                    "produccion_ton": int(produccion_ton)
                }

                data.append(departamento_data)

                # Acumular totales
                total_anio_consultado += area_total
                total_area_produccion += area_produccion
                total_rendimiento_censo += rendimiento_censo
                total_produccion_censo += produccion_ton_censo
                total_produccion_kilos += produccion_kilos
                total_produccion_ton += produccion_ton

            # Agregar fila de totales
            totales = {
                "departamento": "TOTALES",
                "anio_consultado": total_anio_consultado,
                "area_produccion": total_area_produccion,
                "rendimiento_censo": excel_round(total_rendimiento_censo),
                "produccion_ton_censo": total_produccion_censo,
                "rendimiento_prom_nal": rendimiento_prom_nal,
                "produccion_kilos": total_produccion_kilos,
                "produccion_ton": total_produccion_ton
            }

            data.append(totales)

            return Response({
                "success": True,
                "detail": f"Datos de producción por departamento obtenidos para el año {ano} usando rendimientos censo reales.",
                "ano_consultado": ano,
                "parametros": {
                    "estimacion": estimacion,
                    "rendimiento_prom_nal": rendimiento_prom_nal
                },
                "total_departamentos": len(data) - 1,  # Excluir la fila de totales
                "data": data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener los datos: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Tablero11ProduccionDepartamentosRealView(APIView):
    """
    Tablero 11 alternativo: Vista que devuelve datos hardcoded similares al ejemplo
    para demostración o cuando no se tienen todas las tablas necesarias
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Devuelve datos de ejemplo similares al JSON proporcionado
        """
        # Datos de ejemplo (estos podrían venir de una tabla de configuración)
        data_ejemplo = [
            {
                "departamento": "Santander",
                "area_total": 53534,
                "area_produccion": 45504,
                "rendimiento_censo": 471.80,
                "produccion_ton_censo": 21469,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 20393635,
                "produccion_ton": 20394
            },
            {
                "departamento": "Antioquia",
                "area_total": 18563,
                "area_produccion": 15779,
                "rendimiento_censo": 434.52,
                "produccion_ton_censo": 6856,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 7071618,
                "produccion_ton": 7072
            },
            {
                "departamento": "Arauca",
                "area_total": 16201,
                "area_produccion": 13771,
                "rendimiento_censo": 418.45,
                "produccion_ton_censo": 5762,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 6171562,
                "produccion_ton": 6172
            },
            {
                "departamento": "Nariño",
                "area_total": 14800,
                "area_produccion": 12580,
                "rendimiento_censo": 439.00,
                "produccion_ton_censo": 5523,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 5637979,
                "produccion_ton": 5638
            },
            {
                "departamento": "Norte de Santander",
                "area_total": 9891,
                "area_produccion": 8407,
                "rendimiento_censo": 460.00,
                "produccion_ton_censo": 3867,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 3767964,
                "produccion_ton": 3768
            },
            {
                "departamento": "Tolima",
                "area_total": 9631,
                "area_produccion": 8186,
                "rendimiento_censo": 410.22,
                "produccion_ton_censo": 3358,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 3668829,
                "produccion_ton": 3669
            },
            {
                "departamento": "Huila",
                "area_total": 5345,
                "area_produccion": 4543,
                "rendimiento_censo": 414.28,
                "produccion_ton_censo": 1882,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 2035988,
                "produccion_ton": 2036
            },
            {
                "departamento": "Meta",
                "area_total": 6373,
                "area_produccion": 5417,
                "rendimiento_censo": 406.00,
                "produccion_ton_censo": 2199,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 2427852,
                "produccion_ton": 2428
            },
            {
                "departamento": "Cesar",
                "area_total": 7470,
                "area_produccion": 6349,
                "rendimiento_censo": 392.00,
                "produccion_ton_censo": 2489,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 2845576,
                "produccion_ton": 2846
            },
            {
                "departamento": "Cundinamarca",
                "area_total": 4459,
                "area_produccion": 3790,
                "rendimiento_censo": 324.00,
                "produccion_ton_censo": 1228,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 1698589,
                "produccion_ton": 1699
            },
            {
                "departamento": "TOTALES",
                "area_total": 181952,
                "area_produccion": 154660,
                "rendimiento_censo": 0,
                "produccion_ton_censo": 13539,
                "rendimiento_prom_nal": 448.17,
                "produccion_kilos": 69313758,
                "produccion_ton": 69314
            }
        ]

        return Response({
            "success": True,
            "detail": "Datos de ejemplo del tablero 11 obtenidos correctamente.",
            "data": data_ejemplo
        }, status=status.HTTP_200_OK)


class Tablero11SeriesAnualesView(APIView):
    """
    Tablero 11: Vista para obtener series anuales de producción de cacao
    incluyendo datos mensuales, variaciones y proyecciones
    Obtiene todos los datos desde la base de datos (ProduccionCacaoHistorico)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene las series anuales de producción de cacao con datos mensuales,
        variaciones porcentuales y proyecciones desde la base de datos
        Parámetros opcionales:
        - anio_actual: año de referencia para la consulta y proyección (default: máximo disponible)
        - periodos_estadisticos | periodos: número de años hacia atrás a incluir (default: 10)
        """
        try:
            from ..models import ProduccionCacaoHistorico
            
            # Obtener parámetros de consulta
            anio_actual_param = request.query_params.get('anio_actual') or request.query_params.get('ano_actual')
            periodos_param = request.query_params.get('periodos_estadisticos') or request.query_params.get('periodos')

            # Obtener datos desde la base de datos
            registros_bd = ProduccionCacaoHistorico.objects.filter(
                pano__isnull=False  # Solo registros con total anual
            ).order_by('ano')

            if not registros_bd.exists():
                    return Response({
                        "success": False,
                    "detail": "No hay datos de producción histórica disponibles en la base de datos."
                }, status=status.HTTP_404_NOT_FOUND)

            # Determinar año máximo disponible
            max_anio_disponible = registros_bd.aggregate(max_ano=Max('ano'))['max_ano']

            try:
                anio_actual = int(anio_actual_param) if anio_actual_param else max_anio_disponible
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'anio_actual' debe ser un entero válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                periodos_estadisticos = int(periodos_param) if periodos_param else 10
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'periodos_estadisticos' debe ser un entero válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if periodos_estadisticos <= 0:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'periodos_estadisticos' debe ser mayor que 0."
                }, status=status.HTTP_400_BAD_REQUEST)

            anio_inicio = anio_actual - periodos_estadisticos

            # Para calcular la variación del primer año visible contra el año anterior,
            # incluimos el año previo (anio_inicio - 1) en la consulta
            registros_filtrados_ext = registros_bd.filter(
                ano__gte=anio_inicio - 1,
                ano__lte=anio_actual
            )

            if not registros_filtrados_ext.exists():
                return Response({
                    "success": False,
                    "detail": f"No hay datos disponibles para el rango extendido {anio_inicio-1}-{anio_actual}."
                }, status=status.HTTP_404_NOT_FOUND)

            # Convertir registros de BD a formato de series anuales
            series_ext = []
            for registro in registros_filtrados_ext:
                # Obtener datos mensuales
                def fmt_int(val):
                    try:
                        return int(float(val))
                    except Exception:
                        return 0

                meses_data = {
                    "ene": fmt_int(registro.enero) if registro.enero is not None else 0,
                    "feb": fmt_int(registro.febrero) if registro.febrero is not None else 0,
                    "mar": fmt_int(registro.marzo) if registro.marzo is not None else 0,
                    "abr": fmt_int(registro.abril) if registro.abril is not None else 0,
                    "may": fmt_int(registro.mayo) if registro.mayo is not None else 0,
                    "jun": fmt_int(registro.junio) if registro.junio is not None else 0,
                    "jul": fmt_int(registro.julio) if registro.julio is not None else 0,
                    "ago": fmt_int(registro.agosto) if registro.agosto is not None else 0,
                    "sep": fmt_int(registro.septiembre) if registro.septiembre is not None else 0,
                    "oct": fmt_int(registro.octubre) if registro.octubre is not None else 0,
                    "nov": fmt_int(registro.noviembre) if registro.noviembre is not None else 0,
                    "dic": fmt_int(registro.diciembre) if registro.diciembre is not None else 0
                }
                
                produccion_anual = float(registro.pano) if registro.pano else 0
                
                serie = {
                    "anio": registro.ano,
                    "meses": meses_data,
                    # Mostrar como entero (miles) pero conservar crudo para cálculos
                    "produccion_anual": int(produccion_anual),
                    "produccion_anual_raw": produccion_anual,
                    "variacion_pct": 0.0  # Se calculará después
                }
                series_ext.append(serie)

            # Calcular variaciones porcentuales
            for i in range(1, len(series_ext)):
                actual = series_ext[i]
                anterior = series_ext[i-1]
                
                # Usar los totales anuales con decimales para mayor precisión
                if anterior.get('produccion_anual_raw', 0) > 0:
                    variacion = ((actual.get('produccion_anual_raw', 0) - anterior.get('produccion_anual_raw', 0)) / anterior.get('produccion_anual_raw', 0)) * 100
                    actual['variacion_pct'] = excel_round(variacion, 1)

            # Quedarnos solo con el rango visible [anio_inicio, anio_actual]
            series_anuales = [s for s in series_ext if s["anio"] >= anio_inicio]

            # No calcular variación para el año seleccionado (anio_actual)
            for serie in series_anuales:
                if serie["anio"] == anio_actual:
                    serie["variacion_pct"] = 0.0

            # Calcular variación promedio sobre el rango visible EXCLUYENDO anio_actual
            ultimas_variaciones = [
                serie["variacion_pct"]
                for serie in series_anuales
                if serie.get("variacion_pct") is not None and serie["anio"] != anio_actual
            ]
            promedio_bruto = (sum(ultimas_variaciones) / len(ultimas_variaciones)) if ultimas_variaciones else 0
            # Truncamiento a 1 decimal (tipo Excel): trunc(valor*10)/10
            variacion_promedio_pct = math.trunc(promedio_bruto * 10) / 10 if ultimas_variaciones else 0.0
            # Normalizar -0.0 -> 0.0
            if variacion_promedio_pct == -0.0:
                variacion_promedio_pct = 0.0

            # Proyección para el siguiente año basada en la tendencia
            año_proyeccion = anio_actual + 1
            
            # Calcular proyección basada en el último año y la variación promedio
            ultimo_año = series_anuales[-1] if series_anuales else None
            if ultimo_año:
                factor_crecimiento = 1 + (variacion_promedio_pct / 100)
                produccion_proyectada = int(ultimo_año["produccion_anual_raw"] * factor_crecimiento)
                
                # Proyectar distribución mensual basada en el último año + variación promedio (en miles, 3 decimales)
                def fmt_int(val: float) -> int:
                    return int(val)

                proyeccion_mensual = {}
                suma_proyeccion = 0.0
                for mes in ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]:
                    base_mes = float(ultimo_año["meses"][mes]) if mes in ultimo_año["meses"] else 0.0
                    proyectado = base_mes * (1 + (variacion_promedio_pct / 100))
                    proyeccion_mensual[mes] = fmt_int(proyectado)
                    suma_proyeccion += proyectado
                
                proyeccion = {
                    "anio": año_proyeccion,
                    "meses": proyeccion_mensual,
                    # Producción anual proyectada en miles con 3 decimales (suma de meses)
                    "produccion_anual": fmt_int(suma_proyeccion)
                }
            else:
                # Proyección por defecto si no hay datos
                proyeccion = {
                    "anio": año_proyeccion,
                    "meses": {
                        "ene": 0, "feb": 0, "mar": 0, "abr": 0,
                        "may": 0, "jun": 0, "jul": 0, "ago": 0,
                        "sep": 0, "oct": 0, "nov": 0, "dic": 0
                    },
                    "produccion_anual": 0,
                    "variacion_pct": 0.0
                }

            # Calcular distribución mensual promedio (incluyendo el año proyectado)
            meses = ["ene", "feb", "mar", "abr", "may", "jun", 
                    "jul", "ago", "sep", "oct", "nov", "dic"]
            
            distribucion_mensual = {"meses": {}}
            total_distribucion = 0.0
            
            # Incluir el año proyectado en el promedio
            series_para_promedio = list(series_anuales)
            if proyeccion and isinstance(proyeccion, dict) and "meses" in proyeccion:
                series_para_promedio.append({"meses": proyeccion["meses"]})

            cantidad_series = len(series_para_promedio)
            
            def fmt_int(val: float) -> int:
                return int(val)

            promedios_float_por_mes = {}
            for mes in meses:
                # Convertir cada valor mensual desde string a float para sumar
                suma_mes = sum(float(serie["meses"][mes]) for serie in series_para_promedio)
                promedio_mes_float = (suma_mes / cantidad_series) if cantidad_series > 0 else 0.0
                promedios_float_por_mes[mes] = promedio_mes_float
                distribucion_mensual["meses"][mes] = excel_round(promedio_mes_float)
                total_distribucion += promedio_mes_float
            
            # Total redondeado al entero más cercano
            distribucion_mensual["total"] = excel_round(total_distribucion)

            # Calcular participación porcentual por mes
            participacion_pct = {}
            for mes in meses:
                if total_distribucion > 0:
                    participacion_pct[mes] = excel_round((promedios_float_por_mes[mes] / total_distribucion) * 100)
                else:
                    participacion_pct[mes] = 0
            participacion_pct["total"] = 100

            # Recalcular distribucion_mensual a partir de la participación y la producción anual proyectada
            # Regla: distribucion_mensual[mes] = ROUND(produccion_anual * participacion_pct_mes / 100)
            # Ajuste: asegurar que la suma de meses sea exactamente igual a produccion_anual
            toneladas = None
            if isinstance(proyeccion, dict) and "produccion_anual" in proyeccion:
                produccion_anual_target = int(proyeccion["produccion_anual"]) or 0
                if produccion_anual_target > 0:
                    valores_mes = {}
                    suma_parcial = 0
                    for mes in meses:
                        valor_mes = excel_round(produccion_anual_target * (participacion_pct.get(mes, 0) / 100))
                        valores_mes[mes] = valor_mes
                        suma_parcial += valor_mes

                    # Ajuste por diferencia debido a redondeo
                    diferencia = produccion_anual_target - suma_parcial
                    if diferencia != 0:
                        # Ajustar la diferencia en el mes con mayor participación para minimizar el error relativo
                        mes_ajuste = max(meses, key=lambda m: participacion_pct.get(m, 0))
                        valores_mes[mes_ajuste] = valores_mes.get(mes_ajuste, 0) + diferencia

                    meses_result = {mes: int(valores_mes.get(mes, 0)) for mes in meses}
                    total_result = int(produccion_anual_target)
                    distribucion_mensual = {
                        "meses": meses_result,
                        "total": total_result
                    }
                    # Nueva data 'toneladas' solicitada: igual cálculo a partir de participación * producción anual
                    toneladas = {
                        "meses": meses_result,
                        "total": total_result
                    }

            # Limpiar campo interno crudo antes de responder
            series_salida = []
            for s in series_anuales:
                s_out = {k: v for k, v in s.items() if k != 'produccion_anual_raw'}
                series_salida.append(s_out)

            response_data = {
                "series_anuales": series_salida,
                "variacion_promedio_pct": variacion_promedio_pct,
                "proyeccion": proyeccion,
                "distribucion_mensual": distribucion_mensual,
                "participacion_pct": participacion_pct,
                "parametros": {
                    "anio_actual": anio_actual,
                    "año_proyeccion": año_proyeccion,
                    "periodos_estadisticos": periodos_estadisticos
                }
            }

            return Response({
                "success": True,
                "detail": "Series anuales de producción de cacao obtenidas correctamente desde la base de datos.",
                "parametros": {
                    "anio_actual": anio_actual,
                    "periodos_estadisticos": periodos_estadisticos
                },
                "data": response_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener las series anuales: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Tablero11PronosticoLinealView(APIView):
    """
    Tablero 11: Pronóstico lineal de producción anual y distribución mensual
    Parámetros opcionales:
    - anio_actual | ano_actual: año de referencia para pronóstico (default: max disponible)
    - periodos_estadisticos | periodos: número de años históricos para el ajuste (default: 10)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Construir serie base desde BD
            from ..models import ProduccionCacaoHistorico
            registros = ProduccionCacaoHistorico.objects.filter(pano__isnull=False).order_by('ano')
            series_base = []
            for r in registros:
                # Función para formatear con 3 decimales
                def fmt_int(val):
                    try:
                        return int(float(val))
                    except Exception:
                        return 0
                
                meses = {
                    "ene": fmt_int(r.enero) if r.enero is not None else 0,
                    "feb": fmt_int(r.febrero) if r.febrero is not None else 0,
                    "mar": fmt_int(r.marzo) if r.marzo is not None else 0,
                    "abr": fmt_int(r.abril) if r.abril is not None else 0,
                    "may": fmt_int(r.mayo) if r.mayo is not None else 0,
                    "jun": fmt_int(r.junio) if r.junio is not None else 0,
                    "jul": fmt_int(r.julio) if r.julio is not None else 0,
                    "ago": fmt_int(r.agosto) if r.agosto is not None else 0,
                    "sep": fmt_int(r.septiembre) if r.septiembre is not None else 0,
                    "oct": fmt_int(r.octubre) if r.octubre is not None else 0,
                    "nov": fmt_int(r.noviembre) if r.noviembre is not None else 0,
                    "dic": fmt_int(r.diciembre) if r.diciembre is not None else 0
                }
                series_base.append({
                    "anio": r.ano,
                    "meses": meses,
                    "produccion_anual": fmt_int(r.pano) if r.pano is not None else 0
                })

            if len(series_base) == 0:
                return Response({"success": False, "detail": "No hay datos históricos en BD."}, status=status.HTTP_404_NOT_FOUND)

            # Parámetros
            anio_actual_param = request.query_params.get('anio_actual') or request.query_params.get('ano_actual')
            periodos_param = request.query_params.get('periodos_estadisticos') or request.query_params.get('periodos')

            max_anio = max(s["anio"] for s in series_base)
            min_anio = min(s["anio"] for s in series_base)

            try:
                anio_actual = int(anio_actual_param) if anio_actual_param else max_anio + 1
            except ValueError:
                return Response({"success": False, "detail": "El parámetro 'anio_actual' debe ser un entero válido."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                periodos_estadisticos = int(periodos_param) if periodos_param else 10
            except ValueError:
                return Response({"success": False, "detail": "El parámetro 'periodos_estadisticos' debe ser un entero válido."}, status=status.HTTP_400_BAD_REQUEST)

            if periodos_estadisticos <= 0:
                return Response({"success": False, "detail": "'periodos_estadisticos' debe ser mayor que 0."}, status=status.HTTP_400_BAD_REQUEST)

            # Determinar rango histórico [inicio, fin] incluyendo el anio_actual si está disponible
            fin_hist = min(anio_actual, max_anio)
            inicio_hist = max(fin_hist - periodos_estadisticos, min_anio)
            historicas = [s for s in series_base if inicio_hist <= s["anio"] <= fin_hist]

            if len(historicas) == 0:
                return Response({"success": False, "detail": f"No hay datos históricos entre {inicio_hist} y {fin_hist}."}, status=status.HTTP_404_NOT_FOUND)

            # Función para calcular regresión lineal (equivalente a PRONOSTICO.LINEAL de Excel)
            def pronostico_lineal(x_nuevo, x_conocidos, y_conocidos):
                """
                Calcula la predicción lineal usando el método de mínimos cuadrados
                Equivalente a PRONOSTICO.LINEAL(x_nuevo, y_conocidos, x_conocidos) de Excel
                """
                n = len(x_conocidos)
                if n != len(y_conocidos) or n < 2:
                    return 0.0
                
                # Calcular pendiente (m) e intercepto (b)
                sum_x = sum(x_conocidos)
                sum_y = sum(y_conocidos)
                sum_xy = sum(x * y for x, y in zip(x_conocidos, y_conocidos))
                sum_x2 = sum(x * x for x in x_conocidos)
                
                denom = n * sum_x2 - sum_x * sum_x
                if denom == 0:
                    return 0.0
                
                m = (n * sum_xy - sum_x * sum_y) / denom
                b = (sum_y - m * sum_x) / n
                
                # Calcular predicción para x_nuevo
                return m * x_nuevo + b

            # Preparar datos para regresión lineal
            meses_orden = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
            x_conocidos = [s["anio"] for s in historicas]  # Años históricos
            
            # Calcular proyección mes por mes usando regresión lineal
            def calcular_proyeccion_mensual(anio_objetivo):
                meses_proyeccion = {}
                for mes in meses_orden:
                    # Valores y conocidos para este mes
                    y_conocidos = [float(s["meses"][mes]) for s in historicas]
                    # Calcular predicción para el año objetivo
                    prediccion = pronostico_lineal(anio_objetivo, x_conocidos, y_conocidos)
                    meses_proyeccion[mes] = excel_round(prediccion)
                return meses_proyeccion

            # Calcular proyecciones para anio_actual y anio_actual+1
            meses_pred_1 = calcular_proyeccion_mensual(anio_actual)
            meses_pred_2 = calcular_proyeccion_mensual(anio_actual + 1)

            # Construir respuesta: históricas + predicciones
            pronostico = []
            pronostico.extend({"anio": s["anio"], "meses": s["meses"], "produccion_anual": s["produccion_anual"]} for s in historicas)
            
            # Solo agregar proyecciones para años que no existen en los datos históricos
            anos_historicos = {s["anio"] for s in historicas}
            
            # Proyección para anio_actual solo si no existe en los datos históricos
            if anio_actual not in anos_historicos:
                total_pred_1 = sum(float(v) for v in meses_pred_1.values())
                pronostico.append({
                    "anio": anio_actual, 
                    "meses": meses_pred_1, 
                    "produccion_anual": excel_round(total_pred_1)
                })
            
            # Proyección para anio_actual + 1 solo si no existe en los datos históricos
            if (anio_actual + 1) not in anos_historicos:
                total_pred_2 = sum(float(v) for v in meses_pred_2.values())
                pronostico.append({
                    "anio": anio_actual + 1, 
                    "meses": meses_pred_2, 
                    "produccion_anual": excel_round(total_pred_2)
                })

            return Response({
                "success": True,
                "detail": "Pronóstico lineal generado correctamente.",
                "parametros": {
                    "anio_actual": anio_actual,
                    "periodos_estadisticos": periodos_estadisticos,
                    "rango_historico": [inicio_hist, fin_hist]
                },
                "data": {"pronostico_lineal": pronostico}
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al generar el pronóstico lineal: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Tablero11DistribucionMensualView(APIView):
    """
    Tablero 11: Vista para obtener estimación de distribución mensual de producción
    con participación porcentual, proyección y datos históricos
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene la estimación de distribución mensual de producción de cacao
        con participación porcentual, proyección y datos históricos
        Parámetros opcionales:
        - ano: año de referencia (default: último año disponible)
        - anio_actual: año actual para proyección (default: año del parámetro ano)
        - periodos_estadisticos: número de períodos para estadísticas (default: 10)
        """
        try:
            from ..models import ProduccionCacaoHistorico
            import math
            
            # Obtener parámetros
            ano_param = request.query_params.get('ano')
            anio_actual_param = request.query_params.get('anio_actual')
            periodos_param = request.query_params.get('periodos_estadisticos', 10)
            
            # Determinar año de referencia
            if ano_param:
                try:
                    ano = int(ano_param)
                except ValueError:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'ano' debe ser un número entero válido."
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Obtener el último año disponible
                ultimo_registro = ProduccionDepartamentoAnual.objects.order_by('-ano').first()
                if not ultimo_registro:
                    return Response({
                        "success": False,
                        "detail": "No hay datos de producción disponibles."
                    }, status=status.HTTP_404_NOT_FOUND)
                ano = ultimo_registro.ano

            # Usar ano como anio_actual si no se especifica
            anio_actual = int(anio_actual_param) if anio_actual_param else ano
            periodos_estadisticos = int(periodos_param)

            # Obtener datos desde la base de datos
            registros_bd = ProduccionCacaoHistorico.objects.filter(
                pano__isnull=False  # Solo registros con total anual
            ).order_by('ano')

            if not registros_bd.exists():
                return Response({
                    "success": False,
                    "detail": "No hay datos de producción histórica disponibles en la base de datos."
                }, status=status.HTTP_404_NOT_FOUND)

            # Determinar año máximo disponible
            max_anio_disponible = registros_bd.aggregate(max_ano=Max('ano'))['max_ano']
            anio_actual = min(anio_actual, max_anio_disponible)
            anio_inicio = anio_actual - periodos_estadisticos

            # Para calcular la variación del primer año visible contra el año anterior,
            # incluimos el año previo (anio_inicio - 1) en la consulta
            registros_filtrados_ext = registros_bd.filter(
                ano__gte=anio_inicio - 1,
                ano__lte=anio_actual
            )

            if not registros_filtrados_ext.exists():
                return Response({
                    "success": False,
                    "detail": f"No hay datos disponibles para el rango extendido {anio_inicio-1}-{anio_actual}."
                }, status=status.HTTP_404_NOT_FOUND)

            # Convertir registros de BD a formato de series anuales
            series_ext = []
            for registro in registros_filtrados_ext:
                # Obtener datos mensuales
                def fmt_int(val):
                    try:
                        return int(float(val))
                    except Exception:
                        return 0

                meses_data = {
                    "ene": fmt_int(registro.enero) if registro.enero is not None else 0,
                    "feb": fmt_int(registro.febrero) if registro.febrero is not None else 0,
                    "mar": fmt_int(registro.marzo) if registro.marzo is not None else 0,
                    "abr": fmt_int(registro.abril) if registro.abril is not None else 0,
                    "may": fmt_int(registro.mayo) if registro.mayo is not None else 0,
                    "jun": fmt_int(registro.junio) if registro.junio is not None else 0,
                    "jul": fmt_int(registro.julio) if registro.julio is not None else 0,
                    "ago": fmt_int(registro.agosto) if registro.agosto is not None else 0,
                    "sep": fmt_int(registro.septiembre) if registro.septiembre is not None else 0,
                    "oct": fmt_int(registro.octubre) if registro.octubre is not None else 0,
                    "nov": fmt_int(registro.noviembre) if registro.noviembre is not None else 0,
                    "dic": fmt_int(registro.diciembre) if registro.diciembre is not None else 0
                }
                
                produccion_anual = float(registro.pano) if registro.pano else 0
                
                serie = {
                    "anio": registro.ano,
                    "meses": meses_data,
                    # Mostrar como entero (miles) pero conservar crudo para cálculos
                    "produccion_anual": int(produccion_anual),
                    "produccion_anual_raw": produccion_anual,
                    "variacion_pct": 0.0  # Se calculará después
                }
                series_ext.append(serie)

            # Calcular variaciones porcentuales
            for i in range(1, len(series_ext)):
                actual = series_ext[i]
                anterior = series_ext[i-1]
                
                # Usar los totales anuales con decimales para mayor precisión
                if anterior.get('produccion_anual_raw', 0) > 0:
                    variacion = ((actual.get('produccion_anual_raw', 0) - anterior.get('produccion_anual_raw', 0)) / anterior.get('produccion_anual_raw', 0)) * 100
                    actual['variacion_pct'] = excel_round(variacion, 1)

            # Quedarnos solo con el rango visible [anio_inicio, anio_actual]
            series_anuales = [s for s in series_ext if s["anio"] >= anio_inicio]

            # No calcular variación para el año seleccionado (anio_actual)
            for serie in series_anuales:
                if serie["anio"] == anio_actual:
                    serie["variacion_pct"] = 0.0

            # Calcular variación promedio sobre el rango visible EXCLUYENDO anio_actual
            ultimas_variaciones = [
                serie["variacion_pct"]
                for serie in series_anuales
                if serie.get("variacion_pct") is not None and serie["anio"] != anio_actual
            ]
            promedio_bruto = (sum(ultimas_variaciones) / len(ultimas_variaciones)) if ultimas_variaciones else 0
            # Truncamiento a 1 decimal (tipo Excel): trunc(valor*10)/10
            variacion_promedio_pct = math.trunc(promedio_bruto * 10) / 10 if ultimas_variaciones else 0.0
            # Normalizar -0.0 -> 0.0
            if variacion_promedio_pct == -0.0:
                variacion_promedio_pct = 0.0

            # Proyección para el siguiente año basada en la tendencia
            año_proyeccion = anio_actual + 1
            
            # Calcular proyección basada en el último año y la variación promedio
            ultimo_año = series_anuales[-1] if series_anuales else None
            if ultimo_año:
                factor_crecimiento = 1 + (variacion_promedio_pct / 100)
                produccion_proyectada = int(ultimo_año["produccion_anual_raw"] * factor_crecimiento)
                
                # Proyectar distribución mensual basada en el último año + variación promedio (en miles, 3 decimales)
                def fmt_int(val: float) -> int:
                    return int(val)

                proyeccion_mensual = {}
                suma_proyeccion = 0.0
                for mes in ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]:
                    base_mes = float(ultimo_año["meses"][mes]) if mes in ultimo_año["meses"] else 0.0
                    proyectado = base_mes * (1 + (variacion_promedio_pct / 100))
                    proyeccion_mensual[mes] = fmt_int(proyectado)
                    suma_proyeccion += proyectado
                
                proyeccion = {
                    "anio": año_proyeccion,
                    "meses": proyeccion_mensual,
                    # Producción anual proyectada en miles con 3 decimales (suma de meses)
                    "produccion_anual": fmt_int(suma_proyeccion)
                }
            else:
                # Proyección por defecto si no hay datos
                proyeccion = {
                    "anio": año_proyeccion,
                    "meses": {
                        "ene": 0, "feb": 0, "mar": 0, "abr": 0,
                        "may": 0, "jun": 0, "jul": 0, "ago": 0,
                        "sep": 0, "oct": 0, "nov": 0, "dic": 0
                    },
                    "produccion_anual": 0
                }

            # Calcular distribución mensual promedio (incluyendo el año proyectado)
            meses = ["ene", "feb", "mar", "abr", "may", "jun", 
                    "jul", "ago", "sep", "oct", "nov", "dic"]
            
            distribucion_mensual = {"meses": {}}
            total_distribucion = 0.0
            
            # Incluir el año proyectado en el promedio
            series_para_promedio = list(series_anuales)
            if proyeccion and isinstance(proyeccion, dict) and "meses" in proyeccion:
                series_para_promedio.append({"meses": proyeccion["meses"]})

            cantidad_series = len(series_para_promedio)
            
            def fmt_int(val: float) -> int:
                return int(val)

            promedios_float_por_mes = {}
            for mes in meses:
                # Convertir cada valor mensual desde string a float para sumar
                suma_mes = sum(float(serie["meses"][mes]) for serie in series_para_promedio)
                promedio_mes_float = (suma_mes / cantidad_series) if cantidad_series > 0 else 0.0
                promedios_float_por_mes[mes] = promedio_mes_float
                distribucion_mensual["meses"][mes] = excel_round(promedio_mes_float)
                total_distribucion += promedio_mes_float
            
            # Total redondeado al entero más cercano
            distribucion_mensual["total"] = excel_round(total_distribucion)

            # Calcular participación porcentual por mes
            participacion_pct = {}
            for mes in meses:
                if total_distribucion > 0:
                    participacion_pct[mes] = excel_round((promedios_float_por_mes[mes] / total_distribucion) * 100)
                else:
                    participacion_pct[mes] = 0
            participacion_pct["total"] = 100

            # Calcular 'toneladas' a partir de participacion_pct y produccion_anual proyectada
            toneladas = {"meses": {m: 0 for m in ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]}, "total": 0}
            if isinstance(proyeccion, dict) and "produccion_anual" in proyeccion:
                produccion_anual_target = int(proyeccion.get("produccion_anual", 0)) or 0
                if produccion_anual_target > 0:
                    meses_valores = {}
                    suma_parcial = 0
                    for mes in meses:
                        val_mes = excel_round(produccion_anual_target * (participacion_pct.get(mes, 0) / 100))
                        meses_valores[mes] = int(val_mes)
                        suma_parcial += int(val_mes)

                    diferencia = produccion_anual_target - suma_parcial
                    if diferencia != 0:
                        mes_ajuste = max(meses, key=lambda m: participacion_pct.get(m, 0))
                        meses_valores[mes_ajuste] = int(meses_valores.get(mes_ajuste, 0) + diferencia)

                    toneladas = {
                        "meses": {m: int(meses_valores.get(m, 0)) for m in meses},
                        "total": int(produccion_anual_target)
                    }

            # No incluir los meses detallados dentro de 'proyeccion' en la respuesta
            proyeccion_respuesta = {
                "anio": proyeccion["anio"] if isinstance(proyeccion, dict) and "anio" in proyeccion else anio_actual + 1,
                "produccion_anual": proyeccion["produccion_anual"] if isinstance(proyeccion, dict) and "produccion_anual" in proyeccion else 0
            }

            response_data = {
                "proyeccion": proyeccion_respuesta,
                "toneladas": toneladas,
                "participacion_pct": participacion_pct,
                "parametros": {
                    "anio_actual": anio_actual,
                    "año_proyeccion": año_proyeccion,
                    "periodos_estadisticos": periodos_estadisticos
                }
            }

            return Response({
                "success": True,
                "detail": f"Distribución mensual obtenida correctamente para el año {ano}.",
                "ano_consultado": ano,
                "data": response_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener la distribución mensual: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Tablero11ProduccionHistoricaView(APIView):
    """
    Tablero 11: Vista para obtener producción histórica de cacao por año
    incluyendo datos reales, proyecciones, variaciones porcentuales y datos mensuales
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene la producción histórica de cacao con datos reales de la BD
        incluyendo proyecciones y datos mensuales, usando los mismos filtros que series-anuales
        Parámetros opcionales:
        - anio_actual: año de referencia para la consulta y proyección (default: máximo disponible)
        - periodos_estadisticos | periodos: número de años hacia atrás a incluir (default: 10)
        """
        try:
            from ..models import ProduccionCacaoHistorico
            import math
            
            # Obtener parámetros de consulta (mismos que series-anuales)
            anio_actual_param = request.query_params.get('anio_actual') or request.query_params.get('ano_actual')
            periodos_param = request.query_params.get('periodos_estadisticos') or request.query_params.get('periodos')

            # Obtener datos desde la base de datos
            registros_bd = ProduccionCacaoHistorico.objects.filter(
                pano__isnull=False  # Solo registros con total anual
            ).order_by('ano')

            if not registros_bd.exists():
                return Response({
                    "success": False,
                    "detail": "No hay datos de producción histórica disponibles en la base de datos."
                }, status=status.HTTP_404_NOT_FOUND)

            # Determinar año máximo disponible
            max_anio_disponible = registros_bd.aggregate(max_ano=Max('ano'))['max_ano']

            try:
                anio_actual = int(anio_actual_param) if anio_actual_param else max_anio_disponible
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'anio_actual' debe ser un entero válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                periodos_estadisticos = int(periodos_param) if periodos_param else 10
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'periodos_estadisticos' debe ser un entero válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if periodos_estadisticos <= 0:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'periodos_estadisticos' debe ser mayor que 0."
                }, status=status.HTTP_400_BAD_REQUEST)

            anio_inicio = anio_actual - periodos_estadisticos

            # Para calcular la variación del primer año visible contra el año anterior,
            # incluimos el año previo (anio_inicio - 1) en la consulta
            registros_filtrados_ext = registros_bd.filter(
                ano__gte=anio_inicio - 1,
                ano__lte=anio_actual
            )

            if not registros_filtrados_ext.exists():
                return Response({
                    "success": False,
                    "detail": f"No hay datos disponibles para el rango extendido {anio_inicio-1}-{anio_actual}."
                }, status=status.HTTP_404_NOT_FOUND)

            # Convertir registros de BD a formato de series anuales
            series_ext = []
            for registro in registros_filtrados_ext:
                # Obtener datos mensuales
                def fmt_int(val):
                    try:
                        return int(float(val))
                    except Exception:
                        return 0

                meses_data = {
                    "ene": fmt_int(registro.enero) if registro.enero is not None else 0,
                    "feb": fmt_int(registro.febrero) if registro.febrero is not None else 0,
                    "mar": fmt_int(registro.marzo) if registro.marzo is not None else 0,
                    "abr": fmt_int(registro.abril) if registro.abril is not None else 0,
                    "may": fmt_int(registro.mayo) if registro.mayo is not None else 0,
                    "jun": fmt_int(registro.junio) if registro.junio is not None else 0,
                    "jul": fmt_int(registro.julio) if registro.julio is not None else 0,
                    "ago": fmt_int(registro.agosto) if registro.agosto is not None else 0,
                    "sep": fmt_int(registro.septiembre) if registro.septiembre is not None else 0,
                    "oct": fmt_int(registro.octubre) if registro.octubre is not None else 0,
                    "nov": fmt_int(registro.noviembre) if registro.noviembre is not None else 0,
                    "dic": fmt_int(registro.diciembre) if registro.diciembre is not None else 0
                }
                
                produccion_anual = float(registro.pano) if registro.pano else 0
                
                serie = {
                    "anio": registro.ano,
                    "meses": meses_data,
                    "produccion_anual": int(produccion_anual),
                    "produccion_anual_raw": produccion_anual,
                    "variacion_pct": 0.0  # Se calculará después
                }
                series_ext.append(serie)

            # Calcular variaciones porcentuales
            for i in range(1, len(series_ext)):
                actual = series_ext[i]
                anterior = series_ext[i-1]
                
                # Usar los totales anuales con decimales para mayor precisión
                if anterior.get('produccion_anual_raw', 0) > 0:
                    variacion = ((actual.get('produccion_anual_raw', 0) - anterior.get('produccion_anual_raw', 0)) / anterior.get('produccion_anual_raw', 0)) * 100
                    actual['variacion_pct'] = excel_round(variacion, 1)

            # Quedarnos solo con el rango visible [anio_inicio, anio_actual]
            series_anuales = [s for s in series_ext if s["anio"] >= anio_inicio]

            # No calcular variación para el año seleccionado (anio_actual)
            for serie in series_anuales:
                if serie["anio"] == anio_actual:
                    serie["variacion_pct"] = 0.0

            # Calcular variación promedio sobre el rango visible EXCLUYENDO anio_actual
            ultimas_variaciones = [
                serie["variacion_pct"]
                for serie in series_anuales
                if serie.get("variacion_pct") is not None and serie["anio"] != anio_actual
            ]
            promedio_bruto = (sum(ultimas_variaciones) / len(ultimas_variaciones)) if ultimas_variaciones else 0
            # Truncamiento a 1 decimal (tipo Excel): trunc(valor*10)/10
            variacion_promedio_pct = math.trunc(promedio_bruto * 10) / 10 if ultimas_variaciones else 0.0
            # Normalizar -0.0 -> 0.0
            if variacion_promedio_pct == -0.0:
                variacion_promedio_pct = 0.0

            # Proyección para el siguiente año basada en la tendencia
            año_proyeccion = anio_actual + 1
            
            # Calcular proyección basada en el último año y la variación promedio
            ultimo_año = series_anuales[-1] if series_anuales else None
            if ultimo_año:
                factor_crecimiento = 1 + (variacion_promedio_pct / 100)
                produccion_proyectada = ultimo_año["produccion_anual_raw"] * factor_crecimiento
                
                # Proyectar distribución mensual basada en el último año + variación promedio
                def fmt_int(val: float) -> int:
                    return int(val)

                proyeccion_mensual = {}
                suma_proyeccion = 0.0
                for mes in ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]:
                    base_mes = float(ultimo_año["meses"][mes]) if mes in ultimo_año["meses"] else 0.0
                    proyectado = base_mes * (1 + (variacion_promedio_pct / 100))
                    proyeccion_mensual[mes] = fmt_int(proyectado)
                    suma_proyeccion += proyectado
                
                proyeccion = {
                    "anio": año_proyeccion,
                    "meses": proyeccion_mensual,
                    "produccion_anual": excel_round(produccion_proyectada)
                }
            else:
                # Proyección por defecto si no hay datos
                proyeccion = {
                    "anio": año_proyeccion,
                    "meses": {
                        "ene": 0, "feb": 0, "mar": 0, "abr": 0,
                        "may": 0, "jun": 0, "jul": 0, "ago": 0,
                        "sep": 0, "oct": 0, "nov": 0, "dic": 0
                    },
                    "produccion_anual": 0
                }

            # Limpiar campo interno crudo antes de responder
            series_salida = []
            for s in series_anuales:
                s_out = {k: v for k, v in s.items() if k != 'produccion_anual_raw'}
                series_salida.append(s_out)

            # Agregar la proyección a la lista
            series_salida.append(proyeccion)
            
            response_data = {
                "produccion_historica": series_salida,
                "variacion_promedio_pct": variacion_promedio_pct,
                "parametros": {
                    "anio_actual": anio_actual,
                    "año_proyeccion": año_proyeccion,
                    "periodos_estadisticos": periodos_estadisticos
                }
            }

            return Response({
                "success": True,
                "detail": f"Producción histórica obtenida para {len(series_salida)} años ({len(series_anuales)} históricos + 1 proyectado).",
                "data": response_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener la producción histórica: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Tablero11EscenarioPronosticoLinealView(APIView):
    """
    Tablero 11: Vista para obtener escenario de pronóstico lineal de producción de cacao
    incluyendo datos históricos reales y proyecciones futuras
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene el escenario de pronóstico lineal con datos históricos y proyecciones
        Usa exactamente la misma lógica que pronostico-lineal
        Parámetros opcionales:
        - anio_actual: año de referencia para la consulta y proyección (default: máximo disponible)
        - periodos_estadisticos | periodos: número de años hacia atrás a incluir (default: 10)
        """
        try:
            # Construir serie base desde BD
            from ..models import ProduccionCacaoHistorico
            registros = ProduccionCacaoHistorico.objects.filter(pano__isnull=False).order_by('ano')
            series_base = []
            for r in registros:
                # Función para formatear con 3 decimales
                def fmt_int(val):
                    try:
                        return int(float(val))
                    except Exception:
                        return 0
                
                meses = {
                    "ene": fmt_int(r.enero) if r.enero is not None else 0,
                    "feb": fmt_int(r.febrero) if r.febrero is not None else 0,
                    "mar": fmt_int(r.marzo) if r.marzo is not None else 0,
                    "abr": fmt_int(r.abril) if r.abril is not None else 0,
                    "may": fmt_int(r.mayo) if r.mayo is not None else 0,
                    "jun": fmt_int(r.junio) if r.junio is not None else 0,
                    "jul": fmt_int(r.julio) if r.julio is not None else 0,
                    "ago": fmt_int(r.agosto) if r.agosto is not None else 0,
                    "sep": fmt_int(r.septiembre) if r.septiembre is not None else 0,
                    "oct": fmt_int(r.octubre) if r.octubre is not None else 0,
                    "nov": fmt_int(r.noviembre) if r.noviembre is not None else 0,
                    "dic": fmt_int(r.diciembre) if r.diciembre is not None else 0
                }
                series_base.append({
                    "anio": r.ano,
                    "meses": meses,
                    "produccion_anual": fmt_int(r.pano) if r.pano is not None else 0
                })

            if len(series_base) == 0:
                return Response({"success": False, "detail": "No hay datos históricos en BD."}, status=status.HTTP_404_NOT_FOUND)

            # Parámetros
            anio_actual_param = request.query_params.get('anio_actual') or request.query_params.get('ano_actual')
            periodos_param = request.query_params.get('periodos_estadisticos') or request.query_params.get('periodos')

            max_anio = max(s["anio"] for s in series_base)
            min_anio = min(s["anio"] for s in series_base)

            try:
                anio_actual = int(anio_actual_param) if anio_actual_param else max_anio + 1
            except ValueError:
                return Response({"success": False, "detail": "El parámetro 'anio_actual' debe ser un entero válido."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                periodos_estadisticos = int(periodos_param) if periodos_param else 10
            except ValueError:
                return Response({"success": False, "detail": "El parámetro 'periodos_estadisticos' debe ser un entero válido."}, status=status.HTTP_400_BAD_REQUEST)

            if periodos_estadisticos <= 0:
                return Response({"success": False, "detail": "'periodos_estadisticos' debe ser mayor que 0."}, status=status.HTTP_400_BAD_REQUEST)

            # Determinar rango histórico [inicio, fin] incluyendo el anio_actual si está disponible
            fin_hist = min(anio_actual, max_anio)
            inicio_hist = max(fin_hist - periodos_estadisticos, min_anio)
            historicas = [s for s in series_base if inicio_hist <= s["anio"] <= fin_hist]

            if len(historicas) == 0:
                return Response({"success": False, "detail": f"No hay datos históricos entre {inicio_hist} y {fin_hist}."}, status=status.HTTP_404_NOT_FOUND)

            # Función para calcular regresión lineal (equivalente a PRONOSTICO.LINEAL de Excel)
            def pronostico_lineal(x_nuevo, x_conocidos, y_conocidos):
                """
                Calcula la predicción lineal usando el método de mínimos cuadrados
                Equivalente a PRONOSTICO.LINEAL(x_nuevo, y_conocidos, x_conocidos) de Excel
                """
                n = len(x_conocidos)
                if n != len(y_conocidos) or n < 2:
                    return 0.0
                
                # Calcular pendiente (m) e intercepto (b)
                sum_x = sum(x_conocidos)
                sum_y = sum(y_conocidos)
                sum_xy = sum(x * y for x, y in zip(x_conocidos, y_conocidos))
                sum_x2 = sum(x * x for x in x_conocidos)
                
                denom = n * sum_x2 - sum_x * sum_x
                if denom == 0:
                    return 0.0
                
                m = (n * sum_xy - sum_x * sum_y) / denom
                b = (sum_y - m * sum_x) / n
                
                # Calcular predicción para x_nuevo
                return m * x_nuevo + b

            # Preparar datos para regresión lineal
            meses_orden = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
            x_conocidos = [s["anio"] for s in historicas]  # Años históricos
            
            # Calcular proyección mes por mes usando regresión lineal
            def calcular_proyeccion_mensual(anio_objetivo):
                meses_proyeccion = {}
                for mes in meses_orden:
                    # Valores y conocidos para este mes
                    y_conocidos = [float(s["meses"][mes]) for s in historicas]
                    # Calcular predicción para el año objetivo
                    prediccion = pronostico_lineal(anio_objetivo, x_conocidos, y_conocidos)
                    meses_proyeccion[mes] = excel_round(prediccion)
                return meses_proyeccion

            # Calcular proyecciones para anio_actual y anio_actual+1
            meses_pred_1 = calcular_proyeccion_mensual(anio_actual)
            meses_pred_2 = calcular_proyeccion_mensual(anio_actual + 1)

            # Construir respuesta: históricas + predicciones
            escenario_pronostico = []
            escenario_pronostico.extend({"anio": s["anio"], "meses": s["meses"], "produccion_anual": s["produccion_anual"]} for s in historicas)
            
            # Solo agregar proyecciones para años que no existen en los datos históricos
            anos_historicos = {s["anio"] for s in historicas}
            
            # Proyección para anio_actual solo si no existe en los datos históricos
            if anio_actual not in anos_historicos:
                total_pred_1 = sum(float(v) for v in meses_pred_1.values())
                escenario_pronostico.append({
                    "anio": anio_actual, 
                    "meses": meses_pred_1, 
                    "produccion_anual": excel_round(total_pred_1)
                })
            
            # Proyección para anio_actual + 1 solo si no existe en los datos históricos
            if (anio_actual + 1) not in anos_historicos:
                total_pred_2 = sum(float(v) for v in meses_pred_2.values())
                escenario_pronostico.append({
                    "anio": anio_actual + 1, 
                    "meses": meses_pred_2, 
                    "produccion_anual": excel_round(total_pred_2)
                })

            return Response({
                "success": True,
                "detail": "Escenario de pronóstico lineal generado correctamente.",
                "parametros": {
                    "anio_actual": anio_actual,
                    "periodos_estadisticos": periodos_estadisticos,
                    "rango_historico": [inicio_hist, fin_hist]
                },
                "data": {"escenario_pronostico_lineal": escenario_pronostico}
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener el escenario de pronóstico lineal: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)