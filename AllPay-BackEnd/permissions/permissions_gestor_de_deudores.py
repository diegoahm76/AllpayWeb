from rest_framework.permissions import BasePermission
from django.db.models import Q
from seguridad.models.seguridad_models import PermisosModuloRol, UsuariosRol


#REGISTRO DE COMPRAS DE CACAO EXTERNO
class PermisoCrearRegistroCompraCacao(BasePermission):
    message = 'No tiene permiso para crear en Registro compras de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=28))
            if permisos_modulo_rol:
                return True

        return False
    

class PermisoActualizarRegistroCompraCacao(BasePermission):
    message = 'No tiene permiso para actualizar en Registro compras de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=29))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoAConsultarRegistroCompraCacao(BasePermission):
    message = 'No tiene permiso para consultar en Registro compras de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=30))
            if permisos_modulo_rol:
                return True

        return False
    
#CONSULTA DE COMPRAS DE CACAO EXTERNO
class PermisoAConsultarConsultaCompraCacao(BasePermission):
    message = 'No tiene permiso para consultar en consulta compras de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=31))
            if permisos_modulo_rol:
                return True

        return False
    

class PermisoActualizarConsultaCompraCacao(BasePermission):
    message = 'No tiene permiso para actualizar en consulta compras de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=32))
            if permisos_modulo_rol:
                return True

        return False
    

#LIQUDACION CUOTA DE FOMENTO EXTERNO
class PermisoACrearLiquidacionCuotaFomento(BasePermission):
    message = 'No tiene permiso para crear en liquidacion cuota de fomento.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=33))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultaLiquidacionCuotaFomento(BasePermission):
    message = 'No tiene permiso para consulta en liquidacion cuota de fomento.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=35))
            if permisos_modulo_rol:
                return True

        return False
    

#CONSULTA DE LIQUIDACIONES EXTERNO

class PermisoConsultaConsultaDeLiquidaciones(BasePermission):
    message = 'No tiene permiso para consulta en consulta de liquidaciones.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=36))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarConsultaDeLiquidaciones(BasePermission):
    message = 'No tiene permiso para actualizar en consulta de liquidaciones.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=37))
            if permisos_modulo_rol:
                return True

        return False
    

#GENERAR PAZ Y SALVO EXTERNO
class PermisoCrearGenerarPazYSalvo(BasePermission):
    message = 'No tiene permiso para crear en generar paz y salvo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=38))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarGenerarPazYSalvo(BasePermission):
    message = 'No tiene permiso para consultar en generar paz y salvo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=40))
            if permisos_modulo_rol:
                return True

        return False
    

#ADMINISTRACION DE PAZ Y SALVO
class PermisoConsultarAdministracionPazYSalvo(BasePermission):
    message = 'No tiene permiso para consultar en administracion de paz y salvo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=41))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarAdministracionPazYSalvo(BasePermission):
    message = 'No tiene permiso para actualizar en administracion de paz y salvo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=42))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarAdministracionPazYSalvo(BasePermission):
    message = 'No tiene permiso para eliminar en administracion de paz y salvo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=43))
            if permisos_modulo_rol:
                return True

        return False
    
#IDENTIFICACION DE RECUADADORES
class PermisoCrearIdentificacionRecaudadores(BasePermission):
    message = 'No tiene permiso para crear en identificacion de recaudadores.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=48))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarIdentificacionRecaudadores(BasePermission):
    message = 'No tiene permiso para actualizar en identificacion de recaudadores.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=49))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarIdentificacionRecaudadores(BasePermission):
    message = 'No tiene permiso para consultar en identificacion de recaudadores.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=50))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarIdentificacionRecaudadores(BasePermission):
    message = 'No tiene permiso para eliminar en identificacion de recaudadores.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=51))
            if permisos_modulo_rol:
                return True

        return False
    
#REGISTRO DE COMPRA DE CACOAO INTERNO
class PermisoCrearRegistroCompraCacaoInterno(BasePermission):
    message = 'No tiene permiso para crear en registro de compra de cacao interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=52))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarRegistroCompraCacaoInterno(BasePermission):
    message = 'No tiene permiso para actualizar en registro de compra de cacao interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=53))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarRegistroCompraCacaoInterno(BasePermission):
    message = 'No tiene permiso para consultar en registro de compra de cacao interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=54))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarRegistroCompraCacaoInterno(BasePermission):
    message = 'No tiene permiso para eliminar en registro de compra de cacao interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=55))
            if permisos_modulo_rol:
                return True

        return False
    
#CONSULTAR COMPRAS DE CACAO INTERNO
class PermisoConsultarComprasCacaoInterno(BasePermission):
    message = 'No tiene permiso para consultar en compras de cacao interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=58))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarComprasCacaoInterno(BasePermission):
    message = 'No tiene permiso para actualizar en compras de cacao interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=59))
            if permisos_modulo_rol:
                return True

        return False
    
#CONSULTAR LIQUIDACIONES INTERNO
class PermisoConsultarLiquidacionesInterno(BasePermission):
    message = 'No tiene permiso para consultar en liquidaciones interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=111))
            if permisos_modulo_rol:
                return True

        return False
    
#CONSULTAR PAZ Y SALVO INTERNO
class PermisoConsultarPazYSalvoInterno(BasePermission):
    message = 'No tiene permiso para consultar en paz y salvo interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=60))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarPazYSalvoInterno(BasePermission):
    message = 'No tiene permiso para actualizar en paz y salvo interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=61))
            if permisos_modulo_rol:
                return True

        return False


#CARGUE DE DATOS SICEX
class PermisoCrearCargueDatosSicex(BasePermission):
    message = 'No tiene permiso para crear en cargue de datos sicex.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=62))
            if permisos_modulo_rol:
                return True

        return False


#CONSULTAR CARGUE DE DATOS SICEX
class PermisoConsultarCargueDatosSicex(BasePermission):
    message = 'No tiene permiso para consultar en cargue de datos sicex.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=63))
            if permisos_modulo_rol:
                return True

        return False
    

#CONSULTAR CUOTAS PAGADAS INTERNO
class PermisoConsultarCuotasPagadasInterno(BasePermission):
    message = 'No tiene permiso para consultar en cuotas pagadas interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=134))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarCuotasPagadasInterno(BasePermission):
    message = 'No tiene permiso para actualizar en cuotas pagadas interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=135))
            if permisos_modulo_rol:
                return True

        return False
    


    


    
