from datetime import datetime
from decimal import Decimal
from django.utils.timezone import now
from rest_framework import serializers
from recaudos.models.recaudos_models import FacturaUnica, FechasCierre, PorcentajesCobro, ComprasNoEfectuadas
from seguridad.models.transversal_models import Personas
from seguridad.utils import Util


class FacturaUnicaConsultaSerializer(serializers.ModelSerializer):
    """
    Serializer para consulta de Facturas Únicas con columnas específicas.
    """

    fecha_registro = serializers.DateTimeField(source="fecha_creacion", format="%Y-%m-%d")
    no_factura_unica = serializers.IntegerField(source="nro_factura_unica")
    fecha_compra = serializers.DateTimeField(format="%Y-%m-%d")
    nit_cc_recaudador = serializers.ReadOnlyField(source="id_persona_recaudador.numero_documento")
    nombre_recaudador = serializers.SerializerMethodField()
    departamento_procedencia_cacao = serializers.ReadOnlyField(source="id_departamento_cacao.nombre")
    municipio_procedencia_cacao = serializers.ReadOnlyField(source="id_municipio_cacao.nombre")
    valor_cuota_fomento = serializers.DecimalField(source="cuota_fomento", max_digits=30, decimal_places=2)
    valor_intereses = serializers.SerializerMethodField()
    mes_recaudo = serializers.SerializerMethodField()

    class Meta:
        model = FacturaUnica
        fields = [
            "fecha_registro",
            "no_factura_unica",
            "fecha_compra",
            "nit_cc_recaudador",
            "nombre_recaudador",
            "departamento_procedencia_cacao",
            "municipio_procedencia_cacao",
            "total_kilos",
            "valor_cuota_fomento",
            "valor_intereses",
            "mes_recaudo",
        ]

    def get_nombre_recaudador(self, obj):
        rec = obj.id_persona_recaudador
        if not rec:
            return None
        # Natural vs Jurídica
        if getattr(rec, "tipo_persona", None) == "N":
            nombres = [rec.primer_nombre or "", rec.segundo_nombre or "", rec.primer_apellido or "", rec.segundo_apellido or ""]
            return " ".join([n for n in nombres if n]).strip()
        return rec.razon_social or rec.nombre_comercial

    def _get_fecha_limite_pago(self, fecha_compra):
        """Obtiene la fecha límite de pago a partir de FechasCierre (PI)."""
        # Usar objetos pre-cargados en contexto cuando existan para bulk
        fecha_cierre = self.context.get("fecha_cierre")
        if not fecha_cierre:
            fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha="PI").first()

        dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
        # mes siguiente al de compra
        siguiente_mes = fecha_compra.month + 1 if fecha_compra.month < 12 else 1
        anio = fecha_compra.year if siguiente_mes > 1 else fecha_compra.year + 1
        try:
            return datetime(anio, siguiente_mes, dia_limite)
        except ValueError:
            # Si el día no existe (p.ej., 30/31 en meses con menos días), usar el último día del mes
            # Ajuste simple: retroceder hasta encontrar una fecha válida
            for d in range(dia_limite, 27, -1):
                try:
                    return datetime(anio, siguiente_mes, d)
                except ValueError:
                    continue
            # fallback
            return datetime(anio, siguiente_mes, 28)

    def get_valor_intereses(self, obj):
        """Calcula intereses con base en cuota_fomento, tasa DIAN (PI) y días de mora."""
        tasa_dian = self.context.get("tasa_dian")
        if not tasa_dian:
            tasa_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_valor = Decimal(str(tasa_dian.valor)) if tasa_dian and tasa_dian.valor is not None else Decimal("0")

        if not obj.cuota_fomento or obj.cuota_fomento <= 0:
            return Decimal("0.00")

        fecha_limite = self._get_fecha_limite_pago(obj.fecha_compra)
        hoy = now()
        dias_mora = (hoy.date() - fecha_limite.date()).days
        if dias_mora <= 0:
            return Decimal("0.00")

        intereses = (Decimal(obj.cuota_fomento) * tasa_valor * Decimal(dias_mora)) / Decimal("365")
        return intereses.quantize(Decimal("0.01"))

    def get_mes_recaudo(self, obj):
        # Preferir mes de pago si la liquidación tiene fecha_pago; de lo contrario, mes de compra
        if getattr(obj, "id_liq_factura_unica", None) and getattr(obj.id_liq_factura_unica, "fecha_pago", None):
            fecha = obj.id_liq_factura_unica.fecha_pago
        else:
            fecha = obj.fecha_compra
        meses = [
            "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
            "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
        ]
        # Regla 11 al 10: si el día es <= 10, el mes corresponde al mes anterior
        mes_idx = fecha.month if fecha.day >= 11 else (12 if fecha.month == 1 else fecha.month - 1)
        return meses[mes_idx - 1]


class ComprasNoEfectuadasSerializer(serializers.ModelSerializer):
    doc_soporte_url = serializers.SerializerMethodField()

    class Meta:
        model = ComprasNoEfectuadas
        fields = [
            "id_no_compras",
            "fecha_registro",
            "descripcion",
            "fecha_actualizacion",
            "id_recaudador",
            "doc_soporte",
            "doc_soporte_url"
        ]
        extra_kwargs = {
            "descripcion": {'required': True, 'allow_null':False},
            "doc_soporte": {'required': True, 'allow_null':False},
            "id_recaudador": {'required': True, 'allow_null':False},
        }

    def validate_id_recaudador(self, value):
        if not Personas.objects.filter(id_persona=value.id_persona).exists():
            raise serializers.ValidationError("El recaudador no existe.")
        return value
    
    def get_doc_soporte_url(self, obj):
        if obj.doc_soporte:
            return Util.obtener_archivos(obj.doc_soporte.name) if len(obj.doc_soporte.name) > 0 else None

