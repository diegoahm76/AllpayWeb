import { useState, useEffect } from 'react';
import { getTiposPazSalvo } from '../adapters/tipoPazSalvo.adapter';
import { TipoPazSalvoData } from '../models/tipoPazSalvo.model';

export const useTiposPazSalvo = (token: string) => {
    const [tiposPazSalvo, setTiposPazSalvo] = useState<TipoPazSalvoData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTiposPazSalvo = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                if (!token) {
                    throw new Error('No hay token disponible');
                }

                const response = await getTiposPazSalvo(token);
                setTiposPazSalvo(response.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar los tipos de paz y salvo');
                console.error('Error en useTiposPazSalvo:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTiposPazSalvo();
    }, [token]);

    return {
        tiposPazSalvo,
        isLoading,
        error
    };
}; 