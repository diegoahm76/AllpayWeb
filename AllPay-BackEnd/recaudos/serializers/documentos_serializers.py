from rest_framework import serializers
from recaudos.models.documento_models import PlantillasDoc, DocumentosGenerados, AsignacionDocs
from recaudos.models.recaudos_models import ConfiguracionConsecutivo
from docxtpl import DocxTemplate
from recaudos.utils import Utils
import os

from seguridad.utils import Util



class ConfiguracionConsecutivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionConsecutivo
        fields = '__all__'

class  PlantillasDocCreateSerializer(serializers.ModelSerializer):
    ruta_documento = serializers.SerializerMethodField()

    class Meta:
        model =  PlantillasDoc
        fields = '__all__'

    def get_ruta_documento(self, obj):
         return Util.obtener_archivos(obj.doc_plantilla.name) if len(obj.doc_plantilla.name) > 0 else None

class PlantillasDocBusquedaAvanzadaSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    class Meta:
        model = PlantillasDoc
        
        fields = ['id_plantilla_doc',
                'nombre',
                'descripcion',
                'observacion',
                'activa',
                'fecha_creacion',
                'nombre_completo',
                'id_persona_crea_plantilla','archivos_digitales']
    def get_nombre_completo(self, obj):
                nombre_completo_responsable = None
                nombre_list = [obj.id_persona_crea_plantilla.primer_nombre, obj.id_persona_crea_plantilla.segundo_nombre,
                                obj.id_persona_crea_plantilla.primer_apellido, obj.id_persona_crea_plantilla.segundo_apellido]
                nombre_completo_responsable = ' '.join(item for item in nombre_list if item is not None)
                nombre_completo_responsable = nombre_completo_responsable if nombre_completo_responsable != "" else None
                return nombre_completo_responsable
        
class  PlantillasDocBusquedaAvanzadaDetalleSerializer(serializers.ModelSerializer):
    ruta=serializers.ReadOnlyField(source='id_archivo_digital.ruta_archivo',default=None)
    extension=serializers.ReadOnlyField(source='id_archivo_digital.formato',default=None)
    class Meta:
        model =  PlantillasDoc
        fields = ['id_plantilla_doc','nombre','fecha_creacion','ruta','extension','activa']


class  PlantillasDocGetSeriallizer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    class Meta:
        model =  PlantillasDoc
        fields = '__all__'

    def get_nombre_completo(self, obj):
            nombre_completo_responsable = None
            nombre_list = [obj.id_persona_crea_plantilla.primer_nombre, obj.id_persona_crea_plantilla.segundo_nombre,
                            obj.id_persona_crea_plantilla.primer_apellido, obj.id_persona_crea_plantilla.segundo_apellido]
            nombre_completo_responsable = ' '.join(item for item in nombre_list if item is not None)
            nombre_completo_responsable = nombre_completo_responsable if nombre_completo_responsable != "" else None
            return nombre_completo_responsable


class  PlantillasDocUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model =  PlantillasDoc
        fields = '__all__'




class PlantillasDocSerializer(serializers.ModelSerializer):
    doc_plantilla = serializers.SerializerMethodField()
    class Meta:
        model = PlantillasDoc
        fields = '__all__'

    def get_doc_plantilla(self, obj):
        return Util.obtener_archivos(obj.doc_plantilla.name) if len(obj.doc_plantilla.name) > 0 else None



class PlantillasDocSerializerGet(serializers.ModelSerializer):
    """Serializer ligero para listar plantillas SIN extraer variables (optimizado para velocidad)"""
    ruta_documento = serializers.SerializerMethodField()
    tipo_archivo = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()
    
    class Meta:
        model = PlantillasDoc
        fields = '__all__'
        
    def get_ruta_documento(self, obj):
        return Util.obtener_archivos(obj.doc_plantilla.name) if obj.doc_plantilla and len(obj.doc_plantilla.name) > 0 else None
    
    def get_tipo_archivo(self, obj):
        """Detecta el tipo de archivo sin descargarlo"""
        if not obj.doc_plantilla or not obj.doc_plantilla.name:
            return None
        nombre_lower = obj.doc_plantilla.name.lower()
        if nombre_lower.endswith(('.docx', '.doc')):
            return 'word'
        elif nombre_lower.endswith(('.xlsx', '.xls')):
            return 'excel'
        elif nombre_lower.endswith('.pdf'):
            return 'pdf'
        else:
            return 'otro'
    
    def get_extension(self, obj):
        """Obtiene la extensión sin descargar el archivo"""
        if obj.doc_plantilla and obj.doc_plantilla.name:
            return os.path.splitext(obj.doc_plantilla.name)[1]
        return None


class PlantillasDocSerializerGetConVariables(serializers.ModelSerializer):
    """Serializer completo con variables (SOLO usar para detalle de UNA plantilla específica)"""
    variables = serializers.SerializerMethodField()
    ruta_documento = serializers.SerializerMethodField()
    tipo_archivo = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()
    
    class Meta:
        model = PlantillasDoc
        fields = '__all__'
        
    def get_variables(self, obj):
        if Utils.archivo_existe_en_s3(obj.doc_plantilla.name):
            # Solo intentar obtener variables si es un archivo Word
            nombre_archivo = obj.doc_plantilla.name.lower()
            if nombre_archivo.endswith(('.docx', '.doc')):
                try:
                    doc = DocxTemplate(obj.doc_plantilla)
                    variables = doc.get_undeclared_template_variables()
                    return variables
                except Exception as e:
                    # Si hay algún error al abrir el documento, retornar None
                    return None
            else:
                # Para archivos Excel u otros, no hay variables de plantilla
                return None
        else:
            return None
        
    def get_ruta_documento(self, obj):
        return Util.obtener_archivos(obj.doc_plantilla.name) if obj.doc_plantilla and len(obj.doc_plantilla.name) > 0 else None
    
    def get_tipo_archivo(self, obj):
        if not obj.doc_plantilla or not obj.doc_plantilla.name:
            return None
        nombre_lower = obj.doc_plantilla.name.lower()
        if nombre_lower.endswith(('.docx', '.doc')):
            return 'word'
        elif nombre_lower.endswith(('.xlsx', '.xls')):
            return 'excel'
        elif nombre_lower.endswith('.pdf'):
            return 'pdf'
        else:
            return 'otro'
    
    def get_extension(self, obj):
        if obj.doc_plantilla and obj.doc_plantilla.name:
            return os.path.splitext(obj.doc_plantilla.name)[1]
        return None
    

class DocumentosGeneradosSerializer(serializers.ModelSerializer):
    ruta_documento = serializers.SerializerMethodField()
    variables_por_llenar = serializers.SerializerMethodField()
    class Meta:
        model = DocumentosGenerados
        fields = '__all__'

    def get_ruta_documento(self, obj):
        return Util.obtener_archivos(obj.documento_generado.name) if len(obj.documento_generado.name) > 0 else None
    
    def get_variables_por_llenar(self, obj):
        if Utils.archivo_existe_en_s3(obj.documento_generado.name):
            # Solo intentar obtener variables si es un archivo Word
            nombre_archivo = obj.documento_generado.name.lower()
            if nombre_archivo.endswith(('.docx', '.doc')):
                try:
                    doc = DocxTemplate(obj.documento_generado)
                    variables = doc.get_undeclared_template_variables()
                    return variables
                except Exception as e:
                    # Si hay algún error al abrir el documento, retornar None
                    return None
            else:
                # Para PDFs, Excel u otros archivos, no hay variables de plantilla
                return None
        else:
            return None
        


class DocumentosGeneradosPdfSerializer(serializers.ModelSerializer):
    ruta_documento = serializers.SerializerMethodField()
    class Meta:
        model = DocumentosGenerados
        fields = '__all__'

    def get_ruta_documento(self, obj):
        return Util.obtener_archivos(obj.documento_generado.name) if len(obj.documento_generado.name) > 0 else None

    


class AsignacionDocsCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsignacionDocs
        fields = '__all__'

class AsignacionDocsSerializer(serializers.ModelSerializer):
    id_documento_generado = DocumentosGeneradosSerializer()
    class Meta:
        model = AsignacionDocs
        fields = '__all__'


