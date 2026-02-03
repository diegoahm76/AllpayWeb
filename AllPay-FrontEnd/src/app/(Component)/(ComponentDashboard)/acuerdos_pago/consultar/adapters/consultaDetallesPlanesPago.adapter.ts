import axios from 'axios';
import { ConsultaDetallesPlanesPagoResponse } from '../models/consultaDetallesPlanesPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const consultaDetallesPlanesPago = async (
    token: string,
    id: string | number
): Promise<ConsultaDetallesPlanesPagoResponse> => {
    try {
        const response = await axios.get<ConsultaDetallesPlanesPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/externo/consulta-detalles-planes-pago/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al consultar los detalles del plan de pago');
        }
        throw new Error('Error al consultar los detalles del plan de pago');
    }
}; 