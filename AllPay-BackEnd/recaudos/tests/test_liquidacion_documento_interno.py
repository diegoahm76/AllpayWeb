from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from rest_framework import status

from recaudos.views.recaudos_views import GetLiquidacionDocumentoInternoView
from recaudos.models.recaudos_models import (
    FacturaUnica,
    LiquidacionesFacturaUnica,
    PorcentajesCobro,
    HistorialPorcentajesCobro,
    FechasCierre,
)
from recaudos.models.documento_models import DocumentosGenerados
from seguridad.models.transversal_models import Personas, Municipio, Departamento, TipoDocumento


class GetLiquidacionDocumentoInternoViewTests(TestCase):
    def setUp(self):
        # Crear datos básicos de ubicación y tipos requeridos por FacturaUnica
        self.tipo_doc = TipoDocumento.objects.create(cod_tipo_documento="CC", nombre="Cédula")
        self.departamento = Departamento.objects.create(cod_departamento="11", nombre="Bogotá")
        self.municipio = Municipio.objects.create(cod_municipio="11001", nombre="Bogotá", cod_departamento=self.departamento)

        # Personas involucradas
        self.recaudador = Personas.objects.create(
            tipo_documento=self.tipo_doc,
            numero_documento="900000001",
            primer_nombre="INT",
            primer_apellido="USER",
            tipo_persona='N'
        )
        self.proveedor = Personas.objects.create(
            tipo_documento=self.tipo_doc,
            numero_documento="800000001",
            primer_nombre="PROV",
            primer_apellido="ONE",
            tipo_persona='N'
        )
        self.creador = Personas.objects.create(
            tipo_documento=self.tipo_doc,
            numero_documento="700000001",
            primer_nombre="CRE",
            primer_apellido="ATOR",
            tipo_persona='N'
        )

        # Porcentaje de cobro asociado a la factura (no PI, cualquier otro válido)
        self.porcentaje = PorcentajesCobro.objects.create(cod_tipo_cobro="PC", valor="0.10000")

        # Fechas de cierre: CF con día de pago 10 para cálculo de intereses
        FechasCierre.objects.create(cod_tipo_cobro_fecha="CF", dias_pago=10, dias_pago_interes=10, id_persona_actualiza=self.creador)

        # Asegurar que NO haya PI del mes actual
        HistorialPorcentajesCobro.objects.filter(cod_tipo_cobro="PI").delete()

        self.factory = APIRequestFactory()

        # Deshabilitar permisos para enfocarnos en la lógica del endpoint
        self._original_permissions = GetLiquidacionDocumentoInternoView.permission_classes
        GetLiquidacionDocumentoInternoView.permission_classes = []

    def tearDown(self):
        # Restaurar permisos originales
        GetLiquidacionDocumentoInternoView.permission_classes = self._original_permissions

    def crear_factura(self, liquidada=False):
        fecha_compra = timezone.now() - timezone.timedelta(days=60)  # suficiente para generar mora
        factura = FacturaUnica.objects.create(
            id_persona_recaudador=self.recaudador,
            id_liq_factura_unica=None,
            fecha_compra=fecha_compra,
            nro_factura_unica=int(timezone.now().timestamp()),
            total_kilos=100,
            valor_bruto="100000.00",
            cuota_fomento="10000.00",
            valor_neto="90000.00",
            id_persona_proveedor=self.proveedor,
            id_municipio_cacao=self.municipio,
            id_departamento_cacao=self.departamento,
            id_porcentaje_cobro=self.porcentaje,
            nro_documento_soporte="DOC-1",
            id_persona_crea=self.creador,
        )

        if liquidada:
            doc = DocumentosGenerados.objects.create(
                id_persona_genera=self.creador,
                id_plantilla_doc=None,
                consecutivo="LQF-TEST",
                finalizado=True,
                variables={}
            )
            liq = LiquidacionesFacturaUnica.objects.create(
                cod_estado='P',
                nro_doc_pago="LQF-TEST-0001",
                fecha_pago=timezone.now(),
                valor_pagar="10000.00",
                valor_intereses="0.00",
                id_persona_liquida=self.creador,
                doc_pago=doc,
                codigo_barras="TESTBARCODE"
            )
            factura.id_liq_factura_unica = liq
            factura.save(update_fields=["id_liq_factura_unica"])

        return factura

    def test_bloquea_sin_pi_cuando_factura_generaria_intereses(self):
        factura = self.crear_factura(liquidada=False)

        url = "/apii/recaudos/liquidacion-documento-interno/"
        request = self.factory.get(url, {"id_facturas": f"[{factura.id_factura_unica}]"})

        response = GetLiquidacionDocumentoInternoView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Porcentaje de Interés (PI) no ha sido actualizado", response.data.get("detail", ""))

    def test_bloquea_sin_pi_cuando_factura_ya_liquidada(self):
        factura = self.crear_factura(liquidada=True)

        url = "/apii/recaudos/liquidacion-documento-interno/"
        request = self.factory.get(url, {"id_facturas": f"[{factura.id_factura_unica}]"})

        response = GetLiquidacionDocumentoInternoView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Porcentaje de Interés (PI) no ha sido actualizado", response.data.get("detail", ""))


