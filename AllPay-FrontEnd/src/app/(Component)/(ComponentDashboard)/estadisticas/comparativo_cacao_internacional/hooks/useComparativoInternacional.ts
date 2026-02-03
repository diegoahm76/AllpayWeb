'use client';

import { useState, useCallback } from 'react';
import { fetchComparativoInternacional } from '../adapters/comparativo.adapter';
import { 
  ComparativoInternacionalResponse, 
  ParamsComparativo 
} from '../models/comparativo.models';

export const useComparativoInternacional = () => {

  const [data, setData] = useState<ComparativoInternacionalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (token: string, params: ParamsComparativo) => {
    
    if (!token) {
      setError('No hay token de acceso disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchComparativoInternacional(token, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Error al obtener los datos');
      console.error('Error en useComparativoInternacional:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    resetData,
    clearError
  };
};
