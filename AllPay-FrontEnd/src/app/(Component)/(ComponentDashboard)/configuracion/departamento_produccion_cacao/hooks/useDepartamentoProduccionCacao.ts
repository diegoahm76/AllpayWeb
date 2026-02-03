import { useEffect, useState } from 'react';
import { getDepartamentoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/departamento_produccion_cacao/adapters/getDepartamentoProduccionCacao';
import { 
    DepartamentoProduccionCacao, 
    DepartamentoProduccionCacaoFilters 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/departamento_produccion_cacao/models/departamentoProduccionCacao.model';

export const useDepartamentoProduccionCacao = (token: string, filters?: DepartamentoProduccionCacaoFilters) => {
    const [data, setData] = useState<DepartamentoProduccionCacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchDepartamentos = async () => {
        if (!token) return;
        
        try {
            setLoading(true);
            const response = await getDepartamentoProduccionCacao(token, filters);
            setData(response.data);
            setTotalPages(response.total_pages);
            setCurrentPage(response.current_page);
            setTotalCount(response.count);
            setError(null);
        } catch (err: any) {
            const errorMessage = err?.response?.data?.detail || 'Error al cargar el histórico de producción por departamento';
            setError(errorMessage);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartamentos();
    }, [token, filters?.page, filters?.page_size]);

    return { 
        data, 
        loading, 
        initialLoading,
        error, 
        totalPages, 
        currentPage, 
        totalCount,
        refetch: fetchDepartamentos 
    };
};
