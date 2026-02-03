import { useState, useCallback } from 'react';
import { deleteSiezaData } from '../adapters/sieza.delete';

const useDeleteSiezaData = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteSieza = useCallback(async (
        token: string, 
        id: number
    ) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await deleteSiezaData(token, id);
            return response;
        } catch (err: any) {
            console.error('Error en useDeleteSiezaData:', err);
            setError(err.message || 'Error al eliminar el registro del sistema contable');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        deleteSieza
    };
};

export default useDeleteSiezaData;
