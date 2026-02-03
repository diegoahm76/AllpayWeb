import axios from 'axios';
import { AgregarFacturaCuotaResponse, AgregarFacturaCuotaPayload } from '../models/agregarFacturaCuota.model';

const baseApiUrl = process.env.BASE_API_URL;

export const agregarFacturaCuota = async (
    token: string,
    payload: AgregarFacturaCuotaPayload
): Promise<AgregarFacturaCuotaResponse> => {
    try {
        if (!payload.id_solicitud_acuerdo_pago) {
            throw new Error('ID de solicitud no proporcionado');
        }

        if (!payload.id_plan_pago) {
            throw new Error('ID de plan de pago no proporcionado');
        }

        if (!payload.id_facturas || payload.id_facturas.length === 0) {
            throw new Error('ID de facturas no proporcionado');
        }

        if (!payload.fecha_pago) {
            throw new Error('Fecha de pago no proporcionada');
        }

        const response = await axios.post<AgregarFacturaCuotaResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/agregar-factura-cuota/`,
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
        console.error('Error en agregarFacturaCuota:', error);
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 'Error al agregar factura a la cuota';
            throw new Error(errorMessage);
        }
        throw error;
    }
}; 