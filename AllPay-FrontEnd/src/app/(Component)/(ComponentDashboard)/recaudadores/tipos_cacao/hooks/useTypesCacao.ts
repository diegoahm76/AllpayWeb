import { useEffect, useState } from 'react';
import { getTypesCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/adapters/getTypesCacao';
import { TypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/typeCacao.model';

export const useTypesCacao = (token: string) => {
    const [types, setTypes] = useState<TypeCacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTypes = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await getTypesCacao(token);
            setTypes(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.response.data.detail);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, [token]);

    return { types, loading, error, refetch: fetchTypes };
}; 