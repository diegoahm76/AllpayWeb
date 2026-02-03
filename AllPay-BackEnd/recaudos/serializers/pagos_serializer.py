from rest_framework import serializers
from recaudos.models import Pagos
from django.db.models import Sum

class PagosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagos
        fields = '__all__'


class ObtenerPagosSerializer(serializers.ModelSerializer):
    numero_documento_pago = serializers.CharField(source='id_liquidacion_pago.nro_doc_pago', read_only=True)
    cod_estado_pago = serializers.CharField(source='get_cod_estado_pago_display', read_only=True)
    cod_medio_pago = serializers.CharField(source='get_cod_medio_pago_display', read_only=True)
    valor_cuota_fomento = serializers.SerializerMethodField()
    valor_intereses = serializers.SerializerMethodField()
    valor_pagado = serializers.SerializerMethodField()
    
    class Meta:
        model = Pagos
        fields = '__all__'
    
    
    def get_valor_cuota_fomento(self, obj):
        """
        Obtiene la suma total de cuota_fomento de todas las facturas relacionadas con la liquidación del pago
        """
        if obj.id_liquidacion_pago:
            from recaudos.models import FacturaUnica
            cuota_fomento_total = FacturaUnica.objects.filter(
                id_liq_factura_unica=obj.id_liquidacion_pago
            ).aggregate(total=Sum('cuota_fomento'))['total']
            return cuota_fomento_total or 0
        return 0
    
    def get_valor_intereses(self, obj):
        """
        Obtiene el valor de intereses de la liquidación asociada al pago
        """
        if obj.id_liquidacion_pago and obj.id_liquidacion_pago.valor_intereses:
            return obj.id_liquidacion_pago.valor_intereses
        return 0
    
    def get_valor_pagado(self, obj):
        """
        Retorna el valor pagado, o si es null, calcula el valor basado en la liquidación
        """
        if obj.valor_pagado is not None:
            return obj.valor_pagado
        
        # Si valor_pagado es null, intentar obtenerlo de la liquidación
        if obj.id_liquidacion_pago and obj.id_liquidacion_pago.valor_pagar:
            return obj.id_liquidacion_pago.valor_pagar
        
        return None