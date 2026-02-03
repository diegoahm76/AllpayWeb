import axios from 'axios';
import { MunicipioResponse } from '../models/municipio.types';

const baseApiUrl = process.env.BASE_API_URL;

export interface MunicipioParams {
    page?: number;
    page_size?: number;
    sin_paginacion?: boolean;
}

export const getMunicipios = async (token: string, params?: MunicipioParams): Promise<MunicipioResponse> => {
    try {
        // Construir query parameters
        const queryParams = new URLSearchParams();
        
        if (params?.page) {
            queryParams.append('page', params.page.toString());
        }
        
        if (params?.page_size) {
            queryParams.append('page_size', params.page_size.toString());
        }
        
        if (params?.sin_paginacion) {
            queryParams.append('sin_paginacion', 'true');
        }

        const url = `${baseApiUrl}personas/municipios/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al obtener los municipios');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getMunicipios:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener municipios: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener municipios');
    }
};
