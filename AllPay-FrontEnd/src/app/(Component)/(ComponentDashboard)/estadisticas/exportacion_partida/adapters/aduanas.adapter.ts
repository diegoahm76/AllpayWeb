import axios from 'axios';
import { AduanasResponse } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/aduanas.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerAduanas = async (token: string): Promise<AduanasResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}reportes/select/aduanas-embarque/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener las aduanas de embarque');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerAduanas:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener las aduanas de embarque');
        }
        throw new Error('Error inesperado al obtener las aduanas de embarque');
    }
}; 