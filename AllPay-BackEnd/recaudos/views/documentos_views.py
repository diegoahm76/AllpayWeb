import base64
import copy
from datetime import datetime
import io
from docx.shared import Mm
import hashlib
from io import BytesIO
import barcode
from barcode.writer import ImageWriter
import subprocess
import tempfile
import uuid
import boto3
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from recaudos.models.documento_models import AsignacionDocs, DocumentosGenerados, PlantillasDoc
from recaudos.models.recaudos_models import ConfiguracionConsecutivo
from recaudos.serializers.documentos_serializers import AsignacionDocsCreateSerializer, AsignacionDocsSerializer, DocumentosGeneradosPdfSerializer, DocumentosGeneradosSerializer, PlantillasDocSerializerGet, PlantillasDocSerializerGetConVariables, ConfiguracionConsecutivoSerializer, PlantillasDocBusquedaAvanzadaSerializer, PlantillasDocCreateSerializer, PlantillasDocGetSeriallizer, PlantillasDocSerializer, PlantillasDocUpdateSerializer
from rest_framework.exceptions import ValidationError,NotFound,PermissionDenied
import os
import shutil
from django.core.files.uploadedfile import InMemoryUploadedFile
from docxtpl import DocxTemplate, InlineImage
from jinja2 import Environment, FileSystemBytecodeCache, Undefined
from rest_framework.permissions import IsAuthenticated
import json
import math
from reportes.utils import CustomPagination

from recaudos.utils import Utils
import time
import logging
from seguridad.models.transversal_models import Personas
import qrcode
from io import BytesIO
from functools import lru_cache
from django.core.files.storage import default_storage
from decimal import Decimal

# Jinja2 environment con bytecode cache para reusar compilaciones de plantillas
_bytecode_cache = FileSystemBytecodeCache(directory=tempfile.gettempdir())
JINJA_ENV = Environment(autoescape=False, trim_blocks=True, lstrip_blocks=True, bytecode_cache=_bytecode_cache)
logger = logging.getLogger(__name__)


# Cache LRU de bytes de plantillas .docx para evitar relecturas remotas
@lru_cache(maxsize=10)
def _load_template_bytes(template_name: str) -> bytes:
    """Cachea los bytes de la plantilla para evitar múltiples descargas desde S3"""
    print(f"[console.log][cache] Descargando plantilla desde S3: {template_name}", flush=True)
    logger.info("[cache] Descargando plantilla desde S3: %s", template_name)
    with default_storage.open(template_name, 'rb') as f:
        content = f.read()
    print(f"[console.log][cache] Plantilla cargada: {len(content)} bytes", flush=True)
    logger.info("[cache] Plantilla cargada: %d bytes", len(content))
    return content


def get_template_stream(template_name: str) -> BytesIO:
    """Retorna un BytesIO con los bytes de la plantilla (cacheados)"""
    return BytesIO(_load_template_bytes(template_name))


def get_template_stream(template_name: str) -> BytesIO:
    return BytesIO(_load_template_bytes(template_name))


def detectar_tipo_archivo(nombre_archivo):
    """Detecta el tipo de archivo basado en su extensión"""
    if not nombre_archivo:
        return None
    
    nombre_lower = nombre_archivo.lower()
    if nombre_lower.endswith(('.docx', '.doc')):
        return 'word'
    elif nombre_lower.endswith(('.xlsx', '.xls')):
        return 'excel'
    elif nombre_lower.endswith('.pdf'):
        return 'pdf'
    else:
        return 'otro'


# --- Utilidades de formateo numérico para documentos ---
def _format_number_es(value: Decimal | float, decimals: int = 2) -> str:
    """Formatea un número con miles por punto y decimales con coma (ej: 1.234,56)."""
    try:
        if isinstance(value, Decimal):
            q = Decimal(10) ** -decimals
            value = value.quantize(q)
        # Usar formato con separadores estilo en-US y luego intercambiar
        txt = f"{value:,.{decimals}f}"
        # 1,234.56 -> 1.234,56
        return txt.replace(',', 'X').replace('.', ',').replace('X', '.')
    except Exception:
        return str(value)

def _finalize_es(value):
    """Finalizador Jinja: al emitir valores, formatea Decimals/floats como ES.
    Mantiene InlineImage y otros tipos sin cambios.
    """
    try:
        # Evitar tocar imágenes embebidas
        if isinstance(value, InlineImage):
            return value
    except Exception:
        # InlineImage puede no estar definido en algún contexto de importación
        pass
    if isinstance(value, (Decimal, float)):
        return _format_number_es(value)
    return value


class ConfiguracionConsecutivoView(APIView):
    queryset = ConfiguracionConsecutivo.objects.all()
    serializer_class = ConfiguracionConsecutivoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request, pk=None):
        if not pk:
            # Listar todos con paginación
            configuracion_consecutivo = self.queryset.all().order_by('-fecha_configuracion')
            if not configuracion_consecutivo.exists():
                raise NotFound("No existen registros.")
            
            # Verificar si se solicita sin paginación
            sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() == 'true'
            
            if sin_paginacion:
                # Sin paginación
                serializador = self.serializer_class(configuracion_consecutivo, many=True)
                return Response({
                    'success': True, 
                    'detail': 'Se encontraron los siguientes registros.', 
                    'data': serializador.data
                }, status=status.HTTP_200_OK)
            else:
                # Con paginación
                paginator = self.pagination_class()
                page = paginator.paginate_queryset(configuracion_consecutivo, request)
                if page is not None:
                    serializador = self.serializer_class(page, many=True)
                    return paginator.get_paginated_response(serializador.data)
                
                # Fallback sin paginación
                serializador = self.serializer_class(configuracion_consecutivo, many=True)
                return Response({'success': True, 'detail': 'Se encontraron los siguientes registros.', 'data': serializador.data}, status=status.HTTP_200_OK)
        else:
            # Obtener un registro específico
            configuracion_consecutivo = self.queryset.filter(id_config_consecutivo=pk).first()
            if not configuracion_consecutivo:
                raise NotFound("No existe la configuración de consecutivo.")
            serializador = self.serializer_class(configuracion_consecutivo)
            return Response({'success': True, 'detail': 'Se encontraron los siguientes registros.', 'data': serializador.data}, status=status.HTTP_200_OK)
   
    def post(self, request):
        usuario = request.user.persona.id_persona
        data_in = request.data

        configuracion = self.queryset.filter(prefijo_consecutivo=data_in['prefijo_consecutivo'], anio_consecutivo=datetime.now().year).first()
        if configuracion:
            raise ValidationError("Ya existe una configuración para el prefijo ingresado en en año actual.")

        data_in['id_persona_configura'] = usuario
        data_in['fecha_configuracion'] = datetime.now()
        data_in['consecutivo_actual'] = data_in['consecutivo_inicial'] - 1
        data_in['anio_consecutivo'] = datetime.now().year
        try:
            serializer = self.serializer_class(data=data_in)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response({'success': True, 'detail': 'Se crearon los registros correctamente', 'data': {**serializer.data}}, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            raise ValidationError(e.detail)
        
    def patch(self, request, pk):
        data = request.data.copy()
        instance = self.queryset.filter(id_config_consecutivo=pk).first()
        if not instance:
            raise NotFound("No existe la configuración de consecutivo.")
        
        if instance.consecutivo_actual +1 != instance.consecutivo_inicial:
            raise PermissionDenied("No se puede modificar la configuración de consecutivo porque ya se ha utilizado.")
        
        if 'consecutivo_inicial' in data:
            data['consecutivo_actual'] = data['consecutivo_inicial'] - 1
            
        
        serializer = self.serializer_class(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "success": True,
            "detail": "Se actualizó el registro correctamente",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    

    def delete(self, request, pk):
        instance = self.queryset.filter(id_config_consecutivo=pk).first()
        if not instance:
            raise NotFound("No existe la configuración de consecutivo.")
        
        if instance.consecutivo_actual +1 != instance.consecutivo_inicial:
            raise PermissionDenied("No se puede eliminar la configuración de consecutivo porque ya se ha utilizado.")
        
        serializer = self.serializer_class(instance)
        instance.delete()

        return Response({
            "success": True,
            "detail": "Se eliminó el registro correctamente",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

class PlantillasDocView(APIView):
    queryset = PlantillasDoc.objects.all()
    serializer_class = PlantillasDocCreateSerializer
    serializer_get_class = PlantillasDocSerializer
    permission_classes = [IsAuthenticated]
    def obtener_extension_archivo(self,archivo):
        _, extension = os.path.splitext(archivo.name)
        return extension
    
    def get(self,request):
        plantillas =  PlantillasDoc.objects.filter(activa=True)
        if not plantillas:
            raise NotFound("No existen registros.")
        serializador = self.serializer_get_class(plantillas,many=True)
        
        return Response({'success':True,'detail':'Se encontraron los siguientes registros.','data':serializador.data},status=status.HTTP_200_OK)

    def post(self,request):
        usuario = request.user.persona.id_persona
        data_in = request.data.copy()
        data_in['id_persona_crea_plantilla'] = usuario
        data_in['fecha_creacion'] = datetime.now()
        extensiones = ['docx','doc','xlsx','xls']  # Agregar extensiones de Excel
       

        if 'doc_plantilla' not in data_in:
            raise ValidationError("No se ha proporcionado ningún archivo.")
        archivo = request.data.get('doc_plantilla')
                
        if not archivo:
            raise ValidationError("No se ha proporcionado ningún archivo.")

        #Validacion para tipos de archivo:
        nombre=archivo.name
            
        _, extension = os.path.splitext(nombre)
        extension_sin_punto = extension[1:] if extension.startswith('.') else extension
        if not extension_sin_punto or extension_sin_punto not in extensiones:
            raise ValidationError("Solo se pueden agregar archivos Word (.docx, .doc) o Excel (.xlsx, .xls)")
            
        try:
            serializer = self.serializer_class(data=data_in)
            serializer.is_valid(raise_exception=True)
            serializer.save()


            return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{**serializer.data}},status=status.HTTP_201_CREATED)
        except ValidationError as e:
            raise ValidationError(e.detail)
        
    def delete(self, request, pk):
        instance = self.queryset.filter(id_plantilla_doc=pk).first()
        if not instance:
            raise NotFound("No existe registro.")
        serializer = self.serializer_class(instance)
        instance.delete()

        return Response({
            "success": True,
            "detail": "Se eliminó el registro correctamente",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """
        Actualiza completamente una plantilla de documento.
        Si se proporciona un nuevo archivo, elimina automáticamente el archivo anterior de S3.
        """
        instance = self.queryset.filter(id_plantilla_doc=pk).first()
        if not instance:
            raise NotFound("No existe registro.")
        
        data_in = request.data.copy()
        
        # Si se está actualizando el archivo de la plantilla
        if 'doc_plantilla' in data_in:
            archivo = request.data.get('doc_plantilla')
            if not archivo:
                raise ValidationError("No se ha proporcionado ningún archivo.")
            nombre = archivo.name
            
            _, extension = os.path.splitext(nombre)
            extension_sin_punto = extension[1:] if extension.startswith('.') else extension
            extensiones = ['docx','doc','xlsx','xls']
            if not extension_sin_punto or extension_sin_punto not in extensiones:
                raise ValidationError("Solo se pueden agregar archivos Word (.docx, .doc) o Excel (.xlsx, .xls)")
            
            # Eliminar el archivo anterior de S3 antes de subir el nuevo
            if instance.doc_plantilla:
                try:
                    archivo_anterior = instance.doc_plantilla.name
                    instance.doc_plantilla.delete(save=False)
                    print(f"[console.log] Archivo anterior eliminado: {archivo_anterior}", flush=True)
                    logger.info(f"Archivo anterior eliminado: {archivo_anterior}")
                except Exception as e:
                    print(f"[console.log] Error al eliminar archivo anterior: {str(e)}", flush=True)
                    logger.warning(f"Error al eliminar archivo anterior: {str(e)}")
        
        # Actualizar usuario y fecha de creación
        data_in['id_persona_crea_plantilla'] = request.user.persona.id_persona
        data_in['fecha_creacion'] = datetime.now()
        
        serializer = self.serializer_class(instance, data=data_in)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "success": True,
            "detail": "Se actualizó la plantilla correctamente. El archivo anterior fue eliminado.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        """
        Actualiza parcialmente una plantilla de documento.
        Si se proporciona un nuevo archivo, elimina automáticamente el archivo anterior de S3.
        """
        instance = self.queryset.filter(id_plantilla_doc=pk).first()
        if not instance:
            raise NotFound("No existe registro.")
        
        data_in = request.data.copy()
        
        # Si se está actualizando el archivo de la plantilla
        if 'doc_plantilla' in data_in:
            archivo = request.data.get('doc_plantilla')
            if not archivo:
                raise ValidationError("No se ha proporcionado ningún archivo.")
            nombre = archivo.name
            
            _, extension = os.path.splitext(nombre)
            extension_sin_punto = extension[1:] if extension.startswith('.') else extension
            extensiones = ['docx','doc','xlsx','xls']
            if not extension_sin_punto or extension_sin_punto not in extensiones:
                raise ValidationError("Solo se pueden agregar archivos Word (.docx, .doc) o Excel (.xlsx, .xls)")
            
            # Eliminar el archivo anterior de S3 antes de subir el nuevo
            if instance.doc_plantilla:
                try:
                    archivo_anterior = instance.doc_plantilla.name
                    instance.doc_plantilla.delete(save=False)
                    print(f"[console.log] Archivo anterior eliminado: {archivo_anterior}", flush=True)
                    logger.info(f"Archivo anterior eliminado: {archivo_anterior}")
                except Exception as e:
                    print(f"[console.log] Error al eliminar archivo anterior: {str(e)}", flush=True)
                    logger.warning(f"Error al eliminar archivo anterior: {str(e)}")
            
        serializer = self.serializer_class(instance, data=data_in, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "success": True,
            "detail": "Se actualizó la plantilla correctamente. El archivo anterior fue eliminado.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
     


class BusquedaAvanzadaPlantillas(generics.ListAPIView):
    serializer_class = PlantillasDocBusquedaAvanzadaSerializer
    queryset = PlantillasDoc.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get(self,request):
        filters={}

        for key, value in request.query_params.items():
            if value !='':
                if key == 'nombre':
                        filters['nombre__icontains'] = value
                if key =='descripcion':
                        filters['descripcion__icontains'] = value                    
                
        filters['activa']=True

        plantilla = self.queryset.all().filter(**filters)
        serializador = self.serializer_class(plantilla,many=True)
        
        return Response({'success':True,'detail':'Se encontraron los siguientes registros.','data':serializador.data},status=status.HTTP_200_OK)
        
class BusquedaAvanzadaPlantillasAdmin(generics.ListAPIView):
    serializer_class = PlantillasDocBusquedaAvanzadaSerializer
    queryset = PlantillasDoc.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get(self,request):
        filters={}
        
        for key, value in request.query_params.items():

            if value !='':
                if key == 'nombre':
                        filters['nombre__icontains'] = value
                if key =='descripcion':
                        filters['descripcion__icontains'] = value               
                
        
        plantilla = self.queryset.all().filter(**filters)
        serializador = self.serializer_class(plantilla,many=True)
        
        return Response({'success':True,'detail':'Se encontraron los siguientes registros.','data':serializador.data},status=status.HTTP_200_OK)
    

class PlantillasDocGetById(generics.ListAPIView):
    serializer_class = PlantillasDocGetSeriallizer
    queryset = PlantillasDoc.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get(self,request,pk):
        
                
        plantilla = self.queryset.all().filter(id_plantilla_doc=pk)

        if not plantilla:
            raise NotFound("No existe registro.")
        serializador = self.serializer_class(plantilla,many=True)
        
        return Response({'success':True,'detail':'Se encontraron los siguientes registros.','data':serializador.data},status=status.HTTP_200_OK)
        

class PlantillasDocGetDetalleById(generics.ListAPIView):
    
    serializer_class = PlantillasDocSerializer
    queryset = PlantillasDoc.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get(self,request,pk):   
        plantilla = self.queryset.all().filter(id_plantilla_doc=pk).first()

        if not plantilla:
            raise NotFound("No existe registro.")
        
        # Verificar si se solicitan las variables explícitamente
        incluir_variables = request.query_params.get('incluir_variables', 'false').lower() == 'true'
        
        if incluir_variables:
            # Usar el serializer con variables (descarga y procesa el archivo)
            serializador = PlantillasDocSerializerGetConVariables(plantilla).data
        else:
            serializador = self.serializer_class(plantilla).data
            
        return Response({'success':True,'detail':'Se encontraron los siguientes registros.','data':serializador},status=status.HTTP_200_OK)
        

class PlantillasDocGet(generics.ListAPIView):
    serializer_class = PlantillasDocSerializerGet
    permission_classes = [IsAuthenticated]
    
    def get(self,request):
        nombre = request.query_params.get('nombre')
        plantillas =  PlantillasDoc.objects.filter(activa=True)

        if nombre:
            plantillas = plantillas.filter(nombre__icontains=nombre)
            
        if not plantillas:
            raise NotFound("No existen registros.")
        
        # Serializar directamente sin procesamiento adicional (el serializer ya incluye tipo_archivo y extension)
        serializador = self.serializer_class(plantillas, many=True)
        
        return Response({
            'success': True,
            'detail': 'Se encontraron los siguientes registros.',
            'data': serializador.data
        }, status=status.HTTP_200_OK)
    


class ConvertWordToPdfView(APIView):
    serializer_class = DocumentosGeneradosPdfSerializer

    def _resolve_soffice_path(self):
        """Intenta resolver la ruta del ejecutable de LibreOffice/soffice.
        Prioriza settings/env y luego ubicaciones comunes según SO.
        Retorna la ruta (str) o None si no se encuentra.
        """
        # 1) Settings
        try:
            cfg_path = getattr(settings, 'LIBREOFFICE_PATH', None)
            if cfg_path:
                # Acepta tanto ruta completa como nombre si está en PATH
                if os.path.isfile(cfg_path):
                    return cfg_path
                found = shutil.which(cfg_path)
                if found:
                    return found
        except Exception:
            pass

        # 2) Variable de entorno
        env_path = os.environ.get('LIBREOFFICE_PATH')
        if env_path:
            if os.path.isfile(env_path):
                return env_path
            found = shutil.which(env_path)
            if found:
                return found

        # 3) which estándar
        for candidate in ('soffice', 'libreoffice'):
            found = shutil.which(candidate)
            if found:
                return found

        # 4) rutas comunes por SO
        common_paths = [
            # Windows
            r"C:\\Program Files\\LibreOffice\\program\\soffice.exe",
            r"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
            r"C:\\Program Files\\LibreOffice\\program\\soffice.com",
            r"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
            # Linux/Unix
            "/usr/bin/soffice",
            "/usr/local/bin/soffice",
            "/snap/bin/libreoffice",
            "/usr/bin/libreoffice",
        ]
        for p in common_paths:
            if os.path.isfile(p):
                return p

        return None

    def post(self, request):
        documento_generado = request.data.get('documento_generado')
        documento = DocumentosGenerados.objects.filter(id_documento_generado=documento_generado).first()
        finalizado = self.documento_finalizado(documento)
        if not finalizado:
            raise ValidationError("No se puede convertir el documento a PDF porque no está finalizado.")
        
        s3_word_path = documento.documento_generado.name
        temp_dir = tempfile.mkdtemp()
        local_word_path = os.path.join(temp_dir, f"documento_{uuid.uuid4()}.docx")
        local_pdf_path = os.path.join(temp_dir, f"documento_{uuid.uuid4()}.pdf")
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        try:
            # 1. Descargar archivo de S3
            s3_client.download_file(
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_word_path,
                local_word_path
            )
            
            # 2. Convertir a PDF (resolver binario de LibreOffice/soffice)
            soffice_bin = self._resolve_soffice_path()
            if not soffice_bin:
                raise RuntimeError(
                    "No se encontró LibreOffice/soffice para convertir a PDF. "
                    "Instala LibreOffice y configura la variable de entorno LIBREOFFICE_PATH con la ruta de 'soffice.exe' (Windows) o agrega 'soffice' al PATH."
                )

            command = [
                soffice_bin,
                '--headless',
                '--convert-to', 'pdf:writer_pdf_Export',
                '--outdir', temp_dir,
                local_word_path
            ]

            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode != 0:
                raise RuntimeError(f'Error al convertir Word a PDF: {result.stderr.decode("utf-8")}')
            
            # Obtener ruta al PDF generado (LibreOffice mantiene el nombre base del archivo)
            pdf_filename = os.path.splitext(os.path.basename(local_word_path))[0] + '.pdf'
            local_pdf_path = os.path.join(temp_dir, pdf_filename)
            
            # 3. Subir PDF a S3
            s3_pdf_path = f"documentos_pdf/{uuid.uuid4()}.pdf"
            s3_client.upload_file(
                local_pdf_path,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_pdf_path
            )
            
            # 4. Actualizar referencia en la base de datos
            #documento = DocumentosGenerados.objects.filter(id_documento_generado=documento_generado).first()
            documento.documento_generado = s3_pdf_path
            documento.finalizado = True
            documento.save()
            
            serializer = self.serializer_class(documento) 
            return Response({'success':True,'detail':'Se creó el registro correctamente', 'data': serializer.data},status=status.HTTP_201_CREATED)
        
        except Exception as e:
            # Agregar detalle de depuración si existe salida de LibreOffice
            detail = str(e)
            try:
                if 'result' in locals() and result.stderr:
                    detail += f" | stderr: {result.stderr.decode('utf-8', errors='ignore')}"
            except Exception:
                pass
            raise ValidationError(f'Error en el proceso de conversión: {detail}')
        
        finally:
            # Limpiar archivos temporales Se
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

    def documento_finalizado(self, documento_generado):

        asignaciones = AsignacionDocs.objects.filter(id_documento_generado=documento_generado.id_documento_generado, firma=True)

        validar = []    
        for asignacion in asignaciones:
            if asignacion.cod_estado_asignacion == 'Fi':
                validar.append(True)
            else:
                validar.append(False)
        if False in validar:
            return False
        else:
            return True
    

class GeneradorDocumentosView(APIView):
    serializer_class = DocumentosGeneradosSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        content_type = request.content_type
        if content_type == 'application/json':
            variable = request.data.get('variable')
            match variable:
                case 'B':
                    serializer = self.borrador(request)
                    return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{**serializer.data}},status=status.HTTP_201_CREATED)
                case 'A':
                    serializer = self.actualizar_documento(request)
                    return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{**serializer.data}},status=status.HTTP_201_CREATED)
                case 'C':
                    pass


        elif content_type.startswith('multipart/form-data'):
            serializer = self.cargar_documento(request)
            return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{**serializer.data}},status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': 'Tipo de contenido no soportado.'},
                status=status.HTTP_400_BAD_REQUEST
            )


    def document_to_inmemory_uploadedfile(self,doc, new_filename):
        # Guardar el documento en un búfer de memoria
        t_buf0 = time.perf_counter()
        buffer = BytesIO()
        t_buf_init = time.perf_counter() - t_buf0
        
        t_save0 = time.perf_counter()
        doc.save(buffer)
        t_save = time.perf_counter() - t_save0
        
        original_size = buffer.tell()
        print(f"[console.log][document_to_inmemory] doc.save(buffer): {t_save*1000:.1f} ms (tamaño original: {original_size} bytes)", flush=True)
        logger.info("[document_to_inmemory] doc.save(buffer): %.1f ms (tamaño: %d bytes)", t_save*1000, original_size)
        
        # Optimización: Word DOCX ya está comprimido (formato ZIP), pero podemos optimizarlo
        # re-guardándolo con mejor compresión si es > 500KB
        if original_size > 512000:  # >500KB
            t_opt0 = time.perf_counter()
            try:
                from zipfile import ZipFile, ZIP_DEFLATED
                import tempfile
                
                # Crear archivo temporal optimizado
                buffer.seek(0)
                optimized_buffer = BytesIO()
                
                # Re-empaquetar con máxima compresión
                with ZipFile(buffer, 'r') as zip_in:
                    with ZipFile(optimized_buffer, 'w', ZIP_DEFLATED, compresslevel=9) as zip_out:
                        for item in zip_in.namelist():
                            data = zip_in.read(item)
                            zip_out.writestr(item, data)
                
                optimized_size = optimized_buffer.tell()
                reduction = ((original_size - optimized_size) / original_size) * 100
                t_opt = time.perf_counter() - t_opt0
                print(f"[console.log][document_to_inmemory] optimización ZIP: {t_opt*1000:.1f} ms (reducción: {reduction:.1f}%, {original_size} -> {optimized_size} bytes)", flush=True)
                logger.info("[document_to_inmemory] optimización ZIP: %.1f ms (reducción: %.1f%%)", t_opt*1000, reduction)
                
                buffer = optimized_buffer
            except Exception as e:
                print(f"[console.log][document_to_inmemory] WARNING: no se pudo optimizar: {e}", flush=True)
                logger.warning("[document_to_inmemory] no se pudo optimizar: %s", e)
                buffer.seek(0)  # Usar buffer original
        
        t_create0 = time.perf_counter()
        # Crear un objeto InMemoryUploadedFile
        file = InMemoryUploadedFile(
            buffer,  # El búfer de memoria que contiene los datos
            None,    # El campo de archivo (no es relevante en este contexto)
            new_filename,  # El nombre del archivo
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # El tipo MIME del archivo
            buffer.tell(),  # El tamaño del archivo en bytes
            None     # El conjunto de caracteres (no es relevante en este contexto)
        )
        t_create = time.perf_counter() - t_create0
        print(f"[console.log][document_to_inmemory] crear InMemoryUploadedFile object: {t_create*1000:.1f} ms (tamaño final: {buffer.tell()} bytes)", flush=True)
        logger.info("[document_to_inmemory] crear InMemoryUploadedFile object: %.1f ms (tamaño: %d bytes)", t_create*1000, buffer.tell())
        
        return file

    def generar_codigo_barras(self, codigo, tipo_codigo='code128'):
        # Use treepoem for GS1-128
        import treepoem
        
        # Generate GS1-128 barcode
        image = treepoem.generate_barcode(
            barcode_type='gs1-128',
            data=codigo,
            options={
                'includetext': True,
                'textxalign': 'center',
            }
        )
        
        # Convert to RGB (in case it's RGBA) and save as PNG
        buffer = io.BytesIO()
        image.convert('1').save(buffer, format='PNG', dpi=(400, 400), optimize=True)
        buffer.seek(0)
        
        # Get base64 representation
        buffer.seek(0)
        img_data = buffer.getvalue()
        img_base64 = base64.b64encode(img_data).decode('utf-8')
        
        return img_base64
    
    def generar_codigo_qr(self, contenido: str) -> str:
        qr = qrcode.QRCode(box_size=10, border=2)
        qr.add_data(contenido)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    def get_consecutivo(self, configuracion_consecutivo):
        if configuracion_consecutivo:
            configuracion_consecutivo.consecutivo_actual += 1
            configuracion_consecutivo.fecha_consecutivo_actual = datetime.now()
            configuracion_consecutivo.save()
            consecutivo = configuracion_consecutivo.prefijo_consecutivo + str(configuracion_consecutivo.anio_consecutivo) + str(configuracion_consecutivo.consecutivo_actual).zfill(configuracion_consecutivo.cantidad_digitos)
            return consecutivo, configuracion_consecutivo.fecha_consecutivo_actual
        else:
            raise ValidationError("No existe la configuración de consecutivo.")

    def generar_documento(self, data_in):
        payload = data_in['variables']
        try:
            t0 = time.perf_counter()
            plantilla = get_object_or_404(PlantillasDoc, id_plantilla_doc=data_in['id_plantilla_doc'])
            t_get_pl = time.perf_counter() - t0
            print(f"[console.log][generar_documento] obtener plantilla: {t_get_pl*1000:.1f} ms", flush=True)
            logger.info("[generar_documento] obtener plantilla: %.1f ms", t_get_pl*1000)

            if Utils.archivo_existe_en_s3(plantilla.doc_plantilla.name):  
                t_doc0 = time.perf_counter()
                # Abrir DocxTemplate desde BytesIO cacheado para evitar relecturas del storage
                doc = DocxTemplate(get_template_stream(plantilla.doc_plantilla.name))
                t_doc_open = time.perf_counter() - t_doc0
                print(f"[console.log][generar_documento] abrir DocxTemplate: {t_doc_open*1000:.1f} ms", flush=True)
                logger.info("[generar_documento] abrir DocxTemplate: %.1f ms", t_doc_open*1000)

                t_pre0 = time.perf_counter()
                # pre_processing puede ser costoso; medir y mantener por compatibilidad
                doc.pre_processing()
                t_pre = time.perf_counter() - t_pre0
                print(f"[console.log][generar_documento] pre_processing: {t_pre*1000:.1f} ms", flush=True)
                logger.info("[generar_documento] pre_processing: %.1f ms", t_pre*1000)

                if data_in.get('consecutivo', None):
                    if plantilla.id_config_consecutivo:
                        consecutivo, fecha_consecutivo = self.get_consecutivo(plantilla.id_config_consecutivo)
                        payload['consecutivo'] = consecutivo
                        data_in['fecha_consecutivo'] = fecha_consecutivo
                        data_in['consecutivo'] = consecutivo
                    else:
                        raise ValidationError("No existe la configuración de consecutivo.")
                    
                new_payload = copy.deepcopy(payload)  

                if 'codigo_barras' in new_payload:
                    codigo = self.generar_codigo_barras(new_payload['codigo_barras'])
                    img_decoded = base64.b64decode(codigo)
                    image = BytesIO(img_decoded)
                    new_payload['codigo_barras'] = InlineImage(doc, image, width=Mm(100))

                # Código QR
                if 'qrimagen' in new_payload:
                    codigo_qr = self.generar_codigo_qr(new_payload['qrimagen'])
                    img_decoded_qr = base64.b64decode(codigo_qr)
                    image_qr = BytesIO(img_decoded_qr)
                    new_payload['qrimagen'] = InlineImage(doc, image_qr, width=Mm(20))


                if 'firmasdoc' in new_payload:
                    for firma_key, firma_value in new_payload['firmasdoc'].items():
                        if firma_value:
                            img_decoded = base64.b64decode(firma_value)
                            image = BytesIO(img_decoded)
                            new_payload['firmasdoc'][firma_key] = InlineImage(doc, image, width=Mm(50))

                t_r0 = time.perf_counter()
                # Optimización: Usar autoescape=False reduce overhead de seguridad innecesaria
                # y deshabilitar undeclared para evitar chequeos costosos
                jinja_env_fast = Environment(
                    autoescape=False, 
                    trim_blocks=True, 
                    lstrip_blocks=True,
                    bytecode_cache=_bytecode_cache,
                    undefined=Undefined,  # Evita chequeos costosos de variables no definidas
                    finalize=_finalize_es
                )
                
                # Renderizar con ambiente optimizado y finalizador ES
                doc.render(new_payload, jinja_env=jinja_env_fast)
                t_render = time.perf_counter() - t_r0
                
                num_items = len(new_payload.get('items', [])) if isinstance(new_payload, dict) else 0
                # Proteger contra división por cero en el logging
                if num_items > 0:
                    print(f"[console.log][generar_documento] render: {t_render*1000:.1f} ms ({num_items} items, {t_render/num_items*1000:.2f}ms/item)", flush=True)
                else:
                    print(f"[console.log][generar_documento] render: {t_render*1000:.1f} ms (sin items)", flush=True)
                logger.info("[generar_documento] render: %.1f ms (%d items, %.2fms/item)", t_render*1000, num_items, t_render/num_items*1000 if num_items > 0 else 0)

                file_uuid = uuid.uuid4()

                extension = os.path.splitext(plantilla.doc_plantilla.name)[1]
                new_filename = f"{file_uuid}{extension}"
                t_save0 = time.perf_counter()
                archivo = self.document_to_inmemory_uploadedfile(doc, new_filename)
                t_save = time.perf_counter() - t_save0
                print(f"[console.log][generar_documento] crear InMemoryUploadedFile: {t_save*1000:.1f} ms", flush=True)
                logger.info("[generar_documento] crear InMemoryUploadedFile: %.1f ms", t_save*1000)
                return archivo
            else:
                raise ValidationError('La plantilla no tiene un archivo digital asociado.')
        except ValidationError as e:
            error_message = {'error': e.detail}
            print(error_message)
            raise ValidationError(e.detail)

    def borrador(self, request):
        t_borrador_0 = time.perf_counter()
        usuario = request.user.persona.id_persona
        data_in = request.data.copy()
        data_in['id_persona_genera'] = usuario

        t_gen0 = time.perf_counter()
        documento = self.generar_documento(data_in)
        t_gen = time.perf_counter() - t_gen0
        print(f"[console.log][borrador] generar_documento total: {t_gen*1000:.1f} ms", flush=True)
        logger.info("[borrador] generar_documento total: %.1f ms", t_gen*1000)
        
        data_in['documento_generado'] = documento
        
        try:
            t_ser0 = time.perf_counter()
            serializer = self.serializer_class(data=data_in)
            t_ser_init = time.perf_counter() - t_ser0
            print(f"[console.log][borrador] init serializer: {t_ser_init*1000:.1f} ms", flush=True)
            logger.info("[borrador] init serializer: %.1f ms", t_ser_init*1000)
            
            t_val0 = time.perf_counter()
            serializer.is_valid(raise_exception=True)
            t_val = time.perf_counter() - t_val0
            print(f"[console.log][borrador] is_valid: {t_val*1000:.1f} ms", flush=True)
            logger.info("[borrador] is_valid: %.1f ms", t_val*1000)
            
            t_save0 = time.perf_counter()
            serializer.save()
            t_save = time.perf_counter() - t_save0
            print(f"[console.log][borrador] serializer.save (upload S3): {t_save*1000:.1f} ms", flush=True)
            logger.info("[borrador] serializer.save (upload S3): %.1f ms", t_save*1000)

            t_borrador_total = time.perf_counter() - t_borrador_0
            print(f"[console.log][borrador] TOTAL borrador(): {t_borrador_total*1000:.1f} ms", flush=True)
            logger.info("[borrador] TOTAL borrador(): %.1f ms", t_borrador_total*1000)
            
            return serializer
        except ValidationError as e:
            raise ValidationError(e.detail)
        

    def actualizar_documento(self, request, persona_firma=None):   
        try:
            data_in = request.data.copy()

            documento = DocumentosGenerados.objects.filter(id_documento_generado=data_in['id_documento_generado']).first()
               
            if Utils.archivo_existe_en_s3(documento.documento_generado.name):               
                doc = DocxTemplate(documento.documento_generado)

                if 'consecutivo' in data_in:    
                    if documento.id_plantilla_doc.id_config_consecutivo:
                        consecutivo, fecha_consecutivo = self.get_consecutivo(documento.id_plantilla_doc.id_config_consecutivo)
                        data_in['variables']['consecutivo'] = consecutivo
                        documento.fecha_consecutivo = fecha_consecutivo
                        documento.consecutivo = consecutivo
                    else:
                        raise ValidationError("No existe la configuración de consecutivo.")

                if data_in['variables']:
                    if persona_firma:
                        firma = data_in['variables'].get(persona_firma)
                        img_decoded = base64.b64decode(firma)
                        image = BytesIO(img_decoded)
                        data_in['variables'][persona_firma] = InlineImage(doc, image, width=Mm(20))

                    else:
                        if documento.variables:
                            documento.variables.update(data_in['variables'])
                        else:
                            documento.variables = data_in['variables']
                # Usar el mismo entorno optimizado con finalizador ES
                jinja_env_fast = Environment(
                    autoescape=False,
                    trim_blocks=True,
                    lstrip_blocks=True,
                    bytecode_cache=_bytecode_cache,
                    undefined=Undefined,
                    finalize=_finalize_es
                )
                doc.render(data_in['variables'], jinja_env=jinja_env_fast)
                archivo = self.document_to_inmemory_uploadedfile(doc, documento.documento_generado.name)
                documento.documento_generado = archivo
                documento.save()
                serializer = self.serializer_class(documento)
                return serializer
            else:
                raise ValidationError('La plantilla no tiene un archivo digital asociado.')

        except ValidationError as e:
            raise ValidationError(e.detail)
        
    def cargar_documento(self, request):
        usuario = request.user.persona.id_persona
        data_in = request.data.copy()
        documento_enviado = request.FILES.get('documento_generado')

        if 'id_documento_generado' in data_in:
            documento = DocumentosGenerados.objects.filter(id_documento_generado=data_in['id_documento_generado']).first()
            if not documento:
                raise NotFound("No existe el documento generado.")
            
            documento.documento_generado.delete()
            documento.documento_generado = documento_enviado
            documento.cargado = True
            documento.save()
            serializer = self.serializer_class(documento) 
            return serializer

        else:
            data_in['id_persona_genera'] = usuario
            data_in['documento_generado'] = documento_enviado
            data_in['cargado'] = True
        
            serializer = self.serializer_class(data=data_in)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return serializer





class AsignacionDocsView(generics.GenericAPIView):
    serializer_class = AsignacionDocsSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data_in = request.data.copy()
        usuario = request.user.persona.id_persona
        data_in['id_persona_asigna'] = usuario
        data_in['fecha_asignacion'] = datetime.now()

        asignacion_doc = AsignacionDocs.objects.filter(id_documento_generado=data_in['id_documento_generado'], id_persona_asignada=data_in['id_persona_asignada']).first()
        if asignacion_doc:
            raise ValidationError("Ya existe una asignación para este documento y esta persona.")
        
        try:
            serializer = AsignacionDocsCreateSerializer(data=data_in)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{**serializer.data}},status=status.HTTP_201_CREATED)
        except ValidationError as e:
            raise ValidationError(e.detail)
        
    def get(self, request):
        usuario = request.user.persona.id_persona
        asignacion = AsignacionDocs.objects.filter(id_persona_asignada=usuario).all()
        if not asignacion:
            raise NotFound("No existen registros.")
        serializador = self.serializer_class(asignacion,many=True)
        
        return Response({'success':True,'detail':'Se encontraron los siguientes registros.','data':serializador.data},status=status.HTTP_200_OK)
    
    def delete(self, request, pk):
        instance = AsignacionDocs.objects.filter(id_asignacion_doc=pk).first()
        if not instance:
            raise NotFound("No existe registro.")
        
        if instance.cod_estado_asignacion:
            raise PermissionDenied("No se puede eliminar la asignación porque ya tiene un estado definido.")
        
        serializer = self.serializer_class(instance)
        instance.delete()

        return Response({
            "success": True,
            "detail": "Se eliminó el registro correctamente",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    


class AceptarRechazarAsignacionView(generics.GenericAPIView):
    serializer_class = AsignacionDocsSerializer
    permission_classes = [IsAuthenticated]

    def put(self, request):
        data_in = request.data.copy()
        data_in['fecha_eleccion_estado'] = datetime.now()

        asignacion_doc = AsignacionDocs.objects.filter(id_asignacion_doc=data_in['id_asignacion_doc']).first()
        if not asignacion_doc:
            raise NotFound("No existe la asignación.")
        
        if asignacion_doc.cod_estado_asignacion:
            raise PermissionDenied("No se puede modificar la asignación porque ya tiene un estado definido.")
        
        try:
            serializer = self.serializer_class(asignacion_doc, data=data_in, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{**serializer.data}},status=status.HTTP_201_CREATED)
        except ValidationError as e:
            raise ValidationError(e.detail)