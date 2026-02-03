import axios from 'axios';
import { PuertoExportacionResponse } from '../models/puertoExportacion.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getPuertosExportacion = async (token: string): Promise<PuertoExportacionResponse> => {
    try {
        const response = await axios.get<PuertoExportacionResponse>(
            `${getBaseApiUrl()}cartera/puertos-exportacion/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los puertos de exportación');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener puertos de exportación:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener puertos de exportación: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 