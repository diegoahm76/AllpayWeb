import base64
from io import BytesIO
import secrets
import subprocess
import tempfile
import uuid
import boto3
from django.core import signing
from urllib.parse import quote_plus, unquote_plus
from backend.settings import FRONTEND_URL
from django.urls import reverse
from django.shortcuts import redirect
import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
# from gestion_documental.models.expedientes_models import ArchivosDigitales
# from gestion_documental.views.archivos_digitales_views import ArchivosDgitalesCreate
# from seguridad.permissions.permissions_seguridad import PermisoCrearAdministracionUsuarios, PermisoActualizarAdministracionUsuarios, PermisoActualizarAdministracionDatosCuentaPropiaUsuarioInterno, PermisoActualizarAdministracionDatosCuentaPropiaUsuarioExterno
# from seguridad.permissions.permissions_seguridad import PermisoDelegarRolSuperUsuario, PermisoConsultarDelegacionSuperUsuario
from rest_framework.response import Response
from recaudos.models.documento_models import AsignacionDocs, DocumentosGenerados
from recaudos.serializers.documentos_serializers import DocumentosGeneradosSerializer
from recaudos.views.documentos_views import GeneradorDocumentosView
from seguridad.models.seguridad_models import *
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics, views
from django.db.models import Q
from django.contrib.sites.shortcuts import get_current_site
from seguridad.serializers.transversal_serializers import PersonasFilterSerializer, PersonasSerializer, RepresentanteLegalGetSerializer, SegundoFAPersonaSerializer, SegundoFactorAutenticacionSerielizer, TOTPGenerateSerializer, TOTPValidateSerializer, TOTPValidateActivateSerializer, SegundoFAPersonaTOTPSerializer
from seguridad.utils import Util
from django.contrib.auth.hashers import make_password
from rest_framework import status
import jwt, os, pyotp
from django.conf import settings
from seguridad.serializers.user_serializers import ChangePasswordSerializer, ChangeSuperUserSerializer, EmailVerificationSerializer, RecuperarUsuarioSerializer, ResetPasswordEmailRequestSerializer, SetNewPasswordSerializer, SuperUserSerializer, UserPutAdminSerializer,  UserPutSerializer, UserSerializer, UserSerializerWithToken, UserRolesSerializer, RegisterSerializer  ,LoginSerializer, DesbloquearUserSerializer, SetNewPasswordUnblockUserSerializer, HistoricoActivacionSerializers, UsuarioBasicoSerializer, UsuarioFullSerializer, UsuarioInternoAExternoSerializers
from rest_framework.generics import RetrieveUpdateAPIView
from django.contrib.auth.hashers import make_password
from rest_framework import status
from seguridad.serializers.user_serializers import EmailVerificationSerializer ,UserSerializer, UserSerializerWithToken, UserRolesSerializer, RegisterSerializer, RegisterExternoSerializer, LoginErroneoPostSerializers,LoginErroneoSerializers,LoginSerializers,LoginPostSerializers
from seguridad.serializers.roles_serializers import UsuarioRolesSerializers
from django.template.loader import render_to_string
from datetime import datetime, timedelta
from django.contrib import auth
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import encoding, http
import copy, re, pytz
from django.http import HttpResponsePermanentRedirect
from django.contrib.sessions.models import Session
from rest_framework.exceptions import NotFound,ValidationError, PermissionDenied
# from permissions.permissions_seguridad import PermisoConsultarAdministracionUsuarios, PermisoCrearAdministracionUsuarios, PermisoActualizarAdministracionUsuarios, PermisoEliminarAdministracionUsuarios 
from seguridad.models.transversal_models import Personas, SegundoFAPersona, SegundoFactorAutenticacion, Verificacion_2FA
from django.db import transaction
from django.utils import timezone
from seguridad.models.alertas_models import ConfiguracionClaseAlerta
import qrcode
from io import BytesIO
import base64
from rest_framework.views import APIView




class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        serializer = UserSerializerWithToken(self.user).data
        for k, v in serializer.items():
            data[k] = v

        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UpdateUserProfile(generics.UpdateAPIView):
    serializer_class = UserPutSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        data = request.data
        data._mutable=True
        esta_retirando_foto = data.get('esta_retirando_foto')
        esta_retirando_foto = True if esta_retirando_foto == 'true' else False
        
        instance = self.get_object()
        file = request.FILES.get('profile_img', None)
        
        if file:
            archivo_digital_class = ArchivosDgitalesCreate()
            file_size = archivo_digital_class.obtener_tamano_archivo(file)
            
            nombre = file.name
            nombre_sin_extension, extension = os.path.splitext(nombre)
            extension_sin_punto = extension[1:] if extension.startswith('.') else extension
            
            if extension_sin_punto.lower() not in ['jpg', 'jpeg', 'png']:
                raise ValidationError('La extensión del archivo no es válida')
            
            if file_size > 50:
                raise ValidationError('El tamaño del archivo excede el límite permitido de 50kb')
            
            # CASO 1
            if not esta_retirando_foto and not request.user.id_archivo_foto:
                # CREAR ARCHIVO EN T238
                ruta = os.path.join("home", "BIA", "Otros", "FotosPerfil")

                current_date = datetime.now().date()
                formatted_date = current_date.strftime('%d%m%Y')
                nombre_archivo = f"Pf-{request.user.id_usuario:008d}-{formatted_date}"
                file.name = nombre_archivo+'.'+extension_sin_punto

                # Crea el archivo digital y obtiene su ID
                data_archivo = {
                    'es_Doc_elec_archivo': False,
                    'ruta': ruta,
                    'md5_hash': nombre_archivo,
                    'nombre_cifrado': False
                }
                
                respuesta = archivo_digital_class.crear_archivo(data_archivo, file)
                data['id_archivo_foto'] = respuesta.data.get('data').get('id_archivo_digital')
            # CASO 2
            elif not esta_retirando_foto and request.user.id_archivo_foto:
                # ELIMINAR ARCHIVO EN FILESYSTEM
                request.user.id_archivo_foto.ruta_archivo.delete()
                
                current_date = datetime.now()
                formatted_date = current_date.date().strftime('%d%m%Y')
                nombre_archivo = f"Pf-{request.user.id_usuario:008d}-{formatted_date}"
                
                # ACTUALIZAR ARCHIVO EN T238
                ruta = os.path.join("home", "BIA", "Otros", "FotosPerfil")
                nombre_nuevo = nombre_archivo+'.'+extension_sin_punto
                ruta_completa = os.path.join(settings.MEDIA_ROOT, ruta, nombre_nuevo)
            
                if not os.path.exists(os.path.join(settings.MEDIA_ROOT, ruta)):
                    os.makedirs(os.path.join(settings.MEDIA_ROOT, ruta))
                    
                # Guarda el archivo
                with open(ruta_completa, 'wb') as destination:
                    for chunk in file.chunks():
                        destination.write(chunk)
                
                request.user.id_archivo_foto.ruta_archivo = os.path.relpath(ruta_completa, settings.MEDIA_ROOT)
                request.user.id_archivo_foto.nombre_de_Guardado = nombre_archivo
                request.user.id_archivo_foto.formato = extension_sin_punto
                request.user.id_archivo_foto.tamagno_kb = file_size
                request.user.id_archivo_foto.fecha_creacion_doc = current_date
                request.user.id_archivo_foto.save()
        else:
            # CASO 3
            if esta_retirando_foto:
                request.user.id_archivo_foto.ruta_archivo.delete()
                request.user.id_archivo_foto.delete()
                data['id_archivo_foto'] = None
            
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'password' not in request.data:
            serializer.validated_data.pop('password', None)
            previous_user = copy.copy(instance)

            # AUDITORIA AL ACTUALIZAR USUARIO PROPIO
            dirip = Util.get_client_ip(request)
            descripcion = {'NombreUsuario': instance.nombre_de_usuario}
            valores_actualizados = {'current': instance, 'previous': previous_user}

            auditoria_data = {
                'id_usuario': request.user.id_usuario,
                'id_modulo': 2,
                'cod_permiso': 'AC',

                'subsistema': 'SEGU',
                'dirip': dirip,
                'descripcion': descripcion,
                'valores_actualizados': valores_actualizados
            }

            Util.save_auditoria(auditoria_data)

        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UpdateUser(generics.RetrieveUpdateAPIView):
    serializer_class = UserPutAdminSerializer
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        data = request.data
        user_loggedin = request.user.id_usuario
        esta_retirando_foto = data.get('esta_retirando_foto')
        esta_retirando_foto = True if esta_retirando_foto == 'true' else False
        
        file = request.FILES.get('profile_img', None)

        if int(pk) == 1:
            raise ValidationError('No se puede actualizar el super usuario')

        if int(user_loggedin) != int(pk):
            user = User.objects.filter(id_usuario=pk).first()
            id_usuario_operador = request.user.id_usuario
            fecha_operacion = datetime.now()
            justificacion_activacion = data.get('justificacion_activacion', '')
            justificacion_bloqueo = data.get('justificacion_bloqueo', '')
            previous_user = copy.copy(user)

            if user:
                id_usuario_afectado = user.id_usuario
                
                user_serializer = self.serializer_class(user, data=data)
                user_serializer.is_valid(raise_exception=True)
                
                # if file:
                #     archivo_digital_class = ArchivosDgitalesCreate()
                #     file_size = archivo_digital_class.obtener_tamano_archivo(file)
                    
                #     nombre = file.name
                #     nombre_sin_extension, extension = os.path.splitext(nombre)
                #     extension_sin_punto = extension[1:] if extension.startswith('.') else extension
                    
                #     if extension_sin_punto.lower() not in ['jpg', 'jpeg', 'png']:
                #         raise ValidationError('La extensión del archivo no es válida')
                    
                #     if file_size > 50:
                #         raise ValidationError('El tamaño del archivo excede el límite permitido de 50kb')
                
                tipo_usuario_ant = user.tipo_usuario
                tipo_usuario_act = user_serializer.validated_data.get('tipo_usuario')
                sucursal_entidad_ant = user.sucursal_defecto
                sucursal_entidad_act = user_serializer.validated_data.get('sucursal_defecto')
                if sucursal_entidad_ant is not None:
                    sucursal_entidad_ant = sucursal_entidad_ant.id_sucursal_empresa
                
                # VALIDACIÓN NO SE PUEDE INTERNO A EXTERNO
                if tipo_usuario_ant == 'I' and tipo_usuario_act == 'E':
                    raise ValidationError('No se puede actualizar el usuario de interno a externo')

                # VALIDACIÓN EXTERNO INACTIVO PASA A INTERNO ACTIVO
                if tipo_usuario_ant == 'E' and tipo_usuario_act == 'I':
                    
                    persona = Personas.objects.get(user=user)
                    print("PERSONA = ",persona.id_persona)
                    print("PERSONA = ",persona.id_cargo)

                    if persona.fecha_a_finalizar_cargo_actual is None:
                        raise PermissionDenied('La persona propietaria del usuario no tiene fecha de finalizacion del cargo actual')


                    if persona.id_cargo is None or persona.fecha_a_finalizar_cargo_actual <= datetime.now().date():
                        raise PermissionDenied('La persona propietaria del usuario no tiene cargo actual o la fecha final del cargo ha vencido')
                    
                    if persona.tipo_persona == 'J':
                        raise PermissionDenied('Una persona jurídica no puede tener un usuario de tipo interno')
                    
                # Validación NO desactivar externo activo
                if user.tipo_usuario == 'E' and user.is_active and 'is_active' in data and str(data['is_active']).lower() == "false":
                    raise PermissionDenied('No se puede desactivar un usuario externo activo')

                # Validación SE PUEDE desactivar interno
                if user.tipo_usuario == 'I' and str(user.is_active).lower() != str(data['is_active']).lower():
                    # user.is_active = False
                    if not user.is_active:
                        if user.persona.id_cargo is None or user.persona.fecha_a_finalizar_cargo_actual <= datetime.now().date():
                            raise PermissionDenied('La persona propietaria del usuario no tiene cargo actual o la fecha final del cargo ha vencido, por lo cual no puede activar su usuario')
                        
                    if 'justificacion_activacion' not in data or not data['justificacion_activacion']:
                        raise ValidationError('Se requiere una justificación para cambiar el estado de activación del usuario')
                    justificacion = data['justificacion_activacion']
                
                # Validación bloqueo/desbloqueo usuario
                if str(user.is_blocked).lower() != str(data['is_blocked']).lower():
                    # user.is_active = False  
                    if 'justificacion_bloqueo' not in data or not data['justificacion_bloqueo']:
                        raise ValidationError('Se requiere una justificación para cambiar el estado de bloqueo del usuario')
                    justificacion = data['justificacion_bloqueo']

                # Validacion de sucursal
                if tipo_usuario_act == 'E' and sucursal_entidad_act is not None:
                    raise PermissionDenied('Una usuario externo no puede tener una sucursal de entidad asignada')
                
                # ASIGNAR SUCURSAL ENTIDAD
                if tipo_usuario_act == 'I':
                    
                    if sucursal_entidad_act is None:
                        raise ValidationError('La sucursal de entidad debe ser asignada')

                # ASIGNAR ROLES
                roles_actuales = UsuariosRol.objects.filter(id_usuario=pk)
                
                lista_roles_bd = [rol.id_rol.id_rol for rol in roles_actuales]
                lista_roles_json = data.getlist("roles")
                
                lista_roles_json = [int(a) for a in lista_roles_json]
                
                if 1 in lista_roles_json:
                    lista_roles_json.remove(1)
                
                if tipo_usuario_ant == 'E' and tipo_usuario_act == 'E':
                    lista_roles_json = [2]
            
                valores_creados_detalles=[]
                valores_eliminados_detalles = []

                dirip = Util.get_client_ip(request)
                descripcion = {'NombreUsuario': user.nombre_de_usuario}

                if set(lista_roles_bd) != set(lista_roles_json):
                    roles = Roles.objects.filter(id_rol__in=lista_roles_json)
                    if len(set(lista_roles_json)) != len(roles):
                        raise ValidationError('Debe validar que todos los roles elegidos existan')
                    
                    for rol in roles:
                        if rol.id_rol not in lista_roles_bd:
                            UsuariosRol.objects.create(
                                id_usuario=user, 
                                id_rol=rol
                            )

                            descripcion={'nombre':rol.nombre_rol}
                            valores_creados_detalles.append(descripcion)
                
                    # ELIMINAR ROLES
                    for rol in lista_roles_bd:
                        if rol not in lista_roles_json:
                            
                            if rol == 2:
                                raise PermissionDenied('El rol de ciudadano no puede ser eliminado')
                            else:
                                roles_actuales_borrar = roles_actuales.filter(id_usuario=user.id_usuario, id_rol=rol).first()
                                diccionario = {'nombre': roles_actuales_borrar.id_rol.nombre_rol}
                                valores_eliminados_detalles.append(diccionario)
                                roles_actuales_borrar.delete()
                    
                    valores_actualizados = {'current': user, 'previous': previous_user}
                    #AUDITORIA DEL SERVICIO DE ACTUALIZADO PARA DETALLES
                    auditoria_data = {
                        "id_usuario" : user_loggedin,
                        "id_modulo" : 2,
                        "cod_permiso": "AC",
                        "subsistema": 'SEGU',
                        "dirip": dirip,
                        "descripcion": descripcion,
                        "valores_actualizados_maestro": valores_actualizados, 
                        "valores_eliminados_detalles":valores_eliminados_detalles,
                        "valores_creados_detalles":valores_creados_detalles
                    }
                    Util.save_auditoria_maestro_detalle(auditoria_data)
                
                user_actualizado = user_serializer.save()

                data_alerta = {}
                data_alerta['cod_clase_alerta'] = 'Com_AdmUsu'
                data_alerta['informacion_complemento_mensaje'] = f"Usuario {user_actualizado.nombre_de_usuario} actualizado por el administrador {request.user.nombre_de_usuario}."
                configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
                if configuracion_alerta and configuracion_alerta.activa:
                    Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)
                
                if file:
                    # CASO 1
                    if not esta_retirando_foto and not user.id_archivo_foto:
                        # CREAR ARCHIVO EN T238
                        ruta = os.path.join("home", "BIA", "Otros", "FotosPerfil")

                        current_date = datetime.now().date()
                        formatted_date = current_date.strftime('%d%m%Y')
                        nombre_archivo = f"Pf-{user.id_usuario:008d}-{formatted_date}"
                        file.name = nombre_archivo+'.'+extension_sin_punto

                        # Crea el archivo digital y obtiene su ID
                        data_archivo = {
                            'es_Doc_elec_archivo': False,
                            'ruta': ruta,
                            'md5_hash': nombre_archivo,
                            'nombre_cifrado': False
                        }
                        
                        respuesta = archivo_digital_class.crear_archivo(data_archivo, file)
                        archivo_digital = ArchivosDigitales.objects.filter(id_archivo_digital=respuesta.data.get('data').get('id_archivo_digital')).first()
                        user.id_archivo_foto = archivo_digital
                        user.save()
                    # CASO 2
                    elif not esta_retirando_foto and user.id_archivo_foto:
                        # ELIMINAR ARCHIVO EN FILESYSTEM
                        user.id_archivo_foto.ruta_archivo.delete()
                        
                        current_date = datetime.now()
                        formatted_date = current_date.date().strftime('%d%m%Y')
                        nombre_archivo = f"Pf-{user.id_usuario:008d}-{formatted_date}"
                        
                        # ACTUALIZAR ARCHIVO EN T238
                        ruta = os.path.join("home", "BIA", "Otros", "FotosPerfil")
                        nombre_nuevo = nombre_archivo+'.'+extension_sin_punto
                        ruta_completa = os.path.join(settings.MEDIA_ROOT, ruta, nombre_nuevo)
                    
                        if not os.path.exists(os.path.join(settings.MEDIA_ROOT, ruta)):
                            os.makedirs(os.path.join(settings.MEDIA_ROOT, ruta))
                            
                        # Guarda el archivo
                        with open(ruta_completa, 'wb') as destination:
                            for chunk in file.chunks():
                                destination.write(chunk)
                        
                        user.id_archivo_foto.ruta_archivo = os.path.relpath(ruta_completa, settings.MEDIA_ROOT)
                        user.id_archivo_foto.nombre_de_Guardado = nombre_archivo
                        user.id_archivo_foto.formato = extension_sin_punto
                        user.id_archivo_foto.tamagno_kb = file_size
                        user.id_archivo_foto.fecha_creacion_doc = current_date
                        user.id_archivo_foto.save()
                else:
                    # CASO 3
                    if esta_retirando_foto:
                        user.id_archivo_foto.ruta_archivo.delete()
                        user.id_archivo_foto.delete()
                        user.id_archivo_foto = None
                        user.save()

                # HISTORICO 
                usuario_afectado = User.objects.get(id_usuario=id_usuario_afectado)
                usuario_operador = User.objects.get(id_usuario=id_usuario_operador)
                cod_operaciones = OperacionesSobreUsuario.objects.all()

                if previous_user.tipo_usuario == 'E' and user_actualizado.tipo_usuario == 'I' and not previous_user.is_active:
                    cod_operacion = cod_operaciones.filter(cod_operacion='A').first()
                    justificacion = "Activación automática por cambio de usuario externo a usuario interno"
                    
                    subject = "Verificación exitosa"
                    template = "verificacion-cuenta.html"
                    absurl = FRONTEND_URL+"#/auth/login"
                    Util.notificacion(user_actualizado.persona,subject,template,absurl=absurl)
                    
                    HistoricoActivacion.objects.create(
                        id_usuario_afectado = usuario_afectado,
                        cod_operacion = cod_operacion,
                        fecha_operacion = fecha_operacion,
                        justificacion = justificacion,
                        usuario_operador = usuario_operador,
                    )
                    
                elif user_actualizado.is_active != previous_user.is_active:
                    cod_operacion = cod_operaciones.filter(cod_operacion='A').first() if user_actualizado.is_active else cod_operaciones.filter(cod_operacion='I').first()
                    
                    if user_actualizado.is_active:
                        subject = "Verificación exitosa"
                        template = "verificacion-cuenta.html"
                        absurl = FRONTEND_URL+"#/auth/login"
                        Util.notificacion(user_actualizado.persona,subject,template,absurl=absurl)
                    
                    HistoricoActivacion.objects.create(
                        id_usuario_afectado = usuario_afectado,
                        cod_operacion = cod_operacion,
                        fecha_operacion = fecha_operacion,
                        justificacion = justificacion_activacion,
                        usuario_operador = usuario_operador,
                    )
                    
                if user_actualizado.is_blocked != previous_user.is_blocked:
                    cod_operacion = cod_operaciones.filter(cod_operacion='B').first() if user_actualizado.is_blocked else cod_operaciones.filter(cod_operacion='D').first()
                    
                    HistoricoActivacion.objects.create(
                        id_usuario_afectado = usuario_afectado,
                        cod_operacion = cod_operacion,
                        fecha_operacion = fecha_operacion,
                        justificacion = justificacion_bloqueo,
                        usuario_operador = usuario_operador,
                    )
                
                logins_user_actualizado = Login.objects.filter(id_usuario=user_actualizado.id_usuario, cod_tipo_usuario='I')
                if user_actualizado.tipo_usuario == 'I' and not logins_user_actualizado.exists():
                    subject = "Verificación exitosa"
                    template = "cambio-contraseña-usuario-interno.html"
                    uidb64 =signing.dumps({'user':str(user_actualizado.id_usuario)})
                    print(uidb64)
                    token = PasswordResetTokenGenerator().make_token(user_actualizado)
                    current_site=get_current_site(request=request).domain
                    relativeLink=reverse('password-reset-confirm',kwargs={'uidb64':uidb64,'token':token})
                    redirect_url= data.get('redirect_url','')
                    redirect_url=quote_plus(redirect_url)
                    absurl='http://'+ current_site + relativeLink 

                    data_email = None
                    sms = None
                    nro_telefono = None
                    
                    if user_actualizado.persona.email and not nro_telefono:
                        Util.notificacion(user_actualizado.persona,subject,template,absurl=absurl + '?redirect-url='+ redirect_url)
                
                data_alerta = {}
                data_alerta['cod_clase_alerta'] = 'Com_AdmUsu'
                data_alerta['informacion_complemento_mensaje'] = f"Actualización del usuario {user_actualizado.nombre_de_usuario}."
                configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
                if configuracion_alerta and configuracion_alerta.activa:
                    Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

                return Response({'success':True, 'detail':'Actualización exitosa','data': user_serializer.data}, status=status.HTTP_200_OK)
            else:
                raise ValidationError('No se encontró el usuario')
        else:
            raise ValidationError('No puede actualizar sus propios datos por este módulo')
        
class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data, context={'request': request})

        if not serializer.is_valid():
            return Response({
                "success": False,
                "detail": "Error en la validación de los datos.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        new_password_plaintext = serializer.validated_data['new_password']

        # Guardar auditoría antes del cambio
        previous_user = copy.copy(user)
        ip_address = Util.get_client_ip(request)

        modulo = Modulos.objects.get(id_modulo=2)  # Ajusta según tu BD
        permiso = Permisos.objects.get(cod_permiso="AC")  # Ajusta según tu BD

        descripcion = {
            "Mensaje": "Cambio de contraseña realizado.",
            "Usuario": user.nombre_de_usuario,
            "Fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "IP": ip_address
        }

        valores_actualizados = {
            "current": {"password": "******** (hash anterior)"},
            "previous": {"password": "******** (cambiado)"}
        }

        # Registrar auditoría en la BD
        Auditorias.objects.create(
            id_usuario=user,
            id_modulo=modulo,
            subsistema="SEGU",
            id_cod_permiso_accion=permiso,
            dirip=ip_address,
            descripcion=json.dumps(descripcion),
            valores_actualizados=json.dumps(valores_actualizados)
        )

        # Actualizar la contraseña
        user.set_password(new_password_plaintext)
        user.save()

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_AdmUsu'
        data_alerta['informacion_complemento_mensaje'] = f"Contraseña actualizada para el usuario {user.nombre_de_usuario}."
        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        return Response({
            "success": True,
            "detail": "Contraseña actualizada correctamente.",
            "data": {
                "id_usuario": user.id_usuario,
                "nombre_usuario": user.nombre_de_usuario,
                "nueva_contraseña": new_password_plaintext
            }
        }, status=status.HTTP_200_OK)



@api_view(['GET'])
def roles(request):
    roles = UsuariosRol.objects.all()
    serializers = UserRolesSerializer(roles, many=True)
    return Response(serializers.data, status=status.HTTP_200_OK)

class GetUserRoles(generics.ListAPIView):
    queryset = UsuariosRol.objects.all()
    serializer_class = UserRolesSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUserProfile(request):
    user = request.user
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUsers(request):
    nombre_de_usuario = request.query_params.get('nombre_de_usuario', None)
    
    users = User.objects.all()
    
    if nombre_de_usuario:
        users = users.filter(nombre_de_usuario__icontains=nombre_de_usuario)

    serializer = UserSerializer(users, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def getUserById(request, pk):
    try:
        user = User.objects.get(id_usuario=pk)
        pass
    except:
        raise NotFound('No existe ningún usuario con este ID')
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data, status=status.HTTP_200_OK)


class GetUserByPersonDocument(generics.ListAPIView):
    persona_serializer = PersonasSerializer
    serializer_class = UserSerializer
    def get(self, request, keyword1, keyword2):
        
        try:
            persona = Personas.objects.get(Q(tipo_documento = keyword1) & Q(numero_documento = keyword2))
            try:
                user = User.objects.get(persona=persona.id_persona)
                serializador = self.serializer_class(user)
                roles = UsuariosRol.objects.filter(id_usuario=user.id_usuario)
                serializador_roles = UserRolesSerializer(roles,many=True)
                return Response({'success':True,'Usuario' : serializador.data, 'Roles':serializador_roles.data}, status=status.HTTP_200_OK)
            except:
                serializador = PersonasSerializer(persona, many=False)
                return Response({'success':True,'Persona': serializador.data}, status=status.HTTP_200_OK)
        except:
            raise NotFound('No se encuentra persona con este numero de documento')


class GetUserByEmail(generics.ListAPIView):
    persona_serializer = PersonasSerializer
    serializer_class = UserSerializer

    def get(self, request, email):
        try:
            persona = Personas.objects.get(email=email)
            pass
        except:
            raise NotFound('No se encuentra ninguna persona con este email')
        try:
            user = User.objects.get(persona=persona.id_persona)
            serializer = self.serializer_class(user, many=False)
            return Response({'success':True,'Usuario': serializer.data}, status=status.HTTP_200_OK)
        except:
            raise PermissionDenied('Este email está conectado a una persona, pero esa persona no tiene asociado un usuario')

"""@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateUserAdmin(request, pk):
    user = User.objects.get(id_usuario=pk)

    data = request.data

    user.nombre_de_usuario= data['email']
    user.email = data['email']
    user.is_blocked = data['is_blocked']


    user.save()

    serializer = UserSerializer(user, many=False)

    return Response(serializer.data)"""
    
class AsignarRolSuperUsuario(generics.CreateAPIView):
    serializer_class = UsuarioRolesSerializers
    queryset = UsuariosRol.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id_persona):
        user_logeado = request.user.id_usuario

        #Validaciones
        
        persona = Personas.objects.filter(id_persona=id_persona).first()
        
        if not persona:
            raise NotFound('No existe la persona')

        usuario_delegado = User.objects.filter(persona=persona.id_persona).exclude(id_usuario=1).first()
        
        if not usuario_delegado or usuario_delegado.tipo_usuario != 'I': 
            raise PermissionDenied('Esta persona no tiene un usuario interno, por lo tanto no puede asignarle este rol')
        
       #Delegación del super usuario       
    
        usuario_delegante = User.objects.filter(id_usuario=user_logeado).first()
        previous_usuario_delegante = copy.copy(usuario_delegante)

        #EMAIL para DELEGANTE
        template = 'delegar-superusuario-delegante.html'
        subject = 'Delegación de rol exitosa'
        absurl = FRONTEND_URL+"#/auth/login"
        
        Util.notificacion(usuario_delegante.persona,subject,template,absurl=absurl)

        usuario_delegante.persona = persona
        usuario_delegante.save()

        #Auditoria Delegación de Rol Super Usuario
        valores_actualizados = {'previous':previous_usuario_delegante,'current':usuario_delegante}
        dirip = Util.get_client_ip(request)
        descripcion = {'NombreUsuario': usuario_delegante.nombre_de_usuario}
        auditoria_data = {
            'id_usuario': user_logeado,
            'id_modulo': 8,
            'cod_permiso': 'EJ',
            'subsistema': 'SEGU',
            'dirip': dirip,
            'descripcion': descripcion,
            'valores_actualizados': valores_actualizados
        }
        Util.save_auditoria(auditoria_data)
        
        #EMAIL para DELEGADO
        template = 'delegar-superusuario-delegado.html'
        subject = 'Delegación de rol exitosa'
        absurl = FRONTEND_URL+"#/auth/login"
        
        Util.notificacion(usuario_delegado.persona,subject,template,absurl=absurl)
        
        return Response({'success':True, 'detail':'Delegación y notificación exitosa'}, status=status.HTTP_200_OK)

class UnblockUser(generics.CreateAPIView):
    serializer_class = DesbloquearUserSerializer

    def post(self, request):

        if not request.data.get('nombre_de_usuario'):
            raise ValidationError('Debe ingresar nombre de usurio')
        if not request.data.get('tipo_documento'):
            raise ValidationError('Debe ingresar tipo de documento')
        if not request.data.get('numero_documento'):
            raise ValidationError('Debe ingresar numero de documento')
        if not request.data.get('telefono_celular'):
            raise ValidationError('Debe ingresar telefono celular')
        if not request.data.get('email'):
            raise ValidationError('Debe ingresar email')

        nombre_de_usuario = request.data['nombre_de_usuario']
        tipo_documento = request.data['tipo_documento']
        numero_documento = request.data['numero_documento']
        telefono_celular = request.data['telefono_celular']
        email = request.data['email']
        fecha_nacimiento = request.data.get('fecha_nacimiento')

        try:
            usuario_bloqueado = User.objects.get(nombre_de_usuario=str(nombre_de_usuario).lower())
        except:
            raise ValidationError('Los datos ingresados de usuario son incorrectos, intenta nuevamente')

        uidb64 = signing.dumps({'user': str(usuario_bloqueado.id_usuario)})
        token = PasswordResetTokenGenerator().make_token(usuario_bloqueado)
        current_site = get_current_site(request=request).domain

        relative_link = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token})

        redirect_url = request.data.get('redirect_url', '')
        redirect_url = quote_plus(redirect_url)
        absurl = 'http://' + current_site + relative_link

        try:
            persona_usuario_bloqueado = Personas.objects.get(Q(id_persona=usuario_bloqueado.persona.id_persona))
        except:
            raise ValidationError('Los datos ingresados de usuario-persona son incorrectos, intenta nuevamente')

        tipo_persona = persona_usuario_bloqueado.tipo_persona

        if tipo_persona == 'N':
            if not fecha_nacimiento:
                raise ValidationError('Debe ingresar fecha de nacimiento para persona natural')
            try:
                persona_usuario_bloqueado = Personas.objects.get(
                    Q(id_persona=usuario_bloqueado.persona.id_persona)
                    & Q(tipo_documento=tipo_documento)
                    & Q(numero_documento=numero_documento)
                    & Q(telefono_celular=telefono_celular)
                    & Q(email=email)
                    & Q(fecha_nacimiento=fecha_nacimiento)
                )
            except:
                raise ValidationError('Los datos ingresados de persona natural son incorrectos, intenta nuevamente')

            subject = "Desbloquea tu usuario"
            template = "desbloqueo-de-usuario.html"
            Util.notificacion(persona_usuario_bloqueado, subject, template, absurl=absurl + '?redirect-url=' + redirect_url)

        else:
            if fecha_nacimiento:
                raise ValidationError('No debe enviar la fecha de nacimiento para persona jurídica')
            try:
                persona_usuario_bloqueado = Personas.objects.get(
                    Q(id_persona=usuario_bloqueado.persona.id_persona)
                    & Q(tipo_documento=tipo_documento)
                    & Q(numero_documento=numero_documento)
                    & Q(telefono_celular_empresa=telefono_celular)
                    & Q(email=email)
                )
            except:
                raise ValidationError('Los datos ingresados de persona juridica son incorrectos, intenta nuevamente')

            subject = "Desbloquea tu usuario"
            template = "desbloqueo-de-usuario.html"
            Util.notificacion(persona_usuario_bloqueado, subject, template, absurl=absurl + '?redirect-url=' + redirect_url)

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_AdmUsu'
        data_alerta['informacion_complemento_mensaje'] = f"Solicitud de desbloqueo de usuario {usuario_bloqueado.nombre_de_usuario}."
        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        return Response({'success': True, 'detail': 'Email y sms enviado para desbloquear usuario'}, status=status.HTTP_200_OK)



class UnBlockUserPassword(generics.GenericAPIView):
    serializer_class = SetNewPasswordUnblockUserSerializer

    def patch(self, request):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response({'success':True, 'detail':'Usuario Desbloqueado'}, status=status.HTTP_200_OK)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        usuario_logueado = request.user.id_usuario
        persona = Personas.objects.filter(id_persona=data['persona']).first()

        # ASIGNAR USUARIO CREADO COMO ID_USUARIO_CREADOR
        data['id_usuario_creador'] = usuario_logueado

        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)

        #VALIDACION DE USUARIO EXISTENTE A LA PERSONA
        usuario = persona.user_set.exclude(id_usuario=1).first()

        if usuario:
            if usuario.is_active:
                raise PermissionDenied('La persona ya posee un usuario en el sistema')
            elif not usuario.is_active:
                raise PermissionDenied('La persona ya posee un usuario en el sistema pero está inactivo')

        if data["tipo_usuario"] == "I":
            # VALIDAR QUE PERSONA NO SEA JURIDICA
            if persona.tipo_persona == 'J':
                raise PermissionDenied('No puede registrar una persona jurídica como un usuario interno')

            # VALIDAR QUE TENGA CARGO
            if not persona.id_cargo:
                raise PermissionDenied('La persona no tiene un cargo asociado')

            # VALIDAR QUE ESTE VIGENTE EL CARGO
            if not persona.fecha_a_finalizar_cargo_actual or persona.fecha_a_finalizar_cargo_actual <= datetime.now().date():
                raise PermissionDenied('La fecha de finalización del cargo actual no es vigente')

        valores_creados_detalles = []
        # ASIGNACIÓN DE ROLES
        if not request.data.get('roles'):
            return Response({'success': False, 'detail': 'Debe asignar minimo un rol'}, status=status.HTTP_400_BAD_REQUEST)

        roles_por_asignar = data["roles"]
        if not roles_por_asignar:
            raise ValidationError('Debe enviar mínimo un rol para asignar al usuario')

        roles_por_asignar = [int(a) for a in roles_por_asignar]
        roles_por_asignar= set(roles_por_asignar)

        if data["tipo_usuario"] == "I":
            if 2 not in roles_por_asignar:
                roles_por_asignar.add(2)
            if 1 in roles_por_asignar:
                roles_por_asignar.remove(1)
        elif data["tipo_usuario"] == "E":
            roles_por_asignar = [2]

        roles = Roles.objects.filter(id_rol__in=roles_por_asignar)

        if len(roles) != len(set(roles_por_asignar)):
            raise ValidationError('Deben existir todos los roles asignados')

        user_serializer=serializer.save()

        for rol in roles:
            UsuariosRol.objects.create(
                id_usuario=user_serializer,
                id_rol=rol
            )
            descripcion={'nombre':rol.nombre_rol}
            valores_creados_detalles.append(descripcion)

        # AUDITORIA AL REGISTRAR USUARIO

        dirip = Util.get_client_ip(request)
        descripcion = {"Mensaje":"Se crea usuario", "NombreUsuario": str(request.data["nombre_de_usuario"]).lower()}
        valores_actualizados = {"create": {"Nuevo": {"NombreUsuario": str(request.data["nombre_de_usuario"]).lower()}}}

        auditoria_data = {
            "id_usuario": user_serializer.pk,
            "id_modulo": 1,
            "cod_permiso": 'CR',
            "subsistema": 'SEGU',
            "dirip": dirip,
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        #AUDITORIA AL ASIGNARLE ROL DE USUARIO EXTERNO POR DEFECTO

        dirip = Util.get_client_ip(request)
        descripcion = {"Mensaje": "Se asigna rol al usuario","NombreUsuario": str(request.data["nombre_de_usuario"]).lower()}
        valores_actualizados = {"create": {"Nuevo": {'NombreUsuario': str(request.data["nombre_de_usuario"]).lower()}}}
        auditoria_data = {
            "id_usuario": user_serializer.pk,
            "id_modulo": 2,
            "cod_permiso": 'CR',
            "subsistema": 'SEGU',
            "dirip": dirip,
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)


        uidb64 =signing.dumps({'user':str(user_serializer.id_usuario)})
        token = PasswordResetTokenGenerator().make_token(user_serializer)
        current_site=get_current_site(request=request).domain
        relativeLink=reverse('password-reset-confirm',kwargs={'uidb64':uidb64,'token':token})
        redirect_url= request.data.get('redirect_url','')
        redirect_url=quote_plus(redirect_url)
        absurl='http://'+ current_site + relativeLink + '?redirect-url='+ redirect_url

        subject = "Verifica tu usuario"
        template = "activacion-de-usuario.html"

        Util.notificacion(persona,subject,template,absurl=absurl,email=persona.email)

        return Response({'success':True, 'detail':'Usuario registrado exitosamente, se ha enviado un correo a ' + persona.email + ', con la información para la activación del usuario en el sistema', 'data': serializer.data}, status=status.HTTP_201_CREATED)

class RegisterExternoView(generics.CreateAPIView):
    serializer_class = RegisterExternoSerializer

    def post(self, request):
        user = request.data
        
        persona = Personas.objects.filter(id_persona=user['persona']).first()
        
        if not persona:
            raise NotFound('No existe la persona')
        
        if not persona.email:
            raise PermissionDenied('La persona no tiene un correo electrónico de notificación asociado, debe acercarse a Cormacarena y realizar una actualizacion  de datos para proceder con la creación del usuario en el sistema')
    
        usuario = persona.user_set.exclude(id_usuario=1).first()

        if usuario:
            if usuario.is_active or usuario.tipo_usuario == "I":
                raise PermissionDenied('La persona ya posee un usuario en el sistema, en caso de pérdida de credenciales debe usar las opciones de recuperación')
            elif not usuario.is_active and usuario.tipo_usuario == "E" :
                try:
                    raise PermissionDenied('La persona ya posee un usuario en el sistema, pero no se encuentra activado, ¿desea reenviar el correo de activación?')
                except PermissionDenied as e:
                    return Response({'success':False, 'detail':'La persona ya posee un usuario en el sistema, pero no se encuentra activado, ¿desea reenviar el correo de activación?',"modal":True,"id_usuario":usuario.id_usuario}, status=status.HTTP_403_FORBIDDEN)

        redirect_url=request.data.get('redirect_url','')
        redirect_url=quote_plus(redirect_url)
        
        if " " in user['nombre_de_usuario']:
            raise PermissionDenied('No puede contener espacios en el nombre de usuario')
        
        user['creado_por_portal'] = True
        user['is_active'] = True
        
        serializer = self.serializer_class(data=user)
        serializer.is_valid(raise_exception=True)
        nombre_de_usuario = str(serializer.validated_data.get('nombre_de_usuario', '')).lower()
        serializer_response = serializer.save()
        user_data = serializer.data
        
        #ASIGNARLE ROL USUARIO EXTERNO POR DEFECTO
        rol = Roles.objects.get(id_rol=2)
        usuario_por_asignar = User.objects.get(nombre_de_usuario=nombre_de_usuario)     
        UsuariosRol.objects.create(
            id_rol = rol,
            id_usuario = usuario_por_asignar
        )

        # AUDITORIA AL REGISTRAR USUARIO

        dirip = Util.get_client_ip(request)
        descripcion = {'NombreUsuario': str(request.data["nombre_de_usuario"]).lower()}

        auditoria_data = {
            'id_usuario': request.user.id_usuario,
            'id_modulo': 10,
            'cod_permiso': 'CR',
            'subsistema': 'SEGU',
            'dirip': dirip,
            'descripcion': descripcion
        }
        Util.save_auditoria(auditoria_data)

        #AUDITORIA AL ASIGNARLE ROL DE USUARIO EXTERNO POR DEFECTO
        dirip = Util.get_client_ip(request)
        descripcion = {'NombreUsuario': str(request.data["nombre_de_usuario"]).lower(), 'Rol': rol}
        auditoria_data = {
            'id_usuario': request.user.id_usuario,
            'id_modulo': 5,
            'cod_permiso': 'CR',
            'subsistema': 'SEGU',
            'dirip': dirip,
            'descripcion': descripcion
        }
        Util.save_auditoria(auditoria_data)

        # token = RefreshToken.for_user(serializer_response)

        # current_site=get_current_site(request).domain

        # relativeLink= reverse('verify')
        # absurl= 'http://'+ current_site + relativeLink + "?token="+ str(token) + '&redirect-url=' + redirect_url

        subject = "Registro exitoso"
        template = "verificacion-cuenta.html"
        absurl = FRONTEND_URL+"#/auth/login"

        Util.notificacion(persona,subject,template,absurl=absurl)
    
        return Response({'success':True, 'detail':'Usuario registrado exitosamente, se ha enviado un correo', 'data':user_data}, status=status.HTTP_201_CREATED)

class Verify(views.APIView):

    serializer_class = EmailVerificationSerializer
#    token_param_config = openapi.Parameter('token', in_=openapi.IN_QUERY, description='Description', type=openapi.TYPE_STRING)

    #@swagger_auto_schema(manual_parameters=[token_param_config])
    def get(self, request):
        token = request.GET.get('token')
        redirect_url= request.query_params.get('redirect-url')
        redirect_url=unquote_plus(redirect_url)
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms='HS256')
            user = User.objects.get(id_usuario=payload['user_id'])
            if not user.is_active:
                user.is_active = True
                user.activated_at = datetime.now()
                user.save()
                
                cod_operacion_instance = OperacionesSobreUsuario.objects.filter(cod_operacion='A').first()
                
                HistoricoActivacion.objects.create(
                    id_usuario_afectado=user,
                    justificacion='Activación Inicial del Usuario',
                    usuario_operador=user,
                    cod_operacion=cod_operacion_instance
                )
                
                subject = "Verificación exitosa"
                template = "verificacion-cuenta.html"
                absurl = FRONTEND_URL+"#/auth/login"
                Util.notificacion(user.persona,subject,template,absurl=absurl)
            
            # ELIMINAR DIRECCIÓN CORTA SI EXISTE
            current_site=get_current_site(request).domain

            relativeLink= reverse('verify')
            absurl= 'http://'+ current_site + relativeLink + "?token="+ token + '&redirect-url=' + redirect_url
            short_url = Shortener.objects.filter(long_url=absurl).first()
            if short_url:
                short_url.delete()
            redirect_url = redirect_url + '&' if '?' in redirect_url else redirect_url + '?'
            return redirect(redirect_url + "success=True")
        except jwt.ExpiredSignatureError as identifier:
            # ELIMINAR DIRECCIÓN CORTA SI EXISTE
            current_site=get_current_site(request).domain

            relativeLink= reverse('verify')
            absurl= 'http://'+ current_site + relativeLink + "?token="+ token + '&redirect-url=' + redirect_url
            short_url = Shortener.objects.filter(long_url=absurl).first()
            if short_url:
                short_url.delete()
            redirect_url = redirect_url + '&' if '?' in redirect_url else redirect_url + '?'
            return redirect(redirect_url + "success=False")

        except jwt.exceptions.DecodeError as identifier:
            # ELIMINAR DIRECCIÓN CORTA SI EXISTE
            current_site=get_current_site(request).domain

            relativeLink= reverse('verify')
            absurl= 'http://'+ current_site + relativeLink + "?token="+ token + '&redirect-url=' + redirect_url
            short_url = Shortener.objects.filter(long_url=absurl).first()
            if short_url:
                short_url.delete()
            redirect_url = redirect_url + '&' if '?' in redirect_url else redirect_url + '?'
            return redirect(redirect_url + "success=False")

class LoginConsultarApiViews(generics.RetrieveAPIView):
    serializer_class=LoginSerializers
    queryset = Login.objects.all()

class LoginListApiViews(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class=LoginSerializers
    queryset = Login.objects.all()


class ActivateUsers(generics.ListAPIView):
    serializer_class= LoginSerializers
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id_persona):
        usuario = User.objects.filter(persona__id_persona = id_persona).first()
        justificacion_activacion = request.data.get('justificacion_activacion', 'Activación de usuario')

        if usuario:
            usuario.is_active = True
            usuario.save()

            HistoricoActivacion.objects.create(
                id_usuario_afectado = usuario,
                cod_operacion = OperacionesSobreUsuario.objects.get(cod_operacion='A'),
                fecha_operacion = datetime.now(),
                justificacion = justificacion_activacion,
                usuario_operador = request.user,
            )

            return Response({'success':True, 'detail':'Se activo el usuario'}, status=status.HTTP_200_OK)
        else:
            raise ValidationError({'success':False, 'detail':'No se encontró el usuario para la persona ingresada'})


class DeactivateUsers(generics.RetrieveUpdateAPIView):
    serializer_class = LoginSerializers
    permission_classes = [IsAuthenticated]

    def patch(self, request, id_persona):
        usuario = User.objects.filter(persona__id_persona=id_persona).first()
        justificacion_activacion = request.data.get('justificacion_activacion', 'Activación de usuario')

        if usuario:
            # Validación si el usuario ya está desactivado
            if not usuario.is_active:
                return Response({
                    'success': False,
                    'detail': 'El usuario ya está desactivado'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Desactivar el usuario
            usuario.is_active = False
            usuario.save()
            HistoricoActivacion.objects.create(
                id_usuario_afectado = usuario,
                cod_operacion = OperacionesSobreUsuario.objects.get(cod_operacion='I'),
                fecha_operacion = datetime.now(),
                justificacion = justificacion_activacion,
                usuario_operador = request.user,
            )

            return Response({
                'success': True,
                'detail': 'Se desactivó el usuario correctamente'
            }, status=status.HTTP_200_OK)

        else:
            raise ValidationError({
                'success': False,
                'detail': 'No se encontró el usuario para la persona ingresada'
            })


#__________________LoginErroneo

class LoginErroneoConsultarApiViews(generics.RetrieveAPIView):
    serializer_class=LoginErroneoSerializers
    queryset = LoginErroneo.objects.all()


class LoginErroneoListApiViews(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class=LoginErroneoSerializers

    def get(self, request):
        queryset = LoginErroneo.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)


class LoginApiView(generics.CreateAPIView):
    serializer_class=LoginSerializer

    def post(self, request):
        data = request.data
        user = User.objects.filter(nombre_de_usuario=str(data['nombre_de_usuario']).lower()).first()

        ip = Util.get_client_ip(request)
        device = Util.get_client_device(request)
        if user:
            if user.is_active:
                roles = UsuariosRol.objects.filter(id_usuario=user.id_usuario).values()
                rol_id_list = [rol['id_rol_id'] for rol in roles]
                permisos_list = []
                for rol in rol_id_list:
                    permisos = PermisosModuloRol.objects.filter(id_rol=rol).values()
                    permisos_list.append(permisos)

                try:
                    login_error = LoginErroneo.objects.filter(id_usuario=user.id_usuario).last()
                    serializer = self.serializer_class(data=data)
                    serializer.is_valid(raise_exception=True)

                    login = Login.objects.create(
                        id_usuario = user,
                        dirip = str(ip),
                        dispositivo_conexion = device,
                    )
                    LoginPostSerializers(login, many=False)

                    if login_error:
                        login_error.contador = 0
                        login_error.save()
                    # REPRESENTANTE LEGAL
                    # DEFINIR SI UN USUARIO SI O SI DEBE TENER UN PERMISO O NO
                    permisos_list = permisos_list[0] if permisos_list else []
                    serializer_data = serializer.data
                    
                    # if user.persona.telefono_celular:
                    #     sms = "Fedecacao te informa que se ha registrado una conexion con el usuario " + user.nombre_de_usuario + " en la fecha " + str(datetime.now(pytz.timezone('America/Bogota')))
                    #     Util.send_sms(user.persona.telefono_celular, sms)
                    # else:
                    #     subject = "Login exitoso"
                    #     template = "email-login.html"
                    #     Util.notificacion(user.persona,subject,template,nombre_de_usuario=user.nombre_de_usuario)
                    # return Response({'success': True, 'detail':'Login correcto', 'data': serializer_data, 'permisos':permisos_list }, status=status.HTTP_200_OK)

                    

                    # try:
                    #     if user.persona.email:
                    #         subject = "Login exitoso"
                    #         template = "email-login.html"
                    #         Util.notificacion(user.persona, subject, template, nombre_de_usuario=user.nombre_de_usuario)
                    #     else:
                    #         raise Exception("El usuario no tiene correo registrado")
                    # except:
                    #     if user.persona.telefono_celular:
                    #         sms = "Portal de recaudo de Fedecacao - Fondo Nacional de cacao te informa que se ha registrado una conexion con el usuario " + user.nombre_de_usuario + " en la fecha " + str(datetime.now(pytz.timezone('America/Bogota')))
                    #         Util.send_sms(user.persona.telefono_celular, sms)

                    return Response({'success': True, 'detail': 'Login correcto', 'data': serializer_data, 'permisos': permisos_list}, status=status.HTTP_200_OK)

                except:
                    login_error = LoginErroneo.objects.filter(id_usuario=user.id_usuario).first()
                    if login_error:
                        if login_error.contador < 3:
                            hour_difference = datetime.utcnow().replace(tzinfo=None) - login_error.fecha_login_error.replace(tzinfo=None)
                            hour_difference = (hour_difference.days * 24) + (hour_difference.seconds//3600)
                            if hour_difference < 24:
                                login_error.contador += 1
                                login_error.restantes = 3 - login_error.contador
                                login_error.save()
                            else :
                                login_error.contador = 1
                                login_error.save()
                            if login_error.contador == 3:
                                user.is_blocked = True
                                user.save()

                                cod_operacion_instance = OperacionesSobreUsuario.objects.filter(cod_operacion='B').first()

                                HistoricoActivacion.objects.create(
                                    id_usuario_afectado = user,
                                    cod_operacion = cod_operacion_instance,
                                    fecha_operacion = datetime.now(),
                                    justificacion = 'Usuario bloqueado por exceder los intentos incorrectos en el login',
                                    usuario_operador = user,
                                )
                                # #Envio de notificacion por sms
                                # sms = "Fedecacao te informa el usuario " + user.nombre_de_usuario + " ha sido bloqueado en la fecha " + str(datetime.now(pytz.timezone('America/Bogota')))
                                # Util.send_sms(user.persona.telefono_celular, sms)
                                
                                uidb64 = signing.dumps({'user': str(user.id_usuario)})
                                token = PasswordResetTokenGenerator().make_token(user)
                                current_site = get_current_site(request=request).domain

                                relative_link = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token})

                                redirect_url = 'http://18.228.220.141/auth/unlocked/'
                                redirect_url = quote_plus(redirect_url)
                                absurl = 'http://' + current_site + relative_link
                                
                                
                                # Envío de notificación por correo
                                Util.notificacion(user.persona, "Bloqueo de Usuario", "bloqueo-usuario-login.html", nombre_de_usuario=user.nombre_de_usuario, absurl=absurl + '?redirect-url=' + redirect_url)

                                # raise PermissionDenied('Su usuario ha sido bloqueado')
                                return Response({'success':False, 'detail':'Su usuario ha sido bloqueado'}, status=status.HTTP_403_FORBIDDEN)
                            serializer = LoginErroneoPostSerializers(login_error, many=False)
                            # try:
                            #     raise ValidationError('La contraseña es invalida')
                            # except ValidationError as e:
                            return Response({'success':False, 'detail':'La contraseña es invalida', 'login_erroneo': serializer.data}, status=status.HTTP_400_BAD_REQUEST)
                        else:
                            if user.is_blocked:
                                raise PermissionDenied('Su usuario está bloqueado, debe comunicarse con el administrador')
                            else:
                                login_error.contador = 1
                                login_error.save()
                                serializer = LoginErroneoPostSerializers(login_error, many=False)
                                # try:
                                #     raise ValidationError('La contraseña es invalida')
                                # except ValidationError as e:
                                return Response({'success':False, 'detail':'La contraseña es invalida', 'login_erroneo': serializer.data}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        if user.is_blocked:
                            raise PermissionDenied('Su usuario está bloqueado, debe comunicarse con el administrador')
                        else:
                            login_error = LoginErroneo.objects.create(
                                id_usuario = user,
                                dirip = str(ip),
                                dispositivo_conexion = device,
                                contador = 1
                            )
                        login_error.restantes = 3 - login_error.contador
                        serializer = LoginErroneoPostSerializers(login_error, many=False)
                        # try:
                        #     raise ValidationError('La contraseña es invalida')
                        # except ValidationError as e:
                        return Response({'success':False, 'detail':'La contraseña es invalida', 'login_erroneo': serializer.data}, status=status.HTTP_400_BAD_REQUEST)
            else:
                try:
                    raise PermissionDenied('Usuario no activado')
                except PermissionDenied as e:
                    return Response({'success':False, 'detail':'Usuario no activado', 'data':{'modal':True, 'id_usuario':user.id_usuario, 'tipo_usuario':user.tipo_usuario}}, status=status.HTTP_403_FORBIDDEN)
        else:
            UsuarioErroneo.objects.create(
                campo_usuario = str(data['nombre_de_usuario']).lower(),
                dirip = str(ip),
                dispositivo_conexion = device
            )
            return Response({'success':False, 'detail':'No existe el nombre de usuario ingresado'}, status=status.HTTP_400_BAD_REQUEST)

class RequestPasswordResetEmail(generics.CreateAPIView):
    serializer_class = ResetPasswordEmailRequestSerializer
    queryset = User.objects.all()

    def post(self,request):
        data = request.data
        usuario = self.queryset.all().filter(nombre_de_usuario=str(data['nombre_de_usuario']).lower()).first()
        if usuario:
            uidb64 =signing.dumps({'user':str(usuario.id_usuario)})
            token = PasswordResetTokenGenerator().make_token(usuario)
            current_site=get_current_site(request=request).domain
            relativeLink=reverse('password-reset-confirm',kwargs={'uidb64':uidb64,'token':token})
            redirect_url= request.data.get('redirect_url','')
            redirect_url=quote_plus(redirect_url)
            absurl='http://'+ current_site + relativeLink

            data_email = None
            template = 'recuperar-contraseña.html'
            subject = 'Actualiza tu contraseña'


            if usuario.persona.email:
                Util.notificacion(usuario.persona,subject,template,absurl=absurl + '?redirect-url='+ redirect_url)
                data_alerta = {}
                data_alerta['cod_clase_alerta'] = 'Com_AdmUsu'
                data_alerta['informacion_complemento_mensaje'] = f"Solicitud de recuperación de contraseña para el usuario {usuario.nombre_de_usuario}."
                configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
                if configuracion_alerta and configuracion_alerta.activa:
                    Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)
                return Response({'success':True, 'detail':'Se ha enviado correctamente la notificación de la recuperación de contraseña'},status=status.HTTP_200_OK)
            return Response({'success':False, 'detail':'No se ha podido enviar la notificación de la recuperación de contraseña'},status=status.HTTP_400_BAD_REQUEST)
        else:
            raise NotFound('No se encontró ningún usuario por el nombre de usuario ingresado')


class RequestValidate(generics.CreateAPIView):
    queryset = User.objects.all()

    def post(self,request):
        # codigos
        # 101 usuario existe y no esta ni bloqueado ni desactivado
        # 102 usuario bloqueado
        # 103 usuario desactivado
        # 104 usuario no existe
        data = request.data
        usuario = self.queryset.all().filter(nombre_de_usuario=str(data['nombre_de_usuario']).lower()).first()
        if usuario:
            if usuario.is_blocked:
                return Response({'success':False, 'code': 102},status=status.HTTP_400_BAD_REQUEST)
            if usuario.is_active == False:
                return Response({'success':False, 'code': 103},status=status.HTTP_400_BAD_REQUEST)
            else:
                login_error = LoginErroneo.objects.filter(id_usuario=usuario.id_usuario)
                if login_error:
                    serializer = LoginErroneoPostSerializers(login_error, many=True)
                    return Response({'success':True, 'code': 101, 'data': serializer.data},status=status.HTTP_200_OK)
                return Response({'success':True, 'code': 101},status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'code': 104},status=status.HTTP_400_BAD_REQUEST)


class PasswordTokenCheckApi(generics.GenericAPIView):
    serializer_class=UserSerializer
    def get(self,request,uidb64,token):
        redirect_url= request.query_params.get('redirect-url')
        redirect_url=unquote_plus(redirect_url)
        try:
            id = int(signing.loads(uidb64)['user'])
            user = User.objects.get(id_usuario=id)
            redirect_url = redirect_url + '&' if '?' in redirect_url else redirect_url + '?'
            if not PasswordResetTokenGenerator().check_token(user,token):
                if len(redirect_url)>3:
                    return redirect(redirect_url+'token-valid=False')
                else:
                    return redirect(FRONTEND_URL+redirect_url+'token-valid=False')

            # ELIMINAR DIRECCIÓN CORTA SI EXISTE
            current_site=get_current_site(request=request).domain
            relativeLink=reverse('password-reset-confirm',kwargs={'uidb64':uidb64,'token':token})

            absurl='http://'+ current_site + relativeLink + '?redirect-url=' + redirect_url
            # short_url = Shortener.objects.filter(long_url=absurl).first()
            # if short_url:
            #     short_url.delete()
            redirect_url = redirect_url + '&' if '?' in redirect_url else redirect_url + '?'
            return redirect(redirect_url+'token-valid=True&message=Credentials-valid&uidb64='+uidb64+'&token='+token)
        except encoding.DjangoUnicodeDecodeError as identifier:
            # ELIMINAR DIRECCIÓN CORTA SI EXISTE
            current_site=get_current_site(request=request).domain
            relativeLink=reverse('password-reset-confirm',kwargs={'uidb64':uidb64,'token':token})

            absurl='http://'+ current_site + relativeLink + '?redirect-url=' + redirect_url
            # short_url = Shortener.objects.filter(long_url=absurl).first()
            # if short_url:
            #     short_url.delete()

            if not PasswordResetTokenGenerator().check_token(user):
                # ELIMINAR DIRECCIÓN CORTA SI EXISTE
                current_site=get_current_site(request=request).domain
                relativeLink=reverse('password-reset-confirm',kwargs={'uidb64':uidb64,'token':token})

                absurl='http://'+ current_site + relativeLink + '?redirect-url=' + redirect_url
                # short_url = Shortener.objects.filter(long_url=absurl).first()
                # if short_url:
                #     short_url.delete()
                redirect_url = redirect_url + '&' if '?' in redirect_url else redirect_url + '?'
                return redirect(redirect_url+'token-valid=False')


class SetNewPasswordApiView(generics.GenericAPIView):
    serializer_class=SetNewPasswordSerializer

    def patch(self,request):
        serializer=self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = request.data.get('password')
        uidb64 = request.data.get('uidb64')
        id = int(signing.loads(uidb64)['user'])
        user = User.objects.filter(id_usuario=id).first()

        if user.password and user.password != "":
            message = 'Contraseña actualizada'
        else:
            user.is_active = True
            user.activated_at = datetime.now()

            cod_operacion_instance = OperacionesSobreUsuario.objects.filter(cod_operacion='A').first()

            HistoricoActivacion.objects.create(
                id_usuario_afectado=user,
                justificacion='Activación Inicial del Usuario',
                usuario_operador=user,
                cod_operacion=cod_operacion_instance
            )

            # subject = "Verificación exitosa"
            # template = "verificacion-cuenta.html"
            # absurl = FRONTEND_URL+"#/auth/login"
            # Util.notificacion(user.persona,subject,template,absurl=absurl)

            message = 'Usuario activado correctamente'

        user.set_password(password)
        user.save()

        return Response({'success':True, 'detail':message},status=status.HTTP_200_OK)

@api_view(['POST'])
def uploadImage(request):
    data = request.data
    user_id = data['id_usuario']
    user = User.objects.get(id_usuario=user_id)

    user.profile_img = request.FILES.get('image') # EDITAR
    user.save()

    return Response('Image was uploaded')

class GetNuevoSuperUsuario(generics.RetrieveAPIView):
    serializer_class = PersonasFilterSerializer
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get (self,request,tipo_documento,numero_documento):
        fecha_sistema = datetime.now()
                
        nuevo_super_usuario = Personas.objects.filter(tipo_documento=tipo_documento,numero_documento=numero_documento,fecha_a_finalizar_cargo_actual__gt=fecha_sistema).filter(~Q(id_cargo = None)).first()
        
        if nuevo_super_usuario:
            serializador = self.serializer_class(nuevo_super_usuario)
            return Response({'succes':True, 'detail':'Los datos coincidieron con la búsqueda realizada','data':serializador.data},status=status.HTTP_200_OK)
        else: 
            raise NotFound('La persona no existe o no tiene cargo actual')

class GetNuevoSuperUsuarioFilters(generics.ListAPIView):
    serializer_class = PersonasFilterSerializer
    queryset = Personas.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self,request):
    
        filter={}
        for key, value in request.query_params.items():
            if key in ['primer_nombre','primer_apellido','tipo_documento','numero_documento']:
                if key == 'primer_nombre' or key== 'primer_apellido':
                    if value != '':
                        filter[key+'__icontains'] = value
                elif key == 'numero_documento':
                    if value != '':
                        filter[key+'__icontains'] = value
                else:
                    if value != '':
                        filter[key] = value
                    
        fecha_sistema =  datetime.now()           
        filter['fecha_a_finalizar_cargo_actual__gt'] = fecha_sistema

        persona = self.queryset.all().filter(**filter).filter(~Q(id_cargo = None))
        
        serializador = self.serializer_class(persona,many=True)
        return Response({'succes':True, 'detail':'Se encontraron las siguientes personas','data':serializador.data},status=status.HTTP_200_OK)
        
class ReenviarCorreoVerificacionDeUsuario(generics.UpdateAPIView):
    serializer_class = RegisterExternoSerializer
    
    def put(self,request,id_usuario):
        
        user = User.objects.filter(id_usuario=id_usuario).first()
        
        if user.is_active == False and user.tipo_usuario == "E":
            
            redirect_url=request.data.get('redirect_url','')
            redirect_url=quote_plus(redirect_url)

            token = RefreshToken.for_user(user)

            current_site=get_current_site(request).domain

            persona = Personas.objects.filter(id_persona = user.persona.id_persona).first()

            relativeLink= reverse('verify')
            absurl= 'http://'+ current_site + relativeLink + "?token="+ str(token) + '&redirect-url=' + redirect_url

            subject = "Verifica tu usuario"
            template = "activacion-de-usuario.html"

            Util.notificacion(persona,subject,template,absurl=absurl,email=persona.email)
            
            return Response({"success":True, 'detail':"Se ha enviado un correo a "+persona.email+" con la información para la activación del usuario en el sistema"})
            
        else: 
            raise PermissionDenied('El usuario ya se encuentra activado o es un usuario interno')

class BusquedaHistoricoActivacion(generics.ListAPIView):
    serializer_class = HistoricoActivacionSerializers
    queryset = HistoricoActivacion.objects.all()

    def get_queryset(self):
        id_usuario = self.kwargs['id_usuario_afectado']
        queryset = HistoricoActivacion.objects.filter(id_usuario_afectado=id_usuario)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            data = serializer.data
            return Response({'success':True, 'detail':'Se encontró el siguiente historico de activación para ese usuario', 'data': data}, status=status.HTTP_200_OK)
        else:
            raise NotFound('No se encontro historico de activación para ese usuario')

class UsuarioInternoAExterno(generics.UpdateAPIView):
    serializer_class = UsuarioInternoAExternoSerializers
    queryset = User.objects.all()

    def put(self, request, id_usuario):
        user_loggedin = request.user
        serializador = self.serializer_class(user_loggedin)
        usuario = User.objects.filter(id_usuario=id_usuario, tipo_usuario='I', is_active=False).first()
        if usuario:
            usuario.tipo_usuario = 'E'
            usuario.is_active = True
            usuario.save()
            
            cod_operacion_instance = OperacionesSobreUsuario.objects.filter(cod_operacion='A').first()
            
            HistoricoActivacion.objects.create(
                id_usuario_afectado=usuario,
                justificacion='Usuario activado desde el portal, con cambio de INTERNO a EXTERNO',
                usuario_operador=user_loggedin,
                cod_operacion=cod_operacion_instance
            )

            subject = "Cambio a usuario externo"
            template = "cambio-tipo-de-usuario.html"
            Util.notificacion(usuario.persona,subject,template,nombre_de_usuario=usuario.nombre_de_usuario)

            return Response({'success':True, 'detail':'Se activo como usuario externo', 'data': serializador.data}, status=status.HTTP_200_OK)
        else:
            raise ValidationError('El usuario no existe o no cumple con los requisitos para ser convertido en usuario externo')
        
#BUSQUEDA DE USUARIOS ENTREGA 18 UD.11

class BusquedaByNombreUsuario(generics.ListAPIView):
    serializer_class = UsuarioBasicoSerializer
    queryset = User.objects.all()
        
    def get(self,request):
        
        nombre_de_usuario = str(request.query_params.get('nombre_de_usuario', '')).lower()
        
        busqueda_usuario = self.queryset.all().filter(nombre_de_usuario__icontains=nombre_de_usuario)
        
        serializador = self.serializer_class(busqueda_usuario,many=True, context = {'request':request})
        
        return Response({'succes':True, 'detail':'Se encontraron los siguientes usuarios.','data':serializador.data},status=status.HTTP_200_OK)

#BUSQUEDA ID PERSONA Y RETORNE LOS DATOS DE LA TABLA USUARIOS

class BuscarByIdPersona(generics.RetrieveAPIView):
    serializer_class = UsuarioBasicoSerializer
    queryset = User.objects.all()
    
    def get(self,request,id_persona):
        usuarios = self.queryset.all().filter(persona=id_persona)
            
        serializador = self.serializer_class(usuarios,many=True, context = {'request':request})
        return Response({'succes':True, 'detail':'Se encontraron los siguientes usuarios.','data':serializador.data},status=status.HTTP_200_OK)
    
class GetByIdUsuario(generics.RetrieveAPIView):
    serializer_class = UsuarioFullSerializer
    queryset = User.objects.all()
    
    def get(self,request,id_usuario):
        usuario = self.queryset.all().filter(id_usuario=id_usuario).first()
        
        if not usuario:
            raise NotFound('No se encontró el usuario ingresado')
        
        serializador = self.serializer_class(usuario, context = {'request':request})
        return Response({'succes':True, 'detail':'Se encontró la información del usuario', 'data':serializador.data},status=status.HTTP_200_OK)
    

class RecuperarNombreDeUsuario(generics.UpdateAPIView):
    serializer_class = RecuperarUsuarioSerializer
    queryset = User.objects.all()
    
    def put(self,request):
        data = request.data
        
        if not data.get('tipo_documento') or not data.get('numero_documento') or not data.get('email'):
            raise ValidationError('Debe ingresar los parámetros respectivos: tipo de documento, número de documento, email')
        
        persona = Personas.objects.filter(tipo_documento=data['tipo_documento'], numero_documento=data['numero_documento'], email=data['email']).first()
        
        if persona:
            usuario = self.queryset.all().filter(persona = persona.id_persona).exclude(id_usuario=1).first()
            
            if usuario:
                
                subject = "Verifica tu usuario"
                template = "recuperar-usuario.html"

                Util.notificacion(persona,subject,template,nombre_de_usuario=usuario.nombre_de_usuario)

                return Response({'success':True, 'detail':'Se ha enviado el correo'},status=status.HTTP_200_OK)
            
            else:
                raise NotFound('No existe usuario') 
        raise NotFound('No existe usuario')
    

class SegundoFactorAutenticacionGet(generics.ListAPIView):
    serializer_class = SegundoFactorAutenticacionSerielizer
    
    def get(self, request):
        segundo_factor = SegundoFactorAutenticacion.objects.all()
        
        if not segundo_factor:
            raise NotFound('No se encontró el segundo factor de autenticación')
        
        serializador = self.serializer_class(segundo_factor, many=True)
        return Response({'success':True, 'detail':'Se encontró el segundo factor de autenticación', 'data':serializador.data}, status=status.HTTP_200_OK)
    

# class SegundoFAPersonaGet(generics.RetrieveAPIView):
#     serializer_class = SegundoFAPersonaSerializer
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         segundo_factor = SegundoFAPersona.objects.filter(id_persona=request.user.persona.id_persona)

#         if not segundo_factor:
#             raise NotFound({'success': False, 'detail': 'No se encontró el segundo factor de autenticación'})

#         serializer = self.serializer_class(segundo_factor, many=True)  
        
#         return Response({
#             'success': True,
#             'detail': 'Se encontró el segundo factor de autenticación',
#             'data': serializer.data
#         }, status=status.HTTP_200_OK)
    

class SegundoFAPersonaPost(generics.CreateAPIView):
    serializer_class = SegundoFAPersonaSerializer
    
    def post(self, request):
        data = request.data
        usuario = request.user  
        persona = usuario.persona  

        # Asignar id_persona al request
        data['id_persona'] = persona.id_persona

        #Verificar si el usuario ya tiene un registro con este 2FA
        existente = SegundoFAPersona.objects.filter(id_persona=persona, id_2fa=data['id_2fa']).select_related('id_2fa').first()
        if existente:
            return Response({
                "success": False,
                "detail": f"El usuario ya tiene un método de autenticación registrado",
                "id_2fa": existente.id_2fa.id_2fa,
                "tipo_2fa": existente.id_2fa.tipo_2fa,
                "descripcion": existente.id_2fa.descripcion
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener el segundo factor de autenticación
        segundo_factor = SegundoFactorAutenticacion.objects.filter(id_2fa=data['id_2fa']).first()
        if not segundo_factor:
            raise ValidationError('El tipo de 2FA proporcionado no es válido')

        # Validaciones según el tipo de 2FA**
        if segundo_factor.tipo_2fa == 'VEMAIL':
            if not data.get('email_verificacion'):
                if not persona.email:
                    raise ValidationError('La persona no tiene email registrado')
                data['email_verificacion'] = persona.email

        elif segundo_factor.tipo_2fa == 'VSMS':
            if not data.get('tel_verificacion'):
                if not persona.telefono_celular:
                    raise ValidationError('La persona no tiene teléfono registrado')
                data['tel_verificacion'] = persona.telefono_celular

        data["verificado"] = True
        # Guardar el segundo factor de autenticación
        serializador = self.serializer_class(data=data)
        serializador.is_valid(raise_exception=True)
        instancia_guardada = serializador.save() 

        metodo_eli = SegundoFAPersona.objects.filter(
            id_persona=persona
        ).exclude(
            id_2fa_persona=instancia_guardada.id_2fa_persona
        )
        # Actualizar el campo tiene_2FA en User
        usuario.tiene_2FA = True
        usuario.save(update_fields=['tiene_2FA'])
        metodo_eli.delete()

        return Response({'success': True, 'detail': 'Se guardó el segundo factor de autenticación', 'data': serializador.data}, status=status.HTTP_201_CREATED)


# class SegundoFAPersonaDelete(generics.DestroyAPIView):
#     serializer_class = SegundoFAPersonaSerializer
    
#     def delete(self, request, pk):
#         segundo_factor = SegundoFAPersona.objects.filter(id_2fa_persona=pk).first()
        
#         if not segundo_factor:
#             raise NotFound('No se encontró el segundo factor de autenticación')
        
#         segundo_factor.delete()
        
#         return Response({'success':True, 'detail':'Se eliminó el segundo factor de autenticación'}, status=status.HTTP_200_OK)
    

# class CrearCodigoVerificacion(generics.CreateAPIView):
    
#     def post(self, request, pk):
#         persona = request.user.persona
#         doble_verificacion_persona = SegundoFAPersona.objects.filter(id_2fa_persona=pk).first()

#         if not doble_verificacion_persona:
#             raise ValidationError("No se encontró un segundo factor de autenticación asociado a esta persona.")
        
#         verification_code = secrets.randbelow(10**6)
#         verification_code_str = f'{verification_code:06}'
        
#         current_time = timezone.now() 

#         doble_verificacion = Verificacion_2FA.objects.filter(id_2fa_persona=doble_verificacion_persona).first()

#         if doble_verificacion:
#             # segundos = (current_time - doble_verificacion.fecha_verificacion).total_seconds()
#             # if segundos < 60:
#             #     raise ValidationError('Debe esperar un minuto antes de solicitar otro código')

#             # Actualizar código de verificación existente
#             doble_verificacion.codigo_verificacion = verification_code_str
#             doble_verificacion.fecha_verificacion = current_time
#             doble_verificacion.save()
#         else:
#             # Crear un nuevo código de verificación
#             doble_verificacion = Verificacion_2FA.objects.create(
#                 codigo_verificacion=verification_code_str,
#                 id_2fa_persona=doble_verificacion_persona,
#                 fecha_verificacion=current_time
#             )

#         # ENVIAR SMS Y/O EMAIL
#         match (doble_verificacion_persona.id_2fa.tipo_2fa):
#             case 'VSMS':
#                 # Prioriza el teléfono celular de la persona, si no está disponible usa el de la empresa
#                 if persona.telefono_celular:
#                     telefono_a_usar = persona.telefono_celular
#                 elif persona.telefono_empresa:
#                     telefono_a_usar = persona.telefono_empresa
#                 else:
#                     # Si no hay ninguno, puedes manejar el error o enviar un mensaje de error.
#                     return Response({'success': False, 'detail': 'No se encontró un teléfono válido para enviar el SMS'}, status=status.HTTP_400_BAD_REQUEST)

#                 # Si el teléfono está disponible, genera y envía el SMS
#                 sms = (
#                         f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: ingresa el codigo {verification_code_str} para continuar con el cierre del indice electronico."
#                     )

#                 Util.send_sms(telefono_a_usar, sms)

#             case 'VEMAIL':
#                 if persona.email:
#                     subject = "Código de Verificación"
#                     template = "codigo-verificacion-firma.html"
#                     Util.notificacion(persona, subject, template, nombre_de_usuario=request.user.nombre_de_usuario, verification_code_str=verification_code_str)

#         # Retornar los datos creados
#         return Response({
#             'success': True,
#             'detail': 'Se ha realizado el envío del código de verificación',
#             'data': {
#                 'id_verificacion_2fa': doble_verificacion.id_verificacion_2fa,
#                 'id_2fa_persona': doble_verificacion.id_2fa_persona.id_2fa_persona,
#                 'codigo_verificacion': doble_verificacion.codigo_verificacion,
#                 'fecha_verificacion': doble_verificacion.fecha_verificacion.strftime("%Y-%m-%d %H:%M:%S")
#             }
#         }, status=status.HTTP_201_CREATED)


# class VerificarCodigoVerificacion(generics.UpdateAPIView):
    
#     def update(self, request):
#         codigo = request.data.get('codigo')
#         id_verificacion_2fa = request.data.get('id_verificacion_2fa')
        
#         if not codigo:
#             raise ValidationError('Debe enviar el código')
        
#         persona = request.user
#         current_time = timezone.now()
#         doble_verificacion = Verificacion_2FA.objects.filter(id_verificacion_2fa=id_verificacion_2fa).first()
#         if not doble_verificacion:
#             raise ValidationError('No se encuentra un código de verificación asociado a este usuario')

#         minutos = (current_time - doble_verificacion.fecha_verificacion).total_seconds() / 60.0
        
#         if minutos > 5:
#             raise ValidationError('El código ingresado ha expirado')
        
#         if doble_verificacion.codigo_verificacion != codigo:
#             raise ValidationError('El código es inválido. Intente nuevamente')

#         doble_verificacion.verificacion_exitosa = True
#         doble_verificacion.save()

#         data_out = {
#             'id_verificacion_2fa': doble_verificacion.id_verificacion_2fa,
#             'id_2fa_persona': doble_verificacion.id_2fa_persona.id_2fa_persona,
#             'codigo_verificacion': doble_verificacion.codigo_verificacion,
#             'verificacion_exitosa': doble_verificacion.verificacion_exitosa,
#             'fecha_verificacion': doble_verificacion.fecha_verificacion.strftime("%Y-%m-%d %H:%M:%S")
#         }

#         if 'id_documento_generado' in request.data:
#             id_documento_generado = request.data['id_documento_generado']
#             documento = DocumentosGenerados.objects.filter(id_documento_generado=id_documento_generado).first()
#             if documento:
#                 serializer = self.update_signing(request, documento)
#                 if serializer:
#                     asignacion = AsignacionDocs.objects.filter(id_documento_generado=documento.id_documento_generado, id_persona_asignada = persona.persona.id_persona, cod_estado_asignacion='Ac').first()
#                     asignacion.cod_estado_asignacion = 'Fi'
#                     asignacion.fecha_eleccion_estado = timezone.now()
#                     asignacion.save()

#                 data_out['documento'] = serializer.data

#         return Response({
#             'success': True,
#             'detail': 'El código es válido',
#             'data': data_out
#         }, status=status.HTTP_200_OK)
    
#     def update_signing(self, request, documento_generado):
#         firma_s3_path = request.user.firma_usuario.name
    
#         if firma_s3_path:
#             s3_client = boto3.client(
#                 's3',
#                 aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
#                 aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
#                 region_name=settings.AWS_S3_REGION_NAME
#             )
            
#             buffer = BytesIO()
#             s3_client.download_fileobj(
#                 settings.AWS_STORAGE_BUCKET_NAME,
#                 firma_s3_path,
#                 buffer
#             )
#             buffer.seek(0)
            
#             img_data = buffer.read()
#             encoded_img = base64.b64encode(img_data).decode('utf-8')
             
#         persona_firma = f'Firma_{request.user.persona.numero_documento}'
#         context = {
#             persona_firma: encoded_img
#         }

#         if documento_generado.variables:
#             variables_obj = documento_generado.variables
#             variables_obj.update(context)  
#         else:
#             variables_obj = context

#         actualizar_documento_class = GeneradorDocumentosView()
#         request.data['id_documento_generado'] = documento_generado.id_documento_generado
#         request.data['variables'] = variables_obj
#         documento_generado.variables = variables_obj    
#         documento_generado.save()
#         documento = actualizar_documento_class.actualizar_documento(request, persona_firma)
#         return documento

#     # def documento_finalizado(self, documento_generado):

#     #     asignaciones = AsignacionDocs.objects.filter(id_documento_generado=documento_generado.id_documento_generado)
#     #     print(asignaciones)

#     #     validar = []    
#     #     for asignacion in asignaciones:
#     #         if asignacion.cod_estado_asignacion == 'Fi':
#     #             print("pase el if")
#     #             validar.append(True)
#     #         else:
#     #             print("pase el else")
#     #             validar.append(False)
#     #     if False in validar:
#     #         print("pase el else de la validacion")
#     #         return False
#     #     else:
#     #         print("pase el else de la validacion2")
#     #         documento_generado.finalizado = True
#     #         print("pase el else de la validacion3")
#     #         print(documento_generado.variables)
#     #         documento_generado.save()
#     #         print("pase el else de la validacion4")
#     #         return True
    

class GetSuperUserList(generics.ListAPIView):
    serializer_class = SuperUserSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Verificar si la persona logueada no es un superusuario
        if not request.user.is_superuser:
            return Response({
                'success': False,
                'detail': 'El usuario logueado no es un superusuario y no puede acceder a esta información.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Obtener lista de superusuarios
        super_users = User.objects.filter(is_superuser=True).order_by('id_usuario') 
        
        if super_users.exists():
            serializador = self.serializer_class(super_users, many=True)
            return Response({
                'success': True,
                'detail': 'Se encontró la siguiente información del superusuario:',
                'data': serializador.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontró ningún superusuario'
            }, status=status.HTTP_404_NOT_FOUND)

class ChangeSuperUserView(generics.UpdateAPIView):
    serializer_class = ChangeSuperUserSerializer
    permission_classes = [IsAuthenticated]

    def put(self, request, id_persona):
        try:
            user = User.objects.get(persona_id=id_persona)  # Busca el usuario por ID de persona
        except User.DoesNotExist:
            return Response({
                'success': False,
                'detail': 'No se encontró un usuario con este ID de persona'
            }, status=status.HTTP_404_NOT_FOUND)

        # Validación: Si el usuario ya es superusuario, no hacer cambios
        if user.is_superuser:
            return Response({
                'success': False,
                'detail': f'El usuario {user.nombre_de_usuario} ya es superusuario y no puede ser cambiado'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Transacción atómica para mantener consistencia
        with transaction.atomic():
            # Desactivar el superusuario actual (si existe)
            previous_superuser = User.objects.filter(is_superuser=True).exclude(id_usuario=user.id_usuario).first()
            if previous_superuser:
                previous_superuser.is_superuser = False
                previous_superuser.save()

            # Promover al nuevo usuario a superusuario
            user.is_superuser = True
            user.save()

        return Response({
            'success': True,
            'detail': f'El usuario {user.nombre_de_usuario} ahora es superusuario. '
                      f'El usuario {previous_superuser.nombre_de_usuario} ya no es superusuario' if previous_superuser else '',
            'data': {
                'id_usuario': user.id_usuario,
                'nombre_de_usuario': user.nombre_de_usuario,
                'is_superuser': user.is_superuser
            }
        }, status=status.HTTP_200_OK)


class SegundoFactorAutenticacionGet(generics.ListAPIView):
    serializer_class = SegundoFactorAutenticacionSerielizer

    def get(self, request, *args, **kwargs):
        queryset = SegundoFactorAutenticacion.objects.all()

        if not queryset.exists():
            raise NotFound("No se encontraron métodos de segundo factor configurados.")

        serializer = self.serializer_class(queryset, many=True)
        return Response({
            "success": True,
            "detail": "Listado de métodos 2FA disponibles.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class SegundoFAPersonaGet(generics.ListAPIView):
    serializer_class = SegundoFAPersonaSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        persona = request.user.persona
        queryset = SegundoFAPersona.objects.filter(id_persona=persona, verificado=True)

        if not queryset.exists():
            return Response({
                "success": False,
                "detail": "El usuario no tiene métodos 2FA registrados."
            })

        serializer = self.serializer_class(queryset, many=True)

        return Response({
            "success": True,
            "detail": "Métodos 2FA del usuario.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


# class SegundoFAPersonaPost(generics.CreateAPIView):
#     serializer_class = SegundoFAPersonaSerializer
#     permission_classes = [IsAuthenticated]

#     def post(self, request, *args, **kwargs):
#         usuario = request.user
#         persona = usuario.persona
#         data = request.data.copy()

#         data["id_persona"] = persona.id_persona

#         id_2fa = data.get("id_2fa")
#         if not id_2fa:
#             raise ValidationError("Debe enviar el ID del método 2FA.")

#         segundo_factor = SegundoFactorAutenticacion.objects.filter(id_2fa=id_2fa).first()
#         if not segundo_factor:
#             raise ValidationError("El método 2FA solicitado no existe.")

#         # Buscar si ya existe un método de este tipo
#         existente = SegundoFAPersona.objects.filter(id_persona=persona, id_2fa=id_2fa).first()
#         if existente:
#             return Response({
#                 "success": False,
#                 "detail": "El usuario ya tiene este método 2FA registrado.",
#                 "data": {
#                     "id_2fa": existente.id_2fa.id_2fa,
#                     "tipo_2fa": existente.id_2fa.tipo_2fa,
#                     "descripcion": existente.id_2fa.descripcion
#                 }
#             }, status=status.HTTP_400_BAD_REQUEST)

#         # ======================================
#         # CONFIGURACIÓN SEGÚN EL TIPO DE FACTOR
#         # ======================================

#         if segundo_factor.tipo_2fa == "VEMAIL":
#             email = data.get("canal_verificacion")
#             data["email_verificacion"] = email or persona.email
#             if not data["email_verificacion"]:
#                 raise ValidationError("La persona no tiene email registrado.")

#         if segundo_factor.tipo_2fa in ["VSMS", "VWHATS"]:
#             telefono = data.get("canal_verificacion")
#             data["tel_verificacion"] = telefono or persona.telefono_celular
#             if not data["tel_verificacion"]:
#                 raise ValidationError("La persona no tiene teléfono registrado.")

#         # if segundo_factor.tipo_2fa == "VTOTP":
#         #     # Generar secret único
#         #     secret = pyotp.random_base32()
#         #     data["secret_key"] = secret
#         #     data["activo"] = False
#         #     data["verificado"] = False  # Pendiente de validar

#         # Guardar registro
#         serializer = self.serializer_class(data=data)
#         serializer.is_valid(raise_exception=True)
#         metodo = serializer.save()

#         usuario.tiene_2FA = True
#         usuario.save(update_fields=["tiene_2FA"])

#         return Response({
#             "success": True,
#             "detail": "Método 2FA registrado correctamente.",
#             "data": serializer.data
#         }, status=status.HTTP_201_CREATED)


class SegundoFAPersonaDelete(generics.DestroyAPIView):
    serializer_class = SegundoFAPersonaSerializer
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        metodo = SegundoFAPersona.objects.filter(id_2fa_persona=pk).first()

        if not metodo:
            raise NotFound("El método 2FA no existe.")

        metodo.delete()

        return Response({
            "success": True,
            "detail": "Método 2FA eliminado."
        }, status=status.HTTP_200_OK)


class CrearCodigoVerificacion(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]

    EXPIRACION_MINUTOS = 5 

    def post(self, request, pk):
        usuario = request.user
        persona = usuario.persona

        # Verificar método 2FA asociado al usuario
        metodo = SegundoFAPersona.objects.filter(
            id_2fa_persona=pk,
            id_persona=persona
        ).first()

        if not metodo:
            raise ValidationError("No tiene acceso a este método de verificación.")

        # Generar y guardar código OTP
        codigo = f"{secrets.randbelow(1_000_000):06}"
        ahora = timezone.now()
        expiracion = ahora + timedelta(minutes=self.EXPIRACION_MINUTOS)

        verificacion = Verificacion_2FA.objects.create(
            id_2fa_persona=metodo,
            codigo_verificacion=codigo,
            fecha_verificacion=ahora,
            canal=metodo.id_2fa.tipo_2fa,
            expiracion=expiracion
        )

        # Enviar código según el tipo de 2FA
        self._enviar_codigo(metodo, persona, codigo)

        return Response({
            "success": True,
            "detail": "Código enviado correctamente.",
            "data": {
                "id_verificacion_2fa": verificacion.id_verificacion_2fa,
                "fecha_envio": ahora,
                "expira_en": expiracion
            }
        }, status=status.HTTP_201_CREATED)

    def _enviar_codigo(self, metodo, persona, codigo):
        tipo = metodo.id_2fa.tipo_2fa

        if tipo == "VSMS":
            Util.send_sms(
                metodo.tel_verificacion,
                f"Su código de verificación es: {codigo}"
            )

        elif tipo == "WAPP":
            Util.send_whatsapp(
                metodo.tel_verificacion,
                f"Su código de verificación es: {codigo}"
            )

        elif tipo == "VEMAIL":
            nombre = self._obtener_nombre_persona(persona)

            context = {
                'fecha_actual': str(datetime.now().replace(microsecond=0)),
                'email': metodo.email_verificacion,
                'nombre_de_usuario': Util.limpiar_caracteres_unicode(nombre),
                'verification_code_str': codigo
            }

            template = render_to_string("codigo-verificacion-firma.html", context)

            email_data = {
                'template': template,
                'email_subject': Util.limpiar_caracteres_unicode("Código de verificación"),
                'to_email': metodo.email_verificacion
            }

            Util.send_email(email_data)

    def _obtener_nombre_persona(self, persona):
        if persona.tipo_persona == "N":
            return f"{persona.primer_nombre} {persona.primer_apellido}"
        return persona.razon_social


class VerificarCodigoVerificacion(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    MAX_INTENTOS = 4  

    def put(self, request, *args, **kwargs):
        usuario = request.user
        persona = usuario.persona

        codigo = request.data.get("codigo")

        if not codigo:
            raise ValidationError("Debe enviar el código de verificación.")

        per_2fa = SegundoFAPersona.objects.filter(
            id_persona=persona
        ).first()

        # Obtener el ultimo registro de verificación
        # Obtener el ultimo registro de verificación
        ver = Verificacion_2FA.objects.filter(
            id_2fa_persona=per_2fa,
        ).select_related(
            "id_2fa_persona", 
            "id_2fa_persona__id_2fa"
        ).order_by('-fecha_verificacion').first()

        if not ver:
            raise ValidationError("No existe esta solicitud de verificación.")

        metodo = ver.id_2fa_persona  # 2FA_Persona
        tipo = metodo.id_2fa.tipo_2fa  # VSMS, VEMAIL, VTOTP

        # Seguridad: validar que pertenece al usuario autenticado
        if metodo.id_persona != persona:
            raise ValidationError("No tiene acceso a este método.")

        #  Bloqueo por intentos
        if ver.intentos >= self.MAX_INTENTOS:
            raise ValidationError("Ha superado el número máximo de intentos permitidos.")

        # ============================================
        #  VALIDACIÓN SEGÚN EL TIPO DE 2FA
        # ============================================

        ahora = timezone.now()

        # 🍀 1. VALIDACIÓN EMAIL O SMS (CÓDIGOS OTP)
        if tipo in ("VSMS", "VEMAIL"):

            # Expiración
            if ver.expiracion and ahora > ver.expiracion:
                raise ValidationError("El código ha expirado. Solicite uno nuevo.")

            # Código incorrecto
            if ver.codigo_verificacion != codigo:
                ver.intentos += 1
                ver.save(update_fields=["intentos"])
                raise ValidationError("El código es incorrecto.")

        # 🍀 2. VALIDACIÓN TOTP (GOOGLE AUTHENTICATOR)
        elif tipo == "VTOTP":
            import pyotp

            totp = pyotp.TOTP(metodo.totp_secret)

            if not totp.verify(codigo):
                ver.intentos += 1
                ver.save(update_fields=["intentos"])
                raise ValidationError("El código TOTP no es válido.")

        else:
            raise ValidationError(f"Tipo de verificación '{tipo}' no soportado.")

        # ----- Si llegamos aquí → código correcto -----

        ver.verificacion_exitosa = True
        ver.intentos = 0
        ver.fecha_validacion = ahora
        ver.save(update_fields=["verificacion_exitosa", "intentos", "fecha_validacion"])

        metodo.verificado = True
        metodo.save(update_fields=["verificado"])

        return Response({
            "success": True,
            "detail": "Código verificado correctamente.",
            "data": {
                "id_2fa_persona": metodo.id_2fa_persona,
                "canal": tipo,
                "estado": "verificado",
                "fecha_validacion": ahora
            }
        }, status=status.HTTP_200_OK)

# class VerificarCodigoVerificacion(APIView):
#     permission_classes = [IsAuthenticated]
#     MAX_INTENTOS = 4  

#     def post(self, request):
#         usuario = request.user
#         persona = usuario.persona

#         codigo = request.data.get("codigo")
#         id_verificacion = request.data.get("id_verificacion_2fa")

#         if not codigo:
#             raise ValidationError("Debe enviar el código de verificación.")

#         if not id_verificacion:
#             raise ValidationError("Debe enviar el ID de la verificación.")

#         # Obtener registro de verificación
#         ver = Verificacion_2FA.objects.filter(
#             id_verificacion_2fa=id_verificacion
#         ).select_related("id_2fa_persona", "id_2fa_persona__id_2fa").first()

#         if not ver:
#             raise ValidationError("No existe esta solicitud de verificación.")

#         metodo = ver.id_2fa_persona  
#         tipo = metodo.id_2fa.tipo_2fa  

#         # Validar propietario
#         if metodo.id_persona != persona:
#             raise ValidationError("No tiene acceso a este método.")

#         ahora = timezone.now()

#         # Limite de intentos
#         if ver.intentos >= self.MAX_INTENTOS:
#             raise ValidationError("Ha superado el número máximo de intentos permitidos.")

#         # Validaciones por tipo
#         if tipo in ("VSMS", "VEMAIL"):
#             if ver.expiracion and ahora > ver.expiracion:
#                 raise ValidationError("El código ha expirado. Solicite uno nuevo.")

#             if ver.codigo_verificacion != codigo:
#                 ver.intentos += 1
#                 ver.codigo_ingresado = codigo
#                 ver.save(update_fields=["intentos", "codigo_ingresado"])
#                 raise ValidationError("El código es incorrecto.")

#         elif tipo == "VTOTP":
#             import pyotp
#             totp = pyotp.TOTP(metodo.totp_secret)
#             if not totp.verify(codigo):
#                 ver.intentos += 1
#                 ver.codigo_ingresado = codigo
#                 ver.save(update_fields=["intentos", "codigo_ingresado"])
#                 raise ValidationError("El código TOTP no es válido.")

#         # Código correcto
#         ver.verificacion_exitosa = True
#         ver.intentos = 0
#         ver.fecha_validacion = ahora
#         ver.codigo_ingresado = codigo
#         ver.save(update_fields=[
#             "verificacion_exitosa", 
#             "intentos",
#             "fecha_validacion", 
#             "codigo_ingresado"
#         ])

#         metodo.verificado = True
#         metodo.save(update_fields=["verificado"])

#         return Response({
#             "success": True,
#             "detail": "Código verificado correctamente.",
#         }, status=200)

class GenerarTOTPView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TOTPGenerateSerializer
    serializer_class_2FA = SegundoFAPersonaTOTPSerializer

    def post(self, request):
        usuario = request.user
        persona = usuario.persona
        data = request.data.copy()
        id_2fa = SegundoFactorAutenticacion.objects.filter(tipo_2fa="VTOTP").first().id_2fa

        data["id_persona"] = persona.id_persona
        data["id_2fa"] = id_2fa

        segundo_factor = SegundoFactorAutenticacion.objects.filter(id_2fa=id_2fa).first()
        if not segundo_factor:
            raise ValidationError("El método 2FA solicitado no existe.")

        # Buscar si ya existe un método de este tipo
        existente = SegundoFAPersona.objects.filter(id_persona=persona, id_2fa=id_2fa, verificado=True).first()
        if existente:
            return Response({
                "success": False,
                "detail": "El usuario ya tiene este método 2FA registrado.",
                "data": {
                    "id_2fa": existente.id_2fa.id_2fa,
                    "tipo_2fa": existente.id_2fa.tipo_2fa,
                    "descripcion": existente.id_2fa.descripcion
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        existente_2 = SegundoFAPersona.objects.filter(id_persona=persona, id_2fa=id_2fa, verificado=False).first()
        if existente_2:
            existente_2.delete()

        if segundo_factor.tipo_2fa != "VTOTP":
            return Response({
                "success": False,
                "detail": "El método 2FA no es correcto."
            }, status=status.HTTP_400_BAD_REQUEST)


        secret = pyotp.random_base32()
        data["secret_key"] = secret
        data["activo"] = False
        data["verificado"] = False  # Pendiente de validar

        # Guardar registro
        serializer = self.serializer_class_2FA(data=data)
        serializer.is_valid(raise_exception=True)
        metodo = serializer.save()

        issuer = "Fedecacao - AllPay"

        label = usuario.nombre_de_usuario or persona.email or "Fedecacao"

        totp = pyotp.TOTP(secret)
        otpauth_url = totp.provisioning_uri(
            name=label,
            issuer_name=issuer
        )

        qr = qrcode.make(otpauth_url)
        buffer = BytesIO()
        qr.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            "success": True,
            "detail": "QR TOTP generado correctamente",
            "data": {
                "secret": secret,
                "qr_base64": f"data:image/png;base64,{qr_base64}",
                "otpauth_url": otpauth_url
            }
        }, status=status.HTTP_200_OK)


class ValidarTOTPView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TOTPValidateSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        codigo = serializer.validated_data["codigo"]
        usuario = request.user
        persona = usuario.persona
        id_2fa = SegundoFactorAutenticacion.objects.filter(tipo_2fa="VTOTP").first().id_2fa
        metodo = SegundoFAPersona.objects.filter(id_2fa=id_2fa, id_persona=persona, verificado=True).first()

        if not metodo:
            raise ValidationError("No existe configuración TOTP verificado para este usuario.")

        if not metodo.secret_key:
            raise ValidationError("No existe un TOTP pendiente de validar.")

        totp = pyotp.TOTP(metodo.secret_key)

        if not totp.verify(codigo, valid_window=1):
            raise ValidationError("El código TOTP ingresado es incorrecto.")

        return Response({
            "success": True,
            "detail": "Código válido. Puedes continuar."
        }, status=200)


class ActivarTOTPView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TOTPValidateActivateSerializer

    def put(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        codigo = serializer.validated_data["codigo"]
        usuario = request.user
        persona = usuario.persona
        id_2fa = SegundoFactorAutenticacion.objects.filter(tipo_2fa="VTOTP").first().id_2fa

        metodo = SegundoFAPersona.objects.filter(
            id_2fa=id_2fa,
            id_persona=persona
        ).first()

        if not metodo:
            raise ValidationError("No existe configuración TOTP para este usuario.")

        if metodo.verificado:
            raise ValidationError("El TOTP ya está activado y verificado.")

        if not metodo.secret_key:
            raise ValidationError("No hay TOTP pendiente por activar.")

        totp = pyotp.TOTP(metodo.secret_key)

        if not totp.verify(codigo, valid_window=1):
            raise ValidationError("El código TOTP es incorrecto.")

        # eliminar los demas
        metodo_eli = SegundoFAPersona.objects.filter(
            id_persona=persona
        ).exclude(
            id_2fa_persona=metodo.id_2fa_persona
        )

        # Guardar activación real
        metodo.activo = True
        metodo.verificado = True
        metodo.save(update_fields=["activo", "verificado"])

        if metodo.activo == True:
            metodo_eli.delete()
            # Actualizar el campo tiene_2FA en User
            usuario.tiene_2FA = True
            usuario.save(update_fields=['tiene_2FA'])

        return Response({
            "success": True,
            "detail": "El método TOTP fue activado correctamente."
        }, status=200)


