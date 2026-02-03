from django.db import models
from django.conf import settings
from seguridad.models.transversal_models import Departamento


class TRM(models.Model):
    idregistro = models.AutoField(primary_key=True)
    fecha_registro = models.DateField()
    precio_trm = models.IntegerField()
    anio = models.IntegerField()
    mes = models.IntegerField()
    usuario_que_registra = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        verbose_name="Usuario que registra"
    )

    class Meta:
        db_table = 'trm'
        verbose_name = 'TRM'
        verbose_name_plural = 'TRMs'
        ordering = ['-fecha_registro']

    def __str__(self):
        return f"TRM {self.precio_trm} - {self.fecha_registro}"

    def save(self, *args, **kwargs):
        # Auto-calcular año y mes si no están definidos
        if not self.anio and self.fecha_registro:
            self.anio = self.fecha_registro.year
        if not self.mes and self.fecha_registro:
            self.mes = self.fecha_registro.month
        super().save(*args, **kwargs)


class BolsaNY(models.Model):
    idregistro = models.AutoField(primary_key=True)
    idusuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='bolsa_ny_registros',
        verbose_name="Usuario que registra"
    )
    fecha_registro = models.DateField()
    anio = models.PositiveIntegerField()
    mes = models.PositiveSmallIntegerField()
    precio_cierre = models.IntegerField()

    class Meta:
        db_table = 'bolsa_ny'
        verbose_name = 'Bolsa NY'
        verbose_name_plural = 'Bolsas NY'
        ordering = ['-fecha_registro']

    def __str__(self):
        return f"Bolsa NY {self.precio_cierre} - {self.fecha_registro}"

    def save(self, *args, **kwargs):
        # Auto-calcular año y mes si no están definidos
        if self.fecha_registro:
            self.anio = self.fecha_registro.year
            self.mes = self.fecha_registro.month
        super().save(*args, **kwargs)


class Department(models.Model):
    # DPTO_CCDGO: ahora como entero (ej: 18, 5)
    code = models.IntegerField(
        primary_key=True,
        verbose_name="DPTO_CCDGO"
    )
    name = models.CharField(
        max_length=100,
        verbose_name="DPTO_CNMBR"
    )

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        ordering = ["name"]
        db_table = 'reportes_department'

    def __str__(self):
        return f"{self.code} - {self.name}"


class Municipality(models.Model):
    # Relación al departamento por su código entero
    department = models.ForeignKey(
        Department,
        to_field="code",
        db_column="DPTO_CCDGO",
        on_delete=models.PROTECT,
        related_name="municipalities",
        verbose_name="DPTO_CCDGO"
    )
    code = models.IntegerField(          # MPIO_CCDGO: ahora como entero (ej: 1, 2)
        verbose_name="MPIO_CCDGO"
    )
    name = models.CharField(          # MPIO_CNMBR: nombre del municipio
        max_length=120,
        verbose_name="MPIO_CNMBR"
    )
    # Código municipal único como entero: DPTO_CCDGO * 1000 + MPIO_CCDGO
    unique_code = models.IntegerField(
        unique=True,
        verbose_name="Código Municipal Único",
        help_text="DPTO_CCDGO * 1000 + MPIO_CCDGO"
    )

    class Meta:
        verbose_name = "Municipio"
        verbose_name_plural = "Municipios"
        db_table = 'reportes_municipality'
        # Un municipio se identifica por (DPTO_CCDGO, MPIO_CCDGO)
        constraints = [
            models.UniqueConstraint(
                fields=["department", "code"],
                name="uniq_municipality_per_department"
            )
        ]
        indexes = [
            models.Index(fields=["department", "code"]),
            models.Index(fields=["name"]),
            models.Index(fields=["unique_code"]),
        ]
        ordering = ["department__name", "name"]

    def __str__(self):
        return f"{self.unique_code} - {self.name}"

    def save(self, *args, **kwargs):
        # Calcular automáticamente el código único
        if not self.unique_code and self.department and self.code:
            self.unique_code = (self.department.code * 1000) + self.code
        super().save(*args, **kwargs)

    @property
    def concatenated_code(self) -> str:
        """
        Código único nacional como string (DPTO_CCDGO + MPIO_CCDGO), p.ej. 18 + 1 -> "18001"
        Mantiene compatibilidad con el formato anterior
        """
        return str(self.unique_code)


class ProduccionCacaoHistorico(models.Model):
    """
    Modelo para almacenar el histórico de producción de cacao por año y mes
    """
    ano = models.IntegerField(verbose_name="Año")
    enero = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Enero")
    febrero = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Febrero")
    marzo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Marzo")
    abril = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Abril")
    mayo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Mayo")
    junio = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Junio")
    julio = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Julio")
    agosto = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Agosto")
    septiembre = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Septiembre")
    octubre = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Octubre")
    noviembre = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Noviembre")
    diciembre = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Diciembre")
    pano = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name="Total Año")

    class Meta:
        db_table = 'ProduccionCacaoHistorico'
        verbose_name = 'Producción de Cacao Histórico'
        verbose_name_plural = 'Producción de Cacao Histórico'
        ordering = ['-ano']
        constraints = [
            models.UniqueConstraint(
                fields=['ano'],
                name='unique_ano_produccion_cacao'
            )
        ]

    def __str__(self):
        return f"Producción Cacao {self.ano}"

    def save(self, *args, **kwargs):
        """
        Auto-calcular el total anual (pano) sumando todos los meses en decimal con 2 decimales
        """
        from decimal import Decimal
        
        meses = [
            self.enero, self.febrero, self.marzo, self.abril,
            self.mayo, self.junio, self.julio, self.agosto,
            self.septiembre, self.octubre, self.noviembre, self.diciembre
        ]
        
        total_anual = sum((mes for mes in meses if mes is not None), Decimal("0.00"))
        self.pano = total_anual if total_anual > Decimal("0.00") else None
        
        super().save(*args, **kwargs)


class ProduccionDepartamentoAnual(models.Model):
    """
    Producción anual por departamento (toneladas o la unidad que manejes en 'Produccion').
    FK enlaza al código DANE de 2 dígitos en DepartamentosPais.
    """
    departamento = models.ForeignKey(
        Departamento,
        to_field='cod_departamento',
        db_column='CodDepartamento',
        on_delete=models.PROTECT,
        related_name='producciones'
    )
    ano = models.IntegerField(verbose_name="Año")
    produccion = models.IntegerField(
        verbose_name="Producción (toneladas)"
    )

    class Meta:
        db_table = 'ProduccionDepartamentoAnual'
        verbose_name = 'Producción Departamento Anual'
        verbose_name_plural = 'Producción Departamento Anual'
        ordering = ['-ano', 'departamento__nombre']
        constraints = [
            models.UniqueConstraint(
                fields=['departamento', 'ano'],
                name='uq_prod_dep_ano'
            )
        ]
        indexes = [
            models.Index(fields=['ano']),
            models.Index(fields=['departamento', 'ano']),
        ]

    def __str__(self):
        return f'{self.departamento_id} - {self.ano}: {self.produccion}'


class RendimientoCensoDepartamento(models.Model):
    """
    Rendimiento censo por departamento para cálculos de producción
    """
    departamento = models.OneToOneField(
        Departamento,
        to_field='cod_departamento',
        db_column='CodDepartamento',
        on_delete=models.PROTECT,
        related_name='rendimiento_censo',
        primary_key=True,
        verbose_name="Departamento"
    )
    rendimiento_censo = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Rendimiento Censo (kg/ha)"
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Fecha de Actualización"
    )
    usuario_actualizacion = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Usuario que actualizó"
    )

    class Meta:
        db_table = 'RendimientoCensoDepartamento'
        verbose_name = 'Rendimiento Censo por Departamento'
        verbose_name_plural = 'Rendimientos Censo por Departamento'
        ordering = ['departamento__nombre']

    def __str__(self):
        return f'{self.departamento.nombre}: {self.rendimiento_censo} kg/ha'

