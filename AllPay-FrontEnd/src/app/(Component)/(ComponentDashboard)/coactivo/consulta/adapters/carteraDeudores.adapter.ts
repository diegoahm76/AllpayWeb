import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

// Interfaces específicas para cartera de deudores
export interface CarteraDeudorAPI {
  id_factura_unica: number;
  tipo_documento_recaudador: string;
  numero_documento_recaudador: string;
  departamento: string;
  municipio: string;
  fecha_creacion: string;
  fecha_compra: string;
  estado_factura: string;
  estado_factura_display: string;
  tiene_solicitud_acuerdo_pago: boolean;
  fecha_limite_pago: string;
  fecha_limite_pago_interes: string;
  nro_factura_unica: number;
  numero_documento_proveedor: string;
  total_kilos: number;
  cuota_fomento: number;
  promedio_valor_kilo: number;
  valor_bruto: number;
  dias_mora: number;
  intereses: number;
  valor_total_pagar: number;
  estado_liquidacion_display: string | null;
  // Campos adicionales que podríamos necesitar
  recaudador_nombre?: string;
  nombre_departamento_cacao?: string;
  nombre_municipio_cacao?: string;
}

export interface CarteraDeudoresData {
  success: boolean;
  facturas: CarteraDeudorAPI[];
  valor_total_general: number;
}

export interface CarteraDeudoresResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: CarteraDeudoresData;
}

// Parámetros de búsqueda
export interface CarteraDeudoresBusquedaParams {
  page?: number;
  page_size?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  numero_documento_recaudador?: string;
  nro_factura_unica?: string;
}

/**
 * Obtiene las facturas de cartera de consulta interno (facturas en mora sin acuerdo)
 */
export const getCarteraDeudores = async (
  token: string, 
  params: CarteraDeudoresBusquedaParams = {}
): Promise<CarteraDeudoresResponse> => {
  try {
    const {
      page = 1,
      page_size = 10,
      fecha_desde,
      fecha_hasta,
      numero_documento_recaudador,
      nro_factura_unica
    } = params;

    // Construir parámetros de consulta
    const queryParams: any = {
      page,
      page_size,
      solo_mora_sin_acuerdo: true // Parámetro requerido siempre
    };

    if (fecha_desde) queryParams.fecha_desde = fecha_desde;
    if (fecha_hasta) queryParams.fecha_hasta = fecha_hasta;
    if (numero_documento_recaudador) queryParams.numero_documento_recaudador = numero_documento_recaudador;
    if (nro_factura_unica) queryParams.nro_factura_unica = nro_factura_unica;


    const response = await axios.get<CarteraDeudoresResponse>(
      `${baseApiUrl}cartera/cartera-consulta-interno/?solo_mora_sin_acuerdo=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: queryParams
      }
    );


    return response.data;
  } catch (error) {
    console.error('[getCarteraDeudores] - Error:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Error al obtener la cartera de deudores');
    }
    throw new Error('Error al obtener la cartera de deudores');
  }
}; 