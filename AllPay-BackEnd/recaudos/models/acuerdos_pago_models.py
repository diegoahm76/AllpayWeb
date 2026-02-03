from django.db import models
from recaudos.models.documento_models import DocumentosGenerados
from recaudos.models.recaudos_models import FacturaUnica, LiquidacionesFacturaUnica
from recaudos.choices.cod_estado_acuerdo_choices import cod_estado_acuerdo_CHOICES
from seguridad.models.transversal_models import Personas

class SolicitudAcuerdosPago(models.Model):
    id_solicitud_acuerdo_pago = models.AutoField(primary_key=True, editable=False, db_column='IdSolicitudAcuerdoPago')
    id_persona_solicita = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaSolicita')
    nro_solicitud = models.IntegerField(db_column='nroSolicitud')
    fecha_solicitud = models.DateTimeField(db_column='fechaSolicitud')
    valor_total_pagar = models.DecimalField(max_digits=20, decimal_places=2, db_column='valorTotalPagar')
    estado = models.CharField(max_length=2, choices=cod_estado_acuerdo_CHOICES, db_column='estado')
    observaciones = models.CharField(max_length=255, db_column='observaciones')
    doc_solicitud = models.FileField( upload_to='doc_solicitud/', db_column='doc_solicitud')
    
    class Meta:
        db_table = 'SolicitudesAcuerdoPago'
        verbose_name = 'Solicitud de Acuerdo de Pago'
        verbose_name_plural = 'Solicitudes de Acuerdos de Pago'
        
class DetalleAcuerdoPago(models.Model):
    id_detalle_acuerdo_pago = models.AutoField(primary_key=True, editable=False, db_column='IdDetalleAcuerdoPago')
    id_Solicitud_acuerdo_pago = models.ForeignKey(SolicitudAcuerdosPago, on_delete=models.CASCADE, db_column='IdSolicitudAcuerdoPago')
    id_factura_unica = models.ForeignKey(FacturaUnica, on_delete=models.CASCADE, db_column='IdFacturaUnica')
    id_cuota_acuerdo_pago = models.ForeignKey('CuotasAcuerdoPago', on_delete=models.SET_NULL, null=True, blank=True, db_column='IdCuotaAcuerdoPago')
    
    class Meta:
        db_table = 'DetallesAcuerdoPago'
        verbose_name = 'Detalle de Acuerdo de Pago'
        verbose_name_plural = 'Detalles de Acuerdos de Pago'

class PlanesPago(models.Model):
    id_plan_pago = models.AutoField(primary_key=True, editable=False, db_column='IdPlanPago')
    id_solicitud_acuerdo_pago = models.ForeignKey(SolicitudAcuerdosPago, on_delete=models.CASCADE, db_column='IdSolicitudAcuerdoPago')
    nro_plan_pago = models.IntegerField(db_column='nroPlanPago')
    nro_cuotas = models.SmallIntegerField(db_column='nroCuotas')
    valor_total_pagar = models.DecimalField(max_digits=20, decimal_places=2, db_column='valorTotalPagar')
    estado = models.CharField(max_length=2, choices=cod_estado_acuerdo_CHOICES, db_column='estado')
    observacion_juridica = models.CharField(max_length=255, db_column='observacionJuridica', null=True, blank=True)
    observacion_direccion= models.CharField(max_length=255, db_column='observacionDireccion', null=True, blank=True)
    fecha_aprobacion_recaudo = models.DateTimeField(db_column='fechaAprobacionRecaudo', null=True, blank=True)
    fecha_aprobacion_juridica = models.DateTimeField(db_column='fechaAprobacionJuridica', null=True, blank=True)
    fecha_aprobacion_direccion = models.DateTimeField(db_column='fechaAprobacionDireccion', null=True, blank=True)
    fecha_notificacion = models.DateTimeField(db_column='fechaNotificacion', null=True, blank=True)
    fecha_aprobacion_recaudor = models.DateTimeField(db_column='fechaAprobacionRecaudor', null=True, blank=True)
    doc_acuerdo_pago = models.ForeignKey(DocumentosGenerados,  on_delete=models.SET_NULL,null=True, blank=True, related_name='doc_acuerdo_pago', db_column='doc_acuerdo_pago')
    
    class Meta:
        db_table = 'PlanesPago'
        verbose_name = 'Plan de Pago'
        verbose_name_plural = 'Planes de Pago'
        unique_together = (('id_solicitud_acuerdo_pago', 'id_plan_pago'))
        
class CuotasAcuerdoPago(models.Model):
    id_cuota_acuerdo_pago = models.AutoField(primary_key=True, editable=False, db_column='IdCuotaAcuerdoPago')
    id_plan_pago = models.ForeignKey(PlanesPago, on_delete=models.CASCADE, db_column='IdPlanPago')
    nro_cuota = models.IntegerField(db_column='nroCuota')
    fecha_vencimiento = models.DateTimeField(db_column='fechaVencimiento')
    valor_cuota = models.DecimalField(max_digits=20, decimal_places=2, db_column='valorCuota')
    pagada = models.BooleanField(db_column='pagada', default=False)
    fecha_pago = models.DateTimeField(db_column='fechaPago', null=True, blank=True)
    id_liquidacion = models.ForeignKey(LiquidacionesFacturaUnica,  on_delete=models.SET_NULL, null=True, blank=True, related_name='id_liquidacion', db_column='id_liquidacion')

    class Meta:
        db_table = 'CuotasAcuerdoPago'
        verbose_name = 'Cuota de Acuerdo de Pago'
        verbose_name_plural = 'Cuotas de Acuerdos de Pago'
        unique_together = (('id_plan_pago', 'nro_cuota'))