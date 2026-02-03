import axios from 'axios';
import {
  CobroPersuasivoDetailResponse,
  CobroPersuasivoDetailParams,
  CobroPersuasivoDetail
} from '../models/cobroPersuasivoDetail.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene los detalles de cobros persuasivos para una factura específica
 */
export const getCobroPersuasivoDetail = async (
  token: string,
  facturaId: string | number,
  params: CobroPersuasivoDetailParams = {}
): Promise<CobroPersuasivoDetailResponse> => {
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

    const response = await axios.get<CobroPersuasivoDetailResponse>(
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
    console.error('[getCobroPersuasivoDetail] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // Cuando no hay cobros persuasivos, retornar respuesta vacía en lugar de error
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
      throw new Error(error.response?.data?.detail || 'Error al obtener los detalles de cobros persuasivos');
    }
    throw new Error('Error de conexión al obtener los detalles de cobros persuasivos');
  }
};

/**
 * Obtiene todos los cobros persuasivos para exportación
 */
export const getAllCobroPersuasivoDetailForExport = async (
  token: string,
  facturaId: string | number,
  params: Omit<CobroPersuasivoDetailParams, 'page' | 'page_size'> = {}
): Promise<CobroPersuasivoDetail[]> => {
  try {
    const allCobros: CobroPersuasivoDetail[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await getCobroPersuasivoDetail(token, facturaId, {
        ...params,
        page: currentPage,
        page_size: 100
      });

      if (response.success && response.data.length > 0) {
        allCobros.push(...response.data);
        
        // Verificar si hay más páginas
        hasMorePages = response.next !== null;
        currentPage++;
      } else {
        hasMorePages = false;
      }

      // Protección contra bucles infinitos
      if (currentPage > 100) {
        console.warn('[getAllCobroPersuasivoDetailForExport] - Límite de páginas alcanzado');
        break;
      }
    }


    return allCobros;
  } catch (error) {
    console.error('[getAllCobroPersuasivoDetailForExport] - Error:', error);
    throw error;
  }
};

/**
 * Descarga el documento de un cobro persuasivo específico
 */
export const downloadCobroPersuasivoDocumento = async (
  token: string,
  cobroId: number
): Promise<Blob> => {
  try {
    const response = await axios.get(
      `${baseApiUrl}cartera/cobros-persuasivos/documento/${cobroId}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob'
      }
    );

    return response.data;
  } catch (error) {
    console.error('[downloadCobroPersuasivoDocumento] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Documento no encontrado');
      }
      throw new Error('Error al descargar el documento');
    }
    throw new Error('Error de conexión al descargar el documento');
  }
}; 

// Payload para actualizar un cobro persuasivo
export interface UpdateCobroPersuasivoPayload {
  descripcion: string;
  id_accion_cobro_persuasivo: number;
}

// Respuesta para actualizar un cobro persuasivo
export interface UpdateCobroPersuasivoResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Actualiza un cobro persuasivo existente
 */
export const updateCobroPersuasivo = async (
  token: string,
  cobroId: number,
  payload: UpdateCobroPersuasivoPayload
): Promise<UpdateCobroPersuasivoResponse> => {
  try {

    const response = await axios.put<UpdateCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/cobros-persuasivos/${cobroId}/update/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );


    return response.data;
  } catch (error) {
    console.error('[updateCobroPersuasivo] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Datos inválidos para la actualización');
      }
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para editar este cobro persuasivo');
      }
      if (error.response?.status === 404) {
        throw new Error('Cobro persuasivo no encontrado');
      }
      throw new Error(error.response?.data?.message || 'Error al actualizar el cobro persuasivo');
    }
    throw new Error('Error de conexión al actualizar el cobro persuasivo');
  }
}; 