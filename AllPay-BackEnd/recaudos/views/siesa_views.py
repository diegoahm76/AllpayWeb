from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import IntegrityError
from datetime import datetime
from decimal import Decimal

from recaudos.models.recaudos_models import Siesa, FacturaUnica
from recaudos.serializers.siesa_serializers import (
    SiesaSerializer,
    SiesaCreateSerializer,
    SiesaUpdateSerializer,
    SiesaListSerializer
)
from reportes.utils import CustomPagination


class SiesaListView(generics.ListAPIView):
    """
    Vista para listar registros de Siesa
    
    GET: Lista todos los registros de Siesa con paginación y filtros
    """
    queryset = Siesa.objects.filter(activo=True).order_by('id')
    permission_classes = [IsAuthenticated]
    serializer_class = SiesaListSerializer
    pagination_class = CustomPagination
    
    def get_queryset(self):
        """
        Filtrar registros según parámetros de búsqueda
        """
        queryset = super().get_queryset()

        # Filtros
        descripcion = self.request.query_params.get('descripcion', None)
        auxiliar = self.request.query_params.get('auxiliar', None)
        compania = self.request.query_params.get('compania', None)
        centro = self.request.query_params.get('centro', None)
        unidad = self.request.query_params.get('unidad', None)
        sucursal = self.request.query_params.get('sucursal', None)
        tipo_documento = self.request.query_params.get('tipo_documento', None)

        # Búsqueda general
        search = self.request.query_params.get('search', None)

        if descripcion:
            queryset = queryset.filter(descripcion__icontains=descripcion)

        if auxiliar:
            queryset = queryset.filter(auxiliar__icontains=auxiliar)

        if compania:
            queryset = queryset.filter(compania__icontains=compania)

        if centro:
            queryset = queryset.filter(centro__icontains=centro)

        if unidad:
            queryset = queryset.filter(unidad__icontains=unidad)

        if sucursal:
            queryset = queryset.filter(sucursal__icontains=sucursal)

        if tipo_documento:
            queryset = queryset.filter(tipo_documento__icontains=tipo_documento)

        if search:
            queryset = queryset.filter(
                Q(descripcion__icontains=search)
                | Q(auxiliar__icontains=search)
                | Q(compania__icontains=search)
                | Q(centro__icontains=search)
                | Q(unidad__icontains=search)
                | Q(sucursal__icontains=search)
                | Q(tipo_documento__icontains=search)
            )

        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Lista registros de Siesa con información adicional
        """
        queryset = self.get_queryset()
        
        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'success': True,
                'detail': 'Registros de Siesa obtenidos correctamente',
                'data': serializer.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'detail': 'Registros de Siesa obtenidos correctamente',
            'data': serializer.data,
            'total': queryset.count()
        }, status=status.HTTP_200_OK)


class SiesaCreateView(generics.CreateAPIView):
    """
    Vista para crear registros de Siesa
    
    POST: Crea un nuevo registro de Siesa
    """
    queryset = Siesa.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = SiesaCreateSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Crea un nuevo registro de Siesa
        """
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                siesa = serializer.save()
                
                return Response({
                    'success': True,
                    'detail': 'Registro de Siesa creado correctamente',
                    'data': SiesaSerializer(siesa).data
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'success': False,
                'detail': 'Error en los datos proporcionados',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except IntegrityError as e:
            # Manejar errores de integridad específicamente
            if 'duplicate key' in str(e).lower():
                return Response({
                    'success': False,
                    'detail': 'Ya existe un registro con esos datos. Por favor, verifica la información.',
                    'error_type': 'duplicate_key'
                }, status=status.HTTP_409_CONFLICT)
            else:
                return Response({
                    'success': False,
                    'detail': f'Error de integridad en la base de datos: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error interno del servidor: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SiesaDetailView(generics.RetrieveDestroyAPIView):
    """
    Vista para obtener y eliminar un registro específico de Siesa
    
    GET: Obtiene un registro específico por ID
    DELETE: Elimina un registro específico
    """
    queryset = Siesa.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    serializer_class = SiesaSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene un registro específico de Siesa
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            return Response({
                'success': True,
                'detail': 'Registro de Siesa obtenido correctamente',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error al obtener el registro: {str(e)}'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def destroy(self, request, *args, **kwargs):
        """
        Desactiva un registro de Siesa (borrado lógico)
        """
        try:
            instance = self.get_object()
            
            # Verificar si ya está desactivado
            if hasattr(instance, 'activo') and not instance.activo:
                return Response({
                    'success': False,
                    'detail': 'El registro ya se encuentra desactivado'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Desactivar en lugar de eliminar
            instance.activo = False
            instance.save()
            
            return Response({
                'success': True,
                'detail': 'Registro desactivado correctamente'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error al desactivar el registro: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SiesaUpdateView(generics.UpdateAPIView):
    """
    Vista para actualizar un registro específico de Siesa
    
    PUT/PATCH: Actualiza un registro específico
    """
    queryset = Siesa.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    serializer_class = SiesaUpdateSerializer


class SiesaBulkCreateView(APIView):
    """
    Vista para crear múltiples registros de Siesa de una vez
    
    POST: Crea múltiples registros de Siesa
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Crea múltiples registros de Siesa
        
        Formato esperado:
        {
            "registros": [
                {
                    "descripcion": "CUOTA DE FOMENTO",
                    "auxiliar": "41150301",
                    "compania": "02",
                    "centro": "025",
                    "unidad": "25",
                    "sucursal": "010"
                },
                ...
            ]
        }
        """
        try:
            registros = request.data.get('registros', [])
            
            if not registros:
                return Response({
                    'success': False,
                    'detail': 'No se proporcionaron registros para crear'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            created_registros = []
            errors = []
            
            for i, registro_data in enumerate(registros):
                serializer = SiesaCreateSerializer(data=registro_data)
                if serializer.is_valid():
                    siesa = serializer.save()
                    created_registros.append(SiesaSerializer(siesa).data)
                else:
                    errors.append({
                        'registro': i + 1,
                        'data': registro_data,
                        'errors': serializer.errors
                    })
            
            if errors:
                return Response({
                    'success': False,
                    'detail': 'Algunos registros no pudieron ser creados',
                    'created': len(created_registros),
                    'errors': errors,
                    'created_data': created_registros
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'detail': f'{len(created_registros)} registros de Siesa creados correctamente',
                'data': created_registros
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error interno del servidor: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SiesaOptionsView(APIView):
    """
    Vista para obtener opciones/información adicional sobre Siesa
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Obtiene información de opciones para formularios
        """
        try:
            # Obtener valores únicos para campos selectivos
            companias = Siesa.objects.values_list('compania', flat=True).distinct().order_by('compania')
            centros = Siesa.objects.values_list('centro', flat=True).distinct().order_by('centro')
            unidades = Siesa.objects.values_list('unidad', flat=True).distinct().exclude(unidad__isnull=True).order_by('unidad')
            sucursales = Siesa.objects.values_list('sucursal', flat=True).distinct().order_by('sucursal')
            tipos_documento = Siesa.objects.values_list('tipo_documento', flat=True).distinct().order_by('tipo_documento')
            
            return Response({
                'success': True,
                'detail': 'Opciones obtenidas correctamente',
                'data': {
                    'companias': list(companias),
                    'centros': list(centros),
                    'unidades': list(unidades),
                    'sucursales': list(sucursales),
                    'tipos_documento': list(tipos_documento),
                    'total_registros': Siesa.objects.count()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error al obtener opciones: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SiesaCompaniaDefaultView(APIView):
    """
    Devuelve la COMPAÑIA del registro Siesa con id=1.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            siesa = Siesa.objects.filter(id=1).first()
            if not siesa:
                return Response({
                    'success': False,
                    'detail': 'No se encontró el registro Siesa con id=1',
                }, status=status.HTTP_404_NOT_FOUND)

            # Respuesta mínima solicitada
            return Response({
                'success': True,
                'COMPAÑIA': siesa.compania
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error al obtener la compañía: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SiesaComprobanteView(APIView):
    """
    Recibe exclusivamente los filtros de "consulta/facturas-unicas" y construye un
    comprobante usando esos datos cuando sea posible. Filtros aceptados por query:
    - tipo_documento
    - numero_documento
    - departamento
    - razon_social
    - municipio
    - factura_unica
    - fecha_inicio (YYYY-MM-DD)
    - fecha_fin (YYYY-MM-DD)
    - search

            Respuesta ejemplo:
    {
      "success": true,
                "Inicial": { "COMPAÑIA": "02" },
                "DocumentoContable": [
                    {
                        "COMPAÑIA": "02",
                        "CONSECUTIVO": "4355" | null,
                        "FECHA DOCUMENTO": "20200131" | null,
                        "TERCERO": "8999999175",
                        "OBSERVACIONES": "FACTURA ÚNICA 4355" | "FACTURAS ÚNICAS RANGO 20250101-20250131" | null
                    }
                ],
                    "Movimientocontable": [
                        {
                            "COMPAÑIA": "02",
                            "TIPO DE DOCUMENTO": "FUN",
                            "Numero de documento": "7133",
                            "Auxiliar de cuenta contable": "41150301",
                            "Tercero": "901577284",
                            "Centro de operación del movimiento": "025",
                            "Unidad de negocio": "25",
                            "Valor debito": 0,
                            "Valor crédito": 323100,
                            "Valor debito libro 2": 0,
                            "Valor crédito libro 2": 323100,
                            "Valor debito libro 3": 0,
                            "Valor crédito libro 3": 323100
                        }
                    ]
                    ,
                    "Final": { "Compañía": "02" }
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            siesa = Siesa.objects.filter(id=1).first()
            if not siesa:
                return Response({
                    'success': False,
                    'detail': 'No se encontró el registro Siesa con id=1',
                }, status=status.HTTP_404_NOT_FOUND)

            # 1) Validar que solo vengan los filtros permitidos
            filtros_permitidos = {
                'tipo_documento', 'numero_documento', 'departamento', 'razon_social',
                'municipio', 'factura_unica', 'fecha_inicio', 'fecha_fin', 'search'
            }
            recibidos = set(request.query_params.keys())
            no_permitidos = [k for k in recibidos if k not in filtros_permitidos]
            if no_permitidos:
                return Response({
                    'success': False,
                    'detail': f'Parámetros no permitidos: {", ".join(sorted(no_permitidos))}.',
                }, status=status.HTTP_400_BAD_REQUEST)

            params = request.query_params

            # 2) Construir queryset de FacturaUnica con los mismos filtros
            qs = FacturaUnica.objects.all().order_by('-fecha_creacion')

            tipo_documento = params.get('tipo_documento')
            numero_documento = params.get('numero_documento')
            departamento = params.get('departamento')
            razon_social = params.get('razon_social')
            municipio = params.get('municipio')
            factura_unica = params.get('factura_unica')
            fecha_inicio = params.get('fecha_inicio')
            fecha_fin = params.get('fecha_fin')
            search = params.get('search')

            if tipo_documento:
                if str(tipo_documento).isdigit():
                    qs = qs.filter(id_persona_recaudador__tipo_documento_id=int(tipo_documento))
                else:
                    qs = qs.filter(id_persona_recaudador__tipo_documento__cod_tipo_documento=tipo_documento)

            if numero_documento:
                qs = qs.filter(id_persona_recaudador__numero_documento__icontains=numero_documento)

            if departamento:
                qs = qs.filter(
                    Q(id_departamento_cacao__nombre__icontains=departamento)
                    | Q(id_departamento_cacao__cod_departamento__icontains=departamento)
                )

            if razon_social:
                qs = qs.filter(
                    Q(id_persona_recaudador__razon_social__icontains=razon_social)
                    | Q(id_persona_recaudador__nombre_comercial__icontains=razon_social)
                    | Q(id_persona_recaudador__primer_nombre__icontains=razon_social)
                    | Q(id_persona_recaudador__segundo_nombre__icontains=razon_social)
                    | Q(id_persona_recaudador__primer_apellido__icontains=razon_social)
                    | Q(id_persona_recaudador__segundo_apellido__icontains=razon_social)
                )

            if municipio:
                qs = qs.filter(
                    Q(id_municipio_cacao__nombre__icontains=municipio)
                    | Q(id_municipio_cacao__cod_municipio__icontains=municipio)
                )

            if factura_unica:
                if str(factura_unica).isdigit():
                    qs = qs.filter(nro_factura_unica=int(factura_unica))
                else:
                    qs = qs.none()

            def parse_date(value):
                try:
                    return datetime.strptime(value, '%Y-%m-%d')
                except Exception:
                    return None

            fi = parse_date(fecha_inicio) if fecha_inicio else None
            ff = parse_date(fecha_fin) if fecha_fin else None
            if fecha_inicio and not fi or fecha_fin and not ff:
                return Response({
                    'success': False,
                    'detail': 'Las fechas deben estar en formato YYYY-MM-DD',
                }, status=status.HTTP_400_BAD_REQUEST)

            if fi:
                qs = qs.filter(fecha_compra__date__gte=fi.date())
            if ff:
                qs = qs.filter(fecha_compra__date__lte=ff.date())

            if search:
                qs = qs.filter(
                    Q(nro_factura_unica__icontains=search)
                    | Q(id_persona_recaudador__numero_documento__icontains=search)
                    | Q(id_persona_recaudador__razon_social__icontains=search)
                    | Q(id_municipio_cacao__nombre__icontains=search)
                    | Q(id_departamento_cacao__nombre__icontains=search)
                )

            # 3) Armar DocumentoContable: un item por factura
            def normalizar_fecha_dt(dt: datetime | None) -> str | None:
                if not dt:
                    return None
                return dt.strftime('%Y%m%d')

            def mes_nombre_es(dt: datetime) -> str:
                meses = [
                    'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                    'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
                ]
                return meses[dt.month - 1]

            documentos = []
            for f in qs.iterator():
                # Determinar fecha documento: preferir ff, luego fi, si no usar fecha_compra
                fecha_base = ff or fi or (f.fecha_compra and datetime.combine(f.fecha_compra, datetime.min.time()))
                fecha_norm = normalizar_fecha_dt(fecha_base) if fecha_base else None
                # Observaciones por mes/año
                if fecha_base:
                    obs = f'CUOTA DE FOMENTO {mes_nombre_es(fecha_base)} {fecha_base.year}'
                else:
                    # si no hay fechas, se usa mes actual
                    now_dt = datetime.now()
                    obs = f'CUOTA DE FOMENTO {mes_nombre_es(now_dt)} {now_dt.year}'

                documentos.append({
                    'COMPAÑIA': siesa.compania,
                    'CONSECUTIVO': str(f.nro_factura_unica),
                    'FECHA DOCUMENTO': fecha_norm,
                    'TERCERO': '8999999175',
                    'OBSERVACIONES': obs,
                })

            # 4) Armar Movimientocontable: un item por factura
            # Helper: calcular mes_recaudo igual a ConsultaFacturasUnicas
            def calcular_mes_recaudo(factura: FacturaUnica) -> str:
                # Preferir fecha de pago de la liquidación, de lo contrario fecha_compra
                fecha = None
                if getattr(factura, 'id_liq_factura_unica', None) and getattr(factura.id_liq_factura_unica, 'fecha_pago', None):
                    fecha = factura.id_liq_factura_unica.fecha_pago
                else:
                    fecha = factura.fecha_compra

                meses = [
                    'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                    'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
                ]
                # Regla 11 al 10: si el día es <= 10, corresponde al mes anterior
                mes_idx = fecha.month if fecha.day >= 11 else (12 if fecha.month == 1 else fecha.month - 1)
                return meses[mes_idx - 1]

            movimientos = []
            for f in qs.iterator():
                cuota = f.cuota_fomento if f.cuota_fomento is not None else Decimal('0')
                tercero_doc = getattr(f.id_persona_recaudador, 'numero_documento', None)
                mes_recaudo = calcular_mes_recaudo(f)
                movimientos.append({
                    'COMPAÑIA': siesa.compania,
                    'TIPO DE DOCUMENTO': siesa.tipo_documento,
                    'Numero de documento': str(f.nro_factura_unica),
                    'Auxiliar de cuenta contable': siesa.auxiliar,
                    'Tercero': tercero_doc,
                    'Centro de operación del movimiento': siesa.centro,
                    'Unidad de negocio': siesa.unidad,
                    'Valor debito': Decimal('0'),
                    'Valor crédito': cuota,
                    'Valor debito libro 2': Decimal('0'),
                    'Valor crédito libro 2': cuota,
                    'Valor debito libro 3': Decimal('0'),
                    'Valor crédito libro 3': cuota,
                    'mes_pago': mes_recaudo,
                })

            # 5) Armar MovimientoCxC: un item por factura
            siesa_id3 = Siesa.objects.filter(id=3).first()
            auxiliar_id3 = siesa_id3.auxiliar if siesa_id3 and siesa_id3.auxiliar else siesa.auxiliar

            def fecha_yyyymmdd_from_datetime(dt: datetime | None) -> str | None:
                if not dt:
                    return None
                return dt.strftime('%Y%m%d')

            movimiento_cxc = []
            for f in qs.iterator():
                cuota = f.cuota_fomento if f.cuota_fomento is not None else Decimal('0')
                tercero_recaudador = getattr(f.id_persona_recaudador, 'numero_documento', None)
                fecha_compra_norm = fecha_yyyymmdd_from_datetime(f.fecha_compra)
                # Mes que se está pagando
                mes_txt = mes_nombre_es(f.fecha_compra) if f.fecha_compra else mes_nombre_es(datetime.now())
                mes_recaudo = calcular_mes_recaudo(f)

                movimiento_cxc.append({
                    'Compañía': siesa.compania,
                    'Centro de operación del documento': siesa.centro,
                    'Tipo de documento': siesa.tipo_documento,
                    'Numero de documento 00': str(f.nro_factura_unica),
                    'Auxiliar de cuenta contable': auxiliar_id3,
                    'Tercero': tercero_recaudador,
                    'Centro de operación del movimiento': siesa.centro,
                    'Unidad de negocio': siesa.unidad,
                    'Valor debito': cuota,
                    'Valor crédito': Decimal('0'),
                    'Valor debito libro 2': cuota,
                    'Valor crédito libro 2': Decimal('0'),
                    'Observaciones del movimiento': mes_txt,
                    'mes_recaudo': mes_recaudo,
                    'Sucursal cliente': siesa.sucursal,
                    'Numero de documento de cruce': str(f.nro_factura_unica),
                    'Fecha de vencimiento del documento': fecha_compra_norm,
                    'Fecha de pronto pago del documento': fecha_compra_norm,
                    'Tercero vendedor': '8999999175',
                    'Fecha del documento de cruce': fecha_compra_norm,
                    'Fecha de radicacion': fecha_compra_norm,
                })

            respuesta = {
                'success': True,
                'Inicial': {
                    'COMPAÑIA': siesa.compania
                },
                'DocumentoContable': documentos,
                'Movimientocontable': movimientos,
                'MovimientoCxC': movimiento_cxc,
                'Final': {
                    'Compañía': siesa.compania
                }
            }

            return Response(respuesta, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error al generar comprobante: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
