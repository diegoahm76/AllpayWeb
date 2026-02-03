import axios from 'axios';
import { ConsultaPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/obtenerDatosDocumentoAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getConsultaPlanesPagoInterno = async (
  token: string,
  id: number | string
): Promise<ConsultaPlanesPagoResponse> => {
  try {
    const response = await axios.get<ConsultaPlanesPagoResponse>(
      `${baseApiUrl}recaudos/acuerdos-pago/aprobacion/juridica/documento-planes-pago/${id}/`,
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
      throw new Error(error.response?.data?.detail || 'Error al consultar planes de pago');
    }
    throw new Error('Error al consultar planes de pago');
  }
}; 