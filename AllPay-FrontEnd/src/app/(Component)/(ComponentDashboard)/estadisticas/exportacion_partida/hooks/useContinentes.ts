import { useState, useCallback } from 'react';
import { obtenerContinentes } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/adapters/continentes.adapter';
import { ContinentesResponse } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/continentes.model';

const useContinentes = () => {
    const [continentes, setContinentes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchContinentes = useCallback(async (token: string): Promise<ContinentesResponse | null> => {
        if (hasFetched) return null; // Evitar múltiples llamadas
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerContinentes(token);
            setContinentes(response.data);
            setHasFetched(true);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los continentes';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched]);

    const clearContinentes = useCallback(() => {
        setContinentes([]);
        setError(null);
        setHasFetched(false);
    }, []);

    const refetchContinentes = useCallback(async (token: string) => {
        setHasFetched(false); // Reset para permitir nueva consulta
        try {
            await fetchContinentes(token);
        } catch (error) {
            console.error('Error al recargar continentes:', error);
        }
    }, [fetchContinentes]);

    return {
        continentes,
        isLoading,
        error,
        fetchContinentes,
        clearContinentes,
        refetchContinentes,
        hasFetched
    };
};

export default useContinentes; 