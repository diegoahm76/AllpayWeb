import { useState } from 'react';
import { 
  getFacturasPagadas,
  FacturaPagada,
} from '../adapters/getFacturasPagadas';

interface SearchParams {
  nro_factura_unica?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  [key: string]: any;
}

/**
 * Hook para obtener facturas pagadas
 */
const useFacturasPagadas = () => {
  const [facturas, setFacturas] = useState<FacturaPagada[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);

  /**
   * Obtiene facturas pagadas
   * @param token Token de autenticación
   * @param page Número de página (default: 1)
   * @param searchParams Parámetros de búsqueda adicionales
   */
  const fetchFacturas = async (
    token: string,
    page: number = 1,
    searchParams?: SearchParams
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      
      if (!token) {
        throw new Error('Token de autorización no disponible');
      }

      const response = await getFacturasPagadas(token, page, searchParams);
            
      setFacturas(response.data);
      setTotalPages(response.total_pages);
      setCurrentPage(response.current_page);
      setTotalCount(response.count);
      setNextPage(response.next);
      setPreviousPage(response.previous);
      
      return response;
    } catch (err) {
      console.error('Error en fetchFacturas:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al obtener las facturas pagadas';

      // Verificar si es un error de "no se encontraron registros" (404 o mensaje específico)
      const isNoRecordsFound = 
        errorMessage.toLowerCase().includes('no se encontraron registros') ||
        errorMessage.toLowerCase().includes('no se encontraron') ||
        errorMessage.toLowerCase().includes('no records found') ||
        errorMessage.includes('404');

      // Solo establecer error si NO es un caso de "no se encontraron registros"
      if (!isNoRecordsFound) {
        setError(errorMessage);
      } else {
        // Para el caso de "no registros", limpiar datos sin mostrar error
        setFacturas([]);
        setTotalPages(0);
        setCurrentPage(1);
        setTotalCount(0);
        setNextPage(null);
        setPreviousPage(null);
        setError(null);
        
        // Quitar el focus de cualquier input activo
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      
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
  const handlePageChange = async (newPage: number, token?: string) => {
    if (token) {
      await fetchFacturas(token, newPage);
    }
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
    clearFacturas
  };
};

export default useFacturasPagadas; 