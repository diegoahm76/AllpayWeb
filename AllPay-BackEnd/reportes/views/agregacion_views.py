from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.shortcuts import get_object_or_404
from ..models import Department, Municipality
from recaudos.models.recaudos_models import FacturaUnica
from ..serializers.reportes_serializers import (
    DepartmentSummarySerializer,
    MunicipalitySummarySerializer
)


class AgregacionViewSet(viewsets.ViewSet):
    """
    ViewSet para servicios de agregación de datos transaccionales
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def departamentos(self, request):
        """
        Servicio 1: Agregación por departamento
        Retorna lista de todos los departamentos con totales de facturas
        """
        # Obtener parámetros de filtro
        anio = request.query_params.get('anio')
        mes = request.query_params.get('mes')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        # Construir filtros para FacturaUnica
        filters = Q()
        if anio:
            filters &= Q(fecha_compra__year=int(anio))
        if mes:
            filters &= Q(fecha_compra__month=int(mes))
        if fecha_desde:
            filters &= Q(fecha_compra__date__gte=fecha_desde)
        if fecha_hasta:
            filters &= Q(fecha_compra__date__lte=fecha_hasta)
        
        # Agregación por departamento usando FacturaUnica
        agregacion = FacturaUnica.objects.filter(filters).values(
            'id_departamento_cacao__cod_departamento',
            'id_departamento_cacao__nombre'
        ).annotate(
            kilos=Sum('total_kilos'),
            cuota_fomento=Sum('cuota_fomento'),
            valor_neto=Sum('valor_neto'),
            total_transacciones=Count('id_factura_unica')
        ).order_by('id_departamento_cacao__cod_departamento')
        
        # Preparar resultado
        result = []
        for item in agregacion:
            result.append({
                'codigo': item['id_departamento_cacao__cod_departamento'],
                'nombre': item['id_departamento_cacao__nombre'],
                'total_kilos': int(item['kilos'] or 0),
                'total_cuota_fomento': int(item['cuota_fomento'] or 0),
                'total_valor_neto': int(item['valor_neto'] or 0),
                'total_transacciones': item['total_transacciones']
            })
        
        # Ordenar por nombre o código según parámetro
        orden = request.query_params.get('orden', 'nombre')
        if orden == 'codigo':
            result.sort(key=lambda x: x['codigo'])
        else:
            result.sort(key=lambda x: x['nombre'])
        
        serializer = DepartmentSummarySerializer(result, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def municipios_por_departamento(self, request):
        """
        Servicio 2: Municipios por departamento
        Entrada: codigo_departamento (int)
        Retorna municipios del departamento con totales de facturas
        """
        # Validar entrada
        codigo_departamento = request.query_params.get('codigo_departamento')
        if not codigo_departamento:
            return Response(
                {'error': 'Parámetro codigo_departamento es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            codigo_departamento = int(codigo_departamento)
        except ValueError:
            return Response(
                {'error': 'codigo_departamento debe ser un entero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener parámetros de filtro
        anio = request.query_params.get('anio')
        mes = request.query_params.get('mes')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        # Construir filtros para FacturaUnica
        filters = Q(id_departamento_cacao__cod_departamento=codigo_departamento)
        if anio:
            filters &= Q(fecha_compra__year=int(anio))
        if mes:
            filters &= Q(fecha_compra__month=int(mes))
        if fecha_desde:
            filters &= Q(fecha_compra__date__gte=fecha_desde)
        if fecha_hasta:
            filters &= Q(fecha_compra__date__lte=fecha_hasta)
        
        # Agregación por municipio dentro del departamento usando FacturaUnica
        agregacion = FacturaUnica.objects.filter(filters).values(
            'id_municipio_cacao__cod_municipio',
            'id_municipio_cacao__nombre',
            'id_departamento_cacao__cod_departamento',
            'id_departamento_cacao__nombre'
        ).annotate(
            kilos=Sum('total_kilos'),
            cuota_fomento=Sum('cuota_fomento'),
            valor_neto=Sum('valor_neto'),
            total_transacciones=Count('id_factura_unica')
        ).order_by('id_municipio_cacao__cod_municipio')
        
        # Preparar resultado
        result = []
        for item in agregacion:
            result.append({
                'codigo': item['id_municipio_cacao__cod_municipio'],
                'nombre': item['id_municipio_cacao__nombre'],
                'department_code': item['id_departamento_cacao__cod_departamento'],
                'department_name': item['id_departamento_cacao__nombre'],
                'total_kilos': int(item['kilos'] or 0),
                'total_cuota_fomento': int(item['cuota_fomento'] or 0),
                'total_valor_neto': int(item['valor_neto'] or 0),
                'total_transacciones': item['total_transacciones']
            })
        
        # Ordenar por nombre o código según parámetro
        orden = request.query_params.get('orden', 'nombre')
        if orden == 'codigo':
            result.sort(key=lambda x: x['codigo'])
        else:
            result.sort(key=lambda x: x['nombre'])
        
        serializer = MunicipalitySummarySerializer(result, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumen_general(self, request):
        """
        Resumen general de todas las facturas
        """
        # Totales generales usando FacturaUnica
        totales = FacturaUnica.objects.aggregate(
            total_kilos=Sum('total_kilos'),
            total_cuota_fomento=Sum('cuota_fomento'),
            total_valor_neto=Sum('valor_neto'),
            total_transacciones=Count('id_factura_unica')
        )
        
        # Conteo de departamentos y municipios con datos
        deptos_con_datos = FacturaUnica.objects.values('id_departamento_cacao__cod_departamento').distinct().count()
        municipios_con_datos = FacturaUnica.objects.values('id_municipio_cacao__cod_municipio').distinct().count()
        
        return Response({
            'resumen_general': {
                'total_kilos': int(totales['total_kilos'] or 0),
                'total_cuota_fomento': int(totales['total_cuota_fomento'] or 0),
                'total_valor_neto': int(totales['total_valor_neto'] or 0),
                'total_transacciones': totales['total_transacciones'] or 0,
                'departamentos_con_datos': deptos_con_datos,
                'municipios_con_datos': municipios_con_datos
            }
        })

    # Función datos_transaccionales removida ya que dependía de TransactionalData
