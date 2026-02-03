import { useState, useCallback } from 'react';
import { deleteMunicipio } from '../adapters/municipio.delete';

const useDeleteMunicipio = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const removeMunicipio = useCallback(async (
        token: string, 
        idMunicipio: string
    ) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await deleteMunicipio(token, idMunicipio);
            return response;
        } catch (err: any) {
            console.error('Error en useDeleteMunicipio:', err);
            setError(err.message || 'Error al eliminar el municipio');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        removeMunicipio
    };
};

export default useDeleteMunicipio;
