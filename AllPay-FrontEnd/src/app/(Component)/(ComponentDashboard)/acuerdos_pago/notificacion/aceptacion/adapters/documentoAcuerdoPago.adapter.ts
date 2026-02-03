import axios from 'axios';
import { DocumentoAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/models/documentoAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDocumentoAcuerdoPago = async (
    token: string,
    id: number | string
): Promise<DocumentoAcuerdoPagoResponse> => {
    try {
        const response = await axios.get<DocumentoAcuerdoPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/notificacion/documento/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener el documento del acuerdo de pago');
        }
        throw new Error('Error al obtener el documento del acuerdo de pago');
    }
}; 