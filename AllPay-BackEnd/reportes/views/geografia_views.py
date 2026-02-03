from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from ..models import Department, Municipality
from ..serializers.reportes_serializers import (
    DepartmentSerializer, 
    MunicipalitySerializer, 
    MunicipalityListSerializer
)


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar departamentos.
    Solo permite operaciones de lectura.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Department.objects.all()
        
        # Filtro por nombre (búsqueda)
        name = self.request.query_params.get('name', None)
        if name:
            queryset = queryset.filter(name__icontains=name)
            
        # Filtro por código
        code = self.request.query_params.get('code', None)
        if code:
            queryset = queryset.filter(code__icontains=code)
            
        return queryset.order_by('name')
    
    @action(detail=True, methods=['get'])
    def municipalities(self, request, pk=None):
        """
        Obtener todos los municipios de un departamento específico
        """
        try:
            department = self.get_object()
            municipalities = Municipality.objects.filter(department=department)
            serializer = MunicipalityListSerializer(municipalities, many=True)
            return Response(serializer.data)
        except Department.DoesNotExist:
            return Response(
                {'error': 'Departamento no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class MunicipalityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar municipios.
    Solo permite operaciones de lectura.
    """
    queryset = Municipality.objects.select_related('department')
    serializer_class = MunicipalitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Municipality.objects.select_related('department')
        
        # Filtro por nombre del municipio
        name = self.request.query_params.get('name', None)
        if name:
            queryset = queryset.filter(name__icontains=name)
            
        # Filtro por código del municipio
        code = self.request.query_params.get('code', None)
        if code:
            queryset = queryset.filter(code__icontains=code)
            
        # Filtro por departamento
        department_code = self.request.query_params.get('department', None)
        if department_code:
            queryset = queryset.filter(department__code=department_code)
            
        # Filtro por nombre del departamento
        department_name = self.request.query_params.get('department_name', None)
        if department_name:
            queryset = queryset.filter(department__name__icontains=department_name)
            
        return queryset.order_by('department__name', 'name')
    
    def get_serializer_class(self):
        """
        Usar MunicipalityListSerializer para listar y MunicipalitySerializer para detalle
        """
        if self.action == 'list':
            return MunicipalityListSerializer
        return MunicipalitySerializer
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Búsqueda avanzada de municipios por múltiples criterios
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response(
                {'error': 'Parámetro de búsqueda requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        queryset = Municipality.objects.select_related('department').filter(
            Q(name__icontains=query) |
            Q(code__icontains=query) |
            Q(department__name__icontains=query) |
            Q(department__code__icontains=query)
        )
        
        serializer = MunicipalityListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """
        Obtener municipios agrupados por departamento
        """
        departments = Department.objects.prefetch_related('municipalities').all()
        
        result = []
        for dept in departments:
            municipalities = MunicipalityListSerializer(
                dept.municipalities.all(), many=True
            ).data
            
            result.append({
                'department_code': dept.code,
                'department_name': dept.name,
                'municipalities': municipalities,
                'total_municipalities': len(municipalities)
            })
            
        return Response(result)
