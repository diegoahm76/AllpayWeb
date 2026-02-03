from rest_framework.permissions import BasePermission
from django.db.models import Q
from seguridad.models.seguridad_models import PermisosModuloRol, UsuariosRol


# Módulo "Reporte Libro de Compra"
class PermisoConsultarReporteLibroCompra(BasePermission):
    message = 'No tiene permiso para consultar en reporte libro de compra.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=83))
            if permisos_modulo_rol:
                return True

        return False


# "Reporte Consolidado Libro de Compras"
class PermisoConsultarReporteConsolidadoLibroCompras(BasePermission):
    message = 'No tiene permiso para consultar en Reporte Consolidado Libro de Compras.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=84))
            if permisos_modulo_rol:
                return True

        return False
    
#Reporte Consolidado Pago de Cuotas de Fomento
class PermisoConsultarReporteConsolidadoPagoCuotasFomento(BasePermission):
    message = 'No tiene permiso para consultar en Reporte Consolidado Pago de Cuotas de Fomento.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=85))
            if permisos_modulo_rol:
                return True

        return False
    

#Reporte Consolidado Demanda Nacional de Cacao
class PermisoConsultarReporteConsolidadoDemandaNacionalCacao(BasePermission):
    message = 'No tiene permiso para consultar en Reporte Consolidado Demanda Nacional de Cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=86))
            if permisos_modulo_rol:
                return True

        return False
    

#Reporte Sabana Importación/Exportación de Cacao
class PermisoConsultarReporteSabanaExportacion(BasePermission):
    message = 'No tiene permiso para consultar en reporte sabana de exportacion.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=87))
            if permisos_modulo_rol:
                return True

        return False
    
#Reporte Consolidado de Pago en Línea
class PermisoConsultarReporteConsolidadoPagoEnLinea(BasePermission):
    message = 'No tiene permiso para consultar en reporte consolidado de pago en línea.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=88))
            if permisos_modulo_rol:
                return True

        return False
    

#Reporte Precio Nacional de Cacao
class PermisoConsultarReportePrecioNacional(BasePermission):
    message = 'No tiene permiso para consultar en reporte de precio nacional.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=89))
            if permisos_modulo_rol:
                return True

        return False
    

#Reporte Consolidado Acuerdo de Pago
class PermisoConsultarReporteConsolidadoAcuerdoPago(BasePermission):
    message = 'No tiene permiso para consultar en reporte consolidado de acuerdo de pago.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=91))
            if permisos_modulo_rol:
                return True

        return False
    
#Reporte Consolidado Producción Nacional de Cacao
class PermisoConsultarReporteConsolidadoProduccionNacionalCacao(BasePermission):
    message = 'No tiene permiso para consultar en reporte consolidado de producción nacional de cacao.'
    def has_permission(self, request, view):
        id_user = request.user.id_usuario
        user_roles = UsuariosRol.objects.filter(id_usuario=id_user)

        for rol in user_roles:
            id_rol=  rol.id_rol
            permisos_modulo_rol = PermisosModuloRol.objects.filter(Q(id_rol=id_rol) & Q(id_permiso_modulo=140))
            if permisos_modulo_rol:
                return True

        return False