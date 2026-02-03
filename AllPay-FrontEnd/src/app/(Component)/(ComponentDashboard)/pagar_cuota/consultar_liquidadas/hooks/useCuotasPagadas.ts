import { useState } from 'react';
import { 
  getCuotasPagadas,
  getAllCuotasPagadas
} from '../adapters/getCuotasPagadas';

import { PlanPagoCuotaPagada, CuotaLiquidadaParaTabla } from '@/app/(Component)/(ComponentDashboard)/pagar_cuota/consultar_liquidadas/models/ResponseCuotasPagadas.model';

interface SearchParams {
  nro_solicitud?: string;
  nro_plan_pago?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  [key: string]: any;
}

/**
 * Hook para obtener facturas pagadas
 */
const useCuotasPagadas = () => {

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [cuotas, setCuotas] = useState<CuotaLiquidadaParaTabla[]>([]);

  /**
   * Transforma los planes de pago en cuotas liquidadas para la tabla
   */
  const transformPlanesToCuotas = (planes: PlanPagoCuotaPagada[]): CuotaLiquidadaParaTabla[] => {
    const cuotasParaTabla: CuotaLiquidadaParaTabla[] = [];
    
    planes.forEach(plan => {
      // Filtrar solo las cuotas que están liquidadas
      const cuotasLiquidadas = plan.cuotas_liquidadas.filter(cuota => cuota.liquidada === true);
      
      cuotasLiquidadas.forEach(cuota => {
        // Obtener las facturas específicas de esta cuota
        const facturasAsociadas = cuota.nro_factura_unica.join('-');
        
        cuotasParaTabla.push({
          nro_solicitud: cuota.nro_solicitud,
          nro_plan_pago: cuota.nro_plan_pago,
          nro_cuota: cuota.nro_cuota,
          valor_cuota: cuota.valor_cuota,
          pagada: cuota.pagada,
          estado_plan_pago_display: plan.estado_plan_pago_display,
          nombre_recaudador: plan.nombre_recaudador,
          facturas_asociadas: facturasAsociadas,
          fecha_vencimiento: cuota.fecha_vencimiento,
          fecha_pago: cuota.fecha_pago,
          // Datos para acciones
          id_plan_pago: cuota.id_plan_pago,
          id_cuota_acuerdo_pago: cuota.id_cuota_acuerdo_pago,
          nro_cuotas_plan: plan.nro_cuotas,
          doc_liquidacion_url: cuota.doc_liquidacion_url || null    
        });
      });
    });
    
    return cuotasParaTabla;
  };

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

      const response = await getCuotasPagadas(token, page, searchParams);
      
      console.log('Facturas pagadas obtenidas:', response.data);
      
      // Transformar los planes a cuotas liquidadas
      const cuotasTransformadas = transformPlanesToCuotas(response.data.data || []);
      
      setTotalPages(response.total_pages);
      setCurrentPage(response.current_page);
      setTotalCount(response.count);
      setNextPage(response.next);
      setPreviousPage(response.previous);
      setCuotas(cuotasTransformadas);
      
      return response;
    } catch (err) {
      console.error('Error en fetchFacturas:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al obtener las facturas pagadas';
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
  const handlePageChange = async (newPage: number, token?: string) => {
    if (token) {
      await fetchFacturas(token, newPage);
    }
  };

  /**
   * Limpia los datos cargados
   */
  const clearFacturas = () => {
    setCurrentPage(1);
    setTotalPages(1);
    setTotalCount(0);
    setNextPage(null);
    setPreviousPage(null);
    setError(null);
    setCuotas([]);
  };

  return {
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCount,
    nextPage,
    previousPage,
    cuotas,
    fetchFacturas,
    handlePageChange,
    clearFacturas,
    getAllCuotasPagadas,
    transformPlanesToCuotas
  };
};

export default useCuotasPagadas; 