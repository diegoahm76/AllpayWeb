import { useState, useCallback } from 'react';
import {
  obtenerFacturasLiquidadasYNoLiquidadasInterno,
  CollectorInvoice,
  CollectorInvoicesResponse,
  GetCollectorInvoicesParams
} from '@/adapters/recaudadores/facturas/buscarFacturasLiquidadasYNoLiquidadas.interno';

// Helper para limpiar parámetros vacíos o undefined
const cleanParams = (params: GetCollectorInvoicesParams): GetCollectorInvoicesParams =>
  Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  );

interface UseCollectorInvoicesReturn {
  invoices: CollectorInvoice[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  /**
   * fetchInvoices ahora retorna la respuesta completa (CollectorInvoicesResponse)
   * para que el componente verifique directamente la longitud de response.data
   */
  fetchInvoices: (token: string, params?: GetCollectorInvoicesParams) => Promise<CollectorInvoicesResponse>;
  handlePageChange: (page: number, token: string) => void;
  clearInvoices: () => void;
  resetSearchParams: () => void;
  refetchCurrentData: (token: string, searchParams?: GetCollectorInvoicesParams) => Promise<void>;
}

const useObtenerFacturasLiquidadasYnoLiquidadasInterno = (): UseCollectorInvoicesReturn => {
  const [invoices, setInvoices] = useState<CollectorInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Almacena los parámetros de búsqueda usados (filtros, paginación, etc.)
  const [searchParams, setSearchParams] = useState<GetCollectorInvoicesParams>({
    page: 1,
    page_size: 5
  });

  const fetchInvoices = useCallback(
    async (token: string, params?: GetCollectorInvoicesParams): Promise<CollectorInvoicesResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        // Usa params nuevos si los hay; de lo contrario, los guardados en searchParams
        const queryParams: GetCollectorInvoicesParams = params || searchParams;

        // Limpia los valores vacíos o undefined
        const cleanedParams = cleanParams(queryParams);

        const response = await obtenerFacturasLiquidadasYNoLiquidadasInterno(cleanedParams, token);

        // Actualiza el estado (React) con los datos devueltos
        setInvoices(response.data);
        setCurrentPage(response.current_page);
        setTotalPages(response.total_pages);
        setSearchParams(queryParams);

        return response;
      } catch (err) {
        // Manejo de error: deja invoices vacío
        const errorMessage = err instanceof Error ? err.message : 'Error al obtener las facturas';
        console.error('Error en fetchInvoices:', errorMessage);
        setError(errorMessage);
        setInvoices([]);

        return {
          success: false,
          data: [],
          count: 0,
          total_pages: 1,
          current_page: 1,
          next: null,
          previous: null
        };
      } finally {
        setIsLoading(false);
      }
    },
    [searchParams]
  );

  const handlePageChange = useCallback(
    (page: number, token: string) => {
      const newParams = { ...searchParams, page };
      setSearchParams(newParams);
      fetchInvoices(token, newParams);
    },
    [searchParams, fetchInvoices]
  );

  const clearInvoices = useCallback(() => {
    setInvoices([]);
    setCurrentPage(1);
    setTotalPages(1);
    setError(null);
    setSearchParams({
      page: 1,
      page_size: 5,
      tipo_documento_proveedor: undefined,
      numero_documento_proveedor: undefined,
      nombre_proveedor: undefined,
      id_departamento_cacao: undefined,
      id_municipio_cacao: undefined,
      fecha_desde: undefined,
      fecha_hasta: undefined
    });
  }, []);

  const resetSearchParams = useCallback(() => {
    setSearchParams({
      page: 1,
      page_size: 5
    });
  }, []);

  const refetchCurrentData = useCallback(async (token: string, searchParams?: GetCollectorInvoicesParams) => {
    try {
      // Usa los parámetros de búsqueda actuales si no se proporcionan nuevos
      const paramsToUse = searchParams || { page: 1, page_size: 10 };
      await fetchInvoices(token, paramsToUse);
    } catch (error) {
      console.error('Error al refetch de facturas internas:', error);
    }
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    error,
    currentPage,
    totalPages,
    fetchInvoices,
    handlePageChange,
    clearInvoices,
    resetSearchParams,
    refetchCurrentData
  };
};

export default useObtenerFacturasLiquidadasYnoLiquidadasInterno;
