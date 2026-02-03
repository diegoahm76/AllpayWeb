
from rest_framework import serializers
from seguridad.models.alertas_models import AlertasBandejaAlertaPersona, AlertasGeneradas, AlertasProgramadas, BandejaAlertaPersona, ConfiguracionClaseAlerta, FechaClaseAlerta, PersonasAAlertar
from rest_framework.validators import UniqueValidator, UniqueTogetherValidator

class BandejaAlertaPersonaGetSerializer(serializers.ModelSerializer):
     
     class Meta:
          model=BandejaAlertaPersona
          fields= '__all__'


class AlertasGeneradasSerializer(serializers.ModelSerializer):
    class Meta:
        model=AlertasGeneradas
        fields= '__all__'



class AlertasBandejaAlertaPersonaSerializer(serializers.ModelSerializer):
    id_alerta_generada = AlertasGeneradasSerializer(many=False, read_only=True)
    modulo_destino = serializers.ReadOnlyField(source='id_alerta_generada.id_modulo_destino.ruta_formulario', default=None)
    fecha_alerta = serializers.ReadOnlyField(source='id_alerta_generada.fecha_generada', default=None)
    class Meta:
        model=AlertasBandejaAlertaPersona
        fields= '__all__'


class ConfiguracionClaseAlertaGetSerializer(serializers.ModelSerializer):
    nombre_subsistema=serializers.ReadOnlyField(source='id_modulo_generador.subsistema', default=None)
    cod_categoria_clase_alerta_display = serializers.CharField(source='get_cod_categoria_clase_alerta_display', read_only=True)
    nivel_prioridad_display = serializers.CharField(source='get_nivel_prioridad_display', read_only=True)
    class Meta:
        model=ConfiguracionClaseAlerta
        fields='__all__'


class AlertasProgramadasUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertasProgramadas
        fields = '__all__'


class AlertasGeneradasPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertasGeneradas
        fields = '__all__'

class AlertasProgramadasPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertasProgramadas
        fields = '__all__'


class AlertasBandejaAlertaPersonaPostSerializer(serializers.ModelSerializer):
     class Meta:
          model=AlertasBandejaAlertaPersona
          fields= '__all__'


class PersonasAAlertarPostSerializer(serializers.ModelSerializer):
        class Meta:
            model=PersonasAAlertar
            fields='__all__'


class PersonasAAlertarGetSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    numero_documento=serializers.ReadOnlyField(source='id_persona.numero_documento', default=None)
    cargo=serializers.ReadOnlyField(source='id_persona.id_cargo.nombre', default=None)
    class Meta:
        model=PersonasAAlertar
        fields=('__all__')

    def get_nombre_completo(self, obj):
        nombre_persona = ""
        if obj.id_persona.razon_social:
            nombre_persona = str(obj.id_persona.razon_social).upper()
        elif obj.id_persona.primer_nombre:
            nombre_persona = ''.join(filter(None, [
                f"{str(obj.id_persona.primer_nombre).upper()}",
                f" {str(obj.id_persona.segundo_nombre).upper()}" if obj.id_persona.segundo_nombre else '',
                f" {str(obj.id_persona.primer_apellido).upper()}" if obj.id_persona.primer_apellido else '',
                f" {str(obj.id_persona.segundo_apellido).upper()}" if obj.id_persona.segundo_apellido else ''
            ]))
        return nombre_persona


class FechaClaseAlertaPostSerializer(serializers.ModelSerializer):
    class Meta:
        model=FechaClaseAlerta
        fields='__all__'

        validators = [
            UniqueTogetherValidator(
            queryset=FechaClaseAlerta.objects.all(),
            fields=['dia_cumplimiento', 'mes_cumplimiento','age_cumplimiento'],
            message='Ya existe esta fecha en la alerta.'
        )
    ]
        

class FechaClaseAlertaGetSerializer(serializers.ModelSerializer):
    class Meta:
        model=FechaClaseAlerta
        fields='__all__'