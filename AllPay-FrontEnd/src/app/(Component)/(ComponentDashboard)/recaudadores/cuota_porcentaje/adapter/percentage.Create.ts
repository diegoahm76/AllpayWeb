import axios from 'axios';
import { PercentageCreateResponse, PercentageCreatePayload } from '../models/percentage.create.model';

const baseApiUrl = process.env.BASE_API_URL;

export const createPercentage = async (token: string, payload: PercentageCreatePayload): Promise<PercentageCreateResponse> => {
    try {
        const response = await axios.post(
            `${baseApiUrl}recaudos/porcentaje-cobro/`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al crear el porcentaje de cobro');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al crear porcentaje:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al crear porcentaje: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};

