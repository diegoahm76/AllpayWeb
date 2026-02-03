from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from rest_framework.filters import OrderingFilter, SearchFilter

from ..models import ProduccionCacaoHistorico
from ..serializers.reportes_serializers import ProduccionCacaoHistoricoSerializer
from ..utils import CustomPagination


class ProduccionCacaoHistoricoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el CRUD completo de ProduccionCacaoHistorico
    
    Endpoints disponibles:
    - GET /api/produccion-cacao/ → lista todo el histórico
    - POST /api/produccion-cacao/ → crea nuevos registros o agrega meses null a registros existentes
    - GET /api/produccion-cacao/{id}/ → consulta por id
    - PUT/PATCH /api/produccion-cacao/{id}/ → actualiza registro existente por ID
    - DELETE /api/produccion-cacao/{id}/ → elimina
    
    Comportamiento inteligente de POST:
    - Crea nuevos años sin problema
    - Para años existentes: permite agregar solo meses que están en null
    - Rechaza sobrescribir meses que ya tienen valores
    - Para sobrescribir usar PUT/PATCH con ID específico
    """
    queryset = ProduccionCacaoHistorico.objects.all()
    serializer_class = ProduccionCacaoHistoricoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    filter_backends = [OrderingFilter, SearchFilter]
    ordering_fields = ['ano', 'pano']
    ordering = ['-ano']  # Por defecto ordenar por año descendente
    search_fields = ['ano']

    def get_queryset(self):
        """
        Personalizar el queryset con filtros adicionales
        """
        queryset = self.queryset
        
        # Filtro por rango de años
        ano_desde = self.request.query_params.get('ano_desde', None)
        ano_hasta = self.request.query_params.get('ano_hasta', None)
        
        if ano_desde:
            try:
                ano_desde = int(ano_desde)
                queryset = queryset.filter(ano__gte=ano_desde)
            except ValueError:
                pass
                
        if ano_hasta:
            try:
                ano_hasta = int(ano_hasta)
                queryset = queryset.filter(ano__lte=ano_hasta)
            except ValueError:
                pass
        
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Crear un nuevo registro de producción de cacao.
        Solo permite crear registros nuevos. Para editar usar PUT/PATCH con ID específico.
        """
        ano = request.data.get('ano')
        
        # Verificar si ya existe un registro para ese año
        if ano:
            try:
                existing_record = ProduccionCacaoHistorico.objects.get(ano=ano)
                # Si ya existe, verificar si solo se están agregando meses que están en null
                return self._handle_existing_record_smart_update(request, existing_record)
            except ProduccionCacaoHistorico.DoesNotExist:
                pass
        
        # Crear nuevo registro
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                instance = serializer.save()
                return Response(
                    {
                        'success': True,
                        'message': f'Registro de producción para el año {instance.ano} creado exitosamente',
                        'data': self.get_serializer(instance).data
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {
                        'success': False,
                        'message': f'Error al crear el registro: {str(e)}',
                        'errors': None
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Mejorar el formato de errores de validación
        errors = serializer.errors
        error_messages = []
        
        for field, field_errors in errors.items():
            for error in field_errors:
                error_messages.append(f'{field}: {error}')
        
        return Response(
            {
                'success': False,
                'message': 'Error de validación en los datos enviados',
                'errors': error_messages,
                'details': errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def _handle_existing_record_smart_update(self, request, existing_record):
        """
        Maneja la actualización inteligente: permite agregar solo meses que están en null,
        pero rechaza sobrescribir meses que ya tienen valores.
        """
        meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ]
        
        # Verificar qué meses se están intentando agregar/actualizar
        conflictos = []
        meses_a_agregar = []
        
        for mes in meses:
            nuevo_valor = request.data.get(mes)
            if nuevo_valor is not None:
                valor_actual = getattr(existing_record, mes)
                if valor_actual is not None:
                    # Ya existe valor para este mes, es conflicto
                    conflictos.append(f'{mes} (actual: {valor_actual}, nuevo: {nuevo_valor})')
                else:
                    # El mes está en null, se puede agregar
                    meses_a_agregar.append(mes)
        
        # Si hay conflictos, rechazar la operación
        if conflictos:
            return Response(
                {
                    'success': False,
                    'message': f'Ya existe un registro para el año {existing_record.ano}. Los siguientes meses ya tienen valores: {", ".join(conflictos)}'
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Si no hay conflictos pero tampoco hay meses a agregar
        if not meses_a_agregar:
            return Response(
                {
                    'success': False,
                    'message': f'Ya existe un registro para el año {existing_record.ano} y no se proporcionaron meses nuevos para agregar'
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Actualizar solo los meses que están en null
        updated_data = {}
        for mes in meses_a_agregar:
            updated_data[mes] = request.data.get(mes)
        
        serializer = self.get_serializer(existing_record, data=updated_data, partial=True)
        if serializer.is_valid():
            try:
                instance = serializer.save()
                return Response(
                    {
                        'success': True,
                        'message': f'Meses agregados al registro del año {instance.ano}: {", ".join(meses_a_agregar)}',
                        'meses_agregados': meses_a_agregar,
                        'data': self.get_serializer(instance).data
                    },
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {
                        'success': False,
                        'message': f'Error al actualizar el registro: {str(e)}',
                        'errors': None
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(
            {
                'success': False,
                'message': 'Error de validación en los datos de actualización',
                'errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    def update(self, request, *args, **kwargs):
        """
        Actualizar un registro existente
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_ano = instance.ano
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            try:
                instance = serializer.save()
                return Response(
                    {
                        'success': True,
                        'message': f'Registro de producción para el año {instance.ano} actualizado exitosamente',
                        'data': self.get_serializer(instance).data
                    },
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {
                        'success': False,
                        'message': f'Error al actualizar el registro: {str(e)}',
                        'errors': None
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Mejorar el formato de errores de validación
        errors = serializer.errors
        error_messages = []
        
        for field, field_errors in errors.items():
            for error in field_errors:
                error_messages.append(f'{field}: {error}')
        
        return Response(
            {
                'success': False,
                'message': 'Error de validación en los datos enviados',
                'errors': error_messages,
                'details': errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar un registro
        """
        try:
            instance = self.get_object()
            ano = instance.ano
            instance.delete()
            return Response(
                {
                    'success': True,
                    'message': f'Registro de producción para el año {ano} eliminado exitosamente'
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': f'Error al eliminar el registro: {str(e)}',
                    'errors': None
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def resumen_general(self, request):
        """
        Endpoint adicional: GET /api/produccion-cacao/resumen_general/
        Devuelve un resumen general de todos los años
        """
        try:
            queryset = self.get_queryset()
            
            if not queryset.exists():
                return Response(
                    {'message': 'No hay registros de producción disponibles'},
                    status=status.HTTP_200_OK
                )
            
            # Calcular estadísticas generales
            total_registros = queryset.count()
            primer_ano = queryset.order_by('ano').first().ano
            ultimo_ano = queryset.order_by('-ano').first().ano
            
            # Calcular promedios por mes
            from django.db.models import Avg, Sum, Count
            promedios = {}
            totales = {}
            meses = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
            ]
            
            for mes in meses:
                # Filtrar solo registros donde el mes no sea nulo
                registros_mes = queryset.exclude(**{f'{mes}__isnull': True})
                if registros_mes.exists():
                    promedio = registros_mes.aggregate(promedio=Avg(mes))['promedio']
                    total = registros_mes.aggregate(total=Sum(mes))['total']
                    promedios[mes] = round(float(promedio), 3) if promedio else 0
                    totales[mes] = round(float(total), 3) if total else 0
                else:
                    promedios[mes] = 0
                    totales[mes] = 0
            
            # Total anual promedio
            total_anual_promedio = queryset.exclude(pano__isnull=True).aggregate(
                promedio=Avg('pano')
            )['promedio']
            
            resumen = {
                'total_registros': total_registros,
                'rango_anos': {
                    'desde': primer_ano,
                    'hasta': ultimo_ano
                },
                'promedios_mensuales': promedios,
                'totales_mensuales': totales,
                'promedio_anual': round(float(total_anual_promedio), 3) if total_anual_promedio else 0
            }
            
            return Response(resumen, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error al generar el resumen: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def por_ano(self, request):
        """
        Endpoint adicional: GET /api/produccion-cacao/por_ano/?ano=2023
        Busca un registro específico por año
        """
        ano = request.query_params.get('ano', None)
        
        if not ano:
            return Response(
                {'error': 'El parámetro ano es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ano = int(ano)
            instance = ProduccionCacaoHistorico.objects.filter(ano=ano).first()
            
            if not instance:
                return Response(
                    {'message': f'No se encontró registro para el año {ano}'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except ValueError:
            return Response(
                {'error': 'El año debe ser un número entero válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error al consultar el registro: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def validar_ano(self, request):
        """
        Endpoint adicional: GET /api/produccion-cacao/validar_ano/?ano=2023
        Verifica si ya existe un registro para un año específico
        """
        ano = request.query_params.get('ano', None)
        
        if not ano:
            return Response(
                {'error': 'El parámetro ano es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ano = int(ano)
            existe = ProduccionCacaoHistorico.objects.filter(ano=ano).exists()
            
            return Response(
                {
                    'ano': ano,
                    'existe': existe,
                    'message': f'{"Ya existe" if existe else "No existe"} un registro para el año {ano}'
                },
                status=status.HTTP_200_OK
            )
            
        except ValueError:
            return Response(
                {'error': 'El año debe ser un número entero válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error al validar el año: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def detalles_mes(self, request, pk=None):
        """
        Endpoint adicional: GET /api/produccion-cacao/{id}/detalles_mes/
        Devuelve los detalles mensuales de un registro específico
        """
        try:
            instance = self.get_object()
            
            meses = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
            ]
            
            detalles_mensuales = []
            for i, mes in enumerate(meses, 1):
                valor = getattr(instance, mes)
                detalles_mensuales.append({
                    'numero_mes': i,
                    'nombre_mes': mes.capitalize(),
                    'valor': float(valor) if valor is not None else None,
                    'tiene_datos': valor is not None
                })
            
            resumen = {
                'ano': instance.ano,
                'total_anual': float(instance.pano) if instance.pano else 0,
                'meses_con_datos': sum(1 for detalle in detalles_mensuales if detalle['tiene_datos']),
                'detalles_mensuales': detalles_mensuales
            }
            
            return Response(resumen, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error al obtener detalles mensuales: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
