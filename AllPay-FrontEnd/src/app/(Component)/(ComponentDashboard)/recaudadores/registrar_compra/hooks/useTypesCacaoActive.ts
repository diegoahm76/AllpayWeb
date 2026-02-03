import { useState, useEffect } from 'react';
import { getTiposCacaoActivos, TipoCacao } from '../adapter/cacao.typesActive';

export const useTiposCacao = (token: string) => {
    const [tiposCacao, setTiposCacao] = useState<TipoCacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchTiposCacao = async () => {
            try {
                const response = await getTiposCacaoActivos(token);
                setTiposCacao(response.data);
                setLoading(false);
            } catch (err) {
                setError(err as Error);
                setLoading(false);
            }
        };

        if (token) {
            fetchTiposCacao();
        }
    }, [token]);

    return { tiposCacao, loading, error };
}; 