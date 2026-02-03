import axios from 'axios';
import { InfoAcuerdoPagoResponse } from '../models/infoAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getInfoAcuerdoPagoAgregarCuota = async (
    token: string,
    id: number | string
): Promise<InfoAcuerdoPagoResponse> => {
    try {
        const response = await axios.get<InfoAcuerdoPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/info-acuerdo-pago-agregar-cuota/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener información del acuerdo de pago para agregar cuota');
        }
        throw new Error('Error al obtener información del acuerdo de pago para agregar cuota');
    }
}; 