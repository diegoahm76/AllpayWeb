from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from datetime import datetime, timedelta
from recaudos.models.recaudos_models import Pagos, FacturaUnica, LiquidacionesFacturaUnica, Personas
from recaudos.serializers.pagos_serializer import ObtenerPagosSerializer, PagosSerializer
from recaudos.models.documento_models import DocumentosGenerados, PlantillasDoc
from recaudos.views.cartera_view import obtener_url_documento
from recaudos.views.documentos_views import GeneradorDocumentosView, ConvertWordToPdfView
from seguridad.utils import Util
from django.db import transaction
from recaudos.models.acuerdos_pago_models import DetalleAcuerdoPago
from django.utils import timezone
from django.db import models
import random
import string
import re
import unicodedata
import json
import traceback
from django.conf import settings
from django.shortcuts import get_object_or_404
from decimal import Decimal, ROUND_HALF_UP
from recaudos.serializers.pagos_zonapagos_serializers import InicioPagoInputSerializer, VerificarInputSerializer
from recaudos.integrations.zonapagos_client import inicio_pago, verificacion_pago
from recaudos.integrations.zonapagos_soap import inicio_pago_soap, verificacion_pago_soap, TIPO_ID
from recaudos.integrations.zonapagos_parser import parse_str_res_pago
from recaudos.integrations.zonapagos_utils import map_doc, ip_permitida, ESTADOS_FINALES, ESTADOS_PEND
from recaudos.utils import verificar_pago_recurrente, activarSonda, _asentar, _estado

ID_COMERCIO = settings.ZPAGOS["ID_COMERCIO"]
USR = settings.ZPAGOS["USUARIO"]
PWD = settings.ZPAGOS["CLAVE"]
T_RUTA = settings.ZPAGOS.get("T_RUTA", "")
COD_SERVICIO = settings.ZPAGOS.get("CODIGO_SERVICIO", "")

class PagosWebhookView(generics.GenericAPIView):
    queryset = Pagos.objects.all()
    serializer_class = PagosSerializer
    #permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def actualizar_estado_facturas(self, liquidacion):
        facturas = liquidacion.faturaunica_set.all()
        for factura in facturas:
            factura.estado_factura = 'PA'
            factura.save()

    def actualizar_plan_pago_pagado(self, liquidacion):
        facturas = liquidacion.faturaunica_set.all()
        for factura in facturas:
            detalle = factura.detalleacuerdopago_set.first()
            if detalle and detalle.id_cuota_acuerdo_pago:
                cuota = detalle.id_cuota_acuerdo_pago
                cuota.pagada = True
                cuota.fecha_pago = datetime.now()
                cuota.save()
                plan = cuota.id_plan_pago
                # Si todas las cuotas del plan están pagadas, marcar el plan y la solicitud como pagados
                if plan and not plan.cuotasacuerdopago_set.filter(pagada=False).exists():
                    plan.estado = "PA"
                    plan.save()
                    # Cambiar el estado de la solicitud asociada a "pagado" si existe
                    solicitud = plan.id_solicitud_acuerdo_pago
                    if solicitud:
                        solicitud.estado = 'PA'
                        solicitud.save()

    def post(self, request):
        data = request.data
        print(data)
        data_in = {}
        if data.get('type') =='verification':
            return Response({'details': 'Webhook de verificación recibido'}, status=status.HTTP_200_OK)
        
        pago = self.get_queryset().filter(id_liquidacion_pago__nro_doc_pago=data.get('transaction').get('order_id')).first()
        liquidacion = LiquidacionesFacturaUnica.objects.filter(nro_doc_pago=data.get('transaction').get('order_id')).first()

        match(data.get('type')):
            case 'charge.created':
                print(pago)
                print(liquidacion)
                data_in['cod_pago_realizado'] = data.get('transaction').get('id')
                data_in['cod_estado_pago'] = 'PE'
                data_in['id_liquidacion_pago'] = liquidacion.id_liq_factura_unica
                data_in['cod_medio_pago'] = 'bank_account'
                data_in['fecha_estado_pago'] = data.get('event_date')
                data_in['nombres_persona_paga'] = data.get('transaction').get('customer').get('name')
                data_in['apellidos_persona_paga'] = data.get('transaction').get('customer').get('last_name')
                data_in['email_persona_paga'] = data.get('transaction').get('customer').get('email')
                data_in['nro_celular_persona_paga'] = data.get('transaction').get('customer').get('phone')
                if not pago:
                    serializer = self.serializer_class(data=data_in)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    serializer = self.serializer_class(pago, data=data_in, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    return Response(serializer.data, status=status.HTTP_200_OK)


            case 'charge.cancelled':
                data_in['cod_estado_pago'] = 'CA'
                data_in['fecha_estado_pago'] = data.get('event_date')
            case 'charge.failed':
                data_in['cod_estado_pago'] = 'FA'
                data_in['fecha_estado_pago'] = data.get('event_date')
            case 'charge.succeeded':
                data_in['cod_estado_pago'] = 'AP'
                data_in['fecha_estado_pago'] = data.get('event_date')
                data_in['valor_pagado'] = data.get('transaction').get('amount')
                data_in['fecha_pago'] = data.get('event_date')
                if liquidacion:
                    liquidacion.cod_estado = 'P'
                    liquidacion.save()
                    self.actualizar_estado_facturas(liquidacion)
                    self.actualizar_plan_pago_pagado(liquidacion)

            case _:
                return Response({'details': 'Tipo de pago no válido o webhook ya verificado'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = self.serializer_class(pago, data=data_in, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

def obtener_url_documento(request, id_plantilla, variables, pdf):
# Simular el "request" como objeto que lleva los datos directamente
    class FakeRequest:
        def __init__(self, user, variables, id_documento=None):
            self.user = user
            self.data = {
                "id_plantilla_doc": id_plantilla,
                "variables": variables,
                "documento_generado": id_documento
            }

    # Debug: imprimir las variables que se envían al generador de documentos
    print(f"DEBUG obtener_url_documento - Variables que se envían al GeneradorDocumentosView:")
    for key, value in variables.items():
        print(f"{key}: {value} (tipo: {type(value)})")

    fake_request = FakeRequest(request.user, variables, None)

    generador_documento = GeneradorDocumentosView()
    convertidor_documento = ConvertWordToPdfView()
    data_documento = generador_documento.borrador(fake_request)

    if data_documento:
        id_documento_generado = data_documento.data.get("id_documento_generado")
        if not id_documento_generado:
            raise ValidationError("No se pudo generar el documento.")
        post_request = FakeRequest(request.user, variables, id_documento_generado)  
        if pdf:     
            respuesta = convertidor_documento.post(post_request)
            if respuesta.status_code != status.HTTP_201_CREATED:
                raise ValidationError("No se pudo obtener la URL del documento PDF generado.")    
        return id_documento_generado

    return "No se generó el documento"    

class PagosListView(generics.ListAPIView):
    serializer_class = ObtenerPagosSerializer
    permission_classes = [IsAuthenticated]

    def formatear_fecha_pago(self, fecha_str):
        """Convierte la fecha ISO a formato legible"""
        if not fecha_str:
            return ""
        
        try:
            fecha = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
            return fecha.strftime('%d/%m/%Y %H:%M:%S')
        except:
            return fecha_str

    def formatear_valor_monetario(self, valor):
        """Formatea valores monetarios como números enteros con símbolo de pesos"""
        if valor is None or valor == '' or valor == 0:
            return "$0"
        
        try:
            # Convertir directamente a float y luego a entero para eliminar decimales
            valor_numerico = float(valor)
            valor_entero = int(round(valor_numerico))
            
            # Formatear con separadores de miles y símbolo de peso (formato colombiano)
            return f"${valor_entero:,}".replace(',', '.')
        except (ValueError, TypeError) as e:
            print(f"Error formateando valor {valor}: {e}")
            return "$0"

    def generar_variables_documento_pago(self, datos_pago):
        """
        Mapea los datos del servicio de pagos a las variables del documento
        """
        # Construir nombre completo
        nombre_completo = ""
        if datos_pago.get('nombres_persona_paga'):
            nombre_completo = datos_pago['nombres_persona_paga']
        if datos_pago.get('apellidos_persona_paga') and datos_pago.get('apellidos_persona_paga') != 'None':
            nombre_completo += f" {datos_pago['apellidos_persona_paga']}"
        
        # Usar fecha_pago si existe, sino fecha_estado_pago
        fecha_pago = datos_pago.get('fecha_pago') or datos_pago.get('fecha_estado_pago')
        fecha_formateada = self.formatear_fecha_pago(fecha_pago)
        
        # Debug: imprimir valores antes del formateo
        print(f"DEBUG - Valores antes del formateo:")
        print(f"valor_pagado: {datos_pago.get('valor_pagado')} (tipo: {type(datos_pago.get('valor_pagado'))})")
        print(f"valor_cuota_fomento: {datos_pago.get('valor_cuota_fomento')} (tipo: {type(datos_pago.get('valor_cuota_fomento'))})")
        print(f"valor_intereses: {datos_pago.get('valor_intereses')} (tipo: {type(datos_pago.get('valor_intereses'))})")
        
        # Formatear valores monetarios
        valor_pago_formateado = self.formatear_valor_monetario(datos_pago.get('valor_pagado', ''))
        valor_cuota_formateado = self.formatear_valor_monetario(datos_pago.get('valor_cuota_fomento', ''))
        valor_intereses_formateado = self.formatear_valor_monetario(datos_pago.get('valor_intereses', ''))
        
        # Debug: imprimir valores después del formateo
        print(f"DEBUG - Valores después del formateo:")
        print(f"VALORPAGO: {valor_pago_formateado}")
        print(f"VALORCUOTA: {valor_cuota_formateado}")
        print(f"VALORINTERESES: {valor_intereses_formateado}")
        
        variables = {
            "FECHAPAGO": fecha_formateada,
            "NUMDOCUMENTO": datos_pago.get('numero_documento_pago', ''),
            "VALORPAGO": valor_pago_formateado,
            "VALORCUOTA": valor_cuota_formateado,
            "VALORINTERESES": valor_intereses_formateado,
            "ESTADOPAGO": datos_pago.get('cod_estado_pago', ''),
            "CODIGOAUTORIZACION": datos_pago.get('cod_pago_realizado', ''),
            "MEDIOPAGO": datos_pago.get('cod_medio_pago', ''),
            "NOMBRECOMPLETO": nombre_completo.strip(),
            "EMAIL": datos_pago.get('email_persona_paga', '')
        }
        
        # Debug: imprimir todas las variables que se van a enviar
        print(f"DEBUG - Variables finales que se envían al documento:")
        for key, value in variables.items():
            print(f"{key}: {value}")
        
        return variables

    def generar_documento_pago(self, request, datos_pago, id_plantilla_doc=93):
        """
        Genera el documento de pago automáticamente en formato PDF y guarda la referencia en el modelo
        """
        try:
            # Verificar que la plantilla existe
            plantilla = PlantillasDoc.objects.filter(id_plantilla_doc=id_plantilla_doc).first()
            if not plantilla:
                return None
            
            # Generar variables para el documento
            variables = self.generar_variables_documento_pago(datos_pago)
            
            # Generar el documento en PDF (siguiendo el patrón de paz y salvo)
            id_documento_generado = obtener_url_documento(
                request, 
                id_plantilla_doc, 
                variables, 
                pdf=True  # Cambiar a True para generar PDF
            )
            
            if not id_documento_generado:
                return None
                
            # Obtener información del documento generado
            documento = DocumentosGenerados.objects.filter(
                id_documento_generado=id_documento_generado
            ).first()
            
            if not documento:
                return None
            
            # Guardar la referencia del documento en el pago (siguiendo el patrón de paz y salvo)
            pago = Pagos.objects.filter(
                cod_pago_realizado=datos_pago.get('cod_pago_realizado')
            ).first()
            
            if pago:
                pago.doc_pago = documento
                pago.save()
            
            # Devolver archivo en PDF (siguiendo el patrón de paz y salvo)
            return {
                "id_documento_generado": documento.id_documento_generado,
                "documento_generado": documento.documento_generado.name,
                "archivo": Util.obtener_archivos(documento.documento_generado.name) if documento.documento_generado else None
            }
            
        except Exception as e:
            # Si hay error en la generación del documento, no fallar la consulta principal
            print(f"Error generando documento: {str(e)}")
            return None

    def get(self, request):
        id_liquidacion_pago = request.query_params.get('id_liquidacion_pago')
        cod_pago_realizado = request.query_params.get('cod_pago_realizado')
        id_plantilla_doc = request.query_params.get('id_plantilla_doc', 93)  # Por defecto 93
        generar_documento = request.query_params.get('generar_documento', 'true').lower() == 'true'
        
        queryset = Pagos.objects.all()
        if cod_pago_realizado:
            queryset = queryset.filter(cod_pago_realizado=cod_pago_realizado)
        if id_liquidacion_pago:
            queryset = queryset.filter(id_liquidacion_pago=id_liquidacion_pago)

        if queryset.count() > 0:
            queryset = queryset.last()  # Obtener el último pago si hay varios

        if not queryset:
            return Response({'detail': 'No se encontraron pagos.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(queryset)
        datos_pago = serializer.data
        
        # Preparar respuesta
        response_data = {
            "pago": datos_pago,
            "documento": None
        }
        
        # Generar documento si se solicita
        if generar_documento:
            try:
                id_plantilla_doc = int(id_plantilla_doc)
                documento_info = self.generar_documento_pago(request, datos_pago, id_plantilla_doc)
                response_data["documento"] = documento_info
            except ValueError:
                response_data["documento"] = {"error": "ID de plantilla inválido"}
            except Exception as e:
                response_data["documento"] = {"error": f"Error generando documento: {str(e)}"}
        
        return Response(response_data, status=status.HTTP_200_OK)

class DocumentoPagoView(APIView):
    """
    Vista para generar documentos de pago con plantilla específica
    """
    permission_classes = [IsAuthenticated]
    
    def formatear_fecha_pago(self, fecha_str):
        """Convierte la fecha ISO a formato legible"""
        if not fecha_str:
            return ""
        
        try:
            fecha = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
            return fecha.strftime('%d/%m/%Y %H:%M:%S')
        except:
            return fecha_str

    def formatear_valor_monetario(self, valor):
        """Formatea valores monetarios como números enteros con símbolo de pesos"""
        if valor is None or valor == '' or valor == 0:
            return "$0"
        
        try:
            # Convertir directamente a float y luego a entero para eliminar decimales
            valor_numerico = float(valor)
            valor_entero = int(round(valor_numerico))
            
            # Formatear con separadores de miles y símbolo de peso (formato colombiano)
            return f"${valor_entero:,}".replace(',', '.')
        except (ValueError, TypeError) as e:
            print(f"Error formateando valor {valor}: {e}")
            return "$0"

    def generar_variables_documento_pago(self, datos_pago):
        """
        Mapea los datos del servicio de pagos a las variables del documento
        """
        # Construir nombre completo
        nombre_completo = ""
        if datos_pago.get('nombres_persona_paga'):
            nombre_completo = datos_pago['nombres_persona_paga']
        if datos_pago.get('apellidos_persona_paga') and datos_pago.get('apellidos_persona_paga') != 'None':
            nombre_completo += f" {datos_pago['apellidos_persona_paga']}"
        
        # Usar fecha_pago si existe, sino fecha_estado_pago
        fecha_pago = datos_pago.get('fecha_pago') or datos_pago.get('fecha_estado_pago')
        fecha_formateada = self.formatear_fecha_pago(fecha_pago)
        
        # Debug: imprimir valores antes del formateo
        print(f"DEBUG - Valores antes del formateo:")
        print(f"valor_pagado: {datos_pago.get('valor_pagado')} (tipo: {type(datos_pago.get('valor_pagado'))})")
        print(f"valor_cuota_fomento: {datos_pago.get('valor_cuota_fomento')} (tipo: {type(datos_pago.get('valor_cuota_fomento'))})")
        print(f"valor_intereses: {datos_pago.get('valor_intereses')} (tipo: {type(datos_pago.get('valor_intereses'))})")
        
        # Formatear valores monetarios
        valor_pago_formateado = self.formatear_valor_monetario(datos_pago.get('valor_pagado', ''))
        valor_cuota_formateado = self.formatear_valor_monetario(datos_pago.get('valor_cuota_fomento', ''))
        valor_intereses_formateado = self.formatear_valor_monetario(datos_pago.get('valor_intereses', ''))
        
        # Debug: imprimir valores después del formateo
        print(f"DEBUG - Valores después del formateo:")
        print(f"VALORPAGO: {valor_pago_formateado}")
        print(f"VALORCUOTA: {valor_cuota_formateado}")
        print(f"VALORINTERESES: {valor_intereses_formateado}")
        
        variables = {
            "FECHAPAGO": fecha_formateada,
            "NUMDOCUMENTO": datos_pago.get('numero_documento_pago', ''),
            "VALORPAGO": valor_pago_formateado,
            "VALORCUOTA": valor_cuota_formateado,
            "VALORINTERESES": valor_intereses_formateado,
            "ESTADOPAGO": datos_pago.get('cod_estado_pago', ''),
            "CODIGOAUTORIZACION": datos_pago.get('cod_pago_realizado', ''),
            "MEDIOPAGO": datos_pago.get('cod_medio_pago', ''),
            "NOMBRECOMPLETO": nombre_completo.strip(),
            "EMAIL": datos_pago.get('email_persona_paga', '')
        }
        
        # Debug: imprimir todas las variables que se van a enviar
        print(f"DEBUG - Variables finales que se envían al documento:")
        for key, value in variables.items():
            print(f"{key}: {value}")
        
        return variables

    def post(self, request):
        """
        Genera un documento de pago utilizando los datos del servicio de pagos
        """
        try:
            # Obtener parámetros de la request
            id_plantilla_doc = request.data.get('id_plantilla_doc')
            cod_pago_realizado = request.data.get('cod_pago_realizado')
            id_liquidacion_pago = request.data.get('id_liquidacion_pago')
            
            # Validaciones
            if not id_plantilla_doc:
                raise ValidationError("El parámetro 'id_plantilla_doc' es obligatorio.")
            
            if not cod_pago_realizado and not id_liquidacion_pago:
                raise ValidationError("Debe proporcionar 'cod_pago_realizado' o 'id_liquidacion_pago'.")
            
            # Verificar que la plantilla existe
            plantilla = PlantillasDoc.objects.filter(id_plantilla_doc=id_plantilla_doc).first()
            if not plantilla:
                raise ValidationError(f"No se encontró la plantilla con ID {id_plantilla_doc}.")
            
            # Obtener datos del pago
            queryset = Pagos.objects.all()
            if cod_pago_realizado:
                queryset = queryset.filter(cod_pago_realizado=cod_pago_realizado)
            if id_liquidacion_pago:
                queryset = queryset.filter(id_liquidacion_pago=id_liquidacion_pago)

            if queryset.count() > 0:
                pago = queryset.last()  # Obtener el último pago si hay varios
            else:
                raise ValidationError("No se encontraron pagos con los parámetros proporcionados.")

            # Serializar datos del pago
            serializer = ObtenerPagosSerializer(pago)
            datos_pago = serializer.data
            
            # Generar variables para el documento
            variables = self.generar_variables_documento_pago(datos_pago)
            
            # Generar el documento en PDF (siguiendo el patrón de paz y salvo)
            id_documento_generado = obtener_url_documento(
                request, 
                id_plantilla_doc, 
                variables, 
                pdf=True  # Cambiar a True para generar PDF
            )
            
            if not id_documento_generado:
                raise ValidationError("No se pudo generar el documento.")
                
            # Obtener información del documento generado
            documento = DocumentosGenerados.objects.filter(
                id_documento_generado=id_documento_generado
            ).first()
            
            if not documento:
                raise ValidationError("No se encontró el documento generado.")
            
            # Guardar la referencia del documento en el pago (siguiendo el patrón de paz y salvo)
            if pago:
                pago.doc_pago = documento
                pago.save()
            
            data_response = {
                "id_documento_generado": documento.id_documento_generado,
                "documento_generado": documento.documento_generado.name,
                "archivo": Util.obtener_archivos(documento.documento_generado.name) if documento.documento_generado else None,
                "datos_pago": datos_pago
            }
            
            return Response({
                "success": True,
                "detail": "Documento de pago generado correctamente.",
                "data": data_response
            }, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error interno: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarcarFacturasPagadasPorRangoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            desde = request.data.get('nro_factura_desde')
            hasta = request.data.get('nro_factura_hasta')
            medio_pago = request.data.get('cod_medio_pago', 'bank_account')
            valor_pagado = request.data.get('valor_pagado')
            fecha_pago = request.data.get('fecha_pago')

            if desde is None or hasta is None:
                return Response({
                    'success': False,
                    'detail': 'Debe enviar nro_factura_desde y nro_factura_hasta.'
                }, status=status.HTTP_400_BAD_REQUEST)

            facturas = FacturaUnica.objects.filter(
                nro_factura_unica__gte=desde,
                nro_factura_unica__lte=hasta
            )
            if not facturas.exists():
                return Response({'success': False, 'detail': 'No se encontraron facturas en el rango.'}, status=status.HTTP_404_NOT_FOUND)

            # Verificar que las facturas estén liquidadas
            facturas_no_liquidadas = facturas.filter(id_liq_factura_unica__isnull=True)
            if facturas_no_liquidadas.exists():
                return Response({
                    'success': False,
                    'detail': f'Las siguientes facturas no están liquidadas: {list(facturas_no_liquidadas.values_list("nro_factura_unica", flat=True))}'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Obtener las liquidaciones únicas de las facturas
            liquidaciones_ids = facturas.values_list('id_liq_factura_unica', flat=True).distinct()
            liquidaciones = LiquidacionesFacturaUnica.objects.filter(id_liq_factura_unica__in=liquidaciones_ids)
            
            # Verificar que las liquidaciones estén en estado 'L' (Liquidado)
            liquidaciones_no_liquidadas = liquidaciones.exclude(cod_estado='L')
            if liquidaciones_no_liquidadas.exists():
                return Response({
                    'success': False,
                    'detail': f'Las siguientes liquidaciones no están en estado liquidado: {list(liquidaciones_no_liquidadas.values_list("id_liq_factura_unica", flat=True))}'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Procesar cada liquidación
            liquidaciones_procesadas = []
            facturas_actualizadas = []
            pagos_creados = []
            
            with transaction.atomic():
                for liquidacion in liquidaciones:
                    # Obtener facturas de esta liquidación
                    facturas_liquidacion = facturas.filter(id_liq_factura_unica=liquidacion)
                
                    # Usar SIEMPRE la fecha de compra de las facturas como fecha de pago
                    fecha_compra_facturas = facturas_liquidacion.aggregate(
                        fecha_compra=models.Min('fecha_compra')
                    )['fecha_compra']
                    
                    # Siempre usar fecha de compra, sin fallback
                    fecha_pago_liquidacion = fecha_compra_facturas

                    # Generar código de pago similar a los existentes
                    codigo_pago = 'tr' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))

                    # Obtener el próximo ID disponible manualmente
                    max_id = Pagos.objects.aggregate(max_id=models.Max('id_pago'))['max_id']
                    next_id = (max_id or 0) + 1
                    
                    # Crear SIEMPRE un nuevo pago para esta liquidación con ID manual
                    pago = Pagos.objects.create(
                        id_pago=next_id,
                        id_liquidacion_pago=liquidacion,
                        cod_pago_realizado=codigo_pago,
                        cod_estado_pago='AP',
                        fecha_estado_pago=timezone.now(),
                        cod_medio_pago=medio_pago,
                        valor_pagado=valor_pagado or liquidacion.valor_pagar,
                        fecha_pago=fecha_pago_liquidacion,
                        nombres_persona_paga='Carlos',
                        apellidos_persona_paga='Gómez',
                        email_persona_paga='cmariotg1907@gmail.com',
                        nro_celular_persona_paga='',
                    )

                    # Actualizar estado de liquidación a 'P' (Pagado) y fecha de pago
                    liquidacion.cod_estado = 'P'
                    liquidacion.fecha_pago = fecha_pago_liquidacion
                    liquidacion.save()
                    
                    # Marcar facturas de esta liquidación como pagadas
                    facturas_liquidacion.update(estado_factura='PA')
                    
                    liquidaciones_procesadas.append(liquidacion.id_liq_factura_unica)
                    facturas_actualizadas.extend(list(facturas_liquidacion.values_list('nro_factura_unica', flat=True)))
                    pagos_creados.append({
                        'id_pago': pago.id_pago,
                        'cod_pago_realizado': pago.cod_pago_realizado,
                        'id_liquidacion': liquidacion.id_liq_factura_unica,
                        'valor_pagado': float(pago.valor_pagado) if pago.valor_pagado else 0
                    })

            # Marcar cuotas asociadas como pagadas (si existen)
            try:
                detalles = DetalleAcuerdoPago.objects.filter(
                    id_factura_unica__in=facturas.values_list('id_factura_unica', flat=True),
                    id_cuota_acuerdo_pago__isnull=False
                ).select_related('id_cuota_acuerdo_pago', 'id_cuota_acuerdo_pago__id_plan_pago', 'id_cuota_acuerdo_pago__id_plan_pago__id_solicitud_acuerdo_pago')

                cuotas_actualizadas = set()
                for det in detalles:
                    cuota = det.id_cuota_acuerdo_pago
                    if cuota and cuota.id_cuota_acuerdo_pago not in cuotas_actualizadas:
                        cuota.pagada = True
                        cuota.fecha_pago = timezone.now()
                        cuota.save()
                        cuotas_actualizadas.add(cuota.id_cuota_acuerdo_pago)

                        plan = getattr(cuota, 'id_plan_pago', None)
                        if plan and not plan.cuotasacuerdopago_set.filter(pagada=False).exists():
                            plan.estado = 'PA'
                            plan.save()
                            solicitud = getattr(plan, 'id_solicitud_acuerdo_pago', None)
                            if solicitud:
                                solicitud.estado = 'PA'
                                solicitud.save()
            except Exception:
                # Si falla, no interrumpir el marcado principal
                pass

            return Response({
                'success': True,
                'detail': f'Facturas del {desde} al {hasta} marcadas como pagadas.',
                'liquidaciones_procesadas': liquidaciones_procesadas,
                'facturas_actualizadas': facturas_actualizadas,
                'pagos_creados': pagos_creados
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'success': False, 'detail': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class IniciarPagoRESTView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InicioPagoInputSerializer

    # --------------------------- HELPERS ----------------------------------
    @staticmethod
    def _fmt_amount_str(value):
        try:
            d = Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            return format(d, ".2f")
        except Exception:
            return "0.00"

    @staticmethod
    def _digits_only(value):
        return "".join(ch for ch in str(value or "") if ch.isdigit())

    @staticmethod
    def _sanitize_text(value):
        value = str(value or "")
        return re.sub(r"[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]", "", value).strip()

    @staticmethod
    def _normalize_no_accents(text):
        return "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )

    @staticmethod
    def _tipo_id_code(persona):
        """Retorna el código numérico del tipo de documento según especificación ZonaPagos."""
        DEFAULT = 1  # CC

        if not getattr(persona, "tipo_documento", None):
            return DEFAULT

        try:
            tipo_doc = str(persona.tipo_documento.cod_tipo_documento).upper().strip()
        except Exception:
            return DEFAULT

        tipo_doc = {"NT": "NIT"}.get(tipo_doc, tipo_doc)  # NT → NIT

        mapeo = {
            "CC": 1, "CE": 2, "NIT": 3, "NUIP": 4, "TI": 5, "PP": 6,
            "IDC": 7, "CEL": 8, "RC": 9, "DE": 10, "OTRO": 11
        }
        return mapeo.get(tipo_doc, DEFAULT)

    # ||  CREATE    ||
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        id_liq = data["id_liquidacion"]
        id_per = data.get("id_persona_pago")

        # 1️⃣ Liquidación
        liq = get_object_or_404(LiquidacionesFacturaUnica, pk=id_liq)

        if liq.cod_estado == 'P':
            raise ValidationError("La liquidacion ya se encuentra pagada")
        
        fecha_limite = datetime.now() - timedelta(hours=1)
        pago_pendiente = Pagos.objects.filter(
            cod_estado_pago__in=('PE', 'IN'),
            id_liquidacion_pago = liq.id_liq_factura_unica,
            fecha_estado_pago__gte=fecha_limite
        )

        if pago_pendiente.exists():
            raise ValidationError("La liquidacion ya se encuentra en un proceso pediente de pago")


        # 2️⃣ Persona o crear temporal
        if id_per:
            per = get_object_or_404(Personas, pk=id_per)
        else:
            per = self._crear_persona_temporal(data)

        # 3️⃣ Preparar datos saneados
        total_iva = self._fmt_amount_str(liq.valor_pagar)
        valor_intereses = self._fmt_amount_str(getattr(liq, "valor_intereses", 0))

        total_float = float(total_iva)
        valor_intereses_float = float(valor_intereses)

        telefono = self._digits_only(getattr(per, "telefono", ""))
        include_tel = telefono and len(telefono) >= 7

        try:
            id_tienda = int(str(ID_COMERCIO))
        except Exception:
            id_tienda = ID_COMERCIO

        id_cliente = (
            self._digits_only(getattr(per, "numero_documento", "")) 
            or self._digits_only(settings.ZPAGOS.get("NIT", "999999999"))
        )

        nombre = self._sanitize_text(
            getattr(per, "primer_nombre", "")
            or getattr(per, "razon_social", "")
            or "Cliente"
        )
        apellido = self._sanitize_text(getattr(per, "primer_apellido", ""))

        desc_raw = "Pago liquidacion"
        desc = self._normalize_no_accents(desc_raw)[:70]

        # 4️⃣ ID PAGO: extraer solo dígitos
        id_pago_raw = str(getattr(liq, "nro_doc_pago", liq.id_liq_factura_unica))
        id_pago_str = self._digits_only(id_pago_raw) or str(liq.id_liq_factura_unica)
        id_pago_num = int(id_pago_str)

        tipo_id_str = str(self._tipo_id_code(per))

        codigo_servicio = str(
            getattr(liq, "codigo_servicio", settings.ZPAGOS.get("CODIGO_SERVICIO", "2701"))
        )

        # ----------------------------------------------------------------------
        #  Construcción del PAYLOAD OFICIAL ZonaPagos
        # ----------------------------------------------------------------------
        body = {
            "InformacionPago": {
                "flt_total_con_iva": total_float,
                "flt_valor_iva": valor_intereses_float,
                "str_id_pago": id_pago_num,
                "str_descripcion_pago": desc,
                "str_id_cliente": id_cliente,
                "str_tipo_id": tipo_id_str
            },
            "InformacionSeguridad": {
                "int_id_comercio": id_tienda,
                "str_usuario": str(USR),
                "str_clave": str(PWD),
                "int_modalidad": -1,
            },
            "AdicionalesConfiguracion": [
                {"int_codigo": 50, "str_valor": codigo_servicio}
            ]
        }

        # ----------------------------------------------------------------------
        #  LLAMADO A ZONAPAGOS
        # ----------------------------------------------------------------------
        try:
            resp = inicio_pago_soap(
                id_tienda=str(ID_COMERCIO),
                clave=PWD,
                total_con_iva=total_float,
                valor_iva=valor_intereses_float,
                id_pago=str(id_pago_num),
                descripcion_pago=desc,
                email=getattr(per, "email", "no-reply@fedecacao.org"),
                id_cliente=id_cliente,
                tipo_id=tipo_id_str,
                nombre_cliente=nombre,
                apellido_cliente=apellido,
                telefono_cliente=telefono if include_tel else "",
                codigo_servicio_principal=codigo_servicio,
                total_codigos_servicio=0,
                lista_codigos_servicio_multicredito=["0"],
                lista_valores_iva=["0"],
                t_ruta=T_RUTA,
            )

            if not resp.get("success"):
                raise ValidationError({
                    "message": "ZonaPagos rechazó la solicitud",
                    "error": resp.get("error"),
                    "sent": body,
                })

        except Exception as e:
            raise ValidationError({
                "message": "Error al iniciar pago",
                "error": str(e),
                "sent": body,
            })

        # ----------------------------------------------------------------------
        #  GUARDAR REGISTRO DE PAGO
        # ----------------------------------------------------------------------
        redirect_url = resp["redirect_url"]
        identificador = resp["identificador"]

        with transaction.atomic():
            pago = Pagos.objects.create(
                id_liquidacion_pago=liq,
                cod_estado_pago="PE",
                fecha_estado_pago=timezone.now(),
                cod_medio_pago="bank_account",
                cod_pago_realizado=f"ZP-{identificador}",
                int_no_pago=identificador,
                str_id_pago_zp=str(id_pago_num)
            )

        return Response(
            {
                "success": True,
                "redirect_url": redirect_url,
                "identificador": identificador,
                "id_pago": pago.id_pago
            },
            status=status.HTTP_201_CREATED
        )

    def _crear_persona_temporal(self, data):
        class PersonaTemporal:
            def __init__(self, d):
                self.numero_documento = d.get("numero_documento", "")
                self.primer_nombre = d.get("primer_nombre", "")
                self.primer_apellido = d.get("primer_apellido", "")
                self.razon_social = d.get("razon_social", "")
                self.email = d.get("email", "")
                self.telefono = d.get("telefono", "")
                tipo_doc = d.get("tipo_documento", "CC")
                self.tipo_documento = type(
                    "obj", (object,), {"cod_tipo_documento": tipo_doc}
                )()

        return PersonaTemporal(data)


class PagoVerificadoView(APIView):
    """Vista para consultar el estado de un pago verificado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha_limite = datetime.now() - timedelta(hours=1)
        fecha_limite = datetime.now() - timedelta(hours=1)
        id_pago_zp = request.query_params.get('id_pago_zp', None)
        mensajes_pagos = []

        if id_pago_zp is not None:
            pago_pendiente = Pagos.objects.filter(str_id_pago_zp=str(id_pago_zp).strip()).order_by('-fecha_estado_pago').first()
            fecha_diferencia = timezone.now() - pago_pendiente.fecha_estado_pago if pago_pendiente else None
            if not pago_pendiente:
                return Response({
                    "success": False,
                    "detail": f"No se encontró un pago con ID ZP {id_pago_zp}."
                }, status=status.HTTP_404_NOT_FOUND)

            print(f"\n🔍 Verificando pago pendiente ZP ID: {id_pago_zp} | DB ID: {pago_pendiente.id_pago}")
            mensajes_pagos.append(f"\n🔍 Verificando pago pendiente ZP ID: {id_pago_zp} | DB ID: {pago_pendiente.id_pago} | fecha estado pago: {pago_pendiente.fecha_estado_pago}")
            mensajes_pagos.append(f"\n🔍 ZP ID: {id_pago_zp} | Fecha estado pago: {pago_pendiente.fecha_estado_pago} | Fecha diferencia: {fecha_diferencia}")


        pagos_pendientes = Pagos.objects.filter(
            cod_estado_pago__in=('PE', 'IN'),
            fecha_estado_pago__gte=fecha_limite, # Solo últimos 1 hora
            str_id_pago_zp__isnull=False 
        ).exclude(
            str_id_pago_zp=''
        )
        activar_sonda = activarSonda()

        total_pendientes = pagos_pendientes.count()
        pagos_zp = []
        p_reciente = None

        for i, pago_obj in enumerate(pagos_pendientes):
            id_pago_zp = pago_obj.str_id_pago_zp
            mensajes_pagos.append(f"\n[{i+1}/{total_pendientes}] Procesando pago DB ID: {pago_obj.id_pago} | ZP ID: {id_pago_zp}")

            try:
                # 2a. Llamada SOAP (misma lógica que en tu view)
                resp = verificacion_pago_soap(
                    int_id_comercio=str(ID_COMERCIO), # Asegúrate que estas CONSTANTES estén disponibles
                    str_usr_comercio=USR,
                    str_pwd_Comercio=PWD,
                    str_id_pago=str(id_pago_zp),
                    int_no_pago=-1
                )
                
                if not resp["success"]:
                    print(f"  ❌ Verificación falló: {resp.get('error') or 'Error desconocido'}")
                    continue # Pasa al siguiente pago
                
                pagos_zp = resp.get("res_pago", [])

                
                if pagos_zp:
                    # 2b. Llamada a la lógica de asentamiento (reutilizando tu método _asentar)
                    # La función _asentar debe ser capaz de recibir el ID de ZP y los datos de ZP.
                    mensajes_pagos.append(f"  ✅ Pagos encontrados en ZP: {len(pagos_zp)}. Procediendo a asentar...")
                    # _asentar(pago_obj.id_pago, pagos_zp)

                    if not pagos_zp:
                        print("  ⚠️  No hay pagos para asentar")
                        return
                        
                    p_reciente = pagos_zp[-1]
                    estado = str(p_reciente.get("int_estado_pago")).strip()
                    print(f"cod_estado_pago_anterior: {pago_obj.cod_estado_pago}")
                    obj = pago_obj  # Renombrar para claridad

                    medio_pago = str(p_reciente.get("int_id_forma_pago")) if p_reciente.get("int_id_forma_pago") != "" else None
                    
                    # 📝 Asentar los datos del pago más reciente (p_reciente)
                    obj.cod_estado_pago = _estado(estado)
                    obj.valor_pagado = _to_dec(p_reciente.get("dbl_valor_pagado"))
                    obj.fecha_estado_pago = timezone.now()
                    obj.cod_medio_pago = _medio(medio_pago) if medio_pago is not None else "bank_account"
                    obj.apellidos_persona_paga = p_reciente.get("str_apellido")
                    obj.nombres_persona_paga = p_reciente.get("str_nombre")
                    obj.email_persona_paga = p_reciente.get("str_email")
                    obj.nro_celular_persona_paga = p_reciente.get("str_telefono")
                    obj.bank_code = p_reciente.get("int_codigo_banco")
                    obj.int_no_pago = str(p_reciente.get("int_n_pago") or "").strip()
                    obj.int_estado_pago = estado
                    obj.int_id_forma_pago = str(p_reciente.get("int_id_forma_pago") or "").strip()
                    obj.ticket_id = p_reciente.get("str_ticketID") or obj.ticket_id 
                    obj.cus = p_reciente.get("str_codigo_transaccion") or obj.cus 
                    obj.franquicia = p_reciente.get("str_nombre_banco")
                    obj.num_recibo = p_reciente.get("str_codigo_transaccion")
                    
                    print(f"  📝 Actualizando:")
                    print(f"    cod_estado_pago: {obj.cod_estado_pago}")
                    print(f"    valor_pagado: {obj.valor_pagado}")
                    print(f"    int_estado_pago: {obj.int_estado_pago}")
                    print(f"    int_no_pago: {obj.int_no_pago}")
                    print(f"    ticket_id: {obj.ticket_id}")
                    print(f"    cus: {obj.cus}")
                    print(f"    cod_medio_pago: {obj.cod_medio_pago}")
                        
                    # if estado in ESTADOS_FINALES:
                    #     print(f"Estado FINAL detectado ({estado}), finalizando documentos...")
                    #     obj.fecha_pago = timezone.now()
                    #     _finalizar_documentos(obj)
                        
                    # obj.save()

                    print(f"  ✅ Pago actualizado en BD\n")


                else:
                    print("  ⚠️ No se encontraron pagos en ZP para este ID, saltando asentamiento.")

            except Exception as e:
                # Capturar errores por pago individual y continuar con el siguiente
                print(f"  ❌ ERROR FATAL al verificar pago ZP ID {id_pago_zp}: {e}")
                import traceback
                traceback.print_exc()
                continue

        data = {
            "activar_sonda": activar_sonda,
            "fecha_limite": fecha_limite,
            "timestamp_actual": datetime.now(),
            "pagos_pendientes": [
                {
                    "id_pago": pago.id_pago,
                    "str_id_pago_zp": pago.str_id_pago_zp,
                    "cod_estado_pago": pago.cod_estado_pago,
                    "fecha_estado_pago": pago.fecha_estado_pago,
                }
                for pago in pagos_pendientes
            ],
            "total_pendientes": total_pendientes,
            "mensajes_pagos": mensajes_pagos,
            "pagos_zp": pagos_zp,
            "pago_reciente": p_reciente

        }

        return Response({
            "success": True,
            "data": data
        }, status=status.HTTP_200_OK) 


class VerificarPagoRESTView(generics.CreateAPIView):
    """Vista para verificar el estado de un pago"""
    permission_classes = [IsAuthenticated]
    serializer_class = VerificarInputSerializer

    def create(self, request, *args, **kwargs):
        data = self.serializer_class(data=request.data)
        data.is_valid(raise_exception=True)
        id_pago = data.validated_data["id_pago"]

        try:
            # Usar SOAP para verificar el pago
            resp = verificacion_pago_soap(
                int_id_comercio=str(ID_COMERCIO),
                str_usr_comercio=USR,
                str_pwd_Comercio=PWD,
                str_id_pago=str(id_pago),
                int_no_pago=-1
            )
            
            if not resp["success"]:
                raise ValidationError(resp.get("error") or "Verificación sin pagos")

            # Los pagos ya vienen parseados en la respuesta SOAP
            pagos = resp.get("res_pago", [])
            cantidad = resp.get("cantidad_pagos", "0")
            
            print(f"\n🔍 Verificación SOAP:")
            print(f"  Cantidad de pagos: {cantidad}")
            print(f"  Pagos encontrados: {len(pagos)}")
            if pagos:
                print(f"  Estado primer pago: {pagos[0].get('int_estado_pago')}")
            print()

            self._asentar(id_pago, pagos)
            return Response({
                "success": True,
                "cantidad_pagos": cantidad,
                "data": pagos
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"❌ ERROR en VerificarPago: {e}")
            traceback.print_exc()
            raise ValidationError(f"Error al verificar pago: {str(e)}")

    def _asentar(self, id_pago, pagos):
        """Asienta los pagos verificados"""
        print(f"\n🔄 ASENTANDO PAGO:")
        print(f"  id_pago recibido: {id_pago}")
        print(f"  cantidad de pagos recibidos: {len(pagos) if pagos else 0}")
        
        if not pagos:
            print("  ⚠️  No hay pagos para asentar")
            return
            
        p0 = pagos[0]
        print(f"  datos del primer pago: {p0}")
        
        estado = str(p0.get("int_estado_pago")).strip()
        print(f"  estado extraído: '{estado}'")
        
        # BUSCAR EL PAGO CON PRIORIDADES (fix para matching correcto)
        obj = None
        
        # 1. Buscar por str_id_pago_zp (el que enviamos a ZonaPagos)
        print(f"  🔍 Buscando por str_id_pago_zp={id_pago}...")
        obj = Pagos.objects.filter(str_id_pago_zp=str(id_pago)).order_by('-id_pago').first()
        
        # 2. Fallback: buscar por int_no_pago si coincide con el identificador de ZP
        if not obj and p0.get('int_n_pago'):
            int_n_pago = str(p0.get('int_n_pago')).strip()
            print(f"  🔍 No encontrado. Intentando por int_no_pago={int_n_pago}...")
            obj = Pagos.objects.filter(int_no_pago=int_n_pago).order_by('-id_pago').first()
        
        # 3. Fallback final: buscar por id_pago autoincremental (legacy)
        if not obj:
            print(f"  🔍 No encontrado. Intentando por id_pago={id_pago}...")
            try:
                obj = Pagos.objects.filter(id_pago=int(id_pago)).select_for_update().first()
            except (ValueError, TypeError):
                pass
        
        if not obj:
            print(f"  ❌ No se encontró el pago con ningún criterio. Valores buscados:")
            print(f"     - str_id_pago_zp: {id_pago}")
            print(f"     - int_n_pago: {p0.get('int_n_pago')}")
            print(f"     - id_pago (PK): {id_pago}")
            return
        
        print(f"  ✅ Pago encontrado: {obj.id_pago} (estado actual: {obj.cod_estado_pago}, str_id_pago_zp: {obj.str_id_pago_zp})")
        
        obj.cod_estado_pago = estado
        obj.valor_pagado = _to_dec(p0.get("dbl_valor_pagado"))
        obj.fecha_estado_pago = timezone.now()
        obj.cod_medio_pago = _medio(str(p0.get("int_id_forma_pago")))
        
        # Persistir trazabilidad Zonapagos
        obj.int_no_pago = str(p0.get("int_n_pago") or "").strip()
        obj.int_estado_pago = estado
        obj.int_id_forma_pago = str(p0.get("int_id_forma_pago") or "").strip()
        
        # Campos adicionales PSE (CORREGIDOS: CUS y Ticket estaban intercambiados)
        obj.ticket_id = p0.get("str_ticketID") or obj.ticket_id  # ej: 8365100007
        obj.cus = p0.get("str_codigo_transaccion") or obj.cus    # ej: 5084156 (CUS correcto)
        
        print(f"  📝 Actualizando:")
        print(f"    cod_estado_pago: {obj.cod_estado_pago}")
        print(f"    valor_pagado: {obj.valor_pagado}")
        print(f"    int_estado_pago: {obj.int_estado_pago}")
        print(f"    int_no_pago: {obj.int_no_pago}")
        print(f"    ticket_id: {obj.ticket_id}")
        print(f"    cus: {obj.cus}")
        print(f"    cod_medio_pago: {obj.cod_medio_pago}")
            
        if estado in ESTADOS_FINALES:
            print(f"  ✅ Estado FINAL detectado ({estado}), finalizando documentos...")
            obj.fecha_pago = timezone.now()
            _finalizar_documentos(obj)  # actualiza liquidación, facturas, PDFs
        else:
            print(f"  ⏳ Estado NO FINAL ({estado}), no se finalizan documentos aún")
            
        obj.save()
        print(f"  ✅ Pago actualizado en BD\n")

def _medio(id_forma: str) -> str:
    """Mapea el ID de forma de pago a descripción"""
    try:
        i = int(id_forma)
    except Exception:
        return None
    return {29: "PSE", 32: "TC"}.get(i, str(i))

def _to_dec(x):
    """Convierte a Decimal de forma segura"""
    try:
        return Decimal(str(x)) if x is not None else None
    except Exception:
        return None

def _finalizar_documentos(pago: Pagos):
    """
    Finaliza los documentos cuando el pago es exitoso
    Aquí llamas tu lógica actual (la del webhook) para:
    - pasar liquidación L -> P,
    - facturas LQ -> PA,
    - generar PDF de recibo,
    - actualizar planes de pago, etc.
    Debe ser idempotente.
    """
    try:
        liq = pago.id_liquidacion_pago
        if not liq:
            print(f"  ⚠️  Pago {pago.id_pago} no tiene liquidación asociada")
            return
            
        print(f"  📄 Finalizando documentos para liquidación {liq.id_liq_factura_unica}...")
        
        # Actualizar estado de liquidación
        liq.cod_estado = 'P'  # Pagado
        liq.fecha_pago = pago.fecha_pago or timezone.now()
        liq.save()
        print(f"    ✅ Liquidación {liq.id_liq_factura_unica} actualizada a estado 'P'")
        
        # Actualizar estado de facturas (CORREGIDO: facturaunica_set, no faturaunica_set)
        facturas = None
        try:
            # Intenta con el related_name por defecto
            facturas = liq.facturaunica_set.all()
        except AttributeError:
            # Fallback: consulta directa
            print(f"    ⚠️  related_name no disponible, usando consulta directa")
            facturas = FacturaUnica.objects.filter(id_liq_factura_unica=liq)
        
        if facturas:
            count = 0
            for factura in facturas:
                factura.estado_factura = 'PA'  # Pagado
                factura.save()
                count += 1
            print(f"    ✅ {count} factura(s) actualizadas a estado 'PA'")
        else:
            print(f"    ⚠️  No se encontraron facturas asociadas a la liquidación")
        
        # TODO: Aquí puedes agregar la generación de PDF y otras lógicas
        # from services.reportes import generar_recibo_pdf
        # generar_recibo_pdf(liq, pago)
        
        print(f"  ✅ Finalización de documentos completada para pago {pago.id_pago}")
        
    except Exception as e:
        # Log del error pero no fallar (para no bloquear el asentamiento)
        print(f"  ❌ Error al finalizar documentos: {e}")
        traceback.print_exc()

    """
    Callback GET de ZonaPagos tras el retorno del pagador.
    Acepta únicamente 'id_pago' como parámetro.
    El id_comercio se toma de la configuración ZPAGOS_ID_COMERCIO.
    """
    permission_classes = []  # público, pero filtramos por IP
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        # ===== LOG INICIO DE CALLBACK =====
        print("\n" + "="*80)
        print("🔔 CALLBACK ZONAPAGOS RECIBIDO")
        print("="*80)
        print(f"⏰ Timestamp: {timezone.now()}")
        
        # Obtener IP (considerando proxy)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
            print(f"🌐 IP (X-Forwarded-For): {ip}")
            print(f"   Cadena completa: {x_forwarded_for}")
        else:
            ip = request.META.get("REMOTE_ADDR", "")
            print(f"🌐 IP (REMOTE_ADDR): {ip}")
        
        # Log de headers importantes
        print(f"\n📋 HEADERS:")
        print(f"   Host: {request.META.get('HTTP_HOST', 'N/A')}")
        print(f"   User-Agent: {request.META.get('HTTP_USER_AGENT', 'N/A')}")
        print(f"   Referer: {request.META.get('HTTP_REFERER', 'N/A')}")
        
        # Validar IP
        print(f"\n🔒 VALIDACIÓN DE IP:")
        ips_permitidas = settings.ZPAGOS.get("IPS_PERMITIDAS", [])
        print(f"   IPs configuradas: {ips_permitidas}")
        
        if not ip_permitida(ip):
            print(f"   ❌ IP NO PERMITIDA: {ip}")
            print("="*80 + "\n")
            return Response({"detail": "IP no permitida"}, status=403)
        
        print(f"   ✅ IP PERMITIDA: {ip}")

        # Obtener parámetros (solo id_pago, id_comercio viene de config)
        id_pago = request.query_params.get("id_pago")
        
        print(f"\n📦 PARÁMETROS RECIBIDOS:")
        print(f"   id_comercio (config): {ID_COMERCIO}")
        print(f"   id_pago: {id_pago}")
        print(f"   Query params completos: {dict(request.query_params)}")
        
        if not id_pago:
            print(f"   ❌ FALTA PARÁMETRO REQUERIDO: id_pago")
            print("="*80 + "\n")
            raise ValidationError("id_pago es requerido")

        try:
            # Usar SOAP para verificar el pago
            print(f"\n🔍 VERIFICANDO PAGO CON ZONAPAGOS...")
            print(f"   ID Comercio: {ID_COMERCIO}")
            print(f"   Usuario: {USR}")
            print(f"   ID Pago: {id_pago}")
            
            resp = verificacion_pago_soap(
                int_id_comercio=str(ID_COMERCIO),
                str_usr_comercio=USR,
                str_pwd_Comercio=PWD,
                str_id_pago=str(id_pago),
                int_no_pago=-1
            )
            
            print(f"\n📨 RESPUESTA DE ZONAPAGOS:")
            print(f"   Success: {resp.get('success')}")
            print(f"   Cantidad pagos: {resp.get('cantidad_pagos', '0')}")
            
            if not resp["success"]:
                print(f"   ❌ Error: {resp.get('error', 'Error desconocido')}")
                print("="*80 + "\n")
                return Response({"success": False, "detail": resp.get("error", "Error al verificar")}, status=400)
            
            # Los pagos ya vienen parseados en la respuesta SOAP
            pagos = resp.get("res_pago", [])
            print(f"   Pagos encontrados: {len(pagos)}")
            if pagos:
                print(f"   Estado primer pago: {pagos[0].get('int_estado_pago')}")
                print(f"   Valor pagado: {pagos[0].get('dbl_valor_pagado')}")
            
            # Asentar (idempotente)
            print(f"\n💾 ASENTANDO PAGO EN BASE DE DATOS...")
            VerificarPagoRESTView()._asentar(id_pago, pagos)
            
            print(f"\n✅ CALLBACK PROCESADO EXITOSAMENTE")
            print("="*80 + "\n")
            return Response({"success": True, "detail": "OK", "cantidad_pagos": resp.get("cantidad_pagos", "0")})
            
        except Exception as e:
            print(f"\n❌ ERROR EN CALLBACK ZONAPAGOS:")
            print(f"   Tipo: {e.__class__.__name__}")
            print(f"   Mensaje: {str(e)}")

            print(f"\n📜 TRACEBACK:")
            traceback.print_exc()
            print("="*80 + "\n")
            return Response({"success": False, "detail": str(e)}, status=500) 