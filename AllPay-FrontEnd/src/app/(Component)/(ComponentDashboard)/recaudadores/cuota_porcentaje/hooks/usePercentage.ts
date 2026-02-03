import { useState, useEffect } from 'react';
import { getPercentages } from '../adapter/percentage.getAll';
import { PercentageResponse } from '../models/percentage.model';

export const usePercentage = (token: string) => {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PercentageResponse | null>(null);

    useEffect(() => {

        const fetchData = async () => {
            if (!token) {
                setError('No hay token de autenticación');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await getPercentages(token);
                setData(response);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al obtener los porcentajes');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    return {
        loading,
        error,
        data,
        refetch: async () => {
            if (!token) {
                setError('No hay token de autenticación');
                return;
            }

            try {
                setLoading(true);
                const response = await getPercentages(token);
                setData(response);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al obtener los porcentajes');
            } finally {
                setLoading(false);
            }
        }
    };
}; 