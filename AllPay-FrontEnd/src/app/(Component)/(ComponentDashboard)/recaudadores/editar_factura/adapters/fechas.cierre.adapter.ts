import axios from 'axios';
import { FechasCierreResponse } from '../models/fechas.cierre.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getFechasCierre = async (token: string): Promise<FechasCierreResponse> => {
    try {
        const response = await axios.get<FechasCierreResponse>(
            `${baseApiUrl}recaudos/fechas-cierre-all/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener las fechas de cierre');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener fechas de cierre:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener fechas de cierre: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 