import axios from 'axios';
import { DetalleAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/detalleAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDetalleAcuerdoPagoInterno = async (
  token: string,
  id: number | string
): Promise<DetalleAcuerdoPagoResponse> => {
  try {
    const response = await axios.get<DetalleAcuerdoPagoResponse>(
      `${baseApiUrl}recaudos/acuerdos-pago/interno/detalles-acuerdo-pago/${id}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Error al consultar detalle de acuerdo de pago externo');
    }
    throw new Error('Error al consultar detalle de acuerdo de pago externo');
  }
}; 