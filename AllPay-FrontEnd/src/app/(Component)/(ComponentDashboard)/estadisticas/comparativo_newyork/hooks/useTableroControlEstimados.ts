import { useState, useCallback } from 'react';
import { obtenerTableroControlEstimados } from '../adapters/tableroControlEstimados.adapter';
import { TableroControlEstimadosData, TableroControlEstimadosParams } from '../models/tableroControlEstimados.model';

const useTableroControlEstimados = () => {
  const [data, setData] = useState<TableroControlEstimadosData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTableroEstimados = useCallback(async (
    token: string, 
    params: TableroControlEstimadosParams
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerTableroControlEstimados(token, params);
      setData(response.data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del tablero de control estimados');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const refetch = useCallback(async (
    token: string, 
    params: TableroControlEstimadosParams
  ) => {
    await fetchTableroEstimados(token, params);
  }, [fetchTableroEstimados]);

  return { 
    data, 
    isLoading, 
    error, 
    fetchTableroEstimados, 
    clearData, 
    refetch 
  };
};

export default useTableroControlEstimados;
