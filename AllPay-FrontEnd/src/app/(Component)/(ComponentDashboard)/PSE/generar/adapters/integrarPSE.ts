import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface DatosPagoRequest {
  id_factura_unica: number[];
  redirect_url: string;
}

export interface DatosPagoResponse {
  success: boolean;
  detail?: string;
  data?: {
    url_pago: string;
    transaction_id: string;
  };
}

export const integrarPSE = async (
  token: string,
  datosRequest: DatosPagoRequest
): Promise<DatosPagoResponse> => {
  try {
    const response = await axios.post<DatosPagoResponse>(
      `${baseApiUrl}recaudos/iniciar-pago-pse/`,
      datosRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en integrarPSE:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorResponse: DatosPagoResponse = {
        success: false,
        detail: error.response?.data?.detail || 'Error al procesar el pago con PSE'
      };
      
      return errorResponse;
    }
    
    return {
      success: false,
      detail: 'Error inesperado al procesar el pago con PSE'
    };
  }
}; 