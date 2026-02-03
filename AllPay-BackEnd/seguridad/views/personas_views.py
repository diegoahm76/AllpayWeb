from urllib.parse import quote_plus
from django.http import Http404
import pytz
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from datetime import datetime, date
from rest_framework.decorators import APIView
import copy
import json
import uuid
from backend.settings import FRONTEND_URL
from permissions.permissions_seguridad import PermisoActualizarAdministracionDeCargos, PermisoActualizarAdministracionUsuarios, PermisoActualizarDocumentosDeIdentificacion, PermisoConsultarAdministracionDeCargos, PermisoConsultarDocumentosDeIdentificacion, PermisoCrearAdministracionDeCargos, PermisoCrearDocumentosDeIdentificacion, PermisoCrearUsuarioInterno, PermisoEliminarAdministracionDeCargos, PermisoEliminarDocumentosDeIdentificacion
from seguridad.models.alertas_models import ConfiguracionClaseAlerta
from seguridad.utils import (
    convertir_valores_a_string,
    historico_direcciones_validacion,
    historico_representante_validacion
)
from django.template.loader import render_to_string
from recaudos.utils import Utils
#from seguridad.permissions.permissions_seguridad import PermisoActualizarAutorizacionNotificacionesCuentaPropia
#from seguridad.permissions.permissions_transversal import PermisoActualizarAdministracionPersonas, PermisoActualizarCargos, PermisoActualizarDatosPersonalesModificacionRestringida, PermisoBorrarCargos, PermisoCrearAdministracionPersonas, PermisoCrearCargos
from seguridad.serializers.user_serializers import RegisterExternoSerializer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from seguridad.utils import Util
from rest_framework import status
from django.db.models import Q, Exists, OuterRef
from datetime import datetime
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.http import Http404
from django.db.models.fields.files import FieldFile
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist

#from dateutil.parser import parse
# from seguridad.permissions.permissions_transversal import (
#     PermisoActualizarTiposDocumentosID,
#     PermisoBorrarEstadoCivil,
#     PermisoBorrarTiposDocumentosID,
#     PermisoCrearEstadoCivil,
#     PermisoActualizarEstadoCivil,
#     PermisoCrearTiposDocumentosID
#     )
from seguridad.models.transversal_models import (
    Cargos,
    DocumentosPersona,
    TipoDocumento,
    TipoComprador,
    HistoricoDireccion,
    HistoricoRepresentLegales,
    Departamento,
    Municipio,
    Personas,
    Paises,
    Sexo,
    IdentificacionTemporal
)
from seguridad.models.seguridad_models import (
    User,
    UsuariosRol,
    Roles,
    Modulos,
    Permisos,
    Auditorias,
)

from seguridad.serializers.transversal_serializers import (
    DatosPersonaPagosSerializer,
    DocumentosPersonaSerializer,
    MunicipiosCacaoterosSerializer,
    PersonaFirmanDocumentosSerializer,
    PersonaNaturalPostAdminSerializer,
    PersonaNaturalUpdateAdminSerializer,
    PersonasFilterAdminUserSerializer,
    PersonasFilterRepresentanteSerializer,
    ProveedorSerializer,
    RepresentanteLegalSerializer,
    TipoDocumentoSerializer,
    TipoDocumentoPostSerializer,
    TipoDocumentoPutSerializer,
    TipoCompradorSerializer,
    TipoCompradorPostSerializer,
    TipoCompradorPutSerializer,
    UsuarioTipoCompradorSerializer,
    UsuarioUbicacionSerializer,
    PersonasSerializer,
    PersonaNaturalPostSerializer,
    PersonaJuridicaPostSerializer,
    PersonaNaturalUpdateSerializer,
    PersonaJuridicaUpdateSerializer,
    HistoricoDireccionSerializer,
    GetPersonaJuridicaByRepresentanteLegalSerializer,
    CargosSerializer,
    PersonasFilterSerializer,
    HistoricoRepresentLegalSerializer,
    DepartamentosSerializer,
    MunicipiosSerializer,
    MunicipioSerializer,
    MunicipioCreateSerializer,
    MunicipioUpdateSerializer,
    PaisesSerializer,
    SexoSerializer,
    IdentificacionTemporalSerializer
)

from django.conf import settings
import jwt
from django.db import transaction
from rest_framework.pagination import PageNumberPagination
import math
from django.db.models import Q
from django.conf import settings



#Tamaño de archivos

# Definir tamaño máximo de archivos (10MB)
max_file_size = settings.FILE_UPLOAD_MAX_MEMORY_SIZE

# Definir extensiones permitidas
ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"]
ALLOWED_DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]

def validate_file(file, allowed_extensions):    

    # Validar tamaño
    if file.size > max_file_size:
        tamaño_total = {max_file_size / (1024 * 1024)}
        raise ValidationError(f"El archivo {file.name} es demasiado grande. Tamaño máximo permitido: {tamaño_total}MB.")


    # Validar extensión
    extension = file.name.split('.')[-1].lower()
    if extension not in allowed_extensions:
        raise ValidationError(f"Formato de archivo no permitido para {file.name}. Extensiones permitidas: {', '.join(allowed_extensions)}")


        

# Views for Sexo
class GetSexo(generics.GenericAPIView):
    serializer_class = SexoSerializer

    def get(self, request):
        sexo = Sexo.objects.all()
        if sexo:
            serializer = self.serializer_class(sexo, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron datos', 'data': []}, status=status.HTTP_404_NOT_FOUND)


# Views for Paises
class GetPaises(generics.GenericAPIView):
    serializer_class = PaisesSerializer

    def get(self, request):
        pais = Paises.objects.all().order_by('nombre')
        if pais:
            serializer = self.serializer_class(pais, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes paises', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron paises', 'data': []}, status=status.HTTP_404_NOT_FOUND)



# Views for Departamento
class GetDepartamento(generics.GenericAPIView):
    serializer_class = DepartamentosSerializer

    def get(self, request, pk):
        if pk:
            departamentos = Departamento.objects.filter(pais=pk)
            if departamentos:
                serializer = self.serializer_class(departamentos, many=True)
                return Response({'success':True, 'detail':'Se encontraron los siguientes departamentos', 'data': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response({'success':False, 'detail':'No se encontraron departamentos'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'success':False, 'detail':'Codigo del pais es requerido'}, status=status.HTTP_404_NOT_FOUND)

# View municipio por su departamento
class GetMunicipio(generics.GenericAPIView):
    serializer_class = MunicipiosSerializer

    def get(self, request, pk):
        if pk:
            municipios = Municipio.objects.filter(cod_departamento=pk).order_by('nombre')
            if municipios:
                serializer = self.serializer_class(municipios, many=True)
                return Response({'success':True, 'detail':'Se encontraron los siguientes municipios', 'data': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response({'success':False, 'detail':'No se encontraron municipios a la busqueda asociada', 'data': []}, status=status.HTTP_404_NOT_FOUND)
        else:
            raise NotFound('No se envio el parametro de id departamento')

class GetMunicipiosCacaoteros(generics.GenericAPIView):
    serializer_class = MunicipiosCacaoterosSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # Validar si existe el departamento
        if not Departamento.objects.filter(pk=pk).exists():
            return Response({
                'success': False,
                'detail': 'El departamento no existe.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Filtrar municipios cacaoteros del departamento
        municipios = Municipio.objects.filter(cod_departamento=pk, es_cacaotero=True).order_by('nombre')
        if municipios.exists():
            serializer = self.serializer_class(municipios, many=True)
            return Response({
                'success': True,
                'detail': 'Se encontraron los siguientes municipios cacaoteros',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron municipios cacaoteros para el departamento',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

class GetDepartamentoCacaotero(generics.GenericAPIView):
    serializer_class = DepartamentosSerializer

    def get(self, request, pk):
        if pk:
            # Traer departamentos del país que tengan al menos un municipio cacaotero
            departamentos = Departamento.objects.filter(
                pais=pk,
                municipio__es_cacaotero=True
            ).distinct()
            if departamentos.exists():
                serializer = self.serializer_class(departamentos, many=True)
                return Response({
                    'success': True,
                    'detail': 'Se encontraron los siguientes departamentos con municipios cacaoteros',
                    'data': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'detail': 'No se encontraron departamentos con municipios cacaoteros'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({
                'success': False,
                'detail': 'Codigo del pais es requerido'
            }, status=status.HTTP_404_NOT_FOUND)

# Views for Tipo Documento
class GetTipoDocumento(generics.GenericAPIView):
    serializer_class = TipoDocumentoSerializer
    permission_classes = [AllowAny]

    def get(self, request):
        active = request.query_params.get('activo')
        tipoDocumento = TipoDocumento.objects.filter(activo=active).order_by('cod_tipo_documento')

        
        if tipoDocumento.exists():
            serializer = self.serializer_class(tipoDocumento, many=True)
            return Response({'success': True, 'detail': 'Se encontraron los siguientes tipos de documentos', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success': False, 'detail': 'No se encontraron tipos de documentos'}, status=status.HTTP_404_NOT_FOUND)

class GetTipoDocumentoRegistro(generics.GenericAPIView):
    serializer_class = TipoDocumentoSerializer

    def get(self, request):
        active = request.query_params.get('activo')
        tipoDocumento = TipoDocumento.objects.filter(activo=active).order_by('cod_tipo_documento')

        
        if tipoDocumento.exists():
            serializer = self.serializer_class(tipoDocumento, many=True)
            return Response({'success': True, 'detail': 'Se encontraron los siguientes tipos de documentos', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success': False, 'detail': 'No se encontraron tipos de documentos'}, status=status.HTTP_404_NOT_FOUND)

class GetTipoDocumentoById(generics.RetrieveAPIView):
    serializer_class = TipoDocumentoSerializer
    permission_classes = [IsAuthenticated] 

    def get(self, request, pk):
        if pk:
            tipo_documentos = TipoDocumento.objects.filter(cod_tipo_documento=pk, activo=True)
            if tipo_documentos:
                serializer = self.serializer_class(tipo_documentos, many=True)
                return Response({'success':True, 'detail':'Se encontro el siguiente dato', 'data': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response({'success':False, 'detail':'No se encontró ningún tipo de documento con estos parámetros o esta inactivo'}, status=status.HTTP_404_NOT_FOUND)
        else:
            raise NotFound('No se envio el id del tipo de documento')


class DeleteTipoDocumento(generics.RetrieveDestroyAPIView):
    serializer_class = TipoDocumentoSerializer
    permission_classes = [IsAuthenticated, PermisoEliminarDocumentosDeIdentificacion]
    queryset = TipoDocumento.objects.all()

    def delete(self, request, pk):
        tipo_documento = TipoDocumento.objects.filter(cod_tipo_documento=pk).first()
        if tipo_documento:
            if tipo_documento.precargado == False:
                if tipo_documento.item_ya_usado == True:
                    raise PermissionDenied('Este tipo de documento ya está siendo usado, por lo cúal no es eliminable')
                tipo_documento.delete()
                return Response({'success':True, 'detail':'Este tipo de documento ha sido eliminado exitosamente'}, status=status.HTTP_200_OK)
            else:
                raise PermissionDenied('No puedes eliminar un tipo de documento precargado')
        else:
            raise NotFound('No se encontró ningún tipo de documento con estos parámetros')


class RegisterTipoDocumento(generics.CreateAPIView):
    serializer_class = TipoDocumentoPostSerializer
    permission_classes = [IsAuthenticated, PermisoCrearDocumentosDeIdentificacion]

    def post(self, request):
        data = request.data
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({'success':True, 'detail':'Se creo el tipo de documento correctamente'}, status=status.HTTP_201_CREATED)



class UpdateTipoDocumento(generics.RetrieveUpdateAPIView):
    serializer_class = TipoDocumentoPutSerializer
    queryset = TipoDocumento.objects.all()
    permission_classes = [IsAuthenticated, PermisoActualizarDocumentosDeIdentificacion]

    def put(self, request, pk):
        tipo_documento = TipoDocumento.objects.filter(cod_tipo_documento=pk).first()
        if tipo_documento:
            if tipo_documento.precargado == False:
                if tipo_documento.item_ya_usado == True:
                    raise PermissionDenied('Este tipo de documento ya está siendo usado, por lo cúal no es actualizable')

                serializer = self.serializer_class(tipo_documento, data=request.data, many=False)
                serializer.is_valid(raise_exception=True)
                serializer.save()

                return Response({'success':True, 'detail':'Registro actualizado exitosamente'}, status=status.HTTP_200_OK)
            else:
                raise PermissionDenied('Este es un dato precargado en el sistema, no se puede actualizar')
        else:
            raise NotFound('No se encontró ningún tipo de documento con estos parámetros')


# Views for Personas

class GetPersonasByTipoDocumentoAndNumeroDocumento(generics.GenericAPIView):
    serializer_class = PersonasFilterRepresentanteSerializer
    queryset = Personas.objects.all()

    def get(self, request, tipodocumento, numerodocumento):
        persona = self.queryset.all().filter(tipo_documento=tipodocumento, numero_documento=numerodocumento).first()
        if persona:
            persona_serializer = self.serializer_class(persona)
            return Response({'success':True, 'detail':'Se encontró la siguiente persona', 'data': persona_serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No existe una persona con los parametros ingresados'}, status=status.HTTP_404_NOT_FOUND)

class GetPersonasByID(generics.GenericAPIView):
    serializer_class = PersonasFilterSerializer
    queryset = Personas.objects.all()
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        persona = Personas.objects.filter(id_persona=pk)
        if persona:
            serializer = self.serializer_class(persona, many=True)
            return Response({'success':True, 'detail':'Se encontró la persona.','data':serializer.data }, status=status.HTTP_200_OK)
        else:
            raise NotFound('No encontró ninguna persona con los parametros ingresados')

class GetPersonaJuridicaByRepresentanteLegal(generics.ListAPIView):
    serializer_class=GetPersonaJuridicaByRepresentanteLegalSerializer

    permission_classes=[IsAuthenticated]
    queryset = Personas.objects.all()

    def get(self,request):
        persona= request.user.persona
        representante_legal=self.queryset.all().filter(representante_legal=persona)
        if representante_legal:
            persona_serializada = self.serializer_class(representante_legal,many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes datos.','data': persona_serializada.data}, status=status.HTTP_200_OK)
        raise NotFound('No está asociado en ninguna empresa como representante legal')


# class UpdatePersonaNaturalByself(generics.RetrieveUpdateAPIView):
#     http_method_names = ['patch']
#     serializer_class = PersonaNaturalUpdateSerializer
#     permission_classes = [IsAuthenticated]


#     def patch(self, request):
#         data = request.data
#         persona = request.user.persona
#         previous_persona = copy.copy(persona)

#         if persona.tipo_persona != "N":
#             raise PermissionDenied('No se puede actualizar una persona jurídica con este servicio')

#         if persona.id_persona != persona.id_persona_crea.id_persona:

#             cambio = Util.comparacion_campos_actualizados(data,persona)
#             if cambio:
#                 data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
#                 data['id_persona_ultim_actualiz_diferente_crea'] = persona.id_persona
#         else:
#             data['fecha_ultim_actualiz_diferente_crea'] = None
#             data['id_persona_ultim_actualiz_diferente_crea'] = None

#         persona_serializada = self.serializer_class(persona, data=data, many=False)
#         persona_serializada.is_valid(raise_exception=True)

#         #PARA UTILIZARLO EN EL UTIL
#         data['tipo_persona'] = persona.tipo_persona

#         validaciones_persona = Util.guardar_persona(data)

#         if not validaciones_persona['success']:
#             return Response({'success':validaciones_persona['success'], 'detail':validaciones_persona['detail']}, status=validaciones_persona['status'])

#         serializador = persona_serializada.save()

#         # Historico de direcciónes
#         historico_direcciones_validacion(request.data, previous_persona, False)

#         # auditoria actualizar persona
#         usuario = request.user.id_usuario
#         direccion=Util.get_client_ip(request)
#         descripcion = {"Mensaje": "Se actualizaron datos a la siguiente persona:","TipodeDocumentoID": str(serializador.tipo_documento.cod_tipo_documento), "NumeroDocumentoID": str(serializador.numero_documento), "PrimerNombre": str(serializador.primer_nombre), "PrimerApellido": str(serializador.primer_apellido)}

#         nuevo = {}
#         anterior = {}
#         # Verifico que campos cambiaron y los añado (los campos con llave foranea siempre se guardan)
#         for clave, valor in request.data.items():
#             info = convertir_valores_a_string(getattr(previous_persona, clave))
#             if info != data[clave]:
#                 nuevo[clave] = valor
#                 anterior[clave] = info

#         valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

#         auditoria_data = {
#             "id_usuario" : usuario,
#             "id_modulo" : 1,
#             "cod_permiso": "AC",
#             "subsistema": 'SEGU',
#             "dirip": direccion,
#             "descripcion": json.dumps(descripcion),
#             "valores_actualizados": json.dumps(valores_actualizados)
#         }

#         Util.save_auditoria(auditoria_data)

#         return Response({'success':True, 'detail':'Persona actualizada correctamente'}, status=status.HTTP_201_CREATED)



class UpdatePersonaNaturalByself(generics.RetrieveUpdateAPIView):
    http_method_names = ['patch']
    serializer_class = PersonaNaturalUpdateSerializer
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """
        Servicio para actualizar información de una persona natural, incluyendo representante legal,
        adjuntar documentos e imagen de perfil.
        """
        data = request.data.copy()
        persona = request.user.persona
        archivos = {}

        if persona.tipo_persona != "N":
            raise PermissionDenied('No se puede actualizar una persona jurídica con este servicio')

        # Copia previa de la persona para comparación
        persona_previous = copy.copy(persona)

        # Manejo de archivos adjuntos (archivo_rut, camaraComercio, documentoRepresentante, image_profile)
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            if file_key in request.FILES:
                archivo = request.FILES[file_key]
                validate_file(archivo, ALLOWED_DOCUMENT_EXTENSIONS)
                extension = archivo.name.split('.')[-1]
                archivo.name = f"{uuid.uuid4()}.{extension}"  # Renombrar archivo con UUID
                archivos[file_key] = archivo

        # Validación especial para la imagen de perfil
        if "image_profile" in request.FILES:
            archivo = request.FILES["image_profile"]
            validate_file(archivo, ALLOWED_IMAGE_EXTENSIONS)
            extension = archivo.name.split('.')[-1]
            archivo.name = f"{uuid.uuid4()}.{extension}"
            archivos["image_profile"] = archivo

        # Validación para la firma del usuario
        if 'firma_usuario' in request.FILES:
            firma_usuario = request.FILES['firma_usuario']
            validate_file(firma_usuario, ALLOWED_IMAGE_EXTENSIONS)
            extension = firma_usuario.name.split('.')[-1]
            firma_usuario.name = f"{uuid.uuid4()}.{extension}"
            archivos["firma_usuario"] = firma_usuario

        # Validación y actualización de Representante Legal
        representante_legal_id = persona.representante_legal.id_persona if persona.representante_legal else None

        if "representante_legal" in data:
            representante_legal_id = data.get("representante_legal")

            if representante_legal_id is not None and representante_legal_id != "":
                representante_legal = Personas.objects.filter(id_persona=representante_legal_id, tipo_persona="N").first()
                if not representante_legal:
                    return Response({
                        "success": False,
                        "detail": "El representante legal debe ser una persona natural válida."
                    }, status=status.HTTP_400_BAD_REQUEST)
                persona.representante_legal = representante_legal  #  Se actualiza el representante legal
            else:
                representante_legal_id = persona.representante_legal.id_persona if persona.representante_legal else None
                data.pop("representante_legal")  #  Se elimina del dict para no cambiar su valor

        # Validar si se requiere registrar fecha de última actualización diferente al creador
        if persona.id_persona_crea and persona.id_persona != persona.id_persona_crea.id_persona:
            cambio = Util.comparacion_campos_actualizados(data, persona)
            if cambio:
                data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
                data['id_persona_ultim_actualiz_diferente_crea'] = persona.id_persona
        else:
            data['fecha_ultim_actualiz_diferente_crea'] = None
            data['id_persona_ultim_actualiz_diferente_crea'] = None

        
        historico_direcciones_validacion(request.data, persona, False)


        # Serialización y validación de datos
        persona_serializada = self.serializer_class(persona, data=data, partial=True)
        persona_serializada.is_valid(raise_exception=True)

        # Guardar la información actualizada de la persona
        persona_actualizada = persona_serializada.save()

        # Eliminar archivos anteriores antes de asignar los nuevos
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            archivo_actual = getattr(persona_previous, file_key, None)
            if isinstance(archivo_actual, FieldFile) and archivo_actual and file_key in archivos:
                archivo_actual.delete(save=False)

        # Guardar los nuevos archivos en el modelo
        for file_key, file_value in archivos.items():
            setattr(persona_actualizada, file_key, file_value)
        persona_actualizada.save()

        # Manejo especial de la imagen de perfil (`image_profile`) en `User`
        try:
            usuario = User.objects.get(persona=persona_actualizada)
            if "image_profile" in archivos:
                validate_file(archivos["image_profile"], ALLOWED_IMAGE_EXTENSIONS)
                if usuario.image_profile:
                    usuario.image_profile.delete(save=False)  # Eliminar imagen anterior de S3/local
                usuario.image_profile = archivos["image_profile"]
                usuario.save(update_fields=["image_profile"])

            if "firma_usuario" in archivos:
                validate_file(archivos["firma_usuario"], ALLOWED_IMAGE_EXTENSIONS)
                if usuario.firma_usuario:
                    usuario.firma_usuario.delete(save=False)
                usuario.firma_usuario = archivos["firma_usuario"]
                usuario.save(update_fields=["firma_usuario"])
                
        except User.DoesNotExist:
            return Response({'success': False, 'detail': 'El usuario asociado no existe'}, status=status.HTTP_400_BAD_REQUEST)
        
        

        # Auditoría de actualización de persona
        usuario_id = request.user.id_usuario
        direccion = Util.get_client_ip(request)
        descripcion = {
            "Mensaje": "Se actualizaron datos de la persona natural:",
            "TipodeDocumentoID": str(persona_actualizada.tipo_documento.cod_tipo_documento),
            "NumeroDocumentoID": str(persona_actualizada.numero_documento),
            "PrimerNombre": str(persona_actualizada.primer_nombre),
            "PrimerApellido": str(persona_actualizada.primer_apellido),
            "RepresentanteLegalID": representante_legal_id if representante_legal_id else None
        }

        # Construcción de respuesta con URLs de los archivos
        respuesta_data = {
            "id_persona": persona_actualizada.id_persona,
            "primer_nombre": persona_actualizada.primer_nombre,
            "primer_apellido": persona_actualizada.primer_apellido,
            "tipo_documento": persona_actualizada.tipo_documento.cod_tipo_documento,
            "numero_documento": persona_actualizada.numero_documento,
            "representante_legal": representante_legal_id if representante_legal_id else None,
            "archivo_rut": request.build_absolute_uri(persona_actualizada.archivo_rut.url) if persona_actualizada.archivo_rut else None,
            "camaraComercio": request.build_absolute_uri(persona_actualizada.camaraComercio.url) if persona_actualizada.camaraComercio else None,
            "documentoRepresentante": request.build_absolute_uri(persona_actualizada.documentoRepresentante.url) if persona_actualizada.documentoRepresentante else None,
            "image_profile": request.build_absolute_uri(usuario.image_profile.url) if usuario.image_profile else None,
            "firma_usuario": request.build_absolute_uri(usuario.firma_usuario.url) if usuario.firma_usuario else None
        }
        #Agregar código + nombre si se actualizaron esos campos
        if data.get("pais_nacimiento") and persona_actualizada.pais_nacimiento:
            respuesta_data["pais_nacimiento"] = persona_actualizada.pais_nacimiento.cod_pais
            respuesta_data["pais_nacimiento_nombre"] = persona_actualizada.pais_nacimiento.nombre

        if data.get("municipio_residencia") and persona_actualizada.municipio_residencia:
            respuesta_data["municipio_residencia"] = persona_actualizada.municipio_residencia.cod_municipio
            respuesta_data["municipio_residencia_nombre"] = persona_actualizada.municipio_residencia.nombre

        if data.get("cod_municipio_notificacion_nal") and persona_actualizada.cod_municipio_notificacion_nal:
            respuesta_data["cod_municipio_notificacion_nal"] = persona_actualizada.cod_municipio_notificacion_nal.cod_municipio
            respuesta_data["cod_municipio_notificacion_nombre"] = persona_actualizada.cod_municipio_notificacion_nal.nombre

        if data.get("cod_municipio_expedicion_id") and persona_actualizada.cod_municipio_expedicion_id:
            respuesta_data["cod_municipio_expedicion_id"] = persona_actualizada.cod_municipio_expedicion_id.cod_municipio
            respuesta_data["municipio_expedicion_nombre"] = persona_actualizada.cod_municipio_expedicion_id.nombre

        return Response({
            'success': True,
            'detail': 'Persona actualizada correctamente',
            'data': respuesta_data
        }, status=status.HTTP_200_OK)

    
        


# class UpdatePersonaNaturalAdminPersonas(generics.UpdateAPIView):
#     serializer_class = PersonaNaturalUpdateAdminSerializer
#     permission_classes = [IsAuthenticated]
#     queryset = Personas.objects.all()

#     def put(self,request,id_persona):

#         data = request.data
#         persona_logueada = request.user.persona.id_persona
#         persona = self.queryset.all().filter(id_persona = id_persona).first()
#         id_cargo = data.get('id_cargo', None)
#         tipo_documento = data.get('tipo_documento', None)

#         if persona:
#             persona_previous = copy.copy(persona)
#             if persona.direccion_notificaciones != None:
#                 if data["direccion_notificaciones"] == None:
#                     raise PermissionDenied('No se puede dejar en blanco debido a que ya había una dirección de notificación')

#             if persona.tipo_persona != "N":
#                 raise PermissionDenied('No se puede actualizar una persona jurídica con este servicio')

#             cambio = Util.comparacion_campos_actualizados(data,persona)

#             if persona_logueada != persona.id_persona_crea.id_persona:

#                 if cambio:
#                     data['fecha_ultim_actualiz_diferente_crea'] = datetime.now().date()
#                     data['id_persona_ultim_actualiz_diferente_crea'] = persona_logueada
#             else:
#                 data['fecha_ultim_actualiz_diferente_crea'] = None
#                 data['id_persona_ultim_actualiz_diferente_crea'] = None
#             persona_serializada = self.serializer_class(persona, data=data, many=False)
#             persona_serializada.is_valid(raise_exception=True)

#             #PARA UTILIZARLO EN EL UTIL
#             data['tipo_persona'] = persona.tipo_persona

#             validaciones_persona = Util.guardar_persona(data)

#             if not validaciones_persona['success']:
#                 return Response({'success':validaciones_persona['success'], 'detail':validaciones_persona['detail']}, status=validaciones_persona['status'])

#             persona_actualizada = persona_serializada.save()

#             persona_actualizada.fecha_ultim_actualiz_diferente_crea = datetime.now()
#             persona_actualizada.id_persona_ultim_actualiz_diferente_crea = request.user.persona
#             persona_actualizada.save()

#             if id_cargo:
#                 cargo = Cargos.objects.filter(id_cargo=id_cargo)
#                 if cargo:
#                     cargo.update(item_ya_usado=True)

#             if tipo_documento:
#                 tipo = TipoDocumento.objects.filter(cod_tipo_documento=tipo_documento)
#                 if tipo:
#                     tipo.update(item_ya_usado=True)

#             fecha_inicio = data.get("fecha_inicio_cargo_actual")
#             if not fecha_inicio:
#                     fecha_inicio = datetime.now()
#             else:
#                 fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
#                 fecha_ahora = date.today()
#                 if fecha_formateada > fecha_ahora:
#                     raise PermissionDenied('La fecha de inicio del cargo no debe ser superior a la del sistema')

#             fecha_fin = data.get("fecha_a_finalizar_cargo_actual")
#             if not fecha_fin:
#                     fecha_fin = datetime.now()
#             else:
#                 fecha_formateada_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
#                 fecha_ahora = date.today()
#                 if fecha_formateada_fin < fecha_formateada:
#                     raise PermissionDenied('La fecha de fin del cargo no debe ser inferior a la fecha de inicio del cargo')

#             # Historico de direcciónes
#             historico_direcciones_validacion(request.data, persona_previous, False)

#             # AUDITORIA ACTUALIZAR PERSONA
#             usuario = request.user.id_usuario
#             direccion=Util.get_client_ip(request)
#             descripcion = {"Mensaje": "Se actualizaron datos a la siguiente persona natural por administrador:","TipodeDocumentoID": str(persona_actualizada.tipo_documento.cod_tipo_documento), "NumeroDocumentoID": str(persona_actualizada.numero_documento), "PrimerNombre": str(persona_actualizada.primer_nombre), "PrimerApellido": str(persona_actualizada.primer_apellido)}

#             nuevo = {}
#             anterior = {}
#             # Verifico que campos cambiaron y los añado (los campos con llave foranea siempre se guardan)
#             for clave, valor in request.data.items():
#                 info = convertir_valores_a_string(getattr(persona_previous, clave))
#                 if info != data[clave]:
#                     nuevo[clave] = valor
#                     anterior[clave] = info

#             valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

#             auditoria_data = {
#                 "id_usuario" : usuario,
#                 "id_modulo" : 1,
#                 "cod_permiso": "AC",
#                 "subsistema": 'SEGU',
#                 "dirip": direccion,
#                 "descripcion": json.dumps(descripcion),
#                 "valores_actualizados": json.dumps(valores_actualizados)
#             }
#             Util.save_auditoria(auditoria_data)

#             return Response({'success':True, 'detail':'Se actualizó la persona correctamente'},status=status.HTTP_200_OK)

#         raise NotFound('No existe la persona')


class UpdatePersonaNaturalAdminPersonas(generics.UpdateAPIView):
    serializer_class = PersonaNaturalUpdateAdminSerializer
    permission_classes = [IsAuthenticated, PermisoActualizarAdministracionUsuarios]
    queryset = Personas.objects.all()
    lookup_field = "id_persona"

    def patch(self, request, id_persona):
        """
        Servicio para actualizar parcialmente la información de una persona natural
        por un administrador, incluyendo la imagen de perfil, documentos adjuntos y representante legal.
        """
        data = request.data.copy()
        persona_logueada = request.user.persona.id_persona

        # Obtener la persona asegurando que existe
        try:
            persona = self.get_object()
        except Http404:
            raise NotFound("No existe la persona con el ID proporcionado")

        if persona.tipo_persona != "N":
            raise PermissionDenied("No se puede actualizar una persona jurídica con este servicio")

        persona_previous = copy.copy(persona)

        #  Manejo de archivos adjuntos
        archivos = {}
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            if file_key in request.FILES:
                archivo = request.FILES[file_key]
                validate_file(archivo, ALLOWED_DOCUMENT_EXTENSIONS)
                extension = archivo.name.split('.')[-1]
                archivo.name = f"{uuid.uuid4()}.{extension}"  # Renombrar archivo con UUID
                archivos[file_key] = archivo

        #  Validación especial para la imagen de perfil
        if "image_profile" in request.FILES:
            archivo = request.FILES["image_profile"]
            validate_file(archivo, ALLOWED_IMAGE_EXTENSIONS)
            extension = archivo.name.split('.')[-1]
            archivo.name = f"{uuid.uuid4()}.{extension}"
            archivos["image_profile"] = archivo


        #  Registro de última actualización
        data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
        data['id_persona_ultim_actualiz_diferente_crea'] = persona_logueada

        #  Serialización y validación de datos
        persona_serializada = self.serializer_class(persona, data=data, partial=True)
        persona_serializada.is_valid(raise_exception=True)

        #  Guardar la información actualizada de la persona
        persona_actualizada = persona_serializada.save()

        #  Eliminar archivos anteriores antes de asignar los nuevos
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            archivo_actual = getattr(persona_previous, file_key, None)
            if archivo_actual and file_key in archivos:
                archivo_actual.delete(save=False)

        #  Guardar los nuevos archivos en el modelo
        for file_key, file_value in archivos.items():
            setattr(persona_actualizada, file_key, file_value)
        persona_actualizada.save()

        #  Manejo de la imagen de perfil (`image_profile`) en `User`
        try:
            usuario = User.objects.get(persona=persona_actualizada)
            if "image_profile" in archivos:
                if usuario.image_profile:
                    usuario.image_profile.delete(save=False)  # Eliminar imagen anterior
                usuario.image_profile = archivos["image_profile"]
                usuario.save(update_fields=["image_profile"])
        except User.DoesNotExist:
            return Response({'success': False, 'detail': 'El usuario asociado no existe'}, status=status.HTTP_400_BAD_REQUEST)

        #  Auditoría de actualización de persona
        usuario_id = request.user.id_usuario
        direccion = Util.get_client_ip(request)
        descripcion = {
            "Mensaje": "Se actualizaron datos a la siguiente persona natural por administrador:",
            "TipodeDocumentoID": str(persona_actualizada.tipo_documento.cod_tipo_documento),
            "NumeroDocumentoID": str(persona_actualizada.numero_documento),
            "PrimerNombre": str(persona_actualizada.primer_nombre),
            "PrimerApellido": str(persona_actualizada.primer_apellido),
            "RepresentanteLegalID": persona_actualizada.representante_legal.id_persona if persona_actualizada.representante_legal else None
        }

        #  Comparar cambios antes y después de la actualización
        nuevo, anterior = {}, {}
        for clave, valor in data.items():
            info = convertir_valores_a_string(getattr(persona_previous, clave, ""))
            if info != str(valor):
                if isinstance(valor, InMemoryUploadedFile):
                    if clave == "image_profile":
                        nuevo[clave] = usuario.image_profile.url if usuario.image_profile else None
                    else:
                        nuevo[clave] = getattr(persona_actualizada, clave).url if getattr(persona_actualizada, clave) else None
                else:
                    nuevo[clave] = valor

                # ✅ Mostrar display solo si fue actualizado
                if clave == "pais_nacimiento" and persona_actualizada.pais_nacimiento:
                    nuevo["nombre_pais_nacimiento"] = persona_actualizada.pais_nacimiento.nombre
                elif clave == "municipio_residencia" and persona_actualizada.municipio_residencia:
                    nuevo["nombre_municipio_residencia"] = persona_actualizada.municipio_residencia.nombre
                elif clave == "cod_municipio_notificacion_nal" and persona_actualizada.cod_municipio_notificacion_nal:
                    nuevo["nombre_municipio_notificacion_nal"] = persona_actualizada.cod_municipio_notificacion_nal.nombre
                elif clave == "cod_municipio_expedicion_id" and persona_actualizada.cod_municipio_expedicion_id:
                    nuevo["nombre_municipio_expedicion"] = persona_actualizada.cod_municipio_expedicion_id.nombre

                anterior[clave] = info

        #  Agregar imagen si fue actualizada
        if "image_profile" in archivos:
            nuevo["image_profile"] = usuario.image_profile.url if usuario.image_profile else None

        valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

        auditoria_data = {
            "id_usuario": usuario_id,
            "id_modulo": 1,
            "cod_permiso": "AC",
            "subsistema": 'SEGU',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion, default=str),
            "valores_actualizados": json.dumps(valores_actualizados, default=str)
        }
        Util.save_auditoria(auditoria_data)

        #  Construcción de respuesta con solo los datos actualizados
        respuesta_data = {
            "id_persona": persona_actualizada.id_persona,
            "archivo_rut": request.build_absolute_uri(persona_actualizada.archivo_rut.url) if persona_actualizada.archivo_rut else None,
            "camaraComercio": request.build_absolute_uri(persona_actualizada.camaraComercio.url) if persona_actualizada.camaraComercio else None,
            "documentoRepresentante": request.build_absolute_uri(persona_actualizada.documentoRepresentante.url) if persona_actualizada.documentoRepresentante else None,
            "image_profile": request.build_absolute_uri(usuario.image_profile.url) if usuario.image_profile else None
        }
        respuesta_data.update(nuevo)  # Agregar solo los campos modificados

        return Response({
            'success': True,
            'detail': 'Se actualizó la persona correctamente',
            'data': respuesta_data
        }, status=status.HTTP_200_OK)







# class UpdatePersonaJuridicaAdminPersonas(generics.UpdateAPIView):
#     serializer_class = PersonaJuridicaUpdateSerializer
#     permission_classes = [IsAuthenticated]
#     queryset = Personas.objects.all()

#     def put (self,request,id_persona):

#         persona_logueada = request.user.persona.id_persona
#         data = request.data
#         persona = self.queryset.all().filter(id_persona = id_persona).first()

#         request.POST._mutable = True

#         if request.FILES.get('archivo_rut'):
#             archivo_rut = request.FILES.get('archivo_rut')
#             nameFile = archivo_rut.name  # Obtengo nombre del archivo
#             arreglo = nameFile.split(".")  # separo por .
#             lenArr = len(arreglo)  # arreglo del string del nombre del archivo
#             extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
#             archivo_rut.name = str(uuid.uuid4()) + "." + extension

#         if request.FILES.get('camaraComercio'):
#             camaraComercio= request.FILES.get('camaraComercio')
#             nameFile = camaraComercio.name  # Obtengo nombre del archivo
#             arreglo = nameFile.split(".")  # separo por .
#             lenArr = len(arreglo)  # arreglo del string del nombre del archivo
#             extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
#             camaraComercio.name = str(uuid.uuid4()) + "." + extension

#         if request.FILES.get('documentoRepresentante'):
#             documentoRepresentante= request.FILES.get('documentoRepresentante')
#             nameFile = documentoRepresentante.name  # Obtengo nombre del archivo
#             arreglo = nameFile.split(".")  # separo por .
#             lenArr = len(arreglo)  # arreglo del string del nombre del archivo
#             extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
#             documentoRepresentante.name = str(uuid.uuid4()) + "." + extension

#         if persona:
#             persona_previous = copy.copy(persona)
#             if persona.tipo_persona != "J":
#                 raise PermissionDenied('No se puede actualizar una persona jurídica con este servicio')

#             cambio = Util.comparacion_campos_actualizados(data,persona)

#             if not persona.id_persona_crea or persona_logueada != persona.id_persona_crea.id_persona:
#                 if cambio:
#                     data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
#                     data['id_persona_ultim_actualiz_diferente_crea'] = persona_logueada
#             else:
#                 data['fecha_ultim_actualiz_diferente_crea'] = None
#                 data['id_persona_ultim_actualiz_diferente_crea'] = None

#             #Validacion de Fecha de cambio de representante legal y fecha de incio de representantele legalñ

#             if str(persona.representante_legal.id_persona) != str(data["representante_legal"]):
#                 data['fecha_cambio_representante_legal'] = datetime.now()
#                 fecha_inicio = data.get("fecha_inicio_cargo_rep_legal")
#                 if not fecha_inicio:
#                     fecha_inicio = datetime.now()
#                 else:
#                     fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
#                     fecha_ahora = date.today()

#                     if fecha_formateada > fecha_ahora or fecha_formateada < persona.fecha_inicio_cargo_rep_legal:
#                         raise PermissionDenied('La fecha de inicio del cargo del representante no debe ser superior a la del sistema y tiene que ser mayor a la fecha de inicio del representante legal anterior')

#             else:
#                 fecha_inicio = data.get("fecha_inicio_cargo_rep_legal")
#                 if fecha_inicio:
#                     fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
#                     if persona.fecha_inicio_cargo_rep_legal != fecha_formateada:
#                         raise PermissionDenied('No se puede actualizar la fecha de inicio de representante legal sin haber cambiado el representante')
#                 data['fecha_cambio_representante_legal'] = None

#             persona_serializada = self.serializer_class(persona, data=data, many=False)
#             persona_serializada.is_valid(raise_exception=True)

#             #PARA UTILIZARLO EN EL UTIL
#             data['tipo_persona'] = persona.tipo_persona

#             request.POST._mutable = False

#             validaciones_persona = Util.guardar_persona(data)

#             if not validaciones_persona['success']:
#                 return Response({'success':validaciones_persona['success'], 'detail':validaciones_persona['detail']}, status=validaciones_persona['status'])

#             persona_actualizada= persona_serializada.save()
#             persona_actualizada.fecha_ultim_actualiz_diferente_crea = datetime.now()
#             persona_actualizada.id_persona_ultim_actualiz_diferente_crea = request.user.persona
#             persona_actualizada.save()

#             # Asignamos los archivos después de serializar
#             persona_actualizada.archivo_rut = archivo_rut
#             persona_actualizada.camaraComercio = camaraComercio
#             persona_actualizada.documentoRepresentante = documentoRepresentante
#             persona_actualizada.save()

#             # Historico de direcciónes
#             historico_direcciones_validacion(request.data, persona_previous, False)

#             # Historico de representantes legales
#             if str(persona_previous.representante_legal.id_persona) != str(data["representante_legal"]):
#                 result_representante = historico_representante_validacion(request.data, persona_previous)

#                 if not result_representante:
#                     return Response({'success': False, 'detail': 'No se encontro al representante legal'}, status=status.HTTP_400_BAD_REQUEST)

#             # AUDITORIA ACTUALIZAR PERSONA
#             usuario = request.user.id_usuario
#             direccion=Util.get_client_ip(request)
#             descripcion = {"Mensaje":"Se actualiza persona por usuario administrador","TipodeDocumentoID": str(persona_actualizada.tipo_documento), "NumeroDocumentoID": str(persona_actualizada.numero_documento), "RazonSocial": str(persona_actualizada.razon_social), "NombreComercial": str(persona_actualizada.nombre_comercial)}

#             nuevo = {}
#             anterior = {}
#             # Verifico que campos cambiaron y los añado (los campos con llave foranea siempre se guardan)
#             for clave, valor in request.data.items():
#                 info = convertir_valores_a_string(getattr(persona_previous, clave))
#                 if info != data[clave]:
#                     nuevo[clave] = valor
#                     anterior[clave] = info

#             valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

#             auditoria_data = {
#                 "id_usuario" : usuario,
#                 "id_modulo" : 1,
#                 "cod_permiso": "AC",
#                 "subsistema": 'SEGU',
#                 "dirip": direccion,
#                 "descripcion": json.dumps(descripcion),
#                 "valores_actualizados": json.dumps(valores_actualizados)
#             }
#             Util.save_auditoria(auditoria_data)

#             return Response({'success':True, 'detail':'Se actualizó la persona correctamente'},status=status.HTTP_200_OK)

#         raise NotFound('No existe la persona')


class UpdatePersonaJuridicaAdminPersonas(generics.UpdateAPIView):
    serializer_class = PersonaJuridicaUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Personas.objects.all()
    lookup_field = "id_persona"

    def patch(self, request, id_persona):
        
        data = request.data.copy()
        persona_logueada = request.user.persona.id_persona

        data['tipo_persona'] = "J"

        # Obtener la persona asegurando que existe
        try:
            persona = self.get_object()
        except Http404:
            raise NotFound("No existe la persona con el ID proporcionado")

        if persona.tipo_persona != "J":
            raise PermissionDenied("No se puede actualizar una persona natural con este servicio")
        
        persona_previous = copy.copy(persona)

        # Manejo de archivos adjuntos
        archivos = {}
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            if file_key in request.FILES:
                print(file_key)
                archivo = request.FILES[file_key]
                print(archivo)
                validate_file(archivo, ALLOWED_DOCUMENT_EXTENSIONS)
                extension = archivo.name.split('.')[-1]
                archivo.name = f"{uuid.uuid4()}.{extension}"  # Renombrar archivo con UUID
                archivos[file_key] = archivo

        # Validación especial para la imagen de perfil
        if "image_profile" in request.FILES:
            archivo = request.FILES["image_profile"]
            validate_file(archivo, ALLOWED_IMAGE_EXTENSIONS)
            extension = archivo.name.split('.')[-1]
            archivo.name = f"{uuid.uuid4()}.{extension}"  # Renombrar archivo con UUID
            archivos["image_profile"] = archivo

        # ACTUALIZAR CAMPOS SIN VALIDACIÓN PREVIA
        data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
        data['id_persona_ultim_actualiz_diferente_crea'] = persona_logueada

        # Serialización y validación de datos
        persona_serializada = self.serializer_class(persona, data=data, partial=True)
        persona_serializada.is_valid(raise_exception=True)

        # Validar solo si los emails están en la petición
        if "email" in data or "email_empresarial" in data:
            validaciones_persona = Util.guardar_persona(data)
            if not validaciones_persona['success']:
                return Response({'success': validaciones_persona['success'], 'detail': validaciones_persona['detail']}, status=validaciones_persona['status'])

        # Guardar la información actualizada de la persona
        persona_actualizada = persona_serializada.save()

        # Eliminar archivos anteriores antes de asignar los nuevos
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            archivo_actual = getattr(persona_previous, file_key, None)
            if archivo_actual and file_key in archivos:
                archivo_actual.delete(save=False) 

        # Guardar los nuevos archivos en el modelo
        for file_key, file_value in archivos.items():
            setattr(persona_actualizada, file_key, file_value)
        persona_actualizada.save()

        # Manejo especial de la imagen de perfil (`image_profile`) en `User`
        try:
            usuario = User.objects.get(persona=persona_actualizada)
            if "image_profile" in archivos:
                if usuario.image_profile:
                    usuario.image_profile.delete(save=False)
                usuario.image_profile = archivos["image_profile"]
                usuario.save(update_fields=["image_profile"])
        except User.DoesNotExist:
            return Response({'success': False, 'detail': 'El usuario asociado no existe'}, status=status.HTTP_400_BAD_REQUEST)

        # Auditoría de actualización de persona
        usuario_id = request.user.id_usuario
        direccion = Util.get_client_ip(request)
        descripcion = {
            "Mensaje": "Se actualizaron datos a la siguiente persona jurídica por administrador:",
            "TipodeDocumentoID": str(persona_actualizada.tipo_documento.cod_tipo_documento),
            "NumeroDocumentoID": str(persona_actualizada.numero_documento),
            "RazonSocial": str(persona_actualizada.razon_social),
            "NombreComercial": str(persona_actualizada.nombre_comercial)
        }

        # Comparar cambios antes y después de la actualización
        nuevo, anterior = {}, {}
        for clave, valor in data.items():
            info = convertir_valores_a_string(getattr(persona_previous, clave, ""))
            if info != str(valor):
                print(type(valor))
                print(valor)

                if isinstance(valor, InMemoryUploadedFile):
                    if clave == "image_profile":
                        nuevo[clave] = usuario.image_profile.url if usuario.image_profile else None
                    else:
                        nuevo[clave] = getattr(persona_actualizada, clave).url if getattr(persona_actualizada, clave) else None 
                else:
                    nuevo[clave] = valor
                anterior[clave] = info

        # Agregar imagen si fue actualizada
        if "image_profile" in archivos:
            nuevo["image_profile"] = usuario.image_profile.url if usuario.image_profile else None

        valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

        auditoria_data = {
            "id_usuario": usuario_id,
            "id_modulo": 1,
            "cod_permiso": "AC",
            "subsistema": 'SEGU',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion, default=str),
            "valores_actualizados": json.dumps(valores_actualizados, default=str)
        }
        Util.save_auditoria(auditoria_data)

        # Construcción de respuesta con solo los datos actualizados
        respuesta_data = {"id_persona": persona_actualizada.id_persona}
        respuesta_data.update(nuevo)
        return Response({
            'success': True,
            'detail': 'Se actualizó la persona correctamente',
            'data': respuesta_data
        }, status=status.HTTP_200_OK)




class RegisterPersonaJuridicaAdmin(generics.CreateAPIView):
    serializer_class = PersonaJuridicaPostSerializer
    permission_classes = [IsAuthenticated, PermisoCrearUsuarioInterno]

    def post(self, request):
        try:
            persona = request.data
            persona_logueada = request.user.persona.id_persona
            request.POST._mutable = True
            # Forzar que en el registro jurídico por admin NO se marque como proveedor
            persona['proveedor'] = False

            # Validación: documento ya registrado
            tipo_documento = persona.get('tipo_documento')
            numero_documento = persona.get('numero_documento')

            if Personas.objects.filter(tipo_documento=tipo_documento, numero_documento=numero_documento).exists():
                return Response({
                    'success': False,
                    'detail': 'Ya existe una persona registrada con este tipo y número de documento'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not persona.get('cod_tipo_comprador'):
                raise ValidationError("El campo 'cod_tipo_comprador' es requerido")

            # Validación de coordenadas
            coordenada_x = persona.get('coordenada_x')
            coordenada_y = persona.get('coordenada_y')

            if coordenada_x is not None and coordenada_y is not None:
                try:
                    coordenada_x = float(coordenada_x)
                    coordenada_y = float(coordenada_y)
                except ValueError:
                    raise ValidationError('Las coordenadas deben ser números válidos')

                if coordenada_x < -180 or coordenada_x > 180:
                    raise ValidationError('La coordenada X debe estar entre -180 y 180')
                if coordenada_y < -90 or coordenada_y > 90:
                    raise ValidationError('La coordenada Y debe estar entre -90 y 90')

                persona['coordenada_x'] = coordenada_x
                persona['coordenada_y'] = coordenada_y

            # Validación: cod_municipio_expedicion_id
            cod_municipio_expedicion_id = persona.get('cod_municipio_expedicion_id')
            if not cod_municipio_expedicion_id:
                raise ValidationError('El campo "Municipio de expedición" es obligatorio')
            try:
                Municipio.objects.get(pk=cod_municipio_expedicion_id)
            except ObjectDoesNotExist:
                raise ValidationError('El municipio de expedición no es válido')

            # Validación: cod_municipio_laboral_nal
            cod_municipio_laboral_nal = persona.get('cod_municipio_laboral_nal')
            if not cod_municipio_laboral_nal:
                raise ValidationError('El campo "Municipio laboral" es obligatorio')
            try:
                Municipio.objects.get(pk=cod_municipio_laboral_nal)
            except ObjectDoesNotExist:
                raise ValidationError('El municipio laboral no es válido')

            # Validación: cod_municipio_notificacion_nal
            cod_municipio_notificacion_nal = persona.get('cod_municipio_notificacion_nal')
            if not cod_municipio_notificacion_nal:
                raise ValidationError('El campo "Municipio de notificación" es obligatorio')
            try:
                Municipio.objects.get(pk=cod_municipio_notificacion_nal)
            except ObjectDoesNotExist:
                raise ValidationError('El municipio de notificación no es válido')

            # Validación: cod_pais_nacionalidad_empresa
            cod_pais_nacionalidad_empresa = persona.get('cod_pais_nacionalidad_empresa')
            if not cod_pais_nacionalidad_empresa:
                raise ValidationError('El campo "País de nacionalidad de la empresa" es obligatorio')
            try:
                Paises.objects.get(pk=cod_pais_nacionalidad_empresa)
            except ObjectDoesNotExist:
                raise ValidationError('El país de nacionalidad no es válido')

            # Manejo de archivos
            archivo_rut = None
            camaraComercio = None
            documentoRepresentante = None

            if request.FILES.get('archivo_rut'):
                archivo_rut = request.FILES.get('archivo_rut')
                validate_file(archivo_rut, ALLOWED_DOCUMENT_EXTENSIONS)
                archivo_rut.name = f"{uuid.uuid4()}.{archivo_rut.name.split('.')[-1]}"
            else:
                return Response({'success': False, 'detail': 'Para creación de persona jurídica es obligatorio anexar RUT'}, status=status.HTTP_400_BAD_REQUEST)

            if request.FILES.get('camaraComercio'):
                camaraComercio = request.FILES.get('camaraComercio')
                validate_file(camaraComercio, ALLOWED_DOCUMENT_EXTENSIONS)
                camaraComercio.name = f"{uuid.uuid4()}.{camaraComercio.name.split('.')[-1]}"
            else:
                return Response({'success': False, 'detail': 'Para creación de persona jurídica es obligatorio anexar cámara de comercio'}, status=status.HTTP_400_BAD_REQUEST)

            if request.FILES.get('documentoRepresentante'):
                documentoRepresentante = request.FILES.get('documentoRepresentante')
                validate_file(documentoRepresentante, ALLOWED_DOCUMENT_EXTENSIONS)
                documentoRepresentante.name = f"{uuid.uuid4()}.{documentoRepresentante.name.split('.')[-1]}"
            else:
                return Response({'success': False, 'detail': 'Para creación de persona jurídica es obligatorio anexar documento del representante'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not persona.get('proveedor'):
                persona['proveedor'] = True


            # Asignación de persona creadora
            persona['id_persona_crea'] = persona_logueada
            id_cargo = persona.get('id_cargo', None)
            tipo_documento = persona.get('tipo_documento', None)
            representante_legal_id = persona.get('representante_legal', None)

            request.POST._mutable = False

            # Validaciones de la persona
            serializer = self.serializer_class(data=persona)
            serializer.is_valid(raise_exception=True)

            validaciones_persona = Util.guardar_persona(persona)
            if not validaciones_persona['success']:
                return Response(validaciones_persona, status=validaciones_persona['status'])

            # Guardar Persona
            serializador = serializer.save()
            serializador.archivo_rut = archivo_rut
            serializador.camaraComercio = camaraComercio
            serializador.documentoRepresentante = documentoRepresentante
            serializador.save()

            # ACTUALIZAR `id_persona_crea` DEL REPRESENTANTE LEGAL
            if representante_legal_id:
                representante_legal = Personas.objects.filter(id_persona=representante_legal_id, tipo_persona="N").first()
                if representante_legal:
                    representante_legal.id_persona_crea = serializador
                    representante_legal.save()

            # Actualización de estado en cargos y documentos
            if id_cargo:
                Cargos.objects.filter(id_cargo=id_cargo).update(item_ya_usado=True)

            if tipo_documento:
                TipoDocumento.objects.filter(cod_tipo_documento=tipo_documento).update(item_ya_usado=True)

            # Historico de direcciones y representantes legales
            historico_direcciones_validacion(request.data, serializador, True)
            result_representante = historico_representante_validacion(request.data, serializador)

            if not result_representante:
                return Response({'success': False, 'detail': 'No se encontró al representante legal'}, status=status.HTTP_400_BAD_REQUEST)

            # Registro de auditoría
            usuario = request.user.id_usuario
            auditoria_data = {
                "id_usuario": usuario,
                "id_modulo": 1,
                "cod_permiso": "CR",
                "subsistema": 'SEGU',
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps({
                    "Mensaje": "Se crea persona jurídica por usuario administrador",
                    "TipodeDocumentoID": str(serializador.tipo_documento),
                    "NumeroDocumentoID": str(serializador.numero_documento),
                    "RazonSocial": str(serializador.razon_social),
                    "NombreComercial": str(serializador.nombre_comercial)
                }),
                "valores_actualizados": json.dumps({
                    "create": {
                        "Nuevo": {
                            "TipodeDocumentoID": str(serializador.tipo_documento),
                            "NumeroDocumentoID": str(serializador.numero_documento),
                            "RazonSocial": str(serializador.razon_social),
                            "NombreComercial": str(serializador.nombre_comercial)
                        }
                    }
                })
            }
            Util.save_auditoria(auditoria_data)

            # Enviar notificación por SMS
            sms = (
                f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                f"persona juridica registrada con NIT: {serializador.numero_documento}, Razon Social: {serializador.razon_social}."
            )
            if serializador.telefono_empresa:
                telefono_a_usar = serializador.telefono_empresa  

            # Enviar SMS si se encontró un teléfono válido
            if telefono_a_usar:
                Util.send_sms(telefono_a_usar, sms)
            else:
                print("No se encontró teléfono válido para enviar el SMS.")

            #NOTIFICACIÓN POR CORREO
            subject = "Registro exitoso Fedecaco"
            template = "email-register-persona-juridica.html"
            Util.notificacion(serializador, subject, template,  nombre_de_usuario=serializador.razon_social)
        
            # Serializar la respuesta con la persona creada y archivos
            persona_creada = self.serializer_class(serializador).data
            persona_creada['archivo_rut'] = request.build_absolute_uri(serializador.archivo_rut.url) if serializador.archivo_rut else None
            persona_creada['camaraComercio'] = request.build_absolute_uri(serializador.camaraComercio.url) if serializador.camaraComercio else None
            persona_creada['documentoRepresentante'] = request.build_absolute_uri(serializador.documentoRepresentante.url) if serializador.documentoRepresentante else None

            return Response({'success': True, 'detail': 'Se creó la persona jurídica correctamente', 'persona': persona_creada}, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response({'success': False, 'detail': e.detail}, status=status.HTTP_400_BAD_REQUEST)



class RegisterPersonaNaturalAdmin(generics.CreateAPIView):
    serializer_class = PersonaNaturalPostAdminSerializer
    permission_classes = [IsAuthenticated, PermisoCrearUsuarioInterno]

    def post(self, request):
        try:
            persona = request.data
            persona_logueada = request.user.persona.id_persona
            request.POST._mutable = True

            # Validación: documento ya registrado
            tipo_documento = persona.get('tipo_documento')
            numero_documento = persona.get('numero_documento')

            if Personas.objects.filter(tipo_documento=tipo_documento, numero_documento=numero_documento).exists():
                return Response({
                    'success': False,
                    'detail': 'Ya existe una persona registrada con este tipo y número de documento'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validación: nombre de usuario ya registrado
            nombre_usuario = persona.get('nombre_de_usuario', '').strip().lower()
            if User.objects.filter(nombre_de_usuario__iexact=nombre_usuario).exists():
                return Response({
                    'success': False,
                    'detail': 'Ya existe un usuario registrado con este nombre de usuario'
                }, status=status.HTTP_400_BAD_REQUEST)
                

            # Validaciones de coordenadas
            coordenada_x = persona.get('coordenada_x')
            coordenada_y = persona.get('coordenada_y')


            if coordenada_x is not None and coordenada_y is not None:
                try:
                    coordenada_x = float(coordenada_x)
                    coordenada_y = float(coordenada_y)
                except ValueError:
                    raise ValidationError('Las coordenadas deben ser números válidos')

                if coordenada_x < -180 or coordenada_x > 180:
                    raise ValidationError('La coordenada X debe estar entre -180 y 180')
                if coordenada_y < -90 or coordenada_y > 90:
                    raise ValidationError('La coordenada Y debe estar entre -90 y 90')

                persona['coordenada_x'] = coordenada_x
                persona['coordenada_y'] = coordenada_y

            # Validaciones de Municipio y País
            if not persona.get('municipio_residencia'):
                raise ValidationError("El campo 'municipio_residencia' es requerido")
            if not Municipio.objects.filter(cod_municipio=persona['municipio_residencia']).exists():
                raise ValidationError("El municipio de residencia no es válido")

            if not persona.get('cod_municipio_expedicion_id'):
                raise ValidationError("El campo 'cod_municipio_expedicion_id' es requerido")
            if not Municipio.objects.filter(cod_municipio=persona['cod_municipio_expedicion_id']).exists():
                raise ValidationError("El municipio de expedición no es válido")

            if not persona.get('cod_municipio_notificacion_nal'):
                raise ValidationError("El campo 'cod_municipio_notificacion_nal' es requerido")
            if not Municipio.objects.filter(cod_municipio=persona['cod_municipio_notificacion_nal']).exists():
                raise ValidationError("El municipio de notificación no es válido")

            if not persona.get('pais_nacimiento'):
                raise ValidationError("El campo 'pais_nacimiento' es requerido")
            if not Paises.objects.filter(cod_pais=persona['pais_nacimiento']).exists():
                raise ValidationError("El país de nacimiento no es válido")


            # Manejo de archivos
            archivo_rut = None
            camara_comercio = None
            documento_representante = None

            if request.FILES.get('archivo_rut'):
                archivo_rut = request.FILES.get('archivo_rut')
                validate_file(archivo_rut, ALLOWED_DOCUMENT_EXTENSIONS)
                archivo_rut.name = f"{uuid.uuid4()}.{archivo_rut.name.split('.')[-1]}"

            if request.FILES.get('camaraComercio'):
                camara_comercio = request.FILES.get('camaraComercio')
                validate_file(camara_comercio, ALLOWED_DOCUMENT_EXTENSIONS)
                camara_comercio.name = f"{uuid.uuid4()}.{camara_comercio.name.split('.')[-1]}"

            if request.FILES.get('documentoRepresentante'):
                documento_representante = request.FILES.get('documentoRepresentante')
                validate_file(documento_representante, ALLOWED_DOCUMENT_EXTENSIONS)
                documento_representante.name = f"{uuid.uuid4()}.{documento_representante.name.split('.')[-1]}"

            persona['id_persona_crea'] = persona_logueada
            id_cargo = persona.get('id_cargo', None)
            tipo_documento = persona.get('tipo_documento', None)

            request.POST._mutable = False

            # Validaciones
            serializer = self.serializer_class(data=persona)
            serializer.is_valid(raise_exception=True)

            validaciones_persona = Util.guardar_persona(persona)
            if not validaciones_persona['success']:
                return Response(validaciones_persona, status=validaciones_persona['status'])

            # Guardar Persona
            serializador = serializer.save()
            serializador.archivo_rut = archivo_rut
            serializador.documentoRepresentante = documento_representante
            serializador.camaraComercio = camara_comercio
            serializador.save()
            
            # Actualización de estado en cargos y documentos
            if id_cargo:
                Cargos.objects.filter(id_cargo=id_cargo).update(item_ya_usado=True)

            if tipo_documento:
                TipoDocumento.objects.filter(cod_tipo_documento=tipo_documento).update(item_ya_usado=True)

            # Validación de fechas de cargo
            fecha_inicio = persona.get("fecha_inicio_cargo_actual")
            if fecha_inicio:
                fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
                if fecha_formateada > date.today():
                    raise PermissionDenied('La fecha de inicio del cargo no debe ser superior a la del sistema')

            fecha_fin = persona.get("fecha_a_finalizar_cargo_actual")
            if fecha_fin:
                fecha_formateada_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
                if fecha_formateada_fin < date.today():
                    raise PermissionDenied('La fecha de fin del cargo no debe ser inferior a la del sistema')
                if fecha_formateada_fin < fecha_formateada:
                    raise PermissionDenied('La fecha de fin del cargo no debe ser inferior a la fecha de inicio del cargo')

            # Historico de direcciones
            historico_direcciones_validacion(request.data, serializador, True)

            # Auditoría de creación de persona
            usuario = request.user.id_usuario
            auditoria_data = {
                "id_usuario": usuario,
                "id_modulo": 1,
                "cod_permiso": "CR",
                "subsistema": 'SEGU',
                "dirip": Util.get_client_ip(request),
                "descripcion": json.dumps({
                    "Mensaje": "Se crea persona natural por usuario administrador",
                    "TipodeDocumentoID": str(serializador.tipo_documento),
                    "NumeroDocumentoID": str(serializador.numero_documento),
                    "PrimerNombre": str(serializador.primer_nombre),
                    "PrimerApellido": str(serializador.primer_apellido)
                }),
                "valores_actualizados": json.dumps({
                    "create": {
                        "Nuevo": {
                            "TipodeDocumentoID": str(serializador.tipo_documento),
                            "NumeroDocumentoID": str(serializador.numero_documento),
                            "PrimerNombre": str(serializador.primer_nombre),
                            "PrimerApellido": str(serializador.primer_apellido)
                        }
                    }
                })
            }
            Util.save_auditoria(auditoria_data)

            # Buscar usuario relacionado con la persona recién creada
            usuario_relacionado = User.objects.filter(persona=serializador).first()
            nombre_usuario = usuario_relacionado.nombre_de_usuario if usuario_relacionado else "Usuario Desconocido"

            # Enviar notificación por SMS
            sms = (
                f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                f"persona natural registrada con documento {serializador.numero_documento} y el nombre {serializador.primer_nombre} {serializador.primer_apellido}."
            )
            if serializador.telefono_celular:
                telefono_a_usar = serializador.telefono_celular  

            # Enviar SMS si se encontró un teléfono válido
            if telefono_a_usar:
                Util.send_sms(telefono_a_usar, sms)
            else:
                print("No se encontró teléfono válido para enviar el SMS.")


            # Enviar notificación por correo
            Util.notificacion(serializador, "Registro exitoso Fedecacao", "email-register-persona-natural.html", nombre_de_usuario=nombre_usuario)

            # Generar respuesta con URLs de archivos
            persona_creada = self.serializer_class(serializador).data
            persona_creada['archivo_rut'] = request.build_absolute_uri(serializador.archivo_rut.url) if serializador.archivo_rut else None
            persona_creada['camaraComercio'] = request.build_absolute_uri(serializador.camaraComercio.url) if serializador.camaraComercio else None
            persona_creada['documentoRepresentante'] = request.build_absolute_uri(serializador.documentoRepresentante.url) if serializador.documentoRepresentante else None

            return Response({'success': True, 'detail': 'Se creó la persona natural correctamente', 'data': persona_creada}, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response({'success': False, 'detail': e.detail}, status=status.HTTP_400_BAD_REQUEST)



# class UpdatePersonaJuridicaBySelf(generics.UpdateAPIView):
#     http_method_names = ['patch']
#     serializer_class = PersonaJuridicaUpdateSerializer
#     permission_classes = [IsAuthenticated]
#     queryset = Personas.objects.all()

#     def patch(self,request):

#         data = request.data
#         persona = request.user.persona
#         previous_persona = copy.copy(persona)

#         request.POST._mutable = True

#         if request.FILES.get('archivo_rut'):
#             archivo_rut = request.FILES.get('archivo_rut')
#             nameFile = archivo_rut.name  # Obtengo nombre del archivo
#             arreglo = nameFile.split(".")  # separo por .
#             lenArr = len(arreglo)  # arreglo del string del nombre del archivo
#             extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
#             archivo_rut.name = str(uuid.uuid4()) + "." + extension

#         if request.FILES.get('camaraComercio'):
#             camaraComercio= request.FILES.get('camaraComercio')
#             nameFile = camaraComercio.name  # Obtengo nombre del archivo
#             arreglo = nameFile.split(".")  # separo por .
#             lenArr = len(arreglo)  # arreglo del string del nombre del archivo
#             extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
#             camaraComercio.name = str(uuid.uuid4()) + "." + extension

#         if request.FILES.get('documentoRepresentante'):
#             documentoRepresentante= request.FILES.get('documentoRepresentante')
#             nameFile = documentoRepresentante.name  # Obtengo nombre del archivo
#             arreglo = nameFile.split(".")  # separo por .
#             lenArr = len(arreglo)  # arreglo del string del nombre del archivo
#             extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
#             documentoRepresentante.name = str(uuid.uuid4()) + "." + extension

#         if persona.tipo_persona != "J":
#             raise PermissionDenied('No se puede actualizar una persona natural con este servicio')

#         if persona.id_persona != persona.id_persona_crea.id_persona:
#             cambio = Util.comparacion_campos_actualizados(data,persona)
#             if cambio:
#                 data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
#                 data['id_persona_ultim_actualiz_diferente_crea'] = persona.id_persona
#         else:
#             data['fecha_ultim_actualiz_diferente_crea'] = None
#             data['id_persona_ultim_actualiz_diferente_crea'] = None

#         #Validacion de Fecha de cambio de representante legal y fecha de incio de representantele legalñ
#         if str(persona.representante_legal.id_persona) != str(data["representante_legal"]):
#             data['fecha_cambio_representante_legal'] = datetime.now()

#             fecha_inicio = data.get("fecha_inicio_cargo_rep_legal")
#             if not fecha_inicio:
#                 fecha_inicio = datetime.now()
#             else:
#                 fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
#                 fecha_ahora = date.today()
#                 if fecha_formateada > fecha_ahora or fecha_formateada < persona.fecha_inicio_cargo_rep_legal:
#                     raise PermissionDenied('La fecha de inicio del cargo del representante no debe ser superior a la del sistema y tiene que ser mayor a la fecha de inicio del representante legal anterior')

#         else:
#             fecha_inicio = data.get("fecha_inicio_cargo_rep_legal")
#             if fecha_inicio:
#                 fecha_formateada = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
#                 if persona.fecha_inicio_cargo_rep_legal != fecha_formateada:
#                     raise PermissionDenied('No se puede actualizar la fecha de inicio de representante legal sin haber cambiado el representante')
#             data['fecha_cambio_representante_legal'] = None

#         persona_serializada = self.serializer_class(persona, data=data, many=False)
#         persona_serializada.is_valid(raise_exception=True)

#         #PARA UTULIZARLO EN EL UTIL
#         data['tipo_persona'] = persona.tipo_persona

#         request.POST._mutable = False

#         validaciones_persona = Util.guardar_persona(data)
#         if not validaciones_persona['success']:
#             return Response({'success':validaciones_persona['success'], 'detail':validaciones_persona['detail']}, status=validaciones_persona['status'])       

#         serializador = persona_serializada.save()
#         serializador.archivo_rut = archivo_rut
#         serializador.camaraComercio = camaraComercio
#         serializador.documentoRepresentante = documentoRepresentante
#         serializador.save()


#         # Historico de direcciónes
#         historico_direcciones_validacion(request.data, previous_persona, False)

#         # Historico de representantes legales
#         if str(previous_persona.representante_legal.id_persona) != str(data["representante_legal"]):
#             result_representante = historico_representante_validacion(request.data, previous_persona)

#             if not result_representante:
#                 return Response({'success': False, 'detail': 'No se encontro al representante legal'}, status=status.HTTP_400_BAD_REQUEST)

#         # auditoria actualizar persona
#         usuario = request.user.id_usuario
#         direccion=Util.get_client_ip(request)
#         descripcion = {"TipodeDocumentoID": str(serializador.tipo_documento), "NumeroDocumentoID": str(serializador.numero_documento), "RazonSocial": str(serializador.razon_social), "NombreComercial": str(serializador.nombre_comercial)}
#         nuevo = {}
#         anterior = {}
#         # Verifico que campos cambiaron y los añado (los campos con llave foranea siempre se guardan)
#         for clave, valor in request.data.items():
#             info = convertir_valores_a_string(getattr(previous_persona, clave))
#             if info != data[clave]:
#                 nuevo[clave] = valor
#                 anterior[clave] = info

#         valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

#         auditoria_data = {
#             "id_usuario" : usuario,
#             "id_modulo" : 1,
#             "cod_permiso": "AC",
#             "subsistema": 'SEGU',
#             "dirip": direccion,
#             "descripcion": json.dumps(descripcion),
#             "valores_actualizados": json.dumps(valores_actualizados)
#         }
#         Util.save_auditoria(auditoria_data)

#         return Response({'success':True, 'detail':'Persona actualizada correctamente'}, status=status.HTTP_201_CREATED)


class UpdatePersonaJuridicaBySelf(generics.UpdateAPIView):
    http_method_names = ['patch']
    serializer_class = PersonaJuridicaUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Personas.objects.all()

    def patch(self, request):
        """
        Servicio para actualizar información de una persona jurídica y adjuntar documentos.
        """
        data = request.data
        persona = request.user.persona
        archivos = {}


        if persona.tipo_persona != "J":
            raise PermissionDenied('No se puede actualizar una persona natural con este servicio')

        # Copia previa de la persona para comparación
        persona_previous = copy.copy(persona)

        # Manejo de archivos adjuntos**
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            if file_key in request.FILES:
                archivo = request.FILES[file_key]
                validate_file(archivo, ALLOWED_DOCUMENT_EXTENSIONS)
                extension = archivo.name.split('.')[-1]
                archivo.name = f"{uuid.uuid4()}.{extension}"  # Renombrar archivo con UUID
                archivos[file_key] = archivo

        # Validación especial para la imagen de perfil
        if "image_profile" in request.FILES:
            archivo = request.FILES["image_profile"]
            validate_file(archivo, ALLOWED_IMAGE_EXTENSIONS)
            extension = archivo.name.split('.')[-1]
            archivo.name = f"{uuid.uuid4()}.{extension}"  # Renombrar archivo con UUID
            archivos["image_profile"] = archivo

        # Validación para la firma del usuario
        if 'firma_usuario' in request.FILES:
            firma_usuario = request.FILES['firma_usuario']
            validate_file(firma_usuario, ALLOWED_IMAGE_EXTENSIONS)
            extension = firma_usuario.name.split('.')[-1]
            firma_usuario.name = f"{uuid.uuid4()}.{extension}"
            archivos["firma_usuario"] = firma_usuario

        historico_direcciones_validacion(request.data, persona, False)         

        # Serialización y validación de datos**
        persona_serializada = self.serializer_class(persona, data=data, partial=True)
        persona_serializada.is_valid(raise_exception=True)

        # Guardar la información actualizada de la persona**
        persona_actualizada = persona_serializada.save()

        # Manejo de archivos adjuntos (eliminar los anteriores antes de asignar los nuevos)**
        for file_key in ["archivo_rut", "camaraComercio", "documentoRepresentante"]:
            archivo_actual = getattr(persona_previous, file_key, None)
            if isinstance(archivo_actual, FieldFile) and archivo_actual and file_key in archivos:
                archivo_actual.delete(save=False)  # Eliminar archivo anterior de S3/local

        # Guardar los nuevos archivos en el modelo**
        for file_key, file_value in archivos.items():
            setattr(persona_actualizada, file_key, file_value)
        persona_actualizada.save()

        # Manejo especial de la imagen de perfil (`image_profile`) en `User`**
        usuario = User.objects.get(persona=persona_actualizada)
        if "image_profile" in archivos:
            if usuario.image_profile:
                usuario.image_profile.delete(save=False)  # Eliminar imagen anterior
            usuario.image_profile = archivos["image_profile"]
            usuario.save(update_fields=["image_profile"])

        # Manejo especial de la firma del usuario (`firma_usuario`) en `User`**
        if "firma_usuario" in archivos:
            if usuario.firma_usuario:
                usuario.firma_usuario.delete(save=False)  # Eliminar firma anterior
            usuario.firma_usuario = archivos["firma_usuario"]
            usuario.save(update_fields=["firma_usuario"])

        # Construcción de respuesta con URLs de los archivos y otros datos modificados**
        respuesta_data = {
            "id_persona": persona_actualizada.id_persona,
            "razon_social": persona_actualizada.razon_social,
            "nombre_comercial": persona_actualizada.nombre_comercial,
            "tipo_documento": persona_actualizada.tipo_documento.cod_tipo_documento,
            "numero_documento": persona_actualizada.numero_documento,
            "archivo_rut": request.build_absolute_uri(persona_actualizada.archivo_rut.url) if persona_actualizada.archivo_rut else None,
            "camaraComercio": request.build_absolute_uri(persona_actualizada.camaraComercio.url) if persona_actualizada.camaraComercio else None,
            "documentoRepresentante": request.build_absolute_uri(persona_actualizada.documentoRepresentante.url) if persona_actualizada.documentoRepresentante else None,
            "image_profile": request.build_absolute_uri(usuario.image_profile.url) if usuario.image_profile else None,
            "firma_usuario": request.build_absolute_uri(usuario.firma_usuario.url) if usuario.firma_usuario else None
        }

        return Response({
            'success': True,
            'detail': 'Persona actualizada correctamente',
            'data': respuesta_data
        }, status=status.HTTP_200_OK)


# Views for Historico Direcciones
class HistoricoDireccionByIdPersona(generics.ListAPIView):
    serializer_class = HistoricoDireccionSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if pk:
            queryset = HistoricoDireccion.objects.filter(id_persona=pk)
            if queryset:
                serializer = self.serializer_class(queryset, many=True)
                return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response({'success':False, 'detail':'No se encontraron datos relacionados a la busqueda', 'data': []}, status=status.HTTP_404_NOT_FOUND)
        else:
            raise NotFound('Debe ingresar id de la persona')
        

class HistoricoDireccionByIdPersonaCreate(generics.CreateAPIView):
    serializer_class = HistoricoDireccionSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if pk:
            persona = Personas.objects.filter(id_persona=pk).first()
            if not persona:
                raise NotFound('No existe la persona con el id proporcionado')

            data = request.data
            data['id_persona'] = persona.id_persona

            serializer = self.serializer_class(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response({'success':True, 'detail':'Se ha creado el historico de dirección exitosamente'}, status=status.HTTP_201_CREATED)
        else:
            raise NotFound('Debe ingresar id de la persona')


class GetCargosList(generics.ListAPIView):
    serializer_class = CargosSerializer
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionDeCargos]

    def get(self, request):
        cargos = Cargos.objects.filter(activo=True).order_by('nombre')
        serializador = self.serializer_class(cargos, many=True)
        if cargos:
            return Response({'success':True, 'detail':'Se encontraron cargos', 'data':serializador.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontró ningún cargo'}, status=status.HTTP_404_NOT_FOUND)


class RegisterCargos(generics.CreateAPIView):
    serializer_class =  CargosSerializer
    queryset = Cargos.objects.all()
    permission_classes = [IsAuthenticated, PermisoCrearAdministracionDeCargos]

    def post(self, request):
        data = request.data
        serializador = self.serializer_class(data=data)
        serializador.is_valid(raise_exception=True)
        serializador.save()
        return Response({'success':True, 'detail':'Se ha creado el cargo exitosamente'}, status=status.HTTP_201_CREATED)


class UpdateCargos(generics.UpdateAPIView):
    serializer_class = CargosSerializer
    queryset = Cargos.objects.all()
    permission_classes = [IsAuthenticated, PermisoActualizarAdministracionDeCargos]

    def put(self, request, pk):
        cargo = Cargos.objects.filter(id_cargo=pk).first()

        if cargo:
            if not cargo.item_ya_usado:
                serializer = self.serializer_class(cargo, data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response({'success':True, 'detail':'Registro actualizado exitosamente'}, status=status.HTTP_201_CREATED)
            else:
                raise PermissionDenied('Este cargo ya está siendo usado, por lo cual no es actualizable')
        else:
            raise NotFound('No existe el cargo')

class DeleteCargo(generics.DestroyAPIView):
    serializer_class = CargosSerializer
    queryset = Cargos.objects.all()
    permission_classes = [IsAuthenticated, PermisoEliminarAdministracionDeCargos]

    def delete(self, request, pk):
        cargo = Cargos.objects.filter(id_cargo=pk).first()
        if cargo:
            if not cargo.item_ya_usado:
                cargo.delete()
                return Response({'success':True, 'detail':'El cargo ha sido eliminado exitosamente'}, status=status.HTTP_200_OK)
            else:
                raise PermissionDenied('Este cargo ya está siendo usado, no se pudo eliminar. Intente desactivar')
        else:
            raise NotFound('No existe el cargo')

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size' 
    max_page_size = 100  

    def get_paginated_response(self, data):
        total_pages = math.ceil(self.page.paginator.count / self.page.paginator.per_page)
        current_page = self.page.number

        return Response({
            "success": True,
            "count": self.page.paginator.count,
            "total_pages": total_pages,
            "current_page": current_page,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "data": data
        })
    
class GetPersonasByFilters(generics.ListAPIView):
    serializer_class = PersonasFilterSerializer
    queryset = Personas.objects.all()
    pagination_class = CustomPagination

    def get(self, request):
        filter_conditions = {}

        for key, value in request.query_params.items():
            if value:  
                if key in ['numero_documento', 'tipo_documento', 'tipo_persona']:
                    filter_conditions[key] = value  
                elif key in ['primer_nombre', 'primer_apellido', 'razon_social', 'nombre_comercial']:
                    filter_conditions[f"{key}__icontains"] = value
                elif key == 'nombre_de_usuario':  
                    filter_conditions["user__nombre_de_usuario__iexact"] = value  

        # Filtrar personas y asegurarse de que tengan un usuario existente
        personas = self.queryset.filter(**filter_conditions, user__isnull=False).distinct()
        interno = request.query_params.get('interno', None)
        externo = request.query_params.get('externo', None)
        if interno is not None and interno.lower() == 'true':
            usuarios = User.objects.filter(tipo_usuario='I')
            personas = personas.filter(user__in=usuarios)
        
        if externo is not None and externo.lower() == 'true':
            usuarios = User.objects.filter(tipo_usuario='E')
            personas = personas.filter(user__in=usuarios)
            
        # Aplicar paginación correctamente
        if request.query_params.get('page'):
            page = self.paginate_queryset(personas)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

        # Si no hay paginación, devolver datos sin paginar
        serializer = self.get_serializer(personas, many=True)
        return Response({
            'success': True,
            'detail': 'Se encontraron las siguientes personas con usuario existente que coinciden con los criterios de búsqueda.',
            'data': serializer.data
        }, status=status.HTTP_200_OK)



class CreatePersonaJuridicaAndUsuario(generics.CreateAPIView):

    serializer_class = PersonaJuridicaPostSerializer
    serializer_class_usuario = RegisterExternoSerializer
    queryset = Personas.objects.all()

    def post(self,request):

        data = request.data
        request.POST._mutable = True
        # Forzar que en el registro jurídico NO se marque como proveedor
        data['proveedor'] = False
        # Validación: número de documento ya registrado
        tipo_documento = data.get('tipo_documento')
        numero_documento = data.get('numero_documento')

        if Personas.objects.filter(tipo_documento=tipo_documento, numero_documento=numero_documento).exists():
            return Response({'success': False, 'detail': 'Ya existe una persona registrada con este tipo y número de documento'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validación: nombre de usuario ya existe
        nombre_usuario = data.get('nombre_de_usuario', '').lower().strip()
        if User.objects.filter(nombre_de_usuario__iexact=nombre_usuario).exists():
            return Response({'success': False, 'detail': 'Ya existe un usuario registrado con este nombre'}, status=status.HTTP_400_BAD_REQUEST)
        
        #CREACION DE PERSONA JURIDICA
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        archivo_rut = None

        # Validaciones de coordenadas X y Y
        coordenada_x = data.get('coordenada_x')
        coordenada_y = data.get('coordenada_y')

        if not data.get('cod_tipo_comprador'):
            raise ValidationError("El campo 'cod_tipo_comprador' es requerido")


        if coordenada_x is not None and coordenada_y is not None:
            try:
                coordenada_x = float(coordenada_x)
                coordenada_y = float(coordenada_y)
            except ValueError:
                raise ValidationError('Las coordenadas deben ser números válidos')

            if coordenada_x < -180 or coordenada_x > 180:
                raise ValidationError('La coordenada X debe estar entre -180 y 180')
            if coordenada_y < -90 or coordenada_y > 90:
                raise ValidationError('La coordenada Y debe estar entre -90 y 90')

            # Asignar las coordenadas al objeto `data`
            data['coordenada_x'] = coordenada_x
            data['coordenada_y'] = coordenada_y

        # Validar cod_municipio_expedicion_id
        cod_municipio_expedicion_id = data.get('cod_municipio_expedicion_id')
        if not cod_municipio_expedicion_id:
            raise ValidationError('El campo "Municipio de expedición" es obligatorio')
        try:
            Municipio.objects.get(pk=cod_municipio_expedicion_id)
        except ObjectDoesNotExist:
            raise ValidationError('El municipio de expedición no es válido')

        # Validar cod_municipio_laboral_nal
        cod_municipio_laboral_nal = data.get('cod_municipio_laboral_nal')
        if not cod_municipio_laboral_nal:
            raise ValidationError('El campo "Municipio laboral" es obligatorio')
        try:
            Municipio.objects.get(pk=cod_municipio_laboral_nal)
        except ObjectDoesNotExist:
            raise ValidationError('El municipio laboral no es válido')

        # Validar cod_municipio_notificacion_nal
        cod_municipio_notificacion_nal = data.get('cod_municipio_notificacion_nal')
        if not cod_municipio_notificacion_nal:
            raise ValidationError('El campo "Municipio de notificación" es obligatorio')
        try:
            Municipio.objects.get(pk=cod_municipio_notificacion_nal)
        except ObjectDoesNotExist:
            raise ValidationError('El municipio de notificación no es válido')

        # Validar cod_pais_nacionalidad_empresa
        cod_pais_nacionalidad_empresa = data.get('cod_pais_nacionalidad_empresa')
        if not cod_pais_nacionalidad_empresa:
            raise ValidationError('El campo "País de nacionalidad de la empresa" es obligatorio')
        try:
            Paises.objects.get(pk=cod_pais_nacionalidad_empresa)
        except ObjectDoesNotExist:
            raise ValidationError('El país de nacionalidad no es válido')

        if request.FILES.get('archivo_rut'):
            # data['archivo_rut'] = request.FILES.get('archivo_rut')
            archivo_rut = request.FILES.get('archivo_rut')
            validate_file(archivo_rut, ALLOWED_DOCUMENT_EXTENSIONS)
            nameFile = archivo_rut.name  # Obtengo nombre del archivo
            arreglo = nameFile.split(".")  # separo por .
            lenArr = len(arreglo)  # arreglo del string del nombre del archivo
            extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
            archivo_rut.name = str(uuid.uuid4()) + "." + extension
        else:
            return Response({'success': False, 'detail': 'Para creación de persona juridica es obligatorio anexar rut'}, status=status.HTTP_400_BAD_REQUEST)

        if request.FILES.get('camaraComercio'):
            # data['camaraComercio']= request.FILES.get('camaraComercio')
            camaraComercio= request.FILES.get('camaraComercio')
            validate_file(camaraComercio, ALLOWED_DOCUMENT_EXTENSIONS)
            nameFile = camaraComercio.name  # Obtengo nombre del archivo
            arreglo = nameFile.split(".")  # separo por .
            lenArr = len(arreglo)  # arreglo del string del nombre del archivo
            extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
            camaraComercio.name = str(uuid.uuid4()) + "." + extension
        else:
            return Response({'success': False, 'detail': 'Para creación de persona juridica es obligatorio anexar camara de comercio'}, status=status.HTTP_400_BAD_REQUEST)

        if request.FILES.get('documentoRepresentante'):
            # data['documentoRepresentante']= request.FILES.get('documentoRepresentante')
            documentoRepresentante= request.FILES.get('documentoRepresentante')
            validate_file(documentoRepresentante, ALLOWED_DOCUMENT_EXTENSIONS)
            nameFile = documentoRepresentante.name  # Obtengo nombre del archivo
            arreglo = nameFile.split(".")  # separo por .
            lenArr = len(arreglo)  # arreglo del string del nombre del archivo
            extension = arreglo[lenArr - 1]  # ultimo arreglo que contiene extension
            documentoRepresentante.name = str(uuid.uuid4()) + "." + extension
        else:
            return Response({'success': False, 'detail': 'Para creación de persona juridica es obligatorio anexar documento del representante'}, status=status.HTTP_400_BAD_REQUEST)

        validaciones_persona = Util.guardar_persona(data)

        if not validaciones_persona['success']:
            return Response({'success':validaciones_persona['success'], 'detail':validaciones_persona['detail']}, status=validaciones_persona['status'])       

        #CREACION DE USUARIO PARA LA PERSONA JURIDICA
        redirect_url=request.data.get('redirect_url','')
        redirect_url=quote_plus(redirect_url)

        if not request.data.get('nombre_de_usuario'):
            return Response({'success': False, 'detail': 'Nombre de usuario es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        if " " in data['nombre_de_usuario']:
            raise PermissionDenied('No puede contener espacios en el nombre de usuario')
        
        #GUARDAR PERSONA
        serializador = serializer.save()
        serializador.id_persona_crea = serializador
        serializador.archivo_rut = archivo_rut
        serializador.camaraComercio = camaraComercio
        serializador.documentoRepresentante = documentoRepresentante
        
        serializador.save()

        # Obtener el tipo de documento desde el ID recibido en el POST
        tipo_doc = TipoDocumento.objects.select_for_update().get(
            cod_tipo_documento=data.get("tipo_documento")
        )

        # Actualizar solo si es necesario
        if not tipo_doc.item_ya_usado:
            tipo_doc.item_ya_usado = True
            tipo_doc.save(update_fields=["item_ya_usado"])

        # ACTUALIZAR `id_persona_crea` DEL REPRESENTANTE LEGAL
        representante_legal_id = data.get("representante_legal")
        if representante_legal_id:
            representante_legal = Personas.objects.filter(id_persona=representante_legal_id, tipo_persona="N").first()
            if representante_legal:
                representante_legal.id_persona_crea = serializador
                representante_legal.save()


        #USUARIO
        data['creado_por_portal'] = True
        data['is_active'] = False
        data['persona'] = serializador.id_persona
        data['tipo_usuario'] = "E"

        request.POST._mutable = False

        serializer = self.serializer_class_usuario(data=data)
        serializer.is_valid(raise_exception=True)
        if not data['nombre_de_usuario']:
            return Response({'success': False, 'detail': 'Nombre de usuario es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        nombre_de_usuario = str(serializer.validated_data.get('nombre_de_usuario', '')).lower()
        serializer_response = serializer.save()


        #ASIGNARLE ROL USUARIO EXTERNO POR DEFECTO
        rol = Roles.objects.get(id_rol=2)
        usuario_por_asignar = User.objects.get(nombre_de_usuario=nombre_de_usuario)
        UsuariosRol.objects.create(
            id_rol = rol,
            id_usuario = usuario_por_asignar
        )
    

        # Historico de direcciónes
        historico_direcciones_validacion(request.data, serializador, True)

        # Historico de representantes legales
        result_representante = historico_representante_validacion(request.data, serializador)

        if not result_representante:
            return Response({'success': False, 'detail': 'No se encontro al representante legal'}, status=status.HTTP_400_BAD_REQUEST)
        
        Util.crear_bandeja_alertas(serializador)


        # AUDITORIA AL REGISTRAR USUARIO
        dirip = Util.get_client_ip(request)
        descripcion = {"Mensaje": "Se crea usuario", 'NombreUsuario': str(request.data["nombre_de_usuario"]).lower()}
        valores_actualizados = {"create": {"Nuevo": {'NombreUsuario': str(request.data["nombre_de_usuario"]).lower()}}}

        auditoria_data = {
            'id_usuario': serializer_response.pk,
            'id_modulo': 1,
            'cod_permiso': 'CR',
            'subsistema': 'SEGU',
            'dirip': dirip,
            'descripcion': json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        #AUDITORIA AL ASIGNARLE ROL DE USUARIO EXTERNO POR DEFECTO
        dirip = Util.get_client_ip(request)
        descripcion = {"Mensaje":"Se asigna rol", "NombreUsuario": str(request.data["nombre_de_usuario"]).lower()}
        valores_actualizados = {"create": {"Nuevo": {"NombreUsuario": str(request.data["nombre_de_usuario"]).lower()}}}
        auditoria_data = {
            'id_usuario': serializer_response.pk,
            'id_modulo': 2,
            'cod_permiso': 'CR',
            'subsistema': 'SEGU',
            'dirip': dirip,
            'descripcion': json.dumps(descripcion),
            'valores_actualizados': json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        # AUDITORIA CREAR PESONA
        descripcion = {"Mensaje":"Se crea persona","TipodeDocumentoID": str(serializador.tipo_documento), "NumeroDocumentoID": str(serializador.numero_documento), "RazonSocial": str(serializador.razon_social), "NombreComercial": str(serializador.nombre_comercial)}
        direccion=Util.get_client_ip(request)

        valores_actualizados = {"create": {"Nuevo": {"TipodeDocumentoID": str(serializador.tipo_documento), "NumeroDocumentoID": str(serializador.numero_documento), "RazonSocial": str(serializador.razon_social), "NombreComercial": str(serializador.nombre_comercial)}}}

        auditoria_data = {
            "id_usuario" : serializer_response.pk,
            "id_modulo" : 1,
            "cod_permiso": "CR",
            "subsistema": 'SEGU',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion),
            "valores_actualizados": json.dumps(valores_actualizados)
        }
        Util.save_auditoria(auditoria_data)

        # Enviar SMS si se tiene un teléfono válido
        sms = (
                f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                f"persona juridica registrada con NIT: {serializador.numero_documento}, Razon Social: {serializador.razon_social}."
            )
        
        if serializador.telefono_empresa:
            telefono_a_usar = serializador.telefono_empresa  

        if telefono_a_usar:
            Util.send_sms(telefono_a_usar, sms)
        else:
            print("No se encontró teléfono válido para enviar el SMS.")

        #NOTIFICACIÓN POR CORREO
        subject = "Registro exitoso Fedecaco"
        template = "email-register-persona-juridica.html"
        Util.notificacion(serializador, subject, template, nombre_de_usuario=nombre_de_usuario)

        #Crear alerta de evento inmediato
        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_RegRec'
        data_alerta['informacion_complemento_mensaje'] = f"Un registro de persona juridica con el siguiente tipo de documento: {serializador.tipo_documento} y el número de documento: {serializador.numero_documento}, activar usuario: {nombre_de_usuario}."

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        # SERIALIZAR RESPUESTA DE LA PERSONA CREADA
        persona_response_data = self.serializer_class(serializador).data

        return Response({
            'success': True,
            'detail': 'Se creó la persona jurídica y el usuario correctamente',
            'persona': persona_response_data
        }, status=status.HTTP_200_OK)



class CreatePersonaNaturalAndUsuario(generics.CreateAPIView):
    serializer_class = PersonaNaturalPostSerializer
    serializer_class_usuario = RegisterExternoSerializer
    queryset = Personas.objects.all()

    @transaction.atomic
    def post(self, request):
        try:
            
            data = request.data
            request.POST._mutable = True
            
            # Validación: número de documento ya registrado
            tipo_documento = data.get('tipo_documento')
            numero_documento = data.get('numero_documento')

            if Personas.objects.filter(tipo_documento=tipo_documento, numero_documento=numero_documento).exists():
                return Response({'success': False, 'detail': 'Ya existe una persona registrada con este tipo y número de documento'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validación: nombre de usuario ya existe
            nombre_usuario = data.get('nombre_de_usuario', '').lower().strip()
            if User.objects.filter(nombre_de_usuario__iexact=nombre_usuario).exists():
                return Response({'success': False, 'detail': 'Ya existe un usuario registrado con este nombre'}, status=status.HTTP_400_BAD_REQUEST)

            # Asignación de tipo_persona "N"
            data['tipo_persona'] = "N"
            serializer = self.serializer_class(data=data)
            serializer.is_valid(raise_exception=True)
             
            # Validación de fecha de nacimiento
            fecha_nacimiento_str = data.get('fecha_nacimiento')
            try:
                fecha_nacimiento = datetime.strptime(fecha_nacimiento_str, '%Y-%m-%d').date()
            except ValueError:
                raise ValidationError('Formato de fecha de nacimiento inválido')

            if fecha_nacimiento >= datetime.now().date():
                raise ValidationError('La fecha de nacimiento es incorrecta')
            
            # Validaciones de Municipio y País
            if not data.get('municipio_residencia'):
                raise ValidationError("El campo 'municipio_residencia' es requerido")
            if not Municipio.objects.filter(cod_municipio=data['municipio_residencia']).exists():
                raise ValidationError("El municipio de residencia no es válido")

            if not data.get('pais_nacimiento'):
                raise ValidationError("El campo 'pais_nacimiento' es requerido")
            if not Paises.objects.filter(cod_pais=data['pais_nacimiento']).exists():
                raise ValidationError("El país de nacimiento no es válido")

            if not data.get('cod_municipio_notificacion_nal'):
                raise ValidationError("El campo 'cod_municipio_notificacion_nal' es requerido")
            if not Municipio.objects.filter(cod_municipio=data['cod_municipio_notificacion_nal']).exists():
                raise ValidationError("El municipio de notificación no es válido")

            if not data.get('cod_municipio_expedicion_id'):
                raise ValidationError("El campo 'cod_municipio_expedicion_id' es requerido")
            if not Municipio.objects.filter(cod_municipio=data['cod_municipio_expedicion_id']).exists():
                raise ValidationError("El municipio de expedición no es válido")
            
            if not data.get('cod_tipo_comprador'):
                raise ValidationError("El campo 'cod_tipo_comprador' es requerido")
            

            # Validaciones de coordenadas X y Y
            coordenada_x = data.get('coordenada_x')
            coordenada_y = data.get('coordenada_y')

            if coordenada_x is not None and coordenada_y is not None:
                try:
                    coordenada_x = float(coordenada_x)
                    coordenada_y = float(coordenada_y)
                except ValueError:
                    raise ValidationError('Las coordenadas deben ser números válidos')

                if coordenada_x < -180 or coordenada_x > 180:
                    raise ValidationError('La coordenada X debe estar entre -180 y 180')
                if coordenada_y < -90 or coordenada_y > 90:
                    raise ValidationError('La coordenada Y debe estar entre -90 y 90')

                # Asignar las coordenadas al objeto `data`
                data['coordenada_x'] = coordenada_x
                data['coordenada_y'] = coordenada_y
                        
            # Manejo de archivos
            archivo_rut = None
            camara_comercio = None
            documento_representante = None

            if request.FILES.get('archivo_rut'):
                archivo_rut = request.FILES.get('archivo_rut')
                validate_file(archivo_rut, ALLOWED_DOCUMENT_EXTENSIONS)
                archivo_rut.name = f"{uuid.uuid4()}.{archivo_rut.name.split('.')[-1]}"

            if request.FILES.get('camaraComercio'):
                camara_comercio = request.FILES.get('camaraComercio')
                validate_file(camara_comercio, ALLOWED_DOCUMENT_EXTENSIONS)
                camara_comercio.name = f"{uuid.uuid4()}.{camara_comercio.name.split('.')[-1]}"

            if request.FILES.get('documentoRepresentante'):
                documento_representante = request.FILES.get('documentoRepresentante')
                validate_file(documento_representante, ALLOWED_DOCUMENT_EXTENSIONS)
                documento_representante.name = f"{uuid.uuid4()}.{documento_representante.name.split('.')[-1]}"

            # Validaciones de persona
            serializer_persona = self.serializer_class(data=data)
            serializer_persona.is_valid(raise_exception=True)

            validaciones_persona = Util.guardar_persona(data)
            if not validaciones_persona['success']:
                return Response(validaciones_persona, status=validaciones_persona['status'])

            # Validación de nombre de usuario
            if not request.data.get('nombre_de_usuario'):
                return Response({'success': False, 'detail': 'Nombre de usuario es requerido'}, status=status.HTTP_400_BAD_REQUEST)

            if " " in data['nombre_de_usuario']:
                raise PermissionDenied('No puede contener espacios en el nombre de usuario')

            # Guardar Persona
            persona = serializer_persona.save()
            persona.id_persona_crea = persona
            persona.archivo_rut = archivo_rut
            persona.camaraComercio = camara_comercio
            persona.documentoRepresentante = documento_representante
            
            persona.save()

            # Obtener el tipo de documento desde el ID recibido en el POST
            tipo_doc = TipoDocumento.objects.select_for_update().get(
                cod_tipo_documento=data.get("tipo_documento")
            )

            # Actualizar solo si es necesario
            if not tipo_doc.item_ya_usado:
                tipo_doc.item_ya_usado = True
                tipo_doc.save(update_fields=["item_ya_usado"])


            # Creación de usuario
            data['creado_por_portal'] = True
            data['is_active'] = False
            data['persona'] = persona.id_persona
            data['tipo_usuario'] = "E"  

            request.POST._mutable = False

            serializer_usuario = self.serializer_class_usuario(data=data)
            serializer_usuario.is_valid(raise_exception=True)
            nombre_de_usuario = str(serializer_usuario.validated_data.get('nombre_de_usuario', '')).lower()

            usuario = serializer_usuario.save()
            usuario.id_usuario_creador = usuario
            usuario.save()

            # Asignar rol de usuario externo por defecto
            rol = Roles.objects.get(id_rol=2)
            usuario_por_asignar = User.objects.get(nombre_de_usuario=nombre_de_usuario)
            UsuariosRol.objects.create(id_rol=rol, id_usuario=usuario_por_asignar)

            Util.crear_bandeja_alertas(persona)

            # Registro de auditoría
            dirip = Util.get_client_ip(request)

            auditoria_data_usuario = {
                "id_usuario": usuario.pk,
                "id_modulo": 1,
                "cod_permiso": 'CR',
                "subsistema": 'SEGU',
                "dirip": dirip,
                "descripcion": json.dumps({"Mensaje": "Se crea usuario", "NombreUsuario": nombre_de_usuario}),
                "valores_actualizados": json.dumps({"create": {"Nuevo": {"NombreUsuario": nombre_de_usuario}}})
            }
            Util.save_auditoria(auditoria_data_usuario)

            auditoria_data_rol = {
                "id_usuario": usuario.pk,
                "id_modulo": 2,
                "cod_permiso": 'CR',
                "subsistema": 'SEGU',
                "dirip": dirip,
                "descripcion": json.dumps({"Mensaje": "Se asigna rol", "NombreUsuario": nombre_de_usuario}),
                "valores_actualizados": json.dumps({"create": {"Nuevo": {"NombreUsuario": nombre_de_usuario}}})
            }
            Util.save_auditoria(auditoria_data_rol)

            auditoria_data_persona = {
                "id_usuario": usuario.pk,
                "id_modulo": 1,
                "cod_permiso": "CR",
                "subsistema": 'SEGU',
                "dirip": dirip,
                "descripcion": json.dumps({
                    "Mensaje": "Se crea persona",
                    "TipodeDocumentoID": str(persona.tipo_documento),
                    "NumeroDocumentoID": str(persona.numero_documento),
                    "PrimerNombre": str(persona.primer_nombre),
                    "PrimerApellido": str(persona.primer_apellido)
                }),
                "valores_actualizados": json.dumps({
                    "create": {
                        "Nuevo": {
                            "TipodeDocumentoID": str(persona.tipo_documento),
                            "NumeroDocumentoID": str(persona.numero_documento),
                            "PrimerNombre": str(persona.primer_nombre),
                            "PrimerApellido": str(persona.primer_apellido)
                        }
                    }
                })
            }
            Util.save_auditoria(auditoria_data_persona)

            # Enviar SMS si se tiene un teléfono válido
            sms = (
                f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
                f"persona natural registrada con documento {persona.numero_documento} y el nombre {persona.primer_nombre} {persona.primer_apellido}."
            )

            if persona.telefono_celular:
                telefono_a_usar = persona.telefono_celular  

            if telefono_a_usar:
                Util.send_sms(telefono_a_usar, sms)
            else:
                print("No se encontró teléfono válido para enviar el SMS.")

            # Envío de notificación por correo
            Util.notificacion(persona, "Registro exitoso Fedecaco", "email-register-persona-natural.html", nombre_de_usuario=nombre_de_usuario)

            # Generar respuesta con URLs de archivos
            persona_creada = self.serializer_class(persona).data
            persona_creada['archivo_rut'] = request.build_absolute_uri(persona.archivo_rut.url) if persona.archivo_rut else None
            persona_creada['camaraComercio'] = request.build_absolute_uri(persona.camaraComercio.url) if persona.camaraComercio else None
            persona_creada['documentoRepresentante'] = request.build_absolute_uri(persona.documentoRepresentante.url) if persona.documentoRepresentante else None

            data_alerta = {}
            data_alerta['cod_clase_alerta'] = 'Com_RegRec'
            data_alerta['informacion_complemento_mensaje'] = f"Se registro de persona natural con el siguiente tipo de documento: {persona.tipo_documento} y el número de documento: {persona.numero_documento} activar usuario: {nombre_de_usuario}"

            configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
            if configuracion_alerta.activa:
                Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)


            return Response({'success': True, 'detail': 'Se creó la persona natural y el usuario correctamente', 'data': persona_creada}, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response({'success': False, 'detail': e.detail}, status=status.HTTP_400_BAD_REQUEST)



class AutorizacionNotificacionesPersonas(generics.RetrieveUpdateAPIView):
    queryset = Personas.objects.all()
    permission_classes = [IsAuthenticated]

    def put(self, request):
        persona_ = self.request.user.id_usuario
        persona = self.request.user.persona
        data = request.data
        previous_user = copy.copy(persona)

        if 'acepta_autorizacion_email' in data and 'acepta_autorizacion_sms' in data:
            acepta_autorizacion_email = data['acepta_autorizacion_email']
            acepta_autorizacion_sms = data['acepta_autorizacion_sms']

            persona.acepta_notificacion_email = acepta_autorizacion_email
            persona.acepta_notificacion_sms = acepta_autorizacion_sms
            persona.save()

            # AUDITORIA AUTORIZACION NOTIFICACIONES
            dirip = Util.get_client_ip(request)
            tipo = persona.tipo_documento
            print(tipo.pk)
            print(type(tipo.pk))
            descripcion = {"Mensaje":"Se actualiza la autorización de notificaciones", "tipo_documento": persona.tipo_documento.pk, "numero_documento":persona.numero_documento}

            nuevo = {}
            anterior = {}
            # Verifico que campos cambiaron y los añado (los campos con llave foranea siempre se guardan)
            if previous_user.acepta_notificacion_email != data['acepta_autorizacion_email']:
                nuevo['acepta_notificacion_email'] = data['acepta_autorizacion_email']
                anterior['acepta_notificacion_email'] = previous_user.acepta_notificacion_email

            if previous_user.acepta_notificacion_sms != data['acepta_autorizacion_sms']:
                nuevo['acepta_notificacion_sms'] = data['acepta_autorizacion_sms']
                anterior['acepta_notificacion_sms'] = previous_user.acepta_notificacion_sms

            valores_actualizados = {"update": {"Nuevo": nuevo, "Anterior": anterior}}

            auditoria_data = {
                "id_usuario": persona_,
                "id_modulo": 1,
                "cod_permiso": 'AC',
                "subsistema": 'SEGU',
                "dirip": dirip,
                "descripcion": json.dumps(descripcion),
                "valores_actualizados": json.dumps(valores_actualizados)
            }

            Util.save_auditoria(auditoria_data)

            if acepta_autorizacion_email and acepta_autorizacion_sms:
                return Response({'success':True, 'detail':'Autorización por correo electrónico y teléfono aceptada'}, status=status.HTTP_200_OK)
            elif acepta_autorizacion_email:
                return Response({'success':True, 'detail':'Autorización por correo electrónico aceptada'}, status=status.HTTP_200_OK)
            elif acepta_autorizacion_sms:
                return Response({'success':True, 'detail':'Autorización por teléfono aceptada'}, status=status.HTTP_200_OK)
            else:
                return Response({'success':True, 'detail':'Autorizacion no aceptada'}, status=status.HTTP_200_OK)
        else:
            raise ValidationError('No envió las autorizaciones')

class GetPersonasByTipoDocumentoAndNumeroDocumentoAdminUser(GetPersonasByTipoDocumentoAndNumeroDocumento):
    serializer_class = PersonasFilterAdminUserSerializer
    queryset = Personas.objects.all()



class GetPersonasByFiltersAdminUser(GetPersonasByFilters):
    serializer_class = PersonasFilterAdminUserSerializer
    queryset = Personas.objects.all()


class HistoricoRepresentLegalView(generics.ListAPIView):
    serializer_class = HistoricoRepresentLegalSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, id_persona_empresa):
        if id_persona_empresa:
            queryset = HistoricoRepresentLegales.objects.filter(id_persona_empresa=id_persona_empresa)
            if queryset:
                serializer = self.serializer_class(queryset, many=True)
                return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response({'success':False, 'detail':'No se encontraron datos relacionados a la busqueda', 'data': []}, status=status.HTTP_404_NOT_FOUND)
        else:
            raise NotFound('No se envio el id de persona empresa a busacar')


class ValidacionTokenView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        #received_token = request.query_params.get('token', None)
        received_token = request.data.get('token', None)

        if received_token is None:
            return Response({'success': False, 'detail': 'No se ha ingresado el token.'}, status=status.HTTP_400_BAD_REQUEST)

        generated_token = request.user

        try:
            decoded_token = jwt.decode(received_token, algorithms=[], options={"verify_signature": False})
            if decoded_token['user_id'] != generated_token.id_usuario:
                return Response({'success': False, 'detail': 'El token no coincide con el usuario autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)
            return Response({'success': True, 'detail': 'El token es válido y coincide con el usuario autenticado.'}, status=status.HTTP_200_OK)
        except jwt.ExpiredSignatureError:
            return Response({'success': False, 'detail': 'El token ha expirado'}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.DecodeError:
            return Response({'success': False, 'detail': 'El token no es válido'}, status=status.HTTP_401_UNAUTHORIZED)



class DocumentosPersonaView(APIView):
    serializer_class = DocumentosPersonaSerializer

    def get(self, request):
        queryset = DocumentosPersona.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response({'success':True, 'detail':'Se encontraron los siguientes documentos', 'data':serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        print(request.FILES)
        data = DocumentosPersona.objects.create(
            archivo_rut=request.FILES.get('archivo')
        )
        print(data)
        # serializer = self.serializer_class(data=data)
        # serializer.is_valid(raise_exception=True)
        # serializer.save()
        return Response({'success':True, 'detail':'Se ha creado el documento'}, status=status.HTTP_201_CREATED)
    



class RepresentanteLegalCreateView(generics.CreateAPIView):
    serializer_class = RepresentanteLegalSerializer

    def post(self, request, *args, **kwargs):
        """ Servicio para registrar un representante legal """
        data = request.data.copy()
        user = request.user

        # Obtener la persona logueada (si existe)
        persona_logueada = user.persona if hasattr(user, 'persona') and user.persona else None

        # Extraer datos
        tipo_documento = data.get("tipo_documento")
        numero_documento = data.get("numero_documento")
        primer_nombre = data.get("primer_nombre")
        segundo_nombre = data.get("segundo_nombre", "")
        primer_apellido = data.get("primer_apellido")
        segundo_apellido = data.get("segundo_apellido", "")
        email = data.get("email")
        telefono_celular = data.get("telefono_celular")
        direccion_residencia = data.get("direccion_residencia")
        coordenada_x = data.get("coordenada_x")
        coordenada_y = data.get("coordenada_y")

        # Validar campos obligatorios
        required_fields = [tipo_documento, numero_documento, primer_nombre, primer_apellido, email, telefono_celular, direccion_residencia]
        if not all(required_fields):
            return Response({'success': False, 'detail': 'Todos los campos obligatorios deben estar llenos.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar si el número de documento ya existe
        if Personas.objects.filter(numero_documento=numero_documento).exists():
            return Response({'success': False, 'detail': 'Ya existe una persona con este documento.'}, status=status.HTTP_400_BAD_REQUEST)

        # # Validar si el correo ya está registrado
        # if Personas.objects.filter(email=email).exists():
        #     return Response({'success': False, 'detail': 'El correo electrónico ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar coordenadas X y Y (debe ser un número válido y dentro de los límites)
        try:
            if coordenada_x is not None:
                coordenada_x = float(coordenada_x)
            if coordenada_y is not None:
                coordenada_y = float(coordenada_y)
        except ValueError:
            return Response({'success': False, 'detail': 'Las coordenadas deben ser números válidos.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (-180 <= coordenada_x <= 180):
            return Response({'success': False, 'detail': 'La coordenada X debe estar entre -180 y 180.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (-90 <= coordenada_y <= 90):
            return Response({'success': False, 'detail': 'La coordenada Y debe estar entre -90 y 90.'}, status=status.HTTP_400_BAD_REQUEST)

        # Crear representante legal con id_persona_crea = persona logueada (o None si no hay persona asociada)
        representante = Personas.objects.create(
            tipo_documento_id=tipo_documento,
            numero_documento=numero_documento,
            primer_nombre=primer_nombre,
            segundo_nombre=segundo_nombre,
            primer_apellido=primer_apellido,
            segundo_apellido=segundo_apellido,
            email=email,
            telefono_celular=telefono_celular,
            direccion_residencia=direccion_residencia,
            tipo_persona="N", 
            id_persona_crea=persona_logueada,  
            coordenada_x=coordenada_x, 
            coordenada_y=coordenada_y
        )

        # Registrar auditoría (opcional, puedes descomentar esta parte si lo necesitas)
        # descripcion = {
        #     "Mensaje": "Se registró un nuevo representante legal",
        #     "Documento": numero_documento,
        #     "Nombre": f"{primer_nombre} {primer_apellido}"
        # }
        # Util.save_auditoria({
        #     "id_usuario": user.id_usuario,
        #     'id_modulo': 1,
        #     'cod_permiso': 'CR',
        #     'subsistema': 'SEGU',
        #     "dirip": Util.get_client_ip(request),
        #     "descripcion": descripcion,
        # })    

        # # Enviar el correo de notificación**
        
        # subject = "Representante Legal Registrado"
        # template = "email-representante-legal.html"
        
        # # Se pasan el primer nombre y el primer apellido de la persona al template
        # Util.notificacion(representante, subject, template, 
        #                 primer_nombre=representante.primer_nombre, 
        #                 primer_apellido=representante.primer_apellido)
       

        # # Enviar notificación por SMS**
        # sms = (
        #     f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: "
        #     f"representante legal registrado con documento {representante.numero_documento} y el nombre {representante.primer_nombre} {representante.primer_apellido}."
        # )
        # # Verificar si tiene teléfono celular 
        # if representante.telefono_celular:
        #     telefono_a_usar = representante.telefono_celular 

        # # Enviar SMS si se encontró un teléfono válido
        # if telefono_a_usar:
        #     Util.send_sms(telefono_a_usar, sms)
        # else:
        #     print("No se encontró teléfono válido para enviar el SMS.")
        

        # Devuelve el representante legal creado con la serialización
        return Response({
            "success": True,
            "detail": "Representante legal creado correctamente.",
            "data": RepresentanteLegalSerializer(representante).data
        }, status=status.HTTP_201_CREATED)



    
class GetRepresentantesLegalesView(generics.ListAPIView):
    serializer_class = RepresentanteLegalSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """ Servicio para obtener representantes legales creados por la persona logueada """
        user = request.user

        # Validar que el usuario tenga una persona asociada
        if not hasattr(user, 'persona') or user.persona is None:
            return Response({
                "success": False,
                "detail": "El usuario no tiene una persona asociada."
            }, status=status.HTTP_400_BAD_REQUEST)

        
        persona_logueada = user.persona

        # Filtrar representantes legales creados por la persona logueada
        representantes = Personas.objects.filter(
            user__isnull=True,
            id_persona_crea=persona_logueada,
            id_cargo__isnull=True, 
            representante_legal__isnull=True,
            tipo_persona="N", 
        )

        # Validar si hay resultados
        if not representantes.exists():
            return Response({
                "success": False,
                "detail": "No se encontraron representantes legales creados por la persona logueada."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(representantes, many=True)
        return Response({
            "success": True,
            "detail": "Lista de representantes legales creados por la persona logueada.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    

class VerificarPersonaPorDocumentoView(generics.GenericAPIView):

    def get(self, request):
        tipo_documento = request.query_params.get('tipo_documento')
        numero_documento = request.query_params.get('numero_documento')

        # Validación: campos requeridos
        if not tipo_documento or not numero_documento:
            return Response({
                "success": False,
                "detail": "Debe proporcionar 'tipo_documento' y 'numero_documento'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si el tipo_documento existe
        if not TipoDocumento.objects.filter(cod_tipo_documento=tipo_documento).exists():
            return Response({
                "success": False,
                "detail": f"El tipo de documento '{tipo_documento}' no existe."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar existencia de la persona
        existe = Personas.objects.filter(
            tipo_documento=tipo_documento,
            numero_documento=numero_documento
        ).exists()

        if existe:
            return Response({
                "success": True,
                "existe": True,
                "detail": "Ya existe una persona registrada con este tipo y número de documento."
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": True,
                "existe": False,
                "detail": "No existe una persona registrada con este tipo y número de documento."

            }, status=status.HTTP_200_OK)

class ProovedorCreateView(generics.CreateAPIView):
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        user = request.user
        persona_logueada = getattr(user, 'persona', None)
        tipo_persona = data.get("tipo_persona")
        tipo_documento = data.get("tipo_documento")
        numero_documento = data.get("numero_documento")
        # Sanitizar opcionales (vacío -> None)
        def _none_if_empty(v):
            return None if v is None or (isinstance(v, str) and v.strip() == "") else v

        email = _none_if_empty(data.get("email"))
        # direccion_notificaciones = _none_if_empty(data.get("direccion_notificaciones"))
        # coordenada_x = _none_if_empty(data.get("coordenada_x"))
        # coordenada_y = _none_if_empty(data.get("coordenada_y"))
        cod_municipio_expedicion_id = _none_if_empty(data.get("cod_municipio_expedicion_id"))

        # Resolver municipio de expedición (opcional). Si no existe, ignorar (no obligatorio)
        municipio_expedicion = None
        if cod_municipio_expedicion_id:
            try:
                municipio_expedicion = Municipio.objects.get(pk=cod_municipio_expedicion_id)
            except Municipio.DoesNotExist:
                municipio_expedicion = None

        if not tipo_persona:
            return Response({'success': False, 'detail': 'Debe enviar el tipo de persona (N o J).'}, status=status.HTTP_400_BAD_REQUEST)

        if not all([tipo_documento, numero_documento]):
            return Response({'success': False, 'detail': 'Faltan campos obligatorios: tipo_documento y numero_documento.'}, status=status.HTTP_400_BAD_REQUEST)

        persona_existente = Personas.objects.filter(
            numero_documento=numero_documento,
            tipo_documento_id=tipo_documento,
            tipo_persona=tipo_persona
        ).first()

        if persona_existente:
            if not persona_existente.proveedor:
                persona_existente.proveedor = True
                persona_existente.save()
                mensaje = "ya existía una persona registrada y fue actualizado como proveedor."
                return Response({
                    "success": True,
                    "detail": f"La persona con documento {numero_documento} y tipo {tipo_documento} {mensaje}",
                    "data": ProveedorSerializer(persona_existente).data
                }, status=status.HTTP_200_OK)
            else:
                mensaje = "ya era proveedor. No se hicieron cambios."
                return Response({
                    "success": False,
                    "detail": f"La persona con documento {numero_documento} y tipo {tipo_documento} {mensaje} Por favor, valide con otra solicitud."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Persona Natural
        if tipo_persona == "N":
            if tipo_documento == "NT":
                return Response({'success': False, 'detail': 'El tipo de documento NIT no es válido para persona natural.'}, status=status.HTTP_400_BAD_REQUEST)

            primer_nombre = data.get("primer_nombre")
            primer_apellido = data.get("primer_apellido")
            telefono_celular = _none_if_empty(data.get("telefono_celular"))  # opcional
            municipio_residencia_id = _none_if_empty(data.get("municipio_residencia"))
            municipio_residencia = None
            if municipio_residencia_id:
                try:
                    municipio_residencia = Municipio.objects.get(pk=municipio_residencia_id)
                except Municipio.DoesNotExist:
                    # Municipio residencia opcional; si no existe, lo dejamos en None
                    municipio_residencia = None

            # Requeridos mínimos para PN: nombre y apellido
            if not all([primer_nombre, primer_apellido]):
                return Response({'success': False, 'detail': 'Faltan datos de persona natural: primer nombre y primer apellido son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

            if data.get("nombre_comercial") or data.get("razon_social") or data.get("telefono_celular_empresa"):
                return Response({'success': False, 'detail': 'No debe enviar nombre_comercial, razon_social ni teléfono empresa en persona natural.'}, status=status.HTTP_400_BAD_REQUEST)

        # Persona Jurídica
        elif tipo_persona == "J":
            nombre_comercial = data.get("nombre_comercial")
            razon_social = data.get("razon_social")
            telefono_celular_empresa = _none_if_empty(data.get("telefono_celular_empresa"))  # opcional
            cod_municipio_laboral_nal = _none_if_empty(data.get("cod_municipio_laboral_nal"))

            if tipo_documento != "NT":
                return Response({'success': False, 'detail': 'El tipo de documento para persona jurídica debe ser NT.'}, status=status.HTTP_400_BAD_REQUEST)

            # Requeridos mínimos para PJ: nombre comercial y razón social
            if not all([nombre_comercial, razon_social]):
                return Response({'success': False, 'detail': 'Debe enviar nombre comercial y razón social para persona jurídica.'}, status=status.HTTP_400_BAD_REQUEST)

            if data.get("primer_nombre") or data.get("primer_apellido") or data.get("telefono_celular"):
                return Response({'success': False, 'detail': 'No debe enviar nombres o teléfono personal en persona jurídica.'}, status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response({'success': False, 'detail': 'Tipo de persona inválido. Use "N" o "J".'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar coordenadas (si se proporcionan)
        # if coordenada_x is not None or coordenada_y is not None:
        #     try:
        #         if coordenada_x is not None:
        #             coordenada_x = float(coordenada_x)
        #             if not (-180 <= coordenada_x <= 180):
        #                 return Response({'success': False, 'detail': 'La coordenada X debe estar entre -180 y 180.'}, status=status.HTTP_400_BAD_REQUEST)
        #         if coordenada_y is not None:
        #             coordenada_y = float(coordenada_y)
        #             if not (-90 <= coordenada_y <= 90):
        #                 return Response({'success': False, 'detail': 'La coordenada Y debe estar entre -90 y 90.'}, status=status.HTTP_400_BAD_REQUEST)
        #     except ValueError:
        #         return Response({'success': False, 'detail': 'Las coordenadas deben ser números válidos.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolver municipio laboral (opcional)
        municipio_laboral = None
        if tipo_persona == "J" and cod_municipio_laboral_nal:
            try:
                municipio_laboral = Municipio.objects.get(pk=cod_municipio_laboral_nal)
            except Municipio.DoesNotExist:
                municipio_laboral = None

        # Crear proveedor
        proveedor = Personas.objects.create(
            tipo_documento_id=tipo_documento,
            numero_documento=numero_documento,
            cod_municipio_expedicion_id=municipio_expedicion,
            municipio_residencia=municipio_residencia if tipo_persona == "N" else None,
            cod_municipio_laboral_nal=municipio_laboral if tipo_persona == "J" else None,
            tipo_persona=tipo_persona,
            id_persona_crea=persona_logueada,
            # direccion_notificaciones=direccion_notificaciones,
            # coordenada_x=coordenada_x if coordenada_x is not None else None,
            # coordenada_y=coordenada_y if coordenada_y is not None else None,
            email=email,
            proveedor=True,
            primer_nombre=data.get("primer_nombre") if tipo_persona == "N" else None,
            segundo_nombre=data.get("segundo_nombre") if tipo_persona == "N" else None,
            primer_apellido=data.get("primer_apellido") if tipo_persona == "N" else None,
            segundo_apellido=data.get("segundo_apellido") if tipo_persona == "N" else None,
            telefono_celular=telefono_celular if tipo_persona == "N" else None,
            nombre_comercial=data.get("nombre_comercial") if tipo_persona == "J" else None,
            razon_social=data.get("razon_social") if tipo_persona == "J" else None,
            telefono_celular_empresa=telefono_celular_empresa if tipo_persona == "J" else None,
  
        )

        # # Notificaciones
        # subject = "Proveedor Registrado"
        # template = "email-proovedor.html"
        # nombre_de_usuario = request.user.nombre_de_usuario

        # Util.notificacion(
        #     proveedor,
        #     subject,
        #     template,
        #     primer_nombre=proveedor.primer_nombre or proveedor.nombre_comercial,
        #     primer_apellido=proveedor.primer_apellido or proveedor.razon_social,
        #     nombre_de_usuario=nombre_de_usuario
        # )

        # # SMS
        # telefono_a_usar = proveedor.telefono_celular if proveedor.tipo_persona == "N" else proveedor.telefono_celular_empresa
        # if telefono_a_usar:
        #     nombre_identificacion = (
        #         proveedor.nombre_comercial if proveedor.tipo_persona == 'J'
        #         else f"{proveedor.primer_nombre} {proveedor.primer_apellido}"
        #     )
        #     mensaje_sms = (
        #         f"Portal de recaudo de Fedecacao - Fondo Nacional de Cacao: nuevo proveedor "
        #         f"identificado con documento {proveedor.numero_documento} a nombre de {nombre_identificacion}."
        #     )
        #     Util.send_sms(telefono_a_usar, mensaje_sms)

        return Response({
            "success": True,
            "detail": "Proveedor creado correctamente.",
            "data": ProveedorSerializer(proveedor).data
        }, status=status.HTTP_201_CREATED)


class ProveedoresListView(generics.ListAPIView):
    """ Vista para listar proveedores con filtros opcionales """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = Personas.objects.filter(proveedor=True).select_related(
            'tipo_documento',
            'municipio_residencia',
            'municipio_residencia__cod_departamento',
            'cod_municipio_expedicion_id',
            'cod_municipio_expedicion_id__cod_departamento',
            'cod_municipio_laboral_nal',
            'cod_municipio_laboral_nal__cod_departamento'
        )

        # Filtros opcionales
        nombre = self.request.query_params.get('nombre', None)
        apellido = self.request.query_params.get('apellido', None)
        razon_social = self.request.query_params.get('razon_social', None)
        nombre_comercial = self.request.query_params.get('nombre_comercial', None)
        cod_tipo_documento = self.request.query_params.get('cod_tipo_documento', None)
        tipo_documento = self.request.query_params.get('tipo_documento', None)  # Para compatibilidad con ID
        numero_documento = self.request.query_params.get('numero_documento', None)
        tipo_persona = self.request.query_params.get('tipo_persona', None)
        email = self.request.query_params.get('email', None)

        if nombre:
            queryset = queryset.filter(
                Q(primer_nombre__icontains=nombre) | 
                Q(segundo_nombre__icontains=nombre)
            )

        if apellido:
            queryset = queryset.filter(
                Q(primer_apellido__icontains=apellido) | 
                Q(segundo_apellido__icontains=apellido)
            )

        if razon_social:
            queryset = queryset.filter(razon_social__icontains=razon_social)

        if nombre_comercial:
            queryset = queryset.filter(nombre_comercial__icontains=nombre_comercial)

        # Filtro por código de tipo de documento (preferido) o por ID (para compatibilidad)
        if cod_tipo_documento:
            queryset = queryset.filter(tipo_documento__cod_tipo_documento=cod_tipo_documento)
        elif tipo_documento:
            # Si se envía tipo_documento, puede ser ID o código, intentamos ambos
            try:
                # Intentar como ID numérico
                tipo_doc_id = int(tipo_documento)
                queryset = queryset.filter(tipo_documento_id=tipo_doc_id)
            except ValueError:
                # Si no es numérico, tratar como código
                queryset = queryset.filter(tipo_documento__cod_tipo_documento=tipo_documento)

        # Filtro por número de documento (búsqueda exacta)
        if numero_documento:
            queryset = queryset.filter(numero_documento=numero_documento)

        # Filtro por tipo de persona
        if tipo_persona:
            queryset = queryset.filter(tipo_persona=tipo_persona)

        if email:
            queryset = queryset.filter(email__icontains=email)

        return queryset.order_by('-id_persona')

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Forzar paginación siempre a nivel de backend
        # Si no se envía el parámetro page, usar página 1 por defecto
        if 'page' not in request.query_params:
            request.query_params._mutable = True
            request.query_params['page'] = '1'
            request.query_params._mutable = False

        # Aplicar paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Si no hay resultados después de paginar, devolver respuesta vacía con estructura de paginación
        return Response({
            'success': True,
            'count': 0,
            'total_pages': 0,
            'current_page': 1,
            'next': None,
            'previous': None,
            'detail': 'No se encontraron proveedores con los filtros especificados',
            'data': []
        }, status=status.HTTP_200_OK)


class ProveedorRetrieveView(generics.RetrieveAPIView):
    """ Vista para obtener un proveedor por ID """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]
    queryset = Personas.objects.filter(proveedor=True)
    lookup_field = 'id_persona'

    def get(self, request, *args, **kwargs):
        try:
            proveedor = self.get_object()
        except Http404:
            return Response({
                'success': False,
                'detail': 'No se encontró el proveedor con el ID proporcionado'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(proveedor)
        return Response({
            'success': True,
            'detail': 'Proveedor obtenido correctamente',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class ProveedorUpdateView(generics.UpdateAPIView):
    """ Vista para actualizar un proveedor """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]
    queryset = Personas.objects.filter(proveedor=True)
    lookup_field = 'id_persona'

    def patch(self, request, *args, **kwargs):
        data = request.data.copy()
        user = request.user
        persona_logueada = getattr(user, 'persona', None)

        try:
            proveedor = self.get_object()
        except Http404:
            return Response({
                'success': False,
                'detail': 'No se encontró el proveedor con el ID proporcionado'
            }, status=status.HTTP_404_NOT_FOUND)

        # Sanitizar opcionales (vacío -> None)
        def _none_if_empty(v):
            return None if v is None or (isinstance(v, str) and v.strip() == "") else v

        tipo_persona_actual = proveedor.tipo_persona
        nuevo_tipo_persona = data.get('tipo_persona')
        if nuevo_tipo_persona is None:
            nuevo_tipo_persona = tipo_persona_actual
        else:
            nuevo_tipo_persona = nuevo_tipo_persona.upper()
            data['tipo_persona'] = nuevo_tipo_persona
        if nuevo_tipo_persona not in ("N", "J"):
            return Response({
                'success': False,
                'detail': 'Tipo de persona inválido. Use "N" o "J".'
            }, status=status.HTTP_400_BAD_REQUEST)

        if 'tipo_documento' in data:
            tipo_documento_value = data['tipo_documento']
            if isinstance(tipo_documento_value, str):
                tipo_documento_value = tipo_documento_value.upper()
                data['tipo_documento'] = tipo_documento_value
        else:
            tipo_documento_value = proveedor.tipo_documento_id

        tipo_documento_comparable = str(tipo_documento_value).upper() if isinstance(tipo_documento_value, str) else str(tipo_documento_value)

        if nuevo_tipo_persona == "N" and tipo_documento_comparable == "NT":
            return Response({
                'success': False,
                'detail': 'El tipo de documento NIT no es válido para persona natural.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if nuevo_tipo_persona == "J" and tipo_documento_comparable != "NT":
            return Response({
                'success': False,
                'detail': 'El tipo de documento para persona jurídica debe ser NT.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if nuevo_tipo_persona == "N":
            primer_nombre = data.get("primer_nombre", proveedor.primer_nombre)
            primer_apellido = data.get("primer_apellido", proveedor.primer_apellido)
            if not primer_nombre or not primer_apellido:
                return Response({
                    'success': False,
                    'detail': 'Para persona natural debe proporcionar primer nombre y primer apellido.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("nombre_comercial")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar nombre comercial para persona natural.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("razon_social")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar razón social para persona natural.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("telefono_celular_empresa")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar teléfono empresarial para persona natural.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("cod_municipio_laboral_nal")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar municipio laboral para persona natural.'
                }, status=status.HTTP_400_BAD_REQUEST)

            data['nombre_comercial'] = None
            data['razon_social'] = None
            data['telefono_celular_empresa'] = None
            data['cod_municipio_laboral_nal'] = None

        if nuevo_tipo_persona == "J":
            nombre_comercial = data.get("nombre_comercial", proveedor.nombre_comercial)
            razon_social = data.get("razon_social", proveedor.razon_social)
            if not nombre_comercial or not razon_social:
                return Response({
                    'success': False,
                    'detail': 'Debe enviar nombre comercial y razón social para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("primer_nombre")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar nombres personales para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("primer_apellido")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar apellidos personales para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("segundo_nombre")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar nombres personales para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("segundo_apellido")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar apellidos personales para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("telefono_celular")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar teléfono personal para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if _none_if_empty(data.get("municipio_residencia")) not in (None, ""):
                return Response({
                    'success': False,
                    'detail': 'No debe enviar municipio de residencia para persona jurídica.'
                }, status=status.HTTP_400_BAD_REQUEST)

            data['primer_nombre'] = None
            data['segundo_nombre'] = None
            data['primer_apellido'] = None
            data['segundo_apellido'] = None
            data['telefono_celular'] = None
            data['municipio_residencia'] = None

        # Validar coordenadas si se proporcionan
        # coordenada_x = _none_if_empty(data.get("coordenada_x"))
        # coordenada_y = _none_if_empty(data.get("coordenada_y"))
        
        # if coordenada_x is not None or coordenada_y is not None:
        #     try:
        #         if coordenada_x is not None:
        #             coordenada_x = float(coordenada_x)
        #             if not (-180 <= coordenada_x <= 180):
        #                 return Response({
        #                     'success': False,
        #                     'detail': 'La coordenada X debe estar entre -180 y 180.'
        #                 }, status=status.HTTP_400_BAD_REQUEST)
        #         if coordenada_y is not None:
        #             coordenada_y = float(coordenada_y)
        #             if not (-90 <= coordenada_y <= 90):
        #                 return Response({
        #                     'success': False,
        #                     'detail': 'La coordenada Y debe estar entre -90 y 90.'
        #                 }, status=status.HTTP_400_BAD_REQUEST)
        #     except ValueError:
        #         return Response({
        #             'success': False,
        #             'detail': 'Las coordenadas deben ser números válidos.'
        #         }, status=status.HTTP_400_BAD_REQUEST)

        # Resolver municipio de expedición (igual que en CREATE)
        cod_municipio_expedicion_id = _none_if_empty(data.get("cod_municipio_expedicion_id"))
        municipio_expedicion = None
        if cod_municipio_expedicion_id:
            try:
                municipio_expedicion = Municipio.objects.get(pk=cod_municipio_expedicion_id)
                data['cod_municipio_expedicion_id'] = municipio_expedicion.cod_municipio
            except Municipio.DoesNotExist:
                return Response({
                    'success': False,
                    'detail': 'El municipio de expedición no existe.'
                }, status=status.HTTP_400_BAD_REQUEST)
        elif cod_municipio_expedicion_id is not None:
            # Si se envía None explícitamente, limpiar el campo
            data['cod_municipio_expedicion_id'] = None

        # Resolver municipio de residencia (solo para persona natural, igual que en CREATE)
        if nuevo_tipo_persona == "N":
            municipio_residencia_id = _none_if_empty(data.get("municipio_residencia"))
            municipio_residencia = None
            if municipio_residencia_id:
                try:
                    municipio_residencia = Municipio.objects.get(pk=municipio_residencia_id)
                    data['municipio_residencia'] = municipio_residencia.pk
                except Municipio.DoesNotExist:
                    return Response({
                        'success': False,
                        'detail': 'El municipio de residencia no existe.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif municipio_residencia_id is not None:
                # Si se envía None explícitamente, limpiar el campo
                data['municipio_residencia'] = None

        # Resolver municipio laboral (solo para persona jurídica, igual que en CREATE)
        if nuevo_tipo_persona == "J":
            cod_municipio_laboral_nal = _none_if_empty(data.get("cod_municipio_laboral_nal"))
            municipio_laboral = None
            if cod_municipio_laboral_nal:
                try:
                    municipio_laboral = Municipio.objects.get(pk=cod_municipio_laboral_nal)
                    data['cod_municipio_laboral_nal'] = municipio_laboral.pk
                except Municipio.DoesNotExist:
                    return Response({
                        'success': False,
                        'detail': 'El municipio laboral no existe.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif cod_municipio_laboral_nal is not None:
                # Si se envía None explícitamente, limpiar el campo
                data['cod_municipio_laboral_nal'] = None

        # Actualizar campos de fecha
        data['fecha_ultim_actualiz_diferente_crea'] = datetime.now()
        if persona_logueada:
            data['id_persona_ultim_actualiz_diferente_crea'] = persona_logueada

        # Serializar y validar
        serializer = self.get_serializer(proveedor, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        proveedor_actualizado = serializer.save()

        return Response({
            'success': True,
            'detail': 'Proveedor actualizado correctamente.',
            'data': ProveedorSerializer(proveedor_actualizado).data
        }, status=status.HTTP_200_OK)


class ProveedorDeleteView(generics.DestroyAPIView):
    """ Vista para eliminar un proveedor (soft delete - cambia proveedor a False) """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]
    queryset = Personas.objects.filter(proveedor=True)
    lookup_field = 'id_persona'

    def delete(self, request, *args, **kwargs):
        try:
            proveedor = self.get_object()
        except Http404:
            return Response({
                'success': False,
                'detail': 'No se encontró el proveedor con el ID proporcionado'
            }, status=status.HTTP_404_NOT_FOUND)

        # Soft delete: cambiar proveedor a False en lugar de eliminar físicamente
        proveedor.proveedor = False
        proveedor.save()

        return Response({
            'success': True,
            'detail': 'Proveedor eliminado correctamente (ya no es proveedor).',
            'data': ProveedorSerializer(proveedor).data
        }, status=status.HTTP_200_OK)


class IdentificacionTemporalView(generics.GenericAPIView):
    serializer_class = IdentificacionTemporalSerializer
    permission_classes = [IsAuthenticated]

    def get_cod_recuperacion(self):
        # Generar un código de recuperación aleatorio
        cod_recuperacion = str(uuid.uuid4())[:8]
        while IdentificacionTemporal.objects.filter(cod_recuperacion=cod_recuperacion).exists():
            cod_recuperacion = str(uuid.uuid4())[:8]
        return cod_recuperacion

    def get(self, request, *args, **kwargs):
        #Obtener parametros de la peticion numero documento y tipo documento
        cod_tipo_documento = request.query_params.get('cod_tipo_documento') 
        numero_documento = request.query_params.get('numero_documento')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        identificaciones_temporales = IdentificacionTemporal.objects.all()

        persona = Personas.objects.filter(
            tipo_documento=cod_tipo_documento,
            numero_documento=numero_documento
        ).first()
        
        if fecha_inicio and fecha_fin:

            try:
                fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')
            except ValueError:
                return Response({
                    "success": False,
                    "detail": "Formato de fecha inválido. Use 'YYYY-MM-DD'."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if fecha_inicio > fecha_fin:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio no puede ser mayor que la fecha de fin."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            identificaciones_temporales = identificaciones_temporales.filter(
                fecha_creacion__gte=fecha_inicio,
                fecha_creacion__lte=fecha_fin,
            ).order_by('-fecha_creacion')
            if identificaciones_temporales.exists():
                serializer = self.serializer_class(identificaciones_temporales, many=True)
                return Response({
                    "success": True,
                    "detail": "Identificaciones temporales obtenidas correctamente.",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "detail": "No se encontraron identificaciones temporales en el rango de fechas especificado."
                }, status=status.HTTP_404_NOT_FOUND)
            
        elif numero_documento or cod_tipo_documento:
            
            if cod_tipo_documento != None:

                try:
                    cod_tipo_documento = TipoDocumento.objects.get(cod_tipo_documento=cod_tipo_documento)
                except TipoDocumento.DoesNotExist:
                    return Response({
                        "success": False,
                        "detail": f"El tipo de documento '{cod_tipo_documento}' no existe."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                cod_tipo_documento = cod_tipo_documento.cod_tipo_documento


                # Obtener la identificación temporal de la persona logueada
                identificacion_temporal = identificaciones_temporales.filter(
                    cod_tipo_documento=cod_tipo_documento
                )
            
            if numero_documento != None:
                # Obtener la identificación temporal de la persona logueada
                identificacion_temporal = identificaciones_temporales.filter(
                    numero_documento=numero_documento
                )

            if not identificacion_temporal:
                return Response({
                    "success": False,
                    "detail": "No se encontró la identificación temporal."
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = self.serializer_class(identificacion_temporal, many=True)
            return Response({
                "success": True,
                "detail": "Identificación temporal obtenida correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        else:
            serializer = self.serializer_class(identificaciones_temporales, many=True)
            return Response({
                "success": True,
                "detail": "Identificaciones temporales obtenidas correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
    def post(self, request, *args, **kwargs):
        data = request.data
        cod_tipo_documento = data.get('cod_tipo_documento') if data.get('cod_tipo_documento') != '' else None
        numero_documento = data.get('numero_documento') if data.get('numero_documento') != '' else None
        tel_celular = data.get('tel_celular') if data.get('tel_celular') != '' else None
        numero_documento_contacto = data.get('numero_documento_contacto') if data.get('numero_documento_contacto') != '' else None

        try:
            if cod_tipo_documento:
                tipo_documento = TipoDocumento.objects.filter(cod_tipo_documento=cod_tipo_documento).first()
                cod_tipo_documento = tipo_documento.cod_tipo_documento
        except TipoDocumento.DoesNotExist:
            return Response({
                "success": False,
                "detail": f"El tipo de documento '{cod_tipo_documento}' no existe."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            Utils.validador_dato_tipo("texto", cod_tipo_documento) if cod_tipo_documento  else None
            Utils.validador_dato_tipo("entero", numero_documento) if numero_documento else None
            Utils.validador_dato_tipo("entero", tel_celular) if tel_celular else None
            Utils.validador_dato_tipo("entero", numero_documento_contacto) if numero_documento_contacto else None
        except ValueError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar si la persona ya esta registrado
        
        if Personas.objects.filter(numero_documento=data.get('numero_documento'), 
                                   tipo_documento=cod_tipo_documento).exists():
            return Response({'success': False, 'detail': 'Ya existe una persona registrada con este documento.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if IdentificacionTemporal.objects.filter(numero_documento=data.get('numero_documento'),
                                    cod_tipo_documento=cod_tipo_documento).exists():
            return Response({'success': False, 'detail': 'Ya existe una identificación temporal registrada con este documento.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Agregar codigo de recuperacion
        data['cod_recuperacion'] = self.get_cod_recuperacion()

        # Agregar persona que crea
        user_id = request.user.id_usuario 
        usuario = User.objects.filter(id_usuario=user_id).first()

        if usuario:
            data['id_persona_crea'] = usuario.persona.id_persona
        else:
            data['id_persona_crea'] = None

        # Crear la identificación temporal
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        identificacion_temporal = serializer.save()
        
        # # Notificación SMS Identificacion
        # telefono_a_usar = identificacion_temporal.tel_celular

        # if telefono_a_usar:
        #     mensaje_sms = (
        #         f"FEDECACAO: Bienvenido {identificacion_temporal.nombre}. "
        #         f"Regístrese para acceder a beneficios. Más info: www.fedecacao.com.co, PBX: +57(601)3273000 o visite la oficina más cercana."
        #     )

        #     Util.send_sms(telefono_a_usar, mensaje_sms)

        # email = identificacion_temporal.email
        # # Enviar correo de notificación
        # if email:
        #     template_name = "email-identificacion-temporal.html"
        #     context = {'nombre': identificacion_temporal.nombre,'fecha_actual':str(datetime.now().replace(microsecond=0)),'email': email, 'codigo_recuperacion': identificacion_temporal.cod_recuperacion}
        #     template = render_to_string((template_name), context)
        #     subject = "FEDCACAO: Bienvenido a la plataforma de Fedecacao"
        #     # Enviar el correo
        #     email_data = {'template': template, 'email_subject': subject, 'to_email': email}
        #     Util.send_email(email_data)

        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_IdeRec'
        data_alerta['informacion_complemento_mensaje'] = f"Se ha creado una identificación temporal con el número de documento {numero_documento} y el tipo de documento {cod_tipo_documento}."

        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        return Response({
            "success": True,
            "detail": "Identificación temporal creada correctamente.",
            "data": self.serializer_class(identificacion_temporal).data
        }, status=status.HTTP_201_CREATED)
    

class UpdateIdentificacionTemporalView(generics.RetrieveUpdateAPIView):
    serializer_class = IdentificacionTemporalSerializer
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        data = request.data
        data = request.data
        cod_tipo_documento = data.get('cod_tipo_documento') if data.get('cod_tipo_documento') != '' else None
        numero_documento = data.get('numero_documento') if data.get('numero_documento') != '' else None
        tel_celular = data.get('tel_celular') if data.get('tel_celular') != '' else None
        numero_documento_contacto = data.get('numero_documento_contacto') if data.get('numero_documento_contacto') != '' else None

        try:
            if cod_tipo_documento:
                tipo_documento = TipoDocumento.objects.filter(cod_tipo_documento=cod_tipo_documento).first()
                cod_tipo_documento = tipo_documento.cod_tipo_documento
        except TipoDocumento.DoesNotExist:
            return Response({
                "success": False,
                "detail": f"El tipo de documento '{cod_tipo_documento}' no existe."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            Utils.validador_dato_tipo("texto", cod_tipo_documento) if cod_tipo_documento  else None
            Utils.validador_dato_tipo("entero", numero_documento) if numero_documento else None
            Utils.validador_dato_tipo("entero", tel_celular) if tel_celular else None
            Utils.validador_dato_tipo("entero", numero_documento_contacto) if numero_documento_contacto else None
        except ValueError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        identificacion_temporal = IdentificacionTemporal.objects.filter(id_identificacion_temporal=pk).first()
        if not identificacion_temporal:
            return Response({
                "success": False,
                "detail": "No se encontró la identificación temporal."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validar si la persona ya esta registrado
        if Personas.objects.filter(numero_documento=data.get('numero_documento'), 
                                   tipo_documento=cod_tipo_documento).exists():
            return Response({'success': False, 'detail': 'Ya existe una persona registrada con este documento.'}, status=status.HTTP_400_BAD_REQUEST)

        #Actualizar los datos
        serializer = self.serializer_class(identificacion_temporal, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        identificacion_temporal = serializer.save()

        return Response({
            "success": True,
            "detail": "Identificación temporal actualizada correctamente.",
            "data": self.serializer_class(identificacion_temporal).data
        }, status=status.HTTP_200_OK)  
    



class PersonaFirmanDocumentosView(generics.ListAPIView):
    serializer_class = PersonaFirmanDocumentosSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tipo_documento = request.query_params.get('tipo_documento')
        nro_documento = request.query_params.get('nro_documento')
        primer_nombre = request.query_params.get('primer_nombre')
        primer_apellido = request.query_params.get('primer_apellido')

        personas = Personas.objects.annotate(doble_factor=Exists(
            User.objects.filter(
                persona_id=OuterRef('id_persona'),
                tiene_2FA=True 
            )
        )).filter(tipo_persona='N', doble_factor=True)

        if tipo_documento:
            personas = personas.filter(tipo_documento=tipo_documento)

        if nro_documento:
            personas = personas.filter(numero_documento__icontains=nro_documento)

        if primer_nombre:
            personas = personas.filter(primer_nombre__icontains=primer_nombre)

        if primer_apellido:
            personas = personas.filter(primer_apellido__icontains=primer_apellido)

        serializer = self.serializer_class(personas, many=True)
        return Response({
            "success": True,
            "detail": "Lista de personas obtenida correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


# Views for Tipo Comprador
class GetTipoComprador(generics.GenericAPIView):
    serializer_class = TipoCompradorSerializer

    def get(self, request):
        active = request.query_params.get('activo')
        tipo_comprador = TipoComprador.objects.filter(activo=active).order_by('cod_tipo_comprador')

        if tipo_comprador.exists():
            serializer = self.serializer_class(tipo_comprador, many=True)
            return Response({'success': True, 'detail': 'Se encontraron los siguientes tipos de compradores', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success': False, 'detail': 'No se encontraron tipos de compradores'}, status=status.HTTP_404_NOT_FOUND)


class GetTipoCompradorById(generics.RetrieveAPIView):
    serializer_class = TipoCompradorSerializer
    permission_classes = [IsAuthenticated] # PermisoConsultarTipoComprador]

    def get(self, request, pk):
        if pk:
            tipos_comprador = TipoComprador.objects.filter(cod_tipo_comprador=pk, activo=True)
            if tipos_comprador:
                serializer = self.serializer_class(tipos_comprador, many=True)
                return Response({'success':True, 'detail':'Se encontro el siguiente dato', 'data': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response({'success':False, 'detail':'No se encontró ningún tipo de documento con estos parámetros o esta inactivo'}, status=status.HTTP_404_NOT_FOUND)
        else:
            raise NotFound('No se envio el id del tipo de documento')


class DeleteTipoComprador(generics.RetrieveDestroyAPIView):
    serializer_class = TipoCompradorSerializer
    permission_classes = [IsAuthenticated]
    queryset = TipoComprador.objects.all()

    def delete(self, request, pk):
        tipo_comprador = TipoComprador.objects.filter(cod_tipo_comprador=pk).first()
        if tipo_comprador:
            if tipo_comprador.precargado == False:
                if tipo_comprador.item_ya_usado == True:
                    raise PermissionDenied('Este tipo de documento ya está siendo usado, por lo cúal no es eliminable')
                tipo_comprador.delete()
                return Response({'success':True, 'detail':'Este tipo de documento ha sido eliminado exitosamente'}, status=status.HTTP_200_OK)
            else:
                raise PermissionDenied('No puedes eliminar un tipo de documento precargado')
        else:
            raise NotFound('No se encontró ningún tipo de documento con estos parámetros')


class RegisterTipoComprador(generics.CreateAPIView):
    serializer_class = TipoCompradorPostSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({'success':True, 'detail':'Se creo el tipo de documento correctamente'}, status=status.HTTP_201_CREATED)


class UpdateTipoComprador(generics.RetrieveUpdateAPIView):
    serializer_class = TipoCompradorPutSerializer
    queryset = TipoComprador.objects.all()
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        tipo_comprador = TipoComprador.objects.filter(cod_tipo_comprador=pk).first()
        if tipo_comprador:
            if tipo_comprador.precargado == False:
                if tipo_comprador.item_ya_usado == True:
                    raise PermissionDenied('Este tipo de documento ya está siendo usado, por lo cúal no es actualizable')

                serializer = self.serializer_class(tipo_comprador, data=request.data, many=False)
                serializer.is_valid(raise_exception=True)
                serializer.save()

                return Response({'success':True, 'detail':'Registro actualizado exitosamente'}, status=status.HTTP_200_OK)
            else:
                raise PermissionDenied('Este es un dato precargado en el sistema, no se puede actualizar')
        else:
            raise NotFound('No se encontró ningún tipo de documento con estos parámetros')


class ObtenerDatosPersonaPagoView(generics.ListAPIView):
    serializer_class = DatosPersonaPagosSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        id_persona = request.user.persona.id_persona
        persona = Personas.objects.filter(id_persona=id_persona).first()
        if not persona:
            return Response({
                "success": False,
                "detail": "No se encontró la persona asociada al usuario."
            }, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(persona)
        return Response({
            "success": True,
            "detail": "Datos de la persona obtenidos correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class ObtenerTipoCompradorUsuarioView(generics.RetrieveAPIView):
    """
    Vista para obtener el tipo de comprador del usuario actual
    """
    serializer_class = UsuarioTipoCompradorSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene la información del tipo de comprador del usuario autenticado
        """
        try:
            usuario = request.user
            serializer = self.serializer_class(usuario)
            
            return Response({
                "success": True,
                "detail": "Tipo de comprador obtenido correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener el tipo de comprador: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActualizarTipoCompradorUsuarioView(generics.UpdateAPIView):
    """
    Vista para actualizar el tipo de comprador del usuario actual
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ['patch']

    def patch(self, request):
        """
        Actualiza el tipo de comprador del usuario autenticado
        """
        try:
            persona = request.user.persona
            cod_tipo_comprador = request.data.get('cod_tipo_comprador')
            
            if not cod_tipo_comprador:
                return Response({
                    "success": False,
                    "detail": "El campo 'cod_tipo_comprador' es requerido."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar que el tipo de comprador existe
            try:
                # Si es múltiple, validar cada uno
                if '|' in cod_tipo_comprador:
                    codigos = cod_tipo_comprador.split('|')
                    for codigo in codigos:
                        TipoComprador.objects.get(cod_tipo_comprador=codigo.strip(), activo=True)
                else:
                    TipoComprador.objects.get(cod_tipo_comprador=cod_tipo_comprador, activo=True)
            except TipoComprador.DoesNotExist:
                return Response({
                    "success": False,
                    "detail": "El tipo de comprador especificado no existe o no está activo."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Actualizar el tipo de comprador
            persona.cod_tipo_comprador = cod_tipo_comprador
            persona.save(update_fields=['cod_tipo_comprador'])
            
            # Auditoría de actualización
            usuario_id = request.user.id_usuario
            direccion = Util.get_client_ip(request)
            descripcion = {
                "Mensaje": f"Usuario {request.user.nombre_de_usuario} actualizó su tipo de comprador a: {cod_tipo_comprador}",
                "Usuario": request.user.nombre_de_usuario,
                "Persona": f"{persona.primer_nombre} {persona.primer_apellido}",
                "Tipo de comprador anterior": persona.cod_tipo_comprador,
                "Tipo de comprador nuevo": cod_tipo_comprador
            }
            
            # Registrar auditoría
            try:
                modulo = Modulos.objects.get(nombre_modulo="Actualización de Perfil")
                permiso = Permisos.objects.get(cod_permiso="AC")
                
                Auditorias.objects.create(
                    id_usuario_id=usuario_id,
                    id_modulo=modulo,
                    subsistema="SEG",
                    id_cod_permiso_accion=permiso,
                    dirip=direccion,
                    descripcion=str(descripcion),
                    valores_actualizados=f"cod_tipo_comprador: {cod_tipo_comprador}"
                )
            except (Modulos.DoesNotExist, Permisos.DoesNotExist):
                pass  # Si no existe el módulo o permiso, continuar sin auditoría
            
            return Response({
                "success": True,
                "detail": "Tipo de comprador actualizado correctamente.",
                "data": {
                    "cod_tipo_comprador": persona.cod_tipo_comprador
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al actualizar el tipo de comprador: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ObtenerUbicacionUsuarioView(generics.RetrieveAPIView):
    """
    Vista para obtener la información de ubicación del usuario actual
    """
    serializer_class = UsuarioUbicacionSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene la información de ubicación del usuario autenticado
        """
        try:
            usuario = request.user
            serializer = self.serializer_class(usuario)
            
            return Response({
                "success": True,
                "detail": "Información de ubicación obtenida correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener la información de ubicación: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# CRUD Views para Municipios
class MunicipioListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear municipios
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MunicipioCreateSerializer
        return MunicipioSerializer
    
    def get_queryset(self):
        """
        Obtiene la lista de municipios con filtros opcionales
        """
        queryset = Municipio.objects.select_related('cod_departamento').all()
        
        # Filtros opcionales
        cod_departamento = self.request.query_params.get('cod_departamento')
        es_cacaotero = self.request.query_params.get('es_cacaotero')
        nombre = self.request.query_params.get('nombre')
        
        if cod_departamento:
            queryset = queryset.filter(cod_departamento=cod_departamento)
        
        if es_cacaotero is not None:
            es_cacaotero_bool = es_cacaotero.lower() == 'true'
            queryset = queryset.filter(es_cacaotero=es_cacaotero_bool)
        
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
        
        return queryset.order_by('cod_departamento__nombre', 'nombre')
    
    def list(self, request, *args, **kwargs):
        """
        Lista todos los municipios con paginación
        """
        queryset = self.get_queryset()
        sin_paginacion = self.request.query_params.get('sin_paginacion')
        if sin_paginacion == 'true':
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                "success": True,
                "detail": "Municipios obtenidos correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "detail": "Municipios obtenidos correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    
    def create(self, request, *args, **kwargs):
        """
        Crea un nuevo municipio
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        municipio = serializer.save()
        
        # Serializar la respuesta con información completa
        response_serializer = MunicipioSerializer(municipio)
        
        return Response({
            "success": True,
            "detail": "Municipio creado correctamente.",
            "data": response_serializer.data
        }, status=status.HTTP_201_CREATED)


class MunicipioRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar y eliminar un municipio específico
    """
    queryset = Municipio.objects.select_related('cod_departamento').all()
    lookup_field = 'cod_municipio'
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return MunicipioUpdateSerializer
        return MunicipioSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene un municipio específico
        """
        municipio = self.get_object()
        serializer = self.get_serializer(municipio)
        
        return Response({
            "success": True,
            "detail": "Municipio obtenido correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """
        Actualiza un municipio
        """
        municipio = self.get_object()
        serializer = self.get_serializer(municipio, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        municipio_actualizado = serializer.save()
        
        # Serializar la respuesta con información completa
        response_serializer = MunicipioSerializer(municipio_actualizado)
        
        return Response({
            "success": True,
            "detail": "Municipio actualizado correctamente.",
            "data": response_serializer.data
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """
        Elimina un municipio
        """
        municipio = self.get_object()
        
        # Verificar si el municipio está siendo usado en diferentes tablas
        from django.db import models as django_models
        from seguridad.models.transversal_models import Personas, HistoricoDireccion
        from recaudos.models.recaudos_models import FacturaUnica
        
        # Verificar en tabla Personas
        if Personas.objects.filter(
            django_models.Q(municipio_residencia=municipio) |
            django_models.Q(cod_municipio_expedicion_id=municipio) |
            django_models.Q(cod_municipio_laboral_nal=municipio) |
            django_models.Q(cod_municipio_notificacion_nal=municipio)
        ).exists():
            return Response({
                "success": False,
                "detail": "No se puede eliminar el municipio porque está siendo utilizado por personas registradas."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar en tabla HistoricoDireccion
        if HistoricoDireccion.objects.filter(cod_municipio=municipio).exists():
            return Response({
                "success": False,
                "detail": "No se puede eliminar el municipio porque está siendo utilizado en el histórico de direcciones."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar en tabla FacturaUnica (recaudos)
        if FacturaUnica.objects.filter(id_municipio_cacao=municipio).exists():
            return Response({
                "success": False,
                "detail": "No se puede eliminar el municipio porque está siendo utilizado en facturas de recaudos."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        municipio.delete()
        
        return Response({
            "success": True,
            "detail": "Municipio eliminado correctamente."
        }, status=status.HTTP_200_OK)


class MunicipioByDepartamentoView(generics.ListAPIView):
    """
    Vista para obtener municipios por departamento
    """
    serializer_class = MunicipioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Obtiene municipios filtrados por departamento
        """
        cod_departamento = self.kwargs.get('cod_departamento')
        return Municipio.objects.filter(cod_departamento=cod_departamento).select_related('cod_departamento').order_by('nombre')
    
    def list(self, request, *args, **kwargs):
        """
        Lista municipios por departamento
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            "success": True,
            "detail": f"Municipios del departamento obtenidos correctamente.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)