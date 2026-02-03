from django.db import models
from seguridad.models.transversal_models import Personas
from seguridad.models.seguridad_models import Modulos
from seguridad.choices.alertas_choices import COD_TIPOALERTAS_CHOICES, NIVEL_PRIORIDAD_CHOICES, CATEGORIA_ALERTA_CHOICES, cod_tipo_perfil_CHOICES

class ConfiguracionClaseAlerta(models.Model):
    cod_clase_alerta = models.CharField(primary_key=True, max_length=10, db_column='CodClaseAlerta')
    nombre_clase_alerta = models.CharField(max_length=50, unique=True, db_column='nombreClaseAlerta')
    descripcion_clase_alerta = models.CharField(max_length=255, db_column='descripcionClaseAlerta')
    cod_tipo_clase_alerta = models.CharField(max_length=2, choices=COD_TIPOALERTAS_CHOICES, db_column='codTipoClaseAlerta')
    cod_categoria_clase_alerta = models.CharField(max_length=3, choices=[('Ale', 'Alerta'), ('Com', 'Comunicación')], db_column='codCategoriaClaseAlerta')
    cant_dias_previas = models.SmallIntegerField(null=True, blank=True, db_column='ctdadDiasAlertasPrevias')
    frecuencia_previas = models.SmallIntegerField(null=True, blank=True, db_column='frecuenciaAlertasPrevias')
    cant_dias_post = models.SmallIntegerField(null=True, blank=True, db_column='ctdadRepeticionesPost')
    frecuencia_post = models.SmallIntegerField(null=True, blank=True, db_column='frecuenciaRepeticionesPost')
    envios_email = models.BooleanField(default=False, db_column='envioSimultaneoEmail')	
    nivel_prioridad = models.CharField(max_length=1, choices=NIVEL_PRIORIDAD_CHOICES, db_column='nivelPrioridad')# nivelPrioridad
    activa = models.BooleanField(default=True, db_column='activa')
    mensaje_base_dia = models.CharField(max_length=255, db_column='mensajeBaseDelDia')
    mensaje_base_previo = models.CharField(blank=True, max_length=255, db_column='mensajeBasePrevio')
    mensaje_base_vencido = models.CharField(blank=True, max_length=255, db_column='mensajeBaseVencido')
    asignar_responsable = models.BooleanField(default=False, db_column='asignarResponsableDirEnConfig')
    id_modulo_destino = models.ForeignKey(Modulos, db_column='Id_ModuloDestino', on_delete=models.SET_NULL, null=True, blank=True, related_name='configuraciones_destino')
    id_modulo_generador = models.ForeignKey(Modulos, db_column='Id_ModuloGenerador', on_delete=models.SET_NULL, null=True, blank=True, related_name='configuraciones_generador')
    nombre_funcion_comple_mensaje = models.CharField(max_length=255, blank=True, db_column='nombreFuncionParaCompleAMensaje')
    
    def __str__(self):
        return str(self.nombre_clase_alerta)

    class Meta:
        db_table = 'ConfiguracionClasesAlerta'
        verbose_name = 'Configuracion de Clase de Alerta'
        verbose_name_plural = 'Configuraciones de Clases de Alertas'


class FechaClaseAlerta(models.Model):
    id_fecha = models.SmallAutoField(primary_key=True, db_column='IdFecha_ClaseAlerta')
    cod_clase_alerta = models.ForeignKey(ConfiguracionClaseAlerta, on_delete=models.CASCADE, db_column='Cod_ClaseAlerta')
    dia_cumplimiento = models.SmallIntegerField(db_column='diaCumplimiento')
    mes_cumplimiento = models.SmallIntegerField(db_column='mesCumplimiento')
    age_cumplimiento = models.SmallIntegerField(null=True, blank=True, db_column='agnoCumplimiento')

    def __str__(self):
        return str(self.id_fecha)

    class Meta:
        db_table = 'Fechas_ClaseAlerta'
        verbose_name = 'Fecha de Clase de Alerta'
        verbose_name_plural = 'Fechas de Clases de Alertas'
        unique_together = ['cod_clase_alerta', 'dia_cumplimiento','mes_cumplimiento','age_cumplimiento']


class PersonasAAlertar(models.Model):
    id_persona_alertar = models.SmallAutoField(primary_key=True, db_column='IdPersonaAAlertar_ClaseAlerta')
    cod_clase_alerta = models.ForeignKey(ConfiguracionClaseAlerta, on_delete=models.CASCADE, db_column='Cod_ClaseAlerta')
    id_persona = models.ForeignKey(Personas, null=True, blank=True, on_delete=models.SET_NULL, db_column='Id_Persona')
    perfil_sistema = models.CharField(blank=True, max_length=4, choices=cod_tipo_perfil_CHOICES, db_column='codPerfilDelSistema')
    es_responsable_directo = models.BooleanField(null=True, blank=True, db_column='esResponsableDirecto')
    registro_editable = models.BooleanField(default=True, db_column='registroEditable')
    
    def __str__(self):
        return str(self.id_persona_alertar)

    class Meta:
        db_table = 'PersonasAAlertar_ClaseAlerta'
        verbose_name = 'Persona a Alertar'
        verbose_name_plural = 'Personas a Alertar'
        unique_together = ['cod_clase_alerta', 'id_persona','perfil_sistema']


class AlertasProgramadas(models.Model):
    id_alerta_programada = models.AutoField(primary_key=True, db_column='IdAlertaProgramada')
    cod_clase_alerta = models.ForeignKey(ConfiguracionClaseAlerta, on_delete=models.CASCADE, db_column='Cod_ClaseAlerta')
    nombre_clase_alerta = models.CharField(max_length=50, db_column='nombreClaseAlerta')
    dia_cumplimiento = models.SmallIntegerField(db_column='diaCumplimiento')
    mes_cumplimiento = models.SmallIntegerField(db_column='mesCumplimiento')
    agno_cumplimiento = models.SmallIntegerField(null=True, blank=True, db_column='agnoCumplimiento')
    ctdad_dias_alertas_previas = models.SmallIntegerField(db_column='ctdadDiasAlertasPrevias')
    frecuencia_alertas_previas = models.SmallIntegerField(db_column='frecuenciaAlertasPrevias')
    ctdad_repeticiones_post = models.SmallIntegerField(db_column='ctdadRepeticionesPost')
    frecuencia_repeticiones_post = models.SmallIntegerField(db_column='frecuenciaRepeticionesPost')
    mensaje_base_del_dia = models.CharField(max_length=255, db_column='mensajeBaseDelDia')
    mensaje_base_previo = models.CharField(max_length=255, blank=True,db_column='mensajeBasePrevio')
    mensaje_base_vencido = models.CharField(max_length=255, blank=True, db_column='mensajeBaseVencido')
    complemento_mensaje = models.CharField(max_length=255, blank=True, db_column='complementoMensaje')
    nombre_funcion_comple_mensaje = models.CharField(max_length=255, blank=True, db_column='nombreFuncionParaCompleAMensaje')
    id_modulo_destino = models.ForeignKey(Modulos, related_name='modulo_destino_alertas_programadas', null=True, blank=True, on_delete=models.SET_NULL, db_column='Id_ModuloDestino')
    id_elemento_implicado = models.IntegerField(null=True, blank=True, db_column='idElementoImplicado')
    valor_adicional = models.CharField(max_length=50, blank=True, db_column='valorAdicionalParaIdOrigenAlerta')
    id_modulo_generador = models.ForeignKey(Modulos, related_name='modulo_generador_alertas_programadas', on_delete=models.CASCADE, db_column='Id_ModuloGenerador')
    tiene_implicado = models.BooleanField(default=False, db_column='tienePersonaImplicada')
    id_persona_implicada = models.ForeignKey(Personas, null=True, blank=True, on_delete=models.SET_NULL, db_column='Id_PersonaImplicada')
    id_personas_alertar = models.CharField(max_length=255, blank=True, db_column='idPersonasAAlertar')
    id_und_org_lider_alertar = models.CharField(max_length=255, blank=True, db_column='idUndOrgLideresAAlertar')
    id_perfiles_sistema_alertar = models.CharField(max_length=255, blank=True, db_column='codPerfilesSistemaAAlertar')
    id_personas_suspen_alertar_sin_agno = models.CharField(max_length=255, blank=True, db_column='idPersonasSuspendEnAlerSinAgno')
    cod_categoria_alerta = models.CharField(max_length=3, choices=CATEGORIA_ALERTA_CHOICES, db_column='codCategoriaAlerta')
    requiere_envio_email = models.BooleanField(default=False, db_column='requiereEnvioEmail')
    nivel_prioridad = models.CharField(max_length=1, choices=NIVEL_PRIORIDAD_CHOICES, db_column='nivelPrioridad')
    existe_alertado_previo = models.BooleanField(default=False, db_column='existeAlertadoPrevioAEstaProgr')
    activa = models.BooleanField(default=False, db_column='activa')

    def __str__(self):
        return str(self.id_alerta_programada)

    class Meta:
        db_table = 'AlertasProgramadas'
        verbose_name = 'Alerta Programada'
        verbose_name_plural = 'Alertas Programadas'


class AlertasGeneradas(models.Model):
    id_alerta_generada = models.AutoField(primary_key=True, db_column='IdAlertaGenerada')
    nombre_clase_alerta = models.CharField(max_length=50, db_column='nombreClaseAlerta')
    mensaje = models.CharField(max_length=785, db_column='mensaje')
    fecha_generada = models.DateTimeField(auto_now=True, db_column='fechaGenerada')
    cod_categoria_alerta = models.CharField(max_length=3, choices=CATEGORIA_ALERTA_CHOICES, db_column='codCategoriaAlerta')
    nivel_prioridad = models.CharField(max_length=1, choices=NIVEL_PRIORIDAD_CHOICES, db_column='nivelPrioridad')
    id_modulo_destino = models.ForeignKey(Modulos, related_name='modulo_destino_alertas_generadas', null=True, blank=True, on_delete=models.SET_NULL, db_column='Id_ModuloDestino')
    id_modulo_generador = models.ForeignKey(Modulos, related_name='modulo_generador_alertas_generadas', on_delete=models.CASCADE, db_column='Id_ModuloGenerador')
    id_elemento_implicado = models.IntegerField(null=True, blank=True, db_column='idElementoImplicado')
    id_alerta_programada_origen = models.IntegerField(null=True, blank=True, db_column='idAlertaProgramada_Origen')
    envio_email = models.BooleanField(default=False, db_column='envioEmail')
    es_ultima_repeticion = models.BooleanField(default=False, db_column='esLaUltimaRepeticion')

    def __str__(self):
        return str(self.id_alerta_generada)

    class Meta:
        db_table = 'AlertasGeneradas'
        verbose_name = 'Alerta Generada'
        verbose_name_plural = 'Alertas Generadas'


class BandejaAlertaPersona(models.Model):
    id_bandeja_alerta = models.AutoField(primary_key=True, db_column='IdBandejaAlertas_Persona')
    id_persona = models.OneToOneField(Personas, on_delete=models.CASCADE, db_column='Id_Persona')
    pendientes_leer = models.BooleanField(default=False, db_column='pendientesLeer')
    pendientes_archivar = models.BooleanField(default=False, db_column='pendientesArchivar')
    
    def __str__(self):
        return str(self.id_bandeja_alerta)

    class Meta:
        db_table = 'BandejasAlertas_Persona'
        verbose_name = 'Bandeja Alerta Persona'
        verbose_name_plural = 'Bandeja Alertas Personas'


class AlertasBandejaAlertaPersona(models.Model):
    id_alerta_bandeja_alerta_persona = models.AutoField(primary_key=True, db_column='IdAlertaGen_BandejaAlertas_Pna')
    id_bandeja_alerta_persona = models.ForeignKey(BandejaAlertaPersona, on_delete=models.CASCADE, db_column='Id_BandejaAlertas_Persona')
    id_alerta_generada = models.ForeignKey(AlertasGeneradas, on_delete=models.CASCADE, db_column='Id_AlertaGenerada')
    leido = models.BooleanField(default=False, db_column='leido')
    archivado = models.BooleanField(default=False, db_column='archivado')
    fecha_archivado = models.DateTimeField(null=True, blank=True, db_column='fechaArchivado')
    fecha_leido = models.DateTimeField(null=True, blank=True, db_column='fechaLeido')
    repeticiones_suspendidas = models.BooleanField(default=False, db_column='repeticionesSuspendidas')
    fecha_suspencion_repeticion = models.DateTimeField(null=True, blank=True, db_column='fechaSuspencionRepeticiones')
    fecha_envio_email = models.DateTimeField(null=True, blank=True, db_column='fechaEnvioEmail')
    email_usado = models.EmailField(max_length=100, db_column='dirEmailUtilizado', blank=True, null=True)
    responsable_directo = models.BooleanField(default=False, db_column='responsableDirecto')

    def __str__(self):
        return str(self.id_alerta_bandeja_alerta_persona)

    class Meta:
        db_table = 'AlertasGen_BandejaAlertas_Pna'
        verbose_name = 'Alerta Generada Bandeja Alerta Persona'
        verbose_name_plural = 'Alertas Generadas Bandeja Alertas Personas'
        unique_together = ['id_bandeja_alerta_persona', 'id_alerta_generada']


