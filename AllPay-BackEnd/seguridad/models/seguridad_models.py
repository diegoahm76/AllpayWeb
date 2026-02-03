from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

from seguridad.models.transversal_models import Personas
from ..managers import CustomUserManager
from rest_framework_simplejwt.tokens import RefreshToken
from seguridad.choices.cod_permiso_choices import cod_permiso_CHOICES
from seguridad.choices.subsistemas_choices import subsistemas_CHOICES
from seguridad.choices.tipo_usuario_choices import tipo_usuario_CHOICES


# Tablas para proveer Usuarios

class OperacionesSobreUsuario(models.Model):
    cod_operacion = models.CharField(max_length=1, primary_key=True, editable=False, db_column='CodOperacion')
    nombre = models.CharField(max_length=20, unique=True, db_column='nombre')

    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'OperacionesSobreUsuario'
        verbose_name = 'Operacion sobre usuario'
        verbose_name_plural = 'Operaciones sobre usuario'


class Permisos(models.Model):
    cod_permiso = models.CharField(max_length=2, primary_key=True, choices=cod_permiso_CHOICES, db_column='CodPermiso')
    nombre_permiso = models.CharField(max_length=20, unique=True, db_column='nombre')

    def __str__(self):
        return str(self.nombre_permiso)

    class Meta:
        db_table = "Permisos"
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'


class Roles(models.Model):
    id_rol = models.SmallAutoField(primary_key=True, editable=False, db_column='IdRol')
    nombre_rol = models.CharField(max_length=100, unique=True, db_column='nombre')
    descripcion_rol = models.CharField(max_length=255, db_column='descripcion')
    Rol_sistema = models.BooleanField(default=False, db_column='rolDelSistema')

    def __str__(self):
        return str(self.nombre_rol)

    class Meta:
        db_table= 'Roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

class EstructuraMenus(models.Model): 
    id_menu = models.SmallAutoField(primary_key=True, editable=False, db_column='IdMenu')
    nombre = models.CharField(max_length=50, db_column='nombre')
    nivel_jerarquico = models.SmallIntegerField(db_column='nivelJerarquico')
    id_menu_padre = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_MenuPadre')
    orden_por_padre = models.SmallIntegerField(db_column='ordenPorPadre')
    subsistema = models.CharField(max_length=4, choices=subsistemas_CHOICES, db_column='subsistema')

    def __str__(self):
        return str(self.id_menu)

    class Meta:
        db_table= 'EstructuraMenus'
        verbose_name = 'Estructura Menus'
        verbose_name_plural = 'Estructura Menus'
        unique_together = ['id_menu_padre', 'nombre']


class Modulos(models.Model):
    id_modulo = models.SmallAutoField(primary_key=True, editable=False, db_column='IdModulo')
    nombre_modulo = models.CharField(max_length=70, unique=True, db_column='nombre')
    descripcion = models.CharField(max_length=255, db_column='descripcion')
    subsistema = models.CharField(max_length=4, choices=subsistemas_CHOICES, db_column='subsistema')
    ruta_formulario = models.CharField(max_length=255, blank=True, null=True, db_column='rutaFormulario')
    nombre_icono = models.CharField(max_length=30, blank=True, null=True, db_column='nombreIcono')
    orden_modulo = models.SmallIntegerField(db_column='ordenModulo')
    id_menu = models.ForeignKey(EstructuraMenus, on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_Menu')
    solo_usuario_web = models.BooleanField(default=False, db_column='soloUsuarioWeb')

    def __str__(self):
        return str(self.nombre_modulo)

    class Meta:
        db_table= 'Modulos'
        verbose_name = 'Modulo'
        verbose_name_plural = 'Modulos'

class PermisosModulo(models.Model):
    id_permisos_modulo= models.SmallAutoField(primary_key=True, db_column='IdPermisos_Modulo' )
    id_modulo = models.ForeignKey(Modulos, on_delete=models.CASCADE, db_column='Id_Modulo')
    cod_permiso = models.ForeignKey(Permisos, on_delete=models.CASCADE, db_column='Cod_Permiso')

    def __str__(self):
        return str(self.id_modulo) + ' ' + str(self.cod_permiso)

    class Meta:
        db_table= 'Permisos_Modulo'
        verbose_name = 'Permiso de módulo'
        verbose_name_plural = 'Permisos de módulo'
        unique_together = (('id_modulo', 'cod_permiso'),)

class PermisosModuloRol(models.Model):
    id_permiso_modulo_rol = models.SmallAutoField(primary_key=True, db_column='IdPermisos_Modulo_Rol')
    id_rol = models.ForeignKey(Roles, on_delete=models.CASCADE, db_column='Id_Rol')
    id_permiso_modulo = models.ForeignKey(PermisosModulo, on_delete=models.CASCADE, db_column='Id_Permisos_Modulo')

    def __str__(self):
        return str(self.id_rol) + ' ' + str(self.id_permiso_modulo) + ' ' + str(self.id_permiso_modulo_rol)

    class Meta:
        db_table= 'Permisos_Modulo_Rol'
        verbose_name = 'Permiso de modulo de rol'
        verbose_name_plural = 'Permisos de modulo de roles'
        unique_together = (('id_rol', 'id_permiso_modulo'),)


class User(AbstractBaseUser, PermissionsMixin):
    id_usuario = models.AutoField(primary_key=True, editable=False, db_column='IdUsuario')
    nombre_de_usuario = models.CharField(max_length=30, unique=True, db_column='nombreUsuario')
    persona = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_Persona')
    password = models.CharField(db_column='contrasegna', max_length=255)
    is_active = models.BooleanField(default=False, db_column='activo')
    is_superuser = models.BooleanField(default=False, db_column='superUser')
    is_staff = models.BooleanField(default=False, db_column='staff')
    is_blocked = models.BooleanField(default=False, db_column='bloqueado')
    creado_por_portal = models.BooleanField(default=False, db_column='creadoPorPortal')
    id_usuario_creador = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True ,db_column="Id_UsuarioCreador")
    created_at = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    activated_at = models.DateTimeField(blank=True, null=True, db_column='fechaActivacionInicial')
    tipo_usuario = models.CharField(max_length=1, default='E', choices=tipo_usuario_CHOICES, db_column='tipoUsuario')
    tiene_2FA = models.BooleanField(default=False, db_column='tiene2FA')
    last_login = models.DateTimeField(blank=True, null=True, db_column='fechaUltimoLogin')
    image_profile = models.FileField(upload_to='image_profile/', null=True, blank=True, db_column='image_profile')
    firma_usuario = models.FileField(upload_to='firma_usuario/', null=True, blank=True, db_column='firma_usuario')
   # id_archivo_foto = models.ForeignKey('gestion_documental.ArchivosDigitales', on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_ArchivoFoto')

    USERNAME_FIELD = 'nombre_de_usuario'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return str(self.nombre_de_usuario)

    def tokens(self):
        refresh = RefreshToken.for_user(self)
        roles = self.usuariosrol_set.all().values_list('id_rol__nombre_rol', flat=True)
        refresh['id_persona'] = self.persona.id_persona
        refresh['nombre_de_usuario'] = self.nombre_de_usuario
        refresh['roles'] = list(roles)
        return{'refresh': str(refresh), 'access': str(refresh.access_token)}

    class Meta:
        db_table = 'Usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

# Tablas generadas a partir de User
class UsuarioErroneo(models.Model):
    id_usuario_error = models.AutoField(primary_key=True, editable=False, db_column='IdUsuarioError')
    campo_usuario = models.CharField(max_length=30, db_column='campoUsuario')
    dirip = models.GenericIPAddressField(db_column='dirIP')
    dispositivo_conexion = models.CharField(max_length=30, db_column='dispositivoConexion')
    fecha_login_error = models.DateTimeField(auto_now_add=True, db_column='fechaLoginError')

    def __str__(self):
        return str(self.campo_usuario)

    class Meta:
        db_table = 'UsuarioErroneo'
        verbose_name = 'Usuario Erroneo'
        verbose_name_plural = 'Usuarios Erroneos'


class Login(models.Model):
    id_login = models.AutoField(primary_key=True, editable=False, db_column='IdLogin')
    id_usuario = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Id_Usuario')
    dirip = models.GenericIPAddressField(db_column='dirIP')
    dispositivo_conexion = models.CharField(max_length=30, db_column='dispositivoConexion')
    fecha_login = models.DateTimeField(auto_now=True, db_column='fechaLogin')
    fecha_hora_cierre_sesion = models.DateTimeField(blank=True, null=True, db_column='fechaCierreSesion')

    def __str__(self):
        return str(self.id_usuario)

    class Meta:
        db_table = 'Login'
        verbose_name = 'Login'
        verbose_name_plural = 'Login'


class LoginErroneo(models.Model):
    id_login_error = models.AutoField(primary_key=True, editable=False, db_column='IdLoginError')
    id_usuario = models.OneToOneField(User, on_delete=models.CASCADE, db_column='Id_Usuario')
    dirip = models.GenericIPAddressField(db_column='dirIP')
    dispositivo_conexion = models.CharField(max_length=30, db_column='dispositivoConexion')
    fecha_login_error = models.DateTimeField(auto_now=True, db_column='fechaLoginError')
    contador = models.SmallIntegerField(db_column='contador')

    def __str__(self):
        return str(self.id_usuario)

    class Meta:
        db_table = 'LoginErroneo'
        verbose_name = 'Login Erroneo'
        verbose_name_plural = 'Login Erroneo'


class UsuariosRol(models.Model):
    id_usuarios_rol = models.AutoField(primary_key=True, editable=False, db_column='IdUsuarios_Rol')
    id_rol = models.ForeignKey(Roles, on_delete=models.CASCADE, db_column='Id_Rol')
    id_usuario = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Id_Usuario')

    def __str__(self):
        return str(self.id_rol) + ' ' + str(self.id_usuario)

    class Meta:
        db_table = 'Usuarios_Rol'
        verbose_name = 'Rol de usuario'
        verbose_name_plural = 'Roles de usuario'
        unique_together = (('id_rol', 'id_usuario'),)

class Auditorias(models.Model):
    id_auditoria = models.AutoField(db_column='IdAuditoria', primary_key=True, editable=False)
    id_usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_Usuario') ##No tiene definido tipo de relacion
    id_modulo = models.ForeignKey(Modulos, on_delete=models.CASCADE, db_column='Id_Modulo')
    subsistema = models.CharField(max_length=4, choices=subsistemas_CHOICES, db_column='subsistema')
    id_cod_permiso_accion = models.ForeignKey(Permisos, on_delete=models.CASCADE, db_column='Cod_PermisoAccion')
    fecha_accion = models.DateTimeField(db_column='fechaAccion', auto_now=True)
    dirip = models.GenericIPAddressField(db_column='dirIp')
    descripcion = models.TextField(db_column='descripcion')
    valores_actualizados = models.TextField(null=True, blank=True, db_column='valoresActualizados')

    def __str__(self):
        return str(self.descripcion)

    class Meta:
        db_table ='Auditorias'
        verbose_name = 'Auditoría'
        verbose_name_plural = 'Auditorías'


class HistoricoActivacion(models.Model):
    id_historico = models.AutoField(primary_key=True, editable=False, db_column='IdHistorico')
    id_usuario_afectado = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Id_UsuarioAfectado')
    cod_operacion = models.ForeignKey(OperacionesSobreUsuario, on_delete=models.CASCADE, db_column='Cod_Operacion')
    fecha_operacion = models.DateTimeField(auto_now=True, db_column='fechaOperacion')
    justificacion = models.CharField(db_column='justificacion', max_length=255)
    usuario_operador = models.ForeignKey(User, related_name='usuarioOperador', on_delete=models.CASCADE, db_column='Id_UsuarioOperador')  #Añadido por Juan

    def __str__(self):
        return str(self.cod_operacion)

    class Meta:
        db_table = 'HistoricoActivacion'
        verbose_name = 'Histórico de activación'
        verbose_name_plural = 'Histórico de activaciones'