// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

import { ResponseCuotasPagadas, PlanPagoCuotaPagada } from '@/app/(Component)/(ComponentDashboard)/pagar_cuota/consultar_liquidadas/models/ResponseCuotasPagadas.model';

export const getCuotasPagadas = async (
  token: string,
  page: number = 1,
  searchParams?: any
): Promise<ResponseCuotasPagadas> => {
  try {
    // Validar que el token existe
    if (!token || token.trim() === '') {
      throw new Error('Token de autorización requerido');
    }

    const baseUrl = getBaseApiUrl();
    
    // Validar que la URL base esté configurada
    if (!baseUrl) {
      throw new Error('BASE_API_URL no está configurado en las variables de entorno');
    }
    
    // Construir los parámetros de búsqueda
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', '10'); // Puedes ajustar el tamaño si lo necesitas

    if (searchParams) {
      if (searchParams.nro_solicitud) params.append('nro_solicitud', searchParams.nro_solicitud);
      if (searchParams.nro_plan_pago) params.append('nro_plan_pago', searchParams.nro_plan_pago);
      if (searchParams.fecha_desde) params.append('fecha_desde', searchParams.fecha_desde);
      if (searchParams.fecha_hasta) params.append('fecha_hasta', searchParams.fecha_hasta);
    }

    const url = `${baseUrl}recaudos/acuerdos-pago/externo-pago/obtener-planes-acuerdo-pago/?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`Error al obtener facturas pagadas: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Data recibida completa:', data);
    console.log('Datos en data.data:', data.data);
    console.log('Datos en data.results:', data.results);
    
    // Retornar la estructura completa según el modelo ResponseCuotasPagadas
    return {
      success: data.success || true,
      count: data.count || 0,
      total_pages: data.total_pages || Math.ceil((data.count || 0) / 10),
      current_page: data.current_page || page,
      next: data.next || null,
      previous: data.previous || null,
      data: {
        success: data.data?.success || true,
        detail: data.data?.detail || "Datos obtenidos correctamente",
        data: data.data?.data || data.data || data.results || []
      }
    };

  } catch (error) {
    console.error('Error en getCuotasPagadas:', error);
    throw error;
  }
};

/**
 * Obtiene todos los planes de pago paginando automáticamente
 * @param token Token de autenticación
 * @param searchParams Filtros de búsqueda
 * @returns Array con todos los resultados de planes de pago
 */
export const getAllCuotasPagadas = async (
  token: string,
  searchParams?: any
): Promise<PlanPagoCuotaPagada[]> => {
  let page = 1;
  let allResults: PlanPagoCuotaPagada[] = [];
  let totalPages = 1;
  
  do {
    const response = await getCuotasPagadas(token, page, searchParams);
    const dataPage = response.data.data || [];
    allResults = allResults.concat(dataPage);
    totalPages = response.total_pages;
    page++;
  } while (page <= totalPages);
  
  return allResults;
}; 