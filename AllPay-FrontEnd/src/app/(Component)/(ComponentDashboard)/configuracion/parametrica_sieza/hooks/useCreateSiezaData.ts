import { useState, useCallback } from 'react';
import { createSiezaData, SiezaCreatePayload } from '../adapters/sieza.create';

const useCreateSiezaData = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addSiezaData = useCallback(async (
        token: string, 
        payload: SiezaCreatePayload
    ) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await createSiezaData(token, payload);
            return response;
        } catch (err: any) {
            console.error('Error en useCreateSiezaData:', err);
            setError(err.message || 'Error al crear el registro del sistema contable');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        addSiezaData
    };
};

export default useCreateSiezaData;
