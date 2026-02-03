import axios from 'axios';
import { DetallesPlanesPagoResponseExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/externo/detallesPlanesPagoExterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDetallesPlanesPagoExterno = async (
    token: string,
    id: number | string
): Promise<DetallesPlanesPagoResponseExterno> => {
    try {
        const response = await axios.get<DetallesPlanesPagoResponseExterno>(
            `${baseApiUrl}recaudos/acuerdos-pago/liquidacion-externo/detalles-planes-acuerdo-pago/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener detalles de planes de pago');
        }
        throw new Error('Error al obtener detalles de planes de pago');
    }
}; 