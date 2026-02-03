import axios from 'axios';
import { ObtenerDetallesPlanPagoResponse } from '../../../domain/models/acuerdos_pago/cuotas/obtenerCuotasPlanPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerCuotasPlanPago = async (
    token: string,
    id: number | string
): Promise<ObtenerDetallesPlanPagoResponse> => {
    try {

        const response = await axios.get<ObtenerDetallesPlanPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/obtener-detalles-plan-pago/${id}/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error en obtenerDetallesPlanPago:', error);
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 'Error al obtener los detalles del plan de pago';
            throw new Error(errorMessage);
        }
        throw error;
    }
}; 