import { useState, useEffect, useCallback } from 'react';
import { getDates } from '../adapters/date.getAll';
import { DateResponse } from '../models/date.model';

export const useDate = (token: string) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DateResponse | null>(null);

    const fetchDates = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDates(token);
            setData(response);
            setError(null);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al obtener las fechas de cierre');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchDates();
    }, [fetchDates]);

    return { loading, error, data, refetch: fetchDates };
}; 