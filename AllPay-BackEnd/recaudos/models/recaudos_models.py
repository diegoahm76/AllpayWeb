from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from recaudos.models.documento_models import DocumentosGenerados
from seguridad.models.transversal_models import Personas, Municipio, Departamento, TipoDocumento
from recaudos.choices.cod_tipo_cobro_choices import cod_tipo_cobro_CHOICES
from recaudos.choices.cod_estado_choices import cod_estado_CHOICES
from recaudos.choices.cod_tipo_cargue_choices import cod_tipo_cargue_CHOICES
from seguridad.choices.cod_tipo_comprador import cod_tipo_comprador_CHOICES
from recaudos.choices.cod_tipo_paz_y_salvo_choices import cod_tipo_paz_y_salvo_CHOICES
from recaudos.choices.cod_estado_pago_choices import cod_estado_pagos_CHOICES
from recaudos.choices.cod_medio_pago_choices import cod_medio_pagos_CHOICES
from recaudos.choices.cod_estado_factura_choices import cod_estado_factura_CHOICES

from django.utils.timezone import now


class PorcentajesCobro(models.Model):
    id_porcentaje_cobro = models.SmallAutoField(primary_key=True, editable=False, db_column='IdPorcentajeCobro')
    cod_tipo_cobro = models.CharField(max_length=2, unique=True, choices=cod_tipo_cobro_CHOICES, db_column='CodTipoCobro')
    valor = models.DecimalField(max_digits=30, decimal_places=5, db_column='valor')

    def __str__(self):
        return f"{self.cod_tipo_cobro}: {self.valor}%"

    class Meta:
        db_table= 'PorcentajesCobro'
        verbose_name = 'Porcentaje de Cobro'
        verbose_name_plural = 'Porcentajes de Cobro'

class HistorialPorcentajesCobro(models.Model):
    id_historial_porcentaje_cobro = models.SmallAutoField(primary_key=True, editable=False, db_column='IdHistorialPorcentajeCobro')
    cod_tipo_cobro = models.CharField(max_length=2, choices=cod_tipo_cobro_CHOICES, db_column='CodTipoCobro')
    valor = models.DecimalField(max_digits=30, decimal_places=5, db_column='valor')
    id_persona_crea = models.ForeignKey(Personas,on_delete=models.SET_NULL,null=True,blank=True,db_column='IdPersonaCrea',related_name='id_persona_crea_historial')
    fecha_creacion = models.DateTimeField(null=True, blank=True, db_column='fechaCracion')
    id_persona_actualiza = models.ForeignKey(Personas,on_delete=models.SET_NULL,null=True,blank=True,db_column='IdPersonaActualiza',related_name='id_persona_actualiza_historial')
    fecha_actualizacion = models.DateTimeField(null=True, blank=True, db_column='fechaActualizacion')
    
    def __str__(self):
        return f"{self.cod_tipo_cobro}: {self.valor}%"

    class Meta:
        db_table= 'HistorialPorcentajesCobro'
        verbose_name = 'Historial porcentaje de Cobro'
        verbose_name_plural = 'Historiales porcentajes de Cobro'

class LiquidacionesFacturaUnica(models.Model):
    id_liq_factura_unica = models.AutoField(primary_key=True, editable=False, db_column='IdLiqFacturaUnica')
    cod_estado = models.CharField(max_length=1, choices=cod_estado_CHOICES, db_column='codEstado')
    nro_doc_pago = models.CharField(max_length=255, unique=True, db_column='nroDocPago')#consecutivo (documentos generados)
    fecha_pago = models.DateTimeField(null=True, blank=True, db_column='fechaPago')
    valor_pagar = models.DecimalField(max_digits=30, decimal_places=2, db_column='valorPagar')
    valor_intereses = models.DecimalField(max_digits=30, decimal_places=2, null=True, blank=True, db_column='valorIntereses')
    fecha_liquidacion = models.DateTimeField(auto_now_add=True, db_column='fechaLiquidacion')
    id_persona_liquida = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaLiquida')
    doc_pago = models.ForeignKey(DocumentosGenerados, on_delete=models.CASCADE, related_name='doc_generado_pago', db_column='docPago') #id_documento_generado (documentos generados)
    codigo_barras = models.CharField(max_length=255, db_column='codigoBarras')

    def __str__(self):
        return f"Liquidación {self.id_liq_factura_unica} - Estado: {self.cod_estado}"
    class Meta:
        db_table= 'LiquidacionesFacturaUnica'
        verbose_name = 'Liquidación de Factura Única'
        verbose_name_plural = 'Liquidaciones de Factura Única'

class FacturaUnica(models.Model):
    id_factura_unica = models.AutoField(primary_key=True, editable=False, db_column='IdFacturaUnica')
    id_persona_recaudador = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaRecaudador', related_name='Pesona_recaudador')
    id_liq_factura_unica = models.ForeignKey(LiquidacionesFacturaUnica, on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_LiqFacturaUnica')
    fecha_compra = models.DateTimeField(db_column='fechaCompra')
    nro_factura_unica = models.IntegerField(unique=True, db_column='nroFacturaUnica')
    total_kilos = models.DecimalField(max_digits=12, decimal_places=2, db_column='totalKilos')
    valor_bruto = models.DecimalField(max_digits=30, decimal_places=2, db_column='valorBruto')
    cuota_fomento = models.DecimalField(max_digits=30, decimal_places=2, db_column='cuotaFomento')
    valor_neto = models.DecimalField(max_digits=30, decimal_places=2, db_column='valorNeto')
    id_persona_proveedor = models.ForeignKey(Personas, on_delete=models.CASCADE, related_name='persona_proveedor', db_column='Id_PersonaProveedor', )
    id_municipio_cacao = models.ForeignKey(Municipio, on_delete=models.CASCADE, db_column='Id_MunicipioCacao')
    id_departamento_cacao = models.ForeignKey(Departamento, on_delete=models.CASCADE, db_column='Id_DepartamentoCacao')
    id_porcentaje_cobro = models.ForeignKey(PorcentajesCobro, on_delete=models.CASCADE, db_column='Id_PorcentajeCobro')
    nombre_vereda = models.CharField(max_length=255, null=True, blank=True, db_column='nombreVereda')
    nombre_finca = models.CharField(max_length=255, null=True, blank=True, db_column='nombreFinca')
    nro_documento_soporte = models.CharField(max_length=50, null=True, blank=True, db_column='nroDocumentoSoporte')
    doc_soporte = models.FileField( upload_to='doc_soporte/', null=True, blank=True, db_column='docSoporte')
    fecha_doc_soporte = models.DateTimeField(auto_now_add=False, null=True, blank=True, db_column='fechaDocSoporte')
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    id_persona_crea = models.ForeignKey(Personas, on_delete=models.CASCADE, related_name='persona_creadora', db_column='Id_PersonaCrea')
    estado_factura = models.CharField(max_length=2, choices=cod_estado_factura_CHOICES, default='CR', db_column='estadoFactura')
    # Identificador de agrupación por cargue masivo (puede ser nulo)
    uuid_cargue = models.UUIDField(null=True, blank=True, db_column='uuidCargue')

    def __str__(self):
        return f"Factura {self.nro_factura_unica} - {self.valor_neto}"
    
    class Meta:
        db_table= 'FacturaUnica'
        verbose_name = 'Factura Única'
        verbose_name_plural = 'Facturas Únicas'

class TiposCacao(models.Model):
    id_tipo_cacao = models.AutoField(primary_key=True, editable=False, db_column='IdTipoCacao')
    nombre = models.CharField(max_length=100, unique=True, db_column='nombre')
    activo = models.BooleanField(default=False, db_column='activo')
    valor_minimo = models.DecimalField(max_digits=30, decimal_places=2, null=True, blank=True, db_column='valorMinimo')
    valor_maximo = models.DecimalField(max_digits=30, decimal_places=2, null=True, blank=True, db_column='valorMaximo')
    item_ya_usado = models.BooleanField(default=False, db_column='itemYaUsado')
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    fecha_actualizacion = models.DateTimeField(auto_now=False, null=True, blank=True, db_column='fechaActualizacion')
    id_persona_crea = models.ForeignKey(Personas, on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_PersonaCrea')

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'TiposCacao'
        verbose_name = 'Tipo de Cacao'
        verbose_name_plural = 'Tipos de Cacao'

class DetallesFacturaUnica(models.Model):
    id_detalle_factura_unica = models.AutoField(primary_key=True, editable=False, db_column='IdDetalle_FacturaUnica')
    id_factura_unica = models.ForeignKey(FacturaUnica, on_delete=models.SET_NULL, null=True, blank=True, db_column='Id_FacturaUnica')
    id_tipo_cacao = models.ForeignKey(TiposCacao, on_delete=models.CASCADE, db_column='Id_TipoCacao')
    nro_kilos = models.DecimalField(max_digits=12, decimal_places=2, db_column='nroKilos')
    valor_kilo = models.DecimalField(max_digits=30, decimal_places=2, db_column='valorKilo')

    def __str__(self):
        return f"Detalle {self.id_detalle_factura_unica} - Factura {self.id_factura_unica.nro_factura_unica}"

    class Meta:
        db_table = 'Detalles_FacturaUnica'
        verbose_name = 'Detalle de Factura Única'
        verbose_name_plural = 'Detalles de Facturas Únicas'

class ConfiguracionConsecutivo(models.Model):
    id_config_consecutivo = models.AutoField(primary_key=True, editable=False, db_column='IdConfigConsecutivo')
    consecutivo_inicial = models.SmallIntegerField(db_column='consecutivoInicial')
    anio_consecutivo = models.SmallIntegerField(db_column='anioConsecutivo')
    cantidad_digitos = models.SmallIntegerField(db_column='cantidadDigitos')
    prefijo_consecutivo = models.CharField(max_length=20, db_column='prefijoConsecutivo')
    consecutivo_actual = models.SmallIntegerField(db_column='consecutivoActual')
    fecha_consecutivo_actual = models.DateTimeField( null=True, blank=True, db_column='fechaConsecutivoActual')
    fecha_configuracion = models.DateTimeField(auto_now_add=True, db_column='fechaConfiguracion')
    id_persona_configura = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaConfigura')


    def _str_(self):
        return f"{self.cod_tipo_cobro} - {self.anio_consecutivo} ({self.prefijo_consecutivo})"
    
    class Meta:
        db_table = 'ConfigConsecutivo'
        verbose_name = 'Configuración de Consecutivo'
        verbose_name_plural = 'Configuraciones de Consecutivos'
        unique_together = ('anio_consecutivo', 'prefijo_consecutivo')

class FechasCierre(models.Model):
    id_fecha_cierre = models.AutoField(primary_key=True, editable=False, db_column='IdFechaCierre')
    cod_tipo_cobro_fecha = models.CharField(max_length=2, choices=cod_tipo_cobro_CHOICES, db_column='CodTipoCobroFecha')
    # dias_registro_compra = models.SmallIntegerField(db_column='diasRegistroCompra')
    dias_pago = models.SmallIntegerField(db_column='diasPago')
    dias_pago_interes = models.SmallIntegerField(db_column='diasPagoInteres')
    fecha_actualizacion = models.DateTimeField(auto_now=True, db_column='fechaActualizacion')
    id_persona_actualiza = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaActualiza')

    def __str__(self):
        return f"{self.cod_tipo_cobro} - Último día de pago: {self.dias_pago}"

    class Meta:
        db_table = 'FechasCierre'
        verbose_name = 'Fecha de Cierre'
        verbose_name_plural = 'Fechas de Cierre'

class CargueSicex (models.Model):
    id_cargue_sicex = models.AutoField(primary_key=True, editable=False, db_column='IdCargueSicex')
    cod_tipo_cargue = models.CharField(max_length=3, choices=cod_tipo_cargue_CHOICES, db_column='CodTipoCargue')
    agno = models.CharField(max_length=4, null=True, blank=True, db_column='agno')
    aduana_embarque = models.CharField(max_length=50, db_column='aduanaEmbarque', default='')
    auto_embarque = models.CharField(max_length=20, null=True, blank=True, db_column='autoEmbarque')
    ciudad_ingreso = models.CharField(max_length=50, null=True, blank=True, db_column='ciudadIngreso')
    continente = models.CharField(max_length=20, db_column='continente')
    departamento = models.CharField(max_length=50, null=True, blank=True, db_column='departamento')
    descripcion_arancel = models.CharField(max_length=255, db_column='descripcionArancel')
    empresa_declarante = models.CharField(max_length=100, db_column='empresaDeclarante')
    empresa_operadora = models.CharField(max_length=100, null=True, blank=True, db_column='empresaOperadora')
    fecha = models.DateTimeField(db_column='fecha')
    mes = models.CharField(max_length=10, null=True, blank=True, db_column='mes')
    nit = models.CharField(max_length=20, db_column='nit')
    nro_declaracion = models.CharField(max_length=20, db_column='nroDeclaracion')
    pais = models.CharField(max_length=50, db_column='pais')
    posicion = models.CharField(max_length=20, db_column='posicion')
    pos = models.CharField(max_length=10, null=True, blank=True, db_column='pos')
    proveedor = models.CharField(max_length=100, null=True, blank=True, db_column='proveedor')
    total_peso_bruto = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='totalPesoBruto')
    total_toneladas_bruto = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='totalToneladasBruto')
    total_peso_neto = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='totalPesoNeto')
    total_toneladas_neto = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='totalToneladasNeto')
    factor_conversion = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='factorConversion')
    total_valor_cif = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='totalValorCIF')
    total_valor_fob = models.DecimalField(max_digits=30, decimal_places=2, default=0, db_column='totalValorFOB')
    via = models.CharField(max_length=20, db_column='via')
    fecha_cargue = models.DateTimeField(auto_now_add=True, db_column='fechaCargue')
    consecutivo_sicex = models.SmallIntegerField(default=0, db_column='consecutivoSicex')
    id_persona_cargue = models.ForeignKey(Personas, on_delete=models.CASCADE, null=True, blank=True, db_column='Id_PersonaCargue')

    class Meta:
        db_table = 'CargueSicex'
        verbose_name = 'Cargue Sicex'
        verbose_name_plural = 'Cargues Sicex'

class PuertosExportacion(models.Model):
    id_puerto_exportacion = models.AutoField(primary_key=True, editable=False, db_column='IdPuertoExportacion')
    nombre = models.CharField(max_length=100, unique=True, db_column='nombre')
    descripcion = models.CharField(max_length=255, db_column='descripcion')
    activo = models.BooleanField(default=True, db_column='activo')
    item_ya_usado = models.BooleanField(default=False, db_column='itemYaUsado')
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    id_persona_crea = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaCrea')

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'PuertosExportacion'
        verbose_name = 'Puerto de Exportación'
        verbose_name_plural = 'Puertos de Exportación'

class AccionesCobroPersuasivo(models.Model):
    TIPO_COBRO_CHOICES = [
        ('PERSUASIVO', 'Cobro Persuasivo'),
        ('COACTIVO', 'Cobro Coactivo'),
    ]
    
    id_accion_cobro_persuasivo = models.AutoField(primary_key=True, editable=False, db_column='IdAccionCobroPersuasivo')
    nombre = models.CharField(max_length=100, unique=True, db_column='nombre')
    descripcion = models.CharField(max_length=255, db_column='descripcion')
    tipo_cobro = models.CharField(max_length=20, choices=TIPO_COBRO_CHOICES, default='PERSUASIVO', db_column='tipoCobro')
    activo = models.BooleanField(default=True, db_column='activo')
    item_ya_usado = models.BooleanField(default=False, db_column='itemYaUsado')
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    id_persona_crea = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaCrea')

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'AccionesCobroPersuasivo'
        verbose_name = 'Acción de Cobro Persuasivo'
        verbose_name_plural = 'Acciones de Cobro Persuasivo'

class PazYSalvo (models.Model):
    id_paz_y_salvo = models.AutoField(primary_key=True, editable=False, db_column='IdPazYSalvo')
    nro_paz_y_salvo = models.CharField(max_length=255, db_column='nroPazYSalvo')
    es_actualizacion = models.BooleanField(null=True, blank=True, db_column='esActualizacion')
    aprueba_actualizacion = models.BooleanField(null=True, blank=True, db_column='apruebaActualizacion')
    fecha_generacion = models.DateTimeField(db_column='fechaGeneracion')
    fecha_actualizacion = models.DateTimeField(null=True, blank=True, db_column='fechaActualizacion')
    tipo_paz_y_salvo = models.CharField(max_length=2, choices=cod_tipo_paz_y_salvo_CHOICES, db_column='tipoPazYSalvo')
    # Permitimos decimales en los kilos reportados en el Paz y Salvo
    total_kilos_paz_y_salvo = models.DecimalField(max_digits=12, decimal_places=2, db_column='totalKilosPazYSalvo')
    id_puerto_exportacion = models.ForeignKey(
        PuertosExportacion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='Id_PuertoExportacion'
    )
    id_persona_genera = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaGenera')
    razon_social_tercero = models.CharField(null=True, blank=True,max_length=255, db_column='razonSocialTercero')
    id_tipo_doc_tercero = models.ForeignKey(TipoDocumento, null=True, blank=True, on_delete=models.SET_NULL, db_column='Id_TipoDocTercero')
    nro_doc_tercero = models.IntegerField(db_column='nroDocTercero', null=True, blank=True)
    doc_paz_y_salvo = models.ForeignKey(DocumentosGenerados, on_delete=models.CASCADE, db_column='docPazYSalvo')

    class Meta:
        db_table = 'PazYSalvo'
        verbose_name = 'Paz y Salvo'
        verbose_name_plural = 'Paz y Salvos'

class PazYSalvoFacturas(models.Model):
    id_paz_y_salvo_factura = models.AutoField(primary_key=True, editable=False, db_column='IdPazYSalvo_Facturas')
    id_factura_unica = models.ForeignKey(FacturaUnica, on_delete=models.CASCADE, db_column='Id_FacturaUnica')
    id_paz_y_salvo = models.ForeignKey(PazYSalvo, on_delete=models.CASCADE, db_column='Id_PazYSalvo')
    # Permitimos decimales en los kilos reportados por factura
    kilos_reportados = models.DecimalField(max_digits=12, decimal_places=2, db_column='kilosReportados')

    class Meta:
        db_table = 'PazYSalvo_Facturas'
        verbose_name = 'Paz y Salvo de Factura'
        verbose_name_plural = 'Paz y Salvos de Facturas'


class Pagos(models.Model):
    id_pago = models.AutoField(primary_key=True, editable=False, db_column='IdPago')
    cod_pago_realizado = models.CharField(max_length=100, db_column='codPagoRealizado')
    id_liquidacion_pago = models.ForeignKey(LiquidacionesFacturaUnica, on_delete=models.CASCADE, db_column='Id_LiquidacionPago')
    cod_estado_pago = models.CharField(max_length=2, choices=cod_estado_pagos_CHOICES, db_column='codEstadoPago')
    fecha_estado_pago = models.DateTimeField(null=True, blank=True, db_column='fechaEstadoPago')
    cod_medio_pago = models.CharField(max_length=12, choices=cod_medio_pagos_CHOICES, db_column='codMedioPago')
    valor_pagado = models.DecimalField(max_digits=30, decimal_places=2, null=True, blank=True, db_column='valorPagado')    
    fecha_pago = models.DateTimeField(null=True, blank=True, db_column='fechaPago')    
    nombres_persona_paga = models.CharField(max_length=255, db_column='nombresPersonaPaga', null=True, blank=True)
    apellidos_persona_paga = models.CharField(max_length=255, db_column='apellidosPersonaPaga', null=True, blank=True)
    email_persona_paga = models.EmailField(max_length=255, db_column='emailPersonaPaga', null=True, blank=True)
    nro_celular_persona_paga = models.CharField(max_length=20, db_column='nroCelularPersonaPaga', null=True, blank=True)
    bank_code = models.CharField(max_length=10, null=True, blank=True, db_column='bankCode')
    doc_pago = models.ForeignKey(DocumentosGenerados, on_delete=models.SET_NULL, null=True, blank=True, db_column='docPago')
    # --- Campos de trazabilidad ZonaPagos ---
    str_id_pago_zp = models.CharField(max_length=50, null=True, blank=True, db_column='strIdPagoZp', help_text='ID enviado a ZonaPagos en inicio_pago')
    int_no_pago = models.CharField(max_length=50, null=True, blank=True, db_column='intNoPago', unique=False, help_text='Identificador retornado por ZonaPagos')
    int_estado_pago = models.CharField(max_length=10, null=True, blank=True, db_column='intEstadoPago')
    int_id_forma_pago = models.CharField(max_length=10, null=True, blank=True, db_column='intIdFormaPago')
    cus = models.CharField(max_length=100, null=True, blank=True, db_column='cus')
    ticket_id = models.CharField(max_length=100, null=True, blank=True, db_column='ticketId')
    franquicia = models.CharField(max_length=50, null=True, blank=True, db_column='franquicia')
    ult4 = models.CharField(max_length=10, null=True, blank=True, db_column='ult4')
    cod_aprobacion = models.CharField(max_length=50, null=True, blank=True, db_column='codAprobacion')
    num_recibo = models.CharField(max_length=50, null=True, blank=True, db_column='numRecibo')
    raw_respuesta = models.TextField(null=True, blank=True, db_column='rawRespuesta')
    
    def __str__(self):
        return f"Pago {self.id_pago} - Valor: {self.valor_pagado} - Fecha: {self.fecha_pago}"
    
    class Meta:
        db_table= 'Pagos'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        constraints = [
            models.UniqueConstraint(fields=['id_liquidacion_pago', 'int_no_pago'], name='uq_pago_liq_intnopago')
        ]


class FechasVigencia(models.Model):
    id_fecha_vigencia = models.AutoField(primary_key=True, editable=False, db_column='IdFechaVigencia')
    cod_tipo_fecha = models.CharField(max_length=2, db_column='CodTipoFecha', unique=True)
    descripcion = models.CharField(max_length=255, db_column='descripcion')
    dias_vigencia = models.SmallIntegerField(db_column='diasVigencia')
    fecha_actualizacion = models.DateTimeField(auto_now=True, db_column='fechaActualizacion')
    id_persona_actualiza = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaActualiza')

    def __str__(self):
        return f"{self.cod_tipo_fecha} - Días de Vigencia: {self.cod_tipo_fecha}"
    
    class Meta:
        db_table= 'FechasVigencia'
        verbose_name = 'Fecha de Vigencia'
        verbose_name_plural = 'Fechas de Vigencia'


class HistoricoPazYSalvo(models.Model):
    id_historial_paz_y_salvo = models.AutoField(primary_key=True, editable=False, db_column='IdHistoricoPazYSalvo')
    id_paz_y_salvo = models.ForeignKey(PazYSalvo, on_delete=models.CASCADE, db_column='Id_PazYSalvo')
    descripcion = models.CharField(max_length=255, db_column='descripcion')
    fecha_anterior = models.DateTimeField(null=True, blank=True, db_column='fechaAnterior')
    fecha_nueva = models.DateTimeField(null=True, blank=True, db_column='fechaNueva')
    puerto_exportacion_anterior = models.SmallIntegerField(null=True, blank=True, db_column='Id_PuertoExportacionAnterior')
    puerto_exportacion_nueva = models.SmallIntegerField(null=True, blank=True, db_column='Id_PuertoExportacionNueva')
    estado = models.CharField(max_length=10, db_column='estado')
    id_persona_modifica = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_PersonaModifica')
    fecha_registro = models.DateTimeField(auto_now_add=True, db_column='fechaRegistro')

    class Meta:
        db_table = 'HistoricoPazYSalvo'
        verbose_name = 'Historial de Paz y Salvo'
        verbose_name_plural = 'Historiales de Paz y Salvo'


class CobroPersuasivo(models.Model):
    id_cobro_persuasivo = models.AutoField(primary_key=True, db_column='IdCobroPersuasivo')

    # Campos básicos del cobro
    cod_accion_registrada = models.CharField(max_length=50, null=True, blank=True, db_column='codAccionRegistrada')
    descripcion = models.TextField(null=True, blank=True, db_column='descripcion')
    consecutivo = models.CharField(max_length=50, null=True, blank=True, db_column='consecutivo')
    
    # Fecha de registro del cobro persuasivo
    fecha_registro = models.DateTimeField(null=True, blank=True, db_column='fechaRegistro')
    
    # Acción a registrar (referencia al modelo de acciones)
    id_accion_cobro_persuasivo = models.ForeignKey(
        AccionesCobroPersuasivo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_AccionCobroPersuasivo'
    )
    
    # Información del recaudador (campos adicionales)
    nombre_recaudador = models.CharField(max_length=255, null=True, blank=True, db_column='nombreRecaudador')
    email_recaudador = models.EmailField(max_length=255, null=True, blank=True, db_column='emailRecaudador')
    celular_recaudador = models.CharField(max_length=20, null=True, blank=True, db_column='celularRecaudador')
    
    # Aplicar plantilla
    aplicar_plantilla = models.BooleanField(default=False, db_column='aplicarPlantilla')
    
    # Documento adjunto
    documento_adjunto = models.FileField(upload_to='cobros_persuasivos/', null=True, blank=True, db_column='documentoAdjunto')
    
    # Documento generado (ya existía)
    doc_persuasivo = models.ForeignKey(
        'recaudos.DocumentosGenerados',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_DocGenerado'
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    id_persona_crea = models.ForeignKey(
        Personas,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_PersonaCrea'
    )

    def __str__(self):
        return f"Cobro Persuasivo {self.id_cobro_persuasivo}"

    class Meta:
        db_table = 'CobroPersuasivo'
        verbose_name = 'Cobro Persuasivo'
        verbose_name_plural = 'Cobros Persuasivos'


class PersuasivoFacturas(models.Model):
    id_persuasivo_facturas = models.AutoField(primary_key=True, db_column='IdPersuasivo_Facturas')
    
    factura = models.ForeignKey(
        FacturaUnica,
        on_delete=models.CASCADE,
        db_column='Id_FacturaUnica'
    )
    cobro_persuasivo = models.ForeignKey(
        CobroPersuasivo,
        on_delete=models.CASCADE,
        db_column='Id_CobroPersuasivo'
    )

    def __str__(self):
        return f"Persuasivo {self.cobro_persuasivo.id_cobro_persuasivo} - Factura {self.factura.nro_factura_unica}"

    class Meta:
        db_table = 'Persuasivo_Facturas'
        verbose_name = 'Factura Persuasiva'
        verbose_name_plural = 'Facturas Persuasivas'


class CobroCoactivo(models.Model):
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('FINALIZADO', 'Finalizado'),
        ('SUSPENDIDO', 'Suspendido'),
    ]
    
    id_cobro_coactivo = models.AutoField(primary_key=True, db_column='IdCobroCoactivo')

    # Relación con cobro persuasivo del cual nace
    cobro_persuasivo = models.ForeignKey(
        CobroPersuasivo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_CobroPersuasivo',
        related_name='cobros_coactivos'
    )
    
    # Campos básicos del cobro coactivo
    cod_accion_registrada = models.CharField(max_length=50, null=True, blank=True, db_column='codAccionRegistrada')
    descripcion = models.TextField(null=True, blank=True, db_column='descripcion')
    consecutivo = models.CharField(max_length=50, null=True, blank=True, db_column='consecutivo')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVO', db_column='estado')
    
    # Fechas importantes
    fecha_registro = models.DateTimeField(null=True, blank=True, db_column='fechaRegistro')
    fecha_inicio_coactivo = models.DateTimeField(null=True, blank=True, db_column='fechaInicioCoactivo')
    fecha_limite_pago = models.DateTimeField(null=True, blank=True, db_column='fechaLimitePago')
    
    # Acción a registrar (reutiliza el modelo de acciones pero filtrando por tipo COACTIVO)
    id_accion_cobro_persuasivo = models.ForeignKey(
        AccionesCobroPersuasivo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_AccionCobroPersuasivo',
        limit_choices_to={'tipo_cobro': 'COACTIVO'}
    )
    
    # Información del recaudador
    nombre_recaudador = models.CharField(max_length=255, null=True, blank=True, db_column='nombreRecaudador')
    email_recaudador = models.EmailField(max_length=255, null=True, blank=True, db_column='emailRecaudador')
    celular_recaudador = models.CharField(max_length=20, null=True, blank=True, db_column='celularRecaudador')
    
    # Información adicional específica del cobro coactivo
    valor_total_deuda = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, db_column='valorTotalDeuda')
    valor_intereses = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, db_column='valorIntereses')
    valor_costas_procesales = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, db_column='valorCostasProce')
    
    # Documentos
    aplicar_plantilla = models.BooleanField(default=False, db_column='aplicarPlantilla')
    documento_adjunto = models.FileField(upload_to='cobros_coactivos/', null=True, blank=True, db_column='documentoAdjunto')
    doc_coactivo = models.ForeignKey(
        'recaudos.DocumentosGenerados',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_DocGenerado'
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fechaCreacion')
    fecha_actualizacion = models.DateTimeField(auto_now=True, db_column='fechaActualizacion')
    id_persona_crea = models.ForeignKey(
        Personas,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='Id_PersonaCrea'
    )

    def __str__(self):
        return f"Cobro Coactivo {self.id_cobro_coactivo} - Estado: {self.estado}"

    class Meta:
        db_table = 'CobroCoactivo'
        verbose_name = 'Cobro Coactivo'
        verbose_name_plural = 'Cobros Coactivos'


class CoactivoFacturas(models.Model):
    id_coactivo_facturas = models.AutoField(primary_key=True, db_column='IdCoactivo_Facturas')
    
    factura = models.ForeignKey(
        FacturaUnica,
        on_delete=models.CASCADE,
        db_column='Id_FacturaUnica'
    )
    cobro_coactivo = models.ForeignKey(
        CobroCoactivo,
        on_delete=models.CASCADE,
        db_column='Id_CobroCoactivo'
    )
    # Campos adicionales específicos para cobro coactivo
    valor_capital = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, db_column='valorCapital')
    valor_intereses = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, db_column='valorIntereses')
    fecha_inclusion = models.DateTimeField(auto_now_add=True, db_column='fechaInclusion')

    def __str__(self):
        return f"Coactivo {self.cobro_coactivo.id_cobro_coactivo} - Factura {self.factura.nro_factura_unica}"

    class Meta:
        db_table = 'Coactivo_Facturas'
        verbose_name = 'Factura Coactiva'
        verbose_name_plural = 'Facturas Coactivas'
        unique_together = ['factura', 'cobro_coactivo']  # Una factura no puede estar en el mismo cobro coactivo más de una vez


class Siesa(models.Model):
    id = models.AutoField(primary_key=True)
    descripcion = models.CharField(max_length=100)
    auxiliar = models.CharField(max_length=100)
    compania = models.CharField(max_length=100)
    centro = models.CharField(max_length=100)
    unidad = models.CharField(max_length=100, blank=True, null=True)
    sucursal = models.CharField(max_length=100)
    # Nuevo campo para indicar el tipo de documento asociado al registro Siesa
    tipo_documento = models.CharField(max_length=100, default='FUN')
    # Campo para indicar si el registro está activo o desactivado
    activo = models.BooleanField(default=True, null=True, blank=True, db_column='activo')

    class Meta:
        db_table = "siesa"   # nombre de la tabla en la base de datos
        verbose_name = "Siesa"
        verbose_name_plural = "Siesa"

    def __str__(self):
        return f"{self.descripcion} ({self.auxiliar})"


class ComprasNoEfectuadas(models.Model):
    id_no_compras = models.AutoField(primary_key=True, db_column='IdCompras_No_Efectuadas')
    descripcion = models.CharField(max_length=200, db_column='descripcion')
    fecha_registro = models.DateTimeField(auto_now_add=True, db_column='fechaRegistro')
    fecha_actualizacion = models.DateTimeField(auto_now=True, db_column='fechaActualizacion')
    id_recaudador = models.ForeignKey(Personas, on_delete=models.CASCADE, db_column='Id_Recaudador')
    doc_soporte = models.FileField(upload_to='soporte_no_compra/', db_column='docSoporte')

    class Meta:
        db_table = "ComprasNoEfectuadas"
        verbose_name = "Compras no fectuadas"
        verbose_name_plural = "Compra no efectuada"
