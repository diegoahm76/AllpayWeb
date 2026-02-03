import axios from 'axios';
import { PorcentajeCobroResponse } from '../models/collector.porcentage.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getPorcentajesCobroPublico = async (token: string): Promise<PorcentajeCobroResponse> => {
    try {
        const response = await axios.get<PorcentajeCobroResponse>(
            `${baseApiUrl}recaudos/porcentaje-cobro-all/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error('La respuesta del servidor no fue exitosa');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener porcentajes de cobro: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};
