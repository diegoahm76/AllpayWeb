from rest_framework import serializers
from seguridad.models.seguridad_models import Auditorias
from seguridad.serializers.user_serializers import UserSerializer
from seguridad.serializers.permisos_serializers import PermisosSerializer, ModulosSerializers

class AuditoriasSerializers(serializers.ModelSerializer):
    fecha_accion = serializers.DateTimeField()
    nombre_modulo=serializers.ReadOnlyField(source='id_modulo.nombre_modulo',default=None)
    subsistema=serializers.ReadOnlyField(source='id_modulo.subsistema',default=None)
    nombre_de_usuario=serializers.ReadOnlyField(source='id_usuario.nombre_de_usuario',default=None)
    nombre_completo = serializers.SerializerMethodField()
    cod_tipo_documento=serializers.ReadOnlyField(source='id_usuario.persona.tipo_documento.cod_tipo_documento',default=None)
    nombre_tipo_documento=serializers.ReadOnlyField(source='id_usuario.persona.tipo_documento.nombre',default=None)
    numero_documento=serializers.ReadOnlyField(source='id_usuario.persona.numero_documento',default=None)
    nombre_permiso=serializers.ReadOnlyField(source='id_cod_permiso_accion.nombre_permiso',default=None)
    cod_permiso=serializers.ReadOnlyField(source='id_cod_permiso_accion.cod_permiso',default=None)

    def get_nombre_completo(self, obj):
        nombre_completo = None
        if obj.id_usuario:
            if obj.id_usuario.persona:
                if obj.id_usuario.persona.tipo_persona == 'N':
                    nombre_list = [obj.id_usuario.persona.primer_nombre, obj.id_usuario.persona.segundo_nombre,
                                   obj.id_usuario.persona.primer_apellido, obj.id_usuario.persona.segundo_apellido]
                    nombre_completo = ' '.join(item for item in nombre_list if item is not None)
                    nombre_completo = nombre_completo if nombre_completo != "" else None
                else:
                    nombre_completo = obj.id_usuario.persona.razon_social
        return nombre_completo

    class Meta:
        model=Auditorias
        fields= ['id_auditoria', 'id_usuario', 'id_modulo', 'id_cod_permiso_accion', 'fecha_accion',
                 'subsistema', 'dirip', 'descripcion', 'valores_actualizados', 'nombre_modulo',
                 'nombre_de_usuario', 'nombre_completo', 'cod_tipo_documento',
                 'nombre_tipo_documento', 'numero_documento', 'nombre_permiso', 'cod_permiso']

class AuditoriasPostSerializers(serializers.ModelSerializer):
    class Meta:
        model=Auditorias
        fields= '__all__'
        extra_kwargs = {
            'id_modulo':  {'required': True, 'allow_null':False},
            'id_cod_permiso_accion': {'required': True, 'allow_null':False},
            'subsistema': {'required': True, 'allow_blank':False, 'allow_null':False},
            'descripcion': {'required': True, 'allow_blank':False, 'allow_null':False},
            'valores_actualizados': {'required': True, 'allow_null':True},
            'valores_anteriores': {'required': True, 'allow_null':True}
        }