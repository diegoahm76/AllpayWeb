import axios from 'axios';
import { ConsecutivoPazSalvoResponse, ConsecutivoPazSalvoMapped } from '../models/consecutivoPazSalvo.model';

const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getConsecutivoPazSalvo = async (token: string): Promise<ConsecutivoPazSalvoMapped> => {
    try {
        console.log('Iniciando obtención del consecutivo de paz y salvo...');
        
        const apiUrl = `${getBaseApiUrl()}cartera/consecutivo-paz-salvo/`;
        console.log('URL del API:', apiUrl);
        
        const response = await axios.get<ConsecutivoPazSalvoResponse>(
            apiUrl,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log('Respuesta del API:', response.data);

        if (!response.data.success) {
            console.error('Error reportado por la API:', response.data.detail);
            throw new Error(response.data.detail || 'Error al obtener el consecutivo del paz y salvo');
        }

        return {
            success: response.data.success,
            detail: response.data.detail,
            consecutivo: response.data.consecutivo
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener el consecutivo de paz y salvo:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            if (error.response?.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }
            if (error.response?.status === 400 && error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            throw new Error(`Error al obtener el consecutivo: ${error.response?.data?.detail || error.message}`);
        }
        console.error('Error no Axios:', error);
        throw error;
    }
}; 