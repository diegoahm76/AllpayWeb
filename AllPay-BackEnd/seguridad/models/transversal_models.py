from django.db import models

from seguridad.choices.tipo_persona_choices import tipo_persona_CHOICES
from seguridad.choices.cod_naturaleza_empresa_choices import cod_naturaleza_empresa_CHOICES
from seguridad.choices.tipo_direccion_choices import tipo_direccion_CHOICES
from seguridad.choices.cod_tipo_2FA_choices import cod_tipo_2FA_CHOICES


class Paises(models.Model):
    cod_pais = models.CharField(primary_key=True, max_length=2, db_column='CodPais')
    nombre = models.CharField(max_length=50, unique=True, db_column='nombre')

    def __str__(self):
        return str(self.cod_pais)

    class Meta:
        db_table = "Paises"
        verbose_name = 'Pais'
        verbose_name_plural = 'Paises'

class Municipio(models.Model):
    cod_municipio = models.CharField(primary_key=True, max_length=5, db_column='CodMunicipio')
    nombre = models.CharField(max_length=30, db_column='nombre')
    cod_departamento = models.ForeignKey('Departamento', on_delete=models.CASCADE, db_column='Cod_Departamento')
    es_cacaotero = models.BooleanField(default=False, db_column='es_cacaotero')

    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'MunicipiosDepartamento'
        verbose_name = 'Municipio'
        verbose_name_plural = 'Municipios'
        unique_together = (('nombre', 'cod_departamento'),)

class Departamento(models.Model):
    cod_departamento = models.CharField(primary_key=True, max_length=2, db_column='CodDepartamento')
    nombre = models.CharField(max_length=50, unique=True, db_column='nombre')
    pais = models.ForeignKey(Paises, on_delete=models.CASCADE, db_column='Cod_Pais')

    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'DepartamentosPais'
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'

class Sexo(models.Model):
    cod_sexo = models.CharField(primary_key=True, max_length=1, db_column='CodSexo')
    nombre = models.CharField(max_length=20, unique=True, db_column='nombre')

    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'Sexo'
        verbose_name = 'Sexo'
        verbose_name_plural = 'Sexo'


class TipoDocumento(models.Model):
    cod_tipo_documento = models.CharField(max_length=2, primary_key=True, db_column='CodTipoDocumentoID')
    nombre = models.CharField(max_length=40, unique=True, db_column='nombre')
    precargado = models.BooleanField(default=False, db_column='registroPrecargado')
    activo = models.BooleanField(default=True, db_column='activo')
    item_ya_usado = models.BooleanField(default=False, db_column='itemYaUsado')
    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'TiposDocumentoID'
        verbose_name = 'Tipo de documento'
        verbose_name_plural = 'Tipos de documentos'


class Cargos(models.Model):
    id_cargo = models.SmallAutoField(primary_key=True, editable=False, db_column='IdCargo')
    nombre = models.CharField(max_length=50, unique=True, db_column='nombre')
    activo = models.BooleanField(default=True, db_column='activo')
    item_ya_usado = models.BooleanField(default=False, db_column='itemYaUsado')

    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'Cargos'
        verbose_name = 'Cargo'
        verbose_name_plural = 'Cargos'

class Personas(models.Model):
    id_persona = models.AutoField(primary_key=True, editable=False, db_column='IdPersona')
    tipo_documento = models.ForeignKey('TipoDocumento', on_delete=models.CASCADE, db_column='Cod_TipoDocumentoID')
    numero_documento = models.CharField(max_length=20, db_column='nroDocumentoID')
    cod_municipio_expedicion_id = models.ForeignKey('Municipio', related_name='cod_municipio_expedicion_id', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_MunicipioExpID')
    proveedor = models.BooleanField(default=False, db_column='esProveedor')
    digito_verificacion = models.CharField(max_length=1, null=True, blank=True, db_column='digitoVerificacion')
    tipo_persona = models.CharField(max_length=1, choices=tipo_persona_CHOICES, db_column='TipoPersona')
    cod_naturaleza_empresa = models.CharField(max_length=2, choices=cod_naturaleza_empresa_CHOICES, null=True, blank=True, db_column='codNaturalezaEmpresa')
    primer_nombre = models.CharField(max_length=50, null=True, blank=True, db_column='primerNombre')
    segundo_nombre = models.CharField(max_length=50, null=True, blank=True, db_column='segundoNombre')
    primer_apellido = models.CharField(max_length=50, null=True, blank=True, db_column='primerApellido')
    segundo_apellido = models.CharField(max_length=50, null=True, blank=True, db_column='segundoApellido')
    razon_social = models.CharField(max_length=200, null=True, blank=True, db_column='razonSocial')
    nombre_comercial = models.CharField(max_length=200, null=True, blank=True, db_column='nombreComercial')
    direccion_residencia = models.CharField(max_length=255, null=True, blank=True, db_column='dirResidencia')
    municipio_residencia = models.ForeignKey('Municipio', related_name='municipio_residencia', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_MunicipioResidenciaNal')
    direccion_laboral = models.CharField(max_length=255, null=True, blank=True, db_column='dirLaboralNal')
    cod_municipio_laboral_nal = models.ForeignKey('Municipio', related_name='cod_municipio_laboral_nal', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_MunicipioLaboralNal')
    direccion_notificaciones = models.CharField(max_length=255, null=True, blank=True, db_column='dirNotificacionNal')
    direccion_notificacion_referencia = models.CharField(max_length=255, null=True, blank=True, db_column='dirNotificacionNalReferencia')
    cod_municipio_notificacion_nal = models.ForeignKey('Municipio', related_name='cod_municipio_notificacion_nal', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_MunicipioNotificacionNal')
    email = models.EmailField(null=True, blank=True, max_length=100, db_column='emailNotificacion')
    email_empresarial = models.EmailField(max_length=100, null=True, blank=True, db_column='emailEmpresarial')
    telefono_fijo_residencial = models.CharField(max_length=15, null=True, blank=True, db_column='telFijoResidencial')
    telefono_celular = models.CharField(max_length=15, null=True, blank=True, db_column='telCelularPersona')
    telefono_empresa = models.CharField(max_length=15, null=True, blank=True, db_column='telEmpresa')
    telefono_celular_empresa = models.CharField(max_length=15, blank=True, null=True, db_column='telCelularEmpresa')
    telefono_empresa_2 = models.CharField(max_length=15, null=True, blank=True, db_column='telEmpresa2')
    cod_pais_nacionalidad_empresa = models.ForeignKey('Paises', related_name='cod_pais_nacionalidad_empresa', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_PaisNacionalidadDeEmpresa')
    representante_legal = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_PersonaRepLegal', related_name='rep_legal')
    fecha_cambio_representante_legal = models.DateTimeField(null=True, blank=True, db_column='fechaCambioRepLegal')
    fecha_inicio_cargo_rep_legal = models.DateField(null=True, blank=True, db_column='fechaInicioCargoRepLegal')
    fecha_nacimiento = models.DateField(blank=True,null=True, db_column='fechaNacimiento')
    pais_nacimiento = models.ForeignKey('Paises', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_PaisNacimiento')
    sexo = models.ForeignKey('Sexo', on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_Sexo')
    id_cargo = models.ForeignKey('Cargos', on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_CargoActual')
    fecha_inicio_cargo_actual = models.DateField(null=True, blank=True, db_column='fechaInicioCargoActual')
    fecha_a_finalizar_cargo_actual = models.DateField(null=True, blank=True, db_column='fechaAFinalizarCargoActual')
    acepta_notificacion_sms = models.BooleanField(default=False, db_column='aceptaNotificacionSMS')
    acepta_notificacion_email = models.BooleanField(default=False, db_column='aceptaNotificacionEMail')
    fecha_ultim_actualizacion_autorizaciones = models.DateTimeField(null=True, blank=True, db_column='fechaUltActuaAutorizaciones')
    acepta_tratamiento_datos = models.BooleanField(null=True, blank=True, db_column='aceptaTratamientoDeDatos')
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    id_persona_crea = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_PersonaCrea', related_name='persona_crea')
    fecha_ultim_actualiz_diferente_crea = models.DateTimeField(null=True, blank=True, db_column='fechaUltActuaDifCrea')
    id_persona_ultim_actualiz_diferente_crea = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_PersonaUltActuaDifCrea', related_name='persona_ult_act_dif')
    archivo_rut = models.FileField(upload_to='archivos_rut/', null=True, blank=True, db_column='docRut')
    camaraComercio = models.FileField(upload_to='camara_comercio/', null=True, blank=True, db_column='docCamaraComercio')
    documentoRepresentante = models.FileField(upload_to='documento_representante/', null=True, blank=True, db_column='docDocumentoRep')
    coordenada_x = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, db_column='coordenadaX')
    coordenada_y = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, db_column='coordenadaY')
    cod_tipo_comprador = models.CharField(max_length=10, null=True, blank=True, db_column='codTipoComprador')


    def __str__(self):
        return str(self.primer_nombre) + ' ' + str(self.primer_apellido)

    class Meta:
        db_table = 'Personas'
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'
        unique_together = ['tipo_documento', 'numero_documento']


class HistoricoDireccion(models.Model):
    id_historico_direccion = models.AutoField(primary_key=True, editable=False, db_column='IdHistoDireccion')
    id_persona = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_Persona')
    direccion = models.CharField(max_length=255, db_column='direccion')
    cod_municipio = models.ForeignKey(Municipio, on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_MunicipioEnCol')
    cod_pais_exterior = models.ForeignKey(Paises, on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_PaisEnElExterior')
    tipo_direccion = models.CharField(max_length=3, choices=tipo_direccion_CHOICES, db_column='tipoDeDireccion')
    fecha_cambio = models.DateTimeField(auto_now_add=True, db_column='fechaCambio')

    def __str__(self):
        return str(self.id_historico_direccion)

    class Meta:
        db_table = 'HistoricoDirecciones'
        verbose_name = 'Histórico de dirección'
        verbose_name_plural = 'Histórico de direcciones'



class HistoricoRepresentLegales(models.Model):
    id_historico_represent_legal = models.AutoField(primary_key=True, editable=False, db_column='IdHistoricoRepLegal')
    id_persona_empresa = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaEmpresa', related_name='persona_empresa_historico')
    consec_representacion = models.SmallIntegerField(db_column='consecRepresentacion')
    id_persona_represent_legal = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaRepLegal', related_name='rep_legal_historico')
    fecha_cambio_sistema = models.DateTimeField(auto_now_add=True, db_column='fechaCambioEnSistema')
    fecha_inicio_cargo = models.DateField(db_column='fechaInicioCargo')

    def __str__(self):
        return str(self.id_persona_empresa + ' ' + str(self.consec_representacion))

    class Meta:
        db_table = 'HistoricoRepLegales'
        verbose_name = 'Histórico de representante legal'
        verbose_name_plural = 'Histórico de representantes legales'


class HistoricoAutorizacionNotificaciones(models.Model):
    id_historico_autorizacion = models.AutoField(primary_key=True, editable=False, db_column='IdHistoAutorizaNoti')
    id_persona = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_Persona')
    email_notificacion = models.EmailField(max_length=100, db_column='emailDeNotificacion')
    telefono_celular = models.CharField(max_length=15, db_column='telDeNotificacion')
    acepta_notificacion_email = models.BooleanField(default=False, db_column='aceptaNotificacionEMail')
    acepta_notificacion_sms = models.BooleanField(default=False, db_column='aceptaNotificacionSMS')
    fecha_autorizacion = models.DateTimeField(auto_now_add=True, db_column='fechaAutorizacion')
    
    def __str__(self):
        return str(self.id_historico_autorizacion)
    
    class Meta:
        db_table = 'HistoricoAutorizaNoti'
        verbose_name = 'Histórico de autorización de notificaciones'
        verbose_name_plural = 'Histórico de autorizaciones de notificaciones'


class SegundoFactorAutenticacion(models.Model):
    id_2fa = models.AutoField(primary_key=True, db_column='Id2FA')
    tipo_2fa = models.CharField(max_length=10, choices=cod_tipo_2FA_CHOICES, db_column='codTipo2FA')
    descripcion = models.CharField(max_length=500, db_column='descripcion')
    fecha_registro = models.DateTimeField(auto_now_add=True, db_column='fechaRegistro')
    activo = models.BooleanField(default=True, db_column='activo')

    def __str__(self):
        return f"{self.tipo_2fa} - {self.descripcion}"

    class Meta:
        db_table = '2FA'
        verbose_name = '2FA'
        verbose_name_plural = '2FA'
        indexes = [
            models.Index(fields=['tipo_2fa']),
            models.Index(fields=['activo']),
        ]


class SegundoFAPersona(models.Model):
    id_2fa_persona = models.AutoField(primary_key=True, editable=False, db_column='Id2FAPersona')
    id_persona = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_Persona')
    id_2fa = models.ForeignKey(SegundoFactorAutenticacion, on_delete=models.CASCADE, db_column='Id_2FA')
    email_verificacion = models.EmailField(max_length=100, null=True, blank=True, db_column='emailVerificacion')
    tel_verificacion = models.CharField(max_length=20, null=True, blank=True, db_column='telVerificacion')
    secret_key = models.CharField(max_length=100, null=True, blank=True, db_column='secretKey')
    authy_id = models.CharField(max_length=50, null=True, blank=True, db_column='authy_id')
    verificado = models.BooleanField(default=False, db_column='verificado')
    activo = models.BooleanField(default=True, db_column='activo')
    fecha_registro = models.DateTimeField(auto_now_add=True, db_column='fechaRegistro')
    fecha_actualizacion = models.DateTimeField(auto_now=True, db_column='fechaActualizacion')
    
    def __str__(self):
        return f"{self.id_persona} → {self.id_2fa}"
      
    class Meta:
        db_table = '2FAPersona'
        verbose_name = '2FA de persona'
        verbose_name_plural = '2FA de personas'
        unique_together = ['id_persona', 'id_2fa']
        indexes = [
            models.Index(fields=['id_persona', 'id_2fa']),
            models.Index(fields=['verificado']),
            models.Index(fields=['activo']),
        ]


class Verificacion_2FA(models.Model):
    id_verificacion_2fa = models.AutoField(primary_key=True, editable=False, db_column='IdVerificacion_2FA')
    id_2fa_persona = models.ForeignKey(SegundoFAPersona, on_delete=models.CASCADE, db_column='Id_2FAPersona') 
    codigo_verificacion = models.CharField(max_length=10, db_column='codigoEnviado')
    verificacion_exitosa = models.BooleanField(default=False, db_column='verificacionExitosa')
    fecha_verificacion = models.DateTimeField(auto_now=True, db_column='fechaVerificacion')
    codigo_ingresado = models.CharField(max_length=10, null=True, blank=True, db_column='codigoIngresado')
    canal = models.CharField(max_length=10, null=True, blank=True, db_column='canal')
    request_id = models.CharField(max_length=100, null=True, blank=True, db_column='request_id')
    expiracion = models.DateTimeField(null=True, blank=True, db_column='expiracion')
    intentos = models.IntegerField(default=0, db_column='intentos')
    fecha_validacion = models.DateTimeField(null=True, blank=True, db_column="fechaValidacion")

    class Meta:
        db_table = 'Verificacion_2FA'
        verbose_name = 'Verificación 2FA'
        verbose_name_plural = 'Verificaciones 2FA'
        indexes = [
            models.Index(fields=['id_2fa_persona']),
            models.Index(fields=['verificacion_exitosa']),
            models.Index(fields=['fecha_verificacion']),
        ]


class DocumentosPersona(models.Model):
    id_documento_persona = models.AutoField(primary_key=True, editable=False, db_column='IdDocumentoPersona')
    archivo_rut = models.FileField(max_length=500, upload_to='archivos_rut/', null=True, blank=True, db_column='archivoRUT')
    
    def __str__(self):
        return str(self.id_documento_persona)
    
    class Meta:
        db_table = 'DocumentosPersona'
        verbose_name = 'Documento de persona'
        verbose_name_plural = 'Documentos de personas'


class IdentificacionTemporal(models.Model):
    id_identificacion_temporal = models.AutoField(primary_key=True, editable=False, db_column='IdIdentificacion')
    cod_recuperacion = models.CharField(max_length=50, null=True, blank=True, db_column='codRecuperacion')
    cod_tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_TipoDocumentoID')
    numero_documento = models.CharField(max_length=20, null=True, blank=True, db_column='nroDocumentoID')
    nombre = models.CharField(max_length=100, null=True, blank=True, db_column='nombre')
    direccion = models.CharField(max_length=255, null=True, blank=True, db_column='direccion')
    cod_municipio = models.ForeignKey(Municipio, on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_Municipio')
    cod_departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True, db_column='Cod_Departamento')
    numero_documento_contacto = models.CharField(max_length=20, null=True, blank=True, db_column='nroDocumentoContacto')
    nombre_contacto = models.CharField(max_length=100, null=True, blank=True, db_column='nombreContacto')
    apellido_contacto = models.CharField(max_length=100, null=True, blank=True, db_column='apellidoContacto')
    email = models.EmailField(max_length=100, null=True, blank=True, db_column='email')
    tel_fijo= models.CharField(max_length=15, null=True, blank=True, db_column='telFijo')
    tel_celular = models.CharField(max_length=15, null=True, blank=True, db_column='telCelular')
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True, blank=True, db_column='fechaCreacion')
    id_persona_crea = models.ForeignKey(Personas, on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_PersonaCrea', related_name='persona_crea_temp')

    
    def __str__(self):
        return str(self.id_identificacion_temporal)
    
    class Meta:
        db_table = 'IdentificacionesTMP'
        verbose_name = 'Identificación temporal'
        verbose_name_plural = 'Identificaciones temporales'
        unique_together = ['cod_tipo_documento', 'numero_documento']


class TipoComprador(models.Model):
    cod_tipo_comprador = models.CharField(max_length=1, primary_key=True, db_column='CodTipoComprador')
    nombre = models.CharField(max_length=40, unique=True, db_column='nombre')
    precargado = models.BooleanField(default=False, db_column='registroPrecargado')
    activo = models.BooleanField(default=True, db_column='activo')
    item_ya_usado = models.BooleanField(default=False, db_column='itemYaUsado')
    def __str__(self):
        return str(self.nombre)

    class Meta:
        db_table = 'TiposComprador'
        verbose_name = 'Tipo de comprador'
        verbose_name_plural = 'Tipos de comprador'

