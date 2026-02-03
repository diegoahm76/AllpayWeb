import axios from 'axios';
import { EstadosAcuerdoPagoResponse } from '@/domain/models/estados/estadosAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getEstadosAcuerdoPago = async (token: string): Promise<EstadosAcuerdoPagoResponse> => {
  try {
    const response = await axios.get<EstadosAcuerdoPagoResponse>(
      `${baseApiUrl}choices/cod-estado-acuerdos-pago/`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
      }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Error al consultar estados de acuerdos de pago');
    }
    throw new Error('Error al consultar estados de acuerdos de pago');
  }
}; 