from rest_framework.permissions import BasePermission
from django.db.models import Q
from seguridad.models.seguridad_models import PermisosModuloRol, UsuariosRol

#SOLICITUD DE ACUERDOS DE PAGO
class PermisoCrearSolicitudAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para crear en solicitud acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=44))
            if permisos_modulo_rol:
                return True

        return False
    

#CONSULTAR DE ACUERDOS DE PAGO EXTERNO
class PermisoConsultarAdministracionAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para consultar en administracion acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=45))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarAdministracionAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para actualizar en administracion acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=46))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarAdministracionAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para eliminar en administracion acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=47))
            if permisos_modulo_rol:
                return True

        return False
    

#CONSULTA DE CARTERA
class PermisoConsultarCartera(BasePermission):
    message = 'No tiene permiso para consultar en cartera.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=64))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarCarteraExterno(BasePermission):
    message = 'No tiene permiso para consultar en cartera.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=128))
            if permisos_modulo_rol:
                return True

        return False
#CONSULTA DE ACUERDOS DE PAGO INTERNO
class PermisoConsultarAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para consultar en acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=65))
            if permisos_modulo_rol:
                return True

        return False


#GESTIONAR ACUERDOS DE PAGO 
class PermisoConsultarGestionarAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para consultar en gestionar acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=66))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarGestionarAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para actualizar en gestionar acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=67))
            if permisos_modulo_rol:
                return True

        return False

class PermisoEliminarGestionarAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para eliminar en gestionar acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=68))
            if permisos_modulo_rol:
                return True

        return False
    
#APROBAR ACUERDOS DE PAGO JURDICA 
class PermisoConsultarAprobarAcuerdosDePagoJurdica(BasePermission):
    message = 'No tiene permiso para consultar en aprobar acuerdo de pago Jurdica.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=69))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarAprobarAcuerdosDePagoJurdica(BasePermission):
    message = 'No tiene permiso para actualizar en aprobar acuerdo de pago Jurdica.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=70))
            if permisos_modulo_rol:
                return True

        return False
    
#APROBAR ACUERDOS DE PAGO DIRECCION
class PermisoConsultarAprobarAcuerdosDePagoDireccion(BasePermission):
    message = 'No tiene permiso para consultar en aprobar acuerdo de pago Dirección.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=71))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarAprobarAcuerdosDePagoDireccion(BasePermission):
    message = 'No tiene permiso para actualizar en aprobar acuerdo de pago Dirección.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=72))
            if permisos_modulo_rol:
                return True

        return False
    
#NOTIFICAR ACUERDOS DE PAGO
class PermisoConsultarNotificarAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para consultar en notificar acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=73))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarNotificarAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para actualizar en notificar acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=74))
            if permisos_modulo_rol:
                return True

        return False

#CORBO PERSUASIVO
class PermisoCrearCobroPersuasivo(BasePermission):
    message = 'No tiene permiso para crear en cobro persuasivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=75))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarCobroPersuasivo(BasePermission):
    message = 'No tiene permiso para consultar en cobro persuasivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=76))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarCobroPersuasivo(BasePermission):
    message = 'No tiene permiso para actualizar en cobro persuasivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=77))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarCobroPersuasivo(BasePermission):
    message = 'No tiene permiso para eliminar en cobro persuasivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=78))
            if permisos_modulo_rol:
                return True

        return False


#COBRO COACTIVO
class PermisoCrearCobroCoactivo(BasePermission):
    message = 'No tiene permiso para crear en cobro coactivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=79))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarCobroCoactivo(BasePermission):
    message = 'No tiene permiso para consultar en cobro coactivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=80))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarCobroCoactivo(BasePermission):
    message = 'No tiene permiso para actualizar en cobro coactivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=81))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarCobroCoactivo(BasePermission):
    message = 'No tiene permiso para eliminar en cobro coactivo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=82))
            if permisos_modulo_rol:
                return True

        return False
    

#CONFIGURACION DE LAS FECHAS LIMITE
class PermisoActualizarConfiguracionFechasLimite(BasePermission):
    message = 'No tiene permiso para actualizar en configuración de fechas limite.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=97))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarConfiguracionFechasLimite(BasePermission):
    message = 'No tiene permiso para consultar en configuración de fechas limite.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=98))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoCrearConfiguracionFechasLimite(BasePermission):
    message = 'No tiene permiso para crear en configuración de fechas limite.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=99))
            if permisos_modulo_rol:
                return True

        return False
    

#CONFIGURACION DE LOS PORCENTAJES DE COBRO
class PermisoActualizarConfiguracionPorcentajesCobro(BasePermission):
    message = 'No tiene permiso para actualizar en configuración de porcentajes de cobro.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=100))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarConfiguracionPorcentajesCobro(BasePermission):
    message = 'No tiene permiso para consultar en configuración de porcentajes de cobro.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=101))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoCrearConfiguracionPorcentajesCobro(BasePermission):
    message = 'No tiene permiso para crear en configuración de porcentajes de cobro.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=102))
            if permisos_modulo_rol:
                return True

        return False
    

#CONFIGURACION DE TIPOS DE CACAO
class PermisoActualizarConfiguracionTiposCacao(BasePermission):
    message = 'No tiene permiso para actualizar en configuración de tipos de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=103))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarConfiguracionTiposCacao(BasePermission):
    message = 'No tiene permiso para consultar en configuración de tipos de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=104))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoCrearConfiguracionTiposCacao(BasePermission):
    message = 'No tiene permiso para crear en configuración de tipos de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=105))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoEliminarConfiguracionTiposCacao(BasePermission):
    message = 'No tiene permiso para eliminar en configuración de tipos de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=106))
            if permisos_modulo_rol:
                return True

        return False
    

#APROBACION POR RECAUDADOR (ACUERDOS DE PAGO)

class PermisoActualizarAprobacionRecaudadorAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para actualizar en aprobación por recaudador de acuerdos de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=122))
            if permisos_modulo_rol:
                return True

        return False
class PermisoConsultarAprobacionRecaudadorAcuerdosDePago(BasePermission):
    message = 'No tiene permiso para consultar en aprobación por recaudador de acuerdos de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=123))
            if permisos_modulo_rol:
                return True

        return False
    
#Liquidacion cuotas acuerdo de pago externo

class PermisoCrearLiquidacionCuotasAcuerdoPagoExterno(BasePermission):
    message = 'No tiene permiso para crear en liquidación de cuotas de acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=124))
            if permisos_modulo_rol:
                return True

        return False
class PermisoConsultarLiquidacionCuotasAcuerdoPagoExterno(BasePermission):
    message = 'No tiene permiso para consultar en liquidación de cuotas de acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=125))
            if permisos_modulo_rol:
                return True

        return False
    
#Liquidacion cuotas acuerdo de pago interno

class PermisoCrearLiquidacionCuotasAcuerdoPagoInterno(BasePermission):
    message = 'No tiene permiso para crear en liquidación de cuotas de acuerdo de pago interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=126))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarLiquidacionCuotasAcuerdoPagoInterno(BasePermission):
    message = 'No tiene permiso para consultar en liquidación de cuotas de acuerdo de pago interno.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=127))
            if permisos_modulo_rol:
                return True

        return False
    

#PAGAR CUOTAS ACUERDO DE PAGO EXTERNO
class PermisoPagarCuotasAcuerdoPagoExterno(BasePermission):
    message = 'No tiene permiso para pagar cuotas de acuerdo de pago externo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=130))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoConsultarPagarCuotasAcuerdoPagoExterno(BasePermission):
    message = 'No tiene permiso para consultar en pagar cuotas de acuerdo de pago externo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=131))
            if permisos_modulo_rol:
                return True

        return False
    
#CONSULTAR CUOTAS PAGADAS ACUERDO DE PAGO EXTERNO
class PermisoConsultarCuotasPagadasAcuerdoPagoExterno(BasePermission):
    message = 'No tiene permiso para consultar cuotas pagadas de acuerdo de pago externo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=132))
            if permisos_modulo_rol:
                return True

        return False
    
class PermisoActualizarCuotasPagadasAcuerdoPagoExterno(BasePermission):
    message = 'No tiene permiso para actualizar cuotas pagadas de acuerdo de pago externo.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=133))
            if permisos_modulo_rol:
                return True

        return False
    


    

