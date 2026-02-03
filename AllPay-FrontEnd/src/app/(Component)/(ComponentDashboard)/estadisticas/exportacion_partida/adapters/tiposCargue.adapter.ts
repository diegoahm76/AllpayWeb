import axios from 'axios';
import { TiposCargueResponse } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/tiposCargue.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTiposCargue = async (token: string): Promise<TiposCargueResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}choices/cod-tipo-cargue/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los tipos de cargue');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTiposCargue:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener los tipos de cargue');
        }
        throw new Error('Error inesperado al obtener los tipos de cargue');
    }
}; 