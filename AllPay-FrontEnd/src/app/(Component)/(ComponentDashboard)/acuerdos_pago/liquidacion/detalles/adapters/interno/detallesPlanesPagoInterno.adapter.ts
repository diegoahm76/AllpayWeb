import axios from 'axios';
import { DetallesPlanesPagoResponseInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/interno/detallesPlanesPagoInterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDetallesPlanesPagoInterno = async (
    token: string,
    idSolicitud: number | string
    ): Promise<DetallesPlanesPagoResponseInterno> => {
    try {
        const response = await axios.get<DetallesPlanesPagoResponseInterno>(
            `${baseApiUrl}recaudos/acuerdos-pago/liquidacion-interno/detalles-planes-acuerdo-pago/${idSolicitud}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al consultar detalles de planes de pago interno');
        }
        throw new Error('Error al consultar detalles de planes de pago interno');
    }
}; 