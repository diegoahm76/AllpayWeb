from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Q, Avg, Min, Max
from django.shortcuts import get_object_or_404

from ..models import RendimientoCensoDepartamento
from ..serializers.reportes_serializers import RendimientoCensoDepartamentoSerializer
from ..utils import CustomPagination
from seguridad.models.transversal_models import Departamento


class RendimientoCensoDepartamentoListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear rendimientos censo por departamento
    """
    queryset = RendimientoCensoDepartamento.objects.select_related('departamento', 'usuario_actualizacion').all()
    serializer_class = RendimientoCensoDepartamentoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtro por código de departamento
        cod_departamento = self.request.query_params.get('cod_departamento')
        if cod_departamento:
            queryset = queryset.filter(departamento__cod_departamento=cod_departamento)
        
        # Filtro por nombre de departamento (búsqueda parcial)
        nombre_departamento = self.request.query_params.get('nombre_departamento')
        if nombre_departamento:
            queryset = queryset.filter(
                departamento__nombre__icontains=nombre_departamento
            )
        
        # Filtro por rango de rendimiento
        rendimiento_min = self.request.query_params.get('rendimiento_min')
        rendimiento_max = self.request.query_params.get('rendimiento_max')
        
        if rendimiento_min:
            try:
                queryset = queryset.filter(rendimiento_censo__gte=float(rendimiento_min))
            except ValueError:
                pass
        
        if rendimiento_max:
            try:
                queryset = queryset.filter(rendimiento_censo__lte=float(rendimiento_max))
            except ValueError:
                pass
        
        return queryset

    def list(self, request, *args, **kwargs):
        """Lista todos los rendimientos censo con información adicional y paginación"""
        queryset = self.get_queryset()
        
        # Estadísticas generales (sobre todos los registros, no solo la página actual)
        total_departamentos = queryset.count()
        rendimiento_promedio = queryset.aggregate(
            promedio=Avg('rendimiento_censo')
        )['promedio'] or 0
        
        rendimiento_min = queryset.aggregate(
            minimo=Min('rendimiento_censo')
        )['minimo'] or 0
        
        rendimiento_max = queryset.aggregate(
            maximo=Max('rendimiento_censo')
        )['maximo'] or 0
        
        # Aplicar paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            
            # Agregar estadísticas al response paginado
            paginated_data = paginated_response.data
            paginated_data['estadisticas'] = {
                'total_departamentos': total_departamentos,
                'rendimiento_promedio': round(float(rendimiento_promedio), 2),
                'rendimiento_minimo': float(rendimiento_min),
                'rendimiento_maximo': float(rendimiento_max)
            }
            paginated_data['detail'] = f'Se encontraron {total_departamentos} departamentos con rendimiento censo'
            
            return Response(paginated_data)
        
        # Si no hay paginación, devolver todos los datos
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'detail': f'Se encontraron {total_departamentos} departamentos con rendimiento censo',
            'estadisticas': {
                'total_departamentos': total_departamentos,
                'rendimiento_promedio': round(float(rendimiento_promedio), 2),
                'rendimiento_minimo': float(rendimiento_min),
                'rendimiento_maximo': float(rendimiento_max)
            },
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        """Crear un nuevo rendimiento censo para un departamento"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Verificar si ya existe un rendimiento para este departamento
            departamento_id = serializer.validated_data.get('departamento')
            if RendimientoCensoDepartamento.objects.filter(departamento=departamento_id).exists():
                return Response({
                    'success': False,
                    'detail': f'Ya existe un rendimiento censo para el departamento {departamento_id.nombre}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save()
            return Response({
                'success': True,
                'detail': 'Rendimiento censo creado exitosamente',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'detail': 'Error en los datos proporcionados',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class RendimientoCensoDepartamentoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar y eliminar un rendimiento censo específico
    """
    queryset = RendimientoCensoDepartamento.objects.select_related('departamento', 'usuario_actualizacion').all()
    serializer_class = RendimientoCensoDepartamentoSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'departamento__cod_departamento'
    lookup_url_kwarg = 'cod_departamento'

    def retrieve(self, request, *args, **kwargs):
        """Obtener un rendimiento censo específico"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response({
                'success': True,
                'detail': 'Rendimiento censo obtenido exitosamente',
                'data': serializer.data
            })
        except RendimientoCensoDepartamento.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'No se encontró el rendimiento censo para el departamento especificado'
            }, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, *args, **kwargs):
        """Actualizar un rendimiento censo existente"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'detail': 'Rendimiento censo actualizado exitosamente',
                    'data': serializer.data
                })
            
            return Response({
                'success': False,
                'detail': 'Error en los datos proporcionados',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except RendimientoCensoDepartamento.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'No se encontró el rendimiento censo para el departamento especificado'
            }, status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, *args, **kwargs):
        """Eliminar un rendimiento censo"""
        try:
            instance = self.get_object()
            departamento_nombre = instance.departamento.nombre
            instance.delete()
            return Response({
                'success': True,
                'detail': f'Rendimiento censo para {departamento_nombre} eliminado exitosamente'
            }, status=status.HTTP_204_NO_CONTENT)
            
        except RendimientoCensoDepartamento.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'No se encontró el rendimiento censo para el departamento especificado'
            }, status=status.HTTP_404_NOT_FOUND)


class RendimientoCensoDepartamentoBulkUpdateView(generics.GenericAPIView):
    """
    Vista para actualización masiva de rendimientos censo
    """
    serializer_class = RendimientoCensoDepartamentoSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Actualización masiva de rendimientos censo"""
        data = request.data
        
        if not isinstance(data, list):
            return Response({
                'success': False,
                'detail': 'Se esperaba una lista de datos para actualización masiva'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        resultados = []
        errores = []
        
        for item in data:
            try:
                cod_departamento = item.get('departamento')
                if not cod_departamento:
                    errores.append({
                        'item': item,
                        'error': 'Código de departamento requerido'
                    })
                    continue
                
                # Buscar o crear el registro
                departamento = get_object_or_404(Departamento, cod_departamento=cod_departamento)
                rendimiento, created = RendimientoCensoDepartamento.objects.get_or_create(
                    departamento=departamento,
                    defaults={'rendimiento_censo': item.get('rendimiento_censo', 0)}
                )
                
                if not created:
                    # Actualizar si ya existe
                    serializer = self.get_serializer(rendimiento, data=item, partial=True)
                    if serializer.is_valid():
                        serializer.save()
                        resultados.append({
                            'departamento': cod_departamento,
                            'accion': 'actualizado',
                            'data': serializer.data
                        })
                    else:
                        errores.append({
                            'item': item,
                            'error': serializer.errors
                        })
                else:
                    # Crear nuevo
                    serializer = self.get_serializer(rendimiento)
                    resultados.append({
                        'departamento': cod_departamento,
                        'accion': 'creado',
                        'data': serializer.data
                    })
                    
            except Exception as e:
                errores.append({
                    'item': item,
                    'error': str(e)
                })
        
        return Response({
            'success': len(errores) == 0,
            'detail': f'Procesados {len(resultados)} registros exitosamente, {len(errores)} con errores',
            'resultados': resultados,
            'errores': errores
        }, status=status.HTTP_200_OK if len(errores) == 0 else status.HTTP_207_MULTI_STATUS)
