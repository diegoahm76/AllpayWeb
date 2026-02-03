import axios from 'axios';
import { PercentageResponse, UpdatePercentagePayload } from '../models/percentage.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getPercentages = async (token: string): Promise<PercentageResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}recaudos/porcentaje-cobro/`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.detail || 'Error al obtener los porcentajes');
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener los porcentajes');
        }
        throw error;
    }
};

export const updatePercentage = async (id: number, payload: UpdatePercentagePayload, token: string): Promise<PercentageResponse> => {
    try {

        
        const truncateDecimals = (value: number, decimals: number): number => {
            const factor = Math.pow(10, decimals);
            return Math.floor(value * factor) / factor;
        };

        const formattedPayload = {
            ...payload,
            valor: truncateDecimals(parseFloat(payload.valor), 4).toString()
        };

        console.log(formattedPayload);

        const response = await axios.patch(`${baseApiUrl}recaudos/porcentaje-cobro/${id}/`, formattedPayload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.detail || 'Error al actualizar el porcentaje');
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al actualizar el porcentaje');
        }
        throw error;
    }
}; 