import { useCallback, useState } from 'react';
import { getProvider, GetProviderParams, ProviderResponse } from '@/adapters/user/provider/provider.get';

export const useGetProvider = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerData, setProviderData] = useState<ProviderResponse | null>(null);

  const fetchProvider = useCallback(
    async (params: GetProviderParams, token: string) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getProvider(params, token);
        setProviderData(response);
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener el proveedor';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { 
    fetchProvider, 
    isLoading, 
    error, 
    providerData 
  };
}; 