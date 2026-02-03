import { useState, useEffect, useCallback } from 'react';
import { getFacturasPagadasFechasVigentes } from '../adapters/facturasPagadasDate.getAll';
import { PazSalvoDateResponse } from '../models/pazSalvoDate.model';

export const useFacturasPagadasDates = (token: string) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PazSalvoDateResponse | null>(null);

    const fetchFacturasPagadasFechasVigentes = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getFacturasPagadasFechasVigentes(token);
            setData(response);
            setError(null);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al obtener las fechas de vigencia de Facturas Pagadas');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchFacturasPagadasFechasVigentes();
    }, [fetchFacturasPagadasFechasVigentes]);

    return { loading, error, data, refetch: fetchFacturasPagadasFechasVigentes };
}; 