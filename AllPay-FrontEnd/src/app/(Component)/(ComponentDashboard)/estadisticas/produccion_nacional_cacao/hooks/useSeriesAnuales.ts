import { useState } from 'react';
import { fetchSeriesAnuales } from '../adapters/series-anuales.adapter';
import { 
  SeriesAnualesResponse, 
  ParamsSeriesAnuales 
} from '../models/series-anuales.models';

export const useSeriesAnuales = () => {
  const [data, setData] = useState<SeriesAnualesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (token: string, params: ParamsSeriesAnuales) => {
    if (!token) {
      setError('Token de autenticación requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSeriesAnuales(token, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Error al obtener las series anuales de producción');
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return {
    data,
    loading,
    error,
    fetchData,
    resetData
  };
};
