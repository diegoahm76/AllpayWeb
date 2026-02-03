import { useEffect, useState } from 'react';
import { getHistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/adapters/getHistoricoProduccionCacao';
import { 
    HistoricoProduccionCacao, 
    HistoricoProduccionCacaoFilters 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/historicoProduccionCacao.model';

export const useHistoricoProduccionCacao = (token: string, filters?: HistoricoProduccionCacaoFilters) => {
    const [data, setData] = useState<HistoricoProduccionCacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchHistorico = async () => {
        if (!token) return;
        
        try {
            setLoading(true);
            const response = await getHistoricoProduccionCacao(token, filters);
            setData(response.data);
            setTotalPages(response.total_pages);
            setCurrentPage(response.current_page);
            setTotalCount(response.count);
            setError(null);
        } catch (err: any) {
            const errorMessage = err?.response?.data?.detail || 'Error al cargar el histórico de producción de cacao';
            setError(errorMessage);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchHistorico();
    }, [token, filters?.page, filters?.page_size]);

    return { 
        data, 
        loading, 
        initialLoading,
        error, 
        totalPages, 
        currentPage, 
        totalCount,
        refetch: fetchHistorico 
    };
};
