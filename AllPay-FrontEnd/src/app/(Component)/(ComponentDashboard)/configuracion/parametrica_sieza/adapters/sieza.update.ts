import axios from 'axios';
import { SiezaItem } from '../models/sieza.types';

const baseApiUrl = process.env.BASE_API_URL;

export interface SiezaUpdatePayload {
    descripcion: string;
    auxiliar: string;
    compania: string;
    centro: string;
    unidad: string;
    sucursal: string;
    tipo_documento: string;
}

export const updateSiezaData = async (
    token: string, 
    id: number,
    payload: SiezaUpdatePayload
): Promise<SiezaItem> => {
    try {
        const url = `${baseApiUrl}recaudos/siesa/${id}/update/`;

        const response = await axios.patch(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al actualizar el registro del sistema contable');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en updateSiezaData:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al actualizar registro del sistema contable: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al actualizar registro del sistema contable');
    }
};
