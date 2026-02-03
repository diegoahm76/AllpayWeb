from rest_framework import serializers
from recaudos.models.documento_models import PlantillasDoc, DocumentosGenerados, AsignacionDocs
from recaudos.models.recaudos_models import ConfiguracionConsecutivo, FacturaUnica, LiquidacionesFacturaUnica, Pagos, PorcentajesCobro
from docxtpl import DocxTemplate
from recaudos.utils import Utils
import os
from seguridad.models.transversal_models import Personas
from seguridad.utils import Util
from recaudos.models.recaudos_models import DetallesFacturaUnica, TiposCacao
from django.db.models import Sum
from recaudos.serializers.tipos_cacao_serializers import DetallesFacturaUnicaSerializer
from ..models import TRM, BolsaNY, Department, Municipality, ProduccionCacaoHistorico, ProduccionDepartamentoAnual, RendimientoCensoDepartamento
from seguridad.models.transversal_models import Departamento


class DetalleFacturaOptimizadoSerializer(serializers.ModelSerializer):
    """Serializer optimizado para los detalles de factura en el tablero con información completa pero eficiente"""
    
    # Información básica del detalle
    nombre_tipo_cacao = serializers.CharField(source='id_tipo_cacao.nombre', read_only=True)
    
    # Información de la factura (ya disponible desde la relación)
    nombre_municipio_cacao = serializers.CharField(source='id_factura_unica.id_municipio_cacao.nombre', read_only=True)
    nombre_departamento_cacao = serializers.CharField(source='id_factura_unica.id_departamento_cacao.nombre', read_only=True)
    nombre_vereda = serializers.CharField(source='id_factura_unica.nombre_vereda', read_only=True)
    nombre_finca = serializers.CharField(source='id_factura_unica.nombre_finca', read_only=True)
    nro_documento_soporte = serializers.CharField(source='id_factura_unica.nro_documento_soporte', read_only=True)
    estado_factura = serializers.CharField(source='id_factura_unica.estado_factura', read_only=True)
    
    # Información del porcentaje (ya disponible desde la relación)
    id_porcentaje_cobro = serializers.IntegerField(source='id_factura_unica.id_porcentaje_cobro.id_porcentaje_cobro', read_only=True)
    valor_porcentaje_cobro = serializers.DecimalField(source='id_factura_unica.id_porcentaje_cobro.valor', max_digits=10, decimal_places=4, read_only=True)
    cod_tipo_cobro = serializers.CharField(source='id_factura_unica.id_porcentaje_cobro.cod_tipo_cobro', read_only=True)
    nombre_tipo_cobro = serializers.SerializerMethodField()
    
    # Valores calculados
    valor_bruto = serializers.SerializerMethodField()
    cuota_fomento = serializers.SerializerMethodField()
    valor_neto = serializers.SerializerMethodField()
    
    # Estados de liquidación
    cod_estado_liquidacion = serializers.SerializerMethodField()
    cod_estado_liquidacion_display = serializers.SerializerMethodField()
    
    # URLs y documentos
    doc_soporte = serializers.FileField(source='id_factura_unica.doc_soporte', read_only=True)
    doc_soporte_url = serializers.SerializerMethodField()
    doc_pago_liquidacion = serializers.SerializerMethodField()
    
    # Información simplificada de proveedor y recaudador
    proveedor_info = serializers.SerializerMethodField()
    recaudador_info = serializers.SerializerMethodField()
    
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
    
    def get_nombre_tipo_cobro(self, obj):
        tipos = {
            'CF': 'Cuota de Fomento',
            'OT': 'Otro'
        }
        return tipos.get(obj.id_factura_unica.id_porcentaje_cobro.cod_tipo_cobro, 'Desconocido')
    
    def get_valor_bruto(self, obj):
        return obj.nro_kilos * obj.valor_kilo
    
    def get_cuota_fomento(self, obj):
        valor_bruto = obj.nro_kilos * obj.valor_kilo
        porcentaje_obj = getattr(obj.id_factura_unica, 'id_porcentaje_cobro', None)
        porcentaje = getattr(porcentaje_obj, 'valor', 0) if porcentaje_obj else 0
        return valor_bruto * porcentaje
    
    def get_valor_neto(self, obj):
        valor_bruto = obj.nro_kilos * obj.valor_kilo
        porcentaje_obj = getattr(obj.id_factura_unica, 'id_porcentaje_cobro', None)
        porcentaje = getattr(porcentaje_obj, 'valor', 0) if porcentaje_obj else 0
        cuota_fomento = valor_bruto * porcentaje
        return valor_bruto - cuota_fomento
    
    def get_cod_estado_liquidacion(self, obj):
        if obj.id_factura_unica.id_liq_factura_unica:
            return obj.id_factura_unica.id_liq_factura_unica.cod_estado
        return "No liquidado"
    
    def get_cod_estado_liquidacion_display(self, obj):
        if obj.id_factura_unica.id_liq_factura_unica:
            estados = {
                'CR': 'Creado',
                'LQ': 'Liquidado', 
                'P': 'Pagado'
            }
            return estados.get(obj.id_factura_unica.id_liq_factura_unica.cod_estado, obj.id_factura_unica.id_liq_factura_unica.cod_estado)
        return 'No liquidado'
    
    def get_doc_soporte_url(self, obj):
        if obj.id_factura_unica.doc_soporte:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.id_factura_unica.doc_soporte.url)
        return None
    
    def get_doc_pago_liquidacion(self, obj):
        if obj.id_factura_unica.id_liq_factura_unica:
            return {
                'numero_documento': obj.id_factura_unica.id_liq_factura_unica.nro_doc_pago,
                'banco': None,
                'valor_pago': obj.id_factura_unica.id_liq_factura_unica.valor_pagar
            }
        return None
    
    def get_proveedor_info(self, obj):
        proveedor = obj.id_factura_unica.id_persona_proveedor
        if proveedor:
            # Nombre completo para persona natural o razón social para jurídica
            if proveedor.tipo_persona == 'N':
                nombre = f"{proveedor.primer_nombre or ''} {proveedor.segundo_nombre or ''} {proveedor.primer_apellido or ''} {proveedor.segundo_apellido or ''}".strip()
            else:
                nombre = proveedor.razon_social or proveedor.nombre_comercial or ''
            
            return {
                "id_proveedor": proveedor.id_persona,
                'nombre_completo_o_comercial': nombre,
                'tipo_documento': proveedor.tipo_documento.nombre if proveedor.tipo_documento else None,
                'numero_documento': proveedor.numero_documento,
                'municipio': proveedor.cod_municipio_expedicion_id.nombre if proveedor.cod_municipio_expedicion_id else None,
                'departamento': proveedor.cod_municipio_expedicion_id.cod_departamento.nombre if proveedor.cod_municipio_expedicion_id and proveedor.cod_municipio_expedicion_id.cod_departamento else None
            }
        return None
    
    def get_recaudador_info(self, obj):
        recaudador = obj.id_factura_unica.id_persona_recaudador
        if recaudador:
            # Nombre completo para persona natural o razón social para jurídica
            if recaudador.tipo_persona == 'N':
                nombre = f"{recaudador.primer_nombre or ''} {recaudador.segundo_nombre or ''} {recaudador.primer_apellido or ''} {recaudador.segundo_apellido or ''}".strip()
            else:
                nombre = recaudador.razon_social or recaudador.nombre_comercial or ''
            
            return {
                "id_recaudador": recaudador.id_persona,
                'fecha_compra': obj.id_factura_unica.fecha_compra.isoformat() if obj.id_factura_unica.fecha_compra else None,
                'fecha_registro': obj.id_factura_unica.fecha_creacion.isoformat() if obj.id_factura_unica.fecha_creacion else None,
                'tipo_documento': recaudador.tipo_documento.nombre if recaudador.tipo_documento else None,
                'numero_documento': recaudador.numero_documento,
                'nombre_completo_o_comercial': nombre,
                'telefono': recaudador.telefono_celular or recaudador.telefono_empresa,
                'email': recaudador.email or recaudador.email_empresarial,
                'direccion_notificaciones': recaudador.direccion_notificaciones,
                'municipio': recaudador.cod_municipio_expedicion_id.nombre if recaudador.cod_municipio_expedicion_id else None,
                'departamento': recaudador.cod_municipio_expedicion_id.cod_departamento.nombre if recaudador.cod_municipio_expedicion_id and recaudador.cod_municipio_expedicion_id.cod_departamento else None,
                'nro_factura_unica': obj.id_factura_unica.nro_factura_unica,
                'cod_tipo_comprador': getattr(recaudador, 'cod_tipo_comprador', 'C'),
                'nombres_tipo_comprador': 'Comerciante'  # Por defecto
            }
        return None


class FacturaUnicaRecaudadorSerializer(serializers.ModelSerializer):
    tipo_documento_proveedor = serializers.CharField(source='id_persona_proveedor.tipo_documento')
    nro_documento_proveedor = serializers.CharField(source='id_persona_proveedor.numero_documento')
    municipio_cacao_nombre = serializers.CharField(source='id_municipio_cacao.nombre')
    departamento_cacao_nombre = serializers.CharField(source='id_departamento_cacao.nombre')
    nombre_proveedor = serializers.SerializerMethodField()
    valores_kilo = serializers.SerializerMethodField()

    class Meta:
        model = FacturaUnica
        fields = [
            'id_persona_recaudador',
            'nro_factura_unica',
            'fecha_compra',
            'tipo_documento_proveedor',
            'nro_documento_proveedor',
            'nombre_proveedor',
            'municipio_cacao_nombre',
            'departamento_cacao_nombre',
            'total_kilos',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            'valores_kilo',
        ]

    def get_nombre_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor.tipo_persona == 'N':
            return f"{proveedor.primer_nombre} {proveedor.primer_apellido}"
        else:
            return proveedor.razon_social or proveedor.nombre_comercial

    def get_valores_kilo(self, obj):  # Cambia aquí
        detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=obj)
        return [float(detalle.valor_kilo) for detalle in detalles]

class PrecioNacionalCacaoSerializer(serializers.Serializer):
    """Serializer para el reporte de precio nacional del cacao"""
    nit_cc_recaudador = serializers.CharField()
    nombre_recaudador = serializers.CharField()
    tipo_recaudador = serializers.CharField()
    total_kilos = serializers.IntegerField()
    precio_promedio = serializers.IntegerField()
    total_valor_cuota_fomento = serializers.IntegerField()
    total_valor_intereses = serializers.IntegerField()

class ConsolidadoProduccionNacionalCacaoSerializer(serializers.Serializer):
    """Serializer para el reporte consolidado de producción nacional de cacao"""
    departamento = serializers.CharField()
    municipio = serializers.CharField()
    
    # Enero - Orden: Kilos, Toneladas, Cuota Fomento
    enero_total_kilos = serializers.IntegerField()
    enero_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    enero_total_cuota_fomento = serializers.IntegerField()
    
    # Febrero - Orden: Kilos, Toneladas, Cuota Fomento
    febrero_total_kilos = serializers.IntegerField()
    febrero_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    febrero_total_cuota_fomento = serializers.IntegerField()
    
    # Marzo - Orden: Kilos, Toneladas, Cuota Fomento
    marzo_total_kilos = serializers.IntegerField()
    marzo_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    marzo_total_cuota_fomento = serializers.IntegerField()
    
    # Abril - Orden: Kilos, Toneladas, Cuota Fomento
    abril_total_kilos = serializers.IntegerField()
    abril_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    abril_total_cuota_fomento = serializers.IntegerField()
    
    # Mayo - Orden: Kilos, Toneladas, Cuota Fomento
    mayo_total_kilos = serializers.IntegerField()
    mayo_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    mayo_total_cuota_fomento = serializers.IntegerField()
    
    # Junio - Orden: Kilos, Toneladas, Cuota Fomento
    junio_total_kilos = serializers.IntegerField()
    junio_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    junio_total_cuota_fomento = serializers.IntegerField()
    
    # Julio - Orden: Kilos, Toneladas, Cuota Fomento
    julio_total_kilos = serializers.IntegerField()
    julio_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    julio_total_cuota_fomento = serializers.IntegerField()
    
    # Agosto - Orden: Kilos, Toneladas, Cuota Fomento
    agosto_total_kilos = serializers.IntegerField()
    agosto_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    agosto_total_cuota_fomento = serializers.IntegerField()
    
    # Septiembre - Orden: Kilos, Toneladas, Cuota Fomento
    septiembre_total_kilos = serializers.IntegerField()
    septiembre_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    septiembre_total_cuota_fomento = serializers.IntegerField()
    
    # Octubre - Orden: Kilos, Toneladas, Cuota Fomento
    octubre_total_kilos = serializers.IntegerField()
    octubre_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    octubre_total_cuota_fomento = serializers.IntegerField()
    
    # Noviembre - Orden: Kilos, Toneladas, Cuota Fomento
    noviembre_total_kilos = serializers.IntegerField()
    noviembre_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    noviembre_total_cuota_fomento = serializers.IntegerField()
    
    # Diciembre - Orden: Kilos, Toneladas, Cuota Fomento
    diciembre_total_kilos = serializers.IntegerField()
    diciembre_total_toneladas = serializers.DecimalField(max_digits=10, decimal_places=3)
    diciembre_total_cuota_fomento = serializers.IntegerField()
    
    # Totales anuales - Orden: Kilos, Toneladas, Cuota Fomento
    total_kilos_anual = serializers.IntegerField()
    total_toneladas_anual = serializers.DecimalField(max_digits=10, decimal_places=3)
    total_cuota_fomento_anual = serializers.IntegerField()


class ReportePagosEnLineaSerializer(serializers.ModelSerializer):
    fecha_registro = serializers.SerializerMethodField()
    nit_recaudador = serializers.ReadOnlyField(source='id_persona_recaudador.numero_documento')
    nombre_recaudador = serializers.SerializerMethodField()
    fecha_compra = serializers.SerializerMethodField()
    cuota_fomento = serializers.SerializerMethodField()
    valor_interes = serializers.SerializerMethodField()
    fecha_pago = serializers.SerializerMethodField()
    nro_comprobante = serializers.ReadOnlyField(source='id_liq_factura_unica.nro_doc_pago')

    class Meta:
        model = FacturaUnica
        fields = [
            'fecha_registro',
            'nit_recaudador',
            'nombre_recaudador',
            'fecha_compra',
            'nro_factura_unica',
            'cuota_fomento',
            'valor_interes',
            'fecha_pago',
            'nro_comprobante'
        ]

    def get_fecha_registro(self, obj):
        if obj.id_liq_factura_unica and obj.id_liq_factura_unica.fecha_liquidacion:
            return obj.id_liq_factura_unica.fecha_liquidacion.strftime('%d-%m-%Y')
        return ''

    def get_fecha_pago(self, obj):
        if obj.id_liq_factura_unica and obj.id_liq_factura_unica.fecha_pago:
            return obj.id_liq_factura_unica.fecha_pago.strftime('%d-%m-%Y')
        return ''
    
    def get_fecha_compra(self, obj):
        if obj.fecha_compra:
            return obj.fecha_compra.strftime('%d-%m-%Y')
    
    def get_cuota_fomento(self, obj):
        if obj.cuota_fomento:
            return Utils.formato_peso(obj.cuota_fomento)

    def get_valor_interes(self, obj):
        if obj.id_liq_factura_unica and obj.id_liq_factura_unica.valor_intereses:
            return Utils.formato_peso(obj.id_liq_factura_unica.valor_intereses)
        return Utils.formato_peso(0)
    
    # def get_dias_mora(self, obj):
    #     mes_fecha_compra = obj.fecha_compra.month + 1 if obj.fecha_compra.month < 12 else 1
    #     anio_fecha_compra = obj.fecha_compra.year if mes_fecha_compra > 1 else obj.fecha_compra.year + 1
    #     fecha_cierre = FechasCierre.objects.filter(cod_tipo_cobro_fecha='PI').first()
    #     dia_limite = fecha_cierre.dias_pago if fecha_cierre else 10
    #     fecha_limite_pago = datetime(anio_fecha_compra, mes_fecha_compra, dia_limite)
    #     dias_mora = (now().date() - fecha_limite_pago.date()).days
    #     if dias_mora < 0:
    #         dias_mora = 0
    #     return dias_mora
    
    # def get_valor_intereses(self, obj):
    #     tasa_dian = PorcentajesCobro.objects.filter(cod_tipo_cobro='PI').first()
    #     tasa_dian = tasa_dian.valor if tasa_dian else 0
    #     dias_mora = self.get_dias_mora(obj)
    #     valor_intereses = 0.00
    #     if dias_mora is None:
    #         return valor_intereses
    #     else:
    #         cuota_fomento = obj.cuota_fomento
    #         if cuota_fomento > 0:
    #             valor_intereses = (cuota_fomento * Decimal(tasa_dian) * dias_mora) / Decimal('365')
    #             return round(valor_intereses, 2)
    #         else:
    #             return valor_intereses

    def get_nombre_recaudador(self, obj):
        persona = obj.id_persona_recaudador
        if persona:
            if persona.tipo_persona == 'N':
                return ' '.join(filter(None, [
                    persona.primer_nombre,
                    persona.segundo_nombre,
                    persona.primer_apellido,
                    persona.segundo_apellido
                ])).strip()
            else:
                return persona.razon_social or persona.nombre_comercial
        return ''


# class ReporteConsolidadoSerializer(serializers.ModelSerializer):
#     tipo_documento_proveedor = serializers.CharField(source='id_persona_proveedor.tipo_documento')
#     nro_documento_proveedor = serializers.CharField(source='id_persona_proveedor.numero_documento')
#     municipio_cacao_nombre = serializers.CharField(source='id_municipio_cacao.nombre')
#     departamento_cacao_nombre = serializers.CharField(source='id_departamento_cacao.nombre')
#     nombre_proveedor = serializers.SerializerMethodField()
#     valores_kilo = serializers.SerializerMethodField()
#     nro_documento_soporte = serializers.CharField(read_only=True)
#     doc_pago_url = serializers.SerializerMethodField()
#     nombre_recaudador = serializers.SerializerMethodField()
#     tipo_documento_recaudador = serializers.CharField(source='id_persona_recaudador.tipo_documento', read_only=True)
#     nro_documento_recaudador = serializers.CharField(source='id_persona_recaudador.numero_documento', read_only=True)
#     fecha_pago = serializers.SerializerMethodField()
#     nro_doc_pago = serializers.SerializerMethodField()
#     class Meta:
#         model = FacturaUnica
#         fields = [
#             'id_persona_recaudador',
#             'nombre_recaudador',
#             'tipo_documento_recaudador',
#             'nro_documento_recaudador',
#             'nro_factura_unica',
#             'fecha_compra',
#             'fecha_creacion',
#             'tipo_documento_proveedor',
#             'nro_documento_proveedor',
#             'nombre_proveedor',
#             'id_municipio_cacao',
#             'municipio_cacao_nombre',
#             'id_departamento_cacao',
#             'departamento_cacao_nombre',
#             'total_kilos',
#             'valor_bruto',
#             'cuota_fomento',
#             'valor_neto',
#             'valores_kilo',
#             'nro_documento_soporte',
#             'doc_pago_url',
#             'fecha_pago',
#             'nro_doc_pago',
#         ]

#     def get_nombre_proveedor(self, obj):
#         proveedor = obj.id_persona_proveedor
#         if proveedor.tipo_persona == 'N':
#             return f"{proveedor.primer_nombre} {proveedor.primer_apellido}"
#         else:
#             return proveedor.razon_social or proveedor.nombre_comercial

#     def get_valores_kilo(self, obj):
#         detalles = DetallesFacturaUnica.objects.filter(id_factura_unica=obj)
#         return [float(detalle.valor_kilo) for detalle in detalles]

#     def get_doc_pago_url(self, obj):
#         liq = getattr(obj, 'id_liq_factura_unica', None)
#         if liq and liq.doc_pago:
#             if hasattr(liq.doc_pago, "documento_generado") and liq.doc_pago.documento_generado:
#                 archivo = liq.doc_pago.documento_generado
#                 if hasattr(archivo, "name") and archivo.name:
#                     return Util.obtener_archivos(archivo.name)
#             if hasattr(liq.doc_pago, "name") and liq.doc_pago.name:
#                 return Util.obtener_archivos(liq.doc_pago.name)
#         return None
    
#     def get_fecha_pago(self, obj):
#         liq = getattr(obj, 'id_liq_factura_unica', None)
#         if liq and liq.fecha_pago:
#             return liq.fecha_pago.strftime('%d/%m/%Y')
#         return None
    
#     def get_nro_doc_pago(self, obj):
#         if obj.id_liq_factura_unica:
#             return obj.id_liq_factura_unica.nro_doc_pago
#         return None

#     def get_nombre_recaudador(self, obj):
#         recaudador = obj.id_persona_recaudador
#         if recaudador.tipo_persona == 'N':
#             return f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
#         else:
#             return recaudador.razon_social or recaudador.nombre_comercial


class ReporteConsolidadoSerializer(serializers.ModelSerializer):
    id_persona_recaudador = serializers.CharField(source='id_factura_unica.id_persona_recaudador', read_only=True)
    nombre_recaudador = serializers.SerializerMethodField()
    tipo_documento_recaudador = serializers.CharField(source='id_factura_unica.id_persona_recaudador.tipo_documento', read_only=True)
    nro_documento_recaudador = serializers.CharField(source='id_factura_unica.id_persona_recaudador.numero_documento', read_only=True)
    nombre_tipo_cacao = serializers.CharField(source='id_tipo_cacao.nombre', read_only=True)
    nro_factura_unica = serializers.CharField(source='id_factura_unica.nro_factura_unica', read_only=True)
    fecha_compra = serializers.CharField(source='id_factura_unica.fecha_compra', read_only=True)
    fecha_creacion = serializers.CharField(source='id_factura_unica.fecha_creacion', read_only=True)
    tipo_documento_proveedor = serializers.CharField(source='id_factura_unica.id_persona_proveedor.tipo_documento', read_only=True)
    nro_documento_proveedor = serializers.CharField(source='id_factura_unica.id_persona_proveedor.numero_documento', read_only=True)
    nombre_proveedor = serializers.SerializerMethodField()
    id_municipio_cacao = serializers.IntegerField(source='id_factura_unica.id_municipio_cacao.id', read_only=True)
    municipio_cacao_nombre = serializers.CharField(source='id_factura_unica.id_municipio_cacao.nombre', read_only=True)
    id_departamento_cacao = serializers.IntegerField(source='id_factura_unica.id_departamento_cacao.id', read_only=True)
    departamento_cacao_nombre = serializers.CharField(source='id_factura_unica.id_departamento_cacao.nombre', read_only=True)
    total_kilos = serializers.SerializerMethodField()
    valor_bruto = serializers.FloatField(source='id_factura_unica.valor_bruto', read_only=True)
    cuota_fomento = serializers.FloatField(source='id_factura_unica.cuota_fomento', read_only=True)
    valor_neto = serializers.FloatField(source='id_factura_unica.valor_neto', read_only=True)
    nro_documento_soporte = serializers.CharField(source='id_factura_unica.nro_documento_soporte', read_only=True)
    doc_pago_url = serializers.SerializerMethodField()
    fecha_pago = serializers.CharField(source='id_factura_unica.id_liq_factura_unica.fecha_pago', read_only=True)
    nro_doc_pago = serializers.CharField(source='id_factura_unica.id_liq_factura_unica.nro_doc_pago', read_only=True)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Cache del porcentaje para evitar consultas repetidas
        self._porcentaje_cacao = None
    class Meta:
        model = DetallesFacturaUnica
        fields = [
            'id_persona_recaudador',
            'nombre_recaudador',
            'tipo_documento_recaudador',
            'nro_documento_recaudador',
            'id_tipo_cacao',
            'nombre_tipo_cacao',
            'nro_factura_unica',
            'fecha_compra',
            'fecha_creacion',
            'tipo_documento_proveedor',
            'nro_documento_proveedor',
            'nombre_proveedor',
            'id_municipio_cacao',
            'municipio_cacao_nombre',
            'id_departamento_cacao',
            'departamento_cacao_nombre',
            'total_kilos',
            'nro_kilos',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            'valor_kilo',
            'nro_documento_soporte',
            'doc_pago_url',
            'fecha_pago',
            'nro_doc_pago',
        ]

    def get_total_kilos(self, obj):
        # Cache del porcentaje para evitar consultas repetidas
        if self._porcentaje_cacao is None:
            porcentaje_obj = PorcentajesCobro.objects.filter(cod_tipo_cobro='PC').first()
            self._porcentaje_cacao = porcentaje_obj.valor if porcentaje_obj else 1
        
        if obj.id_tipo_cacao.nombre == 'Cacao en baba':
            return obj.nro_kilos * self._porcentaje_cacao
        else:
            return obj.nro_kilos

    def get_nombre_proveedor(self, obj):
        proveedor = obj.id_factura_unica.id_persona_proveedor
        if proveedor.tipo_persona == 'N':
            return f"{proveedor.primer_nombre} {proveedor.primer_apellido}"
        else:
            return proveedor.razon_social or proveedor.nombre_comercial

    def get_doc_pago_url(self, obj):
        # Temporalmente deshabilitado para testing - puede estar causando el cuello de botella
        return None
        
        # # Usar la relación ya cargada en lugar de hacer una nueva consulta
        # liq = obj.id_factura_unica.id_liq_factura_unica
        # if liq and liq.doc_pago:
        #     if hasattr(liq.doc_pago, "documento_generado") and liq.doc_pago.documento_generado:
        #         archivo = liq.doc_pago.documento_generado
        #         if hasattr(archivo, "name") and archivo.name:
        #             return Util.obtener_archivos(archivo.name)
        #     if hasattr(liq.doc_pago, "name") and liq.doc_pago.name:
        #         return Util.obtener_archivos(liq.doc_pago.name)
        # return None
    
    # Eliminados get_fecha_pago y get_nro_doc_pago porque ahora se usan campos directos

    def get_nombre_recaudador(self, obj):
        recaudador = obj.id_factura_unica.id_persona_recaudador
        if recaudador.tipo_persona == 'N':
            return f"{recaudador.primer_nombre} {recaudador.primer_apellido}"
        else:
            return recaudador.razon_social or recaudador.nombre_comercial


class LibroCompraConsolidadoSerializer(serializers.ModelSerializer):
    tipo_documento_recaudador = serializers.CharField(source='id_persona_recaudador.tipo_documento.nombre', read_only=True)
    numero_doc_recaudador = serializers.CharField(source='id_persona_recaudador.numero_documento', read_only=True)
    nombre_recaudador = serializers.SerializerMethodField()
    tipo_documento_proveedor = serializers.CharField(source='id_persona_proveedor.tipo_documento.nombre', read_only=True)
    numero_doc_proveedor = serializers.CharField(source='id_persona_proveedor.numero_documento', read_only=True)
    municipio_cacao_nombre = serializers.CharField(source='id_municipio_cacao.nombre', read_only=True)
    departamento_cacao_nombre = serializers.CharField(source='id_departamento_cacao.nombre', read_only=True)
    kilos_comprados = serializers.FloatField(source='total_kilos', read_only=True)
    precio_kilo = serializers.SerializerMethodField()
    nombreproveedor = serializers.SerializerMethodField()
    estado_factura_display = serializers.SerializerMethodField()

    class Meta:
        model = FacturaUnica
        fields = [
            'tipo_documento_recaudador',
            'numero_doc_recaudador',
            'nombre_recaudador',
            'fecha_compra',
            'nro_factura_unica',
            'tipo_documento_proveedor',
            'numero_doc_proveedor',
            'nombreproveedor',
            'municipio_cacao_nombre',
            'departamento_cacao_nombre',
            'kilos_comprados',
            'precio_kilo',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            'estado_factura',
            'estado_factura_display',
        ]

    def get_nombre_recaudador(self, obj):
        rec = obj.id_persona_recaudador
        if rec.tipo_persona == 'N':
            return f"{rec.primer_nombre or ''} {rec.segundo_nombre or ''} {rec.primer_apellido or ''} {rec.segundo_apellido or ''}".strip()
        return rec.razon_social or rec.nombre_comercial or ''
    
    def get_nombreproveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor:
            if proveedor.tipo_persona == 'N':
                return f"{proveedor.primer_nombre or ''} {proveedor.primer_apellido or ''}".strip()
            else:
                return proveedor.razon_social or proveedor.nombre_comercial or ''
        return ''

    def get_precio_kilo(self, obj):
        if obj.total_kilos:
            return float(obj.valor_bruto) / float(obj.total_kilos)
        return 0
    
    def get_estado_factura_display(self, obj):
        """Devuelve el nombre legible del estado de la factura"""
        estado_choices = {
            'CR': 'Creado',
            'LQ': 'Liquidado', 
            'AC': 'Acuerdo Pago',
            'PA': 'Pagado',
            'PC': 'Proceso Coativo',
            'PP': 'Proceso Presuasivo'
        }
        return estado_choices.get(obj.estado_factura, obj.estado_factura)
    

class TableroComprasDetalladoSerializer(serializers.ModelSerializer):
    """Serializer detallado para tablero de compras con información completa de la factura"""
    
    # Información del proveedor
    nit_proveedor = serializers.CharField(source='id_persona_proveedor.numero_documento', read_only=True)
    tipo_documento_proveedor = serializers.CharField(source='id_persona_proveedor.tipo_documento.nombre', read_only=True)
    nombre_proveedor = serializers.SerializerMethodField()
    telefono_proveedor = serializers.SerializerMethodField()
    email_proveedor = serializers.SerializerMethodField()
    direccion_proveedor = serializers.SerializerMethodField()
    
    # Información del recaudador
    nombre_recaudador = serializers.SerializerMethodField()
    nro_documento_recaudador = serializers.CharField(source='id_persona_recaudador.numero_documento', read_only=True)
    tipo_documento_recaudador = serializers.CharField(source='id_persona_recaudador.tipo_documento.nombre', read_only=True)
    telefono_recaudador = serializers.SerializerMethodField()
    email_recaudador = serializers.SerializerMethodField()
    direccion_recaudador = serializers.SerializerMethodField()
    
    # Información de ubicación
    nombre_municipio = serializers.CharField(source='id_municipio_cacao.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='id_departamento_cacao.nombre', read_only=True)
    
    # Información de liquidación
    cod_estado_liquidacion = serializers.SerializerMethodField()
    cod_estado_liquidacion_display = serializers.SerializerMethodField()
    fecha_pago_liquidacion = serializers.SerializerMethodField()
    doc_pago_liquidacion = serializers.SerializerMethodField()
    
    # Estado legible
    estado_factura = serializers.SerializerMethodField()
    
    # Información de porcentaje de cobro
    porcentaje_cobro = serializers.SerializerMethodField()
    tipo_cobro = serializers.SerializerMethodField()
    
    # URL del documento soporte
    doc_soporte_url = serializers.SerializerMethodField()
    
    # Detalles de la factura
    detalles = serializers.SerializerMethodField()

    class Meta:
        model = FacturaUnica
        fields = [
            'id_factura_unica',
            'fecha_compra',
            'nro_factura_unica',
            'nro_documento_soporte',
            
            # Proveedor
            'id_persona_proveedor',
            'nit_proveedor',
            'tipo_documento_proveedor',
            'nombre_proveedor',
            'telefono_proveedor',
            'email_proveedor',
            'direccion_proveedor',
            
            # Recaudador
            'id_persona_recaudador',
            'nombre_recaudador',
            'nro_documento_recaudador',
            'tipo_documento_recaudador',
            'telefono_recaudador',
            'email_recaudador',
            'direccion_recaudador',
            
            # Ubicación
            'id_municipio_cacao',
            'nombre_municipio',
            'id_departamento_cacao',
            'nombre_departamento',
            'nombre_vereda',
            'nombre_finca',
            
            # Valores
            'total_kilos',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            
            # Estado y liquidación
            'estado_factura',
            'cod_estado_liquidacion',
            'cod_estado_liquidacion_display',
            'fecha_pago_liquidacion',
            'doc_pago_liquidacion',
            
            # Información adicional
            'porcentaje_cobro',
            'tipo_cobro',
            'doc_soporte_url',
            'detalles'
        ]

    def get_nombre_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor:
            if getattr(proveedor, 'tipo_persona', None) == 'N':
                nombre_completo = " ".join(filter(None, [
                    getattr(proveedor, 'primer_nombre', ''),
                    getattr(proveedor, 'segundo_nombre', ''),
                    getattr(proveedor, 'primer_apellido', ''),
                    getattr(proveedor, 'segundo_apellido', '')
                ]))
                return " ".join(nombre_completo.split()).strip()
            return proveedor.razon_social or proveedor.nombre_comercial or ''
        return ''

    def get_telefono_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor:
            return proveedor.telefono_celular or proveedor.telefono_empresa or ''
        return ''

    def get_email_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor:
            return proveedor.email or proveedor.email_empresarial or ''
        return ''

    def get_direccion_proveedor(self, obj):
        proveedor = obj.id_persona_proveedor
        if proveedor:
            return (proveedor.direccion_residencia or 
                   proveedor.direccion_laboral or 
                   proveedor.direccion_notificaciones or '')
        return ''

    def get_nombre_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            if getattr(recaudador, 'tipo_persona', None) == 'N':
                nombre_completo = " ".join(filter(None, [
                    getattr(recaudador, 'primer_nombre', ''),
                    getattr(recaudador, 'segundo_nombre', ''),
                    getattr(recaudador, 'primer_apellido', ''),
                    getattr(recaudador, 'segundo_apellido', '')
                ]))
                return " ".join(nombre_completo.split()).strip()
            return recaudador.razon_social or recaudador.nombre_comercial or ''
        return ''

    def get_telefono_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            return recaudador.telefono_celular or recaudador.telefono_empresa or ''
        return ''

    def get_email_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            return recaudador.email or recaudador.email_empresarial or ''
        return ''

    def get_direccion_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            return (recaudador.direccion_residencia or 
                   recaudador.direccion_laboral or 
                   recaudador.direccion_notificaciones or '')
        return ''

    def get_estado_factura(self, obj):
        estado_choices = {
            'CR': 'Creado',
            'LQ': 'Liquidado',
            'AC': 'Acuerdo Pago',
            'PA': 'Pagado',
            'PC': 'Proceso Coativo',
            'PP': 'Proceso Presuasivo'
        }
        return estado_choices.get(obj.estado_factura, obj.estado_factura)

    def get_cod_estado_liquidacion(self, obj):
        if obj.id_liq_factura_unica:
            return obj.id_liq_factura_unica.cod_estado
        return None

    def get_cod_estado_liquidacion_display(self, obj):
        if obj.id_liq_factura_unica:
            estados = {
                'CR': 'Creado',
                'LQ': 'Liquidado', 
                'P': 'Pagado'
            }
            return estados.get(obj.id_liq_factura_unica.cod_estado, obj.id_liq_factura_unica.cod_estado)
        return 'No liquidado'

    def get_fecha_pago_liquidacion(self, obj):
        if obj.id_liq_factura_unica:
            return obj.id_liq_factura_unica.fecha_pago
        return None

    def get_doc_pago_liquidacion(self, obj):
        if obj.id_liq_factura_unica:
            return {
                'numero_documento': obj.id_liq_factura_unica.nro_doc_pago,
                'banco': None,
                'valor_pago': obj.id_liq_factura_unica.valor_pagar
            }
        return None

    def get_porcentaje_cobro(self, obj):
        if obj.id_porcentaje_cobro:
            return obj.id_porcentaje_cobro.valor
        return None

    def get_tipo_cobro(self, obj):
        if obj.id_porcentaje_cobro:
            return {
                'codigo': obj.id_porcentaje_cobro.cod_tipo_cobro,
                'nombre': obj.id_porcentaje_cobro.get_cod_tipo_cobro_display()
            }
        return None

    def get_doc_soporte_url(self, obj):
        if obj.doc_soporte:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.doc_soporte.url)
        return None

    def get_detalles(self, obj):
        # Fast-path: construir detalles manualmente para evitar overhead del serializer por item
        factura = obj
        detalles = factura.detallesfacturaunica_set.all()
        proveedor = factura.id_persona_proveedor
        recaudador = factura.id_persona_recaudador
        # Construir proveedor_info una vez
        if proveedor:
            if proveedor.tipo_persona == 'N':
                prov_nombre = " ".join(filter(None, [
                    proveedor.primer_nombre,
                    proveedor.segundo_nombre,
                    proveedor.primer_apellido,
                    proveedor.segundo_apellido
                ])).strip()
            else:
                prov_nombre = proveedor.razon_social or proveedor.nombre_comercial or ''
            proveedor_info = {
                "id_proveedor": getattr(proveedor, 'id_persona', None),
                'nombre_completo_o_comercial': prov_nombre,
                'tipo_documento': proveedor.tipo_documento.nombre if getattr(proveedor, 'tipo_documento', None) else None,
                'numero_documento': getattr(proveedor, 'numero_documento', None),
                'municipio': proveedor.cod_municipio_expedicion_id.nombre if getattr(proveedor, 'cod_municipio_expedicion_id', None) else None,
                'departamento': (proveedor.cod_municipio_expedicion_id.cod_departamento.nombre
                                 if getattr(proveedor, 'cod_municipio_expedicion_id', None) and getattr(proveedor.cod_municipio_expedicion_id, 'cod_departamento', None) else None)
            }
        else:
            proveedor_info = None
        # Construir recaudador_info una vez
        if recaudador:
            if recaudador.tipo_persona == 'N':
                rec_nombre = " ".join(filter(None, [
                    recaudador.primer_nombre,
                    recaudador.segundo_nombre,
                    recaudador.primer_apellido,
                    recaudador.segundo_apellido
                ])).strip()
            else:
                rec_nombre = recaudador.razon_social or recaudador.nombre_comercial or ''
            recaudador_info = {
                "id_recaudador": getattr(recaudador, 'id_persona', None),
                'fecha_compra': factura.fecha_compra.isoformat() if getattr(factura, 'fecha_compra', None) else None,
                'fecha_registro': factura.fecha_creacion.isoformat() if getattr(factura, 'fecha_creacion', None) else None,
                'tipo_documento': recaudador.tipo_documento.nombre if getattr(recaudador, 'tipo_documento', None) else None,
                'numero_documento': getattr(recaudador, 'numero_documento', None),
                'nombre_completo_o_comercial': rec_nombre,
                'telefono': recaudador.telefono_celular or recaudador.telefono_empresa,
                'email': recaudador.email or recaudador.email_empresarial,
                'direccion_notificaciones': getattr(recaudador, 'direccion_notificaciones', None),
                'municipio': recaudador.cod_municipio_expedicion_id.nombre if getattr(recaudador, 'cod_municipio_expedicion_id', None) else None,
                'departamento': (recaudador.cod_municipio_expedicion_id.cod_departamento.nombre
                                 if getattr(recaudador, 'cod_municipio_expedicion_id', None) and getattr(recaudador.cod_municipio_expedicion_id, 'cod_departamento', None) else None),
                'nro_factura_unica': getattr(factura, 'nro_factura_unica', None),
                'cod_tipo_comprador': getattr(recaudador, 'cod_tipo_comprador', 'C'),
                'nombres_tipo_comprador': 'Comerciante'
            }
        else:
            recaudador_info = None
        # Datos de liquidación
        liq = getattr(factura, 'id_liq_factura_unica', None)
        numero_doc_pago = getattr(liq, 'nro_doc_pago', None) if liq else None
        valor_pagar = getattr(liq, 'valor_pagar', None) if liq else None
        cod_estado_liq = getattr(liq, 'cod_estado', None) if liq else None
        cod_estado_liq_display = None
        if liq:
            estados = {'CR': 'Creado', 'LQ': 'Liquidado', 'P': 'Pagado'}
            cod_estado_liq_display = estados.get(liq.cod_estado, liq.cod_estado)
        # Porcentaje
        porc = getattr(factura, 'id_porcentaje_cobro', None)
        porc_valor = getattr(porc, 'valor', 0) if porc else 0
        cod_tipo_cobro = getattr(porc, 'cod_tipo_cobro', None) if porc else None
        nombre_tipo_cobro = {'CF': 'Cuota de Fomento', 'OT': 'Otro'}.get(cod_tipo_cobro, 'Desconocido') if cod_tipo_cobro else None
        # URL doc soporte (calcular una sola vez)
        request = self.context.get('request') if self.context else None
        doc_soporte_url = None
        if getattr(factura, 'doc_soporte', None):
            try:
                url = factura.doc_soporte.url
                doc_soporte_url = request.build_absolute_uri(url) if request else url
            except Exception:
                doc_soporte_url = None

        items = []
        for d in detalles:
            valor_bruto = d.nro_kilos * d.valor_kilo
            cuota_fomento = valor_bruto * (porc_valor or 0)
            valor_neto = valor_bruto - cuota_fomento
            items.append({
                'id_detalle_factura_unica': d.id_detalle_factura_unica,
                'id_factura_unica': factura.id_factura_unica,
                'id_porcentaje_cobro': getattr(porc, 'id_porcentaje_cobro', None) if porc else None,
                'nombre_tipo_cobro': nombre_tipo_cobro,
                'cod_tipo_cobro': cod_tipo_cobro,
                'valor_porcentaje_cobro': porc_valor,
                'id_tipo_cacao': d.id_tipo_cacao_id,
                'nro_kilos': d.nro_kilos,
                'nombre_tipo_cacao': getattr(d.id_tipo_cacao, 'nombre', None),
                'nombre_municipio_cacao': getattr(factura.id_municipio_cacao, 'nombre', None),
                'nombre_departamento_cacao': getattr(factura.id_departamento_cacao, 'nombre', None),
                'nombre_vereda': getattr(factura, 'nombre_vereda', None),
                'nombre_finca': getattr(factura, 'nombre_finca', None),
                'valor_kilo': d.valor_kilo,
                'valor_bruto': valor_bruto,
                'cuota_fomento': cuota_fomento,
                'valor_neto': valor_neto,
                'estado_factura': getattr(factura, 'estado_factura', None),
                'cod_estado_liquidacion': cod_estado_liq if liq else 'No liquidado',
                'cod_estado_liquidacion_display': cod_estado_liq_display if liq else 'No liquidado',
                'doc_soporte': None,
                'doc_soporte_url': doc_soporte_url,
                'doc_pago_liquidacion': {
                    'numero_documento': numero_doc_pago,
                    'banco': None,
                    'valor_pago': valor_pagar
                } if liq else None,
                'proveedor_info': proveedor_info,
                'recaudador_info': recaudador_info,
                'nro_documento_soporte': getattr(factura, 'nro_documento_soporte', '')
            })
        return items


class TableroComprasSerializer(serializers.ModelSerializer):
    # Optimización ULTRA: usar solo campos directos sin cálculos complejos
    nit_proveedor = serializers.CharField(source='id_persona_proveedor.numero_documento', read_only=True)
    nombre_municipio = serializers.CharField(source='id_municipio_cacao.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='id_departamento_cacao.nombre', read_only=True)
    tipo_persona_proveedor = serializers.CharField(source='id_persona_proveedor.tipo_persona', read_only=True)
    primer_nombre_proveedor = serializers.CharField(source='id_persona_proveedor.primer_nombre', read_only=True)
    segundo_nombre_proveedor = serializers.CharField(source='id_persona_proveedor.segundo_nombre', read_only=True)
    primer_apellido_proveedor = serializers.CharField(source='id_persona_proveedor.primer_apellido', read_only=True)
    segundo_apellido_proveedor = serializers.CharField(source='id_persona_proveedor.segundo_apellido', read_only=True)
    razon_social_proveedor = serializers.CharField(source='id_persona_proveedor.razon_social', read_only=True)
    nombre_comercial_proveedor = serializers.CharField(source='id_persona_proveedor.nombre_comercial', read_only=True)
    
    # Método optimizado para el nombre del proveedor
    nombre_proveedor = serializers.SerializerMethodField()
    # Estado legible - usando método optimizado
    estado_factura_display = serializers.SerializerMethodField()
    # Detalles de la factura
    detalles = serializers.SerializerMethodField()

    class Meta:
        model = FacturaUnica
        fields = [
            'id_factura_unica',
            'fecha_compra',
            'nro_factura_unica',
            'id_persona_proveedor',
            'nit_proveedor',
            'tipo_persona_proveedor',
            'primer_nombre_proveedor',
            'segundo_nombre_proveedor',
            'primer_apellido_proveedor',
            'segundo_apellido_proveedor',
            'razon_social_proveedor',
            'nombre_comercial_proveedor',
            'nombre_proveedor',
            'id_municipio_cacao',
            'nombre_municipio',
            'id_departamento_cacao',
            'nombre_departamento',
            'total_kilos',
            'valor_bruto',
            'cuota_fomento',
            'valor_neto',
            'estado_factura',
            'estado_factura_display',
            'detalles'
        ]

    def get_nombre_recaudador(self, obj):
        recaudador = obj.id_persona_recaudador
        if recaudador:
            if recaudador.tipo_persona == 'N':
                nombre_completo = " ".join(filter(None, [
                    recaudador.primer_nombre,
                    recaudador.segundo_nombre,
                    recaudador.primer_apellido,
                    recaudador.segundo_apellido
                ]))
                return nombre_completo.strip()
            else:
                return recaudador.razon_social or recaudador.nombre_comercial or ""
        return ''

    def get_nombre_proveedor(self, obj):
        # Usar los campos ya pre-cargados para evitar consultas adicionales
        if obj.id_persona_proveedor.tipo_persona == 'N':
            nombres = [
                obj.id_persona_proveedor.primer_nombre,
                obj.id_persona_proveedor.segundo_nombre,
                obj.id_persona_proveedor.primer_apellido,
                obj.id_persona_proveedor.segundo_apellido
            ]
            nombre_completo = " ".join(filter(None, [n or '' for n in nombres]))
            return " ".join(nombre_completo.split()).strip()
        return obj.id_persona_proveedor.razon_social or obj.id_persona_proveedor.nombre_comercial or ''

    def get_estado_factura_display(self, obj):
        # Diccionario para mapeo rápido
        estados = {
            'CR': 'Creado',
            'LQ': 'Liquidado',
            'AC': 'Acuerdo Pago',
            'PA': 'Pagado',
            'PC': 'Proceso Coativo',
            'PP': 'Proceso Presuasivo'
        }
        return estados.get(obj.estado_factura, obj.estado_factura)

    def get_detalles(self, obj):
        # Construcción manual ultra-rápida para evitar overhead del serializer por item
        factura = obj
        detalles = factura.detallesfacturaunica_set.all()

        # Proveedor (reutilizado en todos los detalles)
        proveedor = factura.id_persona_proveedor
        if proveedor:
            if getattr(proveedor, 'tipo_persona', None) == 'N':
                prov_nombre = " ".join(filter(None, [
                    getattr(proveedor, 'primer_nombre', ''),
                    getattr(proveedor, 'segundo_nombre', ''),
                    getattr(proveedor, 'primer_apellido', ''),
                    getattr(proveedor, 'segundo_apellido', '')
                ])).strip()
            else:
                prov_nombre = getattr(proveedor, 'razon_social', None) or getattr(proveedor, 'nombre_comercial', None) or ''
            proveedor_info = {
                "id_proveedor": getattr(proveedor, 'id_persona', None),
                'nombre_completo_o_comercial': prov_nombre,
                'tipo_documento': proveedor.tipo_documento.nombre if getattr(proveedor, 'tipo_documento', None) else None,
                'numero_documento': getattr(proveedor, 'numero_documento', None),
                'municipio': proveedor.cod_municipio_expedicion_id.nombre if getattr(proveedor, 'cod_municipio_expedicion_id', None) else None,
                'departamento': (
                    proveedor.cod_municipio_expedicion_id.cod_departamento.nombre
                    if getattr(proveedor, 'cod_municipio_expedicion_id', None) and getattr(proveedor.cod_municipio_expedicion_id, 'cod_departamento', None) else None
                )
            }
        else:
            proveedor_info = None

        # Recaudador (reutilizado en todos los detalles)
        recaudador = factura.id_persona_recaudador
        if recaudador:
            if getattr(recaudador, 'tipo_persona', None) == 'N':
                rec_nombre = " ".join(filter(None, [
                    getattr(recaudador, 'primer_nombre', ''),
                    getattr(recaudador, 'segundo_nombre', ''),
                    getattr(recaudador, 'primer_apellido', ''),
                    getattr(recaudador, 'segundo_apellido', '')
                ])).strip()
            else:
                rec_nombre = getattr(recaudador, 'razon_social', None) or getattr(recaudador, 'nombre_comercial', None) or ''
            recaudador_info = {
                "id_recaudador": getattr(recaudador, 'id_persona', None),
                'fecha_compra': factura.fecha_compra.isoformat() if getattr(factura, 'fecha_compra', None) else None,
                'fecha_registro': factura.fecha_creacion.isoformat() if getattr(factura, 'fecha_creacion', None) else None,
                'tipo_documento': recaudador.tipo_documento.nombre if getattr(recaudador, 'tipo_documento', None) else None,
                'numero_documento': getattr(recaudador, 'numero_documento', None),
                'nombre_completo_o_comercial': rec_nombre,
                'telefono': getattr(recaudador, 'telefono_celular', None) or getattr(recaudador, 'telefono_empresa', None),
                'email': getattr(recaudador, 'email', None) or getattr(recaudador, 'email_empresarial', None),
                'direccion_notificaciones': getattr(recaudador, 'direccion_notificaciones', None),
                'municipio': recaudador.cod_municipio_expedicion_id.nombre if getattr(recaudador, 'cod_municipio_expedicion_id', None) else None,
                'departamento': (
                    recaudador.cod_municipio_expedicion_id.cod_departamento.nombre
                    if getattr(recaudador, 'cod_municipio_expedicion_id', None) and getattr(recaudador.cod_municipio_expedicion_id, 'cod_departamento', None) else None
                ),
                'nro_factura_unica': getattr(factura, 'nro_factura_unica', None),
                'cod_tipo_comprador': getattr(recaudador, 'cod_tipo_comprador', 'C'),
                'nombres_tipo_comprador': 'Comerciante'
            }
        else:
            recaudador_info = None

        # Liquidación (reutilizada)
        liq = getattr(factura, 'id_liq_factura_unica', None)
        numero_doc_pago = getattr(liq, 'nro_doc_pago', None) if liq else None
        valor_pagar = getattr(liq, 'valor_pagar', None) if liq else None
        cod_estado_liq = getattr(liq, 'cod_estado', None) if liq else None
        if liq:
            estados = {'CR': 'Creado', 'LQ': 'Liquidado', 'P': 'Pagado'}
            cod_estado_liq_display = estados.get(liq.cod_estado, liq.cod_estado)
        else:
            cod_estado_liq_display = 'No liquidado'

        # Porcentaje (reutilizado)
        porc = getattr(factura, 'id_porcentaje_cobro', None)
        porc_valor = getattr(porc, 'valor', 0) if porc else 0
        cod_tipo_cobro = getattr(porc, 'cod_tipo_cobro', None) if porc else None
        nombre_tipo_cobro = {'CF': 'Cuota de Fomento', 'OT': 'Otro'}.get(cod_tipo_cobro, 'Desconocido') if cod_tipo_cobro else None

        # URL doc soporte (una sola vez)
        request = self.context.get('request') if self.context else None
        doc_soporte_url = None
        if getattr(factura, 'doc_soporte', None):
            try:
                url = factura.doc_soporte.url
                doc_soporte_url = request.build_absolute_uri(url) if request else url
            except Exception:
                doc_soporte_url = None

        items = []
        nombre_municipio = getattr(factura.id_municipio_cacao, 'nombre', None)
        nombre_departamento = getattr(factura.id_departamento_cacao, 'nombre', None)
        nombre_vereda = getattr(factura, 'nombre_vereda', None)
        nombre_finca = getattr(factura, 'nombre_finca', None)
        nro_documento_soporte = getattr(factura, 'nro_documento_soporte', '')

        for d in detalles:
            valor_bruto = d.nro_kilos * d.valor_kilo
            cuota_fomento = valor_bruto * (porc_valor or 0)
            valor_neto = valor_bruto - cuota_fomento
            items.append({
                'id_detalle_factura_unica': d.id_detalle_factura_unica,
                'id_factura_unica': factura.id_factura_unica,
                'id_porcentaje_cobro': getattr(porc, 'id_porcentaje_cobro', None) if porc else None,
                'nombre_tipo_cobro': nombre_tipo_cobro,
                'cod_tipo_cobro': cod_tipo_cobro,
                'valor_porcentaje_cobro': porc_valor,
                'id_tipo_cacao': d.id_tipo_cacao_id,
                'nro_kilos': d.nro_kilos,
                'nombre_tipo_cacao': getattr(d.id_tipo_cacao, 'nombre', None),
                'nombre_municipio_cacao': nombre_municipio,
                'nombre_departamento_cacao': nombre_departamento,
                'nombre_vereda': nombre_vereda,
                'nombre_finca': nombre_finca,
                'valor_kilo': d.valor_kilo,
                'valor_bruto': valor_bruto,
                'cuota_fomento': cuota_fomento,
                'valor_neto': valor_neto,
                'estado_factura': getattr(factura, 'estado_factura', None),
                'cod_estado_liquidacion': cod_estado_liq if liq else 'No liquidado',
                'cod_estado_liquidacion_display': cod_estado_liq_display,
                'doc_soporte': None,
                'doc_soporte_url': doc_soporte_url,
                'doc_pago_liquidacion': ({
                    'numero_documento': numero_doc_pago,
                    'banco': None,
                    'valor_pago': valor_pagar
                } if liq else None),
                'proveedor_info': proveedor_info,
                'recaudador_info': recaudador_info,
                'nro_documento_soporte': nro_documento_soporte
            })
        return items
    

class TRMSerializer(serializers.ModelSerializer):
    """Serializer para el modelo TRM"""
    usuario_que_registra_nombre = serializers.CharField(source='usuario_que_registra.nombre_de_usuario', read_only=True)
    usuario_que_registra_username = serializers.CharField(source='usuario_que_registra.nombre_de_usuario', read_only=True)

    class Meta:
        model = TRM
        fields = [
            'idregistro',
            'fecha_registro',
            'precio_trm',
            'anio',
            'mes',
            'usuario_que_registra',
            'usuario_que_registra_nombre',
            'usuario_que_registra_username'
        ]
        read_only_fields = ['anio', 'mes', 'usuario_que_registra']

    def validate_fecha_registro(self, value):
        """Validar que la fecha no sea futura"""
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("La fecha de registro no puede ser futura")
        return value

    def validate_precio_trm(self, value):
        """Validar que el precio TRM sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El precio TRM debe ser mayor a 0")
        return value


class BolsaNYSerializer(serializers.ModelSerializer):
    """Serializer para el modelo BolsaNY"""
    idusuario_nombre = serializers.CharField(source='idusuario.nombre_de_usuario', read_only=True)
    idusuario_username = serializers.CharField(source='idusuario.nombre_de_usuario', read_only=True)

    class Meta:
        model = BolsaNY
        fields = [
            'idregistro',
            'idusuario',
            'fecha_registro',
            'anio',
            'mes',
            'precio_cierre',
            'idusuario_nombre',
            'idusuario_username'
        ]
        read_only_fields = ['idregistro', 'anio', 'mes', 'idusuario', 'idusuario_nombre', 'idusuario_username']

    def validate_fecha_registro(self, value):
        """Validar que la fecha no sea futura"""
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("La fecha de registro no puede ser futura")
        return value

    def validate_precio_cierre(self, value):
        """Validar que el precio de cierre sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El precio de cierre debe ser mayor a 0")
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Department"""
    
    class Meta:
        model = Department
        fields = ['code', 'name']
        read_only_fields = ['code']


class MunicipalitySerializer(serializers.ModelSerializer):
    """Serializer para el modelo Municipality"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    concatenated_code = serializers.CharField(read_only=True)
    
    class Meta:
        model = Municipality
        fields = ['department', 'code', 'name', 'department_name', 'concatenated_code']


class MunicipalityListSerializer(serializers.ModelSerializer):
    """Serializer para listar municipios con información del departamento"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    concatenated_code = serializers.CharField(read_only=True)
    
    class Meta:
        model = Municipality
        fields = ['code', 'name', 'department_code', 'department_name', 'concatenated_code']


# Nuevos serializers para servicios de agregación
class DepartmentAggregationSerializer(serializers.Serializer):
    """Serializer para agregación por departamento"""
    codigo = serializers.IntegerField(source='department_code')
    nombre = serializers.CharField(source='department__name')
    kilos = serializers.IntegerField()
    cuota_fomento = serializers.IntegerField()
    valor_neto = serializers.IntegerField()


class MunicipalityAggregationSerializer(serializers.Serializer):
    """Serializer para agregación por municipio"""
    codigo = serializers.IntegerField(source='municipality_code')
    nombre = serializers.CharField(source='municipality__name')
    kilos = serializers.IntegerField()
    cuota_fomento = serializers.IntegerField()
    valor_neto = serializers.IntegerField()





class DepartmentSummarySerializer(serializers.Serializer):
    """Serializer para resumen de departamento con totales"""
    codigo = serializers.IntegerField()
    nombre = serializers.CharField()
    total_kilos = serializers.IntegerField()
    total_cuota_fomento = serializers.IntegerField()
    total_valor_neto = serializers.IntegerField()
    total_transacciones = serializers.IntegerField()


class MunicipalitySummarySerializer(serializers.Serializer):
    """Serializer para resumen de municipio con totales"""
    codigo = serializers.IntegerField()
    nombre = serializers.CharField()
    department_code = serializers.IntegerField()
    department_name = serializers.CharField()
    total_kilos = serializers.IntegerField()
    total_cuota_fomento = serializers.IntegerField()
    total_valor_neto = serializers.IntegerField()
    total_transacciones = serializers.IntegerField()


class FormattedDecimalField(serializers.DecimalField):
    """Campo decimal personalizado que formatea la salida con separadores de miles y sin ceros innecesarios"""
    
    def to_representation(self, value):
        if value is None:
            return None
        
        # Convertir de miles a unidades multiplicando por 1000
        from decimal import Decimal
        float_value = float(value * Decimal('1000'))
        
        # Si es un número entero, mostrar sin decimales
        if float_value == int(float_value):
            return int(float_value)
        else:
            # Si tiene decimales, mostrar con hasta 3 decimales (sin ceros al final)
            formatted = f"{float_value:,.3f}".replace(',', '.')
            # Eliminar ceros trailing después del punto decimal
            formatted = formatted.rstrip('0').rstrip('.')
            return formatted
    
    def to_internal_value(self, data):
        """Método para procesar datos de entrada convirtiendo a miles"""
        from decimal import Decimal
        
        if data is None:
            return None
        
        # Si es un string, convertirlo a Decimal directamente
        if isinstance(data, str):
            # Remover separadores de miles si existen
            data = data.replace('.', '').replace(',', '')
            try:
                value = Decimal(str(data))
            except (ValueError, TypeError):
                raise serializers.ValidationError("Debe ser un número válido")
        else:
            # Si ya es un número, convertirlo a Decimal
            try:
                value = Decimal(str(data))
            except (ValueError, TypeError):
                raise serializers.ValidationError("Debe ser un número válido")
        
        # Convertir a miles dividiendo por 1000
        return value / Decimal('1000')


class ProduccionCacaoHistoricoSerializer(serializers.ModelSerializer):
    """Serializer para el modelo ProduccionCacaoHistorico"""

    class TwoDecimalField(serializers.DecimalField):
        def to_internal_value(self, data):
            if isinstance(data, str):
                data = data.replace(',', '.')
            return super().to_internal_value(data)

    # Campos decimales (2 cifras). Aceptan coma o punto como separador.
    enero = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    febrero = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    marzo = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    abril = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    mayo = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    junio = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    julio = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    agosto = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    septiembre = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    octubre = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    noviembre = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    diciembre = TwoDecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    pano = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True, read_only=True)
    
    class Meta:
        model = ProduccionCacaoHistorico
        fields = [
            'id',
            'ano',
            'enero',
            'febrero',
            'marzo',
            'abril',
            'mayo',
            'junio',
            'julio',
            'agosto',
            'septiembre',
            'octubre',
            'noviembre',
            'diciembre',
            'pano'
        ]
        read_only_fields = ['pano']  # El total anual se calcula automáticamente

    def validate_ano(self, value):
        """Validar que el año sea válido"""
        from django.utils import timezone
        current_year = timezone.now().year
        
        if value < 1900:
            raise serializers.ValidationError("El año debe ser mayor a 1900")
        if value > current_year + 10:
            raise serializers.ValidationError(f"El año no puede ser mayor a {current_year + 10}")
        return value

    def validate(self, data):
        """Validación general del modelo"""
        # Verificar que al menos un mes tenga datos
        meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ]
        
        tiene_datos = any(data.get(mes) is not None for mes in meses)
        if not tiene_datos:
            raise serializers.ValidationError("Debe proporcionar datos para al menos un mes")
        
        # Validar que todos los valores numéricos sean positivos
        for mes in meses:
            valor = data.get(mes)
            if valor is not None and valor < 0:
                raise serializers.ValidationError(f"El valor para {mes} no puede ser negativo")
        
        return data

    def create(self, validated_data):
        """Crear un nuevo registro"""
        # La validación de duplicados se maneja ahora en el ViewSet
        # para permitir actualizaciones automáticas
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Actualizar un registro existente"""
        # Si se cambia el año, verificar que no exista ya otro registro
        if 'ano' in validated_data and validated_data['ano'] != instance.ano:
            ano = validated_data['ano']
            if ProduccionCacaoHistorico.objects.filter(ano=ano).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError(f"Ya existe un registro para el año {ano}")
        
        return super().update(instance, validated_data) 


class ProduccionDepartamentoAnualWriteSerializer(serializers.Serializer):
    """Serializer de escritura para registrar producción por departamento (upsert)."""
    cod_departamento = serializers.CharField()
    ano = serializers.IntegerField()
    produccion = serializers.IntegerField()

    def validate_ano(self, value):
        from django.utils import timezone
        current_year = timezone.now().year
        if value < 1900:
            raise serializers.ValidationError("El año debe ser mayor a 1900")
        if value > current_year + 10:
            raise serializers.ValidationError(f"El año no puede ser mayor a {current_year + 10}")
        return value

    def validate_produccion(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("La producción debe ser un número no negativo")
        return value

    def validate_cod_departamento(self, value):
        # Convertir a string para asegurar consistencia
        value_str = str(value).zfill(2)  # Asegurar formato de 2 dígitos
        if not Departamento.objects.filter(cod_departamento=value_str).exists():
            raise serializers.ValidationError(f"El código de departamento '{value_str}' no existe")
        return value_str

    def create(self, validated_data):
        departamento = Departamento.objects.get(cod_departamento=validated_data['cod_departamento'])
        return ProduccionDepartamentoAnual.objects.create(
            departamento=departamento,
            ano=validated_data['ano'],
            produccion=validated_data['produccion']
        )

    def update(self, instance, validated_data):
        instance.produccion = validated_data.get('produccion', instance.produccion)
        instance.save()
        return instance


class ProduccionDepartamentoAnualReadSerializer(serializers.ModelSerializer):
    codigo_departamento = serializers.CharField(source='departamento.cod_departamento', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True)

    class Meta:
        model = ProduccionDepartamentoAnual
        fields = ['id', 'codigo_departamento', 'nombre_departamento', 'ano', 'produccion']


class RendimientoCensoDepartamentoSerializer(serializers.ModelSerializer):
    codigo_departamento = serializers.CharField(source='departamento.cod_departamento', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True)
    usuario_actualizacion_nombre = serializers.CharField(source='usuario_actualizacion.get_full_name', read_only=True)

    class Meta:
        model = RendimientoCensoDepartamento
        fields = [
            'departamento', 'codigo_departamento', 'nombre_departamento',
            'rendimiento_censo', 'fecha_actualizacion', 'usuario_actualizacion',
            'usuario_actualizacion_nombre'
        ]
        read_only_fields = ['fecha_actualizacion']

    def validate_rendimiento_censo(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("El rendimiento censo debe ser un número positivo")
        if value > 9999.99:
            raise serializers.ValidationError("El rendimiento censo no puede ser mayor a 9999.99 kg/ha")
        return value

    def create(self, validated_data):
        # Asignar el usuario actual si está autenticado
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['usuario_actualizacion'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Asignar el usuario actual si está autenticado
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['usuario_actualizacion'] = request.user
        return super().update(instance, validated_data)