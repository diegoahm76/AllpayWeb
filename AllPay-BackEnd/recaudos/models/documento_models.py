from django.db import models

class PlantillasDoc(models.Model):
    id_plantilla_doc = models.AutoField(primary_key=True, db_column='IdPlantillaDoc')
    nombre = models.CharField(max_length=100,unique=True, db_column='nombre')
    descripcion = models.CharField(max_length=255, db_column='descripcion', null=True, blank=True)
    observacion = models.CharField(max_length=255, db_column='observacion', null=True, blank=True)
    activa = models.BooleanField(default=True, db_column='activa')
    fecha_creacion = models.DateTimeField(auto_now=True, db_column='fechaCreacion')
    id_persona_crea_plantilla = models.ForeignKey('seguridad.Personas', on_delete=models.CASCADE, db_column='Id_PersonaCreaPlantilla')
    id_config_consecutivo = models.ForeignKey('recaudos.ConfiguracionConsecutivo', on_delete=models.SET_NULL, db_column='Id_ConfigConsecutivo', null=True,blank=True)
    doc_plantilla = models.FileField(upload_to='plantillas/', db_column='docPlantilla')
    class Meta:
        db_table = 'PlantillasDoc'
        
    def __str__(self):
        return self.nombre
    
class DocumentosGenerados(models.Model):
    id_documento_generado = models.AutoField(primary_key=True, db_column='IdDocumentoGenerado')
    id_plantilla_doc = models.ForeignKey(PlantillasDoc, on_delete=models.SET_NULL, db_column='Id_PlantillaDoc', blank=True, null=True)
    consecutivo = models.CharField(max_length=50, db_column='consecutivo', blank=True, null=True)
    fecha_consecutivo = models.DateTimeField(db_column='fechaConsecutivo', null=True, blank=True)
    id_persona_genera = models.ForeignKey('seguridad.Personas', on_delete=models.CASCADE, db_column='Id_PersonaGenera')
    finalizado = models.BooleanField(db_column='finalizado', default=False)
    variables  = models.JSONField(db_column='variables', blank=True, null=True)
    cargado = models.BooleanField(db_column='cargado', default=False)
    documento_generado = models.FileField(upload_to='documentos_generados/', db_column='documentoGenerado', null=True, blank=True)
    documento_generado_copia = models.FileField(upload_to='documentos_generados_copia/', db_column='documentoGeneradoCopia', null=True, blank=True)
    
    class Meta:
        db_table = 'DocumentosGenerados'

class AsignacionDocs(models.Model):
    id_asignacion_doc = models.AutoField(primary_key=True,db_column='IdAsignacionDoc')
    id_documento_generado = models.ForeignKey('DocumentosGenerados',on_delete=models.CASCADE,db_column='Id_Consecutivo')
    firma = models.BooleanField(db_column='firma')
    puede_reasignar = models.BooleanField(default=False, db_column='puedeReasignar')
    fecha_asignacion = models.DateTimeField(db_column='fechaAsignacion')
    id_persona_asigna = models.ForeignKey('seguridad.Personas',on_delete=models.CASCADE,db_column='Id_PersonaAsigna',related_name='persona_asigna_docs')
    id_persona_asignada = models.ForeignKey('seguridad.Personas',on_delete=models.CASCADE,db_column='Id_PersonaAsignada',related_name='persona_asignada_docs')
    cod_estado_asignacion = models.CharField(max_length=2, choices=[('Ac', 'Aceptado'),('Re', 'Rechazado'),('Fi', 'Firmado')], db_column='codEstadoAsignacion',null=True,blank=True)
    fecha_eleccion_estado = models.DateTimeField(db_column='fechaEleccionEstado',null=True,blank=True)
    justificacion_rechazo = models.CharField(max_length=250,null=True,blank=True,db_column='justificacionRechazo')

    class Meta:
        db_table = 'AsignacionDocs'
        