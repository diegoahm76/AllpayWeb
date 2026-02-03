import { useState, useCallback } from 'react';
import { editMunicipio, MunicipioEditPayload } from '../adapters/municipio.edit';

const useEditMunicipio = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateMunicipio = useCallback(async (
        token: string, 
        idMunicipio: string, 
        payload: MunicipioEditPayload
    ) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await editMunicipio(token, idMunicipio, payload);
            return response;
        } catch (err: any) {
            console.error('Error en useEditMunicipio:', err);
            setError(err.message || 'Error al actualizar el municipio');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        updateMunicipio
    };
};

export default useEditMunicipio;
