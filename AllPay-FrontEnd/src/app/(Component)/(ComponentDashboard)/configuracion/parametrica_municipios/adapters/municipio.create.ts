import axios from 'axios';
import { MunicipioResponse } from '../models/municipio.types';

const baseApiUrl = process.env.BASE_API_URL;

export interface MunicipioCreatePayload {
    cod_municipio: string;
    nombre: string;
    cod_departamento: string;
    es_cacaotero: boolean;
}

export const createMunicipio = async (
    token: string, 
    payload: MunicipioCreatePayload
): Promise<MunicipioResponse> => {
    try {
        const url = `${baseApiUrl}personas/municipios/`;

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al crear el municipio');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en createMunicipio:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al crear municipio: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al crear municipio');
    }
};
