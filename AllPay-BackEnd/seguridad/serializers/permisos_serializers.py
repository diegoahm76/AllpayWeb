from seguridad.serializers.roles_serializers import RolesSerializer
from rest_framework.validators import UniqueTogetherValidator
from rest_framework import serializers
from seguridad.choices.subsistemas_choices import subsistemas_CHOICES
from seguridad.models.seguridad_models import (
    Permisos, 
    PermisosModulo, 
    PermisosModuloRol,
    Modulos,
    EstructuraMenus
)

class ModulosSerializers(serializers.ModelSerializer):
    class Meta:
        model=Modulos
        fields='__all__'

class PermisosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permisos
        fields = '__all__'
        
class PermisosModuloSerializer(serializers.ModelSerializer):
    id_modulo = ModulosSerializers(read_only=True)
    cod_permiso = PermisosSerializer(read_only=True)    
    class Meta:
        model = PermisosModulo
        fields = '__all__'

class PermisosModuloPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermisosModulo
        fields = '__all__'

class PermisosModuloRolSerializer(serializers.ModelSerializer):
 
    id_rol = RolesSerializer(read_only=True)
    id_permiso_modulo = PermisosModuloSerializer(read_only=True)
    cod_permiso = serializers.CharField(source="id_permiso_modulo.cod_permiso.cod_permiso", read_only=True)
    nombre_permiso = serializers.CharField(source="id_permiso_modulo.cod_permiso.nombre_permiso", read_only=True)
    id_modulo = serializers.IntegerField(source="id_permiso_modulo.id_modulo.id_modulo", read_only=True)
    nombre_modulo = serializers.CharField(source="id_permiso_modulo.id_modulo.nombre_modulo", read_only=True)

    class Meta:
        model = PermisosModuloRol
        fields = '__all__'

class GetEstructuraMenusSerializer(serializers.ModelSerializer):
    desc_subsistema = serializers.SerializerMethodField()
    
    def get_desc_subsistema(self, obj):
        desc_subsistema = None
        
        diccionario_subsistemas = dict((x,y) for x,y in subsistemas_CHOICES) # transforma un choices en un diccionario
        desc_subsistema = diccionario_subsistemas[obj.subsistema] if obj.subsistema else None
        
        return desc_subsistema
    
    class Meta:
        model = EstructuraMenus
        fields = '__all__'

class GetPermisosRolSerializer(serializers.ModelSerializer):
    id_permiso_modulo = serializers.ReadOnlyField(source='id_permiso_modulo.id_permisos_modulo', default=None)
    cod_permiso = serializers.ReadOnlyField(source='id_permiso_modulo.cod_permiso.cod_permiso', default=None)
    nombre_permiso = serializers.ReadOnlyField(source='id_permiso_modulo.cod_permiso.nombre_permiso', default=None)
    
    class Meta:
        model = PermisosModuloRol
        fields = ['id_permiso_modulo', 'cod_permiso', 'nombre_permiso']

class GetPermisosModuloSerializer(serializers.ModelSerializer):
    id_permiso_modulo = serializers.ReadOnlyField(source='id_permisos_modulo', default=None)
    cod_permiso = serializers.ReadOnlyField(source='cod_permiso.cod_permiso', default=None)
    nombre_permiso = serializers.ReadOnlyField(source='cod_permiso.nombre_permiso', default=None)
    
    class Meta:
        model = PermisosModulo
        fields = ['id_permiso_modulo', 'cod_permiso', 'nombre_permiso']

class ModulosRolSerializer(serializers.ModelSerializer):
    desc_subsistema = serializers.SerializerMethodField()
    permisos = serializers.SerializerMethodField()
    
    def get_permisos(self, obj):
        id_rol = self.context.get("id_rol")
        
        if id_rol:
            permisos_modulo_rol = PermisosModuloRol.objects.filter(id_permiso_modulo__id_modulo=obj.id_modulo, id_rol=id_rol)
            permisos = GetPermisosRolSerializer(permisos_modulo_rol, many=True)
        else:
            permisos_modulo_rol = PermisosModulo.objects.filter(id_modulo=obj.id_modulo)
            permisos = GetPermisosModuloSerializer(permisos_modulo_rol, many=True)
        
        permisos_actions = {}
        for permiso in permisos.data:
            nombre_permiso = str(permiso['nombre_permiso'])
            
            value = {
                'value': True,
                'id': permiso['id_permiso_modulo']
            }
            
            permisos_actions[nombre_permiso.lower()] = value
        return permisos_actions
    
    def get_desc_subsistema(self, obj):
        desc_subsistema = None
        
        diccionario_subsistemas = dict((x,y) for x,y in subsistemas_CHOICES) # transforma un choices en un diccionario
        desc_subsistema = diccionario_subsistemas[obj.subsistema] if obj.subsistema else None
        
        return desc_subsistema
    
    class Meta:
        model = Modulos
        fields = ['id_modulo', 'nombre_modulo', 'descripcion', 'subsistema', 'desc_subsistema', 'ruta_formulario', 'nombre_icono', 'permisos']

class ModulosRolEntornoSerializer(serializers.ModelSerializer):
    desc_subsistema = serializers.SerializerMethodField()
    permisos = serializers.SerializerMethodField()
    
    def get_permisos(self, obj):
        roles_list = self.context.get("roles_list")
        permisos_modulo_rol = PermisosModuloRol.objects.filter(id_permiso_modulo__id_modulo=obj.id_modulo, id_rol__in=roles_list)
        permisos = GetPermisosRolSerializer(permisos_modulo_rol, many=True)
        permisos_actions = {}
        for permiso in permisos.data:
            nombre_permiso = str(permiso['nombre_permiso'])
            permisos_actions[nombre_permiso.lower()] = True
        return permisos_actions
    
    def get_desc_subsistema(self, obj):
        desc_subsistema = None
        
        diccionario_subsistemas = dict((x,y) for x,y in subsistemas_CHOICES) # transforma un choices en un diccionario
        desc_subsistema = diccionario_subsistemas[obj.subsistema] if obj.subsistema else None
        
        return desc_subsistema
    
    class Meta:
        model = Modulos
        fields = ['id_modulo', 'nombre_modulo', 'descripcion', 'subsistema', 'desc_subsistema', 'ruta_formulario', 'nombre_icono', 'id_menu', 'permisos']

class PermisosModuloRolSerializerHyper(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = PermisosModuloRol
        fields = '__all__'
        extra_kwargs = {
            'id_rol' : {'view_name': 'roles_app:rol-id', 'lookup_field':'pk'},
            'id_modulo' : {'view_name': 'auditorias:consultar-módulo', 'lookup_field':'pk'},
            'cod_permiso' : {'view_name': 'permisos_app:permiso-ver', 'lookup_field':'pk'}
        }
        
class PermisosModuloRolPostSerializer(serializers.ModelSerializer):
     class Meta:
        model = PermisosModuloRol
        fields = '__all__'
        validators = [
           UniqueTogetherValidator(
               queryset=PermisosModuloRol.objects.all(),
               fields = ['id_rol', 'id_permiso_modulo'],
               message='No puede asignar el mismo permiso para el rol elegido'
           )
        ]