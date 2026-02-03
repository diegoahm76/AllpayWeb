import axios from 'axios';
import { InfoAcuerdoPagoResponse } from '../models/infoAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getInfoAcuerdoPago = async (
    token: string,
    id: number | string
): Promise<InfoAcuerdoPagoResponse> => {
    try {
        const response = await axios.get<InfoAcuerdoPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/info-acuerdo-pago-crear/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener información del acuerdo de pago');
        }
        throw new Error('Error al obtener información del acuerdo de pago');
    }
}; 