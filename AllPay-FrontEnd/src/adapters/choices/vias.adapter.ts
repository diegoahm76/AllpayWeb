import axios from 'axios';
import { ViasResponse } from '@/domain/models/choices/vias.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerVias = async (token: string): Promise<ViasResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}reportes/select/vias/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener las vías de transporte');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerVias:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener las vías de transporte');
        }
        throw new Error('Error inesperado al obtener las vías de transporte');
    }
}; 