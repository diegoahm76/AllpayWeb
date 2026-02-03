import axios from 'axios';
import { CreatePuertoExportacionData } from '../models/types';

const baseApiUrl = process.env.BASE_API_URL;

export const createPuertoExportacion = async (token: string, data: CreatePuertoExportacionData): Promise<boolean> => {
    try {
        const response = await axios.post(
            `${baseApiUrl}cartera/puertos-exportacion/create/`,
            data,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al crear el puerto de exportación');
        }

        return true;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al crear el puerto de exportación');
        }
        throw error;
    }
};