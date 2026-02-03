import { useState, useCallback } from 'react';
import { getRecaudadorCuotaPse } from '../adapters/getRecaudadorCuotaPse';
import { RecaudadorCuotaPseResponse } from '../models/RecaudadorCuotaPseTypes';

export const useRecaudadorCuotaPse = () => {
  const [data, setData] = useState<RecaudadorCuotaPseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async (token: string, id_plan_pago: number, nro_cuota: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getRecaudadorCuotaPse(token, id_plan_pago, nro_cuota);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchInfo
  };
}; 