import axios from 'axios';
import { UpdatePuertoExportacionData } from '../models/types';

const baseApiUrl = process.env.BASE_API_URL;

export const updatePuertoExportacion = async (
    token: string,
    id: number,
    data: UpdatePuertoExportacionData
): Promise<boolean> => {
    try {

        const response = await axios.put(
            `${baseApiUrl}cartera/puertos-exportacion/update/${id}/`,
            data,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al actualizar el puerto de exportación');
        }

        return true;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la actualización:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al actualizar el puerto de exportación');
        }
        throw error;
    }
};