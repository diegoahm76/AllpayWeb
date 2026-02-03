import axios from 'axios';
import { TypeDniResponse } from '@/domain/models/dni/types';

const baseApiUrl = process.env.BASE_API_URL;

export const getTypeDni = async (token: string): Promise<TypeDniResponse> => {

    try {
        const response = await axios.get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
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
            throw new Error(`Error al obtener tipos de documento: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
};
