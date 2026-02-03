from datetime import datetime
from dateutil.relativedelta import relativedelta
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from recaudos.models.recaudos_models import FacturaUnica
from django.db.models import Sum, Prefetch
from reportes.serializers.reportes_serializers import TableroComprasSerializer, TableroComprasDetalladoSerializer
from reportes.utils import CustomPagination
from recaudos.choices.cod_estado_factura_choices import cod_estado_factura_CHOICES
from recaudos.models.recaudos_models import DetallesFacturaUnica
from seguridad.models.transversal_models import Departamento, Municipio
import time 

class TableroControlComprasCacaoTabla(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TableroComprasSerializer
    serializer_detallado_class = TableroComprasDetalladoSerializer
    pagination_class = CustomPagination

    def _serializar_facturas_con_detalles(self, facturas, usar_detallado=False):
        """
        Serializa las facturas con información detallada
        """
        if usar_detallado:
            return TableroComprasDetalladoSerializer(facturas, many=True, context={'request': self.request}).data
        else:
            return TableroComprasSerializer(facturas, many=True, context={'request': self.request}).data

    def get(self, request, *args, **kwargs):
        self.request = request  # Guardamos el request para el contexto
        start_time = time.time()
        print(f"🚀 [TABLERO] Iniciando consulta - {datetime.now()}")
        
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        estado = request.query_params.get('estado', None)
        id_departamento = request.query_params.get('id_departamento', None)
        id_municipio = request.query_params.get('id_municipio', None)
        id_recaudador = request.query_params.get('id_recaudador', None)
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']
        con_detalles = request.query_params.get('con_detalles', 'false').lower() in ['true', '1', 'si', 'yes']
        
        print(f"📋 [TABLERO] Parámetros: fecha_inicio={fecha_inicio_str}, fecha_fin={fecha_fin_str}, sin_paginacion={sin_paginacion}, con_detalles={con_detalles}")

        if not fecha_inicio_str or not fecha_fin_str:
            return Response({"success": False, "detail": "Las fechas de inicio y fin son requeridas."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d')
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d')
            print(f"📅 [TABLERO] Fechas parseadas: {fecha_inicio} a {fecha_fin}")
        except (ValueError, TypeError):
            return Response({"success": False, "detail": "El formato de fecha es inválido. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio > fecha_fin:
            return Response({"success": False, "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."}, status=status.HTTP_400_BAD_REQUEST)

        # Optimización máxima: consulta única con todos los filtros aplicados
        query_start = time.time()
        facturas_query = FacturaUnica.objects.filter(
            fecha_compra__date__gte=fecha_inicio,
            fecha_compra__date__lte=fecha_fin
        )
        print(f"🔍 [TABLERO] Query base creada en {time.time() - query_start:.3f}s")
        
        # Aplicar filtros adicionales si existen
        if estado:
            facturas_query = facturas_query.filter(estado_factura=estado)
        if id_departamento:
            try:
                id_departamento = int(id_departamento)
                facturas_query = facturas_query.filter(id_departamento_cacao=id_departamento)
            except (ValueError, TypeError):
                return Response({"success": False, "detail": "El formato del ID de departamento es inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if id_municipio:
            try:
                id_municipio = int(id_municipio)
                facturas_query = facturas_query.filter(id_municipio_cacao=id_municipio)
            except (ValueError, TypeError):
                return Response({"success": False, "detail": "El formato del ID de municipio es inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if id_recaudador:
            try:
                id_recaudador = int(id_recaudador)
                facturas_query = facturas_query.filter(id_persona_recaudador=id_recaudador)
            except (ValueError, TypeError):
                return Response({"success": False, "detail": "El formato del ID de recaudador es inválido."}, status=status.HTTP_400_BAD_REQUEST)

        # Optimización máxima: select_related + only + prefetch_related
        query_optimize_start = time.time()
        
        # Campos base para ambos serializers
        base_fields = [
            'id_factura_unica', 'fecha_compra', 'fecha_creacion', 'nro_factura_unica', 'nro_documento_soporte',
            'total_kilos', 'valor_bruto', 'cuota_fomento', 'valor_neto', 'estado_factura',
            'nombre_vereda', 'nombre_finca', 'doc_soporte'
        ]
        
        # Campos adicionales para el serializer detallado
        detailed_fields = [
            'id_persona_proveedor__tipo_documento__nombre',
            'id_persona_proveedor__numero_documento',
            'id_persona_proveedor__tipo_persona',
            'id_persona_proveedor__primer_nombre',
            'id_persona_proveedor__segundo_nombre',
            'id_persona_proveedor__primer_apellido',
            'id_persona_proveedor__segundo_apellido',
            'id_persona_proveedor__razon_social',
            'id_persona_proveedor__nombre_comercial',
            'id_persona_proveedor__telefono_celular',
            'id_persona_proveedor__telefono_empresa',
            'id_persona_proveedor__email',
            'id_persona_proveedor__email_empresarial',
            'id_persona_proveedor__direccion_residencia',
            'id_persona_proveedor__direccion_laboral',
            'id_persona_proveedor__direccion_notificaciones',
            'id_persona_recaudador__tipo_documento__nombre',
            'id_persona_recaudador__numero_documento',
            'id_persona_recaudador__tipo_persona',
            'id_persona_recaudador__primer_nombre',
            'id_persona_recaudador__segundo_nombre',
            'id_persona_recaudador__primer_apellido',
            'id_persona_recaudador__segundo_apellido',
            'id_persona_recaudador__razon_social',
            'id_persona_recaudador__nombre_comercial',
            'id_persona_recaudador__telefono_celular',
            'id_persona_recaudador__telefono_empresa',
            'id_persona_recaudador__email',
            'id_persona_recaudador__email_empresarial',
            'id_persona_recaudador__direccion_residencia',
            'id_persona_recaudador__direccion_laboral',
            'id_persona_recaudador__direccion_notificaciones',
            'id_municipio_cacao__nombre',
            'id_departamento_cacao__nombre',
            'id_liq_factura_unica__cod_estado',
            'id_liq_factura_unica__fecha_pago',
            'id_liq_factura_unica__nro_doc_pago',
            'id_liq_factura_unica__valor_pagar',
            'id_porcentaje_cobro__valor',
            'id_porcentaje_cobro__cod_tipo_cobro',
            'doc_soporte'
        ]

        # Seleccionar campos según el tipo de serializer
        fields_to_select = base_fields + (detailed_fields if con_detalles else [
            # Proveedor
            'id_persona_proveedor__tipo_documento__nombre',
            'id_persona_proveedor__numero_documento',
            'id_persona_proveedor__tipo_persona',
            'id_persona_proveedor__primer_nombre',
            'id_persona_proveedor__segundo_nombre',
            'id_persona_proveedor__primer_apellido',
            'id_persona_proveedor__segundo_apellido',
            'id_persona_proveedor__razon_social',
            'id_persona_proveedor__nombre_comercial',
            'id_persona_proveedor__cod_municipio_expedicion_id__nombre',
            'id_persona_proveedor__cod_municipio_expedicion_id__cod_departamento__nombre',
            # Recaudador (necesario para detalles)
            'id_persona_recaudador__tipo_documento__nombre',
            'id_persona_recaudador__numero_documento',
            'id_persona_recaudador__tipo_persona',
            'id_persona_recaudador__primer_nombre',
            'id_persona_recaudador__segundo_nombre',
            'id_persona_recaudador__primer_apellido',
            'id_persona_recaudador__segundo_apellido',
            'id_persona_recaudador__razon_social',
            'id_persona_recaudador__nombre_comercial',
            'id_persona_recaudador__telefono_celular',
            'id_persona_recaudador__telefono_empresa',
            'id_persona_recaudador__email',
            'id_persona_recaudador__email_empresarial',
            'id_persona_recaudador__direccion_notificaciones',
            'id_persona_recaudador__cod_municipio_expedicion_id__nombre',
            'id_persona_recaudador__cod_municipio_expedicion_id__cod_departamento__nombre',
            # Ubicación compra
            'id_municipio_cacao__nombre',
            'id_departamento_cacao__nombre',
            # Liquidación y porcentaje (usados en construcción de detalles)
            'id_liq_factura_unica__cod_estado',
            'id_liq_factura_unica__nro_doc_pago',
            'id_liq_factura_unica__valor_pagar',
            'id_porcentaje_cobro__valor',
            'id_porcentaje_cobro__cod_tipo_cobro'
        ])

        # Configurar select_related y prefetch_related según el nivel de detalle
        # Prefetch optimizado para detalles: solo campos necesarios y tipo de cacao
        detalles_prefetch = Prefetch(
            'detallesfacturaunica_set',
            queryset=DetallesFacturaUnica.objects.select_related('id_tipo_cacao').only(
                'id_detalle_factura_unica', 'id_factura_unica', 'id_tipo_cacao', 'nro_kilos', 'valor_kilo',
                'id_tipo_cacao__nombre'
            )
        )

        if con_detalles:
            facturas = facturas_query.select_related(
                'id_persona_proveedor__tipo_documento',
                'id_persona_proveedor__cod_municipio_expedicion_id',
                'id_persona_proveedor__cod_municipio_expedicion_id__cod_departamento',
                'id_persona_recaudador__tipo_documento', 
                'id_persona_recaudador__cod_municipio_expedicion_id',
                'id_persona_recaudador__cod_municipio_expedicion_id__cod_departamento',
                'id_municipio_cacao',
                'id_departamento_cacao',
                'id_liq_factura_unica',
                'id_porcentaje_cobro'
            ).prefetch_related(
                detalles_prefetch
            ).only(*fields_to_select).order_by('-fecha_compra')
        else:
            facturas = facturas_query.select_related(
                'id_persona_proveedor__tipo_documento',
                'id_persona_proveedor__cod_municipio_expedicion_id',
                'id_persona_proveedor__cod_municipio_expedicion_id__cod_departamento',
                'id_persona_recaudador__tipo_documento', 
                'id_persona_recaudador__cod_municipio_expedicion_id',
                'id_persona_recaudador__cod_municipio_expedicion_id__cod_departamento',
                'id_municipio_cacao',
                'id_departamento_cacao',
                'id_liq_factura_unica',
                'id_porcentaje_cobro'
            ).prefetch_related(
                detalles_prefetch
            ).only(*fields_to_select).order_by('-fecha_compra')
            
        print(f"⚙️ [TABLERO] Query optimizada creada en {time.time() - query_optimize_start:.3f}s")

        # Optimización: calcular totales en una sola consulta
        aggregate_start = time.time()
        totales = facturas.aggregate(
            total_kilos=Sum('total_kilos'),
            total_cuota_fomento=Sum('cuota_fomento'),
            total_valor_bruto=Sum('valor_bruto'),
            total_valor_neto=Sum('valor_neto')
        )
        print(f"🧮 [TABLERO] Agregación calculada en {time.time() - aggregate_start:.3f}s - Total kilos: {totales.get('total_kilos', 0)}")

        # Verificar si hay datos basándose en los totales
        if not any(totales.values()):
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)

        totales_data = {
            'total_kilos': totales['total_kilos'] or 0,
            'total_cuota_fomento': totales['total_cuota_fomento'] or 0,
            'total_valor_bruto': totales['total_valor_bruto'] or 0,
            'total_valor_neto': totales['total_valor_neto'] or 0
        }

        # Lógica condicional para paginación
        if sin_paginacion:
            # Sin paginación: retornar todos los datos
            serialize_start = time.time()
            
            # Medir la consulta real a la base de datos
            query_execution_start = time.time()
            facturas_list = list(facturas)  # Esto ejecuta la consulta real
            query_execution_time = time.time() - query_execution_start
            print(f"🗄️ [TABLERO] Consulta BD ejecutada en {query_execution_time:.3f}s - {len(facturas_list)} registros obtenidos")
            
            print(f"📊 [TABLERO] Iniciando serialización de {len(facturas_list)} registros...")
            
            # Usar el serializer apropiado
            facturas_data = self._serializar_facturas_con_detalles(facturas_list, usar_detallado=con_detalles)
            
            serialize_time = time.time() - serialize_start
            print(f"📊 [TABLERO] Serialización completada en {serialize_time:.3f}s - {len(facturas_data)} registros")
            
            total_time = time.time() - start_time
            print(f"✅ [TABLERO] Proceso completado en {total_time:.3f}s total")
            
            return Response({
                'success': True,
                'data': {
                    'facturas': facturas_data,
                    'totales': totales_data,
                    'total_registros': len(facturas_data),
                    'con_detalles': con_detalles
                },
                'message': f'Tablero de control consultado exitosamente (sin paginación){" con detalles completos" if con_detalles else ""}.'
            }, status=status.HTTP_200_OK)
        else:
            # Con paginación: usar el paginador
            paginator = self.pagination_class()
            paginated_facturas = paginator.paginate_queryset(facturas, request)
            
            # Usar el serializer apropiado
            if con_detalles:
                serializer = self.serializer_detallado_class(paginated_facturas, many=True, context={'request': request})
            else:
                serializer = self.serializer_class(paginated_facturas, many=True, context={'request': request})
                
            return paginator.get_paginated_response({
                'facturas': serializer.data,
                'totales': totales_data,
                'con_detalles': con_detalles
            })
    
class TableroControlComprasCacao(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        estado = request.query_params.get('estado', None)
        id_departamento = request.query_params.get('id_departamento', None)
        id_municipio = request.query_params.get('id_municipio', None)
        id_recaudador = request.query_params.get('id_recaudador', None)

        if not fecha_inicio_str or not fecha_fin_str:
            return Response({"success": False, "detail": "Las fechas de inicio y fin son requeridas."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d')
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d')
        except (ValueError, TypeError):
            return Response({"success": False, "detail": "El formato de fecha es inválido. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if fecha_inicio > fecha_fin:
            return Response({"success": False, "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."}, status=status.HTTP_400_BAD_REQUEST)

        # Filtrar las facturas por fecha
        facturas = FacturaUnica.objects.filter(fecha_compra__range=(fecha_inicio, fecha_fin))

        if estado:
            facturas = facturas.filter(estado_factura=estado)
        if id_departamento:
            try:
                id_departamento = int(id_departamento)
            except (ValueError, TypeError):
                return Response({"success": False, "detail": "El formato del ID de departamento es inválido."}, status=status.HTTP_400_BAD_REQUEST)
            facturas = facturas.filter(id_departamento_cacao=id_departamento)
        if id_municipio:
            try:
                id_municipio = int(id_municipio)
            except (ValueError, TypeError):
                return Response({"success": False, "detail": "El formato del ID de municipio es inválido."}, status=status.HTTP_400_BAD_REQUEST)
            facturas = facturas.filter(id_municipio_cacao=id_municipio)
        if id_recaudador:
            try:
                id_recaudador = int(id_recaudador)
            except (ValueError, TypeError):
                return Response({"success": False, "detail": "El formato del ID de recaudador es inválido."}, status=status.HTTP_400_BAD_REQUEST)
            facturas = facturas.filter(id_persona_recaudador=id_recaudador)

        if not facturas.exists():
            return Response({
                "success": False,
                'detail': 'No se encontraron facturas para los parámetros dados.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Agregar nombre del estado de factura
        tabla_estado = facturas.values('estado_factura').annotate(
            kilos = Sum('total_kilos'),
            valor_bruto=Sum('valor_bruto'),
            cuota_fomento=Sum('cuota_fomento')
            ).order_by('estado_factura')
        
        for item in tabla_estado:
            estado_codigo = item['estado_factura']
            estado_nombre = dict(cod_estado_factura_CHOICES).get(estado_codigo, "Desconocido")
            item['estado_factura'] = str(estado_nombre).upper()

        tabla_cuota_departamento = facturas.values('id_departamento_cacao').annotate(
            valor_bruto=Sum('valor_bruto'),
            cuota_fomento=Sum('cuota_fomento')
        ).order_by('id_departamento_cacao__nombre')

        for item in tabla_cuota_departamento:
            departamento_codigo = item['id_departamento_cacao']
            try:
                departamento_nombre = Departamento.objects.get(cod_departamento=departamento_codigo).nombre
            except (ValueError, TypeError, Departamento.DoesNotExist):
                departamento_nombre = "Desconocido"
            item['departamento_cacao'] = str(departamento_nombre).upper()

        tabla_kilo_departamento = None
        if id_departamento:
            tabla_kilo_departamento = facturas.values('id_municipio_cacao').annotate(
                total_kilos=Sum('total_kilos'),
                cuota_fomento=Sum('cuota_fomento')
            ).order_by('id_municipio_cacao__nombre')

            for item in tabla_kilo_departamento:
                municipio_codigo = item['id_municipio_cacao']
                try:
                    municipio_nombre = Municipio.objects.get(cod_municipio=municipio_codigo).nombre
                except (ValueError, TypeError, Municipio.DoesNotExist):
                    municipio_nombre = "Desconocido"

                item['municipio_cacao'] = str(municipio_nombre).upper()

        return Response({
            "success": True,
            "tabla_estado": tabla_estado,
            "tabla_cuota_departamento": tabla_cuota_departamento,
            "tabla_kilo_departamento": tabla_kilo_departamento
        }, status=status.HTTP_200_OK)