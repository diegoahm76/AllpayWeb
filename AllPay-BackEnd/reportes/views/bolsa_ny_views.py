from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from datetime import datetime, date
import logging
from ..models import BolsaNY
from ..serializers.reportes_serializers import BolsaNYSerializer
from ..utils import CustomPagination

# Configurar logger
logger = logging.getLogger(__name__)

class BolsaNYViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo BolsaNY (Precios de Cierre de la Bolsa de Nueva York)
    Permite CRUD completo y operaciones adicionales
    """
    queryset = BolsaNY.objects.all().select_related('idusuario')
    serializer_class = BolsaNYSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['idusuario__username', 'idusuario__first_name']
    ordering_fields = ['fecha_registro', 'precio_cierre', 'anio', 'mes']
    ordering = ['-fecha_registro']
    pagination_class = CustomPagination

    def create(self, request, *args, **kwargs):
        """Sobrescribir create para logging detallado"""
        try:
            # Capturar el body raw antes del parsing
            raw_body = request.body.decode('utf-8') if request.body else 'No body'
            logger.info(f"Body raw recibido: '{raw_body}'")
            logger.info(f"Content-Type: {request.content_type}")
            logger.info(f"Headers: {dict(request.headers)}")
            
            # Intentar acceder a request.data (esto puede fallar si hay error de parsing)
            try:
                logger.info(f"Intentando crear registro de BolsaNY con datos: {request.data}")
                logger.info(f"Usuario autenticado: {request.user.nombre_de_usuario}")
            except Exception as parse_error:
                logger.error(f"Error al parsear request.data: {str(parse_error)}")
                return Response({
                    'success': False,
                    'message': f'Error al parsear JSON: {str(parse_error)}',
                    'raw_body': raw_body,
                    'content_type': request.content_type
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
                registro_existente = BolsaNY.objects.filter(fecha_registro=fecha_registro).first()
                if registro_existente:
                    logger.warning(f"Intento de crear registro duplicado para la fecha: {fecha_registro}")
                    return Response({
                        'success': False,
                        'message': f'Ya existe un registro de Bolsa NY para la fecha {fecha_registro}',
                        'error_code': 'FECHA_DUPLICADA',
                        'fecha_existente': fecha_registro.strftime('%Y-%m-%d'),
                        'registro_existente_id': registro_existente.idregistro
                    }, status=status.HTTP_409_CONFLICT)
            
            # Crear la instancia
            instance = serializer.save(idusuario=request.user)
            logger.info(f"Registro creado exitosamente con ID: {instance.idregistro}")
            
            return Response({
                'success': True,
                'message': 'Registro de Bolsa NY creado exitosamente',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al crear registro de BolsaNY: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error interno del servidor: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        """
        Filtrado personalizado para reemplazar django-filter
        """
        queryset = BolsaNY.objects.all().select_related('idusuario')
        
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
        serializer.save(idusuario=self.request.user)

    def perform_update(self, serializer):
        """Asignar automáticamente el usuario que registra en actualizaciones"""
        serializer.save(idusuario=self.request.user)

    @action(detail=False, methods=['post'])
    def validar_datos(self, request):
        """Endpoint para validar datos sin crear registro"""
        try:
            logger.info(f"Validando datos: {request.data}")
            
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                # Validar que no exista un registro para la misma fecha
                fecha_registro = serializer.validated_data.get('fecha_registro')
                if fecha_registro:
                    registro_existente = BolsaNY.objects.filter(fecha_registro=fecha_registro).first()
                    if registro_existente:
                        logger.warning(f"Validación: Ya existe registro para la fecha: {fecha_registro}")
                        return Response({
                            'success': False,
                            'message': f'Ya existe un registro de Bolsa NY para la fecha {fecha_registro}',
                            'error_code': 'FECHA_DUPLICADA',
                            'fecha_existente': fecha_registro.strftime('%Y-%m-%d'),
                            'registro_existente_id': registro_existente.idregistro,
                            'validacion': 'FECHA_DUPLICADA'
                        }, status=status.HTTP_409_CONFLICT)
                
                logger.info("Datos válidos")
                return Response({
                    'success': True,
                    'message': 'Datos válidos',
                    'validated_data': serializer.validated_data
                })
            else:
                logger.error(f"Datos inválidos: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Datos inválidos',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error en validación: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error en validación: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def ultimo_precio(self, request):
        """Obtener el último precio de cierre registrado"""
        try:
            ultimo_precio = BolsaNY.objects.order_by('-fecha_registro').first()
            if ultimo_precio:
                serializer = self.get_serializer(ultimo_precio)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Último precio de cierre obtenido exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No hay registros de precios de cierre disponibles'
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener el último precio de cierre: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def precio_por_fecha(self, request):
        """Obtener el precio de cierre para una fecha específica"""
        fecha_str = request.query_params.get('fecha')
        if not fecha_str:
            return Response({
                'success': False,
                'message': 'El parámetro fecha es requerido (formato: YYYY-MM-DD)'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            precio = BolsaNY.objects.filter(fecha_registro=fecha).first()
            
            if precio:
                serializer = self.get_serializer(precio)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': f'Precio de cierre para {fecha_str} obtenido exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No hay precio de cierre registrado para la fecha {fecha_str}'
                }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener el precio de cierre: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def resumen_mensual(self, request):
        """Obtener resumen de precios de cierre por mes y año"""
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
            
            precios_mes = BolsaNY.objects.filter(anio=anio, mes=mes).order_by('fecha_registro')
            
            if precios_mes.exists():
                serializer = self.get_serializer(precios_mes, many=True)
                
                # Calcular estadísticas
                precios = [int(precio.precio_cierre) for precio in precios_mes]
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
                    'message': f'No hay registros de precios de cierre para {mes}/{anio}'
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
        """Obtener precios de cierre en un rango de fechas"""
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
            
            precios_rango = BolsaNY.objects.filter(
                fecha_registro__range=[fecha_inicio, fecha_fin]
            ).order_by('fecha_registro')
            
            if precios_rango.exists():
                serializer = self.get_serializer(precios_rango, many=True)
                
                # Calcular estadísticas del rango
                precios = [int(precio.precio_cierre) for precio in precios_rango]
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
                    'message': f'Precios de cierre del rango {fecha_inicio} a {fecha_fin} obtenidos exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No hay registros de precios de cierre en el rango de fechas especificado'
                }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener los precios de cierre del rango: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def comparativo_trm(self, request):
        """Obtener comparativo entre precios de cierre de Bolsa NY y TRM para un rango de fechas"""
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
            
            # Obtener precios de Bolsa NY
            precios_bolsa = BolsaNY.objects.filter(
                fecha_registro__range=[fecha_inicio, fecha_fin]
            ).order_by('fecha_registro')
            
            # Obtener precios TRM
            from ..models import TRM
            precios_trm = TRM.objects.filter(
                fecha_registro__range=[fecha_inicio, fecha_fin]
            ).order_by('fecha_registro')
            
            if precios_bolsa.exists() or precios_trm.exists():
                # Crear diccionario de fechas para comparación
                comparativo = {}
                
                for precio in precios_bolsa:
                    fecha_str = precio.fecha_registro.strftime('%Y-%m-%d')
                    if fecha_str not in comparativo:
                        comparativo[fecha_str] = {}
                    comparativo[fecha_str]['bolsa_ny'] = {
                        'precio': int(precio.precio_cierre),
                        'anio': precio.anio,
                        'mes': precio.mes
                    }
                
                for precio in precios_trm:
                    fecha_str = precio.fecha_registro.strftime('%Y-%m-%d')
                    if fecha_str not in comparativo:
                        comparativo[fecha_str] = {}
                    comparativo[fecha_str]['trm'] = {
                        'precio': int(precio.precio_trm),
                        'anio': precio.anio,
                        'mes': precio.mes
                    }
                
                return Response({
                    'success': True,
                    'data': {
                        'comparativo': comparativo,
                        'total_fechas': len(comparativo),
                        'fecha_inicio': fecha_inicio,
                        'fecha_fin': fecha_fin
                    },
                    'message': f'Comparativo de precios del rango {fecha_inicio} a {fecha_fin} obtenido exitosamente'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No hay registros de precios en el rango de fechas especificado'
                }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener el comparativo: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
