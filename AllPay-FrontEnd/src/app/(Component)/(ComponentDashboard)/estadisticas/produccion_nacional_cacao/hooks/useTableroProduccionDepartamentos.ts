import { useState } from 'react';
import { fetchTableroProduccionDepartamentos } from '../adapters/tablero-produccion-departamentos.adapter';
import { 
  TableroProduccionDepartamentosResponse, 
  ParamsTableroProduccion 
} from '../models/tablero-produccion-departamentos.models';

export const useTableroProduccionDepartamentos = () => {
  const [data, setData] = useState<TableroProduccionDepartamentosResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (token: string, params: ParamsTableroProduccion) => {
    if (!token) {
      setError('Token de autenticación requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchTableroProduccionDepartamentos(token, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos de producción por departamentos');
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
