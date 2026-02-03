import { useState, useEffect } from 'react';
import { getCollectionTypes } from '@/adapters/recaudadores/collectionType.getAll';
import { CollectionTypeResponse } from '@/domain/models/recaudadores/collectionType.model';

export const useCollectionTypes = (token: string) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CollectionTypeResponse | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                setError('No hay token de autenticación');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await getCollectionTypes(token);
                setData(response);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al obtener los tipos de cobro');
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
                const response = await getCollectionTypes(token);
                setData(response);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al obtener los tipos de cobro');
            } finally {
                setLoading(false);
            }
        }
    };
}; 