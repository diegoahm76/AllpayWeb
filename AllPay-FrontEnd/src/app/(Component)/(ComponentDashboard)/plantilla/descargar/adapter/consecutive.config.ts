import axios from 'axios';
import { ConsecutiveConfigResponse } from '../models/consecutive.config.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getConsecutiveConfig = async (token: string): Promise<ConsecutiveConfigResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}documentos/configuracion_consecutivo/`, {
            params: {
                sin_paginacion: true
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener la configuración de consecutivos');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener la configuración de consecutivos: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 