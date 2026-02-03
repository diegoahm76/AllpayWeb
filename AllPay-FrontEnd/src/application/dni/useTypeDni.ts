import { useState } from 'react';
import { getTypeDni } from '@/adapters/dni/dni.getAllType';
import { TypeDni } from '@/domain/models/dni/types';

export const useTypeDni = () => {
    const [types, setTypes] = useState<TypeDni[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTypes = async (token: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getTypeDni(token);
            setTypes(response.data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al obtener tipos de documento');
            console.error('Error fetching document types:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        types,
        isLoading,
        error,
        fetchTypes
    };
};
