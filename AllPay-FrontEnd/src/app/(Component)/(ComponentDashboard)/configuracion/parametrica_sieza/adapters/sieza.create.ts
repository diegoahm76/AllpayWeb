import axios from 'axios';
import { SiezaResponse } from '../models/sieza.types';

const baseApiUrl = process.env.BASE_API_URL;

export interface SiezaCreatePayload {
    descripcion: string;
    auxiliar: string;
    compania: string;
    centro: string;
    unidad: string;
    sucursal: string;
    tipo_documento: string;
}

export const createSiezaData = async (
    token: string, 
    payload: SiezaCreatePayload
): Promise<SiezaResponse> => {
    try {
        const url = `${baseApiUrl}recaudos/siesa/create/`;

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al crear el registro del sistema contable');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en createSiezaData:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al crear registro del sistema contable: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al crear registro del sistema contable');
    }
};
