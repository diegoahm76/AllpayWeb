from datetime import datetime, timedelta,date
import secrets
import boto3
import mimetypes
from django.conf import settings
import requests
from rest_framework.exceptions import ValidationError,NotFound,PermissionDenied
from django.core.mail import EmailMultiAlternatives
from django.core.mail import EmailMessage
# from email_validator import validate_email, EmailNotValidError, EmailUndeliverableError, EmailSyntaxError
from backend.settings import AUTHENTICATION_360_NRS, EMAIL_HOST_USER
#, AUTHENTICATION_360_NRS
from seguridad.models.alertas_models import AlertasProgramadas, BandejaAlertaPersona, ConfiguracionClaseAlerta, FechaClaseAlerta, PersonasAAlertar
from seguridad.models.seguridad_models import User, Modulos, Permisos, Auditorias
from seguridad.models.transversal_models import (
    HistoricoDireccion,
    HistoricoRepresentLegales,
    Municipio,
    Paises,
    Personas
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
import re
# from twilio.rest import Client
from django.template.loader import render_to_string
import os
from email.mime.application import MIMEApplication
from django.db import models  # Importa el módulo models
from django.utils.html import strip_tags

from seguridad.serializers.alertas_serializers import AlertasBandejaAlertaPersonaPostSerializer, AlertasGeneradasPostSerializer, AlertasProgramadasPostSerializer, AlertasProgramadasUpdateSerializer
from seguridad.servicio__sse import SSEService

class Util:

    @staticmethod
    def limpiar_caracteres_unicode(texto):
        """
        Limpia caracteres Unicode problemáticos que pueden causar errores en SMTP
        """
        if not texto:
            return texto
        
        # Reemplazar caracteres problemáticos comunes
        caracteres_problematicos = {
            '\xa0': ' ',  # Espacio no separador
            '\u00a0': ' ',  # Espacio no separador (otra codificación)
            '\u2000': ' ',  # En quad
            '\u2001': ' ',  # Em quad
            '\u2002': ' ',  # En space
            '\u2003': ' ',  # Em space
            '\u2004': ' ',  # Three-per-em space
            '\u2005': ' ',  # Four-per-em space
            '\u2006': ' ',  # Six-per-em space
            '\u2007': ' ',  # Figure space
            '\u2008': ' ',  # Punctuation space
            '\u2009': ' ',  # Thin space
            '\u200a': ' ',  # Hair space
            '\u200b': '',   # Zero width space
            '\u200c': '',   # Zero width non-joiner
            '\u200d': '',   # Zero width joiner
            '\u2028': ' ',  # Line separator
            '\u2029': ' ',  # Paragraph separator
            '\u202f': ' ',  # Narrow no-break space
            '\u205f': ' ',  # Medium mathematical space
            '\u3000': ' ',  # Ideographic space
        }
        
        texto_limpio = texto
        for char_problematico, reemplazo in caracteres_problematicos.items():
            texto_limpio = texto_limpio.replace(char_problematico, reemplazo)
        
        # Limpiar espacios múltiples
        texto_limpio = ' '.join(texto_limpio.split())
        
        return texto_limpio

    @staticmethod
    def send_email_files(data,path_files=None):
        # Limpiar el subject y template de caracteres problemáticos
        subject = Util.limpiar_caracteres_unicode(data['email_subject'])
        template = Util.limpiar_caracteres_unicode(data['template'])
        
        email = EmailMessage(
            subject=subject, 
            body=template, 
            to=[data['to_email']], 
            from_email=EMAIL_HOST_USER
        )
        
        email.content_subtype = 'html'
        # Configurar la codificación UTF-8 para el email
        email.encoding = 'utf-8'
        
        for path_file in path_files:
            email.attach_file(path_file['ruta_archivo'])
        response = email.send(fail_silently=True)
        return response


    @staticmethod
    def send_email_file(data,file=None):
        # Limpiar el subject y template de caracteres problemáticos
        subject = Util.limpiar_caracteres_unicode(data['email_subject'])
        template = Util.limpiar_caracteres_unicode(data['template'])
        
        email = EmailMultiAlternatives(
            subject=subject, 
            body=template, 
            to=[data['to_email']], 
            from_email=EMAIL_HOST_USER
        )

        email.content_subtype = 'html'
        # Configurar la codificación UTF-8 para el email
        email.encoding = 'utf-8'

        if file:
            file_name = file.name
            attachment = MIMEApplication(file.read(), Name=file_name)
            attachment['Content-Disposition'] = f'attachment; filename="{file_name}"'
            email.attach(attachment)
        response = email.send(fail_silently=True)
        return response

    @staticmethod
    def send_email(data):
        # Limpiar el subject y template de caracteres problemáticos
        subject = Util.limpiar_caracteres_unicode(data['email_subject'])
        template = Util.limpiar_caracteres_unicode(data['template'])
        
        email = EmailMultiAlternatives(
            subject=subject, 
            body=template, 
            to=[data['to_email']], 
            from_email=EMAIL_HOST_USER
        )

        email.content_subtype = 'html'
        # Configurar la codificación UTF-8 para el email
        email.encoding = 'utf-8'
        response = email.send(fail_silently=False)
        return response

        # url = "https://dashboard.360nrs.com/api/rest/mailing"

        # # payload = {
        # #     "to":[data['to_email']],
        # #     "fromName": "Info",
        # #     "fromEmail": "info@360nrs.com",
        # #     "body": data['template'],
        # #     "replyTo": "replyto@example.com",
        # #     "subject": data['email_subject']
        # # }
        # # payload = "{ \"to\": [\"test@example.com\"], \"fromName\": \"Info\", \"fromEmail\": \"info@360nrs.com\", \"body\": \"<html><head><title>TEST</title></head><body><a href=\\\"https://example.com\\\">link</a></body></html>\", \"replyTo\": \"replyto@example.com\", \"subject\": \"TEST\" }"
        # # print("PAYLOAD 1: ", payload)


        # payload = "{ \"to\": [\"%s\"], \"fromName\": \"Info\", \"fromEmail\": \"info@360nrs.com\", \"body\": \"%s\", \"replyTo\": \"replyto@example.com\", \"subject\": \"%s\" }" % (data['to_email'],data['template'],data['email_subject'])
        # print("PAYLOAD 2: ", payload)
        # headers = {
        # 'Content-Type': 'application/json',
        # 'Authorization': 'Basic ' + AUTHENTICATION_360_NRS
        # }

        # response = requests.request("POST", url, headers=headers, data=str(payload))


        # print(response.text)
        # return response

    @staticmethod
    def validate_dns(email):
        # try: 
        #     validation = validate_email(email, check_deliverability=True)
        #     validate = validation.email
        #     return True
        # except EmailUndeliverableError as e:
        #     return False
        return True

    @staticmethod
    def send_sms(phone, sms):
        url = "https://dashboard.360nrs.com/api/rest/sms"

        telefono = phone
        mensaje = sms
        
        # Asegurarse de que el número tiene el indicativo adecuado (por ejemplo, 57 para Colombia)
        if not telefono.startswith("57"):  
            telefono = "57" + telefono  
        
        telefono = telefono.replace("+", "")  
        print("SMS: ", mensaje)
        print(telefono)
        print(len(sms))

        # Ahora, en el payload, ya tenemos el número con el indicativo correcto
        payload = "{ \"to\": [\"" + telefono + "\"], \"from\": \"TEST\", \"message\": \"" + mensaje + "\" }"
        print("PAYLOAD", payload)

        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + AUTHENTICATION_360_NRS 
        }

        # Realiza la solicitud para enviar el SMS
        response = requests.request("POST", url, headers=headers, data=payload.encode("utf-8"))
        print(response.text)



    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @staticmethod
    def get_client_device(request):
        client_device = request.META.get('HTTP_USER_AGENT', '')

        MOBILE_AGENT_RE=re.compile(r".*(iphone|mobile|androidtouch)",re.IGNORECASE)

        if MOBILE_AGENT_RE.match(client_device):
            return 'mobile'
        else:
            return 'desktop'

    # @staticmethod
    # def get_short_url(request, url):
    #     try:
    #         create_short_url = Shortener.objects.create(
    #             long_url = url
    #         )
    #         new_url = request.build_absolute_uri('/short/') + create_short_url.short_url
    #         return new_url
    #     except:
    #         return url

    @staticmethod
    def change_token_expire_externo(user):
        token = RefreshToken.for_user(user)
        access_token = token.access_token
        access_token.set_exp(lifetime=timedelta(hours=2))
        return {
            "refresh": str(token),
            "access": str(access_token),
        }

    @staticmethod
    def save_auditoria(data):
        try:
            usuario = None
            if data.get('id_usuario'):
                usuario = User.objects.get(id_usuario = data.get('id_usuario'))

            modulo = Modulos.objects.get(id_modulo = data.get('id_modulo'))
            permiso = Permisos.objects.get(cod_permiso = data.get('cod_permiso'))
            data_descripcion = data.get('descripcion')
            data_actualizados = data.get('valores_actualizados')
            if data_actualizados:
                auditoria_user = Auditorias.objects.create(
                    id_usuario = usuario,
                    id_modulo = modulo,
                    id_cod_permiso_accion = permiso,
                    subsistema = data.get('subsistema'),
                    dirip = data.get('dirip'),
                    descripcion = data_descripcion,
                    valores_actualizados = data_actualizados
                )
                auditoria_user.save()
            else:
                auditoria_user = Auditorias.objects.create(
                    id_usuario = usuario,
                    id_modulo = modulo,
                    id_cod_permiso_accion = permiso,
                    subsistema = data.get('subsistema'),
                    dirip = data.get('dirip'),
                    descripcion = data_descripcion,
                    valores_actualizados = data_actualizados
                )
                auditoria_user.save()

            return True
        except Exception as err:
            raise ValidationError ("Error: " + repr(err))

    @staticmethod
    def guardar_persona(data):

        if data['tipo_persona'] == "N":
            #Validación de tipo documento
            tipo_documento = data.get('tipo_documento')
            if tipo_documento == 'NT':
                return {'success':False,'detail':'El tipo de documento debe ser el de una persona natural', 'status':status.HTTP_400_BAD_REQUEST}

            email_principal = data.get('email')
            email_secundario = data.get('email_empresarial')

            #Validación emails dns
            # validate_email = Util.validate_dns(email_principal)
            # if validate_email == False:
            #     return {'success':False,'detail':'Valide que el email principal ingresado exista', 'status':status.HTTP_400_BAD_REQUEST}

            # if email_secundario:
            #     validate_second_email = Util.validate_dns(email_secundario)
            #     if validate_second_email == False:
            #         return {'success':False,'detail':'Valide que el email secundario ingresado exista', 'status':status.HTTP_400_BAD_REQUEST}

            if email_principal == email_secundario:
                return {'success':False,'detail':'El email principal no puede ser el mismo email empresarial', 'status':status.HTTP_400_BAD_REQUEST}

            return ({'success':True})
        else:

            fecha_inicio = data.get("fecha_inicio_cargo_rep_legal")

            if fecha_inicio:
                fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                fecha_ahora = date.today()
                if fecha_formateada > fecha_ahora:
                    return {'success':False,'detail':'La fecha de inicio del cargo del representante no debe ser superior a la del sistema', 'status':status.HTTP_403_FORBIDDEN}

            if data.get("representante_legal"):
                representante_legal = Personas.objects.filter(id_persona = data.get("representante_legal")).first()
                if representante_legal.tipo_persona == "J":
                    return {'success':False,'detail':'El representante legal debe ser una persona natural', 'status':status.HTTP_403_FORBIDDEN}

            #Validación de tipo documento
            tipo_documento = data.get('tipo_documento')

            if tipo_documento and tipo_documento  != 'NT':
                return {'success':False,'detail':'El tipo de documento debe ser el de una persona juridica', 'status':status.HTTP_400_BAD_REQUEST}

            email_principal = data.get('email')
            email_secundario = data.get('email_empresarial')

            #Validación emails dns
            # validate_email = Util.validate_dns(email_principal)
            # if validate_email == False:
            #     return {'success':False,'detail':'Valide que el email principal ingresado exista', 'status':status.HTTP_400_BAD_REQUEST}

            # if email_secundario:
            #     validate_second_email = Util.validate_dns(email_secundario)
            #     if validate_second_email == False:
            #         return {'success':False,'detail':'Valide que el email secundario ingresado exista', 'status':status.HTTP_400_BAD_REQUEST}

            if email_principal == email_secundario:
                return {'success':False,'detail':'El email principal no puede ser el mismo email empresarial', 'status':status.HTTP_400_BAD_REQUEST}

            return ({'success':True})

    @staticmethod
    def notificacion(persona,subject_email,template_name,**kwargs):

        if persona.tipo_persona == "N":
            primer_nombre = [persona.primer_nombre, persona.primer_apellido]
            primer_nombre = ' '.join(item for item in primer_nombre if item is not None)
            # Limpiar caracteres problemáticos en los nombres
            primer_nombre = Util.limpiar_caracteres_unicode(primer_nombre)
            
            context = {
                'primer_nombre': primer_nombre,
                'fecha_actual': str(datetime.now().replace(microsecond=0)),
                'email': persona.email, 
                'tipo_persona': persona.get_tipo_persona_display()
            }
            for field, value in kwargs.items():
                # Limpiar todos los valores que se pasan al contexto
                if isinstance(value, str):
                    context[field] = Util.limpiar_caracteres_unicode(value)
                else:
                    context[field] = value
            template = render_to_string((template_name), context)
            subject = Util.limpiar_caracteres_unicode(subject_email + ' ' + primer_nombre)
            email_data = {'template': template, 'email_subject': subject, 'to_email': persona.email}
            Util.send_email(email_data)
        else:
            # Limpiar caracteres problemáticos en la razón social
            razon_social = Util.limpiar_caracteres_unicode(persona.razon_social)
            
            context = {
                'razon_social': razon_social,
                'fecha_actual': str(datetime.now().replace(microsecond=0)),
                'email': persona.email
            }
            for field, value in kwargs.items():
                # Limpiar todos los valores que se pasan al contexto
                if isinstance(value, str):
                    context[field] = Util.limpiar_caracteres_unicode(value)
                else:
                    context[field] = value
            template = render_to_string((template_name), context)
            subject = Util.limpiar_caracteres_unicode(subject_email + ' ' + razon_social)
            email_data = {'template': template, 'email_subject': subject, 'to_email': persona.email, 'tipo_persona': persona.get_tipo_persona_display()}
            Util.send_email(email_data)
        return True

    @staticmethod
    def comparacion_campos_actualizados(data,instance):
        for field, value in data.items():
            if field != "datos_clasificacion_persona" and field != "justificacion_cambio_und_org" and field != "tipologias" and  field != "justificacion_cambio" and field != "ruta_archivo_cambio":
                valor_previous= getattr(instance,field, None)
                # TOMAR DATE SI ES DATETIME
                valor_previous = str(valor_previous.date()) if isinstance(valor_previous, datetime) else valor_previous
                valor_previous = str(valor_previous) if isinstance(valor_previous, date) else valor_previous
                value = True if value == 'true' or value == 'True' else value
                # TOMAR PK SI ES INSTANCIA
                try:
                    valor_previous = valor_previous.pk
                except:
                    pass
                if isinstance(valor_previous, int):
                    value = int(value)
                if value != valor_previous:
                    return True
        return False
    
    @staticmethod
    def obtener_archivos(url):
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        mime_type, _ = mimetypes.guess_type(url)
        
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': url,
                'ResponseContentDisposition': 'inline',
                'ResponseContentType': mime_type or 'application/octet-stream'
            },
            ExpiresIn=3600
        )
        return presigned_url
    
    @staticmethod
    def crear_bandeja_alertas(persona):
        try:
            # Crear la bandeja de alertas
            bandeja_alertas = BandejaAlertaPersona.objects.create(
                id_persona=persona
            )
            return bandeja_alertas
        except Exception as e:
            raise ValidationError(f"Error al crear la bandeja de alertas: {str(e)}")
        
    @staticmethod
    def actualizar_alerta_programada(data,pk):
        
        data_in=data
        # Obtener la instancia existente para actualizar
        instance =AlertasProgramadas.objects.filter(id_alerta_programada=pk).first()

        # Verificar si la instancia existe
        if not instance:
            return False

        # Obtener los datos recibidos en la solicitud
    
        try:
            #Llenado de datos con base de datos
            configuracion = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=instance.cod_clase_alerta.cod_clase_alerta).first()
            
            if not configuracion:
                raise ValidationError("No existe configuracion de alerta asociada a este cod")

            data_alerta_programada = {}
           
            if configuracion.cant_dias_previas:
                data_alerta_programada['ctdad_dias_alertas_previas'] = configuracion.cant_dias_previas
            else:
                data_alerta_programada['ctdad_dias_alertas_previas'] = 0    

            if configuracion.frecuencia_previas:
                data_alerta_programada['frecuencia_alertas_previas'] = configuracion.frecuencia_previas
            else:
                data_alerta_programada['frecuencia_alertas_previas'] = 0

            if configuracion.cant_dias_post:
                data_alerta_programada['ctdad_repeticiones_post'] = configuracion.cant_dias_post
            else:
                data_alerta_programada['ctdad_repeticiones_post']=0
            
            if configuracion.frecuencia_post:
                data_alerta_programada['frecuencia_repeticiones_post'] = configuracion.frecuencia_post
            else:
                data_alerta_programada['frecuencia_repeticiones_post'] = 0
                

            personas_alertar = PersonasAAlertar.objects.filter(cod_clase_alerta=instance.cod_clase_alerta)

            cadena_personas = ''
            cadena_perfiles = ''
            for persona in personas_alertar:
                #print(persona.perfil_sistema)
                if persona.id_persona and persona.es_responsable_directo:
                    data_alerta_programada['id_persona_implicada'] = persona.id_persona.id_persona

                if persona.perfil_sistema and persona.es_responsable_directo:
                    data_alerta_programada['perfil_sistema_implicado'] = persona.perfil_sistema

                if not(persona.es_responsable_directo):
                    if persona.perfil_sistema:
                        cadena_perfiles += str(persona.perfil_sistema) + "|"

                    if persona.id_persona:
                        cadena_personas += str(persona.id_persona.id_persona) + "|"

            data_alerta_programada['id_perfiles_sistema_alertar'] = cadena_perfiles
            data_alerta_programada['id_personas_alertar'] = cadena_personas
            data_alerta_programada['cod_clase_alerta'] = configuracion.cod_clase_alerta
            data_alerta_programada['nombre_clase_alerta'] = configuracion.nombre_clase_alerta
            if configuracion.id_modulo_destino:
                data_alerta_programada['id_modulo_destino'] = configuracion.id_modulo_destino.id_modulo
            data_alerta_programada['id_modulo_generador'] = configuracion.id_modulo_generador.id_modulo if configuracion.id_modulo_generador else 5
            data_alerta_programada['cod_categoria_alerta'] = configuracion.cod_categoria_clase_alerta
            data_alerta_programada['tiene_implicado'] = configuracion.asignar_responsable
            data_alerta_programada['activa'] = configuracion.activa

            data_alerta_programada.update(data_in)
            serializer =AlertasProgramadasUpdateSerializer(instance, data=data_alerta_programada, partial=True)
            
            serializer.is_valid(raise_exception=True)
            
            serializer.save()
        except ValidationError as e:
            raise ValidationError(e.detail)

        # Respuesta exitosa con los datos actualizados
        return serializer.data

    @staticmethod
    def buscar_persona_perfil(cod_perfil):
        if cod_perfil == 'Reca':
            ids_perfiles_alertar = list(User.objects.filter(tipo_usuario='E').exclude(persona__proveedor=True).values_list('persona__id_persona', flat=True))
        return ids_perfiles_alertar

    @staticmethod
    def crear_alerta_evento_inmediato(data_in, programada):
        data_alerga_generada={}

        #programada = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta']).first()

        if not programada:
            raise NotFound("No existe la alerta") 
        
        if not programada.activa:
            raise PermissionDenied("La alerta no se encuentra activa")
         
        data_alerga_generada['nombre_clase_alerta']=programada.nombre_clase_alerta
   
  
        data_alerga_generada['mensaje'] = programada.mensaje_base_dia
        if 'informacion_complemento_mensaje' in data_in:
            data_alerga_generada['mensaje']=programada.mensaje_base_dia +'\n'+ data_in['informacion_complemento_mensaje']


        data_alerga_generada['cod_categoria_alerta']=programada.cod_categoria_clase_alerta
        data_alerga_generada['nivel_prioridad']=programada.nivel_prioridad
    
        data_alerga_generada['id_modulo_generador'] = programada.id_modulo_generador.id_modulo if programada.id_modulo_generador else 5

        data_alerga_generada['envio_email']=programada.envios_email
        data_alerga_generada['es_ultima_repeticion'] = True


        if 'id_elemento_implicado' in data_in:
            data_alerga_generada['id_elemento_implicado']=data_in['id_elemento_implicado']
        serializer =AlertasGeneradasPostSerializer(data=data_alerga_generada)
        serializer.is_valid(raise_exception=True)
        instance=serializer.save()

        #BUSCAMOS LAS PERSONAS A ALERTAR
        personas_a_alertar=PersonasAAlertar.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta'])
        personas = []
        for persona in personas_a_alertar:
            print("pase 1")
            if persona.id_persona:
                personas.append(persona.id_persona.id_persona)
            if persona.perfil_sistema:
                id_persona = Util.buscar_persona_perfil(persona.perfil_sistema)
                personas = personas + list(id_persona) #TODO:Revizar el funcionamiento de esta parte

        
        if 'id_persona' in data_in and data_in['id_persona'] not in personas:
            personas.append(data_in['id_persona'])
                   
        respuesta = []
        print("PERSONAS A ALERTAR: ",personas)
        print(len(personas))
        for person in personas:
            print("pase")
            bandejas_notificaciones=BandejaAlertaPersona.objects.filter(id_persona=person).first()
            print(bandejas_notificaciones)
            if bandejas_notificaciones:
                alerta_bandeja={}
                alerta_bandeja['leido']=False
                alerta_bandeja['archivado']=False
                email_persona=bandejas_notificaciones.id_persona
        
                if programada.envios_email:
                    if  email_persona and email_persona.email:
                        alerta_bandeja['email_usado'] = email_persona.email
                        subject = programada.nombre_clase_alerta
                        template = "alertas.html"
                        context = {'Nombre_alerta':programada.nombre_clase_alerta,'primer_nombre': email_persona.primer_nombre,"mensaje":data_alerga_generada['mensaje']}
                        template = render_to_string((template), context)
                        email_data = {'template': template, 'email_subject': subject, 'to_email':email_persona.email}
                        Util.send_email(email_data)
                        alerta_bandeja['fecha_envio_email']=datetime.now()

                    else:
                        alerta_bandeja['email_usado'] = None
                else:
                    alerta_bandeja['email_usado'] = None

                alerta_bandeja['id_alerta_generada']=instance.id_alerta_generada
                print("ID ALERTA GENERADA: ",instance.id_alerta_generada)
                alerta_bandeja['id_bandeja_alerta_persona']=bandejas_notificaciones.id_bandeja_alerta
                
                #print(alerta_bandeja)
                
                serializer_alerta_bandeja=AlertasBandejaAlertaPersonaPostSerializer(data=alerta_bandeja)
                bandejas_notificaciones.pendientes_leer=True
                bandejas_notificaciones.save()
                serializer_alerta_bandeja.is_valid(raise_exception=True)
                serializer_alerta_bandeja.save()
                print(serializer_alerta_bandeja.data)
                respuesta.append(serializer_alerta_bandeja.data)

        return True

    @staticmethod
    def crear_alerta_programada(data_in):
        configuracion = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta']).first()
        if not configuracion:
            raise ValidationError("No existe configuracion de alerta asociada a este cod")

        data_alerta_programada = {}
        
        if configuracion.cant_dias_previas:
            data_alerta_programada['ctdad_dias_alertas_previas'] = configuracion.cant_dias_previas
        else:
            data_alerta_programada['ctdad_dias_alertas_previas'] = 0    

        if configuracion.frecuencia_previas:
            data_alerta_programada['frecuencia_alertas_previas'] = configuracion.frecuencia_previas
        else:
            data_alerta_programada['frecuencia_alertas_previas'] = 0

        if configuracion.cant_dias_post:
            data_alerta_programada['ctdad_repeticiones_post'] = configuracion.cant_dias_post
        else:
            data_alerta_programada['ctdad_repeticiones_post']=0
        
        if configuracion.frecuencia_post:
            data_alerta_programada['frecuencia_repeticiones_post'] = configuracion.frecuencia_post
        else:
            data_alerta_programada['frecuencia_repeticiones_post'] = 0
            
        data_alerta_programada['nivel_prioridad'] = configuracion.nivel_prioridad
        if 'id_persona_implicada' in data_in:
            data_alerta_programada['id_persona_implicada'] = data_in['id_persona_implicada']

        personas_alertar = PersonasAAlertar.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta'])
        if not personas_alertar:
           raise NotFound('La alerta no tiene personal asignado.')

        cadena_personas = ""
        cadena_perfiles = ""
        for persona in personas_alertar:
            if persona.id_persona and persona.es_responsable_directo:
                data_alerta_programada['id_persona_implicada'] = persona.id_persona.id_persona

            if persona.perfil_sistema and persona.es_responsable_directo:
                data_alerta_programada['perfil_sistema_implicado'] = persona.perfil_sistema

            if not(persona.es_responsable_directo):
                if persona.perfil_sistema:
                    cadena_perfiles += str(persona.perfil_sistema) + "|"

                if persona.id_persona:
                    cadena_personas += str(persona.id_persona.id_persona) + "|"
        data_alerta_programada['requiere_envio_email'] = configuracion.envios_email
        data_alerta_programada['id_perfiles_sistema_alertar'] = cadena_perfiles
        data_alerta_programada['id_personas_alertar'] = cadena_personas
        data_alerta_programada['cod_clase_alerta'] = configuracion.cod_clase_alerta
        data_alerta_programada['nombre_clase_alerta'] = configuracion.nombre_clase_alerta


        if 'age_cumplimiento' not in data_in:
            data_in['age_cumplimiento']=None
        fecha=FechaClaseAlerta.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta'],dia_cumplimiento=data_in['dia_cumplimiento'], mes_cumplimiento=data_in['mes_cumplimiento'], age_cumplimiento=data_in['age_cumplimiento']).first()
        if not fecha:
           raise ValidationError("la fecha programada no existe.")

        data_alerta_programada['dia_cumplimiento'] = data_in['dia_cumplimiento']
        data_alerta_programada['mes_cumplimiento'] =data_in['mes_cumplimiento']

        if data_in['age_cumplimiento']:
            data_alerta_programada['agno_cumplimiento'] =data_in['age_cumplimiento']
        data_alerta_programada['mensaje_base_del_dia'] = configuracion.mensaje_base_dia
        data_alerta_programada['mensaje_base_previo'] = configuracion.mensaje_base_previo
        data_alerta_programada['mensaje_base_vencido'] = configuracion.mensaje_base_vencido
        
        if configuracion.id_modulo_destino:
            data_alerta_programada['id_modulo_destino'] = configuracion.id_modulo_destino.id_modulo
        else:
            data_alerta_programada['id_modulo_destino'] = None

        data_alerta_programada['id_modulo_generador'] = configuracion.id_modulo_generador.id_modulo if configuracion.id_modulo_generador else 5
        data_alerta_programada['cod_categoria_alerta'] = configuracion.cod_categoria_clase_alerta
        data_alerta_programada['tiene_implicado'] = configuracion.asignar_responsable
        data_alerta_programada['nombre_funcion_comple_mensaje']=configuracion.nombre_funcion_comple_mensaje
        data_alerta_programada['activa'] = configuracion.activa
        
        if 'tiene_implicado' in data_in and data_in['tiene_implicado']:
            data_alerta_programada['tiene_implicado']=data_in['tiene_implicado']
        
        if 'id_persona_implicada' in data_in and data_in['id_persona_implicada']:
            data_alerta_programada['id_persona_implicada']=data_in['id_persona_implicada']
        
        if 'complemento_mensaje' in data_in:
            data_alerta_programada['complemento_mensaje']=data_in['complemento_mensaje']
        if 'id_elemento_implicado' in data_in:
            data_alerta_programada['id_elemento_implicado']=data_in['id_elemento_implicado']
        serializer = AlertasProgramadasPostSerializer(data=data_alerta_programada)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return serializer



def convertir_valores_a_string(data):
    if isinstance(data, dict):
            return {k: convertir_valores_a_string(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple)):
            return [convertir_valores_a_string(i) for i in data]
    elif isinstance(data, models.Model):
        return data.pk  # Acceder al valor de la clave primaria
    elif isinstance(data, (date, datetime)):
        return data.strftime('%Y-%m-%d')
    else:
        return data


def historico_direcciones_validacion(request, model, create):
    # Historico de direcciónes
    if create:
        codigo_pais_exterior = None
        municipio = None
        if request.get('pais_nacimiento'):
            codigo_pais_exterior = Paises.objects.filter(cod_pais=request['pais_nacimiento']).first()
            if not codigo_pais_exterior:
                codigo_pais_exterior = None
        if request.get('cod_municipio_notificacion_nal'):
            municipio = Municipio.objects.filter(cod_municipio=request['cod_municipio_notificacion_nal']).first()
            if not municipio:
                municipio = None

        if request.get("direccion_notificaciones"):
            HistoricoDireccion.objects.create(
                id_persona = model,
                direccion = request["direccion_notificaciones"],
                tipo_direccion = 'Not',
                cod_municipio = municipio,
                cod_pais_exterior = codigo_pais_exterior
            )

        if request.get("direccion_residencia"):
            HistoricoDireccion.objects.create(
                id_persona = model,
                direccion = request["direccion_residencia"],
                tipo_direccion = 'Res',
                cod_municipio = municipio,
                cod_pais_exterior = codigo_pais_exterior
            )

        if request.get("direccion_laboral"):
            HistoricoDireccion.objects.create(
                id_persona = model,
                direccion = request["direccion_laboral"],
                tipo_direccion = 'Lab',
                cod_municipio = municipio,
                cod_pais_exterior = codigo_pais_exterior
            )

    else:
    # Valido si cambio la dirección de notificaciones
        codigo_pais_exterior = None
        municipio = None
        if request.get('pais_nacimiento'):
            codigo_pais_exterior = Paises.objects.filter(cod_pais=request['pais_nacimiento']).first()
            if not codigo_pais_exterior:
                codigo_pais_exterior = None
        if request.get('cod_municipio_notificacion_nal'):
            municipio = Municipio.objects.filter(cod_municipio=request['cod_municipio_notificacion_nal']).first()
            if not municipio:
                municipio = None

        if request.get("direccion_notificaciones"):
            if request["direccion_notificaciones"] !=  model.direccion_notificaciones:
                HistoricoDireccion.objects.create(
                    id_persona = model,
                    direccion = request["direccion_notificaciones"],
                    tipo_direccion = 'Not',
                    cod_municipio = municipio,
                    cod_pais_exterior = codigo_pais_exterior
                )

        if request.get("direccion_residencia"):
            if request["direccion_residencia"] !=  model.direccion_residencia:
                HistoricoDireccion.objects.create(
                    id_persona = model,
                    direccion = request["direccion_residencia"],
                    tipo_direccion = 'Res',
                    cod_municipio = municipio,
                    cod_pais_exterior = codigo_pais_exterior
                )

        if request.get("direccion_laboral"):
            if request["direccion_laboral"] !=  model.direccion_laboral:
                HistoricoDireccion.objects.create(
                    id_persona = model,
                    direccion = request["direccion_laboral"],
                    tipo_direccion = 'Lab',
                    cod_municipio = municipio,
                    cod_pais_exterior = codigo_pais_exterior
                )


def historico_representante_validacion(request, model):
    # Historico de representante legales
    if request.get('representante_legal'):
        representante = Personas.objects.filter(id_persona=request['representante_legal']).first()
        if representante:
                consec = 0
                consec = HistoricoRepresentLegales.objects.filter(id_persona_empresa=model.id_persona).count()
                if consec > 0 :
                    HistoricoRepresentLegales.objects.create(
                        id_persona_empresa = model,
                        id_persona_represent_legal = representante,
                        fecha_inicio_cargo = request['fecha_inicio_cargo_rep_legal'],
                        consec_representacion = consec + 1
                    )
                    return True
                else:
                    HistoricoRepresentLegales.objects.create(
                        id_persona_empresa = model,
                        id_persona_represent_legal = representante,
                        fecha_inicio_cargo = request['fecha_inicio_cargo_rep_legal'],
                        consec_representacion = 1
                    )
                    return True
        else:
            return False
        


def generar_alerta_segundo_plano():
    # Coloca aquí el código de la tarea que deseas ejecutar en segundo plano
    hoy = date.today()
    fecha_actual = datetime.now().date()
    numero_agno = hoy.year
    alertas_generadas=AlertasProgramadas.objects.all()
    print(alertas_generadas)
    #Alerta en Fecha Fija - Programadas con o sin Repeticiones anteriores o posteriores  (con y sin año).
    
    for programada in alertas_generadas:
        if programada.agno_cumplimiento:
            agno_alerta=programada.agno_cumplimiento
            agno_fijo=True
        else:
            agno_alerta=numero_agno
            agno_fijo=False

        if  programada.activa :
            dias_pre=programada.ctdad_dias_alertas_previas

            frecuencia_pre=programada.frecuencia_alertas_previas
            
            cantidad_repeticiones_post=programada.ctdad_repeticiones_post
            
            frecuencia_dias_post=programada.frecuencia_repeticiones_post

            dias_posteriores=cantidad_repeticiones_post*frecuencia_dias_post
            fecha_alerta_base = date(agno_alerta, programada.mes_cumplimiento,programada.dia_cumplimiento)
            fecha_lim_inferior = fecha_alerta_base - timedelta(days=dias_pre)
            fecha_lim_superior = fecha_alerta_base + timedelta(days=dias_posteriores)
            print("LIMINTE INFERIOR: "+str(fecha_lim_inferior))
            print("LIMINTE SUPERIOR: "+str(fecha_lim_superior))
            print("FECHA BASE: "+str(fecha_alerta_base))
            print("FRECUENCIA INFERIOR: "+str(frecuencia_pre))
            print("FRECUENCIA SUPERIORES: "+str(frecuencia_dias_post))
            
            if fecha_actual >= fecha_lim_inferior and fecha_actual <= fecha_lim_superior:
                print("BIEN ESTA DENTRO DEL RANGO")
                #ALERTAS PRE
                fecha_frecuencia=fecha_lim_inferior
                if frecuencia_pre !=0 and frecuencia_pre > 0:
                    while (fecha_frecuencia < fecha_alerta_base):
                        print("GENERA ALERTAS PRE:"+str(fecha_frecuencia))
                        if fecha_frecuencia==fecha_actual:
                            programar_alerta(programada,"ANTES",False,agno_fijo)
                            print("LA ALERTA SE GENERO ANTES DE LA FECHA: "+ str(fecha_frecuencia))

                        fecha_frecuencia= fecha_frecuencia + timedelta(days=frecuencia_pre)
            
                if fecha_alerta_base==fecha_actual:
                    programar_alerta(programada,"AHORA",False,agno_fijo)
                    print("ES HOY LA ALERTA BASE")

                if frecuencia_dias_post!=0 and cantidad_repeticiones_post!=0:
                    fecha_frecuencia=fecha_alerta_base +timedelta(days=frecuencia_dias_post)
                    for _ in range(cantidad_repeticiones_post):
                        if fecha_frecuencia==fecha_actual:
                            ultima_rep=False
                            if fecha_lim_superior==fecha_frecuencia:
                                ultima_rep=True
                            print("LA ALERTA SE GENERO DESPUES DE LA FECHA: "+ str(fecha_frecuencia))
                            programar_alerta(programada,"DESPUES",ultima_rep,agno_fijo)
                        fecha_frecuencia +=  timedelta(days=frecuencia_dias_post)

def separar_cadena(cadena):
    arreglo = []

    for elemento in cadena.split('|'):
        try:
            if elemento!='':
                arreglo.append(elemento)
        except ValueError:
            pass
    return(arreglo)
                    
                
def programar_alerta(programada,clasificacion,ultima_rep,agno_fijo):
    nombre_funcion = programada.nombre_funcion_comple_mensaje
    funcion = globals().get(nombre_funcion)

    print('FUNCION ES :')
    print(funcion)
    print('###########################################')
    cadena=""
    print(clasificacion)
    print(programada)
    id_responsable=None
    if funcion:
        if programada.cod_clase_alerta.cod_clase_alerta == 'Alm_DVActv' or  programada.cod_clase_alerta.cod_clase_alerta == 'Gest_TRPqr' or programada.cod_clase_alerta.cod_clase_alerta == 'Alm_MtoAct' or  programada.cod_clase_alerta.cod_clase_alerta == 'Ges_EliDoc' or programada.cod_clase_alerta.cod_clase_alerta == 'Alm_VeDocV' or  programada.cod_clase_alerta.cod_clase_alerta =='Alm_MtoCom' or programada.cod_clase_alerta.cod_clase_alerta == 'Alm_MtoVeh':
            cadena=funcion(programada.id_elemento_implicado)
        else:
            cadena=funcion()
    else:
        print("La función no fue encontrada.")

    data_alerga_generada={}
    data_alerga_generada['nombre_clase_alerta']=programada.nombre_clase_alerta

    data_alerga_generada['mensaje']=""
    if clasificacion=="ANTES":
        data_alerga_generada['mensaje']+=programada.mensaje_base_previo#VALIDAR CAMPO <1000
    elif clasificacion=="AHORA":
        data_alerga_generada['mensaje']+=programada.mensaje_base_del_dia#VALIDAR CAMPO <1000
    elif clasificacion=="DESPUES":
        data_alerga_generada['mensaje']+=programada.mensaje_base_vencido#VALIDAR CAMPO <1000

    if programada.complemento_mensaje:
        data_alerga_generada['mensaje']+=" "+programada.complemento_mensaje
    
    data_alerga_generada['mensaje']+=" "+str(cadena)
    data_alerga_generada['cod_categoria_alerta']=programada.cod_categoria_alerta
    data_alerga_generada['nivel_prioridad']=programada.nivel_prioridad

    if programada.id_modulo_destino:
        data_alerga_generada['id_modulo_destino']=programada.id_modulo_destino.id_modulo

    data_alerga_generada['id_modulo_generador']=programada.id_modulo_generador.id_modulo
    data_alerga_generada['id_elemento_implicado']=programada.id_elemento_implicado
    data_alerga_generada['id_alerta_programada_origen']=programada.id_alerta_programada
    data_alerga_generada['envio_email']=programada.requiere_envio_email
    #PENDIENTE LEER ENTREGA 38

    data_alerga_generada['es_ultima_repeticion']=ultima_rep
    serializer_alerta_generada=AlertasGeneradasPostSerializer(data=data_alerga_generada)

    try:
        serializer_alerta_generada.is_valid(raise_exception=True)
        instance_alerta_generada=serializer_alerta_generada.save()
    except ValidationError  as e:
        print(len(data_alerga_generada['mensaje']))
        raise ValidationError  (e.detail)

    #En el caso de tener personal implicado ,este puede ser una persona,un perfil profesional o un lider de unidad organizacional implicado
    if programada.tiene_implicado and programada.id_persona_implicada:
        id_responsable=programada.id_persona_implicada.id_persona

    #Se optienen las personas a alertar
    str_personas_alertar=programada.id_personas_alertar
    str_perfiles_alertar=programada.id_perfiles_sistema_alertar
    #para los perfiles del sistema se requiere buscar las ids de las personas responsables actualmente en ese cargo 

    personas_alertar=separar_cadena(str_personas_alertar)
    perfiles_alertar=separar_cadena(str_perfiles_alertar)
    ids_perfiles_alertar=[]
    for perfil in perfiles_alertar:
        if perfil == 'Reca':
            ids_perfiles_alertar = User.objects.filter(tipo_usuario='E').exclude(persona__proveedor=True).values_list('persona__id_persona', flat=True)
    
    destinatarios=[]

    destinatarios.extend(ids_perfiles_alertar)
    destinatarios.extend(personas_alertar)
    if id_responsable:
        destinatarios.append(str(id_responsable))
  
    elementos_unicos = {}
    # ELEMENTOS REPETIDOS
    for elemento in destinatarios:
        clave = str(elemento)
        elementos_unicos[clave] = elemento

    # Obtener los elementos únicos del diccionario como una lista
    arreglo_sin_repetidos = list(elementos_unicos.values())
    #Pendiente validacion con T043idPersonasSuspendEnAlerSinAgno 

    arreglo_resultante=[]
    if not agno_fijo:
        lista_suspendidos=[]
        if (programada.id_personas_suspen_alertar_sin_agno):
            lista_suspendidos=(programada.id_personas_suspen_alertar_sin_agno.rstrip("|")).split('|')
            arreglo_resultante = [x for x in arreglo_sin_repetidos if x not in lista_suspendidos]
        else:
            arreglo_resultante=arreglo_sin_repetidos
    else:
        arreglo_resultante=arreglo_sin_repetidos
    for destino in arreglo_resultante:
        print("Entre al for")
        if not destino:
            raise ValidationError("NULOO")
        bandejas_notificaciones=BandejaAlertaPersona.objects.filter(id_persona=destino).first()
        print("Si entreee")
        if bandejas_notificaciones:
            print("Si entre bandeja")
            print(bandejas_notificaciones)
            alerta_bandeja={}
            alerta_bandeja['leido']=False
            alerta_bandeja['archivado']=False
            email_persona=bandejas_notificaciones.id_persona

            if programada.requiere_envio_email:
                print("Si requiero email")
                if email_persona and email_persona.email:
                    print("Entre a enviar el correo")
                    alerta_bandeja['email_usado'] = email_persona.email
                    subject = programada.nombre_clase_alerta
                    
                    template = "alertas.html"

                    context = {'Nombre_alerta':programada.nombre_clase_alerta,'primer_nombre': email_persona.primer_nombre,"mensaje":data_alerga_generada['mensaje']}
                    template = render_to_string((template), context)
                    email_data = {'template': template, 'email_subject': subject, 'to_email':email_persona.email}
                    email = Util.send_email(email_data)
                    print("EMAIL ENVIADO: ", email)
                    #print(email_data)
                    alerta_bandeja['fecha_envio_email']=datetime.now()

                else:
                    alerta_bandeja['email_usado'] = None
            else:
                alerta_bandeja['email_usado'] = None
            if id_responsable and  destino == str(id_responsable):
                    alerta_bandeja['responsable_directo']=True
            else:
                alerta_bandeja['responsable_directo']=False
            alerta_bandeja['id_alerta_generada']=instance_alerta_generada.id_alerta_generada
            alerta_bandeja['id_bandeja_alerta_persona']=bandejas_notificaciones.id_bandeja_alerta
            
            serializer_alerta_bandeja=AlertasBandejaAlertaPersonaPostSerializer(data=alerta_bandeja)
            bandejas_notificaciones.pendientes_leer=True
            bandejas_notificaciones.save()
            serializer_alerta_bandeja.is_valid(raise_exception=True)
            serializer_alerta_bandeja.save()

            sse_service = SSEService()
            print("SSE SERVICE")
            sse_service.send_alert_to_user(
                user_id=destino,
                alert_message=instance_alerta_generada.mensaje,
            )
            print("SSE SERVICE SEND ALERT")
        else:
            print("###DESTINATARIO")
            print(destino)

    #SI ES DE AÑO  FIJO Y ES LA ULTIMA RETETICION SE ELIMINA
    if ultima_rep:
        if agno_fijo:
            print("AÑO FIJO")
            programada.delete()
        else:
            print("SIN AÑO DEFINIDO")
            programada.id_personas_suspen_alertar_sin_agno=None
            programada.save()
        
    
        