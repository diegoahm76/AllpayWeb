import { useState, useCallback } from 'react';
import { getFacturasLiquidadas, FacturaLiquidada } from '../adapters/getFacturasLiquidadas';

export const useFacturasLiquidadas = () => {
  const [facturas, setFacturas] = useState<FacturaLiquidada[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchFacturasLiquidadas = useCallback(async (
    token: string,
    params?: Record<string, any>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const defaultParams = { 
        page: params?.page || 1, 
        page_size: params?.page_size || 10 
      };
      
      const finalParams = { ...defaultParams, ...params };
      
      const response = await getFacturasLiquidadas(token, finalParams);
      
      if (response.success) {
        setFacturas(response.data);
        setCurrentPage(finalParams.page);
        
        // Si la respuesta incluye metadata de paginación (suponiendo estructura común)
        if (response.pagination) {
          setTotalPages(response.pagination.total_pages || 1);
          setTotalItems(response.pagination.total || 0);
        }
      } else {
        setError(response.detail || 'Error al obtener facturas liquidadas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener facturas liquidadas');
      setFacturas([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearFacturas = useCallback(() => {
    setFacturas([]);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalItems(0);
    setError(null);
  }, []);

  return {
    facturas,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    fetchFacturasLiquidadas,
    clearFacturas
  };
}; 