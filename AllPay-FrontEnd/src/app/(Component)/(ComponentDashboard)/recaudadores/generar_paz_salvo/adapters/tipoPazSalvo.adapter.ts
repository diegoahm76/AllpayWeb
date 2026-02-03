import axios from 'axios';
import { TipoPazSalvoResponse, TipoPazSalvoMapped, TipoPazSalvoData } from '../models/tipoPazSalvo.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getTiposPazSalvo = async (token: string): Promise<TipoPazSalvoMapped> => {
    try {
        const response = await axios.get<TipoPazSalvoResponse>(
            `${getBaseApiUrl()}choices/cod-tipo-paz-y-salvo/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los tipos de paz y salvo');
        }

        // Transformar el array de arrays a array de objetos
        const mappedData: TipoPazSalvoData[] = response.data.data.map(([codigo, descripcion]) => ({
            codigo,
            descripcion
        }));

        return {
            success: response.data.success,
            detail: response.data.detail,
            data: mappedData
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener tipos de paz y salvo:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener tipos de paz y salvo: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 