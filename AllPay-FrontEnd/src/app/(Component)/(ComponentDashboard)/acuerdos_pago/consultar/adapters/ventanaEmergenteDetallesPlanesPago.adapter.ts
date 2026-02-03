import axios from 'axios';
import { VentanaEmergenteDetallesPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/ventanaEmergenteDetallesPlanesPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getVentanaEmergenteDetallesPlanesPago = async (
  token: string,
  id_solicitud: number | string
): Promise<VentanaEmergenteDetallesPlanesPagoResponse> => {
  try {
    const response = await axios.get<VentanaEmergenteDetallesPlanesPagoResponse>(
      `${baseApiUrl}recaudos/acuerdos-pago/externo/ventana-emergente-detalles-planes-pago/${id_solicitud}/`,
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
      throw new Error(error.response?.data?.detail || 'Error al consultar ventana emergente de detalles de planes de pago');
    }
    throw new Error('Error al consultar ventana emergente de detalles de planes de pago');
  }
}; 