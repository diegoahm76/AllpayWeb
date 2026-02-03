from rest_framework import serializers
from recaudos.models.recaudos_models import Siesa


class SiesaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Siesa sin validaciones extra de longitud.
    Solo valida tipos de datos por defecto.
    """

    # Sobrescribir campos para no imponer max_length del modelo a nivel serializer
    descripcion = serializers.CharField(required=False, allow_blank=True)
    auxiliar = serializers.CharField(required=False, allow_blank=True)
    compania = serializers.CharField(required=False, allow_blank=True)
    centro = serializers.CharField(required=False, allow_blank=True)
    unidad = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sucursal = serializers.CharField(required=False, allow_blank=True)
    tipo_documento = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Siesa
        fields = '__all__'


class SiesaCreateSerializer(SiesaSerializer):
    """
    Serializer específico para crear registros de Siesa sin validaciones adicionales.
    """
    pass


class SiesaUpdateSerializer(SiesaSerializer):
    """
    Serializer específico para actualizar registros de Siesa sin validaciones adicionales.
    """
    pass


class SiesaListSerializer(serializers.ModelSerializer):
    """
    Serializer optimizado para listar registros de Siesa
    """

    class Meta:
        model = Siesa
        fields = ['id', 'descripcion', 'auxiliar', 'compania', 'centro', 'unidad', 'sucursal', 'tipo_documento', 'activo']
