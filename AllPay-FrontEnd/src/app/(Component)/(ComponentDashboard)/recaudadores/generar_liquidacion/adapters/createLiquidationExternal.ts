import axios from 'axios';
import { LiquidacionRequest, LiquidacionResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/models/liquidacion.external';

const baseApiUrl = process.env.BASE_API_URL;

export const createLiquidation = async (
    token: string,
    request: LiquidacionRequest
): Promise<LiquidacionResponse> => {
    try {
        const response = await axios.post<LiquidacionResponse>(
            `${baseApiUrl}recaudos/liquidacion-compras-externo/`,
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
            throw new Error(error.response?.data?.detail || 'Error al crear la liquidación');
        }
        throw new Error('Error al crear la liquidación');
    }
}; 