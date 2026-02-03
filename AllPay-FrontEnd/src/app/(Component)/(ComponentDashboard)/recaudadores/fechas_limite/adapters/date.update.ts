import axios from 'axios';
import { UpdateDatePayload, UpdateDateResponse } from '../models/updateDate.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const updateDate = async (id: string, payload: UpdateDatePayload, token: string): Promise<UpdateDateResponse> => {
    try {
        const response = await axios.patch(
            `${baseApiUrl}recaudos/fechas-cierre/${id}/`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al actualizar la fecha de cierre');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al actualizar la fecha de cierre');
        }
        throw error;
    }
}; 