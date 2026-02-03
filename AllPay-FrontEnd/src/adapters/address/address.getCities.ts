import axios from 'axios';
import { MunicipioColombiaResponse } from '@/domain/models/municipioColombia/types';

const baseApiUrl = process.env.BASE_API_URL;

export const getMunicipios = async (departamentoId: number, token: string): Promise<MunicipioColombiaResponse> => {
    try {
        // Formatear el código del departamento para asegurar dos dígitos
        const formattedDepartamentoId = departamentoId.toString().padStart(2, '0');
        
        const response = await axios.get(`${baseApiUrl}personas/municipio/get-list/${formattedDepartamentoId}/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener municipios: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
}; 