import { useState, useCallback } from 'react';
import { obtenerTableroControlComprasCacaoDashboard } from '../adapters/tableroControlComprasCacaoDashboard.adapter';
import { TableroControlComprasCacaoDashboardData, TableroControlComprasCacaoDashboardParams } from '../models/tableroControlComprasCacaoDashboard.model';

const useTableroControlComprasCacaoDashboard = () => {
  const [data, setData] = useState<TableroControlComprasCacaoDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTablero = useCallback(async (token: string, params: TableroControlComprasCacaoDashboardParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerTableroControlComprasCacaoDashboard(token, params);
      // El adapter retorna la respuesta plana con las tablas
      setData({
        tabla_estado: response.tabla_estado,
        tabla_cuota_departamento: response.tabla_cuota_departamento,
        tabla_kilo_departamento: response.tabla_kilo_departamento,
      });
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del tablero de control de compras de cacao dashboard');
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

export default useTableroControlComprasCacaoDashboard;
