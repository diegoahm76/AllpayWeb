import { useState, useCallback } from 'react';
import { updateSiezaData, SiezaUpdatePayload } from '../adapters/sieza.update';

const useUpdateSiezaData = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateSieza = useCallback(async (
        token: string, 
        id: number,
        payload: SiezaUpdatePayload
    ) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await updateSiezaData(token, id, payload);
            return response;
        } catch (err: any) {
            console.error('Error en useUpdateSiezaData:', err);
            setError(err.message || 'Error al actualizar el registro del sistema contable');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        updateSieza
    };
};

export default useUpdateSiezaData;
