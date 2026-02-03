import { useCallback, useState } from 'react';
import { getTaxCollectors, TaxCollectorResponse, TaxCollectorFilters } from '@/adapters/user/collector/user.taxCollector.get';

export const useGetTaxCollectors = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [taxCollectorsData, setTaxCollectorsData] = useState<TaxCollectorResponse | null>(null);

    const fetchTaxCollectors = useCallback(
        async (token: string, filters?: TaxCollectorFilters) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await getTaxCollectors(token, filters);
                setTaxCollectorsData(response);
                return response;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener recaudadores';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    return {
        fetchTaxCollectors,
        isLoading,
        error,
        taxCollectorsData
    };
}; 