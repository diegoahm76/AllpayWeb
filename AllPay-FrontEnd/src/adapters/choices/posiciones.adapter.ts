import axios from 'axios';
import { PosicionesResponse } from '@/domain/models/choices/posiciones.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerPosiciones = async (token: string): Promise<PosicionesResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}reportes/select/posiciones/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener las posiciones arancelarias');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerPosiciones:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener las posiciones arancelarias');
        }
        throw new Error('Error inesperado al obtener las posiciones arancelarias');
    }
}; 