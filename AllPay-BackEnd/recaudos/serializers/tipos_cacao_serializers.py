import datetime
from requests import request
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from rest_framework import serializers
from recaudos.models.recaudos_models import DetallesFacturaUnica, FacturaUnica, FechasCierre, FechasVigencia, HistorialPorcentajesCobro, LiquidacionesFacturaUnica, PorcentajesCobro, TiposCacao, CargueSicex, PazYSalvo, PazYSalvoFacturas, PuertosExportacion, DocumentosGenerados, CobroPersuasivo, PersuasivoFacturas, AccionesCobroPersuasivo, CobroCoactivo, CoactivoFacturas
from recaudos.models.acuerdos_pago_models import SolicitudAcuerdosPago, DetalleAcuerdoPago, PlanesPago, CuotasAcuerdoPago
from seguridad.models.transversal_models import Municipio, Personas
from seguridad.choices.cod_tipo_comprador import cod_tipo_comprador_CHOICES
from decimal import Decimal
from datetime import timedelta, datetime, timezone
from django.utils import timezone as django_timezone
from dateutil.relativedelta import relativedelta
from django.utils.timezone import now
from django.db.models import Sum
from seguridad.utils import Util
from recaudos.choices.cod_tipo_paz_y_salvo_choices import cod_tipo_paz_y_salvo_CHOICES


class FechasCierreSerializer(serializers.ModelSerializer):
    cod_tipo_cobro_fecha_display = serializers.CharField(
        source='get_cod_tipo_cobro_fecha_display', read_only=True
    )
    class Meta:
        model = FechasCierre
        fields = '__all__'


class FechasCierreAllSerializer(serializers.ModelSerializer):
    cod_tipo_cobro_fecha_display = serializers.CharField(
        source='get_cod_tipo_cobro_fecha_display', read_only=True
    )

    class Meta:
        model = FechasCierre
        fields = [
            'id_fecha_cierre',
            'cod_tipo_cobro_fecha',
            'cod_tipo_cobro_fecha_display', 
            # 'dias_registro_compra',
            'dias_pago',
            'dias_pago_interes'
        ]

#Tipos de cacao
class TiposCacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TiposCacao
        fields= '__all__'
        read_only_fields = ['id_tipo_cacao', 'fecha_creacion','fecha_actualizacion']


#Registro de compras de cacao

class PersonaSerializer(serializers.ModelSerializer):
    # Serializador para incluir el nombre completo de la persona
    class Meta:
        model = Personas
        fields = ['primer_nombre', 'primer_apellido', 'razon_social', 'nombre_comercial']
    
    def to_representation(self, instance):
        # Devolvemos el nombre completo de la persona
        if instance.tipo_persona == 'N':  # Si es persona natural
            return f"{instance.primer_nombre} {instance.primer_apellido}"
        else:  # Si es una persona jurídica
            return instance.razon_social if instance.razon_social else instance.nombre_comercial
        
class FacturaUnicaSerializer(serializers.ModelSerializer):
    nombre_persona_recaudador = serializers.SerializerMethodField()
    nro_documento_recaudador = serializers.SerializerMethodField()
    direccion_contacto_recaudador = serializers.SerializerMethodField()
    telefono_contacto_recaudador = serializers.SerializerMethodField()
    email_contacto_recaudador = serializers.SerializerMethodField()
    nombre_persona_proveedor = serializers.SerializerMethodField()
    nro_documento_proveedor = serializers.SerializerMethodField() 
    tipo_documento_proveedor = serializers.SerializerMethodField()
    nombre_municipio_cacao = serializers.StringRelatedField(source='id_municipio_cacao.nombre')
    nombre_departamento_cacao = serializers.StringRelatedField(source='id_departamento_cacao.nombre')
    cod_estado_liquidacion = serializers.SerializerMethodField() 
    cod_estado_liquidacion_display = serializers.SerializerMethodField() 
    id_porcentaje_cobro = serializers.SerializerMethodField()
    cod_tipo_cobro = serializers.SerializerMethodField()
    cod_tipo_cobro_nombre = serializers.SerializerMethodField()
    valor_porcentaje_cobro = serializers.SerializerMethodField()
    nombres_tipo_comprador = serializers.SerializerMethodField() 
    doc_soporte_url = serializers.SerializerMethodField()
    doc_pago_liquidacion = serializers.SerializerMethodField()
    fecha_pago_liquidacion = serializers.SerializerMethodField()
    estado_factura_display = serializers.CharField(source='get_estado_factura_display', read_only=True)

    class Meta:
        model = FacturaUnica
        fields = '__all__'
        read_only_fields = ['id_factura_unica', 'fecha_creacion']

    def get_cod_estado_liquidacion(self, obj):
        if obj.id_liq_factura_unica:
            return obj.id_liq_factura_unica.cod_estado
        return "No liquidado"

    def get_cod_estado_liquidacion_display(self, obj):
        if obj.id_liq_factura_unica:
            return obj.id_liq_factura_unica.get_cod_estado_display()
        return "No liquidado"

    def get_nombre_persona_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador.tipo_persona == 'N':
            return f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip()
        else:
            return recaudador.razon_social or recaudador.nombre_comercial
    
    def get_nro_documento_recaudador(self, obj):
        return obj.id_persona_recaudador.numero_documento if obj.id_persona_recaudador else None
    
    def get_telefono_contacto_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            return recaudador.telefono_celular or recaudador.telefono_empresa
        return None
    
    def get_email_contacto_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            return recaudador.email or recaudador.email_empresarial
        return None
    
    def get_direccion_contacto_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            return (
                recaudador.direccion_residencia or
                recaudador.direccion_laboral or
                recaudador.direccion_notificaciones
            )
        return None
    
    def get_nombre_persona_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor.tipo_persona == 'N':
            return f"{proveedor.primer_nombre} {proveedor.segundo_nombre} {proveedor.primer_apellido} {proveedor.segundo_apellido or ''}".strip()
        else:
            return proveedor.razon_social or proveedor.nombre_comercial
        

    def get_nro_documento_proveedor(self, obj):
        return obj.id_persona_proveedor.numero_documento if obj.id_persona_proveedor else None

    def get_tipo_documento_proveedor(self, obj):
        return obj.id_persona_proveedor.tipo_documento.nombre if obj.id_persona_proveedor else None

    def get_id_porcentaje_cobro(self, obj):
        return obj.id_porcentaje_cobro.id_porcentaje_cobro

    def get_valor_porcentaje_cobro(self, obj):
        return obj.id_porcentaje_cobro.valor

    def get_cod_tipo_cobro(self, obj):
        return obj.id_porcentaje_cobro.cod_tipo_cobro

    def get_cod_tipo_cobro_nombre(self, obj):
        return obj.id_porcentaje_cobro.get_cod_tipo_cobro_display()
    
    def get_doc_soporte_url(self, obj):
        if obj.doc_soporte:
            return Util.obtener_archivos(obj.doc_soporte.name) if len(obj.doc_soporte.name) > 0 else None
    
    def get_doc_pago_liquidacion(self, obj):
      
        if obj.id_liq_factura_unica and obj.id_liq_factura_unica.doc_pago:
            doc_pago = obj.id_liq_factura_unica.doc_pago
            if doc_pago.documento_generado: 
                return Util.obtener_archivos(doc_pago.documento_generado.name) if doc_pago.documento_generado.name else None
        return None
    
    def get_fecha_pago_liquidacion(self, obj):
        if obj.id_liq_factura_unica and obj.id_liq_factura_unica.fecha_pago:
            return obj.id_liq_factura_unica.fecha_pago
        return None
    
    def get_nombres_tipo_comprador(self, obj):
        cod_tipo_comprador = obj.id_persona_recaudador.cod_tipo_comprador if hasattr(obj.id_persona_recaudador, 'cod_tipo_comprador') else None
        if not cod_tipo_comprador:
            return None

        # Cache para evitar consultas repetidas
        if not hasattr(self, '_tipos_comprador_cache'):
            from seguridad.models.transversal_models import TipoComprador
            self._tipos_comprador_cache = {
                tc.cod_tipo_comprador: tc.nombre 
                for tc in TipoComprador.objects.all()
            }

        nombres_tipo_comprador = []
        codigos = cod_tipo_comprador.split('|') 
        for codigo in codigos:
            codigo = codigo.strip()
            nombre = self._tipos_comprador_cache.get(codigo, f"Desconocido ({codigo})")
            nombres_tipo_comprador.append(nombre)

        return " | ".join(nombres_tipo_comprador)
    
    

    

class DetallesFacturaUnicaSerializer(serializers.ModelSerializer):
    
    id_porcentaje_cobro = serializers.SerializerMethodField()
    valor_porcentaje_cobro = serializers.SerializerMethodField()
    nombre_tipo_cobro = serializers.SerializerMethodField()
    cod_tipo_cobro = serializers.SerializerMethodField()
    nombre_tipo_cacao = serializers.ReadOnlyField(source='id_tipo_cacao.nombre')
    nombre_municipio_cacao = serializers.StringRelatedField(source='id_factura_unica.id_municipio_cacao.nombre')
    nombre_departamento_cacao = serializers.StringRelatedField(source='id_factura_unica.id_departamento_cacao.nombre')
    nombre_vereda = serializers.ReadOnlyField(source='id_factura_unica.nombre_vereda')
    nombre_finca = serializers.ReadOnlyField(source='id_factura_unica.nombre_finca')
    nro_documento_soporte = serializers.ReadOnlyField(source='id_factura_unica.nro_documento_soporte')
    estado_factura = serializers.ReadOnlyField(source='id_factura_unica.estado_factura')
    doc_soporte = serializers.FileField(source='id_factura_unica.doc_soporte', allow_null=True, required=False)
    valor_bruto = serializers.SerializerMethodField()
    cuota_fomento = serializers.SerializerMethodField()
    valor_neto = serializers.SerializerMethodField()
    proveedor_info = serializers.SerializerMethodField()
    recaudador_info = serializers.SerializerMethodField()
    doc_soporte_url = serializers.SerializerMethodField()
    cod_estado_liquidacion = serializers.SerializerMethodField()
    cod_estado_liquidacion_display = serializers.SerializerMethodField()
    doc_pago_liquidacion = serializers.SerializerMethodField()

    class Meta:
        model = DetallesFacturaUnica
        fields = [
            'id_detalle_factura_unica',
            'id_factura_unica',
            'id_porcentaje_cobro',
            'nombre_tipo_cobro',
            'cod_tipo_cobro',
            'valor_porcentaje_cobro',
            'id_tipo_cacao',
            'nro_kilos',
            'nombre_tipo_cacao',
            'nombre_municipio_cacao',
            'nombre_departamento_cacao',
            'nombre_vereda',
            'nombre_finca',
            'valor_kilo',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            'estado_factura',
            'cod_estado_liquidacion',
            'cod_estado_liquidacion_display',
            'doc_soporte',
            'doc_soporte_url',
            'doc_pago_liquidacion',
            'proveedor_info',
            'recaudador_info',
            'nro_documento_soporte'
        ]
        read_only_fields = ['id_detalle_factura_unica']

    def get_valor_bruto(self, obj):
        # Calculamos el valor bruto (nro_kilos * valor_kilo)
        return obj.nro_kilos * obj.valor_kilo

    def get_cuota_fomento(self, obj):
        valor_bruto = obj.nro_kilos * obj.valor_kilo
        porcentaje = obj.id_factura_unica.id_porcentaje_cobro
        valor = porcentaje.valor if porcentaje else Decimal('0.00')
        return valor_bruto * valor

    def get_valor_neto(self, obj):
        valor_bruto = obj.nro_kilos * obj.valor_kilo
        porcentaje = obj.id_factura_unica.id_porcentaje_cobro
        valor = porcentaje.valor if porcentaje else Decimal('0.00')
        cuota_fomento = valor_bruto * valor
        return valor_bruto - cuota_fomento

    def get_proveedor_info(self, obj):
        # Obtener información del proveedor desde la factura relacionada
        proveedor = obj.id_factura_unica.id_persona_proveedor

        proveedor_data = {
            "id_proveedor": proveedor.id_persona if proveedor else None,
            'nombre_completo_o_comercial': self.get_nombre_completo_o_comercial(proveedor),
            'tipo_documento': self.get_tipo_documento(proveedor),
            'numero_documento': proveedor.numero_documento if proveedor else None,
            'municipio': proveedor.cod_municipio_expedicion_id.nombre if proveedor.cod_municipio_expedicion_id else None,
            'departamento': proveedor.cod_municipio_expedicion_id.cod_departamento.nombre if proveedor.cod_municipio_expedicion_id and proveedor.cod_municipio_expedicion_id.cod_departamento else None
        }

        return proveedor_data  

    def get_cod_estado_liquidacion(self, obj):
        if obj.id_factura_unica.id_liq_factura_unica:
            return obj.id_factura_unica.id_liq_factura_unica.cod_estado
        return "No liquidado"

    def get_cod_estado_liquidacion_display(self, obj):
        if obj.id_factura_unica.id_liq_factura_unica:
            return obj.id_factura_unica.id_liq_factura_unica.get_cod_estado_display()
        return "No liquidado"

    def get_nombre_tipo_cobro(self, obj):
        porcentaje = obj.id_factura_unica.id_porcentaje_cobro
        return porcentaje.get_cod_tipo_cobro_display() if porcentaje else None
    
    def get_doc_soporte_url(self, obj):
        if obj.id_factura_unica.doc_soporte:
            return Util.obtener_archivos(obj.id_factura_unica.doc_soporte.name) if len(obj.id_factura_unica.doc_soporte.name) > 0 else None

    def get_doc_pago_liquidacion(self, obj):
        if obj.id_factura_unica.id_liq_factura_unica and obj.id_factura_unica.id_liq_factura_unica.doc_pago:
            doc_pago = obj.id_factura_unica.id_liq_factura_unica.doc_pago
            if doc_pago.documento_generado:  
                return Util.obtener_archivos(doc_pago.documento_generado.name) if doc_pago.documento_generado.name else None
        return None
    
    def get_id_porcentaje_cobro(self, obj):
        return obj.id_factura_unica.id_porcentaje_cobro.id_porcentaje_cobro if obj.id_factura_unica and obj.id_factura_unica.id_porcentaje_cobro else None

    def get_valor_porcentaje_cobro(self, obj):
        return obj.id_factura_unica.id_porcentaje_cobro.valor if obj.id_factura_unica and obj.id_factura_unica.id_porcentaje_cobro else None

    def get_cod_tipo_cobro(self, obj):
        return obj.id_factura_unica.id_porcentaje_cobro.cod_tipo_cobro if obj.id_factura_unica and obj.id_factura_unica.id_porcentaje_cobro else None

    def get_nombre_completo_o_comercial(self, proveedor):
        # Retornar nombre completo si es persona natural, o nombre comercial si es jurídica
        if proveedor.tipo_persona == 'N':  # Persona natural
            return f"{proveedor.primer_nombre} {proveedor.segundo_nombre or ''} {proveedor.primer_apellido} {proveedor.segundo_apellido or ''}".strip()
        else:  # Persona jurídica
            return proveedor.nombre_comercial if proveedor.nombre_comercial else proveedor.razon_social

    def get_tipo_documento(self, proveedor):
        return proveedor.tipo_documento.nombre if proveedor and proveedor.tipo_documento else None

    def get_recaudador_info(self, obj):
        recaudador = obj.id_factura_unica.id_persona_recaudador

        if not recaudador:
            return None
        
        # Obtener los códigos de tipo comprador y sus nombres asociados
        cod_tipo_comprador = recaudador.cod_tipo_comprador if hasattr(recaudador, 'cod_tipo_comprador') else None
        nombres_tipo_comprador = []
        if cod_tipo_comprador:
            from seguridad.models.transversal_models import TipoComprador
            codigos = cod_tipo_comprador.split('|') 
            for codigo in codigos:
                try:
                    tipo_comprador = TipoComprador.objects.get(cod_tipo_comprador=codigo.strip())
                    nombres_tipo_comprador.append(tipo_comprador.nombre)
                except TipoComprador.DoesNotExist:
                    nombres_tipo_comprador.append(f"Desconocido ({codigo.strip()})")

        recaudador_data = {
            "id_recaudador": recaudador.id_persona if recaudador else None,
            "fecha_compra": obj.id_factura_unica.fecha_compra,
            'fecha_registro': obj.id_factura_unica.fecha_creacion,
            'tipo_documento': self.get_tipo_documento(recaudador),
            'numero_documento': recaudador.numero_documento if recaudador else None,
            'nombre_completo_o_comercial': self.get_nombre_completo_o_comercial(recaudador),
            'telefono': recaudador.telefono_celular if recaudador.telefono_celular else recaudador.telefono_celular_empresa if recaudador.telefono_celular_empresa else None,
            'email': recaudador.email if recaudador.email else None,
            'direccion_notificaciones': recaudador.direccion_residencia if recaudador.direccion_residencia else None,
            'municipio': recaudador.cod_municipio_expedicion_id.nombre if recaudador.cod_municipio_expedicion_id else None,
            'departamento': recaudador.cod_municipio_expedicion_id.cod_departamento.nombre if recaudador.cod_municipio_expedicion_id and recaudador.cod_municipio_expedicion_id.cod_departamento else None,
            'nro_factura_unica': obj.id_factura_unica.nro_factura_unica,
            'cod_tipo_comprador': recaudador.cod_tipo_comprador if hasattr(recaudador, 'cod_tipo_comprador') else None,
            'nombres_tipo_comprador': " | ".join(nombres_tipo_comprador), 
        }

        return recaudador_data




class PersonaProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personas
        fields = ['id_persona', 'razon_social', 'numero_documento']

class MunicipioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = '__all__'


class PersonaProveedorSerializer(serializers.ModelSerializer):
    nombres = serializers.SerializerMethodField()
    apellidos = serializers.SerializerMethodField()
    cod_municipio_expedicion_id = serializers.SerializerMethodField()
    nombre_municipio_expedicion = serializers.SerializerMethodField()
    cod_departamento_expedicion = serializers.SerializerMethodField()
    nombre_departamento_expedicion = serializers.SerializerMethodField()
    codigo_municipio_residencial_laboral = serializers.SerializerMethodField()
    nombre_municipio_residencial_laboral = serializers.SerializerMethodField()
    cod_departamento_residencial_laboral = serializers.SerializerMethodField()
    nombre_departamento_residencial_laboral = serializers.SerializerMethodField()
    tipo_persona_display = serializers.CharField(source='get_tipo_persona_display', read_only=True)
    direccion_notificaciones = serializers.SerializerMethodField()

    class Meta:
        model = Personas
        fields = [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'razon_social',
            'nombre_comercial',
            'tipo_persona',
            'tipo_persona_display',
            'email',
            'direccion_notificaciones',
            'proveedor',
            'cod_municipio_expedicion_id',
            'nombre_municipio_expedicion',
            'cod_departamento_expedicion',
            'nombre_departamento_expedicion',
            'codigo_municipio_residencial_laboral',
            'nombre_municipio_residencial_laboral',
            'cod_departamento_residencial_laboral',
            'nombre_departamento_residencial_laboral',
            'cod_tipo_comprador'
        ]

    def get_nombres(self, obj):
        return f"{obj.primer_nombre} {obj.segundo_nombre}".strip() if obj.segundo_nombre else obj.primer_nombre

    def get_apellidos(self, obj):
        return f"{obj.primer_apellido} {obj.segundo_apellido}".strip() if obj.segundo_apellido else obj.primer_apellido

    def get_cod_municipio_expedicion_id(self, obj):
        return obj.cod_municipio_expedicion_id.cod_municipio if obj.cod_municipio_expedicion_id else None

    def get_nombre_municipio_expedicion(self, obj):
        return obj.cod_municipio_expedicion_id.nombre if obj.cod_municipio_expedicion_id else None

    def get_cod_departamento_expedicion(self, obj):
        if obj.cod_municipio_expedicion_id and obj.cod_municipio_expedicion_id.cod_departamento:
            return obj.cod_municipio_expedicion_id.cod_departamento.cod_departamento
        return None

    def get_nombre_departamento_expedicion(self, obj):
        if obj.cod_municipio_expedicion_id and obj.cod_municipio_expedicion_id.cod_departamento:
            return obj.cod_municipio_expedicion_id.cod_departamento.nombre
        return None

    def get_codigo_municipio_residencial_laboral(self, obj):
        if obj.municipio_residencia:
            return obj.municipio_residencia.cod_municipio
        return None

    def get_nombre_municipio_residencial_laboral(self, obj):
        if obj.municipio_residencia:
            return obj.municipio_residencia.nombre
        return None

    def get_cod_departamento_residencial_laboral(self, obj):
        if obj.municipio_residencia and obj.municipio_residencia.cod_departamento:
            return obj.municipio_residencia.cod_departamento.cod_departamento
        return None

    def get_nombre_departamento_residencial_laboral(self, obj):
        if obj.municipio_residencia and obj.municipio_residencia.cod_departamento:
            return obj.municipio_residencia.cod_departamento.nombre
        return None
    
    def get_direccion_notificaciones(self, obj):
        """
        Devuelve la dirección de residencia en el campo direccion_notificaciones
        """
        return obj.direccion_residencia if obj.direccion_residencia else None
    

class HistorialPorcentajesCobroSerializer(serializers.ModelSerializer):
    nombre_persona_crea = serializers.SerializerMethodField()
    id_persona_actualiza = serializers.SerializerMethodField()
    nombre_persona_actualiza = serializers.SerializerMethodField()

    def get_nombre_persona_crea(self, obj):
        persona = getattr(obj, "id_persona_crea", None)
        if not persona:
            return None
        if getattr(persona, "tipo_persona", None) == "N":
            return f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} {persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
        else:
            return persona.razon_social or ""

    def get_id_persona_actualiza(self, obj):
        persona = getattr(obj, "id_persona_actualiza", None)
        return persona.id_persona if persona else None

    def get_nombre_persona_actualiza(self, obj):
        persona = getattr(obj, "id_persona_actualiza", None)
        if not persona:
            return None
        if getattr(persona, "tipo_persona", None) == "N":
            return f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} {persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
        else:
            return persona.razon_social or ""

    class Meta:
        model = HistorialPorcentajesCobro
        fields = '__all__'
        extra_fields = ['nombre_persona_crea', 'id_persona_actualiza', 'nombre_persona_actualiza']

class PorcentajesCobroSerializer(serializers.ModelSerializer):
    cod_tipo_cobro_display = serializers.CharField(source='get_cod_tipo_cobro_display', read_only=True)
    class Meta:
        model = PorcentajesCobro
        fields = '__all__'

class PorcentajesCobroAllSerializer(serializers.ModelSerializer):
    class Meta:
        model = PorcentajesCobro
        fields = fields = ['id_porcentaje_cobro', 'cod_tipo_cobro', 'valor']
        read_only_fields = ['id_porcentaje_cobro']

class CargueSicexSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargueSicex
        fields = '__all__'


class FacturasCarteraSerializer(serializers.ModelSerializer):
    nro_documento_recaudador = serializers.ReadOnlyField(source='id_persona_recaudador.numero_documento')
    razon_social_recaudador = serializers.SerializerMethodField()
    factura_proveedor = serializers.ReadOnlyField(source='nro_documento_soporte')
    nit_proveedor = serializers.ReadOnlyField(source='id_persona_proveedor.numero_documento')
    nombre_proveedor = serializers.SerializerMethodField()
    nombre_municipio_cacao = serializers.StringRelatedField(source='id_municipio_cacao.nombre')
    nombre_departamento_cacao = serializers.StringRelatedField(source='id_departamento_cacao.nombre')
    dias_mora = serializers.SerializerMethodField()
    nro_acuerdo_pago = serializers.SerializerMethodField()
    valor_intereses = serializers.SerializerMethodField()
    estado_acuerdo_pago = serializers.SerializerMethodField()
    archivo = serializers.SerializerMethodField()


    class Meta:
        model = FacturaUnica
        fields = ['id_factura_unica', 'nro_documento_recaudador', 'razon_social_recaudador','fecha_compra',
                  'nro_factura_unica', 'factura_proveedor', 'nit_proveedor', 'nombre_proveedor', 'nombre_municipio_cacao',
                  'nombre_departamento_cacao', 'total_kilos', 'valor_bruto', 'cuota_fomento', 'valor_neto',
                  'dias_mora', 'nro_acuerdo_pago', 'valor_intereses', 'estado_acuerdo_pago', 'archivo',
                  'id_persona_recaudador', 'id_persona_proveedor', 'id_municipio_cacao', 'id_departamento_cacao']

    def get_razon_social_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador.tipo_persona == 'N':
            return f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
        else:
            return recaudador.razon_social or recaudador.nombre_comercial
        
    def get_nombre_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor.tipo_persona == 'N':
            return f"{proveedor.primer_nombre} {proveedor.primer_apellido}"
        else:
            return proveedor.razon_social or proveedor.nombre_comercial
    
    def get_dias_mora(self, obj):
        # Usar datos pre-cargados del contexto si están disponibles
        context = self.context
        if context.get('optimize_for_bulk') and context.get('fecha_cierre'):
            fecha_cierre = context.get('fecha_cierre')
        else:
            fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
            
        mes_fecha_compra = obj.fecha_compra.month + 1 if obj.fecha_compra.month < 12 else 1
        anio_fecha_compra = obj.fecha_compra.year if mes_fecha_compra > 1 else obj.fecha_compra.year + 1
        dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
        fecha_limite_pago = datetime(anio_fecha_compra, mes_fecha_compra, dia_limite)
        dias_mora = (now().date() - fecha_limite_pago.date()).days
        if dias_mora < 0:
            dias_mora = 0
        return dias_mora
    
    def get_nro_acuerdo_pago(self, obj):
        # Usar prefetch_related si está disponible
        if hasattr(obj, 'detalleacuerdopago_set'):
            try:
                # Usar los datos pre-cargados con prefetch_related
                detalle = obj.detalleacuerdopago_set.all()
                if detalle:
                    # Buscar la solicitud más reciente
                    solicitudes_ids = [d.id_Solicitud_acuerdo_pago.id_solicitud_acuerdo_pago for d in detalle if d.id_Solicitud_acuerdo_pago]
                    if solicitudes_ids:
                        solicitud = SolicitudAcuerdosPago.objects.filter(
                            id_solicitud_acuerdo_pago__in=solicitudes_ids
                        ).order_by('-fecha_solicitud').first()
                        if solicitud:
                            return solicitud.nro_solicitud
            except:
                # Fallback al método original si falla
                pass
        
        # Método original como fallback
        id_factura = obj.id_factura_unica
        acuerdo_pago = DetalleAcuerdoPago.objects.filter(id_factura_unica=id_factura).values('id_Solicitud_acuerdo_pago')

        if acuerdo_pago.exists():
            solicitudes = SolicitudAcuerdosPago.objects.filter(id_solicitud_acuerdo_pago__in=acuerdo_pago).order_by('-fecha_solicitud').first()
            if solicitudes:
                return solicitudes.nro_solicitud
        return None

    def get_valor_intereses(self, obj):
        # Usar datos pre-cargados del contexto si están disponibles
        context = self.context
        if context.get('optimize_for_bulk') and context.get('tasa_dian'):
            tasa_dian = context.get('tasa_dian')
            tasa_dian_valor = tasa_dian.valor if tasa_dian else 0
        else:
            tasa_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
            tasa_dian_valor = tasa_dian.valor if tasa_dian else 0
            
        dias_mora = self.get_dias_mora(obj)
        valor_intereses = 0.00
        if dias_mora is None:
            return valor_intereses
        else:
            cuota_fomento = obj.cuota_fomento
            if cuota_fomento > 0:
                valor_intereses = (cuota_fomento * Decimal(tasa_dian_valor) * dias_mora) / Decimal('365')
                return round(valor_intereses, 2)
            else:
                return valor_intereses
    
    def get_estado_acuerdo_pago(self, obj):
        # Usar prefetch_related si está disponible
        if hasattr(obj, 'detalleacuerdopago_set'):
            try:
                # Usar los datos pre-cargados con prefetch_related
                detalle = obj.detalleacuerdopago_set.all()
                if detalle:
                    # Buscar la solicitud más reciente
                    solicitudes_ids = [d.id_Solicitud_acuerdo_pago.id_solicitud_acuerdo_pago for d in detalle if d.id_Solicitud_acuerdo_pago]
                    if solicitudes_ids:
                        solicitud = SolicitudAcuerdosPago.objects.filter(
                            id_solicitud_acuerdo_pago__in=solicitudes_ids
                        ).order_by('-fecha_solicitud').first()
                        if solicitud:
                            return solicitud.estado
            except:
                # Fallback al método original si falla
                pass
        
        # Método original como fallback
        id_factura = obj.id_factura_unica
        acuerdo_pago = DetalleAcuerdoPago.objects.filter(id_factura_unica=id_factura).values('id_Solicitud_acuerdo_pago')

        if acuerdo_pago.exists():
            solicitudes = SolicitudAcuerdosPago.objects.filter(id_solicitud_acuerdo_pago__in=acuerdo_pago).order_by('-fecha_solicitud').first()
            if solicitudes:
                return solicitudes.estado
        return None
        
    def get_archivo(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f"/apii/cartera/cartera-consulta-download/{obj.id_factura_unica}/{request.user.id_usuario}/"
            )
        return None


class LiquidacionFacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiquidacionesFacturaUnica
        fields = '__all__'


class LiquidacionFacturaPagadasSerializer(serializers.ModelSerializer):
    archivo = serializers.SerializerMethodField()

    class Meta:
        model = LiquidacionesFacturaUnica
        fields = '__all__'  # Considera especificar los campos si no necesitas todos

    def get_archivo(self, obj):
        documento = obj.doc_pago  # Ya tienes acceso directo al modelo DocumentosGenerados

        if documento and documento.documento_generado:
            return Util.obtener_archivos(documento.documento_generado.name)
        return None



class DatosRecaudadorSerializer (serializers.ModelSerializer):
    nombre_municipio = serializers.ReadOnlyField(source='cod_municipio_notificacion_nal.nombre')
    tipo_documento = serializers.ReadOnlyField(source='tipo_documento.cod_tipo_documento')
    nombre_documento = serializers.ReadOnlyField(source='tipo_documento.nombre')
    nombre_recaudador = serializers.SerializerMethodField()
    class Meta:
        model = Personas
        fields = ['id_persona', 'nombre_recaudador', 'numero_documento', 'razon_social', 'email', 'direccion_notificaciones', 'nombre_municipio', 'tipo_documento', 'nombre_documento']

    def get_nombre_recaudador(self, obj):
        recaudador = Personas.objects.filter(id_persona=obj.id_persona).first()
        if recaudador.tipo_persona == 'N':
            return ' '.join([
                recaudador.primer_nombre or '',
                recaudador.segundo_nombre or '',
                recaudador.primer_apellido or '',
                recaudador.segundo_apellido or ''
            ]).strip()
        else:
            return recaudador.razon_social or recaudador.nombre_comercial
    


class PazySalvoSerializer (serializers.ModelSerializer):
    nombre_tipo_paz_y_salvo = serializers.SerializerMethodField()
    nombre_puerto = serializers.ReadOnlyField(source='id_puerto_exportacion.nombre')

    class Meta:
        model = PazYSalvo
        fields = '__all__'

    def get_nombre_tipo_paz_y_salvo(self, obj):
        tipo_paz_y_salvo = obj.tipo_paz_y_salvo
        if tipo_paz_y_salvo:
            nombre_tipo_paz_y_salvo = dict(cod_tipo_paz_y_salvo_CHOICES).get(tipo_paz_y_salvo)
            return nombre_tipo_paz_y_salvo
        return None
    

class PazySalvoGetSerializer (serializers.ModelSerializer):
    nombre_recaudador = serializers.SerializerMethodField()
    documento_recaudador = serializers.ReadOnlyField(source='id_persona_genera.numero_documento')
    nombre_tipo_doc_recaudador = serializers.ReadOnlyField(source='id_persona_genera.tipo_documento.nombre')
    nombre_tipo_paz_y_salvo = serializers.SerializerMethodField()
    nombre_puerto = serializers.ReadOnlyField(source='id_puerto_exportacion.nombre')
    nombre_tipo_doc_tercero = serializers.ReadOnlyField(source='id_tipo_documento_tercero.nombre')
    archivo = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()



    class Meta:
        model = PazYSalvo
        fields = '__all__'

    def get_nombre_tipo_paz_y_salvo(self, obj):
        tipo_paz_y_salvo = obj.tipo_paz_y_salvo
        if tipo_paz_y_salvo:
            nombre_tipo_paz_y_salvo = dict(cod_tipo_paz_y_salvo_CHOICES).get(tipo_paz_y_salvo)
            return nombre_tipo_paz_y_salvo
        return None
    
    def get_archivo(self, obj):
        if obj.doc_paz_y_salvo:
            documento = DocumentosGenerados.objects.filter(id_documento_generado=obj.doc_paz_y_salvo.id_documento_generado).first()
            if documento and documento.documento_generado:
                return Util.obtener_archivos(documento.documento_generado.name) if len(documento.documento_generado.name) > 0 else None
            
    def get_estado(self, obj):
        if obj.fecha_generacion:
            fecha_actual = now().date()
            fecha = FechasVigencia.objects.filter(cod_tipo_fecha='PS').first()
            if not fecha:
                return "No hay fecha de cierre configurada"
            dias_vigente = fecha.dias_vigencia
            fecha_generacion = obj.fecha_generacion.date() if isinstance(obj.fecha_generacion, datetime) else obj.fecha_generacion

            fecha_limite_vigente = fecha_generacion + timedelta(days=dias_vigente)
            if fecha_limite_vigente < fecha_actual:
                return "EXPIRADO"
            else:
                return "VIGENTE"
            
    def get_nombre_recaudador(self, obj):
        recaudador = obj.id_persona_genera
        if recaudador.tipo_persona == 'N':
            return f"{recaudador.primer_nombre} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido} {recaudador.segundo_apellido or ''}".strip()
        else:
            return recaudador.razon_social or recaudador.nombre_comercial


class PazYSalvoFacturasSerializer (serializers.ModelSerializer):
    class Meta:
        model = PazYSalvoFacturas
        fields = '__all__'


class SolicitudAcuerdoPagoSerializer(serializers.ModelSerializer):
    tipo_documento = serializers.SerializerMethodField()
    numero_documento = serializers.SerializerMethodField()
    nombre_recaudador = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    valor_total_pagar = serializers.SerializerMethodField()
    cuota_fomento_total = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudAcuerdosPago
        fields = [
            "id_solicitud_acuerdo_pago",
            "nro_solicitud",
            "fecha_solicitud",
            "valor_total_pagar",
            "cuota_fomento_total",
            "estado_display",
            "estado",
            "observaciones",
            "tipo_documento",
            "numero_documento",
            "nombre_recaudador",
        ]

class SolicitudAcuerdoPagoSerializer(serializers.ModelSerializer):
    id_plan_pago = serializers.SerializerMethodField()
    id_recaudador = serializers.SerializerMethodField()
    tipo_documento = serializers.SerializerMethodField()
    numero_documento = serializers.SerializerMethodField()
    nombre_recaudador = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    valor_total_pagar = serializers.SerializerMethodField()
    cuota_fomento_total = serializers.SerializerMethodField()
    dias_mora = serializers.SerializerMethodField()
    intereses_total = serializers.SerializerMethodField() 
    facturas_asociadas = serializers.SerializerMethodField()
    estado_plan_pago = serializers.SerializerMethodField()
    nro_plan_pago = serializers.SerializerMethodField()
    estado_plan_pago_display = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudAcuerdosPago
        fields = [
            "id_solicitud_acuerdo_pago",
            "id_plan_pago",
            "nro_solicitud",
            "nro_plan_pago", 
            "fecha_solicitud",
            "valor_total_pagar",
            "cuota_fomento_total",
            "intereses_total", 
            "dias_mora",
            "estado_display",
            "estado",
            "observaciones",
            "estado_plan_pago",
            "estado_plan_pago_display",
            "id_recaudador",
            "tipo_documento",
            "numero_documento",
            "nombre_recaudador",
            "facturas_asociadas",
        ]

    def get_estado_plan_pago_display(self, obj):
        plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=obj).order_by('-nro_plan_pago').first()
        return plan.get_estado_display() if plan else None

    def get_nro_plan_pago(self, obj):
        plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=obj).order_by('-nro_plan_pago').first()
        return plan.nro_plan_pago if plan else None
    
    def get_id_plan_pago(self, obj):
        plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=obj).order_by('-nro_plan_pago').first()
        return plan.id_plan_pago if plan else None

    def get_estado_plan_pago(self, obj):
        plan = PlanesPago.objects.filter(id_solicitud_acuerdo_pago=obj).order_by('-nro_plan_pago').first()
        return plan.estado if plan else None

    def _calcular_totales(self, obj):
        
        cuota_fomento_total = Decimal("0")
        intereses_total = Decimal("0")
        dias_mora_max = 0
        fecha_actual = now().date()

        # Obtener facturas desde DetalleAcuerdoPago
        factura_ids = DetalleAcuerdoPago.objects.filter(
            id_Solicitud_acuerdo_pago=obj
        ).values_list('id_factura_unica', flat=True)

        facturas = FacturaUnica.objects.filter(id_factura_unica__in=factura_ids)

        dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list('dias_pago', flat=True).first()
        dias_pago_interes = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF")\
            .values_list('dias_pago_interes', flat=True).first()

        porcentaje_cobro = PorcentajesCobro.objects.filter(cod_tipo_cobro="PI").first()
        tasa_interes_dian = porcentaje_cobro.valor if porcentaje_cobro else Decimal("0")

        if dias_pago is None or dias_pago_interes is None:
            return {
                "cuota_fomento_total": Decimal("0"),
                "valor_total_pagar": Decimal("0"),
                "intereses_total": Decimal("0"),
                "dias_mora": 0
            }

        for factura in facturas:
            cuota_fomento_total += factura.cuota_fomento

            mes_siguiente = factura.fecha_compra + relativedelta(months=1)
            try:
                fecha_limite_pago = mes_siguiente.replace(day=dias_pago)
            except ValueError:
                primer_dia_siguiente_mes = (mes_siguiente + relativedelta(months=1)).replace(day=1)
                fecha_limite_pago = primer_dia_siguiente_mes - timedelta(days=1)

            fecha_limite_pago_date = fecha_limite_pago.date() if isinstance(fecha_limite_pago, datetime) else fecha_limite_pago
            dias_mora = max((fecha_actual - fecha_limite_pago_date).days, 0)
            dias_mora_max = max(dias_mora_max, dias_mora)

            intereses = Decimal("0")
            if fecha_actual > fecha_limite_pago_date and tasa_interes_dian:
                intereses = (factura.cuota_fomento * tasa_interes_dian * Decimal(dias_mora)) / Decimal("365")

            intereses_total += intereses

        valor_total_pagar = cuota_fomento_total + intereses_total

        return {
            "cuota_fomento_total": round(cuota_fomento_total, 5),
            "valor_total_pagar": round(valor_total_pagar, 5),
            "intereses_total": round(intereses_total, 5),
            "dias_mora": dias_mora_max
        }

    def get_valor_total_pagar(self, obj):
        return self._calcular_totales(obj)["valor_total_pagar"]

    def get_cuota_fomento_total(self, obj):
        return self._calcular_totales(obj)["cuota_fomento_total"]

    def get_intereses_total(self, obj): 
        return self._calcular_totales(obj)["intereses_total"]

    def get_dias_mora(self, obj):
        return self._calcular_totales(obj)["dias_mora"]

    def get_tipo_documento(self, obj):
        if obj.id_persona_solicita and obj.id_persona_solicita.tipo_documento:
            return obj.id_persona_solicita.tipo_documento.nombre
        return None

    def get_numero_documento(self, obj):
        return obj.id_persona_solicita.numero_documento
    
    def get_facturas_asociadas(self, obj):
        facturas = DetalleAcuerdoPago.objects.filter(id_Solicitud_acuerdo_pago=obj)
        numeros = [str(f.id_factura_unica.nro_factura_unica) for f in facturas if f.id_factura_unica]
        return "-".join(numeros)
    
    def get_id_recaudador(self, obj):
        return obj.id_persona_solicita.id_persona if obj.id_persona_solicita else None

    def get_nombre_recaudador(self, obj):
        persona = obj.id_persona_solicita
        if persona.tipo_persona == 'N':
            return f"{persona.primer_nombre or ''} {persona.segundo_nombre or ''} {persona.primer_apellido or ''} {persona.segundo_apellido or ''}".strip()
        return persona.razon_social or ''



class FacturasPagadasSerializer(serializers.ModelSerializer):
    nombre_municipio = serializers.ReadOnlyField(source='id_municipio_cacao.nombre')
    nombre_departamento = serializers.ReadOnlyField(source='id_departamento_cacao.nombre')
    nit_proveedor = serializers.ReadOnlyField(source='id_persona_proveedor.numero_documento')
    nro_documento_pago = serializers.ReadOnlyField(source='id_liq_factura_unica.nro_doc_pago')
    fecha_pago = serializers.ReadOnlyField(source='id_liq_factura_unica.fecha_pago')
    precio_kilo = serializers.SerializerMethodField()
    kilos_paz_y_salvo = serializers.SerializerMethodField()
    total_kilos_certificados = serializers.SerializerMethodField()
    # Forzar salida de total_kilos con dos decimales
    total_kilos = serializers.SerializerMethodField()

    class Meta:
        model = FacturaUnica
        fields = [
            'id_factura_unica',
            'fecha_creacion',
            'nro_factura_unica',
            'id_liq_factura_unica',
            'nro_documento_pago',
            'nombre_departamento',
            'nombre_municipio',
            'nit_proveedor',
            'fecha_compra',
            'total_kilos',
            'total_kilos_certificados',
            'precio_kilo',
            'cuota_fomento',
            'fecha_pago',
            'kilos_paz_y_salvo',
            'id_persona_proveedor'
        ]

    def get_precio_kilo(self, obj):
        detalle_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=obj.id_factura_unica)
        precio_kilo = 0
        
        if detalle_factura.exists():
            for detalle in detalle_factura:
                precio_kilo += detalle.valor_kilo
            precio_kilo = precio_kilo / detalle_factura.count()
        return precio_kilo
    
    def _fmt2(self, value):
        # Devuelve string con dos decimales, manejando None/enteros/Decimal
        from decimal import Decimal, ROUND_HALF_UP
        if value is None:
            value = Decimal('0')
        value = Decimal(str(value))
        return str(value.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP))

    def get_total_kilos(self, obj):
        return self._fmt2(obj.total_kilos)

    def get_kilos_paz_y_salvo(self, obj):
        detalle_factura = PazYSalvoFacturas.objects.filter(id_factura_unica=obj.id_factura_unica)
        kilos_paz_y_salvo = 0
        if detalle_factura.exists():
            for detalle in detalle_factura:
                kilos_paz_y_salvo += detalle.kilos_reportados
        return self._fmt2(kilos_paz_y_salvo)
    
    def get_total_kilos_certificados(self, obj):
        detalle_factura = DetallesFacturaUnica.objects.filter(id_factura_unica=obj.id_factura_unica)
        porcentaje_cacao = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').first()
        from decimal import Decimal, ROUND_HALF_UP
        total_kilos_certificados = Decimal('0')
        
        if detalle_factura.exists():
            for detalle in detalle_factura:
                if detalle.id_tipo_cacao.nombre == 'Cacao en baba':
                    total_kilos_certificados += (Decimal(str(detalle.nro_kilos)) * Decimal(str(porcentaje_cacao.valor)))
                else:
                    total_kilos_certificados += Decimal(str(detalle.nro_kilos))
        # Formatear a dos decimales
        return str(total_kilos_certificados.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP))

class PuertosExportacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PuertosExportacion
        fields = '__all__'
        read_only_fields = ['id_puerto_exportacion', 'fecha_creacion']


class AccionesCobroPersuasivoSerializer(serializers.ModelSerializer):
    persona_crea_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = AccionesCobroPersuasivo
        fields = '__all__'
        read_only_fields = ['id_accion_cobro_persuasivo', 'fecha_creacion']
    
    def get_persona_crea_nombre(self, obj):
        """Obtener el nombre de la persona que creó la acción"""
        if obj.id_persona_crea:
            persona = obj.id_persona_crea
            if persona.tipo_persona == 'N':  # Persona Natural
                return f"{persona.primer_nombre} {persona.primer_apellido}"
            else:  # Persona Jurídica
                return persona.razon_social
        return None

    
class DetallePazYSalvoSerializer(serializers.ModelSerializer):
    numero_paz_y_salvo = serializers.ReadOnlyField(source='id_paz_y_salvo.nro_paz_y_salvo')
    fecha_generacion = serializers.ReadOnlyField(source='id_paz_y_salvo.fecha_generacion')
    nombre_tipo_paz_y_salvo = serializers.SerializerMethodField()
    nombre_puerto = serializers.ReadOnlyField(source='id_paz_y_salvo.id_puerto_exportacion.nombre')
    fecha_registro_factura = serializers.ReadOnlyField(source='id_factura_unica.fecha_creacion')
    numero_factura = serializers.ReadOnlyField(source='id_factura_unica.nro_factura_unica')
    departamento = serializers.ReadOnlyField(source='id_factura_unica.id_departamento_cacao.nombre')
    municipio = serializers.ReadOnlyField(source='id_factura_unica.id_municipio_cacao.nombre')
    fecha_compra = serializers.ReadOnlyField(source='id_factura_unica.fecha_compra')
    # Forzar dos decimales para los kilos de la factura
    kilos_reportados = serializers.SerializerMethodField()
    cuota_fomento = serializers.ReadOnlyField(source='id_factura_unica.cuota_fomento')
    kilos_con_paz_y_salvo = serializers.SerializerMethodField()
    # Forzar dos decimales para los kilos a reportar
    kilos_a_reportar = serializers.SerializerMethodField()
    razon_social_tercero = serializers.ReadOnlyField(source='id_paz_y_salvo.razon_social_tercero')
    tipo_documento = serializers.ReadOnlyField(source='id_paz_y_salvo.id_tipo_doc_tercero.cod_tipo_documento')
    numero_documento = serializers.ReadOnlyField(source='id_paz_y_salvo.nro_doc_tercero')
    nombre_factura = serializers.ReadOnlyField(source='id_factura_unica.nro_documento_soporte')

    class Meta:
        model = PazYSalvoFacturas
        fields = [
            'id_paz_y_salvo_factura',
            'numero_paz_y_salvo',
            'fecha_generacion',
            'nombre_tipo_paz_y_salvo',
            'nombre_puerto',
            'fecha_registro_factura',
            'numero_factura',
            'departamento',
            'municipio',
            'fecha_compra',
            'kilos_reportados',
            'cuota_fomento',
            'kilos_con_paz_y_salvo',
            'kilos_a_reportar',
            'razon_social_tercero',
            'tipo_documento',
            'numero_documento',
            'nombre_factura'
        ]

    def get_nombre_tipo_paz_y_salvo(self, obj):
        tipo_paz_y_salvo = obj.id_paz_y_salvo.tipo_paz_y_salvo
        if tipo_paz_y_salvo:
            nombre_tipo_paz_y_salvo = dict(cod_tipo_paz_y_salvo_CHOICES).get(tipo_paz_y_salvo)
            return nombre_tipo_paz_y_salvo
        return None
    
    def _fmt2(self, value):
        from decimal import Decimal, ROUND_HALF_UP
        if value is None:
            value = Decimal('0')
        value = Decimal(str(value))
        return str(value.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP))

    def get_kilos_reportados(self, obj):
        # total_kilos de la factura asociada
        return self._fmt2(obj.id_factura_unica.total_kilos)

    def get_kilos_con_paz_y_salvo(self, obj):
        facturas = PazYSalvoFacturas.objects.filter(id_factura_unica=obj.id_factura_unica)
        total = 0
        if facturas.exists():
            for factura in facturas:
                total += factura.kilos_reportados
        return self._fmt2(total)

    def get_kilos_a_reportar(self, obj):
        return self._fmt2(obj.kilos_reportados)


class UpdatePazYSalvoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PazYSalvo
        fields = ['fecha_generacion', 'fecha_actualizacion', 'es_actualizacion', 'aprueba_actualizacion', 'doc_paz_y_salvo', 'id_puerto_exportacion'] 



class FechasVigenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FechasVigencia
        fields = '__all__'


# Serializers agregados desde accion_cobro_serializers.py
class CobroPersuasivoSerializer(serializers.ModelSerializer):
    persona_crea_nombre = serializers.SerializerMethodField()
    factura_asociada = serializers.SerializerMethodField()
    doc_persuasivo_url = serializers.SerializerMethodField()
    accion_cobro_persuasivo_info = serializers.SerializerMethodField()
    fecha_registro = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ', input_formats=['%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%dT%H:%M:%S.%fZ'])
    
    class Meta:
        model = CobroPersuasivo
        fields = '__all__'
        extra_kwargs = {
            'id_persona_crea': {'read_only': True},
            'fecha_creacion': {'read_only': True}
        }
    
    def get_persona_crea_nombre(self, obj):
        if obj.id_persona_crea:
            persona = obj.id_persona_crea
            if persona.tipo_persona == 'N':  # Persona Natural
                return f"{persona.primer_nombre} {persona.primer_apellido}"
            else:  # Persona Jurídica
                return persona.razon_social
        return None
    
    def get_doc_persuasivo_url(self, obj):
        if obj.doc_persuasivo and obj.doc_persuasivo.documento_generado:
            return Util.obtener_archivos(obj.doc_persuasivo.documento_generado.name) if len(obj.doc_persuasivo.documento_generado.name) > 0 else None
        return None
    
    def get_accion_cobro_persuasivo_info(self, obj):
        """Obtener información de la acción de cobro persuasivo"""
        if obj.id_accion_cobro_persuasivo:
            accion = obj.id_accion_cobro_persuasivo
            return {
                'id_accion': accion.id_accion_cobro_persuasivo,
                'nombre': accion.nombre,
                'descripcion': accion.descripcion,
                'activo': accion.activo
            }
        return None
    
    def to_representation(self, instance):
        """Personalizar la representación para manejar fechas sin conversión de zona horaria"""
        data = super().to_representation(instance)
        
        # Convertir fecha_registro a UTC para evitar conversión de zona horaria
        if instance.fecha_registro:
            # Convertir a UTC y formatear sin conversión de zona horaria
            if instance.fecha_registro.tzinfo is None:
                # Si no tiene zona horaria, asumir que es UTC
                data['fecha_registro'] = instance.fecha_registro.strftime('%Y-%m-%dT%H:%M:%SZ')
            else:
                # Convertir a UTC y formatear
                utc_date = instance.fecha_registro.astimezone(timezone.utc)
                data['fecha_registro'] = utc_date.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        return data
    
    def to_internal_value(self, data):
        """Personalizar la conversión de datos de entrada para manejar fechas UTC"""
        if 'fecha_registro' in data and data['fecha_registro']:
            # Si viene con Z al final, es UTC, mantenerla como está
            if data['fecha_registro'].endswith('Z'):
                # Remover la Z y parsear como UTC
                fecha_str = data['fecha_registro'].rstrip('Z')
                try:
                    fecha_utc = datetime.fromisoformat(fecha_str).replace(tzinfo=timezone.utc)
                    data['fecha_registro'] = fecha_utc
                except ValueError:
                    pass  # Dejar que Django maneje el error
        
        return super().to_internal_value(data)
    
    def get_factura_asociada(self, obj):
        """Obtener la factura asociada a este cobro persuasivo"""
        persuasivo_factura = PersuasivoFacturas.objects.filter(cobro_persuasivo=obj).first()
        if persuasivo_factura and persuasivo_factura.factura:
            factura = persuasivo_factura.factura
            return {
                'id_factura': factura.id_factura_unica,
                'nro_factura': factura.nro_factura_unica,
                'valor_neto': factura.valor_neto,
                'fecha_compra': factura.fecha_compra,
                'recaudador': factura.id_persona_recaudador.razon_social if factura.id_persona_recaudador.razon_social 
                             else f"{factura.id_persona_recaudador.primer_nombre} {factura.id_persona_recaudador.primer_apellido}"
            }
        return None
    
    def create(self, validated_data):
        # Obtener el usuario del contexto de la request
        request = self.context.get('request')
        if request and request.user:
            validated_data['id_persona_crea'] = request.user.persona
        return super().create(validated_data)


class PersuasivoFacturasSerializer(serializers.ModelSerializer):
    factura_numero = serializers.ReadOnlyField(source='factura.nro_factura_unica')
    factura_valor_neto = serializers.ReadOnlyField(source='factura.valor_neto')
    factura_fecha_compra = serializers.ReadOnlyField(source='factura.fecha_compra')
    factura_recaudador_nombre = serializers.SerializerMethodField()
    cobro_persuasivo_descripcion = serializers.ReadOnlyField(source='cobro_persuasivo.descripcion')
    
    class Meta:
        model = PersuasivoFacturas
        fields = '__all__'
    
    def get_factura_recaudador_nombre(self, obj):
        if obj.factura and obj.factura.id_persona_recaudador:
            persona = obj.factura.id_persona_recaudador
            if persona.tipo_persona == 'N':  # Persona Natural
                return f"{persona.primer_nombre} {persona.primer_apellido}"
            else:  # Persona Jurídica
                return persona.razon_social
        return None
    

class CobroPersuasivoCreateSerializer(serializers.ModelSerializer):
    """Serializer específico para crear cobros persuasivos con validaciones adicionales"""
    factura = serializers.IntegerField(
        write_only=True,
        help_text="ID de la factura a asociar"
    )
    
    class Meta:
        model = CobroPersuasivo
        exclude = ['id_persona_crea', 'fecha_creacion']
        extra_kwargs = {
            'cod_accion_registrada': {'required': False},
            'consecutivo': {'required': False},
            'nombre_recaudador': {'required': False},
            'email_recaudador': {'required': False},
            'celular_recaudador': {'required': False}
        }
    
    def _generar_codigo_accion(self):
        """Generar código único para la acción registrada"""
        import datetime
        año_actual = datetime.datetime.now().year
        
        # Buscar el último código del año actual
        ultimo_cobro = CobroPersuasivo.objects.filter(
            cod_accion_registrada__startswith=f'CP-{año_actual}-'
        ).order_by('-id_cobro_persuasivo').first()
        
        if ultimo_cobro and ultimo_cobro.cod_accion_registrada:
            try:
                numero_actual = int(ultimo_cobro.cod_accion_registrada.split('-')[-1])
                nuevo_numero = numero_actual + 1
            except (ValueError, IndexError):
                nuevo_numero = 1
        else:
            nuevo_numero = 1
            
        return f'CP-{año_actual}-{nuevo_numero:03d}'
    
    def _generar_consecutivo(self):
        """Generar consecutivo automático"""
        import datetime
        now = datetime.datetime.now()
        año_mes = f'{now.year}-{now.month:02d}'
        
        # Buscar el último consecutivo del mes actual
        ultimo_cobro = CobroPersuasivo.objects.filter(
            consecutivo__startswith=f'COBRO-{año_mes}-'
        ).order_by('-id_cobro_persuasivo').first()
        
        if ultimo_cobro and ultimo_cobro.consecutivo:
            try:
                numero_actual = int(ultimo_cobro.consecutivo.split('-')[-1])
                nuevo_numero = numero_actual + 1
            except (ValueError, IndexError):
                nuevo_numero = 1
        else:
            nuevo_numero = 1
            
        return f'COBRO-{año_mes}-{nuevo_numero:03d}'
    
    def _obtener_datos_factura(self, factura_id):
        """Obtener datos de la factura para auto-completar campos del recaudador"""
        try:
            factura = FacturaUnica.objects.select_related('id_persona_recaudador').get(
                id_factura_unica=factura_id
            )
            recaudador = factura.id_persona_recaudador
            
            # Construir nombre completo
            nombre_completo = recaudador.razon_social if recaudador.razon_social else (
                f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} "
                f"{recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}"
            ).strip()
            
            return {
                'nombre_recaudador': nombre_completo,
                'email_recaudador': recaudador.email,
                'celular_recaudador': recaudador.nro_celular
            }
        except FacturaUnica.DoesNotExist:
            return {}
    
    def create(self, validated_data):
        factura_id = validated_data.pop('factura')
        
        # Generar códigos automáticamente si no se proporcionan
        if not validated_data.get('cod_accion_registrada'):
            validated_data['cod_accion_registrada'] = self._generar_codigo_accion()
            
        if not validated_data.get('consecutivo'):
            validated_data['consecutivo'] = self._generar_consecutivo()
        
        # Auto-completar datos del recaudador desde la factura si no se proporcionan
        if factura_id and not validated_data.get('nombre_recaudador'):
            datos_recaudador = self._obtener_datos_factura(factura_id)
            for campo, valor in datos_recaudador.items():
                if not validated_data.get(campo):
                    validated_data[campo] = valor
        
        # Asignar persona que crea
        validated_data['id_persona_crea'] = self.context['request'].user.persona
        
        # Crear el cobro persuasivo
        cobro_persuasivo = CobroPersuasivo.objects.create(**validated_data)
        
        # Asociar la factura
        try:
            factura = FacturaUnica.objects.get(id_factura_unica=factura_id)
            PersuasivoFacturas.objects.create(
                cobro_persuasivo=cobro_persuasivo,
                factura=factura
            )
        except FacturaUnica.DoesNotExist:
            # Si la factura no existe, eliminar el cobro persuasivo creado
            cobro_persuasivo.delete()
            raise serializers.ValidationError(f"La factura con ID {factura_id} no existe.")
        
        return cobro_persuasivo


class CobroPersuasivoListSerializer(serializers.ModelSerializer):
    """Serializer optimizado para listado de cobros persuasivos"""
    persona_crea_nombre = serializers.SerializerMethodField()
    factura_asociada = serializers.SerializerMethodField()
    doc_persuasivo_url = serializers.SerializerMethodField()
    documento_adjunto_url = serializers.SerializerMethodField()
    aplicar_plantilla_display = serializers.SerializerMethodField()
    accion_cobro_persuasivo_info = serializers.SerializerMethodField()
    
    class Meta:
        model = CobroPersuasivo
        fields = [
            'id_cobro_persuasivo', 'cod_accion_registrada', 'descripcion', 'consecutivo',
            'fecha_registro', 'id_accion_cobro_persuasivo', 'accion_cobro_persuasivo_info', 
            'nombre_recaudador', 'email_recaudador', 'celular_recaudador', 'aplicar_plantilla', 
            'aplicar_plantilla_display', 'documento_adjunto', 'documento_adjunto_url', 
            'fecha_creacion', 'persona_crea_nombre', 'factura_asociada', 'doc_persuasivo_url'
        ]
    
    def get_persona_crea_nombre(self, obj):
        if obj.id_persona_crea:
            persona = obj.id_persona_crea
            if persona.tipo_persona == 'N':  # Persona Natural
                return f"{persona.primer_nombre} {persona.primer_apellido}"
            else:  # Persona Jurídica
                return persona.razon_social
        return None
    
    def get_doc_persuasivo_url(self, obj):
        if obj.doc_persuasivo and obj.doc_persuasivo.documento_generado:
            return Util.obtener_archivos(obj.doc_persuasivo.documento_generado.name) if len(obj.doc_persuasivo.documento_generado.name) > 0 else None
        return None
    
    def get_documento_adjunto_url(self, obj):
        if obj.documento_adjunto:
            return Util.obtener_archivos(obj.documento_adjunto.name) if len(obj.documento_adjunto.name) > 0 else None
        return None
    
    def get_aplicar_plantilla_display(self, obj):
        return "Sí" if obj.aplicar_plantilla else "No"
    
    def get_accion_cobro_persuasivo_info(self, obj):
        """Obtener información de la acción de cobro persuasivo"""
        if obj.id_accion_cobro_persuasivo:
            accion = obj.id_accion_cobro_persuasivo
            return {
                'id_accion': accion.id_accion_cobro_persuasivo,
                'nombre': accion.nombre,
                'descripcion': accion.descripcion,
                'activo': accion.activo
            }
        return None
    
    def get_factura_asociada(self, obj):
        """Obtener la factura asociada a este cobro persuasivo"""
        persuasivo_factura = PersuasivoFacturas.objects.filter(cobro_persuasivo=obj).first()
        if persuasivo_factura and persuasivo_factura.factura:
            factura = persuasivo_factura.factura
            return {
                'id_factura': factura.id_factura_unica,
                'nro_factura': factura.nro_factura_unica,
                'valor_neto': factura.valor_neto,
                'fecha_compra': factura.fecha_compra
            }
        return None


# ================== SERIALIZERS PARA COBRO COACTIVO ==================

class CobroCoactivoSerializer(serializers.ModelSerializer):
    """Serializer completo para CobroCoactivo"""
    
    # Campos calculados
    cobro_persuasivo_info = serializers.SerializerMethodField()
    accion_cobro_info = serializers.SerializerMethodField()
    facturas_asociadas = serializers.SerializerMethodField()
    persona_crea_info = serializers.SerializerMethodField()
    valor_total_calculado = serializers.SerializerMethodField()

    class Meta:
        model = CobroCoactivo
        fields = [
            'id_cobro_coactivo', 'cobro_persuasivo', 'cod_accion_registrada', 'descripcion', 
            'consecutivo', 'estado', 'fecha_registro', 'fecha_inicio_coactivo', 'fecha_limite_pago',
            'id_accion_cobro_persuasivo', 'nombre_recaudador', 'email_recaudador', 'celular_recaudador',
            'valor_total_deuda', 'valor_intereses', 'valor_costas_procesales', 'aplicar_plantilla',
            'documento_adjunto', 'doc_coactivo', 'fecha_creacion', 'fecha_actualizacion', 'id_persona_crea',
            # Campos calculados
            'cobro_persuasivo_info', 'accion_cobro_info', 'facturas_asociadas', 'persona_crea_info', 'valor_total_calculado'
        ]
        read_only_fields = ['id_cobro_coactivo', 'fecha_creacion', 'fecha_actualizacion']

    def get_cobro_persuasivo_info(self, obj):
        """Obtener información del cobro persuasivo asociado"""
        if obj.cobro_persuasivo:
            persuasivo = obj.cobro_persuasivo
            return {
                'id_cobro_persuasivo': persuasivo.id_cobro_persuasivo,
                'consecutivo': persuasivo.consecutivo,
                'descripcion': persuasivo.descripcion,
                'fecha_registro': persuasivo.fecha_registro
            }
        return None

    def get_accion_cobro_info(self, obj):
        """Obtener información de la acción de cobro"""
        if obj.id_accion_cobro_persuasivo:
            accion = obj.id_accion_cobro_persuasivo
            return {
                'id_accion': accion.id_accion_cobro_persuasivo,
                'nombre': accion.nombre,
                'descripcion': accion.descripcion,
                'tipo_cobro': accion.tipo_cobro
            }
        return None

    def get_facturas_asociadas(self, obj):
        """Obtener las facturas asociadas a este cobro coactivo"""
        coactivo_facturas = CoactivoFacturas.objects.filter(cobro_coactivo=obj).select_related('factura')
        facturas = []
        for cf in coactivo_facturas:
            facturas.append({
                'id_factura': cf.factura.id_factura_unica,
                'nro_factura': cf.factura.nro_factura_unica,
                'valor_capital': cf.valor_capital,
                'valor_intereses': cf.valor_intereses,
                'fecha_inclusion': cf.fecha_inclusion
            })
        return facturas

    def get_persona_crea_info(self, obj):
        """Obtener información de la persona que crea"""
        if obj.id_persona_crea:
            persona = obj.id_persona_crea
            
            # Construir nombre completo manualmente
            if persona.razon_social:
                nombre_completo = persona.razon_social
            else:
                nombres = [
                    persona.primer_nombre,
                    persona.segundo_nombre,
                    persona.primer_apellido, 
                    persona.segundo_apellido
                ]
                nombre_completo = ' '.join(filter(None, nombres))
            
            return {
                'id_persona': persona.id_persona,
                'nombre_completo': nombre_completo,
                'numero_documento': persona.numero_documento
            }
        return None

    def get_valor_total_calculado(self, obj):
        """Calcular el valor total incluyendo intereses y costas procesales"""
        total = (obj.valor_total_deuda or 0) + (obj.valor_intereses or 0) + (obj.valor_costas_procesales or 0)
        return total


class CobroCoactivoCreateSerializer(serializers.ModelSerializer):
    """Serializer específico para crear cobros coactivos"""
    
    facturas = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text="Lista de IDs de facturas a asociar con el cobro coactivo"
    )
    
    class Meta:
        model = CobroCoactivo
        fields = [
            'cobro_persuasivo', 'cod_accion_registrada', 'descripcion', 'consecutivo', 'estado',
            'fecha_registro', 'fecha_inicio_coactivo', 'fecha_limite_pago', 'id_accion_cobro_persuasivo',
            'nombre_recaudador', 'email_recaudador', 'celular_recaudador', 'valor_total_deuda',
            'valor_intereses', 'valor_costas_procesales', 'aplicar_plantilla', 'documento_adjunto',
            'facturas'
               ]

    def _generar_codigo_accion(self):
        """Generar código de acción automático"""
        try:
            ultimo_cobro = CobroCoactivo.objects.filter(
                cod_accion_registrada__isnull=False
            ).order_by('-id_cobro_coactivo').first()
            
            if ultimo_cobro and ultimo_cobro.cod_accion_registrada:
                try:
                    ultimo_numero = int(ultimo_cobro.cod_accion_registrada.split('-')[-1])
                    nuevo_numero = ultimo_numero + 1
                except (ValueError, IndexError):
                    nuevo_numero = 1
            else:
                nuevo_numero = 1
            
            return f"COAC-{nuevo_numero:06d}"
        except Exception:
            return f"COAC-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    def _generar_consecutivo(self):
        """Generar consecutivo automático"""
        try:
            ultimo_cobro = CobroCoactivo.objects.filter(
                consecutivo__isnull=False
            ).order_by('-id_cobro_coactivo').first()
            
            if ultimo_cobro and ultimo_cobro.consecutivo:
                try:
                    ultimo_numero = int(ultimo_cobro.consecutivo)
                    nuevo_numero = ultimo_numero + 1
                except ValueError:
                    nuevo_numero = 1
            else:
                nuevo_numero = 1
            
            return f"{nuevo_numero:06d}"
        except Exception:
            return datetime.now().strftime('%Y%m%d%H%M%S')

    def _construir_nombre_completo(self, persona):
        """Construir nombre completo de una persona"""
        if not persona:
            return None
            
        if persona.razon_social:
            return persona.razon_social
        else:
            nombres = [
                persona.primer_nombre,
                persona.segundo_nombre,
                persona.primer_apellido, 
                persona.segundo_apellido
            ]
            return ' '.join(filter(None, nombres))

    def _obtener_datos_factura(self, factura_id):
        """Obtener datos del recaudador desde la factura"""
        try:
            factura = FacturaUnica.objects.select_related('id_persona_recaudador').get(
                id_factura_unica=factura_id
            )
            
            if factura.id_persona_recaudador:
                return {
                    'nombre_recaudador': self._construir_nombre_completo(factura.id_persona_recaudador),
                    'email_recaudador': getattr(factura.id_persona_recaudador, 'email', None),
                    'celular_recaudador': getattr(factura.id_persona_recaudador, 'telefono_movil', None),
                }
        except FacturaUnica.DoesNotExist:
            return {}
        except Exception:
            return {}

    def _copiar_datos_de_persuasivo(self, cobro_persuasivo):
        """Copiar datos relevantes del cobro persuasivo"""
        return {
            'nombre_recaudador': cobro_persuasivo.nombre_recaudador,
            'email_recaudador': cobro_persuasivo.email_recaudador,
            'celular_recaudor': cobro_persuasivo.celular_recaudador,
        }

    def create(self, validated_data):
        print("[SERIALIZER] Iniciando creación de cobro coactivo")
        print(f"[SERIALIZER] Datos validados recibidos: {validated_data}")
        
        facturas_ids = validated_data.pop('facturas', [])
        print(f"[SERIALIZER] IDs de facturas a asociar: {facturas_ids}")
        
        # Verificar si hay archivo en los datos validados
        if 'documento_adjunto' in validated_data:
            print(f"[SERIALIZER] Archivo encontrado en datos validados: {validated_data['documento_adjunto']}")
        else:
            print("[SERIALIZER] No se encontró archivo en datos validados")
        
        # Generar códigos automáticamente si no se proporcionan
        if not validated_data.get('cod_accion_registrada'):
            validated_data['cod_accion_registrada'] = self._generar_codigo_accion()
            
        if not validated_data.get('consecutivo'):
            validated_data['consecutivo'] = self._generar_consecutivo()

        # Si hay cobro persuasivo asociado, copiar datos del recaudador
        if validated_data.get('cobro_persuasivo') and not validated_data.get('nombre_recaudador'):
            datos_persuasivo = self._copiar_datos_de_persuasivo(validated_data['cobro_persuasivo'])
            for campo, valor in datos_persuasivo.items():
                if not validated_data.get(campo) and valor:
                    validated_data[campo] = valor

        # Si no hay datos del recaudador y hay facturas, obtener de la primera factura
        if facturas_ids and not validated_data.get('nombre_recaudador'):
            datos_recaudador = self._obtener_datos_factura(facturas_ids[0])
            for campo, valor in datos_recaudador.items():
                if not validated_data.get(campo) and valor:
                    validated_data[campo] = valor
        
        # Asignar persona que crea
        validated_data['id_persona_crea'] = self.context['request'].user.persona
        
        print(f"[SERIALIZER] Datos finales para crear cobro: {validated_data}")
        
        # Crear el cobro coactivo
        cobro_coactivo = CobroCoactivo.objects.create(**validated_data)
        print(f"[SERIALIZER] Cobro coactivo creado con ID: {cobro_coactivo.id_cobro_coactivo}")
        print(f"[SERIALIZER] Archivo en cobro creado: {cobro_coactivo.documento_adjunto}")
        
        # Asociar las facturas
        for factura_id in facturas_ids:
            try:
                factura = FacturaUnica.objects.get(id_factura_unica=factura_id)
                CoactivoFacturas.objects.create(
                    cobro_coactivo=cobro_coactivo,
                    factura=factura,
                    valor_capital=factura.valor_neto,  # Valor inicial como capital
                    valor_intereses=0  # Los intereses se calcularán después
                )
            except FacturaUnica.DoesNotExist:
                # Si alguna factura no existe, eliminar el cobro coactivo creado
                cobro_coactivo.delete()
                raise serializers.ValidationError(f"La factura con ID {factura_id} no existe.")
        
        return cobro_coactivo


class CobroCoactivoListSerializer(serializers.ModelSerializer):
    """Serializer optimizado para listado de cobros coactivos"""
    
    cobro_persuasivo_consecutivo = serializers.CharField(source='cobro_persuasivo.consecutivo', read_only=True)
    accion_cobro_nombre = serializers.CharField(source='id_accion_cobro_persuasivo.nombre', read_only=True)
    persona_crea_nombre = serializers.CharField(source='id_persona_crea.nombre_completo', read_only=True)
    total_facturas = serializers.SerializerMethodField()
    valor_total_calculado = serializers.SerializerMethodField()
    
    class Meta:
        model = CobroCoactivo
        fields = [
            'id_cobro_coactivo', 'consecutivo', 'descripcion', 'estado', 'fecha_registro', 
            'fecha_inicio_coactivo', 'fecha_limite_pago', 'valor_total_deuda', 'valor_intereses',
            'valor_costas_procesales', 'fecha_creacion', 'cobro_persuasivo_consecutivo',
            'accion_cobro_nombre', 'persona_crea_nombre', 'total_facturas', 'valor_total_calculado'
        ]

    def get_total_facturas(self, obj):
        """Obtener el total de facturas asociadas"""
        return CoactivoFacturas.objects.filter(cobro_coactivo=obj).count()

    def get_valor_total_calculado(self, obj):
        """Calcular el valor total"""
        total = (obj.valor_total_deuda or 0) + (obj.valor_intereses or 0) + (obj.valor_costas_procesales or 0)
        return total


class CoactivoFacturasSerializer(serializers.ModelSerializer):
    """Serializer para la relación CoactivoFacturas"""
    
    factura_info = serializers.SerializerMethodField()
    cobro_coactivo_consecutivo = serializers.CharField(source='cobro_coactivo.consecutivo', read_only=True)
    
    class Meta:
        model = CoactivoFacturas
        fields = [
            'id_coactivo_facturas', 'factura', 'cobro_coactivo', 'valor_capital',
            'valor_intereses', 'fecha_inclusion', 'factura_info', 'cobro_coactivo_consecutivo'
        ]
        read_only_fields = ['id_coactivo_facturas', 'fecha_inclusion']

    def get_factura_info(self, obj):
        """Obtener información de la factura"""
        if obj.factura:
            factura = obj.factura
            return {
                'id_factura': factura.id_factura_unica,
                'nro_factura': factura.nro_factura_unica,
                'valor_neto': factura.valor_neto,
                'fecha_compra': factura.fecha_compra,
                'nombre_comprador': factura.id_persona_comprador.nombre_completo if factura.id_persona_comprador else None
            }
        return None


class CobroCoactivoUpdateSerializer(serializers.ModelSerializer):
    """Serializer específico para actualizar cobros coactivos (acciones)"""
    
    class Meta:
        model = CobroCoactivo
        fields = [
            'cod_accion_registrada', 'descripcion', 'consecutivo', 'estado',
            'fecha_registro', 'fecha_inicio_coactivo', 'fecha_limite_pago',
            'id_accion_cobro_persuasivo', 'nombre_recaudador', 'email_recaudador',
            'celular_recaudador', 'valor_total_deuda', 'valor_intereses',
            'valor_costas_procesales', 'aplicar_plantilla', 'documento_adjunto'
        ]
        read_only_fields = ['id_cobro_coactivo', 'fecha_creacion', 'fecha_actualizacion', 'id_persona_crea']

    def validate_id_accion_cobro_persuasivo(self, value):
        """Validar que la acción sea de tipo COACTIVO"""
        if value:
            # Si el valor es un objeto AccionesCobroPersuasivo, obtener su ID
            if hasattr(value, 'id_accion_cobro_persuasivo'):
                value = value.id_accion_cobro_persuasivo
            
            try:
                accion = AccionesCobroPersuasivo.objects.get(id_accion_cobro_persuasivo=value)
                if accion.tipo_cobro != 'COACTIVO':
                    raise serializers.ValidationError("La acción debe ser de tipo COACTIVO.")
                if not accion.activo:
                    raise serializers.ValidationError("La acción debe estar activa.")
                # Retornar la instancia del modelo, no el ID
                return accion
            except AccionesCobroPersuasivo.DoesNotExist:
                raise serializers.ValidationError("La acción de cobro no existe.")
        return value

    def validate_fecha_registro(self, value):
        """Validar la fecha de registro"""
        if value:
            from datetime import datetime
            # Permitir fechas pasadas y futuras para flexibilidad en edición
            if isinstance(value, str):
                try:
                    # Intentar parsear la fecha si viene como string
                    from django.utils.dateparse import parse_datetime
                    parsed_date = parse_datetime(value)
                    if parsed_date:
                        return parsed_date
                except:
                    pass
        return value

    def validate_estado(self, value):
        """Validar el estado del cobro coactivo"""
        estados_validos = ['ACTIVO', 'FINALIZADO', 'SUSPENDIDO']
        if value not in estados_validos:
            raise serializers.ValidationError(f"El estado debe ser uno de: {', '.join(estados_validos)}")
        return value

    def validate_documento_adjunto(self, value):
        """Validar el archivo adjunto"""
        if value:
            nombre_archivo = getattr(value, 'name', '')
            tamaño_archivo = getattr(value, 'size', 0)
            extension = nombre_archivo.split('.')[-1].lower() if '.' in nombre_archivo else ''
            extensiones_permitidas = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'}
            tamaño_maximo = 10 * 1024 * 1024  # 10 MB

            if extension not in extensiones_permitidas:
                raise serializers.ValidationError("Formato de archivo no permitido. Use PDF, DOC, DOCX, JPG, JPEG o PNG.")

            if tamaño_archivo > tamaño_maximo:
                raise serializers.ValidationError("El archivo supera el tamaño máximo permitido de 10MB.")
        
        return value

    def update(self, instance, validated_data):
        """Actualizar la instancia del cobro coactivo"""
        # Usar el método update por defecto de ModelSerializer
        return super().update(instance, validated_data)


class ConvertirPersuasivoACoactivoSerializer(serializers.Serializer):
    """Serializer para convertir cobros persuasivos a coactivos"""
    
    cobros_persuasivos = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="Lista de IDs de cobros persuasivos a convertir"
    )
    descripcion = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Descripción adicional para el cobro coactivo"
    )
    id_accion_cobro_persuasivo = serializers.IntegerField(
        required=True,
        help_text="ID de la acción de cobro coactivo a aplicar"
    )
    fecha_limite_pago = serializers.DateTimeField(
        required=False,
        help_text="Fecha límite para el pago"
    )
    valor_intereses = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        help_text="Valor de intereses a aplicar"
    )
    valor_costas_procesales = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        help_text="Valor de costas procesales"
    )

    def validate_cobros_persuasivos(self, value):
        """Validar que los cobros persuasivos existan y no tengan ya cobros coactivos"""
        if not value:
            raise serializers.ValidationError("Debe proporcionar al menos un cobro persuasivo.")
        
        # Verificar que existan los cobros persuasivos
        cobros_existentes = CobroPersuasivo.objects.filter(id_cobro_persuasivo__in=value)
        if cobros_existentes.count() != len(value):
            ids_no_encontrados = set(value) - set(cobros_existentes.values_list('id_cobro_persuasivo', flat=True))
            raise serializers.ValidationError(f"Los siguientes IDs de cobros persuasivos no existen: {list(ids_no_encontrados)}")
        
        # Verificar que no tengan ya cobros coactivos activos
        cobros_con_coactivos = CobroCoactivo.objects.filter(
            cobro_persuasivo__id_cobro_persuasivo__in=value,
            estado__in=['ACTIVO', 'SUSPENDIDO']
        ).values_list('cobro_persuasivo__id_cobro_persuasivo', flat=True)
        
        if cobros_con_coactivos:
            raise serializers.ValidationError(f"Los siguientes cobros persuasivos ya tienen cobros coactivos activos: {list(cobros_con_coactivos)}")
        
        return value

    def validate_id_accion_cobro_persuasivo(self, value):
        """Validar que la acción sea de tipo COACTIVO"""
        try:
            accion = AccionesCobroPersuasivo.objects.get(id_accion_cobro_persuasivo=value)
            if accion.tipo_cobro != 'COACTIVO':
                raise serializers.ValidationError("La acción debe ser de tipo COACTIVO.")
        except AccionesCobroPersuasivo.DoesNotExist:
            raise serializers.ValidationError("La acción de cobro especificada no existe.")
        return value