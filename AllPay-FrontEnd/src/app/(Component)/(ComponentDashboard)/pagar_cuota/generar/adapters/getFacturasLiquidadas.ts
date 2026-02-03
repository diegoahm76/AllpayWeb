import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface FacturaLiquidada {
  id_factura_unica: number;
  nro_factura_unica: number;
  numero_documento_proveedor: string;
  fecha_creacion_factura: string;
  fecha_compra: string;
  cuota_fomento: number;
  intereses_x_factura: number;
  dias_mora: number;
  fecha_limite_pago: string;
  recaudador_nombre: string;
  tipo_documento_recaudador: string;
  numero_documento_recaudador: string;
  total_kilos: number;
  promedio_valor_kilo: number;
  valor_a_pagar: number;
  fecha_liquidacion: string;
  nro_doc_pago: string;
  cod_estado_liquidacion?: string;
  cod_estado_liquidacion_display?: string;
}

export interface Pagination {
  total: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}

export interface FacturasLiquidadasResponse {
  success: boolean;
  detail: string;
  data: FacturaLiquidada[];
  pagination?: Pagination;
}

/**
 * Obtiene las facturas liquidadas, filtrando por estado de liquidación 'L'
 */
export const getFacturasLiquidadas = async (
  token: string,
  params?: Record<string, any>
): Promise<FacturasLiquidadasResponse> => {
  try {
    // Asegurar que estamos filtrando por estado 'L' (Liquidado)
    const paramsWithState = {
      ...params,
      estado_liquidacion: 'L'  // Forzar filtro por facturas en estado Liquidado
    };

    const response = await axios.get<FacturasLiquidadasResponse>(
      `${baseApiUrl}recaudos/facturas-recaudador-externo/?liquidadas=true`,
      {
        params: paramsWithState,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // Filtro adicional para asegurar que solo se devuelven facturas con estado "Liquidado"
    if (response.data.success && response.data.data) {
      const facturasFiltradas = response.data.data.filter(
        factura => 
          factura.cod_estado_liquidacion === 'L' || 
          factura.cod_estado_liquidacion_display === 'Liquidado'
      );

      return {
        ...response.data,
        data: facturasFiltradas
      };
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errData = error.response?.data;
      
      if (errData && typeof errData === 'object') {
        // Caso con `success: false` y un `detail` como string
        if (errData.success === false && typeof errData.detail === 'string') {
          throw new Error(errData.detail);
        }
      }
      
      // Otro error genérico con string en el cuerpo
      throw new Error(typeof errData === 'string' ? errData : 'Error al obtener facturas liquidadas');
    }
    
    // Error no relacionado con Axios
    throw new Error('Error al obtener facturas liquidadas');
  }
}; 