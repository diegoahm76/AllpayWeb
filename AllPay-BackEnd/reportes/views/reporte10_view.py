import math
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from datetime import datetime
from permissions.permissions_reportes import PermisoConsultarReporteLibroCompra, PermisoConsultarReportePrecioNacional
from recaudos.models.recaudos_models import FacturaUnica, Pagos, LiquidacionesFacturaUnica, PorcentajesCobro, FechasCierre, DetallesFacturaUnica
from recaudos.serializers.pagos_serializer import ObtenerPagosSerializer, PagosSerializer
from recaudos.models.recaudos_models import LiquidacionesFacturaUnica
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.views.cartera_view import obtener_url_documento
from recaudos.views.documentos_views import GeneradorDocumentosView, ConvertWordToPdfView
from reportes import serializers
from reportes.serializers.reportes_serializers import FacturaUnicaRecaudadorSerializer, PrecioNacionalCacaoSerializer, ConsolidadoProduccionNacionalCacaoSerializer
from seguridad.utils import Util
from django.utils.dateparse import parse_date
from seguridad.models.transversal_models import Personas, Municipio, Departamento
from django.db.models import Sum, Count, Q, F, DecimalField, Case, When, IntegerField
from rest_framework.pagination import PageNumberPagination
from decimal import Decimal
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from datetime import timedelta
from reportes.views.excel_plantilla_view import ExcelPlantillaView
import openpyxl
from io import BytesIO
import uuid
import os
from django.core.files.uploadedfile import InMemoryUploadedFile
from copy import copy
from services.reportes import obtener_consolidado_facturas, obtener_facturas_pagadas_por_fecha_pago, MESES

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
    
class ConsolidadoProduccionNacionalCacaoView(APIView):
    """
    Vista para el Reporte 10: Consolidado Producción Nacional de Cacao
    
    CAMBIO IMPORTANTE: Ahora funciona con facturas PAGADAS basándose en la fecha de pago
    según el parámetro de cuota de fomento (del 11 al 10 del siguiente mes).
    
    NUEVAS CARACTERÍSTICAS:
    - Campo de toneladas agregado para cada mes
    - Validación por fecha de pago en lugar de fecha de compra
    - Totales de toneladas por mes en la parte inferior
    - Solo considera facturas que han sido efectivamente pagadas
    - Incluye total_toneladas_anual por ubicación
    
    ORDEN DE CAMPOS POR MES:
    - Kilos (ej: mayo_total_kilos)
    - Toneladas (ej: mayo_total_toneladas) 
    - Cuota Fomento (ej: mayo_total_cuota_fomento)
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
        """
        Obtiene el consolidado de producción nacional de cacao
        
        CAMBIO IMPORTANTE: Ahora funciona con facturas PAGADAS basándose en la fecha de pago
        según el parámetro de cuota de fomento (del 11 al 10 del siguiente mes).
        
        NUEVO: Incluye campo de toneladas para cada mes y total anual por ubicación.
        
        Parámetros:
        - fecha_inicio: Fecha de inicio del período de pagos (YYYY-MM-DD)
        - fecha_final: Fecha final del período de pagos (YYYY-MM-DD)
        - municipio: ID del municipio (opcional)
        - departamento: ID del departamento (opcional)
        
        Retorna:
        - Consolidado por ubicación con kilos, cuotas y toneladas por mes
        - Totales nacionales por mes incluyendo toneladas
        - Total de toneladas anual por ubicación
        """
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_final = request.query_params.get('fecha_final')
        municipio_id = request.query_params.get('municipio')
        departamento_id = request.query_params.get('departamento')

        # Validar parámetros requeridos
        if not fecha_inicio or not fecha_final:
            return Response({
                "success": False,
                'detail': 'Los parámetros fecha_inicio y fecha_final son obligatorios'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar formato de fechas
        try:
            fecha_inicio = parse_date(fecha_inicio)
            if not fecha_inicio:
                raise ValueError
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_inicio'. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_final = parse_date(fecha_final)
            if not fecha_final:
                raise ValueError
        except Exception:
            return Response({
                "success": False,
                "detail": "Formato inválido para 'fecha_final'. Use YYYY-MM-DD."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar rango de fechas
        if fecha_inicio > fecha_final:
            return Response({
                "success": False,
                'detail': 'La fecha de inicio no puede ser mayor que la fecha final.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Construir filtros dinámicamente
        # CAMBIO IMPORTANTE: Ahora se valida por fecha de pago, no por fecha de compra
        # Las fechas de pago van del 11 al 10 del siguiente mes según el parámetro de cuota de fomento
        
        # Agregar filtros opcionales por ID
        municipio = None
        departamento = None
        
        if municipio_id:
            try:
                municipio = Municipio.objects.get(cod_municipio=municipio_id)
            except Municipio.DoesNotExist:
                return Response({
                    "success": False,
                    'detail': 'El municipio especificado no existe.'
                }, status=status.HTTP_404_NOT_FOUND)

        if departamento_id:
            try:
                departamento = Departamento.objects.get(cod_departamento=departamento_id)
            except Departamento.DoesNotExist:
                return Response({
                    "success": False,
                    'detail': 'El departamento especificado no existe.'
                }, status=status.HTTP_404_NOT_FOUND)

        # Obtener facturas PAGADAS con los filtros aplicados
        print(f"🔍 [DEBUG] Iniciando consulta de facturas PAGADAS por fecha de pago:")
        print(f"📅 [DEBUG] Rango de fechas de pago: {fecha_inicio} a {fecha_final}")
        print(f"📍 [DEBUG] Municipio: {municipio.nombre if municipio else 'TODOS'}")
        print(f"📍 [DEBUG] Departamento: {departamento.nombre if departamento else 'TODOS'}")
        
        # Usar la nueva función que obtiene facturas pagadas por fecha de pago
        facturas_qs = obtener_facturas_pagadas_por_fecha_pago(
            fecha_inicio, 
            fecha_final, 
            municipio.id_municipio if municipio else None,
            departamento.id_departamento if departamento else None
        )
        
        print(f"📊 [DEBUG] Se encontraron {facturas_qs.count()} facturas PAGADAS para consolidado")

        if not facturas_qs.exists():
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas PAGADAS para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)

        # 👉 una única llamada al service layer optimizado
        print("⚙️ [DEBUG] Iniciando cálculo optimizado con service layer...")
        datos_consolidado, totales_por_mes = obtener_consolidado_facturas(facturas_qs)
        print(f"✅ [DEBUG] Cálculo completado. {len(datos_consolidado)} ubicaciones procesadas")

        # DRF pagination
        print("📄 [DEBUG] Aplicando paginación al consolidado...")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(datos_consolidado, request)
        
        serializer = ConsolidadoProduccionNacionalCacaoSerializer(
            page if page is not None else datos_consolidado,
            many=True
        )
        
        payload = {
            "success": True,
            "count": len(datos_consolidado),
            "data": {
                "consolidado": serializer.data,
                "totales_por_mes": totales_por_mes
            }
        }
        
        return (
            paginator.get_paginated_response(payload)
            if page is not None else Response(payload)
        )

    def generar_tabla_estatica(self, datos_consolidado, totales_por_mes):
        """Genera una tabla estática con todos los datos sin usar bucles Jinja2"""
        def formato_miles(valor):
            return f"{valor:,.0f}".replace(",", ".")
        
        def formato_pesos(valor):
            return f"$ {valor:,.0f}".replace(",", ".")
        
        # Crear filas de la tabla
        filas_tabla = []
        for i, ubicacion in enumerate(datos_consolidado, 1):
            fila = {
                'No': i,
                'departamento': ubicacion['departamento'],
                'municipio': ubicacion['municipio'],
                'enero_kilos': formato_miles(ubicacion['enero_total_kilos']),
                'enero_cuota': formato_pesos(ubicacion['enero_total_cuota_fomento']),
                'febrero_kilos': formato_miles(ubicacion['febrero_total_kilos']),
                'febrero_cuota': formato_pesos(ubicacion['febrero_total_cuota_fomento']),
                'marzo_kilos': formato_miles(ubicacion['marzo_total_kilos']),
                'marzo_cuota': formato_pesos(ubicacion['marzo_total_cuota_fomento']),
                'abril_kilos': formato_miles(ubicacion['abril_total_kilos']),
                'abril_cuota': formato_pesos(ubicacion['abril_total_cuota_fomento']),
                'mayo_kilos': formato_miles(ubicacion['mayo_total_kilos']),
                'mayo_cuota': formato_pesos(ubicacion['mayo_total_cuota_fomento']),
                'junio_kilos': formato_miles(ubicacion['junio_total_kilos']),
                'julio_kilos': formato_miles(ubicacion['julio_total_kilos']),
                'julio_cuota': formato_pesos(ubicacion['julio_total_cuota_fomento']),
                'agosto_kilos': formato_miles(ubicacion['agosto_total_kilos']),
                'septiembre_kilos': formato_miles(ubicacion['septiembre_total_kilos']),
                'septiembre_cuota': formato_pesos(ubicacion['septiembre_total_cuota_fomento']),
                'octubre_kilos': formato_miles(ubicacion['octubre_total_kilos']),
                'octubre_cuota': formato_pesos(ubicacion['octubre_total_cuota_fomento']),
                'noviembre_kilos': formato_miles(ubicacion['noviembre_total_kilos']),
                'noviembre_cuota': formato_pesos(ubicacion['noviembre_total_cuota_fomento']),
                'diciembre_kilos': formato_miles(ubicacion['diciembre_total_kilos']),
                'diciembre_cuota': formato_pesos(ubicacion['diciembre_total_cuota_fomento']),
                'total_kilos': formato_miles(
                    ubicacion['enero_total_kilos'] + ubicacion['febrero_total_kilos'] + 
                    ubicacion['marzo_total_kilos'] + ubicacion['abril_total_kilos'] + 
                    ubicacion['mayo_total_kilos'] + ubicacion['junio_total_kilos'] + 
                    ubicacion['julio_total_kilos'] + ubicacion['agosto_total_kilos'] + 
                    ubicacion['septiembre_total_kilos'] + ubicacion['octubre_total_kilos'] + 
                    ubicacion['noviembre_total_kilos'] + ubicacion['diciembre_total_kilos']
                ),
                'total_cuota': formato_pesos(
                    ubicacion['enero_total_cuota_fomento'] + ubicacion['febrero_total_cuota_fomento'] + 
                    ubicacion['marzo_total_cuota_fomento'] + ubicacion['abril_total_cuota_fomento'] + 
                    ubicacion['mayo_total_cuota_fomento'] + ubicacion['junio_total_cuota_fomento'] + 
                    ubicacion['julio_total_cuota_fomento'] + ubicacion['agosto_total_cuota_fomento'] + 
                    ubicacion['septiembre_total_cuota_fomento'] + ubicacion['octubre_total_cuota_fomento'] + 
                    ubicacion['noviembre_total_cuota_fomento'] + ubicacion['diciembre_total_cuota_fomento']
                )
            }
            filas_tabla.append(fila)
        
        return filas_tabla

    def generar_contenido_tabla_sin_bucles(self, tabla_filas):
        """Genera contenido de tabla sin usar bucles Jinja2"""
        contenido_tabla = []
        
        for i, fila in enumerate(tabla_filas, 1):
            linea = f"{fila['No']}\t{fila['departamento']}\t{fila['municipio']}\t"
            linea += f"{fila['enero_kilos']}\t{fila['enero_cuota']}\t"
            linea += f"{fila['febrero_kilos']}\t{fila['febrero_cuota']}\t"
            linea += f"{fila['marzo_kilos']}\t{fila['marzo_cuota']}\t"
            linea += f"{fila['abril_kilos']}\t{fila['abril_cuota']}\t"
            linea += f"{fila['mayo_kilos']}\t{fila['mayo_cuota']}\t"
            linea += f"{fila['junio_kilos']}\t{fila['junio_cuota']}\t"
            linea += f"{fila['julio_kilos']}\t{fila['julio_cuota']}\t"
            linea += f"{fila['agosto_kilos']}\t{fila['agosto_cuota']}\t"
            linea += f"{fila['septiembre_kilos']}\t{fila['septiembre_cuota']}\t"
            linea += f"{fila['octubre_kilos']}\t{fila['octubre_cuota']}\t"
            linea += f"{fila['noviembre_kilos']}\t{fila['noviembre_cuota']}\t"
            linea += f"{fila['diciembre_kilos']}\t{fila['diciembre_cuota']}\t"
            linea += f"{fila['total_kilos']}\t{fila['total_cuota']}"
            contenido_tabla.append(linea)
        
        return "\n".join(contenido_tabla)


class GenerarDocumentoConsolidadoProduccionNacionalCacaoView(APIView):
    """
    Vista para generar el documento Excel del Reporte 10: Consolidado Producción Nacional de Cacao
    
    CAMBIO IMPORTANTE: El documento ahora incluye:
    - Facturas PAGADAS basándose en fecha de pago (del 11 al 10 del siguiente mes)
    - Campo de toneladas para cada mes
    - Totales de toneladas por mes en la parte inferior
    - Validación por fecha de pago según parámetro de cuota de fomento
    - Incluye total_toneladas_anual por ubicación
    
    NUEVO ORDEN DE CAMPOS POR MES:
    - Kilos (ej: mayo_total_kilos)
    - Toneladas (ej: mayo_total_toneladas) 
    - Cuota Fomento (ej: mayo_total_cuota_fomento)
    
    Variables disponibles en la plantilla:
    - enetkilo, eneton, enetcuota (enero)
    - febtkilo, febton, febtcuota (febrero)
    - martkilo, marton, martcuota (marzo)
    - abrtkilo, abrton, abrtcuota (abril)
    - maytkilo, mayton, maytcuota (mayo)
    - juntkilo, junton, juntcuota (junio)
    - jultkilo, julton, jultcuota (julio)
    - agotkilo, agoton, agotcuota (agosto)
    - septkilo, septon, septcuota (septiembre)
    - octtkilo, octton, octtcuota (octubre)
    - novtkilo, novton, novtcuota (noviembre)
    - dictkilo, dicton, dictcuota (diciembre)
    - totalkilos, totalton, totalcuotas (totales)
    """
    permission_classes = [IsAuthenticated]
    
    def duplicar_filas_datos(self, worksheet, items):
        """Duplica la fila de plantilla para cada item en la hoja actual."""
        print("🔄 [DEBUG] Iniciando duplicación de filas de datos...")
        
        # Buscar y eliminar la fila de totales que aparece antes del bucle
        fila_totales_eliminar = None
        for row_num in range(1, worksheet.max_row + 1):
            celda_departamento = worksheet.cell(row=row_num, column=4).value  # Columna D
            celda_municipio = worksheet.cell(row=row_num, column=5).value     # Columna E
            if celda_departamento == 'TODOS' and celda_municipio == 'TODOS':
                fila_totales_eliminar = row_num
                print(f"🗑️ [DEBUG] Encontrada fila de totales en fila {fila_totales_eliminar} - será eliminada")
                break
        
        # Eliminar la fila de totales si existe
        if fila_totales_eliminar:
            worksheet.delete_rows(fila_totales_eliminar)
            print(f"🗑️ [DEBUG] Fila de totales {fila_totales_eliminar} eliminada")
        
        # Buscar la fila plantilla (fila 14 según la recomendación)
        fila_plantilla = 14
        print(f"📋 [DEBUG] Usando fila {fila_plantilla} como plantilla")
        
        # NUEVO MAPEO DE COLUMNAS con el orden actualizado:
        # {{ i.No }} {{ i.departamento }} {{ i.municipio }} {{ i.enetkilo }} {{ i.eneton }} {{ i.enetcuota }} {{ i.febtkilo }} {{ i.febton }} {{ i.febtcuota }} {{ i.martkilo }} {{ i.marton }} {{ i.martcuota }} {{ i.abrtkilo }} {{ i.abrton }} {{ i.abrtcuota }} {{ i.maytkilo }} {{ i.mayton }} {{ i.maytcuota }} {{ i.juntkilo }} {{ i.junton }} {{ i.juntcuota }} {{ i.jultkilo }} {{ i.julton }} {{ i.jultcuota }} {{ i.agotkilo }} {{ i.agoton }} {{ i.agotcuota }} {{ i.septkilo }} {{ i.septon }} {{ i.septcuota }} {{ i.octtkilo }} {{ i.octton }} {{ i.octtcuota }} {{ i.novtkilo }} {{ i.novton }} {{ i.novtcuota }} {{ i.dictkilo }} {{ i.dicton }} {{ i.dictcuota }} {{ i.totalkilos }} {{ i.totalton }} {{ i.totalcuotas }}
        
        mapeo_columnas = {
            3: 'No',           # Columna C
            4: 'departamento',  # Columna D
            5: 'municipio',     # Columna E
            6: 'enetkilo',      # Columna F - Enero kilos
            7: 'eneton',        # Columna G - Enero toneladas
            8: 'enetcuota',     # Columna H - Enero cuota
            9: 'febtkilo',      # Columna I - Febrero kilos
            10: 'febton',       # Columna J - Febrero toneladas
            11: 'febtcuota',    # Columna K - Febrero cuota
            12: 'martkilo',     # Columna L - Marzo kilos
            13: 'marton',       # Columna M - Marzo toneladas
            14: 'martcuota',    # Columna N - Marzo cuota
            15: 'abrtkilo',     # Columna O - Abril kilos
            16: 'abrton',       # Columna P - Abril toneladas
            17: 'abrtcuota',    # Columna Q - Abril cuota
            18: 'maytkilo',     # Columna R - Mayo kilos
            19: 'mayton',       # Columna S - Mayo toneladas
            20: 'maytcuota',    # Columna T - Mayo cuota
            21: 'juntkilo',     # Columna U - Junio kilos
            22: 'junton',       # Columna V - Junio toneladas
            23: 'juntcuota',    # Columna W - Junio cuota
            24: 'jultkilo',     # Columna X - Julio kilos
            25: 'julton',       # Columna Y - Julio toneladas
            26: 'jultcuota',    # Columna Z - Julio cuota
            27: 'agotkilo',     # Columna AA - Agosto kilos
            28: 'agoton',       # Columna AB - Agosto toneladas
            29: 'agotcuota',    # Columna AC - Agosto cuota
            30: 'septkilo',     # Columna AD - Septiembre kilos
            31: 'septon',       # Columna AE - Septiembre toneladas
            32: 'septcuota',    # Columna AF - Septiembre cuota
            33: 'octtkilo',     # Columna AG - Octubre kilos
            34: 'octton',       # Columna AH - Octubre toneladas
            35: 'octtcuota',    # Columna AI - Octubre cuota
            36: 'novtkilo',     # Columna AJ - Noviembre kilos
            37: 'novton',       # Columna AK - Noviembre toneladas
            38: 'novtcuota',    # Columna AL - Noviembre cuota
            39: 'dictkilo',     # Columna AM - Diciembre kilos
            40: 'dicton',       # Columna AN - Diciembre toneladas
            41: 'dictcuota',    # Columna AO - Diciembre cuota
            42: 'totalkilos',   # Columna AP - Total kilos
            43: 'totalton',     # Columna AQ - Total toneladas
            44: 'totalcuotas'   # Columna AR - Total cuotas
        }
        
        # Primero: duplicar la fila para cada item (datos individuales)
        for idx, item in enumerate(items):
            fila_nueva = fila_plantilla + idx
            
            # Insertar nueva fila
            worksheet.insert_rows(fila_nueva)
            
            # Copiar formato y contenido de la fila plantilla
            for col in range(1, worksheet.max_column + 1):
                celda_origen = worksheet.cell(row=fila_plantilla, column=col)
                celda_destino = worksheet.cell(row=fila_nueva, column=col)
                
                # Copiar valor
                celda_destino.value = celda_origen.value
                
                # Copiar formato si existe
                if celda_origen.font:
                    celda_destino.font = copy(celda_origen.font)
                if celda_origen.number_format:
                    celda_destino.number_format = copy(celda_origen.number_format)
                if celda_origen.alignment:
                    celda_destino.alignment = copy(celda_origen.alignment)
                if celda_origen.border:
                    celda_destino.border = copy(celda_origen.border)
            
            # Manejar celdas combinadas - descombinar si es necesario
            print(f"🔧 [DEBUG] Verificando celdas combinadas en fila {fila_nueva}...")
            for merged_range in list(worksheet.merged_cells.ranges):
                if merged_range.min_row <= fila_nueva <= merged_range.max_row:
                    print(f"⚠️ [DEBUG] Encontrada celda combinada en rango {merged_range} que afecta fila {fila_nueva}")
                    # Descombinar la celda si afecta a nuestra nueva fila
                    worksheet.unmerge_cells(str(merged_range))
                    print(f"🔧 [DEBUG] Celda combinada descombinada: {merged_range}")
            
            # Rellenar datos del item
            print(f"📝 [DEBUG] Rellenando fila {fila_nueva} con datos:")
            for col, variable in mapeo_columnas.items():
                if variable in item:
                    celda = worksheet.cell(row=fila_nueva, column=col)
                    celda.value = item[variable]
                    print(f"  📊 Columna {col} ({variable}): {item[variable]}")
            
            print(f"✅ [DEBUG] Fila {fila_nueva} creada para item {idx + 1} - {item.get('departamento', 'N/A')}/{item.get('municipio', 'N/A')}")
        
        print(f"✅ [DEBUG] Duplicación completada. Total de filas creadas: {len(items)} (solo datos individuales)")
    
    def post(self, request):
        """Generar documento Excel del consolidado de producción nacional de cacao"""
        try:
            # Obtener parámetros del request
            fecha_inicio = request.data.get('fecha_inicio')
            fecha_final = request.data.get('fecha_final')
            municipio_id = request.data.get('municipio')
            departamento_id = request.data.get('departamento')
            
            # Validar parámetros requeridos
            if not fecha_inicio or not fecha_final:
                return Response({
                    "success": False,
                    'detail': 'Los parámetros fecha_inicio y fecha_final son obligatorios'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar formato de fechas
            try:
                fecha_inicio = parse_date(fecha_inicio)
                if not fecha_inicio:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_inicio'. Use YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                fecha_final = parse_date(fecha_final)
                if not fecha_final:
                    raise ValueError
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_final'. Use YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar rango de fechas
            if fecha_inicio > fecha_final:
                return Response({
                    "success": False,
                    'detail': 'La fecha de inicio no puede ser mayor que la fecha final.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Construir filtros dinámicamente
            # CAMBIO IMPORTANTE: Ahora se valida por fecha de pago, no por fecha de compra
            # Las fechas de pago van del 11 al 10 del siguiente mes según el parámetro de cuota de fomento
            
            # Agregar filtros opcionales por ID
            municipio = None
            departamento = None
            
            if municipio_id:
                try:
                    municipio = Municipio.objects.get(cod_municipio=municipio_id)
                except Municipio.DoesNotExist:
                    return Response({
                        "success": False,
                        'detail': 'El municipio especificado no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if departamento_id:
                try:
                    departamento = Departamento.objects.get(cod_departamento=departamento_id)
                except Departamento.DoesNotExist:
                    return Response({
                        "success": False,
                        'detail': 'El departamento especificado no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Obtener facturas PAGADAS con los filtros aplicados
            print(f"🔍 [DEBUG] Iniciando consulta de facturas PAGADAS por fecha de pago:")
            print(f"📅 [DEBUG] Rango de fechas de pago: {fecha_inicio} a {fecha_final}")
            print(f"📍 [DEBUG] Municipio: {municipio.nombre if municipio else 'TODOS'}")
            print(f"📍 [DEBUG] Departamento: {departamento.nombre if departamento else 'TODOS'}")
            
            # Usar la nueva función que obtiene facturas pagadas por fecha de pago
            facturas_qs = obtener_facturas_pagadas_por_fecha_pago(
                fecha_inicio, 
                fecha_final, 
                municipio.id_municipio if municipio else None,
                departamento.id_departamento if departamento else None
            )
            
            print(f"📊 [DEBUG] Se encontraron {facturas_qs.count()} facturas PAGADAS para consolidado")
            
            if not facturas_qs.exists():
                return Response({
                    "success": False,
                    'detail': 'No se encontraron facturas PAGADAS para los parámetros dados.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # ✅ SIN duplicar trabajo - usar el service layer optimizado
            print("⚙️ [DEBUG] Iniciando cálculo optimizado con service layer...")
            datos_consolidado, totales_por_mes = obtener_consolidado_facturas(facturas_qs)
            print(f"✅ [DEBUG] Cálculo completado. {len(datos_consolidado)} ubicaciones procesadas")
            
            # Verificar que existe la plantilla "REPORTE 10"
            plantilla = PlantillasDoc.objects.filter(nombre="Produccion Registrada Por Departamento Y Municipio").first()
            if not plantilla:
                return Response({
                    "success": False,
                    "detail": "No se encontró la plantilla 'REPORTE 10'."
                }, status=status.HTTP_404_NOT_FOUND)
            
            print(f"📄 [DEBUG] Plantilla encontrada - ID: {plantilla.id_plantilla_doc}, Nombre: {plantilla.nombre}")
            print(f"📄 [DEBUG] Archivo de plantilla: {plantilla.doc_plantilla.name}")
            
            # Definir funciones de formato antes de usarlas
            def formato_miles(valor):
                return f"{valor:,.0f}".replace(",", ".")
            
            def formato_pesos(valor):
                return f"$ {valor:,.0f}".replace(",", ".")
            
            # Preparar los datos para la plantilla
            # Formatear los valores de cada ubicación en el listado (items)
            items = []
            
            # Ordenar los datos por departamento y municipio alfabéticamente
            datos_consolidado_ordenados = sorted(
                datos_consolidado, 
                key=lambda x: (x['departamento'], x['municipio'])
            )
            
            print(f"📋 [DEBUG] Datos ordenados alfabéticamente:")
            for i, ubicacion in enumerate(datos_consolidado_ordenados, 1):
                print(f"  {i}. {ubicacion['departamento']}/{ubicacion['municipio']}")
            
            for ubicacion in datos_consolidado_ordenados:
                # Calcular totales por ubicación
                total_kilos_ubicacion = (
                    ubicacion['enero_total_kilos'] + ubicacion['febrero_total_kilos'] + 
                    ubicacion['marzo_total_kilos'] + ubicacion['abril_total_kilos'] + 
                    ubicacion['mayo_total_kilos'] + ubicacion['junio_total_kilos'] + 
                    ubicacion['julio_total_kilos'] + ubicacion['agosto_total_kilos'] + 
                    ubicacion['septiembre_total_kilos'] + ubicacion['octubre_total_kilos'] + 
                    ubicacion['noviembre_total_kilos'] + ubicacion['diciembre_total_kilos']
                )
                
                total_cuota_ubicacion = (
                    ubicacion['enero_total_cuota_fomento'] + ubicacion['febrero_total_cuota_fomento'] + 
                    ubicacion['marzo_total_cuota_fomento'] + ubicacion['abril_total_cuota_fomento'] + 
                    ubicacion['mayo_total_cuota_fomento'] + ubicacion['junio_total_cuota_fomento'] + 
                    ubicacion['julio_total_cuota_fomento'] + ubicacion['agosto_total_cuota_fomento'] + 
                    ubicacion['septiembre_total_cuota_fomento'] + ubicacion['octubre_total_cuota_fomento'] + 
                    ubicacion['noviembre_total_cuota_fomento'] + ubicacion['diciembre_total_cuota_fomento']
                )
                
                # Crear item para el bucle Jinja2 con el NUEVO ORDEN DE COLUMNAS
                items.append({
                    'No': len(items) + 1,  # Número secuencial
                    'departamento': ubicacion['departamento'],
                    'municipio': ubicacion['municipio'],
                    # Variables específicas que espera la plantilla - NUEVO ORDEN
                    'enetkilo': formato_miles(ubicacion['enero_total_kilos']),
                    'eneton': formato_miles(ubicacion['enero_total_toneladas']),
                    'enetcuota': formato_pesos(ubicacion['enero_total_cuota_fomento']),
                    'febtkilo': formato_miles(ubicacion['febrero_total_kilos']),
                    'febton': formato_miles(ubicacion['febrero_total_toneladas']),
                    'febtcuota': formato_pesos(ubicacion['febrero_total_cuota_fomento']),
                    'martkilo': formato_miles(ubicacion['marzo_total_kilos']),
                    'marton': formato_miles(ubicacion['marzo_total_toneladas']),
                    'martcuota': formato_pesos(ubicacion['marzo_total_cuota_fomento']),
                    'abrtkilo': formato_miles(ubicacion['abril_total_kilos']),
                    'abrton': formato_miles(ubicacion['abril_total_toneladas']),
                    'abrtcuota': formato_pesos(ubicacion['abril_total_cuota_fomento']),
                    'maytkilo': formato_miles(ubicacion['mayo_total_kilos']),
                    'mayton': formato_miles(ubicacion['mayo_total_toneladas']),
                    'maytcuota': formato_pesos(ubicacion['mayo_total_cuota_fomento']),
                    'juntkilo': formato_miles(ubicacion['junio_total_kilos']),
                    'junton': formato_miles(ubicacion['junio_total_toneladas']),
                    'juntcuota': formato_pesos(ubicacion['junio_total_cuota_fomento']),
                    'jultkilo': formato_miles(ubicacion['julio_total_kilos']),
                    'julton': formato_miles(ubicacion['julio_total_toneladas']),
                    'jultcuota': formato_pesos(ubicacion['julio_total_cuota_fomento']),
                    'agotkilo': formato_miles(ubicacion['agosto_total_kilos']),
                    'agoton': formato_miles(ubicacion['agosto_total_toneladas']),
                    'agotcuota': formato_pesos(ubicacion['agosto_total_cuota_fomento']),
                    'septkilo': formato_miles(ubicacion['septiembre_total_kilos']),
                    'septon': formato_miles(ubicacion['septiembre_total_toneladas']),
                    'septcuota': formato_pesos(ubicacion['septiembre_total_cuota_fomento']),
                    'octtkilo': formato_miles(ubicacion['octubre_total_kilos']),
                    'octton': formato_miles(ubicacion['octubre_total_toneladas']),
                    'octtcuota': formato_pesos(ubicacion['octubre_total_cuota_fomento']),
                    'novtkilo': formato_miles(ubicacion['noviembre_total_kilos']),
                    'novton': formato_miles(ubicacion['noviembre_total_toneladas']),
                    'novtcuota': formato_pesos(ubicacion['noviembre_total_cuota_fomento']),
                    'dictkilo': formato_miles(ubicacion['diciembre_total_kilos']),
                    'dicton': formato_miles(ubicacion['diciembre_total_toneladas']),
                    'dictcuota': formato_pesos(ubicacion['diciembre_total_cuota_fomento']),
                    # Totales
                    'totalkilos': formato_miles(total_kilos_ubicacion),
                    'totalton': formato_miles(round(total_kilos_ubicacion / 1000, 3)),
                    'totalcuotas': formato_pesos(total_cuota_ubicacion)
                })
            
            # Definir fecha_actual antes de usarla
            fecha_actual = timezone.now()
            
            # Calcular totales generales
            total_kilos_general = sum(
                ubicacion['enero_total_kilos'] + ubicacion['febrero_total_kilos'] + 
                ubicacion['marzo_total_kilos'] + ubicacion['abril_total_kilos'] + 
                ubicacion['mayo_total_kilos'] + ubicacion['junio_total_kilos'] + 
                ubicacion['julio_total_kilos'] + ubicacion['agosto_total_kilos'] + 
                ubicacion['septiembre_total_kilos'] + ubicacion['octubre_total_kilos'] + 
                ubicacion['noviembre_total_kilos'] + ubicacion['diciembre_total_kilos']
                for ubicacion in datos_consolidado
            )
            
            total_cuotas_general = sum(
                ubicacion['enero_total_cuota_fomento'] + ubicacion['febrero_total_cuota_fomento'] + 
                ubicacion['marzo_total_cuota_fomento'] + ubicacion['abril_total_cuota_fomento'] + 
                ubicacion['mayo_total_cuota_fomento'] + ubicacion['junio_total_cuota_fomento'] + 
                ubicacion['julio_total_cuota_fomento'] + ubicacion['agosto_total_cuota_fomento'] + 
                ubicacion['septiembre_total_cuota_fomento'] + ubicacion['octubre_total_cuota_fomento'] + 
                ubicacion['noviembre_total_cuota_fomento'] + ubicacion['diciembre_total_cuota_fomento']
                for ubicacion in datos_consolidado
            )
            
            # Preparar variables para la plantilla
            variables = {
                'items': items,  # Lista de diccionarios por ubicación
                'i': {
                    'fechainicio': fecha_inicio.strftime('%d/%m/%Y'),
                    'fechafinal': fecha_final.strftime('%d/%m/%Y'),
                    'departamento': departamento.nombre if departamento_id else 'TODOS',
                    'municipio': municipio.nombre if municipio_id else 'TODOS',
                    'No': len(datos_consolidado),
                    
                    # Totales por mes - Kilos
                    'total_kilo_enero': formato_miles(totales_por_mes['enero']['total_kilos']),
                    'total_kilo_febrero': formato_miles(totales_por_mes['febrero']['total_kilos']),
                    'total_kilo_marzo': formato_miles(totales_por_mes['marzo']['total_kilos']),
                    'total_kilo_abril': formato_miles(totales_por_mes['abril']['total_kilos']),
                    'total_kilo_mayo': formato_miles(totales_por_mes['mayo']['total_kilos']),
                    'total_kilo_junio': formato_miles(totales_por_mes['junio']['total_kilos']),
                    'total_kilo_julio': formato_miles(totales_por_mes['julio']['total_kilos']),
                    'total_kilo_agosto': formato_miles(totales_por_mes['agosto']['total_kilos']),
                    'total_kilo_septiembre': formato_miles(totales_por_mes['septiembre']['total_kilos']),
                    'total_kilo_octubre': formato_miles(totales_por_mes['octubre']['total_kilos']),
                    'total_kilo_noviembre': formato_miles(totales_por_mes['noviembre']['total_kilos']),
                    'total_kilo_diciembre': formato_miles(totales_por_mes['diciembre']['total_kilos']),
                    
                    # NUEVO: Totales por mes - Toneladas
                    'total_toneladas_enero': formato_miles(totales_por_mes['enero']['total_toneladas']),
                    'total_toneladas_febrero': formato_miles(totales_por_mes['febrero']['total_toneladas']),
                    'total_toneladas_marzo': formato_miles(totales_por_mes['marzo']['total_toneladas']),
                    'total_toneladas_abril': formato_miles(totales_por_mes['abril']['total_toneladas']),
                    'total_toneladas_mayo': formato_miles(totales_por_mes['mayo']['total_toneladas']),
                    'total_toneladas_junio': formato_miles(totales_por_mes['junio']['total_toneladas']),
                    'total_toneladas_julio': formato_miles(totales_por_mes['julio']['total_toneladas']),
                    'total_toneladas_agosto': formato_miles(totales_por_mes['agosto']['total_toneladas']),
                    'total_toneladas_septiembre': formato_miles(totales_por_mes['septiembre']['total_toneladas']),
                    'total_toneladas_octubre': formato_miles(totales_por_mes['octubre']['total_toneladas']),
                    'total_toneladas_noviembre': formato_miles(totales_por_mes['noviembre']['total_toneladas']),
                    'total_toneladas_diciembre': formato_miles(totales_por_mes['diciembre']['total_toneladas']),
                    
                    # Totales por mes - Cuotas de fomento
                    'vcuota_enero': formato_pesos(totales_por_mes['enero']['total_cuota_fomento']),
                    'vcuota_febrero': formato_pesos(totales_por_mes['febrero']['total_cuota_fomento']),
                    'vcuota_marzo': formato_pesos(totales_por_mes['marzo']['total_cuota_fomento']),
                    'vcuota_abril': formato_pesos(totales_por_mes['abril']['total_cuota_fomento']),
                    'vcuota_mayo': formato_pesos(totales_por_mes['mayo']['total_cuota_fomento']),
                    'vcuota_junio': formato_pesos(totales_por_mes['junio']['total_cuota_fomento']),
                    'vcuota_julio': formato_pesos(totales_por_mes['julio']['total_cuota_fomento']),
                    'vcuota_agosto': formato_pesos(totales_por_mes['agosto']['total_cuota_fomento']),
                    'vcuota_septiembre': formato_pesos(totales_por_mes['septiembre']['total_cuota_fomento']),
                    'vcuota_octubre': formato_pesos(totales_por_mes['octubre']['total_cuota_fomento']),
                    'vcuota_noviembre': formato_pesos(totales_por_mes['noviembre']['total_cuota_fomento']),
                    'vcuota_diciembre': formato_pesos(totales_por_mes['diciembre']['total_cuota_fomento']),
                    
                    # Variables con nombres específicos de la plantilla
                    'totalkilos': formato_miles(total_kilos_general),
                    'valortotalkilos': formato_pesos(total_kilos_general),
                    'totalcuotas': formato_pesos(total_cuotas_general),
                    'valortotalcuotas': formato_pesos(total_cuotas_general),
                    # NUEVO: Total general de toneladas
                    'totaltoneladas': formato_miles(round(total_kilos_general / 1000, 3)),
                    'valortotaltoneladas': formato_miles(round(total_kilos_general / 1000, 3)),
                    
                    # Variables por mes con nombres específicos - NUEVO ORDEN
                    'enetkilo': formato_miles(totales_por_mes['enero']['total_kilos']),
                    'eneton': formato_miles(totales_por_mes['enero']['total_toneladas']),
                    'enetcutoa': formato_pesos(totales_por_mes['enero']['total_cuota_fomento']),
                    'febtkilo': formato_miles(totales_por_mes['febrero']['total_kilos']),
                    'febton': formato_miles(totales_por_mes['febrero']['total_toneladas']),
                    'febtcuota': formato_pesos(totales_por_mes['febrero']['total_cuota_fomento']),
                    'martkilo': formato_miles(totales_por_mes['marzo']['total_kilos']),
                    'marton': formato_miles(totales_por_mes['marzo']['total_toneladas']),
                    'martcuota': formato_pesos(totales_por_mes['marzo']['total_cuota_fomento']),
                    'abrtkilo': formato_miles(totales_por_mes['abril']['total_kilos']),
                    'abrton': formato_miles(totales_por_mes['abril']['total_toneladas']),
                    'abrtcuota': formato_pesos(totales_por_mes['abril']['total_cuota_fomento']),
                    'maytkilo': formato_miles(totales_por_mes['mayo']['total_kilos']),
                    'mayton': formato_miles(totales_por_mes['mayo']['total_toneladas']),
                    'maytcuota': formato_pesos(totales_por_mes['mayo']['total_cuota_fomento']),
                    'juntkilo': formato_miles(totales_por_mes['junio']['total_kilos']),
                    'junton': formato_miles(totales_por_mes['junio']['total_toneladas']),
                    'juntcuota': formato_pesos(totales_por_mes['junio']['total_cuota_fomento']),
                    'jultkilo': formato_miles(totales_por_mes['julio']['total_kilos']),
                    'julton': formato_miles(totales_por_mes['julio']['total_toneladas']),
                    'jultcuota': formato_pesos(totales_por_mes['julio']['total_cuota_fomento']),
                    'agotkilo': formato_miles(totales_por_mes['agosto']['total_kilos']),
                    'agoton': formato_miles(totales_por_mes['agosto']['total_toneladas']),
                    'agotcuota': formato_pesos(totales_por_mes['agosto']['total_cuota_fomento']),
                    'septkilo': formato_miles(totales_por_mes['septiembre']['total_kilos']),
                    'septon': formato_miles(totales_por_mes['septiembre']['total_toneladas']),
                    'septcuota': formato_pesos(totales_por_mes['septiembre']['total_cuota_fomento']),
                    'octtkilo': formato_miles(totales_por_mes['octubre']['total_kilos']),
                    'octton': formato_miles(totales_por_mes['octubre']['total_toneladas']),
                    'octtcuota': formato_pesos(totales_por_mes['octubre']['total_cuota_fomento']),
                    'novtkilo': formato_miles(totales_por_mes['noviembre']['total_kilos']),
                    'novton': formato_miles(totales_por_mes['noviembre']['total_toneladas']),
                    'novtcuota': formato_pesos(totales_por_mes['noviembre']['total_cuota_fomento']),
                    'dictkilo': formato_miles(totales_por_mes['diciembre']['total_kilos']),
                    'dicton': formato_miles(totales_por_mes['diciembre']['total_toneladas']),
                    'dictcuota': formato_pesos(totales_por_mes['diciembre']['total_cuota_fomento'])
                },
                # Variables adicionales
                'fecha_generacion': fecha_actual.strftime('%d/%m/%Y'),
                'total_ubicaciones': len(datos_consolidado),
                'usuario_genera': f"{request.user.primer_nombre} {request.user.primer_apellido}" if hasattr(request.user, 'primer_nombre') else str(request.user)
            }
            
            print(f"📋 [DEBUG] Variables preparadas para la plantilla:")
            print(f"  - Total items: {len(items)}")
            print(f"  - Fecha inicio: {variables['i']['fechainicio']}")
            print(f"  - Fecha final: {variables['i']['fechafinal']}")
            print(f"  - Total ubicaciones: {variables['total_ubicaciones']}")
            
            # Generar el documento Excel usando la vista de Excel
            try:
                print(f"🔄 [DEBUG] Intentando generar documento Excel con plantilla ID {plantilla.id_plantilla_doc}")
                excel_view = ExcelPlantillaView()
                
                # Cargar el workbook y procesar con duplicación de filas
                workbook = openpyxl.load_workbook(plantilla.doc_plantilla)
                print(f"📄 [DEBUG] Workbook cargado exitosamente")
                print(f"📄 [DEBUG] Hojas disponibles: {workbook.sheetnames}")
                
                # Procesar cada hoja
                for sheet_name in workbook.sheetnames:
                    worksheet = workbook[sheet_name]
                    print(f"📄 [DEBUG] Procesando hoja: {sheet_name}")
                    print(f"📄 [DEBUG] Dimensiones de la hoja: {worksheet.max_row} filas x {worksheet.max_column} columnas")
                    
                    # Primero procesar variables generales (sin items)
                    variables_generales = {k: v for k, v in variables.items() if k != 'items'}
                    excel_view = ExcelPlantillaView()
                    excel_view.procesar_hoja_excel(worksheet, variables_generales)
                    
                    # Luego duplicar la fila plantilla para cada item
                    self.duplicar_filas_datos(worksheet, items)
                
                # Guardar el archivo procesado en memoria
                output = BytesIO()
                workbook.save(output)
                output.seek(0)
                
                # Crear un archivo InMemoryUploadedFile
                file_uuid = uuid.uuid4()
                extension = os.path.splitext(plantilla.doc_plantilla.name)[1]
                new_filename = f"{file_uuid}{extension}"
                
                archivo = InMemoryUploadedFile(
                    output,
                    'documento_generado',
                    new_filename,
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    output.getbuffer().nbytes,
                    None
                )
                
                documento_generado = archivo
                
                # Guardar en la base de datos
                data_in = {
                    'id_plantilla_doc': plantilla.id_plantilla_doc,  # Usar el ID en lugar del objeto
                    'id_persona_genera': request.user.persona.id_persona,
                    'variables': variables,
                    'documento_generado': documento_generado,
                    'finalizado': True
                }
                
                from recaudos.serializers.documentos_serializers import DocumentosGeneradosSerializer
                serializer = DocumentosGeneradosSerializer(data=data_in)
                serializer.is_valid(raise_exception=True)
                documento_guardado = serializer.save()
                
                # Obtener URL del documento
                url_documento = Util.obtener_archivos(documento_guardado.documento_generado.name)
                
                if url_documento:
                    return Response({
                        "success": True,
                        "detail": "Documento Excel generado exitosamente.",
                        "data": {
                            "id_documento": documento_guardado.id_documento_generado,
                            "url_documento": url_documento,
                            "fecha_generacion": documento_guardado.fecha_consecutivo,
                            "total_ubicaciones": len(datos_consolidado),
                            "periodo": f"{fecha_inicio.strftime('%d/%m/%Y')} - {fecha_final.strftime('%d/%m/%Y')}"
                        }
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        "success": False,
                        "detail": "No se pudo obtener la URL del documento generado."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except Exception as e:
                print(f"❌ [ERROR] Error generando documento Excel: {str(e)}")
                return Response({
                    "success": False,
                    "detail": f"Error al generar el documento: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print(f"❌ [ERROR] Error general en generación de documento: {str(e)}")
            return Response({
                "success": False,
                "detail": f"Error interno del servidor: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)