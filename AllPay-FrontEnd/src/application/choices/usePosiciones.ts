import { useState, useCallback } from 'react';
import { obtenerPosiciones } from '@/adapters/choices/posiciones.adapter';
import { PosicionesResponse } from '@/domain/models/choices/posiciones.model';

const usePosiciones = () => {
    const [posiciones, setPosiciones] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchPosiciones = useCallback(async (token: string): Promise<PosicionesResponse | null> => {
        if (hasFetched) return null; // Evitar múltiples llamadas
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerPosiciones(token);
            setPosiciones(response.data);
            setHasFetched(true);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener las posiciones arancelarias';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched]);

    const clearPosiciones = useCallback(() => {
        setPosiciones([]);
        setError(null);
        setHasFetched(false);
    }, []);

    const refetchPosiciones = useCallback(async (token: string) => {
        setHasFetched(false); // Reset para permitir nueva consulta
        try {
            await fetchPosiciones(token);
        } catch (error) {
            console.error('Error al recargar posiciones arancelarias:', error);
        }
    }, [fetchPosiciones]);

    return {
        posiciones,
        isLoading,
        error,
        fetchPosiciones,
        clearPosiciones,
        refetchPosiciones,
        hasFetched
    };
};

export default usePosiciones; 