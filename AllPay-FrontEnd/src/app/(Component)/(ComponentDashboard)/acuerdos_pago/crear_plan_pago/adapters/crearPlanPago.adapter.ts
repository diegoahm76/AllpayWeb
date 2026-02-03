import axios from 'axios';
import { CrearPlanPagoResponse, CrearPlanPagoPayload } from '../models/crearPlanPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const crearPlanPago = async (
    token: string,
    //id: number | string,
    payload: CrearPlanPagoPayload
): Promise<CrearPlanPagoResponse> => {
    try {
        if (!payload.id_facturas) {
            throw new Error('ID de factura no proporcionado');
        }

        if (!payload.id_solicitud_acuerdo_pago) {
            throw new Error('ID de solicitud no proporcionado');
        }

        if (!payload.fecha_pago) {
            throw new Error('Fecha de pago no proporcionada');
        }

        const response = await axios.post<CrearPlanPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/crear-plan-acuerdo-pago/`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error en crearPlanPago:', error);
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 'Error al crear el plan de pago';
            throw new Error(errorMessage);
        }
        throw error;
    }
}; 