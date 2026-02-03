import { useState, useCallback, useEffect } from 'react';
import { obtenerEstadosFacturaUnica } from '../adapters/estadosFacturaUnica.adapter';
import { EstadoFacturaUnica } from '../models/estadosFacturaUnica.model';

const useEstadosFacturaUnica = (token: string) => {
  const [data, setData] = useState<EstadoFacturaUnica[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstados = useCallback(async () => {
    if (!token) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerEstadosFacturaUnica(token);
      setData(response.data);
    } catch (err: any) {
      console.error('Hook: Error al obtener estados:', err);
      setError(err?.message || 'Error al cargar los estados de factura única');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const clearData = useCallback(() => {
    setData([]);
    setError(null);
  }, []);

  // Cargar datos automáticamente al montar el hook
  useEffect(() => {
    if (token) {
      fetchEstados();
    }
  }, [fetchEstados, token]);

  return { 
    data, 
    isLoading, 
    error, 
    fetchEstados, 
    clearData 
  };
};

export default useEstadosFacturaUnica;
