from unittest.util import _MAX_LENGTH
from wsgiref.validate import validator
from rest_framework import serializers
from rest_framework.validators import  UniqueTogetherValidator
from seguridad.utils import Util
from seguridad.models.seguridad_models import (
    HistoricoActivacion,
    User
)
from seguridad.models.transversal_models import (
    Departamento,
    DocumentosPersona,
    SegundoFAPersona,
    SegundoFactorAutenticacion,
    TipoDocumento,
    TipoComprador,
    Cargos,
    HistoricoDireccion,
    HistoricoRepresentLegales,
    Personas,
    Departamento,
    Municipio,
    Paises,
    Sexo,
    Verificacion_2FA,
    IdentificacionTemporal
)

class PaisesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paises
        fields = '__all__'


class DepartamentosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ['cod_departamento', 'nombre']

class MunicipiosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ['cod_municipio', 'nombre']


class MunicipiosCacaoterosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ['cod_municipio', 'nombre', 'es_cacaotero']


# CRUD Serializers para Municipios
class MunicipioSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener información completa de municipios
    """
    nombre_departamento = serializers.CharField(source='cod_departamento.nombre', read_only=True)
    cod_departamento_nombre = serializers.CharField(source='cod_departamento.cod_departamento', read_only=True)
    
    class Meta:
        model = Municipio
        fields = [
            'cod_municipio', 
            'nombre', 
            'cod_departamento', 
            'nombre_departamento',
            'cod_departamento_nombre',
            'es_cacaotero'
        ]
        extra_kwargs = {
            'cod_municipio': {'required': True},
            'nombre': {'required': True},
            'cod_departamento': {'required': True},
            'es_cacaotero': {'required': False, 'default': False}
        }


class MunicipioCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear municipios
    """
    class Meta:
        model = Municipio
        fields = ['cod_municipio', 'nombre', 'cod_departamento', 'es_cacaotero']
        extra_kwargs = {
            'cod_municipio': {'required': True},
            'nombre': {'required': True},
            'cod_departamento': {'required': True},
            'es_cacaotero': {'required': False, 'default': False}
        }
    
    def validate_cod_municipio(self, value):
        """
        Validar que el código del municipio sea único
        """
        if Municipio.objects.filter(cod_municipio=value).exists():
            raise serializers.ValidationError('Ya existe un municipio con este código.')
        return value
    
    def validate(self, data):
        """
        Validar que el nombre del municipio sea único dentro del departamento
        """
        nombre = data.get('nombre')
        cod_departamento = data.get('cod_departamento')
        
        if Municipio.objects.filter(nombre=nombre, cod_departamento=cod_departamento).exists():
            raise serializers.ValidationError('Ya existe un municipio con este nombre en el departamento seleccionado.')
        
        return data


class MunicipioUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar municipios
    """
    class Meta:
        model = Municipio
        fields = ['nombre', 'cod_departamento', 'es_cacaotero']
        extra_kwargs = {
            'nombre': {'required': True},
            'cod_departamento': {'required': True},
            'es_cacaotero': {'required': False}
        }
    
    def validate(self, data):
        """
        Validar que el nombre del municipio sea único dentro del departamento
        """
        nombre = data.get('nombre')
        cod_departamento = data.get('cod_departamento')
        
        # Excluir el municipio actual de la validación
        municipio_id = self.instance.cod_municipio if self.instance else None
        
        if Municipio.objects.filter(nombre=nombre, cod_departamento=cod_departamento).exclude(cod_municipio=municipio_id).exists():
            raise serializers.ValidationError('Ya existe un municipio con este nombre en el departamento seleccionado.')
        
        return data

class SexoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sexo
        fields = '__all__'

class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = ['cod_tipo_documento', 'nombre']
        extra_kwargs = {
            'cod_tipo_documento': {'required': True},
            'nombre': {'required': True}
        }

class TipoDocumentoPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = ['cod_tipo_documento', 'nombre']
        extra_kwargs = {
            'cod_tipo_documento': {'required': True},
            'nombre': {'required': True}
        }

class TipoDocumentoPutSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = ['nombre', 'activo']
        extra_kwargs = {
            'nombre': {'required': True}
        }

class RepresentanteLegalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personas
        fields = '__all__'


class PersonasBasicSerializer(serializers.ModelSerializer):

    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'tipo_persona',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'nombre_comercial',
            'email',
            'email_empresarial',
            'telefono_fijo_residencial',
            'telefono_celular',
            'telefono_empresa_2'
            ]


class PersonasSerializer(serializers.ModelSerializer):
    representante_legal_data = serializers.SerializerMethodField()
    tiene_usuario = serializers.SerializerMethodField()
    primer_nombre = serializers.SerializerMethodField()
    segundo_nombre = serializers.SerializerMethodField()
    primer_apellido = serializers.SerializerMethodField()
    segundo_apellido = serializers.SerializerMethodField()
    cod_departamento_expedicion = serializers.ReadOnlyField(source='cod_municipio_expedicion_id.cod_departamento.cod_departamento', default=None)
    cod_departamento_residencia = serializers.SerializerMethodField()
    cod_departamento_notificacion = serializers.SerializerMethodField()
    cod_departamento_laboral = serializers.SerializerMethodField()
    archivo_rut = serializers.SerializerMethodField()
    camaraComercio = serializers.SerializerMethodField()
    documentoRepresentante = serializers.SerializerMethodField()

    # 🔹 Agregamos métodos para obtener los nombres

    nombre_pais = serializers.SerializerMethodField()
    nombre_departamento_residencia = serializers.SerializerMethodField()
    nombre_municipio_residencia = serializers.SerializerMethodField()
    
    nombre_departamento_notificacion = serializers.SerializerMethodField()
    nombre_municipio_notificacion = serializers.SerializerMethodField()
    
    nombre_departamento_laboral = serializers.SerializerMethodField()
    nombre_municipio_laboral = serializers.SerializerMethodField()

    nombre_municipio_expedicion = serializers.SerializerMethodField()

    nombre_naturaleza_empresa = serializers.SerializerMethodField()

    def get_representante_legal_data(self, obj):
        if obj.representante_legal:
            return PersonasSerializer(obj.representante_legal, context=self.context).data
        return None
    
    # 🔹 Métodos para devolver nombres en lugar de códigos
    def get_nombre_pais(self, obj):
        return obj.pais_nacimiento.nombre if obj.pais_nacimiento else (obj.cod_pais_nacionalidad_empresa.nombre if obj.cod_pais_nacionalidad_empresa else None)

    def get_nombre_departamento_residencia(self, obj):
        return obj.municipio_residencia.cod_departamento.nombre if obj.municipio_residencia and obj.municipio_residencia.cod_departamento else None

    def get_nombre_municipio_residencia(self, obj):
        return obj.municipio_residencia.nombre if obj.municipio_residencia else None

    def get_nombre_departamento_notificacion(self, obj):
        return obj.cod_municipio_notificacion_nal.cod_departamento.nombre if obj.cod_municipio_notificacion_nal and obj.cod_municipio_notificacion_nal.cod_departamento else None

    def get_nombre_municipio_notificacion(self, obj):
        return obj.cod_municipio_notificacion_nal.nombre if obj.cod_municipio_notificacion_nal else None

    def get_nombre_departamento_laboral(self, obj):
        return obj.cod_municipio_laboral_nal.cod_departamento.nombre if obj.cod_municipio_laboral_nal and obj.cod_municipio_laboral_nal.cod_departamento else None

    def get_nombre_municipio_laboral(self, obj):
        return obj.cod_municipio_laboral_nal.nombre if obj.cod_municipio_laboral_nal else None

    def get_cod_departamento_residencia(self, obj):
        cod_departamento_residencia = None
        departamento = Departamento.objects.filter(cod_departamento=obj.municipio_residencia.cod_municipio[:2]).first() if obj.municipio_residencia else None
        if departamento:
            cod_departamento_residencia = departamento.cod_departamento
        return cod_departamento_residencia

    def get_cod_departamento_notificacion(self, obj):
        cod_departamento_notificacion = None
        departamento = Departamento.objects.filter(cod_departamento=obj.cod_municipio_notificacion_nal.cod_municipio[:2]).first() if obj.cod_municipio_notificacion_nal else None
        if departamento:
            cod_departamento_notificacion = departamento.cod_departamento
        return cod_departamento_notificacion

    def get_cod_departamento_laboral(self, obj):
        cod_departamento_laboral = None
        departamento = Departamento.objects.filter(cod_departamento=obj.cod_municipio_laboral_nal.cod_municipio[:2]).first() if obj.cod_municipio_laboral_nal else None
        if departamento:
            cod_departamento_laboral = departamento.cod_departamento
        return cod_departamento_laboral

    def get_nombre_municipio_expedicion(self, obj):
        return obj.cod_municipio_expedicion_id.nombre if obj.cod_municipio_expedicion_id else None

    def get_nombre_naturaleza_empresa(self, obj):
        return obj.get_cod_naturaleza_empresa_display() if obj.cod_naturaleza_empresa else None

    def get_tiene_usuario(self, obj):
        return User.objects.filter(persona=obj.id_persona).exists()

    def get_primer_nombre(self, obj):
        return obj.primer_nombre.upper() if obj.primer_nombre else None

    def get_segundo_nombre(self, obj):
        return obj.segundo_nombre.upper() if obj.segundo_nombre else None

    def get_primer_apellido(self, obj):
        return obj.primer_apellido.upper() if obj.primer_apellido else None

    def get_segundo_apellido(self, obj):
        return obj.segundo_apellido.upper() if obj.segundo_apellido else None
    
    # Obtener URLs de archivos
    def get_archivo_rut(self, obj):
        if obj.tipo_persona == 'J':
            return Util.obtener_archivos(obj.archivo_rut.name) if len(obj.archivo_rut.name) > 0 else None
        return None 

    def get_camaraComercio(self, obj):
        if obj.tipo_persona == 'J':
            return Util.obtener_archivos(obj.camaraComercio.name) if len(obj.camaraComercio.name) > 0 else None
        return None

    def get_documentoRepresentante(self, obj):
        if obj.tipo_persona == 'J': 
            return Util.obtener_archivos(obj.documentoRepresentante.name) if len(obj.documentoRepresentante.name) > 0 else None
        return None



    class Meta:
        model = Personas
        fields = '__all__'


class PersonaNaturalSerializer(serializers.ModelSerializer):
    tipo_documento = TipoDocumentoSerializer(read_only=True)
    tiene_usuario = serializers.SerializerMethodField()

    def get_tiene_usuario(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).exists()
        return usuario

    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'tipo_persona',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'nombre_comercial',
            'direccion_residencia',
            'municipio_residencia',
            'direccion_laboral',
            'cod_municipio_laboral_nal',
            'direccion_notificaciones',
            'cod_municipio_notificacion_nal',
            'email',
            'email_empresarial',
            'telefono_fijo_residencial',
            'telefono_celular',
            'telefono_empresa_2',
            'fecha_nacimiento',
            'pais_nacimiento',
            'sexo',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'acepta_tratamiento_datos',
            'tiene_usuario'
        ]

class PersonaJuridicaSerializer(serializers.ModelSerializer):
    tipo_documento = TipoDocumentoSerializer(read_only=True)
    tiene_usuario = serializers.SerializerMethodField()

    def get_tiene_usuario(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).exists()
        return usuario
    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_comercial',
            'razon_social',
            'email',
            'email_empresarial',
            'telefono_celular',
            'direccion_notificaciones',
            'direccion_residencia',
            'municipio_residencia',
            'cod_municipio_notificacion_nal',
            'telefono_celular_empresa',
            'telefono_empresa_2',
            'telefono_empresa',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'acepta_tratamiento_datos',
            'tiene_usuario',
            'proveedor',
            'archivo_rut',
            'camaraComercio',
            'documentoRepresentante'
        ]

#CREACION DE PERSONA NATURAL
class PersonaNaturalPostSerializer(serializers.ModelSerializer):

    nombre_pais_nacimiento = serializers.SerializerMethodField()
    nombre_municipio_notificacion_nal = serializers.SerializerMethodField()
    nombre_municipio_residencia = serializers.SerializerMethodField()
    nombre_municipio_expedicion = serializers.SerializerMethodField()

    class Meta:
        model = Personas
        fields = [
            'tipo_persona',
            'tipo_documento',
            'numero_documento',
            'nombre_comercial',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'fecha_nacimiento',
            'email',
            'telefono_celular',
            'telefono_empresa_2',
            'sexo',
            'pais_nacimiento',
            'nombre_pais_nacimiento',
            'cod_municipio_notificacion_nal',
            'nombre_municipio_notificacion_nal',
            'municipio_residencia',
            'nombre_municipio_residencia',
            'cod_municipio_expedicion_id',
            'nombre_municipio_expedicion',
            'email_empresarial',
            'telefono_fijo_residencial',
            'direccion_residencia',
            'direccion_laboral',
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'acepta_tratamiento_datos',
            'id_persona_crea',
            'id_cargo',
            'fecha_inicio_cargo_actual',
            'fecha_a_finalizar_cargo_actual',
            'coordenada_x',
            'coordenada_y',
            'cod_tipo_comprador'
        ]


        extra_kwargs = {
            'fecha_a_finalizar_cargo_actual': {'required': False},
            'fecha_inicio_cargo_actual': {'required': False},
            'id_cargo': {'required': False,'allow_null':False},
            'tipo_persona': {'required': True,'allow_null':False, 'allow_blank':False},
            'tipo_documento': {'required': True,'allow_null':False},
            'numero_documento': {'required': True,'allow_null':False, 'allow_blank':False},
            'primer_nombre': {'required': True,'allow_null':False, 'allow_blank':False},
            'primer_apellido': {'required': True,'allow_null':False, 'allow_blank':False},
            'fecha_nacimiento': {'required': True,'allow_null':False},
            'email': {'required': True,'allow_null':False, 'allow_blank':False},
            'sexo': {'required': True,'allow_null':False},
            'cod_municipio_expedicion_id': {'required': True,'allow_null':False},
            'direccion_residencia': {'required': False,'allow_null':True, 'allow_blank':False},
            'direccion_notificaciones': {'required': True,'allow_null':False, 'allow_blank':False},
            'cod_municipio_notificacion_nal': {'required': True,'allow_null':False},
            'acepta_notificacion_sms': {'required': True,'allow_null':False},
            'acepta_notificacion_email': {'required': True,'allow_null':False},
            'acepta_tratamiento_datos': {'required': True,'allow_null':False},
        }
    def get_nombre_pais_nacimiento(self, obj):
        return obj.pais_nacimiento.nombre if obj.pais_nacimiento else None

    def get_nombre_municipio_notificacion_nal(self, obj):
        return obj.cod_municipio_notificacion_nal.nombre if obj.cod_municipio_notificacion_nal else None

    def get_nombre_municipio_residencia(self, obj):
        return obj.municipio_residencia.nombre if obj.municipio_residencia else None

    def get_nombre_municipio_expedicion(self, obj):
        return obj.cod_municipio_expedicion_id.nombre if obj.cod_municipio_expedicion_id else None

#ACTUALIZACION PERSONA NATURAL
class PersonaNaturalUpdateSerializer(serializers.ModelSerializer):

    nombre_pais_nacimiento = serializers.SerializerMethodField()
    nombre_municipio_residencia = serializers.SerializerMethodField()
    nombre_municipio_expedicion = serializers.SerializerMethodField()
    nombre_municipio_notificacion_nal = serializers.SerializerMethodField()

    class Meta:
        model = Personas
        fields = [
            'fecha_a_finalizar_cargo_actual',
            'fecha_inicio_cargo_actual',
            'id_cargo',
            'nombre_comercial',
            'direccion_residencia',
            'direccion_notificacion_referencia',
            'municipio_residencia',
            'nombre_municipio_residencia',
            'direccion_laboral',
            'direccion_notificaciones',
            'cod_municipio_notificacion_nal',
            'nombre_municipio_notificacion_nal',
            'email',
            'email_empresarial',
            'telefono_fijo_residencial',
            'telefono_celular',
            'telefono_empresa_2',
            'fecha_nacimiento',
            'pais_nacimiento',
            'nombre_pais_nacimiento',
            'sexo',
            'cod_municipio_expedicion_id',
            'nombre_municipio_expedicion',
            'fecha_ultim_actualiz_diferente_crea',
            'id_persona_ultim_actualiz_diferente_crea',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'coordenada_x',
            'coordenada_y',
            'cod_tipo_comprador'
        ]

        extra_kwargs = {
            'fecha_a_finalizar_cargo_actual': {'required': False},
            'fecha_inicio_cargo_actual': {'required': False},
            'id_cargo': {'required': False,'allow_null':False},
            'primer_nombre': {'required': True, 'allow_null':False, 'allow_blank':False},
            'segundo_nombre': {'required': False,'allow_null':False},
            'primer_apellido': {'required': True,'allow_null':False, 'allow_blank':False},
            'segundo_apellido': {'required': True,'allow_null':False, 'allow_blank':False},
            'nombre_comercial': {'required': True,'allow_null':False, 'allow_blank':False},
            'telefono_celular': {'required': True,'allow_null':False, 'allow_blank':False},
            'fecha_nacimiento': {'required': True,'allow_null':False},
            'email': {'required': True,'allow_null':False, 'allow_blank':False},
            'sexo': {'required': True,'allow_null':False},
            'cod_municipio_expedicion_id': {'required': False,'allow_null':True},
            'direccion_notificaciones': {'required': True,'allow_null':False, 'allow_blank':False},
            'cod_municipio_notificacion_nal': {'required': False,'allow_null':True},
            'direccion_residencia': {'required': False,'allow_null':True, 'allow_blank':True},
            'municipio_residencia': {'required': False,'allow_null':True},
            'cod_tipo_comprador': {'required': False,'allow_null':True, 'allow_blank':True},
            }
    # Métodos para mostrar los nombres legibles
    def get_nombre_pais_nacimiento(self, obj):
        return obj.pais_nacimiento.nombre if obj.pais_nacimiento else None

    def get_nombre_municipio_residencia(self, obj):
        return obj.municipio_residencia.nombre if obj.municipio_residencia else None

    def get_nombre_municipio_expedicion(self, obj):
        return obj.cod_municipio_expedicion_id.nombre if obj.cod_municipio_expedicion_id else None

    def get_nombre_municipio_notificacion_nal(self, obj):
        return obj.cod_municipio_notificacion_nal.nombre if obj.cod_municipio_notificacion_nal else None
    
    

class PersonaNaturalUpdateAdminSerializer(PersonaNaturalUpdateSerializer):

    class Meta:
        model =  Personas
        fields = PersonaNaturalUpdateSerializer.Meta.fields
        extra_kwargs = PersonaNaturalUpdateSerializer.Meta.extra_kwargs | {'direccion_notificaciones': {'required': False,'allow_null':True, 'allow_blank':True}}


class PersonaNaturalPostAdminSerializer(PersonaNaturalPostSerializer):

    class Meta:
        model =  Personas
        fields = PersonaNaturalPostSerializer.Meta.fields
        # validators = PersonaNaturalPostSerializer.Meta.validators
        extra_kwargs = PersonaNaturalPostSerializer.Meta.extra_kwargs | {'direccion_notificaciones': {'required': False,'allow_null':True, 'allow_blank':True}}


#CREACION DE PERSONA JURIDICA
class PersonaJuridicaPostSerializer(serializers.ModelSerializer):

    nombre_municipio_notificacion_nal = serializers.SerializerMethodField()
    nombre_municipio_expedicion = serializers.SerializerMethodField()
    nombre_municipio_laboral = serializers.SerializerMethodField()
    nombre_pais_nacionalidad_empresa = serializers.SerializerMethodField()
    nombre_naturaleza_empresa = serializers.CharField(source='get_cod_naturaleza_empresa_display', read_only=True)

    class Meta:
        model = Personas
        fields = [
            'tipo_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_comercial',
            'razon_social',
            'email',
            'email_empresarial',
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'cod_municipio_notificacion_nal',
            'nombre_municipio_notificacion_nal',
            'cod_municipio_expedicion_id',
            'nombre_municipio_expedicion',
            'cod_municipio_laboral_nal',
            'nombre_municipio_laboral',
            'cod_pais_nacionalidad_empresa',
            'nombre_pais_nacionalidad_empresa',
            'telefono_celular_empresa',
            'telefono_empresa_2',
            'telefono_empresa',
            'representante_legal',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'fecha_inicio_cargo_rep_legal',
            "id_persona_crea",
            "cod_naturaleza_empresa",
            'nombre_naturaleza_empresa',
            'proveedor',
            'coordenada_x',
            'coordenada_y',
            'cod_tipo_comprador',
            
        ]
        validators = [
            UniqueTogetherValidator(
                queryset=Personas.objects.all(),
                fields = ['tipo_documento', 'numero_documento'],
                message = 'Ya existe un registro con el tipo de documento y el número de documento ingresado'
            )
        ]
        extra_kwargs = {
            'tipo_persona': {'required': True,'allow_null':False},
            'tipo_documento': {'required': True,'allow_null':False},
            'numero_documento': {'required': True,'allow_null':False, 'allow_blank':False},
            'digito_verificacion': {'required': True,'allow_null':False, 'allow_blank':False},
            'razon_social': {'required': True,'allow_null':False, 'allow_blank':False},
            'nombre_comercial': {'required': True,'allow_null':False, 'allow_blank':False},
            'representante_legal': {'required': True,'allow_null':False},
            'cod_naturaleza_empresa': {'required': True,'allow_null':False},
            'email': {'required': True,'allow_null':False, 'allow_blank':False},
            'direccion_notificaciones': {'required': True,'allow_null':False, 'allow_blank':False},
            'cod_municipio_notificacion_nal': {'required': True,'allow_null':False},
            'fecha_inicio_cargo_rep_legal': {'required':True,'allow_null':False},
            'acepta_notificacion_sms': {'required':True,'allow_null':False},
            'acepta_notificacion_email': {'required':True,'allow_null':False},
            'proveedor': {'required': False, 'allow_null': True},
        }

    def get_nombre_municipio_notificacion_nal(self, obj):
        if obj.cod_municipio_notificacion_nal:
            return obj.cod_municipio_notificacion_nal.nombre
        return None

    def get_nombre_municipio_expedicion(self, obj):
        if obj.cod_municipio_expedicion_id:
            return obj.cod_municipio_expedicion_id.nombre
        return None

    def get_nombre_municipio_laboral(self, obj):
        if obj.cod_municipio_laboral_nal:
            return obj.cod_municipio_laboral_nal.nombre
        return None

    def get_nombre_pais_nacionalidad_empresa(self, obj):
        if obj.cod_pais_nacionalidad_empresa:
            return obj.cod_pais_nacionalidad_empresa.nombre
        return None

#ACTUALIZACION DE PERSONA JURIDICA
class PersonaJuridicaUpdateSerializer(serializers.ModelSerializer):

    nombre_municipio_notificacion_nal = serializers.SerializerMethodField()
    nombre_municipio_expedicion = serializers.SerializerMethodField()
    nombre_municipio_laboral = serializers.SerializerMethodField()
    nombre_municipio_residencia = serializers.SerializerMethodField()
    nombre_pais_nacionalidad_empresa = serializers.SerializerMethodField()
    nombre_naturaleza_empresa = serializers.CharField(source='get_cod_naturaleza_empresa_display', read_only=True)

    class Meta:
        model = Personas
        fields = [
            'tipo_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_comercial',
            'razon_social',
            'email',
            'email_empresarial',
            'direccion_residencia',
            'municipio_residencia',
            'nombre_municipio_residencia',
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'cod_municipio_notificacion_nal',
            'nombre_municipio_notificacion_nal',
            'cod_municipio_expedicion_id',
            'nombre_municipio_expedicion',
            'cod_municipio_laboral_nal',
            'nombre_municipio_laboral',
            'cod_pais_nacionalidad_empresa',
            'nombre_pais_nacionalidad_empresa',
            'telefono_celular_empresa',
            'telefono_empresa_2',
            'telefono_empresa',
            'representante_legal',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'fecha_inicio_cargo_rep_legal',
            "id_persona_crea",
            "cod_naturaleza_empresa",
            'nombre_naturaleza_empresa',
            'proveedor',
            'coordenada_x',
            'coordenada_y',
            'cod_tipo_comprador'
        ]

        extra_kwargs = {
            'nombre_comercial': {'required': True, 'allow_null':False, 'allow_blank':False},
            'razon_social': {'required': True,'allow_null':False, 'allow_blank':False},
            'telefono_empresa': {'required': True,'allow_null':False, 'allow_blank':False},
            'telefono_celular_empresa': {'required': False,'allow_null':True, 'allow_blank':True},
            'telefono_empresa_2': {'required': False,'allow_null':True, 'allow_blank':True},
            'representante_legal': {'required': True,'allow_null':False},
            'email': {'required': True},'allow_null':False, 'allow_blank':False,
            'direccion_notificaciones': {'required': True,'allow_null':False, 'allow_blank':False},
            'fecha_inicio_cargo_rep_legal': {'required':True,'allow_null':False},
            'cod_municipio_notificacion_nal': {'required':False,'allow_null':True},
            'cod_municipio_expedicion_id': {'required':False,'allow_null':True},
            'cod_municipio_laboral_nal': {'required':False,'allow_null':True},
            'cod_pais_nacionalidad_empresa': {'required':False,'allow_null':True},
            'direccion_residencia': {'required':False,'allow_null':True, 'allow_blank':True},
            'municipio_residencia': {'required':False,'allow_null':True},
            'proveedor': {'required':False,'allow_null': True},
            'archivo_rut': {'required':False,'allow_null':True},
            'camaraComercio': {'required':False,'allow_null':True},
            'documentoRepresentante': {'required':False,'allow_null':True},
            'cod_tipo_comprador': {'required': False,'allow_null':True, 'allow_blank':True},
        }
    # Métodos para mostrar nombres legibles
    def get_nombre_municipio_notificacion_nal(self, obj):
        if obj.cod_municipio_notificacion_nal:
            return obj.cod_municipio_notificacion_nal.nombre
        return None

    def get_nombre_municipio_expedicion(self, obj):
        if obj.cod_municipio_expedicion_id:
            return obj.cod_municipio_expedicion_id.nombre
        return None

    def get_nombre_municipio_laboral(self, obj):
        if obj.cod_municipio_laboral_nal:
            return obj.cod_municipio_laboral_nal.nombre
        return None

    def get_nombre_pais_nacionalidad_empresa(self, obj):
        if obj.cod_pais_nacionalidad_empresa:
            return obj.cod_pais_nacionalidad_empresa.nombre
        return None

    def get_nombre_municipio_residencia(self, obj):
        if obj.municipio_residencia:
            return obj.municipio_residencia.nombre
        return None


class GetPersonaJuridicaByRepresentanteLegalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personas
        fields = [
            'representante_legal',
            'id_persona',
            'tipo_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_comercial',
            'razon_social',
            'email',
            'email_empresarial',
            'telefono_celular',
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'direccion_residencia',
            'municipio_residencia',
            'cod_municipio_notificacion_nal',
            'telefono_celular_empresa',
            'telefono_empresa_2',
            'telefono_empresa',
            'cod_tipo_comprador'
            
        ]

class PersonaNaturalPostByUserSerializer(serializers.ModelSerializer):
    numero_documento = serializers.CharField(max_length=20, min_length=5)
    primer_nombre = serializers.CharField(max_length=30)
    primer_apellido = serializers.CharField(max_length=30)
    telefono_celular = serializers.CharField(max_length=15, min_length=10)

    class Meta:
        model = Personas
        fields = [
            'tipo_persona',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_comercial',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'fecha_nacimiento',
            'email',
            'telefono_celular',
            'telefono_empresa_2',
            'sexo',
            'pais_nacimiento',
            'email_empresarial',
            'telefono_fijo_residencial',
            'municipio_residencia',
            'direccion_residencia',
            'direccion_laboral',
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'cod_municipio_laboral_nal',
            'cod_municipio_notificacion_nal',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'acepta_tratamiento_datos',
        ]

        validators = [
            UniqueTogetherValidator(
                queryset = Personas.objects.all(),
                fields = ['tipo_documento', 'numero_documento'],
                message = 'Ya existe un registro con el tipo de documento y el número de documento ingresado'

            )
        ]
        extra_kwargs = {
                'tipo_persona': {'required': True},
                'tipo_documento': {'required': True},
                'numero_documento': {'required': True},
                'primer_nombre': {'required': True},
                'primer_apellido': {'required': True},
                'fecha_nacimiento': {'required': True},
                'email': {'required': True}
            }


class PersonaNaturalUpdateUserPermissionsSerializer(serializers.ModelSerializer):
    telefono_celular = serializers.CharField(max_length=15, min_length=10)

    class Meta:
        model = Personas
        fields = [
            'digito_verificacion',
            'nombre_comercial',
            'direccion_residencia',
            'municipio_residencia',
            'direccion_laboral',
            'cod_municipio_laboral_nal',
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'cod_municipio_notificacion_nal',
            'email',
            'email_empresarial',
            'telefono_fijo_residencial',
            'telefono_celular',
            'telefono_empresa_2',
            'fecha_nacimiento',
            'pais_nacimiento',
            'sexo',
            'id_cargo',
            'fecha_asignacion_unidad',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'acepta_tratamiento_datos',
        ]



class PersonaJuridicaUpdateUserPermissionsSerializer(serializers.ModelSerializer):
    telefono_celular_empresa = serializers.CharField(max_length=15, min_length=10)

    class Meta:
        model = Personas
        fields = [
            'direccion_notificaciones',
            'direccion_notificacion_referencia',
            'cod_municipio_notificacion_nal',
            'email',
            'email_empresarial',
            'telefono_empresa',
            'telefono_celular_empresa',
            'telefono_empresa_2',
            'cod_pais_nacionalidad_empresa',
            'acepta_notificacion_sms',
            'acepta_notificacion_email',
            'acepta_tratamiento_datos'
        ]


class RepresentanteLegalGetSerializer(serializers.ModelSerializer):
    tipo_documento = serializers.ReadOnlyField(source='tipo_documento.cod_tipo_documento', default=None)
    cod_relacion_con_el_titular = serializers.SerializerMethodField()
    municipio = serializers.CharField(source='municipio_residencia.nombre', read_only=True)
    departamento = serializers.CharField(source='municipio_residencia.cod_departamento.nombre', read_only=True)
    pais = serializers.CharField(source='municipio_residencia.cod_departamento.pais.nombre', read_only=True)
    id_usuario = serializers.SerializerMethodField()

    def get_cod_relacion_con_el_titular(self, obj):
        return 'RL'

    def get_id_usuario(self, obj):
        id_usuario = None
        usuario = obj.user_set.all()
        if usuario:
            usuario = usuario.exclude(id_usuario=1).first()
            if not usuario:
                return None
            id_usuario = usuario.id_usuario

        return id_usuario


    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'telefono_celular',
            'razon_social',
            'tipo_documento',
            'numero_documento',
            'direccion_laboral',
            'direccion_notificaciones',
            'email',
            'cod_relacion_con_el_titular',
            'id_usuario',
            'municipio',
            'departamento',
            'pais'
        ]


class HistoricoDireccionSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

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


    class Meta:
        model = HistoricoDireccion
        fields = '__all__'


class CargosSerializer(serializers.ModelSerializer):

    class Meta:
        model = Cargos
        fields = ['id_cargo', 'nombre']
        extra_kwargs = {
            'nombre': {'required': True},
            'id_cargo': {'read_only': True}
        }


class PersonasFilterSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    tiene_usuario = serializers.SerializerMethodField()
    primer_nombre = serializers.SerializerMethodField()
    segundo_nombre = serializers.SerializerMethodField()
    primer_apellido = serializers.SerializerMethodField()
    segundo_apellido = serializers.SerializerMethodField()
    razon_social = serializers.SerializerMethodField()
    tipo_persona_desc = serializers.CharField(source='get_tipo_persona_display')
    nombre_naturaleza_empresa = serializers.CharField(source='get_cod_naturaleza_empresa_display')
    tipo_usuario = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    archivo_rut = serializers.SerializerMethodField()
    camaraComercio = serializers.SerializerMethodField()
    documentoRepresentante = serializers.SerializerMethodField()
    image_profile = serializers.SerializerMethodField()
    representante_legal = serializers.SerializerMethodField()
    municipio = serializers.SerializerMethodField()
    departamento = serializers.SerializerMethodField()
    pais = serializers.SerializerMethodField()
    cargo = serializers.ReadOnlyField(source='id_cargo.nombre', default=None)

    def get_is_active(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).first()
        return usuario.is_active if usuario else None

    def get_tiene_usuario(self, obj):
        return User.objects.filter(persona=obj.id_persona).exists()

    def get_nombre_completo(self, obj):
        if obj.tipo_persona == 'J':
            return obj.razon_social.upper() if obj.razon_social else None
        else:
            nombre_list = [obj.primer_nombre, obj.segundo_nombre, obj.primer_apellido, obj.segundo_apellido]
            nombre_completo = ' '.join(item for item in nombre_list if item is not None)
            return nombre_completo.upper() if nombre_completo else None

    def get_primer_nombre(self, obj):
        return obj.primer_nombre.upper() if obj.primer_nombre else None

    def get_segundo_nombre(self, obj):
        return obj.segundo_nombre.upper() if obj.segundo_nombre else None

    def get_primer_apellido(self, obj):
        return obj.primer_apellido.upper() if obj.primer_apellido else None

    def get_segundo_apellido(self, obj):
        return obj.segundo_apellido.upper() if obj.segundo_apellido else None

    def get_razon_social(self, obj):
        return obj.razon_social.upper() if obj.razon_social else None

    def get_tipo_usuario(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).first()
        return 'Interno' if usuario and usuario.tipo_usuario == 'I' else 'Externo' if usuario else None

    # Obtener URLs de archivos
    def get_archivo_rut(self, obj):
        if obj.archivo_rut:
            return Util.obtener_archivos(obj.archivo_rut.name) if len(obj.archivo_rut.name) > 0 else None
        return None 

    def get_camaraComercio(self, obj):
        if obj.camaraComercio:
            return Util.obtener_archivos(obj.camaraComercio.name) if len(obj.camaraComercio.name) > 0 else None
        return None

    def get_documentoRepresentante(self, obj):
        if obj.documentoRepresentante: 
            return Util.obtener_archivos(obj.documentoRepresentante.name) if len(obj.documentoRepresentante.name) > 0 else None
        return None

    def get_image_profile(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).first()
        if usuario and usuario.image_profile:
            return Util.obtener_archivos(usuario.image_profile.name) if len(usuario.image_profile.name) > 0 else None
        
    def get_representante_legal(self, obj):
        if not obj.representante_legal:
            return None
        
        representante_legal = Personas.objects.filter(id_persona=obj.representante_legal.id_persona).first()
        if not representante_legal:
            return None
        return RepresentanteLegalGetSerializer(representante_legal).data
    
    def get_municipio(self, obj):
        if obj.tipo_persona == 'N':
            return obj.municipio_residencia.nombre if obj.municipio_residencia else None
        return obj.cod_municipio_notificacion_nal.nombre if obj.cod_municipio_notificacion_nal else None
    
    def get_departamento(self, obj):
        if obj.tipo_persona == 'N':
            return obj.municipio_residencia.cod_departamento.nombre if obj.municipio_residencia else None
        return obj.cod_municipio_notificacion_nal.cod_departamento.nombre if obj.cod_municipio_notificacion_nal else None
    
    def get_pais(self, obj):
        if obj.tipo_persona == 'N':
            return obj.municipio_residencia.cod_departamento.pais.nombre if obj.municipio_residencia else None
        return obj.cod_municipio_notificacion_nal.cod_departamento.pais.nombre if obj.cod_municipio_notificacion_nal else None
        

    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_persona',
            'tipo_persona_desc',
            'tipo_documento',
            'numero_documento',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'nombre_completo',
            'email',
            'email_empresarial',
            'telefono_celular',
            'telefono_empresa', 
            'telefono_fijo_residencial',
            'direccion_residencia',
            'direccion_notificaciones',
            'razon_social',
            'nombre_comercial',
            'digito_verificacion',
            'cod_naturaleza_empresa',
            'nombre_naturaleza_empresa',
            'tiene_usuario',
            'tipo_usuario',
            'is_active',
            'archivo_rut',
            'camaraComercio',
            'documentoRepresentante',
            'image_profile',
            'representante_legal',
            'municipio',
            'departamento',
            'pais',
            'cod_tipo_comprador',
            'cargo'
        ]


class UsuarioAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id_usuario', 'nombre_de_usuario','tipo_usuario']

class PersonasFilterAdminUserSerializer(PersonasFilterSerializer):
    usuarios = serializers.SerializerMethodField()
    justificacion_cambio = serializers.SerializerMethodField()

    def get_usuarios(self, obj):
        usuarios = User.objects.filter(persona=obj.id_persona)
        usuarios_serializer = UsuarioAdminSerializer(usuarios, many=True)
        usuarios_data = usuarios_serializer.data if usuarios_serializer else []
        return usuarios_data
    
    def get_justificacion_cambio(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).first()
        cod_operacion = 'A' if usuario.is_active else 'I'
        justificacion = HistoricoActivacion.objects.filter(id_usuario_afectado=usuario, cod_operacion = cod_operacion).last()
        return justificacion.justificacion if justificacion else None

    class Meta:
        model = Personas
        fields = PersonasFilterSerializer.Meta.fields + ['usuarios', 'justificacion_cambio']


class UpdatePersonasNaturalesSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    def get_nombre_completo(self, obj):
        return f"{obj.primer_nombre} {obj.segundo_nombre} {obj.primer_apellido} {obj.segundo_apellido}"

    class Meta:
        model = Personas
        fields = ('id_persona', 'tipo_documento', 'numero_documento', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido','nombre_completo')

        validators = [
                UniqueTogetherValidator(
                    queryset = Personas.objects.all(),
                    fields = ['tipo_documento', 'numero_documento'],
                    message = 'Ya existe un registro con el tipo de documento y el número de documento ingresado'

                )
            ]

class UpdatePersonasJuridicasSerializer(serializers.ModelSerializer):

    class Meta:
        model = Personas
        fields = ('id_persona', 'numero_documento', 'razon_social', 'nombre_comercial', 'cod_naturaleza_empresa')


        validators = [
                UniqueTogetherValidator(
                    queryset = Personas.objects.all(),
                    fields = ['numero_documento'],
                    message = 'Ya existe un registro con ese número de documento ingresado'
                )
            ]

class HistoricoRepresentLegalSerializer(serializers.ModelSerializer):
    nombre_comercial = serializers.CharField(source='id_persona_empresa.nombre_comercial', read_only=True)
    razon_social = serializers.CharField(source='id_persona_empresa.razon_social', read_only=True)
    nombre_completo_replegal = serializers.SerializerMethodField()

    def get_nombre_completo_replegal(self, obj):
        return f"{obj.id_persona_represent_legal.primer_nombre} {obj.id_persona_represent_legal.segundo_nombre} {obj.id_persona_represent_legal.primer_apellido} {obj.id_persona_represent_legal.segundo_apellido}"

    class Meta:
        model = HistoricoRepresentLegales
        fields = ['id_historico_represent_legal', 'consec_representacion', 'fecha_cambio_sistema', 'fecha_inicio_cargo', 'id_persona_empresa', 'nombre_comercial', 'razon_social','id_persona_represent_legal','nombre_completo_replegal']


class RepresentanteLegalSerializer(serializers.ModelSerializer):
    tipo_persona = serializers.SerializerMethodField()
    tipo_persona_desc = serializers.CharField(source='get_tipo_persona_display')
    tipo_documento_id = serializers.SerializerMethodField()
    tipo_documento = serializers.SerializerMethodField()
    numero_documento = serializers.SerializerMethodField()
    primer_nombre = serializers.SerializerMethodField()
    segundo_nombre = serializers.SerializerMethodField()
    primer_apellido = serializers.SerializerMethodField()
    segundo_apellido = serializers.SerializerMethodField()
    nombre_completo = serializers.SerializerMethodField()

    def get_tipo_persona(self, obj):
        return obj.tipo_persona

    def get_tipo_documento_id(self, obj):
        return obj.tipo_documento_id

    def get_tipo_documento(self, obj):
        return obj.tipo_documento.nombre


    def get_numero_documento(self, obj):
        return obj.numero_documento

    def get_primer_nombre(self,obj):
        return obj.primer_nombre

    def get_segundo_nombre(self, obj):
         return obj.segundo_nombre

    def get_primer_apellido(self, obj):
         return obj.primer_apellido

    def get_segundo_apellido(self, obj):
         return obj.segundo_apellido

    def get_nombre_completo(self, obj):
        return f"{obj.primer_nombre} {obj.segundo_nombre} {obj.primer_apellido} {obj.segundo_apellido}"
    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_persona',
            'tipo_persona_desc',
            'tipo_documento_id',
            'tipo_documento',
            'numero_documento',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'nombre_completo'
        ]


class PersonasFilterRepresentanteSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    tiene_usuario = serializers.SerializerMethodField()
    primer_nombre = serializers.SerializerMethodField()
    segundo_nombre = serializers.SerializerMethodField()
    primer_apellido = serializers.SerializerMethodField()
    segundo_apellido = serializers.SerializerMethodField()
    razon_social = serializers.SerializerMethodField()
    tipo_persona_desc = serializers.CharField(source='get_tipo_persona_display')
    tipo_usuario = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()


    def get_is_active(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).first()
        return usuario.is_active if usuario else None

    def get_tiene_usuario(self, obj):
        return User.objects.filter(persona=obj.id_persona).exists()

    def get_nombre_completo(self, obj):
        if obj.tipo_persona == 'J':
            return obj.razon_social.upper() if obj.razon_social else None
        else:
            nombre_list = [obj.primer_nombre, obj.segundo_nombre, obj.primer_apellido, obj.segundo_apellido]
            nombre_completo = ' '.join(item for item in nombre_list if item is not None)
            return nombre_completo.upper() if nombre_completo else None

    def get_primer_nombre(self, obj):
        return obj.primer_nombre.upper() if obj.primer_nombre else None

    def get_segundo_nombre(self, obj):
        return obj.segundo_nombre.upper() if obj.segundo_nombre else None

    def get_primer_apellido(self, obj):
        return obj.primer_apellido.upper() if obj.primer_apellido else None

    def get_segundo_apellido(self, obj):
        return obj.segundo_apellido.upper() if obj.segundo_apellido else None

    def get_razon_social(self, obj):
        return obj.razon_social.upper() if obj.razon_social else None

    def get_tipo_usuario(self, obj):
        usuario = User.objects.filter(persona=obj.id_persona).first()
        return 'Interno' if usuario and usuario.tipo_usuario == 'I' else 'Externo' if usuario else None


    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_persona',
            'tipo_persona_desc',
            'tipo_documento',
            'numero_documento',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'nombre_completo',
            'email',
            'email_empresarial',
            'telefono_celular',
            'telefono_empresa', 
            'telefono_fijo_residencial',
            'razon_social',
            'nombre_comercial',
            'digito_verificacion',
            'cod_naturaleza_empresa',
            'tiene_usuario',
            'tipo_usuario',
            'is_active',
            'cod_tipo_comprador'
        ]


class DocumentosPersonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentosPersona
        fields = '__all__'


class RepresentanteLegalSerializer(serializers.ModelSerializer):
    """ Serializador para la creación de un Representante Legal """
    
    class Meta:
        model = Personas
        fields = [
            'id_persona', 'tipo_documento', 'numero_documento', 
            'primer_nombre', 'segundo_nombre', 'primer_apellido', 
            'segundo_apellido', 'email', 'telefono_celular', 
            'direccion_residencia', 'representante_legal', 'coordenada_x',
            'coordenada_y'
        ]
        extra_kwargs = {
            'id_persona': {'read_only': True},
            'representante_legal': {'read_only': True},
        }

    def validate_email(self, value):
        """ Validación: El email no debe estar registrado previamente """
        if Personas.objects.filter(email=value).exists():
            raise serializers.ValidationError("El correo electrónico ya está en uso.")
        return value

    def validate_numero_documento(self, value):
        """ Validación: El documento no debe estar registrado previamente """
        if Personas.objects.filter(numero_documento=value).exists():
            raise serializers.ValidationError("El número de documento ya existe.")
        return value

class ProveedorSerializer(serializers.ModelSerializer):
    """ Serializador para la creación de un Proveedor """
    
    # Campos adicionales solo lectura para mostrar nombres y departamentos
    departamento_residencia = serializers.SerializerMethodField()
    municipio_expedicion = serializers.SerializerMethodField()
    departamento_expedicion = serializers.SerializerMethodField()
    municipio_laboral = serializers.SerializerMethodField()
    departamento_laboral = serializers.SerializerMethodField()
    
    class Meta:
        model = Personas
        fields = [
            'id_persona', 'tipo_persona', 'tipo_documento', 'numero_documento', 
            'primer_nombre', 'segundo_nombre', 'primer_apellido', 
            'segundo_apellido', 'email', 'telefono_celular', 'telefono_celular_empresa',
            'razon_social', 'nombre_comercial', 'cod_municipio_expedicion_id',
            'municipio_expedicion', 'departamento_expedicion',
            'direccion_residencia', 'direccion_notificaciones', 'coordenada_x','proveedor',
            'coordenada_y', 'municipio_residencia', 'departamento_residencia', 
            'cod_municipio_laboral_nal', 'municipio_laboral', 'departamento_laboral',
        ]
        extra_kwargs = {
            'id_persona': {'read_only': True},
        }
    
    def to_representation(self, instance):
        """ Sobrescribir para mostrar nombres en lugar de códigos """
        representation = super().to_representation(instance)
        
        # Reemplazar tipo_persona con display
        if representation.get('tipo_persona'):
            representation['tipo_persona'] = instance.get_tipo_persona_display()
        
        # Reemplazar tipo_documento con nombre
        if representation.get('tipo_documento') and instance.tipo_documento:
            representation['tipo_documento'] = instance.tipo_documento.nombre
        
        # Reemplazar municipio_residencia con nombre
        if representation.get('municipio_residencia') and instance.municipio_residencia:
            representation['municipio_residencia'] = instance.municipio_residencia.nombre
        
        return representation
    
    def get_departamento_residencia(self, obj):
        return obj.municipio_residencia.cod_departamento.nombre if obj.municipio_residencia and obj.municipio_residencia.cod_departamento else None
    
    def get_municipio_expedicion(self, obj):
        return obj.cod_municipio_expedicion_id.nombre if obj.cod_municipio_expedicion_id else None
    
    def get_departamento_expedicion(self, obj):
        return obj.cod_municipio_expedicion_id.cod_departamento.nombre if obj.cod_municipio_expedicion_id and obj.cod_municipio_expedicion_id.cod_departamento else None
    
    def get_municipio_laboral(self, obj):
        return obj.cod_municipio_laboral_nal.nombre if obj.cod_municipio_laboral_nal else None
    
    def get_departamento_laboral(self, obj):
        return obj.cod_municipio_laboral_nal.cod_departamento.nombre if obj.cod_municipio_laboral_nal and obj.cod_municipio_laboral_nal.cod_departamento else None

    def validate_email(self, value):
        return value

    def validate_numero_documento(self, value):
        """ Validación: Documento único dentro del mismo tipo de persona """
        if not value:
            return value

        tipo_persona = self.initial_data.get('tipo_persona') if hasattr(self, 'initial_data') else None
        if not tipo_persona and self.instance:
            tipo_persona = self.instance.tipo_persona

        if tipo_persona:
            tipo_persona = str(tipo_persona).upper()
            queryset = Personas.objects.filter(numero_documento=value, tipo_persona=tipo_persona)
            if self.instance:
                queryset = queryset.exclude(id_persona=self.instance.id_persona)
            if queryset.exists():
                raise serializers.ValidationError("El número de documento ya existe para este tipo de persona.")

        return value
    

class IdentificacionTemporalSerializer(serializers.ModelSerializer):
    nombre_municipio = serializers.CharField(source='cod_municipio.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='cod_departamento.nombre', read_only=True)
    nombre_persona_crea = serializers.SerializerMethodField()
    nombre_cod_documento = serializers.ReadOnlyField(source='cod_tipo_documento.nombre', default=None)

    def get_nombre_persona_crea(self, obj):
        if obj.id_persona_crea:
            return f"{obj.id_persona_crea.primer_nombre} {obj.id_persona_crea.primer_apellido}"
        return None
    class Meta:
        model = IdentificacionTemporal
        fields = '__all__'
       

class PersonaFirmanDocumentosSerializer(serializers.ModelSerializer):
    nombres = serializers.SerializerMethodField()
    apellidos = serializers.SerializerMethodField()
    tipo_documento = serializers.SerializerMethodField()
    tipo_documento_desc = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    tipo_persona_desc = serializers.CharField(source='get_tipo_persona_display', read_only=True)


    def get_nombres(self, obj):
        return f"{obj.primer_nombre} {obj.segundo_nombre}" if obj.tipo_persona == 'N' else None
    
    def get_apellidos(self, obj):
        return f"{obj.primer_apellido} {obj.segundo_apellido}" if obj.tipo_persona == 'N' else None
    
    def get_tipo_documento(self, obj):
        return obj.tipo_documento.cod_tipo_documento if obj.tipo_documento else None

    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_persona',
            'tipo_persona_desc',
            'tipo_documento',
            'tipo_documento_desc',
            'numero_documento',
            'nombres',
            'apellidos'
        ]


class TipoCompradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoComprador
        fields = ['cod_tipo_comprador', 'nombre']
        extra_kwargs = {
            'cod_tipo_comprador': {'required': True},
            'nombre': {'required': True}
        }

class TipoCompradorPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoComprador
        fields = ['cod_tipo_comprador', 'nombre']
        extra_kwargs = {
            'cod_tipo_comprador': {'required': True},
            'nombre': {'required': True}
        }

class TipoCompradorPutSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoComprador
        fields = ['nombre', 'activo']
        extra_kwargs = {
            'nombre': {'required': True}
        }


class UsuarioTipoCompradorSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener la información del tipo de comprador del usuario actual
    """
    cod_tipo_comprador = serializers.CharField(source='persona.cod_tipo_comprador', read_only=True)
    nombre_tipo_comprador = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['cod_tipo_comprador', 'nombre_tipo_comprador']
    
    def get_nombre_tipo_comprador(self, obj):
        """
        Obtiene el nombre del tipo de comprador basado en el código
        """
        cod_tipo_comprador = obj.persona.cod_tipo_comprador
        if not cod_tipo_comprador:
            return None
        
        # Si el código contiene múltiples tipos separados por |
        if '|' in cod_tipo_comprador:
            codigos = cod_tipo_comprador.split('|')
            nombres = []
            for codigo in codigos:
                try:
                    tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=codigo.strip())
                    nombres.append(tipo_comprador.nombre)
                except TipoComprador.DoesNotExist:
                    continue
            return '|'.join(nombres) if nombres else None
        else:
            # Un solo tipo de comprador
            try:
                tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=cod_tipo_comprador)
                return tipo_comprador.nombre
            except TipoComprador.DoesNotExist:
                return None


class UsuarioUbicacionSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener la información de ubicación del usuario actual
    """
    # Campos de ubicación
    municipio_residencia = serializers.CharField(source='persona.municipio_residencia.cod_municipio', read_only=True)
    nombre_municipio_residencia = serializers.CharField(source='persona.municipio_residencia.nombre', read_only=True)
    departamento_residencia = serializers.CharField(source='persona.municipio_residencia.cod_departamento.cod_departamento', read_only=True)
    nombre_departamento_residencia = serializers.CharField(source='persona.municipio_residencia.cod_departamento.nombre', read_only=True)
    
    cod_municipio_notificacion_nal = serializers.CharField(source='persona.cod_municipio_notificacion_nal.cod_municipio', read_only=True)
    nombre_municipio_notificacion_nal = serializers.CharField(source='persona.cod_municipio_notificacion_nal.nombre', read_only=True)
    departamento_notificacion_nal = serializers.CharField(source='persona.cod_municipio_notificacion_nal.cod_departamento.cod_departamento', read_only=True)
    nombre_departamento_notificacion_nal = serializers.CharField(source='persona.cod_municipio_notificacion_nal.cod_departamento.nombre', read_only=True)
    
    cod_municipio_expedicion_id = serializers.CharField(source='persona.cod_municipio_expedicion_id.cod_municipio', read_only=True)
    nombre_municipio_expedicion = serializers.CharField(source='persona.cod_municipio_expedicion_id.nombre', read_only=True)
    departamento_expedicion = serializers.CharField(source='persona.cod_municipio_expedicion_id.cod_departamento.cod_departamento', read_only=True)
    nombre_departamento_expedicion = serializers.CharField(source='persona.cod_municipio_expedicion_id.cod_departamento.nombre', read_only=True)
    
    # Para persona jurídica
    cod_municipio_laboral_nal = serializers.CharField(source='persona.cod_municipio_laboral_nal.cod_municipio', read_only=True)
    nombre_municipio_laboral_nal = serializers.CharField(source='persona.cod_municipio_laboral_nal.nombre', read_only=True)
    departamento_laboral_nal = serializers.CharField(source='persona.cod_municipio_laboral_nal.cod_departamento.cod_departamento', read_only=True)
    nombre_departamento_laboral_nal = serializers.CharField(source='persona.cod_municipio_laboral_nal.cod_departamento.nombre', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'municipio_residencia', 'nombre_municipio_residencia', 'departamento_residencia', 'nombre_departamento_residencia',
            'cod_municipio_notificacion_nal', 'nombre_municipio_notificacion_nal', 'departamento_notificacion_nal', 'nombre_departamento_notificacion_nal',
            'cod_municipio_expedicion_id', 'nombre_municipio_expedicion', 'departamento_expedicion', 'nombre_departamento_expedicion',
            'cod_municipio_laboral_nal', 'nombre_municipio_laboral_nal', 'departamento_laboral_nal', 'nombre_departamento_laboral_nal'
        ]


class DatosPersonaPagosSerializer(serializers.ModelSerializer):
    nombre_tipo_persona = serializers.CharField(source='get_tipo_persona_display', read_only=True)
    tipo_documento = serializers.CharField(source='tipo_documento.cod_tipo_documento', read_only=True)
    nombre_tipo_documento = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    nombres = serializers.SerializerMethodField()
    apellidos = serializers.SerializerMethodField()

    def get_nombres(self, obj):
        if obj.tipo_persona == 'N':
            return f"{obj.primer_nombre} {obj.segundo_nombre}" if obj.primer_nombre or obj.segundo_nombre else None
        return obj.nombre_comercial if obj.nombre_comercial else obj.razon_social
    
    def get_apellidos(self, obj):
        if obj.tipo_persona == 'N':
            return f"{obj.primer_apellido} {obj.segundo_apellido}" if obj.primer_apellido or obj.segundo_apellido else None
        return None
    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'nombre_tipo_persona',
            'tipo_persona',
            'tipo_documento',
            'nombre_tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'nombre_comercial',
            'email',
            'telefono_celular',
            'telefono_empresa',
            'direccion_residencia'
        ]

# SERIALIZADORES DE 2 FACTOR AUTENTICACION
class SegundoFactorAutenticacionSerielizer(serializers.ModelSerializer):
    nombre_tipo_2fa = serializers.ReadOnlyField(source='get_tipo_2fa_display', default=None)
    class Meta:
        model = SegundoFactorAutenticacion
        fields = '__all__'


# class SegundoFAPersonaSerializer(serializers.ModelSerializer):
#     tipo_2fa = serializers.ReadOnlyField(source='id_2fa.tipo_2fa', default=None)
#     nombre_tipo_2fa = serializers.ReadOnlyField(source='id_2fa.get_tipo_2fa_display', default=None)
#     descripcion_2fa = serializers.ReadOnlyField(source='id_2fa.descripcion', default=None)
#     codigo_verificacion = serializers.SerializerMethodField()
#     id_verificacion_2fa = serializers.SerializerMethodField()

#     class Meta:
#         model = SegundoFAPersona
#         fields = '__all__'

#     def get_id_verificacion_2fa(self, obj):
#         """Obtiene el ID de la última verificación 2FA asociada a esta persona."""
#         ultima_verificacion = Verificacion_2FA.objects.filter(id_2fa_persona=obj).order_by('-fecha_verificacion').first()
#         return ultima_verificacion.id_verificacion_2fa if ultima_verificacion else None

#     def get_codigo_verificacion(self, obj):
#         """Obtiene el código de verificación más reciente."""
#         ultima_verificacion = Verificacion_2FA.objects.filter(id_2fa_persona=obj).order_by('-fecha_verificacion').first()
#         return ultima_verificacion.codigo_verificacion if ultima_verificacion else None


class SegundoFAPersonaSerializer(serializers.ModelSerializer):
    tipo_2fa = serializers.ReadOnlyField(source='id_2fa.tipo_2fa')
    nombre_tipo_2fa = serializers.ReadOnlyField(source='id_2fa.get_tipo_2fa_display')
    ultimo_codigo_enviado = serializers.SerializerMethodField()
    ultimo_request_id = serializers.SerializerMethodField()
    ultimo_canal = serializers.SerializerMethodField()
    ultimo_estado = serializers.SerializerMethodField()
    ultimo_intentos = serializers.SerializerMethodField()
    ultima_fecha = serializers.SerializerMethodField()

    class Meta:
        model = SegundoFAPersona
        fields = [
            'id_2fa_persona',
            'id_persona',
            'id_2fa', 
            'tipo_2fa',
            'nombre_tipo_2fa',
            'email_verificacion',
            'tel_verificacion',
            'verificado',
            'activo',
            'fecha_registro',
            'fecha_actualizacion',
            'ultimo_codigo_enviado',
            'ultimo_request_id',
            'ultimo_canal',
            'ultimo_estado',
            'ultimo_intentos',
            'ultima_fecha',
        ]

    # Evitamos repetir el mismo query muchas veces
    def _get_ultima_verificacion(self, obj):
        return getattr(obj, '_ultima_verificacion',
                       obj.verificacion_2fa_set.order_by('-fecha_verificacion').first())

    def get_ultimo_codigo_enviado(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.codigo_verificacion if ver else None

    def get_ultimo_request_id(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.request_id if ver else None

    def get_ultimo_canal(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.canal if ver else None

    def get_ultimo_estado(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.verificacion_exitosa if ver else None

    def get_ultimo_intentos(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.intentos if ver else None

    def get_ultima_fecha(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.fecha_verificacion if ver else None


class SegundoFAPersonaTOTPSerializer(serializers.ModelSerializer):
    tipo_2fa = serializers.ReadOnlyField(source='id_2fa.tipo_2fa')
    nombre_tipo_2fa = serializers.ReadOnlyField(source='id_2fa.get_tipo_2fa_display')
    ultimo_codigo_enviado = serializers.SerializerMethodField()
    ultimo_request_id = serializers.SerializerMethodField()
    ultimo_canal = serializers.SerializerMethodField()
    ultimo_estado = serializers.SerializerMethodField()
    ultimo_intentos = serializers.SerializerMethodField()
    ultima_fecha = serializers.SerializerMethodField()

    class Meta:
        model = SegundoFAPersona
        fields = [
            'id_2fa_persona',
            'id_persona',
            'id_2fa', 
            'tipo_2fa',
            'nombre_tipo_2fa',
            'email_verificacion',
            'tel_verificacion',
            'secret_key',
            'verificado',
            'activo',
            'fecha_registro',
            'fecha_actualizacion',
            'ultimo_codigo_enviado',
            'ultimo_request_id',
            'ultimo_canal',
            'ultimo_estado',
            'ultimo_intentos',
            'ultima_fecha',
        ]

    # Evitamos repetir el mismo query muchas veces
    def _get_ultima_verificacion(self, obj):
        return getattr(obj, '_ultima_verificacion',
                       obj.verificacion_2fa_set.order_by('-fecha_verificacion').first())

    def get_ultimo_codigo_enviado(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.codigo_verificacion if ver else None

    def get_ultimo_request_id(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.request_id if ver else None

    def get_ultimo_canal(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.canal if ver else None

    def get_ultimo_estado(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.verificacion_exitosa if ver else None

    def get_ultimo_intentos(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.intentos if ver else None

    def get_ultima_fecha(self, obj):
        ver = self._get_ultima_verificacion(obj)
        return ver.fecha_verificacion if ver else None


class Configurar2FASerializer(serializers.Serializer):
    id_persona = serializers.IntegerField()
    tipo_2fa = serializers.ChoiceField(choices=['email', 'sms', 'whatsapp', 'totp'])
    email = serializers.EmailField(required=False)
    telefono = serializers.CharField(required=False)

    def validate(self, data):
        tipo = data.get('tipo_2fa')

        # Validación según método
        if tipo == 'email' and not data.get('email'):
            raise serializers.ValidationError("Debe proporcionar un email para 2FA por correo.")

        if tipo in ['sms', 'whatsapp'] and not data.get('telefono'):
            raise serializers.ValidationError("Debe proporcionar un teléfono para SMS/WhatsApp.")

        return data


class EnviarCodigo2FASerializer(serializers.Serializer):
    id_2fa_persona = serializers.IntegerField()

    def validate_id_2fa_persona(self, value):
        if not SegundoFAPersona.objects.filter(id_2fa_persona=value, activo=True).exists():
            raise serializers.ValidationError("No existe este método 2FA o está inactivo.")
        return value


class ValidarCodigoSerializer(serializers.Serializer):
    id_2fa_persona = serializers.IntegerField()
    codigo = serializers.CharField(max_length=10)

    def validate(self, data):
        if not data.get("codigo"):
            raise serializers.ValidationError("Debe ingresar un código OTP.")
        return data


class TOTPGenerateSerializer(serializers.Serializer):
    id_persona = serializers.IntegerField(read_only=True)
    secret = serializers.CharField(read_only=True)
    qr_url = serializers.CharField(read_only=True)


class TOTPValidateSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=6)



class TOTPValidateActivateSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=6)