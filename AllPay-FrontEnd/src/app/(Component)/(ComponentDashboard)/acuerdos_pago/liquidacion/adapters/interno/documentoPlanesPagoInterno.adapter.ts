import axios from 'axios';
import { DocumentoPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/models/interno/documentoPlanesPagoInterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDocumentoPlanesPagoInterno = async (
    token: string,
    id: number | string
): Promise<DocumentoPlanesPagoResponse> => {
    try {
        const response = await axios.get<DocumentoPlanesPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/liquidacion-interno/documento-planes-pago/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener documento de planes de pago');
        }
        throw new Error('Error al obtener documento de planes de pago');
    }
}; 