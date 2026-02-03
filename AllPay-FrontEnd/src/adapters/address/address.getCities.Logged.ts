import axios from 'axios';
import { MunicipioColombiaResponse } from '@/domain/models/municipioColombia/types';

const baseApiUrl = process.env.BASE_API_URL;

export const getMunicipiosColombia = async (departamentoId: string): Promise<MunicipioColombiaResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}personas/municipio/get-list/${departamentoId}/`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail);
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getMunicipiosColombia:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener municipios: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener municipios');
    }
}; 