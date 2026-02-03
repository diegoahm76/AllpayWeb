import axios from 'axios';
import { LiquidacionRequest, LiquidacionResponse } from '../models/liquidacion.internal';

const baseApiUrl = process.env.BASE_API_URL;

export const createLiquidationInternal = async (
    token: string,
    request: LiquidacionRequest
): Promise<LiquidacionResponse> => {
    try {
        const response = await axios.post<LiquidacionResponse>(
            `${baseApiUrl}recaudos/liquidacion-compras-interno/`,
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