import axios from 'axios';
import { DateResponse, CreateDatePayload } from '../models/date.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const getDates = async (token: string): Promise<DateResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}recaudos/fechas-cierre/`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.detail || 'Error al obtener las fechas de cierre');
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener las fechas de cierre');
        }
        throw error;
    }
};

export const createDate = async (payload: CreateDatePayload, token: string): Promise<DateResponse> => {
    try {
        const response = await axios.post(`${baseApiUrl}recaudos/fechas-cierre/`, payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.detail || 'Error al crear la fecha de cierre');
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al crear la fecha de cierre');
        }
        throw error;
    }
}; 