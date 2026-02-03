import { useState, useCallback } from 'react';
import { consultarFacturasLiquidadasExterno, GetCollectorInvoicesExternalParams } from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_liquidacion/adapters/consultarFacturasLiquidadasExterno';
import { consultarFacturasLiquidadasInterno } from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_liquidacion/adapters/consultarFacturasLiquidadasInterno';
import { CollectorInvoiceExternal, CollectorInvoicesExternalResponse } from '../models/facturasLiquidadas.model';

interface UseFacturasLiquidadasProps {
    token: string;
    isInternalUser: boolean | null;
}

const useFacturasLiquidadas = ({ token, isInternalUser }: UseFacturasLiquidadasProps) => {
    const [invoices, setInvoices] = useState<CollectorInvoiceExternal[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);

    const fetchInvoices = useCallback(
        async (params?: GetCollectorInvoicesExternalParams): Promise<CollectorInvoicesExternalResponse> => {
            // No hacer petición si isInternalUser es null
            if (isInternalUser === null) {
                return {
                    success: false,
                    count: 0,
                    total_pages: 1,
                    current_page: 1,
                    next: null,
                    previous: null,
                    data: []
                };
            }

            setIsLoading(true);
            setError(null);
            try {
                const response = isInternalUser
                    ? await consultarFacturasLiquidadasInterno(token, params)
                    : await consultarFacturasLiquidadasExterno(token, params);
                setInvoices(response.data);
                setCurrentPage(response.current_page);
                setTotalPages(response.total_pages);
                return response;
            } catch (err: any) {
                setError(err?.message || 'Error al obtener las facturas');
                setInvoices([]);
                setCurrentPage(1);
                setTotalPages(1);
                return {
                    success: false,
                    count: 0,
                    total_pages: 1,
                    current_page: 1,
                    next: null,
                    previous: null,
                    data: []
                };
            } finally {
                setIsLoading(false);
            }
        },
        [token, isInternalUser]
    );

    const fetchAllData = useCallback(
        async (page: number, additionalParams?: Partial<GetCollectorInvoicesExternalParams>): Promise<{ data: any[]; total_pages: number; }> => {
            // No hacer petición si isInternalUser es null
            if (isInternalUser === null) {
                return {
                    data: [],
                    total_pages: 1
                };
            }

            try {
                const params = { 
                    page, 
                    page_size: 10,
                    ...additionalParams 
                };
                const response = await fetchInvoices(params);
                return {
                    data: response.data,
                    total_pages: response.total_pages
                };
            } catch (error) {
                return {
                    data: [],
                    total_pages: 1
                };
            }
        },
        [fetchInvoices, isInternalUser]
    );

    const clearInvoices = useCallback(() => {
        setInvoices([]);
        setCurrentPage(1);
        setTotalPages(1);
        setError(null);
    }, []);

    return {
        invoices,
        isLoading,
        error,
        currentPage,
        totalPages,
        fetchInvoices,
        fetchAllData,
        clearInvoices
    };
};

export default useFacturasLiquidadas; 