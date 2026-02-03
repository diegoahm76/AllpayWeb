import axios from 'axios';
import { TipoDocumentoResponse } from '../models/tipoDocumento.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getTiposDocumento = async (token: string): Promise<TipoDocumentoResponse> => {
    try {
        const response = await axios.get<TipoDocumentoResponse>(
            `${getBaseApiUrl()}personas/tipos-documento/get-list/?activo=True`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los tipos de documento');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener tipos de documento:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener tipos de documento: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 