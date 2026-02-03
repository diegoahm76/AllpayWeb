import axios from 'axios';
import { ActualizarCuotaPayload, ActualizarCuotaResponse } from '../models/actualizarCuota.model';

const baseApiUrl = process.env.BASE_API_URL;

export const actualizarCuota = async (
    token: string,
    id: number | string,
    payload: ActualizarCuotaPayload
): Promise<ActualizarCuotaResponse> => {
    try {

        const response = await axios.patch<ActualizarCuotaResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/actualizar-cuota/${id}/`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 'Error al actualizar la cuota';
            throw new Error(errorMessage);
        }
        throw error;
    }
}; 