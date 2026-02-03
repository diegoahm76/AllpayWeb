import { useState } from 'react';
import { 
  getFacturasLiquidadasPendientesPSE,
  FacturaLiquidadaPSE,
} from '../adapters/getFacturasLiquidadasPendientesPSE';

interface SearchParams {
  nro_factura_unica?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  ids_recaudador?: string;
  [key: string]: any;
}

/**
 * Hook para obtener solo facturas liquidadas (no pagadas) para PSE
 */
const useFacturasLiquidadasPSE = () => {
  const [facturas, setFacturas] = useState<FacturaLiquidadaPSE[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [currentCollectorIds, setCurrentCollectorIds] = useState<number[]>([]);
  const [currentToken, setCurrentToken] = useState<string>('');

  /**
   * Obtiene facturas liquidadas (no pagadas) para PSE
   * @param token Token de autenticación
   * @param page Número de página (default: 1)
   * @param searchParams Parámetros de búsqueda adicionales
   * @param collectorIds IDs de recaudadores (opcional)
   */
  const fetchFacturas = async (
    token: string,
    page: number = 1,
    searchParams?: SearchParams,
    collectorIds: number[] = []
  ) => {
    setIsLoading(true);
    setError(null);
    setCurrentToken(token);
    setCurrentCollectorIds(collectorIds);

    try {
      // Preparar parámetros con IDs de recaudadores si existen
      const params: SearchParams = {
        ...searchParams,
        page
      };
      
      // Si hay IDs de recaudadores, agregarlos a los parámetros
      if (collectorIds && collectorIds.length > 0) {
        params.ids_recaudador = collectorIds.join(',');
      }

      const response = await getFacturasLiquidadasPendientesPSE(token, page, params);
      
      // Ya debería venir filtrado, pero aquí hay una capa extra de seguridad
      const facturasLiquidadas = response.data.filter(
        f => f.cod_estado_liquidacion === 'L' && f.cod_estado_liquidacion_display === 'Liquidado'
      );
      
      // Agregar console.log para mostrar las facturas obtenidas
      console.log('Facturas liquidadas pendientes para PSE:', facturasLiquidadas);
      
      setFacturas(facturasLiquidadas);
      setTotalPages(response.total_pages);
      setCurrentPage(response.current_page);
      setTotalCount(facturasLiquidadas.length);
      setNextPage(response.next);
      setPreviousPage(response.previous);
      
      return {
        ...response,
        data: facturasLiquidadas,
        count: facturasLiquidadas.length
      };
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al obtener las facturas liquidadas para PSE';
      setError(errorMessage);
      
      return {
        success: false,
        count: 0,
        total_pages: 0,
        current_page: 1,
        next: null,
        previous: null,
        data: [],
        detail: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Maneja el cambio de página
   */
  const handlePageChange = async (newPage: number) => {
    if (currentToken && !isLoading) {
      await fetchFacturas(currentToken, newPage, undefined, currentCollectorIds);
    }
  };

  /**
   * Actualiza los datos de facturas directamente
   */
  const setFacturasData = (data: FacturaLiquidadaPSE[]) => {
    setFacturas(data);
  };

  /**
   * Limpia los datos cargados
   */
  const clearFacturas = () => {
    setFacturas([]);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalCount(0);
    setNextPage(null);
    setPreviousPage(null);
    setError(null);
    setCurrentCollectorIds([]);
    setCurrentToken('');
  };

  return {
    facturas,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCount,
    nextPage,
    previousPage,
    fetchFacturas,
    handlePageChange,
    setFacturasData,
    clearFacturas
  };
};

export default useFacturasLiquidadasPSE; 