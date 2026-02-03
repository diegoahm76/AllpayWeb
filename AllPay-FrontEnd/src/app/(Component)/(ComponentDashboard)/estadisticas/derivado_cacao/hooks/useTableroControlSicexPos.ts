import { useState, useCallback } from 'react';
import { obtenerTableroControlSicexPos } from '../adapters/tableroControlSicexPos.adapter';
import { TableroControlSicexPosData, TableroControlSicexPosParams } from '../models/tableroControlSicexPos.model';

const useTableroControlSicexPos = () => {
  const [data, setData] = useState<TableroControlSicexPosData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTablero = useCallback(async (token: string, params: TableroControlSicexPosParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerTableroControlSicexPos(token, params);
      setData(response.data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos');
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

export default useTableroControlSicexPos; 