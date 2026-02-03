'use client';

import { useState, useCallback } from 'react';
import { fetchSerieNalNy } from '../adapters/serie-nal-ny.adapter';
import { 
  SerieNalNyResponse, 
  ParamsSerieNalNy 
} from '../models/serie-nal-ny.models';

export const useSerieNalNy = () => {
  const [data, setData] = useState<SerieNalNyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (token: string, params: ParamsSerieNalNy) => {
    if (!token) {
      setError('No hay token de acceso disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSerieNalNy(token, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Error al obtener los datos');
      console.error('Error en useSerieNalNy:', err);
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
