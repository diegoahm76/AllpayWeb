import axios from 'axios';
import { UpdatePazSalvoDatePayload, UpdatePazSalvoDateResponse } from '../models/pazSalvoDate.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const updatePazSalvoFechaVigente = async (
    codTipoFecha: string,
    payload: UpdatePazSalvoDatePayload, 
    token: string
): Promise<UpdatePazSalvoDateResponse> => {
    try {
        console.log('[updatePazSalvoFechaVigente] - Actualizando fecha vigente:', codTipoFecha);
        console.log('Payload:', payload);
        
        // Usar la URL base de la API para todas las rutas, incluyendo facturas pagadas
        const apiUrl = `${baseApiUrl}${codTipoFecha === 'FP' ? 'cartera/fechas-vigentes-update/FP/' : `cartera/fechas-vigentes-update/${codTipoFecha}/`}`;
            
        console.log('URL:', apiUrl);
        
        const response = await axios.put(
            apiUrl,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('[updatePazSalvoFechaVigente] - Respuesta:', response.data);

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al actualizar la fecha de vigencia de Paz y Salvo');
        }

        return response.data;
    } catch (error) {
        console.error('[updatePazSalvoFechaVigente] - Error:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al actualizar la fecha de vigencia de Paz y Salvo');
        }
        throw error;
    }
}; 