import { useState } from 'react';
import { fetchDistribucionMensual } from '../adapters/distribucion-mensual.adapter';
import { 
  DistribucionMensualResponse, 
  ParamsDistribucionMensual 
} from '../models/distribucion-mensual.models';

export const useDistribucionMensual = () => {
  const [data, setData] = useState<DistribucionMensualResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (token: string, params: ParamsDistribucionMensual) => {
    if (!token) {
      setError('Token de autenticación requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchDistribucionMensual(token, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Error al obtener la distribución mensual');
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
