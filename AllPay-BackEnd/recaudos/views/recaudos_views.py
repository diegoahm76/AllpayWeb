import base64
import datetime
from decimal import Decimal
from io import BytesIO
import json
import math
import unicodedata
import boto3
import locale
from unidecode import unidecode
import uuid
from barcode import Code128
from barcode.writer import ImageWriter
from django.db.models.functions import Lower
from django.utils import timezone
from datetime import datetime, timedelta
from django.conf import settings
from django.forms import ValidationError
from django.utils.timezone import make_aware
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from permissions.permissions_gestor_de_recaudadores import  PermisoActualizarAprobacionRecaudadorAcuerdosDePago, PermisoActualizarAprobarAcuerdosDePagoDireccion, PermisoActualizarAprobarAcuerdosDePagoJurdica, PermisoActualizarConfiguracionFechasLimite, PermisoActualizarConfiguracionPorcentajesCobro, PermisoActualizarConfiguracionTiposCacao, PermisoActualizarGestionarAcuerdosDePago, PermisoActualizarNotificarAcuerdosDePago, PermisoConsultarAcuerdosDePago, PermisoConsultarAdministracionAcuerdosDePago, PermisoConsultarAprobacionRecaudadorAcuerdosDePago, PermisoConsultarAprobarAcuerdosDePagoDireccion, PermisoConsultarAprobarAcuerdosDePagoJurdica, PermisoConsultarConfiguracionFechasLimite, PermisoConsultarConfiguracionPorcentajesCobro, PermisoConsultarConfiguracionTiposCacao, PermisoConsultarCuotasPagadasAcuerdoPagoExterno, PermisoConsultarGestionarAcuerdosDePago, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno, PermisoConsultarNotificarAcuerdosDePago, PermisoCrearConfiguracionFechasLimite, PermisoCrearConfiguracionPorcentajesCobro, PermisoCrearConfiguracionTiposCacao, PermisoCrearLiquidacionCuotasAcuerdoPagoExterno, PermisoCrearLiquidacionCuotasAcuerdoPagoInterno, PermisoCrearSolicitudAcuerdosDePago, PermisoEliminarConfiguracionTiposCacao, PermisoEliminarGestionarAcuerdosDePago
from permissions.permissions_gestor_de_deudores import  PermisoACrearLiquidacionCuotaFomento, PermisoActualizarRegistroCompraCacao, PermisoActualizarRegistroCompraCacaoInterno, PermisoConsultaLiquidacionCuotaFomento, PermisoConsultarCuotasPagadasInterno, PermisoCrearRegistroCompraCacao, PermisoCrearRegistroCompraCacaoInterno
from recaudos.models.acuerdos_pago_models import CuotasAcuerdoPago, DetalleAcuerdoPago, PlanesPago, SolicitudAcuerdosPago
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.models.recaudos_models import DetallesFacturaUnica, FacturaUnica, FechasCierre, HistorialPorcentajesCobro, LiquidacionesFacturaUnica, PorcentajesCobro, TiposCacao, CargueSicex
from recaudos.serializers.acuerdospago_serializers import CuotaAcuerdoPagoSerializer, LiquidacionSerializer, PlanPagoSerializer
from recaudos.serializers.documentos_serializers import DocumentosGeneradosSerializer
from recaudos.serializers.tipos_cacao_serializers import DetallesFacturaUnicaSerializer, FacturaUnicaSerializer, FechasCierreAllSerializer, FechasCierreSerializer, HistorialPorcentajesCobroSerializer, LiquidacionFacturaSerializer, PersonaProveedorSerializer, PorcentajesCobroAllSerializer, PorcentajesCobroSerializer, SolicitudAcuerdoPagoSerializer, TiposCacaoSerializer, CargueSicexSerializer
from recaudos.utils import Utils
from recaudos.views import cartera_view
from recaudos.views.documentos_views import GeneradorDocumentosView
from seguridad.models.alertas_models import ConfiguracionClaseAlerta
from seguridad.models.seguridad_models import User
from seguridad.models.transversal_models import Departamento, Municipio, Personas
from recaudos.choices.cod_estado_acuerdo_choices import cod_estado_acuerdo_CHOICES
from seguridad.utils import Util
from seguridad.views.personas_views import CustomPagination
from django.db.models import Q
from django.db.models import Sum, F
from datetime import datetime
from recaudos.choices.cod_estado_choices import cod_estado_CHOICES
from django.utils.timezone import now
from django.db import transaction
from recaudos.models.recaudos_models import cod_tipo_comprador_CHOICES, Pagos
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.storage import default_storage
import pandas as pd
import openpyxl
from django.db.models import Max, Min, Count
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.utils.dateparse import parse_date
from django.core.files.storage import default_storage
from django.core.files import File
from dateutil.relativedelta import relativedelta
from recaudos.choices.cod_tipo_cobro_choices import cod_tipo_cobro_CHOICES
from recaudos.models.recaudos_models import Pagos
from recaudos.views.pagos_views import PagosWebhookView
from django.core.serializers.json import DjangoJSONEncoder


# Definir tamaño máximo de archivos (10MB)
max_file_size = settings.FILE_UPLOAD_MAX_MEMORY_SIZE

class GenerarFacturaUnicaNacionalZipView(APIView):
    permission_classes = [IsAuthenticated]

    # POST: recibir lista explícita de N números de factura
    def post(self, request):
        """
        Recibe JSON con 'nros_factura': lista de números de factura (cantidad variable).
        Genera los PDFs de la 'Factura Única Nacional' para esos números, los comprime
        en un ZIP, sube el ZIP a S3 y retorna el enlace de descarga.
        """
        try:
            data = request.data if isinstance(request.data, dict) else {}
            nros = data.get('nros_factura') or data.get('nros') or data.get('facturas')
            if not isinstance(nros, list):
                return Response({"success": False, "detail": "Debe enviar un arreglo 'nros_factura'."},
                                status=status.HTTP_400_BAD_REQUEST)
            if len(nros) == 0:
                return Response({"success": False, "detail": "Debe enviar al menos un número de factura."},
                                status=status.HTTP_400_BAD_REQUEST)
            try:
                nros = [int(x) for x in nros]
            except Exception:
                return Response({"success": False, "detail": "Todos los elementos de 'nros_factura' deben ser enteros."},
                                status=status.HTTP_400_BAD_REQUEST)

            plantilla = PlantillasDoc.objects.filter(nombre="Factura Unica Nacional").first()
            if not plantilla:
                return Response({
                    "success": False,
                    "detail": "No existe la plantilla 'Factura Unica Nacional' en la base de datos."
                }, status=status.HTTP_400_BAD_REQUEST)

            facturas = list(FacturaUnica.objects.filter(nro_factura_unica__in=nros).order_by('nro_factura_unica'))
            faltantes = sorted(list(set(nros) - set([f.nro_factura_unica for f in facturas])))
            if faltantes:
                return Response({
                    "success": False,
                    "detail": f"No se encontraron las siguientes facturas: {faltantes}"
                }, status=status.HTTP_404_NOT_FOUND)

            ids_documentos = []
            for factura in facturas:
                variables = self._construir_variables_factura(factura)
                id_doc = cartera_view.obtener_url_documento(request, plantilla.id_plantilla_doc, variables, True) 
                if not id_doc:
                    return Response({
                        "success": False,
                        "detail": f"No se pudo generar documento para la factura {factura.nro_factura_unica}."
                    }, status=status.HTTP_400_BAD_REQUEST)
                ids_documentos.append(id_doc)

            s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            from zipfile import ZipFile  # import local para evitar conflictos
            import os
            import uuid as _uuid

            zip_buffer = BytesIO()
            with ZipFile(zip_buffer, 'w') as zip_out:
                for id_doc in ids_documentos:
                    doc = DocumentosGenerados.objects.filter(id_documento_generado=id_doc).first()
                    if not doc or not doc.documento_generado:
                        return Response({
                            "success": False,
                            "detail": f"Documento generado {id_doc} no encontrado o sin archivo PDF."
                        }, status=status.HTTP_400_BAD_REQUEST)

                    s3_key = doc.documento_generado.name
                    pdf_bytes = BytesIO()
                    s3.download_fileobj(settings.AWS_STORAGE_BUCKET_NAME, s3_key, pdf_bytes)
                    pdf_bytes.seek(0)

                    nombre_pdf = os.path.basename(s3_key)
                    zip_out.writestr(nombre_pdf, pdf_bytes.read())

            zip_buffer.seek(0)

            cantidad_facturas = len(facturas)
            zip_s3_key = f"documentos_zip/factura_unica_custom_x{cantidad_facturas}_{_uuid.uuid4()}.zip"
            s3.upload_fileobj(zip_buffer, settings.AWS_STORAGE_BUCKET_NAME, zip_s3_key, ExtraArgs={'ContentType': 'application/zip'})

            url_descarga = Util.obtener_archivos(zip_s3_key)

            return Response({
                "success": True,
                "detail": "ZIP generado correctamente",
                "facturas_encontradas": [f.nro_factura_unica for f in facturas],
                "archivo_zip": zip_s3_key,
                "url_descarga": url_descarga
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"success": False, "detail": f"Error generando ZIP: {str(e)}"},
                            status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, nro_factura: int):
        """
        Genera los PDF de la 'Factura Única Nacional' para 10 facturas consecutivas
        iniciando en 'nro_factura', comprime todo en un ZIP (compatible con WinRAR),
        lo sube a S3 y retorna el enlace de descarga.
        """
        try:
            # 1) Buscar plantilla por nombre
            plantilla = PlantillasDoc.objects.filter(nombre="Factura Unica Nacional").first()
            if not plantilla:
                return Response({
                    "success": False,
                    "detail": "No existe la plantilla 'Factura Unica Nacional' en la base de datos."
                }, status=status.HTTP_400_BAD_REQUEST)

            # 2) Buscar las 10 facturas consecutivas
            numeros = [nro_factura + i for i in range(10)]
            facturas = list(FacturaUnica.objects.filter(nro_factura_unica__in=numeros).order_by('nro_factura_unica'))
            if not facturas:
                return Response({"success": False, "detail": "No se encontraron facturas con el rango solicitado."},
                                status=status.HTTP_404_NOT_FOUND)

            # 3) Generar documentos PDF por factura usando el motor de plantillas existente
            ids_documentos = []
            for factura in facturas:
                variables = self._construir_variables_factura(factura)
                # Generar documento y convertir a PDF
                id_doc = cartera_view.obtener_url_documento(request, plantilla.id_plantilla_doc, variables, True)
                if not id_doc:
                    return Response({
                        "success": False,
                        "detail": f"No se pudo generar documento para la factura {factura.nro_factura_unica}."
                    }, status=status.HTTP_400_BAD_REQUEST)
                ids_documentos.append(id_doc)

            # 4) Descargar PDFs desde S3 y crear ZIP en memoria
            s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            zip_buffer = BytesIO()
            with ZipFile(zip_buffer, 'w') as zip_out:
                for id_doc in ids_documentos:
                    doc = DocumentosGenerados.objects.filter(id_documento_generado=id_doc).first()
                    if not doc or not doc.documento_generado:
                        return Response({
                            "success": False,
                            "detail": f"Documento generado {id_doc} no encontrado o sin archivo PDF."
                        }, status=status.HTTP_400_BAD_REQUEST)

                    s3_key = doc.documento_generado.name
                    pdf_bytes = BytesIO()
                    s3.download_fileobj(settings.AWS_STORAGE_BUCKET_NAME, s3_key, pdf_bytes)
                    pdf_bytes.seek(0)

                    nombre_pdf = os.path.basename(s3_key)
                    zip_out.writestr(nombre_pdf, pdf_bytes.read())

            zip_buffer.seek(0)

            # 5) Subir ZIP a S3 y retornar URL firmada
            zip_s3_key = f"documentos_zip/factura_unica_{nro_factura}_x10_{uuid.uuid4()}.zip"
            s3.upload_fileobj(zip_buffer, settings.AWS_STORAGE_BUCKET_NAME, zip_s3_key, ExtraArgs={'ContentType': 'application/zip'})

            url_descarga = Util.obtener_archivos(zip_s3_key)

            return Response({
                "success": True,
                "detail": "ZIP generado correctamente",
                "nro_factura_inicial": nro_factura,
                "facturas_encontradas": [f.nro_factura_unica for f in facturas],
                "archivo_zip": zip_s3_key,
                "url_descarga": url_descarga
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"success": False, "detail": f"Error generando ZIP: {str(e)}"},
                            status=status.HTTP_400_BAD_REQUEST)

    def _construir_variables_factura(self, factura: FacturaUnica) -> dict:
        """
        Construye un conjunto de variables genéricas para la plantilla de
        'Factura Unica Nacional' a partir del modelo FacturaUnica.
        Si la plantilla requiere otros nombres de campos, ajustarlos aquí.
        """
        proveedor = factura.id_persona_proveedor
        recaudador = factura.id_persona_recaudador
        municipio = factura.id_municipio_cacao
        departamento = factura.id_departamento_cacao

        # Nombres amigables
        def nombre_persona(persona):
            if not persona:
                return ""
            if getattr(persona, "tipo_persona", None) == "J":
                return (persona.razon_social or persona.nombre_comercial or "").strip()
            pn = getattr(persona, "primer_nombre", "") or ""
            sn = getattr(persona, "segundo_nombre", "") or ""
            pa = getattr(persona, "primer_apellido", "") or ""
            sa = getattr(persona, "segundo_apellido", "") or ""
            return f"{pn} {sn} {pa} {sa}".strip()

        proveedor_nombre = nombre_persona(proveedor)
        recaudador_nombre = nombre_persona(recaudador)

        # Datos de contacto recaudador
        direccion_recaudador = getattr(recaudador, "direccion_notificaciones", "") or getattr(recaudador, "direccion_residencia", "") or getattr(recaudador, "direccion_laboral", "") or ""
        # Preferencia de ciudad: notificación -> residencia -> laboral
        ciudad_recaudador = ""
        if getattr(recaudador, "cod_municipio_notificacion_nal", None):
            ciudad_recaudador = getattr(recaudador.cod_municipio_notificacion_nal, "nombre", "") or ""
        elif getattr(recaudador, "municipio_residencia", None):
            ciudad_recaudador = getattr(recaudador.municipio_residencia, "nombre", "") or ""
        elif getattr(recaudador, "cod_municipio_laboral_nal", None):
            ciudad_recaudador = getattr(recaudador.cod_municipio_laboral_nal, "nombre", "") or ""

        telefono_recaudador = getattr(recaudador, "telefono_celular", None) or getattr(recaudador, "telefono_celular_empresa", None) or getattr(recaudador, "telefono_empresa", None) or getattr(recaudador, "telefono_empresa_2", None) or ""
        email_recaudador = getattr(recaudador, "email", None) or getattr(recaudador, "email_empresarial", None) or ""

        # Tipo de comprador (checkbox X)
        tcp = tce = tcc = ""  # Procesador / Exportador / Comerciante
        tipo_comprador = (getattr(recaudador, "cod_tipo_comprador", None) or "").upper()
        if tipo_comprador in ("P", "PR", "PROC", "PROCESADOR"):
            tcp = "X"
        elif tipo_comprador in ("E", "EXP", "EXPORTADOR"):
            tce = "X"
        elif tipo_comprador in ("C", "COM", "COMERCIANTE"):
            tcc = "X"

        # Fecha desglosada
        if factura.fecha_compra:
            dia = factura.fecha_compra.day
            mes = factura.fecha_compra.strftime("%B")  # nombre de mes
            anio = factura.fecha_compra.year
        else:
            dia = ""
            mes = ""
            anio = ""

        # Detalle de la compra (items)
        detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
        items = []
        for d in detalles:
            kilos = float(d.nro_kilos or 0)
            precio = float(d.valor_kilo or 0)
            valor_bruto_item = round(kilos * precio, 2)
            # La plantilla muestra 3%: usar total configurado si existe, pero por item estimamos 3%
            cuota_fomento_item = round(valor_bruto_item * 0.03, 2)
            valor_neto_item = round(valor_bruto_item - cuota_fomento_item, 2)
            items.append({
                "tipocacao": getattr(d.id_tipo_cacao, "nombre", ""),
                "kilos": f"{kilos:,.2f}",
                "preciokilo": f"{precio:,.2f}",
                "valorbruto": f"{valor_bruto_item:,.2f}",
                "cuotafomento": f"{cuota_fomento_item:,.2f}",
                "valorneto": f"{valor_neto_item:,.2f}",
            })

        # Subtotales (usar totales de la factura)
        subtotalkilos = f"{float(factura.total_kilos):,.2f}" if factura.total_kilos is not None else "0.00"
        subtotalvalorbruto = f"{float(factura.valor_bruto):,.2f}" if factura.valor_bruto is not None else "0.00"
        totalcuotafomento = f"{float(factura.cuota_fomento):,.2f}" if factura.cuota_fomento is not None else "0.00"
        totalvalorneto = f"{float(factura.valor_neto):,.2f}" if factura.valor_neto is not None else "0.00"

        # Variables esperadas por la plantilla “Factura Unica Nacional”
        variables_plantilla = {
            # Encabezado y datos recaudador
            "dia": dia,
            "mes": mes,
            "año": anio,
            "razonsocialrecaudador": recaudador_nombre,
            "ndocumentorecaudador": getattr(recaudador, "numero_documento", "") or "",
            "direccionrecaudador": direccion_recaudador,
            "ciudadrecaudador": ciudad_recaudador,
            "numerofactura": factura.nro_factura_unica,
            "telefonorecaudador": telefono_recaudador,
            "emailrecaudador": email_recaudador,

            # Tipo de comprador (checkbox X)
            "tcp": tcp,  # PROCESADOR
            "tce": tce,  # EXPORTADOR
            "tcc": tcc,  # COMERCIANTE

            # Datos del proveedor
            "documentoproveedor": getattr(proveedor, "numero_documento", "") or "",
            "nombreproveedor": proveedor_nombre,
            "ndocsoporte": factura.nro_documento_soporte or "",

            # Procedencia
            "departamento": getattr(departamento, 'nombre', "") if departamento else "",
            "municipio": getattr(municipio, 'nombre', "") if municipio else "",
            "nombre_vereda": factura.nombre_vereda or "",
            "nombre_finca": factura.nombre_finca or "",

            # Detalle e importes
            "items": items,
            "subtotalkilos": subtotalkilos,
            "subtotalvalorbruto": subtotalvalorbruto,
            "totalcuotafomento": totalcuotafomento,
            "totalvalorneto": totalvalorneto,
        }

        # Aliases de compatibilidad con otros usos previos
        variables_compat = {
            "numero_factura": factura.nro_factura_unica,
            "fecha_compra": factura.fecha_compra.strftime('%Y-%m-%d') if factura.fecha_compra else "",
            "total_kilos": subtotalkilos,
            "valor_bruto": subtotalvalorbruto,
            "cuota_fomento": totalcuotafomento,
            "valor_neto": totalvalorneto,
            "proveedor": proveedor_nombre,
            "recaudador": recaudador_nombre,
        }

        return {**variables_plantilla, **variables_compat}

# Definir extensiones permitidas
ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"]
ALLOWED_DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]
ALLOWED_EXCEL_EXTENSIONS = ["xlsx", "xls"]

def validate_file(file, allowed_extensions):    

    # Validar tamaño
    if file.size > max_file_size:
        tamaño_total = {max_file_size / (1024 * 1024)}
        raise ValidationError(f"El archivo {file.name} es demasiado grande. Tamaño máximo permitido: {tamaño_total}MB.")


    # Validar extensión
    extension = file.name.split('.')[-1].lower()
    if extension not in allowed_extensions:
        raise ValidationError(f"Formato de archivo no permitido para {file.name}. Extensiones permitidas: {', '.join(allowed_extensions)}")
    
#Funcion para formatear fecha
def formatear_fecha(fecha):
    if isinstance(fecha, datetime):
        return fecha.strftime('%d-%m-%Y')
    elif isinstance(fecha, str):
        try:
            fecha = datetime.strptime(fecha, '%Y-%m-%d')
            return fecha.strftime('%d-%m-%Y')
        except ValueError:
            return fecha
    return None


#Tipos de cacao
class TiposCacaoGetCreateView(generics.CreateAPIView):
    serializer_class = TiposCacaoSerializer
    def get_permissions(self):
        # Asignar permisos según el método HTTP
        if self.request.method == 'GET':
            return [IsAuthenticated(), PermisoConsultarConfiguracionTiposCacao()]
        elif self.request.method == 'POST':
            return [IsAuthenticated(), PermisoCrearConfiguracionTiposCacao()]
        return [IsAuthenticated()]
    
    #Obtener tipo de cacao
    def get(self, request):
        queryset = TiposCacao.objects.order_by('id_tipo_cacao')

        if queryset.exists():  
            serializer = self.serializer_class(queryset, many=True)
            return Response({
                'success': True,
                'detail': 'Se encontraron los siguientes tipos de cacao',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron tipos de cacao',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

    #Crear tipo de cacao
    def post(self, request, *args, **kwargs):
        tipo_cacao_data = request.data.copy()

        # Validar valores mínimo y máximo si vienen en el request
        valor_minimo = tipo_cacao_data.get('valor_minimo')
        valor_maximo = tipo_cacao_data.get('valor_maximo')
        if valor_minimo is not None and valor_maximo is not None:
            try:
                valor_minimo = float(valor_minimo)
                valor_maximo = float(valor_maximo)
                if valor_minimo > valor_maximo:
                    return Response({
                        'success': False,
                        'detail': 'El valor mínimo no puede ser mayor que el valor máximo.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({
                    'success': False,
                    'detail': 'Los valores mínimo y máximo deben ser numéricos.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que el usuario tiene una persona asociada
        if not hasattr(request.user, 'persona') or request.user.persona is None:
            return Response({'success': False, 'detail': 'El usuario no tiene una persona asociada'}, status=status.HTTP_400_BAD_REQUEST)

        # Asignar la persona logueada automáticamente
        tipo_cacao_data['id_persona_crea'] = request.user.persona.id_persona

        # Validar si el tipo de cacao ya existe (sin distinguir mayúsculas/minúsculas)
        if TiposCacao.objects.filter(nombre__iexact=tipo_cacao_data['nombre']).exists():
            return Response({'success': False, 'detail': 'El tipo de cacao ya existe'}, status=status.HTTP_400_BAD_REQUEST)

        # Guardar el tipo de cacao
        serializer = self.serializer_class(data=tipo_cacao_data)
        serializer.is_valid(raise_exception=True)
        tipo_cacao = serializer.save()

        # Actualizar estado de `item_ya_usado` si es necesario
        if tipo_cacao_data.get('item_ya_usado'):
            TiposCacao.objects.filter(id_tipo_cacao=tipo_cacao.id_tipo_cacao).update(item_ya_usado=True)

        # Auditoría 
        usuario = request.user.id_usuario
        persona = request.user.persona 
        nombre_persona = None
        if persona:
            if persona.tipo_persona == 'N':  # Persona Natural
                nombre_persona = (
                    f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                )
            elif persona.tipo_persona == 'J':  # Persona Jurídica
                nombre_persona = persona.razon_social or "Razón social no especificada"
        else:
            nombre_persona = "Usuario desconocido"

        descripcion = {
            "Mensaje": "Se crea un nuevo tipo de cacao",
            "Nombre": str(tipo_cacao.nombre),
            "Activo": tipo_cacao.activo,
            "ValorMinimo": float(getattr(tipo_cacao, 'valor_minimo', 0)) if getattr(tipo_cacao, 'valor_minimo', None) is not None else None,
            "ValorMaximo": float(getattr(tipo_cacao, 'valor_maximo', 0)) if getattr(tipo_cacao, 'valor_maximo', None) is not None else None,
            "Creado por": nombre_persona 
        }
        direccion = Util.get_client_ip(request)
        valores_actualizados = {
            "create": {
                "Nuevo": {
                    "Nombre": str(tipo_cacao.nombre),
                    "Activo": tipo_cacao.activo,
                    "ValorMinimo": float(getattr(tipo_cacao, 'valor_minimo', 0)) if getattr(tipo_cacao, 'valor_minimo', None) is not None else None,
                    "ValorMaximo": float(getattr(tipo_cacao, 'valor_maximo', 0)) if getattr(tipo_cacao, 'valor_maximo', None) is not None else None
                }
            }
        }
        auditoria_data = {
            "id_usuario": usuario,
            "id_modulo": 45,
            "cod_permiso": "CR",
            "subsistema": 'CONF',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Tipo de cacao creado correctamente',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    
class GetTiposCacaoActivosView(generics.ListAPIView):
    serializer_class = TiposCacaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TiposCacao.objects.filter(activo=True).order_by('id_tipo_cacao')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "detail": "Tipos de cacao activos",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    

class UpdateDeleteTiposCacao(generics.GenericAPIView):
    serializer_class = TiposCacaoSerializer

    def get_permissions(self):
        # Asignar permisos según el método HTTP
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PermisoActualizarConfiguracionTiposCacao()]
        elif self.request.method == 'DELETE':
            return [IsAuthenticated(), PermisoEliminarConfiguracionTiposCacao()]
        return [IsAuthenticated()]

    # Eliminar tipo de cacao
    def delete(self, request, pk):
        try:
            tipo_cacao = TiposCacao.objects.get(pk=pk)
        except TiposCacao.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'El tipo de cacao no existe'
            }, status=status.HTTP_404_NOT_FOUND)

        if tipo_cacao.item_ya_usado:
            return Response({
                'success': False,
                'detail': 'No se puede eliminar el tipo de cacao porque ya ha sido utilizado.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Auditoría para eliminación
        usuario = request.user.id_usuario
        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )
        descripcion = {
            "Mensaje": "Se elimino un tipo de cacao",
            "Nombre": str(tipo_cacao.nombre),
            "Activo": tipo_cacao.activo,
            "Eliminado por": nombre_persona
        }
        direccion = Util.get_client_ip(request)
        valores_actualizados = {
            "Nombre": str(tipo_cacao.nombre),
            "Activo": tipo_cacao.activo,
            "FechaCreacion": tipo_cacao.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S') if tipo_cacao.fecha_creacion else None
        }
        auditoria_data = {
            "id_usuario": usuario,
            "id_modulo": 45,
            "cod_permiso": "BO",
            "subsistema": 'CONF',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        serializer = self.serializer_class(tipo_cacao)
        tipo_cacao.delete()

        return Response({
            'success': True,
            'detail': 'Tipo de cacao eliminado correctamente',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    # Actualizar tipo de cacao
    def patch(self, request, pk):
        try:
            tipo_cacao = TiposCacao.objects.get(pk=pk)
        except TiposCacao.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'El tipo de cacao no existe'
            }, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()

        # Validar valores mínimo y máximo
        valor_minimo = data.get('valor_minimo')
        valor_maximo = data.get('valor_maximo')
        if valor_minimo is not None and valor_maximo is not None:
            try:
                valor_minimo = float(valor_minimo)
                valor_maximo = float(valor_maximo)
                if valor_minimo > valor_maximo:
                    return Response({
                        'success': False,
                        'detail': 'El valor mínimo no puede ser mayor que el valor máximo.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({
                    'success': False,
                    'detail': 'Los valores mínimo y máximo deben ser numéricos.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Capturar los valores anteriores antes de actualizar (convertir Decimal a float)
        valores_anteriores = {
            "Nombre": str(tipo_cacao.nombre),
            "Activo": tipo_cacao.activo,
            "ValorMinimo": float(tipo_cacao.valor_minimo) if tipo_cacao.valor_minimo is not None else None,
            "ValorMaximo": float(tipo_cacao.valor_maximo) if tipo_cacao.valor_maximo is not None else None
        }

        # Actualizar fecha de actualización
        data['fecha_actualizacion'] = timezone.now()

        # Aplicar los cambios con el serializer
        serializer = self.serializer_class(tipo_cacao, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        tipo_cacao_actualizado = serializer.save()

        # Auditoría para actualización (convertir Decimal a float)
        usuario = request.user.id_usuario
        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )
        descripcion = {
            "Mensaje": "Se actualizo un tipo de cacao",
            "Nombre": str(tipo_cacao_actualizado.nombre),
            "Activo": tipo_cacao_actualizado.activo,
            "Actualizado por": nombre_persona
        }
        direccion = Util.get_client_ip(request)
        valores_actualizados = {
            "update": {
                "Anterior": valores_anteriores,  
                "Nuevo": {
                    "Nombre": str(tipo_cacao_actualizado.nombre),
                    "Activo": tipo_cacao_actualizado.activo,
                    "ValorMinimo": float(tipo_cacao_actualizado.valor_minimo) if tipo_cacao_actualizado.valor_minimo is not None else None,
                    "ValorMaximo": float(tipo_cacao_actualizado.valor_maximo) if tipo_cacao_actualizado.valor_maximo is not None else None,
                    "FechaActualizacion": tipo_cacao_actualizado.fecha_actualizacion.strftime('%Y-%m-%d %H:%M:%S') if tipo_cacao_actualizado.fecha_actualizacion else None
                }
            }
        }
        auditoria_data = {
            "id_usuario": usuario,
            "id_modulo": 45,
            "cod_permiso": "AC",
            "subsistema": 'CONF',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Tipo de cacao actualizado correctamente',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
#Fecha de cierres
class FechasCierreGetCreateView(APIView):
    def get_permissions(self):
      
        if self.request.method == 'GET':
            return [IsAuthenticated(), PermisoConsultarConfiguracionFechasLimite()]
        elif self.request.method == 'POST':
            return [IsAuthenticated(), PermisoCrearConfiguracionFechasLimite()]
        return [IsAuthenticated()]

    #Obtener fechas de cierre
    def get(self, request):
        queryset = FechasCierre.objects.all().order_by('id_fecha_cierre')

        usuario = request.user

        if queryset.exists():
            serializer = FechasCierreSerializer(queryset, many=True)
            return Response({
                'success': True,
                'detail': 'Se encontraron fechas de cierre',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron fechas de cierre',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

    #CrearFechaCierre
    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        usuario = request.user
        if not usuario.is_superuser:
            return Response({
                'success': False,
                'detail': 'Solo los usuarios administradores pueden crear fechas de cierre.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Validar que el usuario tenga una persona asociada
        if not hasattr(request.user, 'persona') or request.user.persona is None:
            return Response({
                'success': False,
                'detail': 'El usuario no tiene una persona asociada'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Asignar id_persona_actualiza desde el usuario autenticado
        data['id_persona_actualiza'] = request.user.persona.id_persona

        cod_tipo = data.get('cod_tipo_cobro_fecha')

        # Validar que cod_tipo_cobro_fecha esté en los choices válidos
        valores_validos = [choice[0] for choice in cod_tipo_cobro_CHOICES]
        if cod_tipo not in valores_validos:
            return Response({
                'success': False,
                'detail': f"El tipo de cobro '{cod_tipo}' no es válido. Debe ser uno de: {', '.join(valores_validos)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que no se repita
        if FechasCierre.objects.filter(cod_tipo_cobro_fecha=cod_tipo).exists():
            return Response({
                'success': False,
                'detail': 'Ya existe una configuración para ese tipo de cobro'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que los campos de días sean positivos y estén en el rango 1-31
        for campo in ['dias_pago', 'dias_pago_interes']:
            try:
                valor = int(data.get(campo, 0))
                if valor < 1 or valor > 31:
                    return Response({
                        'success': False,
                        'detail': f"El campo '{campo}' debe estar entre 1 y 31"
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({
                    'success': False,
                    'detail': f"El campo '{campo}' debe ser un número entero"
                }, status=status.HTTP_400_BAD_REQUEST)

        # Guardar
        serializer = FechasCierreSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Auditoría
        fecha_cierre = serializer.instance
        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        descripcion = {
            "Mensaje": "Se crea una nueva fecha de cierre",
            "TipoCobro": fecha_cierre.cod_tipo_cobro_fecha,
            "Días de Pago": fecha_cierre.dias_pago,
            "Días de Interés": fecha_cierre.dias_pago_interes,
            "Creado por": nombre_persona
        }

        valores_actualizados = {
            "create": {
                "Nuevo": {
                    "CodTipoCobroFecha": fecha_cierre.cod_tipo_cobro_fecha,
                    "DiasPago": fecha_cierre.dias_pago,
                    "DiasPagoInteres": fecha_cierre.dias_pago_interes,
                    "FechaActualizacion": fecha_cierre.fecha_actualizacion.strftime('%Y-%m-%d %H:%M:%S')
                }
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 43,
            "cod_permiso": "CR",
            "subsistema": "CONF",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Fecha de cierre creada correctamente',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

    
class UpdateFechasCierreView(generics.GenericAPIView):
    serializer_class = FechasCierreSerializer
    permission_classes = [IsAuthenticated, PermisoActualizarConfiguracionFechasLimite]

    def get_object(self):
        try:
            return FechasCierre.objects.get(pk=self.kwargs['pk'])
        except FechasCierre.DoesNotExist:
            return None

    def patch(self, request, pk):
        usuario = request.user
        instancia = self.get_object()

        if not instancia:
            return Response({
                'success': False,
                'detail': 'La configuración de fecha de cierre no existe'
            }, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()

        if 'cod_tipo_cobro_fecha' in data and data['cod_tipo_cobro_fecha'] != instancia.cod_tipo_cobro_fecha:
            return Response({
                'success': False,
                'detail': 'No se permite modificar el campo cod_tipo_cobro_fecha'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not hasattr(usuario, 'persona') or usuario.persona is None:
            return Response({
                'success': False,
                'detail': 'El usuario no tiene una persona asociada'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validación de días del mes
        for campo in ['dias_pago', 'dias_pago_interes']:
            if campo in data:
                try:
                    int(data[campo])  # Solo valida que sea un entero
                except ValueError:
                    return Response({
                        'success': False,
                        'detail': f"El campo '{campo}' debe ser un número entero"
                    }, status=status.HTTP_400_BAD_REQUEST)


        # Validación: dias_pago_interes >= dias_pago
        try:
            dias_pago = int(data.get('dias_pago', instancia.dias_pago))
            dias_pago_interes = int(data.get('dias_pago_interes', instancia.dias_pago_interes))
            if dias_pago_interes < dias_pago:
                return Response({
                    'success': False,
                    'detail': "El campo 'dias_pago_interes' no puede ser menor que 'dias_pago'"
                }, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({
                'success': False,
                'detail': "Los campos 'dias_pago' y 'dias_pago_interes' deben ser números enteros"
            }, status=status.HTTP_400_BAD_REQUEST)

        data['id_persona_actualiza'] = usuario.persona.id_persona

        # Capturar los valores anteriores
        valores_anteriores = {
            "DiasPago": instancia.dias_pago,
            "DiasPagoInteres": instancia.dias_pago_interes,
            "FechaActualizacion": instancia.fecha_actualizacion.strftime('%Y-%m-%d %H:%M:%S') if instancia.fecha_actualizacion else None
        }

        # Actualizar con el serializer
        serializer = self.serializer_class(instancia, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        fecha_cierre_actualizada = serializer.save()

        # Auditoría
        persona = usuario.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        descripcion = {
            "Mensaje": "Se actualizo una configuracion de fecha de cierre",
            "TipoCobro": fecha_cierre_actualizada.cod_tipo_cobro_fecha,
            "Actualizado por": nombre_persona
        }

        valores_actualizados = {
            "update": {
                "Anterior": valores_anteriores,
                "Nuevo": {
                    "DiasPago": fecha_cierre_actualizada.dias_pago,
                    "DiasPagoInteres": fecha_cierre_actualizada.dias_pago_interes,
                    "FechaActualizacion": fecha_cierre_actualizada.fecha_actualizacion.strftime('%Y-%m-%d %H:%M:%S') if fecha_cierre_actualizada.fecha_actualizacion else None
                }
            }
        }

        auditoria_data = {
            "id_usuario": usuario.id_usuario,
            "id_modulo": 43, 
            "cod_permiso": "AC",
            "subsistema": "CONF",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Fecha de cierre actualizada correctamente',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class FechasCierreGetView(generics.CreateAPIView):
    serializer_class = FechasCierreAllSerializer

    #Obtener fechas de cierre
    def get(self, request):
        queryset = FechasCierre.objects.all()

        if queryset.exists():
            serializer = self.serializer_class(queryset, many=True)
            return Response({
                'success': True,
                'detail': 'Se encontraron fechas de cierre',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron fechas de cierre',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)
        

#Porcentajes de cobro
class PorcentajesCobroGetCreateView(generics.CreateAPIView):
    serializer_class = PorcentajesCobroSerializer
    def get_permissions(self):

        if self.request.method == 'GET':
            return [IsAuthenticated(), PermisoConsultarConfiguracionPorcentajesCobro()]
        elif self.request.method == 'POST':
            return [IsAuthenticated(), PermisoCrearConfiguracionPorcentajesCobro()]
        return [IsAuthenticated()]

    # Obtener todos los porcentajes de cobro
    def get(self, request):
        queryset = PorcentajesCobro.objects.all()
        usuario = request.user

        data = []
        for porcentaje in queryset:
            historial = HistorialPorcentajesCobro.objects.filter(
                cod_tipo_cobro=porcentaje.cod_tipo_cobro,
                fecha_actualizacion__isnull=False
            ).order_by('-fecha_actualizacion').first()
            ultima_fecha_actualizacion = historial.fecha_actualizacion if historial else None

            item = self.serializer_class(porcentaje).data
            item['ultima_fecha_actualizacion'] = ultima_fecha_actualizacion
            data.append(item)

        if data:
            return Response({
                'success': True,
                'detail': 'Se encontraron los siguientes porcentajes de cobro',
                'data': data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron porcentajes de cobro',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

 

    # Crear un nuevo porcentaje de cobro
    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        if not hasattr(request.user, 'persona') or request.user.persona is None:
            return Response({'success': False, 'detail': 'El usuario no tiene una persona asociada'}, status=status.HTTP_400_BAD_REQUEST)

        cod_tipo_cobro = data.get('cod_tipo_cobro', '').strip()

        if not cod_tipo_cobro:
            return Response({'success': False, 'detail': 'El campo "cod_tipo_cobro" es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        codigos_validos = [codigo for codigo, _ in cod_tipo_cobro_CHOICES]

        if cod_tipo_cobro not in codigos_validos:
            return Response({
                'success': False,
                'detail': f"El tipo de cobro '{cod_tipo_cobro}' no es válido. Solo se permiten: {', '.join(codigos_validos)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        if PorcentajesCobro.objects.filter(cod_tipo_cobro=cod_tipo_cobro).exists():
            return Response({'success': False, 'detail': 'El tipo de cobro ya tiene un porcentaje asignado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            valor = float(data.get('valor', 0))
            if valor < 0:
                return Response({'success': False, 'detail': 'El valor del porcentaje de cobro no puede ser negativo'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'success': False, 'detail': 'El valor del porcentaje de cobro debe ser numérico'}, status=status.HTTP_400_BAD_REQUEST)

        data['id_persona_actualiza'] = request.user.persona.id_persona

        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        porcentaje = serializer.save()

        # Registrar en HistorialPorcentajesCobro
        HistorialPorcentajesCobro.objects.create(
            cod_tipo_cobro=porcentaje.cod_tipo_cobro,
            valor=porcentaje.valor,
            fecha_creacion=now(),
            id_persona_crea=request.user.persona
        )

        # Auditoría
        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        descripcion = {
            "Mensaje": "Se creo un nuevo porcentaje de cobro",
            "TipoCobro": porcentaje.cod_tipo_cobro,
            "Valor": str(porcentaje.valor),
            "Creado por": nombre_persona
        }

        valores_actualizados = {
            "create": {
                "Nuevo": {
                    "CodTipoCobro": porcentaje.cod_tipo_cobro,
                    "Valor": str(porcentaje.valor),
                    "FechaActualizacion": porcentaje.fecha_actualizacion.strftime('%Y-%m-%d %H:%M:%S') if porcentaje.fecha_actualizacion else None
                }
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 44,
            "cod_permiso": "CR",
            "subsistema": "CONF",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Porcentaje de cobro creado correctamente',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

    
class UpdateDeletePorcentajesCobro(generics.GenericAPIView):
    serializer_class = PorcentajesCobroSerializer
    permission_classes = [IsAuthenticated, PermisoActualizarConfiguracionPorcentajesCobro]

    # # Eliminar porcentaje de cobro
    # def delete(self, request, pk):
    #     try:
    #         porcentaje_cobro = PorcentajesCobro.objects.get(pk=pk)
    #     except PorcentajesCobro.DoesNotExist:
    #         return Response({
    #             'success': False,
    #             'detail': 'El porcentaje de cobro no existe'
    #         }, status=status.HTTP_404_NOT_FOUND)

    #     serializer = self.serializer_class(porcentaje_cobro)
    #     porcentaje_cobro.delete()

    #     return Response({
    #         'success': True,
    #         'detail': 'Porcentaje de cobro eliminado correctamente',
    #         'data': serializer.data
    #     }, status=status.HTTP_200_OK)

    # Actualizar parcialmente un porcentaje de cobro (PATCH)
    def patch(self, request, pk):
        usuario = request.user

        try:
            porcentaje_cobro = PorcentajesCobro.objects.get(pk=pk)
        except PorcentajesCobro.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'El porcentaje de cobro no existe'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Capturar valores antes de actualizar
        valores_anteriores = {
            "Valor": str(porcentaje_cobro.valor)
        }

        data = request.data.copy()
        data.pop('cod_tipo_cobro', None)

        serializer = self.serializer_class(porcentaje_cobro, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        porcentaje_actualizado = serializer.save()

        # Registrar en HistorialPorcentajesCobro con persona que actualiza y fecha de actualización
        HistorialPorcentajesCobro.objects.create(
            cod_tipo_cobro=porcentaje_actualizado.cod_tipo_cobro,
            valor=porcentaje_actualizado.valor,
            id_persona_actualiza=usuario.persona if hasattr(usuario, "persona") else None,
            fecha_actualizacion=timezone.now()
        )

        # Auditoría
        persona = usuario.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        descripcion = {
            "Mensaje": "Se actualizo un porcentaje de cobro",
            "TipoCobro": porcentaje_actualizado.cod_tipo_cobro,
            "Actualizado por": nombre_persona
        }

        valores_actualizados = {
            "update": {
                "Anterior": valores_anteriores,
                "Nuevo": {
                    "Valor": str(porcentaje_actualizado.valor)
                }
            }
        }

        auditoria_data = {
            "id_usuario": usuario.id_usuario,
            "id_modulo": 44,  
            "cod_permiso": "AC",
            "subsistema": "CONF",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Porcentaje de cobro actualizado correctamente',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class PorcentajesCobroGetViewAll(generics.CreateAPIView):
    serializer_class = PorcentajesCobroAllSerializer

    # Obtener todos los porcentajes de cobro
    def get(self, request):
        queryset = PorcentajesCobro.objects.all()

        if queryset.exists():
            serializer = self.serializer_class(queryset, many=True)
            return Response({
                'success': True,
                'detail': 'Se encontraron los siguientes porcentajes de cobro',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron porcentajes de cobro',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)
        

class HistorialPorcentajesCobroGetView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination 

    def get(self, request, *args, **kwargs):
        historial = HistorialPorcentajesCobro.objects.select_related('id_persona_crea', 'id_persona_actualiza').all()


        # Filtro por cod_tipo_cobro
        cod_tipo_cobro = request.query_params.get('cod_tipo_cobro')
        if cod_tipo_cobro:
            historial = historial.filter(cod_tipo_cobro=cod_tipo_cobro)

        # Filtros por fecha de creación y actualización
        fecha_creacion_desde = request.query_params.get('fecha_creacion_desde')
        fecha_creacion_hasta = request.query_params.get('fecha_creacion_hasta')
        fecha_actualizacion_desde = request.query_params.get('fecha_actualizacion_desde')
        fecha_actualizacion_hasta = request.query_params.get('fecha_actualizacion_hasta')
        

        if fecha_creacion_desde:
            historial = historial.filter(fecha_creacion__date__gte=fecha_creacion_desde)
        if fecha_creacion_hasta:
            historial = historial.filter(fecha_creacion__date__lte=fecha_creacion_hasta)
        if fecha_actualizacion_desde:
            historial = historial.filter(fecha_actualizacion__date__gte=fecha_actualizacion_desde)
        if fecha_actualizacion_hasta:
            historial = historial.filter(fecha_actualizacion__date__lte=fecha_actualizacion_hasta)

        # Filtro por número de documento y tipo de documento de persona que crea y actualiza
        nro_doc_crea = request.query_params.get('nro_doc_crea')
        tipo_doc_crea = request.query_params.get('tipo_doc_crea')
        nro_doc_actualiza = request.query_params.get('nro_doc_actualiza')
        tipo_doc_actualiza = request.query_params.get('tipo_doc_actualiza')

        if nro_doc_crea:
            historial = historial.filter(id_persona_crea__numero_documento__icontains=nro_doc_crea)
        if tipo_doc_crea:
            historial = historial.filter(id_persona_crea__tipo_documento__icontains=tipo_doc_crea)
        if nro_doc_actualiza:
            historial = historial.filter(id_persona_actualiza__numero_documento__icontains=nro_doc_actualiza)
        if tipo_doc_actualiza:
            historial = historial.filter(id_persona_actualiza__tipo_documento__icontains=tipo_doc_actualiza)

        # Filtro por nombres y apellidos o razón social de persona que crea y actualiza
        nombre_crea = request.query_params.get('nombre_crea')
        nombre_actualiza = request.query_params.get('nombre_actualiza')
        if nombre_crea:
            historial = historial.filter(
                Q(id_persona_crea__tipo_persona='N') & (
                    Q(id_persona_crea__primer_nombre__icontains=nombre_crea) |
                    Q(id_persona_crea__segundo_nombre__icontains=nombre_crea) |
                    Q(id_persona_crea__primer_apellido__icontains=nombre_crea) |
                    Q(id_persona_crea__segundo_apellido__icontains=nombre_crea)
                ) |
                Q(id_persona_crea__tipo_persona='J', id_persona_crea__razon_social__icontains=nombre_crea)
            )
        if nombre_actualiza:
            historial = historial.filter(
                Q(id_persona_actualiza__tipo_persona='N') & (
                    Q(id_persona_actualiza__primer_nombre__icontains=nombre_actualiza) |
                    Q(id_persona_actualiza__segundo_nombre__icontains=nombre_actualiza) |
                    Q(id_persona_actualiza__primer_apellido__icontains=nombre_actualiza) |
                    Q(id_persona_actualiza__segundo_apellido__icontains=nombre_actualiza)
                ) |
                Q(id_persona_actualiza__tipo_persona='J', id_persona_actualiza__razon_social__icontains=nombre_actualiza)
            )

        historial = historial.order_by('-id_historial_porcentaje_cobro')

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(historial, request)
        serializer = HistorialPorcentajesCobroSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Historial consultado correctamente.",
            "data": serializer.data
        })

#Registro de compras de cacao Interno
class CreateFacturaUnicaAndDetallesInterno(generics.CreateAPIView):
    serializer_class = FacturaUnicaSerializer
    serializer_class = DetallesFacturaUnicaSerializer
    queryset = FacturaUnica.objects.all()
    permission_classes = [IsAuthenticated, PermisoCrearRegistroCompraCacaoInterno]

    # VALID_COMPRADOR_CODES = {'P', 'C', 'E'}

    # def validar_cod_tipo_comprador(self, cod_tipo_comprador):
    #     codigos = [c.strip().upper() for c in cod_tipo_comprador.split('|') if c.strip()]

    #     # Validar códigos inválidos
    #     codigos_invalidos = [c for c in codigos if c not in self.VALID_COMPRADOR_CODES]
    #     if codigos_invalidos:
    #         raise ValidationError(f"Códigos inválidos en 'cod_tipo_comprador': {', '.join(codigos_invalidos)}")

    #     # Validar repetidos
    #     if len(set(codigos)) != len(codigos):
    #         raise ValidationError(f"No se permiten tipos de comprador repetidos: {cod_tipo_comprador}")

    #     return '|'.join(codigos) 

    def _validar_entidades_consolidadas(self, data):
        """
        Valida todas las entidades en una sola consulta para optimizar rendimiento
        """
        id_persona_proveedor = data.get('id_persona_proveedor')
        id_persona_recaudador = data.get('id_persona_recaudador')
        id_municipio_cacao = data.get('id_municipio_cacao')
        id_departamento_cacao = data.get('id_departamento_cacao')
        id_porcentaje_cobro = data.get('id_porcentaje_cobro')
        
        # Validar que todos los IDs estén presentes
        if not all([id_persona_proveedor, id_persona_recaudador, id_municipio_cacao, 
                   id_departamento_cacao, id_porcentaje_cobro]):
            raise Exception("Todos los campos de entidades son obligatorios.")
        
        # Convertir a enteros para evitar problemas de tipo
        try:
            id_persona_proveedor = int(id_persona_proveedor)
            id_persona_recaudador = int(id_persona_recaudador)
            id_municipio_cacao = int(id_municipio_cacao)
            id_departamento_cacao = int(id_departamento_cacao)
            id_porcentaje_cobro = int(id_porcentaje_cobro)
        except (ValueError, TypeError):
            raise Exception("Los IDs deben ser números válidos.")
        
        # Consulta consolidada para validar existencia
        validaciones = {
            'personas': set(Personas.objects.filter(
                id_persona__in=[id_persona_proveedor, id_persona_recaudador]
            ).values_list('id_persona', flat=True)),
            'municipios': set(Municipio.objects.filter(
                cod_municipio=id_municipio_cacao
            ).values_list('cod_municipio', flat=True)),
            'departamentos': set(Departamento.objects.filter(
                cod_departamento=id_departamento_cacao
            ).values_list('cod_departamento', flat=True)),
            'porcentajes': set(PorcentajesCobro.objects.filter(
                id_porcentaje_cobro=id_porcentaje_cobro
            ).values_list('id_porcentaje_cobro', flat=True))
        }
        
        # Validar existencia con mensajes de debug
        if id_persona_proveedor not in validaciones['personas']:
            raise Exception(f"El 'id_persona_proveedor' {id_persona_proveedor} no es válido. IDs disponibles: {list(validaciones['personas'])}")
        if id_persona_recaudador not in validaciones['personas']:
            raise Exception(f"El 'id_recaudador' {id_persona_recaudador} no es válido. IDs disponibles: {list(validaciones['personas'])}")
        if id_municipio_cacao not in validaciones['municipios']:
            raise Exception(f"El 'id_municipio_cacao' {id_municipio_cacao} no es válido. IDs disponibles: {list(validaciones['municipios'])}")
        if id_departamento_cacao not in validaciones['departamentos']:
            raise Exception(f"El 'id_departamento_cacao' {id_departamento_cacao} no es válido. IDs disponibles: {list(validaciones['departamentos'])}")
        if id_porcentaje_cobro not in validaciones['porcentajes']:
            raise Exception(f"El 'id_porcentaje_cobro' {id_porcentaje_cobro} no es válido. IDs disponibles: {list(validaciones['porcentajes'])}")
        
        return {
            'id_persona_proveedor': id_persona_proveedor,
            'id_persona_recaudador': id_persona_recaudador,
            'id_municipio_cacao': id_municipio_cacao,
            'id_departamento_cacao': id_departamento_cacao,
            'id_porcentaje_cobro': id_porcentaje_cobro
        }

    def _validar_entidades_individual(self, data):
        """
        Validación individual de entidades (método de fallback)
        """
        id_persona_proveedor = data.get('id_persona_proveedor')
        id_persona_recaudador = data.get('id_persona_recaudador')
        id_municipio_cacao = data.get('id_municipio_cacao')
        id_departamento_cacao = data.get('id_departamento_cacao')
        id_porcentaje_cobro = data.get('id_porcentaje_cobro')
        
        # Validar que todos los IDs estén presentes
        if not all([id_persona_proveedor, id_persona_recaudador, id_municipio_cacao, 
                   id_departamento_cacao, id_porcentaje_cobro]):
            raise Exception("Todos los campos de entidades son obligatorios.")
        
        # Validación individual (método original)
        if not Personas.objects.filter(id_persona=id_persona_proveedor).exists():
            raise Exception("El 'id_persona_proveedor' no es válido.")
        if not Personas.objects.filter(id_persona=id_persona_recaudador).exists():
            raise Exception("El 'id_recaudador' no es válido.")
        if not Municipio.objects.filter(cod_municipio=id_municipio_cacao).exists():
            raise Exception("El 'id_municipio_cacao' no es válido.")
        if not Departamento.objects.filter(cod_departamento=id_departamento_cacao).exists():
            raise Exception("El 'id_departamento_cacao' no es válido.")
        if not PorcentajesCobro.objects.filter(id_porcentaje_cobro=id_porcentaje_cobro).exists():
            raise Exception("El 'id_porcentaje_cobro' no es válido.")
        
        return {
            'id_persona_proveedor': id_persona_proveedor,
            'id_persona_recaudador': id_persona_recaudador,
            'id_municipio_cacao': id_municipio_cacao,
            'id_departamento_cacao': id_departamento_cacao,
            'id_porcentaje_cobro': id_porcentaje_cobro
        }

    def _precargar_tipos_cacao(self, detalles_data):
        """
        Pre-carga todos los tipos de cacao necesarios en una sola consulta
        """
        tipos_cacao_ids = [detalle.get('id_tipo_cacao') for detalle in detalles_data 
                          if detalle.get('id_tipo_cacao')]
        
        if not tipos_cacao_ids:
            raise Exception("No se proporcionaron tipos de cacao válidos.")
        
        tipos_cacao_map = {
            tc.id_tipo_cacao: tc for tc in TiposCacao.objects.filter(
                id_tipo_cacao__in=tipos_cacao_ids, activo=True
            )
        }
        
        # Validar que todos los tipos de cacao existan y estén activos
        for detalle in detalles_data:
            id_tipo_cacao = detalle.get('id_tipo_cacao')
            if id_tipo_cacao not in tipos_cacao_map:
                raise Exception(f"El tipo de cacao con ID {id_tipo_cacao} no existe o no está activo.")
        
        return tipos_cacao_map

    def _obtener_siguiente_numero_factura(self):
        """
        Obtiene el siguiente número de factura de manera optimizada
        """
        # Usar una consulta más eficiente
        ultimo_nro = FacturaUnica.objects.aggregate(
            ultimo=Max('nro_factura_unica')
        )['ultimo']
        return (ultimo_nro or 0) + 1

    def _enviar_notificacion_liquidacion_consolidada(self, facturas, fecha_actual_formateada):
        """
        Envía una notificación consolidada de liquidación en lugar de una por factura
        """
        try:
            # Agrupar facturas por recaudador
            facturas_por_recaudador = {}
            for factura in facturas:
                recaudador = factura.id_persona_recaudador
                if recaudador not in facturas_por_recaudador:
                    facturas_por_recaudador[recaudador] = []
                facturas_por_recaudador[recaudador].append(factura)
            
            # Enviar notificación a cada recaudador con sus facturas
            for recaudador, facturas_recaudador in facturas_por_recaudador.items():
                # Calcular totales para este recaudador
                total_kilos = sum(f.total_kilos for f in facturas_recaudador)
                total_fomento = sum(f.cuota_fomento for f in facturas_recaudador)
                total_facturas = len(facturas_recaudador)
                
                # Obtener lista de facturas (no siempre son secuenciales)
                numeros_facturas = [f.nro_factura_unica for f in facturas_recaudador]
                numeros_facturas.sort()
                if len(numeros_facturas) == 1:
                    rango_facturas = f"Factura N° {numeros_facturas[0]}"
                elif len(numeros_facturas) == 2:
                    rango_facturas = f"Facturas N° {numeros_facturas[0]} y {numeros_facturas[1]}"
                else:
                    # Para más de 2 facturas, mostrar la lista completa
                    if len(numeros_facturas) <= 5:
                        # Si son 5 o menos, mostrar todas
                        facturas_str = ", ".join([f"N° {n}" for n in numeros_facturas])
                        rango_facturas = f"Facturas {facturas_str}"
                    else:
                        # Si son más de 5, mostrar las primeras 3 y las últimas 2
                        primeras = ", ".join([f"N° {n}" for n in numeros_facturas[:3]])
                        ultimas = ", ".join([f"N° {n}" for n in numeros_facturas[-2:]])
                        rango_facturas = f"Facturas {primeras}, ..., {ultimas}"
                
                # Nombre del recaudador
                if recaudador.tipo_persona == 'N':
                    nombre_de_usuario = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
                else:
                    nombre_de_usuario = recaudador.razon_social
                
                # Formatear valores
                total_kilos_formateado = f"{total_kilos:,.2f}"
                total_fomento_formateado = f"${total_fomento:,.2f}"
                
                # Enviar email consolidado
                if recaudador.email:
                    subject = f"Liquidación Registrada - {rango_facturas}"
                    template = "liquidacion-factura-unica.html"  # Usar el mismo template pero con datos consolidados
                    
                    Util.notificacion(
                        recaudador,
                        subject,
                        template,
                        fecha_registro=fecha_actual_formateada,
                        total_kilos_reportados=total_kilos_formateado,
                        nombre_de_usuario=nombre_de_usuario,
                        fecha_liquidacion=fecha_actual_formateada,
                        numero_factura=rango_facturas,  # Mostrar rango en lugar de número único
                        cantidad_kilos=total_kilos_formateado,
                        valor_fomento=total_fomento_formateado
                    )
                
                # Enviar SMS consolidado
                telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
                if telefono_recaudador:
                    sms = (
                        f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                        f"{total_facturas} factura{'s' if total_facturas > 1 else ''} liquidada{'s' if total_facturas > 1 else ''} "
                        f"({rango_facturas}). Total kilos: {total_kilos_formateado}, "
                        f"Total fomento: {total_fomento_formateado}."
                    )
                    Util.send_sms(telefono_recaudador, sms)
                    
        except Exception as e:
            print(f"Error enviando notificación consolidada de liquidación: {str(e)}")

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            usuario = request.user

            # Validación consolidada de entidades
            try:
                entidades = self._validar_entidades_consolidadas(data)
            except Exception as e:
                # Fallback a validación individual si la consolidada falla
                print(f"Error en validación consolidada: {str(e)}")
                entidades = self._validar_entidades_individual(data)
            
            # Validar que el municipio sea cacaotero
            municipio = Municipio.objects.get(cod_municipio=entidades['id_municipio_cacao'])
            if not municipio.es_cacaotero:
                return Response({
                    "success": False,
                    "detail": "El municipio seleccionado no es cacaotero."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Procesar detalles de factura
            detalles_factura_raw = data.get('detalles_factura', [])
            if isinstance(detalles_factura_raw, str):
                detalles_data = json.loads(detalles_factura_raw)
            elif isinstance(detalles_factura_raw, list):
                detalles_data = detalles_factura_raw
            else:
                raise Exception("El campo 'detalles_factura' debe ser una lista o una cadena JSON válida.")

            if not detalles_data or not isinstance(detalles_data, list):
                raise Exception("Debe proporcionar al menos un detalle en 'detalles_factura'.")

            # Pre-cargar tipos de cacao para optimizar consultas
            tipos_cacao_map = self._precargar_tipos_cacao(detalles_data)

            # Procesar detalles de manera optimizada
            detalles_factura = []
            total_kilos = 0
            total_valor_bruto = 0
            total_cuota_fomento = 0
            total_valor_neto = 0
            tipos_cacao_a_actualizar = []

            for detalle in detalles_data:
                nro_kilos = detalle.get('nro_kilos')
                valor_kilo = detalle.get('valor_kilo')
                id_tipo_cacao = detalle.get('id_tipo_cacao')
                valor_bruto = detalle.get('valor_bruto')
                cuota_fomento = detalle.get('cuota_fomento')
                valor_neto = detalle.get('valor_neto')

                # Validaciones básicas
                if not nro_kilos or not valor_kilo:
                    raise Exception("El número de kilos y el valor de kilo son requeridos en los detalles de la factura.")
                if valor_bruto is None or cuota_fomento is None or valor_neto is None:
                    raise Exception("Los valores 'valor_bruto', 'cuota_fomento' y 'valor_neto' son requeridos en los detalles.")

                # Convertir a Decimal para evitar errores de tipo
                nro_kilos = Decimal(str(nro_kilos))
                valor_kilo = Decimal(str(valor_kilo))
                valor_bruto = Decimal(str(valor_bruto))
                cuota_fomento = Decimal(str(cuota_fomento))
                valor_neto = Decimal(str(valor_neto))

                # Obtener tipo de cacao del mapa pre-cargado
                tipo_cacao = tipos_cacao_map[id_tipo_cacao]

                # Validar rango de valor_kilo según el tipo de cacao
                valor_minimo = tipo_cacao.valor_minimo
                valor_maximo = tipo_cacao.valor_maximo
                if valor_minimo is not None and valor_maximo is not None:
                    if not (valor_minimo <= valor_kilo <= valor_maximo):
                        data_alerta = {
                            'cod_clase_alerta': 'Com_ValCom',
                            'informacion_complemento_mensaje': f"Se sobrepasó el rango de valor_kilo para el tipo de cacao '{tipo_cacao.nombre}'. Valor ingresado: {valor_kilo}, Rango: {valor_minimo} - {valor_maximo}."
                        }
                        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(
                            cod_clase_alerta=data_alerta['cod_clase_alerta']
                        ).first()
                        if configuracion_alerta and configuracion_alerta.activa:
                            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

                # Acumulación de los totales
                total_kilos += nro_kilos
                total_valor_bruto += valor_bruto
                total_cuota_fomento += cuota_fomento
                total_valor_neto += valor_neto

                # Crear el detalle de factura
                detalle_factura = DetallesFacturaUnica(
                    nro_kilos=nro_kilos,
                    valor_kilo=valor_kilo,
                    id_tipo_cacao=tipo_cacao,
                )
                detalles_factura.append(detalle_factura)

                # Marcar para actualización posterior
                if not tipo_cacao.item_ya_usado:
                    tipo_cacao.item_ya_usado = True
                    tipos_cacao_a_actualizar.append(tipo_cacao)
              

            # Obtener siguiente número de factura de manera optimizada
            nro_factura_unica = self._obtener_siguiente_numero_factura()

            # Validar y procesar fechas
            fecha_compra = data.get('fecha_compra')
            if not fecha_compra:
                raise Exception("El campo 'fecha_compra' es obligatorio.")

            try:
                fecha_compra = pd.to_datetime(fecha_compra).date()
                fecha_compra = datetime.combine(fecha_compra, datetime.min.time())
            except Exception:
                raise Exception("El formato de 'fecha_compra' no es válido. Formato esperado: YYYY-MM-DD.")
            
            fecha_doc_soporte = data.get('fecha_doc_soporte')
            if fecha_doc_soporte:
                try:
                    fecha_doc_soporte = pd.to_datetime(fecha_doc_soporte).date()
                    fecha_doc_soporte = datetime.combine(fecha_doc_soporte, datetime.min.time())
                except Exception:
                    raise Exception("El formato de 'fecha_doc_soporte' no es válido. Formato esperado: YYYY-MM-DD.")
            
            # Pre-cargar todas las entidades necesarias en una sola consulta
            entidades_objetos = {
                'proveedor': Personas.objects.get(id_persona=entidades['id_persona_proveedor']),
                'recaudador': Personas.objects.get(id_persona=entidades['id_persona_recaudador']),
                'municipio': Municipio.objects.get(cod_municipio=entidades['id_municipio_cacao']),
                'departamento': Departamento.objects.get(cod_departamento=entidades['id_departamento_cacao']),
                'porcentaje_cobro': PorcentajesCobro.objects.get(id_porcentaje_cobro=entidades['id_porcentaje_cobro']),
            }
            
            # Crear factura
            factura = FacturaUnica(
                nro_factura_unica=nro_factura_unica,
                total_kilos=total_kilos,
                id_persona_proveedor=entidades_objetos['proveedor'],
                id_persona_recaudador=entidades_objetos['recaudador'],
                id_municipio_cacao=entidades_objetos['municipio'],
                id_departamento_cacao=entidades_objetos['departamento'],
                id_porcentaje_cobro=entidades_objetos['porcentaje_cobro'],
                id_persona_crea=request.user.persona,
                fecha_compra=fecha_compra,
                fecha_doc_soporte=fecha_doc_soporte,
                valor_bruto=total_valor_bruto,
                cuota_fomento=total_cuota_fomento,
                valor_neto=total_valor_neto,
                nombre_vereda=data.get('nombre_vereda'),
                nombre_finca=data.get('nombre_finca'),
                nro_documento_soporte=data.get('nro_documento_soporte'),
            )

            # Manejo de archivos
            doc_soporte = None
            if request.FILES.get('doc_soporte'):
                doc_soporte = request.FILES.get('doc_soporte')
                validate_file(doc_soporte, ALLOWED_DOCUMENT_EXTENSIONS)
                doc_soporte.name = f"{uuid.uuid4()}.{doc_soporte.name.split('.')[-1]}"

            # if not doc_soporte:
            #     raise Exception("El archivo de soporte (doc_soporte) es obligatorio.")
            
            # Asignar archivos a la factura
            factura.doc_soporte = doc_soporte

            # Guardar factura
            factura.save()

            # Asignar factura a todos los detalles y usar bulk_create
            for detalle_factura in detalles_factura:
                detalle_factura.id_factura_unica = factura 
            
            # Guardar todos los detalles de una vez
            DetallesFacturaUnica.objects.bulk_create(detalles_factura)

            # Actualizar tipos de cacao en lote
            if tipos_cacao_a_actualizar:
                TiposCacao.objects.bulk_update(
                    tipos_cacao_a_actualizar, 
                    ['item_ya_usado'], 
                    batch_size=100
                )

            # Preparar datos para notificaciones (sin enviar aún)
            recaudador = factura.id_persona_recaudador
            nro_kilos_formateado = f"{total_kilos:,}"
            valor_kilo_formateado = f"{total_valor_bruto / total_kilos if total_kilos > 0 else 0:,.2f}"
            cuota_fomento_formateado = f"{total_cuota_fomento:,.0f}"

            # Enviar notificaciones de manera asíncrona (opcional)
            # Nota: Para implementar notificaciones asíncronas, se necesitaría Celery o similar
            try:
                # Enviar notificación al recaudador    
                subject = f"Factura Unica Registrada - N° {nro_factura_unica}"
                template = "compra-factura-unica.html"

                if recaudador and recaudador.email:
                    Util.notificacion(
                        recaudador,
                        subject,
                        template,
                        fecha_actual=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        nro_factura=nro_factura_unica,
                        nro_kilos=nro_kilos_formateado,
                        valor_kilo=valor_kilo_formateado,
                        cuota_fomento=cuota_fomento_formateado,
                        nombre_de_usuario=request.user.nombre_de_usuario
                    )

                    # Enviar SMS de notificación
                    telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
                    if telefono_recaudador:
                        sms = (
                            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                            f"Factura registrada con el numero {nro_factura_unica}, un total de {nro_kilos_formateado} kilos y una cuota de fomento de ${cuota_fomento_formateado}."
                        )
                        Util.send_sms(telefono_recaudador, sms)
            except Exception as e:
                # Log del error pero no fallar la transacción
                print(f"Error enviando notificaciones: {str(e)}")
        
            # Respuesta exitosa
            factura_data = FacturaUnicaSerializer(factura).data
            factura_data['detalles'] = DetallesFacturaUnicaSerializer(detalles_factura, many=True).data

            # Auditoría
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Se registro una factura unica",
                "NumeroFactura": factura.nro_factura_unica,
                "Proveedor": str(factura.id_persona_proveedor),
                "Recaudador": str(factura.id_persona_recaudador),
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "Nuevo": {
                        "NroFacturaUnica": factura.nro_factura_unica,
                        "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d'),
                        "TotalKilos": str(factura.total_kilos),
                        "ValorBruto": str(factura.valor_bruto),
                        "CuotaFomento": str(factura.cuota_fomento),
                        "ValorNeto": str(factura.valor_neto),
                        "PersonaProveedor": factura.id_persona_proveedor.id_persona,
                        "PersonaRecaudador": factura.id_persona_recaudador.id_persona,
                        "Departamento": factura.id_departamento_cacao.cod_departamento,
                        "Municipio": factura.id_municipio_cacao.cod_municipio,
                        "PorcentajeCobro": factura.id_porcentaje_cobro.cod_tipo_cobro
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 18,  
                "cod_permiso": "CR",
                "subsistema": "GERE",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)


            return Response({
                'success': True,
                'detail': 'Factura y detalles creados correctamente',
                'data': factura_data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#Registro de factura Externo
class CreateFacturaUnicaAndDetallesExterno(generics.CreateAPIView):
    serializer_class = FacturaUnicaSerializer
    queryset = FacturaUnica.objects.all()
    permission_classes = [IsAuthenticated, PermisoCrearRegistroCompraCacao]

    # VALID_COMPRADOR_CODES = {'P', 'C', 'E'}

    # def validar_cod_tipo_comprador(self, cod_tipo_comprador):
    #     codigos = [c.strip().upper() for c in cod_tipo_comprador.split('|') if c.strip()]

    #     # Validar códigos inválidos
    #     codigos_invalidos = [c for c in codigos if c not in self.VALID_COMPRADOR_CODES]
    #     if codigos_invalidos:
    #         raise ValidationError(f"Códigos inválidos en 'cod_tipo_comprador': {', '.join(codigos_invalidos)}")

    #     # Validar repetidos
    #     if len(set(codigos)) != len(codigos):
    #         raise ValidationError(f"No se permiten tipos de comprador repetidos: {cod_tipo_comprador}")

    #     return '|'.join(codigos) 

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        try:
            data = request.data

            usuario = request.user
          

            # Validación de los campos antes de crear la factura
            # cod_tipo_comprador = data.get('cod_tipo_comprador')
            id_persona_proveedor = data.get('id_persona_proveedor')
            id_municipio_cacao = data.get('id_municipio_cacao')
            id_departamento_cacao = data.get('id_departamento_cacao')
            id_porcentaje_cobro = data.get('id_porcentaje_cobro')
            nro_documento_soporte = data.get('nro_documento_soporte')
            
            # # Validación de 'nro_documento_soporte'
            # if not nro_documento_soporte:
            #     raise Exception("El campo 'nro_documento_soporte' es obligatorio.")
            
            # Validación de 'cod_tipo_comprador'
            # cod_tipo_comprador = data.get('cod_tipo_comprador')
            # if not cod_tipo_comprador:
            #     raise Exception("El campo 'cod_tipo_comprador' es obligatorio.")
            # cod_tipo_comprador = self.validar_cod_tipo_comprador(cod_tipo_comprador)

            # Validación de 'id_persona_proveedor'
            if not id_persona_proveedor or not Personas.objects.filter(id_persona=id_persona_proveedor).exists():
                raise Exception("El 'id_persona_proveedor' no es válido.")

            # Validación de 'id_municipio_cacao'
            if not id_municipio_cacao or not Municipio.objects.filter(cod_municipio=id_municipio_cacao).exists():
                raise Exception("El 'id_municipio_cacao' no es válido.")

            # Validar que el municipio sea cacaotero
            municipio = Municipio.objects.get(cod_municipio=id_municipio_cacao)
            if not municipio.es_cacaotero:
                return Response({
                    "success": False,
                    "detail": "El municipio seleccionado no es cacaotero."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validación de 'id_departamento_cacao'
            if not id_departamento_cacao or not Departamento.objects.filter(cod_departamento=id_departamento_cacao).exists():
                raise Exception("El 'id_departamento_cacao' no es válido.")

            # Validación de 'id_porcentaje_cobro'
            if not id_porcentaje_cobro or not PorcentajesCobro.objects.filter(id_porcentaje_cobro=id_porcentaje_cobro).exists():
                raise Exception("El 'id_porcentaje_cobro' no es válido.")

            # # Cálculo de los detalles de la factura
            # detalles_data = json.loads(data.get('detalles_factura', []))

            # if not isinstance(detalles_data, list):
            #     raise Exception("El campo 'detalles_factura' debe ser una lista.")
            
            detalles_factura_raw = data.get('detalles_factura', [])
            if isinstance(detalles_factura_raw, str):
                detalles_data = json.loads(detalles_factura_raw)
            elif isinstance(detalles_factura_raw, list):
                detalles_data = detalles_factura_raw
            else:
                raise Exception("El campo 'detalles_factura' debe ser una lista o una cadena JSON válida.")

            # Validación para asegurarse de que 'detalles_factura' no esté vacío
            if not detalles_data or not isinstance(detalles_data, list):
                raise Exception("Debe proporcionar al menos un detalle en 'detalles_factura'.")

            detalles_factura = [] 

            total_kilos = 0
            total_valor_bruto = 0
            total_cuota_fomento = 0
            total_valor_neto = 0

            for detalle in detalles_data:
                nro_kilos = detalle.get('nro_kilos')
                valor_kilo = detalle.get('valor_kilo')
                id_tipo_cacao = detalle.get('id_tipo_cacao')

                # Validación de que el 'id_tipo_cacao' existe
                if not id_tipo_cacao or not TiposCacao.objects.filter(id_tipo_cacao=id_tipo_cacao).exists():
                    raise Exception(f"El tipo de cacao con ID {id_tipo_cacao} no existe.")
                
                # Validar que el tipo de cacao esté activo
                tipo_cacao = TiposCacao.objects.filter(id_tipo_cacao=id_tipo_cacao, activo=True).first()
                if not tipo_cacao:
                    raise Exception(f"El tipo de cacao con ID {id_tipo_cacao} no está activo.")
                
                # Validar rango de valor_kilo según el tipo de cacao
                valor_minimo = tipo_cacao.valor_minimo
                valor_maximo = tipo_cacao.valor_maximo
                if valor_minimo is not None and valor_maximo is not None:
                    if not (valor_minimo <= valor_kilo <= valor_maximo):
                        data_alerta = {}
                        data_alerta['cod_clase_alerta'] = 'Com_ValCom'
                        data_alerta['informacion_complemento_mensaje'] = f"Se sobrepasó el rango de valor_kilo para el tipo de cacao '{tipo_cacao.nombre}'. Valor ingresado: {valor_kilo}, Rango: {valor_minimo} - {valor_maximo}."

                        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
                        if configuracion_alerta and configuracion_alerta.activa:
                            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

                if not nro_kilos or not valor_kilo:
                    raise Exception("El número de kilos y el valor de kilo son requeridos en los detalles de la factura.")

                valor_bruto = detalle.get('valor_bruto')
                cuota_fomento = detalle.get('cuota_fomento')
                valor_neto = detalle.get('valor_neto')

                # Verificar que los valores no sean nulos
                if valor_bruto is None or cuota_fomento is None or valor_neto is None:
                    raise Exception("Los valores 'valor_bruto', 'cuota_fomento' y 'valor_neto' son requeridos en los detalles.")

                # Convertir a Decimal para evitar errores de tipo
                nro_kilos = Decimal(str(nro_kilos))
                valor_kilo = Decimal(str(valor_kilo))
                valor_bruto = Decimal(str(valor_bruto))
                cuota_fomento = Decimal(str(cuota_fomento))
                valor_neto = Decimal(str(valor_neto))

                # Acumulación de los totales
                total_kilos += nro_kilos
                total_valor_bruto += valor_bruto
                total_cuota_fomento += cuota_fomento
                total_valor_neto += valor_neto

                # Crear el detalle de factura
                detalle_factura = DetallesFacturaUnica(
                    nro_kilos=nro_kilos,
                    valor_kilo=valor_kilo,
                    id_tipo_cacao=TiposCacao.objects.get(id_tipo_cacao=id_tipo_cacao),
                )
                detalles_factura.append(detalle_factura)  

                # Actualizar el campo 'item_ya_usado' a True
                tipo_cacao.item_ya_usado = True
                tipo_cacao.save()

            # Crear FacturaUnica con los valores proporcionados
            nro_factura_unica = FacturaUnica.objects.all().order_by('nro_factura_unica').last()
            if nro_factura_unica:
                nro_factura_unica = nro_factura_unica.nro_factura_unica + 1
            else:
                nro_factura_unica = 1

            # Validar que 'fecha_compra' no sea nulo o vacío
            fecha_compra = data.get('fecha_compra')
            if not fecha_compra:
                raise Exception("El campo 'fecha_compra' es obligatorio.")

            # Validar que 'fecha_compra' sea un formato de fecha válido
            try:
                fecha_compra = pd.to_datetime(fecha_compra).date()
                # Convertir a datetime si es necesario
                fecha_compra = datetime.combine(fecha_compra, datetime.min.time())
            except Exception:
                raise Exception("El formato de 'fecha_compra' no es válido. Formato esperado: YYYY-MM-DD.")

            # Validación de fecha límite para edición basada en la paramétrica 'dias_registro_compra'
            fecha_creacion = fecha_compra
            if isinstance(fecha_creacion, datetime):
                fecha_creacion = fecha_creacion.date()

            # # Obtener el valor parametrizado
            # dias_registro_compra = FechasCierre.objects.filter(
            #     cod_tipo_cobro_fecha='CF'
            # ).values_list('dias_registro_compra', flat=True).first()

            # if dias_registro_compra is None:
            #     raise Exception("No se encontró la configuración de 'dias_registro_compra' para el tipo de cobro 'CF'.")

            # # Calcular la fecha límite
            # if fecha_creacion.day <= dias_registro_compra:
            #     # Si la fecha de creación está antes o en el día límite, la fecha límite es en el mismo mes
            #     fecha_limite = fecha_creacion.replace(day=dias_registro_compra)
            # else:
            #     # Si la fecha de creación está después del día límite, la fecha límite es en el mes siguiente
            #     mes_siguiente = fecha_creacion + relativedelta(months=1)
            #     try:
            #         fecha_limite = mes_siguiente.replace(day=dias_registro_compra)
            #     except ValueError:
            #         # Si el día no existe en ese mes (ej. 31 de febrero), usar el último día válido
            #         primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
            #         ultima_fecha_mes = primer_dia_siguiente_mes - timedelta(days=1)
            #         fecha_limite = ultima_fecha_mes.replace(day=dias_registro_compra)

            # # Validación: comparar la fecha actual con la fecha límite
            # fecha_actual = timezone.now().date()
            # if fecha_actual > fecha_limite:
            #     raise Exception(
            #         f"La factura solo puede crearse hasta el día {dias_registro_compra} del mes siguiente a su fecha de compra "
            #         f"(fecha límite: {fecha_limite})."
            #     )
            
            # Validar que 'fecha_doc_soporte' no sea nulo o vacío
            fecha_doc_soporte = data.get('fecha_doc_soporte')
            # if not fecha_doc_soporte:
            #     raise Exception("El campo 'fecha_doc_soporte' es obligatorio.")

            # Validar que 'fecha_doc_soporte' sea un formato de fecha válido
            try:
                fecha_doc_soporte = pd.to_datetime(fecha_doc_soporte).date()
                # Convertir a datetime si es necesario
                fecha_doc_soporte = datetime.combine(fecha_doc_soporte, datetime.min.time())
            except Exception:
                raise Exception("El formato de 'fecha_doc_soporte' no es válido. Formato esperado: YYYY-MM-DD.")
            

            # Crear factura
            factura = FacturaUnica(
                nro_factura_unica=nro_factura_unica,
                total_kilos=total_kilos,
                # cod_tipo_comprador=cod_tipo_comprador,
                id_persona_proveedor=Personas.objects.get(id_persona=id_persona_proveedor),
                id_persona_recaudador=usuario.persona,
                id_municipio_cacao=Municipio.objects.get(cod_municipio=id_municipio_cacao),
                id_departamento_cacao=Departamento.objects.get(cod_departamento=id_departamento_cacao),
                id_porcentaje_cobro=PorcentajesCobro.objects.get(id_porcentaje_cobro=id_porcentaje_cobro),
                id_persona_crea=request.user.persona,
                fecha_compra=fecha_compra,
                fecha_doc_soporte=fecha_doc_soporte,
                valor_bruto=total_valor_bruto,
                cuota_fomento=total_cuota_fomento,
                valor_neto=total_valor_neto,
                nombre_vereda=data.get('nombre_vereda'),
                nombre_finca=data.get('nombre_finca'),
                nro_documento_soporte=nro_documento_soporte,
            )

            # Manejo de archivos
            doc_soporte = None
            if request.FILES.get('doc_soporte'):
                doc_soporte = request.FILES.get('doc_soporte')
                validate_file(doc_soporte, ALLOWED_DOCUMENT_EXTENSIONS)
                doc_soporte.name = f"{uuid.uuid4()}.{doc_soporte.name.split('.')[-1]}"

            # if not doc_soporte:
            #     raise Exception("El archivo de soporte (doc_soporte) es obligatorio.")
            
            # Asignar archivos a la factura
            factura.doc_soporte = doc_soporte

            # Guardar factura
            factura.save()

            # Guardar los detalles de la factura
            for detalle_factura in detalles_factura:
                detalle_factura.id_factura_unica = factura 
                detalle_factura.save()

            #Enviar notificación al recaudador    
            subject = f"Factura Unica Registrada - N° {nro_factura_unica}"
            template = "compra-factura-unica.html"

            # Obtener el recaudador asociado a la factura
            recaudador = factura.id_persona_recaudador

            # Formatear los números con separadores de miles
            nro_kilos_formateado = f"{total_kilos:,}"
            valor_kilo_formateado = f"{total_valor_bruto / total_kilos if total_kilos > 0 else 0:,.2f}"
            cuota_fomento_formateado = f"{total_cuota_fomento:,.0f}"

            # Verificar que el recaudador tenga un correo electrónico registrado
            if recaudador and recaudador.email:
                Util.notificacion(
                    recaudador,  
                    subject,
                    template,
                    fecha_actual=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  
                    nro_factura=nro_factura_unica,  
                    nro_kilos=nro_kilos_formateado,  
                    valor_kilo=valor_kilo_formateado, 
                    cuota_fomento=cuota_fomento_formateado,  
                    nombre_de_usuario=request.user.nombre_de_usuario  
                )
            
            # Enviar SMS de notificación
            sms = (
                f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                f"Factura registrada con el numero {nro_factura_unica}, un total de {nro_kilos_formateado} kilos y una cuota de fomento de ${cuota_fomento_formateado}."
            )
            telefono_recaudador = factura.id_persona_recaudador.telefono_celular or factura.id_persona_recaudador.telefono_empresa
            if telefono_recaudador:
                Util.send_sms(telefono_recaudador, sms)

            # Respuesta exitosa
            factura_data = FacturaUnicaSerializer(factura).data
            factura_data['detalles'] = DetallesFacturaUnicaSerializer(detalles_factura, many=True).data

            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_RegCom'
            data_alerta['informacion_complemento_mensaje'] = f"Tiene un nuevo registro de compra con el número: {nro_factura_unica} con el número de kilos: {nro_kilos_formateado}"

            # configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            # if configuracion_alerta.activa:
            #     Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta and configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

            # Auditoría
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Se registro una factura unica",
                "NumeroFactura": factura.nro_factura_unica,
                "Proveedor": str(factura.id_persona_proveedor),
                "Recaudador": str(factura.id_persona_recaudador),
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "Nuevo": {
                        "NroFacturaUnica": factura.nro_factura_unica,
                        "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d'),
                        "TotalKilos": str(factura.total_kilos),
                        "ValorBruto": str(factura.valor_bruto),
                        "CuotaFomento": str(factura.cuota_fomento),
                        "ValorNeto": str(factura.valor_neto),
                        "PersonaProveedor": factura.id_persona_proveedor.id_persona,
                        "PersonaRecaudador": factura.id_persona_recaudador.id_persona,
                        "Departamento": factura.id_departamento_cacao.cod_departamento,
                        "Municipio": factura.id_municipio_cacao.cod_municipio,
                        "PorcentajeCobro": factura.id_porcentaje_cobro.cod_tipo_cobro
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 9,  
                "cod_permiso": "CR",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)

            return Response({
                'success': True,
                'detail': 'Factura y detalles creados correctamente',
                'data': factura_data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProveedoresListView(generics.ListAPIView):
    serializer_class = PersonaProveedorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = Personas.objects.filter(proveedor=True)

        nombre = self.request.query_params.get('nombre', None)
        apellido = self.request.query_params.get('apellido', None)
        cod_tipo_documento = self.request.query_params.get('cod_tipo_documento', None)
        numero_documento = self.request.query_params.get('numero_documento', None)
        razon_social = self.request.query_params.get('razon_social', None)

        if nombre:
            queryset = queryset.filter(
                Q(primer_nombre__icontains=nombre) | Q(segundo_nombre__icontains=nombre)
            )

        if apellido:
            queryset = queryset.filter(
                Q(primer_apellido__icontains=apellido) | Q(segundo_apellido__icontains=apellido)
            )

        if cod_tipo_documento:
            queryset = queryset.filter(tipo_documento__cod_tipo_documento=cod_tipo_documento)

        if numero_documento:
            queryset = queryset.filter(numero_documento=numero_documento)

        if razon_social:
            queryset = queryset.filter(razon_social__icontains=razon_social)

        return queryset

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        if not queryset.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron proveedores con los filtros especificados',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Aplicar paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Si no hay paginación, devolver datos sin paginar
        serializer = self.serializer_class(queryset, many=True)
        return Response({
            'success': True,
            'detail': 'Lista de proveedores encontrados',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    

class RecaudadoresListView(generics.ListAPIView):
    serializer_class = PersonaProveedorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        # Leer el parámetro proveedor del query string
        proveedor_param = self.request.query_params.get('proveedor', None)
        
        # Si proveedor=true, filtrar por proveedor=True, sino por proveedor=False (recaudadores)
        if proveedor_param and proveedor_param.lower() == 'true':
            queryset = Personas.objects.filter(proveedor=True)
            print(f"DEBUG: Filtrando por proveedores (proveedor=True)")
        else:
            queryset = Personas.objects.filter(proveedor=False)
            print(f"DEBUG: Filtrando por recaudadores (proveedor=False)")
        
        print(f"DEBUG: Total registros iniciales: {queryset.count()}")

        nombre = self.request.query_params.get('nombre', None)
        apellido = self.request.query_params.get('apellido', None)
        cod_tipo_documento = self.request.query_params.get('cod_tipo_documento', None)
        numero_documento = self.request.query_params.get('numero_documento', None)
        razon_social = self.request.query_params.get('razon_social', None)
        municipio = self.request.query_params.get('municipio', None)
        departamento = self.request.query_params.get('departamento', None)

        print(f"DEBUG: Parámetros recibidos - cod_tipo_documento: {cod_tipo_documento}, numero_documento: {numero_documento}")

        if nombre:
            queryset = queryset.filter(
                Q(primer_nombre__icontains=nombre) | Q(segundo_nombre__icontains=nombre)
            )

        if apellido:
            queryset = queryset.filter(
                Q(primer_apellido__icontains=apellido) | Q(segundo_apellido__icontains=apellido)
            )

        if cod_tipo_documento:
            queryset = queryset.filter(tipo_documento__cod_tipo_documento=cod_tipo_documento)
            print(f"DEBUG: Después de filtrar por tipo_documento: {queryset.count()}")

        if numero_documento:
            queryset = queryset.filter(numero_documento=numero_documento)
            print(f"DEBUG: Después de filtrar por numero_documento: {queryset.count()}")

        if razon_social:
            queryset = queryset.filter(razon_social__icontains=razon_social)

        if municipio:
            queryset = queryset.filter(municipio_residencia__cod_municipio__icontains=municipio)

        if departamento:
            queryset = queryset.filter(municipio_residencia__cod_departamento__cod_departamento__icontains=departamento)

        print(f"DEBUG: Total resultados finales: {queryset.count()}")
        if queryset.exists():
            for p in queryset:
                print(f"DEBUG: Encontrado - ID: {p.id_persona}, Tipo: {p.tipo_documento.cod_tipo_documento}, Num: {p.numero_documento}, Proveedor: {p.proveedor}")

        return queryset

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        if not queryset.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron recaudadores con los filtros especificados',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Añadir lógica para determinar si es persona jurídica o natural
        data = []
        for recaudador in queryset:
            recaudador_data = self.serializer_class(recaudador).data

            if recaudador.tipo_persona == 'N':  # Persona Natural
                recaudador_data.update({
                    'pais_nacimiento': recaudador.pais_nacimiento.nombre if recaudador.pais_nacimiento else None,
                    'municipio_residencia': recaudador.municipio_residencia.nombre if recaudador.municipio_residencia else None,
                    'departamento_residencia': recaudador.municipio_residencia.cod_departamento.nombre if recaudador.municipio_residencia and recaudador.municipio_residencia.cod_departamento else None,
                    'celular_persona': recaudador.telefono_celular if recaudador.telefono_celular and recaudador.telefono_celular else None,

                })
            else:  # Persona Jurídica
                recaudador_data.update({
                    'cod_pais_nacionalidad_empresa': recaudador.cod_pais_nacionalidad_empresa.nombre if recaudador.cod_pais_nacionalidad_empresa else None,
                    'cod_municipio_laboral_nal': recaudador.cod_municipio_laboral_nal.nombre if recaudador.cod_municipio_laboral_nal else None,
                    'departamento_laboral': recaudador.cod_municipio_laboral_nal.cod_departamento.nombre if recaudador.cod_municipio_laboral_nal and recaudador.cod_municipio_laboral_nal.cod_departamento else None,
                    'celular_empresa': recaudador.telefono_empresa if recaudador.telefono_empresa and recaudador.telefono_empresa else None,

                })

            data.append(recaudador_data)

        # Aplicar paginación
        page = self.paginate_queryset(data)
        if page is not None:
            return self.get_paginated_response(page)

        return Response({
            'success': True,
            'detail': 'Lista de recaudadores encontrados',
            'data': data
        }, status=status.HTTP_200_OK)


class GetAllFacturasView(generics.ListAPIView):
    serializer_class = FacturaUnicaSerializer
    queryset = FacturaUnica.objects.select_related(
        'id_persona_recaudador',
        'id_persona_proveedor',
        'id_persona_proveedor__tipo_documento',
        'id_municipio_cacao',
        'id_departamento_cacao',
        'id_liq_factura_unica',
        'id_liq_factura_unica__doc_pago',
        'id_porcentaje_cobro'
    ).prefetch_related(
        'detallesfacturaunica_set__id_tipo_cacao'
    ).all().order_by('-nro_factura_unica')
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def _serializar_facturas_con_detalles(self, facturas):
        """
        Serializa las facturas incluyendo sus detalles
        """
        facturas_serializadas = []
        for factura in facturas:
            factura_data = FacturaUnicaSerializer(factura).data
            detalles_data = DetallesFacturaUnicaSerializer(factura.detallesfacturaunica_set.all(), many=True).data
            factura_data["detalles"] = detalles_data
            facturas_serializadas.append(factura_data)
        return facturas_serializadas

    def get(self, request, *args, **kwargs):
        usuario = request.user

        if not usuario.is_superuser and usuario.tipo_usuario != 'I':
            raise PermissionDenied("Solo los usuarios internos o superusuarios pueden acceder a este recurso.")

        facturas = self.get_queryset()

        # Filtro para retornar solo facturas no pagadas si se solicita
        solo_no_pagadas = request.query_params.get('solo_no_pagadas')
        if solo_no_pagadas is not None and solo_no_pagadas.lower() == 'true':
            facturas = facturas.exclude(id_liq_factura_unica__cod_estado="P")

        # Filtro booleano para facturas pagadas o no pagadas (paridad con GetFacturasByRecaudador)
        pagadas = request.query_params.get('pagadas')
        if pagadas is not None:
            if pagadas.lower() == 'true':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=False,
                    id_liq_factura_unica__cod_estado="P"
                )
            elif pagadas.lower() == 'false':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=True
                )
            else:
                return Response({
                    'success': False,
                    'detail': "El parámetro 'pagadas' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro booleano para facturas liquidadas o no liquidadas
        liquidadas = request.query_params.get('liquidadas')
        if liquidadas is not None:
            if liquidadas.lower() ==  'true':
                facturas = facturas.filter(id_liq_factura_unica__isnull=False) 
            elif liquidadas.lower() == 'false':
                facturas = facturas.filter(id_liq_factura_unica__isnull=True) 
            else:
                return Response({
                    'success': False,
                    'detail': "El parámetro 'liquidadas' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)
            
        # Filtros del proveedor
        nombre_proveedor = request.query_params.get('nombre_proveedor')
        numero_documento_proveedor = request.query_params.get('numero_documento_proveedor')
        tipo_documento_proveedor = request.query_params.get('tipo_documento_proveedor')

        if nombre_proveedor:
            facturas = facturas.filter(
                Q(id_persona_proveedor__primer_nombre__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__razon_social__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__nombre_comercial__icontains=nombre_proveedor)
            )

        if numero_documento_proveedor:
            facturas = facturas.filter(id_persona_proveedor__numero_documento=numero_documento_proveedor)

        if tipo_documento_proveedor:
            facturas = facturas.filter(id_persona_proveedor__tipo_documento=tipo_documento_proveedor)

        # Filtros del recaudador
        recaudador_nombre = request.query_params.get('recaudador_nombre')
        recaudador_apellido = request.query_params.get('recaudador_apellido')
        recaudador_tipo_documento = request.query_params.get('recaudador_tipo_documento')
        recaudador_numero_documento = request.query_params.get('recaudador_numero_documento')
        recaudador_razon_social = request.query_params.get('recaudador_razon_social')
        direccion_contacto_recaudador = request.query_params.get('direccion_contacto_recaudador')
        telefono_contacto_recaudador = request.query_params.get('telefono_contacto_recaudador')
        email_contacto_recaudador = request.query_params.get('email_contacto_recaudador')

        if direccion_contacto_recaudador:
            facturas = facturas.filter(
                Q(id_persona_recaudador__direccion_residencia__icontains=direccion_contacto_recaudador) |
                Q(id_persona_recaudador__direccion_laboral__icontains=direccion_contacto_recaudador) |
                Q(id_persona_recaudador__direccion_notificaciones__icontains=direccion_contacto_recaudador)
            )

        if telefono_contacto_recaudador:
            facturas = facturas.filter(
                Q(id_persona_recaudador__telefono_celular__icontains=telefono_contacto_recaudador) |
                Q(id_persona_recaudador__telefono_empresa__icontains=telefono_contacto_recaudador)
            )

        if email_contacto_recaudador:
            facturas = facturas.filter(
                Q(id_persona_recaudador__email__icontains=email_contacto_recaudador) |
                Q(id_persona_recaudador__email_empresarial__icontains=email_contacto_recaudador)
            )

        if recaudador_nombre:
            facturas = facturas.filter(
                Q(id_persona_recaudador__primer_nombre__icontains=recaudador_nombre) |
                Q(id_persona_recaudador__segundo_nombre__icontains=recaudador_nombre)
            )

        if recaudador_apellido:
            facturas = facturas.filter(
                Q(id_persona_recaudador__primer_apellido__icontains=recaudador_apellido) |
                Q(id_persona_recaudador__segundo_apellido__icontains=recaudador_apellido)
            )

        if recaudador_tipo_documento:
            facturas = facturas.filter(id_persona_recaudador__tipo_documento=recaudador_tipo_documento)

        if recaudador_numero_documento:
            facturas = facturas.filter(id_persona_recaudador__numero_documento=recaudador_numero_documento)

        if recaudador_razon_social:
            facturas = facturas.filter(id_persona_recaudador__razon_social__icontains=recaudador_razon_social)

        # Filtros de factura única
        id_municipio_cacao = request.query_params.get('id_municipio_cacao')
        id_departamento_cacao = request.query_params.get('id_departamento_cacao')
        nro_factura_unica = request.query_params.get('nro_factura_unica')
        nro_documento_soporte = request.query_params.get('nro_documento_soporte')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        

        if id_municipio_cacao:
            facturas = facturas.filter(id_municipio_cacao__cod_municipio=id_municipio_cacao)

        if id_departamento_cacao:
            facturas = facturas.filter(id_departamento_cacao__cod_departamento=id_departamento_cacao)

        if nro_documento_soporte:
            facturas = facturas.filter(nro_documento_soporte__icontains=nro_documento_soporte)

        if nro_factura_unica:
            facturas = facturas.filter(nro_factura_unica=nro_factura_unica)

        if fecha_desde:
            try:
                facturas = facturas.filter(fecha_compra__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({"success": False, "detail": "Formato inválido para 'fecha_compra_desde'. Formato esperado: YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                facturas = facturas.filter(fecha_compra__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({"success": False, "detail": "Formato inválido para 'fecha_compra_hasta'. Formato esperado: YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

        if not facturas.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron facturas para los criterios de búsqueda.',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si se solicita sin paginación
        sin_paginacion = request.query_params.get('sin_paginacion')
        if sin_paginacion is not None and sin_paginacion.lower() == 'true':
            # Retornar todos los datos sin paginar con detalles
            facturas_serializadas = self._serializar_facturas_con_detalles(facturas)
            return Response({
                'success': True,
                'detail': 'Facturas encontradas correctamente.',
                'data': facturas_serializadas
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(facturas)
        if page is not None:
            facturas_serializadas = self._serializar_facturas_con_detalles(page)
            paginated_response = self.get_paginated_response(facturas_serializadas)
            return paginated_response
        

        facturas_serializadas = self._serializar_facturas_con_detalles(facturas)
        return Response({
            'success': True,
            'detail': 'Facturas encontradas correctamente.',
            'data': facturas_serializadas
        }, status=status.HTTP_200_OK)


class GetFacturasByCargueUUID(generics.ListAPIView):
    serializer_class = FacturaUnicaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def _serializar_facturas_con_detalles(self, facturas):
        facturas_serializadas = []
        for factura in facturas:
            factura_data = FacturaUnicaSerializer(factura).data
            detalles_data = DetallesFacturaUnicaSerializer(
                factura.detallesfacturaunica_set.all(), many=True
            ).data
            factura_data["detalles"] = detalles_data
            facturas_serializadas.append(factura_data)
        return facturas_serializadas

    def get(self, request, uuid_cargue, *args, **kwargs):
        try:
            from uuid import UUID
            UUID(str(uuid_cargue))
        except Exception:
            return Response({
                'success': False,
                'detail': 'UUID inválido.'
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = (
            FacturaUnica.objects.select_related(
                'id_persona_recaudador',
                'id_persona_proveedor',
                'id_persona_proveedor__tipo_documento',
                'id_municipio_cacao',
                'id_departamento_cacao',
                'id_liq_factura_unica',
                'id_liq_factura_unica__doc_pago',
                'id_porcentaje_cobro'
            )
            .prefetch_related('detallesfacturaunica_set__id_tipo_cacao')
            .filter(uuid_cargue=uuid_cargue)
            .order_by('-nro_factura_unica')
        )

        if not facturas.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron facturas para el UUID indicado.',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si se solicita sin paginación
        sin_paginacion = request.query_params.get('sin_paginacion')
        if sin_paginacion is not None and sin_paginacion.lower() == 'true':
            # Retornar todos los datos sin paginar con detalles
            facturas_serializadas = self._serializar_facturas_con_detalles(facturas)
            return Response({
                'success': True,
                'detail': 'Facturas encontradas correctamente.',
                'data': facturas_serializadas
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(facturas)
        if page is not None:
            facturas_serializadas = self._serializar_facturas_con_detalles(page)
            return self.get_paginated_response(facturas_serializadas)

        facturas_serializadas = self._serializar_facturas_con_detalles(facturas)
        return Response({
            'success': True,
            'detail': 'Facturas encontradas correctamente.',
            'data': facturas_serializadas
        }, status=status.HTTP_200_OK)


class GetFacturasByRecaudador(generics.ListAPIView):
    serializer_class = FacturaUnicaSerializer
    queryset = FacturaUnica.objects.select_related(
        'id_persona_recaudador',
        'id_persona_proveedor',
        'id_persona_proveedor__tipo_documento',
        'id_municipio_cacao',
        'id_departamento_cacao',
        'id_liq_factura_unica',
        'id_liq_factura_unica__doc_pago',
        'id_porcentaje_cobro'
    ).all().order_by('-nro_factura_unica')
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination  

    def get(self, request, pk, *args, **kwargs):

        usuario = request.user

        # Validar que el usuario sea interno o superusuario
        if not usuario.is_superuser and usuario.tipo_usuario != 'I':
            raise PermissionDenied("Solo los usuarios internos o superusuarios pueden acceder a este recurso.")
        
        recaudador_id = pk

        # Recuperamos los parámetros de filtro
        nombre_proveedor = request.query_params.get('nombre_proveedor', None)
        numero_documento = request.query_params.get('numero_documento', None)
        tipo_documento = request.query_params.get('tipo_documento', None)
        liquidadas = request.query_params.get('liquidadas')

        # Filtrar las facturas por 'id_persona_recaudador'
        facturas = self.get_queryset().filter(id_persona_recaudador=recaudador_id)

        # Filtro para retornar solo facturas no pagadas si se solicita
        solo_no_pagadas = request.query_params.get('solo_no_pagadas')
        if solo_no_pagadas is not None and solo_no_pagadas.lower() == 'true':
            facturas = facturas.exclude(id_liq_factura_unica__cod_estado="P")

        # Filtro booleano para facturas liquidadas o no liquidadas
        liquidadas = request.query_params.get('liquidadas')
        if liquidadas is not None:
            if liquidadas.lower() == 'true':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=False,
                    id_liq_factura_unica__cod_estado="L"
                )
            elif liquidadas.lower() == 'false':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=True
                )
            else:
                return Response({
                    'success': False,
                    'detail': "El parámetro 'liquidadas' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro booleano para facturas pagadas o no pagadas
        pagadas = request.query_params.get('pagadas')
        if pagadas is not None:
            if pagadas.lower() == 'true':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=False,
                    id_liq_factura_unica__cod_estado="P"
                )
            elif pagadas.lower() == 'false':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=True
                )
            else:
                return Response({
                    'success': False,
                    'detail': "El parámetro 'pagadas' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if nombre_proveedor:
            facturas = facturas.filter(
                id_persona_proveedor__primer_nombre__icontains=nombre_proveedor) | \
                       facturas.filter(id_persona_proveedor__segundo_nombre__icontains=nombre_proveedor) | \
                       facturas.filter(id_persona_proveedor__primer_apellido__icontains=nombre_proveedor) | \
                       facturas.filter(id_persona_proveedor__segundo_apellido__icontains=nombre_proveedor) | \
                       facturas.filter(id_persona_proveedor__razon_social__icontains=nombre_proveedor) | \
                       facturas.filter(id_persona_proveedor__nombre_comercial__icontains=nombre_proveedor)

        if numero_documento:
            facturas = facturas.filter(id_persona_proveedor__numero_documento__icontains=numero_documento)

        if tipo_documento:
            facturas = facturas.filter(id_persona_proveedor__tipo_documento=tipo_documento)

        # Si no se encuentran facturas, retornar error
        if not facturas:
            return Response({
                'success': False,
                'detail': 'No se encontraron facturas para los criterios de búsqueda.',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Calcular totales globales del queryset filtrado
        from decimal import Decimal
        totales = facturas.aggregate(
            total_cuota_fomento=Sum('cuota_fomento'),
            total_kilos=Sum('total_kilos'),
            total_valor_bruto=Sum('valor_bruto')
        )
        total_cuota_fomento = totales.get('total_cuota_fomento') or Decimal('0.00')
        total_kilos = totales.get('total_kilos') or Decimal('0.00')
        total_valor_bruto = totales.get('total_valor_bruto') or Decimal('0.00')

        # Verificar si se solicita sin paginación
        sin_paginacion = request.query_params.get('sin_paginacion')
        if sin_paginacion is not None and sin_paginacion.lower() == 'true':
            # Retornar todos los datos sin paginar
            serializer = self.get_serializer(facturas, many=True)
            return Response({
                'success': True,
                'detail': 'Facturas encontradas correctamente.',
                'data': serializer.data,
                'totales': {
                    'total_cuota_fomento': float(total_cuota_fomento),
                    'total_kilos': float(total_kilos),
                    'total_valor_bruto': float(total_valor_bruto)
                }
            }, status=status.HTTP_200_OK)

        # Aplicar la paginación
        page = self.paginate_queryset(facturas)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            # Agregar totales a la respuesta paginada
            paginated_response.data['totales'] = {
                'total_cuota_fomento': float(total_cuota_fomento),
                'total_kilos': float(total_kilos),
                'total_valor_bruto': float(total_valor_bruto)
            }
            return paginated_response

        # Si no se aplica paginación, devolver todos los resultados
        serializer = self.get_serializer(facturas, many=True)
        return Response({
            'success': True,
            'detail': 'Facturas encontradas correctamente.',
            'data': serializer.data,
            'totales': {
                'total_cuota_fomento': float(total_cuota_fomento),
                'total_kilos': float(total_kilos),
                'total_valor_bruto': float(total_valor_bruto)
            }
        }, status=status.HTTP_200_OK)
    


# class GetFacturaDetalles(generics.RetrieveAPIView):
#     serializer_class = DetallesFacturaUnicaSerializer
#     queryset = FacturaUnica.objects.all()
#     permission_classes = [IsAuthenticated]
#     lookup_field = 'id_factura_unica'

#     def get(self, request, *args, **kwargs):
#         factura_id = kwargs.get('id_factura_unica')
#         factura = FacturaUnica.objects.filter(id_factura_unica=factura_id).first()

#         if not factura:
#             return Response({
#                 'success': False,
#                 'detail': 'Factura no encontrada.'
#             }, status=status.HTTP_404_NOT_FOUND)

#         detalles_factura = factura.detallesfacturaunica_set.all()
#         detalles_serializer = DetallesFacturaUnicaSerializer(detalles_factura, many=True)

#         liquidacion = factura.id_liq_factura_unica
#         if not liquidacion:
#             return Response({
#                 'success': False,
#                 'detail': 'La factura no tiene liquidación asociada.'
#             }, status=status.HTTP_404_NOT_FOUND)

#         # Sumar cuota_fomento de todas las facturas con la misma liquidación
#         facturas_liquidacion = FacturaUnica.objects.filter(id_liq_factura_unica=liquidacion)
#         cuota_fomento_total = facturas_liquidacion.aggregate(
#             total=Sum('cuota_fomento')
#         )['total'] or 0

#         return Response({
#             'success': True,
#             'detail': 'Detalles de la factura encontrados correctamente.',
#             'data': detalles_serializer.data,
#             'cuota_fomento': round(float(cuota_fomento_total)),  
#             'valor_intereses': round(float(liquidacion.valor_intereses or 0)),  
#             'valor_pagar': round(float(liquidacion.valor_pagar or 0)),
#             "nro_doc_pago": liquidacion.nro_doc_pago if liquidacion else None
#         }, status=status.HTTP_200_OK)
    

class GetFacturaDetalles(generics.RetrieveAPIView):
    serializer_class = DetallesFacturaUnicaSerializer
    queryset = FacturaUnica.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id_factura_unica'

    def get(self, request, *args, **kwargs):
        factura_id = kwargs.get('id_factura_unica')
        factura = FacturaUnica.objects.filter(id_factura_unica=factura_id).first()

        if not factura:
            return Response({
                'success': False,
                'detail': 'Factura no encontrada.'
            }, status=status.HTTP_404_NOT_FOUND)

        detalles_factura = factura.detallesfacturaunica_set.all()
        detalles_serializer = DetallesFacturaUnicaSerializer(detalles_factura, many=True)

        liquidacion = factura.id_liq_factura_unica

        # Si no hay liquidación, solo retorna los detalles
        if not liquidacion:
            return Response({
                'success': True,
                'detail': 'Detalles de la factura encontrados correctamente.',
                'data': detalles_serializer.data
            }, status=status.HTTP_200_OK)

        # Si hay liquidación, retorna los campos relacionados
        facturas_liquidacion = FacturaUnica.objects.filter(id_liq_factura_unica=liquidacion)
        cuota_fomento_total = facturas_liquidacion.aggregate(
            total=Sum('cuota_fomento')
        )['total'] or 0

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_ConCom'
        data_alerta['informacion_complemento_mensaje'] = f"Se consultaron los detalles de la factura con el número: {factura.nro_factura_unica}"

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        return Response({
            'success': True,
            'detail': 'Detalles de la factura encontrados correctamente.',
            'data': detalles_serializer.data,
            'cuota_fomento': round(float(cuota_fomento_total)),
            'valor_intereses': round(float(liquidacion.valor_intereses or 0)),
            'valor_pagar': round(float(liquidacion.valor_pagar or 0)),
            "nro_doc_pago": liquidacion.nro_doc_pago if liquidacion else None
        }, status=status.HTTP_200_OK)
class GetFacturasByRecaudadorExterno(generics.ListAPIView):
    serializer_class = FacturaUnicaSerializer
    queryset = FacturaUnica.objects.select_related(
        'id_persona_recaudador',
        'id_persona_proveedor',
        'id_persona_proveedor__tipo_documento',
        'id_municipio_cacao', 
        'id_departamento_cacao',
        'id_liq_factura_unica',
        'id_liq_factura_unica__doc_pago',
        'id_porcentaje_cobro'
    ).prefetch_related(
        'detallesfacturaunica_set__id_tipo_cacao'
    ).all().order_by('-nro_factura_unica')
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def _serializar_facturas_con_detalles(self, facturas):
        """
        Serializa las facturas incluyendo sus detalles
        """
        facturas_serializadas = []
        for factura in facturas:
            factura_data = FacturaUnicaSerializer(factura).data
            detalles_data = DetallesFacturaUnicaSerializer(factura.detallesfacturaunica_set.all(), many=True).data
            factura_data["detalles"] = detalles_data
            facturas_serializadas.append(factura_data)
        return facturas_serializadas

    def get(self, request, *args, **kwargs):
        usuario = request.user
        persona_logueada = usuario.persona

        if not usuario.is_superuser and usuario.tipo_usuario != 'E':
            raise PermissionDenied("Solo los usuarios externos pueden acceder a este recurso.")

        facturas = self.get_queryset().filter(id_persona_recaudador=persona_logueada)

        # Permitir filtrar por otros recaudadores si se proporciona ids_recaudador
        ids_recaudador = request.query_params.get('ids_recaudador')
        if ids_recaudador:
            try:
                # Convertir string de IDs separados por coma a lista de enteros
                ids_list = [int(id_rec.strip()) for id_rec in ids_recaudador.split(',') if id_rec.strip()]
                if ids_list:
                    # Solo permitir si el usuario actual está en la lista o es superusuario
                    if usuario.is_superuser or persona_logueada.id_persona in ids_list:
                        facturas = self.get_queryset().filter(id_persona_recaudador__id_persona__in=ids_list)
                    else:
                        return Response({
                            'success': False,
                            'detail': 'No tiene permisos para ver facturas de otros recaudadores.'
                        }, status=status.HTTP_403_FORBIDDEN)
            except ValueError:
                return Response({
                    'success': False,
                    'detail': 'Formato inválido para ids_recaudador. Use IDs separados por coma.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro para retornar solo facturas no pagadas si se solicita
        solo_no_pagadas = request.query_params.get('solo_no_pagadas')
        if solo_no_pagadas is not None and solo_no_pagadas.lower() == 'true':
            facturas = facturas.exclude(id_liq_factura_unica__cod_estado="P")

        # Filtro booleano para facturas liquidadas o no liquidadas
        liquidadas = request.query_params.get('liquidadas')
        if liquidadas is not None:
            if liquidadas.lower() == 'true':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=False,
                    id_liq_factura_unica__cod_estado="L"
                )
            elif liquidadas.lower() == 'false':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=True
                )
            else:
                return Response({
                    'success': False,
                    'detail': "El parámetro 'liquidadas' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro booleano para facturas pagadas o no pagadas
        pagadas = request.query_params.get('pagadas')
        if pagadas is not None:
            if pagadas.lower() == 'true':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=False,
                    id_liq_factura_unica__cod_estado="P"
                )
            elif pagadas.lower() == 'false':
                facturas = facturas.filter(
                    id_liq_factura_unica__isnull=True
                )
            else:
                return Response({
                    'success': False,
                    'detail': "El parámetro 'pagadas' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtros del proveedor
        nombre_proveedor = request.query_params.get('nombre_proveedor')
        numero_documento_proveedor = request.query_params.get('numero_documento_proveedor')
        tipo_documento_proveedor = request.query_params.get('tipo_documento_proveedor')
        
        # Mantener compatibilidad con nombres anteriores
        numero_documento = request.query_params.get('numero_documento')
        tipo_documento = request.query_params.get('tipo_documento')
        
        # Usar los nuevos nombres si están presentes, sino usar los antiguos
        numero_documento_final = numero_documento_proveedor or numero_documento
        tipo_documento_final = tipo_documento_proveedor or tipo_documento

        if nombre_proveedor:
            facturas = facturas.filter(
                Q(id_persona_proveedor__primer_nombre__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__segundo_nombre__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__primer_apellido__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__segundo_apellido__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__razon_social__icontains=nombre_proveedor) |
                Q(id_persona_proveedor__nombre_comercial__icontains=nombre_proveedor)
            )

        if numero_documento_final:
            facturas = facturas.filter(id_persona_proveedor__numero_documento=numero_documento_final)

        if tipo_documento_final:
            facturas = facturas.filter(id_persona_proveedor__tipo_documento=tipo_documento_final)

        # Filtros del recaudador (solo disponibles para superusuarios)
        if usuario.is_superuser:
            recaudador_nombre = request.query_params.get('recaudador_nombre')
            recaudador_apellido = request.query_params.get('recaudador_apellido')
            recaudador_tipo_documento = request.query_params.get('recaudador_tipo_documento')
            recaudador_numero_documento = request.query_params.get('recaudador_numero_documento')
            recaudador_razon_social = request.query_params.get('recaudador_razon_social')

            if recaudador_nombre:
                facturas = facturas.filter(
                    Q(id_persona_recaudador__primer_nombre__icontains=recaudador_nombre) |
                    Q(id_persona_recaudador__segundo_nombre__icontains=recaudador_nombre)
                )

            if recaudador_apellido:
                facturas = facturas.filter(
                    Q(id_persona_recaudador__primer_apellido__icontains=recaudador_apellido) |
                    Q(id_persona_recaudador__segundo_apellido__icontains=recaudador_apellido)
                )

            if recaudador_tipo_documento:
                facturas = facturas.filter(id_persona_recaudador__tipo_documento=recaudador_tipo_documento)

            if recaudador_numero_documento:
                facturas = facturas.filter(id_persona_recaudador__numero_documento=recaudador_numero_documento)

            if recaudador_razon_social:
                facturas = facturas.filter(id_persona_recaudador__razon_social__icontains=recaudador_razon_social)

        # Filtros adicionales
        id_municipio_cacao = request.query_params.get('id_municipio_cacao')
        id_departamento_cacao = request.query_params.get('id_departamento_cacao')
        nro_factura_unica = request.query_params.get('nro_factura_unica')
        nro_documento_soporte = request.query_params.get('nro_documento_soporte')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        if id_municipio_cacao:
            facturas = facturas.filter(id_municipio_cacao__cod_municipio=id_municipio_cacao)

        if id_departamento_cacao:
            facturas = facturas.filter(id_departamento_cacao__cod_departamento=id_departamento_cacao)

        if nro_documento_soporte:
            facturas = facturas.filter(nro_documento_soporte__icontains=nro_documento_soporte)

        if nro_factura_unica:
            facturas = facturas.filter(nro_factura_unica=nro_factura_unica)

        if fecha_desde:
            try:
                facturas = facturas.filter(fecha_compra__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({"success": False, "detail": "Formato inválido para 'fecha_compra_desde'. Formato esperado: YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                facturas = facturas.filter(fecha_compra__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({"success": False, "detail": "Formato inválido para 'fecha_compra_hasta'. Formato esperado: YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

        if not facturas.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron facturas para los criterios de búsqueda.',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si se solicita sin paginación
        sin_paginacion = request.query_params.get('sin_paginacion')
        if sin_paginacion is not None and sin_paginacion.lower() == 'true':
            # Retornar todos los datos sin paginar con detalles
            facturas_serializadas = self._serializar_facturas_con_detalles(facturas)
            return Response({
                'success': True,
                'detail': 'Facturas encontradas correctamente.',
                'data': facturas_serializadas
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(facturas)
        if page is not None:
            facturas_serializadas = self._serializar_facturas_con_detalles(page)
            paginated_response = self.get_paginated_response(facturas_serializadas)
            return paginated_response

        facturas_serializadas = self._serializar_facturas_con_detalles(facturas)
        return Response({
            'success': True,
            'detail': 'Facturas encontradas correctamente.',
            'data': facturas_serializadas
        }, status=status.HTTP_200_OK)


class ComprasTotalesView(APIView):
    """Vista para obtener totales de compras de cacao (interno y externo)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        
        # Obtener parámetros de filtro
        id_departamento_cacao = request.query_params.get('id_departamento_cacao')
        id_municipio_cacao = request.query_params.get('id_municipio_cacao')
        nro_documento_soporte = request.query_params.get('nro_documento_soporte')
        nro_factura_unica = request.query_params.get('nro_factura_unica')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        # Base queryset
        facturas = FacturaUnica.objects.all()
        
        # Si es usuario externo, filtrar solo sus facturas
        if not usuario.is_superuser and usuario.tipo_usuario == 'E':
            persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
            if persona:
                facturas = facturas.filter(id_persona_recaudador=persona.id_persona)
            else:
                return Response({
                    'success': False,
                    'detail': 'No se encontró información del recaudador.',
                    'data': {}
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Aplicar filtros
        if id_municipio_cacao:
            facturas = facturas.filter(id_municipio_cacao__cod_municipio=id_municipio_cacao)

        if id_departamento_cacao:
            facturas = facturas.filter(id_departamento_cacao__cod_departamento=id_departamento_cacao)

        if nro_documento_soporte:
            facturas = facturas.filter(nro_documento_soporte__icontains=nro_documento_soporte)

        if nro_factura_unica:
            facturas = facturas.filter(nro_factura_unica=nro_factura_unica)

        if fecha_desde:
            try:
                facturas = facturas.filter(fecha_compra__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False, 
                    "detail": "Formato inválido para 'fecha_desde'. Formato esperado: YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                facturas = facturas.filter(fecha_compra__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False, 
                    "detail": "Formato inválido para 'fecha_hasta'. Formato esperado: YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        if not facturas.exists():
            return Response({
                'success': False,
                'detail': 'No se encontraron facturas para los criterios de búsqueda.',
                'data': {
                    'total_cuota_fomento': 0.0,
                    'total_intereses': 0.0
                }
            }, status=status.HTTP_404_NOT_FOUND)

        # Obtener configuración para cálculo de intereses
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal('0.00')
        
        fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
        dias_pago = fecha_cierre.dias_pago if fecha_cierre else 10
        
        fecha_actual = now().date()
        
        # Calcular totales iterando sobre las facturas
        total_cuota_fomento = Decimal('0.00')
        total_intereses = Decimal('0.00')
        
        for factura in facturas:
            total_cuota_fomento += factura.cuota_fomento
            
            # Calcular fecha límite de pago (mes siguiente al de compra, día especificado)
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej: día 31 en febrero)
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)
            
            # Convertir a date si es datetime
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            
            # Calcular días de mora
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            
            # Calcular intereses solo si hay mora
            if fecha_actual > fecha_limite_pago_date and tasa_interes_dian and factura.cuota_fomento > 0:
                intereses = (factura.cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal('365')
                total_intereses += intereses

        return Response({
            'success': True,
            'detail': 'Totales calculados correctamente.',
            'data': {
                'total_cuota_fomento': float(total_cuota_fomento),
                'total_intereses': float(total_intereses)
            }
        }, status=status.HTTP_200_OK)


class UpdateFacturaUnicaAndDetallesInterno(generics.UpdateAPIView):
    serializer_class = FacturaUnicaSerializer
    queryset = FacturaUnica.objects.all()
    permission_classes = [IsAuthenticated, PermisoActualizarRegistroCompraCacaoInterno]

    # VALID_COMPRADOR_CODES = {'P', 'C', 'E'}

    # def validar_cod_tipo_comprador(self, cod_tipo_comprador):
    #     codigos = [c.strip().upper() for c in cod_tipo_comprador.split('|') if c.strip()]

    #     # Validar códigos inválidos
    #     codigos_invalidos = [c for c in codigos if c not in self.VALID_COMPRADOR_CODES]
    #     if codigos_invalidos:
    #         raise ValidationError(f"Códigos inválidos en 'cod_tipo_comprador': {', '.join(codigos_invalidos)}")

    #     # Validar repetidos
    #     if len(set(codigos)) != len(codigos):
    #         raise ValidationError(f"No se permiten tipos de comprador repetidos: {cod_tipo_comprador}")

    #     return '|'.join(codigos)

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        try:

            usuario = request.user
            
            # Verificar si no se envió ningún dato
            if not request.data:
                return Response({
                    'success': False,
                    'detail': 'No se enviaron datos para actualizar.'
                }, status=status.HTTP_400_BAD_REQUEST)

            data = request.data
            id_factura_unica = kwargs.get('id_factura_unica')
            factura = FacturaUnica.objects.filter(id_factura_unica=id_factura_unica).first()
            if not factura:
                raise Exception("Factura no encontrada.")
            
            # Validar si la factura está liquidada
            if factura.id_liq_factura_unica is not None:
                return Response({
                    'success': False,
                    'detail': 'No se puede editar una factura que ya está liquidada o pagada.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            #Captura de valores anteriores para auditoría
            valores_anteriores = {
                "Proveedor": factura.id_persona_proveedor_id,
                "Recaudador": factura.id_persona_recaudador_id,
                "Departamento": factura.id_departamento_cacao_id,
                "Municipio": factura.id_municipio_cacao_id,
                "PorcentajeCobro": factura.id_porcentaje_cobro_id,
                "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d') if factura.fecha_compra else None,
                "FechaDocSoporte": factura.fecha_doc_soporte.strftime('%Y-%m-%d') if factura.fecha_doc_soporte else None,
                "DocumentoSoporte": factura.nro_documento_soporte,
                "TotalKilos": factura.total_kilos,
                "DocumentoDeSoporte": str(factura.doc_soporte.name) if factura.doc_soporte else None,
                "DetallesFactura": [
                    {
                        "id_detalle": d.id_detalle_factura_unica,
                        "id_tipo_cacao": d.id_tipo_cacao_id,
                        "nro_kilos": d.nro_kilos,
                        "valor_kilo": str(d.valor_kilo)
                    }
                    for d in factura.detallesfacturaunica_set.all()
                ]
            }


            
            # Validación de fecha límite para edición basada en la paramétrica 'dias_pago'
            fecha_creacion = factura.fecha_compra
            if isinstance(fecha_creacion, datetime):
                fecha_creacion = fecha_creacion.date() 

            # Obtener el valor parametrizado
            dias_pago = FechasCierre.objects.filter(
                cod_tipo_cobro_fecha='CF'
            ).values_list('dias_pago', flat=True).first()

            if dias_pago is None:
                raise Exception("No se encontró la configuración de 'dias_pago' para el tipo de cobro 'CF'.")

            # Calcular la fecha límite
            if fecha_creacion.day <= dias_pago:
                # Si la fecha de creación está antes o en el día límite, la fecha límite es en el mismo mes
                fecha_limite = fecha_creacion.replace(day=dias_pago)
            else:
                # Si la fecha de creación está después del día límite, la fecha límite es en el mes siguiente
                mes_siguiente = fecha_creacion + relativedelta(months=1)
                try:
                    fecha_limite = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    # Si el día no existe en ese mes (ej. 31 de febrero), usar el último día válido
                    primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    ultima_fecha_mes = primer_dia_siguiente_mes - timedelta(days=1)
                    fecha_limite = ultima_fecha_mes.replace(day=dias_pago)   

            # Validación: comparar la fecha actual con la fecha límite
            fecha_actual = timezone.now().date() 
            if fecha_actual > fecha_limite:
                raise Exception(
                    f"La factura solo puede editarse hasta el día {dias_pago} del mes siguiente a su creación "
                    f"(fecha límite: {fecha_limite})."
                )

            # Copia del archivo anterior de soporte
            doc_soporte_anterior = factura.doc_soporte

            # cod_tipo_comprador = data.get('cod_tipo_comprador')
            # if cod_tipo_comprador:
            #     if isinstance(cod_tipo_comprador, list):
            #         cod_tipo_comprador = cod_tipo_comprador[0]
            #     if not isinstance(cod_tipo_comprador, str):
            #         raise Exception("El 'cod_tipo_comprador' debe ser un string.")
                
            #     cod_tipo_comprador = self.validar_cod_tipo_comprador(cod_tipo_comprador)
            #     factura.cod_tipo_comprador = cod_tipo_comprador

            # Validación del campo 'nro_documento_soporte'
            if data.get('nro_documento_soporte'):
                nro_documento_soporte = str(data.get('nro_documento_soporte')).strip()
                if not nro_documento_soporte:
                    raise Exception("El campo 'nro_documento_soporte' no puede estar vacío.")
                if not FacturaUnica.objects.filter(nro_documento_soporte=nro_documento_soporte).exists():
                    raise Exception(f"El 'nro_documento_soporte' {nro_documento_soporte} no es válido.")
                factura.nro_documento_soporte = nro_documento_soporte

            if data.get('id_persona_proveedor'):
                id_persona_proveedor = int(data.get('id_persona_proveedor'))
                if not Personas.objects.filter(id_persona=id_persona_proveedor).exists():
                    raise Exception("El 'id_persona_proveedor' no es válido.")
                factura.id_persona_proveedor_id = id_persona_proveedor

            if data.get('id_persona_recaudador'):
                id_persona_recaudador = int(data.get('id_persona_recaudador'))
                if not Personas.objects.filter(id_persona=id_persona_recaudador).exists():
                    raise Exception("El 'id_persona_recaudador' no es válido.")
                factura.id_persona_recaudador_id = id_persona_recaudador

            if data.get('id_municipio_cacao'):
                cod_municipio = data.get('id_municipio_cacao')
                if not Municipio.objects.filter(cod_municipio=cod_municipio).exists():
                    raise Exception("El 'id_municipio_cacao' no es válido.")
                municipio = Municipio.objects.get(cod_municipio=cod_municipio)
                if not municipio.es_cacaotero:
                    return Response({
                        "success": False,
                        "detail": "El municipio seleccionado no es cacaotero."
                    }, status=status.HTTP_400_BAD_REQUEST)
                factura.id_municipio_cacao_id = cod_municipio

            if data.get('id_departamento_cacao'):
                cod_departamento = data.get('id_departamento_cacao')
                if not Departamento.objects.filter(cod_departamento=cod_departamento).exists():
                    raise Exception("El 'id_departamento_cacao' no es válido.")
                factura.id_departamento_cacao_id = cod_departamento

            if data.get('id_porcentaje_cobro'):
                id_porcentaje_cobro = int(data.get('id_porcentaje_cobro'))
                if not PorcentajesCobro.objects.filter(id_porcentaje_cobro=id_porcentaje_cobro).exists():
                    raise Exception("El 'id_porcentaje_cobro' no es válido.")
                factura.id_porcentaje_cobro_id = id_porcentaje_cobro

            if data.get('fecha_compra'):
                factura.fecha_compra = data.get('fecha_compra')
            if data.get('fecha_doc_soporte'):
                factura.fecha_doc_soporte = data.get('fecha_doc_soporte')
            if data.get('nombre_vereda'):
                factura.nombre_vereda = data.get('nombre_vereda')
            if data.get('nombre_finca'):
                factura.nombre_finca = data.get('nombre_finca')

            # Si se sube un nuevo archivo de soporte, eliminar el anterior
            doc_soporte = request.FILES.get('doc_soporte')
            if doc_soporte:
                validate_file(doc_soporte, ALLOWED_DOCUMENT_EXTENSIONS)
                doc_soporte.name = f"{uuid.uuid4()}.{doc_soporte.name.split('.')[-1]}"
                # Eliminar archivo anterior si existe
                if doc_soporte_anterior and default_storage.exists(doc_soporte_anterior.name):
                    doc_soporte_anterior.delete(save=False)
                factura.doc_soporte = doc_soporte
                factura.fecha_doc_soporte = timezone.now()

            # Detalles
            detalles_raw = data.get('detalles_factura')
            if detalles_raw:
                try:
                    detalles_data = json.loads(detalles_raw)
                except json.JSONDecodeError:
                    raise Exception("El campo 'detalles_factura' debe tener formato JSON válido.")

                if not isinstance(detalles_data, list):
                    raise Exception("El campo 'detalles_factura' debe ser una lista.")

                total_kilos = 0
                for detalle in detalles_data:
                    id_detalle = detalle.get('id_detalle_factura_unica')
                    nro_kilos = detalle.get('nro_kilos')
                    valor_kilo = detalle.get('valor_kilo')
                    id_tipo_cacao = detalle.get('id_tipo_cacao')

                    if None in (nro_kilos, valor_kilo, id_tipo_cacao):
                        raise Exception("Los campos 'nro_kilos', 'valor_kilo', 'id_tipo_cacao' son obligatorios.")

                    # Convertir a Decimal para el modelo
                    nro_kilos = Decimal(str(nro_kilos))
                    valor_kilo = Decimal(str(valor_kilo))

                    if not TiposCacao.objects.filter(id_tipo_cacao=id_tipo_cacao).exists():
                        raise Exception(f"Tipo de cacao con ID {id_tipo_cacao} no existe.")
                    
                    tipo_cacao = TiposCacao.objects.filter(id_tipo_cacao=id_tipo_cacao, activo=True).first()
                    if not tipo_cacao:
                        raise Exception(f"El tipo de cacao con ID {id_tipo_cacao} no está activo.")
                    
                    # Validar rango de valor_kilo según el tipo de cacao
                    valor_minimo = tipo_cacao.valor_minimo
                    valor_maximo = tipo_cacao.valor_maximo
                    if valor_minimo is not None and valor_maximo is not None:
                        if not (valor_minimo <= valor_kilo <= valor_maximo):
                            data_alerta = {}
                            data_alerta['cod_clase_alerta'] = 'Com_ValCom'
                            data_alerta['informacion_complemento_mensaje'] = f"Se sobrepasó el rango de valor_kilo para el tipo de cacao '{tipo_cacao.nombre}'. Valor ingresado: {valor_kilo}, Rango: {valor_minimo} - {valor_maximo}."

                            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
                            if configuracion_alerta and configuracion_alerta.activa:
                                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

                    # Actualizar el campo 'item_ya_usado' a True
                    tipo_cacao.item_ya_usado = True
                    tipo_cacao.save()
                    
                    total_kilos += nro_kilos

                    if id_detalle:
                        detalle_obj = DetallesFacturaUnica.objects.filter(
                            id_detalle_factura_unica=id_detalle,
                            id_factura_unica=factura
                        ).first()
                        if not detalle_obj:
                            raise Exception(f"El detalle con ID {id_detalle} no pertenece a esta factura.")
                        detalle_obj.nro_kilos = nro_kilos
                        detalle_obj.valor_kilo = valor_kilo
                        detalle_obj.id_tipo_cacao_id = id_tipo_cacao
                        detalle_obj.save()
                    else:
                        DetallesFacturaUnica.objects.create(
                            nro_kilos=nro_kilos,
                            valor_kilo=valor_kilo,
                            id_tipo_cacao_id=id_tipo_cacao,
                            id_factura_unica=factura
                        )

                factura.total_kilos = total_kilos

            factura.save()

            factura_data = FacturaUnicaSerializer(factura).data
            factura_data['detalles'] = DetallesFacturaUnicaSerializer(
                factura.detallesfacturaunica_set.all(), many=True
            ).data

            # Auditoria
            persona = usuario.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Se actualizo una factura unica",
                "NumeroFactura": factura.nro_factura_unica,
                "Actualizado por": nombre_persona
            }

            print("Pasa aqui sin problemas PASOOOOO")

            valores_nuevos = {
                "Proveedor": factura.id_persona_proveedor_id,
                "Recaudador": factura.id_persona_recaudador_id,
                "Departamento": factura.id_departamento_cacao_id,
                "Municipio": factura.id_municipio_cacao_id,
                "PorcentajeCobro": factura.id_porcentaje_cobro_id,
                "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d') if factura.fecha_compra else None,
                "FechaDocSoporte": factura.fecha_doc_soporte.strftime('%Y-%m-%d') if factura.fecha_doc_soporte else None,
                "NroDocumentoSoporte": factura.nro_documento_soporte,
                "TotalKilos": factura.total_kilos,
                "DocumentoDeSoporte": str(factura.doc_soporte.name) if factura.doc_soporte else None,
                "DetallesFactura": [
                    {
                        "id_detalle": d.id_detalle_factura_unica,
                        "id_tipo_cacao": d.id_tipo_cacao_id,
                        "nro_kilos": d.nro_kilos,
                        "valor_kilo": str(d.valor_kilo)
                    }
                    for d in factura.detallesfacturaunica_set.all()
                ]
            }

            valores_actualizados = {
                "update": {
                    "Anterior": valores_anteriores,
                    "Nuevo": valores_nuevos
                }
            }

            auditoria_data = {
                "id_usuario": usuario.id_usuario,
                "id_modulo": 18,
                "cod_permiso": "AC",
                "subsistema": "GERE",
                "dirip": Util.get_client_ip(request),
                # "descripcion": json.dumps(descripcion),
                # "valores_actualizados": json.dumps(valores_actualizados)
                "descripcion": json.dumps(descripcion, cls=DjangoJSONEncoder),
                "valores_actualizados": json.dumps(valores_actualizados, cls=DjangoJSONEncoder)
            }

            Util.save_auditoria(auditoria_data)


            return Response({
                'success': True,
                'detail': 'Factura y detalles actualizados correctamente.',
                'data': factura_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


class UpdateFacturaUnicaAndDetallesExterno(generics.UpdateAPIView):
    serializer_class = FacturaUnicaSerializer
    queryset = FacturaUnica.objects.all()
    permission_classes = [IsAuthenticated, PermisoActualizarRegistroCompraCacao]

    # VALID_COMPRADOR_CODES = {'P', 'C', 'E'}

    # def validar_cod_tipo_comprador(self, cod_tipo_comprador):
    #     codigos = [c.strip().upper() for c in cod_tipo_comprador.split('|') if c.strip()]

    #     # Validar códigos inválidos
    #     codigos_invalidos = [c for c in codigos if c not in self.VALID_COMPRADOR_CODES]
    #     if codigos_invalidos:
    #         raise ValidationError(f"Códigos inválidos en 'cod_tipo_comprador': {', '.join(codigos_invalidos)}")

    #     # Validar repetidos
    #     if len(set(codigos)) != len(codigos):
    #         raise ValidationError(f"No se permiten tipos de comprador repetidos: {cod_tipo_comprador}")

    #     return '|'.join(codigos)

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        try:
            usuario = request.user
           
            if not request.data:
                return Response({
                    'success': False,
                    'detail': 'No se enviaron datos para actualizar.'
                }, status=status.HTTP_400_BAD_REQUEST)

            data = request.data
            id_factura_unica = kwargs.get('id_factura_unica')
            factura = FacturaUnica.objects.filter(id_factura_unica=id_factura_unica).first()
            if not factura:
                raise Exception("Factura no encontrada.")
            
            # Validar si la factura está liquidada
            if factura.id_liq_factura_unica is not None:
                return Response({
                    'success': False,
                    'detail': 'No se puede editar una factura que ya está liquidada o pagada.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            #Captura de valores anteriores para auditoría
            valores_anteriores = {
                "Proveedor": factura.id_persona_proveedor_id,
                "Recaudador": factura.id_persona_recaudador_id,
                "Departamento": factura.id_departamento_cacao_id,
                "Municipio": factura.id_municipio_cacao_id,
                "PorcentajeCobro": factura.id_porcentaje_cobro_id,
                "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d') if factura.fecha_compra else None,
                "FechaDocSoporte": factura.fecha_doc_soporte.strftime('%Y-%m-%d') if factura.fecha_doc_soporte else None,
                "DocumentoSoporte": factura.nro_documento_soporte,
                "TotalKilos": factura.total_kilos,
                "DocumentoDeSoporte": str(factura.doc_soporte.name) if factura.doc_soporte else None,
                "DetallesFactura": [
                    {
                        "id_detalle": d.id_detalle_factura_unica,
                        "id_tipo_cacao": d.id_tipo_cacao_id,
                        "nro_kilos": d.nro_kilos,
                        "valor_kilo": str(d.valor_kilo)
                    }
                    for d in factura.detallesfacturaunica_set.all()
                ]
            }

           # Validación de fecha límite para edición basada en la paramétrica 'dias_pago'
            fecha_creacion = factura.fecha_compra
            if isinstance(fecha_creacion, datetime):
                fecha_creacion = fecha_creacion.date()

            # Obtener el valor parametrizado
            dias_pago = FechasCierre.objects.filter(
                cod_tipo_cobro_fecha='CF'
            ).values_list('dias_pago', flat=True).first()

            if dias_pago is None:
                raise Exception("No se encontró la configuración de 'dias_pago' para el tipo de cobro 'CF'.")

            # Calcular la fecha límite
            if fecha_creacion.day <= dias_pago:
                # Si la fecha de creación está antes o en el día límite, la fecha límite es en el mismo mes
                fecha_limite = fecha_creacion.replace(day=dias_pago)
            else:
                # Si la fecha de creación está después del día límite, la fecha límite es en el mes siguiente
                mes_siguiente = fecha_creacion + relativedelta(months=1)
                try:
                    fecha_limite = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    # Si el día no existe en ese mes (ej. 31 de febrero), usar el último día válido
                    primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    ultima_fecha_mes = primer_dia_siguiente_mes - timedelta(days=1)
                    fecha_limite = ultima_fecha_mes.replace(day=dias_pago)   

            # Validación: comparar la fecha actual con la fecha límite
            fecha_actual = timezone.now().date() 
            if fecha_actual > fecha_limite:
                raise Exception(
                    f"La factura solo puede editarse hasta el día {dias_pago} del mes siguiente a su creación "
                    f"(fecha límite: {fecha_limite})."
                )
            
            # Backup archivo anterior
            doc_soporte_anterior = factura.doc_soporte

            # Campos editables
            # cod_tipo_comprador = data.get('cod_tipo_comprador')
            # if cod_tipo_comprador:
            #     if isinstance(cod_tipo_comprador, list):
            #         cod_tipo_comprador = cod_tipo_comprador[0]
            #     if not isinstance(cod_tipo_comprador, str):
            #         raise Exception("El 'cod_tipo_comprador' debe ser un string.")
            #     cod_tipo_comprador = self.validar_cod_tipo_comprador(cod_tipo_comprador)
            #     factura.cod_tipo_comprador = cod_tipo_comprador

            if data.get('id_persona_recaudador') is not None:
                raise Exception("No está permitido modificar el recaudador en esta operación.")

            if data.get('id_persona_proveedor'):
                id_persona_proveedor = int(data.get('id_persona_proveedor'))
                if not Personas.objects.filter(id_persona=id_persona_proveedor).exists():
                    raise Exception("El 'id_persona_proveedor' no es válido.")
                factura.id_persona_proveedor_id = id_persona_proveedor

            if data.get('id_municipio_cacao'):
                cod_municipio = data.get('id_municipio_cacao')
                if not Municipio.objects.filter(cod_municipio=cod_municipio).exists():
                    raise Exception("El 'id_municipio_cacao' no es válido.")
                municipio = Municipio.objects.get(cod_municipio=cod_municipio)
                if not municipio.es_cacaotero:
                    return Response({
                        "success": False,
                        "detail": "El municipio seleccionado no es cacaotero."
                    }, status=status.HTTP_400_BAD_REQUEST)
                factura.id_municipio_cacao_id = cod_municipio

            if data.get('nro_documento_soporte'):
                nro_documento_soporte = str(data.get('nro_documento_soporte')).strip()
                if not nro_documento_soporte:
                    raise Exception("El campo 'nro_documento_soporte' no puede estar vacío.")
                if not FacturaUnica.objects.filter(nro_documento_soporte=nro_documento_soporte).exists():
                    raise Exception(f"El 'nro_documento_soporte' {nro_documento_soporte} no es válido.")
                factura.nro_documento_soporte = nro_documento_soporte

            if data.get('id_departamento_cacao'):
                cod_departamento = data.get('id_departamento_cacao')
                if not Departamento.objects.filter(cod_departamento=cod_departamento).exists():
                    raise Exception("El 'id_departamento_cacao' no es válido.")
                factura.id_departamento_cacao_id = cod_departamento

            if data.get('id_porcentaje_cobro'):
                id_porcentaje_cobro = int(data.get('id_porcentaje_cobro'))
                if not PorcentajesCobro.objects.filter(id_porcentaje_cobro=id_porcentaje_cobro).exists():
                    raise Exception("El 'id_porcentaje_cobro' no es válido.")
                factura.id_porcentaje_cobro_id = id_porcentaje_cobro

            if data.get('fecha_compra'):
                factura.fecha_compra = data.get('fecha_compra')
            if data.get('fecha_doc_soporte'):
                factura.fecha_doc_soporte = data.get('fecha_doc_soporte')
            if data.get('nombre_vereda'):
                factura.nombre_vereda = data.get('nombre_vereda')
            if data.get('nombre_finca'):
                factura.nombre_finca = data.get('nombre_finca')

            # Archivo soporte
            doc_soporte = request.FILES.get('doc_soporte')
            if doc_soporte:
                validate_file(doc_soporte, ALLOWED_DOCUMENT_EXTENSIONS)
                doc_soporte.name = f"{uuid.uuid4()}.{doc_soporte.name.split('.')[-1]}"
                if doc_soporte_anterior and default_storage.exists(doc_soporte_anterior.name):
                    doc_soporte_anterior.delete(save=False)
                factura.doc_soporte = doc_soporte
                factura.fecha_doc_soporte = timezone.now()

            # Detalles (si vienen)
            detalles_raw = data.get('detalles_factura')
            if detalles_raw:
                try:
                    detalles_data = json.loads(detalles_raw)
                except json.JSONDecodeError:
                    raise Exception("El campo 'detalles_factura' debe tener formato JSON válido.")

                if not isinstance(detalles_data, list):
                    raise Exception("El campo 'detalles_factura' debe ser una lista.")

                total_kilos = 0
                for detalle in detalles_data:
                    id_detalle = detalle.get('id_detalle_factura_unica')
                    nro_kilos = detalle.get('nro_kilos')
                    valor_kilo = detalle.get('valor_kilo')
                    id_tipo_cacao = detalle.get('id_tipo_cacao')

                    if None in (nro_kilos, valor_kilo, id_tipo_cacao):
                        raise Exception("Los campos 'nro_kilos', 'valor_kilo', 'id_tipo_cacao' son obligatorios.")

                    # Convertir a Decimal para el modelo
                    nro_kilos = Decimal(str(nro_kilos))
                    valor_kilo = Decimal(str(valor_kilo))

                    if not TiposCacao.objects.filter(id_tipo_cacao=id_tipo_cacao).exists():
                        raise Exception(f"Tipo de cacao con ID {id_tipo_cacao} no existe.")
                    
                    tipo_cacao = TiposCacao.objects.filter(id_tipo_cacao=id_tipo_cacao, activo=True).first()
                    if not tipo_cacao:
                        raise Exception(f"El tipo de cacao con ID {id_tipo_cacao} no está activo.")
                    
                    # Validar rango de valor_kilo según el tipo de cacao
                    valor_minimo = tipo_cacao.valor_minimo
                    valor_maximo = tipo_cacao.valor_maximo
                    if valor_minimo is not None and valor_maximo is not None:
                        if not (valor_minimo <= valor_kilo <= valor_maximo):
                            data_alerta = {}
                            data_alerta['cod_clase_alerta'] = 'Com_ValCom'
                            data_alerta['informacion_complemento_mensaje'] = f"Se sobrepasó el rango de valor_kilo para el tipo de cacao '{tipo_cacao.nombre}'. Valor ingresado: {valor_kilo}, Rango: {valor_minimo} - {valor_maximo}."

                            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
                            if configuracion_alerta and configuracion_alerta.activa:
                                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)
                    
                    # Actualizar el campo 'item_ya_usado' a True
                    tipo_cacao.item_ya_usado = True
                    tipo_cacao.save()

                    total_kilos += nro_kilos

                    if id_detalle:
                        detalle_obj = DetallesFacturaUnica.objects.filter(
                            id_detalle_factura_unica=id_detalle,
                            id_factura_unica=factura
                        ).first()
                        if not detalle_obj:
                            raise Exception(f"El detalle con ID {id_detalle} no pertenece a esta factura.")
                        detalle_obj.nro_kilos = nro_kilos
                        detalle_obj.valor_kilo = valor_kilo
                        detalle_obj.id_tipo_cacao_id = id_tipo_cacao
                        detalle_obj.save()
                    else:
                        DetallesFacturaUnica.objects.create(
                            nro_kilos=nro_kilos,
                            valor_kilo=valor_kilo,
                            id_tipo_cacao_id=id_tipo_cacao,
                            id_factura_unica=factura
                        )

                factura.total_kilos = total_kilos

            factura.save()

            factura_data = FacturaUnicaSerializer(factura).data
            factura_data['detalles'] = DetallesFacturaUnicaSerializer(
                factura.detallesfacturaunica_set.all(), many=True
            ).data

            # Auditoria
            persona = usuario.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Se actualizo una factura unica",
                "NumeroFactura": factura.nro_factura_unica,
                "Actualizado por": nombre_persona
            }

            valores_nuevos = {
                "Proveedor": factura.id_persona_proveedor_id,
                "Recaudador": factura.id_persona_recaudador_id,
                "Departamento": factura.id_departamento_cacao_id,
                "Municipio": factura.id_municipio_cacao_id,
                "PorcentajeCobro": factura.id_porcentaje_cobro_id,
                "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d') if factura.fecha_compra else None,
                "FechaDocSoporte": factura.fecha_doc_soporte.strftime('%Y-%m-%d') if factura.fecha_doc_soporte else None,
                "NroDocumentoSoporte": factura.nro_documento_soporte,
                "TotalKilos": factura.total_kilos,
                "DocumentoDeSoporte": str(factura.doc_soporte.name) if factura.doc_soporte else None,
                "DetallesFactura": [
                    {
                        "id_detalle": d.id_detalle_factura_unica,
                        "id_tipo_cacao": d.id_tipo_cacao_id,
                        "nro_kilos": d.nro_kilos,
                        "valor_kilo": str(d.valor_kilo)
                    }
                    for d in factura.detallesfacturaunica_set.all()
                ]
            }

            valores_actualizados = {
                "update": {
                    "Anterior": valores_anteriores,
                    "Nuevo": valores_nuevos
                }
            }

            auditoria_data = {
                "id_usuario": usuario.id_usuario,
                "id_modulo": 9,
                "cod_permiso": "AC",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion, cls=DjangoJSONEncoder),
                "valores_actualizados": json.dumps(valores_actualizados, cls=DjangoJSONEncoder)
            }

            Util.save_auditoria(auditoria_data)

            return Response({
                'success': True,
                'detail': 'Factura y detalles actualizados correctamente.',
                'data': factura_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# # Mapeo tipo de comprador
# TIPO_COMPRADOR_MAP = {
#     'procesador': 'P',
#     'comerciante': 'C',
#     'exportador': 'E',
# }

# Función para normalizar texto (quita tildes y pasa a minúsculas)
def normalizar_texto(texto):
    if texto is None:
        return ''
    texto = str(texto).strip().lower()
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )

class CargueMasivoFacturaUnicaInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoCrearRegistroCompraCacaoInterno]

    def _calcular_totales_cargue_masivo(self, facturas_creadas):
        """
        Calcula los totales consolidados para el cargue masivo
        """
        total_kilos = 0
        valor_total = 0
        total_cuota_fomento = 0
        recaudadores_count = {}
        
        for factura_creada in facturas_creadas:
            factura = FacturaUnica.objects.get(nro_factura_unica=factura_creada["nro_factura_nuevo"])
            recaudador = factura.id_persona_recaudador
            
            total_kilos += factura.total_kilos
            valor_total += factura.valor_neto
            total_cuota_fomento += factura.cuota_fomento
            
            # Contar facturas por recaudador
            if recaudador not in recaudadores_count:
                recaudadores_count[recaudador] = 0
            recaudadores_count[recaudador] += 1
        
        # Obtener el recaudador con más facturas
        recaudador_principal = max(recaudadores_count.items(), key=lambda x: x[1])[0] if recaudadores_count else None
        
        return {
            'total_kilos': total_kilos,
            'valor_total': valor_total,
            'total_cuota_fomento': total_cuota_fomento,
            'recaudador_principal': recaudador_principal
        }

    def _validar_datos_completos(self, df, tiene_datos_recaudador=False):
        """
        Valida todos los datos del archivo Excel antes de guardar cualquier cosa.
        Retorna una lista de errores encontrados.
        """
        import time
        start_total = time.time()
        print("[VALIDACION] Iniciando _validar_datos_completos")

        errores = []
        grupo_facturas = df.groupby("nro_factura_unica")
        print(f"[VALIDACION] Total grupos (nro_factura_unica): {len(grupo_facturas)}")

        # OPTIMIZACIÓN: Pre-cargar datos para evitar consultas N+1
        print("[VALIDACION] Pre-cargando datos...")
        t_cache = time.time()
        
        # Cache de tipos de cacao (se usa mucho en validación)
        tipos_cacao_list = TiposCacao.objects.all()
        tipos_cacao_cache = {normalizar_texto(t.nombre): t for t in tipos_cacao_list}
        # Cache adicional para validación exacta (case-sensitive)
        tipos_cacao_exactos = {t.nombre: t for t in tipos_cacao_list}
        print(f"[VALIDACION] ✅ Cache tipos de cacao: {len(tipos_cacao_cache)} items")
        
        # Cache de departamentos
        departamentos_list = Departamento.objects.all()
        departamentos_cache = {normalizar_texto(d.nombre): d for d in departamentos_list}
        print(f"[VALIDACION] ✅ Cache departamentos: {len(departamentos_cache)} items")
        
        # Cache de municipios
        municipios_list = Municipio.objects.all()
        municipios_cache = {}
        for municipio in municipios_list:
            key = (normalizar_texto(municipio.nombre), municipio.cod_departamento_id)
            municipios_cache[key] = municipio
        print(f"[VALIDACION] ✅ Cache municipios: {len(municipios_cache)} items")
        
        # Cache de personas (NITs únicos del DataFrame)
        nits_unicos = set()
        for _, fila in df.iterrows():
            if not pd.isna(fila["nit_proveedor"]):
                nits_unicos.add(str(fila["nit_proveedor"]))
            if tiene_datos_recaudador and not pd.isna(fila.get("nit_recaudador")):
                nits_unicos.add(str(fila["nit_recaudador"]))
        
        personas_cache = {}
        if nits_unicos:
            personas_list = Personas.objects.filter(numero_documento__in=nits_unicos)
            personas_cache = {p.numero_documento: p for p in personas_list}
        print(f"[VALIDACION] ✅ Cache personas: {len(personas_cache)} items de {len(nits_unicos)} NITs")
        
        print(f"[VALIDACION] Cache completo en {time.time()-t_cache:.3f}s")
        
        # Obtener el porcentaje de cobro una sola vez
        try:
            cuota_fomento_obj = PorcentajesCobro.objects.get(cod_tipo_cobro="CF")
        except PorcentajesCobro.DoesNotExist:
            errores.append({
                "error": "No se encontró el porcentaje de cobro 'CF'."
            })
            return errores


        # Campos clave para verificar inconsistencias (solo campos que deben ser consistentes en toda la factura)
        campos_clave = [
            "municipio", "departamento", "fecha_compra", "nit_proveedor", "nombre_proveedor",
            "nit_recaudador", "nombre_recaudador"
            # NOTA: nro_kilos, valor_kilo, valor_bruto, cuota_fomento, valor_neto pueden ser diferentes entre detalles
        ]
        
        t_inconsistencias = time.time()
        for nro_factura_plantilla, grupo in grupo_facturas:
            # Validar inconsistencias en campos clave
            campos_invalidos = {}
            for campo in campos_clave:
                if campo in grupo.columns:
                    valores_unicos = grupo[campo].dropna().astype(str).str.strip().str.lower().unique()
                    if len(valores_unicos) > 1:
                        campos_invalidos[campo.upper()] = list(valores_unicos)
            if campos_invalidos:
                errores.append({
                    "nro_factura_plantilla": int(nro_factura_plantilla),
                    "error": f"Inconsistencias en campos para No FACTURA UNICA = {nro_factura_plantilla}.",
                    "campos_inconsistentes": campos_invalidos
                })
        print(f"[VALIDACION] Inconsistencias revisadas en {time.time()-t_inconsistencias:.3f}s")

        # Validar tipos de cacao con coincidencia exacta
        errores_unicos = set()  
        for nro_factura_plantilla, grupo in grupo_facturas:
            for _, fila in grupo.iterrows():
                # Primero validar coincidencia exacta (case-sensitive)
                tipo_cacao_exacto = tipos_cacao_exactos.get(fila["tipo_cacao"])
                if not tipo_cacao_exacto:
                    # Si no hay coincidencia exacta, verificar si existe con normalización
                    nombre_tipo_cacao = normalizar_texto(fila["tipo_cacao"])
                    tipo_cacao_normalizado = tipos_cacao_cache.get(nombre_tipo_cacao)
                    if tipo_cacao_normalizado:
                        # Existe pero no coincide exactamente - dar sugerencia
                        errores_unicos.add((
                            int(nro_factura_plantilla),
                            f"Tipo de cacao '{fila['tipo_cacao']}' debe escribirse exactamente como: '{tipo_cacao_normalizado.nombre}'"
                        ))
                    else:
                        # No existe en absoluto
                        errores_unicos.add((
                            int(nro_factura_plantilla),
                            f"El tipo de cacao '{fila['tipo_cacao']}' no existe en la base de datos."
                        ))
                elif not tipo_cacao_exacto.activo:
                    errores_unicos.add((
                        int(nro_factura_plantilla),
                        f"El tipo de cacao '{fila['tipo_cacao']}' está inactivo."
                    ))

        # Convertir el conjunto de errores únicos en una lista de diccionarios
        errores.extend([
            {"nro_factura_plantilla": nro_factura, "error": error}
            for nro_factura, error in errores_unicos
        ])

        # Validar cada factura individualmente
        t_detalle_valid = time.time()
        for nro_factura_plantilla, grupo in grupo_facturas:
            fila_referencia = grupo.iloc[0]
            
            try:
                # Validar recaudador solo si vienen los datos en el Excel
                if tiene_datos_recaudador:
                    recaudador = personas_cache.get(str(fila_referencia["nit_recaudador"]))
                    if not recaudador:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Recaudador con NIT {fila_referencia['nit_recaudador']} no existe."
                        })
                        continue

                    # Comparar nombre del recaudador
                    nombre_recaudador_excel = normalizar_texto(fila_referencia["nombre_recaudador"])
                    if recaudador.tipo_persona == "N":
                        # Construir el nombre completo del recaudador eliminando valores vacíos
                        nombre_recaudador_bd = normalizar_texto(
                            " ".join(filter(None, [
                                recaudador.primer_nombre,
                                recaudador.segundo_nombre,
                                recaudador.primer_apellido,
                                recaudador.segundo_apellido
                            ]))
                        )
                    else:
                        # Usar la razón social para personas jurídicas
                        nombre_recaudador_bd = normalizar_texto(recaudador.razon_social or "")

                    # Comparar los nombres
                    if nombre_recaudador_excel != nombre_recaudador_bd:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"El nombre del recaudador no coincide. NIT: {fila_referencia['nit_recaudador']}, "
                                    f"Nombre esperado: '{nombre_recaudador_bd}', Nombre recibido: '{fila_referencia['nombre_recaudador']}'."
                        })
                        continue
                
                # Validar proveedor
                nit_proveedor = fila_referencia["nit_proveedor"]
                # Manejar valores NaN de pandas
                if pd.isna(nit_proveedor):
                    nit_proveedor_display = "vacío o inválido"
                else:
                    nit_proveedor_display = str(nit_proveedor)
                
                proveedor = personas_cache.get(str(nit_proveedor))
                if not proveedor:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"Proveedor con NIT {nit_proveedor_display} no existe."
                    })
                    continue

                # Comparar nombre del proveedor
                nombre_proveedor_excel = normalizar_texto(fila_referencia["nombre_proveedor"])
                if proveedor.tipo_persona == "N":
                    nombre_proveedor_bd = normalizar_texto(
                        " ".join(filter(None, [
                            proveedor.primer_nombre,
                            proveedor.segundo_nombre,
                            proveedor.primer_apellido,
                            proveedor.segundo_apellido
                        ]))
                    )
                    # Para personas naturales, mantener validación estricta
                    if nombre_proveedor_excel != nombre_proveedor_bd:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"El nombre del proveedor no coincide. NIT: {fila_referencia['nit_proveedor']}, "
                                    f"Nombre esperado: '{nombre_proveedor_bd}', Nombre recibido: '{fila_referencia['nombre_proveedor']}'."
                        })
                        continue
                else:
                    # Para personas jurídicas, validar tanto razón social como nombre comercial
                    razon_social_bd = normalizar_texto(proveedor.razon_social or "")
                    nombre_comercial_bd = normalizar_texto(proveedor.nombre_comercial or "")
                    
                    # Verificar si coincide con alguno de los nombres (más flexible para jurídicas)
                    coincide = (
                        nombre_proveedor_excel == razon_social_bd or
                        nombre_proveedor_excel == nombre_comercial_bd or
                        (razon_social_bd and razon_social_bd in nombre_proveedor_excel) or
                        (razon_social_bd and nombre_proveedor_excel in razon_social_bd) or
                        (nombre_comercial_bd and nombre_comercial_bd in nombre_proveedor_excel) or
                        (nombre_comercial_bd and nombre_proveedor_excel in nombre_comercial_bd)
                    )
                    
                    if not coincide:
                        nombres_esperados = []
                        if razon_social_bd:
                            nombres_esperados.append(f"'{razon_social_bd}' (razón social)")
                        if nombre_comercial_bd:
                            nombres_esperados.append(f"'{nombre_comercial_bd}' (nombre comercial)")
                        
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"El nombre del proveedor no coincide. NIT: {fila_referencia['nit_proveedor']}, "
                                    f"Nombre esperado: {' o '.join(nombres_esperados)}, "
                                    f"Nombre recibido: '{fila_referencia['nombre_proveedor']}'."
                        })
                        continue

                # Validar departamento y municipio
                nombre_departamento = normalizar_texto(fila_referencia["departamento"])
                nombre_municipio = normalizar_texto(fila_referencia["municipio"])

                departamento = departamentos_cache.get(nombre_departamento)
                if not departamento:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"El departamento '{fila_referencia['departamento']}' no existe."
                    })
                    continue

                municipio_key = (nombre_municipio, departamento.cod_departamento)
                municipio = municipios_cache.get(municipio_key)
                if not municipio:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"El municipio '{fila_referencia['municipio']}' no pertenece al departamento '{departamento.nombre}'."
                    })
                    continue
                
                if not municipio.es_cacaotero:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"El municipio '{municipio.nombre}' no es cacaotero."
                    })
                    continue

                # Validar fecha de compra
                try:
                    fecha_raw = fila_referencia["fecha_compra"]
                    # Intentar diferentes formatos de fecha
                    if pd.isna(fecha_raw) or str(fecha_raw).strip() == "":
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Factura #{nro_factura_plantilla}: La fecha de compra está vacía o es inválida."
                        })
                        continue
                    
                    # Convertir a string para validar formato
                    fecha_str = str(fecha_raw).strip()
                    
                    # Validar formato de año (debe tener 4 dígitos)
                    if len(fecha_str) < 4 or not any(char.isdigit() for char in fecha_str):
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Factura #{nro_factura_plantilla}: Error en fecha de compra: formato inválido '{fecha_str}'. Debe ser una fecha válida con año de 4 dígitos."
                        })
                        continue
                    
                    fecha_compra = pd.to_datetime(fecha_raw)
                    if timezone.is_naive(fecha_compra):
                        fecha_compra = make_aware(fecha_compra)
                    if isinstance(fecha_compra, pd.Timestamp):
                        fecha_compra = fecha_compra.date()
                        
                except pd.errors.OutOfBoundsDatetime:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"Factura #{nro_factura_plantilla}: Error en fecha de compra: fecha fuera de rango '{fecha_raw}'. Verifique que el año tenga 4 dígitos y sea una fecha válida."
                    })
                    continue
                except Exception as e:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"Factura #{nro_factura_plantilla}: Error en fecha de compra: '{fecha_raw}' - {str(e)}"
                    })
                    continue

                # Validar cada detalle de la factura
                t_loop_inicio = time.time()
                for index_df, fila in grupo.iterrows():
                    try:
                        # Usar el tipo de cacao ya validado en la sección general
                        tipo_cacao = tipos_cacao_exactos.get(fila["tipo_cacao"])

                        # VALIDAR CAMPOS NUMÉRICOS OBLIGATORIOS
                        campos_numericos = ["nro_kilos", "valor_kilo", "valor_bruto", "cuota_fomento", "valor_neto"]
                        
                        # Verificar campos vacíos o NaN
                        for campo in campos_numericos:
                            valor_campo = fila[campo]
                            if pd.isna(valor_campo) or str(valor_campo).strip() == "":
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El campo '{campo}' no puede estar vacío"
                                })
                                continue
                        
                        # Si hay errores de campos vacíos en esta fila, continuar
                        if errores and errores[-1]["nro_factura_plantilla"] == int(nro_factura_plantilla):
                            continue
                        
                        # Convertir y validar rangos
                        try:
                            nro_kilos = float(fila["nro_kilos"])
                            valor_kilo = float(fila["valor_kilo"])
                            valor_bruto = float(fila["valor_bruto"])
                            cuota_fomento = float(fila["cuota_fomento"])
                            valor_neto = float(fila["valor_neto"])
                            
                            # Validaciones de rangos específicos
                            if nro_kilos <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: Los kilos deben ser mayor a 0 (valor: {nro_kilos})"
                                })
                                continue
                                
                            if valor_kilo <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El valor por kilo debe ser mayor a 0 (valor: {valor_kilo})"
                                })
                                continue
                                
                            if valor_bruto <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El valor bruto debe ser mayor a 0 (valor: {valor_bruto})"
                                })
                                continue
                                
                            if cuota_fomento < 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: La cuota de fomento debe ser mayor o igual a 0 (valor: {cuota_fomento})"
                                })
                                continue
                                
                            if valor_neto <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El valor neto debe ser mayor a 0 (valor: {valor_neto})"
                                })
                                continue
                                
                        except (ValueError, TypeError) as conversion_error:
                            errores.append({
                                "nro_factura_plantilla": int(nro_factura_plantilla),
                                "error": f"Fila #{index_df + 1}: Error al convertir valores numéricos: {str(conversion_error)}. Verifique que no contengan letras u otros caracteres inválidos"
                            })
                            continue

                        # Validar cálculo de cuota de fomento
                        valor_esperado = round(valor_bruto * float(cuota_fomento_obj.valor), 2)
                        if round(cuota_fomento, 2) != valor_esperado:
                            errores.append({
                                "nro_factura_plantilla": int(nro_factura_plantilla),
                                "error": f"Fila #{index_df + 1}: El valor de la 'CUOTA DE FOMENTO' no coincide. Esperado: {valor_esperado}, recibido: {cuota_fomento}."
                            })

                    except Exception as e:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Fila #{index_df + 1}: Error en datos numéricos - {str(e)}"
                        })
                print(f"[VALIDACION] Grupo {int(nro_factura_plantilla)}: validación de {len(grupo)} filas en {time.time()-t_loop_inicio:.3f}s")

            except Exception as e:
                errores.append({
                    "nro_factura_plantilla": int(nro_factura_plantilla),
                    "error": f"Error general en factura: {str(e)}"
                })

        print(f"[VALIDACION] Finalizado _validar_datos_completos en {time.time()-start_total:.3f}s. Errores: {len(errores)}")
        
        # Retornar errores y caches para reutilizar en creación
        return {
            'errores': errores,
            'tipos_cacao_cache': tipos_cacao_cache,
            'tipos_cacao_exactos': tipos_cacao_exactos,
            'departamentos_cache': departamentos_cache,
            'municipios_cache': municipios_cache,
            'personas_cache': personas_cache
        }

    # def convertir_tipo_comprador_a_codigo(self, tipo_raw):
    #     mapa = {
    #         "procesador": "P",
    #         "comerciante": "C",
    #         "exportador": "E"
    #     }
    #     codigos = []
    #     for tipo in tipo_raw.split(','):
    #         tipo = tipo.strip().lower()
    #         if tipo not in mapa:
    #             raise ValueError(f"Tipo de comprador '{tipo}' no es válido.")
    #         codigos.append(mapa[tipo])

    #     # Validación para evitar repetidos
    #     if len(set(codigos)) != len(codigos):
    #         raise ValueError(f"Tipos de comprador repetidos: {tipo_raw}")

    #     return "|".join(codigos)

    @transaction.atomic
    def post(self, request):
        import time
        post_start = time.time()
        print("[POST] Inicio cargue masivo interno")
        usuario = request.user

        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response({
                "success": False,
                "detail": "Debe adjuntar el archivo Excel."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_file(archivo, ALLOWED_EXCEL_EXTENSIONS)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Lectura robusta de Excel (intenta header=1 y fallback a header=0)
        read_error = None
        df = None
        t_read_excel = time.time()
        for hdr in (1, 0):
            try:
                df = pd.read_excel(archivo, header=hdr)
                if hdr == 1 and len(df) > 0:
                    encabezado = df.iloc[0]
                    df.columns = encabezado
                    df = df.drop(index=0).reset_index(drop=True)
                # Normalizar encabezados a UPPER y sin espacios extras
                df.columns = df.columns.astype(str).str.strip().str.upper()
                break
            except Exception as e:
                read_error = e
                df = None
                continue
        if df is None:
            return Response({
                "success": False,
                "detail": f"Error al leer el Excel: {str(read_error)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        print(f"[POST] Lectura y normalización de Excel en {time.time()-t_read_excel:.3f}s. Filas: {len(df)}")

        df = df.rename(columns={
            "NIT RECAUDADOR": "nit_recaudador",
            "NOMBRE RECAUDADOR": "nombre_recaudador",
            "NIT PROVEEDOR": "nit_proveedor",
            "NOMBRE PROVEEDOR": "nombre_proveedor",
            "NO FACTURA UNICA": "nro_factura_unica",
            "DEPARTAMENTO PROCEDENCIA": "departamento",
            "MUNICIPIO PROCEDENCIA": "municipio",
            # "TIPO DE COMPRADOR": "tipo_comprador",
            "FECHA DE COMPRA": "fecha_compra",
            "KILOS COMPRADOS": "nro_kilos",
            "VALOR UNITARIO": "valor_kilo",
            "VALOR BRUTO": "valor_bruto",
            "CUOTA DE FOMENTO": "cuota_fomento",
            "VALOR NETO": "valor_neto",
            "TIPO DE CACAO": "tipo_cacao",
            "DOCUMENTO SOPORTE": "nro_documento_soporte",
        })

        # Validar que las columnas necesarias existan
        columnas_requeridas = [
            "nit_proveedor", "nombre_proveedor", "nro_factura_unica", "departamento",
            "municipio", "fecha_compra", "nro_kilos", "valor_kilo",
            "valor_bruto", "cuota_fomento", "valor_neto", "tipo_cacao"
        ]
        
        # Campo opcional (puede estar vacío)
        columnas_opcionales = ["nro_documento_soporte"]
        
        # Para cargue interno, las columnas de recaudador son OBLIGATORIAS
        columnas_requeridas_recaudador = ["nit_recaudador", "nombre_recaudador"]
        tiene_datos_recaudador = all(col in df.columns for col in columnas_requeridas_recaudador)
        
        # Validar que las columnas de recaudador estén presentes
        if not tiene_datos_recaudador:
            columnas_faltantes_recaudador = [col for col in columnas_requeridas_recaudador if col not in df.columns]
            return Response({
                "success": False,
                "detail": f"Error: Se está subiendo el formato externo en lugar del interno. Las columnas de recaudador son obligatorias para el cargue interno: {', '.join(columnas_faltantes_recaudador)}. Use el endpoint de cargue externo o incluya las columnas de recaudador en el archivo."
            }, status=status.HTTP_400_BAD_REQUEST)

        columnas_faltantes = [col for col in columnas_requeridas if col not in df.columns]
        if columnas_faltantes:
            return Response({
                "success": False,
                "detail": f"El archivo Excel no contiene las columnas requeridas: {', '.join(columnas_faltantes)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        df = df[df["nro_factura_unica"].notnull()]
        df["nro_factura_unica"] = df["nro_factura_unica"].astype(int)

        # ELIMINADA validación duplicada de campos vacíos
        # La validación completa en _validar_datos_completos maneja esto mejor
        errores_nan = []
        
        # VALIDACIÓN COMPLETA ANTES DE GUARDAR NADA
        t_valid = time.time()
        validacion_resultado = self._validar_datos_completos(df, tiene_datos_recaudador)
        
        # Extraer errores y caches para reutilizar en creación
        if isinstance(validacion_resultado, dict):
            errores_validacion = validacion_resultado.get('errores', [])
            tipos_cacao_cache = validacion_resultado.get('tipos_cacao_cache', {})
            tipos_cacao_exactos = validacion_resultado.get('tipos_cacao_exactos', {})
            departamentos_cache = validacion_resultado.get('departamentos_cache', {})
            municipios_cache = validacion_resultado.get('municipios_cache', {})
            personas_cache = validacion_resultado.get('personas_cache', {})
        else:
            # Fallback si solo retorna errores
            errores_validacion = validacion_resultado
        
        # CONSOLIDAR todos los errores (NaN + validación completa)
        errores_consolidados = errores_nan + errores_validacion
        
        print(f"[POST] Validación completa en {time.time()-t_valid:.3f}s. Errores NaN: {len(errores_nan)}, Errores validación: {len(errores_validacion)}, Total: {len(errores_consolidados)}")
        
        if errores_consolidados:
            return Response({
                "success": False,
                "detail": "El archivo cargado presenta una estructura de columnas inválidas. Verifique los datos y el orden de los campos.",
                "errores": errores_consolidados
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            cuota_fomento_obj = PorcentajesCobro.objects.get(cod_tipo_cobro="CF")
        except PorcentajesCobro.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró el porcentaje de cobro 'CF'."
            }, status=status.HTTP_400_BAD_REQUEST)

        ultimo_nro = FacturaUnica.objects.aggregate(ultimo=Max("nro_factura_unica"))["ultimo"] or 0
        grupo_facturas = df.groupby("nro_factura_unica")
        total_kilos_reportados = 0
        facturas_creadas = []  # Lista para tracking de facturas creadas
        errores = []  # Lista para errores durante creación

        # Crear facturas (ya están validadas) - BULK_CREATE VERDADERO
        t_creacion = time.time()
        print(f"[POST] Preparando {len(grupo_facturas)} facturas para bulk_create REAL...")
        
        # Listas para bulk operations
        facturas_para_bulk = []
        detalles_para_bulk = []
        facturas_temp_data = []  # Para tracking y respuesta
        
        contador_facturas = 0
        for nro_factura_plantilla, grupo in grupo_facturas:
            contador_facturas += 1
            if contador_facturas % 50 == 0:
                print(f"[POST] Procesando factura {contador_facturas}/{len(grupo_facturas)}...")
            
            fila_referencia = grupo.iloc[0]
            try:
                # Obtener datos ya validados
                if tiene_datos_recaudador:
                    recaudador = personas_cache.get(str(fila_referencia["nit_recaudador"]))
                else:
                    # Si no vienen datos del recaudador, usar el usuario logueado
                    recaudador = usuario.persona
                proveedor = personas_cache.get(str(fila_referencia["nit_proveedor"]))
                nombre_departamento = normalizar_texto(fila_referencia["departamento"])
                nombre_municipio = normalizar_texto(fila_referencia["municipio"])
                
                departamento = departamentos_cache.get(nombre_departamento)
                municipio_key = (nombre_municipio, departamento.cod_departamento)
                municipio = municipios_cache.get(municipio_key)
                
                fecha_compra = pd.to_datetime(fila_referencia["fecha_compra"])
                if isinstance(fecha_compra, pd.Timestamp):
                    fecha_compra = fecha_compra.to_pydatetime()
                if timezone.is_naive(fecha_compra):
                    fecha_compra = make_aware(fecha_compra)

                nro_documento_soporte = fila_referencia.get("nro_documento_soporte", None)
                if pd.isna(nro_documento_soporte) or str(nro_documento_soporte).strip() == "":
                    nro_documento_soporte = None  

                total_kilos = total_valor_bruto = total_cuota_fomento = total_valor_neto = 0
                detalles = []

                for index_df, fila in grupo.iterrows():
                    # Usar validación exacta ya validada
                    tipo_cacao = tipos_cacao_exactos.get(fila["tipo_cacao"])

                    # Validar que los campos numéricos no sean NaN, vacíos o inválidos
                    campos_numericos = ["nro_kilos", "valor_kilo", "valor_bruto", "cuota_fomento", "valor_neto"]
                    
                    for campo in campos_numericos:
                        valor_campo = fila[campo]
                        
                        # Verificar si está vacío o es NaN
                        if pd.isna(valor_campo) or str(valor_campo).strip() == "":
                            errores.append({
                                "nro_factura_plantilla": int(nro_factura_plantilla),
                                "error": f"El campo '{campo}' no puede estar vacío"
                            })
                            continue
                    
                    if errores and errores[-1]["nro_factura_plantilla"] == int(nro_factura_plantilla):
                        continue  # Saltar al siguiente grupo si ya hay errores
                    
                    try:
                        # Convertir a float y validar
                        nro_kilos = float(fila["nro_kilos"])
                        valor_kilo = float(fila["valor_kilo"])
                        valor_bruto = float(fila["valor_bruto"])
                        cuota_fomento = float(fila["cuota_fomento"])
                        valor_neto = float(fila["valor_neto"])
                        
                        # Validaciones específicas
                        validaciones = [
                            (nro_kilos, "nro_kilos", "Los kilos deben ser mayor a 0"),
                            (valor_kilo, "valor_kilo", "El valor por kilo debe ser mayor a 0"),
                            (valor_bruto, "valor_bruto", "El valor bruto debe ser mayor a 0"),
                            (cuota_fomento, "cuota_fomento", "La cuota de fomento debe ser mayor o igual a 0"),
                            (valor_neto, "valor_neto", "El valor neto debe ser mayor a 0")
                        ]
                        
                        for valor, nombre_campo, mensaje in validaciones:
                            # Verificar que no sea infinito o NaN
                            if not math.isfinite(valor):
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"El campo '{nombre_campo}' contiene un valor inválido (infinito o NaN)"
                                })
                                continue
                            
                            # Verificar rangos específicos
                            if nombre_campo == "cuota_fomento":
                                if valor < 0:
                                    errores.append({
                                        "nro_factura_plantilla": int(nro_factura_plantilla),
                                        "error": mensaje
                                    })
                            else:
                                if valor <= 0:
                                    errores.append({
                                        "nro_factura_plantilla": int(nro_factura_plantilla),
                                        "error": mensaje
                                    })
                        
                        # Si hay errores en esta factura, continuar al siguiente grupo
                        if errores and errores[-1]["nro_factura_plantilla"] == int(nro_factura_plantilla):
                            continue
                            
                    except (ValueError, TypeError) as e:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Error al convertir valores numéricos: {str(e)}. Verifique que no contengan letras u otros caracteres inválidos"
                        })
                        continue

                    # Convertir a Decimal para el modelo
                    nro_kilos_decimal = Decimal(str(nro_kilos))
                    valor_kilo_decimal = Decimal(str(valor_kilo))
                    valor_bruto_decimal = Decimal(str(valor_bruto))
                    cuota_fomento_decimal = Decimal(str(cuota_fomento))
                    valor_neto_decimal = Decimal(str(valor_neto))

                    total_kilos += nro_kilos_decimal
                    total_valor_bruto += valor_bruto_decimal
                    total_cuota_fomento += cuota_fomento_decimal
                    total_valor_neto += valor_neto_decimal

                    detalles.append(DetallesFacturaUnica(
                        nro_kilos=nro_kilos_decimal,
                        valor_kilo=valor_kilo_decimal,
                        id_tipo_cacao=tipo_cacao
                    ))

                ultimo_nro += 1
                nuevo_nro_factura = ultimo_nro

                # PREPARAR factura para bulk_create (NO crear todavía)
                # Generar UUID de cargue si aún no existe en el request
                if not hasattr(request, "_uuid_cargue"):
                    import uuid
                    request._uuid_cargue = uuid.uuid4()

                # Generar UUID de cargue si aún no existe en el request
                if not hasattr(request, "_uuid_cargue"):
                    import uuid
                    request._uuid_cargue = uuid.uuid4()

                factura_obj = FacturaUnica(
                    nro_factura_unica=nuevo_nro_factura,
                    total_kilos=total_kilos,
                    valor_bruto=total_valor_bruto,
                    cuota_fomento=total_cuota_fomento,
                    valor_neto=total_valor_neto,
                    id_persona_proveedor=proveedor,
                    id_persona_recaudador=recaudador,
                    id_departamento_cacao=departamento,
                    id_municipio_cacao=municipio,
                    id_porcentaje_cobro=cuota_fomento_obj,
                    id_persona_crea=request.user.persona,
                    fecha_compra=fecha_compra,
                    nro_documento_soporte=nro_documento_soporte,
                    uuid_cargue=getattr(request, "_uuid_cargue", None)
                )
                facturas_para_bulk.append(factura_obj)
                
                # Guardar data temporal para tracking
                facturas_temp_data.append({
                    'nro_factura_plantilla': int(nro_factura_plantilla),
                    'nro_factura_nuevo': nuevo_nro_factura,
                    'index_en_bulk': len(facturas_para_bulk) - 1,
                    'detalles': detalles.copy()  # guardar detalles para después
                })
                
                # TODO: Auditoría se movió después del bulk_create
                """
                #Auditoria 
                persona = request.user.persona
                nombre_persona = (
                    f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                    if persona and persona.tipo_persona == 'N'
                    else persona.razon_social if persona and persona.tipo_persona == 'J'
                    else "Usuario desconocido"
                )

                descripcion = {
                    "Mensaje": "Factura creada por carga masiva",
                    "NumeroFactura": factura.nro_factura_unica,
                    "Proveedor": str(proveedor),
                    "Recaudador": str(recaudador),
                    "Registrado por": nombre_persona
                }

                valores_actualizados = {
                    "create": {
                        "Nuevo": {
                            "NroFacturaUnica": factura.nro_factura_unica,
                            "FechaCompra": factura.fecha_compra.strftime('%Y-%m-%d'),
                            "TotalKilos": factura.total_kilos,
                            "ValorBruto": str(factura.valor_bruto),
                            "CuotaFomento": str(factura.cuota_fomento),
                            "ValorNeto": str(factura.valor_neto),
                            "Proveedor": proveedor.id_persona,
                            "Recaudador": recaudador.id_persona,
                            "Departamento": departamento.cod_departamento,
                            "Municipio": municipio.cod_municipio,
                            "PorcentajeCobro": factura.id_porcentaje_cobro.cod_tipo_cobro
                        }
                    }
                }

                auditoria_data = {
                    "id_usuario": request.user.id_usuario,
                    "id_modulo": 18,  
                    "cod_permiso": "CR",
                    "subsistema": "GERE",
                    "dirip": Util.get_client_ip(request),
                    "descripcion": json.dumps(descripcion),
                    "valores_actualizados": json.dumps(valores_actualizados)
                }

                # Util.save_auditoria(auditoria_data)
                """

                total_kilos_reportados += total_kilos

            except Exception as e:
                errores.append({
                    "nro_factura_plantilla": int(nro_factura_plantilla),
                    "error": str(e)
                })
                continue

        # EJECUTAR BULK_CREATE VERDADERO
        print(f"[POST] Ejecutando bulk_create de {len(facturas_para_bulk)} facturas...")
        t_bulk_facturas = time.time()
        
        if facturas_para_bulk:
            # Crear todas las facturas de una vez
            facturas_creadas_db = FacturaUnica.objects.bulk_create(facturas_para_bulk)
            print(f"[POST] ✅ {len(facturas_creadas_db)} facturas creadas en {time.time()-t_bulk_facturas:.3f}s")
            
            # Preparar detalles con las facturas recién creadas
            t_bulk_detalles = time.time()
            for temp_data in facturas_temp_data:
                index = temp_data['index_en_bulk']
                factura_creada = facturas_creadas_db[index]
                
                # Asignar factura a todos los detalles de esta factura
                for detalle in temp_data['detalles']:
                    detalle.id_factura_unica = factura_creada
                    detalles_para_bulk.append(detalle)
            
            # Bulk create de TODOS los detalles
            if detalles_para_bulk:
                DetallesFacturaUnica.objects.bulk_create(detalles_para_bulk)
                print(f"[POST] ✅ {len(detalles_para_bulk)} detalles creados en {time.time()-t_bulk_detalles:.3f}s")
            
            # Crear lista para compatibilidad con el resto del código
            facturas_creadas = [{
                "nro_factura_plantilla": temp_data['nro_factura_plantilla'],
                "nro_factura_nuevo": temp_data['nro_factura_nuevo']
            } for temp_data in facturas_temp_data]

        # Si no se creó ninguna factura, retornar error y NO enviar notificaciones
        if not facturas_creadas:
            return Response({
                "success": False,
                "detail": "No se creó ninguna factura.",
                "errores": errores
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"[POST] Creación optimizada completa en {time.time()-t_creacion:.3f}s. Total creadas: {len(facturas_creadas)}")
        # Calcular totales consolidados para notificaciones
        totales_consolidados = self._calcular_totales_cargue_masivo(facturas_creadas)

        # Obtener la fecha actual
        fecha_actual = datetime.now()
        fecha_actual_formateada = fecha_actual.strftime('%d-%b-%Y')

        facturas_registradas = len(facturas_creadas)
        total_kilos_consolidado = totales_consolidados['total_kilos']
        valor_total_consolidado = totales_consolidados['valor_total']
        total_cuota_fomento_consolidado = totales_consolidados['total_cuota_fomento']
        
        # Formatear valores
        total_kilos_formateado = f"{total_kilos_consolidado:,.0f}"
        valor_total_formateado = f"{valor_total_consolidado:,.0f}"
        cuota_fomento_formateado = f"{total_cuota_fomento_consolidado:,.0f}"
        
    # Obtener el recaudador principal (el que más facturas tiene)
        recaudador_principal = totales_consolidados['recaudador_principal']
        
        # Variables para tracking de notificaciones enviadas
        email_enviado = False
        sms_enviado = False
        
        # Enviar notificaciones (email y SMS) y medir tiempos
        if recaudador_principal and recaudador_principal.email:
            subject = "Compra Masiva Registrada"
            template = "compra-masiva-facturas.html"

            if recaudador_principal.tipo_persona == 'N':
                nombre_de_usuario = f"{recaudador_principal.primer_nombre} {recaudador_principal.primer_apellido}"
            else:
                nombre_de_usuario = recaudador_principal.razon_social

            try:
                t_email0 = time.time()
                print(f"[POST] Enviando email a recaudador {recaudador_principal.id_persona} ({recaudador_principal.email})...")
                Util.notificacion(
                    recaudador_principal,
                    subject,
                    template,
                    fecha_registro=fecha_actual_formateada,
                    total_kilos_reportados=total_kilos_formateado,
                    facturas_registradas=facturas_registradas,
                    valor_total_facturas=valor_total_formateado,
                    nombre_de_usuario=nombre_de_usuario
                )
                email_enviado = True
                print(f"[POST] Email enviado en {time.time()-t_email0:.3f}s a {recaudador_principal.email}")
            except Exception as e:
                print(f"[POST] Error enviando email: {e}")

        # Enviar UN SOLO SMS al usuario que hizo el cargue
        telefono_usuario = request.user.persona.telefono_celular or request.user.persona.telefono_empresa
        if telefono_usuario:
            facturas_numeros = [f["nro_factura_nuevo"] for f in facturas_creadas]
            factura_min = min(facturas_numeros) if facturas_numeros else 0
            factura_max = max(facturas_numeros) if facturas_numeros else 0

            sms_mensaje = (
                f"Fedecacao - Cargue masivo completado: {facturas_registradas} facturas "
                f"(#{factura_min}-#{factura_max}), Kilos: {total_kilos_formateado}, "
                f"Valor: ${valor_total_formateado}"
            )
            try:
                t_sms0 = time.time()
                print(f"[POST] Enviando SMS a usuario {request.user.id_usuario} (***{str(telefono_usuario)[-4:]})...")
                Util.send_sms(telefono_usuario, sms_mensaje)
                sms_enviado = True
                print(f"[POST] SMS enviado en {time.time()-t_sms0:.3f}s")
            except Exception as e:
                print(f"[POST] Error enviando SMS: {e}")

        # Serializar las facturas creadas junto con sus detalles y los datos adicionales
        facturas_serializadas = []
        t_serialize = time.time()
        for factura_creada in facturas_creadas:
            factura = FacturaUnica.objects.get(nro_factura_unica=factura_creada["nro_factura_nuevo"])
            factura_data = FacturaUnicaSerializer(factura).data
            detalles_data = DetallesFacturaUnicaSerializer(factura.detallesfacturaunica_set.all(), many=True).data
            factura_data["detalles"] = detalles_data
            factura_data["nro_factura_plantilla"] = factura_creada["nro_factura_plantilla"]
            factura_data["nro_factura_nuevo"] = factura_creada["nro_factura_nuevo"]

            # Calcular el promedio de valor_kilo de los detalles de esta factura
            if detalles_data:
                promedio_valor_kilo = round(
                    sum(float(det["valor_kilo"]) for det in detalles_data if det.get("valor_kilo")) / len(detalles_data), 2
                )
            else:
                promedio_valor_kilo = 0
            factura_data["promedio_valor_kilo"] = promedio_valor_kilo

            facturas_serializadas.append(factura_data)

        print(f"[POST] Serialización en {time.time()-t_serialize:.3f}s")
        print(f"[POST] Proceso completo en {time.time()-post_start:.3f}s")
        return Response({
            "success": True,
            "detail": "Facturas creadas exitosamente (carga parcial si aplica).",
            "uuid_cargue": str(getattr(request, "_uuid_cargue", "")),
            "notificaciones": {
                "email_enviado": email_enviado,
                "email_destinatario": recaudador_principal.email if recaudador_principal and recaudador_principal.email else None,
                "sms_enviado": sms_enviado,
                "facturas_registradas": facturas_registradas,
                "total_kilos": total_kilos_formateado,
                "valor_total": valor_total_formateado
            }
        }, status=status.HTTP_201_CREATED)



class CargueMasivoFacturaUnicaExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoCrearRegistroCompraCacao ]

    def _calcular_totales_cargue_masivo(self, facturas_creadas):
        """
        Calcula los totales consolidados para el cargue masivo
        """
        print("[CALCULAR_TOTALES] 🧮 Iniciando cálculo de totales...")
        total_kilos = 0
        valor_total = 0
        total_cuota_fomento = 0
        recaudadores_count = {}
        
        for factura_creada in facturas_creadas:
            factura = FacturaUnica.objects.get(nro_factura_unica=factura_creada["nro_factura_nuevo"])
            recaudador = factura.id_persona_recaudador
            
            total_kilos += factura.total_kilos
            valor_total += factura.valor_neto
            total_cuota_fomento += factura.cuota_fomento
            
            # Contar facturas por recaudador
            if recaudador not in recaudadores_count:
                recaudadores_count[recaudador] = 0
            recaudadores_count[recaudador] += 1
        
        # Obtener el recaudador con más facturas
        recaudador_principal = max(recaudadores_count.items(), key=lambda x: x[1])[0] if recaudadores_count else None
        
        print(f"[CALCULAR_TOTALES] ✅ Totales calculados: {total_kilos} kilos, ${valor_total}, {total_cuota_fomento} cuota fomento")
        
        return {
            'total_kilos': total_kilos,
            'valor_total': valor_total,
            'total_cuota_fomento': total_cuota_fomento,
            'recaudador_principal': recaudador_principal
        }

    def _validar_datos_completos(self, df, recaudador):
        """
        Valida todos los datos del archivo Excel antes de guardar cualquier cosa.
        Retorna una lista de errores encontrados.
        """
        import time
        start_total = time.time()
        print("[VALIDACION] Iniciando _validar_datos_completos")

        errores = []
        grupo_facturas = df.groupby("nro_factura_unica")
        print(f"[VALIDACION] Total grupos (nro_factura_unica): {len(grupo_facturas)}")

        # OPTIMIZACIÓN: Pre-cargar datos para evitar consultas N+1
        print("[VALIDACION] Pre-cargando datos...")
        t_cache = time.time()
        
        # Cache de tipos de cacao (se usa mucho en validación)
        tipos_cacao_list = TiposCacao.objects.all()
        tipos_cacao_cache = {normalizar_texto(t.nombre): t for t in tipos_cacao_list}
        # Cache adicional para validación exacta (case-sensitive)
        tipos_cacao_exactos = {t.nombre: t for t in tipos_cacao_list}
        print(f"[VALIDACION] ✅ Cache tipos de cacao: {len(tipos_cacao_cache)} items")
        
        # Cache de departamentos
        departamentos_list = Departamento.objects.all()
        departamentos_cache = {normalizar_texto(d.nombre): d for d in departamentos_list}
        print(f"[VALIDACION] ✅ Cache departamentos: {len(departamentos_cache)} items")
        
        # Cache de municipios
        municipios_list = Municipio.objects.all()
        municipios_cache = {}
        for municipio in municipios_list:
            key = (normalizar_texto(municipio.nombre), municipio.cod_departamento_id)
            municipios_cache[key] = municipio
        print(f"[VALIDACION] ✅ Cache municipios: {len(municipios_cache)} items")
        
        # Cache de personas (NITs únicos del DataFrame)
        nits_unicos = set()
        for _, fila in df.iterrows():
            if not pd.isna(fila["nit_proveedor"]):
                nits_unicos.add(str(fila["nit_proveedor"]))
        
        personas_cache = {}
        if nits_unicos:
            personas_list = Personas.objects.filter(numero_documento__in=nits_unicos)
            personas_cache = {p.numero_documento: p for p in personas_list}
        print(f"[VALIDACION] ✅ Cache personas: {len(personas_cache)} items de {len(nits_unicos)} NITs")
        
        print(f"[VALIDACION] Cache completo en {time.time()-t_cache:.3f}s")
        
        # Obtener el porcentaje de cobro una sola vez
        try:
            cuota_fomento_obj = PorcentajesCobro.objects.get(cod_tipo_cobro="CF")
        except PorcentajesCobro.DoesNotExist:
            errores.append({
                "error": "No se encontró el porcentaje de cobro 'CF'."
            })
            return errores


        # Campos clave para verificar inconsistencias (solo campos que deben ser consistentes en toda la factura)
        campos_clave = [
            "municipio", "departamento", "fecha_compra", "nit_proveedor", "nombre_proveedor"
            # NOTA: nro_kilos, valor_kilo, valor_bruto, cuota_fomento, valor_neto pueden ser diferentes entre detalles
        ]
        
        t_inconsistencias = time.time()
        for nro_factura_plantilla, grupo in grupo_facturas:
            # Validar inconsistencias en campos clave
            campos_invalidos = {}
            for campo in campos_clave:
                if campo in grupo.columns:
                    valores_unicos = grupo[campo].dropna().astype(str).str.strip().str.lower().unique()
                    if len(valores_unicos) > 1:
                        campos_invalidos[campo.upper()] = list(valores_unicos)
            if campos_invalidos:
                errores.append({
                    "nro_factura_plantilla": int(nro_factura_plantilla),
                    "error": f"Inconsistencias en campos para No FACTURA UNICA = {nro_factura_plantilla}.",
                    "campos_inconsistentes": campos_invalidos
                })
        print(f"[VALIDACION] Inconsistencias revisadas en {time.time()-t_inconsistencias:.3f}s")

        # Validar tipos de cacao con coincidencia exacta
        errores_unicos = set()  
        for nro_factura_plantilla, grupo in grupo_facturas:
            for _, fila in grupo.iterrows():
                # Primero validar coincidencia exacta (case-sensitive)
                tipo_cacao_exacto = tipos_cacao_exactos.get(fila["tipo_cacao"])
                if not tipo_cacao_exacto:
                    # Si no hay coincidencia exacta, verificar si existe con normalización
                    nombre_tipo_cacao = normalizar_texto(fila["tipo_cacao"])
                    tipo_cacao_normalizado = tipos_cacao_cache.get(nombre_tipo_cacao)
                    if tipo_cacao_normalizado:
                        # Existe pero no coincide exactamente - dar sugerencia
                        errores_unicos.add((
                            int(nro_factura_plantilla),
                            f"Tipo de cacao '{fila['tipo_cacao']}' debe escribirse exactamente como: '{tipo_cacao_normalizado.nombre}'"
                        ))
                    else:
                        # No existe en absoluto
                        errores_unicos.add((
                            int(nro_factura_plantilla),
                            f"El tipo de cacao '{fila['tipo_cacao']}' no existe en la base de datos."
                        ))
                elif not tipo_cacao_exacto.activo:
                    errores_unicos.add((
                        int(nro_factura_plantilla),
                        f"El tipo de cacao '{fila['tipo_cacao']}' está inactivo."
                    ))

        # Convertir el conjunto de errores únicos en una lista de diccionarios
        errores.extend([
            {"nro_factura_plantilla": nro_factura, "error": error}
            for nro_factura, error in errores_unicos
        ])

        # Validar cada factura individualmente
        t_detalle_valid = time.time()
        for nro_factura_plantilla, grupo in grupo_facturas:
            fila_referencia = grupo.iloc[0]
            
            try:
                # Validar proveedor
                nit_proveedor = fila_referencia["nit_proveedor"]
                # Manejar valores NaN de pandas
                if pd.isna(nit_proveedor):
                    nit_proveedor_display = "vacío o inválido"
                else:
                    nit_proveedor_display = str(nit_proveedor)
                
                proveedor = personas_cache.get(str(nit_proveedor))
                if not proveedor:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"Proveedor con NIT {nit_proveedor_display} no existe."
                    })
                    continue

                # Comparar nombre del proveedor
                nombre_proveedor_excel = normalizar_texto(fila_referencia["nombre_proveedor"])
                if proveedor.tipo_persona == "N":
                    nombre_proveedor_bd = normalizar_texto(
                        " ".join(filter(None, [
                            proveedor.primer_nombre,
                            proveedor.segundo_nombre,
                            proveedor.primer_apellido,
                            proveedor.segundo_apellido
                        ]))
                    )
                    # Para personas naturales, mantener validación estricta
                    if nombre_proveedor_excel != nombre_proveedor_bd:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"El nombre del proveedor no coincide. NIT: {fila_referencia['nit_proveedor']}, "
                                    f"Nombre esperado: '{nombre_proveedor_bd}', Nombre recibido: '{fila_referencia['nombre_proveedor']}'."
                        })
                        continue
                else:
                    # Para personas jurídicas, validar tanto razón social como nombre comercial
                    razon_social_bd = normalizar_texto(proveedor.razon_social or "")
                    nombre_comercial_bd = normalizar_texto(proveedor.nombre_comercial or "")
                    
                    # Verificar si coincide con alguno de los nombres (más flexible para jurídicas)
                    coincide = (
                        nombre_proveedor_excel == razon_social_bd or
                        nombre_proveedor_excel == nombre_comercial_bd or
                        (razon_social_bd and razon_social_bd in nombre_proveedor_excel) or
                        (razon_social_bd and nombre_proveedor_excel in razon_social_bd) or
                        (nombre_comercial_bd and nombre_comercial_bd in nombre_proveedor_excel) or
                        (nombre_comercial_bd and nombre_proveedor_excel in nombre_comercial_bd)
                    )
                    
                    if not coincide:
                        nombres_esperados = []
                        if razon_social_bd:
                            nombres_esperados.append(f"'{razon_social_bd}' (razón social)")
                        if nombre_comercial_bd:
                            nombres_esperados.append(f"'{nombre_comercial_bd}' (nombre comercial)")
                        
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"El nombre del proveedor no coincide. NIT: {fila_referencia['nit_proveedor']}, "
                                    f"Nombre esperado: {' o '.join(nombres_esperados)}, "
                                    f"Nombre recibido: '{fila_referencia['nombre_proveedor']}'."
                        })
                        continue

                # Validar departamento y municipio
                nombre_departamento = normalizar_texto(fila_referencia["departamento"])
                nombre_municipio = normalizar_texto(fila_referencia["municipio"])

                departamento = departamentos_cache.get(nombre_departamento)
                if not departamento:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"El departamento '{fila_referencia['departamento']}' no existe."
                    })
                    continue

                municipio_key = (nombre_municipio, departamento.cod_departamento)
                municipio = municipios_cache.get(municipio_key)
                if not municipio:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"El municipio '{fila_referencia['municipio']}' no pertenece al departamento '{departamento.nombre}'."
                    })
                    continue
                
                if not municipio.es_cacaotero:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"El municipio '{municipio.nombre}' no es cacaotero."
                    })
                    continue

                # Validar fecha de compra
                try:
                    fecha_raw = fila_referencia["fecha_compra"]
                    # Intentar diferentes formatos de fecha
                    if pd.isna(fecha_raw) or str(fecha_raw).strip() == "":
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Factura #{nro_factura_plantilla}: La fecha de compra está vacía o es inválida."
                        })
                        continue
                    
                    # Convertir a string para validar formato
                    fecha_str = str(fecha_raw).strip()
                    
                    # Validar formato de año (debe tener 4 dígitos)
                    if len(fecha_str) < 4 or not any(char.isdigit() for char in fecha_str):
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Factura #{nro_factura_plantilla}: Error en fecha de compra: formato inválido '{fecha_str}'. Debe ser una fecha válida con año de 4 dígitos."
                        })
                        continue
                    
                    fecha_compra = pd.to_datetime(fecha_raw)
                    if timezone.is_naive(fecha_compra):
                        fecha_compra = make_aware(fecha_compra)
                    if isinstance(fecha_compra, pd.Timestamp):
                        fecha_compra = fecha_compra.date()
                        
                except pd.errors.OutOfBoundsDatetime:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"Factura #{nro_factura_plantilla}: Error en fecha de compra: fecha fuera de rango '{fecha_raw}'. Verifique que el año tenga 4 dígitos y sea una fecha válida."
                    })
                    continue
                except Exception as e:
                    errores.append({
                        "nro_factura_plantilla": int(nro_factura_plantilla),
                        "error": f"Factura #{nro_factura_plantilla}: Error en fecha de compra: '{fecha_raw}' - {str(e)}"
                    })
                    continue

                # Validar cada detalle de la factura
                t_loop_inicio = time.time()
                for index_df, fila in grupo.iterrows():
                    try:
                        # Usar el tipo de cacao ya validado en la sección general
                        tipo_cacao = tipos_cacao_exactos.get(fila["tipo_cacao"])

                        # VALIDAR CAMPOS NUMÉRICOS OBLIGATORIOS
                        campos_numericos = ["nro_kilos", "valor_kilo", "valor_bruto", "cuota_fomento", "valor_neto"]
                        
                        # Verificar campos vacíos o NaN
                        for campo in campos_numericos:
                            valor_campo = fila[campo]
                            if pd.isna(valor_campo) or str(valor_campo).strip() == "":
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El campo '{campo}' no puede estar vacío"
                                })
                                continue
                        
                        # Si hay errores de campos vacíos en esta fila, continuar
                        if errores and errores[-1]["nro_factura_plantilla"] == int(nro_factura_plantilla):
                            continue
                        
                        # Convertir y validar rangos
                        try:
                            nro_kilos = float(fila["nro_kilos"])
                            valor_kilo = float(fila["valor_kilo"])
                            valor_bruto = float(fila["valor_bruto"])
                            cuota_fomento = float(fila["cuota_fomento"])
                            valor_neto = float(fila["valor_neto"])
                            
                            # Validaciones de rangos específicos
                            if nro_kilos <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: Los kilos deben ser mayor a 0 (valor: {nro_kilos})"
                                })
                                continue
                                
                            if valor_kilo <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El valor por kilo debe ser mayor a 0 (valor: {valor_kilo})"
                                })
                                continue
                                
                            if valor_bruto <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El valor bruto debe ser mayor a 0 (valor: {valor_bruto})"
                                })
                                continue
                                
                            if cuota_fomento < 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: La cuota de fomento debe ser mayor o igual a 0 (valor: {cuota_fomento})"
                                })
                                continue
                                
                            if valor_neto <= 0:
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"Fila #{index_df + 1}: El valor neto debe ser mayor a 0 (valor: {valor_neto})"
                                })
                                continue
                                
                        except (ValueError, TypeError) as conversion_error:
                            errores.append({
                                "nro_factura_plantilla": int(nro_factura_plantilla),
                                "error": f"Fila #{index_df + 1}: Error al convertir valores numéricos: {str(conversion_error)}. Verifique que no contengan letras u otros caracteres inválidos"
                            })
                            continue

                        # Validar cálculo de cuota de fomento
                        valor_esperado = round(valor_bruto * float(cuota_fomento_obj.valor), 2)
                        if round(cuota_fomento, 2) != valor_esperado:
                            errores.append({
                                "nro_factura_plantilla": int(nro_factura_plantilla),
                                "error": f"Fila #{index_df + 1}: El valor de la 'CUOTA DE FOMENTO' no coincide. Esperado: {valor_esperado}, recibido: {cuota_fomento}."
                            })

                    except Exception as e:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Fila #{index_df + 1}: Error en datos numéricos - {str(e)}"
                        })
                print(f"[VALIDACION] Grupo {int(nro_factura_plantilla)}: validación de {len(grupo)} filas en {time.time()-t_loop_inicio:.3f}s")

            except Exception as e:
                errores.append({
                    "nro_factura_plantilla": int(nro_factura_plantilla),
                    "error": f"Error general en factura: {str(e)}"
                })

        print(f"[VALIDACION] Finalizado _validar_datos_completos en {time.time()-start_total:.3f}s. Errores: {len(errores)}")
        
        # Retornar errores y caches para reutilizar en creación
        return {
            'errores': errores,
            'tipos_cacao_cache': tipos_cacao_cache,
            'tipos_cacao_exactos': tipos_cacao_exactos,
            'departamentos_cache': departamentos_cache,
            'municipios_cache': municipios_cache,
            'personas_cache': personas_cache
        }

    @transaction.atomic
    def post(self, request):
        import time
        post_start = time.time()
        print(f"[POST] 🚀 Inicio cargue masivo externo - Usuario: {request.user.id_usuario}")
        usuario = request.user

        # Generar UUID de cargue para agrupar todas las facturas de este proceso
        if not hasattr(request, "_uuid_cargue"):
            import uuid
            request._uuid_cargue = uuid.uuid4()

        if not hasattr(usuario, 'persona') or not usuario.persona:
            print("[POST] ❌ Error: Usuario sin persona asociada")
            return Response({
                "success": False,
                "detail": "El usuario no tiene persona asociada."
            }, status=status.HTTP_400_BAD_REQUEST)

        recaudador = usuario.persona
        print(f"[POST] ✅ Recaudador identificado: {recaudador.id_persona} - {recaudador.razon_social or recaudador.primer_nombre}")

        archivo = request.FILES.get("archivo")
        if not archivo:
            print("[POST] ❌ Error: No se proporcionó archivo")
            return Response({
                "success": False,
                "detail": "Debe adjuntar el archivo Excel."
            }, status=status.HTTP_400_BAD_REQUEST)

        print(f"[POST] 📁 Archivo recibido: {archivo.name} - Tamaño: {archivo.size} bytes")

        try:
            validate_file(archivo, ALLOWED_EXCEL_EXTENSIONS)
            print("[POST] ✅ Validación de archivo exitosa")
        except ValidationError as e:
            print(f"[POST] ❌ Error validación archivo: {str(e)}")
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Lectura robusta de Excel (intenta header=1 y fallback a header=0)
        read_error = None
        df = None
        t_read_excel = time.time()
        print("[POST] 📊 Iniciando lectura de archivo Excel...")
        
        for hdr in (1, 0):
            try:
                print(f"[POST] 🔍 Intentando leer con header={hdr}...")
                df = pd.read_excel(archivo, header=hdr)
                if hdr == 1 and len(df) > 0:
                    print("[POST] 🔄 Procesando encabezado en primera fila...")
                    encabezado = df.iloc[0]
                    df.columns = encabezado
                    df = df.drop(index=0).reset_index(drop=True)
                # Normalizar encabezados a UPPER y sin espacios extras
                df.columns = df.columns.astype(str).str.strip().str.upper()
                print(f"[POST] ✅ Lectura exitosa con header={hdr}. Columnas detectadas: {list(df.columns)}")
                break
            except Exception as e:
                print(f"[POST] ⚠️ Error con header={hdr}: {str(e)}")
                read_error = e
                df = None
                continue
                
        if df is None:
            print(f"[POST] ❌ Error crítico: No se pudo leer el Excel. Último error: {str(read_error)}")
            return Response({
                "success": False,
                "detail": f"Error al leer el Excel: {str(read_error)}"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        print(f"[POST] ✅ Lectura y normalización de Excel completada en {time.time()-t_read_excel:.3f}s. Filas: {len(df)}")

        print("[POST] 🔄 Renombrando columnas...")
        df = df.rename(columns={
            "NIT RECAUDADOR": "nit_recaudador",
            "NOMBRE RECAUDADOR": "nombre_recaudador",
            "NIT PROVEEDOR": "nit_proveedor",
            "NOMBRE PROVEEDOR": "nombre_proveedor",
            "NO FACTURA UNICA": "nro_factura_unica",
            "DEPARTAMENTO PROCEDENCIA": "departamento",
            "MUNICIPIO PROCEDENCIA": "municipio",
            # "TIPO DE COMPRADOR": "tipo_comprador",
            "FECHA DE COMPRA": "fecha_compra",
            "KILOS COMPRADOS": "nro_kilos",
            "VALOR UNITARIO": "valor_kilo",
            "VALOR BRUTO": "valor_bruto",
            "CUOTA DE FOMENTO": "cuota_fomento",
            "VALOR NETO": "valor_neto",
            "TIPO DE CACAO": "tipo_cacao",
            "DOCUMENTO SOPORTE": "nro_documento_soporte",
        })
        print(f"[POST] ✅ Columnas renombradas. Columnas finales: {list(df.columns)}")

        # Validar que las columnas necesarias existan
        print("[POST] 🔍 Validando columnas requeridas...")
        columnas_requeridas = [
            "nit_proveedor", "nombre_proveedor", "fecha_compra", "nro_factura_unica",
            "departamento", "municipio", "tipo_cacao", "nro_kilos", "valor_kilo",
            "valor_bruto", "cuota_fomento", "valor_neto"
        ]
        
        # Campo opcional (puede estar vacío)
        columnas_opcionales = ["nro_documento_soporte"]
        
        columnas_faltantes = [col for col in columnas_requeridas if col not in df.columns]
        if columnas_faltantes:
            print(f"[POST] ❌ Columnas faltantes: {columnas_faltantes}")
            return Response({
                "success": False,
                "detail": f"El archivo Excel no contiene las columnas requeridas: {', '.join(columnas_faltantes)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print("[POST] ✅ Todas las columnas requeridas están presentes")

        print("[POST] 🔄 Procesando datos de facturas...")
        df = df[df["nro_factura_unica"].notnull()]
        df["nro_factura_unica"] = df["nro_factura_unica"].astype(int)
        print(f"[POST] ✅ Datos procesados. Facturas únicas encontradas: {df['nro_factura_unica'].nunique()}")

        # ELIMINADA validación duplicada de campos vacíos
        # La validación completa en _validar_datos_completos maneja esto mejor
        errores_nan = []
        
        # VALIDACIÓN COMPLETA ANTES DE GUARDAR NADA
        print("[POST] 🔍 Iniciando validación completa de datos...")
        t_valid = time.time()
        validacion_resultado = self._validar_datos_completos(df, recaudador)
        
        # Extraer errores y caches para reutilizar en creación
        if isinstance(validacion_resultado, dict):
            errores_validacion = validacion_resultado.get('errores', [])
            tipos_cacao_cache = validacion_resultado.get('tipos_cacao_cache', {})
            tipos_cacao_exactos = validacion_resultado.get('tipos_cacao_exactos', {})
            departamentos_cache = validacion_resultado.get('departamentos_cache', {})
            municipios_cache = validacion_resultado.get('municipios_cache', {})
            personas_cache = validacion_resultado.get('personas_cache', {})
            print(f"[POST] ✅ Validación completada con caches. Errores encontrados: {len(errores_validacion)}")
        else:
            # Fallback si solo retorna errores
            errores_validacion = validacion_resultado
            print(f"[POST] ⚠️ Validación retornó solo errores: {len(errores_validacion)}")
        
        # CONSOLIDAR todos los errores (NaN + validación completa)
        errores_consolidados = errores_nan + errores_validacion
        
        print(f"[POST] 📊 Validación completa en {time.time()-t_valid:.3f}s. Errores NaN: {len(errores_nan)}, Errores validación: {len(errores_validacion)}, Total: {len(errores_consolidados)}")
        
        if errores_consolidados:
            print(f"[POST] ❌ Validación falló con {len(errores_consolidados)} errores")
            return Response({
                "success": False,
                "detail": "El archivo cargado presenta una estructura de columnas inválidas. Verifique los datos y el orden de los campos.",
                "errores": errores_consolidados
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print("[POST] ✅ Validación exitosa, procediendo con la creación de facturas...")

        print("[POST] 🔍 Obteniendo datos de configuración...")
        try:
            cuota_fomento_obj = PorcentajesCobro.objects.get(cod_tipo_cobro="CF")
            print(f"[POST] ✅ Cuota fomento obtenida: {cuota_fomento_obj.valor}%")
        except PorcentajesCobro.DoesNotExist:
            print("[POST] ❌ Error: No se encontró el porcentaje de cobro 'CF'")
            return Response({
                "success": False,
                "detail": "No se encontró el porcentaje de cobro 'CF'."
            }, status=status.HTTP_400_BAD_REQUEST)

        print("[POST] 🔍 Obteniendo último número de factura...")
        ultimo_nro = FacturaUnica.objects.aggregate(ultimo=Max("nro_factura_unica"))["ultimo"] or 0
        print(f"[POST] ✅ Último número de factura: {ultimo_nro}")
        
        grupo_facturas = df.groupby("nro_factura_unica")
        total_kilos_reportados = 0
        facturas_creadas = []  # Lista para tracking de facturas creadas
        errores = []  # Lista para errores durante creación

        # Crear facturas (ya están validadas) - BULK_CREATE VERDADERO
        print(f"[POST] 🏗️ Iniciando creación de {len(grupo_facturas)} facturas...")
        t_creacion = time.time()
        print(f"[POST] 📊 Preparando {len(grupo_facturas)} facturas para bulk_create REAL...")
        
        # Listas para bulk operations
        facturas_para_bulk = []
        detalles_para_bulk = []
        facturas_temp_data = []  # Para tracking y respuesta
        
        print(f"[POST] 🔄 Iniciando procesamiento de {len(grupo_facturas)} grupos de facturas...")
        contador_facturas = 0
        t_procesamiento_total = time.time()
        
        for nro_factura_plantilla, grupo in grupo_facturas:
            contador_facturas += 1
            t_factura_inicio = time.time()
            
            if contador_facturas % 100 == 0:  # Solo mostrar cada 100 facturas
                print(f"[POST] 📊 Procesando factura {contador_facturas}/{len(grupo_facturas)}...")
            
            fila_referencia = grupo.iloc[0]
            try:
                # Obtener datos ya validados usando cache
                proveedor = personas_cache.get(str(fila_referencia["nit_proveedor"]))
                nombre_departamento = normalizar_texto(fila_referencia["departamento"])
                nombre_municipio = normalizar_texto(fila_referencia["municipio"])
                
                departamento = departamentos_cache.get(nombre_departamento)
                municipio_key = (nombre_municipio, departamento.cod_departamento)
                municipio = municipios_cache.get(municipio_key)
            
                fecha_compra = pd.to_datetime(fila_referencia["fecha_compra"])
                if isinstance(fecha_compra, pd.Timestamp):
                    fecha_compra = fecha_compra.to_pydatetime()
                if timezone.is_naive(fecha_compra):
                    fecha_compra = make_aware(fecha_compra)

                nro_documento_soporte = fila_referencia.get("nro_documento_soporte", None)
                if pd.isna(nro_documento_soporte) or str(nro_documento_soporte).strip() == "":
                    nro_documento_soporte = None  

                total_kilos = total_valor_bruto = total_cuota_fomento = total_valor_neto = 0
                detalles = []

                # Solo mostrar detalles para facturas con muchos detalles o cada 50 facturas
                if len(grupo) > 5 or contador_facturas % 50 == 0:
                    print(f"[POST] 🔍 Procesando {len(grupo)} detalles para factura {nro_factura_plantilla}...")
                
                t_detalles_inicio = time.time()
                for index_df, fila in grupo.iterrows():
                    # Usar validación exacta ya validada
                    tipo_cacao = tipos_cacao_exactos.get(fila["tipo_cacao"])

                    # Validar que los campos numéricos no sean NaN, vacíos o inválidos
                    campos_numericos = ["nro_kilos", "valor_kilo", "valor_bruto", "cuota_fomento", "valor_neto"]
                    
                    for campo in campos_numericos:
                        valor_campo = fila[campo]
                        
                        # Verificar si está vacío o es NaN
                        if pd.isna(valor_campo) or str(valor_campo).strip() == "":
                            errores.append({
                                "nro_factura_plantilla": int(nro_factura_plantilla),
                                "error": f"El campo '{campo}' no puede estar vacío"
                            })
                            continue
                    
                    if errores and errores[-1]["nro_factura_plantilla"] == int(nro_factura_plantilla):
                        continue  # Saltar al siguiente grupo si ya hay errores
                    
                    try:
                        # Convertir a float y validar
                        nro_kilos = float(fila["nro_kilos"])
                        valor_kilo = float(fila["valor_kilo"])
                        valor_bruto = float(fila["valor_bruto"])
                        cuota_fomento = float(fila["cuota_fomento"])
                        valor_neto = float(fila["valor_neto"])
                        
                        # Validaciones específicas
                        validaciones = [
                            (nro_kilos, "nro_kilos", "Los kilos deben ser mayor a 0"),
                            (valor_kilo, "valor_kilo", "El valor por kilo debe ser mayor a 0"),
                            (valor_bruto, "valor_bruto", "El valor bruto debe ser mayor a 0"),
                            (cuota_fomento, "cuota_fomento", "La cuota de fomento debe ser mayor o igual a 0"),
                            (valor_neto, "valor_neto", "El valor neto debe ser mayor a 0")
                        ]
                        
                        for valor, nombre_campo, mensaje in validaciones:
                            # Verificar que no sea infinito o NaN
                            if not math.isfinite(valor):
                                errores.append({
                                    "nro_factura_plantilla": int(nro_factura_plantilla),
                                    "error": f"El campo '{nombre_campo}' contiene un valor inválido (infinito o NaN)"
                                })
                                continue
                            
                            # Verificar rangos específicos
                            if nombre_campo == "cuota_fomento":
                                if valor < 0:
                                    errores.append({
                                        "nro_factura_plantilla": int(nro_factura_plantilla),
                                        "error": mensaje
                                    })
                            else:
                                if valor <= 0:
                                    errores.append({
                                        "nro_factura_plantilla": int(nro_factura_plantilla),
                                        "error": mensaje
                                    })
                        
                        # Si hay errores en esta factura, continuar al siguiente grupo
                        if errores and errores[-1]["nro_factura_plantilla"] == int(nro_factura_plantilla):
                            continue
                            
                    except (ValueError, TypeError) as e:
                        errores.append({
                            "nro_factura_plantilla": int(nro_factura_plantilla),
                            "error": f"Error al convertir valores numéricos: {str(e)}. Verifique que no contengan letras u otros caracteres inválidos"
                        })
                        continue

                    # Convertir a Decimal para el modelo
                    nro_kilos_decimal = Decimal(str(nro_kilos))
                    valor_kilo_decimal = Decimal(str(valor_kilo))
                    valor_bruto_decimal = Decimal(str(valor_bruto))
                    cuota_fomento_decimal = Decimal(str(cuota_fomento))
                    valor_neto_decimal = Decimal(str(valor_neto))

                    total_kilos += nro_kilos_decimal
                    total_valor_bruto += valor_bruto_decimal
                    total_cuota_fomento += cuota_fomento_decimal
                    total_valor_neto += valor_neto_decimal

                    detalles.append(DetallesFacturaUnica(
                        nro_kilos=nro_kilos_decimal,
                        valor_kilo=valor_kilo_decimal,
                        id_tipo_cacao=tipo_cacao
                    ))

                ultimo_nro += 1
                nuevo_nro_factura = ultimo_nro

                # PREPARAR factura para bulk_create (NO crear todavía)
                factura_obj = FacturaUnica(
                    nro_factura_unica=nuevo_nro_factura,
                    total_kilos=total_kilos,
                    valor_bruto=total_valor_bruto,
                    cuota_fomento=total_cuota_fomento,
                    valor_neto=total_valor_neto,
                    id_persona_proveedor=proveedor,
                    id_persona_recaudador=recaudador,
                    id_departamento_cacao=departamento,
                    id_municipio_cacao=municipio,
                    id_porcentaje_cobro=cuota_fomento_obj,
                    id_persona_crea=request.user.persona,
                    fecha_compra=fecha_compra,
                    nro_documento_soporte=nro_documento_soporte,
                    uuid_cargue=getattr(request, "_uuid_cargue", None)
                )
                facturas_para_bulk.append(factura_obj)
                
                # Guardar data temporal para tracking
                facturas_temp_data.append({
                    'nro_factura_plantilla': int(nro_factura_plantilla),
                    'nro_factura_nuevo': nuevo_nro_factura,
                    'index_en_bulk': len(facturas_para_bulk) - 1,
                    'detalles': detalles.copy()  # guardar detalles para después
                })

                total_kilos_reportados += total_kilos

                # Mostrar tiempo de procesamiento solo para facturas con muchos detalles o cada 100
                t_factura_total = time.time() - t_factura_inicio
                if len(grupo) > 5 or contador_facturas % 100 == 0:
                    print(f"[POST] ⏱️ Factura {nro_factura_plantilla} procesada en {t_factura_total:.3f}s ({len(grupo)} detalles)")

            except Exception as e:
                errores.append({
                    "nro_factura_plantilla": int(nro_factura_plantilla),
                    "error": str(e)
                })
                continue

        # Mostrar tiempo total de procesamiento
        t_procesamiento_total_tiempo = time.time() - t_procesamiento_total
        print(f"[POST] ⏱️ Procesamiento completo de {len(grupo_facturas)} facturas en {t_procesamiento_total_tiempo:.3f}s")

        # EJECUTAR BULK_CREATE VERDADERO
        print(f"[POST] 🚀 Ejecutando bulk_create de {len(facturas_para_bulk)} facturas...")
        t_bulk_facturas = time.time()
        
        if facturas_para_bulk:
            # Crear todas las facturas de una vez
            print(f"[POST] 💾 Iniciando bulk_create de facturas en base de datos...")
            facturas_creadas_db = FacturaUnica.objects.bulk_create(facturas_para_bulk)
            print(f"[POST] ✅ {len(facturas_creadas_db)} facturas creadas en {time.time()-t_bulk_facturas:.3f}s")
            
            # Crear detalles usando las facturas creadas
            print(f"[POST] 🔗 Preparando {len(facturas_temp_data)} grupos de detalles...")
            t_bulk_detalles = time.time()
            detalles_para_bulk = []
            for factura_data in facturas_temp_data:
                factura_creada = facturas_creadas_db[factura_data['index_en_bulk']]
                for detalle in factura_data['detalles']:
                    detalle.id_factura_unica = factura_creada
                    detalles_para_bulk.append(detalle)
            
            if detalles_para_bulk:
                print(f"[POST] 💾 Iniciando bulk_create de {len(detalles_para_bulk)} detalles...")
                DetallesFacturaUnica.objects.bulk_create(detalles_para_bulk)
                print(f"[POST] ✅ {len(detalles_para_bulk)} detalles creados en {time.time()-t_bulk_detalles:.3f}s")
            else:
                print("[POST] ⚠️ No hay detalles para crear")
            
            # Preparar respuesta con facturas creadas
            print("[POST] 📋 Preparando respuesta con facturas creadas...")
            for i, factura_data in enumerate(facturas_temp_data):
                factura_creada = facturas_creadas_db[factura_data['index_en_bulk']]
                facturas_creadas.append({
                    'nro_factura_plantilla': factura_data['nro_factura_plantilla'],
                    'nro_factura_nuevo': factura_creada.nro_factura_unica,
                    'total_kilos': factura_creada.total_kilos,
                    'valor_bruto': factura_creada.valor_bruto,
                    'cuota_fomento': factura_creada.cuota_fomento,
                    'valor_neto': factura_creada.valor_neto
                })

            # Auditoria optimizada - una sola auditoría para todo el cargue masivo
            print("[POST] 📝 Iniciando creación de auditoría consolidada...")
            print("[POST] 📝 Destino: Tabla 'Auditorias' en base de datos")
            t_auditoria_total = time.time()
            
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            # Obtener rango de facturas creadas
            facturas_numeros = [factura.nro_factura_unica for factura in facturas_creadas_db]
            factura_min = min(facturas_numeros)
            factura_max = max(facturas_numeros)
            total_facturas = len(facturas_creadas_db)
            
            print(f"[POST] 📝 Creando auditoría consolidada para {total_facturas} facturas (rango: {factura_min} - {factura_max})...")
            
            descripcion = {
                "Mensaje": "Cargue masivo externo de facturas",
                "TotalFacturas": total_facturas,
                "RangoFacturas": f"{factura_min} - {factura_max}",
                "Recaudador": str(recaudador.id_persona),
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "CargueMasivo": {
                        "TotalFacturas": total_facturas,
                        "FacturaInicial": factura_min,
                        "FacturaFinal": factura_max,
                        "Recaudador": recaudador.id_persona,
                        "FechaProceso": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 9,  
                "cod_permiso": "CR",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            print(f"[POST] 📝 Guardando auditoría consolidada...")
            t_guardar_auditoria = time.time()
            Util.save_auditoria(auditoria_data)
            t_guardar_auditoria_tiempo = time.time() - t_guardar_auditoria
            
            t_auditoria_total_tiempo = time.time() - t_auditoria_total
            
            print(f"[POST] ✅ Auditoría consolidada creada exitosamente")
            print(f"[POST] ⏱️ Tiempo total auditoría: {t_auditoria_total_tiempo:.3f}s")
            print(f"[POST] ⏱️ Tiempo guardado auditoría: {t_guardar_auditoria_tiempo:.3f}s")
            print(f"[POST] 📊 Optimización: De {total_facturas} auditorías individuales a 1 auditoría consolidada")
                
        # Obtener información básica para respuesta
        facturas_registradas = len(facturas_creadas)
        print(f"[POST] ✅ Procesamiento completado: {facturas_registradas} facturas creadas")

        # Calcular totales consolidados para notificaciones
        totales_consolidados = {
            'total_kilos': sum(f['total_kilos'] for f in facturas_creadas),
            'total_valor': sum(f['valor_neto'] for f in facturas_creadas),
            'total_cuota_fomento': sum(f['cuota_fomento'] for f in facturas_creadas)
        }

        # Obtener la fecha actual
        fecha_actual = datetime.now()
        fecha_actual_formateada = fecha_actual.strftime('%d-%b-%Y')

        total_kilos_consolidado = totales_consolidados['total_kilos']
        valor_total_consolidado = totales_consolidados['total_valor']
        total_cuota_fomento_consolidado = totales_consolidados['total_cuota_fomento']

        # Formatear valores
        total_kilos_formateado = f"{total_kilos_consolidado:,.0f}"
        valor_total_formateado = f"{valor_total_consolidado:,.0f}"
        cuota_fomento_formateado = f"{total_cuota_fomento_consolidado:,.0f}"

        # Variables para tracking de notificaciones enviadas
        email_enviado = False
        sms_enviado = False

        # Enviar notificaciones al recaudador (usuario logueado externo)
        if recaudador and recaudador.email:
            subject = "Compra Masiva Registrada"
            template = "compra-masiva-facturas.html"

            if recaudador.tipo_persona == 'N':
                nombre_de_usuario = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
            else:
                nombre_de_usuario = recaudador.razon_social

            try:
                t_email0 = time.time()
                print(f"[POST] 📧 Enviando email a recaudador {recaudador.id_persona} ({recaudador.email})...")
                Util.notificacion(
                    recaudador,
                    subject,
                    template,
                    fecha_registro=fecha_actual_formateada,
                    total_kilos_reportados=total_kilos_formateado,
                    facturas_registradas=facturas_registradas,
                    valor_total_facturas=valor_total_formateado,
                    nombre_de_usuario=nombre_de_usuario
                )
                email_enviado = True
                print(f"[POST] ✅ Email enviado en {time.time()-t_email0:.3f}s a {recaudador.email}")
            except Exception as e:
                print(f"[POST] ❌ Error enviando email: {e}")

        # Enviar UN SOLO SMS al recaudador
        if recaudador:
            telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
            if telefono_recaudador:
                facturas_numeros = [f["nro_factura_nuevo"] for f in facturas_creadas]
                factura_min = min(facturas_numeros) if facturas_numeros else 0
                factura_max = max(facturas_numeros) if facturas_numeros else 0

                sms_mensaje = (
                    f"Fedecacao - Compra masiva registrada: {facturas_registradas} facturas "
                    f"(#{factura_min}-#{factura_max}), {total_kilos_formateado} kilos, "
                    f"valor: ${valor_total_formateado}"
                )
                try:
                    t_sms0 = time.time()
                    print(f"[POST] 📱 Enviando SMS a recaudador {recaudador.id_persona} (***{str(telefono_recaudador)[-4:]})...")
                    Util.send_sms(telefono_recaudador, sms_mensaje)
                    sms_enviado = True
                    print(f"[POST] ✅ SMS enviado en {time.time()-t_sms0:.3f}s")
                except Exception as e:
                    print(f"[POST] ❌ Error enviando SMS: {e}")

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_CarMas'
        data_alerta['informacion_complemento_mensaje'] = f"Se crearon {facturas_registradas} facturas exitosamente"

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        print(f"[POST] 🎉 Cargue masivo externo completado en {time.time()-post_start:.3f}s")
        print(f"[POST] 📊 Resumen final: {facturas_registradas} facturas creadas, {len(errores)} errores")

        return Response({
            "success": True,
            "detail": "Facturas creadas exitosamente (carga parcial si aplica).",
            "uuid_cargue": str(getattr(request, "_uuid_cargue", "")),
            "notificaciones": {
                "email_enviado": email_enviado,
                "email_destinatario": recaudador.email if recaudador and recaudador.email else None,
                "sms_enviado": sms_enviado,
                "facturas_registradas": facturas_registradas,
                "total_kilos": total_kilos_formateado,
                "valor_total": valor_total_formateado
            }
        }, status=status.HTTP_201_CREATED)
    

class CreateLiquidacionExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoACrearLiquidacionCuotaFomento]
    serializer_class = LiquidacionFacturaSerializer

    def _enviar_notificacion_liquidacion_consolidada(self, facturas, fecha_actual_formateada):
        """
        Envía una notificación consolidada de liquidación agrupada por recaudador.
        """
        try:
            facturas_por_recaudador = {}
            for factura in facturas:
                recaudador = factura.id_persona_recaudador
                if recaudador not in facturas_por_recaudador:
                    facturas_por_recaudador[recaudador] = []
                facturas_por_recaudador[recaudador].append(factura)

            for recaudador, facturas_recaudador in facturas_por_recaudador.items():
                total_kilos = sum(f.total_kilos for f in facturas_recaudador)
                total_fomento = sum(f.cuota_fomento for f in facturas_recaudador)
                total_facturas = len(facturas_recaudador)

                numeros_facturas = sorted([f.nro_factura_unica for f in facturas_recaudador])
                if len(numeros_facturas) == 1:
                    rango_facturas = f"Factura N° {numeros_facturas[0]}"
                elif len(numeros_facturas) == 2:
                    rango_facturas = f"Facturas N° {numeros_facturas[0]} y {numeros_facturas[1]}"
                else:
                    if len(numeros_facturas) <= 5:
                        facturas_str = ", ".join([f"N° {n}" for n in numeros_facturas])
                        rango_facturas = f"Facturas {facturas_str}"
                    else:
                        primeras = ", ".join([f"N° {n}" for n in numeros_facturas[:3]])
                        ultimas = ", ".join([f"N° {n}" for n in numeros_facturas[-2:]])
                        rango_facturas = f"Facturas {primeras}, ..., {ultimas}"

                if recaudador.tipo_persona == 'N':
                    nombre_de_usuario = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
                else:
                    nombre_de_usuario = recaudador.razon_social

                total_kilos_formateado = f"{total_kilos:,.2f}"
                total_fomento_formateado = f"${total_fomento:,.2f}"

                if recaudador.email:
                    subject = f"Liquidación Registrada - {rango_facturas}"
                    template = "liquidacion-factura-unica.html"
                    Util.notificacion(
                        recaudador,
                        subject,
                        template,
                        fecha_registro=fecha_actual_formateada,
                        total_kilos_reportados=total_kilos_formateado,
                        nombre_de_usuario=nombre_de_usuario,
                        fecha_liquidacion=fecha_actual_formateada,
                        numero_factura=rango_facturas,
                        cantidad_kilos=total_kilos_formateado,
                        valor_fomento=total_fomento_formateado
                    )

                telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
                if telefono_recaudador:
                    sms = (
                        f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                        f"{total_facturas} factura{'s' if total_facturas > 1 else ''} liquidada{'s' if total_facturas > 1 else ''} "
                        f"({rango_facturas}). Total kilos: {total_kilos_formateado}, "
                        f"Total fomento: {total_fomento_formateado}."
                    )
                    Util.send_sms(telefono_recaudador, sms)
        except Exception as e:
            print(f"Error enviando notificación consolidada de liquidación (externo): {str(e)}")

    @transaction.atomic  
    def post(self, request, *args, **kwargs):
        usuario = request.user

        data = request.data

        # Paso 1: Validar los IDs de facturas
        ids_facturas = data.get('id_facturas', [])
        if not ids_facturas:
            return Response({
                'success': False,
                'detail': "Se deben proporcionar IDs de facturas."
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron las facturas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validación de actualización del Porcentaje de Interés (PI)
        now_date = timezone.now().date()
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }

        # Paso 2: Verificar si alguna factura genera intereses
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        fecha_actual = now_date
        alguna_tiene_intereses = False

        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Paso 3: Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)

        
        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        # Validar si alguna factura está asociada a una solicitud de acuerdo de pago
        facturas_con_solicitud = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_solicitud.exists():
            facturas_con_solicitud_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_solicitud
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a una solicitud de acuerdo de pago: {list(facturas_con_solicitud_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura está asociada a un plan de pago (por medio de DetalleAcuerdoPago y CuotasAcuerdoPago)
        facturas_con_plan = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas,
            id_cuota_acuerdo_pago__isnull=False
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_plan.exists():
            facturas_con_plan_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_plan
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a un plan de pago: {list(facturas_con_plan_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Paso 2: Calcular los valores globales
        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []
        facturas_no_liquidables = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            # Obtener el valor de 'dias_pago_interes' desde la tabla FechasCierre
            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el valor de 'dias_pago' desde la tabla FechasCierre
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular la fecha límite de pago sin intereses
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej. 31 de febrero), usar el último día válido
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular la fecha límite de pago con intereses
            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                # Si el cálculo excede el mes, ajustar al último día del mes siguiente
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)

            # Validar si la liquidación puede generarse
            fecha_actual = timezone.now().date() 
            if fecha_actual > fecha_limite_pago_interes.date():
                facturas_no_liquidables.append({
                    "id_factura_unica": factura.id_factura_unica,
                    "nro_factura_unica": factura.nro_factura_unica,
                    "fecha_compra": factura.fecha_compra,
                    "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
                })
                continue  

            # Calcular días de mora
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            # Calcular los intereses individuales
            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            # Acumular los intereses totales
            intereses_total += intereses_x_factura

            # Crear el objeto de la liquidación para esta factura
            detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador = factura.id_persona_recaudador
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular if recaudador and recaudador.telefono_celular else recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J':
                if recaudador.representante_legal:
                    persona_rl = recaudador.representante_legal
                    representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 2),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(sum(detalle.valor_kilo for detalle in detalles) / len(detalles), 2) if detalles else 0,
                "detalles": [{
                    "nro_kilos": detalle.nro_kilos,
                    "valor_kilo": detalle.valor_kilo
                } for detalle in detalles],
            })

        if facturas_no_liquidables:
            detalles = [
                f"N° Factura {f['nro_factura_unica']} (fecha límite: {f['fecha_limite_pago_interes'].strftime('%d-%m-%Y') if hasattr(f['fecha_limite_pago_interes'], 'strftime') else f['fecha_limite_pago_interes']})"
                for f in facturas_no_liquidables
            ]
            mensaje = (
                "No se puede generar la liquidación de la Cuota de Fomento Cacaotero para las siguientes facturas: "
                + ", ".join(detalles) +
                ". La fecha límite de liquidación ha expirado."
            )
            return Response({
                "success": False,
                "detail": mensaje,
                "facturas_no_liquidables": facturas_no_liquidables
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calcular el valor total a pagar
        valor_a_pagar = cuota_fomento_total + intereses_total

        # Actualizar los valores globales en cada factura
        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
            })

        # Paso 4: Crear o actualizar la liquidación general
        try:
            doc_pago_id = data.get('doc_pago_id')
            doc_pago = DocumentosGenerados.objects.filter(id_documento_generado=doc_pago_id).first()
            if not doc_pago:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no es válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if not doc_pago.consecutivo:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no tiene un consecutivo válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                return Response({
                    'success': False,
                    'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                }, status=status.HTTP_400_BAD_REQUEST)

            codigo_barras = data.get('codigo_barras', None)
            if not codigo_barras:
                return Response({
                    'success': False,
                    'detail': "El código de barras es obligatorio."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Si hay facturas a reliquidar, actualizar la liquidación existente
            if facturas_a_reliquidar.exists():
                liquidacion = facturas_a_reliquidar.first().id_liq_factura_unica
                # Guardar referencia al documento anterior
                doc_anterior = liquidacion.doc_pago
                # Actualizar campos de la liquidación con el nuevo doc_pago
                liquidacion.doc_pago = doc_pago
                liquidacion.nro_doc_pago = doc_pago.consecutivo
                liquidacion.valor_pagar = valor_a_pagar
                liquidacion.valor_intereses = intereses_total
                liquidacion.fecha_liquidacion = timezone.now()
                liquidacion.id_persona_liquida = request.user.persona
                liquidacion.codigo_barras = codigo_barras
                liquidacion.save()
                # Ahora sí, borra el documento anterior (ya no está referenciado)
                if doc_anterior and doc_anterior != doc_pago:
                    doc_anterior.delete()
                # Actualizar las facturas para que apunten a la liquidación actualizada
                facturas_a_reliquidar.update(id_liq_factura_unica=liquidacion)
                if facturas_nuevas.exists():
                    facturas_nuevas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo
            else:
                # Crear una nueva liquidación si todas son nuevas
                if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                    return Response({
                        'success': False,
                        'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                    }, status=status.HTTP_400_BAD_REQUEST)
                liquidacion = LiquidacionesFacturaUnica.objects.create(
                    cod_estado="L",
                    nro_doc_pago=doc_pago.consecutivo,
                    fecha_pago=None,
                    valor_pagar=valor_a_pagar,
                    valor_intereses=intereses_total,
                    fecha_liquidacion=timezone.now(),
                    id_persona_liquida=request.user.persona,
                    doc_pago=doc_pago,
                    codigo_barras=codigo_barras,
                )
                facturas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo

            # Actualizar los valores globales en cada factura con el número de documento de pago
            for liquidacion_creada in liquidaciones_creadas:
                liquidacion_creada.update({
                    "nro_doc_pago": nro_doc_pago,
                })

            # Actualizar estado de facturas
            for factura in facturas:
                factura.estado_factura = "LQ"
                factura.save()

            # Enviar notificación consolidada de liquidación
            fecha_actual_formateada = timezone.now().strftime('%d-%b-%Y')
            self._enviar_notificacion_liquidacion_consolidada(facturas, fecha_actual_formateada)


            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_LiqCoF'
            data_alerta['informacion_complemento_mensaje'] = f"La liquidación tiene las siguiente caracteristicas: Número de pago: {liquidacion.nro_doc_pago} y valor a pagar: {Utils.formato_peso(liquidacion.valor_pagar)}"

            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta and configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

            # Auditoria
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Liquidación creada externamente",
                "NroDocPago": liquidacion.nro_doc_pago,
                "ValorPagar": float(liquidacion.valor_pagar),
                "ValorIntereses": float(liquidacion.valor_intereses),
                "Facturas": [f.nro_factura_unica for f in facturas],
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "Nuevo": {
                        "NroDocPago": liquidacion.nro_doc_pago,
                        "ValorPagar": float(liquidacion.valor_pagar),
                        "ValorIntereses": float(liquidacion.valor_intereses),
                        "FechaLiquidacion": liquidacion.fecha_liquidacion.strftime('%Y-%m-%d %H:%M:%S'),
                        "Facturas": [f.id_factura_unica for f in facturas]
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 11,  
                "cod_permiso": "CR",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)

                    
            return Response({
                'success': True,
                'detail': "Liquidación creada correctamente para las facturas.",
                'data': liquidaciones_creadas
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f"Error al crear la liquidación: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


class CreateLiquidacionInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoACrearLiquidacionCuotaFomento]
    serializer_class = LiquidacionFacturaSerializer

    def _enviar_notificacion_liquidacion_consolidada(self, facturas, fecha_actual_formateada):
        """
        Envía una notificación consolidada de liquidación agrupada por recaudador.
        """
        try:
            facturas_por_recaudador = {}
            for factura in facturas:
                recaudador = factura.id_persona_recaudador
                if recaudador not in facturas_por_recaudador:
                    facturas_por_recaudador[recaudador] = []
                facturas_por_recaudador[recaudador].append(factura)

            for recaudador, facturas_recaudador in facturas_por_recaudador.items():
                total_kilos = sum(f.total_kilos for f in facturas_recaudador)
                total_fomento = sum(f.cuota_fomento for f in facturas_recaudador)
                total_facturas = len(facturas_recaudador)

                numeros_facturas = sorted([f.nro_factura_unica for f in facturas_recaudador])
                if len(numeros_facturas) == 1:
                    rango_facturas = f"Factura N° {numeros_facturas[0]}"
                elif len(numeros_facturas) == 2:
                    rango_facturas = f"Facturas N° {numeros_facturas[0]} y {numeros_facturas[1]}"
                else:
                    if len(numeros_facturas) <= 5:
                        facturas_str = ", ".join([f"N° {n}" for n in numeros_facturas])
                        rango_facturas = f"Facturas {facturas_str}"
                    else:
                        primeras = ", ".join([f"N° {n}" for n in numeros_facturas[:3]])
                        ultimas = ", ".join([f"N° {n}" for n in numeros_facturas[-2:]])
                        rango_facturas = f"Facturas {primeras}, ..., {ultimas}"

                if recaudador.tipo_persona == 'N':
                    nombre_de_usuario = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
                else:
                    nombre_de_usuario = recaudador.razon_social

                total_kilos_formateado = f"{total_kilos:,.2f}"
                total_fomento_formateado = f"${total_fomento:,.2f}"

                if recaudador.email:
                    subject = f"Liquidación Registrada - {rango_facturas}"
                    template = "liquidacion-factura-unica.html"
                    Util.notificacion(
                        recaudador,
                        subject,
                        template,
                        fecha_registro=fecha_actual_formateada,
                        total_kilos_reportados=total_kilos_formateado,
                        nombre_de_usuario=nombre_de_usuario,
                        fecha_liquidacion=fecha_actual_formateada,
                        numero_factura=rango_facturas,
                        cantidad_kilos=total_kilos_formateado,
                        valor_fomento=total_fomento_formateado
                    )

                telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
                if telefono_recaudador:
                    sms = (
                        f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                        f"{total_facturas} factura{'s' if total_facturas > 1 else ''} liquidada{'s' if total_facturas > 1 else ''} "
                        f"({rango_facturas}). Total kilos: {total_kilos_formateado}, "
                        f"Total fomento: {total_fomento_formateado}."
                    )
                    Util.send_sms(telefono_recaudador, sms)
        except Exception as e:
            print(f"Error enviando notificación consolidada de liquidación (interno): {str(e)}")

    @transaction.atomic  
    def post(self, request, *args, **kwargs):
        usuario = request.user

        data = request.data

        # Paso 1: Validar los IDs de facturas
        ids_facturas = data.get('id_facturas', [])
        if not ids_facturas:
            return Response({
                'success': False,
                'detail': "Se deben proporcionar IDs de facturas."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron las facturas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validación de actualización del Porcentaje de Interés (PI)
        now_date = timezone.now().date()
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }

        # Paso 2: Verificar si alguna factura genera intereses
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        fecha_actual = now_date
        alguna_tiene_intereses = False

        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Paso 3: Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)


        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        # Validar si alguna factura está asociada a una solicitud de acuerdo de pago
        facturas_con_solicitud = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_solicitud.exists():
            facturas_con_solicitud_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_solicitud
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a una solicitud de acuerdo de pago: {list(facturas_con_solicitud_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura está asociada a un plan de pago (por medio de DetalleAcuerdoPago y CuotasAcuerdoPago)
        facturas_con_plan = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas,
            id_cuota_acuerdo_pago__isnull=False
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_plan.exists():
            facturas_con_plan_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_plan
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a un plan de pago: {list(facturas_con_plan_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Paso 2: Calcular los valores globales
        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []
        # facturas_no_liquidables = []
        
        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            # Obtener el valor de 'dias_pago_interes' desde la tabla FechasCierre
            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el valor de 'dias_pago' desde la tabla FechasCierre
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular la fecha límite de pago sin intereses
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej. 31 de febrero), usar el último día válido
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular la fecha límite de pago con intereses
            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                # Si el cálculo excede el mes, ajustar al último día del mes siguiente
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)

            # Validar si la liquidación puede generarse
            fecha_actual = timezone.now().date() 
            # if fecha_actual > fecha_limite_pago_interes.date():
            #     facturas_no_liquidables.append({
            #         "id_factura_unica": factura.id_factura_unica,
            #         "nro_factura_unica": factura.nro_factura_unica,
            #         "fecha_compra": factura.fecha_compra,
            #         "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
            #     })
            #     continue  
            
            # Calcular días de mora
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            # Calcular los intereses individuales
            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            # Acumular los intereses totales
            intereses_total += intereses_x_factura

            # Crear el objeto de la liquidación para esta factura
            detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador = factura.id_persona_recaudador
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular if recaudador and recaudador.telefono_celular else recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J':
                if recaudador.representante_legal:
                    persona_rl = recaudador.representante_legal
                    representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
                else:
                    representante_legal = persona_rl.razon_social
            
            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 6),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(sum(detalle.valor_kilo for detalle in detalles) / len(detalles), 2) if detalles else 0,
                "detalles": [{
                    "nro_kilos": detalle.nro_kilos,
                    "valor_kilo": detalle.valor_kilo
                } for detalle in detalles],
            })

        # if facturas_no_liquidables:
        #         return Response({
        #             "success": False,
        #             "detail": "No se puede generar la liquidación. Las siguientes facturas superaron la fecha límite con intereses.",
        #             "facturas_no_liquidables": facturas_no_liquidables
        #         }, status=status.HTTP_400_BAD_REQUEST)

        # Calcular el valor total a pagar
        valor_a_pagar = cuota_fomento_total + intereses_total

        # Actualizar los valores globales en cada factura
        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
            })

        # Paso 4: Crear o actualizar la liquidación general
        try:
            doc_pago_id = data.get('doc_pago_id')
            doc_pago = DocumentosGenerados.objects.filter(id_documento_generado=doc_pago_id).first()
            if not doc_pago:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no es válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if not doc_pago.consecutivo:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no tiene un consecutivo válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            codigo_barras = data.get('codigo_barras', None)
            if not codigo_barras:
                return Response({
                    'success': False,
                    'detail': "El código de barras es obligatorio."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Si hay facturas a reliquidar, actualizar la liquidación existente
            if facturas_a_reliquidar.exists():
                liquidacion = facturas_a_reliquidar.first().id_liq_factura_unica
                # Guardar referencia al documento anterior
                doc_anterior = liquidacion.doc_pago
                # Actualizar campos de la liquidación con el nuevo doc_pago
                liquidacion.doc_pago = doc_pago
                liquidacion.nro_doc_pago = doc_pago.consecutivo
                liquidacion.valor_pagar = valor_a_pagar
                liquidacion.valor_intereses = intereses_total
                liquidacion.fecha_liquidacion = timezone.now()
                liquidacion.id_persona_liquida = request.user.persona
                liquidacion.codigo_barras = codigo_barras
                liquidacion.save()
                # Ahora sí, borra el documento anterior (ya no está referenciado)
                if doc_anterior and doc_anterior != doc_pago:
                    doc_anterior.delete()
                # Actualizar las facturas para que apunten a la liquidación actualizada
                facturas_a_reliquidar.update(id_liq_factura_unica=liquidacion)
                if facturas_nuevas.exists():
                    facturas_nuevas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo
            else:
                # Crear una nueva liquidación si todas son nuevas
                if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                    return Response({
                        'success': False,
                        'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                    }, status=status.HTTP_400_BAD_REQUEST)
                liquidacion = LiquidacionesFacturaUnica.objects.create(
                    cod_estado="L",
                    nro_doc_pago=doc_pago.consecutivo,
                    fecha_pago=None,
                    valor_pagar=valor_a_pagar,
                    valor_intereses=intereses_total,
                    fecha_liquidacion=timezone.now(),
                    id_persona_liquida=request.user.persona,
                    doc_pago=doc_pago,
                    codigo_barras=codigo_barras,
                )
                facturas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo

            # Actualizar los valores globales en cada factura con el número de documento de pago
            for liquidacion_creada in liquidaciones_creadas:
                liquidacion_creada.update({
                    "nro_doc_pago": nro_doc_pago,
                })


            # Actualizar estado de facturas
            for factura in facturas:
                factura.estado_factura = "LQ"
                factura.save()

            # Enviar notificación consolidada de liquidación
            fecha_actual_formateada = timezone.now().strftime('%d-%b-%Y')
            self._enviar_notificacion_liquidacion_consolidada(facturas, fecha_actual_formateada)

            # Auditoria
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Liquidacion creada internamente",
                "NroDocPago": liquidacion.nro_doc_pago,
                "ValorPagar": float(liquidacion.valor_pagar),
                "ValorIntereses": float(liquidacion.valor_intereses),
                "Facturas": [f.nro_factura_unica for f in facturas],
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "Nuevo": {
                        "NroDocPago": liquidacion.nro_doc_pago,
                        "ValorPagar": float(liquidacion.valor_pagar),
                        "ValorIntereses": float(liquidacion.valor_intereses),
                        "FechaLiquidacion": liquidacion.fecha_liquidacion.strftime('%Y-%m-%d %H:%M:%S'),
                        "Facturas": [f.id_factura_unica for f in facturas]
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 11, 
                "cod_permiso": "CR",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)


            return Response({
                'success': True,
                'detail': "Liquidación creada correctamente para las facturas.",
                'data': liquidaciones_creadas
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f"Error al crear la liquidación: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class GetLiquidacionDocumentoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultaLiquidacionCuotaFomento]

    def get(self, request, *args, **kwargs):
        try:
            id_facturas_raw = request.query_params.get('id_facturas', '[]')
            id_facturas_list = json.loads(id_facturas_raw)
            if not isinstance(id_facturas_list, list):
                raise ValueError
            id_facturas_list = [int(x) for x in id_facturas_list]
        except (json.JSONDecodeError, ValueError, TypeError):
            return Response({
                'success': False,
                'detail': "El parámetro 'id_facturas' debe ser un arreglo válido de enteros, por ejemplo: [33,34,35]"
            }, status=status.HTTP_400_BAD_REQUEST)

        request._full_data = {
            'id_facturas': id_facturas_list,
            'doc_pago_id': request.query_params.get('doc_pago_id'),
            'codigo_barras': request.query_params.get('codigo_barras')
        }

        return self.post(request)

    def post(self, request, *args, **kwargs):
        data = getattr(request, '_full_data', request.data)

        ids_facturas = data.get('id_facturas', [])
        doc_pago_id = data.get('doc_pago_id')
        codigo_barras = data.get('codigo_barras')

        if not ids_facturas:
            return Response({
                'success': False,
                'detail': "Se deben proporcionar IDs de facturas."
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron las facturas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validación de actualización del Porcentaje de Interés (PI)
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        # Paso 1: Verificar si alguna factura genera intereses o ya está liquidada

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        now_date = timezone.now().date()
        fecha_actual = now_date
        alguna_tiene_intereses = False
        alguna_ya_liquidada = False

        for factura in facturas:
            # Marcar si la factura ya tiene una liquidación asociada
            if getattr(factura, 'id_liq_factura_unica', None):
                alguna_ya_liquidada = True

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True

        # Validar PI actualizado si alguna factura tiene intereses o ya está liquidada
        if alguna_tiene_intereses or alguna_ya_liquidada:
            now_date = timezone.now().date()
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)

        # --- VALIDACIÓN ASOCIACIÓN A SOLICITUD O PLAN DE PAGO ---
        # Validar si alguna factura está asociada a una solicitud de acuerdo de pago
        facturas_con_solicitud = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_solicitud.exists():
            facturas_con_solicitud_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_solicitud
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a una solicitud de acuerdo de pago: {list(facturas_con_solicitud_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura está asociada a un plan de pago (por medio de DetalleAcuerdoPago y CuotasAcuerdoPago)
        facturas_con_plan = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas,
            id_cuota_acuerdo_pago__isnull=False
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_plan.exists():
            facturas_con_plan_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_plan
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a un plan de pago: {list(facturas_con_plan_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Depuración: Verificar las facturas obtenidas
        facturas_ids = list(facturas.values_list('id_factura_unica', flat=True))
        print(f"Facturas obtenidas: {facturas_ids}") 

        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []
        facturas_no_liquidables = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            # Obtener el valor de 'dias_pago_interes' desde la tabla FechasCierre
            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el valor de 'dias_pago' desde la tabla FechasCierre
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular la fecha límite de pago sin intereses
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej. 31 de febrero), usar el último día válido
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular la fecha límite de pago con intereses
            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                # Si el cálculo excede el mes, ajustar al último día del mes siguiente
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)
            
            # Validar si la liquidación puede generarse
            fecha_actual = timezone.now().date()  
            if fecha_actual > fecha_limite_pago_interes.date():
                facturas_no_liquidables.append({
                    "id_factura_unica": factura.id_factura_unica,
                    "nro_factura_unica": factura.nro_factura_unica,
                    "fecha_compra": factura.fecha_compra,
                    "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
                })
                continue

            # Calcular días de mora
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            
            # Calcular los intereses individuales
            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses_x_factura

            detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            recaudador = factura.id_persona_recaudador
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular or recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J':
                if recaudador.representante_legal:
                    persona_rl = recaudador.representante_legal
                    representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
                else:
                    representante_legal = persona_rl.razon_social

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "fecha_actual": timezone.now(),
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 6),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(
                    sum(detalle.valor_kilo for detalle in detalles) / len(detalles), 2
                ) if detalles else 0,
                "detalles": [
                    {
                        "nro_kilos": detalle.nro_kilos,
                        "valor_kilo": detalle.valor_kilo
                    } for detalle in detalles
                ]
            })

        valor_a_pagar = cuota_fomento_total + intereses_total

        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
                "nro_doc_pago": doc_pago_id,
                "codigo_barras": codigo_barras
            })

        if facturas_no_liquidables:
            detalles = [
                f"N° Factura {f['nro_factura_unica']} (fecha límite: {f['fecha_limite_pago_interes'].strftime('%d-%m-%Y') if hasattr(f['fecha_limite_pago_interes'], 'strftime') else f['fecha_limite_pago_interes']})"
                for f in facturas_no_liquidables
            ]
            mensaje = (
                "No se puede generar la liquidación de la Cuota de Fomento Cacaotero para las siguientes facturas: "
                + ", ".join(detalles) +
                ". La fecha límite de liquidación ha expirado."
            )
            return Response({
                "success": False,
                "detail": mensaje,
                "facturas_no_liquidables": facturas_no_liquidables
            }, status=status.HTTP_400_BAD_REQUEST)
        

        # Auditoria
        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        facturas_info = [
            {
                "id_factura_unica": f.id_factura_unica,
                "nro_factura_unica": f.nro_factura_unica
            } for f in facturas
        ]

        descripcion = {
            "Mensaje": "Simulacion de liquidacion de facturas (vista previa)",
            "Facturas": facturas_info,
            "FechaConsulta": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Simulado por": nombre_persona
        }

        valores_actualizados = {
            "preview": {
                "Facturas": facturas_info,
                "ValorCuotaTotal": float(cuota_fomento_total),
                "ValorInteresesTotal": float(intereses_total),
                "ValorTotalAPagar": float(valor_a_pagar)
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 11,
            "cod_permiso": "CO",
            "subsistema": "RECA",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_LiqCoF'
        data_alerta['informacion_complemento_mensaje'] = f"Se ha generado una descarga de liquidación de la Cuota de Fomento Cacaotero."

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': "Vista previa de la liquidación generada.",
            'data': liquidaciones_creadas
        }, status=status.HTTP_200_OK)
    

class GetLiquidacionDocumentoInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]

    def get(self, request, *args, **kwargs):
        try:
            id_facturas_raw = request.query_params.get('id_facturas', '[]')
            id_facturas_list = json.loads(id_facturas_raw)
            if not isinstance(id_facturas_list, list):
                raise ValueError
            id_facturas_list = [int(x) for x in id_facturas_list]
        except (json.JSONDecodeError, ValueError, TypeError):
            return Response({
                'success': False,
                'detail': "El parámetro 'id_facturas' debe ser un arreglo válido de enteros, por ejemplo: [33,34,35]"
            }, status=status.HTTP_400_BAD_REQUEST)

        request._full_data = {
            'id_facturas': id_facturas_list,
            'doc_pago_id': request.query_params.get('doc_pago_id'),
            'codigo_barras': request.query_params.get('codigo_barras')
        }

        return self.post(request)

    def post(self, request, *args, **kwargs):
        data = getattr(request, '_full_data', request.data)

        ids_facturas = data.get('id_facturas', [])
        doc_pago_id = data.get('doc_pago_id')
        codigo_barras = data.get('codigo_barras')

        if not ids_facturas:
            return Response({
                'success': False,
                'detail': "Se deben proporcionar IDs de facturas."
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron las facturas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validación de actualización del Porcentaje de Interés (PI)
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        # Paso 1: Verificar si alguna factura genera intereses

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        now_date = timezone.now().date()
        fecha_actual = now_date
        alguna_tiene_intereses = False

        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            now_date = timezone.now().date()
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)
            
        # --- VALIDACIÓN ASOCIACIÓN A SOLICITUD O PLAN DE PAGO ---
        # Validar si alguna factura está asociada a una solicitud de acuerdo de pago
        facturas_con_solicitud = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_solicitud.exists():
            facturas_con_solicitud_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_solicitud
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a una solicitud de acuerdo de pago: {list(facturas_con_solicitud_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura está asociada a un plan de pago (por medio de DetalleAcuerdoPago y CuotasAcuerdoPago)
        facturas_con_plan = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=ids_facturas,
            id_cuota_acuerdo_pago__isnull=False
        ).values_list('id_factura_unica', flat=True).distinct()
        if facturas_con_plan.exists():
            facturas_con_plan_nros = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_plan
            ).values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya están asociadas a un plan de pago: {list(facturas_con_plan_nros)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Depuración: Verificar las facturas obtenidas
        facturas_ids = list(facturas.values_list('id_factura_unica', flat=True))
        print(f"Facturas obtenidas: {facturas_ids}") 

        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []
        # facturas_no_liquidables = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            # Obtener el valor de 'dias_pago_interes' desde la tabla FechasCierre
            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el valor de 'dias_pago' desde la tabla FechasCierre
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular la fecha límite de pago sin intereses
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej. 31 de febrero), usar el último día válido
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular la fecha límite de pago con intereses
            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                # Si el cálculo excede el mes, ajustar al último día del mes siguiente
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)
            
            # # Validar si la liquidación puede generarse
            fecha_actual = timezone.now().date()  
            # if fecha_actual > fecha_limite_pago_interes.date():
            #     facturas_no_liquidables.append({
            #         "id_factura_unica": factura.id_factura_unica,
            #         "nro_factura_unica": factura.nro_factura_unica,
            #         "fecha_compra": factura.fecha_compra,
            #         "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
            #     })
            #     continue

            # Calcular días de mora
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            
            # Calcular los intereses individuales
            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses_x_factura

            detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            recaudador = factura.id_persona_recaudador
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular or recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J':
                if recaudador.representante_legal:
                    persona_rl = recaudador.representante_legal
                    representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
                else:
                    representante_legal = persona_rl.razon_social

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "fecha_actual": timezone.now(),
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 6),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(
                    sum(detalle.valor_kilo for detalle in detalles) / len(detalles), 2
                ) if detalles else 0,
                "detalles": [
                    {
                        "nro_kilos": detalle.nro_kilos,
                        "valor_kilo": detalle.valor_kilo
                    } for detalle in detalles
                ]
            })

        valor_a_pagar = cuota_fomento_total + intereses_total

        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
                "nro_doc_pago": doc_pago_id,
                "codigo_barras": codigo_barras
            })

        # if facturas_no_liquidables:
        #     return Response({
        #         "success": False,
        #         "detail": "No se puede generar la liquidación. Las siguientes facturas superaron la fecha límite con intereses.",
        #         "facturas_no_liquidables": facturas_no_liquidables
        #     }, status=status.HTTP_400_BAD_REQUEST)
        

        # Auditoria
        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        facturas_info = [
            {
                "id_factura_unica": f.id_factura_unica,
                "nro_factura_unica": f.nro_factura_unica
            } for f in facturas
        ]

        descripcion = {
            "Mensaje": "Simulacion de liquidacion de facturas (vista previa)",
            "Facturas": facturas_info,
            "FechaConsulta": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Simulado por": nombre_persona
        }

        valores_actualizados = {
            "preview": {
                "Facturas": facturas_info,
                "ValorCuotaTotal": float(cuota_fomento_total),
                "ValorInteresesTotal": float(intereses_total),
                "ValorTotalAPagar": float(valor_a_pagar)
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 11,
            "cod_permiso": "CO",
            "subsistema": "RECA",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': "Vista previa de la liquidación generada.",
            'data': liquidaciones_creadas
        }, status=status.HTTP_200_OK)


# class GetDatosPersonaLogueadaView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         usuario = request.user
#         persona = usuario.persona

#         if not persona:
#             return Response({"success": False, "detail": "El usuario no tiene una persona asociada"}, status=status.HTTP_400_BAD_REQUEST)

#         serializer = DatosPersonaLogueadaSerializer(persona)
#         return Response({
#             "success": True,
#             "detail": "Datos obtenidos correctamente",
#             "data": serializer.data
#         }, status=status.HTTP_200_OK)


class GetDatosPersonaLogueadaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        persona = getattr(usuario, 'persona', None)

        if not persona:
            return Response({
                "success": False,
                "detail": "El usuario no tiene una persona asociada",
                "data": {}
            }, status=status.HTTP_400_BAD_REQUEST)

        # Campos comunes
        data = {
            "tipo_documento": persona.tipo_documento.nombre if persona.tipo_documento else None,
            "numero_documento": persona.numero_documento,
            "tipo_persona": persona.get_tipo_persona_display(),
            "email": persona.email,
            "direccion_notificaciones": persona.direccion_notificaciones,

            # Inicializar todos los campos específicos en null
            "nombre_completo": None,
            "pais_nacimiento": None,
            "razon_social": None,
            "nombre_comercial": None,
            "pais_nacionalidad_empresa": None,
        }

        if persona.tipo_persona == 'N':
            data["nombre_completo"] = " ".join(filter(None, [
                persona.primer_nombre,
                persona.segundo_nombre,
                persona.primer_apellido,
                persona.segundo_apellido
            ])).strip()
            data["pais_nacimiento"] = persona.pais_nacimiento.nombre if persona.pais_nacimiento else None

        elif persona.tipo_persona == 'J':
            data["razon_social"] = persona.razon_social
            data["nombre_comercial"] = persona.nombre_comercial
            data["pais_nacionalidad_empresa"] = (
                persona.cod_pais_nacionalidad_empresa.nombre
                if persona.cod_pais_nacionalidad_empresa else None
            )

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente",
            "data": data
        }, status=status.HTTP_200_OK)


class FacturasNoPagadasView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        persona = request.user.persona
        nro_factura_unica = request.query_params.get('nro_factura_unica', None)

        # Filtrar facturas NO pagadas ANTES de paginar
        facturas = FacturaUnica.objects.filter(
            id_persona_recaudador=persona
        ).select_related(
            'id_persona_recaudador', 'id_persona_proveedor', 'id_liq_factura_unica'
        ).prefetch_related(
            'detallesfacturaunica_set'
        ).order_by('-nro_factura_unica')

        if nro_factura_unica:
            facturas = facturas.filter(nro_factura_unica=nro_factura_unica)

        # Filtrar facturas pagadas en la consulta SQL
        from django.db.models import Q
        facturas = facturas.filter(
            ~Q(id_liq_factura_unica__cod_estado='P') & ~Q(estado_factura='PA')
        )

        # Obtener configuración de fechas una sola vez
        dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
        if dias_pago_interes is None:
            return Response({
                'success': False,
                'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
            }, status=status.HTTP_400_BAD_REQUEST)

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        if dias_pago is None:
            return Response({
                'success': False,
                'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
            }, status=status.HTTP_400_BAD_REQUEST)

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        if not porcentaje_cobro:
            return Response({
                'success': False,
                'detail': "No se encontró el porcentaje de interés por mora (PI)."
            }, status=status.HTTP_400_BAD_REQUEST)

        tasa_interes_dian = porcentaje_cobro.valor
        fecha_actual = timezone.now().date()

        # Procesar TODAS las facturas para filtrar por días de mora
        facturas_no_pagadas_filtradas = []
        for factura in facturas:
            # Calcular días de mora
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            # Solo incluir si tiene al menos 1 día de mora
            if dias_mora <= 1:
                continue

            facturas_no_pagadas_filtradas.append(factura)

        # Paginar sobre las facturas ya filtradas (lista)
        from django.core.paginator import Paginator
        page_number = request.query_params.get('page', 1)
        page_size = int(request.query_params.get('page_size', 10))
        
        paginator_obj = Paginator(facturas_no_pagadas_filtradas, page_size)
        total_pages = paginator_obj.num_pages
        total_count = paginator_obj.count
        
        try:
            page = paginator_obj.page(page_number)
        except:
            return Response({
                "success": False,
                "detail": "No se encontraron facturas no pagadas."
            }, status=status.HTTP_404_NOT_FOUND)
        
        facturas_paginadas = page.object_list

        facturas_no_pagadas = []
        valor_total_general = Decimal("0")

        for factura in facturas_paginadas:

            # Verificar si la factura tiene solicitud de acuerdo de pago
            tiene_solicitud = DetalleAcuerdoPago.objects.filter(id_factura_unica=factura).exists()
            mensaje_solicitud = None
            if tiene_solicitud:
                mensaje_solicitud = True
            else:
                mensaje_solicitud = False

            cod_estado = factura.id_liq_factura_unica.cod_estado if factura.id_liq_factura_unica else None
            cod_estado_display = (
                factura.id_liq_factura_unica.get_cod_estado_display()
                if factura.id_liq_factura_unica and factura.id_liq_factura_unica.cod_estado
                else None
            )

            estado_factura = factura.estado_factura
            estado_factura_display = (
                factura.get_estado_factura_display()
                if factura.estado_factura else None
            )

            # Validar estado en FacturaUnica y LiquidacionesFacturaUnica
            cod_estado_liq = factura.id_liq_factura_unica.cod_estado if factura.id_liq_factura_unica else None
            estado_factura = factura.estado_factura

            # Calcular fechas y días de mora (ya se filtró antes, pero necesitamos calcular para mostrar)
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            # Calcular intereses
            intereses = Decimal("0")
            if fecha_actual > fecha_limite_pago_date:
                intereses = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            valor_total_pagar = factura.cuota_fomento + intereses
            valor_total_general += valor_total_pagar

            detalles = factura.detallesfacturaunica_set.all()
            promedio_valor_kilo = round(
                sum(d.valor_kilo for d in detalles) / len(detalles), 2
            ) if detalles else 0

            recaudador = factura.id_persona_recaudador
            proveedor = factura.id_persona_proveedor

            facturas_no_pagadas.append({
                'id_factura_unica': factura.id_factura_unica,
                "tipo_documento_recaudador": str(recaudador.tipo_documento) if recaudador.tipo_documento else None,
                "numero_documento_recaudador": recaudador.numero_documento,
                "departamento": factura.id_departamento_cacao.nombre,
                "municipio": factura.id_municipio_cacao.nombre,
                "fecha_creacion": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "estado_factura": estado_factura,
                "estado_factura_display": estado_factura_display,
                "tiene_solicitud_acuerdo_pago": mensaje_solicitud,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_interes": fecha_limite_pago_interes,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor.numero_documento if proveedor else None,
                # Asegurar que los kilos se envíen como string con 2 decimales
                "total_kilos": str(Decimal(factura.total_kilos).quantize(Decimal('0.01'))),
                "cuota_fomento": float(factura.cuota_fomento),
                "promedio_valor_kilo": promedio_valor_kilo,
                "valor_bruto": float(factura.valor_bruto),
                "dias_mora": dias_mora,
                "intereses": round(float(intereses), 2),
                "valor_total_pagar": round(float(valor_total_pagar), 2),
                "estado_liquidacion_display": cod_estado_display
            })

        # Construir respuesta paginada manualmente
        base_url = request.build_absolute_uri().split('?')[0]
        query_params = request.query_params.copy()
        next_url = None
        previous_url = None
        
        if page.has_next():
            query_params['page'] = page.next_page_number()
            next_url = f"{base_url}?{query_params.urlencode()}"
        if page.has_previous():
            query_params['page'] = page.previous_page_number()
            previous_url = f"{base_url}?{query_params.urlencode()}"
        
        return Response({
            "success": True,
            "count": total_count,
            "total_pages": total_pages,
            "current_page": page.number,
            "next": next_url,
            "previous": previous_url,
            "facturas": facturas_no_pagadas,
            "valor_total_general": round(float(valor_total_general), 2)
        })

    

class FacturasPagadasView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        persona = request.user.persona
        nro_factura_unica = request.query_params.get('nro_factura_unica', None)

        facturas = FacturaUnica.objects.filter(
            id_persona_recaudador=persona,
            id_liq_factura_unica__cod_estado='P'  # Solo pagadas
        ).select_related(
            'id_persona_recaudador', 'id_persona_proveedor', 'id_liq_factura_unica'
        ).prefetch_related(
            'detallesfacturaunica_set'
        ).order_by('nro_factura_unica')

        if nro_factura_unica:
            facturas = facturas.filter(nro_factura_unica=nro_factura_unica)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(facturas, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron facturas pagadas."
            }, status=status.HTTP_404_NOT_FOUND)

        facturas_pagadas = []

        # Obtener configuración de fechas
        dias_pago_interes = FechasCierre.objects.filter(
            cod_tipo_cobro_fecha="CF"
        ).values_list('dias_pago_interes', flat=True).first()
        dias_pago = FechasCierre.objects.filter(
            cod_tipo_cobro_fecha="CF"
        ).values_list('dias_pago', flat=True).first()

        if dias_pago is None or dias_pago_interes is None:
            return Response({
                'success': False,
                'detail': "No se encontró configuración de 'dias_pago' o 'dias_pago_interes'."
            }, status=status.HTTP_400_BAD_REQUEST)

        fecha_actual = timezone.now().date()

        for factura in page:
            fecha_compra = factura.fecha_compra.date() if isinstance(factura.fecha_compra, datetime) else factura.fecha_compra

            # Calcular fecha límite sin intereses
            if fecha_compra.day <= dias_pago:
                fecha_limite_pago = fecha_compra.replace(day=dias_pago)
            else:
                mes_siguiente = fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular fecha límite con intereses
            if fecha_compra.day <= dias_pago_interes:
                try:
                    fecha_limite_pago_interes = fecha_compra.replace(day=dias_pago_interes)
                except ValueError:
                    # Si el día no existe en el mes, usar el último día válido de ese mes
                    primer_dia_mes_siguiente = (fecha_compra + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago_interes = primer_dia_mes_siguiente - timedelta(days=1)
            else:
                mes_siguiente = fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago_interes = mes_siguiente.replace(day=dias_pago_interes)
                except ValueError:
                    primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago_interes = primer_dia_siguiente_mes - timedelta(days=1)


            dias_mora = max((fecha_actual - fecha_limite_pago).days, 0)

            detalles = factura.detallesfacturaunica_set.all()
            promedio_valor_kilo = round(
                sum(d.valor_kilo for d in detalles) / len(detalles), 2
            ) if detalles else 0

            recaudador = factura.id_persona_recaudador
            proveedor = factura.id_persona_proveedor
            cod_estado_display = factura.id_liq_factura_unica.get_cod_estado_display() if factura.id_liq_factura_unica else None

            facturas_pagadas.append({
                'id_factura_unica': factura.id_factura_unica,
                "tipo_documento_recaudador": str(recaudador.tipo_documento) if recaudador.tipo_documento else None,
                "numero_documento_recaudador": recaudador.numero_documento,
                "fecha_creacion": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "nro_factura_unica": factura.nro_factura_unica,
                "tiene"
                "numero_documento_proveedor": proveedor.numero_documento if proveedor else None,
                "total_kilos": factura.total_kilos,
                "cuota_fomento": float(factura.cuota_fomento),
                "promedio_valor_kilo": promedio_valor_kilo,
                "valor_bruto": float(factura.valor_bruto),
                "dias_mora": dias_mora,
                "estado_liquidacion_display": cod_estado_display
            })

        return paginator.get_paginated_response(facturas_pagadas)
   

class SolicitudAcuerdoPagoPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        persona = request.user.persona
        id_facturas_raw = request.query_params.get('id_facturas')

        if not id_facturas_raw:
            return Response({
                'success': False,
                'detail': "El parámetro 'id_facturas' es obligatorio y debe ser una lista de IDs."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_facturas_list = json.loads(id_facturas_raw)
            if not isinstance(id_facturas_list, list) or not all(isinstance(i, int) for i in id_facturas_list):
                raise ValueError
        except Exception:
            return Response({
                'success': False,
                'detail': "El parámetro 'id_facturas' debe ser un arreglo válido de enteros, por ejemplo: [1, 2, 3]"
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=id_facturas_list)

        facturas_ids = list(facturas.values_list('id_factura_unica', flat=True))
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron facturas válidas asociadas a su usuario."
            }, status=status.HTTP_404_NOT_FOUND)

        cuota_fomento_total = Decimal("0")
        intereses_total = Decimal("0")

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
                .values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
                .values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)

            fecha_actual = timezone.now().date()
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses_x_factura
        
        valor_total_pagar = cuota_fomento_total + intereses_total


        fecha_solicitud = timezone.now()
        ultimo_nro = SolicitudAcuerdosPago.objects.aggregate(
            max_nro=Max('nro_solicitud')
        )['max_nro'] or 0
        nro_solicitud = ultimo_nro + 1

        return Response({
            "success": True,
            "detail": "Vista previa generada correctamente.",
            "data": {
                "nro_solicitud": nro_solicitud,
                "fecha_solicitud": fecha_solicitud,
                "dias_mora": dias_mora,
                "valor_total_pagar": round(float(valor_total_pagar), 5),
                "cuota_fomento_total" :cuota_fomento_total,
                "estado": "Solicitado",
                "facturas_seleccionadas": facturas_ids
            }
        }, status=status.HTTP_200_OK)

class CreateSolicitudAcuerdoPagoView(APIView):
    permission_classes = [IsAuthenticated, PermisoCrearSolicitudAcuerdosDePago]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        persona = request.user.persona

        observaciones = request.data.get('observaciones')
        id_facturas_raw = request.data.get('id_facturas')

        if not observaciones:
            return Response({"success": False, "detail": "El campo 'observaciones' es obligatorio."},
                            status=status.HTTP_400_BAD_REQUEST)
        if len(observaciones) > 255:
            return Response({"success": False, "detail": "El campo 'observaciones' no puede superar los 255 caracteres."},
                            status=status.HTTP_400_BAD_REQUEST)

        doc_solicitud = request.FILES.get('doc_solicitud')
        if not doc_solicitud:
            return Response({"success": False, "detail": "El archivo 'doc_solicitud' es obligatorio."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_file(doc_solicitud, ALLOWED_DOCUMENT_EXTENSIONS)
            doc_solicitud.name = f"{uuid.uuid4()}.{doc_solicitud.name.split('.')[-1]}"
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_facturas = json.loads(id_facturas_raw) if isinstance(id_facturas_raw, str) else id_facturas_raw
            if not isinstance(id_facturas, list) or not all(isinstance(i, int) for i in id_facturas):
                raise ValueError
        except Exception:
            return Response({
                "success": False,
                "detail": "El campo 'id_facturas' debe ser un arreglo válido de IDs de facturas. Ej: [1,2,3]"
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas_existentes = FacturaUnica.objects.filter(id_factura_unica__in=id_facturas)
        ids_existentes = set(facturas_existentes.values_list('id_factura_unica', flat=True))
        ids_recibidos = set(id_facturas)
        ids_faltantes = list(ids_recibidos - ids_existentes)

        if ids_faltantes:
            return Response({
                "success": False,
                "detail": "Las siguientes facturas no existen en el sistema.",
                "facturas_no_encontradas": ids_faltantes
            }, status=status.HTTP_400_BAD_REQUEST)

        facturas = facturas_existentes

        facturas_con_acuerdo = DetalleAcuerdoPago.objects.filter(
            id_factura_unica__in=id_facturas
        ).values_list('id_factura_unica', flat=True).distinct()

        if facturas_con_acuerdo.exists():
            nro_facturas_con_acuerdo = FacturaUnica.objects.filter(
                id_factura_unica__in=facturas_con_acuerdo
            ).values_list('nro_factura_unica', flat=True)

            return Response({
                "success": False,
                "detail": f"Las siguientes facturas ya están asociadas a una solicitud acuerdo de pago:  Numero de factura {list(nro_facturas_con_acuerdo)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        cuota_fomento_total = Decimal("0")
        intereses_total = Decimal("0")
        fecha_actual = timezone.now().date()

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()

            if dias_pago_interes is None or dias_pago is None:
                return Response({
                    "success": False,
                    "detail": "No se encontró la configuración de días de pago en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)

            intereses = Decimal("0")
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN (PI)."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses

        valor_total_pagar = cuota_fomento_total + intereses_total

        ultimo_nro = SolicitudAcuerdosPago.objects.aggregate(max_nro=Max('nro_solicitud'))['max_nro'] or 0
        nro_solicitud = ultimo_nro + 1

        solicitud = SolicitudAcuerdosPago.objects.create(
            id_persona_solicita=persona,
            nro_solicitud=nro_solicitud,
            fecha_solicitud=timezone.now(),
            valor_total_pagar=valor_total_pagar,
            estado='SO',
            observaciones=observaciones,
            doc_solicitud=doc_solicitud
        )

        for factura in facturas:
            DetalleAcuerdoPago.objects.create(
                id_Solicitud_acuerdo_pago=solicitud,
                id_factura_unica=factura,
                id_cuota_acuerdo_pago=None
            )

        recaudadores_kilos = {}

        for factura in facturas:
            recaudador = factura.id_persona_recaudador
            if recaudador not in recaudadores_kilos:
                recaudadores_kilos[recaudador] = 0
            recaudadores_kilos[recaudador] += factura.total_kilos

        fecha_solicitud_str = timezone.now().strftime('%d-%b-%Y')
        for recaudador, total_kilos in recaudadores_kilos.items():

            if recaudador.tipo_persona == 'N':
                nombre_de_usuario = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
            else:
                nombre_de_usuario = recaudador.razon_social

            total_kilos_formateado = f"{total_kilos:,.0f}"
            total_pago_formateado = f"{valor_total_pagar:,.0f}"

            subject = "Solicitud de Acuerdo de Pago Registrada"
            template = "solicitud-acuerdo-pago.html"

            Util.notificacion(
                recaudador,
                subject,
                template,
                fecha_solicitud=fecha_solicitud_str,
                numero_solicitud=nro_solicitud,
                nombre_de_usuario=nombre_de_usuario,
                total_cuota_fomento=total_pago_formateado
            )

            sms = (
                f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                f"Solicitud pago creada con el numero de solicitud: {nro_solicitud}, "
                f"Valor total a pagar: ${total_pago_formateado}."
            )

            telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
            if telefono_recaudador:
                Util.send_sms(telefono_recaudador, sms)

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = "Com_SolAcP"
        data_alerta['informacion_complemento_mensaje'] = f"Solicitud de acuerdo de pago creada por {persona.primer_nombre} {persona.primer_apellido} con número de solicitud {nro_solicitud}."

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        # Auditoría
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        descripcion = {
            "Mensaje": "Creación de solicitud de acuerdo de pago",
            "NroSolicitud": nro_solicitud,
            "ValorTotalPagar": float(valor_total_pagar),
            "FacturasAsociadas": [f.nro_factura_unica for f in facturas],
            "Observaciones": observaciones,
            "Registrado por": nombre_persona
        }

        valores_actualizados = {
            "create": {
                "Nuevo": {
                    "IdSolicitud": solicitud.id_solicitud_acuerdo_pago,
                    "NroSolicitud": nro_solicitud,
                    "Estado": solicitud.get_estado_display(),
                    "ValorTotalPagar": float(valor_total_pagar),
                    "FacturasAsociadas": [f.id_factura_unica for f in facturas]
                }
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 15,  
            "cod_permiso": "CR", 
            "subsistema": "RECA",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)
        print(recaudador.id_persona)

        return Response({
            "success": True,
            "detail": "Solicitud de acuerdo de pago y sus detalles fueron creados exitosamente.",
            "data": {
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "cuota_fomento_total": cuota_fomento_total,
                "valor_total_pagar": float(valor_total_pagar),
                "facturas_asociadas": [f.id_factura_unica for f in facturas]
            }
        }, status=status.HTTP_201_CREATED)

    


class ConsultaSolicitudesAcuerdosPagoExterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionAcuerdosDePago]
    pagination_class = CustomPagination 

    def get(self, request, *args, **kwargs):
        persona = request.user.persona

        # Obtener las solicitudes de acuerdo de pago
        solicitudes = SolicitudAcuerdosPago.objects.filter(
            id_persona_solicita=persona
        ).select_related('id_persona_solicita').order_by('-nro_solicitud')

        # Aplicar filtros
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        fecha_desde = request.query_params.get('fecha_desde', None)
        fecha_hasta = request.query_params.get('fecha_hasta', None)

        # Validar que el estado sea válido
        estados_validos = [choice[0] for choice in cod_estado_acuerdo_CHOICES]
        if estado and estado not in estados_validos:
            return Response({
                "success": False,
                "detail": f"El estado '{estado}' no es válido. Los estados válidos son: {', '.join(estados_validos)}."
            }, status=status.HTTP_400_BAD_REQUEST)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)
            
        # Filtro por rango de fechas
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron solicitudes de acuerdos de pago."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar los datos
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes encontradas correctamente.",
            "data": serializer.data
        })
    
class ConsultaDetallesAcuerdoPagoExterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionAcuerdosDePago]

    def get_doc_soporte_url(self, obj):
        if hasattr(obj, "doc_solicitud") and obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if hasattr(obj.doc_solicitud, "name") and len(obj.doc_solicitud.name) > 0 else None
        if hasattr(obj, "documento_generado") and obj.documento_generado:
            archivo = obj.documento_generado
            return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_acuerdo_pago") and obj.doc_acuerdo_pago:
            doc = obj.doc_acuerdo_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_pago") and obj.doc_pago:
            doc = obj.doc_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

        # Obtener el plan de pago más reciente
        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        plan_estado = plan_pago.estado if plan_pago else None
        plan_estado_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else plan_estado
        nro_plan_pago = plan_pago.nro_plan_pago if plan_pago else None
        id_plan_pago = plan_pago.id_plan_pago if plan_pago else None

        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago) if plan_pago else CuotasAcuerdoPago.objects.none()

        solicitud_acuerdo_pago = [{
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_persona_solicita": solicitud.id_persona_solicita.id_persona if solicitud.id_persona_solicita else None,
            "id_persona_solicita_nombre": nombre_recaudador,
            "nro_solicitud": solicitud.nro_solicitud,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "estado": solicitud.get_estado_display(),
            "nombre_recaudador": nombre_recaudador,
            "tipo_documento": tipo_documento,
            "numero_documento": numero_documento,
            "id_plan_pago": id_plan_pago,
            "numero_plan_pago": nro_plan_pago,
            "estado_plan_pago": plan_estado,
            "estado_plan_pago_display": plan_estado_display,
        }]

        detalle_plan_pago = []

        if cuotas.exists():
            detalles_cuotas = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__in=cuotas
            ).select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

            fecha_actual = now().date()
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
                .values_list("dias_pago", flat=True).first()
            porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
            tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

            for cuota in cuotas:
                detalles_cuota = detalles_cuotas.filter(id_cuota_acuerdo_pago=cuota)
                facturas_cuota = []
                for detalle in detalles_cuota:
                    factura = detalle.id_factura_unica
                    cuota_fomento = factura.cuota_fomento
                    intereses = Decimal("0")

                    mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                    try:
                        fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                    except ValueError:
                        primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                        fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                    fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
                    dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

                    if dias_mora > 0 and tasa_interes_dian:
                        intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

                    valor_factura = cuota_fomento + intereses

                    # Obtener doc_pago_liquidacion para la factura
                    doc_pago_liquidacion = None
                    if factura.id_liq_factura_unica and factura.id_liq_factura_unica.doc_pago:
                        doc_pago_liquidacion = self.get_doc_soporte_url(factura.id_liq_factura_unica)

                    facturas_cuota.append({
                        "id_factura_unica": factura.id_factura_unica,
                        "nro_factura": factura.nro_factura_unica,
                        "cuota_fomento": cuota_fomento,
                        "valor_factura": round(valor_factura, 5),
                        "doc_pago_liquidacion": doc_pago_liquidacion
                    })

                detalle_plan_pago.append({
                    "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                    "nro_solicitud": solicitud.nro_solicitud,
                    "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
                    "id_plan_pago": cuota.id_plan_pago.id_plan_pago if cuota.id_plan_pago else None,
                    "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                    "estado_plan_pago": cuota.id_plan_pago.estado if cuota.id_plan_pago else None,
                    "numero_cuota": cuota.nro_cuota,
                    "fecha_pago": cuota.fecha_vencimiento,
                    "facturas": facturas_cuota
                })

        docs = {
            "documento_asociado": self.get_doc_soporte_url(solicitud),
            "doc_acuerdo_plan_pago": self.get_doc_soporte_url(plan_pago) if plan_pago else None,
        }

        return Response({
            "success": True,
            "detail": "Consulta realizada correctamente.",
            "solicitud_acuerdo_pago": solicitud_acuerdo_pago,
            "detalle_plan_pago": detalle_plan_pago,
            "docs": docs
        }, status=status.HTTP_200_OK)

class ConsultaDetallesAcuerdoPagoInterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]

    def get_doc_soporte_url(self, obj):
        if hasattr(obj, "doc_solicitud") and obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if hasattr(obj.doc_solicitud, "name") and len(obj.doc_solicitud.name) > 0 else None
        if hasattr(obj, "documento_generado") and obj.documento_generado:
            archivo = obj.documento_generado
            return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_acuerdo_pago") and obj.doc_acuerdo_pago:
            doc = obj.doc_acuerdo_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_pago") and obj.doc_pago:
            doc = obj.doc_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

        # Obtener el plan de pago más reciente
        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        plan_estado = plan_pago.estado if plan_pago else None
        plan_estado_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else plan_estado
        nro_plan_pago = plan_pago.nro_plan_pago if plan_pago else None
        id_plan_pago = plan_pago.id_plan_pago if plan_pago else None

        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago) if plan_pago else CuotasAcuerdoPago.objects.none()

        solicitud_acuerdo_pago = [{
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_persona_solicita": solicitud.id_persona_solicita.id_persona if solicitud.id_persona_solicita else None,
            "id_persona_solicita_nombre": nombre_recaudador,
            "nro_solicitud": solicitud.nro_solicitud,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "estado": solicitud.get_estado_display(),
            "nombre_recaudador": nombre_recaudador,
            "tipo_documento": tipo_documento,
            "numero_documento": numero_documento,
            "id_plan_pago": id_plan_pago,
            "numero_plan_pago": nro_plan_pago,
            "estado_plan_pago": plan_estado,
            "estado_plan_pago_display": plan_estado_display,
        }]
        detalle_plan_pago = []

        if cuotas.exists():
            detalles_cuotas = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__in=cuotas
            ).select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

            fecha_actual = now().date()
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
                .values_list("dias_pago", flat=True).first()
            porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
            tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

            for cuota in cuotas:
                detalles_cuota = detalles_cuotas.filter(id_cuota_acuerdo_pago=cuota)
                facturas_cuota = []
                for detalle in detalles_cuota:
                    factura = detalle.id_factura_unica
                    cuota_fomento = factura.cuota_fomento
                    intereses = Decimal("0")

                    mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                    try:
                        fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                    except ValueError:
                        primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                        fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                    fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
                    dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

                    if dias_mora > 0 and tasa_interes_dian:
                        intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

                    valor_factura = cuota_fomento + intereses

                    # Obtener doc_pago_liquidacion para la factura
                    doc_pago_liquidacion = None
                    if factura.id_liq_factura_unica and factura.id_liq_factura_unica.doc_pago:
                        doc_pago_liquidacion = self.get_doc_soporte_url(factura.id_liq_factura_unica)

                    facturas_cuota.append({
                        "id_factura_unica": factura.id_factura_unica,
                        "nro_factura": factura.nro_factura_unica,
                        "cuota_fomento": cuota_fomento,
                        "valor_factura": round(valor_factura, 5),
                        "doc_pago_liquidacion": doc_pago_liquidacion
                    })

                detalle_plan_pago.append({
                    "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                    "nro_solicitud": solicitud.nro_solicitud,
                    "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
                    "id_plan_pago": cuota.id_plan_pago.id_plan_pago if cuota.id_plan_pago else None,
                    "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                    "estado_plan_pago": cuota.id_plan_pago.estado if cuota.id_plan_pago else None,
                    "numero_cuota": cuota.nro_cuota,
                    "fecha_pago": cuota.fecha_vencimiento,
                    "facturas": facturas_cuota
                })

        docs = {
            "documento_asociado": self.get_doc_soporte_url(solicitud),
            "doc_acuerdo_plan_pago": self.get_doc_soporte_url(plan_pago) if plan_pago else None,
        }

        return Response({
            "success": True,
            "detail": "Consulta realizada correctamente.",
            "solicitud_acuerdo_pago": solicitud_acuerdo_pago,
            "detalle_plan_pago": detalle_plan_pago,
            "docs": docs
        }, status=status.HTTP_200_OK)

class InfoVentanaEmergenteConsultaExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionAcuerdosDePago]

    def _calcular_totales(self, obj):
        cuota_fomento_total = Decimal("0")
        intereses_total = Decimal("0")
        dias_mora_max = 0
        fecha_actual = now().date()

        factura_ids = DetalleAcuerdoPago.objects.filter(
            id_Solicitud_acuerdo_pago=obj
        ).values_list('id_factura_unica', flat=True)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=factura_ids)

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list('dias_pago', flat=True).first()
        dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list('dias_pago_interes', flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        if dias_pago is None or dias_pago_interes is None:
            return {
                "cuota_fomento_total": Decimal("0"),
                "valor_total_pagar": Decimal("0"),
                "intereses_total": Decimal("0"),
                "dias_mora": 0
            }

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            dias_mora_max = max(dias_mora_max, dias_mora)

            intereses = Decimal("0")
            if fecha_actual > fecha_limite_pago_date and tasa_interes_dian:
                intereses = (factura.cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            intereses_total += intereses

        valor_total_pagar = cuota_fomento_total + intereses_total

        return {
            "cuota_fomento_total": round(cuota_fomento_total, 5),
            "valor_total_pagar": round(valor_total_pagar, 5),
            "intereses_total": round(intereses_total, 5),
            "dias_mora": dias_mora_max
        }

    def get_doc_soporte_url(self, obj):
        # obj puede ser SolicitudAcuerdosPago, DocumentosGenerados o entidad con un FileField
        if hasattr(obj, "doc_solicitud") and obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if hasattr(obj.doc_solicitud, "name") and len(obj.doc_solicitud.name) > 0 else None
        if hasattr(obj, "documento_generado") and obj.documento_generado:
            archivo = obj.documento_generado
            return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_acuerdo_pago") and obj.doc_acuerdo_pago:
            doc = obj.doc_acuerdo_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_pago") and obj.doc_pago:
            doc = obj.doc_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        return None

    def get(self, request, id_solicitud_acuerdo_pago):
        try:
            solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud_acuerdo_pago)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

        # Obtener el plan de pago más reciente
        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()

        # Buscar la primera liquidación válida con doc_pago
        liquidacion = None
        for factura in facturas:
            if factura.id_liq_factura_unica and factura.id_liq_factura_unica.doc_pago:
                liquidacion = factura.id_liq_factura_unica
                break

        # Calcular valor total con intereses si aplica
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for factura in facturas:
            cuota_fomento = factura.cuota_fomento
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            intereses = Decimal("0")
            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            totales = self._calcular_totales(solicitud)
            valor_total_sin_intereses = totales["cuota_fomento_total"]
            valor_total = totales["valor_total_pagar"]

        data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "nro_solicitud": solicitud.nro_solicitud,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "documento_asociado": self.get_doc_soporte_url(solicitud),
            "valor_total_facturas": round(valor_total, 2),
            "valor_total_sin_intereses": round(valor_total_sin_intereses, 2),
            "dias_mora": totales["dias_mora"],
            "estado_solicitud": solicitud.get_estado_display() if hasattr(solicitud, "get_estado_display") else solicitud.estado,
            "observaciones": solicitud.observaciones,
            "doc_acuerdo_plan_pago": self.get_doc_soporte_url(plan_pago) if plan_pago else None,
            "doc_pago_liquidacion": self.get_doc_soporte_url(liquidacion) if liquidacion else None,
        }

        return Response({
            "success": True,
            "detail": "Información consultada correctamente.",
            "data": data
        }, status=status.HTTP_200_OK)
    
# class ConsultadDetallesPlanesPagoExterno(APIView):
#     permission_classes = [IsAuthenticated, PermisoConsultarAdministracionAcuerdosDePago]

#     def get(self, request, *args, **kwargs):
#         id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

#         if not id_solicitud:
#             return Response({
#                 "success": False,
#                 "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
#                 .get(id_solicitud_acuerdo_pago=id_solicitud)
#         except SolicitudAcuerdosPago.DoesNotExist:
#             return Response({
#                 "success": False,
#                 "detail": "No se encontró la solicitud con el ID proporcionado."
#             }, status=status.HTTP_404_NOT_FOUND)

#         detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
#             .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

#         persona = solicitud.id_persona_solicita
#         nombre_recaudador = (
#             f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
#             f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
#             if persona.tipo_persona == 'N' else persona.razon_social
#         )

#         tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
#         numero_documento = persona.numero_documento

#         resultado = []
#         fecha_actual = now().date()

#         dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
#             .values_list("dias_pago", flat=True).first()

#         porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
#         tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

#         # Obtener el plan de pago más reciente asociado a la solicitud
#         plan = None
#         plan_estado = None
#         plan_estado_display = None
#         for detalle in detalles:
#             cuota = detalle.id_cuota_acuerdo_pago
#             if cuota and cuota.id_plan_pago:
#                 plan = cuota.id_plan_pago
#                 plan_estado = plan.estado
#                 plan_estado_display = plan.get_estado_display() if hasattr(plan, "get_estado_display") else plan.estado
#                 break

#         for detalle in detalles:
#             cuota = detalle.id_cuota_acuerdo_pago
#             plan_local = cuota.id_plan_pago if cuota else None
#             factura = detalle.id_factura_unica

#             # Calcular intereses para la factura
#             cuota_fomento = factura.cuota_fomento
#             intereses = Decimal("0")

#             mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#             try:
#                 fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
#             except ValueError:
#                 primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
#                 fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

#             fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
#             dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

#             if dias_mora > 0 and tasa_interes_dian:
#                 intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

#             valor_factura = cuota_fomento + intereses

#             resultado.append({
#                 "nro_solicitud": solicitud.nro_solicitud,
#                 "tipo_documento_recaudador": tipo_documento,
#                 "numero_documento_recaudador": numero_documento,
#                 "nombre_recaudador": nombre_recaudador,
#                 "fecha_solicitud": solicitud.fecha_solicitud,
#                 "estado": solicitud.get_estado_display(),
#                 "numero_plan_pago": plan_local.nro_plan_pago if plan_local else None,
#                 "estado_plan_pago": plan_estado,
#                 "estado_plan_pago_display": plan_estado_display,
#                 "numero_cuota": cuota.nro_cuota if cuota else None,
#                 "fecha_pago": cuota.fecha_vencimiento if cuota else None,
#                 "Nro_factura": factura.nro_factura_unica,
#                 "cuota_fomento": cuota_fomento,
#                 "valor_factura": round(valor_factura, 5)
#             })

#         return Response({
#             "success": True,
#             "detail": "Planes de pago consultados correctamente.",
#             "data": resultado
#         }, status=status.HTTP_200_OK)

class InfoVentanaEmergenteConsultaInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]

    def _calcular_totales(self, obj):
        cuota_fomento_total = Decimal("0")
        intereses_total = Decimal("0")
        dias_mora_max = 0
        fecha_actual = now().date()

        factura_ids = DetalleAcuerdoPago.objects.filter(
            id_Solicitud_acuerdo_pago=obj
        ).values_list('id_factura_unica', flat=True)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=factura_ids)

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list('dias_pago', flat=True).first()
        dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list('dias_pago_interes', flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        if dias_pago is None or dias_pago_interes is None:
            return {
                "cuota_fomento_total": Decimal("0"),
                "valor_total_pagar": Decimal("0"),
                "intereses_total": Decimal("0"),
                "dias_mora": 0
            }

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            dias_mora_max = max(dias_mora_max, dias_mora)

            intereses = Decimal("0")
            if fecha_actual > fecha_limite_pago_date and tasa_interes_dian:
                intereses = (factura.cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            intereses_total += intereses

        valor_total_pagar = cuota_fomento_total + intereses_total

        return {
            "cuota_fomento_total": round(cuota_fomento_total, 5),
            "valor_total_pagar": round(valor_total_pagar, 5),
            "intereses_total": round(intereses_total, 5),
            "dias_mora": dias_mora_max
        }

    def get_doc_soporte_url(self, obj):
        # obj puede ser SolicitudAcuerdosPago, DocumentosGenerados o entidad con un FileField
        if hasattr(obj, "doc_solicitud") and obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if hasattr(obj.doc_solicitud, "name") and len(obj.doc_solicitud.name) > 0 else None
        if hasattr(obj, "documento_generado") and obj.documento_generado:
            # Aquí accedemos al archivo real
            archivo = obj.documento_generado
            return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_acuerdo_pago") and obj.doc_acuerdo_pago:
            # doc_acuerdo_pago puede ser un DocumentosGenerados
            doc = obj.doc_acuerdo_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        if hasattr(obj, "doc_pago") and obj.doc_pago:
            doc = obj.doc_pago
            if hasattr(doc, "documento_generado") and doc.documento_generado:
                archivo = doc.documento_generado
                return Util.obtener_archivos(archivo.name) if hasattr(archivo, "name") and len(archivo.name) > 0 else None
        return None

    def get(self, request, id_solicitud_acuerdo_pago):
        try:
            solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud_acuerdo_pago)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

        # Obtener el plan de pago más reciente
        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()

        # Buscar la primera liquidación válida con doc_pago
        liquidacion = None
        for factura in facturas:
            if factura.id_liq_factura_unica and factura.id_liq_factura_unica.doc_pago:
                liquidacion = factura.id_liq_factura_unica
                break

        # Calcular valor total con intereses si aplica
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for factura in facturas:
            cuota_fomento = factura.cuota_fomento
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            intereses = Decimal("0")
            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            totales = self._calcular_totales(solicitud)
            valor_total_sin_intereses = totales["cuota_fomento_total"]
            valor_total = totales["valor_total_pagar"]

        response_data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "nro_solicitud": solicitud.nro_solicitud,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "documento_asociado": self.get_doc_soporte_url(solicitud),
            "valor_total_facturas": round(valor_total, 2),
            "valor_total_sin_intereses": round(valor_total_sin_intereses, 2),
            "dias_mora": totales["dias_mora"],
            "estado_solicitud": solicitud.get_estado_display() if hasattr(solicitud, "get_estado_display") else solicitud.estado,
            "observaciones": solicitud.observaciones,
            "doc_acuerdo_plan_pago": self.get_doc_soporte_url(plan_pago) if plan_pago else None,
            "doc_pago_liquidacion": self.get_doc_soporte_url(liquidacion) if liquidacion else None,
        }

        return Response({
            "success": True,
            "detail": "Información consultada correctamente.",
            "data": response_data
        }, status=status.HTTP_200_OK)

    
# class ConsultadDetallesPlanesPagoInterno(APIView):
#     permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]

#     def get(self, request, *args, **kwargs):
#         id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

#         if not id_solicitud:
#             return Response({
#                 "success": False,
#                 "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
#                 .get(id_solicitud_acuerdo_pago=id_solicitud)
#         except SolicitudAcuerdosPago.DoesNotExist:
#             return Response({
#                 "success": False,
#                 "detail": "No se encontró la solicitud con el ID proporcionado."
#             }, status=status.HTTP_404_NOT_FOUND)

#         detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
#             .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

#         persona = solicitud.id_persona_solicita
#         nombre_recaudador = (
#             f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
#             f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
#             if persona.tipo_persona == 'N' else persona.razon_social
#         )

#         tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
#         numero_documento = persona.numero_documento

#         resultado = []
#         fecha_actual = now().date()

#         dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
#             .values_list("dias_pago", flat=True).first()

#         porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
#         tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

#         # Obtener el plan de pago más reciente asociado a la solicitud
#         plan = None
#         plan_estado = None
#         plan_estado_display = None
#         for detalle in detalles:
#             cuota = detalle.id_cuota_acuerdo_pago
#             if cuota and cuota.id_plan_pago:
#                 plan = cuota.id_plan_pago
#                 plan_estado = plan.estado
#                 plan_estado_display = plan.get_estado_display() if hasattr(plan, "get_estado_display") else plan.estado
#                 break

#         for detalle in detalles:
#             cuota = detalle.id_cuota_acuerdo_pago
#             plan_local = cuota.id_plan_pago if cuota else None
#             factura = detalle.id_factura_unica

#             # Calcular intereses para la factura
#             cuota_fomento = factura.cuota_fomento
#             intereses = Decimal("0")

#             mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#             try:
#                 fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
#             except ValueError:
#                 primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
#                 fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

#             fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
#             dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

#             if dias_mora > 0 and tasa_interes_dian:
#                 intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

#             valor_factura = cuota_fomento + intereses

#             resultado.append({
#                 "nro_solicitud": solicitud.nro_solicitud,
#                 "tipo_documento_recaudador": tipo_documento,
#                 "numero_documento_recaudador": numero_documento,
#                 "nombre_recaudador": nombre_recaudador,
#                 "fecha_solicitud": solicitud.fecha_solicitud,
#                 "estado": solicitud.get_estado_display(),
#                 "numero_plan_pago": plan_local.nro_plan_pago if plan_local else None,
#                 "estado_plan_pago": plan_estado,
#                 "estado_plan_pago_display": plan_estado_display,
#                 "numero_cuota": cuota.nro_cuota if cuota else None,
#                 "fecha_pago": cuota.fecha_pago if cuota else None,
#                 "Nro_factura": factura.nro_factura_unica,
#                 "cuota_fomento": cuota_fomento,
#                 "valor_factura": round(valor_factura, 5)
#             })

#         return Response({
#             "success": True,
#             "detail": "Planes de pago consultados correctamente.",
#             "data": resultado
#         }, status=status.HTTP_200_OK)
    
class ConsultaPlanesPagoExterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        persona = request.user.persona

        # Filtros
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        fecha_desde = request.query_params.get('fecha_desde', None)
        fecha_hasta = request.query_params.get('fecha_hasta', None)
        estado = request.query_params.get('estado', None)

        solicitudes = SolicitudAcuerdosPago.objects.filter(
            id_persona_solicita=persona
        ).select_related('id_persona_solicita').order_by('-nro_solicitud')

        estados_validos = [choice[0] for choice in cod_estado_acuerdo_CHOICES]
        if estado and estado not in estados_validos:
            return Response({
                "success": False,
                "detail": f"El estado '{estado}' no es válido. Los estados válidos son: {', '.join(estados_validos)}."
            }, status=status.HTTP_400_BAD_REQUEST)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                solicitudes = solicitudes.filter(nro_solicitud=int(nro_solicitud))
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron planes de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        resultado = []
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for solicitud in page:
            detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
                .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

            tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
            numero_documento = persona.numero_documento
            nombre_recaudador = (
                f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                if persona.tipo_persona == 'N' else persona.razon_social
            )

            relacion_facturas = set()
            cuota_total = Decimal("0")
            valor_total = Decimal("0")

            # Agrupar facturas por cuota
            cuotas_dict = {}
            for detalle in detalles:
                factura = detalle.id_factura_unica
                cuota = detalle.id_cuota_acuerdo_pago
                if not factura or not cuota:
                    continue

                relacion_facturas.add(str(factura.nro_factura_unica))
                cuota_fomento = factura.cuota_fomento
                cuota_total += cuota_fomento

                # Calcular intereses
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = Decimal("0")
                if dias_mora > 0 and tasa_interes_dian:
                    intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

                valor_total += cuota_fomento + intereses

                # Agrupar facturas por cuota
                key = cuota.id_cuota_acuerdo_pago
                if key not in cuotas_dict:
                    cuotas_dict[key] = {
                        "nro_cuota": cuota.nro_cuota,
                        "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                        "facturas": []
                    }
                cuotas_dict[key]["facturas"].append(factura.nro_factura_unica)

            resultado.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "relacion_facturas_unicas": "-".join(sorted(relacion_facturas)),
                "cuota_fomento": round(cuota_total, 5),
                "valor_factura": round(valor_total, 5),
                "id_persona_solicita": solicitud.id_persona_solicita.id_persona,
                "cuotas": [
                    {
                        "id_cuota_acuerdo_pago": key,
                        "nro_cuota": value["nro_cuota"],
                        "nro_plan_pago": value["nro_plan_pago"],
                        "facturas_asociadas": value["facturas"]
                    }
                    for key, value in cuotas_dict.items()
                ]
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        })


class DocumentoDetallesPlanesPagoExterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        fecha_actual = now().date()
        # Enviar SMS (si tiene teléfono)
        sms = (
            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
            f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
        )

        telefono_recaudador = telefono_recaudador
        if telefono_recaudador:
            Util.send_sms(telefono_recaudador, sms)

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)
    
class DocumentoDetallesPlanesPagoInterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        fecha_actual = now().date()
        # Enviar SMS (si tiene teléfono)
        sms = (
            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
            f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
        )

        telefono_recaudador = telefono_recaudador
        if telefono_recaudador:
            Util.send_sms(telefono_recaudador, sms)

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_GesAcP'
        data_alerta['informacion_complemento_mensaje'] = f"Descargue el detalle del acuerdo de pago con ID: {solicitud.id_solicitud_acuerdo_pago}."

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)


        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)
    
class DocumentoDetallesPlanesPagoInternoGestionar(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarGestionarAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        fecha_actual = now().date()
        # Enviar SMS (si tiene teléfono)
        sms = (
            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
            f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
        )

        telefono_recaudador = telefono_recaudador
        if telefono_recaudador:
            Util.send_sms(telefono_recaudador, sms)

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)

class DocumentoDetallesPlanesPagoInternoJuridica(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoJurdica]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        fecha_actual = now().date()
        # Enviar SMS (si tiene teléfono)
        sms = (
            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
            f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
        )

        telefono_recaudador = telefono_recaudador
        if telefono_recaudador:
            Util.send_sms(telefono_recaudador, sms)

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)

class DocumentoDetallesPlanesPagoInternoDireccion(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoDireccion]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        fecha_actual = now().date()
        # Enviar SMS (si tiene teléfono)
        sms = (
            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
            f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
        )

        telefono_recaudador = telefono_recaudador
        if telefono_recaudador:
            Util.send_sms(telefono_recaudador, sms)

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)
    

class DocumentoDetallesPlanesPagoAprobacionRecaudador(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobacionRecaudadorAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)
    
# class DocumentoDetallesPlanesPagoInterno(APIView):
#     permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]

#     def get(self, request, *args, **kwargs):
#         id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

#         if not id_solicitud:
#             return Response({
#                 "success": False,
#                 "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
#                 .get(id_solicitud_acuerdo_pago=id_solicitud)
#         except SolicitudAcuerdosPago.DoesNotExist:
#             return Response({
#                 "success": False,
#                 "detail": "No se encontró la solicitud con el ID proporcionado."
#             }, status=status.HTTP_404_NOT_FOUND)

#         detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
#             .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

#         persona = solicitud.id_persona_solicita
#         nombre_recaudador = (
#             f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
#             f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
#             if persona.tipo_persona == 'N' else persona.razon_social
#         )

#         telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
#         tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
#         numero_documento = persona.numero_documento

#         # Arreglo 1: información del recaudador
#         recaudador_info = {
#             "tipo_documento_recaudador": tipo_documento,
#             "numero_documento_recaudador": numero_documento,
#             "nombre_recaudador": nombre_recaudador,
#             "direccion_recaudador": persona.direccion_notificaciones,
#             "telefono_recaudador": telefono_recaudador,
#         }

#         # Arreglo 2: detalles del plan de pago
#         detalle_plan_pago = []
#         valor_total = Decimal("0")
#         fecha_actual = now().date()
#         dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
#             .values_list("dias_pago", flat=True).first()
#         porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
#         tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

#         for detalle in detalles:
#             cuota = detalle.id_cuota_acuerdo_pago
#             plan = cuota.id_plan_pago if cuota else None
#             factura = detalle.id_factura_unica
#             if not factura:
#                 continue

#             cuota_fomento = factura.cuota_fomento
#             intereses = Decimal("0")

#             mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#             try:
#                 fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
#             except ValueError:
#                 primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
#                 fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

#             fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
#             dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

#             if dias_mora > 0 and tasa_interes_dian:
#                 intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

#             valor_factura = cuota_fomento + intereses
#             valor_total += valor_factura

#             detalle_plan_pago.append({
#                 "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
#                 "nro_solicitud": solicitud.nro_solicitud,
#                 "fecha_solicitud": solicitud.fecha_solicitud,
#                 "estado": solicitud.get_estado_display(),
#                 "numero_plan_pago": plan.nro_plan_pago if plan else None,
#                 "numero_cuota": cuota.nro_cuota if cuota else None,
#                 "fecha_pago": cuota.fecha_pago if cuota else None,
#                 "Nro_factura": factura.nro_factura_unica,
#                 "cuota_fomento": cuota_fomento,
#                 "valor_factura": round(valor_factura, 5)
#             })

#         # Arreglo 3: valor total a pagar
#         valor_total_data = {
#             "valor_a_pagar": round(valor_total, 5)
#         }

#         fecha_actual = now().date()
#         # Enviar SMS (si tiene teléfono)
#         sms = (
#             f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
#             f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
#         )

#         telefono_recaudador = telefono_recaudador
#         if telefono_recaudador:
#             Util.send_sms(telefono_recaudador, sms)

#         return Response({
#             "success": True,
#             "detail": "Planes de pago consultados correctamente.",
#             "recaudador": recaudador_info,
#             "detalle_plan_pago": detalle_plan_pago,
#             "valor_total": valor_total_data
#         }, status=status.HTTP_200_OK)


class ConsultaSolicitudesAcuerdosPagoInterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        numero_documento = request.query_params.get('numero_documento')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)

        # Obtener orden
        solicitudes = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita').all().order_by('-nro_solicitud')

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por número de documento del recaudador
        if numero_documento:
            solicitudes = solicitudes.filter(id_persona_solicita__numero_documento=numero_documento)

        # Filtro por fecha de inicio
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de fin
        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron acuerdos de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar resultados
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })



class ConsultaPlanesPagoInterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, id_persona_solicita, *args, **kwargs):
        try:
            persona = Personas.objects.get(pk=id_persona_solicita)
        except Personas.DoesNotExist:
            return Response({
                "success": False,
                "detail": "La persona solicitante no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Filtros
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        fecha_desde = request.query_params.get('fecha_desde', None)
        fecha_hasta = request.query_params.get('fecha_hasta', None)
        estado = request.query_params.get('estado', None)

        solicitudes = SolicitudAcuerdosPago.objects.filter(
            id_persona_solicita=persona
        ).select_related('id_persona_solicita').order_by('-nro_solicitud')

        estados_validos = [choice[0] for choice in cod_estado_acuerdo_CHOICES]
        if estado and estado not in estados_validos:
            return Response({
                "success": False,
                "detail": f"El estado '{estado}' no es válido. Los estados válidos son: {', '.join(estados_validos)}."
            }, status=status.HTTP_400_BAD_REQUEST)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                solicitudes = solicitudes.filter(nro_solicitud=int(nro_solicitud))
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron planes de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        resultado = []
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for solicitud in page:
            detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
                .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

            tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
            numero_documento = persona.numero_documento
            nombre_recaudador = (
                f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                if persona.tipo_persona == 'N' else persona.razon_social
            )

            relacion_facturas = set()
            cuota_total = Decimal("0")
            valor_total = Decimal("0")

            # Agrupar facturas por cuota
            cuotas_dict = {}
            for detalle in detalles:
                factura = detalle.id_factura_unica
                cuota = detalle.id_cuota_acuerdo_pago
                if not factura or not cuota:
                    continue

                relacion_facturas.add(str(factura.nro_factura_unica))
                cuota_fomento = factura.cuota_fomento
                cuota_total += cuota_fomento

                # Calcular intereses
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = Decimal("0")
                if dias_mora > 0 and tasa_interes_dian:
                    intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

                valor_total += cuota_fomento + intereses

                # Agrupar facturas por cuota
                key = cuota.id_cuota_acuerdo_pago
                if key not in cuotas_dict:
                    cuotas_dict[key] = {
                        "nro_cuota": cuota.nro_cuota,
                        "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                        "facturas": []
                    }
                cuotas_dict[key]["facturas"].append(factura.nro_factura_unica)

            # Puedes agregar la agrupación de cuotas al resultado, o solo las facturas asociadas
            resultado.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "relacion_facturas_unicas": "-".join(sorted(relacion_facturas)),
                "cuota_fomento": round(cuota_total, 5),
                "valor_factura": round(valor_total, 5),
                "id_persona_solicita": solicitud.id_persona_solicita.id_persona,
                "cuotas": [
                    {
                        "id_cuota_acuerdo_pago": key,
                        "nro_cuota": value["nro_cuota"],
                        "nro_plan_pago": value["nro_plan_pago"],
                        "facturas_asociadas": value["facturas"]
                    }
                    for key, value in cuotas_dict.items()
                ]
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        })


class ConsultaSolicitudesGestionar(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarGestionarAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, id_persona_solicita, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")

        solicitudes = SolicitudAcuerdosPago.objects.filter(id_persona_solicita=id_persona_solicita)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        tasa_interes_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes = tasa_interes_dian.valor if tasa_interes_dian else Decimal("0")
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        fecha_actual = timezone.now().date()

        for solicitud in page:
            persona = solicitud.id_persona_solicita
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud
            ).select_related('id_factura_unica')

            valor_total = Decimal("0")

            for detalle in detalles:
                factura = detalle.id_factura_unica
                if not factura:
                    continue

                cuota_fomento = factura.cuota_fomento
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")

                valor_total += cuota_fomento + intereses

            # Calcular plan de pago individual
            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
            estado_plan_pago = plan_pago.estado if plan_pago else None
            estado_plan_pago_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else estado_plan_pago

            data.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_pago.id_plan_pago if plan_pago else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.estado,
                "estado_display": solicitud.get_estado_display(),
                "estado_plan_pago": estado_plan_pago,
                "estado_plan_pago_display": estado_plan_pago_display,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
                "valor_a_pagar": round(valor_total, 5)
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes consultadas correctamente.",
            "data": data
        })



class InfoPlanDePagoAgregarCuota(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarGestionarAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get("id_solicitud")

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validar que exista al menos un plan de pago asociado a la solicitud
        plan_existente = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
        if not plan_existente:
            return Response({
                "success": False,
                "detail": "No existe un plan de pago asociado a la solicitud. Debe crear un plan de pago antes de agregar cuotas."
            }, status=status.HTTP_400_BAD_REQUEST)

        nro_plan_pago = plan_existente.nro_plan_pago
        nro_cuotas_actual = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_existente).count()
        nro_cuotas = nro_cuotas_actual + 1

        # Calcular valor total de la solicitud (cuota_fomento + intereses)
        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).select_related('id_factura_unica')
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
        tasa_interes = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or Decimal("0")

        valor_total = Decimal("0")

        for detalle in detalles:
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento or Decimal("0")

            # Calcular fecha límite de pago
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite = primer_dia_mes_siguiente - timedelta(days=1)

            dias_mora = max((fecha_actual - fecha_limite.date()).days, 0)

            intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")
            valor_total += cuota_fomento + intereses

        return Response({
            "success": True,
            "detail": "Resumen obtenido correctamente.",
            "data": {
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_existente.id_plan_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "nro_plan_pago": nro_plan_pago,
                "nro_cuotas": nro_cuotas,
                "valor_factura": round(valor_total, 5)
            }
        }, status=status.HTTP_200_OK)

class InfoCreacionPlanPagoNuevo(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarGestionarAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get("id_solicitud")

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validar si la solicitud ya tiene un plan de pago generado
        if PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).exists():
            return Response({
                "success": False,
                "detail": "La solicitud ya tiene un plan de pago registrado. No se puede crear otro."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener el último nro_plan_pago global y sumarle 1
        ultimo_nro_plan_pago = PlanesPago.objects.aggregate(max_nro=Max('nro_plan_pago'))['max_nro'] or 0
        nro_plan_pago = ultimo_nro_plan_pago + 1

        # Como es un plan de pagos nuevo, nro_cuotas debe ser 1
        nro_cuotas = 1

        # Calcular valor total de la solicitud (cuota_fomento + intereses)
        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).select_related('id_factura_unica')
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
        tasa_interes = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or Decimal("0")

        valor_total = Decimal("0")

        for detalle in detalles:
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento or Decimal("0")

            # Calcular fecha límite de pago
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite = primer_dia_mes_siguiente - timedelta(days=1)

            dias_mora = max((fecha_actual - fecha_limite.date()).days, 0)

            intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")
            valor_total += cuota_fomento + intereses

        return Response({
            "success": True,
            "detail": "Resumen obtenido correctamente.",
            "data": {
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "nro_plan_pago": nro_plan_pago,
                "nro_cuotas": nro_cuotas,
                "valor_factura": round(valor_total, 5)
            }
        }, status=status.HTTP_200_OK)


class FacturasPorSolicitudView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get("id_solicitud")

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        # Solo facturas sin cuota asociada
        detalles = DetalleAcuerdoPago.objects.filter(
            id_Solicitud_acuerdo_pago=solicitud,
            id_cuota_acuerdo_pago__isnull=True
        ).select_related('id_factura_unica')

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        fecha_actual = now().date()
        facturas = []

        for detalle in detalles:
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            facturas.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "fecha_compra": factura.fecha_compra,
                "cuota_fomento": cuota_fomento,
                "valor_bruto": factura.valor_bruto,
                "total_kilos": factura.total_kilos,
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "intereses": round(intereses, 5),
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Facturas asociadas obtenidas correctamente.",
            "data": facturas
        }, status=status.HTTP_200_OK)


# class CrearPlanDePagoView(APIView):
#     permission_classes = [IsAuthenticated]

#     @transaction.atomic
#     def post(self, request, *args, **kwargs):
#         try:
#             data = request.data
#             persona = request.user.persona

#             id_solicitud = data.get("id_solicitud_acuerdo_pago")
#             id_facturas = data.get("id_facturas")
#             fecha_pago = data.get("fecha_pago")

            # # Validaciones
            # if not all([id_solicitud, id_facturas, fecha_pago]):
            #     return Response({"success": False, "detail": "Faltan datos requeridos."},
            #                     status=status.HTTP_400_BAD_REQUEST)
            # if not isinstance(id_facturas, list) or not id_facturas:
            #     return Response({"success": False, "detail": "El campo 'id_facturas' debe ser un arreglo de IDs de facturas."},
            #                     status=status.HTTP_400_BAD_REQUEST)

            # # Validar existencia de la solicitud
            # try:
            #     solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud)
            # except SolicitudAcuerdosPago.DoesNotExist:
            #     return Response({"success": False, "detail": "La solicitud de acuerdo de pago no existe."},
            #                     status=status.HTTP_400_BAD_REQUEST)
            
            # # Validar que la solicitud no tenga ya un plan de pago
            # if PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).exists():
            #     return Response({
            #         "success": False,
            #         "detail": "La solicitud ya tiene un plan de pago registrado. No se puede crear otro."
            #     }, status=status.HTTP_400_BAD_REQUEST)
            
            # # Validar si todas las facturas ya tienen cuota asociada
            # total_facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).count()
            # facturas_con_cuota = DetalleAcuerdoPago.objects.filter(
            #     id_Solicitud_acuerdo_pago=solicitud,
            #     id_cuota_acuerdo_pago__isnull=False
            # ).count()
            # if facturas_con_cuota >= total_facturas:
            #     return Response({
            #         "success": False,
            #         "detail": "No puede crear mas cuotas porque excede el valor total a pagar."
            #     }, status=status.HTTP_400_BAD_REQUEST)

#             # Validar existencia de las facturas y que estén asociadas a la solicitud
#             facturas = []
#             for id_factura in id_facturas:
#                 try:
#                     factura = FacturaUnica.objects.get(id_factura_unica=id_factura)
#                 except FacturaUnica.DoesNotExist:
#                     return Response({"success": False, "detail": f"La factura única {id_factura} no existe."},
#                                     status=status.HTTP_400_BAD_REQUEST)
#                 if not DetalleAcuerdoPago.objects.filter(
#                     id_Solicitud_acuerdo_pago=solicitud,
#                     id_factura_unica=factura
#                 ).exists():
#                     return Response({
#                         "success": False,
#                         "detail": f"La factura {id_factura} no está asociada a la solicitud de acuerdo de pago."
#                     }, status=status.HTTP_400_BAD_REQUEST)
#                 # Validar que no se repita la factura
#                 if DetalleAcuerdoPago.objects.filter(
#                     id_Solicitud_acuerdo_pago=solicitud,
#                     id_factura_unica=factura,
#                     id_cuota_acuerdo_pago__isnull=False
#                 ).exists():
#                     return Response({"success": False, "detail": f"La factura {id_factura} ya tiene plan de pago asociado."},
#                                     status=status.HTTP_400_BAD_REQUEST)
#                 facturas.append(factura)

#             # Validar que la fecha de pago no sea anterior a la fecha actual
#             try:
#                 fecha_pago_dt = pd.to_datetime(fecha_pago).date()
#             except Exception:
#                 return Response({"success": False, "detail": "El formato de 'fecha_pago' no es válido. Formato esperado: YYYY-MM-DD."},
#                                 status=status.HTTP_400_BAD_REQUEST)
#             fecha_actual = now().date()
#             if fecha_pago_dt < fecha_actual:
#                 return Response({"success": False, "detail": "La fecha de pago no puede ser anterior a la fecha actual."},
#                                 status=status.HTTP_400_BAD_REQUEST)

#             # Buscar plan de pago existente para la solicitud
#             plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).first()
#             nro_plan = (PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud)
#                         .aggregate(max_nro=Max("nro_plan_pago"))["max_nro"] or 0)

#             cuotas_creadas = []
#             detalles_actualizados = []

#             if plan:
#                 # Crear un nuevo plan sumando 1 a nro_plan_pago
#                 ultimo_nro_plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).aggregate(
#                     max_nro=Max("nro_plan_pago"))["max_nro"] or 0
#                 nuevo_nro_plan = ultimo_nro_plan + 1

#                 plan = PlanesPago.objects.create(
#                     id_solicitud_acuerdo_pago=solicitud,
#                     nro_plan_pago=nuevo_nro_plan,
#                     nro_cuotas=1,
#                     valor_total_pagar=0,
#                     estado="AR",
#                     fecha_aprobacion_recaudo=now()
#                 )

#                 # Calcular el valor total de la cuota sumando todas las facturas
#                 suma_valor_total = Decimal("0")
#                 dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
#                 tasa = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or Decimal("0")

#                 for factura in facturas:
#                     mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#                     try:
#                         fecha_limite = mes_siguiente.replace(day=dias_pago)
#                     except:
#                         fecha_limite = (mes_siguiente + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

#                     if isinstance(fecha_limite, datetime):
#                         fecha_limite = fecha_limite.date()

#                     dias_mora = max((fecha_actual - fecha_limite).days, 0)
#                     intereses = (factura.cuota_fomento * tasa * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")
#                     valor_total = factura.cuota_fomento + intereses
#                     suma_valor_total += valor_total

#                 fecha_vencimiento_datetime = datetime.combine(fecha_pago_dt, datetime.min.time())
#                 cuota = CuotasAcuerdoPago.objects.create(
#                     id_plan_pago=plan,
#                     nro_cuota=1,
#                     fecha_vencimiento=fecha_vencimiento_datetime,
#                     valor_cuota=suma_valor_total,
#                     pagada=False,
#                     id_liquidacion=None
#                 )
#                 cuotas_creadas = [CuotaAcuerdoPagoSerializer(cuota).data]

#                 # Asociar todas las facturas a la nueva cuota
#                 for factura in facturas:
#                     detalle = DetalleAcuerdoPago.objects.get(
#                         id_Solicitud_acuerdo_pago=solicitud,
#                         id_factura_unica=factura
#                     )
#                     detalle.id_cuota_acuerdo_pago = cuota
#                     detalle.save()
#                     detalles_actualizados.append({
#                         "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
#                         "id_solicitud_acuerdo_pago": detalle.id_Solicitud_acuerdo_pago.id_solicitud_acuerdo_pago,
#                         "id_factura_unica": detalle.id_factura_unica.id_factura_unica,
#                         "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago
#                     })

#                 plan.valor_total_pagar = suma_valor_total
#                 plan.save()

#             else:
#                 # Si no existe plan, crear uno nuevo y la primera cuota
#                 plan = PlanesPago.objects.create(
#                     id_solicitud_acuerdo_pago=solicitud,
#                     nro_plan_pago=nro_plan + 1,
#                     nro_cuotas=1,
#                     valor_total_pagar=0,
#                     estado="AR"
#                 )

#                 suma_valor_total = Decimal("0")
#                 dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
#                 tasa = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or Decimal("0")

#                 for factura in facturas:
#                     mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#                     try:
#                         fecha_limite = mes_siguiente.replace(day=dias_pago)
#                     except:
#                         fecha_limite = (mes_siguiente + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

#                     if isinstance(fecha_limite, datetime):
#                         fecha_limite = fecha_limite.date()

#                     dias_mora = max((fecha_actual - fecha_limite).days, 0)
#                     intereses = (factura.cuota_fomento * tasa * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")
#                     valor_total = factura.cuota_fomento + intereses
#                     suma_valor_total += valor_total

#                 fecha_vencimiento_datetime = datetime.combine(fecha_pago_dt, datetime.min.time())
#                 cuota = CuotasAcuerdoPago.objects.create(
#                     id_plan_pago=plan,
#                     nro_cuota=1,
#                     fecha_vencimiento=fecha_vencimiento_datetime,
#                     valor_cuota=suma_valor_total,
#                     pagada=False,
#                     id_liquidacion=None
#                 )
#                 cuotas_creadas = [CuotaAcuerdoPagoSerializer(cuota).data]

#                 for factura in facturas:
#                     detalle = DetalleAcuerdoPago.objects.get(
#                         id_Solicitud_acuerdo_pago=solicitud,
#                         id_factura_unica=factura
#                     )
#                     detalle.id_cuota_acuerdo_pago = cuota
#                     detalle.save()
#                     detalles_actualizados.append({
#                         "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
#                         "id_solicitud_acuerdo_pago": detalle.id_Solicitud_acuerdo_pago.id_solicitud_acuerdo_pago,
#                         "id_factura_unica": detalle.id_factura_unica.id_factura_unica,
#                         "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago
#                     })

#                 plan.valor_total_pagar = suma_valor_total
#                 plan.save()

#             return Response({
#                 "success": True,
#                 "detail": "Plan de pago actualizado exitosamente.",
#                 "plan_pago": PlanPagoSerializer(plan).data,
#                 "cuotas": cuotas_creadas,
#                 "detalles_actualizados": detalles_actualizados
#             }, status=status.HTTP_201_CREATED)

#         except Exception as e:
#             transaction.set_rollback(True)
#             return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CrearPlanDePagoView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            persona = request.user.persona

            id_solicitud = data.get("id_solicitud_acuerdo_pago")
            id_facturas = data.get("id_facturas")
            fecha_pago = data.get("fecha_pago")

            # Validaciones
            if not all([id_solicitud, id_facturas, fecha_pago]):
                return Response({"success": False, "detail": "Faltan datos requeridos."},
                                status=status.HTTP_400_BAD_REQUEST)
            if not isinstance(id_facturas, list) or not id_facturas:
                return Response({"success": False, "detail": "El campo 'id_facturas' debe ser un arreglo de IDs de facturas."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Validar existencia de la solicitud
            try:
                solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud)
            except SolicitudAcuerdosPago.DoesNotExist:
                return Response({"success": False, "detail": "La solicitud de acuerdo de pago no existe."},
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Validar que la solicitud no tenga ya un plan de pago
            if PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).exists():
                return Response({
                    "success": False,
                    "detail": "La solicitud ya tiene un plan de pago registrado. No se puede crear otro."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar si todas las facturas ya tienen cuota asociada
            total_facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).count()
            facturas_con_cuota = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__isnull=False
            ).count()
            if facturas_con_cuota >= total_facturas:
                return Response({
                    "success": False,
                    "detail": "No puede crear mas cuotas porque excede el valor total a pagar."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar existencia de las facturas y que estén asociadas a la solicitud
            facturas = []
            for id_factura in id_facturas:
                try:
                    factura = FacturaUnica.objects.get(id_factura_unica=id_factura)
                except FacturaUnica.DoesNotExist:
                    return Response({"success": False, "detail": f"La factura única {id_factura} no existe."},
                                    status=status.HTTP_400_BAD_REQUEST)
                if not DetalleAcuerdoPago.objects.filter(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_factura_unica=factura
                ).exists():
                    return Response({
                        "success": False,
                        "detail": f"La factura {id_factura} no está asociada a la solicitud de acuerdo de pago."
                    }, status=status.HTTP_400_BAD_REQUEST)
                # Validar que no se repita la factura
                if DetalleAcuerdoPago.objects.filter(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_factura_unica=factura,
                    id_cuota_acuerdo_pago__isnull=False
                ).exists():
                    return Response({"success": False, "detail": f"La factura {id_factura} ya tiene plan de pago asociado."},
                                    status=status.HTTP_400_BAD_REQUEST)
                facturas.append(factura)

            # Validar que la fecha de pago no sea anterior a la fecha actual
            try:
                fecha_pago_dt = pd.to_datetime(fecha_pago).date()
            except Exception:
                return Response({"success": False, "detail": "El formato de 'fecha_pago' no es válido. Formato esperado: YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)
            fecha_actual = now().date()
            if fecha_pago_dt < fecha_actual:
                return Response({"success": False, "detail": "La fecha de pago no puede ser anterior a la fecha actual."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Buscar plan de pago existente para la solicitud
            plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).first()

            # Obtener el máximo global de nro_plan_pago
            ultimo_nro_plan = PlanesPago.objects.aggregate(max_nro=Max("nro_plan_pago"))["max_nro"] or 0
            nuevo_nro_plan = ultimo_nro_plan + 1

            plan = PlanesPago.objects.create(
                id_solicitud_acuerdo_pago=solicitud,
                nro_plan_pago=nuevo_nro_plan, 
                nro_cuotas=len(facturas),
                valor_total_pagar=0,
                fecha_aprobacion_recaudo = timezone.localtime(timezone.now())
            )

            cuotas_creadas = []
            detalles_actualizados = []

            # Calcular el valor total de la cuota sumando todas las facturas
            suma_valor_total = Decimal("0")
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
            tasa = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or Decimal("0")

            for factura in facturas:
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite = mes_siguiente.replace(day=dias_pago)
                except:
                    fecha_limite = (mes_siguiente + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

                if isinstance(fecha_limite, datetime):
                    fecha_limite = fecha_limite.date()

                dias_mora = max((fecha_actual - fecha_limite).days, 0)
                intereses = (factura.cuota_fomento * tasa * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")
                valor_total = factura.cuota_fomento + intereses
                suma_valor_total += valor_total

            fecha_vencimiento_datetime = datetime.combine(fecha_pago_dt, datetime.min.time())
            cuota = CuotasAcuerdoPago.objects.create(
                id_plan_pago=plan,
                nro_cuota=1, 
                fecha_vencimiento=fecha_vencimiento_datetime,
                valor_cuota=suma_valor_total,
                pagada=False,
                id_liquidacion=None
            )
            cuotas_creadas = [CuotaAcuerdoPagoSerializer(cuota).data]

            # Asociar todas las facturas a la nueva cuota
            for factura in facturas:
                detalle = DetalleAcuerdoPago.objects.get(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_factura_unica=factura
                )
                detalle.id_cuota_acuerdo_pago = cuota
                detalle.save()
                detalles_actualizados.append({
                    "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
                    "id_solicitud_acuerdo_pago": detalle.id_Solicitud_acuerdo_pago.id_solicitud_acuerdo_pago,
                    "id_factura_unica": detalle.id_factura_unica.id_factura_unica,
                    "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago
                })

            # Validar si todas las facturas de la solicitud ya están asociadas a un plan de pago
            total_facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).count()
            facturas_con_cuota = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__isnull=False
            ).count()

            if facturas_con_cuota == total_facturas:
                plan.estado = "AR"
                plan.save()

            # Actualizar valor total del plan
            plan.valor_total_pagar = suma_valor_total
            plan.save()

            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_GesAcP'
            data_alerta['informacion_complemento_mensaje'] = f"Plan de pago creado para la solicitud {solicitud.nro_solicitud}."

            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta and configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)


            return Response({
                "success": True,
                "detail": "Plan de pago actualizado exitosamente.",
                "plan_pago": PlanPagoSerializer(plan).data,
                "cuotas": cuotas_creadas,
                "detalles_actualizados": detalles_actualizados
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            transaction.set_rollback(True)
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActualizarCuotaPlanDePagoView(APIView):
    permission_classes = [IsAuthenticated, PermisoActualizarGestionarAcuerdosDePago]

    @transaction.atomic
    def patch(self, request, id_cuota_acuerdo_pago, *args, **kwargs):
        try:
            data = request.data
            fecha_pago = data.get("fecha_pago")

            if not fecha_pago:
                return Response({"success": False, "detail": "Falta el campo 'fecha_pago'."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Validar existencia de la cuota
            try:
                cuota = CuotasAcuerdoPago.objects.get(id_cuota_acuerdo_pago=id_cuota_acuerdo_pago)
            except CuotasAcuerdoPago.DoesNotExist:
                return Response({"success": False, "detail": "La cuota de acuerdo de pago no existe."},
                                status=status.HTTP_400_BAD_REQUEST)

            plan_pago = cuota.id_plan_pago

            # No permitir editar si el plan está en estado "VJ" o "AP"
            if plan_pago.estado in ["VJ", "AP", "AR"]:
                return Response({
                    "success": False,
                    "detail": "No se puede editar la cuota porque el plan de pago está en estado  'Aprobada por Recaudo', 'Visto Bueno Juridica' o 'Aprobada'."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Solo permitir actualizar la última cuota
            nro_cuota_max = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).aggregate(max_nro=Max('nro_cuota'))['max_nro']
            if cuota.nro_cuota != nro_cuota_max:
                return Response({
                    "success": False,
                    "detail": "Solo se puede actualizar la última cuota agregada del plan de pago."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar fecha_pago
            try:
                fecha_pago_dt = datetime.strptime(fecha_pago, "%Y-%m-%d")
            except Exception:
                return Response({"success": False, "detail": "El formato de fecha_pago debe ser YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Validar que la fecha de la última cuota no sea menor a la fecha de la cuota anterior
            cuota_anterior = CuotasAcuerdoPago.objects.filter(
                id_plan_pago=plan_pago,
                nro_cuota=cuota.nro_cuota - 1
            ).first()
            if cuota_anterior:
                fecha_anterior = cuota_anterior.fecha_vencimiento
                # Convertir ambos a date para evitar error de comparación
                if isinstance(fecha_anterior, datetime):
                    fecha_anterior = fecha_anterior.date()
                if isinstance(fecha_pago_dt, datetime):
                    fecha_pago_dt_date = fecha_pago_dt.date()
                else:
                    fecha_pago_dt_date = fecha_pago_dt
                if fecha_pago_dt_date < fecha_anterior:
                    return Response({
                        "success": False,
                        "detail": "La fecha de la última cuota no puede ser menor a la fecha de la cuota anterior."
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Actualizar la fecha de todas las cuotas relacionadas (todas las cuotas del plan con nro_cuota >= actual)
            cuotas_a_actualizar = CuotasAcuerdoPago.objects.filter(
                id_plan_pago=plan_pago,
                nro_cuota__gte=cuota.nro_cuota
            )
            for cuota_rel in cuotas_a_actualizar:
                cuota_rel.fecha_vencimiento = fecha_pago_dt
                cuota_rel.save()

            # Recalcular el valor total a pagar del plan sumando las cuotas actuales
            suma_valor_cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).aggregate(
                total_valor=Sum(F('valor_cuota'))
            )['total_valor'] or Decimal("0")

            plan_pago.valor_total_pagar = suma_valor_cuotas
            plan_pago.fecha_notificacion = None
            plan_pago.doc_acuerdo_pago = None
            plan_pago.save()

            # Respuesta con las cuotas actualizadas
            cuotas_actualizadas = [
                {
                    "id_cuota_acuerdo_pago": c.id_cuota_acuerdo_pago,
                    "fecha_vencimiento": c.fecha_vencimiento,
                    "nro_cuota": c.nro_cuota
                }
                for c in cuotas_a_actualizar
            ]

            return Response({
                "success": True,
                "detail": "Fecha de pago actualizada correctamente en la última cuota y cuotas relacionadas.",
                "cuotas_actualizadas": cuotas_actualizadas,
                "plan_pago_actualizado": {
                    "id_plan_pago": plan_pago.id_plan_pago,
                    "valor_total_pagar": float(plan_pago.valor_total_pagar),
                    "estado": plan_pago.estado,
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            transaction.set_rollback(True)
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
class EliminarCuotaPlanPagoView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, id_cuota_acuerdo_pago, *args, **kwargs):
        try:
            # Validar existencia de la cuota
            try:
                cuota = CuotasAcuerdoPago.objects.get(id_cuota_acuerdo_pago=id_cuota_acuerdo_pago)
            except CuotasAcuerdoPago.DoesNotExist:
                return Response({"success": False, "detail": "La cuota no existe."},
                                status=status.HTTP_400_BAD_REQUEST)

            plan_pago = cuota.id_plan_pago

            # No permitir eliminar si el plan está en estado "VJ" o "AP"
            if plan_pago.estado in ["VJ", "AP", "AR"]:
                return Response({
                    "success": False,
                    "detail": "No se puede eliminar la cuota porque el plan de pago está en estado 'Aprobada por Recaudo', 'Visto Bueno Juridica' o 'Aprobada por direccion'."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Solo permitir eliminar la última cuota (mayor nro_cuota)
            nro_cuota_max = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).aggregate(max_nro=Max('nro_cuota'))['max_nro']
            if cuota.nro_cuota != nro_cuota_max:
                return Response({
                    "success": False,
                    "detail": "Solo se puede eliminar la última cuota agregada del plan de pago."
                }, status=status.HTTP_400_BAD_REQUEST)

            nro_cuota_eliminada = cuota.nro_cuota

            # Desasociar la cuota de todos los detalles asociados a esta cuota
            detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago=cuota)
            for detalle in detalles:
                detalle.id_cuota_acuerdo_pago = None
                detalle.save()

            # Eliminar la cuota
            cuota.delete()

            # Actualizar nro_cuotas y valor_total_pagar en el plan de pago
            plan_pago.nro_cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).count()
            suma_valor_total = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).aggregate(
                total_valor=Sum(F('valor_cuota'))
            )['total_valor'] or Decimal("0")
            plan_pago.valor_total_pagar = suma_valor_total
            plan_pago.save()

            # Data actualizada
            cuotas_actualizadas = list(CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).values())
            detalles_actualizados = list(DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=[c['id_cuota_acuerdo_pago'] for c in cuotas_actualizadas]).values())
            plan_pago_actualizado = {
                "id_plan_pago": plan_pago.id_plan_pago,
                "nro_cuotas": plan_pago.nro_cuotas,
                "valor_total_pagar": float(plan_pago.valor_total_pagar),
                "estado": plan_pago.estado,
            }

            return Response({
                "success": True,
                "detail": "Cuota eliminada y plan de pago actualizado correctamente.",
                "cuotas": cuotas_actualizadas,
                "detalles": detalles_actualizados,
                "plan_pago": plan_pago_actualizado
            }, status=status.HTTP_200_OK)

        except Exception as e:
            transaction.set_rollback(True)
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
         
class AgregarFacturaACuotaView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            persona = request.user.persona

            id_solicitud = data.get("id_solicitud_acuerdo_pago")
            id_plan_pago = data.get("id_plan_pago")
            id_facturas = data.get("id_facturas")
            fecha_pago = data.get("fecha_pago")

            # Validar datos obligatorios
            if not all([id_solicitud, id_plan_pago, id_facturas, fecha_pago]):
                return Response({"success": False, "detail": "Faltan datos requeridos."},
                                status=status.HTTP_400_BAD_REQUEST)
            if not isinstance(id_facturas, list) or not id_facturas:
                return Response({"success": False, "detail": "El campo 'id_facturas' debe ser un arreglo de IDs de facturas."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Validar existencia SolicitudAcuerdosPago
            try:
                solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud)
            except SolicitudAcuerdosPago.DoesNotExist:
                return Response({"success": False, "detail": "La solicitud no existe."},
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Validar si todas las facturas ya tienen cuota asociada
            total_facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).count()
            facturas_con_cuota = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__isnull=False
            ).count()
            if facturas_con_cuota >= total_facturas:
                return Response({
                    "success": False,
                    "detail": "No puede crear mas cuotas porque excede el valor total a pagar."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar existencia PlanesPago y que esté asociado a la solicitud
            try:
                plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago, id_solicitud_acuerdo_pago=solicitud)
            except PlanesPago.DoesNotExist:
                return Response({"success": False, "detail": "El plan de pago no existe o no está asociado a la solicitud."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Obtener el último nro de cuota y sumarle 1
            ultimo_nro_cuota = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).aggregate(
                max_nro=Max('nro_cuota')
            )['max_nro'] or 0
            nro_cuota = ultimo_nro_cuota + 1

            # Validar fecha_pago
            try:
                fecha_pago_dt = datetime.strptime(fecha_pago, "%Y-%m-%d").date()
            except Exception:
                return Response({"success": False, "detail": "El formato de fecha_pago debe ser YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

            fecha_actual = now().date()
            if fecha_pago_dt < fecha_actual:
                return Response({"success": False, "detail": "La fecha de pago no puede ser menor a la fecha actual."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Validar si ya existen cuotas y comparar fechas
            cuotas_existentes = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).order_by('nro_cuota')
            if cuotas_existentes.exists():
                fecha_pago_ultima_cuota = cuotas_existentes.last().fecha_vencimiento.date() if cuotas_existentes.last().fecha_vencimiento else None
                fecha_pago_primera_cuota = cuotas_existentes.first().fecha_vencimiento.date() if cuotas_existentes.first().fecha_vencimiento else None

                if fecha_pago_dt <= fecha_pago_ultima_cuota:
                    return Response({
                        "success": False,
                        "detail": f"La fecha de pago no puede ser menor o igual a la fecha de la última cuota existente ({fecha_pago_ultima_cuota})."
                    }, status=status.HTTP_400_BAD_REQUEST)

               
            # Calcular el valor total de la cuota sumando todas las facturas
            valor_cuota_nueva = Decimal("0")
            detalles_actualizados = []
            facturas_agregadas = []

            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
            tasa_interes = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or Decimal("0")

            for id_factura_unica in id_facturas:
                # Validar existencia FacturaUnica
                try:
                    factura = FacturaUnica.objects.get(id_factura_unica=id_factura_unica)
                except FacturaUnica.DoesNotExist:
                    return Response({"success": False, "detail": f"La factura única {id_factura_unica} no existe."},
                                    status=status.HTTP_400_BAD_REQUEST)

                # Validar que la factura esté asociada a la solicitud
                if not DetalleAcuerdoPago.objects.filter(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_factura_unica=factura
                ).exists():
                    return Response({
                        "success": False,
                        "detail": f"La factura {id_factura_unica} no está asociada a la solicitud de acuerdo de pago."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Validar que no se repita la factura
                if DetalleAcuerdoPago.objects.filter(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_factura_unica=factura,
                    id_cuota_acuerdo_pago__isnull=False
                ).exists():
                    return Response({"success": False, "detail": f"La factura {id_factura_unica} ya tiene plan de pago asociado."},
                                    status=status.HTTP_400_BAD_REQUEST)

                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite = mes_siguiente.replace(day=dias_pago)
                except Exception:
                    fecha_limite = (mes_siguiente + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

                if isinstance(fecha_limite, datetime):
                    fecha_limite = fecha_limite.date()

                dias_mora = max((fecha_actual - fecha_limite).days, 0)
                intereses = (factura.cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")
                valor_total_pagar = factura.cuota_fomento + intereses

                valor_cuota_nueva += valor_total_pagar

            # Crear la nueva cuota
            fecha_vencimiento_datetime = datetime.combine(fecha_pago_dt, datetime.min.time())
            cuota = CuotasAcuerdoPago.objects.create(
                id_plan_pago=plan_pago,
                nro_cuota=nro_cuota,
                fecha_vencimiento=fecha_vencimiento_datetime,
                valor_cuota=valor_cuota_nueva,
                pagada=False,
                id_liquidacion=None
            )

            # Asociar todas las facturas a la nueva cuota
            for id_factura_unica in id_facturas:
                factura = FacturaUnica.objects.get(id_factura_unica=id_factura_unica)
                detalle_acuerdo = DetalleAcuerdoPago.objects.filter(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_factura_unica=factura
                ).first()
                detalle_acuerdo.id_cuota_acuerdo_pago = cuota
                detalle_acuerdo.save()
                detalles_actualizados.append({
                    "id_detalle_acuerdo_pago": detalle_acuerdo.id_detalle_acuerdo_pago,
                    "id_solicitud_acuerdo_pago": detalle_acuerdo.id_Solicitud_acuerdo_pago.id_solicitud_acuerdo_pago,
                    "id_factura_unica": detalle_acuerdo.id_factura_unica.id_factura_unica,
                    "id_cuota_acuerdo_pago": detalle_acuerdo.id_cuota_acuerdo_pago.id_cuota_acuerdo_pago
                })
                facturas_agregadas.append(id_factura_unica)

            # Actualizar nro_cuotas y valor_total_pagar en el plan de pago
            plan_pago.nro_cuotas = nro_cuota
            suma_valor_total = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago).aggregate(
                total_valor=Sum(F('valor_cuota'))
            )['total_valor'] or Decimal("0")
            plan_pago.valor_total_pagar = suma_valor_total

            # Validar si todas las facturas de la solicitud ya están asociadas a un plan de pago
            total_facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).count()
            facturas_con_cuota = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__isnull=False
            ).count()
            if facturas_con_cuota == total_facturas:
                plan_pago.estado = "AR"
            plan_pago.save()

            # Respuesta con toda la info creada y actualizada
            return Response({
                "success": True,
                "detail": "Facturas agregadas a nueva cuota correctamente.",
                "facturas_agregadas": facturas_agregadas,
                "cuota": {
                    "id": cuota.id_cuota_acuerdo_pago,
                    "id_plan_pago": cuota.id_plan_pago.id_plan_pago,
                    "nro_cuota": cuota.nro_cuota,
                    "fecha_vencimiento": cuota.fecha_vencimiento,
                    "valor_cuota": cuota.valor_cuota,
                    "pagada": cuota.pagada,
                    "fecha_pago": cuota.fecha_pago,
                    "id_liquidacion": cuota.id_liquidacion.id_liq_factura_unica if cuota.id_liquidacion else None
                },
                "detalles_acuerdo_pago_actualizados": detalles_actualizados,
                "plan_pago_actualizado": {
                    "id_plan_pago": plan_pago.id_plan_pago,
                    "id_solicitud_acuerdo_pago": plan_pago.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago,
                    "nro_plan_pago": plan_pago.nro_plan_pago,
                    "nro_cuotas": plan_pago.nro_cuotas,
                    "valor_total_pagar": float(plan_pago.valor_total_pagar),
                    "estado": plan_pago.estado,
                    "fecha_notificacion": plan_pago.fecha_notificacion,
                    "doc_acuerdo_pago": plan_pago.doc_acuerdo_pago.id_documento_generado if plan_pago.doc_acuerdo_pago else None,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            transaction.set_rollback(True)
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class GetPlanesPagoPorSolicitudView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarGestionarAcuerdosDePago]
    pagination_class = CustomPagination  

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get("id_solicitud_acuerdo_pago")

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=400)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=404)

        # Obtener el plan de pago asociado a la solicitud (el más reciente)
        plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
        plan_data = None
        if plan:
            plan_data = {
                "id_plan_pago": plan.id_plan_pago,
                "nro_plan_pago": plan.nro_plan_pago,
                "nro_cuotas": plan.nro_cuotas,
                "valor_total_pagar": float(plan.valor_total_pagar),
                "estado": plan.estado,
                "estado_display": plan.get_estado_display(),
                "fecha_aprobacion_recaudo": plan.fecha_aprobacion_recaudo,
                "fecha_aprobacion_juridica": plan.fecha_aprobacion_juridica,
                "fecha_aprobacion_direccion": plan.fecha_aprobacion_direccion,
            }

        persona = solicitud.id_persona_solicita
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Obtener cuotas asociadas al plan de pago (si existe)
        cuotas = []
        if plan:
            cuotas_objs = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan).order_by('nro_cuota')
            for cuota in cuotas_objs:
                # Buscar facturas asociadas a la cuota
                facturas = DetalleAcuerdoPago.objects.filter(
                    id_Solicitud_acuerdo_pago=solicitud,
                    id_cuota_acuerdo_pago=cuota
                ).select_related('id_factura_unica')
                for detalle in facturas:
                    factura = detalle.id_factura_unica
                    if not factura:
                        continue
                    cuota_fomento = factura.cuota_fomento
                    fecha_actual = now().date()
                    dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
                    porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                    tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")
                    mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                    try:
                        fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                    except ValueError:
                        primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                        fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)
                    dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                    intereses = Decimal("0")
                    if dias_mora > 0 and tasa_interes_dian:
                        intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")
                    valor_factura = cuota_fomento + intereses

                    cuotas.append({
                        "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
                        "nro_cuota": cuota.nro_cuota,
                        "fecha_pago": cuota.fecha_vencimiento,
                        "nro_factura": factura.nro_factura_unica,
                        "valor_factura": round(valor_factura, 5)
                    })

        response_data = {
            "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
            "nro_solicitud": solicitud.nro_solicitud,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "tipo_documento_recaudador": tipo_documento,
            "nro_documento_recaudador": numero_documento,
            "plan_pago": plan_data,
            "cuotas": cuotas
        }

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": response_data
        }, status=200)

class ConsultadDetallesPlanesPagoGestionar(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarGestionarAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        # Solo tomar detalles donde todas las facturas estén asociadas a una cuota con plan de pago
        detalles = DetalleAcuerdoPago.objects.filter(
            id_Solicitud_acuerdo_pago=solicitud,
            id_cuota_acuerdo_pago__isnull=False,
            id_cuota_acuerdo_pago__id_plan_pago__isnull=False
        ).select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        total_facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud).count()
        facturas_con_cuota_y_plan = detalles.count()

        # Solo retornar detalles si hay al menos una factura asociada a una cuota con plan de pago
        if detalles.count() == 0:
            return Response({
                "success": True,
                "detail": "No hay cuotas asociadas a un plan de pago.",
                "data": []
            }, status=status.HTTP_200_OK)

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            resultado.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago if cuota else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago":  cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Cuotas asociadas a plan de pago consultadas correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)

    


class ConsultaSolicitudesAprobacionJuridicaGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoJurdica]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")
        id_persona_solicita = request.query_params.get("id_persona_solicita", None)

        # Solo solicitudes con plan de pago en estado "AR"
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="AR").distinct()

        if id_persona_solicita:
            solicitudes = solicitudes.filter(id_persona_solicita=id_persona_solicita)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        tasa_interes_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes = tasa_interes_dian.valor if tasa_interes_dian else Decimal("0")

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        fecha_actual = timezone.now().date()

        for solicitud in page:
            persona = solicitud.id_persona_solicita
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud
            ).select_related('id_factura_unica')

            valor_total = Decimal("0")

            for detalle in detalles:
                factura = detalle.id_factura_unica
                if not factura:
                    continue

                cuota_fomento = factura.cuota_fomento
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)

                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")

                valor_total += cuota_fomento + intereses

            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('nro_plan_pago').first()
            estado_plan_pago = plan_pago.estado if plan_pago else None
            estado_plan_pago_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else estado_plan_pago

            data.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_pago.id_plan_pago if plan_pago else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.estado,
                "estado_display": solicitud.get_estado_display(),
                "estado_plan_pago": estado_plan_pago,
                "estado_plan_pago_display": estado_plan_pago_display,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
                "valor_a_pagar": round(valor_total, 5)
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes consultadas correctamente.",
            "data": data
        })


class ConsultaSolicitudesAprobacionDireccionGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoDireccion]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")
        id_persona_solicita = request.query_params.get("id_persona_solicita", None)

        # Solo solicitudes con plan de pago en estado "VJ"
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="VJ").distinct()

        if id_persona_solicita:
            solicitudes = solicitudes.filter(id_persona_solicita=id_persona_solicita)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        tasa_interes_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes = tasa_interes_dian.valor if tasa_interes_dian else Decimal("0")

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        fecha_actual = timezone.now().date()

        for solicitud in page:
            persona = solicitud.id_persona_solicita
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud
            ).select_related('id_factura_unica')

            valor_total = Decimal("0")

            for detalle in detalles:
                factura = detalle.id_factura_unica
                if not factura:
                    continue

                cuota_fomento = factura.cuota_fomento
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)

                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")

                valor_total += cuota_fomento + intereses

            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('nro_plan_pago').first()
            estado_plan_pago = plan_pago.estado if plan_pago else None
            estado_plan_pago_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else estado_plan_pago

            data.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_pago.id_plan_pago if plan_pago else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.estado,
                "estado_display": solicitud.get_estado_display(),
                "estado_plan_pago": estado_plan_pago,
                "estado_plan_pago_display": estado_plan_pago_display,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
                "valor_a_pagar": round(valor_total, 5)
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes consultadas correctamente.",
            "data": data
        })


class ConsultaSolicitudesAprobacionPorRecaudadorGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobacionRecaudadorAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")

        persona_logueada = request.user.persona

        # Solo solicitudes con plan de pago en estado "NF" asociadas a la persona logueada
        solicitudes = SolicitudAcuerdosPago.objects.filter(
            planespago__estado="NF",
            id_persona_solicita=persona_logueada
        ).distinct()

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        tasa_interes_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes = tasa_interes_dian.valor if tasa_interes_dian else Decimal("0")

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        fecha_actual = timezone.now().date()

        for solicitud in page:
            persona = solicitud.id_persona_solicita
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud
            ).select_related('id_factura_unica')

            valor_total = Decimal("0")

            for detalle in detalles:
                factura = detalle.id_factura_unica
                if not factura:
                    continue

                cuota_fomento = factura.cuota_fomento
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)

                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")

                valor_total += cuota_fomento + intereses

            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('nro_plan_pago').first()
            estado_plan_pago = plan_pago.estado if plan_pago else None
            estado_plan_pago_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else estado_plan_pago

            data.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_pago.id_plan_pago if plan_pago else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.estado,
                "estado_display": solicitud.get_estado_display(),
                "estado_plan_pago": estado_plan_pago,
                "estado_plan_pago_display": estado_plan_pago_display,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
                "valor_a_pagar": round(valor_total, 5)
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes consultadas correctamente.",
            "data": data
        })


class ConsultaPlanesAcuerdosPagoAprobacionJuridica(APIView):
    permission_classes = [IsAuthenticated , PermisoConsultarAprobarAcuerdosDePagoJurdica]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        numero_documento = request.query_params.get('numero_documento')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)

        # Solo solicitudes que tengan plan de pago en estado "AR"
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="AR").distinct().order_by('-nro_solicitud')

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por número de documento del recaudador
        if numero_documento:
            solicitudes = solicitudes.filter(id_persona_solicita__numero_documento=numero_documento)

        # Filtro por fecha de inicio
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de fin
        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron acuerdos de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar resultados
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })

class ConsultaPlanesAcuerdosPagoAprobacionDireccion(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoDireccion]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        numero_documento = request.query_params.get('numero_documento')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)

        # Solo solicitudes que tengan plan de pago en estado "VJ"
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="VJ").distinct().order_by('-nro_solicitud')

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por número de documento del recaudador
        if numero_documento:
            solicitudes = solicitudes.filter(id_persona_solicita__numero_documento=numero_documento)

        # Filtro por fecha de inicio
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de fin
        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron acuerdos de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar resultados
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })

class ConsultaPlanesAcuerdosPagoAprobacionRecaudador(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobacionRecaudadorAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        numero_documento = request.query_params.get('numero_documento')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        nro_plan_pago = request.query_params.get('nro_plan_pago', None)
        

        # Solo solicitudes que tengan plan de pago en estado "NF"
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="NF").distinct().order_by('-nro_solicitud')

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por número de plan de pago
        if nro_plan_pago:
            try:
                nro_plan_pago = int(nro_plan_pago)
                solicitudes = solicitudes.filter(planespago__nro_plan_pago=nro_plan_pago)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_plan_pago' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)
            
        # Filtro por fecha de inicio
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de fin
        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron acuerdos de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar resultados
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })

class ConsultadDetallesPlanesPagoAprobacionJuridica(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoJurdica]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            # Calcular intereses para la factura
            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            # Reunir facturas de la misma solicitud
            facturas = detalles.values_list('id_factura_unica__nro_factura_unica', flat=True).distinct()
            relacion_facturas = "-".join(map(str, facturas))

            resultado.append({
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_pago if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)
    
class ConsultadDetallesPlanesPagoAprobacionDireccion(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoDireccion]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            # Calcular intereses para la factura
            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            # Reunir facturas de la misma solicitud
            facturas = detalles.values_list('id_factura_unica__nro_factura_unica', flat=True).distinct()
            relacion_facturas = "-".join(map(str, facturas))

            resultado.append({
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_pago if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)


class GetAcuerdoPagoAprobacionJuridicaView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoJurdica]

    def get_doc_soporte_url(self, obj):
        if obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if len(obj.doc_solicitud.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validar que el plan de pago esté en estado "AR"
        if plan_pago.estado != "AR":
            return Response({
                "success": False,
                "detail": "El plan de pago no está en estado 'Aprobada por Recaudo' (AR)."
            }, status=status.HTTP_400_BAD_REQUEST)

        solicitud = plan_pago.id_solicitud_acuerdo_pago

        # Obtener el último nro_plan_pago para la solicitud
        ultimo_nro_plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).aggregate(
            max_nro=Max("nro_plan_pago")
        )["max_nro"] or plan_pago.nro_plan_pago

        # Obtener las cuotas de este plan
        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
        valor_total_pagar = sum(cuota.valor_cuota for cuota in cuotas)

        response_data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_plan_pago": plan_pago.id_plan_pago,
            "nro_plan_pago": plan_pago.nro_plan_pago,
            "nro_cuotas": plan_pago.nro_cuotas,
            "estado_plan_pago": plan_pago.estado,
            "estado_plan_pago_display": plan_pago.get_estado_display(),
            "observaciones": solicitud.observaciones,
            "doc_solicitud": self.get_doc_soporte_url(solicitud),
            "fecha_solicitud": solicitud.fecha_solicitud,
            "valor_total_pagar": round(valor_total_pagar, 2),
            "fecha_aprobacion": now(),
        }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": response_data
        }, status=status.HTTP_200_OK)

class ConsultadDetallesPlanesPagoAprobacionRecaudador(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobacionRecaudadorAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            # Calcular intereses para la factura
            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            # Reunir facturas de la misma solicitud
            facturas = detalles.values_list('id_factura_unica__nro_factura_unica', flat=True).distinct()
            relacion_facturas = "-".join(map(str, facturas))

            resultado.append({
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_pago if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)
    

class GetAcuerdoPagoAprobacionDireccionView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobarAcuerdosDePagoDireccion]

    def get_doc_soporte_url(self, obj):
        if obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if len(obj.doc_solicitud.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validar que el plan de pago esté en estado "VJ"
        if plan_pago.estado != "VJ":
            return Response({
                "success": False,
                "detail": "El plan de pago no está en estado 'Visto Bueno Juridica' (VJ)."
            }, status=status.HTTP_400_BAD_REQUEST)

        solicitud = plan_pago.id_solicitud_acuerdo_pago

        # Obtener el último nro_plan_pago para la solicitud
        ultimo_nro_plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).aggregate(
            max_nro=Max("nro_plan_pago")
        )["max_nro"] or plan_pago.nro_plan_pago

        # Obtener las cuotas de este plan
        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
        valor_total_pagar = sum(cuota.valor_cuota for cuota in cuotas)

        response_data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_plan_pago": plan_pago.id_plan_pago,
            "nro_plan_pago": plan_pago.nro_plan_pago,
            "nro_cuotas": plan_pago.nro_cuotas,
            "estado_plan_pago": plan_pago.estado,
            "estado_plan_pago_display": plan_pago.get_estado_display(),
            "observaciones": solicitud.observaciones,
            "doc_solicitud": self.get_doc_soporte_url(solicitud),
            "fecha_solicitud": solicitud.fecha_solicitud,
            "observacion_juridica": plan_pago.observacion_juridica,
            "fecha_aprobacion_juridica": plan_pago.fecha_aprobacion_juridica,
            "valor_total_pagar": round(valor_total_pagar, 2),
            "fecha_aprobacion": now(),
        }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": response_data
        }, status=status.HTTP_200_OK)

class GetAcuerdoPagoAprobacionRecaudadorView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAprobacionRecaudadorAcuerdosDePago]

    def get_doc_soporte_url(self, obj):
        # obj puede ser SolicitudAcuerdosPago o DocumentosGenerados
        if hasattr(obj, "doc_solicitud") and obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if len(obj.doc_solicitud.name) > 0 else None
        if hasattr(obj, "documento_generado") and obj.documento_generado:
            return Util.obtener_archivos(obj.documento_generado.name) if len(obj.documento_generado.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validar que el plan de pago esté en estado "NF"
        if plan_pago.estado != "NF":
            return Response({
                "success": False,
                "detail": "El plan de pago no está en estado 'Notificado' (NF)."
            }, status=status.HTTP_400_BAD_REQUEST)

        solicitud = plan_pago.id_solicitud_acuerdo_pago

        # Obtener el último nro_plan_pago para la solicitud
        ultimo_nro_plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).aggregate(
            max_nro=Max("nro_plan_pago")
        )["max_nro"] or plan_pago.nro_plan_pago

        # Obtener las cuotas de este plan
        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
        valor_total_pagar = sum(cuota.valor_cuota for cuota in cuotas)

        response_data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_plan_pago": plan_pago.id_plan_pago,
            "nro_plan_pago": plan_pago.nro_plan_pago,
            "nro_cuotas": plan_pago.nro_cuotas,
            "estado_plan_pago": plan_pago.estado,
            "estado_plan_pago_display": plan_pago.get_estado_display(),
            "observaciones_solicitud": solicitud.observaciones,
            "doc_solicitud": self.get_doc_soporte_url(solicitud),  
            "doc_acuerdo_pago": self.get_doc_soporte_url(plan_pago.doc_acuerdo_pago) if plan_pago.doc_acuerdo_pago else None,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "observacion_juridica": plan_pago.observacion_juridica,
            "observacion_direccion": plan_pago.observacion_direccion,
            "fecha_aprobacion_juridica": plan_pago.fecha_aprobacion_juridica,
            "fecha_aprobacion_direccion": plan_pago.fecha_aprobacion_direccion,
            "fecha_notificacion": plan_pago.fecha_notificacion,
            "valor_total_pagar": round(valor_total_pagar, 2),
            "fecha_aprobacion": now(),
        }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": response_data
        }, status=status.HTTP_200_OK)


class AprobacionAcuerdoJuridicaView(APIView):
    permission_classes = [IsAuthenticated, PermisoActualizarAprobarAcuerdosDePagoJurdica]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')
        observacion_juridica = request.data.get("observacion_juridica")

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que el campo observacion_juridica sea obligatorio
        if not observacion_juridica or not str(observacion_juridica).strip():
            return Response({
                "success": False,
                "detail": "El campo 'observacion_juridica' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Solo se puede aprobar si el estado es "AR"
        if plan_pago.estado != "AR":
            return Response({
                "success": False,
                "detail": "Solo se puede aprobar jurídica si el plan de pago está en estado 'Aceptada Recaudo' (AR)."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar campos
        plan_pago.fecha_aprobacion_juridica = now()
        plan_pago.estado = "VJ"
        plan_pago.observacion_juridica = observacion_juridica
        plan_pago.save()

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_AprAcP'
        data_alerta['informacion_complemento_mensaje'] = f"Plan de pago aprobado por jurídica. ID: {plan_pago.id_plan_pago}, Nro Plan: {plan_pago.nro_plan_pago}"

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)


        return Response({
            "success": True,
            "detail": "Plan de pago aprobado por jurídica correctamente.",
            "data": {
                "id_plan_pago": plan_pago.id_plan_pago,
                "estado": plan_pago.estado,
                "fecha_aprobacion_juridica": plan_pago.fecha_aprobacion_juridica,
                "observacion_juridica": plan_pago.observacion_juridica
            }
        }, status=status.HTTP_200_OK)

class AprobacionAcuerdoDireccionView(APIView):
    permission_classes = [IsAuthenticated, PermisoActualizarAprobarAcuerdosDePagoDireccion]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')
        observacion_direccion = request.data.get("observacion_direccion")

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que el campo observacion_direccion sea obligatorio
        if not observacion_direccion or not str(observacion_direccion).strip():
            return Response({
                "success": False,
                "detail": "El campo 'observacion_direccion' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Solo se puede aprobar si el estado es "VJ" (por ejemplo, "Aprobado Jurídica")
        if plan_pago.estado != "VJ":
            return Response({
                "success": False,
                "detail": "Solo se puede aprobar dirección si el plan de pago está en estado 'Aprobado Jurídica' (VJ)."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar campos
        plan_pago.fecha_aprobacion_direccion = now()
        plan_pago.estado = "AP"
        plan_pago.observacion_direccion = observacion_direccion
        plan_pago.save()

        # Actualizar el estado de la solicitud asociada
        solicitud = plan_pago.id_solicitud_acuerdo_pago
        solicitud.estado = "AP"  
        solicitud.save()

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_AprAcP'
        data_alerta['informacion_complemento_mensaje'] = f"Plan de pago aprobado por dirección. ID: {plan_pago.id_plan_pago}, Nro Plan: {plan_pago.nro_plan_pago}"
        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)


        return Response({
            "success": True,
            "detail": "Plan de pago aprobado por gerencia correctamente.",
            "data": {
                "id_plan_pago": plan_pago.id_plan_pago,
                "estado": plan_pago.estado,
                "fecha_aprobacion_direccion": plan_pago.fecha_aprobacion_direccion,
                "observacion_direccion": plan_pago.observacion_direccion
            }
        }, status=status.HTTP_200_OK)


class AprobacionAcuerdoRecaudadorView(APIView):
    permission_classes = [IsAuthenticated, PermisoActualizarAprobacionRecaudadorAcuerdosDePago]

    def get_doc_soporte_url(self, obj):
        if hasattr(obj, "doc_solicitud") and obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if len(obj.doc_solicitud.name) > 0 else None
        if hasattr(obj, "documento_generado") and obj.documento_generado:
            return Util.obtener_archivos(obj.documento_generado.name) if len(obj.documento_generado.name) > 0 else None
        return None

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')
        doc_acuerdo_pago_id = request.data.get("doc_acuerdo_pago")  

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        if plan_pago.estado != "NF":
            return Response({
                "success": False,
                "detail": "Solo se puede aprobar si el plan de pago está en estado 'Notificado' (NF)."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            generadorDocumentoAcuerdoPago = DocumentoDescargableAcuerdoPagoView()
            documento = generadorDocumentoAcuerdoPago.generar_documento_acuerdo_pago(request, plan_pago.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago, 'AP')
            ruta_documento = Util.obtener_archivos(documento.documento_generado.name) if len(documento.documento_generado.name) > 0 else None
        except ValidationError as ve:
            return Response({
                "success": False,
                "detail": f"Error del documento de acuerdo de pago: {str(ve)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al generar el documento de acuerdo de pago: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar doc_acuerdo_pago si se envía en el request
        if doc_acuerdo_pago_id:
            from recaudos.models.documento_models import DocumentosGenerados
            try:
                doc_acuerdo = DocumentosGenerados.objects.get(id_documento_generado=doc_acuerdo_pago_id)
                plan_pago.doc_acuerdo_pago = doc_acuerdo
            except DocumentosGenerados.DoesNotExist:
                return Response({
                    "success": False,
                    "detail": "El documento de acuerdo de pago no existe."
                }, status=status.HTTP_404_NOT_FOUND)

        # Actualizar campos
        plan_pago.fecha_aprobacion_recaudor = now()
        plan_pago.estado = "RA"
        plan_pago.doc_acuerdo_pago = documento
        plan_pago.save()

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_AprAcP'
        data_alerta['informacion_complemento_mensaje'] = f"Plan de pago aprobado por recaudador. ID: {plan_pago.id_plan_pago}, Nro Plan: {plan_pago.nro_plan_pago}"
        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        solicitud = plan_pago.id_solicitud_acuerdo_pago

        return Response({
            "success": True,
            "detail": "Plan de pago aprobado por el recaudador correctamente.",
            "data": {
                "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "id_plan_pago": plan_pago.id_plan_pago,
                "estado_plan_pago": plan_pago.estado,
                "estado_plan_pago_display": plan_pago.get_estado_display(),
                "fecha_aprobacion_recaudador": plan_pago.fecha_aprobacion_recaudor,
                "doc_solicitud": ruta_documento,
                "doc_acuerdo_pago": plan_pago.doc_acuerdo_pago.id_documento_generado if plan_pago.doc_acuerdo_pago else None,
                "doc_acuerdo_pago_url": self.get_doc_soporte_url(plan_pago.doc_acuerdo_pago) if plan_pago.doc_acuerdo_pago else None,

            }
        }, status=status.HTTP_200_OK)


class ConsultaPlanesNotificacionView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarNotificarAcuerdosDePago]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        id_persona_solicita = request.query_params.get("id_persona_solicita")
        estado = request.query_params.get("estado")
        nro_plan_pago = request.query_params.get("nro_plan_pago")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")

        planes = PlanesPago.objects.select_related('id_solicitud_acuerdo_pago', 'id_solicitud_acuerdo_pago__id_persona_solicita').filter(estado="AP")

        if id_persona_solicita:
            planes = planes.filter(id_solicitud_acuerdo_pago__id_persona_solicita=id_persona_solicita)
        if estado:
            planes = planes.filter(estado=estado)
        if nro_plan_pago:
            planes = planes.filter(nro_plan_pago=nro_plan_pago)
        if fecha_desde:
            try:
                planes = planes.filter(fecha_aprobacion_recaudo__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)
        if fecha_hasta:
            try:
                planes = planes.filter(fecha_aprobacion_recaudo__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(planes.order_by("-id_solicitud_acuerdo_pago__fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        for plan in page:
            solicitud = plan.id_solicitud_acuerdo_pago
            persona = solicitud.id_persona_solicita
            data.append({
                "id_plan_pago": plan.id_plan_pago,
                "nro_plan_pago": plan.nro_plan_pago,
                "nro_cuotas": plan.nro_cuotas,
                "valor_total_pagar": float(plan.valor_total_pagar),
                "estado_plan_pago": plan.estado,
                "estado_plan_pago_display": plan.get_estado_display(),
                "solicitud_estado": solicitud.estado,
                "solicitud_estado_display": solicitud.get_estado_display(),
                "fecha_aprobacion_recaudo": plan.fecha_aprobacion_recaudo,
                "fecha_aprobacion_juridica": plan.fecha_aprobacion_juridica,
                "fecha_aprobacion_direccion": plan.fecha_aprobacion_direccion,
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": data
        })

class CrearNotificacionPlanAcuerdoView(APIView):
    permission_classes = [IsAuthenticated, PermisoActualizarNotificarAcuerdosDePago]

    def get_doc_soporte_url(self, obj):
        if obj and hasattr(obj, "documento_generado") and obj.documento_generado:
            return Util.obtener_archivos(obj.documento_generado.name) if len(obj.documento_generado.name) > 0 else None
        return None

    def get_consecutivo(self, configuracion_consecutivo):
        if configuracion_consecutivo:
            configuracion_consecutivo.consecutivo_actual += 1
            configuracion_consecutivo.fecha_consecutivo_actual = datetime.now()
            configuracion_consecutivo.save()
            consecutivo = (
                configuracion_consecutivo.prefijo_consecutivo +
                str(configuracion_consecutivo.anio_consecutivo) +
                str(configuracion_consecutivo.consecutivo_actual).zfill(configuracion_consecutivo.cantidad_digitos)
            )
            return consecutivo, configuracion_consecutivo.fecha_consecutivo_actual
        else:
            raise ValidationError("No existe la configuración de consecutivo.")

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        try:
            data = request.data
            id_solicitud = data.get("id_solicitud_acuerdo_pago")
            doc_acuerdo_plan_pago = data.get("doc_acuerdo_plan_pago")  

            if not id_solicitud or not doc_acuerdo_plan_pago:
                return Response({
                    "success": False,
                    "detail": "Debe enviar 'id_solicitud_acuerdo_pago' y 'doc_acuerdo_plan_pago'."
                }, status=status.HTTP_400_BAD_REQUEST)

            solicitud = SolicitudAcuerdosPago.objects.filter(id_solicitud_acuerdo_pago=id_solicitud).first()
            if not solicitud:
                return Response({
                    "success": False,
                    "detail": "La solicitud no existe."
                }, status=status.HTTP_404_NOT_FOUND)

            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
            if not plan_pago:
                return Response({
                    "success": False,
                    "detail": "No existe un plan de pago asociado a la solicitud."
                }, status=status.HTTP_404_NOT_FOUND)
            
            if plan_pago.fecha_notificacion is not None:
                return Response({
                    "success": False,
                    "detail": "La solicitud ya fue notificada previamente."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if plan_pago.estado != "AP":
                return Response({
                    "success": False,
                    "detail": "El plan de pago debe estar en estado 'Aprobada' (AP) para notificar."
                }, status=status.HTTP_400_BAD_REQUEST)

            if PlanesPago.objects.filter(doc_acuerdo_pago=doc_acuerdo_plan_pago).exclude(id_plan_pago=plan_pago.id_plan_pago).exists():
                return Response({
                    "success": False,
                    "detail": "El documento ya está asociado a otro plan de pago."
                }, status=status.HTTP_400_BAD_REQUEST)

            plan_pago.fecha_notificacion = timezone.now()
            plan_pago.estado = "NF"
            doc_acuerdo_obj = DocumentosGenerados.objects.filter(id_documento_generado=doc_acuerdo_plan_pago).first()
            if not doc_acuerdo_obj:
                return Response({
                    "success": False,
                    "detail": "El documento de acuerdo de plan de pago no existe."
                }, status=status.HTTP_404_NOT_FOUND)
            plan_pago.doc_acuerdo_pago = doc_acuerdo_obj
            plan_pago.save()

            solicitud.estado = "AP"
            solicitud.save()

            # Actualizar facturas asociadas a las cuotas del plan de pago a estado "AC"
            facturas_actualizadas = []
            cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud,
                id_cuota_acuerdo_pago__in=cuotas
            )
            facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))
            facturas.update(estado_factura="AC")
            for factura in facturas:
                facturas_actualizadas.append({
                    "id_factura_unica": factura.id_factura_unica,
                    "estado_factura": factura.estado_factura
                })

            planes_actualizados = [{
                "id_plan_pago": plan_pago.id_plan_pago,
                "fecha_notificacion": plan_pago.fecha_notificacion,
                "doc_acuerdo_pago": plan_pago.doc_acuerdo_pago.id_documento_generado if plan_pago.doc_acuerdo_pago else None,
                "doc_acuerdo_pago_url": self.get_doc_soporte_url(plan_pago.doc_acuerdo_pago),
                "estado_plan_pago": plan_pago.estado,
                "estado_plan_pago_display": plan_pago.get_estado_display() if hasattr(plan_pago, "get_estado_display") else plan_pago.estado
            }]
            solicitudes_actualizadas = [{
                "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                "estado_solicitud": solicitud.estado,
                "estado_solicitud_display": solicitud.get_estado_display() if hasattr(solicitud, "get_estado_display") else solicitud.estado,
                "doc_solicitud": Util.obtener_archivos(solicitud.doc_solicitud.name) if solicitud.doc_solicitud else None
            }]

            # Enviar correo de notificación al recaudador
            subject = "Notificación de Acuerdo de Pago Aprobado"
            template = "notificacion-acuerdos-pago.html" 

            # Obtener el recaudador asociado
            recaudador = plan_pago.id_solicitud_acuerdo_pago.id_persona_solicita
            if recaudador:
                # Construir el nombre del recaudador
                if recaudador.tipo_persona == 'N':
                    nombre_de_usuario = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                else:
                    nombre_de_usuario = recaudador.razon_social

                Util.notificacion(
                    recaudador,  
                    subject,
                    template,
                    fecha_registro=plan_pago.fecha_notificacion.strftime('%d-%b-%Y'),
                    nsolicitud=solicitud.nro_solicitud,
                    faprobada=plan_pago.fecha_notificacion.strftime('%d-%b-%Y'),
                    valortotalcuota = Utils.formato_peso(str(int(round(plan_pago.valor_total_pagar)))),
                    nombre_de_usuario=nombre_de_usuario
                )

                # Enviar SMS de notificación al recaudador
                telefono_a_usar = recaudador.telefono_celular if recaudador.telefono_celular else recaudador.telefono_celular_empresa
                if telefono_a_usar:
                    mensaje_sms = (
                        f"Fedecacao - Fondo Nacional del Cacao: Acuerdo de Pago aprobado. "
                        f"Solicitud N° {solicitud.nro_solicitud}, "
                        f"Valor total a pagar: {Utils.formato_peso(str(int(round(plan_pago.valor_total_pagar))))}."
                    )
                    Util.send_sms(telefono_a_usar, mensaje_sms)

            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_NotAcP'
            data_alerta['informacion_complemento_mensaje'] = f"Acuerdo de pago notificado. ID: {plan_pago.id_plan_pago}, Nro Plan: {plan_pago.nro_plan_pago}"
            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta and configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)


            return Response({
                "success": True,
                "detail": "Notificación realizada correctamente.",
                "planes_actualizados": planes_actualizados,
                "solicitudes_actualizadas": solicitudes_actualizadas,
                "facturas_actualizadas": facturas_actualizadas
            }, status=status.HTTP_200_OK)

        except Exception as e:
            transaction.set_rollback(True)
            return Response({
                "success": False,
                "detail": f"Error en la operación: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

# class CrearNotificacionPlanAcuerdoView(APIView):
#     permission_classes = [IsAuthenticated, PermisoActualizarNotificarAcuerdosDePago]

#     def get_doc_soporte_url(self, obj):
#         if obj and hasattr(obj, "documento_generado") and obj.documento_generado:
#             return Util.obtener_archivos(obj.documento_generado.name) if len(obj.documento_generado.name) > 0 else None
#         return None

#     def get_consecutivo(self, configuracion_consecutivo):
#         if configuracion_consecutivo:
#             configuracion_consecutivo.consecutivo_actual += 1
#             configuracion_consecutivo.fecha_consecutivo_actual = datetime.now()
#             configuracion_consecutivo.save()
#             consecutivo = (
#                 configuracion_consecutivo.prefijo_consecutivo +
#                 str(configuracion_consecutivo.anio_consecutivo) +
#                 str(configuracion_consecutivo.consecutivo_actual).zfill(configuracion_consecutivo.cantidad_digitos)
#             )
#             return consecutivo, configuracion_consecutivo.fecha_consecutivo_actual
#         else:
#             raise ValidationError("No existe la configuración de consecutivo.")

#     def generar_codigo_barras_sin_ghostscript(self, codigo):
#         buffer = BytesIO()
#         Code128(codigo, writer=ImageWriter()).write(buffer)
#         return base64.b64encode(buffer.getvalue()).decode('utf-8')

#     @transaction.atomic
#     def patch(self, request, *args, **kwargs):
#         try:
#             data = request.data
#             id_solicitud = data.get("id_solicitud_acuerdo_pago")
#             doc_acuerdo_plan_pago = data.get("doc_acuerdo_plan_pago")

#             if not id_solicitud or not doc_acuerdo_plan_pago:
#                 return Response({
#                     "success": False,
#                     "detail": "Debe enviar 'id_solicitud_acuerdo_pago' y 'doc_acuerdo_plan_pago'."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             solicitud = SolicitudAcuerdosPago.objects.filter(id_solicitud_acuerdo_pago=id_solicitud).first()
#             if not solicitud:
#                 return Response({
#                     "success": False,
#                     "detail": "La solicitud no existe."
#                 }, status=status.HTTP_404_NOT_FOUND)

#             plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
#             if not plan_pago:
#                 return Response({
#                     "success": False,
#                     "detail": "No existe un plan de pago asociado a la solicitud."
#                 }, status=status.HTTP_404_NOT_FOUND)

#             if plan_pago.fecha_notificacion is not None:
#                 return Response({
#                     "success": False,
#                     "detail": "La solicitud ya fue notificada previamente."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             if plan_pago.estado != "AP":
#                 return Response({
#                     "success": False,
#                     "detail": "El plan de pago debe estar en estado 'Aprobada' (AP) para notificar."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             if PlanesPago.objects.filter(doc_acuerdo_pago=doc_acuerdo_plan_pago).exclude(id_plan_pago=plan_pago.id_plan_pago).exists():
#                 return Response({
#                     "success": False,
#                     "detail": "El documento ya está asociado a otro plan de pago."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             plan_pago.fecha_notificacion = timezone.now()
#             doc_acuerdo_obj = DocumentosGenerados.objects.filter(id_documento_generado=doc_acuerdo_plan_pago).first()
#             if not doc_acuerdo_obj:
#                 return Response({
#                     "success": False,
#                     "detail": "El documento de acuerdo de plan de pago no existe."
#                 }, status=status.HTTP_404_NOT_FOUND)
#             plan_pago.doc_acuerdo_pago = doc_acuerdo_obj
#             plan_pago.save()

#             solicitud.estado = "AP"
#             solicitud.save()

#             cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
#             usuario = request.user
#             persona_logueada = usuario.persona

#             nombre_plantilla = unidecode("Plantilla liquidacion").lower()
#             plantilla = None
#             for p in PlantillasDoc.objects.all():
#                 if unidecode(p.nombre or '').strip().lower() == nombre_plantilla:
#                     plantilla = p
#                     break
#             if not plantilla:
#                 return Response({
#                     "success": False,
#                     "detail": "No se encontró la plantilla de liquidación."
#                 }, status=status.HTTP_404_NOT_FOUND)

#             variables_plantilla = plantilla.variables if hasattr(plantilla, "variables") else None
#             if variables_plantilla and isinstance(variables_plantilla, str):
#                 try:
#                     variables_plantilla = json.loads(variables_plantilla)
#                 except Exception:
#                     variables_plantilla = {}

#             liquidaciones_creadas = []
#             empresa = "1234567890128"
#             facturas_actualizadas = []
#             cuotas_actualizadas = []
#             planes_actualizados = []
#             solicitudes_actualizadas = []

#             generador = GeneradorDocumentosView()

#             for cuota in cuotas:
#                 detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago=cuota)
#                 facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

#                 facturas.update(estado_factura="AC")
#                 for f in facturas:
#                     facturas_actualizadas.append({
#                         "id_factura_unica": f.id_factura_unica,
#                         "estado_factura": "AC"
#                     })

#                 cuota_fomento_total = facturas.aggregate(total=Sum('cuota_fomento'))['total'] or 0
#                 valor_a_pagar = facturas.aggregate(total=Sum('valor_neto'))['total'] or 0

#                 intereses_total = 0
#                 dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
#                 tasa_interes = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").values_list("valor", flat=True).first() or 0
#                 fecha_actual = timezone.now().date()
#                 for factura in facturas:
#                     mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#                     try:
#                         fecha_limite = mes_siguiente.replace(day=dias_pago)
#                     except Exception:
#                         fecha_limite = (mes_siguiente + relativedelta(months=1)).replace(day=1) - timedelta(days=1)
#                     if isinstance(fecha_limite, datetime):
#                         fecha_limite = fecha_limite.date()
#                     dias_mora = max((fecha_actual - fecha_limite).days, 0)
#                     intereses = (factura.cuota_fomento * tasa_interes * dias_mora) / 365 if dias_mora > 0 else 0
#                     intereses_total += intereses

#                 recaudador = facturas.first().id_persona_recaudador if facturas.exists() else None
#                 referencia = recaudador.numero_documento if recaudador else "00000000"
#                 valorPagarFormateado = str(int(round(valor_a_pagar)))
#                 fechaMaximaPago = cuota.fecha_vencimiento.date() if cuota.fecha_vencimiento else timezone.now().date()
#                 fechaMaximaPagoFormateado = fechaMaximaPago.strftime("%d/%m/%Y")
#                 fechaMaximaPagoFormateadoCompacta = fechaMaximaPago.strftime("%d%m%Y")
#                 codigo_barras = f"(415){empresa}(8020){referencia}(3900){valorPagarFormateado}(96){fechaMaximaPagoFormateadoCompacta}"

#                 if hasattr(plantilla, "id_config_consecutivo") and plantilla.id_config_consecutivo:
#                     consecutivo, fecha_consecutivo = self.get_consecutivo(plantilla.id_config_consecutivo)
#                 else:
#                     consecutivo = f"Liquidacion_{cuota.id_cuota_acuerdo_pago}_{timezone.now().strftime('%Y%m%d%H%M%S')}"
#                     fecha_consecutivo = timezone.now()

#                 variables_documento = variables_plantilla.copy() if variables_plantilla else {}
#                 variables_documento.update({
#                     "consecutivo": consecutivo,
#                     "codigo_barras": self.generar_codigo_barras_sin_ghostscript(codigo_barras),
#                 })

#                 data_in = {
#                     "id_plantilla_doc": plantilla.id_plantilla_doc,
#                     "variables": variables_documento
#                 }
#                 archivo = generador.generar_documento(data_in)

#                 doc_pago = DocumentosGenerados.objects.create(
#                     id_plantilla_doc=plantilla,
#                     fecha_consecutivo=fecha_consecutivo,
#                     id_persona_genera=persona_logueada,
#                     consecutivo=consecutivo,
#                     documento_generado=archivo
#                 )

#                 liquidacion = LiquidacionesFacturaUnica.objects.create(
#                     cod_estado="L",
#                     valor_intereses=round(intereses_total, 2),
#                     valor_pagar=round(valor_a_pagar, 2),
#                     fecha_liquidacion=timezone.now(),
#                     id_persona_liquida=persona_logueada,
#                     doc_pago=doc_pago,
#                     codigo_barras=codigo_barras,
#                     nro_doc_pago=doc_pago.consecutivo
#                 )
#                 facturas.update(id_liq_factura_unica=liquidacion)

#                 liquidaciones_creadas.append({
#                     "id_liquidacion": liquidacion.id_liq_factura_unica,
#                     "cuota_fomento_total": round(cuota_fomento_total, 2),
#                     "valor_intereses_total": round(intereses_total, 2),
#                     "valor_a_pagar": round(valor_a_pagar, 2),
#                     "codigo_barras": codigo_barras,
#                     "doc_pago": doc_pago.id_documento_generado,
#                     "doc_pago_url": self.get_doc_soporte_url(doc_pago),
#                     "fecha_liquidacion": liquidacion.fecha_liquidacion,
#                     "estado": liquidacion.cod_estado,
#                     "estado_display": liquidacion.get_cod_estado_display() if hasattr(liquidacion, "get_cod_estado_display") else liquidacion.cod_estado,
#                     "facturas_liquidadas": list(facturas.values_list('id_factura_unica', flat=True))
#                 })
#                 cuotas_actualizadas.append({
#                     "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
#                     "fecha_vencimiento": cuota.fecha_vencimiento,
#                     "valor_cuota": cuota.valor_cuota,
#                     "id_plan_pago": cuota.id_plan_pago.id_plan_pago
#                 })

#             planes_actualizados.append({
#                 "id_plan_pago": plan_pago.id_plan_pago,
#                 "fecha_notificacion": plan_pago.fecha_notificacion,
#                 "doc_acuerdo_pago": plan_pago.doc_acuerdo_pago.id_documento_generado if plan_pago.doc_acuerdo_pago else None,
#                 "doc_acuerdo_pago_url": self.get_doc_soporte_url(plan_pago.doc_acuerdo_pago),
#                 "estado": plan_pago.estado,
#                 "estado_display": plan_pago.get_estado_display() if hasattr(plan_pago, "get_estado_display") else plan_pago.estado
#             })
#             solicitudes_actualizadas.append({
#                 "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
#                 "estado": solicitud.estado,
#                 "estado_display": solicitud.get_estado_display() if hasattr(solicitud, "get_estado_display") else solicitud.estado,
#                 "doc_solicitud": Util.obtener_archivos(solicitud.doc_solicitud.name) if solicitud.doc_solicitud else None
#             })

#             return Response({
#                 "success": True,
#                 "detail": "Notificación y liquidaciones generadas correctamente.",
#                 "liquidaciones": liquidaciones_creadas,
#                 "facturas_actualizadas": facturas_actualizadas,
#                 "cuotas_actualizadas": cuotas_actualizadas,
#                 "planes_actualizados": planes_actualizados,
#                 "solicitudes_actualizadas": solicitudes_actualizadas
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             transaction.set_rollback(True)
#             return Response({
#                 "success": False,
#                 "detail": f"Error en la operación: {str(e)}"
#             }, status=status.HTTP_400_BAD_REQUEST)


class InfoPlanPagoNotificacionView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarNotificarAcuerdosDePago]

    def get(self, request, id_solicitud_acuerdo_pago):
        try:
            solicitud = SolicitudAcuerdosPago.objects.get(id_solicitud_acuerdo_pago=id_solicitud_acuerdo_pago)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
        if not plan:
            return Response({
                "success": False,
                "detail": "No existe un plan de pago asociado a la solicitud."
            }, status=status.HTTP_404_NOT_FOUND)

        # Número de cuotas
        numero_cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan).count()

        # Valor total a pagar (suma de valor_cuota de todas las cuotas)
        valor_total = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan).aggregate(
            total=Sum('valor_cuota')
        )['total'] or 0

        data = {
            "id_solicitud_acuerdo_pago": plan.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago,
            "id_plan_pago": plan.id_plan_pago,
            "numero_solicitud": solicitud.nro_solicitud,
            "numero_plan_pago": plan.nro_plan_pago,
            "numero_cuotas_plan_pago": numero_cuotas,
            "valor_total_a_pagar": float(valor_total),
            "estado_plan_pago": plan.estado,
            "estado_display": plan.get_estado_display() if hasattr(plan, "get_estado_display") else plan.estado,
            "observacion_solicitud": solicitud.observaciones,
            "observacion_juridica": plan.observacion_juridica,
            "observacion_direccion": plan.observacion_direccion,
            "fecha_aprobacion_recaudo": plan.fecha_aprobacion_recaudo,
            "fecha_aprobacion_juridica": plan.fecha_aprobacion_juridica,
            "fecha_aprobacion_direccion": plan.fecha_aprobacion_direccion,
        }

        return Response({
            "success": True,
            "detail": "Información consultada correctamente.",
            "data": data
        }, status=status.HTTP_200_OK)
    

class DocumentoDetallesPlanesPagoInternoNotificacion(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarNotificarAcuerdosDePago]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        fecha_actual = now().date()
        # Enviar SMS (si tiene teléfono)
        sms = (
            f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
            f"Recaudador: {nombre_recaudador}, se ha generado consulta de acuerdo de pago, el {fecha_actual} "
        )

        telefono_recaudador = telefono_recaudador
        if telefono_recaudador:
            Util.send_sms(telefono_recaudador, sms)

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)
    

class DocumentoDescargableAcuerdoPagoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarNotificarAcuerdosDePago]
    serializer_class = DocumentosGeneradosSerializer

    def get_nombre_completo(self, persona):
        return ''.join(filter(None, [
            str(persona.primer_nombre).upper() if persona.primer_nombre else '',
            ' ', str(persona.segundo_nombre).upper() if persona.segundo_nombre else '',
            ' ', str(persona.primer_apellido).upper() if persona.primer_apellido else '',
            ' ', str(persona.segundo_apellido).upper() if persona.segundo_apellido else ''
        ])).strip()
    
    def get_firma_base64(self, firma_key: str) -> str | None:
        if not firma_key:
            return None
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            buffer = BytesIO()
            s3_client.download_fileobj(settings.AWS_STORAGE_BUCKET_NAME, firma_key, buffer)
            buffer.seek(0)
            return base64.b64encode(buffer.read()).decode('utf-8')
        except Exception as e:
            print(f"[ERROR] No se pudo obtener firma desde S3: {e}")
            return None
    
    def get_firma(self, persona):
        usuario = User.objects.filter(persona=persona).first()
        if usuario and usuario.firma_usuario:
            return self.get_firma_base64(usuario.firma_usuario.name)
        return None

    def get_datos_rl_fedecacao(self):
        fedecacao = Personas.objects.filter(numero_documento='899999175').first()
        if not fedecacao or not fedecacao.representante_legal:
            raise ValidationError("No se encontró el representante legal de Fedecacao.")
        persona = fedecacao.representante_legal
        return {
            "nombre": self.get_nombre_completo(persona),
            "ciudad": persona.cod_municipio_expedicion_id.nombre if persona.cod_municipio_expedicion_id else '',
            "documento": persona.numero_documento,
            "firma": self.get_firma(persona),
        }

    def get_datos_recaudador(self, persona):
        recaudador = Personas.objects.filter(id_persona=persona.id_persona).first()
        if not recaudador:
            raise ValidationError("No se encontró la persona recaudadora.")
        
        datos_recaudador = {
            "documento": recaudador.numero_documento,
            "ciudad": recaudador.cod_municipio_expedicion_id.nombre if recaudador.cod_municipio_expedicion_id else '',
            "direccion": recaudador.direccion_notificaciones,
            "email": recaudador.email or '',
        }

        if recaudador.tipo_persona == 'N':
            nombre = self.get_nombre_completo(recaudador)
            telefono = recaudador.telefono_celular
            return {
                "nombre": nombre,
                "telefono": telefono,
                "firma": self.get_firma(recaudador),
                **datos_recaudador
            }
        elif recaudador.tipo_persona == 'J':
            nombre = recaudador.razon_social or recaudador.nombre_comercial
            telefono = recaudador.telefono_celular_empresa
            persona_rl = recaudador.representante_legal

            return {
                "nombre": nombre,
                "telefono": telefono,
                "nombre_rl": self.get_nombre_completo(persona_rl),
                "documento_rl": persona_rl.numero_documento,
                "ciudad_rl": persona_rl.cod_municipio_expedicion_id.nombre if persona_rl.cod_municipio_expedicion_id else '',
                "firma": self.get_firma(persona_rl),
                **datos_recaudador
            }
        else:
            raise ValidationError("Tipo de persona no soportado para recaudador.")
        
    def generar_documento_acuerdo_pago(self, request, id_solicitud, accion):
  
        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            raise ValidationError("No se encontró la solicitud con el ID proporcionado.")

        persona = solicitud.id_persona_solicita
        
        items = []
        valor_total = Decimal("0")
        fecha_actual = now().date()

        # Obtener los datos de RL Fedecacao y del recaudador
        datos_rl = self.get_datos_rl_fedecacao()
        recaudador = self.get_datos_recaudador(persona)

        firma_recaudador = None

        if accion == 'NF':
            firma_recaudador = ''
        elif accion == 'AP':
           firma_recaudador = recaudador['firma']
           if firma_recaudador is None:
                raise ValidationError("No se encontró la firma del recaudador.")

        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
    
        if not plan_pago:
            raise ValidationError("No existe un plan de pago asociado a la solicitud.")
        
        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
        fecha_inicial = cuotas.first().fecha_vencimiento if cuotas.exists() else None
        fecha_final = cuotas.last().fecha_vencimiento if cuotas.exists() else None
        for cuota in cuotas:
            items.append({
                "numcuota": cuota.nro_cuota,
                "fpagocuota": cuota.fecha_vencimiento.strftime("%d/%m/%Y") if cuota.fecha_vencimiento else "",
                "valorcuota": Utils.formato_peso(str(round(cuota.valor_cuota, 5)))
            })

            valor_total += cuota.valor_cuota
        
        variables_comunes = {
            "titularfedecacao": datos_rl['nombre'],
            "documentofedecacao":datos_rl['documento'],
            "ciudadfedecacao":datos_rl['ciudad'],

            "firmasdoc": {
                "firmafedecacao": datos_rl['firma'],
                "firmadeudor":firma_recaudador,
            },
            "fechaaprobacion":plan_pago.fecha_aprobacion_recaudo.strftime("%d/%m/%Y") if plan_pago.fecha_aprobacion_recaudo else "",
            "fechasolicitud":solicitud.fecha_solicitud.strftime("%d/%m/%Y") if solicitud.fecha_solicitud else "",
            "letrasncuotas": str(Utils.convertir_numeros_a_letras(plan_pago.nro_cuotas)).upper(),
            "ncuotas":str(plan_pago.nro_cuotas),
            "valortotalpagar": Utils.formato_peso(str(math.ceil(valor_total))),
            "fechainicioap":fecha_inicial.strftime("%d/%m/%Y") if fecha_inicial else "",
            "fechafinalap": fecha_final.strftime("%d/%m/%Y") if fecha_final else "",
            "items":items,
            "letrasdia": str(Utils.convertir_numeros_a_letras(fecha_actual.day)).upper(),
            "fechadia": str(fecha_actual.day).zfill(2),
            "fechames": Utils.mes_en_letras(fecha_actual.month),
            "letrasano": str(Utils.convertir_numeros_a_letras(fecha_actual.year)).upper(),
            "fechaano": str(fecha_actual.year),
        }

        # Obtener el archivo asociado a la factura
        if persona.tipo_persona == 'N':
            nombre_plantilla = "Notificación Acuerdo Pago Persona Natural"
            variables = {
                **variables_comunes,
                "nombrerecaudador": recaudador['nombre'],
                "ccrecaudador": recaudador['documento'],
                "ciudadrecaudador": recaudador['ciudad'],
                "celularrecaudador": recaudador['telefono'],
                "direccionrecaudador": recaudador['direccion'],
                "emailrecaudador": recaudador['email']
            }
        elif persona.tipo_persona == 'J':
            nombre_plantilla = "Notificación Acuerdo Pago Persona Juridica"
            variables = {
                **variables_comunes,
                "razonsocial": recaudador['nombre'],
                "nitrazon": recaudador['documento'],
                "ciudadrazon": recaudador['ciudad'],
                "celularrazon": recaudador['telefono'],
                "direccionrazon": recaudador['direccion'],
                "emailrazon": recaudador['email'],
                "titulardeudor": recaudador['nombre_rl'],
                "documentodeudor": recaudador['documento_rl'],
                "ciudaddeudor": recaudador['ciudad_rl'],
            }
        else:
            return Response({
                "success": False,
                "detail": "Tipo de persona no válido."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener la plantilla
        plantilla = PlantillasDoc.objects.filter(nombre=nombre_plantilla).first()
        if not plantilla:
            raise ValidationError(f"No se encontró la plantilla '{nombre_plantilla}'.")

        # Generar URL del documento
        if accion == 'NF':
            url_documento = cartera_view.obtener_url_documento(request, plantilla.id_plantilla_doc, variables, False)
        elif accion == 'AP':
            url_documento = cartera_view.obtener_url_documento(request, plantilla.id_plantilla_doc, variables, True)
        else:
            raise ValidationError("Acción no válida. Debe ser 'NF' o 'AP'.")
        
        
        # Verificar si se generó el documento
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        if not documento_generado:
            raise ValidationError("No se encontró el documento generado.")
        
        return documento_generado
            
    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')
        
        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            documento_generado = self.generar_documento_acuerdo_pago(request, id_solicitud, 'NF')
            serializer = self.serializer_class(documento_generado)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al generar el documento: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Si todo está bien, puedes devolver lo necesario
        return Response({
            "success": True,
            "detail": "Documento generado correctamente.",
            "data": serializer.data,
        }, status=status.HTTP_200_OK)


#Liquidacion externo cuotas
class CreateLiquidacionAcuerdoPagoExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoCrearLiquidacionCuotasAcuerdoPagoExterno]
    serializer_class = LiquidacionFacturaSerializer

    @transaction.atomic  
    def post(self, request, *args, **kwargs):
        usuario = request.user
        data = request.data

        # Validación de actualización del Porcentaje de Interés (PI)
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        now_date = timezone.now().date()
        ids_cuotas = data.get('id_cuotas', [])
        if not ids_cuotas or not isinstance(ids_cuotas, list):
            return Response({
                'success': False,
                'detail': "Se debe proporcionar un arreglo de IDs de cuotas en el campo 'id_cuotas'."
            }, status=status.HTTP_400_BAD_REQUEST)

        cuotas = CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).select_related('id_plan_pago')
        if cuotas.count() != len(ids_cuotas):
            return Response({
                'success': False,
                'detail': "Alguna de las cuotas no existe."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que todas las cuotas pertenezcan a un plan en estado "RA"
        for cuota in cuotas:
            if not cuota.id_plan_pago or cuota.id_plan_pago.estado != "RA":
                return Response({
                    'success': False,
                    'detail': f"La cuota {cuota.nro_cuota} no pertenece a un plan de pago en estado 'RA'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Buscar todas las facturas asociadas a las cuotas recibidas
        detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas)
        ids_facturas = list(detalles.values_list('id_factura_unica', flat=True))
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron facturas asociadas a las cuotas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si alguna factura genera intereses
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        fecha_actual = now_date
        alguna_tiene_intereses = False
        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)


        # Paso 2: Calcular los valores globales
        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []
        facturas_no_liquidables = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            # Obtener el valor de 'dias_pago_interes' desde la tabla FechasCierre
            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el valor de 'dias_pago' desde la tabla FechasCierre
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular la fecha límite de pago sin intereses
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                # Si el día no existe en el mes (ej. 31 de febrero), usar el último día válido
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular la fecha límite de pago con intereses
            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                # Si el cálculo excede el mes, ajustar al último día del mes siguiente
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)

            # Validar si la liquidación puede generarse
            fecha_actual = timezone.now().date() 
            if fecha_actual > fecha_limite_pago_interes.date():
                facturas_no_liquidables.append({
                    "id_factura_unica": factura.id_factura_unica,
                    "nro_factura_unica": factura.nro_factura_unica,
                    "fecha_compra": factura.fecha_compra,
                    "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
                })
                continue  

            # Calcular días de mora
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            # Calcular los intereses individuales
            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            # Acumular los intereses totales
            intereses_total += intereses_x_factura

            # Crear el objeto de la liquidación para esta factura
            detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador = factura.id_persona_recaudador
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular if recaudador and recaudador.telefono_celular else recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J':
                if recaudador.representante_legal:
                    persona_rl = recaudador.representante_legal
                    representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
                else:
                    representante_legal = persona_rl.razon_social

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 2),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(sum(detalle.valor_kilo for detalle in detalles) / len(detalles), 2) if detalles else 0,
                "detalles": [{
                    "nro_kilos": detalle.nro_kilos,
                    "valor_kilo": detalle.valor_kilo
                } for detalle in detalles],
            })

        # if facturas_no_liquidables:
        #         return Response({
        #             "success": False,
        #             "detail": "No se puede generar la liquidación de la Cuota de Fomento Cacaotero de las siguientes facturas.",
        #             "facturas_no_liquidables": facturas_no_liquidables
        #         }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calcular el valor total a pagar
        valor_a_pagar = cuota_fomento_total + intereses_total

        # Actualizar los valores globales en cada factura
        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
            })

        # Paso 4: Crear la liquidación general
        try:
            doc_pago_id = data.get('doc_pago_id')
            doc_pago = DocumentosGenerados.objects.filter(id_documento_generado=doc_pago_id).first()
            if not doc_pago:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no es válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if not doc_pago.consecutivo:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no tiene un consecutivo válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                return Response({
                    'success': False,
                    'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                }, status=status.HTTP_400_BAD_REQUEST)

            codigo_barras = data.get('codigo_barras', None)
            if not codigo_barras:
                return Response({
                    'success': False,
                    'detail': "El código de barras es obligatorio."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Si hay facturas a reliquidar, actualizar la liquidación existente
            if facturas_a_reliquidar.exists():
                liquidacion = facturas_a_reliquidar.first().id_liq_factura_unica
                doc_anterior = liquidacion.doc_pago
                # Actualizar la liquidación con el nuevo doc_pago y datos
                liquidacion.doc_pago = doc_pago
                liquidacion.nro_doc_pago = doc_pago.consecutivo
                liquidacion.valor_pagar = valor_a_pagar
                liquidacion.valor_intereses = intereses_total
                liquidacion.fecha_liquidacion = timezone.now()
                liquidacion.id_persona_liquida = request.user.persona
                liquidacion.codigo_barras = codigo_barras
                liquidacion.save()
                # Eliminar el documento anterior si es diferente al nuevo
                if doc_anterior and doc_anterior != doc_pago:
                    doc_anterior.delete()
                # Actualizar las cuotas y facturas para que apunten a la liquidación actualizada
                CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).update(id_liquidacion=liquidacion)
                facturas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo
            else:
                # Crear una nueva liquidación si todas son nuevas
                if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                    return Response({
                        'success': False,
                        'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                    }, status=status.HTTP_400_BAD_REQUEST)
                liquidacion = LiquidacionesFacturaUnica.objects.create(
                    cod_estado="L",
                    nro_doc_pago=doc_pago.consecutivo,
                    fecha_pago=None,
                    valor_pagar=valor_a_pagar,
                    valor_intereses=intereses_total,
                    fecha_liquidacion=timezone.now(),
                    id_persona_liquida=request.user.persona,
                    doc_pago=doc_pago,
                    codigo_barras=codigo_barras,
                )
                CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).update(id_liquidacion=liquidacion)
                facturas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo

            # Actualizar los valores globales en cada factura con el número de documento de pago
            for liquidacion_creada in liquidaciones_creadas:
                liquidacion_creada.update({
                    "nro_doc_pago": nro_doc_pago,
                })

            # Enviar correo y SMS por cada factura ===
            fecha_actual_formateada = timezone.now().strftime('%d-%b-%Y')

            for factura in facturas:
                recaudador = factura.id_persona_recaudador
                

                # Nombre del recaudador (natural o jurídico)
                if recaudador.tipo_persona == 'N':
                    nombre_de_usuario = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
                else:
                    nombre_de_usuario = recaudador.razon_social

                total_kilos_formateado = f"{factura.total_kilos:,.0f}"
                valor_fomento_formateado = f"${factura.cuota_fomento:,.0f}"

                # Actualizar las facturas con la liquidación creada
                factura.estado_factura = "LQ"
                factura.save()

                # Asunto del correo
                subject = f"Liquidación Cuota Acuerdo Pago Registrada - Plan de Pago N° {cuota.id_plan_pago.nro_plan_pago}"
                template = "liquidacion-acuerdo-pago.html"

                # Enviar email (si tiene correo)
                if recaudador.email:
                    Util.notificacion(
                        recaudador,
                        subject,
                        template,
                        fecha_liquidacion=fecha_actual_formateada,
                        nro_solicitud=cuota.id_plan_pago.id_solicitud_acuerdo_pago.nro_solicitud,
                        nro_plan_pago=cuota.id_plan_pago.nro_plan_pago,
                        nro_cuota=cuota.nro_cuota,
                        numero_factura=factura.nro_factura_unica,
                        cantidad_kilos=total_kilos_formateado,
                        valor_cuota_formateado = f"${cuota.valor_cuota:,.0f}",
                        nombre_de_usuario=nombre_de_usuario
                    )

                # Enviar SMS (si tiene teléfono)
                sms = (
                    f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                    f"Plan de Pago N° {cuota.id_plan_pago.nro_plan_pago} liquidado. "
                    f"N° de Cuota: {cuota.nro_cuota}. "
                    f"Valor cuota: ${cuota.valor_cuota:,.0f}."
                )


                telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
                if telefono_recaudador:
                    Util.send_sms(telefono_recaudador, sms)


            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_LiqCoF'
            data_alerta['informacion_complemento_mensaje'] = f"La liquidación tiene las siguiente caracteristicas: Número de pago: {liquidacion.nro_doc_pago} y valor a pagar: {Utils.formato_peso(liquidacion.valor_pagar)}"

            # configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            # if configuracion_alerta.activa:
            #     Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta and configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)
                
            # Auditoria
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Liquidación creada externamente",
                "NroDocPago": liquidacion.nro_doc_pago,
                "ValorPagar": float(liquidacion.valor_pagar),
                "ValorIntereses": float(liquidacion.valor_intereses),
                "Facturas": [f.nro_factura_unica for f in facturas],
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "Nuevo": {
                        "NroDocPago": liquidacion.nro_doc_pago,
                        "ValorPagar": float(liquidacion.valor_pagar),
                        "ValorIntereses": float(liquidacion.valor_intereses),
                        "FechaLiquidacion": liquidacion.fecha_liquidacion.strftime('%Y-%m-%d %H:%M:%S'),
                        "Facturas": [f.id_factura_unica for f in facturas]
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 51,  
                "cod_permiso": "CR",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)

                    
            return Response({
                'success': True,
                'detail': "Liquidación creada correctamente para las facturas.",
                'data': liquidaciones_creadas
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f"Error al crear la liquidación: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class GetLiquidacionDocumentoAcuerdoPagoExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        try:
            id_cuotas_raw = request.query_params.get('id_cuotas', '[]')
            id_cuotas_list = json.loads(id_cuotas_raw)
            if not isinstance(id_cuotas_list, list):
                raise ValueError
            id_cuotas_list = [int(x) for x in id_cuotas_list]
        except (json.JSONDecodeError, ValueError, TypeError):
            return Response({
                'success': False,
                'detail': "El parámetro 'id_cuotas' debe ser un arreglo válido de enteros, por ejemplo: [33,34,35]"
            }, status=status.HTTP_400_BAD_REQUEST)

        request._full_data = {
            'id_cuotas': id_cuotas_list,
            'doc_pago_id': request.query_params.get('doc_pago_id'),
            'codigo_barras': request.query_params.get('codigo_barras')
        }

        return self.post(request)

    def post(self, request, *args, **kwargs):
        data = getattr(request, '_full_data', request.data)

        # Validación de actualización del Porcentaje de Interés (PI)
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        now_date = timezone.now().date()

        ids_cuotas = data.get('id_cuotas', [])
        doc_pago_id = data.get('doc_pago_id')
        codigo_barras = data.get('codigo_barras')

        if not ids_cuotas:
            return Response({
                'success': False,
                'detail': "Se deben proporcionar IDs de cuotas."
            }, status=status.HTTP_400_BAD_REQUEST)

        cuotas = CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).select_related('id_plan_pago')
        if cuotas.count() != len(ids_cuotas):
            return Response({
                'success': False,
                'detail': "Alguna de las cuotas no existe."
            }, status=status.HTTP_400_BAD_REQUEST)


        # Validar que todas las cuotas pertenezcan a un plan en estado "RA"
        for cuota in cuotas:
            if not cuota.id_plan_pago or cuota.id_plan_pago.estado != "RA":
                return Response({
                    'success': False,
                    'detail': f"La cuota {cuota.nro_cuota} no pertenece a un plan de pago en estado 'RA'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Buscar todas las facturas asociadas a las cuotas recibidas
        detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas)
        ids_facturas = list(detalles.values_list('id_factura_unica', flat=True))
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)

        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron facturas asociadas a las cuotas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si alguna factura genera intereses
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        fecha_actual = now_date
        alguna_tiene_intereses = False
        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        # # Validar si alguna cuota tiene todas sus facturas liquidadas
        # cuotas_con_facturas_liquidadas = []
        # for cuota in cuotas:
        #     detalles_cuota = detalles.filter(id_cuota_acuerdo_pago=cuota)
        #     facturas_cuota = FacturaUnica.objects.filter(id_factura_unica__in=detalles_cuota.values_list('id_factura_unica', flat=True))
        #     if facturas_cuota.exists() and facturas_cuota.filter(id_liq_factura_unica__isnull=False).count() == facturas_cuota.count():
        #         cuotas_con_facturas_liquidadas.append({
        #             "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
        #             "nro_cuota": cuota.nro_cuota
        #         })
        # if cuotas_con_facturas_liquidadas:
        #     return Response({
        #         'success': False,
        #         'detail': "Las siguientes cuotas tienen todas sus facturas liquidadas.",
        #         'cuotas_liquidadas': cuotas_con_facturas_liquidadas
        #     }, status=status.HTTP_400_BAD_REQUEST)

        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)

            fecha_actual = timezone.now().date()
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses_x_factura

            detalles_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            recaudador = factura.id_persona_recaudador
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular or recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J' and recaudador.representante_legal:
                persona_rl = recaudador.representante_legal
                representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None

            detalle_cuota = detalles.filter(id_factura_unica=factura).first()
            nro_cuota = detalle_cuota.id_cuota_acuerdo_pago.nro_cuota if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None
            fecha_vencimiento = detalle_cuota.id_cuota_acuerdo_pago.fecha_vencimiento if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "fecha_actual": timezone.now(),
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 6),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(
                    sum(detalle.valor_kilo for detalle in detalles_factura) / len(detalles_factura), 2
                ) if detalles_factura else 0,
                "detalles": [{
                    "nro_kilos": detalle.nro_kilos,
                    "valor_kilo": detalle.valor_kilo
                } for detalle in detalles_factura],
                "nro_cuota": nro_cuota,
                "fecha_vencimiento": fecha_vencimiento,
            })

        valor_a_pagar = cuota_fomento_total + intereses_total

        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
                "nro_doc_pago": doc_pago_id,
                "codigo_barras": codigo_barras
            })

        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        cuotas_info = [
            {
                "id_cuota_acuerdo_pago": c.id_cuota_acuerdo_pago,
                "nro_cuota": c.nro_cuota
            } for c in cuotas
        ]

        descripcion = {
            "Mensaje": "Simulacion de liquidacion de cuotas (vista previa)",
            "Cuotas": cuotas_info,
            "FechaConsulta": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Simulado por": nombre_persona
        }

        valores_actualizados = {
            "preview": {
                "Cuotas": cuotas_info,
                "ValorCuotaTotal": float(cuota_fomento_total),
                "ValorInteresesTotal": float(intereses_total),
                "ValorTotalAPagar": float(valor_a_pagar)
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 52,
            "cod_permiso": "CO",
            "subsistema": "GEDE",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': "Vista previa de la liquidación generada.",
            'data': liquidaciones_creadas
        }, status=status.HTTP_200_OK)


# class GetLiquidacionDocumentoAcuerdoPagoExternoView(APIView):
#     permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

#     def get(self, request, *args, **kwargs):
#         try:
#             id_cuotas_raw = request.query_params.get('id_cuotas', '[]')
#             id_cuotas_list = json.loads(id_cuotas_raw)
#             if not isinstance(id_cuotas_list, list):
#                 raise ValueError
#             id_cuotas_list = [int(x) for x in id_cuotas_list]
#         except (json.JSONDecodeError, ValueError, TypeError):
#             return Response({
#                 'success': False,
#                 'detail': "El parámetro 'id_cuotas' debe ser un arreglo válido de enteros, por ejemplo: [33,34,35]"
#             }, status=status.HTTP_400_BAD_REQUEST)

#         request._full_data = {
#             'id_cuotas': id_cuotas_list,
#             'doc_pago_id': request.query_params.get('doc_pago_id'),
#             'codigo_barras': request.query_params.get('codigo_barras')
#         }

#         return self.post(request)

#     def post(self, request, *args, **kwargs):
#         data = getattr(request, '_full_data', request.data)

#         ids_cuotas = data.get('id_cuotas', [])
#         doc_pago_id = data.get('doc_pago_id')
#         codigo_barras = data.get('codigo_barras')

#         if not ids_cuotas:
#             return Response({
#                 'success': False,
#                 'detail': "Se deben proporcionar IDs de cuotas."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         cuotas = CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).select_related('id_plan_pago')
#         if cuotas.count() != len(ids_cuotas):
#             return Response({
#                 'success': False,
#                 'detail': "Alguna de las cuotas no existe."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         for cuota in cuotas:
#             if not cuota.id_plan_pago or cuota.id_plan_pago.estado != "RA":
#                 return Response({
#                     'success': False,
#                     'detail': f"La cuota {cuota.nro_cuota} no pertenece a un plan de pago en estado 'RA'."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#         # Buscar todas las facturas asociadas a las cuotas recibidas
#         detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas)
#         ids_facturas = list(detalles.values_list('id_factura_unica', flat=True))
#         facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
#         if not facturas.exists():
#             return Response({
#                 'success': False,
#                 'detail': "No se encontraron facturas asociadas a las cuotas proporcionadas."
#             }, status=status.HTTP_404_NOT_FOUND)

#         # Validar si alguna factura ya tiene una liquidación
#         facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
#         if facturas_liquidadas.exists():
#             facturas_liquidadas_numeros = facturas_liquidadas.values_list('nro_factura_unica', flat=True)
#             return Response({
#                 'success': False,
#                 'detail': f"Las siguientes facturas ya tienen una liquidación asociada: {list(facturas_liquidadas_numeros)}"
#             }, status=status.HTTP_400_BAD_REQUEST)

#         cuota_fomento_total = 0
#         intereses_total = 0
#         liquidaciones_creadas = []
#         facturas_no_liquidables = []

#         for factura in facturas:
#             cuota_fomento_total += factura.cuota_fomento

#             dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CA").values_list('dias_pago_interes', flat=True).first()
#             if dias_pago_interes is None:
#                 return Response({
#                     'success': False,
#                     'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CA").values_list('dias_pago', flat=True).first()
#             if dias_pago is None:
#                 return Response({
#                     'success': False,
#                     'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#             try:
#                 fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
#             except ValueError:
#                 primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
#                 fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

#             try:
#                 fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
#             except ValueError:
#                 fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
#                 if fecha_limite_pago_interes.day < fecha_limite_pago.day:
#                     fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)
            
#             fecha_actual = timezone.now().date()  
#             if fecha_actual > fecha_limite_pago_interes.date():
#                 facturas_no_liquidables.append({
#                     "id_factura_unica": factura.id_factura_unica,
#                     "nro_factura_unica": factura.nro_factura_unica,
#                     "fecha_compra": factura.fecha_compra,
#                     "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
#                 })
#                 continue

#             fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
#             dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            
#             intereses_x_factura = 0
#             if fecha_actual > fecha_limite_pago.date():
#                 porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
#                 if not porcentaje_cobro:
#                     return Response({
#                         'success': False,
#                         'detail': "No se encontró la tasa de interés de la DIAN."
#                     }, status=status.HTTP_400_BAD_REQUEST)

#                 tasa_interes_dian = porcentaje_cobro.valor
#                 intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

#             intereses_total += intereses_x_factura

#             detalles_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
#             recaudador = factura.id_persona_recaudador
#             proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
#             recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
#             tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
#             numero_documento_recaudador = recaudador.numero_documento if recaudador else None
#             telefono = recaudador.telefono_celular or recaudador.telefono_empresa if recaudador else None
#             direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
#             representante_legal = None
#             if recaudador and recaudador.tipo_persona == 'J':
#                 if recaudador.representante_legal:
#                     persona_rl = recaudador.representante_legal
#                     representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
#                 else:
#                     representante_legal = persona_rl.razon_social

#             # Buscar la cuota asociada a esta factura
#             detalle_cuota = detalles.filter(id_factura_unica=factura).first()
#             nro_cuota = detalle_cuota.id_cuota_acuerdo_pago.nro_cuota if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None
#             fecha_vencimiento = detalle_cuota.id_cuota_acuerdo_pago.fecha_vencimiento if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None

#             liquidaciones_creadas.append({
#                 "id_factura_unica": factura.id_factura_unica,
#                 "nro_factura_unica": factura.nro_factura_unica,
#                 "numero_documento_proveedor": proveedor_documento,
#                 "fecha_creacion_factura": factura.fecha_creacion,
#                 "fecha_compra": factura.fecha_compra,
#                 "fecha_actual": timezone.now(),
#                 "cuota_fomento": factura.cuota_fomento,
#                 "intereses_x_factura": round(intereses_x_factura, 6),
#                 "dias_mora": dias_mora,
#                 "fecha_limite_pago": fecha_limite_pago,
#                 "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
#                 "recaudador_nombre": recaudador_nombre,
#                 "tipo_documento_recaudador": tipo_documento_recaudador,
#                 "numero_documento_recaudador": numero_documento_recaudador,
#                 "telefono_recaudador": telefono,
#                 "direccion_recaudador": direccion,
#                 "representante_legal": representante_legal,
#                 "total_kilos": factura.total_kilos,
#                 "promedio_valor_kilo": round(
#                     sum(detalle.valor_kilo for detalle in detalles_factura) / len(detalles_factura), 2
#                 ) if detalles_factura else 0,
#                 "detalles": [{
#                     "nro_kilos": detalle.nro_kilos,
#                     "valor_kilo": detalle.valor_kilo
#                 } for detalle in detalles_factura],
#                 "nro_cuota": nro_cuota,
#                 "fecha_vencimiento": fecha_vencimiento,
#             })

#         valor_a_pagar = cuota_fomento_total + intereses_total

#         for liquidacion in liquidaciones_creadas:
#             liquidacion.update({
#                 "valor_intereses_total": round(intereses_total),
#                 "cuota_fomento_total": round(cuota_fomento_total),
#                 "valor_a_pagar": round(valor_a_pagar),
#                 "fecha_liquidacion": timezone.now(),
#                 "nro_doc_pago": doc_pago_id,
#                 "codigo_barras": codigo_barras
#             })

#         # if facturas_no_liquidables:
#         #     return Response({
#         #         "success": False,
#         #         "detail": "No se puede generar la liquidación de la Cuota de Fomento Cacaotero de las siguientes facturas.",
#         #         "facturas_no_liquidables": facturas_no_liquidables
#         #     }, status=status.HTTP_400_BAD_REQUEST)

#         # Auditoria
#         persona = request.user.persona
#         nombre_persona = (
#             f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
#             if persona and persona.tipo_persona == 'N'
#             else persona.razon_social if persona and persona.tipo_persona == 'J'
#             else "Usuario desconocido"
#         )

#         cuotas_info = [
#             {
#                 "id_cuota_acuerdo_pago": c.id_cuota_acuerdo_pago,
#                 "nro_cuota": c.nro_cuota
#             } for c in cuotas
#         ]

#         descripcion = {
#             "Mensaje": "Simulacion de liquidacion de cuotas (vista previa)",
#             "Cuotas": cuotas_info,
#             "FechaConsulta": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
#             "Simulado por": nombre_persona
#         }

#         valores_actualizados = {
#             "preview": {
#                 "Cuotas": cuotas_info,
#                 "ValorCuotaTotal": float(cuota_fomento_total),
#                 "ValorInteresesTotal": float(intereses_total),
#                 "ValorTotalAPagar": float(valor_a_pagar)
#             }
#         }

#         auditoria_data = {
#             "id_usuario": request.user.id_usuario,
#             "id_modulo": 52,
#             "cod_permiso": "CO",
#             "subsistema": "GEDE",
#             "dirip": Util.get_client_ip(request),
#             "descripcion": json.dumps(descripcion),
#             "valores_actualizados": json.dumps(valores_actualizados)
#         }

#         Util.save_auditoria(auditoria_data)

#         return Response({
#             'success': True,
#             'detail': "Vista previa de la liquidación generada.",
#             'data': liquidaciones_creadas
#         }, status=status.HTTP_200_OK)
    

class ConsultaSolicitudesLiquidacionExternoGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")

        persona_logueada = request.user.persona

        # Solo solicitudes con plan de pago en estado "RA" asociadas a la persona logueada
        solicitudes = SolicitudAcuerdosPago.objects.filter(
            planespago__estado="RA",
            id_persona_solicita=persona_logueada
        ).distinct()

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        tasa_interes_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes = tasa_interes_dian.valor if tasa_interes_dian else Decimal("0")

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        fecha_actual = timezone.now().date()

        for solicitud in page:
            persona = solicitud.id_persona_solicita
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud
            ).select_related('id_factura_unica')

            valor_total = Decimal("0")

            for detalle in detalles:
                factura = detalle.id_factura_unica
                if not factura:
                    continue

                cuota_fomento = factura.cuota_fomento
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)

                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")

                valor_total += cuota_fomento + intereses

            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('nro_plan_pago').first()
            estado_plan_pago = plan_pago.estado if plan_pago else None
            estado_plan_pago_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else estado_plan_pago

            data.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_pago.id_plan_pago if plan_pago else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.estado,
                "estado_display": solicitud.get_estado_display(),
                "estado_plan_pago": estado_plan_pago,
                "estado_plan_pago_display": estado_plan_pago_display,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
                "valor_a_pagar": round(valor_total, 5)
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes consultadas correctamente.",
            "data": data
        })

class ConsultaPlanesAcuerdosPagoLiquidacionExternoGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        nro_plan_pago = request.query_params.get('nro_plan_pago', None)

        # Solo solicitudes que tengan plan de pago en estado "RA" y sean de la persona logueada
        persona_logueada = request.user.persona
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="RA",id_persona_solicita=persona_logueada).distinct().order_by('-nro_solicitud')

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        if nro_plan_pago:
            try:
                nro_plan_pago = int(nro_plan_pago)
                solicitudes = solicitudes.filter(planespago__nro_plan_pago=nro_plan_pago)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_plan_pago' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de inicio
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de fin
        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron acuerdos de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar resultados
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })
    

class ConsultadDetallesPlanesPagoLiquidacionExternoGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
        if not plan_pago or plan_pago.estado != "RA":
            return Response({
                "success": False,
                "detail": "El plan de pago asociado a la solicitud no está en estado 'RA' (Aprobado por Recaudador)."
            }, status=status.HTTP_400_BAD_REQUEST)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            # Calcular intereses para la factura
            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            # Bandera de liquidación de la cuota
            cuota_liquidada = False
            if cuota and cuota.id_liquidacion is not None:
                cuota_liquidada = True

            # Reunir facturas de la misma solicitud
            facturas = detalles.values_list('id_factura_unica__nro_factura_unica', flat=True).distinct()
            relacion_facturas = "-".join(map(str, facturas))

            resultado.append({
                "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago if cuota else None,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_pago if cuota else None,
                "pagada": cuota.pagada if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "cuota_liquidada": cuota_liquidada,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)
    

class GetAcuerdoPagoLiquidacionExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get_doc_soporte_url(self, obj):
        if obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if len(obj.doc_solicitud.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validar que el plan de pago esté en estado "RA"
        if plan_pago.estado != "RA":
            return Response({
                "success": False,
                "detail": "El plan de pago no está en estado 'Aprobado por Recaudador' (RA)."
            }, status=status.HTTP_400_BAD_REQUEST)

        solicitud = plan_pago.id_solicitud_acuerdo_pago

        # Obtener el último nro_plan_pago para la solicitud
        ultimo_nro_plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).aggregate(
            max_nro=Max("nro_plan_pago")
        )["max_nro"] or plan_pago.nro_plan_pago

        # Obtener las cuotas de este plan
        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
        valor_total_pagar = sum(cuota.valor_cuota for cuota in cuotas)

        response_data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_plan_pago": plan_pago.id_plan_pago,
            "nro_plan_pago": plan_pago.nro_plan_pago,
            "nro_cuotas": plan_pago.nro_cuotas,
            "estado_plan_pago": plan_pago.estado,
            "estado_plan_pago_display": plan_pago.get_estado_display(),
            "observaciones_solicitud": solicitud.observaciones,
            "doc_solicitud": self.get_doc_soporte_url(solicitud),
            "fecha_solicitud": solicitud.fecha_solicitud,
            "observacion_juridica": plan_pago.observacion_juridica,
            "observacion_direccion": plan_pago.observacion_direccion,
            "fecha_aprobacion_juridica": plan_pago.fecha_aprobacion_juridica,
            "fecha_aprobacion_direccion": plan_pago.fecha_aprobacion_direccion,
            "fecha_notificacion": plan_pago.fecha_notificacion,
            "valor_total_pagar": round(valor_total_pagar, 2),
            "fecha_aprobacion": now(),
        }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": response_data
        }, status=status.HTTP_200_OK)
    
class DocumentoDetallesPlanesPagoLiquidacionExterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago if cuota else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)



#Liquidacion de cuotas de acuerdo de pago usuario interno

class ConsultaSolicitudesLiquidacionInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")
        id_persona_solicita = request.query_params.get("id_persona_solicita") 

        # Filtro estado "RA" (Aprobado por Recaudador)
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="RA").distinct()

        # Filtro adicional por persona que solicita (id_persona)
        if id_persona_solicita:
            solicitudes = solicitudes.filter(id_persona_solicita=id_persona_solicita)

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        data = []
        tasa_interes_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes = tasa_interes_dian.valor if tasa_interes_dian else Decimal("0")
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        fecha_actual = timezone.now().date()

        for solicitud in page:
            persona = solicitud.id_persona_solicita
            detalles = DetalleAcuerdoPago.objects.filter(
                id_Solicitud_acuerdo_pago=solicitud
            ).select_related('id_factura_unica')

            valor_total = Decimal("0")

            for detalle in detalles:
                factura = detalle.id_factura_unica
                if not factura:
                    continue

                cuota_fomento = factura.cuota_fomento
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except ValueError:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

                dias_mora = max((fecha_actual - fecha_limite_pago.date()).days, 0)
                intereses = (cuota_fomento * tasa_interes * Decimal(dias_mora)) / Decimal("365") if dias_mora > 0 else Decimal("0")

                valor_total += cuota_fomento + intereses

            # Calcular plan de pago individual
            plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
            estado_plan_pago = plan_pago.estado if plan_pago else None
            estado_plan_pago_display = plan_pago.get_estado_display() if plan_pago and hasattr(plan_pago, "get_estado_display") else estado_plan_pago

            data.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan_pago.id_plan_pago if plan_pago else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "nro_plan_pago": plan_pago.nro_plan_pago if plan_pago else None,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.estado,
                "estado_display": solicitud.get_estado_display(),
                "estado_plan_pago": estado_plan_pago,
                "estado_plan_pago_display": estado_plan_pago_display,
                "id_persona_solicita": persona.id_persona,
                "tipo_documento": str(persona.tipo_documento) if persona.tipo_documento else None,
                "numero_documento": persona.numero_documento,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona.tipo_persona == 'N' else persona.razon_social or ''
                ),
                "observaciones": solicitud.observaciones,
                "valor_a_pagar": round(valor_total, 5)
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes consultadas correctamente.",
            "data": data
        })
    


class ConsultaPlanesAcuerdosPagoLiquidacionInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        numero_documento = request.query_params.get('numero_documento')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        nro_plan_pago = request.query_params.get('nro_plan_pago', None) 

        # Solo solicitudes que tengan plan de pago en estado "RA" (Aprobado por Recaudador)
        solicitudes = SolicitudAcuerdosPago.objects.filter(planespago__estado="RA").distinct().order_by('-nro_solicitud')

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por número de plan de pago
        if nro_plan_pago:
            try:
                nro_plan_pago = int(nro_plan_pago)
                solicitudes = solicitudes.filter(planespago__nro_plan_pago=nro_plan_pago)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_plan_pago' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por número de documento del recaudador
        if numero_documento:
            solicitudes = solicitudes.filter(id_persona_solicita__numero_documento=numero_documento)

        # Filtro por fecha de inicio
        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtro por fecha de fin
        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron acuerdos de pago para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serializar resultados
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })


class ConsultadDetallesPlanesPagoLiquidacionInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
        if not plan_pago or plan_pago.estado != "RA":
            return Response({
                "success": False,
                "detail": "El plan de pago asociado a la solicitud no está en estado 'RA' (Aprobado por Recaudador)."
            }, status=status.HTTP_400_BAD_REQUEST)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            # Calcular intereses para la factura
            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            
            # Bandera de liquidación de la cuota
            cuota_liquidada = False
            if cuota and cuota.id_liquidacion is not None:
                cuota_liquidada = True

            # Reunir facturas de la misma solicitud
            facturas = detalles.values_list('id_factura_unica__nro_factura_unica', flat=True).distinct()
            relacion_facturas = "-".join(map(str, facturas))

            resultado.append({
                "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago if cuota else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_pago if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "cuota_liquidada": cuota_liquidada,
                "pagada": cuota.pagada if cuota else None,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)


class GetAcuerdoPagoLiquidacionInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]

    def get_doc_soporte_url(self, obj):
        if obj.doc_solicitud:
            return Util.obtener_archivos(obj.doc_solicitud.name) if len(obj.doc_solicitud.name) > 0 else None
        return None

    def get(self, request, *args, **kwargs):
        id_plan_pago = kwargs.get('id_plan_pago')

        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_plan_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_pago = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "El plan de pago no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # Validar que el plan de pago esté en estado "RA"
        if plan_pago.estado != "RA":
            return Response({
                "success": False,
                "detail": "El plan de pago no está en estado 'Aprobado por Recaudador' (RA)."
            }, status=status.HTTP_400_BAD_REQUEST)

        solicitud = plan_pago.id_solicitud_acuerdo_pago

        # Obtener el último nro_plan_pago para la solicitud
        ultimo_nro_plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).aggregate(
            max_nro=Max("nro_plan_pago")
        )["max_nro"] or plan_pago.nro_plan_pago

        # Obtener las cuotas de este plan
        cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan_pago)
        valor_total_pagar = sum(cuota.valor_cuota for cuota in cuotas)

        response_data = {
            "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
            "id_plan_pago": plan_pago.id_plan_pago,
            "nro_plan_pago": plan_pago.nro_plan_pago,
            "nro_cuotas": plan_pago.nro_cuotas,
            "estado_plan_pago": plan_pago.estado,
            "estado_plan_pago_display": plan_pago.get_estado_display(),
            "observaciones_solicitud": solicitud.observaciones,
            "doc_solicitud": self.get_doc_soporte_url(solicitud),
            "fecha_solicitud": solicitud.fecha_solicitud,
            "observacion_juridica": plan_pago.observacion_juridica,
            "observacion_direccion": plan_pago.observacion_direccion,
            "fecha_aprobacion_juridica": plan_pago.fecha_aprobacion_juridica,
            "fecha_aprobacion_direccion": plan_pago.fecha_aprobacion_direccion,
            "fecha_notificacion": plan_pago.fecha_notificacion,
            "valor_total_pagar": round(valor_total_pagar, 2),
            "fecha_aprobacion": now(),
        }

        return Response({
            "success": True,
            "detail": "Datos obtenidos correctamente.",
            "data": response_data
        }, status=status.HTTP_200_OK)


class DocumentoDetallesPlanesPagoLiquidacionInterno(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        telefono_recaudador = persona.telefono_celular if persona.tipo_persona == 'N' else persona.telefono_celular_empresa
        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        # Arreglo 1: información del recaudador
        recaudador_info = {
            "tipo_documento_recaudador": tipo_documento,
            "numero_documento_recaudador": numero_documento,
            "nombre_recaudador": nombre_recaudador,
            "direccion_recaudador": persona.direccion_notificaciones,
            "telefono_recaudador": telefono_recaudador,
        }

        # Arreglo 2: detalles del plan de pago
        detalle_plan_pago = []
        valor_total = Decimal("0")
        fecha_actual = now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica
            if not factura:
                continue

            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            detalle_plan_pago.append({
                "id_solicitud": solicitud.id_solicitud_acuerdo_pago,
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago if cuota else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "fecha_pago": cuota.fecha_vencimiento if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "valor_factura": round(valor_factura, 5)
            })

        # Arreglo 3: valor total a pagar
        valor_total_data = {
            "valor_a_pagar": round(valor_total, 5)
        }

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "recaudador": recaudador_info,
            "detalle_plan_pago": detalle_plan_pago,
            "valor_total": valor_total_data
        }, status=status.HTTP_200_OK)


class CreateLiquidacionAcuerdoPagoInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoCrearLiquidacionCuotasAcuerdoPagoInterno]
    serializer_class = LiquidacionFacturaSerializer

    @transaction.atomic  
    def post(self, request, *args, **kwargs):
        usuario = request.user
        data = request.data

        # Validación de actualización del Porcentaje de Interés (PI)
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        now_date = timezone.now().date()
        
        ids_cuotas = data.get('id_cuotas', [])
        if not ids_cuotas or not isinstance(ids_cuotas, list):
            return Response({
                'success': False,
                'detail': "Se debe proporcionar un arreglo de IDs de cuotas en el campo 'id_cuotas'."
            }, status=status.HTTP_400_BAD_REQUEST)

        cuotas = CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).select_related('id_plan_pago')
        if cuotas.count() != len(ids_cuotas):
            return Response({
                'success': False,
                'detail': "Alguna de las cuotas no existe."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que todas las cuotas pertenezcan a un plan en estado "RA"
        for cuota in cuotas:
            if not cuota.id_plan_pago or cuota.id_plan_pago.estado != "RA":
                return Response({
                    'success': False,
                    'detail': f"La cuota {cuota.nro_cuota} no pertenece a un plan de pago en estado 'RA'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Buscar todas las facturas asociadas a las cuotas recibidas
        detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas)
        ids_facturas = list(detalles.values_list('id_factura_unica', flat=True))
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron facturas asociadas a las cuotas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si alguna factura genera intereses
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        fecha_actual = now_date
        alguna_tiene_intereses = False
        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        # Paso 2: Calcular los valores globales
        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []
        facturas_no_liquidables = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            # Obtener el valor de 'dias_pago_interes' desde la tabla FechasCierre
            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el valor de 'dias_pago' desde la tabla FechasCierre
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular la fecha límite de pago sin intereses
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            # Calcular la fecha límite de pago con intereses
            try:
                fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
            except ValueError:
                fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
                if fecha_limite_pago_interes.day < fecha_limite_pago.day:
                    fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)

            # Validar si la liquidación puede generarse
            fecha_actual = timezone.now().date() 
            if fecha_actual > fecha_limite_pago_interes.date():
                facturas_no_liquidables.append({
                    "id_factura_unica": factura.id_factura_unica,
                    "nro_factura_unica": factura.nro_factura_unica,
                    "fecha_compra": factura.fecha_compra,
                    "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
                })
                continue  

            # Calcular días de mora
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            # Calcular los intereses individuales
            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses_x_factura

            detalles_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador = factura.id_persona_recaudador
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular if recaudador and recaudador.telefono_celular else recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J':
                if recaudador.representante_legal:
                    persona_rl = recaudador.representante_legal
                    representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
                else:
                    representante_legal = persona_rl.razon_social

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 6),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(sum(detalle.valor_kilo for detalle in detalles_factura) / len(detalles_factura), 2) if detalles_factura else 0,
                "detalles": [{
                    "nro_kilos": detalle.nro_kilos,
                    "valor_kilo": detalle.valor_kilo
                } for detalle in detalles_factura],
            })

        # if facturas_no_liquidables:
        #     return Response({
        #         "success": False,
        #         "detail": "No se puede generar la liquidación de la Cuota de Fomento Cacaotero de las siguientes facturas.",
        #         "facturas_no_liquidables": facturas_no_liquidables
        #     }, status=status.HTTP_400_BAD_REQUEST)

        # Calcular el valor total a pagar
        valor_a_pagar = cuota_fomento_total + intereses_total

        # Actualizar los valores globales en cada factura
        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
            })

        # Paso 4: Crear la liquidación general
        try:
            doc_pago_id = data.get('doc_pago_id')
            doc_pago = DocumentosGenerados.objects.filter(id_documento_generado=doc_pago_id).first()
            if not doc_pago:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no es válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if not doc_pago.consecutivo:
                return Response({
                    'success': False,
                    'detail': "El documento de pago no tiene un consecutivo válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                return Response({
                    'success': False,
                    'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                }, status=status.HTTP_400_BAD_REQUEST)

            codigo_barras = data.get('codigo_barras', None)
            if not codigo_barras:
                return Response({
                    'success': False,
                    'detail': "El código de barras es obligatorio."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Si hay facturas a reliquidar, actualizar la liquidación existente
            if facturas_a_reliquidar.exists():
                liquidacion = facturas_a_reliquidar.first().id_liq_factura_unica
                doc_anterior = liquidacion.doc_pago
                # Actualizar la liquidación con el nuevo doc_pago y datos
                liquidacion.doc_pago = doc_pago
                liquidacion.nro_doc_pago = doc_pago.consecutivo
                liquidacion.valor_pagar = valor_a_pagar
                liquidacion.valor_intereses = intereses_total
                liquidacion.fecha_liquidacion = timezone.now()
                liquidacion.id_persona_liquida = request.user.persona
                liquidacion.codigo_barras = codigo_barras
                liquidacion.save()
                # Eliminar el documento anterior si es diferente al nuevo
                if doc_anterior and doc_anterior != doc_pago:
                    doc_anterior.delete()
                # Actualizar las cuotas y facturas para que apunten a la liquidación actualizada
                CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).update(id_liquidacion=liquidacion)
                facturas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo
            else:
                # Crear una nueva liquidación si todas son nuevas
                if LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=doc_pago.consecutivo).exists():
                    return Response({
                        'success': False,
                        'detail': f"El número de documento de pago '{doc_pago.consecutivo}' ya existe en otra liquidación."
                    }, status=status.HTTP_400_BAD_REQUEST)
                liquidacion = LiquidacionesFacturaUnica.objects.create(
                    cod_estado="L",
                    nro_doc_pago=doc_pago.consecutivo,
                    fecha_pago=None,
                    valor_pagar=valor_a_pagar,
                    valor_intereses=intereses_total,
                    fecha_liquidacion=timezone.now(),
                    id_persona_liquida=request.user.persona,
                    doc_pago=doc_pago,
                    codigo_barras=codigo_barras,
                )
                CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).update(id_liquidacion=liquidacion)
                facturas.update(id_liq_factura_unica=liquidacion)
                nro_doc_pago = doc_pago.consecutivo

            # Actualizar los valores globales en cada factura con el número de documento de pago
            for liquidacion_creada in liquidaciones_creadas:
                liquidacion_creada.update({
                    "nro_doc_pago": nro_doc_pago,
                })
                
            # Enviar correo y SMS por cada factura
            fecha_actual_formateada = timezone.now().strftime('%d-%b-%Y')

            for factura in facturas:
                recaudador = factura.id_persona_recaudador

                # Nombre del recaudador (natural o jurídico)
                if recaudador.tipo_persona == 'N':
                    nombre_de_usuario = f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
                else:
                    nombre_de_usuario = recaudador.razon_social

                total_kilos_formateado = f"{factura.total_kilos:,.0f}"
                valor_fomento_formateado = f"${factura.cuota_fomento:,.0f}"

                # Actualizar las facturas con la liquidación creada
                factura.estado_factura = "LQ"
                factura.save()

                # Asunto del correo
                subject = f"Liquidación Cuota Acuerdo Pago Registrada - Plan de Pago N° {cuota.id_plan_pago.nro_plan_pago}"
                template = "liquidacion-acuerdo-pago.html"

                # Enviar email (si tiene correo)
                if recaudador.email:
                    Util.notificacion(
                        recaudador,
                        subject,
                        template,
                        fecha_liquidacion=fecha_actual_formateada,
                        nro_solicitud=cuota.id_plan_pago.id_solicitud_acuerdo_pago.nro_solicitud,
                        nro_plan_pago=cuota.id_plan_pago.nro_plan_pago,
                        nro_cuota=cuota.nro_cuota,
                        numero_factura=factura.nro_factura_unica,
                        cantidad_kilos=total_kilos_formateado,
                        valor_cuota_formateado = f"{cuota.valor_cuota:,.0f}",
                        nombre_de_usuario=nombre_de_usuario
                    )

                # Enviar SMS (si tiene teléfono)
                sms = (
                    f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                    f"Plan de Pago N° {cuota.id_plan_pago.nro_plan_pago} liquidado. "
                    f"N° de Cuota: {cuota.nro_cuota}. "
                    f"Valor cuota: ${cuota.valor_cuota:,.0f}."
                )

                telefono_recaudador = recaudador.telefono_celular or recaudador.telefono_empresa
                if telefono_recaudador:
                    Util.send_sms(telefono_recaudador, sms)

            # Auditoria
            persona = request.user.persona
            nombre_persona = (
                f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
                if persona and persona.tipo_persona == 'N'
                else persona.razon_social if persona and persona.tipo_persona == 'J'
                else "Usuario desconocido"
            )

            descripcion = {
                "Mensaje": "Liquidacion creada internamente",
                "NroDocPago": liquidacion.nro_doc_pago,
                "ValorPagar": float(liquidacion.valor_pagar),
                "ValorIntereses": float(liquidacion.valor_intereses),
                "Facturas": [f.nro_factura_unica for f in facturas],
                "Registrado por": nombre_persona
            }

            valores_actualizados = {
                "create": {
                    "Nuevo": {
                        "NroDocPago": liquidacion.nro_doc_pago,
                        "ValorPagar": float(liquidacion.valor_pagar),
                        "ValorIntereses": float(liquidacion.valor_intereses),
                        "FechaLiquidacion": liquidacion.fecha_liquidacion.strftime('%Y-%m-%d %H:%M:%S'),
                        "Facturas": [f.id_factura_unica for f in facturas]
                    }
                }
            }

            auditoria_data = {
                "id_usuario": request.user.id_usuario,
                "id_modulo": 11, 
                "cod_permiso": "CR",
                "subsistema": "RECA",
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)

            return Response({
                'success': True,
                'detail': "Liquidación creada correctamente para las cuotas.",
                'data': liquidaciones_creadas
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f"Error al crear la liquidación: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetLiquidacionDocumentoAcuerdoPagoInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]

    def get(self, request, *args, **kwargs):
        try:
            id_cuotas_raw = request.query_params.get('id_cuotas', '[]')
            id_cuotas_list = json.loads(id_cuotas_raw)
            if not isinstance(id_cuotas_list, list):
                raise ValueError
            id_cuotas_list = [int(x) for x in id_cuotas_list]
        except (json.JSONDecodeError, ValueError, TypeError):
            return Response({
                'success': False,
                'detail': "El parámetro 'id_cuotas' debe ser un arreglo válido de enteros, por ejemplo: [33,34,35]"
            }, status=status.HTTP_400_BAD_REQUEST)

        request._full_data = {
            'id_cuotas': id_cuotas_list,
            'doc_pago_id': request.query_params.get('doc_pago_id'),
            'codigo_barras': request.query_params.get('codigo_barras')
        }

        return self.post(request)

    def post(self, request, *args, **kwargs):
        data = getattr(request, '_full_data', request.data)

        # Validación de actualización del Porcentaje de Interés (PI)
        MESES_ES = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        now_date = timezone.now().date()

        ids_cuotas = data.get('id_cuotas', [])
        doc_pago_id = data.get('doc_pago_id')
        codigo_barras = data.get('codigo_barras')

        if not ids_cuotas:
            return Response({
                'success': False,
                'detail': "Se deben proporcionar IDs de cuotas."
            }, status=status.HTTP_400_BAD_REQUEST)

        cuotas = CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).select_related('id_plan_pago')
        if cuotas.count() != len(ids_cuotas):
            return Response({
                'success': False,
                'detail': "Alguna de las cuotas no existe."
            }, status=status.HTTP_400_BAD_REQUEST)


        # Validar que todas las cuotas pertenezcan a un plan en estado "RA"
        for cuota in cuotas:
            if not cuota.id_plan_pago or cuota.id_plan_pago.estado != "RA":
                return Response({
                    'success': False,
                    'detail': f"La cuota {cuota.nro_cuota} no pertenece a un plan de pago en estado 'RA'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Buscar todas las facturas asociadas a las cuotas recibidas
        detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas)
        ids_facturas = list(detalles.values_list('id_factura_unica', flat=True))
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)

        if not facturas.exists():
            return Response({
                'success': False,
                'detail': "No se encontraron facturas asociadas a las cuotas proporcionadas."
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si alguna factura genera intereses
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
        fecha_actual = now_date
        alguna_tiene_intereses = False
        for factura in facturas:
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            if fecha_actual > fecha_limite_pago_date:
                alguna_tiene_intereses = True
                break

        # Solo si alguna factura tiene intereses, validar PI actualizado
        if alguna_tiene_intereses:
            historial_pi = HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").order_by('-fecha_actualizacion').first()
            mes_actual = MESES_ES[now_date.month]
            if not historial_pi or historial_pi.fecha_actualizacion.month != now_date.month or historial_pi.fecha_actualizacion.year != now_date.year:
                return Response({
                    "success": False,
                    "detail": f"El Porcentaje de Interés (PI) no ha sido actualizado en el mes actual ({mes_actual}). Por favor, se debe actualizar por parte de un administrador."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si alguna factura ya tiene una liquidación PAGADA
        facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
        facturas_pagadas = facturas_liquidadas.filter(id_liq_factura_unica__cod_estado="P")
        if facturas_pagadas.exists():
            facturas_pagadas_numeros = facturas_pagadas.values_list('nro_factura_unica', flat=True)
            return Response({
                'success': False,
                'detail': f"Las siguientes facturas ya tienen una liquidación en estado PAGADO y no pueden liquidarse: {list(facturas_pagadas_numeros)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si hay facturas liquidadas pero NO pagadas, se deben reliquidar
        facturas_a_reliquidar = facturas_liquidadas.exclude(id_liq_factura_unica__cod_estado="P")
        facturas_nuevas = facturas.filter(id_liq_factura_unica__isnull=True)

        # # Validar si alguna cuota tiene todas sus facturas liquidadas
        # cuotas_con_facturas_liquidadas = []
        # for cuota in cuotas:
        #     detalles_cuota = detalles.filter(id_cuota_acuerdo_pago=cuota)
        #     facturas_cuota = FacturaUnica.objects.filter(id_factura_unica__in=detalles_cuota.values_list('id_factura_unica', flat=True))
        #     if facturas_cuota.exists() and facturas_cuota.filter(id_liq_factura_unica__isnull=False).count() == facturas_cuota.count():
        #         cuotas_con_facturas_liquidadas.append({
        #             "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
        #             "nro_cuota": cuota.nro_cuota
        #         })
        # if cuotas_con_facturas_liquidadas:
        #     return Response({
        #         'success': False,
        #         'detail': "Las siguientes cuotas tienen todas sus facturas liquidadas.",
        #         'cuotas_liquidadas': cuotas_con_facturas_liquidadas
        #     }, status=status.HTTP_400_BAD_REQUEST)

        cuota_fomento_total = 0
        intereses_total = 0
        liquidaciones_creadas = []

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago_interes', flat=True).first()
            if dias_pago_interes is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
            if dias_pago is None:
                return Response({
                    'success': False,
                    'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
                }, status=status.HTTP_400_BAD_REQUEST)

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)

            fecha_actual = timezone.now().date()
            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            intereses_x_factura = 0
            if fecha_actual > fecha_limite_pago.date():
                porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
                if not porcentaje_cobro:
                    return Response({
                        'success': False,
                        'detail': "No se encontró la tasa de interés de la DIAN."
                    }, status=status.HTTP_400_BAD_REQUEST)

                tasa_interes_dian = porcentaje_cobro.valor
                intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

            intereses_total += intereses_x_factura

            detalles_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
            recaudador = factura.id_persona_recaudador
            proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
            recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
            tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
            numero_documento_recaudador = recaudador.numero_documento if recaudador else None
            telefono = recaudador.telefono_celular or recaudador.telefono_empresa if recaudador else None
            direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
            representante_legal = None
            if recaudador and recaudador.tipo_persona == 'J' and recaudador.representante_legal:
                persona_rl = recaudador.representante_legal
                representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None

            detalle_cuota = detalles.filter(id_factura_unica=factura).first()
            nro_cuota = detalle_cuota.id_cuota_acuerdo_pago.nro_cuota if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None
            fecha_vencimiento = detalle_cuota.id_cuota_acuerdo_pago.fecha_vencimiento if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None

            liquidaciones_creadas.append({
                "id_factura_unica": factura.id_factura_unica,
                "nro_factura_unica": factura.nro_factura_unica,
                "numero_documento_proveedor": proveedor_documento,
                "fecha_creacion_factura": factura.fecha_creacion,
                "fecha_compra": factura.fecha_compra,
                "fecha_actual": timezone.now(),
                "cuota_fomento": factura.cuota_fomento,
                "intereses_x_factura": round(intereses_x_factura, 6),
                "dias_mora": dias_mora,
                "fecha_limite_pago": fecha_limite_pago,
                "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
                "recaudador_nombre": recaudador_nombre,
                "tipo_documento_recaudador": tipo_documento_recaudador,
                "numero_documento_recaudador": numero_documento_recaudador,
                "telefono_recaudador": telefono,
                "direccion_recaudador": direccion,
                "representante_legal": representante_legal,
                "total_kilos": factura.total_kilos,
                "promedio_valor_kilo": round(
                    sum(detalle.valor_kilo for detalle in detalles_factura) / len(detalles_factura), 2
                ) if detalles_factura else 0,
                "detalles": [{
                    "nro_kilos": detalle.nro_kilos,
                    "valor_kilo": detalle.valor_kilo
                } for detalle in detalles_factura],
                "nro_cuota": nro_cuota,
                "fecha_vencimiento": fecha_vencimiento,
            })

        valor_a_pagar = cuota_fomento_total + intereses_total

        for liquidacion in liquidaciones_creadas:
            liquidacion.update({
                "valor_intereses_total": round(intereses_total),
                "cuota_fomento_total": round(cuota_fomento_total),
                "valor_a_pagar": round(valor_a_pagar),
                "fecha_liquidacion": timezone.now(),
                "nro_doc_pago": doc_pago_id,
                "codigo_barras": codigo_barras
            })

        persona = request.user.persona
        nombre_persona = (
            f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            if persona and persona.tipo_persona == 'N'
            else persona.razon_social if persona and persona.tipo_persona == 'J'
            else "Usuario desconocido"
        )

        cuotas_info = [
            {
                "id_cuota_acuerdo_pago": c.id_cuota_acuerdo_pago,
                "nro_cuota": c.nro_cuota
            } for c in cuotas
        ]

        descripcion = {
            "Mensaje": "Simulacion de liquidacion de cuotas (vista previa)",
            "Cuotas": cuotas_info,
            "FechaConsulta": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Simulado por": nombre_persona
        }

        valores_actualizados = {
            "preview": {
                "Cuotas": cuotas_info,
                "ValorCuotaTotal": float(cuota_fomento_total),
                "ValorInteresesTotal": float(intereses_total),
                "ValorTotalAPagar": float(valor_a_pagar)
            }
        }

        auditoria_data = {
            "id_usuario": request.user.id_usuario,
            "id_modulo": 52,
            "cod_permiso": "CO",
            "subsistema": "GEDE",
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }

        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': "Vista previa de la liquidación generada.",
            'data': liquidaciones_creadas
        }, status=status.HTTP_200_OK)


# class GetLiquidacionDocumentoAcuerdoPagoInternoView(APIView):
#     permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno]

#     def get(self, request, *args, **kwargs):
#         try:
#             id_cuotas_raw = request.query_params.get('id_cuotas', '[]')
#             id_cuotas_list = json.loads(id_cuotas_raw)
#             if not isinstance(id_cuotas_list, list):
#                 raise ValueError
#             id_cuotas_list = [int(x) for x in id_cuotas_list]
#         except (json.JSONDecodeError, ValueError, TypeError):
#             return Response({
#                 'success': False,
#                 'detail': "El parámetro 'id_cuotas' debe ser un arreglo válido de enteros, por ejemplo: [33,34,35]"
#             }, status=status.HTTP_400_BAD_REQUEST)

#         request._full_data = {
#             'id_cuotas': id_cuotas_list,
#             'doc_pago_id': request.query_params.get('doc_pago_id'),
#             'codigo_barras': request.query_params.get('codigo_barras')
#         }

#         return self.post(request)

#     def post(self, request, *args, **kwargs):
#         data = getattr(request, '_full_data', request.data)

#         ids_cuotas = data.get('id_cuotas', [])
#         doc_pago_id = data.get('doc_pago_id')
#         codigo_barras = data.get('codigo_barras')

#         if not ids_cuotas:
#             return Response({
#                 'success': False,
#                 'detail': "Se deben proporcionar IDs de cuotas."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         cuotas = CuotasAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas).select_related('id_plan_pago')
#         if cuotas.count() != len(ids_cuotas):
#             return Response({
#                 'success': False,
#                 'detail': "Alguna de las cuotas no existe."
#             }, status=status.HTTP_400_BAD_REQUEST)

#         for cuota in cuotas:
#             if not cuota.id_plan_pago or cuota.id_plan_pago.estado != "RA":
#                 return Response({
#                     'success': False,
#                     'detail': f"La cuota {cuota.nro_cuota} no pertenece a un plan de pago en estado 'RA'."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#         # Buscar todas las facturas asociadas a las cuotas recibidas
#         detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=ids_cuotas)
#         ids_facturas = list(detalles.values_list('id_factura_unica', flat=True))
#         facturas = FacturaUnica.objects.filter(id_factura_unica__in=ids_facturas)
#         if not facturas.exists():
#             return Response({
#                 'success': False,
#                 'detail': "No se encontraron facturas asociadas a las cuotas proporcionadas."
#             }, status=status.HTTP_404_NOT_FOUND)

#         # Validar si alguna factura ya tiene una liquidación
#         facturas_liquidadas = facturas.filter(id_liq_factura_unica__isnull=False)
#         if facturas_liquidadas.exists():
#             facturas_liquidadas_numeros = facturas_liquidadas.values_list('nro_factura_unica', flat=True)
#             return Response({
#                 'success': False,
#                 'detail': f"Las siguientes facturas ya tienen una liquidación asociada: {list(facturas_liquidadas_numeros)}"
#             }, status=status.HTTP_400_BAD_REQUEST)

#         cuota_fomento_total = 0
#         intereses_total = 0
#         liquidaciones_creadas = []
#         facturas_no_liquidables = []

#         for factura in facturas:
#             cuota_fomento_total += factura.cuota_fomento

#             dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CA").values_list('dias_pago_interes', flat=True).first()
#             if dias_pago_interes is None:
#                 return Response({
#                     'success': False,
#                     'detail': "No se encontró la configuración de 'dias_pago_interes' en la tabla FechasCierre."
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CA").values_list('dias_pago', flat=True).first()
#             if dias_pago is None:
#                 return Response({
#                     'success': False,
#                     'detail': "No se encontró la configuración de 'dias_pago' en la tabla FechasCierre."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             mes_siguiente = factura.fecha_compra + relativedelta(months=1)
#             try:
#                 fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
#             except ValueError:
#                 primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
#                 fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

#             try:
#                 fecha_limite_pago_interes = fecha_limite_pago + timedelta(days=dias_pago_interes)
#             except ValueError:
#                 fecha_limite_pago_interes = fecha_limite_pago + relativedelta(days=dias_pago_interes)
#                 if fecha_limite_pago_interes.day < fecha_limite_pago.day:
#                     fecha_limite_pago_interes = fecha_limite_pago_interes + relativedelta(day=31)
            
#             fecha_actual = timezone.now().date()  
#             if fecha_actual > fecha_limite_pago_interes.date():
#                 facturas_no_liquidables.append({
#                     "id_factura_unica": factura.id_factura_unica,
#                     "nro_factura_unica": factura.nro_factura_unica,
#                     "fecha_compra": factura.fecha_compra,
#                     "fecha_limite_pago_interes": fecha_limite_pago_interes.date()
#                 })
#                 continue

#             fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
#             dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            
#             intereses_x_factura = 0
#             if fecha_actual > fecha_limite_pago.date():
#                 porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
#                 if not porcentaje_cobro:
#                     return Response({
#                         'success': False,
#                         'detail': "No se encontró la tasa de interés de la DIAN."
#                     }, status=status.HTTP_400_BAD_REQUEST)

#                 tasa_interes_dian = porcentaje_cobro.valor
#                 intereses_x_factura = (factura.cuota_fomento * tasa_interes_dian * dias_mora) / 365

#             intereses_total += intereses_x_factura

#             detalles_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=factura.id_factura_unica)
#             recaudador = factura.id_persona_recaudador
#             proveedor_documento = factura.id_persona_proveedor.numero_documento if factura.id_persona_proveedor else None
#             recaudador_nombre = f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip() if recaudador and recaudador.tipo_persona == "N" else recaudador.razon_social if recaudador else None
#             tipo_documento_recaudador = str(recaudador.tipo_documento) if recaudador and recaudador.tipo_documento else None
#             numero_documento_recaudador = recaudador.numero_documento if recaudador else None
#             telefono = recaudador.telefono_celular or recaudador.telefono_empresa if recaudador else None
#             direccion = recaudador.direccion_residencia if recaudador and recaudador.tipo_persona == "N" else recaudador.direccion_laboral if recaudador else None
#             representante_legal = None
#             if recaudador and recaudador.tipo_persona == 'J':
#                 if recaudador.representante_legal:
#                     persona_rl = recaudador.representante_legal
#                     representante_legal = f"{persona_rl.primer_nombre} {persona_rl.primer_apellido}" if persona_rl else None
#                 else:
#                     representante_legal = persona_rl.razon_social

#             # Buscar la cuota asociada a esta factura
#             detalle_cuota = detalles.filter(id_factura_unica=factura).first()
#             nro_cuota = detalle_cuota.id_cuota_acuerdo_pago.nro_cuota if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None
#             fecha_vencimiento = detalle_cuota.id_cuota_acuerdo_pago.fecha_vencimiento if detalle_cuota and detalle_cuota.id_cuota_acuerdo_pago else None

#             liquidaciones_creadas.append({
#                 "id_factura_unica": factura.id_factura_unica,
#                 "nro_factura_unica": factura.nro_factura_unica,
#                 "numero_documento_proveedor": proveedor_documento,
#                 "fecha_creacion_factura": factura.fecha_creacion,
#                 "fecha_compra": factura.fecha_compra,
#                 "fecha_actual": timezone.now(),
#                 "cuota_fomento": factura.cuota_fomento,
#                 "intereses_x_factura": round(intereses_x_factura, 6),
#                 "dias_mora": dias_mora,
#                 "fecha_limite_pago": fecha_limite_pago,
#                 "fecha_limite_pago_intereses": timezone.now() if intereses_x_factura > 0 else fecha_limite_pago_interes,
#                 "recaudador_nombre": recaudador_nombre,
#                 "tipo_documento_recaudador": tipo_documento_recaudador,
#                 "numero_documento_recaudador": numero_documento_recaudador,
#                 "telefono_recaudador": telefono,
#                 "direccion_recaudador": direccion,
#                 "representante_legal": representante_legal,
#                 "total_kilos": factura.total_kilos,
#                 "promedio_valor_kilo": round(
#                     sum(detalle.valor_kilo for detalle in detalles_factura) / len(detalles_factura), 2
#                 ) if detalles_factura else 0,
#                 "detalles": [{
#                     "nro_kilos": detalle.nro_kilos,
#                     "valor_kilo": detalle.valor_kilo
#                 } for detalle in detalles_factura],
#                 "nro_cuota": nro_cuota,
#                 "fecha_vencimiento": fecha_vencimiento,
#             })

#         valor_a_pagar = cuota_fomento_total + intereses_total

#         for liquidacion in liquidaciones_creadas:
#             liquidacion.update({
#                 "valor_intereses_total": round(intereses_total),
#                 "cuota_fomento_total": round(cuota_fomento_total),
#                 "valor_a_pagar": round(valor_a_pagar),
#                 "fecha_liquidacion": timezone.now(),
#                 "nro_doc_pago": doc_pago_id,
#                 "codigo_barras": codigo_barras
#             })

#         if facturas_no_liquidables:
#             return Response({
#                 "success": False,
#                 "detail": "No se puede generar la liquidación de la Cuota de Fomento Cacaotero de las siguientes facturas.",
#                 "facturas_no_liquidables": facturas_no_liquidables
#             }, status=status.HTTP_400_BAD_REQUEST)

#         # Auditoria
#         persona = request.user.persona
#         nombre_persona = (
#             f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
#             if persona and persona.tipo_persona == 'N'
#             else persona.razon_social if persona and persona.tipo_persona == 'J'
#             else "Usuario desconocido"
#         )

#         cuotas_info = [
#             {
#                 "id_cuota_acuerdo_pago": c.id_cuota_acuerdo_pago,
#                 "nro_cuota": c.nro_cuota
#             } for c in cuotas
#         ]

#         descripcion = {
#             "Mensaje": "Simulacion de liquidacion de cuotas (vista previa)",
#             "Cuotas": cuotas_info,
#             "FechaConsulta": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
#             "Simulado por": nombre_persona
#         }

#         valores_actualizados = {
#             "preview": {
#                 "Cuotas": cuotas_info,
#                 "ValorCuotaTotal": float(cuota_fomento_total),
#                 "ValorInteresesTotal": float(intereses_total),
#                 "ValorTotalAPagar": float(valor_a_pagar)
#             }
#         }

#         auditoria_data = {
#             "id_usuario": request.user.id_usuario,
#             "id_modulo": 52,
#             "cod_permiso": "CO",
#             "subsistema": "GEDE",
#             "dirip": Util.get_client_ip(request),
#             "descripcion": json.dumps(descripcion),
#             "valores_actualizados": json.dumps(valores_actualizados)
#         }

#         Util.save_auditoria(auditoria_data)

#         return Response({
#             'success': True,
#             'detail': "Vista previa de la liquidación generada.",
#             'data': liquidaciones_creadas
#         }, status=status.HTTP_200_OK)


class ConsultaSolicitudesConCuotasLiquidadasExternoGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        estado = request.query_params.get("estado")
        nro_solicitud = request.query_params.get("nro_solicitud")
        fecha_desde = request.query_params.get("fecha_desde")
        fecha_hasta = request.query_params.get("fecha_hasta")

        persona_logueada = request.user.persona

        # Solicitudes con al menos una cuota liquidada (factura con id_liq_factura_unica no nulo)
        solicitudes = SolicitudAcuerdosPago.objects.filter(
            estado="RA",
            id_persona_solicita=persona_logueada,
            detalleacuerdopago__id_factura_unica__id_liq_factura_unica__isnull=False
        ).distinct()

        if estado:
            solicitudes = solicitudes.filter(estado=estado)

        if nro_solicitud:
            solicitudes = solicitudes.filter(nro_solicitud=nro_solicitud)

        if fecha_desde:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                solicitudes = solicitudes.filter(fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(solicitudes.order_by("-fecha_solicitud"), request)
        if page is None:
            return paginator.get_paginated_response([])

        # Puedes usar el mismo serializer que en la vista original
        serializer = SolicitudAcuerdoPagoSerializer(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Solicitudes con cuotas liquidadas encontradas correctamente.",
            "data": serializer.data
        })


class ConsultaPlanesAcuerdosPagoPSEExternoGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        nro_plan_pago = request.query_params.get('nro_plan_pago', None)

        persona_logueada = request.user.persona

        planes_pago = PlanesPago.objects.filter(
            estado="RA",
            id_solicitud_acuerdo_pago__id_persona_solicita=persona_logueada,
            cuotasacuerdopago__detalleacuerdopago__id_factura_unica__id_liq_factura_unica__isnull=False
        ).distinct().order_by('-nro_plan_pago')

        if estado:
            planes_pago = planes_pago.filter(id_solicitud_acuerdo_pago__estado=estado)

        if nro_solicitud:
            try:
                nro_solicitud = int(nro_solicitud)
                planes_pago = planes_pago.filter(id_solicitud_acuerdo_pago__nro_solicitud=nro_solicitud)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_solicitud' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        if nro_plan_pago:
            try:
                nro_plan_pago = int(nro_plan_pago)
                planes_pago = planes_pago.filter(nro_plan_pago=nro_plan_pago)
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'nro_plan_pago' debe ser un número entero."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_desde:
            try:
                planes_pago = planes_pago.filter(id_solicitud_acuerdo_pago__fecha_solicitud__date__gte=parse_date(fecha_desde))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_desde'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        if fecha_hasta:
            try:
                planes_pago = planes_pago.filter(id_solicitud_acuerdo_pago__fecha_solicitud__date__lte=parse_date(fecha_hasta))
            except Exception:
                return Response({
                    "success": False,
                    "detail": "Formato inválido para 'fecha_hasta'. Debe ser YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(planes_pago, request)
        if page is None:
            return Response({
                "success": False,
                "detail": "No se encontraron planes de pago con cuotas liquidadas para los filtros aplicados."
            }, status=status.HTTP_404_NOT_FOUND)

        resultado = []
        for plan in page:
            solicitud = plan.id_solicitud_acuerdo_pago
            persona = solicitud.id_persona_solicita if solicitud else None

            # Facturas asociadas a este plan
            cuotas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan)
            detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago__in=cuotas)
            facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

            cuota_fomento_total = sum([f.cuota_fomento for f in facturas])
            intereses_total = 0
            dias_mora = 0

            # Calcular intereses_total y dias_mora (máximo de las facturas)
            fecha_actual = timezone.now().date()
            dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
            porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
            tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else 0

            facturas_info = []
            for factura in facturas:
                mes_siguiente = factura.fecha_compra + relativedelta(months=1)
                try:
                    fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
                except Exception:
                    primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                    fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)
                fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
                dias_mora_factura = max((fecha_actual - fecha_limite_pago_date).days, 0)
                dias_mora = max(dias_mora, dias_mora_factura)
                intereses = 0
                if dias_mora_factura > 0 and tasa_interes_dian:
                    intereses = (factura.cuota_fomento * tasa_interes_dian * dias_mora_factura) / 365
                intereses_total += intereses

                # Buscar documento de liquidación asociado a la factura
                doc_pago_url = None
                if factura.id_liq_factura_unica and factura.id_liq_factura_unica.doc_pago:
                    doc_pago = factura.id_liq_factura_unica.doc_pago
                    if hasattr(doc_pago, "documento_generado") and doc_pago.documento_generado:
                        doc_pago_url = Util.obtener_archivos(doc_pago.documento_generado.name)
                
                #Buscar documento de liquidacion asociado a la factura
                doc_liquidacion_url = None
                for factura in facturas:
                    if factura.id_liq_factura_unica and factura.id_liq_factura_unica.doc_pago:
                        doc_pago = factura.id_liq_factura_unica.doc_pago
                        if hasattr(doc_pago, "documento_generado") and doc_pago.documento_generado:
                            doc_liquidacion_url = Util.obtener_archivos(doc_pago.documento_generado.name)

                facturas_info.append({
                    "id_factura_unica": factura.id_factura_unica,
                    "nro_factura_unica": factura.nro_factura_unica,
                    "doc_pago_url": doc_pago_url,
                    # "doc_liquidacion_url": doc_liquidacion_url

                })

            # Agregar arreglo de cuotas liquidadas asociadas a este plan de pago, ordenadas ascendentemente
            cuotas_liquidadas_qs = (
                CuotasAcuerdoPago.objects.filter(
                    id_plan_pago=plan,
                    detalleacuerdopago__id_factura_unica__id_liq_factura_unica__isnull=False
                )
                .distinct()
                .order_by('nro_cuota')
            )
            cuotas_liquidadas = []
            for cuota in cuotas_liquidadas_qs:
                # Todas las facturas asociadas a la cuota
                detalles_cuota = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago=cuota)
                facturas_cuota = FacturaUnica.objects.filter(id_factura_unica__in=detalles_cuota.values_list('id_factura_unica', flat=True))
                # Está liquidada si todas las facturas asociadas tienen id_liq_factura_unica no nulo
                liquidada = facturas_cuota.exists() and not facturas_cuota.filter(id_liq_factura_unica__isnull=True).exists()
                cuotas_liquidadas.append({
                    'id_solicitud_acuerdo_pago': solicitud.id_solicitud_acuerdo_pago if solicitud else None,
                    'id_plan_pago': plan.id_plan_pago,
                    'nro_solicitud': solicitud.nro_solicitud if solicitud else None,
                    'nro_plan_pago': plan.nro_plan_pago,
                    'id_cuota_acuerdo_pago': cuota.id_cuota_acuerdo_pago,
                    'nro_cuota': cuota.nro_cuota,
                    'fecha_vencimiento': cuota.fecha_vencimiento,
                    'fecha_pago': cuota.fecha_pago,
                    'fecha_vencimiento': cuota.fecha_vencimiento,
                    'valor_cuota': cuota.valor_cuota,
                    'pagada': getattr(cuota, 'pagada', None),
                    'liquidada': liquidada,
                    'id_liquidacion': factura.id_liq_factura_unica.id_liq_factura_unica if factura.id_liq_factura_unica else None,
                    'id_factura_unica': [f.id_factura_unica for f in facturas_cuota],
                    'nro_factura_unica': [f.nro_factura_unica for f in facturas_cuota],
                    'fecha_compra': [f.fecha_compra for f in facturas_cuota],
                    'fecha_liquidacion': [f.id_liq_factura_unica.fecha_liquidacion if f.id_liq_factura_unica else None for f in facturas_cuota],
                })

            resultado.append({
                "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago if solicitud else None,
                "id_plan_pago": plan.id_plan_pago,
                "nro_solicitud": solicitud.nro_solicitud if solicitud else None,
                "nro_plan_pago": plan.nro_plan_pago,
                "nro_cuotas": plan.nro_cuotas,
                "fecha_solicitud": solicitud.fecha_solicitud if solicitud else None,
                "valor_total_pagar": float(plan.valor_total_pagar),
                "cuota_fomento_total": float(cuota_fomento_total),
                "intereses_total": float(intereses_total),
                "dias_mora": dias_mora,
                "estado_display": solicitud.get_estado_display() if solicitud and hasattr(solicitud, "get_estado_display") else None,
                "estado": solicitud.estado if solicitud else None,
                "observaciones": solicitud.observaciones if solicitud else None,
                "estado_plan_pago": plan.estado,
                "estado_plan_pago_display": plan.get_estado_display() if hasattr(plan, "get_estado_display") else plan.estado,
                "id_recaudador": persona.id_persona if persona else None,
                "tipo_documento": str(persona.tipo_documento) if persona and persona.tipo_documento else None,
                "numero_documento": persona.numero_documento if persona else None,
                "doc_liquidacion_url": doc_liquidacion_url,
                "nombre_recaudador": (
                    f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
                    f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
                    if persona and persona.tipo_persona == 'N' else persona.razon_social if persona else None
                ),
                "facturas_asociadas": "-".join(str(f.nro_factura_unica) for f in facturas),
                "facturas_info": facturas_info,
                "cuotas_liquidadas": cuotas_liquidadas
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Planes de pago con al menos una cuota liquidada encontrados correctamente.",
            "data": resultado
        })


class ConsultadDetallesPlanesPagoPSEExternoGet(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        id_solicitud = kwargs.get('id_solicitud_acuerdo_pago')

        if not id_solicitud:
            return Response({
                "success": False,
                "detail": "El parámetro 'id_solicitud_acuerdo_pago' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudAcuerdosPago.objects.select_related('id_persona_solicita')\
                .get(id_solicitud_acuerdo_pago=id_solicitud)
        except SolicitudAcuerdosPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la solicitud con el ID proporcionado."
            }, status=status.HTTP_404_NOT_FOUND)

        plan_pago = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=solicitud).order_by('-nro_plan_pago').first()
        if not plan_pago or plan_pago.estado != "RA":
            return Response({
                "success": False,
                "detail": "El plan de pago asociado a la solicitud no está en estado 'RA' (Aprobado por Recaudador)."
            }, status=status.HTTP_400_BAD_REQUEST)

        detalles = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=solicitud)\
            .select_related('id_factura_unica', 'id_cuota_acuerdo_pago__id_plan_pago')

        persona = solicitud.id_persona_solicita
        nombre_recaudador = (
            f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} "
            f"{persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
            if persona.tipo_persona == 'N' else persona.razon_social
        )

        tipo_documento = str(persona.tipo_documento) if persona.tipo_documento else None
        numero_documento = persona.numero_documento

        resultado = []
        fecha_actual = now().date()

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list("dias_pago", flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        for detalle in detalles:
            cuota = detalle.id_cuota_acuerdo_pago
            plan = cuota.id_plan_pago if cuota else None
            factura = detalle.id_factura_unica

            # Calcular intereses para la factura
            cuota_fomento = factura.cuota_fomento
            intereses = Decimal("0")

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)

            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            valor_factura = cuota_fomento + intereses

            # Bandera de liquidación de la cuota
            cuota_liquidada = False
            if cuota and cuota.id_liquidacion is not None:
                cuota_liquidada = True

            # Reunir facturas de la misma solicitud
            facturas = detalles.values_list('id_factura_unica__nro_factura_unica', flat=True).distinct()
            relacion_facturas = "-".join(map(str, facturas))

            resultado.append({
                "id_solicitud_acuerdo_pago": solicitud.id_solicitud_acuerdo_pago,
                "id_detalle_acuerdo_pago": detalle.id_detalle_acuerdo_pago,
                "id_plan_pago": plan.id_plan_pago if plan else None,
                "nro_solicitud": solicitud.nro_solicitud,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago if cuota else None,
                "tipo_documento_recaudador": tipo_documento,
                "numero_documento_recaudador": numero_documento,
                "nombre_recaudador": nombre_recaudador,
                "fecha_solicitud": solicitud.fecha_solicitud,
                "estado": solicitud.get_estado_display(),
                "numero_plan_pago": plan.nro_plan_pago if plan else None,
                "estado_plan_pago": plan.estado if plan else None,
                "estado_plan_pago_display": plan.get_estado_display() if plan else None,
                "numero_cuota": cuota.nro_cuota if cuota else None,
                "fecha_pago": cuota.fecha_pago if cuota else None,
                "Nro_factura": factura.nro_factura_unica,
                "cuota_fomento": cuota_fomento,
                "cuota_liquidada": cuota_liquidada,
                "valor_factura": round(valor_factura, 5)
            })

        return Response({
            "success": True,
            "detail": "Planes de pago consultados correctamente.",
            "data": resultado
        }, status=status.HTTP_200_OK)

class InfoRecaudadorCuotaPlanPagoPSEView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        id_plan_pago = request.query_params.get('id_plan_pago')
        nro_cuota = request.query_params.get('nro_cuota')

        if not id_plan_pago or not nro_cuota:
            return Response({
                "success": False,
                "detail": "Debe proporcionar 'id_plan_pago' y 'nro_cuota' como parámetros."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró el plan de pago."
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            cuota = CuotasAcuerdoPago.objects.get(id_plan_pago=plan, nro_cuota=nro_cuota)
        except CuotasAcuerdoPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró la cuota para el plan de pago."
            }, status=status.HTTP_404_NOT_FOUND)

        # Obtener detalles de facturas asociadas a la cuota
        detalles = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago=cuota)
        facturas = FacturaUnica.objects.filter(id_factura_unica__in=detalles.values_list('id_factura_unica', flat=True))

        # Validar si hay facturas NO liquidadas
        facturas_no_liquidadas = facturas.filter(id_liq_factura_unica__isnull=True)
        if facturas_no_liquidadas.exists():
            return Response({
                "success": False,
                "detail": "Existen facturas asociadas a la cuota que no están liquidadas.",
                "facturas_no_liquidadas": list(facturas_no_liquidadas.values_list('nro_factura_unica', flat=True))
            }, status=status.HTTP_400_BAD_REQUEST)

        # Recaudador
        recaudador = None
        if facturas.exists():
            recaudador = facturas.first().id_persona_recaudador

        if not recaudador:
            return Response({
                "success": False,
                "detail": "No se encontró recaudador asociado a las facturas de la cuota."
            }, status=status.HTTP_404_NOT_FOUND)

        # Datos recaudador
        nombres = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''}".strip()
        apellidos = f"{recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
        tipo_documento = str(recaudador.tipo_documento) if recaudador.tipo_documento else None
        numero_documento = recaudador.numero_documento
        email = recaudador.email or getattr(recaudador, 'email_empresarial', None)
        telefono = recaudador.telefono_celular or getattr(recaudador, 'telefono_empresa', None)
        direccion = recaudador.direccion_residencia or getattr(recaudador, 'direccion_notificaciones', None)

        # Datos de facturas y liquidaciones
        facturas_arr = []
        valor_total = 0
        dias_mora_max = 0
        fecha_actual = timezone.now().date()
        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list("dias_pago", flat=True).first()
        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else 0

        for factura in facturas:
            nro_doc_pago = None
            if factura.id_liq_factura_unica:
                nro_doc_pago = factura.id_liq_factura_unica.nro_doc_pago

            cuota_fomento = float(factura.cuota_fomento)
            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except Exception:
                primer_dia_mes_siguiente = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_mes_siguiente - timedelta(days=1)
            fecha_limite_pago_date = fecha_limite_pago.date() if hasattr(fecha_limite_pago, 'date') else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            dias_mora_max = max(dias_mora_max, dias_mora)
            intereses = 0
            if dias_mora > 0 and tasa_interes_dian:
                intereses = (cuota_fomento * float(tasa_interes_dian) * dias_mora) / 365

            valor_factura = cuota_fomento + intereses
            valor_total += valor_factura

            facturas_arr.append({
                "id_solicitud": plan.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago if plan.id_solicitud_acuerdo_pago else None,
                "id_plan_pago": plan.id_plan_pago,
                "nro_solicitud": plan.id_solicitud_acuerdo_pago.nro_solicitud if plan.id_solicitud_acuerdo_pago else None,
                "nro_cuota": cuota.nro_cuota if cuota else None,
                "nro_plan_pago": plan.nro_plan_pago if plan else None,
                "nro_doc_pago": nro_doc_pago,
                "cuota_fomento": cuota_fomento,
                "observacion_solcitud": plan.id_solicitud_acuerdo_pago.observaciones if plan.id_solicitud_acuerdo_pago else None,
                "dias_mora": dias_mora,
                "intereses": round(intereses, 2),
                "valor_total_factura": round(valor_factura, 2),
                "nro_factura_unica": factura.nro_factura_unica
            })

        response = {
            "success": True,
            "recaudador": {
                "nombres": nombres,
                "apellidos": apellidos,
                "tipo_documento": tipo_documento,
                "numero_documento": numero_documento,
                "email": email,
                "telefono": telefono,
                "direccion": direccion
            },
            "facturas": facturas_arr,
            "valor_total": round(valor_total, 2),
            "dias_mora_max": dias_mora_max,
            "cuota_fomento_total": round(sum(f["cuota_fomento"] for f in facturas_arr), 2),
            "interes_mora_total": round(sum(f["intereses"] for f in facturas_arr), 2),
            "valor_total_general": round(sum(f["valor_total_factura"] for f in facturas_arr), 2),
        }
        return Response(response, status=status.HTTP_200_OK)


class CuotasPagadasPorPlanPagoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        id_plan_pago = request.query_params.get('id_plan_pago')
        if not id_plan_pago:
            return Response({
                "success": False,
                "detail": "Debe proporcionar el parámetro 'id_plan_pago'."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = PlanesPago.objects.get(id_plan_pago=id_plan_pago)
        except PlanesPago.DoesNotExist:
            return Response({
                "success": False,
                "detail": "No se encontró el plan de pago."
            }, status=status.HTTP_404_NOT_FOUND)

        cuotas_pagadas = CuotasAcuerdoPago.objects.filter(id_plan_pago=plan, pagada=True)
        cuotas_data = []
        for cuota in cuotas_pagadas:
            cuotas_data.append({
                "id_solicitud_acuerdo_pago": cuota.id_plan_pago.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "nro_solicitud": cuota.id_plan_pago.id_solicitud_acuerdo_pago.nro_solicitud if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "id_plan_pago": cuota.id_plan_pago.id_plan_pago if cuota.id_plan_pago else None,
                "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
                "fecha_pago_cuota": cuota.fecha_pago,
                "fecha_solicitud": cuota.id_plan_pago.id_solicitud_acuerdo_pago.fecha_solicitud if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "nro_cuota": cuota.nro_cuota,
                "observacion_solicitud": cuota.id_plan_pago.id_solicitud_acuerdo_pago.observaciones if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "fecha_vencimiento": cuota.fecha_vencimiento,
                "valor_cuota": float(cuota.valor_cuota),
                "pagada": cuota.pagada,
            })

        return Response({
            "success": True,
            "detail": "Cuotas pagadas consultadas correctamente.",
            "cuotas_pagadas": cuotas_data
        }, status=status.HTTP_200_OK)



class ConsultarCuotasPagadasInternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarCuotasPagadasInterno]
    pagination_class = CustomPagination

    def get(self, request, *args, **kwargs):
        id_persona = request.query_params.get('id_persona', None)
        id_persona_solicita = request.query_params.get('id_persona_solicita', None)
        nro_plan_pago = request.query_params.get('nro_plan_pago', None)
        nro_solicitud = request.query_params.get('nro_solicitud', None)
        fecha_pago_desde = request.query_params.get('fecha_pago_desde', None)
        fecha_pago_hasta = request.query_params.get('fecha_pago_hasta', None)
        fecha_vencimiento_desde = request.query_params.get('fecha_vencimiento_desde', None)
        fecha_vencimiento_hasta = request.query_params.get('fecha_vencimiento_hasta', None)

        cuotas_pagadas_qs = CuotasAcuerdoPago.objects.filter(pagada=True).select_related(
            'id_plan_pago', 'id_plan_pago__id_solicitud_acuerdo_pago'
        )

        # Ordenar por id_solicitud_acuerdo_pago y nro_cuota de forma ascendente
        cuotas_pagadas = cuotas_pagadas_qs.order_by(
            'id_plan_pago__id_solicitud_acuerdo_pago__id_solicitud_acuerdo_pago',
            'nro_cuota'
        )

        if id_persona:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                id_plan_pago__id_solicitud_acuerdo_pago__id_persona_solicita__id_persona=id_persona
            )
        if id_persona_solicita:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                id_plan_pago__id_solicitud_acuerdo_pago__id_persona_solicita__id_persona=id_persona_solicita
            )
        if nro_plan_pago:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                id_plan_pago__nro_plan_pago=nro_plan_pago
            )
        if nro_solicitud:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                id_plan_pago__id_solicitud_acuerdo_pago__nro_solicitud=nro_solicitud
            )
        if fecha_pago_desde:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                fecha_pago__date__gte=fecha_pago_desde
            )
        if fecha_pago_hasta:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                fecha_pago__date__lte=fecha_pago_hasta
            )
        if fecha_vencimiento_desde:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                fecha_vencimiento__date__gte=fecha_vencimiento_desde
            )
        if fecha_vencimiento_hasta:
            cuotas_pagadas_qs = cuotas_pagadas_qs.filter(
                fecha_vencimiento__date__lte=fecha_vencimiento_hasta
            )

        if not cuotas_pagadas_qs.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron cuotas pagadas.",
                "cuotas_pagadas": []
            }, status=status.HTTP_404_NOT_FOUND)

        # Paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(
            cuotas_pagadas_qs.order_by(
                '-id_plan_pago__id_solicitud_acuerdo_pago__id_solicitud_acuerdo_pago',
                'nro_cuota'
            ),
            request
        )
        if page is None:
            return paginator.get_paginated_response([])

        cuotas_data = []

        for cuota in page:
            detalle = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago=cuota).select_related('id_factura_unica').first()
            nro_doc_pago = None
            documento_info = None
            comprobante_pago = None

            if detalle and detalle.id_factura_unica and detalle.id_factura_unica.id_liq_factura_unica:
                liquidacion = detalle.id_factura_unica.id_liq_factura_unica
                nro_doc_pago = liquidacion.nro_doc_pago
                doc_pago = getattr(liquidacion, "doc_pago", None)
                archivo_url = None
                if doc_pago and hasattr(doc_pago, "documento_generado") and doc_pago.documento_generado:
                    archivo_url = Util.obtener_archivos(doc_pago.documento_generado.name)
                # Buscar el comprobante de pago en el modelo Pagos usando el campo correcto
                pago = Pagos.objects.filter(id_liquidacion_pago=liquidacion.id_liq_factura_unica).first()
                if pago and hasattr(pago, "doc_pago") and pago.doc_pago and hasattr(pago.doc_pago, "documento_generado") and pago.doc_pago.documento_generado:
                    comprobante_pago = Util.obtener_archivos(pago.doc_pago.documento_generado.name)
                else:
                    comprobante_pago = None

                if doc_pago and hasattr(doc_pago, "documento_generado") and doc_pago.documento_generado:
                    documento_info = {
                        "id_documento_generado": doc_pago.id_documento_generado,
                        "documento_generado": doc_pago.documento_generado.name,
                        "archivo": archivo_url,
                        "comprobante_pago": comprobante_pago
                    }
                else:
                    documento_info = None

            # Información del recaudador asociado a la solicitud de la cuota
            recaudador = None
            if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago:
                recaudador = cuota.id_plan_pago.id_solicitud_acuerdo_pago.id_persona_solicita

            recaudador_info = None
            if recaudador:
                recaudador_info = {
                    "id_persona": recaudador.id_persona,
                    "tipo_documento": str(recaudador.tipo_documento) if recaudador.tipo_documento else None,
                    "numero_documento": recaudador.numero_documento,
                    "nombres": f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''}".strip(),
                    "apellidos": f"{recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip(),
                    "email": recaudador.email if recaudador.email else recaudador.email_empresarial,
                    "telefono_celular": recaudador.telefono_celular if recaudador.telefono_celular else recaudador.telefono_empresa,
                    "fecha_nacimiento": recaudador.fecha_nacimiento
                }

            cuotas_data.append({
                "id_solicitud_acuerdo_pago": cuota.id_plan_pago.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "nro_solicitud": cuota.id_plan_pago.id_solicitud_acuerdo_pago.nro_solicitud if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "id_plan_pago": cuota.id_plan_pago.id_plan_pago if cuota.id_plan_pago else None,
                "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
                "nro_cuota": cuota.nro_cuota,
                "fecha_vencimiento": cuota.fecha_vencimiento,
                "valor_cuota": float(cuota.valor_cuota),
                "pagada": cuota.pagada,
                "fecha_pago": cuota.fecha_pago,
                "nro_doc_pago": nro_doc_pago,
                "documento": documento_info,
                "recaudador": recaudador_info
            })

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Cuotas pagadas consultadas correctamente.",
            "cuotas_pagadas": cuotas_data
        })


class ConsultarCuotasPagadasExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarCuotasPagadasAcuerdoPagoExterno]

    def get(self, request, *args, **kwargs):
        persona = request.user.persona
        cuotas_pagadas = CuotasAcuerdoPago.objects.filter(
            id_plan_pago__id_solicitud_acuerdo_pago__id_persona_solicita=persona,
            pagada=True
        ).select_related('id_plan_pago', 'id_plan_pago__id_solicitud_acuerdo_pago')

        if not cuotas_pagadas.exists():
            return Response({
                "success": False,
                "detail": "El usuario no tiene cuotas pagadas.",
                "cuotas_pagadas": []
            }, status=status.HTTP_404_NOT_FOUND)

        # Ordenar por id_cuota_acuerdo_pago y nro_cuota de forma descendente
        cuotas_pagadas = cuotas_pagadas.order_by('-id_cuota_acuerdo_pago', '-nro_cuota')

        cuotas_data = []
        for cuota in cuotas_pagadas:
            detalle = DetalleAcuerdoPago.objects.filter(id_cuota_acuerdo_pago=cuota).select_related('id_factura_unica').first()
            nro_doc_pago = None
            documento_info = None
            comprobante_pago = None

            if detalle and detalle.id_factura_unica and detalle.id_factura_unica.id_liq_factura_unica:
                liquidacion = detalle.id_factura_unica.id_liq_factura_unica
                nro_doc_pago = liquidacion.nro_doc_pago
                doc_pago = getattr(liquidacion, "doc_pago", None)
                archivo_url = None
                if doc_pago and hasattr(doc_pago, "documento_generado") and doc_pago.documento_generado:
                    archivo_url = Util.obtener_archivos(doc_pago.documento_generado.name)
                # Buscar el comprobante de pago en el modelo Pagos usando el campo correcto
                pago = Pagos.objects.filter(id_liquidacion_pago=liquidacion.id_liq_factura_unica).first()
                if pago and hasattr(pago, "doc_pago") and pago.doc_pago and hasattr(pago.doc_pago, "documento_generado") and pago.doc_pago.documento_generado:
                    comprobante_pago = Util.obtener_archivos(pago.doc_pago.documento_generado.name)
                else:
                    comprobante_pago = None

                if doc_pago and hasattr(doc_pago, "documento_generado") and doc_pago.documento_generado:
                    documento_info = {
                        "id_documento_generado": doc_pago.id_documento_generado,
                        "documento_generado": doc_pago.documento_generado.name,
                        "archivo": archivo_url,
                        "comprobante_pago": comprobante_pago
                    }
                else:
                    documento_info = None

            cuotas_data.append({
                "id_solicitud_acuerdo_pago": cuota.id_plan_pago.id_solicitud_acuerdo_pago.id_solicitud_acuerdo_pago if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "nro_solicitud": cuota.id_plan_pago.id_solicitud_acuerdo_pago.nro_solicitud if cuota.id_plan_pago and cuota.id_plan_pago.id_solicitud_acuerdo_pago else None,
                "id_plan_pago": cuota.id_plan_pago.id_plan_pago if cuota.id_plan_pago else None,
                "nro_plan_pago": cuota.id_plan_pago.nro_plan_pago if cuota.id_plan_pago else None,
                "id_cuota_acuerdo_pago": cuota.id_cuota_acuerdo_pago,
                "nro_cuota": cuota.nro_cuota,
                "fecha_vencimiento": cuota.fecha_vencimiento,
                "valor_cuota": float(cuota.valor_cuota),
                "pagada": cuota.pagada,
                "fecha_pago": cuota.fecha_pago,
                "nro_doc_pago": nro_doc_pago,
                "documento": documento_info
            })

        recaudador = persona
        recaudador_info = {
            "id_persona": recaudador.id_persona,
            "tipo_documento": str(recaudador.tipo_documento) if recaudador.tipo_documento else None,
            "numero_documento": recaudador.numero_documento,
            "nombres": f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''}".strip(),
            "apellidos": f"{recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip(),
            "email": recaudador.email if recaudador.email else recaudador.email_empresarial,
            "telefono_celular": recaudador.telefono_celular if recaudador.telefono_celular else recaudador.telefono_empresa,
            "fecha_nacimiento": recaudador.fecha_nacimiento
        }

        return Response({
            "success": True,
            "detail": "Cuotas pagadas consultadas correctamente.",
            "cuotas_pagadas": cuotas_data,
            "recaudador": recaudador_info
        }, status=status.HTTP_200_OK)

