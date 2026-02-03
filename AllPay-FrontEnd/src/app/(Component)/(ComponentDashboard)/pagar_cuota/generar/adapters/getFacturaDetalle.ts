import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface FacturaDetalle {
  id_detalle_factura_unica: number;
  id_factura_unica: number;
  id_porcentaje_cobro: number;
  nombre_tipo_cobro: string;
  cod_tipo_cobro: string;
  valor_porcentaje_cobro: number;
  id_tipo_cacao: number;
  nro_kilos: number;
  nombre_tipo_cacao: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  valor_kilo: string;
  valor_bruto: number;
  cuota_fomento: number;
  valor_neto: number;
  estado_factura: string;
  cod_estado_liquidacion: string;
  cod_estado_liquidacion_display: string;
  doc_soporte: string;
  doc_soporte_url: string;
  doc_pago_liquidacion?: string;
  proveedor_info: {
    id_proveedor: number;
    nombre_completo_o_comercial: string;
    tipo_documento: string;
    numero_documento: string;
    municipio: string;
    departamento: string;
  };
  recaudador_info: {
    id_recaudador: number;
    fecha_compra: string;
    fecha_registro: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_completo_o_comercial: string;
    telefono: string;
    email: string;
    direccion_notificaciones: string;
    municipio: string;
    departamento: string;
    nro_factura_unica: number;
    cod_tipo_comprador: string;
    nombres_tipo_comprador: string;
  };
  nro_documento_soporte: string;
}

export interface FacturaDetalleResponse {
  success: boolean;
  detail: string;
  data: FacturaDetalle[];
  cuota_fomento: number;
  valor_intereses: number;
  valor_pagar: number;
  nro_factura_unica: number;
  nro_doc_pago: string;
}

/**
 * Obtiene los detalles de una factura específica mediante su ID
 */
export const getFacturaDetalle = async (
  token: string,
  facturaId: number
): Promise<FacturaDetalleResponse> => {
  try {
    const response = await axios.get<FacturaDetalleResponse>(
      `${baseApiUrl}recaudos/factura-detalles/${facturaId}/`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data.nro_factura_unica && response.data.data && response.data.data.length > 0) {
      response.data.nro_factura_unica = response.data.data[0].recaudador_info.nro_factura_unica;
    }
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error al obtener detalles de factura:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.detail || 'Error al obtener detalles de la factura');
    }
    throw new Error('Error inesperado al obtener detalles de la factura');
  }
}; 