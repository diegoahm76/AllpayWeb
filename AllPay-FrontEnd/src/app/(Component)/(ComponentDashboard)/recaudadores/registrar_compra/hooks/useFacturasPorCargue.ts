import { useState, useCallback } from 'react';
import { FacturaPorCargueItem, FacturasPorCargueResponse } from '../models/facturasPorCargue.model';
import { getFacturasPorCargue } from '../adapter/facturasPorCargue.get';

interface UseFacturasPorCargueReturn {
    facturas: FacturaPorCargueItem[];
    isLoading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    nextUrl: string | null;
    previousUrl: string | null;
    fetchFacturas: (token: string, uuidGrupo: string, page?: number, pageSize?: number) => Promise<FacturasPorCargueResponse | void>;
    fetchAllFacturas: (token: string, uuidGrupo: string) => Promise<FacturaPorCargueItem[]>;
    clear: () => void;
}

export default function useFacturasPorCargue(): UseFacturasPorCargueReturn {
    const [facturas, setFacturas] = useState<FacturaPorCargueItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [previousUrl, setPreviousUrl] = useState<string | null>(null);

    const fetchFacturas = useCallback(async (
        token: string,
        uuidGrupo: string,
        page: number = 1,
        pageSize?: number
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getFacturasPorCargue(token, uuidGrupo, { page, page_size: pageSize });
            if (response.success) {
                setFacturas(response.data || []);
                setCurrentPage(response.current_page || page);
                setTotalPages(response.total_pages || 0);
                setTotalCount(response.count || 0);
                setNextUrl(response.next || null);
                setPreviousUrl(response.previous || null);
            } else {
                setError(response.detail || 'No fue posible obtener las facturas por cargue');
            }
            return response;
        } catch (err: any) {
            setError(err?.message || 'Error al obtener facturas por cargue');
            return;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchAllFacturas = useCallback(async (token: string, uuidGrupo: string): Promise<FacturaPorCargueItem[]> => {
        try {
            const response = await getFacturasPorCargue(token, uuidGrupo, { sin_paginacion: true });
            if (response.success) {
                return response.data || [];
            } else {
                throw new Error(response.detail || 'No fue posible obtener todas las facturas');
            }
        } catch (err: any) {
            throw new Error(err?.message || 'Error al obtener todas las facturas');
        }
    }, []);

    const clear = useCallback(() => {
        setFacturas([]);
        setError(null);
        setCurrentPage(1);
        setTotalPages(0);
        setTotalCount(0);
        setNextUrl(null);
        setPreviousUrl(null);
    }, []);

    return {
        facturas,
        isLoading,
        error,
        currentPage,
        totalPages,
        totalCount,
        nextUrl,
        previousUrl,
        fetchFacturas,
        fetchAllFacturas,
        clear
    };
}


