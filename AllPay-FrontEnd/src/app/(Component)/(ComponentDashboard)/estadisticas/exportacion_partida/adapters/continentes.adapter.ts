import axios from 'axios';
import { ContinentesResponse } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/continentes.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerContinentes = async (token: string): Promise<ContinentesResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}reportes/select/continentes/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los continentes');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerContinentes:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener los continentes');
        }
        throw new Error('Error inesperado al obtener los continentes');
    }
}; 