import { useState, useEffect, useCallback } from 'react';
import { getPazSalvoFechasVigentes } from '../adapters/pazSalvoDate.getAll';
import { PazSalvoDateResponse } from '../models/pazSalvoDate.model';

export const usePazSalvoDate = (token: string) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PazSalvoDateResponse | null>(null);

    const fetchPazSalvoFechasVigentes = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getPazSalvoFechasVigentes(token);
            setData(response);
            setError(null);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al obtener las fechas de vigencia de Paz y Salvo');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPazSalvoFechasVigentes();
    }, [fetchPazSalvoFechasVigentes]);

    return { loading, error, data, refetch: fetchPazSalvoFechasVigentes };
}; 