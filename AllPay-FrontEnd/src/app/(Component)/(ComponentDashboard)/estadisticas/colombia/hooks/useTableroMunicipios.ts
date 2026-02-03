import { useState, useCallback } from 'react';
import { obtenerTableroMunicipios } from '../adapters/tableroMunicipios.adapter';
import { TableroMunicipiosData, TableroMunicipiosParams } from '../models/tableroMunicipios.model';

// Extender los parámetros para incluir filtros de fecha con nombres del componente
interface ExtendedTableroMunicipiosParams {
  codigo_departamento: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

const useTableroMunicipios = () => {
  const [data, setData] = useState<TableroMunicipiosData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTablero = useCallback(async (token: string, params: ExtendedTableroMunicipiosParams) => {

    setIsLoading(true);
    setError(null);
    try {
      // Mapear los parámetros del componente a los que espera el adapter
      const adapterParams: TableroMunicipiosParams = {
        codigo_departamento: params.codigo_departamento
      };
      
      if (params.fecha_inicio) {
        adapterParams.fecha_desde = params.fecha_inicio;
      }
      if (params.fecha_fin) {
        adapterParams.fecha_hasta = params.fecha_fin;
      }
      

      
      const response = await obtenerTableroMunicipios(token, adapterParams);

      
      // El API devuelve data como array directo y filtros_aplicados al mismo nivel
      const mappedData = {
        municipios: response.data,  // response.data es el array de municipios
        departamento: response.departamento,
        filtros_aplicados: response.filtros_aplicados,
      };

      setData(mappedData);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del tablero de municipios');
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

export default useTableroMunicipios;
