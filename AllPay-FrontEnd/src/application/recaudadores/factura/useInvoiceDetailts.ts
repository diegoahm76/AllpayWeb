import { useState, useEffect } from 'react';
import { getInvoiceDetails } from '@/adapters/recaudadores/facturas/collector.DetailsInvoices';
import { ApiResponse } from '@/domain/models/recaudadores/invoice.details.model';

export const useInvoiceDetails = (token: string, id: string | null) => {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvoiceDetails = async () => {
            if (!id || !token) return;

            setLoading(true);
            setError(null);

            try {
                const result = await getInvoiceDetails(token, id);
                setData(result);
            } catch (err) {
                console.error('Error en useInvoiceDetails:', err);
                setError(err instanceof Error ? err.message : 'Error desconocido');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceDetails();
    }, [id, token]);

    return { data, loading, error };
};
