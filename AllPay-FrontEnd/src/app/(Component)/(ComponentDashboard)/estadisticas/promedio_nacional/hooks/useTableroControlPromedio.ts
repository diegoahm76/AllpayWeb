import { useState, useCallback } from 'react';
import { obtenerTableroControlPromedio } from '../adapters/tableroControlPromedio.adapter';
import { TableroControlPromedioData, TableroControlPromedioParams } from '../models/tableroControlPromedio.model';

const useTableroControlPromedio = () => {
  const [data, setData] = useState<TableroControlPromedioData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTablero = useCallback(async (token: string, params: TableroControlPromedioParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerTableroControlPromedio(token, params);
      setData(response.data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del tablero de control de promedio');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, fetchTablero, clearData };
};

export default useTableroControlPromedio;
