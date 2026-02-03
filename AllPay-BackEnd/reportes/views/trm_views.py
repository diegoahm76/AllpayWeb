from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from datetime import datetime, date
import logging
from ..models import TRM
from ..serializers.reportes_serializers import TRMSerializer
from ..utils import CustomPagination

# Configurar logger
logger = logging.getLogger(__name__)

class TRMViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo TRM (Tasa Representativa del Mercado)
    Permite CRUD completo y operaciones adicionales
    """
    queryset = TRM.objects.all().select_related('usuario_que_registra')
    serializer_class = TRMSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['usuario_que_registra__nombre_de_usuario', 'usuario_que_registra__nombre_de_usuario']
    ordering_fields = ['fecha_registro', 'precio_trm', 'anio', 'mes']
    ordering = ['-fecha_registro']
    pagination_class = CustomPagination

    def create(self, request, *args, **kwargs):
        """Sobrescribir create para logging detallado y respuesta consistente"""
        try:
            # Capturar el body raw antes del parsing
            raw_body = request.body.decode('utf-8') if request.body else 'No body'
            logger.info(f"Intentando crear registro de TRM con datos: {request.data}")
            logger.info(f"Usuario autenticado: {request.user.nombre_de_usuario}")
            
            # Validar datos antes de procesar
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer inválido: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Datos inválidos',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar que no exista un registro para la misma fecha
            fecha_registro = serializer.validated_data.get('fecha_registro')
            if fecha_registro:
                registro_existente = TRM.objects.filter(fecha_registro=fecha_registro).first()
                if registro_existente:
                    logger.warning(f"Intento de crear registro TRM duplicado para la fecha: {fecha_registro}")
                    return Response({
                        'success': False,
                        'message': f'Ya existe un registro de TRM para la fecha {fecha_registro}',
                        'error_code': 'FECHA_DUPLICADA',
                        'fecha_existente': fecha_registro.strftime('%Y-%m-%d'),
                        'registro_existente_id': registro_existente.idregistro
                    }, status=status.HTTP_409_CONFLICT)
            
            # Crear la instancia
            instance = serializer.save(usuario_que_registra=request.user)
            logger.info(f"Registro TRM creado exitosamente con ID: {instance.idregistro}")
            
            return Response({
                'success': True,
                'message': 'Registro de TRM creado exitosamente',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al crear registro de TRM: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error interno del servidor: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        """
        Filtrado personalizado para reemplazar django-filter
        """
        queryset = TRM.objects.all().select_related('usuario_que_registra')
        
        # Filtros por parámetros de query
        anio = self.request.query_params.get('anio')
        mes = self.request.query_params.get('mes')
        fecha_registro = self.request.query_params.get('fecha_registro')
        
        if anio:
            try:
                anio = int(anio)
                queryset = queryset.filter(anio=anio)
            except ValueError:
                pass
                
        if mes:
            try:
                mes = int(mes)
                queryset = queryset.filter(mes=mes)
            except ValueError:
                pass
                
        if fecha_registro:
            try:
                fecha = datetime.strptime(fecha_registro, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_registro=fecha)
            except ValueError:
                pass
        
        return queryset

    def perform_create(self, serializer):
        """Asignar automáticamente el usuario que registra"""
        serializer.save(usuario_que_registra=self.request.user)

    def perform_update(self, serializer):
        """Asignar automáticamente el usuario que registra en actualizaciones"""
        serializer.save(usuario_que_registra=self.request.user)

    @action(detail=False, methods=['post'])
    def validar_datos(self, request):
        """Endpoint para validar datos sin crear registro"""
        try:
            logger.info(f"Validando datos TRM: {request.data}")
            
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                # Validar que no exista un registro para la misma fecha
                fecha_registro = serializer.validated_data.get('fecha_registro')
                if fecha_registro:
                    registro_existente = TRM.objects.filter(fecha_registro=fecha_registro).first()
                    if registro_existente:
                        logger.warning(f"Validación TRM: Ya existe registro para la fecha: {fecha_registro}")
                        return Response({
                            'success': False,
                            'message': f'Ya existe un registro de TRM para la fecha {fecha_registro}',
                            'error_code': 'FECHA_DUPLICADA',
                            'fecha_existente': fecha_registro.strftime('%Y-%m-%d'),
                            'registro_existente_id': registro_existente.idregistro,
                            'validacion': 'FECHA_DUPLICADA'
                        }, status=status.HTTP_409_CONFLICT)
                
                logger.info("Datos TRM válidos")
                return Response({
                    'success': True,
                    'message': 'Datos TRM válidos',
                    'validated_data': serializer.validated_data
                })
            else:
                logger.error(f"Datos TRM inválidos: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Datos TRM inválidos',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error en validación TRM: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error en validación TRM: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def ultimo_precio(self, request):
        """Obtener el último precio TRM registrado"""
        try:
            ultimo_trm = TRM.objects.order_by('-fecha_registro').first()
            if ultimo_trm:
                serializer = self.get_serializer(ultimo_trm)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Último precio TRM obtenido exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No hay registros TRM disponibles'
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener el último precio TRM: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def precio_por_fecha(self, request):
        """Obtener el precio TRM para una fecha específica"""
        fecha_str = request.query_params.get('fecha')
        if not fecha_str:
            return Response({
                'success': False,
                'message': 'El parámetro fecha es requerido (formato: YYYY-MM-DD)'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            trm = TRM.objects.filter(fecha_registro=fecha).first()
            
            if trm:
                serializer = self.get_serializer(trm)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': f'Precio TRM para {fecha_str} obtenido exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No hay precio TRM registrado para la fecha {fecha_str}'
                }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener el precio TRM: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def resumen_mensual(self, request):
        """Obtener resumen de precios TRM por mes y año"""
        anio = request.query_params.get('anio')
        mes = request.query_params.get('mes')
        
        if not anio or not mes:
            return Response({
                'success': False,
                'message': 'Los parámetros anio y mes son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            anio = int(anio)
            mes = int(mes)
            
            trms_mes = TRM.objects.filter(anio=anio, mes=mes).order_by('fecha_registro')
            
            if trms_mes.exists():
                serializer = self.get_serializer(trms_mes, many=True)
                
                # Calcular estadísticas
                precios = [int(trm.precio_trm) for trm in trms_mes]
                precio_promedio = sum(precios) / len(precios)
                precio_min = min(precios)
                precio_max = max(precios)
                
                return Response({
                    'success': True,
                    'data': {
                        'registros': serializer.data,
                        'estadisticas': {
                            'total_registros': len(precios),
                            'precio_promedio': int(round(precio_promedio)),
                            'precio_minimo': precio_min,
                            'precio_maximo': precio_max,
                            'rango': precio_max - precio_min
                        }
                    },
                    'message': f'Resumen mensual para {mes}/{anio} obtenido exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No hay registros TRM para {mes}/{anio}'
                }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Los parámetros anio y mes deben ser números enteros'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener el resumen mensual: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def rango_fechas(self, request):
        """Obtener precios TRM en un rango de fechas"""
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        if not fecha_inicio or not fecha_fin:
            return Response({
                'success': False,
                'message': 'Los parámetros fecha_inicio y fecha_fin son requeridos (formato: YYYY-MM-DD)'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            
            if fecha_inicio > fecha_fin:
                return Response({
                    'success': False,
                    'message': 'La fecha de inicio no puede ser mayor a la fecha de fin'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            trms_rango = TRM.objects.filter(
                fecha_registro__range=[fecha_inicio, fecha_fin]
            ).order_by('fecha_registro')
            
            if trms_rango.exists():
                serializer = self.get_serializer(trms_rango, many=True)
                
                # Calcular estadísticas del rango
                precios = [int(trm.precio_trm) for trm in trms_rango]
                precio_promedio = sum(precios) / len(precios)
                precio_min = min(precios)
                precio_max = max(precios)
                
                return Response({
                    'success': True,
                    'data': {
                        'registros': serializer.data,
                        'estadisticas': {
                            'total_registros': len(precios),
                            'precio_promedio': int(round(precio_promedio)),
                            'precio_minimo': precio_min,
                            'precio_maximo': precio_max,
                            'rango': precio_max - precio_min,
                            'fecha_inicio': fecha_inicio,
                            'fecha_fin': fecha_fin
                        }
                    },
                    'message': f'Precios TRM del rango {fecha_inicio} a {fecha_fin} obtenidos exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No hay registros TRM en el rango de fechas especificado'
                }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener los precios TRM del rango: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
