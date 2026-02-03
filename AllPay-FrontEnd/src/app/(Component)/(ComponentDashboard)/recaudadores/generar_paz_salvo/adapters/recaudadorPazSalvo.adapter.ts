import axios from 'axios';
import { RecaudadorPazSalvoResponse, RecaudadorPazSalvoMapped } from '../models/recaudadorPazSalvo.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getRecaudadorPazSalvoData = async (token: string): Promise<RecaudadorPazSalvoMapped> => {
    try {
        const response = await axios.get<RecaudadorPazSalvoResponse>(
            `${getBaseApiUrl()}cartera/paz-salvo-datos-recaudador/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los datos del recaudador para paz y salvo');
        }

        console.log('Datos del recaudador recibidos:', response.data.data);

        return {
            success: response.data.success,
            detail: response.data.detail,
            data: response.data.data
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener datos del recaudador para paz y salvo:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener datos del recaudador: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 