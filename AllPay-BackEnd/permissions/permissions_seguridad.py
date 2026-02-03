from rest_framework.permissions import BasePermission
from django.db.models import Q
from seguridad.models.seguridad_models import PermisosModuloRol, UsuariosRol


#ADMINISTRACION DE DOCUMENTOS DE IDENTIFICACION
class PermisoCrearDocumentosDeIdentificacion(BasePermission):
    message = 'No tiene permiso para crear en administración de documentos de identificación.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=1))
            if permisos_modulo_rol:
                return True

        return False
    

class PermisoActualizarDocumentosDeIdentificacion(BasePermission):
    message = 'No tiene permiso para consultar en administración de documentos de identificación.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=2))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarDocumentosDeIdentificacion(BasePermission):
    message = 'No tiene permiso para consultar en administración de documentos de identificación.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=3))
            if permisos_modulo_rol:
                return True

        return False

class PermisoEliminarDocumentosDeIdentificacion(BasePermission):
    message = 'No tiene permiso para consultar en administración de documentos de identificación.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=4))
            if permisos_modulo_rol:
                return True

        return False

#ADMINISTRACION DE CARGOS
class PermisoCrearAdministracionDeCargos(BasePermission):
    message = 'No tiene permiso para crear en administración de cargos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=5))
            if permisos_modulo_rol:
                return True

        return False

class PermisoActualizarAdministracionDeCargos(BasePermission):
    message = 'No tiene permiso para actualizar en administración de cargos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=6))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarAdministracionDeCargos(BasePermission):
    message = 'No tiene permiso para consultar en administración de cargos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=7))
            if permisos_modulo_rol:
                return True

        return False

class PermisoEliminarAdministracionDeCargos(BasePermission):
    message = 'No tiene permiso para eliminar en administración de cargos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=8))
            if permisos_modulo_rol:
                return True

        return False

#CREACION DE USUARIO INTERNO
class PermisoCrearUsuarioInterno(BasePermission):
    message = 'No tiene permiso para la creacion de usuario interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=17))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarUsuarioInterno(BasePermission):
    message = 'No tiene permiso para la consulta de usuarios internos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=19))
            if permisos_modulo_rol:
                return True

        return False


#ADMINISTRACION DE ROLES
class PermisoCrearAdministracionDeRoles(BasePermission):
    message = 'No tiene permiso para crear en administración de roles.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=20))
            if permisos_modulo_rol:
                return True

        return False


class PermisoActualizarAdministracionDeRoles(BasePermission):
    message = 'No tiene permiso para actualizar en administración de roles.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=21))
            if permisos_modulo_rol:
                return True

        return False

class PermisoConsultarAdministracionDeRoles(BasePermission):
    message = 'No tiene permiso para consultar en administración de roles.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=22))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarAdministracionDeRoles(BasePermission):
    message = 'No tiene permiso para eliminar en administración de roles.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=23))
            if permisos_modulo_rol:
                return True

        return False

# ADMINISTRACIÓN DE USUARIOS
class PermisoActualizarAdministracionUsuarios(BasePermission):
    message = 'No tiene permiso para actualizar en Administración de Usuarios'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=rol.id_rol) & Q(id_permiso_modulo=25))
            if permisos_modulo_rol:
                return True
        return False


class PermisoConsultarAdministracionUsuarios(BasePermission):
    message = 'No tiene permiso para consultar en Administración de Usuarios'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=rol.id_rol) & Q(id_permiso_modulo=26))
            if permisos_modulo_rol:
                return True
        return False
    

#CARGAR PLANTILLAS
class PermisoCrearCargarPlantillas(BasePermission):
    message = 'No tiene permiso para crear en cargar plantillas.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=141))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarCargarPlantillas(BasePermission):
    message = 'No tiene permiso para consultar en cargar plantillas.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=142))
            
            if permisos_modulo_rol:
                return True

        return False

#GENERADOR DE DOCUMENTOS
class PermisoActualizarGeneradorDocumentos(BasePermission):
    message = 'No tiene permiso para actualizar en generador de documentos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=93))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarGeneradorDocumentos(BasePermission):
    message = 'No tiene permiso para consultar en generador de documentos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=94))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarGeneradorDocumentos(BasePermission):
    message = 'No tiene permiso para eliminar en generador de documentos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=95))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoCrearGeneradorDocumentos(BasePermission):
    message = 'No tiene permiso para crear en generador de documentos.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=96))
            if permisos_modulo_rol:
                return True

        return False
    
#CONFIGURACION DE TIPOS DE COMPRADOR

class PermisoActualizarConfiguracionTiposDeComprador(BasePermission):
    message = 'No tiene permiso para actualizar en configuración de tipos de comprador.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=107))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarConfiguracionTiposDeComprador(BasePermission):
    message = 'No tiene permiso para consultar en configuración de tipos de comprador.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=108))
            if permisos_modulo_rol:
                return True

        return False

class PermisoCrearConfiguracionTiposDeComprador(BasePermission):
    message = 'No tiene permiso para crear en configuración de tipos de comprador.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=109))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarConfiguracionTiposDeComprador(BasePermission):
    message = 'No tiene permiso para eliminar en configuración de tipos de comprador.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=110))
            if permisos_modulo_rol:
                return True

        return False