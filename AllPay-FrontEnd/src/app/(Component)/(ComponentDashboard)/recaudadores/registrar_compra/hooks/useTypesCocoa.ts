import { useState, useEffect } from 'react';
import { getTiposCacaoActivos, formatTiposCacaoForSelect } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/adapter/collector.typesCocoa';
import { TipoCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/models/typeCacao';

interface UseTypesCocoa {
    tiposCacao: { key: number; value: string; title: string; }[];
    tiposCacaoData: TipoCacao[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useTypesCocoa = (token: string): UseTypesCocoa => {

    const [tiposCacao, setTiposCacao] = useState<{ key: number; value: string; title: string; }[]>([]);
    const [tiposCacaoData, setTiposCacaoData] = useState<TipoCacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTiposCacao = async () => {
        try {
            setLoading(true);
            setError(null);
            const tipos = await getTiposCacaoActivos(token);
            const tiposFormateados = formatTiposCacaoForSelect(tipos);
            setTiposCacao(tiposFormateados);
            setTiposCacaoData(tipos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al obtener tipos de cacao');
            console.error('Error al obtener tipos de cacao:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTiposCacao();
    }, [token]);

    return {
        tiposCacao,
        tiposCacaoData,
        loading,
        error,
        refetch: fetchTiposCacao
    };
}; 