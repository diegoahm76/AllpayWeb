from io import BytesIO
from datetime import datetime, timedelta
import time
import logging
import calendar
import boto3
import base64
from django.conf import settings
from django.http import HttpResponse, HttpResponsePermanentRedirect
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from recaudos.models.documento_models import DocumentosGenerados
from recaudos.models.recaudos_models import (
    DetallesFacturaUnica,
    FacturaUnica,
    CargueSicex,
    FechasCierre,
    FechasVigencia,
    LiquidacionesFacturaUnica,
    Pagos,
    PazYSalvo,
    PazYSalvoFacturas,
    PuertosExportacion,
    PorcentajesCobro,
    ConfiguracionConsecutivo,
    HistoricoPazYSalvo,
    CobroPersuasivo,
    PersuasivoFacturas,
    AccionesCobroPersuasivo,
    CobroCoactivo,
    CoactivoFacturas
    )
from recaudos.serializers.tipos_cacao_serializers import (
    CargueSicexSerializer,
    DetallePazYSalvoSerializer, 
    FacturasCarteraSerializer, 
    DatosRecaudadorSerializer,
    FacturasPagadasSerializer,
    LiquidacionFacturaSerializer,
    PazySalvoGetSerializer, 
    PazySalvoSerializer, 
    PuertosExportacionSerializer,
    PazYSalvoFacturasSerializer,
    UpdatePazYSalvoSerializer,
    FechasVigenciaSerializer,
    LiquidacionFacturaPagadasSerializer,
    CobroPersuasivoSerializer,
    CobroPersuasivoCreateSerializer,
    CobroPersuasivoListSerializer,
    PersuasivoFacturasSerializer,
    AccionesCobroPersuasivoSerializer,
    CobroCoactivoSerializer,
    CobroCoactivoCreateSerializer,
    CobroCoactivoListSerializer,
    CobroCoactivoUpdateSerializer,
    CoactivoFacturasSerializer,
    ConvertirPersuasivoACoactivoSerializer
)

from seguridad.models.seguridad_models import User
from seguridad.models.transversal_models import Personas
from django.utils.timezone import now
from django.db import transaction, models
from decimal import Decimal
from django.db.models import Max, Min, Count, Sum, Prefetch, Q
from rest_framework.views import APIView
from django.forms import ValidationError
from recaudos.utils import Utils
from seguridad.utils import Util
from rest_framework.test import APIRequestFactory
from requests import Request
from rest_framework.test import APIRequestFactory
from recaudos.views.documentos_views import GeneradorDocumentosView, ConvertWordToPdfView
from recaudos.models.documento_models import PlantillasDoc
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from seguridad.views.personas_views import CustomPagination
from rest_framework import generics
from django.db import transaction
from seguridad.views.personas_views import CustomPagination
from seguridad.models.alertas_models import ConfiguracionClaseAlerta
from permissions.permissions_gestor_de_recaudadores import (
    PermisoConsultarCartera,
    PermisoConsultarCarteraExterno,
)
from permissions.permissions_gestor_de_deudores import (
    PermisoCrearGenerarPazYSalvo,
    PermisoConsultarGenerarPazYSalvo,
    PermisoActualizarAdministracionPazYSalvo,
)
from django.template.loader import render_to_string
from seguridad.models.seguridad_models import Roles, UsuariosRol
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
import pandas as pd
from django.utils.timezone import make_aware
from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago, SolicitudAcuerdosPago


ALLOWED_EXCEL_EXTENSIONS = ["xlsx", "xls"]
factory = APIRequestFactory()

def obtener_url_documento(request, id_plantilla, variables, pdf):
    """
    Genera (o reutiliza) un documento a partir de una plantilla y devuelve el id del documento.
    Optimizaciones:
    - Reutiliza documento si ya existe con el mismo id_plantilla y mismas variables.
    - Instrumentación de tiempos para perfilar cuellos de botella.
    """

    logger = logging.getLogger(__name__)

    t0 = time.perf_counter()
    # Opción: Deshabilitar reuse si los datos cambian frecuentemente
    # Descomenta las siguientes líneas para saltar la búsqueda de reutilización:
    # print(f"[console.log][obtener_url_documento] reuse disabled (datos dinámicos)", flush=True)
    # skip_reuse = True
    
    skip_reuse = False  # Cambiar a True para deshabilitar reuse
    
    if not skip_reuse:
        # Intento de reutilización: buscar un documento con mismas variables y plantilla
        try:
            t_reuse0 = time.perf_counter()
            # Reutilizar según si se requiere PDF (finalizado=True) o borrador Word (finalizado=False)
            existente = DocumentosGenerados.objects.only('id_documento_generado', 'documento_generado').filter(
                id_plantilla_doc_id=id_plantilla,
                variables=variables,
                finalizado=bool(pdf)
            ).order_by('-id_documento_generado').first()
            t_reuse_query = time.perf_counter() - t_reuse0
            print(f"[console.log][obtener_url_documento] reuse query: {t_reuse_query*1000:.1f} ms", flush=True)
            logger.info("[obtener_url_documento] reuse query: %.1f ms", t_reuse_query*1000)
            
            if existente and existente.documento_generado:
                t_reuse = time.perf_counter() - t0
                print(f"[console.log][obtener_url_documento] reuse hit: {t_reuse*1000:.1f} ms id={existente.id_documento_generado}", flush=True)
                logger.info("[obtener_url_documento] reuse hit: %.1f ms id=%s", t_reuse*1000, existente.id_documento_generado)
                return existente.id_documento_generado
            else:
                print(f"[console.log][obtener_url_documento] reuse miss: generando nuevo documento", flush=True)
                logger.info("[obtener_url_documento] reuse miss: generando nuevo documento")
        except Exception as e:
            # No bloquear por fallos en la búsqueda de reutilización
            logger.warning("[obtener_url_documento] reuse lookup failed: %s", e)
            print(f"[console.log][obtener_url_documento] reuse lookup error: {e}", flush=True)
    else:
        print(f"[console.log][obtener_url_documento] reuse deshabilitado (skip_reuse=True)", flush=True)
        logger.info("[obtener_url_documento] reuse deshabilitado")

    t_fake0 = time.perf_counter()
    class FakeRequest:
        def __init__(self, user, variables, id_documento=None):
            self.user = user
            self.data = {
                "id_plantilla_doc": id_plantilla,
                "variables": variables,
                "documento_generado": id_documento
            }

    fake_request = FakeRequest(request.user, variables, None)
    t_fake = time.perf_counter() - t_fake0
    print(f"[console.log][obtener_url_documento] crear FakeRequest: {t_fake*1000:.1f} ms", flush=True)
    logger.info("[obtener_url_documento] crear FakeRequest: %.1f ms", t_fake*1000)

    t_init0 = time.perf_counter()
    generador_documento = GeneradorDocumentosView()
    convertidor_documento = ConvertWordToPdfView()
    t_init = time.perf_counter() - t_init0
    print(f"[console.log][obtener_url_documento] init views: {t_init*1000:.1f} ms", flush=True)
    logger.info("[obtener_url_documento] init views: %.1f ms", t_init*1000)
    
    t_borr0 = time.perf_counter()
    data_documento = generador_documento.borrador(fake_request)
    t_borr = time.perf_counter() - t_borr0
    print(f"[console.log][obtener_url_documento] generador_documento.borrador(): {t_borr*1000:.1f} ms", flush=True)
    logger.info("[obtener_url_documento] generador_documento.borrador(): %.1f ms", t_borr*1000)

    t_check0 = time.perf_counter()
    if data_documento:
        t_get_data0 = time.perf_counter()
        # Acceder directamente al instance del serializer en lugar de .data (evita serialización completa)
        id_documento_generado = data_documento.instance.id_documento_generado
        t_get_data = time.perf_counter() - t_get_data0
        print(f"[console.log][obtener_url_documento] obtener id_documento de instance: {t_get_data*1000:.1f} ms", flush=True)
        logger.info("[obtener_url_documento] obtener id_documento de instance: %.1f ms", t_get_data*1000)
        
        if not id_documento_generado:
            raise ValidationError("No se pudo generar el documento.")
        
        t_create_post0 = time.perf_counter()
        post_request = FakeRequest(request.user, variables, id_documento_generado)
        t_create_post = time.perf_counter() - t_create_post0
        print(f"[console.log][obtener_url_documento] crear post_request: {t_create_post*1000:.1f} ms", flush=True)
        logger.info("[obtener_url_documento] crear post_request: %.1f ms", t_create_post*1000)
        
        print(f"[console.log][obtener_url_documento] pdf={pdf}", flush=True)
        logger.info("[obtener_url_documento] pdf=%s", pdf)
        
        if pdf:
            t_pdf0 = time.perf_counter()
            print(f"[console.log][obtener_url_documento] INICIANDO conversión a PDF...", flush=True)
            logger.info("[obtener_url_documento] INICIANDO conversión a PDF...")
            respuesta = convertidor_documento.post(post_request)
            t_pdf = time.perf_counter() - t_pdf0
            print(f"[console.log][obtener_url_documento] convertir a PDF: {t_pdf*1000:.1f} ms", flush=True)
            logger.info("[obtener_url_documento] convertir a PDF: %.1f ms", t_pdf*1000)
            if respuesta.status_code != status.HTTP_201_CREATED:
                # Devuelve el mensaje de error exacto de la conversión
                raise ValidationError(f"Error al generar PDF: {getattr(respuesta, 'data', respuesta)}")
        else:
            print(f"[console.log][obtener_url_documento] NO se requiere conversión a PDF", flush=True)
            logger.info("[obtener_url_documento] NO se requiere conversión a PDF")
        
        t_before_return = time.perf_counter()
        print(f"[console.log][obtener_url_documento] Tiempo desde inicio hasta antes de return: {(t_before_return - t0)*1000:.1f} ms", flush=True)
        logger.info("[obtener_url_documento] Tiempo desde inicio hasta antes de return: %.1f ms", (t_before_return - t0)*1000)
        
        t_total = time.perf_counter() - t0
        print(f"[console.log][obtener_url_documento] TOTAL: {t_total*1000:.1f} ms id={id_documento_generado}", flush=True)
        logger.info("[obtener_url_documento] TOTAL: %.1f ms id=%s", t_total*1000, id_documento_generado)
        return id_documento_generado

    raise ValidationError("No se generó el documento")

def eliminar_documento(id_documento):
    documento = DocumentosGenerados.objects.filter(id_documento_generado=id_documento).first()
    if not documento:
        return Response({
            "success": False,
            "detail": "El documento no existe."
        }, status=status.HTTP_404_NOT_FOUND)
    # Eliminar el documento anterior si existe
    try:
        documento.documento_generado.delete()
        documento.delete()
    except Exception as e:
        return Response({
            "success": False,
            "detail": str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    

class FechasVigenciaView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FechasVigenciaSerializer

    def get(self, request):
        fechas_vigentes = FechasVigencia.objects.all()
        serializer = self.serializer_class(fechas_vigentes, many=True)
        return Response({
            "success": True,
            "detail": "Fechas de vigencia obtenidas correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        data = request.data
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontró la persona asociada al usuario."
            }, status=status.HTTP_404_NOT_FOUND)
        data['id_persona_actualiza'] = persona.id_persona

        try:
            serializer = self.serializer_class(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "detail": "Fecha de vigencia creada correctamente.",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    "success": False,
                    "detail": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
    def put(self, request, cod):
        data = request.data
        fecha_vigente = FechasVigencia.objects.filter(cod_tipo_fecha=cod).first()
        if not fecha_vigente:
            return Response({
                "success": False,
                "detail": "Fecha de vigencia no encontrada."
            }, status=status.HTTP_404_NOT_FOUND)
        
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontró la persona asociada al usuario."
            }, status=status.HTTP_404_NOT_FOUND)
        data['id_persona_actualiza'] = persona.id_persona
        data['cod_tipo_fecha'] = cod

        serializer = self.serializer_class(fecha_vigente, data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "detail": "Fecha de vigencia actualizada correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": False,
                "detail": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        

class FechasVigenciaDetailView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FechasVigenciaSerializer

    def get(self, request, cod):
        
        fecha_vigente = FechasVigencia.objects.filter(cod_tipo_fecha=cod).first()
        if not fecha_vigente:
            return Response({
                "success": False,
                "detail": "Fecha de cierre no encontrada."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(fecha_vigente)
        return Response({
            "success": True,
            "detail": "Fecha de cierre obtenida correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class CargueMasivoSicexValidate(APIView):
    permission_classes = [IsAuthenticated]

    CAMPOS_REQUERIDOS = {
        "EXP": [
            'AÑO', 'ADUANA EMBARQUE', 'AUTO EMBARQUE', 'CONTINENTE', 'DESCRIPCIÓN ARANCEL',
            'EMPRESA DECLARANTE/EXPORTADOR', 'EMPRESA IMPORTADOR', 'FECHA (YYYY-MM-DD)', 'MES',
            'NIT', 'NO. DECLARACIÓN', 'PAÍS DESTINO', 'POSICIÓN', 'POS', 'TOTAL PESO BRUTO (KG)',
            'TOTAL EN TONELADAS (BRUTO)', 'TOTAL PESO NETO (KG)', 'TOTAL EN TONELADAS (NETO)',
            'FACTOR DE CONVERSIÓN A GRANO', 'TOTAL VALOR CIF (US$)', 'TOTAL VALOR FOB (US$)', 'VÍA'
        ],
        "IMP": [
            'AÑO', 'ADUANA EMBARQUE', 'CIUDAD DE INGRESO', 'CONTINENTE', 'DEPARTAMENTO', 'DESCRIPCIÓN ARANCEL',
            'EMPRESA DECLARANTE/IMPORTADOR', 'EMPRESA EXPORTADOR', 'FECHA (YYYY-MM-DD)', 'MES',
            'NIT', 'NO. DECLARACIÓN', 'PAÍS ORIGEN', 'POSICIÓN', 'POS', 'PROVEEDOR',
            'TOTAL PESO BRUTO (KG)', 'TOTAL EN TONELADAS (BRUTO)', 'TOTAL PESO NETO (KG)',
            'TOTAL EN TONELADAS (NETO)', 'FACTOR DE CONVERSIÓN A GRANO',
            'TOTAL VALOR CIF (US$)', 'TOTAL VALOR FOB (US$)', 'VÍA'
        ]
    }

    def validar_info_excel(self, df, tipo_cargue, fecha_inicio, fecha_fin):
        if df.empty:
            raise ValidationError("El archivo Excel está vacío.")

        tipo_cargue = tipo_cargue.upper()
        if tipo_cargue not in self.CAMPOS_REQUERIDOS:
            raise ValidationError(f"Tipo de cargue inválido: {tipo_cargue}")

        campos_requeridos = set(self.CAMPOS_REQUERIDOS[tipo_cargue])
        columnas_archivo = set(df.columns)

        # Validar rango de fechas
        if 'FECHA (YYYY-MM-DD)' not in df.columns:
            raise ValidationError("No existe la columna 'FECHA (YYYY-MM-DD)' en el archivo.")

        df['FECHA (YYYY-MM-DD)'] = pd.to_datetime(df['FECHA (YYYY-MM-DD)'], errors='coerce')

        if fecha_inicio and fecha_fin:
            fecha_inicio = pd.to_datetime(fecha_inicio, errors='coerce')
            fecha_fin = pd.to_datetime(fecha_fin, errors='coerce')
            df = df[(df['FECHA (YYYY-MM-DD)'] >= fecha_inicio) & (df['FECHA (YYYY-MM-DD)'] <= fecha_fin)]

        # Validar columnas faltantes
        faltantes = campos_requeridos - columnas_archivo
        if faltantes:
            raise ValidationError(f"Faltan columnas obligatorias en el archivo: {', '.join(faltantes)}")

        # Validar valores nulos con multihilos
        def check_nulos(col):
            if df[col].isnull().any():
                return col, df.index[df[col].isnull()].tolist()
            return None

        nulos = {}
        with ThreadPoolExecutor(max_workers=8) as executor:  # ajusta según CPU
            futures = {executor.submit(check_nulos, col): col for col in campos_requeridos}
            for future in as_completed(futures):
                result = future.result()
                if result:
                    col, filas = result
                    nulos[col] = filas

        if nulos:
            errores = "; ".join([f"{col} (filas: {filas})" for col, filas in nulos.items()])
            raise ValidationError(f"Se encontraron valores nulos en columnas: {errores}")

        cant_registros = len(df)
        if cant_registros == 0:
            raise ValidationError("No se encontraron registros dentro del rango de fechas especificado.")

        return df, cant_registros




# class CargueMasivoSicexValidate(APIView):
#     permission_classes = [IsAuthenticated]
        
#     def validar_info_excel(self, df, tipo_cargue, fecha_inicio, fecha_fin):

#         if df.empty:
#             raise ValidationError("El archivo Excel está vacío.")
        
#         if tipo_cargue == 'EXP':

#             campos_requeridos = ['AÑO', 'ADUANA EMBARQUE', 'AUTO EMBARQUE', 'CONTINENTE', 'DESCRIPCIÓN ARANCEL',
#                                  'EMPRESA DECLARANTE/EXPORTADOR', 'EMPRESA IMPORTADOR','FECHA (YYYY-MM-DD)', 'MES',
#                                  'NIT', 'NO. DECLARACIÓN', 'PAÍS DESTINO', 'POSICIÓN', 'POS', 'TOTAL PESO BRUTO (KG)',
#                                  'TOTAL EN TONELADAS (BRUTO)', 'TOTAL PESO NETO (KG)', 'TOTAL EN TONELADAS (NETO)', 
#                                  'FACTOR DE CONVERSIÓN A GRANO', 'TOTAL VALOR CIF (US$)', 'TOTAL VALOR FOB (US$)', 'VÍA']                                 
            
#             for campo in campos_requeridos:
#                 if campo not in df.columns:
#                     raise ValidationError(f"El archivo Excel debe contener la columna '{campo}'.")
#                 if df[campo].isnull().any():
#                     raise ValidationError(f"La columna '{campo}' no puede tener valores nulos.")
            
#         elif tipo_cargue == 'IMP':

#             campos_requeridos = ['AÑO', 'ADUANA EMBARQUE', 'CIUDAD DE INGRESO', 'CONTINENTE', 'DEPARTAMENTO', 'DESCRIPCIÓN ARANCEL',
#                                  'EMPRESA DECLARANTE/IMPORTADOR', 'EMPRESA EXPORTADOR', 'FECHA (YYYY-MM-DD)', 'MES', 'NIT', 
#                                  'NO. DECLARACIÓN', 'PAÍS ORIGEN', 'POSICIÓN', 'POS', 'PROVEEDOR', 'TOTAL PESO BRUTO (KG)', 
#                                  'TOTAL EN TONELADAS (BRUTO)', 'TOTAL PESO NETO (KG)', 'TOTAL EN TONELADAS (NETO)', 
#                                  'FACTOR DE CONVERSIÓN A GRANO', 'TOTAL VALOR CIF (US$)', 'TOTAL VALOR FOB (US$)', 'VÍA']
            
#             for campo in campos_requeridos:
#                 if campo not in df.columns:
#                     raise ValidationError(f"El archivo Excel debe contener la columna '{campo}'.")
#                 if df[campo].isnull().any():
#                     filas_nulas = df[df[campo].isnull()].index.tolist()
#                     raise ValidationError(
#                         f"La columna '{campo}' no puede tener valores nulos. Filas afectadas: {filas_nulas}"
#                     )
#                     # raise ValidationError(f"La columna '{campo}' no puede tener valores nulos.")
                
#         cant_registros = 0
        
#         # Obtener cantidad de registros dentro del rango de fecha inicio y fecha fin
#         if 'FECHA (YYYY-MM-DD)' in df.columns:
#             df['FECHA (YYYY-MM-DD)'] = pd.to_datetime(df['FECHA (YYYY-MM-DD)'], errors='coerce')
#             if fecha_inicio and fecha_fin:
#                 fecha_inicio = pd.to_datetime(fecha_inicio, errors='coerce')
#                 fecha_fin = pd.to_datetime(fecha_fin, errors='coerce')
#                 df = df[(df['FECHA (YYYY-MM-DD)'] >= fecha_inicio) & (df['FECHA (YYYY-MM-DD)'] <= fecha_fin)]
#                 cant_registros = len(df)

#         if cant_registros == 0:
#             raise ValidationError("No se encontraron registros dentro del rango de fechas especificado.")
#         else:        
#             return df, cant_registros
        
    def post(self, request):
        usuario = request.user
        tipo_cargue = request.data.get("tipo_cargue")
        archivo = request.FILES.get("archivo")
        fecha_inicio = request.data.get("fecha_inicio")
        fecha_fin = request.data.get("fecha_fin")
        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None

        if not archivo:
            return Response({
                "success": False,
                "detail": "Debe adjuntar el archivo Excel."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Utils.validador_dato_tipo(tipo_cargue, "texto")
        try:
            Utils.validador_dato_tipo("texto", tipo_cargue)
            if tipo_cargue not in ['EXP', 'IMP']:
                raise ValueError("El tipo de cargue debe ser 'EXP' o 'IMP'.")
            Utils.validador_dato_tipo("fecha", fecha_inicio)
            Utils.validador_dato_tipo("fecha", fecha_fin)
        except ValueError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            Utils.validate_file(archivo, ALLOWED_EXCEL_EXTENSIONS)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:

            df = pd.read_excel(archivo, header=0)
            df, cant_registros = self.validar_info_excel(df, tipo_cargue, fecha_inicio, fecha_fin)
        
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al leer el Excel: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = {
            "cantidad_registros": cant_registros,
            "tipo_cargue": tipo_cargue,
            "archivo": archivo.name,
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }

        # Si llegó hasta aquí, es porque todo va bien
        return Response({
            "success": True,
            "message": "Archivo validado correctamente",
            "data": data
        }, status=status.HTTP_200_OK)
    

class CargueMasivoSicexView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer

    def formatear_decimal(self, valor):
        
        if isinstance(valor, str):
            valor = valor.replace(".", "").replace(",", ".")
        try:
            return "{:,.2f}".format(round(float(valor),2)).replace(",", "")
        except (ValueError, TypeError):
            return valor

    def get_consecutivo_sicex(self):
        try:
            return CargueSicex.objects.latest('consecutivo_sicex').consecutivo_sicex + 1
        except CargueSicex.DoesNotExist:
            return 1
        
    def create_cargue_sicex(self, archivo, tipo_cargue, consecutivo_sicex, usuario, fecha_inicio, fecha_fin):
        try:
            Utils.validate_file(archivo, ALLOWED_EXCEL_EXTENSIONS)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            df = pd.read_excel(archivo, header=0)
            validate_info = CargueMasivoSicexValidate()
            df, cant_registros = validate_info.validar_info_excel(df, tipo_cargue, fecha_inicio, fecha_fin)
            print(cant_registros)
        except ValueError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al leer el Excel: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = {
                "cod_tipo_cargue": tipo_cargue,
                "consecutivo_sicex": consecutivo_sicex,
                "id_persona_cargue": usuario.persona.id_persona
            }

            if tipo_cargue == 'EXP':
                # Procesar datos de exportación
                for _, fila in df.iterrows():
                    # Aquí se procesan los datos de exportación
                    data["agno"] = fila["AÑO"]
                    data["aduana_embarque"] = fila["ADUANA EMBARQUE"]
                    data["auto_embarque"] = fila["AUTO EMBARQUE"]
                    data["ciudad_ingreso"] = ""
                    data["continente"] = fila["CONTINENTE"]
                    data["departamento"] = ""
                    data["descripcion_arancel"] = fila["DESCRIPCIÓN ARANCEL"]
                    data["empresa_declarante"] = fila["EMPRESA DECLARANTE/EXPORTADOR"]
                    data["empresa_operadora"] = fila["EMPRESA IMPORTADOR"]
                    data["fecha"] = fila["FECHA (YYYY-MM-DD)"]
                    data["mes"] = fila["MES"]
                    data["nit"] = fila["NIT"]
                    data["nro_declaracion"] = fila["NO. DECLARACIÓN"]
                    data["pais"] = fila["PAÍS DESTINO"]
                    data["posicion"] = fila["POSICIÓN"]
                    data["pos"] = fila["POS"]
                    data["proveedor"] = ""
                    data["total_peso_bruto"] = self.formatear_decimal(fila["TOTAL PESO BRUTO (KG)"])
                    data["total_toneladas_bruto"] = self.formatear_decimal(fila["TOTAL EN TONELADAS (BRUTO)"])
                    data["total_peso_neto"] = self.formatear_decimal(fila["TOTAL PESO NETO (KG)"])
                    data["total_toneladas_neto"] = self.formatear_decimal(fila["TOTAL EN TONELADAS (NETO)"])
                    data["factor_conversion"] = self.formatear_decimal(fila["FACTOR DE CONVERSIÓN A GRANO"])
                    data["total_valor_cif"] = self.formatear_decimal(fila["TOTAL VALOR CIF (US$)"])
                    data["total_valor_fob"] = self.formatear_decimal(fila["TOTAL VALOR FOB (US$)"])
                    data["via"] = fila["VÍA"]
                    
                    serializer = self.serializer_class(data=data)
                    if serializer.is_valid():
                        serializer.save()
                    else:
                        raise ValidationError(serializer.errors)

            elif tipo_cargue == 'IMP':
                # Procesar datos de importación
                for _, fila in df.iterrows():
                   
                    # Aquí se procesan los datos de importación
                    data["agno"] = fila["AÑO"]
                    data["aduana_embarque"] = fila["ADUANA EMBARQUE"]
                    data["auto_embarque"] = ""
                    data["ciudad_ingreso"] = fila["CIUDAD DE INGRESO"]
                    data["continente"] = fila["CONTINENTE"]
                    data["departamento"] = fila["DEPARTAMENTO"]
                    data["descripcion_arancel"] = fila["DESCRIPCIÓN ARANCEL"]
                    data["empresa_declarante"] = fila["EMPRESA DECLARANTE/IMPORTADOR"]
                    data["empresa_operadora"] = fila["EMPRESA EXPORTADOR"]
                    data["fecha"] = fila["FECHA (YYYY-MM-DD)"]
                    data["mes"] = fila["MES"]
                    data["nit"] = fila["NIT"]
                    data["nro_declaracion"] = fila["NO. DECLARACIÓN"]
                    data["pais"] = fila["PAÍS ORIGEN"]
                    data["posicion"] = fila["POSICIÓN"]
                    data["pos"] = fila["POS"]
                    data["proveedor"] = fila["PROVEEDOR"]
                    data["total_peso_bruto"] = fila["TOTAL PESO BRUTO (KG)"]
                    data["total_toneladas_bruto"] = self.formatear_decimal(fila["TOTAL EN TONELADAS (BRUTO)"])
                    data["total_peso_neto"] = fila["TOTAL PESO NETO (KG)"]
                    data["total_toneladas_neto"] = self.formatear_decimal(fila["TOTAL EN TONELADAS (NETO)"])
                    data["factor_conversion"] = self.formatear_decimal(fila["FACTOR DE CONVERSIÓN A GRANO"])
                    data["total_valor_cif"] = fila["TOTAL VALOR CIF (US$)"]
                    data["total_valor_fob"] = fila["TOTAL VALOR FOB (US$)"]
                    data["via"] = fila["VÍA"]

                    serializer = self.serializer_class(data=data)
                    if serializer.is_valid():
                        serializer.save()
                    else:
                        raise ValidationError(f"Errores de validación en la fila {fila.name}: ", serializer.errors)

            return cant_registros
                    
        except Exception as e:
            raise ValidationError(f"Error al crear el registro: {str(e)}")


    def post(self, request):

        usuario = request.user
        tipo_cargue = request.data.get("tipo_cargue")
        archivo = request.FILES.get("archivo")
        fecha_inicio = request.data.get("fecha_inicio")
        fecha_fin = request.data.get("fecha_fin")
        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None

        try:
            Utils.validador_dato_tipo("texto", tipo_cargue)
            if tipo_cargue not in ['EXP', 'IMP']:
                raise ValueError("El tipo de cargue debe ser 'EXP' o 'IMP'.")
            Utils.validador_dato_tipo("fecha", fecha_inicio)
            Utils.validador_dato_tipo("fecha", fecha_fin)
        except ValueError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        if not tipo_cargue:
            return Response({
                "success": False,
                "detail": "El tipo de cargue es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not archivo:
            return Response({
                "success": False,
                "detail": "Debe adjuntar el archivo Excel."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            consecutivo_sicex = self.get_consecutivo_sicex()
            cant_registros = self.create_cargue_sicex(archivo, tipo_cargue, consecutivo_sicex, usuario, fecha_inicio, fecha_fin)  
        except Exception as e:
            # Manejo de errores
            print(f"Error al procesar el archivo: {str(e)}")
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_CarSic'
        data_alerta['informacion_complemento_mensaje'] = f"Cargue SICEX creado. Tipo de cargue: {tipo_cargue}, Consecutivo: {consecutivo_sicex}, Registros procesados: {cant_registros}"

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        data = {
            "tipo_cargue": tipo_cargue,
            "consecutivo_sicex": consecutivo_sicex,
            "cantidad_registros": cant_registros,
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }


        return Response({
            "success": True,
            "detail": f"Se procesaron exitosamente los registros.",
            "data": data
        }, status=status.HTTP_201_CREATED)


# class CargueMasivoSicexView(APIView):
#     permission_classes = [IsAuthenticated]
#     serializer_class = CargueSicexSerializer

#     def formatear_decimal(self, valor):
#         if isinstance(valor, str):
#             valor = valor.replace(".", "").replace(",", ".")
#         try:
#             return round(float(valor), 2)
#         except (ValueError, TypeError):
#             return 0.0

#     def get_consecutivo_sicex(self):
#         try:
#             return CargueSicex.objects.latest('consecutivo_sicex').consecutivo_sicex + 1
#         except CargueSicex.DoesNotExist:
#             return 1

#     def map_row_to_instance(self, fila, tipo_cargue, consecutivo_sicex, id_persona_cargue):
#         is_exp = tipo_cargue == 'EXP'
#         return CargueSicex(
#             cod_tipo_cargue=tipo_cargue,
#             consecutivo_sicex=consecutivo_sicex,
#             id_persona_cargue_id=id_persona_cargue,
#             agno=fila["AÑO"],
#             aduana_embarque=fila["ADUANA EMBARQUE"],
#             auto_embarque=fila["AUTO EMBARQUE"] if is_exp else "",
#             ciudad_ingreso=fila["CIUDAD DE INGRESO"] if not is_exp else "",
#             continente=fila["CONTINENTE"],
#             departamento=fila["DEPARTAMENTO"] if not is_exp else "",
#             descripcion_arancel=fila["DESCRIPCIÓN ARANCEL"],
#             empresa_declarante=fila["EMPRESA DECLARANTE/EXPORTADOR"] if is_exp else fila["EMPRESA DECLARANTE/IMPORTADOR"],
#             empresa_operadora=fila["EMPRESA IMPORTADOR"] if is_exp else fila["EMPRESA EXPORTADOR"],
#             fecha=fila["FECHA (YYYY-MM-DD)"],
#             mes=fila["MES"],
#             nit=fila["NIT"],
#             nro_declaracion=fila["NO. DECLARACIÓN"],
#             pais=fila["PAÍS DESTINO"] if is_exp else fila["PAÍS ORIGEN"],
#             posicion=fila["POSICIÓN"],
#             pos=fila["POS"],
#             proveedor="" if is_exp else fila["PROVEEDOR"],
#             total_peso_bruto=self.formatear_decimal(fila["TOTAL PESO BRUTO (KG)"]),
#             total_toneladas_bruto=self.formatear_decimal(fila["TOTAL EN TONELADAS (BRUTO)"]),
#             total_peso_neto=self.formatear_decimal(fila["TOTAL PESO NETO (KG)"]),
#             total_toneladas_neto=self.formatear_decimal(fila["TOTAL EN TONELADAS (NETO)"]),
#             factor_conversion=self.formatear_decimal(fila["FACTOR DE CONVERSIÓN A GRANO"]),
#             total_valor_cif=self.formatear_decimal(fila["TOTAL VALOR CIF (US$)"]),
#             total_valor_fob=self.formatear_decimal(fila["TOTAL VALOR FOB (US$)"]),
#             via=fila["VÍA"]
#         )


#     def create_cargue_sicex(self, df, tipo_cargue, consecutivo_sicex, id_persona_cargue):
#         def procesar_lote(sub_df):
#             instances = []
#             for fila in sub_df.itertuples(index=True):  # 👈 Incluye el índice
#                 try:
#                     instance = self.map_row_to_instance(
#                         fila._asdict(),
#                         tipo_cargue,
#                         consecutivo_sicex,
#                         id_persona_cargue
#                     )
#                     instances.append(instance)
#                 except Exception as e:
#                     raise ValidationError(f"Error al procesar la fila {fila.Index}: {str(e)}")

#             if instances:
#                 CargueSicex.objects.bulk_create(instances, batch_size=500)
#             else:
#                 raise ValidationError("No se generaron instancias para guardar.")

#         num_hilos = 5
#         dfs = np.array_split(df, num_hilos)

#         try:
#             with ThreadPoolExecutor(max_workers=num_hilos) as executor:
#                 list(executor.map(procesar_lote, dfs))
#         except Exception as e:
#             # Rollback manual
#             CargueSicex.objects.filter(consecutivo_sicex=consecutivo_sicex).delete()
#             raise ValidationError(
#                 f"Error durante el cargue, se eliminaron registros del consecutivo {consecutivo_sicex}. "
#                 f"Detalle: {str(e)}"
#             )

#         return len(df)


#     def post(self, request):
#         usuario = request.user
#         tipo_cargue = request.data.get("tipo_cargue", "").upper()
#         archivo = request.FILES.get("archivo")
#         fecha_inicio = request.data.get("fecha_inicio")
#         fecha_fin = request.data.get("fecha_fin")
#         persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()

#         if not tipo_cargue or tipo_cargue not in ['EXP', 'IMP']:
#             return Response({"success": False, "detail": "El tipo de cargue debe ser 'EXP' o 'IMP'."}, status=status.HTTP_400_BAD_REQUEST)
#         if not archivo:
#             return Response({"success": False, "detail": "Debe adjuntar el archivo Excel."}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             Utils.validador_dato_tipo("fecha", fecha_inicio)
#             Utils.validador_dato_tipo("fecha", fecha_fin)
#             Utils.validate_file(archivo, ["xls", "xlsx"])

#             df = pd.read_excel(archivo, header=0)
#             validator = CargueMasivoSicexValidate()
#             df, _ = validator.validar_info_excel(df, tipo_cargue, fecha_inicio, fecha_fin)

#             consecutivo = self.get_consecutivo_sicex()
#             cantidad_registros = self.create_cargue_sicex(df, tipo_cargue, consecutivo, persona.id_persona)

#             # Crear alerta (opcional)
#             data_alerta = {
#                 'cod_clase_alerta': 'Com_CarSic',
#                 'informacion_complemento_mensaje': f"Cargue SICEX creado. Tipo: {tipo_cargue}, Consecutivo: {consecutivo}, Registros: {cantidad_registros}"
#             }
#             alerta_config = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta='Com_CarSic').first()
#             if alerta_config and alerta_config.activa:
#                 Util.crear_alerta_evento_inmediato(data_alerta, alerta_config)

#             return Response({
#                 "success": True,
#                 "detail": "Registros cargados exitosamente.",
#                 "data": {
#                     "tipo_cargue": tipo_cargue,
#                     "consecutivo_sicex": consecutivo,
#                     "cantidad_registros": cantidad_registros,
#                     "fecha_inicio": fecha_inicio,
#                     "fecha_fin": fecha_fin
#                 }
#             }, status=status.HTTP_201_CREATED)

#         except ValidationError as e:
#             return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             print(f"Error en POST: {str(e)}")
#             return Response({"success": False, "detail": f"Error inesperado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class SicexListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer
    pagination_class = CustomPagination

    def get(self, request, consecutivo):        

        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']

        cargues_sicex = CargueSicex.objects.all()
        if consecutivo:
            cargues_sicex = cargues_sicex.filter(consecutivo_sicex=consecutivo)
        else:
            raise ValidationError("El consecutivo sicex es obligatorio.")
        
        if not cargues_sicex:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)
        
        if sin_paginacion:
            serializer = self.serializer_class(cargues_sicex, many=True)
            return Response({
                "success": True,
                "detail": "Registros encontrados.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        else:
            paginator = self.pagination_class()
            paginated_cargues_sicex = paginator.paginate_queryset(cargues_sicex, request)
            serializer = self.serializer_class(paginated_cargues_sicex, many=True)
            data = serializer.data

            return paginator.get_paginated_response({
                "success": True,
                "detail": "Registros encontrados.",
                "data": data
            })
        

class SicexDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer

    def delete(self, request, consecutivo):
        
        cargues_sicex = CargueSicex.objects.all()
        if consecutivo:
            cargues_sicex = cargues_sicex.filter(consecutivo_sicex=consecutivo)
        else:
            return Response({
                "success": False,
                "detail": "El consecutivo sicex es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not cargues_sicex.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron registros para eliminar."
            }, status=status.HTTP_404_NOT_FOUND)
        
        cantidad_eliminados = cargues_sicex.count()
        cargues_sicex.delete()
        
        return Response({
            "success": True,
            "detail": f"Se eliminaron {cantidad_eliminados} registro(s) exitosamente.",
            "data": {
                "consecutivo_sicex": consecutivo,
                "cantidad_eliminados": cantidad_eliminados
            }
        }, status=status.HTTP_200_OK)
        

class UpdateCargueMasivoSicexView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CargueSicexSerializer

    def delete_sicex(self, consecutivo):
        try:
            cargue_sicex = CargueSicex.objects.filter(consecutivo_sicex=consecutivo)
            cargue_sicex.delete()
            return Response({
                "success": True,
                "detail": "Cargue eliminado exitosamente."
            }, status=status.HTTP_204_NO_CONTENT)
        except CargueSicex.DoesNotExist:
            return Response({
                "success": False,
                "detail": "Cargue no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, consecutivo):
        
        cargue_sicex_old = CargueSicex.objects.filter(consecutivo_sicex=consecutivo).first()
        if not cargue_sicex_old:
            return Response({
                "success": False,
                "detail": "Cargue no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)

        archivo = request.FILES.get("archivo")
        fecha_inicio = request.data.get("fecha_inicio")
        fecha_fin = request.data.get("fecha_fin")
        tipo_cargue = cargue_sicex_old.cod_tipo_cargue
        consecutivo_sicex = cargue_sicex_old.consecutivo_sicex

        self.delete_sicex(consecutivo)

        if not archivo:
            return Response({
                "success": False,
                "detail": "Debe adjuntar el archivo Excel."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            create_cargue = CargueMasivoSicexView()
            cant_registros = create_cargue.create_cargue_sicex(archivo, tipo_cargue, consecutivo_sicex, request.user, fecha_inicio, fecha_fin)
            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_CarSic'
            data_alerta['informacion_complemento_mensaje'] = f"Cargue SICEX actualizado. Tipo de cargue: {tipo_cargue}, Consecutivo: {consecutivo_sicex}, Registros procesados: {cant_registros}"
            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta and configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

            return Response({
                "success": True,
                "detail": f"Se procesaron exitosamente {cant_registros} registros.",
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class SicexCargueDownloadView(APIView):

    def get(self, request, consecutivo):
        cargue_sices = CargueSicex.objects.filter(consecutivo_sicex=consecutivo)
        if not cargue_sices.exists():
            raise ValidationError("No se encontraron registros para el consecutivo proporcionado.")
        
        data = []
        header = []
         
        # Crear un DataFrame de pandas a partir de los datos
        if cargue_sices[0].cod_tipo_cargue == 'EXP':
            header = ['AÑO', 'ADUANA EMBARQUE', 'AUTO EMBARQUE', 'CONTINENTE', 'DESCRIPCIÓN ARANCEL',
                        'EMPRESA DECLARANTE/EXPORTADOR', 'EMPRESA IMPORTADOR','FECHA (YYYY-MM-DD)', 'MES',
                        'NIT', 'NO. DECLARACIÓN', 'PAÍS DESTINO', 'POSICIÓN', 'POS', 'TOTAL PESO BRUTO (KG)',
                        'TOTAL EN TONELADAS (BRUTO)', 'TOTAL PESO NETO (KG)', 'TOTAL EN TONELADAS (NETO)', 
                        'FACTOR DE CONVERSIÓN A GRANO', 'TOTAL VALOR CIF (US$)', 'TOTAL VALOR FOB (US$)', 'VÍA'] 
            for cargue in cargue_sices:
                data.append([
                    cargue.agno,
                    cargue.aduana_embarque,
                    cargue.auto_embarque,
                    cargue.continente,
                    cargue.descripcion_arancel,
                    cargue.empresa_declarante,
                    cargue.empresa_operadora,
                    cargue.fecha.strftime('%Y-%m-%d'),
                    cargue.mes,
                    cargue.nit,
                    cargue.nro_declaracion,
                    cargue.pais,
                    cargue.posicion,
                    cargue.pos,
                    cargue.total_peso_bruto,
                    cargue.total_toneladas_bruto,
                    cargue.total_peso_neto,
                    cargue.total_toneladas_neto,
                    cargue.factor_conversion,
                    cargue.total_valor_cif,
                    cargue.total_valor_fob,
                    cargue.via
                ])
            
        elif cargue_sices[0].cod_tipo_cargue == 'IMP':
            header = ['AÑO', 'ADUANA EMBARQUE', 'CIUDAD DE INGRESO', 'CONTINENTE', 'DEPARTAMENTO', 'DESCRIPCIÓN ARANCEL',
                        'EMPRESA DECLARANTE/IMPORTADOR', 'EMPRESA EXPORTADOR', 'FECHA (YYYY-MM-DD)', 'MES', 'NIT', 
                        'NO. DECLARACIÓN', 'PAÍS ORIGEN', 'POSICIÓN', 'POS', 'PROVEEDOR', 'TOTAL PESO BRUTO (KG)', 
                        'TOTAL EN TONELADAS (BRUTO)', 'TOTAL PESO NETO (KG)', 'TOTAL EN TONELADAS (NETO)', 
                        'FACTOR DE CONVERSIÓN A GRANO', 'TOTAL VALOR CIF (US$)', 'TOTAL VALOR FOB (US$)', 'VÍA']
            for cargue in cargue_sices:
                data.append([
                    cargue.agno,
                    cargue.aduana_embarque,
                    cargue.ciudad_ingreso,
                    cargue.continente,
                    cargue.departamento,
                    cargue.descripcion_arancel,
                    cargue.empresa_declarante,
                    cargue.empresa_operadora,
                    cargue.fecha.strftime('%Y-%m-%d'),
                    cargue.mes,
                    cargue.nit,
                    cargue.nro_declaracion,
                    cargue.pais,
                    cargue.posicion,
                    cargue.pos,
                    cargue.proveedor,
                    cargue.total_peso_bruto,
                    cargue.total_toneladas_bruto,
                    cargue.total_peso_neto,
                    cargue.total_toneladas_neto,
                    cargue.factor_conversion,
                    cargue.total_valor_cif,
                    cargue.total_valor_fob,
                    cargue.via
                ])

        df = pd.DataFrame(data, columns=header)
        output = BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0) 
        filename = f"resumen_sicex_{consecutivo}.xlsx"
        response = HttpResponse(output, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename={filename}'
        # Forzar el esquema HTTPS en la respuesta si se usa una URL absoluta
        response['Content-Security-Policy'] = "upgrade-insecure-requests"
        return response


class SicexResumenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        # Obtener los parámetros de fecha de inicio y fin del request
        fecha_inicio = request.query_params.get('fecha_inicio_cargue')
        fecha_fin = request.query_params.get('fecha_fin_cargue')
        tipo_cargue = request.query_params.get('tipo_cargue')
        tipo_cargue = tipo_cargue.upper() if tipo_cargue else None
        cargue_sicex = CargueSicex.objects.all()

        try:
            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
                
                cargue_sicex = cargue_sicex.filter(fecha_cargue__range=[fecha_inicio, fecha_fin])

                if not cargue_sicex.exists():
                    return Response({
                        "success": False,
                        "detail": "No se encontraron registros dentro del rango de fechas especificado."
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if tipo_cargue:
                Utils.validador_dato_tipo("texto", tipo_cargue)
                if tipo_cargue not in ['EXP', 'IMP']:
                    raise ValueError("El tipo de cargue debe ser 'EXP' o 'IMP'.")
                cargue_sicex = cargue_sicex.filter(cod_tipo_cargue=tipo_cargue)
        
        except ValueError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resumen = (
                cargue_sicex.values('consecutivo_sicex')
                .annotate(
                    fecha_cargue=Min('fecha_cargue'),
                    tipo_cargue=Max('cod_tipo_cargue'),
                    fecha_inicial=Min('fecha'),
                    fecha_final=Max('fecha'),
                    cantidad_registros=Count('id_cargue_sicex'),
                )
                .order_by('consecutivo_sicex')
            )
            # Agregar una valor de archivo vacío a cada elemento del resumen
            for item in resumen:
                if item['tipo_cargue'] == 'EXP':
                    item['nombre_tipo_cargue'] = 'Exportación'
                elif item['tipo_cargue'] == 'IMP':
                    item['nombre_tipo_cargue'] = 'Importación'
                    
                item['archivo'] = ""

            # Agregar la URL de descarga en vez del archivo en sí
            for item in resumen:

                archivo_url = request.build_absolute_uri(
                    f"/apii/cartera/sicex-cargue/resumen/{item['consecutivo_sicex']}/archivo/"
                    )
                # Forzar https
                archivo_url = archivo_url.replace("http://", "https://")

                item['archivo'] = archivo_url
            
            #Filtrar por fechas 

            return Response({
                "success": True,
                "detail": "Resumen de cargues SICEX",
                "data": resumen
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CarteraDownloadView(APIView):
    serializer_class = FacturasCarteraSerializer
    # permission_classes = [IsAuthenticated, PermisoConsultarCartera]

    def get(self, request, factura_id, user_id, *args, **kwargs):

        # Validar el ID de la factura
        if not factura_id or not user_id:
            return Response({
                "success": False,
                "detail": "El ID de la factura y el ID del usuario son obligatorios."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener el usuario autenticado
        user = User.objects.filter(id_usuario=user_id).first()
        if not user:
            return Response({
                "success": False,
                "detail": "Usuario no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Agregar el usuario a la solicitud
        request.user = user

        # Obtener la factura por su ID
        factura = FacturaUnica.objects.filter(id_factura_unica=factura_id).first()
        if not factura:
            return Response({
                "success": False,
                "detail": "Factura no encontrada."
            }, status=status.HTTP_404_NOT_FOUND)
        
        tasa_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
        fecha_actual = now().date().strftime('%Y-%m-%d')
        mes_actual_letra = Utils.mes_en_letras(fecha_actual)

        serializer = self.serializer_class(factura, many=False)
        data = serializer.data
 
        dias_mora = data['dias_mora'] or 0
        
        meses_mora = int(dias_mora / 30)
        agnos_mora = int(dias_mora / 365)

        fecha_str = data['fecha_compra'].split('T')[0] if data['fecha_compra'] else None
        fecha_compra = datetime.strptime(fecha_str, '%Y-%m-%d').date() if fecha_str else None
        fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
        dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
        if not fecha_compra:
            raise ValidationError("La fecha de compra no es válida.")

        mes_compra = fecha_compra.month + 1 if fecha_compra.month < 12 else 1
        anio_compra = fecha_compra.year if mes_compra > 1 else fecha_compra.year + 1
        fecha_limite = datetime(anio_compra, mes_compra, dia_limite).date()

        variables = {
            "fechadepago": Utils.formatear_fecha(str(fecha_actual)),
            "nombrerecaudador": data["razon_social_recaudador"],
            "fcompra": Utils.formatear_fecha(str(fecha_compra)),
            "tasa": f'{(tasa_dian.valor*100):.2f}' if tasa_dian else "0.00",
            "agnosmora": agnos_mora,
            "valorcuota": Utils.formato_peso(str(data["cuota_fomento"])),
            "numeromesesmora": str(meses_mora),
            "ndias": str(dias_mora),
            "agno": now().year,
            "fechadevencimiento": Utils.formatear_fecha(str(fecha_limite)),
            "numerodiasmora": str(dias_mora),
            "mesenletras": mes_actual_letra,
            "numerodocumento": str(data["nro_documento_recaudador"]),
            "valorinteres": Utils.formato_peso(str(data["valor_intereses"])),
            "VALORTOTALINTERESES": Utils.formato_peso(str(data["valor_intereses"]))
        }

        # Obtener el archivo asociado a la factura
        id_plantilla = PlantillasDoc.objects.filter(nombre="Cartera").first()
        url_documento = obtener_url_documento(request, id_plantilla.id_plantilla_doc, variables, True)
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        if not documento_generado:
            return Response({
                "success": False,
                "detail": "Documento no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        archivo = Util.obtener_archivos(documento_generado.documento_generado.name)
        print(archivo)

        data_alerta = {
            "cod_clase_alerta": "Com_ConCar",
            "informacion_complemento_mensaje": f"Descarga de cartera interna realizada. Factura ID: {factura_id}, Usuario: {user.nombre_de_usuario}"
        }
        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        if not archivo:
            return Response({
                "success": False,
                "detail": "Archivo no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)

        # Devolver el archivo como respuesta

        return Response({
            "success": True,
            "detail": "Archivo encontrado.",
            "archivo": archivo
        }, status=status.HTTP_200_OK)


class CarteraTotalesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        numero_documento = request.query_params.get('numero_documento')
        nro_factura = request.query_params.get('nro_factura')
        tiene_acuerdo_pago = request.query_params.get('tiene_acuerdo_pago')
        usuario = request.user

        facturas = FacturaUnica.objects.filter(id_porcentaje_cobro=2)
        
        # Si es usuario externo, filtrar solo sus facturas
        if not usuario.is_superuser and usuario.tipo_usuario == 'E':
            facturas = facturas.filter(id_persona_recaudador=usuario.persona)

        # Excluir pagadas
        liquidaciones_pagadas = LiquidacionesFacturaUnica.objects.filter(cod_estado="P").values_list('id_liq_factura_unica', flat=True)
        facturas = facturas.exclude(id_liq_factura_unica__in=liquidaciones_pagadas)

        # Filtrar por fechas
        try:
            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
                facturas = facturas.filter(fecha_compra__range=[fecha_inicio, fecha_fin])

            if numero_documento:
                Utils.validador_dato_tipo("entero", numero_documento)
                persona = Personas.objects.filter(numero_documento=numero_documento).first()
                facturas = facturas.filter(id_persona_recaudador=persona.id_persona) if persona else facturas.filter(id_persona_recaudador__isnull=True)

            # Filtro por número de factura
            if nro_factura:
                Utils.validador_dato_tipo("entero", nro_factura)
                facturas = facturas.filter(nro_factura_unica=nro_factura)

            # Filtro por acuerdo de pago (sí/no)
            if tiene_acuerdo_pago:
                from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago
                Utils.validador_dato_tipo("booleano", tiene_acuerdo_pago)
                facturas_con_acuerdo = DetalleAcuerdoPago.objects.values_list('id_factura_unica', flat=True)
                if tiene_acuerdo_pago.lower() == 'true':
                    # Solo facturas con acuerdo de pago
                    facturas = facturas.filter(id_factura_unica__in=facturas_con_acuerdo)
                else:
                    # Solo facturas sin acuerdo de pago
                    facturas = facturas.exclude(id_factura_unica__in=facturas_con_acuerdo)

        except (ValueError, ValidationError) as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not facturas.exists():
            return Response({"success": False, "detail": "No se encontraron registros."}, status=status.HTTP_404_NOT_FOUND)

        # Obtener tasa interés DIAN
        porcentaje = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
        tasa_dian = Decimal(porcentaje.valor) if porcentaje else Decimal('0.00')

        # Cálculo optimizado de valor_intereses en el queryset
        fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
        dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10

        hoy = now().date()

        facturas_data = []
        for factura in facturas:
            mes = factura.fecha_compra.month + 1 if factura.fecha_compra.month < 12 else 1
            anio = factura.fecha_compra.year if mes > 1 else factura.fecha_compra.year + 1
            fecha_limite_pago = datetime(anio, mes, dia_limite).date()
            dias_mora = max((hoy - fecha_limite_pago).days, 0)

            interes = (factura.cuota_fomento * tasa_dian * dias_mora) / Decimal('365') if factura.cuota_fomento > 0 else 0

            facturas_data.append({
                'total_kilos': float(factura.total_kilos),
                'cuota_fomento': float(factura.cuota_fomento),
                'valor_intereses': round(float(interes), 2)
            })

        # Calcular totales
        total_kilos = sum(f['total_kilos'] for f in facturas_data)
        total_cuota_fomento = sum(f['cuota_fomento'] for f in facturas_data)
        total_interes = sum(f['valor_intereses'] for f in facturas_data)

        return Response({
            "success": True,
            "detail": "Se encontraron las siguientes facturas",
            "data": {
                'total_kilos': round(total_kilos, 2),
                'total_cuota_fomento': round(total_cuota_fomento, 2),
                'total_interes': round(total_interes, 2)
            }
        })


class CarteraInternoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, PermisoConsultarCartera]
    serializer_class = FacturasCarteraSerializer

    def get_facturas_pagadas(self):
        liquidaciones = LiquidacionesFacturaUnica.objects.filter(cod_estado="P").values_list('id_liq_factura_unica', flat=True)
        return FacturaUnica.objects.filter(id_liq_factura_unica__in=liquidaciones).values_list('id_factura_unica', flat=True)

    def get(self, request):
        # Imports necesarios para el procesamiento
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        numero_documento = request.query_params.get('numero_documento')
        solo_mora_sin_acuerdo = request.query_params.get('solo_mora_sin_acuerdo')
        nro_factura = request.query_params.get('nro_factura')
        tiene_acuerdo_pago = request.query_params.get('tiene_acuerdo_pago')
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']

        facturas = FacturaUnica.objects.filter(id_porcentaje_cobro=2).select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).prefetch_related(
            'detalleacuerdopago_set__id_Solicitud_acuerdo_pago'
        ).order_by('-fecha_creacion')
        facturas_pagadas = self.get_facturas_pagadas()

        if facturas_pagadas:
            facturas = facturas.exclude(id_factura_unica__in=facturas_pagadas)

        try:
            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")

                facturas = facturas.filter(fecha_compra__range=[fecha_inicio, fecha_fin])

            if numero_documento:
                Utils.validador_dato_tipo("entero", numero_documento)
                persona = Personas.objects.filter(numero_documento=numero_documento).first()
                facturas = facturas.filter(id_persona_recaudador=persona.id_persona) if persona else facturas.filter(id_persona_recaudador__isnull=True)

            if solo_mora_sin_acuerdo:
                Utils.validador_dato_tipo("booleano", solo_mora_sin_acuerdo)
                if solo_mora_sin_acuerdo.lower() == 'true':
                    # Excluir facturas con acuerdos de pago
                    facturas_con_acuerdo = DetalleAcuerdoPago.objects.values_list('id_factura_unica', flat=True)
                    facturas = facturas.exclude(id_factura_unica__in=facturas_con_acuerdo)
                    
                    # Excluir facturas en cobro coactivo
                    from recaudos.models.recaudos_models import CoactivoFacturas
                    facturas_en_cobro_coactivo = CoactivoFacturas.objects.values_list('factura', flat=True)
                    facturas = facturas.exclude(id_factura_unica__in=facturas_en_cobro_coactivo)
                    
                    facturas_filtradas = []
                    for factura in facturas:
                        mes_fecha_compra = factura.fecha_compra.month + 1 if factura.fecha_compra.month < 12 else 1
                        anio_fecha_compra = factura.fecha_compra.year if mes_fecha_compra > 1 else factura.fecha_compra.year + 1
                        fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
                        dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
                        fecha_limite_pago = datetime(anio_fecha_compra, mes_fecha_compra, dia_limite)
                        dias_mora = (now().date() - fecha_limite_pago.date()).days
                        if dias_mora < 0:
                            dias_mora = 0
                        
                        if dias_mora > 0:
                            facturas_filtradas.append(factura.id_factura_unica)
                    
                    facturas = facturas.filter(id_factura_unica__in=facturas_filtradas)

            # Filtro por número de factura
            if nro_factura:
                Utils.validador_dato_tipo("entero", nro_factura)
                facturas = facturas.filter(nro_factura_unica=nro_factura)

            # Filtro por acuerdo de pago (sí/no)
            if tiene_acuerdo_pago:
                Utils.validador_dato_tipo("booleano", tiene_acuerdo_pago)
                facturas_con_acuerdo = DetalleAcuerdoPago.objects.values_list('id_factura_unica', flat=True)
                if tiene_acuerdo_pago.lower() == 'true':
                    # Solo facturas con acuerdo de pago
                    facturas = facturas.filter(id_factura_unica__in=facturas_con_acuerdo)
                else:
                    # Solo facturas sin acuerdo de pago
                    facturas = facturas.exclude(id_factura_unica__in=facturas_con_acuerdo)

        except (ValueError, ValidationError) as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not facturas.exists():
            return Response({"success": False, "detail": "No se encontraron registros."}, status=status.HTTP_404_NOT_FOUND)
        
        # Lógica condicional para paginación
        if sin_paginacion:
            # Sin paginación: optimizar para grandes volúmenes de datos
            # Pre-cargar datos que se usan en los métodos del serializer
            fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
            tasa_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
            
            # Añadir estos datos al contexto del serializer para evitar consultas repetidas
            context = {
                'request': request,
                'fecha_cierre': fecha_cierre,
                'tasa_dian': tasa_dian,
                'optimize_for_bulk': True
            }
            
            serializer = self.serializer_class(facturas, many=True, context=context)
            return Response({
                "success": True,
                "detail": "Se encontraron las siguientes facturas",
                "data": serializer.data
            })
        else:
            # Con paginación: usar PageNumberPagination
            paginator = PageNumberPagination()
            paginator.page_size = 10  # Número de elementos por página

            # Paginar el queryset primero
            paginated_facturas = paginator.paginate_queryset(facturas, request)

            # Serializar solo los resultados paginados
            serializer = self.serializer_class(paginated_facturas, many=True, context={'request': request})
            data = serializer.data

            return paginator.get_paginated_response({
                "success": True,
                "detail": "Se encontraron las siguientes facturas",

                "data": data
            })


class CarteraExternoView(APIView):
    permission_classes = [IsAuthenticated, PermisoConsultarCarteraExterno]
    serializer_class = FacturasCarteraSerializer

    def get_facturas_pagadas(self):
        liquidaciones = LiquidacionesFacturaUnica.objects.filter(cod_estado="P").values_list('id_liq_factura_unica', flat=True)
        return FacturaUnica.objects.filter(id_liq_factura_unica__in=liquidaciones).values_list('id_factura_unica', flat=True)

    def get(self, request):
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() in ['true', '1', 'si', 'yes']

        persona_id = request.user.persona.id_persona
        facturas = FacturaUnica.objects.filter(
            id_persona_recaudador=persona_id,
            id_porcentaje_cobro=2
        ).select_related(
            'id_persona_recaudador',
            'id_persona_proveedor', 
            'id_municipio_cacao',
            'id_departamento_cacao'
        ).prefetch_related(
            'detalleacuerdopago_set__id_Solicitud_acuerdo_pago'
        ).order_by('fecha_creacion')

        if not facturas.exists():
            return Response({"success": False, "detail": "No se encontraron registros para el usuario."}, status=status.HTTP_404_NOT_FOUND)

        facturas_pagadas = self.get_facturas_pagadas()
        if facturas_pagadas:
            facturas = facturas.exclude(id_factura_unica__in=facturas_pagadas)

        try:
            if fecha_inicio and fecha_fin:
                for f in [fecha_inicio, fecha_fin]:
                    Utils.validador_dato_tipo("fecha", f)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
                facturas = facturas.filter(fecha_compra__range=[fecha_inicio, fecha_fin])

        except (ValueError, ValidationError) as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not facturas.exists():
            return Response({"success": False, "detail": "No se encontraron registros."}, status=status.HTTP_404_NOT_FOUND)

        # Calcular totales del queryset filtrado
        from recaudos.models.recaudos_models import FechasCierre, PorcentajesCobro
        from decimal import Decimal
        
        # Obtener tasa de interés y fecha de cierre
        porcentaje = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
        tasa_dian = Decimal(porcentaje.valor) if porcentaje else Decimal('0.00')
        fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
        dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
        hoy = now().date()
        
        # Calcular totales
        total_kilos = Decimal('0.00')
        total_cuota_fomento = Decimal('0.00')
        total_interes = Decimal('0.00')
        
        for factura in facturas:
            total_kilos += factura.total_kilos or Decimal('0.00')
            total_cuota_fomento += factura.cuota_fomento or Decimal('0.00')
            
            # Calcular intereses
            if factura.cuota_fomento and factura.cuota_fomento > 0:
                mes = factura.fecha_compra.month + 1 if factura.fecha_compra.month < 12 else 1
                anio = factura.fecha_compra.year if mes > 1 else factura.fecha_compra.year + 1
                fecha_limite_pago = datetime(anio, mes, dia_limite).date()
                dias_mora = max((hoy - fecha_limite_pago).days, 0)
                interes = (Decimal(str(factura.cuota_fomento)) * tasa_dian * Decimal(dias_mora)) / Decimal('365')
                total_interes += interes
        
        totales = {
            'total_kilos': float(total_kilos),
            'total_cuota_fomento': float(total_cuota_fomento),
            'total_interes': round(float(total_interes), 2)
        }

        # Lógica condicional para paginación
        if sin_paginacion:
            # Sin paginación: optimizar para grandes volúmenes de datos
            from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago, SolicitudAcuerdosPago
            
            # Añadir estos datos al contexto del serializer para evitar consultas repetidas
            context = {
                'request': request,
                'fecha_cierre': fecha_cierre,
                'tasa_dian': porcentaje,
                'optimize_for_bulk': True
            }
            
            serializer = self.serializer_class(facturas, many=True, context=context)
            return Response({
                "success": True,
                "detail": "Se encontraron las siguientes facturas", 
                "data": serializer.data,
                "totales": totales
            })
        else:
            # Con paginación: usar PageNumberPagination
            paginator = PageNumberPagination()
            paginator.page_size = 10  # Número de elementos por página

            # Paginar el queryset primero
            paginated_facturas = paginator.paginate_queryset(facturas, request)

            # Serializar solo los resultados paginados
            serializer = self.serializer_class(paginated_facturas, many=True, context={'request': request})
            data = serializer.data

            response = paginator.get_paginated_response({
                "success": True,
                "detail": "Se encontraron las siguientes facturas", 
                "data": data
            })
            # Agregar totales a la respuesta paginada
            response.data['totales'] = totales
            return response
    

class PuertosExportacionView(APIView):
    serializer_class = PuertosExportacionSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        activo = request.query_params.get('activo')
        activo = activo if activo != '' else None
        puertos = PuertosExportacion.objects.all()
        if activo:
            Utils.validador_dato_tipo("booleano", activo)
            if activo.lower() == 'true':
                puertos = puertos.filter(activo=True)
            elif activo.lower() == 'false':
                puertos = puertos.filter(activo=False)
            else:
                return Response({
                    "success": False,
                    "detail": "El parámetro 'activo' debe ser 'true' o 'false'."
                }, status=status.HTTP_400_BAD_REQUEST)
        

        if not puertos.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron puertos de exportación."
            }, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(puertos, many=True)
        return Response({
            "success": True,
            "detail": "Puertos de exportación",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        data = request.data
        # Agregar persona que crea
        user_id = request.user.id_usuario 
        usuario = User.objects.filter(id_usuario=user_id).first()
        data['id_persona_crea'] = usuario.persona.id_persona
        serializer = self.serializer_class(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "detail": "Puerto de exportación registrado correctamente.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "detail": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request, pk):
        puerto = PuertosExportacion.objects.filter(id_puerto_exportacion=pk).first()
        if not puerto:
            return Response({
                "success": False,
                "detail": "Puerto no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data
        # Agregar persona que actualiza
        user_id = request.user.id_usuario
        usuario = User.objects.filter(id_usuario=user_id).first()
        data['id_persona_crea'] = usuario.persona.id_persona
        
        serializer = self.serializer_class(puerto, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "detail": "Puerto de exportación actualizado correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "detail": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        puerto = PuertosExportacion.objects.filter(id_puerto_exportacion=pk).first()
        if not puerto:
            return Response({
                "success": False,
                "detail": "Puerto no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        if puerto.item_ya_usado:
            return Response({
                "success": False,
                "detail": "No se puede eliminar el puerto de exportación porque ya ha sido utilizado."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        puerto.delete()
        return Response({
            "success": True,
            "detail": "Puerto de exportación eliminado correctamente."
        }, status=status.HTTP_204_NO_CONTENT)
    

class PuertosExportacionDetailView(APIView):
    serializer_class = PuertosExportacionSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        puerto = PuertosExportacion.objects.filter(id_puerto_exportacion=pk).first()
        if not puerto:
            return Response({
                "success": False,
                "detail": "Puerto no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.serializer_class(puerto)
        return Response({
            "success": True,
            "detail": "Puerto de exportación encontrado.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class DatosRecaudadorView(APIView):
    serializer_class = DatosRecaudadorSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontraron datos del recaudador."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.serializer_class(persona)

        return Response({
            "success": True,
            "detail": "Datos del recaudador",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    

class ConsecutivoPazySalvoView(APIView):
    serializer_class = PazySalvoSerializer
    permission_classes = [IsAuthenticated]

    def get_consecutivo_paz_y_salvo(self):
        """
        Genera el consecutivo de Paz y Salvo en formato 'NNN-YYYY'.
        """
        consecutivo = ConfiguracionConsecutivo.objects.filter(prefijo_consecutivo='PS').first()
        if not consecutivo:
            raise ValidationError("No se encontró el consecutivo de Paz y Salvo.")
        
        try:
            ultimo_num = consecutivo.consecutivo_actual
            nuevo_num = int(ultimo_num) + 1
            agno = consecutivo.anio_consecutivo
            cantidad_digitos = consecutivo.cantidad_digitos
            return f"{nuevo_num:0{cantidad_digitos}}-{agno}"
        except (ValueError, AttributeError):
            return Response({
                "success": False,
                "detail": "Error al generar el consecutivo de Paz y Salvo."
            }, status=status.HTTP_400_BAD_REQUEST)
            
    def get(self, request):
        """
        Genera el consecutivo de Paz y Salvo.
        """
        consecutivo = self.get_consecutivo_paz_y_salvo()
        return Response({
            "success": True,
            "detail": "Consecutivo generado correctamente.",
            "consecutivo": consecutivo
        }, status=status.HTTP_200_OK)
        

class PazYSalvoGenerarDocumentoView(APIView):
    permission_classes = [IsAuthenticated, PermisoCrearGenerarPazYSalvo]

    def generar_paz_y_salvo(self, request, id_recaudador):
        data = request.data
        # Usar Decimal para evitar artefactos binarios y permitir formateo correcto en documento
        total_kilos_paz = Decimal('0')
        cuota_fomento = Decimal(0)  # Inicializar como Decimal para mantener consistencia de tipos
        grupo_departamento = ""
        fecha_generacion = now().date()
        tipo_paz_y_salvo = data.get('tipo_paz_y_salvo')

        # Obtener datos del recaudador
        persona = Personas.objects.filter(id_persona=id_recaudador).first()
        if not persona:
            raise ValidationError("No se encontraron datos del recaudador.")
        
        
        #Validar el tipo de Paz y Salvo con choices
        if tipo_paz_y_salvo not in ['PP', 'PT', 'PV']:
            raise ValidationError("El tipo de Paz y Salvo no es válido.")
        
        # Validar el puerto de exportación: obligatorio para PP/PT, opcional para PV (Venta Nacional)
        puerto = None
        if tipo_paz_y_salvo in ['PP', 'PT']:
            id_puerto = data.get('id_puerto_exportacion')
            if not id_puerto:
                raise ValidationError("El puerto de exportación es obligatorio para este tipo de Paz y Salvo.")
            puerto = PuertosExportacion.objects.filter(id_puerto_exportacion=id_puerto).first()
            if not puerto:
                raise ValidationError("El puerto de exportación no existe.")
              
        if 'fecha_generacion' in data:
            if fecha_generacion > now().date():
                raise ValidationError("La fecha de generación no puede ser mayor a la fecha actual.")
        
        facturas = data.get('facturas', [])
        if not facturas:
            raise ValidationError("No se encontraron facturas para generar el Paz y Salvo.")

        for factura in facturas:
            id_factura = factura.get('id_factura')
            kilos_reportados = factura.get('kilos_reportar')
            
            print(f"\n🔍 DEBUG PAZ Y SALVO - Procesando factura:")
            print(f"   ID Factura: {id_factura}")
            print(f"   Kilos a reportar: {kilos_reportados}")
            
            if id_factura and kilos_reportados:
                factura_obj = FacturaUnica.objects.filter(id_factura_unica=id_factura).first()
                if not factura_obj:
                    raise ValidationError(f"Factura con ID {id_factura} no encontrada.")
                
                print(f"   ✅ Factura encontrada:")
                print(f"      Nro factura: {factura_obj.nro_factura_unica}")
                print(f"      Total kilos (BD): {factura_obj.total_kilos} (tipo: {type(factura_obj.total_kilos).__name__})")
                print(f"      Cuota fomento: {factura_obj.cuota_fomento}")
                print(f"      Valor bruto: {factura_obj.valor_bruto}")
                
                if kilos_reportados <= 0:
                    raise ValidationError(f"Los kilos reportados deben ser mayores a cero para la factura {factura_obj.nro_factura_unica}.")
                
                # Validar que total_kilos sea mayor a cero para evitar división por cero
                if not factura_obj.total_kilos or factura_obj.total_kilos <= 0:
                    print(f"   ❌ ERROR: total_kilos es cero o None")
                    raise ValidationError(f"La factura {factura_obj.nro_factura_unica} no tiene kilos totales válidos (total_kilos = {factura_obj.total_kilos}). No se puede generar el Paz y Salvo.")
                
                print(f"   📊 Calculando cuota de fomento proporcional:")
                print(f"      cuota_fomento: {factura_obj.cuota_fomento}")
                print(f"      kilos_reportados: {kilos_reportados}")
                print(f"      total_kilos: {factura_obj.total_kilos}")
                print(f"      Fórmula: ({factura_obj.cuota_fomento} * {kilos_reportados}) / {factura_obj.total_kilos}")
                
                # Convertir kilos_reportados a Decimal para evitar errores de tipo
                kilos_reportados_decimal = Decimal(str(kilos_reportados))
                # Acumular como Decimal (no float) para preservar precisión y permitir formateo ES
                total_kilos_paz += kilos_reportados_decimal
                
                cuota_proporcional = (factura_obj.cuota_fomento * kilos_reportados_decimal) / factura_obj.total_kilos
                cuota_fomento += cuota_proporcional
                
                print(f"      Cuota proporcional: {cuota_proporcional}")
                print(f"      Cuota acumulada: {cuota_fomento}")
                
                grupo_departamento = factura_obj.id_departamento_cacao.nombre if grupo_departamento == "" else " - ".join([grupo_departamento, factura_obj.id_departamento_cacao.nombre])

        print(f"\n📝 DEBUG - Preparando variables del documento:")
        print(f"   fecha_generacion: {fecha_generacion}")
        print(f"   mes_actual_letra...")
        
        mes_actual_letra = Utils.mes_en_letras(fecha_generacion)
        print(f"   ✅ mes_actual_letra: {mes_actual_letra}")
        
        print(f"   Buscando FechasVigencia...")
        fecha = FechasVigencia.objects.filter(cod_tipo_fecha='PS').first()
        if not fecha:
            raise ValidationError("No se encontró la fecha de cierre para Paz y Salvo.")
        dia_valido = fecha.dias_vigencia
        print(f"   ✅ dia_valido: {dia_valido}")
        
        print(f"   Convirtiendo cuota a letras: {cuota_fomento}")
        cuota_rounded = float(cuota_fomento)  # Convertir Decimal a float para round()
        print(f"   round(cuota_rounded): {round(cuota_rounded)}")
        valor_letras = Utils.convertir_numeros_a_letras(round(cuota_rounded))
        print(f"   ✅ valor_letras: {valor_letras}")

        contenido_qr = request.build_absolute_uri(
                    f"/apii/cartera/paz-salvo-verificar/{data.get('consecutivo')}/"
        )
        
        nombre_persona = ""
        if persona.razon_social:
            nombre_persona = str(persona.razon_social).upper()
        elif persona.primer_nombre:
            nombre_persona = ''.join(filter(None, [
                str(persona.primer_nombre).upper(),
                ' ', str(persona.segundo_nombre).upper() if persona.segundo_nombre else '',
                ' ', str(persona.primer_apellido).upper() if persona.primer_apellido else '',
                ' ', str(persona.segundo_apellido).upper() if persona.segundo_apellido else ''
            ]))

        variables = {
            "consepaz": str(data.get('consecutivo')),
            "razonsocial": nombre_persona,
            "documento": str(persona.numero_documento),
            "totalvalorcuotaletras": f'{str(valor_letras).upper()} PESOS /CTE',
            "totalvalorcuotapesos": Utils.formato_peso(cuota_fomento),
            # Enviar como float (JSON válido) y dejar que el finalizador ES lo formatee a es-CO con 2 decimales
            "totalkilospaz": float(total_kilos_paz),
            "gruponombredepartamento": grupo_departamento,
            "dia": str(fecha_generacion.day),
            "mes": mes_actual_letra,
            "agno": str(fecha_generacion.year),
            "diavalido": str(dia_valido),
            "qrimagen": contenido_qr
        }

        # Obtener el archivo asociado a la factura
        print(f"\n📄 DEBUG - Preparando plantilla:")
        print(f"   tipo_paz_y_salvo: {tipo_paz_y_salvo}")
        
        # Buscar la plantilla según el tipo
        if tipo_paz_y_salvo == 'PP':
            variables['nombrepuerto'] = str(puerto.nombre).upper()
            nombre_plantilla = "Paz Y Salvo Propio"
            print(f"   Buscando plantilla: '{nombre_plantilla}'")
            id_plantilla = PlantillasDoc.objects.filter(nombre=nombre_plantilla).first()
        elif tipo_paz_y_salvo == 'PT':
            variables['nombrepuerto'] = str(puerto.nombre).upper()
            variables['razonsocialtercero'] = str(data["razon_social_tercero"]).upper()
            variables['documentotercero'] = str(data['documento_tercero'])
            nombre_plantilla = "Paz Y Salvo Tercero"
            print(f"   Buscando plantilla: '{nombre_plantilla}'")
            id_plantilla = PlantillasDoc.objects.filter(nombre=nombre_plantilla).first()
        elif tipo_paz_y_salvo == 'PV':
            # En Venta Nacional, el documento se emite por la persona en sesión
            # (razonsocial/documento ya vienen del recaudador en 'variables').
            # Se agregan explícitamente los datos del tercero para la plantilla.
            # Variables adicionales para la plantilla de Venta Nacional
            variables['razonsocialtercero'] = str(data["razon_social_tercero"]).upper()
            variables['documentotercero'] = str(data['documento_tercero'])
            nombre_plantilla = "Paz Y Salvo Venta Nacional"
            print(f"   Buscando plantilla: '{nombre_plantilla}'")
            id_plantilla = PlantillasDoc.objects.filter(nombre=nombre_plantilla).first()
        else:
            raise ValidationError(f"Tipo de Paz y Salvo '{tipo_paz_y_salvo}' no válido.")

        # Validar que la plantilla existe
        if not id_plantilla:
            print(f"   ❌ ERROR: Plantilla '{nombre_plantilla}' NO encontrada en la BD")
            print(f"   📋 Plantillas disponibles en BD:")
            plantillas_disponibles = PlantillasDoc.objects.all().values_list('nombre', flat=True)
            for p in plantillas_disponibles:
                print(f"      - '{p}'")
            raise ValidationError(f"La plantilla '{nombre_plantilla}' no existe en la base de datos. Verifica que el nombre sea exacto (respetando mayúsculas, espacios y tildes).")
        
        print(f"   ✅ Plantilla encontrada: ID={id_plantilla.id_plantilla_doc}, Nombre='{id_plantilla.nombre}'")

        print(f"\n🎯 DEBUG - Variables completas para el documento:")
        for key, value in variables.items():
            print(f"   {key}: {value} (tipo: {type(value).__name__})")
        
        print(f"\n📝 DEBUG - Llamando a obtener_url_documento...")
        try:
            url_documento = obtener_url_documento(request, id_plantilla.id_plantilla_doc, variables, True)
            print(f"   ✅ Documento generado: {url_documento}")
        except Exception as e:
            print(f"   ❌ ERROR al generar documento:")
            print(f"      Tipo: {e.__class__.__name__}")
            print(f"      Mensaje: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
        documento_generado = DocumentosGenerados.objects.filter(id_documento_generado=url_documento).first()
        if not documento_generado:
            raise ValidationError("Documento no encontrado.")
        
        return documento_generado.id_documento_generado


    def post(self, request):

        # Obtener consecutivo de Paz y Salvo
        instance_consecutivo = ConsecutivoPazySalvoView()
        consecutivo = instance_consecutivo.get_consecutivo_paz_y_salvo()
        if not consecutivo:
            raise ValidationError("No se pudo generar el consecutivo de Paz y Salvo.")

        id_documento_anterior = request.data.get('id_documento_anterior') if request.data.get('id_documento_anterior') != '' else None

        # Generar el documento de Paz y Salvo
        try:
            request.data['consecutivo'] = consecutivo
            documento_id = self.generar_paz_y_salvo(request, request.user.persona.id_persona)
            documento = DocumentosGenerados.objects.filter(id_documento_generado=documento_id).first()
            if not documento:
                raise ValidationError("No se encontró el documento generado.")
            
            data_response = {
                "id_documento_generado": documento.id_documento_generado,
                "documento_generado": documento.documento_generado.name,
                "archivo": Util.obtener_archivos(documento.documento_generado.name)
            }
            
            if id_documento_anterior is not None:
                eliminar_documento(id_documento_anterior)
            
            return Response({
                "success": True,
                "detail": "Documento de Paz y Salvo generado correctamente.",
                "data": data_response
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
class LiquidacionesPagadasView(APIView):
    serializer_class = LiquidacionFacturaPagadasSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self, persona, es_usuario_interno=False, fecha_inicio=None, fecha_fin=None, tipo_documento=None, numero_documento=None):
        if es_usuario_interno:
            # Si es usuario interno, traer todas las liquidaciones pagadas
            queryset = LiquidacionesFacturaUnica.objects.filter(
                cod_estado='P'
            ).select_related(
                'doc_pago',
                'id_persona_liquida',
                'id_persona_liquida__tipo_documento'
            )
            
            # Filtros por fecha de liquidación
            if fecha_inicio:
                queryset = queryset.filter(fecha_liquidacion__date__gte=fecha_inicio)
            if fecha_fin:
                queryset = queryset.filter(fecha_liquidacion__date__lte=fecha_fin)
            
            # Filtros por tipo de documento y número de documento (solo para usuarios internos)
            if tipo_documento or numero_documento:
                # Filtrar por recaudador (persona que liquidó)
                if tipo_documento and numero_documento:
                    queryset = queryset.filter(
                        id_persona_liquida__tipo_documento__cod_tipo_documento=tipo_documento,
                        id_persona_liquida__numero_documento=numero_documento
                    )
                elif tipo_documento:
                    queryset = queryset.filter(
                        id_persona_liquida__tipo_documento__cod_tipo_documento=tipo_documento
                    )
                elif numero_documento:
                    queryset = queryset.filter(
                        id_persona_liquida__numero_documento=numero_documento
                    )
            
            return queryset.order_by('-fecha_liquidacion').distinct()
        else:
            # Si es usuario externo, traer solo las liquidaciones del recaudador
            queryset = LiquidacionesFacturaUnica.objects.filter(
                cod_estado='P',
                facturaunica__id_persona_recaudador=persona
            ).select_related(
                'doc_pago'
            )
            
            # Filtros por fecha de liquidación (solo para usuarios externos)
            if fecha_inicio:
                queryset = queryset.filter(fecha_liquidacion__date__gte=fecha_inicio)
            if fecha_fin:
                queryset = queryset.filter(fecha_liquidacion__date__lte=fecha_fin)
            
            return queryset.order_by('-fecha_liquidacion').distinct()

    def get(self, request):
        persona = getattr(request.user, 'persona', None)
        es_usuario_interno = request.user.tipo_usuario == 'I'

        if not persona and not es_usuario_interno:
            return Response({
                "success": False,
                "detail": "No se encontraron datos del recaudador."
            }, status=status.HTTP_404_NOT_FOUND)

        # Obtener parámetros de filtro
        fecha_inicio = request.query_params.get('fecha_inicio', None)
        fecha_fin = request.query_params.get('fecha_fin', None)
        tipo_documento = request.query_params.get('tipo_documento', None)
        numero_documento = request.query_params.get('numero_documento', None)
        sin_paginacion = request.query_params.get('sin_paginacion', 'false').lower() == 'true'

        # Validar y convertir fechas
        if fecha_inicio:
            try:
                fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "Formato de fecha_inicio inválido. Use YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if fecha_fin:
            try:
                fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "Formato de fecha_fin inválido. Use YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que fecha_inicio no sea mayor que fecha_fin
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            return Response({
                "success": False,
                "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que los filtros de documento solo se usen para usuarios internos
        if not es_usuario_interno and (tipo_documento or numero_documento):
            return Response({
                "success": False,
                "detail": "Los filtros de tipo de documento y número de documento solo están disponibles para usuarios internos."
            }, status=status.HTTP_403_FORBIDDEN)

        liquidaciones = self.get_queryset(
            persona, 
            es_usuario_interno,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            tipo_documento=tipo_documento,
            numero_documento=numero_documento
        )
        
        # Optimizar: filtrar en BD las liquidaciones con kilos pendientes > 0 usando subconsulta
        from django.db.models import Sum, Case, When, F, Value, DecimalField, OuterRef, Exists
        from django.db.models.functions import Coalesce, Cast
        from decimal import Decimal
        porcentaje_valor = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').values_list('valor', flat=True).first()
        try:
            porcentaje_valor = Decimal(str(porcentaje_valor)) if porcentaje_valor is not None else Decimal('1')
        except Exception:
            porcentaje_valor = Decimal('1')

        cert_expr = Coalesce(
            Sum(
                Case(
                    When(
                        detallesfacturaunica__id_tipo_cacao__nombre='Cacao en baba',
                        then=Cast(F('detallesfacturaunica__nro_kilos'), DecimalField(max_digits=20, decimal_places=2)) * Value(porcentaje_valor, output_field=DecimalField(max_digits=20, decimal_places=2))
                    ),
                    default=Cast(F('detallesfacturaunica__nro_kilos'), DecimalField(max_digits=20, decimal_places=2)),
                    output_field=DecimalField(max_digits=20, decimal_places=2)
                ),
                output_field=DecimalField(max_digits=20, decimal_places=2)
            ),
            Value(0, output_field=DecimalField(max_digits=20, decimal_places=2))
        )

        rep_expr = Coalesce(
            Sum('pazysalvofacturas__kilos_reportados', output_field=DecimalField(max_digits=20, decimal_places=2)),
            Value(0, output_field=DecimalField(max_digits=20, decimal_places=2))
        )

        facturas_sub = (
            FacturaUnica.objects.filter(id_liq_factura_unica=OuterRef('pk'))
            .annotate(cert=cert_expr, rep=rep_expr)
            .filter(cert__gt=F('rep'))
        )

        liquidaciones = liquidaciones.annotate(tiene_pendientes=Exists(facturas_sub)).filter(tiene_pendientes=True)
            
        if sin_paginacion:
            # Sin paginación
            serializador = self.serializer_class(liquidaciones, many=True)
            return Response({
                'success': True, 
                'detail': 'Se encontraron los siguientes registros.', 
                'data': serializador.data
            }, status=status.HTTP_200_OK)
        else:
            # Forzar paginación siempre a nivel de backend
            if 'page' not in request.query_params:
                request.query_params._mutable = True
                request.query_params['page'] = '1'
                request.query_params._mutable = False

            # Paginación y serialización sobre queryset filtrado en BD
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(liquidaciones, request)
            
            if page is not None:
                serializer = self.serializer_class(page, many=True)
                return paginator.get_paginated_response({
                    "success": True,
                    "detail": "Liquidaciones pagadas encontradas correctamente.",
                    "data": serializer.data
                })
            
            # Si no hay resultados después de paginar
            return Response({
                "success": True,
                "count": 0,
                "total_pages": 0,
                "current_page": 1,
                "next": None,
                "previous": None,
                "detail": "No se encontraron liquidaciones pagadas con los filtros especificados.",
                "data": []
            }, status=status.HTTP_200_OK)

    def post(self, request):
        """Generar Paz y Salvo para liquidaciones pagadas"""
        try:
            # Obtener consecutivo de Paz y Salvo
            instance_consecutivo = ConsecutivoPazySalvoView()
            consecutivo = instance_consecutivo.get_consecutivo_paz_y_salvo()
            if not consecutivo:
                return Response({
                    "success": False,
                    "detail": "No se pudo generar el consecutivo de Paz y Salvo."
                }, status=status.HTTP_400_BAD_REQUEST)

            persona = getattr(request.user, 'persona', None)
            if not persona:
                return Response({
                    "success": False,
                    "detail": "No se encontraron datos del recaudador."
                }, status=status.HTTP_404_NOT_FOUND)

            id_documento_anterior = request.data.get('id_documento_anterior') if request.data.get('id_documento_anterior') != '' else None

            # Generar el documento de Paz y Salvo
            request.data['consecutivo'] = consecutivo
            documento_id = PazYSalvoGenerarDocumentoView().generar_paz_y_salvo(request, persona.id_persona)
            documento = DocumentosGenerados.objects.filter(id_documento_generado=documento_id).first()
            if not documento:
                return Response({
                    "success": False,
                    "detail": "No se encontró el documento generado."
                }, status=status.HTTP_404_NOT_FOUND)
            
            data_response = {
                "id_documento_generado": documento.id_documento_generado,
                "documento_generado": documento.documento_generado.name,
                "archivo": Util.obtener_archivos(documento.documento_generado.name)
            }
            
            if id_documento_anterior is not None:
                eliminar_documento(id_documento_anterior)
            
            return Response({
                "success": True,
                "detail": "Documento de Paz y Salvo generado correctamente.",
                "data": data_response
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al generar el Paz y Salvo: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class LiquidacionesPagadasView(APIView):
#     serializer_class = LiquidacionFacturaPagadasSerializer
#     permission_classes = [IsAuthenticated]
#     pagination_class = CustomPagination

#     def get_queryset(self, persona):
#         return LiquidacionesFacturaUnica.objects.filter(
#             cod_estado='P',
#             facturaunica__id_persona_recaudador=persona
#         ).select_related(
#             'doc_pago'
#         ).order_by('-nro_doc_pago').distinct()

#     def get(self, request):
#         persona = getattr(request.user, 'persona', None)

#         if not persona:
#             return Response({
#                 "success": False,
#                 "detail": "No se encontraron datos del recaudador."
#             }, status=status.HTTP_404_NOT_FOUND)

#         # Obtener todas las liquidaciones asociadas
#         liquidaciones = self.get_queryset(persona)

#         if not liquidaciones.exists():
#             return Response({
#                 "success": False,
#                 "detail": "No se encontraron liquidaciones pagadas."
#             }, status=status.HTTP_404_NOT_FOUND)

#         # ✅ Reutilizamos FacturasPagadasView de forma masiva
#         facturas_view = FacturasPagadasView()
#         all_ids = [liq.id_liq_factura_unica for liq in liquidaciones]
#         facturas_pagadas = facturas_view.obtener_facturas_pagadas(all_ids)

#         # ✅ Creamos un set de IDs de liquidaciones que tienen facturas pagadas
#         ids_con_facturas_pagadas = {
#             factura.id_liq_factura_unica.id_liq_factura_unica
#             for factura in facturas_pagadas
#         }

#         # ✅ Filtramos las liquidaciones de forma eficiente
#         liquidaciones_filtradas = [
#             liq for liq in liquidaciones
#             if liq.id_liq_factura_unica in ids_con_facturas_pagadas
#         ]

#         if not liquidaciones_filtradas:
#             return Response({
#                 "success": False,
#                 "detail": "No se encontraron liquidaciones con facturas pagadas."
#             }, status=status.HTTP_404_NOT_FOUND)

#         # Paginación y serialización
#         paginator = self.pagination_class()
#         page = paginator.paginate_queryset(liquidaciones_filtradas, request)
#         serializer = self.serializer_class(page, many=True)

#         return paginator.get_paginated_response({
#             "success": True,
#             "detail": "Liquidaciones pagadas encontradas correctamente.",
#             "data": serializer.data
#         })



class FacturasPagadasView(APIView):
    serializer_class = FacturasPagadasSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination


    def get_total_kilos_certificados(self, factura, detalles, porcentaje_cacao):
        total_kilos = 0

        for detalle in detalles:
            if detalle.id_tipo_cacao.nombre == 'Cacao en baba' and porcentaje_cacao:
                total_kilos += round(detalle.nro_kilos * porcentaje_cacao.valor)
            else:
                total_kilos += round(detalle.nro_kilos)

        return total_kilos

    def get_persona(self, user):
        return getattr(user, 'persona', None)

    def obtener_facturas_pagadas(self, liquidacion_ids):
        print(f"[FacturasPagadasView] obtener_facturas_pagadas() -> liquidacion_ids: {liquidacion_ids}")
        porcentaje_cacao = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').first()
        fecha_vigencia = FechasVigencia.objects.filter(cod_tipo_fecha='FP').first()
        dias_pagados = fecha_vigencia.dias_vigencia if fecha_vigencia else 0
        fecha_limite = now().date() - timedelta(days=dias_pagados)

        facturas = FacturaUnica.objects.filter(
            id_liq_factura_unica__in=liquidacion_ids
        ).select_related('id_liq_factura_unica').prefetch_related(
            Prefetch('detallesfacturaunica_set'),
            Prefetch('pazysalvofacturas_set')
        ).order_by('-fecha_creacion')

        print(f"[FacturasPagadasView] Facturas candidates count: {facturas.count()}")

        facturas_validas = []

        for factura in facturas:
            detalles = list(factura.detallesfacturaunica_set.all())
            kilos_certificados = self.get_total_kilos_certificados(factura, detalles, porcentaje_cacao)

            kilos_reportados = factura.pazysalvofacturas_set.aggregate(
                total=Sum('kilos_reportados')
            )['total'] or 0
            print(f"[FacturasPagadasView] Factura {factura.id_factura_unica} -> kilos_certificados={kilos_certificados}, kilos_reportados={kilos_reportados}, liq_estado={getattr(factura.id_liq_factura_unica, 'cod_estado', None)}")
            # Incluir facturas sin kilos disponibles (kilos_certificados == kilos_reportados)
            if kilos_certificados >= kilos_reportados:
                facturas_validas.append(factura)

        print(f"[FacturasPagadasView] Facturas válidas (certificados>reportados): {len(facturas_validas)}")
        return facturas_validas

    def validar_fechas(self, fecha_inicio, fecha_fin):
        try:
            # Validar formato con datetime y tu validador
            fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
            fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
            Utils.validador_dato_tipo("fecha", fecha_inicio)
            Utils.validador_dato_tipo("fecha", fecha_fin)

            if fecha_inicio_dt > fecha_fin_dt:
                raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
            return fecha_inicio_dt, fecha_fin_dt
        except (ValueError, ValidationError) as e:
            raise ValidationError(str(e))

    def filtrar_por_fechas(self, facturas, fecha_inicio, fecha_fin):
        return [
            f for f in facturas
            if fecha_inicio <= f.id_liq_factura_unica.fecha_pago.date() <= fecha_fin
        ]

    def get(self, request):
        ids_param = request.query_params.get('ids_liquidacion')
        print(f"[FacturasPagadasView] GET ids_liquidacion raw: {ids_param}")
        if not ids_param:
            return Response({"success": False, "detail": "No se proporcionaron IDs de liquidación."}, status=400)

        try:
            liquidacion_ids = [int(i) for i in ids_param.split(',') if str(i).strip().isdigit()]
        except Exception as e:
            print(f"[FacturasPagadasView] Error parsing ids_liquidacion: {e}")
            return Response({"success": False, "detail": "IDs de liquidación no válidos."}, status=400)

        print(f"[FacturasPagadasView] liquidacion_ids parsed: {liquidacion_ids}")
        if not liquidacion_ids:
            return Response({"success": False, "detail": "IDs de liquidación no válidos."}, status=400)

        persona = self.get_persona(request.user)
        print(f"[FacturasPagadasView] persona: {getattr(persona, 'id_persona', None)}")
        if not persona:
            return Response({"success": False, "detail": "No se encontraron datos del recaudador."}, status=404)

        liquidaciones = LiquidacionesFacturaUnica.objects.filter(
            id_liq_factura_unica__in=liquidacion_ids,
            cod_estado='P'
        )

        found_count = liquidaciones.count()
        print(f"[FacturasPagadasView] Liquidaciones pagadas encontradas: {found_count} de {len(liquidacion_ids)}")
        if not liquidaciones.exists() or found_count != len(liquidacion_ids):
            faltantes = set(liquidacion_ids) - set(liquidaciones.values_list('id_liq_factura_unica', flat=True))
            print(f"[FacturasPagadasView] IDs faltantes (no pagadas o inexistentes): {sorted(list(faltantes))}")
            return Response({"success": False, "detail": "No se encontraron todas las liquidaciones pagadas.", "faltantes": sorted(list(faltantes))}, status=404)

        facturas_pagadas = self.obtener_facturas_pagadas(liquidacion_ids)
        if not facturas_pagadas:
            print(f"[FacturasPagadasView] No se encontraron facturas pagadas para las liquidaciones {liquidacion_ids}")
            # Responder 200 con lista vacía para no confundir con Not Found
            return Response({
                "success": True,
                "detail": "No hay facturas pagadas para los criterios indicados.",
                "data": []
            }, status=200)

        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        print(f"[FacturasPagadasView] filtros -> fecha_inicio={fecha_inicio}, fecha_fin={fecha_fin}")

        if fecha_inicio and fecha_fin:
            try:
                fi, ff = self.validar_fechas(fecha_inicio, fecha_fin)
                facturas_pagadas = self.filtrar_por_fechas(facturas_pagadas, fi, ff)

                if not facturas_pagadas:
                    print(f"[FacturasPagadasView] Sin resultados tras filtrar por fechas {fi} a {ff}")
                    return Response({
                        "success": False,
                        "detail": "No se encontraron registros dentro del rango de fechas especificado."
                    }, status=404)
            except ValidationError as e:
                print(f"[FacturasPagadasView] Error de validación de fechas: {e}")
                return Response({"success": False, "detail": str(e)}, status=400)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(facturas_pagadas, request)
        serializer = self.serializer_class(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Facturas pagadas encontradas correctamente.",
            "data": serializer.data
        })



class FacturasPagadasSeleccionadasView(APIView):
    serializer_class = FacturasPagadasSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        ids_facturas_str = request.query_params.getlist('ids_facturas')
        if ids_facturas_str is None or not ids_facturas_str:
            return Response({
                "success": False,
                "detail": "No se encontraron facturas seleccionadas."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ids_facturas = [id_factura.split(',') for id_factura in ids_facturas_str]
        ids_facturas = [int(id_factura) for sublist in ids_facturas for id_factura in sublist]
        ids_facturas = list(set(ids_facturas))

        # Obtener la persona asociada al usuario autenticaDO
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontraron datos del recaudador."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Filtrar las facturas pagadas por el usuario
        facturas_pagadas = FacturaUnica.objects.filter(
            id_factura_unica__in=ids_facturas
        )

        serializer = self.serializer_class(facturas_pagadas, many=True)

        return Response({
            "success": True,
            "detail": "Facturas pagadas",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class PazySalvoCreateView(APIView):
    serializer_class = PazySalvoSerializer
    serializer_class_detalle = PazYSalvoFacturasSerializer
    permission_classes = [IsAuthenticated, PermisoCrearGenerarPazYSalvo]

        
    def relacionar_factura(self, id_factura, id_paz_y_salvo, kilos_reportar):
        """
        Relaciona una factura con un Paz y Salvo.
        """
        try:
            factura = FacturaUnica.objects.get(id_factura_unica=id_factura)
        except FacturaUnica.DoesNotExist:
            raise ValidationError(f"Factura con ID {id_factura} no encontrada.")
        except Exception as e:
            raise ValidationError(f"Error al buscar la factura: {str(e)}")
        
        try:
            paz_y_salvo = PazYSalvo.objects.get(id_paz_y_salvo=id_paz_y_salvo)
        except PazYSalvo.DoesNotExist:
            raise ValidationError(f"Paz y Salvo con ID {id_paz_y_salvo} no encontrado.")
        except Exception as e:
            raise ValidationError(f"Error al buscar el Paz y Salvo: {str(e)}")
        
        if kilos_reportar is None:
            raise ValidationError("Los kilos a reportar son obligatorios.")

        # Aceptar decimales para kilos
        try:
            Utils.validador_dato_tipo("decimal", kilos_reportar)
            kilos_reportar = float(kilos_reportar)
        except ValueError:
            raise ValidationError("Los kilos a reportar deben ser un número válido.")
        
        # Obtener kilos reportados de la factura
        paz_y_salvo_registrados = PazYSalvoFacturas.objects.filter(
            id_factura_unica=factura.id_factura_unica
        )
        kilos_factura_pendientes = factura.total_kilos - sum(
            detalle.kilos_reportados for detalle in paz_y_salvo_registrados
        )

        if float(kilos_reportar) > float(kilos_factura_pendientes):
            raise ValidationError(f"Los kilos a reportar no deben superar los {kilos_factura_pendientes} kilos restantes de la factura.")

        try:
            detalle = self.serializer_class_detalle(data={
                'id_factura_unica': factura.id_factura_unica,
                'id_paz_y_salvo': paz_y_salvo.id_paz_y_salvo,
                'kilos_reportados': kilos_reportar,
            })
            if detalle.is_valid():
                detalle.save()
            else:
                raise ValidationError(f"Error al relacionar la factura: {detalle.errors}")
        except Exception as e:
            raise ValidationError(f"Error al relacionar la factura: {str(e)}")
        
    @transaction.atomic
    def crear_paz_y_salvo(self, request):

        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()

        if not persona:
            raise ValidationError("No se encontraron datos del recaudador.")

        data = request.data.copy()
        data['id_persona_genera'] = persona.id_persona
        data['fecha_generacion'] = now()
        # Reglas: Para PT y PV se requieren los datos de tercero
        if data['tipo_paz_y_salvo'] in ['PT', 'PV']:
            if data.get('razon_social_tercero', '') == '':
                raise ValidationError("La razón social es obligatoria para el tipo de Paz y Salvo seleccionado.")
            if data.get('nro_doc_tercero', '') == '':
                raise ValidationError("El número de documento es obligatorio para el tipo de Paz y Salvo seleccionado.")
            if data.get('id_tipo_doc_tercero', '') == '':
                raise ValidationError("El tipo de documento es obligatorio para el tipo de Paz y Salvo seleccionado.")
        else:
            # Para tipos distintos a PT/PV, limpiar campos de tercero
            data['razon_social_tercero'] = None
            data['nro_doc_tercero'] = None
            data['id_tipo_doc_tercero'] = None
            
        # Obtener consecutivo de Paz y Salvo
        instance_consecutivo = ConsecutivoPazySalvoView()
        consecutivo = instance_consecutivo.get_consecutivo_paz_y_salvo()
        if not consecutivo:
            raise ValidationError("No se pudo generar el consecutivo de Paz y Salvo.")
        
        
        data['nro_paz_y_salvo'] = consecutivo

        request.data["consecutivo"] = data['nro_paz_y_salvo']
        request.data["id_documento_anterior"] = data['doc_paz_y_salvo'] if data['doc_paz_y_salvo'] != '' else None
        # Pasar datos de tercero a la generación del documento cuando sea PT o PV
        request.data["razon_social_tercero"] = data['razon_social_tercero'] if data['tipo_paz_y_salvo'] in ['PT','PV'] else None
        request.data["documento_tercero"] = data['nro_doc_tercero'] if data['tipo_paz_y_salvo'] in ['PT','PV'] else None

        print('data: ', data)

        # Generar el documento de Paz y Salvo
        instance_documento = PazYSalvoGenerarDocumentoView()
        documento_id = instance_documento.generar_paz_y_salvo(request, persona.id_persona)
        documento = DocumentosGenerados.objects.filter(id_documento_generado=documento_id).first()

        if not documento:
            raise ValidationError("No se encontró el documento generado.")
        data['doc_paz_y_salvo'] = documento.id_documento_generado

        serializer = self.serializer_class(data=data)

        if serializer.is_valid():
            data_alerta = {
                'cod_clase_alerta': 'Com_GenPS',
                'informacion_complemento_mensaje': f"{persona.numero_documento} - {persona.razon_social or persona.primer_nombre} y nro Paz y Salvo: {data['nro_paz_y_salvo']}",
                'id_elemento_implicado': documento.id_documento_generado,
                'id_persona': persona.id_persona
            }
           
            config_alerta = ConfiguracionClaseAlerta.objects.filter(
                cod_clase_alerta=data_alerta['cod_clase_alerta']
            ).first()

            if config_alerta and config_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, config_alerta)

            serializer.save()
            id_paz_y_salvo = serializer.data['id_paz_y_salvo']
            facturas = request.data.get('facturas', [])

            # Marcar puerto como usado solo si fue enviado (no aplica para PV)
            if data.get('id_puerto_exportacion'):
                puerto = PuertosExportacion.objects.filter(
                    id_puerto_exportacion=data['id_puerto_exportacion']
                ).first()
                if puerto:
                    puerto.item_ya_usado = True
                    puerto.save()

            consecutivo_nuevo = ConfiguracionConsecutivo.objects.filter(prefijo_consecutivo='PS').first()
            if consecutivo_nuevo:
                consecutivo_nuevo.consecutivo_actual = int(consecutivo_nuevo.consecutivo_actual) + 1
                consecutivo_nuevo.save()

            # Relacionar facturas
            for factura in facturas:
                id_factura = factura.get('id_factura')
                kilos_reportados = factura.get('kilos_reportar')
                if id_factura and kilos_reportados:
                    try:
                        self.relacionar_factura(id_factura, id_paz_y_salvo, kilos_reportados)
                    except ValidationError as e:
                        # Deshacer cambios si hay un error
                        transaction.set_rollback(True)
                        raise ValidationError(f"Error al relacionar la factura: {str(e)}")

            return serializer.data

        raise ValidationError(f"Error al crear el Paz y Salvo: {serializer.errors}")
    

    def post(self, request):
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontraron datos del recaudador."
            }, status=status.HTTP_404_NOT_FOUND)
        try:
            data = self.crear_paz_y_salvo(request)
            if persona.email:
                subject = "Generación de Paz y Salvo"
                template = "paz-y-salvo-usuario.html"
                context = {'fechageneracion': Utils.formatear_fecha(now().date().strftime('%Y-%m-%d')),
                           'tipopazysalvo': data['nombre_tipo_paz_y_salvo'],
                           'consepaz': data['nro_paz_y_salvo'],
                           'kilosreportados': data['total_kilos_paz_y_salvo'],
                           'puerto': data.get('nombre_puerto')}
                template = render_to_string((template), context)
                email_data = {'template': template, 'email_subject': subject, 'to_email':persona.email}
                email = Util.send_email(email_data)
                
            return Response({
                "success": True,
                "detail": "Paz y Salvo creado correctamente.",
                "data": data
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": e.message
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class PazySalvoVerificarView(APIView):

    def get(self, request, consepaz):

        paz_y_salvo = PazYSalvo.objects.filter(nro_paz_y_salvo=consepaz).first()
        if not paz_y_salvo:
            return Response({
                "success": False,
                "detail": "Paz y Salvo no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        documento = DocumentosGenerados.objects.filter(id_documento_generado=paz_y_salvo.doc_paz_y_salvo.id_documento_generado).first()
        if not documento:
            return Response({
                "success": False,
                "detail": "Documento de Paz y Salvo no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Url para descargar el documento
        url_documento = Util.obtener_archivos(documento.documento_generado.name)
        if not url_documento:
            return Response({
                "success": False,
                "detail": "No se pudo obtener la URL del documento."
            }, status=status.HTTP_404_NOT_FOUND)
        
       # Redireccionar a la URL del documento
        return HttpResponsePermanentRedirect(url_documento)


class PazySalvoGetView(APIView):
    serializer_class = PazySalvoGetSerializer
    permission_classes = [IsAuthenticated,PermisoConsultarGenerarPazYSalvo]
    pagination_class = CustomPagination

    def get(self, request):
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        paz_y_salvo = PazYSalvo.objects.filter(id_persona_genera=persona.id_persona).order_by('-nro_paz_y_salvo')
        # Excluir Paz y Salvo sin facturas con kilos asociados
        paz_y_salvo = paz_y_salvo.filter(pazysalvofacturas__kilos_reportados__gt=0).distinct()

        try:
            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
                
                paz_y_salvo = paz_y_salvo.filter(
                    fecha_generacion__gte=fecha_inicio,
                    fecha_generacion__lte=fecha_fin
                ).order_by('-nro_paz_y_salvo')

                if not paz_y_salvo.exists():
                    return Response({
                        "success": False,
                        "detail": "No se encontraron registros dentro del rango de fechas especificado."
                    }, status=status.HTTP_404_NOT_FOUND)
                
        except (ValueError, ValidationError) as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(paz_y_salvo, request)
        if not page:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Serializar resultados
        serializer = self.serializer_class(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Acuerdos de pago encontrados correctamente.",
            "data": serializer.data
        })


class PazySalvoDetailView(APIView):
    serializer_class = DetallePazYSalvoSerializer
    permission_classes = [IsAuthenticated, PermisoConsultarGenerarPazYSalvo]

    def get(self, request, pk):
        paz_y_salvo = PazYSalvo.objects.filter(id_paz_y_salvo=pk).first()
        if not paz_y_salvo:
            return Response({
                "success": False,
                "detail": "Paz y Salvo no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        paz_y_salvo_facturas = PazYSalvoFacturas.objects.filter(id_paz_y_salvo=paz_y_salvo.id_paz_y_salvo)
        if not paz_y_salvo_facturas.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron facturas asociadas al Paz y Salvo."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.serializer_class(paz_y_salvo_facturas, many=True)
        return Response({
            "success": True,
            "detail": "Paz y Salvo encontrado.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    

class PazySalvoInternoView(APIView):
    serializer_class = PazySalvoGetSerializer
    permission_classes = [IsAuthenticated, PermisoConsultarGenerarPazYSalvo]
    pagination_class = CustomPagination

    def get(self, request):
        nro_documento = request.query_params.get('nro_documento') if request.query_params.get('nro_documento') != '' else None
        fecha_inicio = request.query_params.get('fecha_inicio') if request.query_params.get('fecha_inicio') != '' else None
        fecha_fin = request.query_params.get('fecha_fin') if request.query_params.get('fecha_fin') != '' else None   
        paz_y_salvo = PazYSalvo.objects.all().order_by('-nro_paz_y_salvo')
        # Excluir Paz y Salvo sin facturas con kilos asociados
        paz_y_salvo = paz_y_salvo.filter(pazysalvofacturas__kilos_reportados__gt=0).distinct()

        try:
            if nro_documento:
                Utils.validador_dato_tipo("entero", nro_documento)
                persona = Personas.objects.filter(
                    numero_documento=nro_documento
                ).first()
                if not persona:
                    raise ValidationError("El número de documento no es válido.")
                paz_y_salvo = paz_y_salvo.filter(
                    id_persona_genera=persona.id_persona
                ).order_by('-fecha_generacion')
                if not paz_y_salvo.exists():
                    return Response({
                        "success": False,
                        "detail": "No se encontraron registros para el número de documento especificado."
                    }, status=status.HTTP_404_NOT_FOUND)

            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
                
                paz_y_salvo = paz_y_salvo.filter(
                    fecha_generacion__gte=fecha_inicio,
                    fecha_generacion__lte=fecha_fin
                ).order_by('-fecha_generacion')

                if not paz_y_salvo.exists():
                    return Response({
                        "success": False,
                        "detail": "No se encontraron registros dentro del rango de fechas especificado."
                    }, status=status.HTTP_404_NOT_FOUND)
                
        except (ValueError, ValidationError) as e:
            return Response({
                "success": False,
                "detail": e.message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Aplicar paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(paz_y_salvo, request)
        if not page:
            return Response({
                "success": False,
                "detail": "No se encontraron registros."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Serializar resultados
        serializer = self.serializer_class(page, many=True)

        return paginator.get_paginated_response({
            "success": True,
            "detail": "Paz y salvos encontrados correctamente.",
            "data": serializer.data
        })


class PazySalvoUpdateView(APIView):
    serializer_class = UpdatePazYSalvoSerializer
    permission_classes = [IsAuthenticated, PermisoActualizarAdministracionPazYSalvo]

    def put(self, request, pk):
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontraron datos del recaudador."
            }, status=status.HTTP_404_NOT_FOUND)
        
        paz_y_salvo = PazYSalvo.objects.filter(id_paz_y_salvo=pk).first()
        if not paz_y_salvo:
            return Response({
                "success": False,
                "detail": "Paz y Salvo no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        fecha_actualizacion = request.data.get('fecha_actualizacion')

        if not fecha_actualizacion:
            return Response({
                "success": False,
                "detail": "La fecha de actualización es obligatoria."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            Utils.validador_dato_tipo("fecha", fecha_actualizacion)
        except ValueError:
            return Response({
                "success": False,
                "detail": "La fecha de actualización no es válida."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        puerto = PuertosExportacion.objects.filter(id_puerto_exportacion=request.data.get('id_puerto_exportacion')).first()
        if not puerto:
            return Response({
                "success": False,
                "detail": "El puerto de exportación no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        data = {
            'fecha_generacion': paz_y_salvo.fecha_generacion,
            'fecha_actualizacion': fecha_actualizacion,
            'es_actualizacion': True,
            'aprueba_actualizacion': False,
            'doc_paz_y_salvo': paz_y_salvo.doc_paz_y_salvo.id_documento_generado,
            'id_puerto_exportacion': puerto.id_puerto_exportacion
        }

        data_historial = {
            'id_paz_y_salvo': paz_y_salvo,
            'descripcion': "Solicitud de Paz y Salvo",
            'fecha_anterior': paz_y_salvo.fecha_generacion,
            'fecha_nueva': fecha_actualizacion,
            'puerto_exportacion_anterior': paz_y_salvo.id_puerto_exportacion.id_puerto_exportacion,
            'puerto_exportacion_nueva': puerto.id_puerto_exportacion,
            'estado': "SOLICITADA",
            'id_persona_modifica': persona
        }

        serializer = self.serializer_class(paz_y_salvo, data=data)

        if persona.email:
            subject = "Solicitud de actualización de Paz y Salvo"
            template = "paz-y-salvo-solicitud.html"
            context = {'fechaconsulta':Utils.formatear_fecha(now().date().strftime('%Y-%m-%d')),
                       'consepaz': paz_y_salvo.nro_paz_y_salvo,
                       'fechageneracion': Utils.formatear_fecha(paz_y_salvo.fecha_generacion.strftime('%Y-%m-%d')),
                       'iddocumento': paz_y_salvo.id_persona_genera.numero_documento}
            template = render_to_string((template), context)
            email_data = {'template': template, 'email_subject': subject, 'to_email':persona.email}
            email = Util.send_email(email_data)

        # Guardar el historial de cambios
        historial = HistoricoPazYSalvo.objects.create(**data_historial)

        if serializer.is_valid():
            data_alerta = {
                'cod_clase_alerta': 'Com_ActPS',
                'informacion_complemento_mensaje': f"Se ha solicitado la actualización del Paz y Salvo {paz_y_salvo.nro_paz_y_salvo}.",
                'id_elemento_implicado': paz_y_salvo.doc_paz_y_salvo.id_documento_generado,
                'id_persona': paz_y_salvo.id_persona_genera.id_persona
            }
           
            config_alerta = ConfiguracionClaseAlerta.objects.filter(
                cod_clase_alerta=data_alerta['cod_clase_alerta']
            ).first()

            if config_alerta and config_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, config_alerta)

            serializer.save()
            return Response({
                "success": True,
                "detail": "Paz y Salvo actualizado correctamente."
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "detail": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# class PazySalvoAprobarView(APIView):
#     serializer_class = UpdatePazYSalvoSerializer
#     permission_classes = [IsAuthenticated, PermisoActualizarAdministracionPazYSalvo]

#     def put(self, request, pk):
#         try:
#             paz_y_salvo = PazYSalvo.objects.get(id_paz_y_salvo=pk)
#         except PazYSalvo.DoesNotExist:
#             raise ValidationError("No se encontró el Paz y Salvo con el ID proporcionado.")

#         # Verificar que el Paz y Salvo esté en estado pendiente de aprobación
#         if paz_y_salvo.aprueba_actualizacion is not False:
#             raise ValidationError("Este Paz y Salvo no está pendiente de aprobación.")

#         # Actualizar el estado a aprobado
#         paz_y_salvo.aprueba_actualizacion = True
#         paz_y_salvo.save()

#         # Serializar la respuesta
#         serializer = self.serializer_class(paz_y_salvo)
#         return Response({
#             'success': True,
#             'data': serializer.data,
#             'message': 'Paz y Salvo aprobado exitosamente.'
#         }, status=status.HTTP_200_OK)

class PazySalvoAprobarView(APIView):
    serializer_class = UpdatePazYSalvoSerializer
    permission_classes = [IsAuthenticated, PermisoActualizarAdministracionPazYSalvo]

    def put(self, request, pk):
        es_aprobacion = request.data.get('es_aprobacion')
        observacion = request.data.get('observacion', None)

        estado = ""
        if es_aprobacion is None:
            return Response({
                "success": False,
                "detail": "El campo 'es_aprobacion' es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)
    
        paz_y_salvo = PazYSalvo.objects.filter(id_paz_y_salvo=pk).first()

        if not paz_y_salvo:
            return Response({
                "success": False,
                "detail": "Paz y Salvo no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)
        
        if paz_y_salvo.aprueba_actualizacion:
            return Response({
                "success": False,
                "detail": "El Paz y Salvo ya ha sido aprobado."
            }, status=status.HTTP_400_BAD_REQUEST)

        
        paz_y_salvo_historial = HistoricoPazYSalvo.objects.filter(id_paz_y_salvo=paz_y_salvo.id_paz_y_salvo).last()

        try:
            Utils.validador_dato_tipo("booleano", es_aprobacion)
        except ValueError:
            return Response({
                "success": False,
                "detail": "El campo 'es_aprobacion' no es válido."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if paz_y_salvo.es_actualizacion == False or paz_y_salvo.es_actualizacion == None:
                return Response({
                    "success": False,
                    "detail": "El Paz y Salvo no es una actualización."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        data_aprobacion = {}
        data_historial = {}
        
        usuario = request.user
        persona = Personas.objects.filter(id_persona=usuario.persona.id_persona).first()
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontraron datos del recaudador."
            }, status=status.HTTP_404_NOT_FOUND)
        
        if es_aprobacion:
            if paz_y_salvo.aprueba_actualizacion:
                return Response({
                    "success": False,
                    "detail": "El Paz y Salvo ya ha sido aprobado."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            facturas = []

            facturas_paz_y_salvo = PazYSalvoFacturas.objects.filter(id_paz_y_salvo=paz_y_salvo.id_paz_y_salvo)
            if not facturas_paz_y_salvo.exists():
                return Response({
                    "success": False,
                    "detail": "No se encontraron facturas asociadas al Paz y Salvo."
                }, status=status.HTTP_404_NOT_FOUND)

            for factura in facturas_paz_y_salvo:
                facturas.append({
                    'id_factura': factura.id_factura_unica.id_factura_unica,
                    'kilos_reportar': factura.kilos_reportados
                })
                   
            # Obtener fecha de actualización
            request.data["id_documento_anterior"] = paz_y_salvo.doc_paz_y_salvo.id_documento_generado
            request.data["consecutivo"] = paz_y_salvo.nro_paz_y_salvo
            request.data["fecha_generacion"] = now().date()
            request.data["tipo_paz_y_salvo"] = paz_y_salvo.tipo_paz_y_salvo
            request.data["id_puerto_exportacion"] = paz_y_salvo.id_puerto_exportacion.id_puerto_exportacion
            request.data["razon_social_tercero"] = paz_y_salvo.razon_social_tercero if paz_y_salvo.tipo_paz_y_salvo in ['PT','PV'] else None
            request.data["documento_tercero"] = paz_y_salvo.nro_doc_tercero if paz_y_salvo.tipo_paz_y_salvo in ['PT','PV'] else None
            request.data["facturas"] = facturas

            # Generar el documento de Paz y Salvo
            instance_documento = PazYSalvoGenerarDocumentoView()
            documento_id = instance_documento.generar_paz_y_salvo(request, paz_y_salvo.id_persona_genera.id_persona)
            documento = DocumentosGenerados.objects.filter(id_documento_generado=documento_id).first()
            if not documento:
                raise ValidationError("No se encontró el documento generado.")
            
            data_aprobacion = {
                'fecha_generacion':now(),
                'fecha_actualizacion': None,
                'es_actualizacion': False,
                'aprueba_actualizacion': True,
                'doc_paz_y_salvo': documento.id_documento_generado,
                'id_puerto_exportacion': paz_y_salvo_historial.puerto_exportacion_nueva
            }
            estado = 'APROBADA'

            data_historial = {
                'id_paz_y_salvo': paz_y_salvo,
                'descripcion': "Aprobación de Paz y Salvo",
                'fecha_anterior': paz_y_salvo.fecha_generacion,
                'fecha_nueva': now(),
                'puerto_exportacion_anterior': paz_y_salvo_historial.puerto_exportacion_anterior,
                'puerto_exportacion_nueva':paz_y_salvo_historial.puerto_exportacion_nueva,
                'estado': estado,
                'id_persona_modifica': persona
            }

        else: 
            paz_y_salvo_historial = HistoricoPazYSalvo.objects.filter(id_paz_y_salvo=paz_y_salvo.id_paz_y_salvo).last()
            
            data_aprobacion = {
                'fecha_generacion': paz_y_salvo.fecha_generacion,
                'fecha_actualizacion': paz_y_salvo.fecha_actualizacion,
                'es_actualizacion': False,
                'aprueba_actualizacion': False,
                'doc_paz_y_salvo': paz_y_salvo.doc_paz_y_salvo.id_documento_generado,
                'id_puerto_exportacion': paz_y_salvo_historial.puerto_exportacion_anterior
            }
            estado = 'RECHAZADA'

            data_historial = {
                'id_paz_y_salvo': paz_y_salvo,
                'descripcion': "Rechazo de Paz y Salvo por: " + (observacion if observacion else "Desconocido"),
                'fecha_anterior': paz_y_salvo.fecha_generacion,
                'fecha_nueva': paz_y_salvo.fecha_actualizacion,
                'puerto_exportacion_anterior': paz_y_salvo_historial.puerto_exportacion_anterior,
                'puerto_exportacion_nueva': paz_y_salvo.id_puerto_exportacion.id_puerto_exportacion,
                'estado': estado,
                'id_persona_modifica': persona
            }

        # Guardar el historial de cambios
        historial = HistoricoPazYSalvo.objects.create(**data_historial)

        if paz_y_salvo.id_persona_genera.email:
            subject = f"Solicitud de actualización de Paz y Salvo {estado}"
            template = "paz-y-salvo-aprobada.html"
            context = {'estado': estado,
                       'fechaconsulta':Utils.formatear_fecha(now().date().strftime('%Y-%m-%d')),
                       'consepaz': paz_y_salvo.nro_paz_y_salvo,
                       'iddocumento': paz_y_salvo.id_persona_genera.numero_documento}
            template = render_to_string((template), context)
            email_data = {'template': template, 'email_subject': subject, 'to_email':paz_y_salvo.id_persona_genera.email}
            email = Util.send_email(email_data)
            
        serializer = self.serializer_class(paz_y_salvo, data=data_aprobacion)
        if serializer.is_valid():
            data_alerta = {
                'cod_clase_alerta': 'Com_ActPS',
                'informacion_complemento_mensaje': f"Ha sido {estado.lower()} la solicitud de actualización del Paz y Salvo {paz_y_salvo.nro_paz_y_salvo}.",
                'id_elemento_implicado': paz_y_salvo.doc_paz_y_salvo.id_documento_generado,
                'id_persona': paz_y_salvo.id_persona_genera.id_persona
            }
           
            config_alerta = ConfiguracionClaseAlerta.objects.filter(
                cod_clase_alerta=data_alerta['cod_clase_alerta']
            ).first()

            if config_alerta and config_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, config_alerta)
            serializer.save()
            return Response({
                "success": True,
                "detail": f"Paz y Salvo {estado} correctamente."
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "detail": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)





# CRUD para CobroPersuasivo
class CobroPersuasivoView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def asignar_consecutivo(self, cobro):
        """Asignar consecutivo automático al cobro persuasivo"""
        try:
            # Obtener la configuración de consecutivo para CPER
            config_consecutivo = ConfiguracionConsecutivo.objects.filter(
                prefijo_consecutivo='CPER'
            ).first()
            
            if not config_consecutivo:
                print("WARNING: No se encontró configuración de consecutivo para CPER")
                return
            
            # Incrementar el consecutivo actual
            config_consecutivo.consecutivo_actual += 1
            config_consecutivo.fecha_consecutivo_actual = datetime.now()
            config_consecutivo.save()
            
            # Generar el consecutivo formateado
            consecutivo = (
                config_consecutivo.prefijo_consecutivo +
                str(config_consecutivo.anio_consecutivo) +
                str(config_consecutivo.consecutivo_actual).zfill(config_consecutivo.cantidad_digitos)
            )
            
            # Asignar el consecutivo al cobro
            cobro.consecutivo = consecutivo
            cobro.save()
            
            print(f"DEBUG: Consecutivo asignado al cobro {cobro.id_cobro_persuasivo}: {consecutivo}")
            
        except Exception as e:
            print(f"ERROR asignando consecutivo: {str(e)}")

    def enviar_correo_cobro_persuasivo(self, cobro, documento, factura, tipo_accion):
        """Enviar correo con documento de cobro persuasivo adjunto"""
        try:
            # Obtener el email del recaudador desde la factura (no desde el cobro)
            email_recaudador = None
            recaudador = factura.id_persona_recaudador
            
            if recaudador and recaudador.email:
                email_recaudador = recaudador.email
            elif cobro.email_recaudador:
                email_recaudador = cobro.email_recaudador
            
            print(f"DEBUG {tipo_accion}: Enviando correo a email: {email_recaudador}")
            print(f"DEBUG {tipo_accion}: Email desde recaudador: {recaudador.email if recaudador else 'N/A'}")
            print(f"DEBUG {tipo_accion}: Email desde cobro: {cobro.email_recaudador if hasattr(cobro, 'email_recaudador') else 'N/A'}")
            
            if not email_recaudador:
                print(f"WARNING {tipo_accion}: No se encontró email para el cobro {cobro.id_cobro_persuasivo}")
                print(f"WARNING {tipo_accion}: Recaudador ID: {recaudador.id_persona if recaudador else 'N/A'}")
                print(f"WARNING {tipo_accion}: Recaudador email: {recaudador.email if recaudador else 'N/A'}")
                return
            
            # Obtener información del recaudador desde la factura
            if recaudador and recaudador.tipo_persona == 'N':
                nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.primer_apellido or ''}".strip()
            elif recaudador:
                nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
            else:
                nombre_recaudador = cobro.nombre_recaudador or "Estimado(a) recaudador(a)"
            
            # Obtener el nombre de la acción de cobro persuasivo
            nombre_accion = "Notificación de Cobro"
            if cobro.id_accion_cobro_persuasivo:
                nombre_accion = cobro.id_accion_cobro_persuasivo.nombre
            
            # Obtener el consecutivo del cobro
            consecutivo_cobro = cobro.consecutivo or f"{cobro.id_cobro_persuasivo:06d}"
            
            # Definir asunto y contenido según el tipo de acción
            if tipo_accion == "ID1":
                subject = f"{nombre_accion} - {consecutivo_cobro}"
                mensaje_tipo = nombre_accion.lower()
                texto_inicial = """Como Administradores del Fondo Nacional del Cacao, es nuestro deber informarles que, con base en lo dispuesto en la Ley 67 de 1983 y el Decreto 1000 de 1984, que:
                                <br><br>"""
            elif tipo_accion == "ID2":
                subject = f"{nombre_accion} - {consecutivo_cobro}"
                mensaje_tipo = nombre_accion.lower()
                texto_inicial = ""
            elif tipo_accion == "ID3":
                subject = f"{nombre_accion} - {consecutivo_cobro}"
                mensaje_tipo = nombre_accion.lower()
                texto_inicial = ""
            else:
                subject = f"{nombre_accion} - {consecutivo_cobro}"
                mensaje_tipo = nombre_accion.lower()
                texto_inicial = ""
            
            # Crear el contenido HTML del correo
            html_content = f"""
            <!-- Contenedor Principal -->
            <div style="padding: 0; margin: 0; display: block; min-width: 100%; width: 100%; background: #f6f8f9;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f6f8f9">
                    <tr>
                        <td align="center" valign="top">
                            <table width="650" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px;">
                                <tr>
                                    <td style="padding: 55px 0;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#EFE8E0" style="width: 100%; padding: 0;">
                                            <tr>
                                                <td align="center">
                                                    <table width="650" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px; background: #ffffff; border-radius: 12px;">
                                                        <!-- Encabezado -->
                                                        <tr>
                                                            <td style="padding: 0; margin: 0; background: #EFE8E0; border-radius: 12px 12px 0 0;">
                                                                <img src="https://res.cloudinary.com/dgmzeb84y/image/upload/v1743546716/banner_fede_lml8tc.png"
                                                                    style="width: 100%; max-width: 650px; height: auto; display: block; border-radius: 12px 12px 0 0;"
                                                                    alt="Logo de Fedecacao">
                                                            </td>
                                                        </tr>
                                                    </table>
                                        </table>

                                        <!-- Contenido Principal -->
                                        <table width="100%" border="0" cellspacing="0" cellpadding="10" bgcolor="#ffffff">
                                            <tr>
                                                <td style="color: #562707; font-family: sans-serif; font-size: 22px; line-height: 25px; text-align: center; font-weight: bold;">
                                                    COBRO PERSUASIVO
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #562707; font-family: sans-serif; font-size: 17px; line-height: 25px; text-align: left;">
                                                    Estimado(a) <strong>{nombre_recaudador}</strong>,
                                                    <br><br>
                                                    {texto_inicial}
                                                    Le informamos que se ha generado una <strong>{mensaje_tipo}</strong> para la factura <strong>{factura.nro_factura_unica}</strong>.
                                                    <br><br>
                                                    A continuación encontrará los detalles del cobro:
                                                </td>
                                            </tr>

                                            <!-- Detalles del Cobro -->
                                            <tr>
                                                <td align="center">
                                                    <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #562707; border-radius: 10px;">
                                                        <tr>
                                                            <td style="color: #ffffff; font-family: sans-serif; font-size: 16px; line-height: 24px; text-align: center;">
                                                                <span style="color: #FFFFFF;">Consecutivo:</span> <strong style="color: #FFFFFF;">{cobro.consecutivo or 'N/A'}</strong><br>
                                                                <span style="color: #FFFFFF;">Factura:</span> <strong style="color: #FFFFFF;">{factura.nro_factura_unica}</strong><br>
                                                                <span style="color: #FFFFFF;">Cuota de Fomento:</span> <strong style="color: #FFFFFF;">${factura.cuota_fomento:,.2f}</strong><br>
                                                                <span style="color: #FFFFFF;">Fecha de Compra:</span> <strong style="color: #FFFFFF;">{factura.fecha_compra.strftime('%d/%m/%Y') if factura.fecha_compra else 'N/A'}</strong>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="color: #562707; font-family: sans-serif; font-size: 16px; line-height: 24px; text-align: left; padding-top: 20px;">
                                                    Adjunto encontrará el documento correspondiente con la información detallada de este {mensaje_tipo}.
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="color: #562707; font-family: sans-serif; font-size: 16px; line-height: 24px; text-align: left;">
                                                    Para cualquier consulta o aclaración, puede contactarnos a través de nuestros canales oficiales.
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="color: #562707; font-family: sans-serif; font-size: 16px; line-height: 24px; text-align: left; padding-top: 10px;">
                                                    Cordialmente,<br>
                                                    <strong>Equipo de Recaudo<br>
                                                    FEDECACAO - Fondo Nacional del Cacao</strong>
                                                </td>
                                            </tr>

                                            <!-- Nota final -->
                                            <tr>
                                                <td style="color: #562707; font-family: sans-serif; font-size: 14px; text-align: center; padding-top: 30px;">
                                                    Este correo electrónico fue generado de forma automática, este no dará respuesta a solicitudes futuras.
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Pie de Página -->
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#EFE8E0" style="padding: 30px;">
                                            <tr>
                                                <td align="center">
                                                    <table width="650" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px;">
                                                        <tr>
                                                            <!-- Logo -->
                                                            <td width="30%" align="left" style="padding: 10px;">
                                                                <img src="https://res.cloudinary.com/dgmzeb84y/image/upload/v1743546706/logo_fedecacao_1_i6mvhq.avif" width="250" alt="Logo de Fedecacao">
                                                            </td>
                                                            <!-- Información adicional y Banner GOV.CO -->
                                                            <td width="30%" align="left" style="color: #562707; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px;">
                                                                <strong>Fedecacao - Fondo Nacional del Cacao</strong><br>
                                                                Calle 31 No. 17-27, Bogotá D.C., Colombia<br>
                                                                PBX: +57 (601) 327 3000<br>
                                                                Notificaciones Judiciales: <a href="mailto:notificaciones.judiciales@fedecacao.com.co" style="color: #562707; text-decoration: none;">notificaciones.judiciales@fedecacao.com.co</a><br>
                                                                Correo institucional: <a href="mailto:info@fedecacao.com.co" style="color: #562707; text-decoration: none;">info@fedecacao.com.co</a><br>
                                                                <br>
                                                                <!-- Banner de GOV.CO -->
                                                                <div style="background-color: #EFE8E0;">
                                                                    <img src="https://res.cloudinary.com/dgmzeb84y/image/upload/v1743546694/logo_footer_duyhji.png" 
                                                                    style="width: 85%; height: 55px; margin: auto;"
                                                                        alt="GOV.CO">
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <!-- Línea divisoria -->
                                        <hr style="border: 0; height: 1px; background-color: #562707; margin: 0; padding: 0;">

                                        <!-- Copyright -->
                                        <table width="100%" bgcolor="#562707" style="padding: 10px;">
                                            <tr>
                                                <td align="center">
                                                    <p style="color: #EFE8E0; font-family: Arial, sans-serif; font-size: 12px; text-align: center;">
                                                        Fedecacao® - Fondo Nacional del Cacao es una Marca Registrada - Todos los derechos reservados<br>
                                                        Site Creado por <a href="https://tiendabandera.com" style="color: #EFE8E0; text-decoration: none;">tiendabandera.com</a>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        <!-- Fin del Contenido -->
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
            """
            
            # Preparar datos para el envío
            email_data = {
                'email_subject': subject,
                'template': html_content,
                'to_email': email_recaudador
            }
            
            # Obtener el archivo del documento desde S3
            if documento and documento.documento_generado:
                try:
                    # Usar el método send_email_file con el archivo adjunto
                    with documento.documento_generado.open('rb') as file:
                        response = Util.send_email_file(email_data, file)
                        
                    if response:
                        print(f"DEBUG: Correo enviado exitosamente para {tipo_accion} al email {email_recaudador}")
                    else:
                        print(f"ERROR: No se pudo enviar el correo para {tipo_accion}")
                        
                except Exception as e:
                    print(f"ERROR enviando correo con adjunto: {str(e)}")
                    # Si falla con adjunto, enviar sin adjunto
                    response = Util.send_email(email_data)
                    if response:
                        print(f"DEBUG: Correo enviado sin adjunto para {tipo_accion}")
            else:
                # Enviar sin adjunto si no hay documento
                response = Util.send_email(email_data)
                if response:
                    print(f"DEBUG: Correo enviado sin adjunto para {tipo_accion}")
                    
        except Exception as e:
            print(f"ERROR enviando correo para cobro persuasivo: {str(e)}")

    def get(self, request):
        """Listar todos los cobros persuasivos"""
        try:
            cobros = CobroPersuasivo.objects.select_related('id_persona_crea').order_by('-fecha_creacion')
            
            # Filtros opcionales
            fecha_inicio = request.query_params.get('fecha_inicio')
            fecha_fin = request.query_params.get('fecha_fin')
            cod_accion = request.query_params.get('cod_accion_registrada')
            
            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                cobros = cobros.filter(fecha_creacion__range=[fecha_inicio, fecha_fin])
            
            if cod_accion:
                cobros = cobros.filter(cod_accion_registrada__icontains=cod_accion)
            
            # Paginación
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(cobros, request)
            
            if page is not None:
                serializer = CobroPersuasivoListSerializer(page, many=True, context={'request': request})
                return paginator.get_paginated_response(serializer.data)
            
            serializer = CobroPersuasivoListSerializer(cobros, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Cobros persuasivos consultados exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except ValidationError as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error de validación: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar cobros persuasivos: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        """Crear un nuevo cobro persuasivo"""
        try:
            serializer = CobroPersuasivoCreateSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                cobro = serializer.save()
                
                # Generar consecutivo automático para el cobro persuasivo
                self.asignar_consecutivo(cobro)
                
                print(f"DEBUG: Cobro creado con ID: {cobro.id_cobro_persuasivo}")
                print(f"DEBUG: Acción asignada ID: {cobro.id_accion_cobro_persuasivo.id_accion_cobro_persuasivo if cobro.id_accion_cobro_persuasivo else 'None'}")
                print(f"DEBUG: Acción nombre: {cobro.id_accion_cobro_persuasivo.nombre if cobro.id_accion_cobro_persuasivo else 'None'}")
                print(f"DEBUG: Consecutivo asignado: {cobro.consecutivo}")
                
                # Verificar si se debe generar documento para la acción "Enviar Mensaje Correo Electronico / SMS"
                if cobro.id_accion_cobro_persuasivo and cobro.id_accion_cobro_persuasivo.id_accion_cobro_persuasivo == 1:
                    print(f"DEBUG: Acción seleccionada es 1, procediendo a generar documento")
                    
                    # Obtener las facturas asociadas al cobro persuasivo
                    persuasivo_facturas = PersuasivoFacturas.objects.filter(cobro_persuasivo=cobro)
                    print(f"DEBUG: Encontradas {persuasivo_facturas.count()} facturas asociadas")
                    
                    if persuasivo_facturas.exists():
                        # Generar documento para cada factura
                        documentos_generados = []
                        
                        for persuasivo_factura in persuasivo_facturas:
                            factura = persuasivo_factura.factura
                            print(f"DEBUG: Procesando factura {factura.nro_factura_unica}")
                            
                            # Calcular variables para el documento
                            fecha_compra = factura.fecha_compra.strftime('%Y-%m-%d') if factura.fecha_compra else ''
                            nro_factura = str(factura.nro_factura_unica) if factura.nro_factura_unica else ''
                            kilos = str(factura.total_kilos) if factura.total_kilos else '0'
                            valor_cuota = Utils.formato_peso(str(factura.cuota_fomento)) if factura.cuota_fomento else '0'
                            
                            # Calcular valor de intereses moratorios correcto
                            valor_interes_calculado = 0
                            if factura.fecha_compra:
                                # Calcular fecha de vencimiento (mes siguiente, día 10)
                                mes_vencimiento = factura.fecha_compra.month + 1 if factura.fecha_compra.month < 12 else 1
                                ano_vencimiento = factura.fecha_compra.year if mes_vencimiento > 1 else factura.fecha_compra.year + 1
                                fecha_vencimiento = datetime(ano_vencimiento, mes_vencimiento, 10).date()
                                
                                # Calcular días en mora
                                fecha_actual = datetime.now().date()
                                dias_mora = max(0, (fecha_actual - fecha_vencimiento).days)
                                
                                # Obtener tasa de interés
                                tasa_interes_obj = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
                                if tasa_interes_obj and factura.cuota_fomento and dias_mora > 0:
                                    valor_interes_calculado = (factura.cuota_fomento * tasa_interes_obj.valor * dias_mora) / 365
                                    
                            valor_interes = Utils.formato_peso(str(int(valor_interes_calculado))) if valor_interes_calculado > 0 else '0'
                            
                            print(f"DEBUG: Variables calculadas - fecha_compra: {fecha_compra}, nro_factura: {nro_factura}, kilos: {kilos}, valor_cuota: {valor_cuota}, valor_interes: {valor_interes}")
                            print(f"DEBUG: Valor interés calculado: {valor_interes_calculado}, días mora: {dias_mora if 'dias_mora' in locals() else 'N/A'}")
                            
                            # Variables para la plantilla
                            variables = {
                                "fechacompra": fecha_compra,
                                "nfactura": nro_factura,
                                "kilos": kilos,
                                "valorcuota": valor_cuota,
                                "valorinteres": valor_interes
                            }
                            
                            # Verificar si existe la plantilla
                            plantilla = PlantillasDoc.objects.filter(nombre="Accion Enviar Mensaje").first()
                            if not plantilla:
                                print(f"ERROR: No existe la plantilla 'Accion Enviar Mensaje'")
                                continue
                            else:
                                print(f"DEBUG: Plantilla encontrada - ID: {plantilla.id_plantilla_doc}, Nombre: {plantilla.nombre}")
                            
                            # Generar documento usando la plantilla encontrada
                            try:
                                print(f"DEBUG: Intentando generar documento con plantilla ID {plantilla.id_plantilla_doc}")
                                id_documento_generado = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, True)
                                print(f"DEBUG: Resultado de obtener_url_documento: {id_documento_generado}")
                                
                                if id_documento_generado and id_documento_generado != "No se generó el documento":
                                    # Actualizar el cobro persuasivo con el documento generado
                                    documento = DocumentosGenerados.objects.filter(id_documento_generado=id_documento_generado).first()
                                    if documento:
                                        print(f"DEBUG: Documento encontrado en BD - ID: {documento.id_documento_generado}")
                                        cobro.doc_persuasivo = documento
                                        cobro.save()
                                        print(f"DEBUG: Cobro persuasivo actualizado con documento")
                                        
                                        # Enviar correo con el documento adjunto
                                        self.enviar_correo_cobro_persuasivo(cobro, documento, factura, "ID1")
                                        
                                        documentos_generados.append({
                                            "factura": nro_factura,
                                            "id_documento_generado": documento.id_documento_generado,
                                            "documento_generado": documento.documento_generado.name,
                                            "archivo": Util.obtener_archivos(documento.documento_generado.name)
                                        })
                                    else:
                                        print(f"ERROR: No se encontró el documento generado en BD con ID: {id_documento_generado}")
                                else:
                                    print(f"ERROR: No se pudo generar el documento - resultado: {id_documento_generado}")
                                
                            except Exception as e:
                                print(f"ERROR generando documento para factura {nro_factura}: {str(e)}")
                    else:
                        print(f"DEBUG: No se encontraron facturas asociadas al cobro persuasivo")
                
                # Verificar si se debe generar documento para la acción con ID 2
                elif cobro.id_accion_cobro_persuasivo and cobro.id_accion_cobro_persuasivo.id_accion_cobro_persuasivo == 2:
                    print(f"DEBUG: Acción seleccionada es 2, procediendo a generar documento")
                    
                    # Obtener las facturas asociadas al cobro persuasivo
                    persuasivo_facturas = PersuasivoFacturas.objects.filter(cobro_persuasivo=cobro)
                    print(f"DEBUG: Encontradas {persuasivo_facturas.count()} facturas asociadas")
                    
                    if persuasivo_facturas.exists():
                        # Generar documento para cada factura
                        documentos_generados = []
                        
                        for persuasivo_factura in persuasivo_facturas:
                            factura = persuasivo_factura.factura
                            print(f"DEBUG: Procesando factura {factura.nro_factura_unica}")
                            
                            # Calcular variables para el documento ID 2
                            fecha_actual = datetime.now().date()
                            
                            # Diccionario de meses en español
                            meses_espanol = {
                                1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
                                5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
                                9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
                            }
                            
                            # fechadepago - FECHA DE LIQUIDACIÓN: fecha en que se está haciendo el cálculo
                            fechadepago = fecha_actual.strftime('%d-%b-%Y').lower()
                            
                            # Información del recaudador - NOMBRE RECAUDADOR
                            recaudador = factura.id_persona_recaudador
                            if recaudador:
                                if recaudador.tipo_persona == 'N':
                                    nombre_recaudador = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
                                else:
                                    nombre_recaudador = recaudador.razon_social or recaudador.nombre_comercial or ''
                                ndocumento = str(recaudador.numero_documento) if recaudador.numero_documento else ''
                            else:
                                nombre_recaudador = ''
                                ndocumento = ''
                            
                            # Calcular fechas y mora
                            fecha_vencimiento = None
                            if factura.fecha_compra:
                                # Calcular fecha de vencimiento (mes siguiente, día 10)
                                mes_vencimiento = factura.fecha_compra.month + 1 if factura.fecha_compra.month < 12 else 1
                                ano_vencimiento = factura.fecha_compra.year if mes_vencimiento > 1 else factura.fecha_compra.year + 1
                                fecha_vencimiento = datetime(ano_vencimiento, mes_vencimiento, 10).date()
                            
                            if fecha_vencimiento:
                                dias_mora = max(0, (fecha_actual - fecha_vencimiento).days)
                                # AÑO(S): año en el que se hizo la compra del cacao
                                anos_compra = factura.fecha_compra.year if factura.fecha_compra else fecha_actual.year
                                fecha_vencimiento_str = fecha_vencimiento.strftime('%d-%b-%Y').lower()
                            else:
                                dias_mora = 0
                                anos_compra = fecha_actual.year
                                fecha_vencimiento_str = ''
                            
                            # MES(ES) EN MORA: mes o meses en que no se pagó la cuota a tiempo
                            mes_mora_numero = fecha_vencimiento.month if fecha_vencimiento else factura.fecha_compra.month if factura.fecha_compra else fecha_actual.month
                            numeromesesmora = meses_espanol.get(mes_mora_numero, '').upper()
                            
                            # Variables básicas
                            nro_factura = str(factura.nro_factura_unica) if factura.nro_factura_unica else ''
                            valor_cuota = Utils.formato_peso(str(factura.cuota_fomento)) if factura.cuota_fomento else '$0'
                            
                            # Para la tabla de detalle mensual
                            # AÑO: año de la factura de compra del cacao (año de la obligación)
                            ano = str(anos_compra)
                            
                            # MES: nombre del mes en letras del mes de vencimiento
                            mesenletras = meses_espanol.get(mes_mora_numero, '').capitalize()
                            
                            # FECHA: fecha de corte para ese mes (último día del mes de vencimiento)
                            if fecha_vencimiento:
                                # Obtener el último día del mes de vencimiento
                                import calendar
                                ultimo_dia = calendar.monthrange(fecha_vencimiento.year, fecha_vencimiento.month)[1]
                                fecha_corte = datetime(fecha_vencimiento.year, fecha_vencimiento.month, ultimo_dia).date()
                                fcompra = fecha_corte.strftime('%d-%b-%Y').lower()
                            else:
                                fcompra = ''
                            
                            # TASA: tasa de interés moratorio anual (%) vigente
                            tasa_interes_obj = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
                            if tasa_interes_obj:
                                tasa_decimal = tasa_interes_obj.valor
                                tasa = f'{(tasa_decimal * 100):.2f}%'
                            else:
                                tasa_decimal = 0.3297  # 32.97% por defecto
                                tasa = '32,97%'
                            
                            # No. DÍAS: número de días en mora acumulados
                            ndias = str(dias_mora)
                            
                            # VALOR INTERESES: cálculo del interés
                            # Fórmula: (valorcuota × tasa/100) × ndias/365
                            valor_interes_calculado = 0
                            if factura.cuota_fomento and dias_mora > 0:
                                valor_interes_calculado = (factura.cuota_fomento * tasa_decimal * dias_mora) / 365
                            
                            valor_interes = f"{int(valor_interes_calculado):,}".replace(',', '.')
                            valor_total_intereses = valor_interes  # TOTAL INTERESES DE MORA LIQUIDADOS
                            
                            print(f"DEBUG ID2: Variables calculadas para formato REF-FT-08:")
                            print(f"  - fechadepago (FECHA DE LIQUIDACIÓN): {fechadepago}")
                            print(f"  - NOMBRERECAUDADOR: {nombre_recaudador}")
                            print(f"  - Ndocumento: {ndocumento}")
                            print(f"  - numeromesesmora (MES EN MORA): {numeromesesmora}")
                            print(f"  - anoscompra (AÑO DE COMPRA): {anos_compra}")
                            print(f"  - valorcuota (VALOR CUOTA FOMENTO): {valor_cuota}")
                            print(f"  - fechavencimiento: {fecha_vencimiento_str}")
                            print(f"  - numerodiasmora: {dias_mora}")
                            print(f"  - ano (AÑO tabla): {ano}")
                            print(f"  - mesenletras (MES tabla): {mesenletras}")
                            print(f"  - fcompra (FECHA corte): {fcompra}")
                            print(f"  - tasa: {tasa}")
                            print(f"  - ndias: {ndias}")
                            print(f"  - valorinteres: {valor_interes}")
                            
                            # Variables para la plantilla ID 106 - Formato REF-FT-08 versión 3
                            variables = {
                                # ENCABEZADO GENERAL
                                "fechadepago": fechadepago,                    # FECHA DE LIQUIDACIÓN
                                "NOMBRERECAUDADOR": nombre_recaudador,         # NOMBRE RECAUDADOR
                                "Ndocumento": ndocumento,                      # No DE IDENTIFICACIÓN
                                "numeromesesmora": numeromesesmora,            # MES(ES) EN MORA
                                "anoscompra": str(anos_compra),               # AÑO(S)
                                # INFORMACIÓN DE LA OBLIGACIÓN
                                "valorcuota": valor_cuota,                     # VALOR CUOTA DE FOMENTO
                                "fechavencimiento": fecha_vencimiento_str,     # FECHA DE VENCIMIENTO
                                "numerodiasmora": str(dias_mora),             # DÍAS EN MORA
                                "nfactura": nro_factura,                      # Número de factura
                                # DETALLE MENSUAL DE CÁLCULO DE INTERESES
                                "ano": ano,                                   # AÑO (tabla)
                                "mesenletras": mesenletras,                   # MES (tabla)
                                "fcompra": fcompra,                           # FECHA (tabla)
                                "tasa": tasa,                                 # TASA (tabla)
                                "ndias": ndias,                               # No. DÍAS (tabla)
                                "valorinteres": valor_interes,                # VALOR INTERESES (tabla)
                                "VALORTOTALINTERESES": valor_total_intereses   # TOTAL INTERESES
                            }
                            
                            # Verificar si existe la plantilla
                            plantilla = PlantillasDoc.objects.filter(nombre="Accion Cartera Persuasivo").first()
                            if not plantilla:
                                print(f"ERROR: No existe la plantilla 'Accion Cartera Persuasivo'")
                                continue  # Saltar a la siguiente iteración
                            else:
                                print(f"DEBUG: Plantilla encontrada - ID: {plantilla.id_plantilla_doc}, Nombre: {plantilla.nombre}")
                            
                            # Generar documento usando la plantilla encontrada
                            try:
                                print(f"DEBUG: Intentando generar documento con plantilla ID {plantilla.id_plantilla_doc}")
                                id_documento_generado = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, True)
                                print(f"DEBUG: Resultado de obtener_url_documento: {id_documento_generado}")
                                
                                if id_documento_generado and id_documento_generado != "No se generó el documento":
                                    # Actualizar el cobro persuasivo con el documento generado
                                    documento = DocumentosGenerados.objects.filter(id_documento_generado=id_documento_generado).first()
                                    if documento:
                                        print(f"DEBUG: Documento encontrado en BD - ID: {documento.id_documento_generado}")
                                        cobro.doc_persuasivo = documento
                                        cobro.save()
                                        print(f"DEBUG: Cobro persuasivo actualizado con documento")
                                        
                                        # Enviar correo con el documento adjunto
                                        self.enviar_correo_cobro_persuasivo(cobro, documento, factura, "ID2")
                                        
                                        documentos_generados.append({
                                            "factura": nro_factura,
                                            "id_documento_generado": documento.id_documento_generado,
                                            "documento_generado": documento.documento_generado.name,
                                            "archivo": Util.obtener_archivos(documento.documento_generado.name)
                                        })
                                    else:
                                        print(f"ERROR: No se encontró el documento generado en BD con ID: {id_documento_generado}")
                                else:
                                    print(f"ERROR: No se pudo generar el documento - resultado: {id_documento_generado}")
                                
                            except Exception as e:
                                print(f"ERROR generando documento para factura {nro_factura}: {str(e)}")
                    else:
                        print(f"DEBUG: No se encontraron facturas asociadas al cobro persuasivo")
                
                # Verificar si se debe generar documento para la acción con ID 3
                elif cobro.id_accion_cobro_persuasivo and cobro.id_accion_cobro_persuasivo.id_accion_cobro_persuasivo == 3:
                    print(f"DEBUG ID3: Acción seleccionada es 3, procediendo a generar documento")
                    print(f"DEBUG ID3: Cobro ID: {cobro.id_cobro_persuasivo}, Consecutivo: {cobro.consecutivo}")
                    
                    # Obtener las facturas asociadas al cobro persuasivo
                    persuasivo_facturas = PersuasivoFacturas.objects.filter(cobro_persuasivo=cobro)
                    print(f"DEBUG ID3: Encontradas {persuasivo_facturas.count()} facturas asociadas")
                    
                    if persuasivo_facturas.exists():
                        print(f"DEBUG ID3: Iniciando generación de documentos para {persuasivo_facturas.count()} facturas")
                        # Generar documento para cada factura
                        documentos_generados = []
                        
                        # Obtener firmas de roles específicos
                        def get_firma_por_rol(numero_documento_usuario):
                            """Obtener firma de un usuario específico por su número de documento"""
                            try:
                                print(f"DEBUG ID3: Buscando firma para documento: {numero_documento_usuario}")
                                persona = Personas.objects.filter(numero_documento=numero_documento_usuario).first()
                                if persona:
                                    usuario = User.objects.filter(persona=persona).first()
                                    if usuario and usuario.firma_usuario:
                                        return get_firma_base64(usuario.firma_usuario.name)
                                print(f"DEBUG ID3: No se encontró firma para documento: {numero_documento_usuario}")
                            except Exception as e:
                                print(f"ERROR ID3: Error obteniendo firma para documento {numero_documento_usuario}: {str(e)}")
                            return None
                        
                        def get_firma_base64(firma_key):
                            """Obtener firma en base64 desde S3"""
                            if not firma_key:
                                return None
                            try:
                                s3_client = boto3.client(
                                    's3',
                                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                                    region_name=settings.AWS_S3_REGION_NAME
                                )
                                
                                response = s3_client.get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=firma_key)
                                return base64.b64encode(response['Body'].read()).decode('utf-8')
                            except Exception as e:
                                print(f"ERROR ID3: Error obteniendo firma desde S3 con key {firma_key}: {str(e)}")
                                return None
                        
                        for persuasivo_factura in persuasivo_facturas:
                            factura = persuasivo_factura.factura
                            print(f"DEBUG ID3: Procesando factura {factura.nro_factura_unica}")
                            
                            try:
                                # Calcular variables para el documento ID 3
                                fecha_actual = datetime.now().date()
                                fecha_registro_cobro = cobro.fecha_creacion.strftime('%Y-%m-%d') if cobro.fecha_creacion else ''
                                
                                # Ciudad (obtener del domicilio del recaudador)
                                # Obtener datos del recaudador desde la factura
                                recaudador = factura.id_persona_recaudador
                                
                                # CIUDAD: DE DOMICILIO DEL RECAUDADOR
                                if recaudador and recaudador.municipio_residencia:
                                    ciudad = recaudador.municipio_residencia.nombre
                                    print(f"DEBUG ID3: Ciudad del domicilio del recaudador: {ciudad}")
                                else:
                                    ciudad = "Bogotá D.C."  # Valor por defecto si no tiene municipio de residencia
                                    print(f"DEBUG ID3: Sin municipio de residencia, usando valor por defecto: {ciudad}")
                                
                                # Usar el consecutivo real del cobro
                                consecutivo_adm = cobro.consecutivo or f"ADM-{cobro.id_cobro_persuasivo:06d}"
                                
                                # Obtener datos del recaudador desde la factura
                                recaudador = factura.id_persona_recaudador
                                
                                # NOMBRE_EMPRESA ahora viene del recaudador
                                if recaudador:
                                    if recaudador.tipo_persona == 'J':
                                        nombre_empresa = recaudador.razon_social or recaudador.nombre_comercial or "Sin nombre registrado"
                                    else:  # Persona Natural
                                        nombre_empresa = f"{recaudador.primer_nombre or ''} {recaudador.primer_apellido or ''}".strip()
                                        if not nombre_empresa:
                                            nombre_empresa = "Sin nombre registrado"
                                else:
                                    nombre_empresa = "Recaudador no encontrado"
                                
                                # CORREO_EMPRESA ahora viene del recaudador
                                if recaudador and recaudador.email:
                                    correo_empresa = recaudador.email
                                elif recaudador and recaudador.email_empresarial:
                                    correo_empresa = recaudador.email_empresarial
                                else:
                                    correo_empresa = "Sin correo registrado"
                                
                                # Diccionario de meses en español
                                meses_espanol = {
                                    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
                                    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
                                    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
                                }
                                
                                # ID cuota de fomento (siempre es el número de factura única)
                                id_cuota_fomento = factura.nro_factura_unica
                                
                                # CUENTA_COBRO: Si no tiene liquidación -> número de factura única, si tiene -> número del documento de liquidación
                                if factura.id_liq_factura_unica:
                                    cuenta_cobro = factura.id_liq_factura_unica.nro_doc_pago
                                    print(f"DEBUG ID3: Factura tiene liquidación, usando nro_doc_pago: {cuenta_cobro}")
                                else:
                                    cuenta_cobro = factura.nro_factura_unica
                                    print(f"DEBUG ID3: Factura sin liquidación, usando nro_factura_unica: {cuenta_cobro}")
                                
                                # DIA, MES, ANO: Si es factura única -> fecha de compra, si tiene liquidación -> fecha de liquidación
                                if factura.id_liq_factura_unica and factura.id_liq_factura_unica.fecha_liquidacion:
                                    fecha_referencia = factura.id_liq_factura_unica.fecha_liquidacion.date()
                                    print(f"DEBUG ID3: Usando fecha de liquidación: {fecha_referencia}")
                                elif factura.fecha_compra:
                                    fecha_referencia = factura.fecha_compra
                                    print(f"DEBUG ID3: Usando fecha de compra: {fecha_referencia}")
                                else:
                                    fecha_referencia = fecha_actual
                                    print(f"DEBUG ID3: Sin fecha disponible, usando fecha actual: {fecha_referencia}")
                                
                                dia = str(fecha_referencia.day)
                                mes = meses_espanol.get(fecha_referencia.month, '')
                                ano = str(fecha_referencia.year)

                                # Observaciones - usar descripción del cobro o valor por defecto
                                observaciones_cobro = cobro.descripcion if cobro.descripcion else "Sin observaciones adicionales"
                                
                                # Mes y año de inicio de mora
                                fecha_vencimiento = None
                                if factura.fecha_compra:
                                    # Calcular fecha de vencimiento (mes siguiente, día 10)
                                    mes_vencimiento = factura.fecha_compra.month + 1 if factura.fecha_compra.month < 12 else 1
                                    ano_vencimiento = factura.fecha_compra.year if mes_vencimiento > 1 else factura.fecha_compra.year + 1
                                    fecha_vencimiento = datetime(ano_vencimiento, mes_vencimiento, 10).date()
                                
                                if fecha_vencimiento:
                                    mes_inicio_mora = meses_espanol.get(fecha_vencimiento.month, '')
                                    ano_inicio_mora = str(fecha_vencimiento.year)
                                else:
                                    mes_inicio_mora = ""
                                    ano_inicio_mora = ""
                                
                                # Valor de interés
                                valor_interes_calculado = 0
                                if factura.fecha_compra and fecha_vencimiento:
                                    dias_mora = max(0, (fecha_actual - fecha_vencimiento).days)
                                    tasa_interes_obj = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
                                    if tasa_interes_obj and factura.cuota_fomento and dias_mora > 0:
                                        valor_interes_calculado = (factura.cuota_fomento * tasa_interes_obj.valor * dias_mora) / 365
                                
                                valor_interes = f"{int(valor_interes_calculado):,}".replace(',', '.')
                                
                                print(f"DEBUG ID3: Variables calculadas - ciudad: {ciudad}, consecutivo_adm: {consecutivo_adm}, nombre_empresa: {nombre_empresa}")
                                print(f"DEBUG ID3: Datos del recaudador - email: {correo_empresa}")
                                print(f"DEBUG ID3: ID cuota fomento (número factura): {id_cuota_fomento}")
                                print(f"DEBUG ID3: Cuenta cobro: {cuenta_cobro}, Fecha referencia: {fecha_referencia} ({dia}/{mes}/{ano})")
                                
                                # Obtener firmas usando el sistema real del proyecto
                                def get_firma_base64(firma_key: str) -> str | None:
                                    """Obtener firma en base64 desde S3"""
                                    if not firma_key:
                                        return None
                                    try:
                                        s3_client = boto3.client(
                                            's3',
                                            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                                            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                                            region_name=settings.AWS_S3_REGION_NAME
                                        )
                                        
                                        response = s3_client.get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=firma_key)
                                        return base64.b64encode(response['Body'].read()).decode('utf-8')
                                    except Exception as e:
                                        print(f"ERROR ID3: Error obteniendo firma desde S3 con key {firma_key}: {str(e)}")
                                        return None
                                
                                def get_firma_por_persona(persona):
                                    """Obtener firma de una persona específica"""
                                    if not persona:
                                        return None
                                    try:
                                        usuario = User.objects.filter(persona=persona).first()
                                        if usuario and usuario.firma_usuario:
                                            return get_firma_base64(usuario.firma_usuario.name)
                                    except Exception as e:
                                        print(f"ERROR ID3: Error obteniendo firma para persona {persona.id_persona if persona else 'None'}: {str(e)}")
                                    return None
                                
                                def get_firma_por_nombre_completo(primer_nombre, primer_apellido, segundo_apellido=None):
                                    """Obtener firma buscando por nombre completo"""
                                    try:
                                        query = Q(primer_nombre__iexact=primer_nombre) & Q(primer_apellido__iexact=primer_apellido)
                                        if segundo_apellido:
                                            query &= Q(segundo_apellido__iexact=segundo_apellido)
                                        
                                        persona = Personas.objects.filter(query).first()
                                        if persona:
                                            print(f"DEBUG ID3: Persona encontrada: {persona.primer_nombre} {persona.primer_apellido} {persona.segundo_apellido or ''}")
                                            return get_firma_por_persona(persona)
                                        else:
                                            print(f"DEBUG ID3: No se encontró persona con nombre: {primer_nombre} {primer_apellido} {segundo_apellido or ''}")
                                    except Exception as e:
                                        print(f"ERROR ID3: Error buscando persona por nombre: {str(e)}")
                                    return None
                                
                                # Obtener firmas específicas del sistema real
                                # 1. Representante Legal de Fedecacao
                                firma_representante_legal_suplente = None
                                try:
                                    fedecacao = Personas.objects.filter(numero_documento='899999175').first()
                                    if fedecacao and fedecacao.representante_legal:
                                        firma_representante_legal_suplente = get_firma_por_persona(fedecacao.representante_legal)
                                        print(f"DEBUG ID3: Firma RL Fedecacao obtenida: {'Sí' if firma_representante_legal_suplente else 'No'}")
                                    else:
                                        print(f"DEBUG ID3: No se encontró Fedecacao o su representante legal")
                                except Exception as e:
                                    print(f"DEBUG ID3: Error obteniendo RL Fedecacao: {str(e)}")
                                
                                # 2. Buscar firma de NUBIA STELLA CASTRO GUERRERO específicamente
                                firma_asesor_juridico = None
                                try:
                                    # Buscar por nombre completo específico
                                    firma_asesor_juridico = get_firma_por_nombre_completo("NUBIA STELLA", "CASTRO", "GUERRERO")
                                    if not firma_asesor_juridico:
                                        # Intentar búsquedas alternativas
                                        firma_asesor_juridico = get_firma_por_nombre_completo("NUBIA", "CASTRO", "GUERRERO")
                                    if not firma_asesor_juridico:
                                        # Buscar por rol de asesor jurídico como alternativa
                                        rol_asesor = Roles.objects.filter(nombre_rol__icontains='juridico').first()
                                        if rol_asesor:
                                            usuarios_asesor = UsuariosRol.objects.filter(id_rol=rol_asesor).first()
                                            if usuarios_asesor:
                                                firma_asesor_juridico = get_firma_por_persona(usuarios_asesor.id_usuario.persona)
                                    print(f"DEBUG ID3: Firma Asesor Jurídico (Nubia Stella) obtenida: {'Sí' if firma_asesor_juridico else 'No'}")
                                except Exception as e:
                                    print(f"DEBUG ID3: Error obteniendo firma de Nubia Stella: {str(e)}")
                                
                                # 3. Buscar coordinadora de estadística y recaudo
                                firma_coordinadora_estadistica = None
                                try:
                                    # Buscar por rol específico
                                    rol_coordinadora = Roles.objects.filter(
                                        Q(nombre_rol__icontains='estadistica') | 
                                        Q(nombre_rol__icontains='recaudo') |
                                        Q(nombre_rol__icontains='coordinadora')
                                    ).first()
                                    if rol_coordinadora:
                                        usuarios_coordinadora = UsuariosRol.objects.filter(id_rol=rol_coordinadora).first()
                                        if usuarios_coordinadora:
                                            firma_coordinadora_estadistica = get_firma_por_persona(usuarios_coordinadora.id_usuario.persona)
                                            print(f"DEBUG ID3: Firma Coordinadora obtenida: {'Sí' if firma_coordinadora_estadistica else 'No'}")
                                except Exception as e:
                                    print(f"DEBUG ID3: Error obteniendo Coordinadora: {str(e)}")
                                
                                print(f"DEBUG ID3: Resumen firmas - RL: {'Sí' if firma_representante_legal_suplente else 'No'}, Asesor (Nubia): {'Sí' if firma_asesor_juridico else 'No'}, Coordinadora: {'Sí' if firma_coordinadora_estadistica else 'No'}")
                                
                                # Variables para la plantilla ID 108 - nombres exactos según plantilla
                                variables = {
                                    # Variables principales del encabezado
                                    "CIUDAD": ciudad,
                                    "FECHA_REGISTRO_COBRO_PERSUASIVO": fecha_registro_cobro,
                                    "CONSECUTIVO_ADM": consecutivo_adm,
                                    "NOMBRE_EMPRESA": nombre_empresa,
                                    "CORREO_EMPRESA": correo_empresa,
                                    # Variables del cuerpo del documento
                                    "ID_CUOTA_FOMENTO": id_cuota_fomento,
                                    "CUENTA_COBRO": cuenta_cobro,
                                    "DIA": dia,
                                    "MES": mes,
                                    "ANO": ano,
                                    "MES_INICIO_MORA": mes_inicio_mora,
                                    "ANO_INICIO_MORA": ano_inicio_mora,
                                    "VALOR_INTERES": valor_interes,
                                    # Firmas en formato firmasdoc con nombres específicos de la plantilla
                                    "firmasdoc": {
                                        "FIRMA_REPRESENTANTE_LEGAL_SUPLENTE": firma_representante_legal_suplente or "",
                                        "FIRMA_ASESOR_JURIDICO": firma_asesor_juridico or "",
                                        "FIRMA_COORDINADORA_ESTADISTICA_Y_RECAUDO": firma_coordinadora_estadistica or ""
                                    }
                                }
                                
                                print(f"DEBUG ID3: Variables preparadas: {list(variables.keys())}")
                                print(f"DEBUG ID3: Valores de variables principales:")
                                print(f"  - CONSECUTIVO_ADM: {variables['CONSECUTIVO_ADM']}")
                                print(f"  - CIUDAD: {variables['CIUDAD']}")
                                print(f"  - NOMBRE_EMPRESA: {variables['NOMBRE_EMPRESA']}")
                                print(f"  - DIA: {variables['DIA']}, MES: {variables['MES']}, ANO: {variables['ANO']}")
                                print(f"  - VALOR_INTERES: {variables['VALOR_INTERES']}")
                                print(f"  - ID_CUOTA_FOMENTO: {variables['ID_CUOTA_FOMENTO']}")
                                print(f"  - CUENTA_COBRO: {variables['CUENTA_COBRO']}")
                                print(f"  - MES_INICIO_MORA: {variables['MES_INICIO_MORA']}, ANO_INICIO_MORA: {variables['ANO_INICIO_MORA']}")
                                
                                # Verificar si existe la plantilla
                                plantilla = PlantillasDoc.objects.filter(nombre="Accion Enviar Oficio").first()
                                if not plantilla:
                                    print(f"ERROR ID3: No existe la plantilla 'Accion Enviar Oficio'")
                                    continue  # Saltar a la siguiente iteración
                                else:
                                    print(f"DEBUG ID3: Plantilla encontrada - ID: {plantilla.id_plantilla_doc}, Nombre: {plantilla.nombre}")
                                    print(f"DEBUG ID3: Archivo plantilla: {plantilla.doc_plantilla.name if plantilla.doc_plantilla else 'Sin archivo'}")
                                
                                # Generar documento usando la plantilla encontrada
                                print(f"DEBUG ID3: Intentando generar documento con plantilla ID {plantilla.id_plantilla_doc}")
                                print(f"DEBUG ID3: Variables que se enviarán a la plantilla: {variables}")
                                id_documento_generado = obtener_url_documento(request, plantilla.id_plantilla_doc, variables, True)
                                print(f"DEBUG ID3: Resultado de obtener_url_documento: {id_documento_generado}")
                                
                                if id_documento_generado and id_documento_generado != "No se generó el documento":
                                    # Actualizar el cobro persuasivo con el documento generado
                                    documento = DocumentosGenerados.objects.filter(id_documento_generado=id_documento_generado).first()
                                    if documento:
                                        print(f"DEBUG ID3: Documento encontrado en BD - ID: {documento.id_documento_generado}")
                                        cobro.doc_persuasivo = documento
                                        cobro.save()
                                        print(f"DEBUG ID3: Cobro persuasivo actualizado con documento")
                                        
                                        # Enviar correo con el documento adjunto
                                        self.enviar_correo_cobro_persuasivo(cobro, documento, factura, "ID3")
                                        
                                        documentos_generados.append({
                                            "factura": factura.nro_factura_unica,
                                            "id_documento_generado": documento.id_documento_generado,
                                            "documento_generado": documento.documento_generado.name,
                                            "archivo": Util.obtener_archivos(documento.documento_generado.name)
                                        })
                                        print(f"DEBUG ID3: Documento agregado exitosamente para factura {factura.nro_factura_unica}")
                                    else:
                                        print(f"ERROR ID3: No se encontró el documento generado en BD con ID: {id_documento_generado}")
                                else:
                                    print(f"ERROR ID3: No se pudo generar el documento - resultado: {id_documento_generado}")
                                
                            except Exception as e:
                                print(f"ERROR ID3: Error generando documento para factura {factura.nro_factura_unica}: {str(e)}")
                                import traceback
                                print(f"ERROR ID3: Traceback completo: {traceback.format_exc()}")
                    else:
                        print(f"DEBUG ID3: No se encontraron facturas asociadas al cobro persuasivo")
                else:
                    print(f"DEBUG: Acción seleccionada no es 1, 2 ni 3 - ID: {cobro.id_accion_cobro_persuasivo.id_accion_cobro_persuasivo if cobro.id_accion_cobro_persuasivo else 'None'}")
                    print(f"DEBUG: Acción nombre: {cobro.id_accion_cobro_persuasivo.nombre if cobro.id_accion_cobro_persuasivo else 'None'}")
                
                # Serializar la respuesta completa
                response_serializer = CobroPersuasivoSerializer(cobro, context={'request': request})
                
                response_data = {
                    'success': True,
                    'data': response_serializer.data,
                    'message': 'Cobro persuasivo creado exitosamente.'
                }
                
                # Agregar información de documentos generados si existen
                if 'documentos_generados' in locals() and documentos_generados:
                    response_data['documentos_generados'] = documentos_generados
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al crear cobro persuasivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class CobroPersuasivoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Obtener un cobro persuasivo específico"""
        try:
            cobro = CobroPersuasivo.objects.select_related('id_persona_crea').get(id_cobro_persuasivo=pk)
            
            serializer = CobroPersuasivoSerializer(cobro, context={'request': request})
            
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Cobro persuasivo consultado exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except CobroPersuasivo.DoesNotExist:
            return Response({
                'success': False,
                'data': None,
                'message': 'No se encontró el cobro persuasivo con el ID proporcionado.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar cobro persuasivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        """Actualizar un cobro persuasivo"""
        try:
            cobro = CobroPersuasivo.objects.get(id_cobro_persuasivo=pk)
            
            serializer = CobroPersuasivoSerializer(cobro, data=request.data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Cobro persuasivo actualizado exitosamente.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except CobroPersuasivo.DoesNotExist:
            return Response({
                'success': False,
                'data': None,
                'message': 'No se encontró el cobro persuasivo con el ID proporcionado.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al actualizar cobro persuasivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Eliminar un cobro persuasivo"""
        try:
            cobro = CobroPersuasivo.objects.get(id_cobro_persuasivo=pk)
            
            # Eliminar también las relaciones con facturas
            PersuasivoFacturas.objects.filter(cobro_persuasivo=cobro).delete()
            
            cobro.delete()
            
            return Response({
                'success': True,
                'data': None,
                'message': 'Cobro persuasivo eliminado exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except CobroPersuasivo.DoesNotExist:
            return Response({
                'success': False,
                'data': None,
                'message': 'No se encontró el cobro persuasivo con el ID proporcionado.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al eliminar cobro persuasivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


# CRUD para PersuasivoFacturas
class PersuasivoFacturasView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request, cobro_id=None):
        """Listar las facturas asociadas a un cobro persuasivo específico"""
        try:
            if cobro_id:
                # Obtener facturas de un cobro específico
                persuasivo_facturas = PersuasivoFacturas.objects.filter(
                    cobro_persuasivo_id=cobro_id
                ).select_related('factura', 'cobro_persuasivo', 'factura__id_persona_recaudador')
            else:
                # Obtener todas las relaciones
                persuasivo_facturas = PersuasivoFacturas.objects.select_related(
                    'factura', 'cobro_persuasivo', 'factura__id_persona_recaudador'
                ).order_by('-id_persuasivo_facturas')
            
            # Paginación
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(persuasivo_facturas, request)
            
            if page is not None:
                serializer = PersuasivoFacturasSerializer(page, many=True, context={'request': request})
                return paginator.get_paginated_response(serializer.data)
            
            serializer = PersuasivoFacturasSerializer(persuasivo_facturas, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Relaciones persuasivo-facturas consultadas exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar relaciones: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        """Crear una nueva relación persuasivo-factura"""
        try:
            serializer = PersuasivoFacturasSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                relacion = serializer.save()
                
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Relación persuasivo-factura creada exitosamente.'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al crear relación: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Eliminar una relación persuasivo-factura"""
        try:
            relacion = PersuasivoFacturas.objects.get(id_persuasivo_facturas=pk)
            relacion.delete()
            
            return Response({
                'success': True,
                'data': None,
                'message': 'Relación eliminada exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except PersuasivoFacturas.DoesNotExist:
            return Response({
                'success': False,
                'data': None,
                'message': 'No se encontró la relación con el ID proporcionado.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al eliminar relación: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class FacturaCobroPersuasivoView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request, factura_id):
        """Obtener todos los cobros persuasivos asociados a una factura específica"""
        try:
            # Verificar que la factura existe
            factura = FacturaUnica.objects.get(id_factura_unica=factura_id)
            
            # Obtener los cobros persuasivos asociados a la factura
            persuasivo_facturas = PersuasivoFacturas.objects.filter(
                factura_id=factura_id
            ).select_related('cobro_persuasivo', 'cobro_persuasivo__id_persona_crea')
            
            # Extraer los cobros persuasivos únicos
            cobros_persuasivos_ids = list(persuasivo_facturas.values_list('cobro_persuasivo_id', flat=True))
            cobros_persuasivos = CobroPersuasivo.objects.filter(
                id_cobro_persuasivo__in=cobros_persuasivos_ids
            ).select_related('id_persona_crea').order_by('-fecha_creacion')
            
            # Paginación
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(cobros_persuasivos, request)
            
            if page is not None:
                serializer = CobroPersuasivoListSerializer(page, many=True, context={'request': request})
                return paginator.get_paginated_response(serializer.data)
            
            serializer = CobroPersuasivoListSerializer(cobros_persuasivos, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': {
                    'factura': {
                        'id_factura': factura.id_factura_unica,
                        'nro_factura': factura.nro_factura_unica,
                        'valor_neto': factura.valor_neto,
                        'estado_factura': factura.estado_factura,
                        'fecha_compra': factura.fecha_compra,
                        'recaudador': factura.id_persona_recaudador.razon_social if factura.id_persona_recaudador.razon_social 
                                     else f"{factura.id_persona_recaudador.primer_nombre} {factura.id_persona_recaudador.primer_apellido}"
                    },
                    'cobros_persuasivos': serializer.data
                },
                'message': f'Cobros persuasivos de la factura {factura.nro_factura_unica} consultados exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except FacturaUnica.DoesNotExist:
            return Response({
                'success': False,
                'data': None,
                'message': 'No se encontró la factura con el ID proporcionado.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar cobros persuasivos: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


# CRUD para AccionesCobroPersuasivo
class AccionesCobroPersuasivoView(APIView):
    serializer_class = AccionesCobroPersuasivoSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Listar todas las acciones de cobro persuasivo"""
        try:
            activo = request.query_params.get('activo')
            activo = activo if activo != '' else None
            tipo_cobro = request.query_params.get('tipo_cobro')
            tipo_cobro = tipo_cobro if tipo_cobro != '' else None
            
            acciones = AccionesCobroPersuasivo.objects.all().order_by('nombre')
            
            if activo:
                Utils.validador_dato_tipo("booleano", activo)
                if activo.lower() == 'true':
                    acciones = acciones.filter(activo=True)
                elif activo.lower() == 'false':
                    acciones = acciones.filter(activo=False)
                else:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'activo' debe ser 'true' o 'false'."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if tipo_cobro:
                if tipo_cobro.upper() in ['PERSUASIVO', 'COACTIVO']:
                    acciones = acciones.filter(tipo_cobro=tipo_cobro.upper())
                else:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'tipo_cobro' debe ser 'PERSUASIVO' o 'COACTIVO'."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if not acciones.exists():
                return Response({
                    "success": False,
                    "detail": "No se encontraron acciones de cobro persuasivo."
                }, status=status.HTTP_404_NOT_FOUND)
                
            serializer = self.serializer_class(acciones, many=True)
            return Response({
                "success": True,
                "detail": "Acciones de cobro persuasivo consultadas exitosamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al consultar acciones: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request):
        """Crear una nueva acción de cobro persuasivo"""
        try:
            data = request.data.copy()
            # Agregar persona que crea
            user_id = request.user.id_usuario 
            usuario = User.objects.filter(id_usuario=user_id).first()
            data['id_persona_crea'] = usuario.persona.id_persona
            
            serializer = self.serializer_class(data=data)

            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "detail": "Acción de cobro persuasivo registrada correctamente.",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                "success": False,
                "detail": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al crear acción: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request, pk):
        """Actualizar una acción de cobro persuasivo"""
        try:
            accion = AccionesCobroPersuasivo.objects.filter(id_accion_cobro_persuasivo=pk).first()
            if not accion:
                return Response({
                    "success": False,
                    "detail": "Acción no encontrada."
                }, status=status.HTTP_404_NOT_FOUND)
            
            data = request.data.copy()
            # Agregar persona que actualiza
            user_id = request.user.id_usuario
            usuario = User.objects.filter(id_usuario=user_id).first()
            data['id_persona_crea'] = usuario.persona.id_persona
            
            serializer = self.serializer_class(accion, data=data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "detail": "Acción de cobro persuasivo actualizada correctamente.",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            
            return Response({
                "success": False,
                "detail": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al actualizar acción: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Eliminar una acción de cobro persuasivo"""
        try:
            accion = AccionesCobroPersuasivo.objects.filter(id_accion_cobro_persuasivo=pk).first()
            if not accion:
                return Response({
                    "success": False,
                    "detail": "Acción no encontrada."
                }, status=status.HTTP_404_NOT_FOUND)
            
            if accion.item_ya_usado:
                return Response({
                    "success": False,
                    "detail": "No se puede eliminar la acción porque ya ha sido utilizada."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            accion.delete()
            return Response({
                "success": True,
                "detail": "Acción de cobro persuasivo eliminada correctamente."
            }, status=status.HTTP_204_NO_CONTENT)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al eliminar acción: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class AccionesCobroPersuasivoDetailView(APIView):
    serializer_class = AccionesCobroPersuasivoSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Obtener una acción de cobro persuasivo específica"""
        try:
            accion = AccionesCobroPersuasivo.objects.filter(id_accion_cobro_persuasivo=pk).first()
            if not accion:
                return Response({
                    "success": False,
                    "detail": "Acción no encontrada."
                }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = self.serializer_class(accion)
            return Response({
                "success": True,
                "detail": "Acción de cobro persuasivo encontrada.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al consultar acción: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class AccionesCobroPersuasivoSimpleView(APIView):
    """Vista simplificada para obtener solo ID y nombre de las acciones de cobro persuasivo"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Listar solo ID y nombre de las acciones de cobro persuasivo activas"""
        try:
            # Por defecto solo devolver las activas, pero permitir filtro
            activo = request.query_params.get('activo', 'true')
            
            # Filtrar solo acciones de tipo PERSUASIVO
            acciones = AccionesCobroPersuasivo.objects.filter(tipo_cobro='PERSUASIVO').order_by('nombre')
            
            if activo and activo != '':
                Utils.validador_dato_tipo("booleano", activo)
                if activo.lower() == 'true':
                    acciones = acciones.filter(activo=True)
                elif activo.lower() == 'false':
                    acciones = acciones.filter(activo=False)
                else:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'activo' debe ser 'true' o 'false'."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if not acciones.exists():
                return Response({
                    "success": True,
                    "detail": "No se encontraron acciones de cobro persuasivo.",
                    "data": []
                }, status=status.HTTP_200_OK)
            
            # Crear respuesta simplificada con solo ID y nombre
            data = [
                {
                    "id_accion_cobro_persuasivo": accion.id_accion_cobro_persuasivo,
                    "nombre": accion.nombre
                }
                for accion in acciones
            ]
            
            return Response({
                "success": True,
                "detail": "Acciones de cobro persuasivo consultadas exitosamente.",
                "data": data
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al consultar acciones de cobro persuasivo: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class AccionesCobroCoactivoSimpleView(APIView):
    """Vista simplificada para obtener solo ID y nombre de las acciones de cobro coactivo"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Listar solo ID y nombre de las acciones de cobro coactivo activas"""
        try:
            # Por defecto solo devolver las activas, pero permitir filtro
            activo = request.query_params.get('activo', 'true')
            
            # Filtrar solo acciones de tipo COACTIVO
            acciones = AccionesCobroPersuasivo.objects.filter(tipo_cobro='COACTIVO').order_by('nombre')
            
            if activo and activo != '':
                Utils.validador_dato_tipo("booleano", activo)
                if activo.lower() == 'true':
                    acciones = acciones.filter(activo=True)
                elif activo.lower() == 'false':
                    acciones = acciones.filter(activo=False)
                else:
                    return Response({
                        "success": False,
                        "detail": "El parámetro 'activo' debe ser 'true' o 'false'."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if not acciones.exists():
                return Response({
                    "success": True,
                    "detail": "No se encontraron acciones de cobro coactivo.",
                    "data": []
                }, status=status.HTTP_200_OK)
            
            # Crear respuesta simplificada con solo ID y nombre
            data = [
                {
                    "id_accion_cobro_persuasivo": accion.id_accion_cobro_persuasivo,
                    "nombre": accion.nombre
                }
                for accion in acciones
            ]
            
            return Response({
                "success": True,
                "detail": "Acciones de cobro coactivo consultadas exitosamente.",
                "data": data
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                "success": False,
                "detail": f"Error al consultar acciones de cobro coactivo: {str(error)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class CarteraCoactivoView(APIView):
    """Vista para consultar facturas que YA están en proceso coactivo"""
    permission_classes = [IsAuthenticated, PermisoConsultarCartera]

    def _construir_nombre_completo(self, persona):
        """Construir nombre completo de una persona"""
        if not persona:
            return 'N/A'
            
        if persona.razon_social:
            return persona.razon_social
        else:
            nombres = [
                persona.primer_nombre,
                persona.segundo_nombre,
                persona.primer_apellido, 
                persona.segundo_apellido
            ]
            return ' '.join(filter(None, nombres)) or 'N/A'

    def get(self, request):
        """Consultar facturas que están en proceso coactivo"""
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        numero_documento = request.query_params.get('numero_documento')
        estado_coactivo = request.query_params.get('estado_coactivo')  # ACTIVO, FINALIZADO, SUSPENDIDO

        # Obtener facturas que están en proceso coactivo
        facturas_en_coactivo = CoactivoFacturas.objects.select_related(
            'factura', 
            'cobro_coactivo',
            'factura__id_persona_recaudador'
        ).order_by('-cobro_coactivo__fecha_creacion')

        try:
            # Filtrar por estado del cobro coactivo
            if estado_coactivo:
                facturas_en_coactivo = facturas_en_coactivo.filter(cobro_coactivo__estado=estado_coactivo)

            # Filtrar por fechas de la factura
            if fecha_inicio and fecha_fin:
                Utils.validador_dato_tipo("fecha", fecha_inicio)
                Utils.validador_dato_tipo("fecha", fecha_fin)
                if fecha_inicio > fecha_fin:
                    raise ValidationError("La fecha de inicio no puede ser mayor que la fecha de fin.")
                facturas_en_coactivo = facturas_en_coactivo.filter(
                    factura__fecha_compra__range=[fecha_inicio, fecha_fin]
                )

            # Filtrar por documento del recaudador
            if numero_documento:
                Utils.validador_dato_tipo("entero", numero_documento)
                persona = Personas.objects.filter(numero_documento=numero_documento).first()
                if persona:
                    facturas_en_coactivo = facturas_en_coactivo.filter(
                        factura__id_persona_recaudador=persona.id_persona
                    )
                else:
                    facturas_en_coactivo = facturas_en_coactivo.none()

        except (ValueError, ValidationError) as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not facturas_en_coactivo.exists():
            return Response({
                "success": False, 
                "detail": "No se encontraron facturas en proceso coactivo."
            }, status=status.HTTP_404_NOT_FOUND)

        # Construir lista sin duplicados: una entrada por factura
        factura_ids = list(
            facturas_en_coactivo.values_list('factura', flat=True).distinct()
        )

        # Cargar facturas con info relevante
        facturas_qs = FacturaUnica.objects.filter(
            id_factura_unica__in=factura_ids
        ).select_related(
            'id_persona_recaudador'
        )

        # Serializar con información completa de la factura
        serializer = FacturasCarteraSerializer(facturas_qs, many=True, context={'request': request})
        facturas_data = list(serializer.data)
        # Agregar campo 'acciones' como placeholder
        for item in facturas_data:
            item['acciones'] = None

        # Paginación estándar del proyecto
        paginator = CustomPagination()
        page = paginator.paginate_queryset(facturas_data, request, view=self)
        return paginator.get_paginated_response(page)


class AccionesCobroCoactivoView(APIView):
    """Vista para consultar y registrar acciones de un cobro coactivo específico"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        """Obtener las acciones registradas para un cobro coactivo específico"""
        try:
            # Soportar consulta por factura_id o por cobro_coactivo_id
            factura_id = request.query_params.get('factura_id')
            cobro_coactivo_id = request.query_params.get('cobro_coactivo_id')

            if not factura_id and not cobro_coactivo_id:
                return Response({
                    'success': False,
                    'message': 'Se requiere el parámetro factura_id o cobro_coactivo_id.'
                }, status=status.HTTP_400_BAD_REQUEST)

            acciones_registradas = CobroCoactivo.objects.none()
            mensaje_base = ''

            if factura_id:
                # Validar existencia de la factura y obtener cobros asociados
                try:
                    factura = FacturaUnica.objects.get(id_factura_unica=factura_id)
                except FacturaUnica.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': 'La factura no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)

                cobros_ids = CoactivoFacturas.objects.filter(
                    factura=factura
                ).values_list('cobro_coactivo', flat=True).distinct()

                if not cobros_ids:
                    return Response({
                        'success': True,
                        'data': [],
                        'message': 'La factura no tiene cobros coactivos registrados.'
                    }, status=status.HTTP_200_OK)

                acciones_registradas = CobroCoactivo.objects.filter(
                    id_cobro_coactivo__in=cobros_ids
                ).select_related('id_accion_cobro_persuasivo', 'id_persona_crea').order_by('-fecha_creacion')
                mensaje_base = 'para la factura indicada'

            else:
                # Modo compatibilidad: consulta a partir de un cobro coactivo base
                try:
                    cobro_base = CobroCoactivo.objects.get(id_cobro_coactivo=cobro_coactivo_id)
                except CobroCoactivo.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': 'El cobro coactivo no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)

                facturas_cobro = CoactivoFacturas.objects.filter(
                    cobro_coactivo=cobro_base
                ).values_list('factura', flat=True)
                
                if not facturas_cobro:
                    return Response({
                        'success': True,
                        'data': [],
                        'message': 'No se encontraron facturas asociadas a este cobro coactivo.'
                    }, status=status.HTTP_200_OK)

                cobros_relacionados_ids = CoactivoFacturas.objects.filter(
                    factura__in=facturas_cobro
                ).exclude(
                    cobro_coactivo=cobro_base
                ).values_list('cobro_coactivo', flat=True).distinct()

                if not cobros_relacionados_ids:
                    return Response({
                        'success': True,
                        'data': [],
                        'message': 'No se han registrado acciones específicas para este cobro coactivo aún.'
                    }, status=status.HTTP_200_OK)

                acciones_registradas = CobroCoactivo.objects.filter(
                    id_cobro_coactivo__in=cobros_relacionados_ids
                ).select_related('id_accion_cobro_persuasivo', 'id_persona_crea').order_by('-fecha_creacion')
                mensaje_base = 'relacionadas con el cobro coactivo indicado'

            # Serializar las acciones
            acciones_data = []
            # Si se consultó por factura, reutilizamos esa factura para info contextual
            factura_context = None
            if 'factura' in locals():
                factura_context = factura

            for accion in acciones_registradas:
                # Obtener factura asociada si no hay contexto de factura
                factura_asociada = factura_context
                if not factura_asociada:
                    cf = CoactivoFacturas.objects.filter(
                        cobro_coactivo=accion
                    ).select_related('factura', 'factura__id_persona_recaudador').first()
                    factura_asociada = cf.factura if cf else None

                persona_recaudador = factura_asociada.id_persona_recaudador if factura_asociada else None

                # Construir URL del documento adjunto si existe
                documento_url = None
                if accion.documento_adjunto:
                    documento_url = Util.obtener_archivos(accion.documento_adjunto.name)

                accion_info = {
                    'id_cobro_coactivo': accion.id_cobro_coactivo,
                    'consecutivo': accion.consecutivo,
                    'cod_accion_registrada': accion.cod_accion_registrada,
                    'descripcion': accion.descripcion,
                    'estado': accion.estado,
                    'fecha_registro': accion.fecha_registro,
                    # Campos adicionales solicitados
                    'nombre_recaudador': accion.nombre_recaudador or (self._construir_nombre_completo(persona_recaudador) if persona_recaudador else None),
                    'documento_recaudador': persona_recaudador.numero_documento if persona_recaudador else None,
                    'celular_recaudador': getattr(accion, 'celular_recaudador', None),
                    'email_recaudador': getattr(accion, 'email_recaudador', None),
                    'fecha_compra': getattr(factura_asociada, 'fecha_compra', None),
                    'nro_factura_unica': getattr(factura_asociada, 'nro_factura_unica', None),
                    'plantilla': getattr(accion, 'aplicar_plantilla', None),
                    'accion_registrada': accion.id_accion_cobro_persuasivo.nombre if accion.id_accion_cobro_persuasivo else None,
                    'acciones': None,
                    'accion_cobro': {
                        'id_accion': accion.id_accion_cobro_persuasivo.id_accion_cobro_persuasivo if accion.id_accion_cobro_persuasivo else None,
                        'nombre': accion.id_accion_cobro_persuasivo.nombre if accion.id_accion_cobro_persuasivo else None,
                        'descripcion': accion.id_accion_cobro_persuasivo.descripcion if accion.id_accion_cobro_persuasivo else None,
                    },
                    'persona_crea': self._construir_nombre_completo(accion.id_persona_crea) if accion.id_persona_crea else None,
                    # Documento adjunto para descarga
                    'documento_adjunto': {
                        'nombre_archivo': accion.documento_adjunto.name.split('/')[-1] if accion.documento_adjunto else None,
                        'url_descarga': documento_url,
                        'tiene_documento': bool(accion.documento_adjunto)
                    }
                }
                acciones_data.append(accion_info)
            
            # Paginación estándar del proyecto
            paginator = CustomPagination()
            page = paginator.paginate_queryset(acciones_data, request, view=self)
            return paginator.get_paginated_response(page)

        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar las acciones del cobro coactivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def _construir_nombre_completo(self, persona):
        """Construir nombre completo de una persona"""
        if not persona:
            return None
            
        if persona.razon_social:
            return persona.razon_social
        else:
            nombres = [
                persona.primer_nombre,
                persona.segundo_nombre,
                persona.primer_apellido, 
                persona.segundo_apellido
            ]
            return ' '.join(filter(None, nombres))

    def post(self, request):
        """Registrar una nueva acción para un cobro coactivo específico"""
        try:
            print("[COACTIVO POST] Iniciando registro de nueva acción")
            
            # Obtener datos del request
            data = request.data.copy()
            print(f"[COACTIVO POST] Datos recibidos: {data}")
            
            # Buscar archivo con diferentes nombres posibles
            archivo = request.FILES.get('documento') or request.FILES.get('documento_adjunto')
            print(f"[COACTIVO POST] Archivo encontrado: {archivo}")
            if archivo:
                print(f"[COACTIVO POST] Detalles del archivo - Nombre: {archivo.name}, Tamaño: {archivo.size} bytes")
            
            # Soportar factura_id o cobro_coactivo_id (compatibilidad)
            factura_id = data.get('factura_id')
            cobro_coactivo_id = data.get('cobro_coactivo_id')
            cobro_coactivo = None

            if factura_id:
                # Validar factura y obtener coactivo más reciente asociado
                try:
                    factura = FacturaUnica.objects.get(id_factura_unica=factura_id)
                except FacturaUnica.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': 'La factura no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)

                coactivo_factura = CoactivoFacturas.objects.filter(
                    factura=factura
                ).select_related('cobro_coactivo').order_by('-cobro_coactivo__fecha_creacion').first()

                if not coactivo_factura:
                    return Response({
                        'success': False,
                        'message': 'La factura no tiene cobros coactivos asociados.'
                }, status=status.HTTP_400_BAD_REQUEST)

                cobro_coactivo = coactivo_factura.cobro_coactivo
            elif cobro_coactivo_id:
                try:
                    cobro_coactivo = CobroCoactivo.objects.get(id_cobro_coactivo=cobro_coactivo_id)
                except CobroCoactivo.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': 'El cobro coactivo no existe.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({
                    'success': False,
                    'message': 'Debe enviar factura_id o cobro_coactivo_id.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Por ahora, como no hay modelo específico para acciones coactivas,
            # podríamos crear un nuevo CobroCoactivo que represente la nueva acción
            # TODO: Implementar modelo AccionesCobroCoactivo dedicado
            
            # Validar datos requeridos
            required_fields = ['descripcion', 'id_accion_cobro_persuasivo']
            for field in required_fields:
                if field not in data:
                    return Response({
                        'success': False,
                        'message': f'El campo {field} es requerido.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Validación opcional del archivo adjunto
            if archivo:
                print("[COACTIVO POST] Validando archivo adjunto")
                nombre_archivo = getattr(archivo, 'name', '')
                tamaño_archivo = getattr(archivo, 'size', 0)
                extension = nombre_archivo.split('.')[-1].lower() if '.' in nombre_archivo else ''
                extensiones_permitidas = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'}
                tamaño_maximo = 10 * 1024 * 1024  # 10 MB
                
                print(f"[COACTIVO POST] Validación archivo - Nombre: {nombre_archivo}, Extensión: {extension}, Tamaño: {tamaño_archivo}")

                if extension not in extensiones_permitidas:
                    print(f"[COACTIVO POST] ERROR: Extensión no permitida: {extension}")
                    return Response({
                        'success': False,
                        'message': 'Formato de archivo no permitido. Use PDF, DOC, DOCX, JPG, JPEG o PNG.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if tamaño_archivo > tamaño_maximo:
                    print(f"[COACTIVO POST] ERROR: Archivo muy grande: {tamaño_archivo} bytes")
                    return Response({
                        'success': False,
                        'message': 'El archivo supera el tamaño máximo permitido de 10MB.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                print("[COACTIVO POST] Archivo validado correctamente")

            # Obtener las facturas del cobro original para pasarlas al serializer
            facturas_originales = CoactivoFacturas.objects.filter(cobro_coactivo=cobro_coactivo).values_list('factura', flat=True)
            
            # Crear un nuevo "cobro coactivo" que representa la nueva acción
            # Copiar datos base del cobro original
            nuevo_cobro_data = {
                'descripcion': data.get('descripcion'),
                'estado': 'ACTIVO',
                'fecha_registro': now(),
                'fecha_inicio_coactivo': now(),
                'id_accion_cobro_persuasivo': data.get('id_accion_cobro_persuasivo'),
                'nombre_recaudador': data.get('nombre_recaudador', cobro_coactivo.nombre_recaudador),
                'email_recaudador': data.get('email_recaudador', cobro_coactivo.email_recaudador),
                'celular_recaudador': data.get('celular_recaudador', cobro_coactivo.celular_recaudador),
                'valor_total_deuda': cobro_coactivo.valor_total_deuda,
                'valor_intereses': data.get('valor_intereses', cobro_coactivo.valor_intereses),
                'valor_costas_procesales': data.get('valor_costas_procesales', cobro_coactivo.valor_costas_procesales),
                'aplicar_plantilla': data.get('aplicar_plantilla', False),
                'id_persona_crea': request.user.persona,
                'facturas': list(facturas_originales)  # Pasar las facturas del cobro original
            }

            if archivo:
                print("[COACTIVO POST] Agregando archivo a datos del nuevo cobro")
                nuevo_cobro_data['documento_adjunto'] = archivo
            else:
                print("[COACTIVO POST] No se proporcionó archivo adjunto")

            print(f"[COACTIVO POST] Datos para nuevo cobro: {nuevo_cobro_data}")
            
            # Crear el nuevo cobro coactivo (nueva acción)
            serializer = CobroCoactivoCreateSerializer(data=nuevo_cobro_data, context={'request': request})
            if not serializer.is_valid():
                print(f"[COACTIVO POST] ERROR en validación del serializer: {serializer.errors}")
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos de la nueva acción.'
                }, status=status.HTTP_400_BAD_REQUEST)

            print("[COACTIVO POST] Serializer validado correctamente, guardando...")
            
            # Guardar usando el serializer (que maneja las facturas automáticamente)
            nuevo_cobro = serializer.save()
            print(f"[COACTIVO POST] Nuevo cobro creado con ID: {nuevo_cobro.id_cobro_coactivo}")
            
            # Verificar si el archivo se guardó correctamente
            if archivo and nuevo_cobro.documento_adjunto:
                print(f"[COACTIVO POST] Archivo guardado correctamente: {nuevo_cobro.documento_adjunto.name}")
            elif archivo and not nuevo_cobro.documento_adjunto:
                print("[COACTIVO POST] ERROR: Archivo no se guardó en el modelo")

            # Respuesta
            response_serializer = CobroCoactivoSerializer(nuevo_cobro, context={'request': request})
            
            return Response({
                'success': True,
                'data': response_serializer.data,
                'message': 'Nueva acción registrada exitosamente para el cobro coactivo.'
            }, status=status.HTTP_201_CREATED)

        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al registrar la acción: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        """Actualizar una acción de cobro coactivo específica"""
        try:
            # Obtener la acción de cobro coactivo por ID
            try:
                accion = CobroCoactivo.objects.get(id_cobro_coactivo=pk)
            except CobroCoactivo.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'La acción de cobro coactivo no existe.'
                }, status=status.HTTP_404_NOT_FOUND)

            # Obtener datos del request
            data = request.data.copy()
            archivo = request.FILES.get('documento')

            # Validación opcional del archivo adjunto
            if archivo:
                nombre_archivo = getattr(archivo, 'name', '')
                tamaño_archivo = getattr(archivo, 'size', 0)
                extension = nombre_archivo.split('.')[-1].lower() if '.' in nombre_archivo else ''
                extensiones_permitidas = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'}
                tamaño_maximo = 10 * 1024 * 1024  # 10 MB

                if extension not in extensiones_permitidas:
                    return Response({
                        'success': False,
                        'message': 'Formato de archivo no permitido. Use PDF, DOC, DOCX, JPG, JPEG o PNG.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if tamaño_archivo > tamaño_maximo:
                    return Response({
                        'success': False,
                        'message': 'El archivo supera el tamaño máximo permitido de 10MB.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Agregar el archivo a los datos
                data['documento_adjunto'] = archivo

            # Usar el serializer para actualizar
            serializer = CobroCoactivoUpdateSerializer(accion, data=data, partial=True, context={'request': request})
            
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos de la acción.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Actualizar la acción
            accion_actualizada = serializer.save()

            # Respuesta con la acción actualizada
            response_serializer = CobroCoactivoSerializer(accion_actualizada, context={'request': request})
            
            return Response({
                'success': True,
                'data': response_serializer.data,
                'message': 'Acción de cobro coactivo actualizada exitosamente.'
            }, status=status.HTTP_200_OK)

        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al actualizar la acción: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        """Actualizar parcialmente una acción de cobro coactivo específica"""
        return self.put(request, pk)


class ConvertirMultiplePersuasivoACoactivoView(APIView):
    """Vista para convertir múltiples facturas de persuasivo a coactivo"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Convertir múltiples facturas seleccionadas a cobro coactivo"""
        try:
            data = request.data
            facturas_ids = data.get('facturas', [])
            
            
            if not facturas_ids or not isinstance(facturas_ids, list):
                return Response({
                    'success': False,
                    'message': 'Debe proporcionar una lista de IDs de facturas.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar que las facturas existen y están disponibles para coactivo
            facturas = FacturaUnica.objects.filter(id_factura_unica__in=facturas_ids)
            if facturas.count() != len(facturas_ids):
                return Response({
                    'success': False,
                    'message': 'Algunas facturas no existen o no están disponibles.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Verificar que las facturas no están ya en proceso coactivo
            facturas_en_coactivo = CoactivoFacturas.objects.filter(factura__in=facturas_ids).values_list('factura', flat=True)
            if facturas_en_coactivo:
                return Response({
                    'success': False,
                    'message': f'Las facturas {list(facturas_en_coactivo)} ya están en proceso coactivo.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Obtener acción de cobro coactivo por defecto (la primera activa)
            accion_coactivo = AccionesCobroPersuasivo.objects.filter(
                tipo_cobro='COACTIVO', 
                activo=True
            ).first()

            # Calcular valores totales
            valor_total_deuda = facturas.aggregate(
                total=Sum('cuota_fomento')
            )['total'] or 0

            # Crear el cobro coactivo con datos automáticos
            cobro_coactivo_data = {
                'descripcion': f'Conversión masiva de {len(facturas_ids)} facturas a cobro coactivo',
                'estado': 'ACTIVO',
                'fecha_registro': now(),
                'fecha_inicio_coactivo': now(),
                'id_accion_cobro_persuasivo': accion_coactivo.id_accion_cobro_persuasivo if accion_coactivo else None,
                'valor_total_deuda': valor_total_deuda,
                'valor_intereses': 0,  # Se calculará posteriormente
                'valor_costas_procesales': 0,  # Se calculará posteriormente
                'aplicar_plantilla': True,  # Por defecto aplicar plantilla
                'facturas': facturas_ids  # Incluir las facturas en el serializer
            }

            # Crear el cobro coactivo (el serializer se encarga de asociar las facturas y obtener datos del recaudador)
            serializer = CobroCoactivoCreateSerializer(data=cobro_coactivo_data, context={'request': request})
            
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos del cobro coactivo.'
                }, status=status.HTTP_400_BAD_REQUEST)

            cobro_coactivo = serializer.save()

            # Respuesta con el cobro creado
            response_serializer = CobroCoactivoSerializer(cobro_coactivo, context={'request': request})
            
            return Response({
                'success': True,
                'data': response_serializer.data,
                'message': f'Cobro coactivo creado exitosamente con {len(facturas_ids)} facturas asociadas.'
            }, status=status.HTTP_201_CREATED)

        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al crear el cobro coactivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


# ================== VISTAS PARA COBRO COACTIVO ==================

class CobroCoactivoView(APIView):
    permission_classes = [IsAuthenticated]

    def asignar_consecutivo(self, cobro):
        """Asignar consecutivo automático al cobro coactivo"""
        try:
            # Obtener el último consecutivo
            ultimo_cobro = CobroCoactivo.objects.filter(
                consecutivo__isnull=False
            ).exclude(consecutivo='').order_by('-id_cobro_coactivo').first()
            
            if ultimo_cobro:
                try:
                    ultimo_numero = int(ultimo_cobro.consecutivo)
                    nuevo_numero = ultimo_numero + 1
                except ValueError:
                    nuevo_numero = 1
            else:
                nuevo_numero = 1
            
            consecutivo = f"{nuevo_numero:06d}"
            cobro.consecutivo = consecutivo
            cobro.save()
            
            print(f"DEBUG: Consecutivo asignado al cobro {cobro.id_cobro_coactivo}: {consecutivo}")
        except Exception as e:
            print(f"ERROR asignando consecutivo: {str(e)}")

    def get(self, request):
        """Listar todos los cobros coactivos"""
        try:
            # Obtener parámetros de filtrado
            estado = request.GET.get('estado', None)
            cobro_persuasivo_id = request.GET.get('cobro_persuasivo', None)
            
            # Construir queryset base
            cobros = CobroCoactivo.objects.select_related(
                'cobro_persuasivo', 'id_accion_cobro_persuasivo', 'id_persona_crea'
            ).order_by('-fecha_creacion')
            
            # Aplicar filtros
            if estado:
                cobros = cobros.filter(estado=estado)
            
            if cobro_persuasivo_id:
                cobros = cobros.filter(cobro_persuasivo__id_cobro_persuasivo=cobro_persuasivo_id)
            
            # Paginación
            page = request.GET.get('page', None)
            if page:
                try:
                    page = int(page)
                    limit = int(request.GET.get('limit', 10))
                    offset = (page - 1) * limit
                    
                    total = cobros.count()
                    cobros_paginados = cobros[offset:offset + limit]
                    
                    serializer = CobroCoactivoListSerializer(cobros_paginados, many=True, context={'request': request})
                    
                    return Response({
                        'success': True,
                        'data': {
                            'cobros': serializer.data,
                            'total': total,
                            'page': page,
                            'limit': limit,
                            'pages': (total + limit - 1) // limit
                        },
                        'message': 'Cobros coactivos consultados exitosamente.'
                    }, status=status.HTTP_200_OK)
                except ValueError:
                    pass
            
            # Sin paginación
            serializer = CobroCoactivoListSerializer(cobros, many=True, context={'request': request})
            
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Cobros coactivos consultados exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar cobros coactivos: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        """Crear un nuevo cobro coactivo"""
        try:
            serializer = CobroCoactivoCreateSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                cobro = serializer.save()
                
                # Generar consecutivo automático
                self.asignar_consecutivo(cobro)
                
                print(f"DEBUG: Cobro coactivo creado con ID: {cobro.id_cobro_coactivo}")
                print(f"DEBUG: Estado: {cobro.estado}")
                print(f"DEBUG: Consecutivo asignado: {cobro.consecutivo}")
                
                # Respuesta con datos completos
                response_serializer = CobroCoactivoSerializer(cobro, context={'request': request})
                
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': 'Cobro coactivo creado exitosamente.'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al crear el cobro coactivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class CobroCoactivoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        """Obtener objeto cobro coactivo por ID"""
        try:
            return CobroCoactivo.objects.select_related(
                'cobro_persuasivo', 'id_accion_cobro_persuasivo', 'id_persona_crea'
            ).get(id_cobro_coactivo=pk)
        except CobroCoactivo.DoesNotExist:
            return None

    def get(self, request, pk):
        """Obtener detalles de un cobro coactivo específico"""
        try:
            cobro = self.get_object(pk)
            if not cobro:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Cobro coactivo no encontrado.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = CobroCoactivoSerializer(cobro, context={'request': request})
            
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Cobro coactivo consultado exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar el cobro coactivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        """Actualizar un cobro coactivo"""
        try:
            cobro = self.get_object(pk)
            if not cobro:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Cobro coactivo no encontrado.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # No permitir actualizar ciertos campos críticos
            data = request.data.copy()
            campos_protegidos = ['id_cobro_coactivo', 'fecha_creacion', 'id_persona_crea', 'cobro_persuasivo']
            for campo in campos_protegidos:
                if campo in data:
                    data.pop(campo)
            
            serializer = CobroCoactivoSerializer(cobro, data=data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                cobro_actualizado = serializer.save()
                
                response_serializer = CobroCoactivoSerializer(cobro_actualizado, context={'request': request})
                
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': 'Cobro coactivo actualizado exitosamente.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al actualizar el cobro coactivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Eliminar un cobro coactivo"""
        try:
            cobro = self.get_object(pk)
            if not cobro:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Cobro coactivo no encontrado.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar si se puede eliminar (solo si está en estado ACTIVO y no tiene documentos generados)
            if cobro.estado != 'ACTIVO':
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Solo se pueden eliminar cobros coactivos en estado ACTIVO.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if cobro.doc_coactivo:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'No se puede eliminar un cobro coactivo que ya tiene documentos generados.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            cobro.delete()
            
            return Response({
                'success': True,
                'data': None,
                'message': 'Cobro coactivo eliminado exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al eliminar el cobro coactivo: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class CoactivoFacturasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Listar relaciones cobro coactivo - facturas"""
        try:
            cobro_coactivo_id = request.GET.get('cobro_coactivo', None)
            factura_id = request.GET.get('factura', None)
            
            coactivo_facturas = CoactivoFacturas.objects.select_related(
                'cobro_coactivo', 'factura', 'factura__id_persona_comprador'
            ).order_by('-fecha_inclusion')
            
            if cobro_coactivo_id:
                coactivo_facturas = coactivo_facturas.filter(cobro_coactivo__id_cobro_coactivo=cobro_coactivo_id)
            
            if factura_id:
                coactivo_facturas = coactivo_facturas.filter(factura__id_factura_unica=factura_id)
            
            serializer = CoactivoFacturasSerializer(coactivo_facturas, many=True, context={'request': request})
            
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Relaciones consultadas exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar las relaciones: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        """Crear nueva relación cobro coactivo - factura"""
        try:
            serializer = CoactivoFacturasSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                relacion = serializer.save()
                
                response_serializer = CoactivoFacturasSerializer(relacion, context={'request': request})
                
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': 'Relación creada exitosamente.'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al crear la relación: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Eliminar relación cobro coactivo - factura"""
        try:
            try:
                relacion = CoactivoFacturas.objects.get(id_coactivo_facturas=pk)
            except CoactivoFacturas.DoesNotExist:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Relación no encontrada.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            relacion.delete()
            
            return Response({
                'success': True,
                'data': None,
                'message': 'Relación eliminada exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al eliminar la relación: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class ConvertirPersuasivoACoactivoView(APIView):
    """Vista para convertir cobros persuasivos a coactivos"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Convertir uno o más cobros persuasivos a coactivos"""
        try:
            serializer = ConvertirPersuasivoACoactivoSerializer(data=request.data)
            
            if serializer.is_valid():
                data = serializer.validated_data
                cobros_persuasivos_ids = data['cobros_persuasivos']
                
                # Obtener los cobros persuasivos
                cobros_persuasivos = CobroPersuasivo.objects.filter(
                    id_cobro_persuasivo__in=cobros_persuasivos_ids
                ).prefetch_related('persuasivofacturas_set__factura')
                
                cobros_coactivos_creados = []
                
                for cobro_persuasivo in cobros_persuasivos:
                    # Crear el cobro coactivo
                    cobro_coactivo_data = {
                        'cobro_persuasivo': cobro_persuasivo,
                        'descripcion': data.get('descripcion', f'Cobro coactivo generado desde persuasivo {cobro_persuasivo.consecutivo}'),
                        'id_accion_cobro_persuasivo': AccionesCobroPersuasivo.objects.get(id_accion_cobro_persuasivo=data['id_accion_cobro_persuasivo']),
                        'fecha_limite_pago': data.get('fecha_limite_pago'),
                        'valor_intereses': data.get('valor_intereses', 0),
                        'valor_costas_procesales': data.get('valor_costas_procesales', 0),
                        'estado': 'ACTIVO',
                        'fecha_inicio_coactivo': now(),
                        'id_persona_crea': request.user.persona,
                        # Copiar datos del recaudador del cobro persuasivo
                        'nombre_recaudador': cobro_persuasivo.nombre_recaudador,
                        'email_recaudador': cobro_persuasivo.email_recaudador,
                        'celular_recaudador': cobro_persuasivo.celular_recaudador,
                    }
                    
                    # Generar código de acción automático
                    ultimo_cobro = CobroCoactivo.objects.filter(
                        cod_accion_registrada__isnull=False
                    ).order_by('-id_cobro_coactivo').first()
                    
                    if ultimo_cobro and ultimo_cobro.cod_accion_registrada:
                        try:
                            ultimo_numero = int(ultimo_cobro.cod_accion_registrada.split('-')[-1])
                            nuevo_numero = ultimo_numero + 1
                        except (ValueError, IndexError):
                            nuevo_numero = 1
                    else:
                        nuevo_numero = 1
                    
                    cobro_coactivo_data['cod_accion_registrada'] = f"COAC-{nuevo_numero:06d}"
                    
                    # Crear el cobro coactivo
                    cobro_coactivo = CobroCoactivo.objects.create(**cobro_coactivo_data)
                    
                    # Asignar consecutivo
                    ultimo_consecutivo = CobroCoactivo.objects.filter(
                        consecutivo__isnull=False
                    ).exclude(consecutivo='').order_by('-id_cobro_coactivo').first()
                    
                    if ultimo_consecutivo:
                        try:
                            ultimo_numero = int(ultimo_consecutivo.consecutivo)
                            nuevo_numero = ultimo_numero + 1
                        except ValueError:
                            nuevo_numero = 1
                    else:
                        nuevo_numero = 1
                    
                    cobro_coactivo.consecutivo = f"{nuevo_numero:06d}"
                    
                    # Calcular el valor total de la deuda desde las facturas asociadas al persuasivo
                    facturas_persuasivo = PersuasivoFacturas.objects.filter(cobro_persuasivo=cobro_persuasivo)
                    valor_total = sum(pf.factura.valor_neto for pf in facturas_persuasivo)
                    cobro_coactivo.valor_total_deuda = valor_total
                    
                    cobro_coactivo.save()
                    
                    # Copiar las facturas del cobro persuasivo al coactivo
                    for persuasivo_factura in facturas_persuasivo:
                        CoactivoFacturas.objects.create(
                            cobro_coactivo=cobro_coactivo,
                            factura=persuasivo_factura.factura,
                            valor_capital=persuasivo_factura.factura.valor_neto,
                            valor_intereses=0  # Se puede calcular después
                        )
                    
                    cobros_coactivos_creados.append(cobro_coactivo)
                
                # Serializar los cobros coactivos creados
                response_serializer = CobroCoactivoListSerializer(
                    cobros_coactivos_creados, many=True, context={'request': request}
                )
                
                return Response({
                    'success': True,
                    'data': {
                        'cobros_coactivos_creados': response_serializer.data,
                        'total_creados': len(cobros_coactivos_creados)
                    },
                    'message': f'Se crearon {len(cobros_coactivos_creados)} cobros coactivos exitosamente.'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'data': serializer.errors,
                    'message': 'Error en los datos proporcionados.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al convertir cobros persuasivos a coactivos: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class FacturaCobroCoactivoView(APIView):
    """Vista para consultar cobros coactivos por factura"""
    permission_classes = [IsAuthenticated]

    def get(self, request, factura_id):
        """Obtener todos los cobros coactivos asociados a una factura"""
        try:
            # Verificar que la factura existe
            try:
                factura = FacturaUnica.objects.get(id_factura_unica=factura_id)
            except FacturaUnica.DoesNotExist:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Factura no encontrada.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Obtener cobros coactivos asociados a la factura
            coactivo_facturas = CoactivoFacturas.objects.filter(
                factura=factura
            ).select_related('cobro_coactivo', 'cobro_coactivo__id_persona_crea')
            
            cobros_coactivos = [cf.cobro_coactivo for cf in coactivo_facturas]
            
            serializer = CobroCoactivoListSerializer(cobros_coactivos, many=True, context={'request': request})
            
            return Response({
                'success': True,
                'data': {
                    'factura': {
                        'id_factura': factura.id_factura_unica,
                        'nro_factura': factura.nro_factura_unica,
                        'valor_neto': factura.valor_neto
                    },
                    'cobros_coactivos': serializer.data,
                    'total_cobros': len(cobros_coactivos)
                },
                'message': 'Cobros coactivos consultados exitosamente.'
            }, status=status.HTTP_200_OK)
            
        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al consultar cobros coactivos de la factura: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


# ================== SERVICIO DE ELIMINACIÓN MASIVA ==================

class EliminacionMasivaFacturasView(APIView):
    """
    Vista para eliminar facturas por rango de números de factura
    CUIDADO: Esta operación es irreversible y elimina en cascada
    """
    permission_classes = [IsAuthenticated]

    def _check_pagos_exist(self, factura):
        """Verificar si existen pagos para una factura de forma segura"""
        try:
            if factura.id_liq_factura_unica:
                return Pagos.objects.filter(id_liquidacion_pago=factura.id_liq_factura_unica).exists()
            return False
        except Exception:
            return False

    def _check_paz_y_salvos_exist(self, factura):
        """Verificar si existen paz y salvos para una factura de forma segura"""
        try:
            return PazYSalvoFacturas.objects.filter(id_factura_unica=factura).exists()
        except Exception:
            return False

    def _check_persuasivos_exist(self, factura):
        """Verificar si existen cobros persuasivos para una factura de forma segura"""
        try:
            return PersuasivoFacturas.objects.filter(factura=factura).exists()
        except Exception:
            return False

    def _check_coactivos_exist(self, factura):
        """Verificar si existen cobros coactivos para una factura de forma segura"""
        try:
            return CoactivoFacturas.objects.filter(factura=factura).exists()
        except Exception:
            return False

    def post(self, request):
        """
        Eliminar facturas por rango o por año
        
        Body esperado (Opción 1 - Por rango):
        {
            "nro_factura_inicio": 2024001,
            "nro_factura_fin": 2024050,
            "confirmar_eliminacion": true,
            "motivo": "Eliminación de datos de prueba"
        }
        
        Body esperado (Opción 2 - Por año):
        {
            "anio": 2022,
            "confirmar_eliminacion": true,
            "motivo": "Eliminación de facturas año 2022"
        }
        """
        try:
            # Validar datos de entrada
            nro_factura_inicio = request.data.get('nro_factura_inicio')
            nro_factura_fin = request.data.get('nro_factura_fin')
            anio = request.data.get('anio')
            confirmar_eliminacion = request.data.get('confirmar_eliminacion', False)
            motivo = request.data.get('motivo', 'Sin motivo especificado')
            ejecutar = request.data.get('ejecutar', False)

            # Validar que se proporcione uno de los dos métodos
            metodo_rango = bool(nro_factura_inicio and nro_factura_fin)
            metodo_anio = bool(anio)

            if not metodo_rango and not metodo_anio:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Debe proporcionar either (nro_factura_inicio y nro_factura_fin) o (anio).'
                }, status=status.HTTP_400_BAD_REQUEST)

            if metodo_rango and metodo_anio:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'No puede usar ambos métodos simultáneamente. Use solo rango o solo año.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if not confirmar_eliminacion:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Debe confirmar la eliminación estableciendo confirmar_eliminacion en true.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Construir queryset según el método elegido
            if metodo_rango:
                # Validaciones específicas para rango
                if nro_factura_inicio > nro_factura_fin:
                    return Response({
                        'success': False,
                        'data': None,
                        'message': 'El número de factura de inicio debe ser menor o igual al de fin.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Buscar facturas en el rango
                facturas_a_eliminar = FacturaUnica.objects.filter(
                    nro_factura_unica__gte=nro_factura_inicio,
                    nro_factura_unica__lte=nro_factura_fin
                ).select_related('id_persona_proveedor', 'id_persona_recaudador')

                criterio_busqueda = f"rango {nro_factura_inicio} - {nro_factura_fin}"

            elif metodo_anio:
                # Validaciones específicas para año
                try:
                    anio = int(anio)
                    if anio < 2000 or anio > 2050:
                        return Response({
                            'success': False,
                            'data': None,
                            'message': 'El año debe estar entre 2000 y 2050.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({
                        'success': False,
                        'data': None,
                        'message': 'El año debe ser un número entero válido.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Buscar facturas por año (usando fecha_compra)
                from django.db.models import Q
                facturas_a_eliminar = FacturaUnica.objects.filter(
                    fecha_compra__year=anio
                ).select_related('id_persona_proveedor', 'id_persona_recaudador')

                criterio_busqueda = f"año {anio}"

            # Verificar que existan facturas
            if not facturas_a_eliminar.exists():
                return Response({
                    'success': False,
                    'data': None,
                    'message': f'No se encontraron facturas para el {criterio_busqueda}.'
                }, status=status.HTTP_404_NOT_FOUND)

            print(f"🔍 INICIANDO ANÁLISIS OPTIMIZADO - {criterio_busqueda}")
            print(f"📊 Total de facturas encontradas: {facturas_a_eliminar.count()}")

            # OPTIMIZACIÓN: Solo obtener datos básicos sin consultas costosas
            facturas_info = []
            total_valor_eliminado = Decimal('0.00')
            
            # Obtener solo IDs para cálculos rápidos
            facturas_ids = list(facturas_a_eliminar.values_list('id_factura_unica', flat=True))
            print(f"📋 Obteniendo datos básicos de {len(facturas_ids)} facturas...")

            # Conteo optimizado solo de las 3 tablas principales que mencionas
            relaciones_eliminadas = {
                'detalles_factura': 0,
                'acuerdos_pago': 0,
                'liquidaciones': 0
            }

            # Solo contar las relaciones principales que realmente existen
            try:
                # 1. Detalles de facturas (tabla principal relacionada)
                detalles_count = DetallesFacturaUnica.objects.filter(id_factura_unica__in=facturas_ids).count()
                relaciones_eliminadas['detalles_factura'] = detalles_count
                print(f"  📝 Detalles de facturas: {detalles_count}")
            except Exception as e:
                print(f"  ⚠️ Error contando detalles: tabla no existe o sin acceso")

            try:
                # 2. Acuerdos de pago (si existe la tabla)
                from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago
                acuerdos_count = DetalleAcuerdoPago.objects.filter(id_factura_unica__in=facturas_ids).count()
                relaciones_eliminadas['acuerdos_pago'] = acuerdos_count
                print(f"  📄 Acuerdos de pago: {acuerdos_count}")
            except Exception as e:
                print(f"  ⚠️ Acuerdos de pago: tabla no existe o sin acceso")

            try:
                # 3. Liquidaciones (conteo rápido)
                liquidaciones_count = facturas_a_eliminar.filter(id_liq_factura_unica__isnull=False).count()
                relaciones_eliminadas['liquidaciones'] = liquidaciones_count
                print(f"  💰 Liquidaciones: {liquidaciones_count}")
            except Exception as e:
                print(f"  ⚠️ Error contando liquidaciones")

            # Calcular valor total de forma eficiente
            total_valor_eliminado = facturas_a_eliminar.aggregate(
                total=models.Sum('valor_neto')
            )['total'] or Decimal('0.00')
            
            print(f"💰 Valor total a eliminar: ${total_valor_eliminado:,.2f}")

            # Solo guardar información básica de las primeras 10 facturas para el response
            facturas_muestra = facturas_a_eliminar.select_related(
                'id_persona_proveedor', 'id_persona_recaudador'
            )[:10]
            
            for factura in facturas_muestra:
                factura_info = {
                    'id_factura': factura.id_factura_unica,
                    'nro_factura': factura.nro_factura_unica,
                    'valor_neto': str(factura.valor_neto),
                    'fecha_compra': factura.fecha_compra.strftime('%Y-%m-%d %H:%M:%S'),
                    'estado_factura': factura.estado_factura
                }
                facturas_info.append(factura_info)

            print(f"\n🗑️ INICIANDO ELIMINACIÓN EN TRANSACCIÓN ATÓMICA")
            print(f"📊 Resumen de relaciones a eliminar:")
            for tipo, cantidad in relaciones_eliminadas.items():
                if cantidad > 0:
                    print(f"   {tipo}: {cantidad}")
            
            # FASE 1 y verificaciones ya ejecutadas arriba
            # FASE 2 modificada: Primero eliminar referencias en Coactivo_Facturas, luego las facturas
            coactivos_persistentes = list(CoactivoFacturas.objects.filter(factura_id__in=facturas_ids).values_list('factura_id', flat=True).distinct())
            
            print(f"🔎 Verificación previa a borrado: {len(facturas_ids)} facturas totales, {len(coactivos_persistentes)} con referencias en Coactivo_Facturas")

            # Borrar TODAS las facturas, incluyendo las que tienen referencias en Coactivo_Facturas
            from django.db import connection
            inicio_eliminacion = now()
            
            with transaction.atomic():
                # 1) Eliminar referencias en Coactivo_Facturas PRIMERO
                if coactivos_persistentes:
                    coactivos_eliminados = CoactivoFacturas.objects.filter(factura_id__in=coactivos_persistentes).delete()
                    print(f"🗑️ Referencias eliminadas en Coactivo_Facturas: {coactivos_eliminados[0]}")
                
                # 2) Eliminar referencias en DetallesAcuerdoPago (acuerdos de pago)
                from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago
                detalles_acuerdo = DetalleAcuerdoPago.objects.filter(id_factura_unica__in=facturas_ids).count()
                if detalles_acuerdo > 0:
                    DetalleAcuerdoPago.objects.filter(id_factura_unica__in=facturas_ids).delete()
                    print(f"🗑️ Referencias eliminadas en DetallesAcuerdoPago: {detalles_acuerdo}")
                
                # 3) Eliminar detalles/persuasivos/pazysalvo
                DetallesFacturaUnica.objects.filter(id_factura_unica__in=facturas_ids).delete()
                PersuasivoFacturas.objects.filter(factura_id__in=facturas_ids).delete()
                PazYSalvoFacturas.objects.filter(id_factura_unica__in=facturas_ids).delete()
                
                # 4) Borrar todas las facturas
                ids_str_todas = ','.join(map(str, facturas_ids))
                with connection.cursor() as cursor:
                    cursor.execute(f'DELETE FROM "FacturaUnica" WHERE "IdFacturaUnica" IN ({ids_str_todas})')
                
                fin_eliminacion = now()
            
            duracion = (fin_eliminacion - inicio_eliminacion).total_seconds()
            print(f"✅ ELIMINACIÓN COMPLETADA en {duracion:.2f} segundos")
            print(f"📈 Velocidad: {len(facturas_ids)/duracion:.1f} facturas/segundo")

            username = getattr(request.user, 'username', 
                getattr(request.user, 'email', 
                    getattr(request.user, 'id_persona', 'Usuario_sin_identificar')))
            print(f"📝 ELIMINACIÓN MASIVA: Usuario {username} eliminó {len(facturas_ids)} facturas - {criterio_busqueda}. Motivo: {motivo}")

            # Preparar datos de respuesta según el método usado
            criterio_eliminacion = {}
            if metodo_rango:
                criterio_eliminacion = {
                    'tipo': 'rango',
                    'rango_eliminado': {
                        'inicio': nro_factura_inicio,
                        'fin': nro_factura_fin
                    }
                }
            elif metodo_anio:
                criterio_eliminacion = {
                    'tipo': 'anio',
                    'anio_eliminado': anio
                }

            # Éxito total - todas las facturas fueron eliminadas incluyendo sus referencias
            print(f"\n🎉 OPERACIÓN COMPLETADA EXITOSAMENTE")
            print(f"📊 Estadísticas finales:")
            print(f"   Facturas eliminadas: {len(facturas_ids)}")
            if coactivos_persistentes:
                print(f"   Referencias en Coactivo_Facturas eliminadas: {len(coactivos_persistentes)}")
            print(f"   Valor total eliminado: ${total_valor_eliminado:,.2f}")
            print(f"   Criterio: {criterio_busqueda}")
            print(f"   Usuario: {username}")
            print(f"   Hora: {now().strftime('%Y-%m-%d %H:%M:%S')}")

            return Response({
                'success': True,
                'data': {
                    'facturas_eliminadas': len(facturas_ids),
                    'referencias_coactivo_eliminadas': len(coactivos_persistentes),
                    'criterio_busqueda': criterio_busqueda,
                    'criterio_eliminacion': criterio_eliminacion,
                    'valor_total_eliminado': str(total_valor_eliminado),
                    'relaciones_eliminadas': relaciones_eliminadas,
                    'facturas_detalle': facturas_info,
                    'motivo': motivo,
                    'usuario_elimino': username,
                    'fecha_eliminacion': now().strftime('%Y-%m-%d %H:%M:%S')
                },
                'message': f'Se eliminaron exitosamente {len(facturas_ids)} facturas del {criterio_busqueda}, incluyendo {len(coactivos_persistentes)} referencias en cobros coactivos.'
            }, status=status.HTTP_200_OK)

        except Exception as error:
            username_error = 'Desconocido'
            if hasattr(request, 'user') and request.user:
                username_error = getattr(request.user, 'username', 
                    getattr(request.user, 'email', 
                        getattr(request.user, 'id_persona', 'Usuario_sin_identificar')))
            
            print(f"❌ ERROR DURANTE LA ELIMINACIÓN:")
            print(f"   Tipo: {type(error).__name__}")
            print(f"   Mensaje: {str(error)}")
            print(f"   Usuario: {username_error}")
            print(f"   Hora: {now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al eliminar facturas: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        """
        Obtener vista previa de facturas que serían eliminadas por rango o año
        
        Parámetros (Opción 1 - Por rango):
        - nro_factura_inicio: número de factura inicial
        - nro_factura_fin: número de factura final
        
        Parámetros (Opción 2 - Por año):
        - anio: año de las facturas a eliminar
        """
        try:
            nro_factura_inicio = request.GET.get('nro_factura_inicio')
            nro_factura_fin = request.GET.get('nro_factura_fin')
            anio = request.GET.get('anio')
            # Parámetros opcionales para simulación de ejecución desde GET (solo para diagnóstico)
            ejecutar_param = str(request.GET.get('ejecutar', 'false')).lower()
            ejecutar = ejecutar_param in ['true', '1', 'si', 'yes']
            motivo = request.GET.get('motivo', 'Vista previa eliminación')

            # Validar que se proporcione uno de los dos métodos
            metodo_rango = bool(nro_factura_inicio and nro_factura_fin)
            metodo_anio = bool(anio)

            if not metodo_rango and not metodo_anio:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'Debe proporcionar either (nro_factura_inicio y nro_factura_fin) o (anio).'
                }, status=status.HTTP_400_BAD_REQUEST)

            if metodo_rango and metodo_anio:
                return Response({
                    'success': False,
                    'data': None,
                    'message': 'No puede usar ambos métodos simultáneamente. Use solo rango o solo año.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Construir queryset según el método elegido
            if metodo_rango:
                try:
                    nro_factura_inicio = int(nro_factura_inicio)
                    nro_factura_fin = int(nro_factura_fin)
                except ValueError:
                    return Response({
                        'success': False,
                        'data': None,
                        'message': 'Los números de factura deben ser enteros válidos.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if nro_factura_inicio > nro_factura_fin:
                    return Response({
                        'success': False,
                        'data': None,
                        'message': 'El número de factura de inicio debe ser menor o igual al de fin.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Buscar facturas en el rango
                facturas_preview = FacturaUnica.objects.filter(
                    nro_factura_unica__gte=nro_factura_inicio,
                    nro_factura_unica__lte=nro_factura_fin
                ).select_related('id_persona_proveedor', 'id_persona_recaudador').order_by('nro_factura_unica')

                criterio_busqueda = f"rango {nro_factura_inicio} - {nro_factura_fin}"
                criterio_respuesta = {
                    'tipo': 'rango',
                    'rango': {
                        'inicio': nro_factura_inicio,
                        'fin': nro_factura_fin
                    }
                }

            elif metodo_anio:
                try:
                    anio = int(anio)
                    if anio < 2000 or anio > 2050:
                        return Response({
                            'success': False,
                            'data': None,
                            'message': 'El año debe estar entre 2000 y 2050.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({
                        'success': False,
                        'data': None,
                        'message': 'El año debe ser un número entero válido.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Buscar facturas por año
                facturas_preview = FacturaUnica.objects.filter(
                    fecha_compra__year=anio
                ).select_related('id_persona_proveedor', 'id_persona_recaudador').order_by('nro_factura_unica')

                criterio_busqueda = f"año {anio}"
                criterio_respuesta = {
                    'tipo': 'anio',
                    'anio': anio
                }

            if not facturas_preview.exists():
                return Response({
                    'success': True,
                    'data': {
                        'total_facturas': 0,
                        'facturas': [],
                        'valor_total': '0.00',
                        'criterio': criterio_respuesta
                    },
                    'message': f'No se encontraron facturas para el {criterio_busqueda}.'
                }, status=status.HTTP_200_OK)

            # Preparar información de preview
            facturas_info = []
            total_valor = Decimal('0.00')
            
            print(f"👀 GENERANDO VISTA PREVIA - {criterio_busqueda}")
            print(f"📊 Facturas encontradas: {facturas_preview.count()}")

            contador_preview = 0
            for factura in facturas_preview:
                contador_preview += 1
                if contador_preview % 50 == 0:
                    print(f"🔄 Procesando preview: {contador_preview}/{facturas_preview.count()}")
                factura_info = {
                    'id_factura': factura.id_factura_unica,
                    'nro_factura': factura.nro_factura_unica,
                    'valor_neto': str(factura.valor_neto),
                    'fecha_compra': factura.fecha_compra.strftime('%Y-%m-%d'),
                    'proveedor': factura.id_persona_proveedor.primer_nombre if factura.id_persona_proveedor.tipo_persona == 'N' else factura.id_persona_proveedor.razon_social,
                    'recaudador': factura.id_persona_recaudador.primer_nombre if factura.id_persona_recaudador.tipo_persona == 'N' else factura.id_persona_recaudador.razon_social,
                    'estado_factura': factura.estado_factura,
                    'tiene_liquidacion': bool(factura.id_liq_factura_unica),
                    'tiene_pagos': self._check_pagos_exist(factura),
                    'tiene_paz_y_salvos': self._check_paz_y_salvos_exist(factura),
                    'tiene_cobros_persuasivos': self._check_persuasivos_exist(factura),
                    'tiene_cobros_coactivos': self._check_coactivos_exist(factura)
                }
                facturas_info.append(factura_info)
                total_valor += factura.valor_neto

            print(f"✅ VISTA PREVIA COMPLETADA")
            print(f"   Total facturas: {len(facturas_info)}")
            print(f"   Valor total: ${total_valor:,.2f}")
            print(f"   Criterio: {criterio_busqueda}")

            # Si no se solicitó ejecutar, devolver solo la vista previa
            if not ejecutar:
                return Response({
                    'success': True,
                    'data': {
                        'total_facturas': len(facturas_info),
                        'facturas': facturas_info,
                        'valor_total': str(total_valor),
                        'criterio': criterio_respuesta,
                        'criterio_busqueda': criterio_busqueda,
                        'advertencia': 'Esta es una vista previa. Para ejecutar el borrado envíe ejecutar=true.'
                    },
                    'message': f'Se encontraron {len(facturas_info)} facturas para el {criterio_busqueda}.'
                }, status=status.HTTP_200_OK)

            # Validaciones antes de ejecutar: no permitir si existen pagos
            facturas_con_pagos = []
            for factura in facturas_preview:
                if self._check_pagos_exist(factura):
                    facturas_con_pagos.append(factura.nro_factura_unica)

            if facturas_con_pagos:
                return Response({
                    'success': False,
                    'data': {
                        'nro_facturas_con_pagos': facturas_con_pagos,
                        'total_afectadas': len(facturas_con_pagos)
                    },
                    'message': 'No se puede eliminar porque hay facturas con pagos asociados.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Ejecutar eliminación ordenada en transacción
            ids_facturas = list(facturas_preview.values_list('id_factura_unica', flat=True))
            total_eliminadas = 0

            # FASE 1: Eliminar todas las referencias y facturas en una transacción
            from django.db import IntegrityError, connection
            eliminadas_ok = []
            saltadas_fk = []
            
            with transaction.atomic():
                # Primero, obtener conteos informativos
                from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago
                coactivos_count = CoactivoFacturas.objects.filter(factura_id__in=ids_facturas).count()
                persuasivos_count = PersuasivoFacturas.objects.filter(factura_id__in=ids_facturas).count()
                pazysalvo_count = PazYSalvoFacturas.objects.filter(id_factura_unica__in=ids_facturas).count()
                detalles_count = DetallesFacturaUnica.objects.filter(id_factura_unica__in=ids_facturas).count()
                acuerdos_count = DetalleAcuerdoPago.objects.filter(id_factura_unica__in=ids_facturas).count()

                if coactivos_count:
                    print(f"  🗑️ Eliminando {coactivos_count} referencias en coactivos-facturas...")
                if persuasivos_count:
                    print(f"  🗑️ Eliminando {persuasivos_count} referencias en persuasivos-facturas...")
                if pazysalvo_count:
                    print(f"  🗑️ Eliminando {pazysalvo_count} referencias en paz y salvo-facturas...")
                if detalles_count:
                    print(f"  🗑️ Eliminando {detalles_count} detalles de facturas...")
                if acuerdos_count:
                    print(f"  🗑️ Eliminando {acuerdos_count} referencias en detalles de acuerdos de pago...")

                # Eliminar todas las referencias en las tablas relacionadas
                CoactivoFacturas.objects.filter(factura_id__in=ids_facturas).delete()
                PersuasivoFacturas.objects.filter(factura_id__in=ids_facturas).delete()
                PazYSalvoFacturas.objects.filter(id_factura_unica__in=ids_facturas).delete()
                DetallesFacturaUnica.objects.filter(id_factura_unica__in=ids_facturas).delete()
                DetalleAcuerdoPago.objects.filter(id_factura_unica__in=ids_facturas).delete()
                
                print(f"  ✅ Referencias eliminadas exitosamente")

            # FASE 2: Eliminar facturas individualmente para identificar problemas específicos
            for fid in ids_facturas:
                try:
                    with transaction.atomic():
                        # Borrar factura (SQL directo para evitar cascadas inesperadas)
                        with connection.cursor() as cursor:
                            cursor.execute('DELETE FROM "FacturaUnica" WHERE "IdFacturaUnica" = %s', [fid])
                        eliminadas_ok.append(fid)
                except IntegrityError as e:
                    # Si aún hay alguna referencia que no pudimos eliminar
                    print(f"⚠️ Error de integridad al eliminar factura {fid}: {str(e)}")
                    saltadas_fk.append(fid)

            total_eliminadas = len(eliminadas_ok)
            if saltadas_fk:
                return Response({
                    'success': False,
                    'data': {
                        'eliminadas': eliminadas_ok[:50],
                        'pendientes_por_fk': saltadas_fk[:50],
                        'total_eliminadas': total_eliminadas,
                        'total_pendientes': len(saltadas_fk)
                    },
                    'message': f'Se eliminaron {total_eliminadas} facturas. {len(saltadas_fk)} facturas no se pudieron eliminar por referencias externas.'
                }, status=status.HTTP_409_CONFLICT)

            return Response({
                'success': True,
                'data': {
                    'total_facturas_eliminadas': total_eliminadas,
                    'criterio': criterio_respuesta,
                    'ids_facturas': ids_facturas
                },
                'message': f'Eliminación completada exitosamente para el {criterio_busqueda}. Se eliminaron {total_eliminadas} facturas. Motivo: {motivo}'
            }, status=status.HTTP_200_OK)

        except Exception as error:
            return Response({
                'success': False,
                'data': None,
                'message': f'Error al obtener preview: {str(error)}'
            }, status=status.HTTP_400_BAD_REQUEST)


