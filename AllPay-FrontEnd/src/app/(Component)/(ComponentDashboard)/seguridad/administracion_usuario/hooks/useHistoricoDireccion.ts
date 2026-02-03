import { useState, useCallback } from 'react';
import { getHistoricoDireccion } from '../adapters/historicodireccion.adapter';
import { HistoricoDireccionItem } from '../models/historicodireccion.model';

export const useHistoricoDireccion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricoDireccionItem[]>([]);

  const fetchHistoricoDireccion = useCallback(
    async (token: string, personaId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getHistoricoDireccion(token, personaId);
        setData(response.data);
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Error desconocido al obtener el historial de direcciones';
        setError(errorMessage);
        setData([]);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearData = useCallback(() => {
    setData([]);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    fetchHistoricoDireccion,
    clearData,
  };
}; 