import axios from 'axios';
import { MunicipioResponse } from '../models/municipio.types';

const baseApiUrl = process.env.BASE_API_URL;

export interface MunicipioEditPayload {
    nombre: string;
    es_cacaotero: boolean;
    cod_departamento: string;
}

export const editMunicipio = async (
    token: string, 
    idMunicipio: string, 
    payload: MunicipioEditPayload
): Promise<MunicipioResponse> => {
    try {
        const url = `${baseApiUrl}personas/municipios/${idMunicipio}/`;

        const response = await axios.patch(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al actualizar el municipio');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en editMunicipio:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al actualizar municipio: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al actualizar municipio');
    }
};
