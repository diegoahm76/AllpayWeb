from rest_framework import generics, status
from rest_framework.response import Response
from django.db.models import Q
from django.db import connection

from reportes.models import ProduccionDepartamentoAnual
from seguridad.models.transversal_models import Departamento
from reportes.utils import CustomPagination
from reportes.serializers.reportes_serializers import (
    ProduccionDepartamentoAnualWriteSerializer,
    ProduccionDepartamentoAnualReadSerializer,
)


class HistoricoProduccionDepartamentoView(generics.ListAPIView):
    """
    Vista para obtener el histórico de producción por departamento
    """
    pagination_class = CustomPagination
    
    def get(self, request, *args, **kwargs):
        """
        Obtiene el histórico de producción por departamento
        Parámetros opcionales:
        - departamento: código del departamento (ej: '18', '05')
        - ano_desde: año inicial del rango
        - ano_hasta: año final del rango
        """
        try:
            # Obtener parámetros de consulta
            cod_departamento = request.query_params.get('departamento')
            ano_desde = request.query_params.get('ano_desde')
            ano_hasta = request.query_params.get('ano_hasta')
            
            # Construir la consulta
            queryset = ProduccionDepartamentoAnual.objects.select_related('departamento')
            
            # Filtrar por departamento si se especifica
            if cod_departamento:
                queryset = queryset.filter(departamento_id=cod_departamento)
            
            # Filtrar por rango de años
            if ano_desde:
                queryset = queryset.filter(ano__gte=ano_desde)
            if ano_hasta:
                queryset = queryset.filter(ano__lte=ano_hasta)
            
            # Ordenar por año y departamento
            queryset = queryset.order_by('-ano', 'departamento__nombre')
            
            # Aplicar paginación
            paginator = self.pagination_class()
            paginated_queryset = paginator.paginate_queryset(queryset, request)
            
            # Preparar los datos para la respuesta
            data = []
            for produccion in paginated_queryset:
                data.append({
                    'id': produccion.id,
                    'codigo_departamento': produccion.departamento.cod_departamento,
                    'nombre_departamento': produccion.departamento.nombre,
                    'ano': produccion.ano,
                    'produccion': float(produccion.produccion),
                    'unidad': 'toneladas'
                })
            
            # Retornar respuesta paginada
            return paginator.get_paginated_response(data)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al consultar el histórico de producción: {str(e)}',
                'data': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResumenProduccionDepartamentoView(generics.GenericAPIView):
    """
    Vista para obtener resumen de producción por departamento
    """
    
    def get(self, request, *args, **kwargs):
        """
        Obtiene un resumen estadístico de la producción por departamento
        """
        try:
            # Consulta SQL para obtener estadísticas por departamento
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        d.CodDepartamento,
                        d.nombre as nombre_departamento,
                        COUNT(p.ano) as total_anos_registrados,
                        MIN(p.ano) as primer_ano,
                        MAX(p.ano) as ultimo_ano,
                        AVG(p.produccion) as produccion_promedio,
                        MIN(p.produccion) as produccion_minima,
                        MAX(p.produccion) as produccion_maxima,
                        SUM(p.produccion) as produccion_total
                    FROM DepartamentosPais d
                    LEFT JOIN ProduccionDepartamentoAnual p ON d.CodDepartamento = p.CodDepartamento
                    GROUP BY d.CodDepartamento, d.nombre
                    ORDER BY produccion_total DESC NULLS LAST, d.nombre
                """)
                
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # Formatear los datos
            data = []
            for row in results:
                data.append({
                    'codigo_departamento': row['CodDepartamento'],
                    'nombre_departamento': row['nombre_departamento'],
                    'estadisticas': {
                        'total_anos_registrados': row['total_anos_registrados'] or 0,
                        'primer_ano': row['primer_ano'],
                        'ultimo_ano': row['ultimo_ano'],
                        'produccion_promedio': float(row['produccion_promedio']) if row['produccion_promedio'] else 0,
                        'produccion_minima': float(row['produccion_minima']) if row['produccion_minima'] else 0,
                        'produccion_maxima': float(row['produccion_maxima']) if row['produccion_maxima'] else 0,
                        'produccion_total': float(row['produccion_total']) if row['produccion_total'] else 0
                    }
                })
            
            return Response({
                'success': True,
                'message': f'Resumen estadístico de {len(data)} departamentos',
                'data': data,
                'total_departamentos': len(data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al generar el resumen estadístico: {str(e)}',
                'data': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TopDepartamentosProduccionView(generics.GenericAPIView):
    """
    Vista para obtener el ranking de departamentos por producción
    """
    
    def get(self, request, *args, **kwargs):
        """
        Obtiene el top de departamentos por producción en un año específico
        Parámetros:
        - ano: año a consultar (requerido)
        - limit: número máximo de departamentos a retornar (default: 10)
        """
        try:
            ano = request.query_params.get('ano')
            limit = int(request.query_params.get('limit', 10))
            
            if not ano:
                return Response({
                    'success': False,
                    'message': 'El parámetro "ano" es requerido',
                    'data': []
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Consultar producción por departamento en el año especificado
            queryset = ProduccionDepartamentoAnual.objects.select_related('departamento')\
                .filter(ano=ano)\
                .order_by('-produccion')[:limit]
            
            # Preparar los datos
            data = []
            for i, produccion in enumerate(queryset, 1):
                data.append({
                    'id': produccion.id,
                    'ranking': i,
                    'codigo_departamento': produccion.departamento.cod_departamento,
                    'nombre_departamento': produccion.departamento.nombre,
                    'ano': produccion.ano,
                    'produccion': float(produccion.produccion),
                    'unidad': 'toneladas'
                })
            
            return Response({
                'success': True,
                'message': f'Top {len(data)} departamentos por producción en {ano}',
                'data': data,
                'ano_consultado': int(ano),
                'total_departamentos': len(data)
            }, status=status.HTTP_200_OK)
            
        except ValueError:
            return Response({
                'success': False,
                'message': 'Los parámetros "ano" y "limit" deben ser números enteros',
                'data': []
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al consultar el ranking de departamentos: {str(e)}',
                'data': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegistrarProduccionDepartamentoView(generics.GenericAPIView):
    """
    Servicio para registrar producción por departamento y año.
    Solo permite crear registros nuevos. Para editar usar PUT con ID específico.
    """
    def post(self, request, *args, **kwargs):
        try:
            serializer = ProduccionDepartamentoAnualWriteSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'message': 'Error de validación en los datos enviados',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            cod_departamento = serializer.validated_data['cod_departamento']
            ano = serializer.validated_data['ano']
            produccion = serializer.validated_data['produccion']
            
            # Verificar si ya existe un registro
            instance = ProduccionDepartamentoAnual.objects.select_related('departamento') \
                .filter(departamento__cod_departamento=cod_departamento, ano=ano).first()

            if instance:
                # Si ya existe, devolver error simple
                departamento_nombre = instance.departamento.nombre if instance.departamento else cod_departamento
                return Response({
                    'success': False,
                    'message': f'Ya existe un registro para {departamento_nombre} en el año {ano}'
                }, status=status.HTTP_409_CONFLICT)

            # Crear nuevo registro
            new_instance = serializer.save()
            read = ProduccionDepartamentoAnualReadSerializer(new_instance).data
            return Response({
                'success': True,
                'message': f'Registro creado para {read["nombre_departamento"]} - {ano}',
                'data': read,
                'accion': 'create'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al procesar la solicitud: {str(e)}',
                'errors': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, *args, **kwargs):
        """
        Actualizar un registro existente por ID (actualización completa)
        """
        try:
            record_id = kwargs.get('pk')
            if not record_id:
                return Response({
                    'success': False,
                    'message': 'ID del registro es requerido para actualización'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Buscar el registro existente
            try:
                instance = ProduccionDepartamentoAnual.objects.select_related('departamento').get(id=record_id)
            except ProduccionDepartamentoAnual.DoesNotExist:
                return Response({
                    'success': False,
                    'message': f'No se encontró registro con ID {record_id}'
                }, status=status.HTTP_404_NOT_FOUND)

            # Validar datos
            serializer = ProduccionDepartamentoAnualWriteSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'message': 'Error de validación en los datos enviados',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            # Actualizar el registro
            cod_departamento = serializer.validated_data['cod_departamento']
            ano = serializer.validated_data['ano']
            produccion = serializer.validated_data['produccion']

            # Verificar si el nuevo año/departamento ya existe en otro registro
            existing = ProduccionDepartamentoAnual.objects.filter(
                departamento__cod_departamento=cod_departamento, 
                ano=ano
            ).exclude(id=record_id).first()
            
            if existing:
                return Response({
                    'success': False,
                    'message': f'Ya existe un registro para el departamento {cod_departamento} en el año {ano}'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Actualizar campos
            departamento = Departamento.objects.get(cod_departamento=cod_departamento)
            instance.departamento = departamento
            instance.ano = ano
            instance.produccion = produccion
            instance.save()

            read = ProduccionDepartamentoAnualReadSerializer(instance).data
            return Response({
                'success': True,
                'message': f'Registro actualizado exitosamente',
                'data': read,
                'accion': 'update'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al actualizar el registro: {str(e)}',
                'errors': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request, *args, **kwargs):
        """
        Actualizar un registro existente por ID (actualización parcial)
        """
        try:
            record_id = kwargs.get('pk')
            if not record_id:
                return Response({
                    'success': False,
                    'message': 'ID del registro es requerido para actualización'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Buscar el registro existente
            try:
                instance = ProduccionDepartamentoAnual.objects.select_related('departamento').get(id=record_id)
            except ProduccionDepartamentoAnual.DoesNotExist:
                return Response({
                    'success': False,
                    'message': f'No se encontró registro con ID {record_id}'
                }, status=status.HTTP_404_NOT_FOUND)

            # Validar solo los campos enviados
            serializer = ProduccionDepartamentoAnualWriteSerializer(data=request.data, partial=True)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'message': 'Error de validación en los datos enviados',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            # Actualizar solo los campos enviados
            changes_made = []
            
            if 'cod_departamento' in serializer.validated_data:
                cod_departamento = serializer.validated_data['cod_departamento']
                departamento = Departamento.objects.get(cod_departamento=cod_departamento)
                instance.departamento = departamento
                changes_made.append(f'Departamento: {instance.departamento.nombre}')

            if 'ano' in serializer.validated_data:
                ano = serializer.validated_data['ano']
                instance.ano = ano
                changes_made.append(f'Año: {ano}')

            if 'produccion' in serializer.validated_data:
                produccion = serializer.validated_data['produccion']
                instance.produccion = produccion
                changes_made.append(f'Producción: {produccion}')

            instance.save()

            read = ProduccionDepartamentoAnualReadSerializer(instance).data
            return Response({
                'success': True,
                'message': f'Registro actualizado exitosamente',
                'changes': changes_made,
                'data': read,
                'accion': 'update'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al actualizar el registro: {str(e)}',
                'errors': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
