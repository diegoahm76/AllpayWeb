from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import json
from permissions.permissions_seguridad import PermisoActualizarAdministracionDeRoles, PermisoConsultarAdministracionDeRoles, PermisoCrearAdministracionDeRoles, PermisoEliminarAdministracionDeRoles
from seguridad.models.seguridad_models import Auditorias, HistoricoActivacion, Modulos, OperacionesSobreUsuario, Permisos, PermisosModuloRol, Roles, UsuariosRol,User, UsuariosRol
from seguridad.models.transversal_models import Cargos, Personas
from rest_framework import status
from seguridad.serializers.permisos_serializers import PermisosModuloRolSerializer
from seguridad.serializers.roles_serializers import AuditoriaSerializer, RolesSerializer, UsuarioRolesSerializers,RolesByIdUsuarioSerializer
from seguridad.serializers.user_serializers import UsuarioRolesLookSerializers
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response    
from rest_framework.generics import ListAPIView, CreateAPIView , RetrieveAPIView, DestroyAPIView, UpdateAPIView, RetrieveUpdateAPIView
from rest_framework import generics
from seguridad.utils import Util
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from django.db.models import Count, Prefetch
from django.db import transaction
from django.utils.timezone import now
import copy    

class GetRolesByUser(ListAPIView):
    serializer_class = UsuarioRolesLookSerializers
    def get_queryset(self):
        try:
            queryset = UsuariosRol.objects.all()
            query = self.request.query_params.get('keyword')
            if query == None:
                query = 0
            queryset = queryset.filter(id_usuario = query)
            return Response({'success':True, 'detail':'Se encontraron los siguientes roles', 'data': queryset}, status=status.HTTP_200_OK)
        except:
            return Response({'success':False, 'detail':'No se encontraron los siguientes roles', 'data': []}, status=status.HTTP_404_NOT_FOUND)

class GetUsersByRol(ListAPIView):
    serializer_class = UsuarioRolesLookSerializers
    permission_classes = [IsAuthenticated]

    def get(self, request, id_rol):
        queryset = UsuariosRol.objects.filter(id_rol=id_rol)
        if queryset:
            serializer = self.serializer_class(queryset, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes usuarios por el rol elegido', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron usuarios', 'data': []}, status=status.HTTP_404_NOT_FOUND)


class GetRolById(RetrieveAPIView):
    serializer_class=RolesSerializer
    permission_classes = [IsAuthenticated]
    queryset=Roles.objects.all()


class GetRolByName(ListAPIView):
    serializer_class=RolesSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        keyword = self.request.query_params.get('keyword')
        queryset = Roles.objects.filter(nombre_rol__icontains = keyword)
        return queryset

class GetRol(generics.GenericAPIView):

    serializer_class=RolesSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset=Roles.objects.all().exclude(id_rol=1).order_by('nombre_rol')
        if queryset:
            serializer = self.serializer_class(queryset, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes roles', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron los siguientes roles', 'data': []}, status=status.HTTP_404_NOT_FOUND)

class RegisterRol(generics.CreateAPIView):
    serializer_class=RolesSerializer
    permission_classes = [IsAuthenticated, PermisoCrearAdministracionDeRoles]
    queryset=Roles.objects.all()

    def post(self, request):
        data = request.data
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success':True, 'detail':'Se creo el tipo de documento correctamente', 'data':serializer.data}, status=status.HTTP_201_CREATED)

#------------------------------------------------> Borrar un rol a un usuario
class DeleteUserRol(DestroyAPIView):
    serializer_class = UsuarioRolesSerializers
    queryset = UsuariosRol.objects.all()
    permission_classes = [IsAuthenticated,]

    def delete(self, request, pk):
        try:
            id_usuarios_rol = UsuariosRol.objects.get(id_usuarios_rol=pk)
            pass
        except:
            raise NotFound('No se encontró ningún registro con el parámetro ingresado')

        if id_usuarios_rol:
            id_usuarios_rol.delete()
            usuario = request.user.id_usuario
            descripcion =  {"IdUsuariosRol" : str(pk), "NombreUsuario" : str(id_usuarios_rol.id_usuario.nombre_de_usuario), "Rol" : str(id_usuarios_rol.id_rol.nombre_rol)}
            dirip = Util.get_client_ip(request)

            auditoria_data = {
                "id_usuario": usuario,
                "id_modulo": 5,
                "cod_permiso": 'BO',
                "subsistema": 'SEGU',
                "dirip": dirip,
                "descripcion": json.dumps(descripcion)
            }

            Util.save_auditoria(auditoria_data)

            return Response({'success':True, 'detail':'El rol fue eliminado'},status=status.HTTP_200_OK)
        else:
            raise NotFound('No existe el rol ingresado')


# Borrar Rol

class DeleteRol(generics.RetrieveDestroyAPIView):
    serializer_class = RolesSerializer
    queryset = Roles.objects.all()
    permission_classes = [IsAuthenticated, PermisoEliminarAdministracionDeRoles]

    def delete(self, request, id_rol):

        usuario_rol = UsuariosRol.objects.filter(id_rol=id_rol).first()
        if usuario_rol:
            raise PermissionDenied('No puede eliminar el rol porque ya está asignado a un usuario')

        rol = Roles.objects.filter(id_rol=id_rol).first()
        rolsito = rol
        if not rol:
            raise NotFound('No existe el rol ingresado')

        rol.delete()

        #Auditoria Eliminar Roles
        usuario = request.user.id_usuario
        descripcion = {"Nombre": str(rolsito.nombre_rol)}
        direccion=Util.get_client_ip(request)
        auditoria_data = {
            "id_usuario" : usuario,
            "id_modulo" : 5,
            "cod_permiso": "BO",
            "subsistema": 'SEGU',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion),
        }
        Util.save_auditoria(auditoria_data)
        return Response({'success':True, 'detail':'El rol fue eliminado'},status=status.HTTP_200_OK)




@api_view(['GET'])
def getRoles(request):
    roles = Roles.objects.all()
    serializer = RolesSerializer(roles, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def getRolById(request, pk):
    rol = Roles.objects.get(id_rol=pk)
    serializer = RolesSerializer(rol, many=False)
    return Response(serializer.data)


@api_view(['POST'])
def registerRol(request):
    data = request.data
    try:
        rol = Roles.objects.create(
            nombre_rol = data['nombre_rol'],
            descripcion_rol = data['descripcion_rol']
        )

        serializer = RolesSerializer(rol, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except:
        message = {'detail': ''}
        return Response(message, status=status.HTTP_400_BAD_REQUEST)


class UpdateRol(RetrieveUpdateAPIView):
    queryset=Roles.objects.all()
    permission_classes = [IsAuthenticated, PermisoActualizarAdministracionDeRoles]
    serializer_class=RolesSerializer

    def put(self, request, pk):
        rol = Roles.objects.filter(id_rol=pk).first()
        if rol:
            if rol.Rol_sistema == False:
                serializer = self.serializer_class(rol, data=request.data, many=False)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response({'success':True, 'detail':'El rol fue actualizado'},status=status.HTTP_201_CREATED)
            else:
                raise PermissionDenied('No se puede actualizar un rol precargado')
        else:
            raise NotFound('No existe el rol ingresado')


class GetRolesByIdPersona(generics.ListAPIView):
    serializer_class = RolesByIdUsuarioSerializer
    queryset= Roles.objects.all()

    def get(self,request,id_usuario):

        usuario=User.objects.filter(persona = id_usuario).first()

        representante_legal=Personas.objects.filter(representante_legal=usuario.persona.id_persona)
        list_representante_legal=[representante.id_persona for representante in representante_legal]

        usuarios=User.objects.filter(persona__in=list_representante_legal)

        list_usuarios=[usuario.id_usuario for usuario in usuarios]
        list_usuarios_representante_legal=list_usuarios.copy()
        list_usuarios.append(usuario.id_usuario)

        usuario_rol = UsuariosRol.objects.filter(id_usuario__in=list_usuarios)

        roles=[]
        for rol in usuario_rol:
            rol_usuario = rol.id_rol
            if rol.id_usuario.id_usuario in list_usuarios_representante_legal:
                rol_usuario.representante_legal = True
                rol_usuario.nombre_empresa = rol.id_usuario.persona.razon_social
            roles.append(rol_usuario)
        serializador= self.serializer_class(roles, many= True)

        return Response({'success':True, 'detail':'Correcto','data':serializador.data},status=status.HTTP_200_OK)
    


class GetAllUsersByRoles(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, PermisoConsultarAdministracionDeRoles]

    def get(self, request):
        # Obtener todos los roles con su cantidad de usuarios
        roles = Roles.objects.annotate(
            cantidad_usuarios=Count('usuariosrol')
        ).prefetch_related(
            Prefetch('usuariosrol_set', queryset=UsuariosRol.objects.select_related('id_usuario'))
        ).order_by('nombre_rol')

        data = []
        for rol in roles:
            usuarios = UsuarioRolesLookSerializers(rol.usuariosrol_set.all(), many=True).data
            data.append({
                "id_rol": rol.id_rol,
                "nombre_rol": rol.nombre_rol,
                "descripcion_rol": rol.descripcion_rol,
                "rol_sistema": rol.Rol_sistema,
                "cantidad_usuarios": rol.cantidad_usuarios,
                "usuarios": usuarios
            })

        if data:
            return Response({
                'success': True,
                'detail': 'Se encontraron los usuarios organizados por roles',
                'data': data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'detail': 'No se encontraron usuarios asociados a roles',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)
        


class GetRolesYPermisosUsuario(generics.GenericAPIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user  # Usuario autenticado
        id_persona = usuario.persona.id_persona  # ID de la persona asociada al usuario
        nombre_completo = f"{usuario.persona.primer_nombre} {usuario.persona.primer_apellido}".strip()

        roles_usuario = UsuariosRol.objects.filter(id_usuario=usuario).select_related('id_rol')

        if not roles_usuario.exists():
            return Response({
                'success': False,
                'detail': 'El usuario no tiene roles asignados',
                'data': [],
                'id_persona': id_persona,
                'nombre_completo': nombre_completo
            }, status=status.HTTP_404_NOT_FOUND)

        roles_data = []
        for usuario_rol in roles_usuario:
            rol = usuario_rol.id_rol
            permisos = PermisosModuloRol.objects.filter(id_rol=rol).select_related('id_permiso_modulo')

            # Serializar los roles y permisos
            rol_serializer = RolesSerializer(rol)
            permisos_serializer = PermisosModuloRolSerializer(permisos, many=True)

            roles_data.append({
                'rol': rol_serializer.data,
                'permisos': permisos_serializer.data
            })

        return Response({
            'success': True,
            'detail': 'Roles y permisos obtenidos exitosamente',
            'id_persona': id_persona,
            'nombre_completo': nombre_completo,
            'data': roles_data
        }, status=status.HTTP_200_OK)
    



class GetRolesByPersona(generics.GenericAPIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, id_persona):
        # Buscar el usuario por id_persona
        usuario = User.objects.filter(persona__id_persona=id_persona).first()
        if not usuario:
            return Response({
                'success': False,
                'detail': 'No se encontró un usuario con este ID de persona',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Obtener los roles relacionados con la persona
        roles_usuario = UsuariosRol.objects.filter(id_usuario=usuario).select_related("id_rol")
        
        if not roles_usuario.exists():
            return Response({
                'success': False,
                'detail': 'El usuario no tiene roles asignados',
                'id_usuario': usuario.id_usuario,
                'id_persona': usuario.persona.id_persona,
                'roles': [],
                'permisos': []
            }, status=status.HTTP_404_NOT_FOUND)

        roles_data = []
        permisos_data = {}

        for usuario_rol in roles_usuario:
            rol = usuario_rol.id_rol
            permisos = PermisosModuloRol.objects.filter(id_rol=rol).select_related("id_permiso_modulo__cod_permiso")

            # Serializar los datos del rol
            roles_data.append({
                "id_rol": rol.id_rol,
                "nombre_rol": rol.nombre_rol,
                "descripcion_rol": rol.descripcion_rol,
                "rol_sistema": rol.Rol_sistema
            })

            # Obtener IDs, nombres y códigos de permisos
            for permiso in permisos:
                permiso_obj = permiso.id_permiso_modulo
                cod_permiso_obj = permiso_obj.cod_permiso
                permisos_data[permiso_obj.id_permisos_modulo] = {
                    "id_permisos_modulo": permiso_obj.id_permisos_modulo,
                    "codigo": cod_permiso_obj.cod_permiso,
                    "nombre": cod_permiso_obj.nombre_permiso 
                }

        return Response({
            'success': True,
            'detail': 'Roles y permisos obtenidos exitosamente',
            'id_usuario': usuario.id_usuario,
            'id_persona': usuario.persona.id_persona,
            'roles': roles_data, 
            'permisos': list(permisos_data.values()) 
        }, status=status.HTTP_200_OK)

class UpdateRolesByPersona(generics.GenericAPIView):

    permission_classes = [IsAuthenticated] 

    def put(self, request, id_persona):
        try:
            usuario = User.objects.filter(persona__id_persona=id_persona).first()
            if not usuario:
                return Response({
                    'success': False,
                    'detail': 'No se encontró un usuario con este ID de persona'
                }, status=status.HTTP_404_NOT_FOUND)

            # Obtener la nueva lista de roles desde la solicitud
            nuevos_roles_ids = request.data.get('roles', [])

            if 1 in nuevos_roles_ids:
                return Response({
                    'success': False,
                    'detail': 'No se puede asignar el rol de super usuario a un usuario normal.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if 2 in nuevos_roles_ids:
                return Response({
                    'success': False,
                    'detail': 'No se puede asignar el rol de usuario web.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if not isinstance(nuevos_roles_ids, list) or not nuevos_roles_ids:
                return Response({
                    'success': False,
                    'detail': 'Debe proporcionar una lista de IDs de roles válida.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar que los roles existan en la base de datos
            roles_validos = set(Roles.objects.filter(id_rol__in=nuevos_roles_ids).values_list('id_rol', flat=True))
            if len(nuevos_roles_ids) != len(roles_validos):
                return Response({
                    'success': False,
                    'detail': 'Uno o más roles no existen en el sistema.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Iniciar una transacción para actualizar los roles
            with transaction.atomic():
                # Eliminar los roles actuales del usuario
                UsuariosRol.objects.filter(id_usuario=usuario).exclude(id_rol__in=[1,2]).delete()

                # Asignar los nuevos roles
                nuevos_roles = [UsuariosRol(id_usuario=usuario, id_rol_id=rol_id) for rol_id in roles_validos]
                UsuariosRol.objects.bulk_create(nuevos_roles)

            # Obtener los detalles de los roles asignados
            roles_asignados = Roles.objects.filter(id_rol__in=roles_validos)
            roles_data = [
                {
                    "id_rol": rol.id_rol,
                    "nombre_rol": rol.nombre_rol,
                    "descripcion_rol": rol.descripcion_rol,
                    "rol_sistema": rol.Rol_sistema
                }
                for rol in roles_asignados
            ]

            return Response({
                'success': True,
                'detail': 'Roles actualizados exitosamente',
                'id_usuario': usuario.id_usuario,
                'id_persona': usuario.persona.id_persona,
                'roles_asignados': roles_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'success': False,
                'detail': f'Error al actualizar roles: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class GetAuditoriasByPersona(generics.GenericAPIView):
    """
    Endpoint para obtener auditorías de actualización ('AC') de un usuario según su ID de persona,
    filtrando únicamente las auditorías relacionadas con el módulo 2 y verificando coincidencias con 'IDPersona' en valores actualizados.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id_persona):
        # Buscar la persona en la base de datos
        persona = Personas.objects.filter(id_persona=id_persona).first()
        if not persona:
            return Response({
                'success': False,
                'detail': 'No se encontró una persona con este ID',
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Filtrar auditorías donde valores_actualizados contenga el ID de la persona
        auditorias = Auditorias.objects.filter(
            id_cod_permiso_accion__cod_permiso="AC", 
            id_modulo=2,  
            valores_actualizados__icontains=f'"id_persona": {id_persona}'
        ).order_by('-fecha_accion')

        # Si no hay auditorías, devolver mensaje claro
        if not auditorias.exists():
            return Response({
                'success': False,
                'detail': 'No hay auditorías registradas para esta persona en el módulo 2',
                'id_persona': persona.id_persona,
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        # Convertir auditorías a JSON válido
        auditorias_data = []
        for auditoria in auditorias:
            try:
                valores_actualizados = json.loads(auditoria.valores_actualizados) if auditoria.valores_actualizados else {}

                # Verificar que "update" contiene "id_persona" y coincide con el id_persona solicitado
                if "update" in valores_actualizados and valores_actualizados["update"].get("id_persona") == id_persona:
                    # Obtener el tipo de usuario y las fechas de la persona
                    # Acceder al tipo de usuario a través del modelo 'User' que está relacionado con la persona
                    usuario = User.objects.filter(persona=persona).first()  # Buscar el usuario asociado a la persona
                    tipo_usuario = usuario.tipo_usuario if usuario else None
                    fecha_inicio_cargo_actual = persona.fecha_inicio_cargo_actual
                    fecha_a_finalizar_cargo_actual = persona.fecha_a_finalizar_cargo_actual

                    auditorias_data.append({
                        "id_auditoria": auditoria.id_auditoria,
                        "fecha_accion": auditoria.fecha_accion,
                        "subsistema": auditoria.subsistema,
                        "dirip": auditoria.dirip,
                        "descripcion": auditoria.descripcion,
                        "valores_actualizados": valores_actualizados,
                        "tipo_usuario": tipo_usuario,
                        "fecha_inicio_cargo_actual": fecha_inicio_cargo_actual,
                        "fecha_a_finalizar_cargo_actual": fecha_a_finalizar_cargo_actual
                    })
            except json.JSONDecodeError as e:
                print(f"Error procesando auditoría {auditoria.id_auditoria}: {str(e)}")

        # Si después del filtrado no quedan auditorías, responder con mensaje adecuado
        if not auditorias_data:
            return Response({
                'success': False,
                'detail': 'No hay auditorías donde id_persona en valores_actualizados coincida',
                'id_persona': persona.id_persona,
                'data': []
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'detail': 'Auditorías de actualización obtenidas exitosamente',
            'id_persona': persona.id_persona,
            'tipo_usuario': usuario.tipo_usuario,
            'fecha_inicio_cargo_actual': persona.fecha_inicio_cargo_actual,
            'fecha_a_finalizar_cargo_actual': persona.fecha_a_finalizar_cargo_actual,
            'nombre_completo': f"{persona.primer_nombre} {persona.primer_apellido}".strip(),
            'data': auditorias_data
        }, status=status.HTTP_200_OK)
    




class UpdateUserStatusByPersona(generics.GenericAPIView):
    """
    Endpoint para actualizar 'is_active' y 'is_blocked' de un usuario por su ID de persona.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, id_persona):
        persona_logueada = request.user.persona.id_persona
        usuario_id = request.user.id_usuario
        direccion = Util.get_client_ip(request)

        # Buscar la persona en la base de datos
        persona = Personas.objects.filter(id_persona=id_persona).first()
        if not persona:
            return Response({
                'success': False,
                'detail': 'No se encontró una persona con este ID'
            }, status=status.HTTP_404_NOT_FOUND)

        # Buscar el usuario asociado a la persona
        usuario = User.objects.filter(persona=persona).first()
        if not usuario:
            return Response({
                'success': False,
                'detail': 'No se encontró un usuario asociado a esta persona',
                'id_persona': persona.id_persona
            }, status=status.HTTP_404_NOT_FOUND)

        # Guardar estado previo del usuario
        usuario_previous = copy.copy(usuario)

        # Obtener los datos a actualizar
        is_active = request.data.get("is_active")

        # Validaciones
        if is_active is None:
            return Response({
                'success': False,
                'detail': "Debe proporcionar al menos 'is_active' o 'is_blocked' para actualizar."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Comparar cambios antes y después
        nuevo, anterior = {}, {}
        cambios_realizados = []
        campos_a_actualizar = []

        if is_active is not None and usuario.is_active != is_active:
            nuevo["is_active"] = is_active
            anterior["is_active"] = usuario.is_active
            usuario.is_active = is_active
            cod_operacion = OperacionesSobreUsuario.objects.get(cod_operacion='A') if is_active else OperacionesSobreUsuario.objects.get(cod_operacion='I')

            justificacion_activacion = request.data.get('justificacion_activacion', 'Activación de usuario')
            if not justificacion_activacion:
                return Response({
                    'success': False,
                    'detail': 'Debe proporcionar una justificación para la activación o desactivación del usuario.'
                }, status=status.HTTP_400_BAD_REQUEST)

            HistoricoActivacion.objects.create(
                id_usuario_afectado = usuario,
                cod_operacion = cod_operacion,
                fecha_operacion = datetime.now(),
                justificacion = justificacion_activacion,
                usuario_operador = request.user,
            )

            cambios_realizados.append(f"is_active: {usuario_previous.is_active} → {is_active}")
            campos_a_actualizar.append("is_active")
        

        # Si no hubo cambios, no guardar ni auditar
        if not cambios_realizados:
            return Response({
                'success': False,
                'detail': 'No se realizó ninguna actualización, los valores son los mismos.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Guardar cambios en la base de datos
        usuario.save(update_fields=campos_a_actualizar)

        # Auditoría de actualización de estado de usuario
        descripcion = {
            "Mensaje": "Se actualizaron los siguientes datos del usuario asociado a la persona:",
            "IDPersona": str(persona.id_persona),
            "IDUsuario": str(usuario.id_usuario),
            "NombreUsuario": usuario.nombre_de_usuario,
            "Cambios": cambios_realizados
        }

        # **Incluir la ID de la persona en valores actualizados**
        valores_actualizados = {
            "update": {
                "id_persona": persona.id_persona,
                "Nuevo": nuevo,
                "Anterior": anterior
            }
        }

        auditoria_data = {
            "id_usuario": usuario_id,
            "id_modulo": 2, 
            "cod_permiso": "AC",
            "subsistema": 'SEGU',
            "dirip": direccion,
            "descripcion": json.dumps(descripcion, default=str),
            "valores_actualizados": json.dumps(valores_actualizados, default=str)
        }
        Util.save_auditoria(auditoria_data)

        if is_active:
            # Usuario activado por administrador
            subject = "Activación de usuario"
            template = "reactivacion-usuario-admin.html"
        else:
            # Usuario desactivado/bloqueado
            subject = "Bloqueo de Usuario"
            template = "bloqueo-de-usuario.html"
        
        Util.notificacion(persona, subject, template, nombre_de_usuario=usuario.nombre_de_usuario)

        # Construcción de respuesta con solo los datos actualizados
        respuesta_data = {"id_usuario": usuario.id_usuario, "id_persona": persona.id_persona}
        respuesta_data.update(nuevo)

        return Response({
            'success': True,
            'detail': 'Estado del usuario actualizado correctamente',
            'data': respuesta_data
        }, status=status.HTTP_200_OK)
    

class UpdateUserTipoUsuario(generics.GenericAPIView):
    """
    Endpoint para actualizar 'tipo_usuario', 'fecha_inicio_cargo_actual', 'fecha_a_finalizar_cargo_actual',
    y 'id_cargo' de un usuario por su ID de persona.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, id_persona):
        # Buscar la persona en la base de datos
        persona = Personas.objects.filter(id_persona=id_persona).first()
        if not persona:
            return Response({
                'success': False,
                'detail': 'No se encontró una persona con este ID'
            }, status=status.HTTP_404_NOT_FOUND)

        # Obtener el nuevo tipo de usuario y las fechas
        tipo_usuario = request.data.get("tipo_usuario")
        fecha_inicio_cargo_actual = request.data.get("fecha_inicio_cargo_actual")
        fecha_a_finalizar_cargo_actual = request.data.get("fecha_a_finalizar_cargo_actual")
        id_cargo = request.data.get("id_cargo")

        # Validación del tipo de usuario
        if tipo_usuario not in ['I', 'E']:
            return Response({
                'success': False,
                'detail': "El valor de 'tipo_usuario' debe ser 'I' para Interno o 'E' para Externo."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Buscar el usuario asociado a la persona
        usuario = User.objects.filter(persona=persona).first()
        if not usuario:
            return Response({
                'success': False,
                'detail': 'No se encontró un usuario asociado a esta persona'
            }, status=status.HTTP_404_NOT_FOUND)

        # Guardar el tipo de usuario anterior para gestionar roles después
        tipo_usuario_anterior = usuario.tipo_usuario

        # Si el tipo de usuario es 'E' y ya es 'E', no hacer cambios
        if tipo_usuario == 'E' and usuario.tipo_usuario == 'E':
            return Response({
                'success': False,
                'detail': "El usuario ya es un 'Externo'. No se requiere realizar cambios."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Si el tipo es "I" (Interno), actualizar las fechas y el cargo
        if tipo_usuario == 'I':
            if not fecha_inicio_cargo_actual or not fecha_a_finalizar_cargo_actual:
                return Response({
                    'success': False,
                    'detail': "'fecha_inicio_cargo_actual' y 'fecha_a_finalizar_cargo_actual' son requeridas para usuarios internos."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar que 'fecha_inicio_cargo_actual' sea menor que 'fecha_a_finalizar_cargo_actual'
            if fecha_inicio_cargo_actual >= fecha_a_finalizar_cargo_actual:
                return Response({
                    'success': False,
                    'detail': "'fecha_inicio_cargo_actual' debe ser menor que 'fecha_a_finalizar_cargo_actual'."
                }, status=status.HTTP_400_BAD_REQUEST)

            persona.fecha_inicio_cargo_actual = fecha_inicio_cargo_actual
            persona.fecha_a_finalizar_cargo_actual = fecha_a_finalizar_cargo_actual

            # Si se proporciona un nuevo id_cargo, actualizarlo
            if id_cargo:
                try:
                    cargo = Cargos.objects.select_for_update().get(id_cargo=id_cargo)
                    persona.id_cargo = cargo

                    # Marcar item_ya_usado=True si aún no está marcado
                    if not cargo.item_ya_usado:
                        cargo.item_ya_usado = True
                        cargo.save(update_fields=["item_ya_usado"])

                except Cargos.DoesNotExist:
                    return Response({
                        'success': False,
                        'detail': "El ID de cargo proporcionado no existe."
                    }, status=status.HTTP_400_BAD_REQUEST)

        # Si el tipo es "E" (Externo), dejar las fechas en null y no actualizar el cargo
        elif tipo_usuario == 'E':
            persona.fecha_inicio_cargo_actual = None
            persona.fecha_a_finalizar_cargo_actual = None
            persona.id_cargo = None
        
        # Asignar el nuevo tipo de usuario
        usuario.tipo_usuario = tipo_usuario

        # Gestión del rol de "usuario web" (id_rol = 2)
        # Si cambia de Externo a Interno: eliminar rol de usuario web
        if tipo_usuario_anterior == 'E' and tipo_usuario == 'I':
            UsuariosRol.objects.filter(id_usuario=usuario, id_rol=2).delete()
        
        # Si cambia de Interno a Externo: agregar rol de usuario web
        elif tipo_usuario_anterior == 'I' and tipo_usuario == 'E':
            # Verificar si ya tiene el rol antes de agregarlo
            if not UsuariosRol.objects.filter(id_usuario=usuario, id_rol=2).exists():
                rol_usuario_web = Roles.objects.get(id_rol=2)
                UsuariosRol.objects.create(id_usuario=usuario, id_rol=rol_usuario_web)

        # Guardar los cambios
        persona.save()
        usuario.save()

        # Auditoría de actualización
        descripcion = {
            "Mensaje": "Se actualizaron los siguientes datos del usuario asociado a la persona:",
            "IDPersona": str(persona.id_persona),
            "IDUsuario": str(usuario.id_usuario),
            "NombreUsuario": usuario.nombre_de_usuario,
            "Cambios": [
                f"tipo_usuario: {usuario.tipo_usuario}",
                f"fecha_inicio_cargo_actual: {persona.fecha_inicio_cargo_actual}",
                f"fecha_a_finalizar_cargo_actual: {persona.fecha_a_finalizar_cargo_actual}",
                f"id_cargo: {persona.id_cargo.nombre if persona.id_cargo else 'None'}"
            ]
        }

        # Guardar auditoría
        auditoria_data = {
            "id_usuario": usuario.id_usuario,
            "id_modulo": 2, 
            "cod_permiso": "AC",
            "subsistema": 'SEGU',
            "dirip": Util.get_client_ip(request),
            "descripcion": json.dumps(descripcion, default=str),
        }
        Util.save_auditoria(auditoria_data)

        return Response({
            'success': True,
            'detail': 'Estado del usuario y datos de persona actualizados correctamente',
            'data': {
                "id_usuario": usuario.id_usuario,
                "id_persona": persona.id_persona,
                "tipo_usuario": usuario.tipo_usuario,
                "fecha_inicio_cargo_actual": persona.fecha_inicio_cargo_actual,
                "fecha_a_finalizar_cargo_actual": persona.fecha_a_finalizar_cargo_actual,
                "id_cargo": persona.id_cargo.id_cargo if persona.id_cargo else None,
                "nombre_cargo": persona.id_cargo.nombre if persona.id_cargo else None
            }
        }, status=status.HTTP_200_OK)


class GetUserDetailsByPersona(generics.GenericAPIView):
    """
    Endpoint para obtener el nombre completo (para personas naturales) o la razón social
    y nombre comercial (para personas jurídicas), el tipo de usuario y las fechas
    ('fecha_inicio_cargo_actual' y 'fecha_a_finalizar_cargo_actual') de un usuario
    por su ID de persona.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id_persona):
        # Buscar la persona en la base de datos
        persona = Personas.objects.filter(id_persona=id_persona).first()
        if not persona:
            return Response({
                'success': False,
                'detail': 'No se encontró una persona con este ID'
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar si es persona natural o jurídica
        if persona.tipo_persona == 'N':  # Persona natural
            nombre_completo = f"{persona.primer_nombre} {persona.segundo_nombre or ''} {persona.primer_apellido} {persona.segundo_apellido or ''}".strip()
            razon_social = None
            nombre_comercial = None
        elif persona.tipo_persona == 'J':  # Persona jurídica
            nombre_completo = None
            razon_social = persona.razon_social
            nombre_comercial = persona.nombre_comercial
        else:
            return Response({
                'success': False,
                'detail': 'Tipo de persona no válido'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener el tipo de usuario del User asociado a la Persona
        usuario = User.objects.filter(persona=persona).first()
        if usuario:
            tipo_usuario = usuario.tipo_usuario
        else:
            tipo_usuario = None

        # Obtener las fechas de la Persona
        fecha_inicio_cargo_actual = persona.fecha_inicio_cargo_actual
        fecha_a_finalizar_cargo_actual = persona.fecha_a_finalizar_cargo_actual

        # Verificar si id_cargo está presente
        if persona.id_cargo:
            nombre_cargo = persona.id_cargo.nombre
        else:
            nombre_cargo = None

        # Construir la respuesta
        response_data = {
            "nombre_completo": nombre_completo,
            "razon_social": razon_social,
            "nombre_comercial": nombre_comercial,
            "tipo_usuario": tipo_usuario,
            'id_cargo': persona.id_cargo.id_cargo if persona.id_cargo else None,
            'nombre_cargo': nombre_cargo,
            "fecha_inicio_cargo_actual": fecha_inicio_cargo_actual,
            "fecha_a_finalizar_cargo_actual": fecha_a_finalizar_cargo_actual
        }

        return Response({
            'success': True,
            'detail': 'Detalles del usuario obtenidos exitosamente',
            'data': response_data
        }, status=status.HTTP_200_OK)


