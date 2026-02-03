import { useEffect, useState } from "react";
import DynamicTable from "@/presenters/components/ui/DynamicTable";
import { useConsultaDetallesPlanesPago } from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/hooks/useConsultaDetallesPlanesPago";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { formatearFechaDMY } from "@/utils/dateUtils";
import { FileDownload } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useTheme } from 'next-themes';

interface ConsultarPlanPagoProps {
  token: string;
  id_solicitud: number | string;
  isInternalUser: boolean | null;
}

export default function ConsultarPlanPago({ token, id_solicitud, isInternalUser }: ConsultarPlanPagoProps) {

  const { getDetallesPlanesPago, loading, error, data } = useConsultaDetallesPlanesPago();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (token && id_solicitud) {
      getDetallesPlanesPago(token, id_solicitud, isInternalUser);
    }
  }, [token, id_solicitud]);

  const columns = [
    { key: 'nro_solicitud', label: 'Número de Solicitud', render: (value: string) => formatNumber(value) },
    { key: 'fecha_solicitud', label: 'Fecha de Solicitud', render: (value: string) => formatearFechaDMY(new Date(value)) },
    { key: 'estado', label: 'Estado Solicitud' },
    { key: 'numero_plan_pago', label: 'Número de Plan de Pago', render: (value: string) => formatNumber(value) },
    { key: 'numero_documento_recaudador', label: 'NIT Recaudador' },
    { key: 'numero_cuota', label: 'Número de Cuota', render: (value: string) => formatNumber(value) },
    { key: 'fecha_pago', label: 'Fecha de Pago', render: (value: string) => formatearFechaDMY(new Date(value)) },
    { key: 'Nro_factura', label: 'Relación Facturas Únicas', render: (value: string) => value },
    { key: 'valor_factura', label: 'Valor Factura', render: (value: string) => formatCurrency(value) },
    { 
      key: 'acciones', 
      label: 'Documento Liquidación',
    },
  ];


  const tableData = (data && data.detalle_plan_pago && Array.isArray(data.detalle_plan_pago) ? data.detalle_plan_pago : []).map((item) => {
    // Verificación completa del item
    if (!item || typeof item !== 'object') {
      return {
        nro_solicitud: '',
        fecha_solicitud: '',
        estado: '',
        numero_plan_pago: '',
        numero_documento_recaudador: '',
        numero_cuota: '',
        fecha_pago: '',
        Nro_factura: '',
        valor_factura: 0,
        doc_pago_liquidacion: null,
      };
    }

    // Obtener datos de solicitud_acuerdo_pago (es un array, tomamos el primer elemento)
    const solicitudData = data?.solicitud_acuerdo_pago && Array.isArray(data.solicitud_acuerdo_pago) && data.solicitud_acuerdo_pago.length > 0 
      ? data.solicitud_acuerdo_pago[0] 
      : null;

    // Procesar todas las facturas del item
    const facturas = item.facturas && Array.isArray(item.facturas) ? item.facturas : [];
    
    // Concatenar todos los números de factura
    const relacionFacturas = facturas
      .map(factura => factura.nro_factura)
      .filter(nro => nro !== undefined && nro !== null)
      .join('-');
    
    // Sumar todos los valores de factura
    const valorTotalFacturas = facturas
      .reduce((sum, factura) => sum + (factura.valor_factura || 0), 0);
    
    // Obtener la primera factura para el documento de liquidación
    const primeraFactura = facturas.length > 0 ? facturas[0] : null;
    
    // Verificar si la factura tiene el campo doc_pago_liquidacion de forma segura
    let docPagoLiquidacion = null;
    if (primeraFactura && typeof primeraFactura === 'object' && primeraFactura !== null) {
      // Simplificar la condición - solo verificar que existe la propiedad
      if ('doc_pago_liquidacion' in primeraFactura) {
        docPagoLiquidacion = primeraFactura.doc_pago_liquidacion;
      }
    }
    
    const hasDocument = docPagoLiquidacion && docPagoLiquidacion !== '';

    return {
      nro_solicitud: solicitudData?.nro_solicitud || '',
      fecha_solicitud: solicitudData?.fecha_solicitud ? solicitudData.fecha_solicitud.split('T')[0] : '',
      estado: solicitudData?.estado || '',
      numero_plan_pago: item.nro_plan_pago || '',
      numero_documento_recaudador: solicitudData?.numero_documento || '',
      numero_cuota: item.numero_cuota || '',
      fecha_pago: item.fecha_pago ? item.fecha_pago.split('T')[0] : '',
      Nro_factura: relacionFacturas,
      valor_factura: valorTotalFacturas,
      acciones: (
        <IconButton
          onClick={() => {
            if (hasDocument && docPagoLiquidacion) {
              window.open(docPagoLiquidacion, '_blank');
            } else {
              alert('No hay documento de liquidación disponible para esta cuota');
            }
          }}
          disabled={!hasDocument}
          sx={{
            color: hasDocument 
              ? (mounted && theme === 'dark' ? '#fff' : '#4D750F')
              : (mounted && theme === 'dark' ? '#666' : '#ccc'),
            '&:hover': hasDocument
              ? {
                  backgroundColor: mounted && theme === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(77, 117, 15, 0.1)'
                }
              : {},
            '&:disabled': {
              cursor: 'not-allowed'
            }
          }}
          title={hasDocument ? 'Descargar documento de liquidación' : 'No hay documento disponible'}
        >
          <FileDownload />
        </IconButton>
      ),
    };
  });

  const fetchAllData = async () => {
    return {
      data: tableData,
      total_pages: 1
    };
  };

  if (!mounted) {
    return null;
  }

  const isDarkMode = mounted && theme === 'dark';
  const headingClass = isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]';

  return (
    <div className={`rounded-xl p-4 sm:p-6 ${isDarkMode ? 'bg-[#260f00] text-white' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 text-2xl font-bold text-center">
        <h1 className={headingClass}>PLAN DE PAGOS DEL ACUERDO</h1>
      </div>

      {loading && (
        <div className={`text-center py-4 ${headingClass}`}>
          Cargando plan de pagos…
        </div>
      )}
      {error && (
        <div className="text-center text-red-500 py-4">
          {error}
        </div>
      )}
      {!loading && !error && (
        <DynamicTable
          columns={columns}
          data={tableData}
          currentPage={1}
          fetchAllData={fetchAllData}
          totalPages={1}
          onPageChange={() => {}}
          isLoading={loading}
        />
      )}
    </div>
  );
}