from rest_framework import serializers

class InicioPagoInputSerializer(serializers.Serializer):
    """Serializer para iniciar un pago"""
    id_liquidacion = serializers.IntegerField()
    # Opción 1: Usar persona registrada en BD
    id_persona_pago = serializers.IntegerField(required=False, allow_null=True)
    # Opción 2: Enviar datos de persona directamente
    numero_documento = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    tipo_documento = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    primer_nombre = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    razon_social = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    primer_apellido = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    telefono = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    def validate(self, data):
        """Validar que se envíe id_persona_pago O los datos de la persona"""
        id_persona = data.get('id_persona_pago')
        numero_documento = data.get('numero_documento')
        
        # Si no hay id_persona_pago, debe haber al menos número de documento y nombre/razón social
        if not id_persona:
            if not numero_documento:
                raise serializers.ValidationError(
                    "Debe proporcionar 'id_persona_pago' o 'numero_documento'"
                )
            if not data.get('primer_nombre') and not data.get('razon_social'):
                raise serializers.ValidationError(
                    "Debe proporcionar 'primer_nombre' o 'razon_social'"
                )
            if not data.get('tipo_documento'):
                raise serializers.ValidationError(
                    "Debe proporcionar 'tipo_documento' cuando no usa 'id_persona_pago'"
                )
        
        return data

class VerificarInputSerializer(serializers.Serializer):
    """Serializer para verificar un pago"""
    id_pago = serializers.CharField() 