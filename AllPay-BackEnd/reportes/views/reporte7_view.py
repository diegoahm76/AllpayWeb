import math
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
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
from django.db.models import Sum, Count, Q, F, DecimalField
from rest_framework.pagination import PageNumberPagination
from decimal import Decimal
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from datetime import timedelta
from django.db import DatabaseError, connection

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


class PrecioNacionalCacaoView(APIView):
    """
    Vista para el Reporte 7: Precio Nacional del Cacao
    
    CAMBIO IMPORTANTE: El precio del cacao ahora se calcula a partir de las cuotas pagadas
    en lugar de las cuotas de fomento, para reflejar el valor real del cacao basado en
    los pagos efectivamente realizados.
    
    Fórmula del precio promedio:
    PRECIO PROMEDIO = TOTAL CUOTAS PAGADAS / 0.03 / TOTAL KILOS
    
    Donde:
    - TOTAL CUOTAS PAGADAS = Suma de pagos directos + liquidaciones
    - 0.03 = Factor de conversión (3% de cuota de fomento)
    - TOTAL KILOS = Kilos totales de cacao comprados
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
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
        filtros = {
            'fecha_compra__date__gte': fecha_inicio,
            'fecha_compra__date__lte': fecha_final
        }

        # Agregar filtros opcionales por ID
        if municipio_id:
            try:
                municipio = Municipio.objects.get(cod_municipio=municipio_id)
                filtros['id_municipio_cacao'] = municipio
            except Municipio.DoesNotExist:
                return Response({
                    "success": False,
                    'detail': 'El municipio especificado no existe.'
                }, status=status.HTTP_404_NOT_FOUND)

        if departamento_id:
            try:
                departamento = Departamento.objects.get(cod_departamento=departamento_id)
                filtros['id_departamento_cacao'] = departamento
            except Departamento.DoesNotExist:
                return Response({
                    "success": False,
                    'detail': 'El departamento especificado no existe.'
                }, status=status.HTTP_404_NOT_FOUND)

        # Obtener facturas con los filtros aplicados
        print(f"🔍 [DEBUG] Iniciando consulta de facturas con filtros: {filtros}")
        facturas = FacturaUnica.objects.filter(**filtros)
        print(f"📊 [DEBUG] Se encontraron {facturas.count()} facturas")

        if not facturas.exists():
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Agrupar por recaudador y calcular totales en paralelo
        print("⚙️ [DEBUG] Iniciando cálculos en paralelo...")
        
        try:
            # Usar ThreadPoolExecutor para ejecutar ambos cálculos en paralelo
            with ThreadPoolExecutor(max_workers=2) as executor:
                # Enviar ambas tareas al pool de hilos
                future_recaudadores = executor.submit(self.calcular_datos_por_recaudador, facturas)
                future_totales = executor.submit(self.calcular_totales_generales_optimizado, facturas)
                
                # Obtener resultados conforme se completan
                print("🔄 [DEBUG] Esperando resultados de cálculos paralelos...")
                datos_recaudadores = future_recaudadores.result()
                totales = future_totales.result()
                
            print("✅ [DEBUG] Cálculos paralelos completados")
            
            # Asegurar que la conexión esté activa antes de continuar
            try:
                connection.ensure_connection()
            except Exception as e:
                print(f"⚠️ [WARNING] Error asegurando conexión: {str(e)}")
                
        except DatabaseError as e:
            print(f"❌ [ERROR] Error de base de datos en cálculos paralelos: {str(e)}")
            return Response({
                "success": False,
                "detail": "Error de base de datos. Verifique la consistencia del esquema de la tabla Pagos."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(f"❌ [ERROR] Error general en cálculos paralelos: {str(e)}")
            return Response({
                "success": False,
                "detail": f"Error interno del servidor: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Verificar que se obtuvieron datos válidos
        if not datos_recaudadores:
            print("⚠️ [WARNING] No se obtuvieron datos de recaudadores, usando fallback")
            # Si no hay datos de recaudadores, calcular solo totales generales
            try:
                # Asegurar que la conexión esté activa antes de calcular totales
                connection.ensure_connection()
                totales = self.calcular_totales_generales_optimizado(facturas)
                return Response({
                    "success": True,
                    "count": 0,
                    "data": {
                        "recaudadores": [],
                        "totales": totales,
                        "warning": "No se pudieron procesar los datos de recaudadores individuales. Se muestran solo los totales generales."
                    }
                }, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"❌ [ERROR] Error calculando totales de fallback: {str(e)}")
                return Response({
                    "success": False,
                    "detail": "No se pudieron procesar los datos del reporte."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Asegurar que la conexión esté activa antes de aplicar paginación
        try:
            connection.ensure_connection()
        except Exception as e:
            print(f"⚠️ [WARNING] Error asegurando conexión antes de paginación: {str(e)}")
            
        # Aplicar paginación a los datos de recaudadores
        print("📄 [DEBUG] Aplicando paginación...")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(datos_recaudadores, request)
        if page is not None:
            serializer = PrecioNacionalCacaoSerializer(page, many=True)
            return paginator.get_paginated_response({
                "success": True,
                "count": len(datos_recaudadores),
                "data": {
                    "recaudadores": serializer.data,
                    "totales": totales
                }
            })
        # Si no hay paginación, devolver todo
        serializer = PrecioNacionalCacaoSerializer(datos_recaudadores, many=True)
        return Response({
            "success": True,
            "count": len(datos_recaudadores),
            "data": {
                "recaudadores": serializer.data,
                "totales": totales
            }
        }, status=status.HTTP_200_OK)

    def procesar_recaudador(self, recaudador_id, facturas):
        """Procesa un solo recaudador y devuelve sus datos calculados"""
        try:
            print(f"🔄 [DEBUG] Procesando recaudador {recaudador_id} en hilo separado")
            
            # Filtrar facturas para este recaudador
            facturas_recaudador = facturas.filter(id_persona_recaudador=recaudador_id)
            print(f"📋 [DEBUG] Recaudador {recaudador_id} tiene {facturas_recaudador.count()} facturas")
            
            # Obtener objeto recaudador
            recaudador = Personas.objects.get(id_persona=recaudador_id)
            
            # Calcular totales por recaudador usando agregaciones optimizadas
            print(f"💰 [DEBUG] Calculando agregaciones para recaudador {recaudador_id}...")
            agregaciones = facturas_recaudador.aggregate(
                total_kilos=Sum('total_kilos'),
                total_valor_bruto=Sum('valor_bruto'),
                total_cuota_fomento=Sum('cuota_fomento')
            )
            
            total_kilos = agregaciones['total_kilos'] or Decimal('0')
            total_valor_bruto = agregaciones['total_valor_bruto'] or Decimal('0')
            total_cuota_fomento = agregaciones['total_cuota_fomento'] or Decimal('0')
            
            # Calcular cuotas pagadas para este recaudador
            print(f"💳 [DEBUG] Calculando cuotas pagadas para recaudador {recaudador_id}...")
            total_cuotas_pagadas = self.calcular_cuotas_pagadas_recaudador(facturas_recaudador)
            
            # Calcular TOTAL PRECIO KILO optimizado con una sola consulta
            print(f"🧮 [DEBUG] Calculando precio kilo para recaudador {recaudador_id}...")
            
            # Optimización: usar una consulta con JOIN para obtener todos los detalles de una vez
            detalles_sum = DetallesFacturaUnica.objects.filter(
                id_factura_unica__in=facturas_recaudador
            ).aggregate(
                total_precio_kilo=Sum(F('valor_kilo') * F('nro_kilos'), output_field=DecimalField())
            )
            
            total_precio_kilo = detalles_sum['total_precio_kilo'] or Decimal('0')
            
            # Aplicar la nueva fórmula del precio promedio basada en cuotas pagadas
            # PRECIO PROMEDIO = TOTAL CUOTAS PAGADAS / 0.03 / TOTAL KILOS
            # 
            # LÓGICA DE FALLBACK: Si no hay cuotas pagadas registradas, el sistema
            # automáticamente usa las cuotas de fomento como valor de respaldo
            precio_promedio = Decimal('0')
            if total_kilos > 0 and total_cuotas_pagadas > 0:
                precio_promedio = total_cuotas_pagadas / Decimal('0.03') / total_kilos
                print(f"📈 [DEBUG] Precio promedio calculado con cuotas pagadas: {precio_promedio}")
            else:
                print(f"⚠️ [WARNING] No se pudo calcular precio promedio - kilos: {total_kilos}, cuotas pagadas: {total_cuotas_pagadas}")
                if total_cuotas_pagadas == 0:
                    print(f"🔄 [INFO] Usando lógica de fallback: precio promedio = cuota fomento / 0.03 / kilos")
                    precio_promedio = total_cuota_fomento / Decimal('0.03') / total_kilos if total_kilos > 0 else Decimal('0')
                    print(f"📈 [DEBUG] Precio promedio calculado con fallback: {precio_promedio}")
            
            # Calcular intereses
            print(f"🏦 [DEBUG] Calculando intereses para recaudador {recaudador_id}...")
            total_intereses = self.calcular_intereses_recaudador(facturas_recaudador)
            
            # Obtener información del recaudador
            nombre_recaudador = self.obtener_nombre_recaudador(recaudador)
            tipo_recaudador = self.obtener_tipo_recaudador(recaudador)
            
            resultado = {
                'nit_cc_recaudador': recaudador.numero_documento,
                'nombre_recaudador': nombre_recaudador,
                'tipo_recaudador': tipo_recaudador,
                'total_kilos': int(total_kilos),
                'precio_promedio': int(round(precio_promedio)),
                'total_valor_cuota_fomento': int(total_cuota_fomento),
                'total_valor_cuotas_pagadas': int(total_cuotas_pagadas),
                'total_valor_intereses': int(round(total_intereses))
            }
            
            print(f"✅ [DEBUG] Recaudador {recaudador_id} procesado exitosamente")
            return resultado
            
        except Exception as e:
            print(f"❌ [ERROR] Error procesando recaudador {recaudador_id}: {str(e)}")
            return None

    def calcular_datos_por_recaudador(self, facturas):
        """Calcula los datos agrupados por recaudador usando ThreadPoolExecutor"""
        print("🔄 [DEBUG] Iniciando calcular_datos_por_recaudador con concurrencia...")
        
        # Obtener lista de recaudadores únicos
        print("👥 [DEBUG] Obteniendo lista de recaudadores únicos...")
        recaudadores = list(facturas.values_list('id_persona_recaudador', flat=True).distinct())
        print(f"👤 [DEBUG] Se encontraron {len(recaudadores)} recaudadores únicos")
        
        # Lista thread-safe para almacenar resultados
        datos_recaudadores = []
        
        # Usar ThreadPoolExecutor para procesar recaudadores en paralelo
        print("🚀 [DEBUG] Iniciando procesamiento concurrente con ThreadPoolExecutor...")
        
        try:
            with ThreadPoolExecutor(max_workers=10) as executor:
                # Enviar todas las tareas al pool de hilos
                future_to_recaudador = {
                    executor.submit(self.procesar_recaudador, recaudador_id, facturas): recaudador_id 
                    for recaudador_id in recaudadores
                }
                
                # Recopilar resultados conforme se completan
                completed_count = 0
                for future in as_completed(future_to_recaudador):
                    recaudador_id = future_to_recaudador[future]
                    completed_count += 1
                    
                    try:
                        resultado = future.result()
                        if resultado is not None:
                            datos_recaudadores.append(resultado)
                            print(f"✅ [DEBUG] Completado {completed_count}/{len(recaudadores)} recaudadores")
                        else:
                            print(f"⚠️ [WARNING] Recaudador {recaudador_id} devolvió resultado nulo")
                            
                    except Exception as e:
                        print(f"❌ [ERROR] Error obteniendo resultado para recaudador {recaudador_id}: {str(e)}")
            
            print(f"🎉 [DEBUG] Procesamiento concurrente completado. {len(datos_recaudadores)} recaudadores procesados exitosamente")
            print("✅ [DEBUG] calcular_datos_por_recaudador completado")
            
            return datos_recaudadores
        except Exception as e:
            print(f"❌ [ERROR] Error en procesamiento concurrente: {str(e)}")
            # En caso de error, devolver lista vacía para que se use el fallback
            return []
    
    def calcular_intereses_recaudador(self, facturas_recaudador):
        """Calcula los intereses totales para un recaudador usando la configuración correcta"""
        total_intereses = Decimal('0')
        fecha_actual = timezone.now().date()
        
        # Obtener la configuración de días de pago
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        if not dias_pago:
            return total_intereses
        
        # Obtener tasa de interés
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        if not porcentaje_cobro:
            return total_intereses
        
        tasa_interes = porcentaje_cobro.valor
        
        for factura in facturas_recaudador:
            # Calcular fecha límite de pago (mes siguiente + días de pago configurados)
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej. 31 de febrero), usar el último día válido
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            
            # Calcular intereses si hay mora
            if dias_mora > 0:
                intereses_factura = (factura.cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal('365')
                total_intereses += intereses_factura
        
        return round(total_intereses, 2)
    
    def calcular_cuotas_pagadas_recaudador(self, facturas_recaudador):
        """
        Calcula el total de cuotas pagadas para un recaudador basado en los pagos realizados
        
        Este método es fundamental para el nuevo cálculo del precio del cacao, ya que
        ahora el precio se basa en las cuotas efectivamente pagadas en lugar de las
        cuotas de fomento generadas.
        
        ESTRUCTURA DE LAS TABLAS:
        - FacturaUnica: Contiene las facturas con cuotas de fomento
        - LiquidacionesFacturaUnica: Relacionada con FacturaUnica a través de id_liq_factura_unica
        - Pagos: Relacionado con LiquidacionesFacturaUnica a través de id_liquidacion_pago
        
        La lógica incluye:
        1. Pagos registrados en la tabla Pagos (a través de LiquidacionesFacturaUnica)
        2. Liquidaciones registradas en LiquidacionesFacturaUnica
        
        Retorna la suma total de ambos tipos de pagos para calcular el precio real.
        """
        try:
            print(f"💳 [DEBUG] Calculando cuotas pagadas para {facturas_recaudador.count()} facturas del recaudador")
            
            # Obtener IDs de las facturas del recaudador
            factura_ids = list(facturas_recaudador.values_list('id_factura_unica', flat=True))
            
            if not factura_ids:
                print(f"⚠️ [WARNING] No hay facturas para calcular cuotas pagadas")
                return Decimal('0')
            
            print(f"🔍 [DEBUG] IDs de facturas a buscar: {factura_ids[:5]}...")  # Mostrar solo los primeros 5
            
            # Buscar pagos relacionados con estas facturas
            # La relación es: FacturaUnica -> LiquidacionesFacturaUnica -> Pagos
            total_pagos_directos = Decimal('0')
            
            # Buscar en liquidaciones de factura única (relación directa)
            liquidaciones = LiquidacionesFacturaUnica.objects.filter(
                id_liq_factura_unica__in=facturas_recaudador.values_list('id_liq_factura_unica', flat=True)
            ).exclude(id_liq_factura_unica__isnull=True)
            
            print(f"💳 [DEBUG] Encontradas {liquidaciones.count()} liquidaciones para las facturas")
            if liquidaciones.exists():
                print(f"💳 [DEBUG] Ejemplos de liquidaciones:")
                for liquidacion in liquidaciones[:3]:  # Mostrar solo los primeros 3
                    print(f"  - Liquidación {liquidacion.id_liq_factura_unica}, Valor: {liquidacion.valor_pagar}, Fecha: {liquidacion.fecha_liquidacion}")
                
                # Sumar valores de liquidaciones
                total_liquidaciones = liquidaciones.aggregate(
                    total_liquidado=Sum('valor_pagar')
                )['total_liquidado'] or Decimal('0')
                
                # Buscar pagos relacionados con estas liquidaciones
                liquidacion_ids = list(liquidaciones.values_list('id_liq_factura_unica', flat=True))
                try:
                    # Usar .only() para evitar acceder a campos que no existen en la BD
                    pagos = Pagos.objects.filter(
                        id_liquidacion_pago__in=liquidacion_ids
                    ).only('id_pago', 'valor_pagado', 'fecha_pago', 'id_liquidacion_pago')
                except Exception as e:
                    print(f"⚠️ [WARNING] Error consultando pagos, usando solo liquidaciones: {str(e)}")
                    # Si hay error con Pagos, usar solo liquidaciones
                    pagos = Pagos.objects.none()
                
                print(f"💰 [DEBUG] Encontrados {pagos.count()} pagos relacionados con las liquidaciones")
                if pagos.exists():
                    print(f"💰 [DEBUG] Ejemplos de pagos:")
                    for pago in pagos[:3]:  # Mostrar solo los primeros 3
                        print(f"  - Pago {pago.id_pago}, Valor: {pago.valor_pagado}, Fecha: {pago.fecha_pago}")
                
                total_pagos_directos = pagos.aggregate(
                    total_pagado=Sum('valor_pagado')
                )['total_pagado'] or Decimal('0')
                
                print(f"💰 [DEBUG] Total pagos directos: {total_pagos_directos}")
                print(f"💳 [DEBUG] Total liquidaciones: {total_liquidaciones}")
                
                # Calcular total de cuotas pagadas
                total_cuotas_pagadas = total_pagos_directos + total_liquidaciones
                print(f"🎯 [DEBUG] Total cuotas pagadas: {total_cuotas_pagadas}")
                
                # Si no hay pagos registrados, usar las cuotas de fomento como fallback
                if total_cuotas_pagadas == 0:
                    print(f"⚠️ [WARNING] No se encontraron pagos registrados, usando cuotas de fomento como fallback")
                    total_cuotas_fomento = facturas_recaudador.aggregate(
                        total_cuota_fomento=Sum('cuota_fomento')
                    )['total_cuota_fomento'] or Decimal('0')
                    
                    print(f"🔄 [DEBUG] Usando cuotas de fomento como fallback: {total_cuotas_fomento}")
                    return total_cuotas_fomento
                
                return total_cuotas_pagadas
            else:
                print(f"⚠️ [WARNING] No se encontraron liquidaciones para las facturas")
                # Si no hay liquidaciones, usar las cuotas de fomento como fallback
                total_cuotas_fomento = facturas_recaudador.aggregate(
                    total_cuota_fomento=Sum('cuota_fomento')
                )['total_cuota_fomento'] or Decimal('0')
                
                print(f"🔄 [DEBUG] Usando cuotas de fomento como fallback (sin liquidaciones): {total_cuotas_fomento}")
                return total_cuotas_fomento
            
        except Exception as e:
            print(f"❌ [ERROR] Error calculando cuotas pagadas: {str(e)}")
            # En caso de error, usar las cuotas de fomento como fallback
            try:
                total_cuotas_fomento = facturas_recaudador.aggregate(
                    total_cuota_fomento=Sum('cuota_fomento')
                )['total_cuota_fomento'] or Decimal('0')
                print(f"🔄 [DEBUG] Fallback a cuotas de fomento por error: {total_cuotas_fomento}")
                return total_cuotas_fomento
            except:
                return Decimal('0')
    
    def calcular_cuotas_pagadas_totales(self, facturas):
        """
        Calcula el total de cuotas pagadas para todas las facturas en un rango de fechas.
        
        ESTRUCTURA DE LAS TABLAS:
        - FacturaUnica: Contiene las facturas con cuotas de fomento
        - LiquidacionesFacturaUnica: Relacionada con FacturaUnica a través de id_liq_factura_unica
        - Pagos: Relacionado con LiquidacionesFacturaUnica a través de id_liquidacion_pago
        
        La lógica incluye:
        1. Pagos registrados en la tabla Pagos (a través de LiquidacionesFacturaUnica)
        2. Liquidaciones registradas en LiquidacionesFacturaUnica
        
        Retorna la suma total de ambos tipos de pagos para calcular el precio real.
        """
        try:
            print("💳 [DEBUG] Calculando total de cuotas pagadas para todas las facturas...")
            
            # Obtener IDs de todas las facturas en el rango
            factura_ids = list(facturas.values_list('id_factura_unica', flat=True))
            
            if not factura_ids:
                print(f"⚠️ [WARNING] No hay facturas para calcular cuotas pagadas totales.")
                return Decimal('0')
            
            print(f"🔍 [DEBUG] Total de IDs de facturas a buscar: {len(factura_ids)}")
            print(f"🔍 [DEBUG] Ejemplos de IDs: {factura_ids[:5]}...")
            
            # Buscar pagos relacionados con estas facturas
            # La relación es: FacturaUnica -> LiquidacionesFacturaUnica -> Pagos
            total_pagos_directos = Decimal('0')
            
            # Buscar en liquidaciones de factura única (relación directa)
            liquidaciones = LiquidacionesFacturaUnica.objects.filter(
                id_liq_factura_unica__in=facturas.values_list('id_liq_factura_unica', flat=True)
            ).exclude(id_liq_factura_unica__isnull=True)
            
            print(f"💳 [DEBUG] Encontradas {liquidaciones.count()} liquidaciones para todas las facturas")
            if liquidaciones.exists():
                print(f"💳 [DEBUG] Ejemplos de liquidaciones totales:")
                for liquidacion in liquidaciones[:3]:  # Mostrar solo los primeros 3
                    print(f"  - Liquidación {liquidacion.id_liq_factura_unica}, Valor: {liquidacion.valor_pagar}, Fecha: {liquidacion.fecha_liquidacion}")
                
                # Sumar valores de liquidaciones
                total_liquidaciones = liquidaciones.aggregate(
                    total_liquidado=Sum('valor_pagar')
                )['total_liquidado'] or Decimal('0')
                
                # Buscar pagos relacionados con estas liquidaciones
                liquidacion_ids = list(liquidaciones.values_list('id_liq_factura_unica', flat=True))
                try:
                    # Usar .only() para evitar acceder a campos que no existen en la BD
                    pagos = Pagos.objects.filter(
                        id_liquidacion_pago__in=liquidacion_ids
                    ).only('id_pago', 'valor_pagado', 'fecha_pago', 'id_liquidacion_pago')
                except Exception as e:
                    print(f"⚠️ [WARNING] Error consultando pagos totales, usando solo liquidaciones: {str(e)}")
                    # Si hay error con Pagos, usar solo liquidaciones
                    pagos = Pagos.objects.none()
                
                print(f"💰 [DEBUG] Encontrados {pagos.count()} pagos relacionados con las liquidaciones totales")
                if pagos.exists():
                    print(f"💰 [DEBUG] Ejemplos de pagos totales:")
                    for pago in pagos[:3]:  # Mostrar solo los primeros 3
                        print(f"  - Pago {pago.id_pago}, Valor: {pago.valor_pagado}, Fecha: {pago.fecha_pago}")
                
                total_pagos_directos = pagos.aggregate(
                    total_pagado=Sum('valor_pagado')
                )['total_pagado'] or Decimal('0')
                
                print(f"💰 [DEBUG] Total pagos directos: {total_pagos_directos}")
                print(f"💳 [DEBUG] Total liquidaciones: {total_liquidaciones}")
                
                # Calcular total de cuotas pagadas
                total_cuotas_pagadas = total_pagos_directos + total_liquidaciones
                print(f"🎯 [DEBUG] Total cuotas pagadas: {total_cuotas_pagadas}")
                
                # Si no hay pagos registrados, usar las cuotas de fomento como fallback
                if total_cuotas_pagadas == 0:
                    print(f"⚠️ [WARNING] No se encontraron pagos registrados totales, usando cuotas de fomento como fallback")
                    total_cuotas_fomento = facturas.aggregate(
                        total_cuota_fomento=Sum('cuota_fomento')
                    )['total_cuota_fomento'] or Decimal('0')
                    
                    print(f"🔄 [DEBUG] Usando cuotas de fomento totales como fallback: {total_cuotas_fomento}")
                    return total_cuotas_fomento
                
                return total_cuotas_pagadas
            else:
                print(f"⚠️ [WARNING] No se encontraron liquidaciones para las facturas totales")
                # Si no hay liquidaciones, usar las cuotas de fomento como fallback
                total_cuotas_fomento = facturas.aggregate(
                    total_cuota_fomento=Sum('cuota_fomento')
                )['total_cuota_fomento'] or Decimal('0')
                
                print(f"🔄 [DEBUG] Usando cuotas de fomento totales como fallback (sin liquidaciones): {total_cuotas_fomento}")
                return total_cuotas_fomento
            
        except Exception as e:
            print(f"❌ [ERROR] Error calculando cuotas pagadas totales: {str(e)}")
            # En caso de error, usar las cuotas de fomento como fallback
            try:
                total_cuotas_fomento = facturas.aggregate(
                    total_cuota_fomento=Sum('cuota_fomento')
                )['total_cuota_fomento'] or Decimal('0')
                print(f"🔄 [DEBUG] Fallback a cuotas de fomento totales por error: {total_cuotas_fomento}")
                return total_cuotas_fomento
            except:
                return Decimal('0')
    
    def obtener_nombre_recaudador(self, recaudador):
        """Obtiene el nombre completo del recaudador"""
        if recaudador.tipo_persona == 'N':
            nombre_completo = " ".join(filter(None, [
                recaudador.primer_nombre,
                recaudador.segundo_nombre,
                recaudador.primer_apellido,
                recaudador.segundo_apellido
            ]))
            return nombre_completo.strip()
        else:
            return recaudador.razon_social or recaudador.nombre_comercial or ""
    
    def obtener_tipo_recaudador(self, recaudador):
        """Obtiene el tipo de recaudador formateado correctamente"""
        if recaudador.cod_tipo_comprador:
            # Mapeo de códigos a nombres
            tipos = {
                'P': 'PROCESADOR',
                'C': 'COMERCIANTE', 
                'E': 'EXPORTADOR'
            }
            
            # Si el código contiene múltiples tipos separados por "|"
            if '|' in recaudador.cod_tipo_comprador:
                codigos = recaudador.cod_tipo_comprador.split('|')
                nombres_tipos = []
                for codigo in codigos:
                    codigo_limpio = codigo.strip()
                    if codigo_limpio in tipos:
                        nombres_tipos.append(tipos[codigo_limpio])
                    else:
                        nombres_tipos.append(codigo_limpio)
                return ' Y '.join(nombres_tipos)
            else:
                # Un solo tipo
                return tipos.get(recaudador.cod_tipo_comprador, recaudador.cod_tipo_comprador)
        return 'NO ESPECIFICADO'
    
    def calcular_totales_generales_optimizado(self, facturas):
        """Calcula los totales generales del reporte optimizado para ejecución en paralelo"""
        print("📊 [DEBUG] Iniciando cálculo de totales generales optimizado en hilo separado...")
        
        # Calcular agregaciones directamente desde las facturas (más eficiente)
        print("🔢 [DEBUG] Calculando agregaciones totales desde facturas...")
        agregaciones_facturas = facturas.aggregate(
            total_kilos=Sum('total_kilos'),
            total_cuota_fomento=Sum('cuota_fomento'),
            total_valor_bruto=Sum('valor_bruto')
        )
        
        total_kilos = agregaciones_facturas['total_kilos'] or Decimal('0')
        total_cuota_fomento = agregaciones_facturas['total_cuota_fomento'] or Decimal('0')
        
        # Calcular total de cuotas pagadas para todas las facturas
        print("💳 [DEBUG] Calculando total de cuotas pagadas para todas las facturas...")
        total_cuotas_pagadas = self.calcular_cuotas_pagadas_totales(facturas)
        
        # Calcular el precio promedio total usando la nueva fórmula basada en cuotas pagadas
        print("🧮 [DEBUG] Calculando precio promedio total con fórmula basada en cuotas pagadas...")
        print(f"📋 [DEBUG] Total kilos: {total_kilos}")
        print(f"🎯 [DEBUG] Total cuota fomento: {total_cuota_fomento}")
        print(f"💳 [DEBUG] Total cuotas pagadas: {total_cuotas_pagadas}")
        
        # Aplicar nueva fórmula del precio promedio basada en cuotas pagadas
        # PRECIO PROMEDIO = TOTAL CUOTAS PAGADAS / 0.03 / TOTAL KILOS
        # 
        # LÓGICA DE FALLBACK: Si no hay cuotas pagadas registradas, el sistema
        # automáticamente usa las cuotas de fomento como valor de respaldo
        precio_promedio_total = Decimal('0')
        if total_kilos > 0 and total_cuotas_pagadas > 0:
            precio_promedio_total = total_cuotas_pagadas / Decimal('0.03') / total_kilos
            print(f"📈 [DEBUG] Precio promedio total calculado con cuotas pagadas: {precio_promedio_total}")
        else:
            print(f"⚠️ [WARNING] No se pudo calcular precio promedio total - kilos: {total_kilos}, cuotas pagadas: {total_cuotas_pagadas}")
            if total_cuotas_pagadas == 0:
                print(f"🔄 [INFO] Usando lógica de fallback para totales: precio promedio = cuota fomento / 0.03 / kilos")
                precio_promedio_total = total_cuota_fomento / Decimal('0.03') / total_kilos if total_kilos > 0 else Decimal('0')
                print(f"📈 [DEBUG] Precio promedio total calculado con fallback: {precio_promedio_total}")
        
        # Formatear valores como enteros
        def formatear_valor(valor):
            return int(round(valor))
        
        resultado = {
            'total_kilos': formatear_valor(total_kilos),
            'total_valor_cuota_fomento': formatear_valor(total_cuota_fomento),
            'total_valor_cuotas_pagadas': formatear_valor(total_cuotas_pagadas),
            'precio_promedio_total': formatear_valor(precio_promedio_total)
        }
        
        print("✅ [DEBUG] Totales generales optimizados completados")
        return resultado

    def calcular_totales_generales(self, datos_recaudadores, facturas):
        """Calcula los totales generales del reporte (función legacy - mantenida por compatibilidad)"""
        print("📊 [DEBUG] Iniciando cálculo de totales generales...")
        
        print("🔢 [DEBUG] Sumando totales de recaudadores...")
        total_kilos = sum(Decimal(str(r['total_kilos'])) for r in datos_recaudadores)
        total_cuota_fomento = sum(Decimal(str(r['total_valor_cuota_fomento'])) for r in datos_recaudadores)
        total_intereses = sum(Decimal(str(r['total_valor_intereses'])) for r in datos_recaudadores)
        
        # Calcular el precio promedio total usando la fórmula exacta
        print("🧮 [DEBUG] Calculando precio promedio total con todas las facturas...")
        print(f"📋 [DEBUG] Total de facturas a procesar: {facturas.count()}")
        
        total_precio_kilo = Decimal('0')
        for i, factura in enumerate(facturas):
            if i % 100 == 0:  # Print cada 100 facturas
                print(f"  📄 [DEBUG] Procesando factura {i+1}/{facturas.count()} para totales")
            detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura)
            for detalle in detalles:
                total_precio_kilo += detalle.valor_kilo * detalle.nro_kilos
        
        print(f"💰 [DEBUG] Total precio kilo calculado: {total_precio_kilo}")
        print(f"🎯 [DEBUG] Total cuota fomento: {total_cuota_fomento}")
        
        precio_promedio_total = Decimal('0')
        if total_cuota_fomento > 0:
            precio_promedio_total = total_precio_kilo / Decimal('0.03') / total_cuota_fomento
            print(f"📈 [DEBUG] Precio promedio total calculado: {precio_promedio_total}")
        
        # Formatear valores: enteros si no hay decimales significativos, decimal si los hay
        def formatear_valor(valor):
            # Redondear a entero para todos los totales
            return int(round(valor))
        
        print("✅ [DEBUG] Totales generales completados")
        return {
            'total_kilos': formatear_valor(total_kilos),
            'total_valor_cuota_fomento': formatear_valor(total_cuota_fomento),
            'precio_promedio_total': formatear_valor(precio_promedio_total)
        }

class GenerarDocumentoPrecioNacionalCacaoView(APIView):
    """
    Vista para generar el documento PDF del Reporte 7: Precio Nacional del Cacao
    
    CAMBIO IMPORTANTE: El documento ahora incluye tanto las cuotas de fomento como las cuotas pagadas,
    y el precio promedio se calcula basado en las cuotas efectivamente pagadas para reflejar
    el valor real del cacao en el mercado.
    
    Variables disponibles en la plantilla:
    - tcuotaspagadas: Cuotas pagadas por recaudador
    - totalcuotaspagadas: Total de cuotas pagadas en el período
    - ppromedio: Precio promedio calculado con cuotas pagadas
    - tpromedio: Precio promedio total del período
    
    LÓGICA DE FALLBACK: Si no se encuentran pagos registrados, se usan las cuotas de fomento
    como valor de respaldo para asegurar que el documento siempre se pueda generar con
    un precio promedio válido.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Generar documento PDF del reporte de precio nacional del cacao"""
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
            filtros = {
                'fecha_compra__date__gte': fecha_inicio,
                'fecha_compra__date__lte': fecha_final
            }
            
            # Agregar filtros opcionales por ID
            if municipio_id:
                try:
                    municipio = Municipio.objects.get(cod_municipio=municipio_id)
                    filtros['id_municipio_cacao'] = municipio
                except Municipio.DoesNotExist:
                    return Response({
                        "success": False,
                        'detail': 'El municipio especificado no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if departamento_id:
                try:
                    departamento = Departamento.objects.get(cod_departamento=departamento_id)
                    filtros['id_departamento_cacao'] = departamento
                except Departamento.DoesNotExist:
                    return Response({
                        "success": False,
                        'detail': 'El departamento especificado no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Obtener facturas con los filtros aplicados
            print(f"🔍 [DEBUG] Iniciando consulta de facturas con filtros: {filtros}")
            facturas = FacturaUnica.objects.filter(**filtros)
            print(f"📊 [DEBUG] Se encontraron {facturas.count()} facturas")
            
            if not facturas.exists():
                return Response({
                    "success": False,
                    'detail': 'No se encontraron facturas para los parámetros dados.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Obtener los datos del reporte reutilizando la lógica existente
            precio_nacional_view = PrecioNacionalCacaoView()
            datos_recaudadores = precio_nacional_view.calcular_datos_por_recaudador(facturas)
            totales = precio_nacional_view.calcular_totales_generales_optimizado(facturas)
            
            # Calcular total de intereses sumando los intereses de todos los recaudadores
            total_intereses = sum(recaudador['total_valor_intereses'] for recaudador in datos_recaudadores)
            
            # Verificar que existe la plantilla "REPORTE 7"
            plantilla = PlantillasDoc.objects.filter(nombre="Precio Nacional Del Cacao").first()
            if not plantilla:
                return Response({
                    "success": False,
                    "detail": "No se encontró la plantilla 'REPORTE 7'."
                }, status=status.HTTP_404_NOT_FOUND)
            
            print(f"📄 [DEBUG] Plantilla encontrada - ID: {plantilla.id_plantilla_doc}, Nombre: {plantilla.nombre}")
            
            # Definir funciones de formato antes de usarlas
            def formato_miles(valor):
                return f"{valor:,.0f}".replace(",", ".")
            def formato_pesos(valor):
                return f"$ {valor:,.0f}".replace(",", ".")

            # Preparar los datos para la plantilla
            # Formatear los valores de cada recaudador en el listado (items)
            items = []
            for recaudador in datos_recaudadores:
                items.append({
                    'ndocumento': recaudador['nit_cc_recaudador'],
                    'nombrerecaudador': recaudador['nombre_recaudador'],
                    'tiporecaudador': recaudador['tipo_recaudador'],
                    'tkilos': formato_miles(recaudador['total_kilos']),
                    'ppromedio': formato_pesos(recaudador['precio_promedio']),
                    'tcuota': formato_pesos(recaudador['total_valor_cuota_fomento']),
                    'tcuotaspagadas': formato_pesos(recaudador['total_valor_cuotas_pagadas']),
                    'tinteres': formato_pesos(recaudador['total_valor_intereses'])
                })
            
            # Definir fecha_actual antes de usarla
            fecha_actual = timezone.now()
            # Formatear totales con separación de miles y símbolo de $ para el documento
            
            variables = {
                'items': items,
                # Variables principales con prefijo 'i.' como espera la plantilla
                'i': {
                    'fechainicio': fecha_inicio.strftime('%d/%m/%Y'),
                    'fechafinal': fecha_final.strftime('%d/%m/%Y'),
                    'dpto': departamento.nombre if departamento_id else 'TODOS',
                    'municipio': municipio.nombre if municipio_id else 'TODOS',
                    'totalkilos': formato_miles(totales['total_kilos']),
                    'tpromedio': formato_pesos(totales['precio_promedio_total']),
                    'totalcuotas': formato_pesos(totales['total_valor_cuota_fomento']),
                    'totalcuotaspagadas': formato_pesos(totales['total_valor_cuotas_pagadas']),
                    'totalinteres': formato_pesos(total_intereses)
                },
                # Variables adicionales que pueden ser útiles
                'fecha_generacion': fecha_actual.strftime('%d/%m/%Y'),
                'total_recaudadores': len(datos_recaudadores),
                'usuario_genera': f"{request.user.primer_nombre} {request.user.primer_apellido}" if hasattr(request.user, 'primer_nombre') else str(request.user)
            }
            
            print(f"📋 [DEBUG] Variables preparadas para la plantilla:")
            print(f"  - Total items: {len(items)}")
            print(f"  - Fecha inicio: {variables['i']['fechainicio']}")
            print(f"  - Fecha final: {variables['i']['fechafinal']}")
            print(f"  - Total recaudadores: {variables['total_recaudadores']}")
            
            # Generar el documento PDF

            # Generar el documento PDF Sincrono
            try:
                print(f"🔄 [DEBUG] Intentando generar documento con plantilla ID {plantilla.id_plantilla_doc}")
                id_documento_generado = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
                print(f"📄 [DEBUG] Resultado de obtener_url_documento: {id_documento_generado}")
                
                if id_documento_generado and id_documento_generado != "No se generó el documento":
                    # Obtener el documento generado
                    documento = DocumentosGenerados.objects.filter(id_documento_generado=id_documento_generado).first()
                    if documento:
                        # Obtener URL del documento
                        url_documento = Util.obtener_archivos(documento.documento_generado.name)
                        if url_documento:
                            return Response({
                                "success": True,
                                "detail": "Documento generado exitosamente.",
                                "data": {
                                    "id_documento": id_documento_generado,
                                    "url_documento": url_documento,
                                    "fecha_generacion": documento.fecha_consecutivo,
                                    "total_recaudadores": len(datos_recaudadores),
                                    "periodo": f"{fecha_inicio.strftime('%d/%m/%Y')} - {fecha_final.strftime('%d/%m/%Y')}"
                                }
                            }, status=status.HTTP_201_CREATED)
                        else:
                            return Response({
                                "success": False,
                                "detail": "No se pudo obtener la URL del documento generado."
                            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    else:
                        return Response({
                            "success": False,
                            "detail": "No se encontró el documento generado en la base de datos."
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                else:
                    return Response({
                        "success": False,
                        "detail": "No se pudo generar el documento PDF."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except Exception as e:
                print(f"❌ [ERROR] Error generando documento PDF: {str(e)}")
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