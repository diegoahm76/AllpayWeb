from datetime import datetime
from django.db.models import Q, Sum
from decimal import Decimal
from django.utils.timezone import now
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from recaudos.models.recaudos_models import FacturaUnica, PorcentajesCobro, FechasCierre, ComprasNoEfectuadas
from recaudos.serializers.consulta_facturas_serializers import (
    FacturaUnicaConsultaSerializer, ComprasNoEfectuadasSerializer,
)
from reportes.utils import CustomPagination
from seguridad.models.transversal_models import Personas
from seguridad.models.seguridad_models import User
from django.shortcuts import get_object_or_404


class ConsultaFacturasUnicasView(generics.ListAPIView):
    """
    Consulta de Facturas Únicas con filtros del formulario.

    Filtros soportados por query string:
    - tipo_documento: puede ser
        - id numérico del tipo de documento, o
        - código del tipo (CodTipoDocumentoID), p. ej.: CC, CE, NT, TI, etc.
    - numero_documento: documento del recaudador
    - departamento: nombre o id del departamento (flexible)
    - razon_social | nombre_proveedor: razón social o nombre del recaudador (ambos admitidos)
    - municipio: nombre o id del municipio
    - factura_unica: número de la factura única
    - fecha_inicio: YYYY-MM-DD
    - fecha_fin: YYYY-MM-DD
    - search: búsqueda general
    """

    permission_classes = [IsAuthenticated]
    serializer_class = FacturaUnicaConsultaSerializer
    pagination_class = CustomPagination

    def get_queryset(self):
        qs = (
            FacturaUnica.objects.select_related(
                "id_persona_recaudador",
                "id_municipio_cacao",
                "id_departamento_cacao",
                "id_liq_factura_unica",
            )
            .all()
            .order_by("-fecha_creacion")
        )

        params = self.request.query_params

        tipo_documento = params.get("tipo_documento")
        numero_documento = params.get("numero_documento")
        departamento = params.get("departamento")
        razon_social = params.get("razon_social")
        # Alias: permitir nombre_proveedor como sinónimo de razon_social
        nombre_proveedor = params.get("nombre_proveedor")
        if not razon_social and nombre_proveedor:
            razon_social = nombre_proveedor
        municipio = params.get("municipio")
        factura_unica = params.get("factura_unica")
        fecha_inicio = params.get("fecha_inicio")
        fecha_fin = params.get("fecha_fin")
        search = params.get("search")

        if tipo_documento:
            # Si es numérico, filtra por id. Si es texto, filtra por el código (CodTipoDocumentoID)
            if str(tipo_documento).isdigit():
                qs = qs.filter(id_persona_recaudador__tipo_documento_id=int(tipo_documento))
            else:
                qs = qs.filter(
                    id_persona_recaudador__tipo_documento__cod_tipo_documento__iexact=tipo_documento
                )

        if numero_documento:
            qs = qs.filter(id_persona_recaudador__numero_documento__icontains=numero_documento)

        if departamento:
            qs = qs.filter(
                Q(id_departamento_cacao__nombre__icontains=departamento)
                | Q(id_departamento_cacao__cod_departamento__icontains=departamento)
            )

        if razon_social:
            # Permitir búsqueda por nombre completo dividiendo en palabras y exigiendo que
            # cada palabra aparezca en alguno de los campos del recaudador.
            tokens = [t.strip() for t in razon_social.split() if t.strip()]
            for t in tokens:
                qs = qs.filter(
                    Q(id_persona_recaudador__razon_social__icontains=t)
                    | Q(id_persona_recaudador__nombre_comercial__icontains=t)
                    | Q(id_persona_recaudador__primer_nombre__icontains=t)
                    | Q(id_persona_recaudador__segundo_nombre__icontains=t)
                    | Q(id_persona_recaudador__primer_apellido__icontains=t)
                    | Q(id_persona_recaudador__segundo_apellido__icontains=t)
                )

        if municipio:
            qs = qs.filter(
                Q(id_municipio_cacao__nombre__icontains=municipio)
                | Q(id_municipio_cacao__cod_municipio__icontains=municipio)
            )

        if factura_unica:
            # Campo entero: si el valor es numérico se filtra exacto
            if str(factura_unica).isdigit():
                qs = qs.filter(nro_factura_unica=int(factura_unica))
            else:
                # Si no es numérico, no aplica filtro para evitar errores de tipo
                qs = qs.none()

        # Rango de fechas en fecha_compra y/o fecha_creacion
        def parse_date(value):
            try:
                return datetime.strptime(value, "%Y-%m-%d")
            except Exception:
                return None

        if fecha_inicio:
            fi = parse_date(fecha_inicio)
            if fi:
                qs = qs.filter(fecha_compra__date__gte=fi.date())

        if fecha_fin:
            ff = parse_date(fecha_fin)
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

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Optimizar context compartido para cálculo de intereses
        tasa_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha="PI").first()

        # Totales globales del queryset filtrado
        total_cuota_fomento_db = queryset.aggregate(total=Sum("cuota_fomento")).get("total") or Decimal("0.00")

        # Cálculo de intereses total con misma regla del serializer
        def fecha_limite_pago(fecha_compra):
            dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
            siguiente_mes = fecha_compra.month + 1 if fecha_compra.month < 12 else 1
            anio = fecha_compra.year if siguiente_mes > 1 else fecha_compra.year + 1
            # Ajuste por meses con menos días
            for d in range(dia_limite, 27, -1):
                try:
                    return datetime(anio, siguiente_mes, d)
                except ValueError:
                    continue
            return datetime(anio, siguiente_mes, 28)

        tasa_valor = Decimal(str(tasa_dian.valor)) if tasa_dian and tasa_dian.valor is not None else Decimal("0")
        hoy = now().date()
        total_intereses_sum = Decimal("0")
        for f in queryset.iterator():
            cf = Decimal(str(f.cuota_fomento)) if f.cuota_fomento is not None else Decimal("0")
            if cf <= 0:
                continue
            fl = fecha_limite_pago(f.fecha_compra).date()
            dias = (hoy - fl).days
            if dias <= 0:
                continue
            intereses = (cf * tasa_valor * Decimal(dias)) / Decimal("365")
            total_intereses_sum += intereses

        total_intereses_sum = total_intereses_sum.quantize(Decimal("0.01"))

        page = self.paginate_queryset(queryset)
        serializer_context = {"tasa_dian": tasa_dian, "fecha_cierre": fecha_cierre}

        if page is not None:
            serializer = self.get_serializer(page, many=True, context=serializer_context)
            return self.get_paginated_response({
                "success": True,
                "detail": "Consulta realizada correctamente",
                "data": serializer.data,
                "total_cuota_fomento": total_cuota_fomento_db,
                "total_intereses": total_intereses_sum,
            })

        serializer = self.get_serializer(queryset, many=True, context=serializer_context)
        return Response({
            "success": True,
            "detail": "Consulta realizada correctamente",
            "data": serializer.data,
            "total": queryset.count(),
            "total_cuota_fomento": total_cuota_fomento_db,
            "total_intereses": total_intereses_sum,
        }, status=status.HTTP_200_OK)


class ComprasNoEfectuadasViews(APIView):
    serializer_class = ComprasNoEfectuadasSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):
        usuario = get_object_or_404(User, id_usuario=request.user.id_usuario)
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']
        id_recaudador = request.query_params.get('id_recaudador', None)
        registros = ComprasNoEfectuadas.objects.all().order_by('-fecha_actualizacion')

        if id_recaudador:
            registros = registros.filter(id_recaudador__id_persona=id_recaudador)

        if usuario.tipo_usuario == 'E':
            persona = get_object_or_404(Personas, id_persona=usuario.persona.id_persona)
            registros = registros.filter(id_recaudador=persona.id_persona)

        if sin_paginacion:
            serializer = self.serializer_class(registros, many=True)
            return Response({
                "success": True,
                "detail": "Registros encontrados.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        else:
            paginator = self.pagination_class()
            paginated_registros = paginator.paginate_queryset(registros, request)
            serializer = self.serializer_class(paginated_registros, many=True)
            data = serializer.data

            return paginator.get_paginated_response({
                "success": True,
                "detail": "Registros encontrados.",
                "data": data
            })

    def post(self, request):
        usuario = get_object_or_404(User, id_usuario=request.user.id_usuario)
        data = request.data
        
        if usuario.tipo_usuario == 'E':
            persona = get_object_or_404(Personas, id_persona=usuario.persona.id_persona)
            data['id_recaudador'] = persona.id_persona

        serializer = self.serializer_class(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "detail" : "Creado correctamente", "data": serializer.data}, status=status.HTTP_201_CREATED)

        return Response({"success": False, "detail" : "Errores al momento de crear", "data": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        compra = get_object_or_404(ComprasNoEfectuadas, id_no_compras=pk)
        usuario = get_object_or_404(User, id_usuario=request.user.id_usuario)
        data = request.data.copy() 
        
        if usuario.tipo_usuario == 'E':
            persona = get_object_or_404(Personas, id_persona=usuario.persona.id_persona)
            data['id_recaudador'] = persona.id_persona
        serializer = self.serializer_class(compra, data=data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True, 
                "detail": "Actualizado correctamente", 
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "success": False, 
            "detail": "Error al actualizar",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ComprasNoEfectuadasByIdViews(APIView):
    serializer_class = ComprasNoEfectuadasSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        usuario = get_object_or_404(User, id_usuario=request.user.id_usuario)
        registro = get_object_or_404(ComprasNoEfectuadas, id_no_compras=pk)
        
        if usuario.tipo_usuario == 'E':
            persona = get_object_or_404(Personas, id_persona=usuario.persona.id_persona)
            if registro.id_recaudador.id_persona != persona.id_persona:
                return Response({"success": False, "detail" : "No tiene permiso para ver este registro"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.serializer_class(registro, many=False)
        
        return Response({"success": True, "detail" : "Resultado encontrado", "data": serializer.data}, status=status.HTTP_200_OK)

        
