import axios from 'axios';
import { LiquidacionComprasAcuerdoPagoRequest, LiquidacionComprasAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/externo/liquidacionComprasAcuerdoPagoExterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export const createLiquidacionComprasAcuerdoPagoExterno = async (
    token: string,
    request: LiquidacionComprasAcuerdoPagoRequest
): Promise<LiquidacionComprasAcuerdoPagoResponse> => {
    try {
        const response = await axios.post<LiquidacionComprasAcuerdoPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/liquidacion-compras-acuerdos-pago-externo/`,
            request,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al crear la liquidación de compras de acuerdo de pago');
        }
        throw new Error('Error al crear la liquidación de compras de acuerdo de pago');
    }
}; 