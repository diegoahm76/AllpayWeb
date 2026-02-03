import { useEffect, useState } from 'react';
import { getRendimientoCenso } from '../adapters/rendimientoCenso.adapter';
import { 
    RendimientoCenso, 
    RendimientoCensoFilters,
    EstadisticasRendimiento
} from '../models/rendimientoCenso.model';

export const useRendimientoCenso = (token: string, filters?: RendimientoCensoFilters) => {
    const [data, setData] = useState<RendimientoCenso[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [estadisticas, setEstadisticas] = useState<EstadisticasRendimiento | null>(null);

    const fetchRendimientoCenso = async () => {
        if (!token) return;
        
        try {
            setLoading(true);
            const response = await getRendimientoCenso(token, filters);
            setData(response.data);
            setTotalPages(response.total_pages);
            setCurrentPage(response.current_page);
            setTotalCount(response.count);
            setEstadisticas(response.estadisticas);
            setError(null);
        } catch (err: any) {
            const errorMessage = err?.response?.data?.detail || err?.message || 'Error al cargar el rendimiento censo';
            setError(errorMessage);
            console.error('[useRendimientoCenso] - Error:', err);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchRendimientoCenso();
    }, [token, filters?.page, filters?.page_size]);

    return { 
        data, 
        loading, 
        initialLoading,
        error, 
        totalPages, 
        currentPage, 
        totalCount,
        estadisticas,
        refetch: fetchRendimientoCenso 
    };
};
