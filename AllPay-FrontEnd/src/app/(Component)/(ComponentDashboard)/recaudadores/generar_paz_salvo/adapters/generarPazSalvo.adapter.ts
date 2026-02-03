import axios from 'axios';
import { 
    GenerarPazSalvoRequest, 
    GenerarPazSalvoResponse, 
    GenerarPazSalvoMapped 
} from '../models/generarPazSalvo.model';

const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const generarPazSalvo = async (
    token: string, 
    pazSalvoData: GenerarPazSalvoRequest
): Promise<GenerarPazSalvoMapped> => {
    try {
        const response = await axios.post<GenerarPazSalvoResponse>(
            `${getBaseApiUrl()}cartera/paz-salvo-crear/`,
            pazSalvoData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al generar el paz y salvo');
        }

        return {
            success: response.data.success,
            detail: response.data.detail,
            data: response.data.data
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al generar paz y salvo:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            if (error.response?.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }
            throw new Error(`Error al generar paz y salvo: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 