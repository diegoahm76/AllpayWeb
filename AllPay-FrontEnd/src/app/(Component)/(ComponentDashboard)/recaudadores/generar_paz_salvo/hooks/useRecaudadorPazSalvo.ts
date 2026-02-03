import { useState, useEffect } from 'react';
import { getRecaudadorPazSalvoData } from '../adapters/recaudadorPazSalvo.adapter';
import { RecaudadorPazSalvoData } from '../models/recaudadorPazSalvo.model';

export const useRecaudadorPazSalvo = (token: string) => {
    const [recaudadorData, setRecaudadorData] = useState<RecaudadorPazSalvoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecaudadorData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            if (!token) {
                throw new Error('No hay token disponible');
            }

            const response = await getRecaudadorPazSalvoData(token);
            setRecaudadorData(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar los datos del recaudador');
            console.error('Error en useRecaudadorPazSalvo:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecaudadorData();
    }, [token]);

    return {
        recaudadorData,
        isLoading,
        error,
        refetch: fetchRecaudadorData
    };
}; 