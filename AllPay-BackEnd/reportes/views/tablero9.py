from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, Value, DecimalField, BigIntegerField
from django.db.models.functions import Coalesce
from recaudos.models.recaudos_models import FacturaUnica
from seguridad.models.transversal_models import Departamento, Municipio
# Serializers no necesarios - devolvemos datos directamente


class DepartamentosAgregacionView(APIView):
    """
    Vista para agregar datos por departamento
    Retorna todos los departamentos con kilos, cuota de fomento y valor neto totales
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/tablero9/departamentos/
        
        Parámetros opcionales:
        - anio: Filtrar por año específico
        - mes: Filtrar por mes específico
        - fecha_desde: Filtrar desde fecha (YYYY-MM-DD)
        - fecha_hasta: Filtrar hasta fecha (YYYY-MM-DD)
        - orden: 'codigo' o 'nombre' (default: 'nombre')
        """
        try:
            # Obtener parámetros de filtro
            anio = request.query_params.get('anio')
            mes = request.query_params.get('mes')
            fecha_desde = request.query_params.get('fecha_desde')
            fecha_hasta = request.query_params.get('fecha_hasta')
            
            # Construir filtros para FacturaUnica
            filters = Q()
            if anio:
                try:
                    filters &= Q(fecha_compra__year=int(anio))
                except ValueError:
                    return Response(
                        {'error': 'El parámetro anio debe ser un número entero'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if mes:
                try:
                    mes_int = int(mes)
                    if mes_int < 1 or mes_int > 12:
                        raise ValueError()
                    filters &= Q(fecha_compra__month=mes_int)
                except ValueError:
                    return Response(
                        {'error': 'El parámetro mes debe ser un número entre 1 y 12'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if fecha_desde:
                filters &= Q(fecha_compra__date__gte=fecha_desde)
            
            if fecha_hasta:
                filters &= Q(fecha_compra__date__lte=fecha_hasta)
            
            # Agregación por departamento basada en catálogo (incluir todos)
            condiciones_dep = Q()
            if anio:
                condiciones_dep &= Q(facturaunica__fecha_compra__year=int(anio))
            if mes:
                condiciones_dep &= Q(facturaunica__fecha_compra__month=int(mes))
            if fecha_desde:
                condiciones_dep &= Q(facturaunica__fecha_compra__date__gte=fecha_desde)
            if fecha_hasta:
                condiciones_dep &= Q(facturaunica__fecha_compra__date__lte=fecha_hasta)

            departamentos = Departamento.objects.all().annotate(
                kilos=Coalesce(
                    Sum('facturaunica__total_kilos', filter=condiciones_dep),
                    Value(0),
                    output_field=BigIntegerField()
                ),
                cuota_fomento=Coalesce(
                    Sum('facturaunica__cuota_fomento', filter=condiciones_dep),
                    Value(0),
                    output_field=DecimalField(max_digits=30, decimal_places=2)
                ),
                valor_neto=Coalesce(
                    Sum('facturaunica__valor_neto', filter=condiciones_dep),
                    Value(0),
                    output_field=DecimalField(max_digits=30, decimal_places=2)
                ),
                valor_bruto=Coalesce(
                    Sum('facturaunica__valor_bruto', filter=condiciones_dep),
                    Value(0),
                    output_field=DecimalField(max_digits=30, decimal_places=2)
                ),
            )

            # Preparar resultado con todos los departamentos (incluyendo totales en 0)
            result = []
            for dep in departamentos:
                result.append({
                    'codigo': dep.cod_departamento,
                    'nombre': dep.nombre,
                    'total_kilos': int(dep.kilos or 0),
                    'total_cuota_fomento': int(dep.cuota_fomento or 0),
                    'total_valor_neto': int(dep.valor_neto or 0),
                    'total_valor_bruto': int(dep.valor_bruto or 0)
                })
            
            # Ordenar por nombre o código según parámetro
            orden = request.query_params.get('orden', 'nombre')
            if orden == 'codigo':
                result.sort(key=lambda x: x['codigo'])
            else:
                result.sort(key=lambda x: x['nombre'])
            
            return Response({
                'success': True,
                'message': f'Se encontraron {len(result)} departamentos con datos',
                'data': result,
                'filtros_aplicados': {
                    'anio': anio,
                    'mes': mes,
                    'fecha_desde': fecha_desde,
                    'fecha_hasta': fecha_hasta,
                    'orden': orden
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MunicipiosPorDepartamentoView(APIView):
    """
    Vista para agregar datos por municipios de un departamento específico
    Retorna municipios de un departamento con kilos, cuota de fomento y valor neto totales
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/tablero9/municipios-por-departamento/?codigo_departamento=05
        
        Parámetros requeridos:
        - codigo_departamento: Código del departamento (ej: '05', '08', '11')
        
        Parámetros opcionales:
        - anio: Filtrar por año específico
        - mes: Filtrar por mes específico
        - fecha_desde: Filtrar desde fecha (YYYY-MM-DD)
        - fecha_hasta: Filtrar hasta fecha (YYYY-MM-DD)
        - orden: 'codigo' o 'nombre' (default: 'nombre')
        """
        try:
            # Validar parámetro requerido
            codigo_departamento = request.query_params.get('codigo_departamento')
            if not codigo_departamento:
                return Response(
                    {'error': 'El parámetro codigo_departamento es requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar formato del código de departamento (debe ser 2 caracteres)
            if len(codigo_departamento) != 2:
                return Response(
                    {'error': 'El codigo_departamento debe tener exactamente 2 caracteres (ej: "05", "08")'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener parámetros de filtro opcionales
            anio = request.query_params.get('anio')
            mes = request.query_params.get('mes')
            fecha_desde = request.query_params.get('fecha_desde')
            fecha_hasta = request.query_params.get('fecha_hasta')
            
            # Construir filtros para FacturaUnica
            filters = Q(id_departamento_cacao__cod_departamento=codigo_departamento)
            
            if anio:
                try:
                    filters &= Q(fecha_compra__year=int(anio))
                except ValueError:
                    return Response(
                        {'error': 'El parámetro anio debe ser un número entero'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if mes:
                try:
                    mes_int = int(mes)
                    if mes_int < 1 or mes_int > 12:
                        raise ValueError()
                    filters &= Q(fecha_compra__month=mes_int)
                except ValueError:
                    return Response(
                        {'error': 'El parámetro mes debe ser un número entre 1 y 12'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if fecha_desde:
                filters &= Q(fecha_compra__date__gte=fecha_desde)
            
            if fecha_hasta:
                filters &= Q(fecha_compra__date__lte=fecha_hasta)
            
            # Nombre del departamento desde el catálogo
            departamento_nombre = Departamento.objects.filter(cod_departamento=codigo_departamento).values_list('nombre', flat=True).first()

            # Agregación por municipio basada en catálogo (incluir todos)
            condiciones_mun = Q(facturaunica__id_departamento_cacao__cod_departamento=codigo_departamento)
            if anio:
                condiciones_mun &= Q(facturaunica__fecha_compra__year=int(anio))
            if mes:
                condiciones_mun &= Q(facturaunica__fecha_compra__month=int(mes))
            if fecha_desde:
                condiciones_mun &= Q(facturaunica__fecha_compra__date__gte=fecha_desde)
            if fecha_hasta:
                condiciones_mun &= Q(facturaunica__fecha_compra__date__lte=fecha_hasta)

            municipios = Municipio.objects.filter(cod_departamento=codigo_departamento).annotate(
                kilos=Coalesce(
                    Sum('facturaunica__total_kilos', filter=condiciones_mun),
                    Value(0),
                    output_field=BigIntegerField()
                ),
                cuota_fomento=Coalesce(
                    Sum('facturaunica__cuota_fomento', filter=condiciones_mun),
                    Value(0),
                    output_field=DecimalField(max_digits=30, decimal_places=2)
                ),
                valor_neto=Coalesce(
                    Sum('facturaunica__valor_neto', filter=condiciones_mun),
                    Value(0),
                    output_field=DecimalField(max_digits=30, decimal_places=2)
                ),
                valor_bruto=Coalesce(
                    Sum('facturaunica__valor_bruto', filter=condiciones_mun),
                    Value(0),
                    output_field=DecimalField(max_digits=30, decimal_places=2)
                ),
            )

            # Preparar resultado con todos los municipios (incluyendo totales en 0)
            result = []
            for mun in municipios:
                result.append({
                    'codigo': str(mun.cod_municipio),
                    'nombre': mun.nombre,
                    'department_code': str(codigo_departamento),
                    'department_name': departamento_nombre,
                    'total_kilos': int(mun.kilos or 0),
                    'total_cuota_fomento': int(mun.cuota_fomento or 0),
                    'total_valor_neto': int(mun.valor_neto or 0),
                    'total_valor_bruto': int(mun.valor_bruto or 0)
                })
            
            # Siempre devolvemos todos los municipios del catálogo (aunque los totales sean 0)
            
            # Ordenar por nombre o código según parámetro
            orden = request.query_params.get('orden', 'nombre')
            if orden == 'codigo':
                result.sort(key=lambda x: x['codigo'])
            else:
                result.sort(key=lambda x: x['nombre'])
            
            return Response({
                'success': True,
                'message': f'Se encontraron {len(result)} municipios con datos para el departamento {departamento_nombre or codigo_departamento}',
                'data': result,
                'departamento': {
                    'codigo': codigo_departamento,
                    'nombre': departamento_nombre
                },
                'filtros_aplicados': {
                    'codigo_departamento': codigo_departamento,
                    'anio': anio,
                    'mes': mes,
                    'fecha_desde': fecha_desde,
                    'fecha_hasta': fecha_hasta,
                    'orden': orden
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResumenGeneralView(APIView):
    """
    Vista para resumen general de todos los datos del sistema
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/tablero9/resumen-general/
        
        Retorna totales generales del sistema
        """
        try:
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
                'success': True,
                'message': 'Resumen general del sistema',
                'resumen_general': {
                    'total_kilos': int(totales['total_kilos'] or 0),
                    'total_cuota_fomento': int(totales['total_cuota_fomento'] or 0),
                    'total_valor_neto': int(totales['total_valor_neto'] or 0),
                    'total_transacciones': totales['total_transacciones'] or 0,
                    'departamentos_con_datos': deptos_con_datos,
                    'municipios_con_datos': municipios_con_datos
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
