from recaudos.models.acuerdos_pago_models import CuotasAcuerdoPago, PlanesPago
from recaudos.models.recaudos_models import LiquidacionesFacturaUnica
from rest_framework import serializers


class LiquidacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiquidacionesFacturaUnica
        fields = [
            "id_liq_factura_unica",
            "cod_estado",
            "nro_doc_pago",
            "fecha_pago",
            "valor_pagar",
            "valor_intereses",
            "fecha_liquidacion",
            "id_persona_liquida",
            "doc_pago",
            "codigo_barras",
        ]


class PlanPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanesPago
        fields = [
            "id_plan_pago",
            "id_solicitud_acuerdo_pago",
            "nro_plan_pago",
            "nro_cuotas",
            "valor_total_pagar",
            "estado",
            "fecha_notificacion",
            "doc_acuerdo_pago",
        ]


class CuotaAcuerdoPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuotasAcuerdoPago
        fields = [
            "id_cuota_acuerdo_pago",
            "id_plan_pago",
            "nro_cuota",
            "fecha_vencimiento",
            "valor_cuota",
            "pagada",
            "fecha_pago",
            "id_liquidacion",
        ]