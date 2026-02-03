import axios from 'axios';
import { DocumentoPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/models/documentoPlanesPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDocumentoPlanesPago = async (
    token: string,
    id: number | string
): Promise<DocumentoPlanesPagoResponse> => {
    try {
        const response = await axios.get<DocumentoPlanesPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/notificacion/documento-planes-pago/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener el documento de planes de pago');
        }
        throw new Error('Error al obtener el documento de planes de pago');
    }
}; 