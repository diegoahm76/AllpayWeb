import { useState, useEffect } from 'react';
import { getPercentageHistory } from '../adapter/percentageHistory.getAll';
import { PercentageHistoryResponse, PercentageHistoryFilters } from '../models/percentageHistory.model';

export const usePercentageHistory = (token: string, filters: PercentageHistoryFilters = {}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PercentageHistoryResponse | null>(null);

    const fetchData = async () => {
        if (!token) {
            setError('No hay token de autenticación');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await getPercentageHistory(token, filters);
            setData(response);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al obtener el historial de porcentajes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token, filters.page, filters.page_size, filters.cod_tipo_cobro]);

    return {
        loading,
        error,
        data,
        refetch: fetchData
    };
}; 