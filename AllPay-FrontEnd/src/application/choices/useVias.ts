import { useState, useCallback } from 'react';
import { obtenerVias } from '@/adapters/choices/vias.adapter';
import { ViasResponse } from '@/domain/models/choices/vias.model';

const useVias = () => {
    const [vias, setVias] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchVias = useCallback(async (token: string): Promise<ViasResponse | null> => {
        if (hasFetched) return null; // Evitar múltiples llamadas
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerVias(token);
            setVias(response.data);
            setHasFetched(true);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener las vías de transporte';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched]);

    const clearVias = useCallback(() => {
        setVias([]);
        setError(null);
        setHasFetched(false);
    }, []);

    const refetchVias = useCallback(async (token: string) => {
        setHasFetched(false); // Reset para permitir nueva consulta
        try {
            await fetchVias(token);
        } catch (error) {
            console.error('Error al recargar vías de transporte:', error);
        }
    }, [fetchVias]);

    return {
        vias,
        isLoading,
        error,
        fetchVias,
        clearVias,
        refetchVias,
        hasFetched
    };
};

export default useVias; 