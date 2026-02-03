import axios from 'axios';
import { EliminarCuotaPlanPagoResponse } from '../models/eliminarCuotaPlanPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const eliminarCuotaPlanPago = async (
    token: string,
    id: number | string
): Promise<EliminarCuotaPlanPagoResponse> => {
    try {

        const response = await axios.delete<EliminarCuotaPlanPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/eliminar-cuota-plan-pago/${id}/`,
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
            var errorMessage = error.response?.data?.detail || 'Error al eliminar la cuota del plan de pago';
            throw new Error(errorMessage);
        }
        throw errorMessage;
    }
}; 