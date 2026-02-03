import axios from 'axios';
import { UpdateAccionCobroPersuasivoPayload, UpdateAccionCobroPersuasivoResponse } from '../models/accionesCobroPersuasivo.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Actualiza una acción de cobro persuasivo existente
 * @param token Token de autenticación JWT
 * @param id ID de la acción a actualizar
 * @param payload Datos de la acción a actualizar
 * @returns Promise con la respuesta de actualización
 */
export const updateAccionCobroPersuasivo = async (
  token: string,
  id: number,
  payload: UpdateAccionCobroPersuasivoPayload
): Promise<UpdateAccionCobroPersuasivoResponse> => {
  try {

    // Validaciones básicas
    if (!id || id <= 0) {
      throw new Error('ID de acción no válido');
    }

    if (!payload.nombre || payload.nombre.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    if (!payload.descripcion || payload.descripcion.trim() === '') {
      throw new Error('La descripción es requerida');
    }

    const response = await axios.put<UpdateAccionCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/acciones-cobro-persuasivo/update/${id}/`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );


    // Validar estructura de respuesta
    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error en la respuesta del servidor');
    }

    return response.data;

  } catch (error) {
    console.error('[updateAccionCobroPersuasivo] - Error en la petición:', error);
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || 'Error al actualizar la acción de cobro persuasivo';
      throw new Error(errorMessage);
    }
    
    throw new Error('Error de conexión al actualizar la acción de cobro persuasivo');
  }
}; 