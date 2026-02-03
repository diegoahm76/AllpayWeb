import axios from 'axios';
import { CollectionTypeResponse } from '@/domain/models/recaudadores/collectionType.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getCollectionTypes = async (token: string): Promise<CollectionTypeResponse> => {
    try {
        const response = await axios.get(
            `${baseApiUrl}choices/cod-tipo-cobro/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los tipos de cobro');
        }

        const transformedData = response.data.data.map((item: [string, string]) => ({
            codigo: item[0],
            descripcion: item[1]
        }));

        return {
            ...response.data,
            data: transformedData
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener tipos de cobro:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener tipos de cobro: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};
