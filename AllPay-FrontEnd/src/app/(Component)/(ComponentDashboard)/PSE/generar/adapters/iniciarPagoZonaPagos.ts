import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface ZonaPagosRequest {
  id_liquidacion: number;
  numero_documento: string;
  tipo_documento: string;
  primer_nombre: string;
  primer_apellido: string;
  email: string;
  telefono: string;
}

export interface ZonaPagosResponse {
  success: boolean;
  redirect_url: string;
  identificador: string;
  id_pago: number;
}

/**
 * Inicia el proceso de pago en ZonaPagos
 */
export const iniciarPagoZonaPagos = async (
  token: string,
  datosRequest: ZonaPagosRequest
): Promise<ZonaPagosResponse> => {
  try {
    const response = await axios.post<ZonaPagosResponse>(
      `${baseApiUrl}recaudos/pagos/iniciar-pago/`,
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
      console.error('Error en iniciarPagoZonaPagos:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      throw new Error(error.response?.data?.detail || 'Error al iniciar el pago con ZonaPagos');
    }
    
    throw new Error('Error inesperado al iniciar el pago con ZonaPagos');
  }
};
