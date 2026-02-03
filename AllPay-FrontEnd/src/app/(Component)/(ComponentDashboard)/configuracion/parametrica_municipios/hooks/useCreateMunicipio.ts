import { useState, useCallback } from 'react';
import { createMunicipio, MunicipioCreatePayload } from '../adapters/municipio.create';

const useCreateMunicipio = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addMunicipio = useCallback(async (
        token: string, 
        payload: MunicipioCreatePayload
    ) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await createMunicipio(token, payload);
            return response;
        } catch (err: any) {
            console.error('Error en useCreateMunicipio:', err);
            setError(err.message || 'Error al crear el municipio');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        addMunicipio
    };
};

export default useCreateMunicipio;
