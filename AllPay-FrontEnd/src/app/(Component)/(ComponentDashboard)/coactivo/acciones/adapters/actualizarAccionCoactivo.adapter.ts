import axios from 'axios';
import { 
  ActualizarAccionCoactivoPayload, 
  ActualizarAccionCoactivoResponse 
} from '../models/actualizarAccionCoactivo.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Actualiza una acción de cobro coactivo específica
 * @param token Token de autenticación JWT
 * @param cobroCoactivoId ID del cobro coactivo a actualizar
 * @param payload Datos para actualizar la acción de cobro
 * @returns Promise con la respuesta de la actualización
 */
export const actualizarAccionCoactivo = async (
  token: string, 
  cobroCoactivoId: number,
  payload: ActualizarAccionCoactivoPayload
): Promise<ActualizarAccionCoactivoResponse> => {
  try {
    const response = await axios.patch<ActualizarAccionCoactivoResponse>(
      `${baseApiUrl}cartera/acciones-cobro-coactivo/${cobroCoactivoId}/`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Validar estructura de respuesta
    if (typeof response.data.success !== 'boolean') {
      console.error('[actualizarAccionCoactivo] - La respuesta no tiene el campo success:', response.data);
      throw new Error('Formato de respuesta incorrecto');
    }

    // Si la respuesta indica éxito, validar que tenga data
    if (response.data.success && !response.data.data) {
      console.error('[actualizarAccionCoactivo] - Respuesta exitosa sin datos:', response.data);
      throw new Error('Respuesta exitosa sin datos');
    }

    return response.data;

  } catch (error) {
    console.error('[actualizarAccionCoactivo] - Error:', error);
    
    if (axios.isAxiosError(error)) {
      // Si la respuesta tiene un mensaje, usarlo como mensaje de error
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      // Si hay un detail, usarlo
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      // Si no hay mensaje, manejar por código de estado
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tiene permisos para realizar esta operación.');
      } else if (error.response?.status === 404) {
        throw new Error('La acción de cobro coactivo no fue encontrada.');
      } else if (error.response?.status === 400) {
        throw new Error('Datos de entrada inválidos. Verifique la información proporcionada.');
      } else if (error.response?.status === 422) {
        throw new Error('Error de validación. Verifique los datos ingresados.');
      } else if (error.response?.status && error.response?.status >= 500) {
        throw new Error('Error del servidor. Por favor, intente más tarde.');
      } else {
        throw new Error('Error en la petición');
      }
    }
    
    // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Error inesperado al actualizar la acción de cobro coactivo');
  }
};
