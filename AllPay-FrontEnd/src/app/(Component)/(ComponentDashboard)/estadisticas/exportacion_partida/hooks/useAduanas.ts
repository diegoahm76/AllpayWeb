import { useState, useCallback } from 'react';
import { obtenerAduanas } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/adapters/aduanas.adapter';
import { AduanasResponse } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/aduanas.model';

const useAduanas = () => {
    const [aduanas, setAduanas] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchAduanas = useCallback(async (token: string): Promise<AduanasResponse | null> => {
        if (hasFetched) return null; // Evitar múltiples llamadas
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerAduanas(token);
            setAduanas(response.data);
            setHasFetched(true);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener las aduanas de embarque';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched]);

    const clearAduanas = useCallback(() => {
        setAduanas([]);
        setError(null);
        setHasFetched(false);
    }, []);

    const refetchAduanas = useCallback(async (token: string) => {
        setHasFetched(false); // Reset para permitir nueva consulta
        try {
            await fetchAduanas(token);
        } catch (error) {
            console.error('Error al recargar aduanas de embarque:', error);
        }
    }, [fetchAduanas]);

    return {
        aduanas,
        isLoading,
        error,
        fetchAduanas,
        clearAduanas,
        refetchAduanas,
        hasFetched
    };
};

export default useAduanas; 