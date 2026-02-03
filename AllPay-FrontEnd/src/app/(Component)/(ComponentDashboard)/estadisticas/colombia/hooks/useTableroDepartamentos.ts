import { useState, useCallback } from 'react';
import { obtenerTableroDepartamentos } from '../adapters/tableroDepartamentos.adapter';
import { TableroDepartamentosData, TableroDepartamentosParams } from '../models/tableroDepartamentos.model';

// Extender los parámetros para incluir filtros de fecha con nombres del componente
interface ExtendedTableroDepartamentosParams {
  fecha_inicio?: string;
  fecha_fin?: string;
}

const useTableroDepartamentos = () => {
  const [data, setData] = useState<TableroDepartamentosData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTablero = useCallback(async (token: string, params: ExtendedTableroDepartamentosParams) => {

    setIsLoading(true);
    setError(null);
    try {
      // Mapear los parámetros del componente a los que espera el adapter
      const adapterParams: TableroDepartamentosParams = {};
      
      if (params.fecha_inicio) {
        adapterParams.fecha_desde = params.fecha_inicio;
      }
      if (params.fecha_fin) {
        adapterParams.fecha_hasta = params.fecha_fin;
      }
      
      const response = await obtenerTableroDepartamentos(token, adapterParams);
      
      // El API devuelve data como array directo y filtros_aplicados al mismo nivel
      const mappedData = {
        departamentos: response.data,  // response.data es el array de departamentos
        filtros_aplicados: response.filtros_aplicados,
      };
      
      setData(mappedData);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del tablero de departamentos');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { 
    data, 
    isLoading, 
    error,
    fetchTablero, 
    clearData 
  };
};

export default useTableroDepartamentos;
