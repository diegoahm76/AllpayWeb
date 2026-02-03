import { useState, useEffect, useCallback } from 'react';
import { getFacturasNoPagadas } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/adapters/facturasNoPagadas.adapter';
import { FacturasNoPagadasResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/models/facturasNoPagadas.model';

export const useFacturasNoPagadas = (token: string, initialPage: number = 1, pageSize: number = 10) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<FacturasNoPagadasResponse | null>(null);
    const [page, setPage] = useState(initialPage);

    const fetchFacturas = useCallback(async (pageToFetch: number = page) => {
        
        if (!token) {
            setError('No hay token de autenticación');
            setLoading(false);
            return null;
        }
        try {
            setLoading(true);
            const response = await getFacturasNoPagadas(token, pageToFetch, pageSize);
            setData(response);
            setError(null);
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al obtener las facturas no pagadas');
            return null;
        } finally {
            setLoading(false);
        }
    }, [token, pageSize, page]);

    useEffect(() => {
        fetchFacturas(page);
    }, [fetchFacturas, page]);

    const refetch = () => fetchFacturas(page);
    const goToPage = (newPage: number) => setPage(newPage);

    return {
        loading,
        error,
        data,
        page,
        setPage: goToPage,
        refetch,
        fetchFacturas
    };
}; 