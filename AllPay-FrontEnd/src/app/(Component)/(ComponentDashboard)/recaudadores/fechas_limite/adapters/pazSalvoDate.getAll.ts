import axios from 'axios';
import { PazSalvoDateResponse } from '../models/pazSalvoDate.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const getPazSalvoFechasVigentes = async (token: string): Promise<PazSalvoDateResponse> => {
    try {
        console.log('[getPazSalvoFechasVigentes] - Obteniendo fechas vigentes');
        console.log('URL:', `${baseApiUrl}cartera/fechas-vigentes-list/`);
        
        const response = await axios.get(`${baseApiUrl}cartera/fechas-vigentes-list/`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[getPazSalvoFechasVigentes] - Respuesta:', response.data);

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.detail || 'Error al obtener las fechas de vigencia de Paz y Salvo');
        }
    } catch (error) {
        console.error('[getPazSalvoFechasVigentes] - Error:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener las fechas de vigencia de Paz y Salvo');
        }
        throw error;
    }
}; 