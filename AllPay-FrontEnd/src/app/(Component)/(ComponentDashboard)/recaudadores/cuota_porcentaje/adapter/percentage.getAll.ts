import axios from 'axios';
import { PercentageData, PercentageResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/cuota_porcentaje/models/percentage.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getPercentages = async (token: string): Promise<PercentageResponse> => {
    try {
        const response = await axios.get(
            `${baseApiUrl}recaudos/porcentaje-cobro/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los porcentajes de cobro');
        }

        const formattedData = response.data.data.map((item: PercentageData) => ({
            ...item,
            valor: (parseFloat(item.valor) * 100).toString()
        }));

        return {
            ...response.data,
            data: formattedData
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener porcentajes:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener porcentajes: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 