import { useState, useCallback } from 'react';
import { obtenerTiposCargue } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/adapters/tiposCargue.adapter';
import { TiposCargueResponse, TipoCargue } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/tiposCargue.model';

const useTiposCargue = () => {
    const [tiposCargue, setTiposCargue] = useState<TipoCargue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchTiposCargue = useCallback(async (token: string): Promise<TiposCargueResponse | null> => {
        if (hasFetched) return null; // Evitar múltiples llamadas
        
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTiposCargue(token);
            
            // Transformar el array de arrays a array de objetos
            const tiposTransformados: TipoCargue[] = response.data.map(([codigo, nombre]) => ({
                codigo,
                nombre
            }));
            
            setTiposCargue(tiposTransformados);
            setHasFetched(true);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los tipos de cargue';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched]);

    const clearTiposCargue = useCallback(() => {
        setTiposCargue([]);
        setError(null);
        setHasFetched(false);
    }, []);

    const refetchTiposCargue = useCallback(async (token: string) => {
        setHasFetched(false); // Reset para permitir nueva consulta
        try {
            await fetchTiposCargue(token);
        } catch (error) {
            console.error('Error al recargar tipos de cargue:', error);
        }
    }, [fetchTiposCargue]);

    return {
        tiposCargue,
        isLoading,
        error,
        fetchTiposCargue,
        clearTiposCargue,
        refetchTiposCargue,
        hasFetched
    };
};

export default useTiposCargue; 