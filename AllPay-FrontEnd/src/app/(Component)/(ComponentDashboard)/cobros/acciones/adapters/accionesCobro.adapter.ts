import axios from 'axios';
import {
  AccionesCobroResponse,
  AccionesCobroBusquedaParams,
  AccionCobroPersuasivo
} from '../models/accionesCobro.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene las acciones de cobro persuasivo para una factura específica
 */
export const getAccionesCobro = async (
  token: string,
  facturaId: string | number,
  params: AccionesCobroBusquedaParams = {}
): Promise<AccionesCobroResponse> => {
  try {
    const {
      page = 1,
      page_size = 10,
      fecha_desde,
      fecha_hasta
    } = params;

    // Construir parámetros de consulta
    const queryParams: any = {
      page,
      page_size
    };

    // Agregar filtros opcionales si están presentes
    if (fecha_desde) queryParams.fecha_desde = fecha_desde;
    if (fecha_hasta) queryParams.fecha_hasta = fecha_hasta;

    const response = await axios.get<AccionesCobroResponse>(
      `${baseApiUrl}cartera/cobros-persuasivos/${facturaId}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: queryParams
      }
    );


    // Validar estructura de respuesta
    if (response.data.success === undefined || response.data.data === undefined) {
      throw new Error('Estructura de respuesta inválida');
    }

    return response.data;
  } catch (error) {
    console.error('[getAccionesCobro] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // Cuando no hay acciones de cobro, retornar respuesta vacía en lugar de error
        return {
          success: true,
          count: 0,
          total_pages: 0,
          current_page: 1,
          next: null,
          previous: null,
          data: []
        };
      }
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para acceder a esta información');
      }
      throw new Error(error.response?.data?.detail || 'Error al obtener las acciones de cobro');
    }
    throw new Error('Error de conexión al obtener las acciones de cobro');
  }
};

/**
 * Obtiene todas las acciones de cobro para exportación
 */
export const getAllAccionesCobroForExport = async (
  token: string,
  facturaId: string | number,
  params: Omit<AccionesCobroBusquedaParams, 'page' | 'page_size'> = {}
): Promise<AccionCobroPersuasivo[]> => {
  try {
    const allAcciones: AccionCobroPersuasivo[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await getAccionesCobro(token, facturaId, {
        ...params,
        page: currentPage,
        page_size: 100
      });

      if (response.success && response.data.length > 0) {
        allAcciones.push(...response.data);
        
        // Verificar si hay más páginas
        hasMorePages = response.next !== null;
        currentPage++;
      } else {
        hasMorePages = false;
      }

      // Protección contra bucles infinitos
      if (currentPage > 100) {
        console.warn('[getAllAccionesCobroForExport] - Límite de páginas alcanzado');
        break;
      }
    }


    return allAcciones;
  } catch (error) {
    console.error('[getAllAccionesCobroForExport] - Error:', error);
    throw error;
  }
};

/**
 * Descarga el documento de una acción específica
 */
export const downloadAccionDocumento = async (
  token: string,
  accionId: number
): Promise<Blob> => {
  try {
    const response = await axios.get(
      `${baseApiUrl}cartera/cobros-persuasivos/documento/${accionId}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob'
      }
    );

    return response.data;
  } catch (error) {
    console.error('[downloadAccionDocumento] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Documento no encontrado');
      }
      throw new Error('Error al descargar el documento');
    }
    throw new Error('Error de conexión al descargar el documento');
  }
}; 