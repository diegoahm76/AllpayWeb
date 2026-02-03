import { useState, useCallback } from 'react';
import { obtenerTablero8NewYork } from '../adapters/tablero8NewYork.adapter';
import { Tablero8NewYorkData, Tablero8NewYorkParams } from '../models/tablero8NewYork.model';

const useTablero8NewYork = () => {
  const [data, setData] = useState<Tablero8NewYorkData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTablero8NewYork = useCallback(async (
    token: string, 
    params: Tablero8NewYorkParams
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerTablero8NewYork(token, params);
      setData(response.data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del Tablero 8 de New York');
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
    params: Tablero8NewYorkParams
  ) => {
    await fetchTablero8NewYork(token, params);
  }, [fetchTablero8NewYork]);

  return { 
    data, 
    isLoading, 
    error, 
    fetchTablero8NewYork, 
    clearData, 
    refetch 
  };
};

export default useTablero8NewYork;
