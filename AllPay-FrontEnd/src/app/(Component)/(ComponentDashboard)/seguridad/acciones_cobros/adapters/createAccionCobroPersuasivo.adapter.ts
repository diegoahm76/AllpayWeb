import axios from 'axios';
import { CreateAccionCobroPersuasivoPayload, CreateAccionCobroPersuasivoResponse } from '../models/accionesCobroPersuasivo.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Crea una nueva acción de cobro persuasivo
 * @param token Token de autenticación JWT
 * @param payload Datos de la acción a crear
 * @returns Promise con la respuesta de creación
 */
export const createAccionCobroPersuasivo = async (
  token: string,
  payload: CreateAccionCobroPersuasivoPayload
): Promise<CreateAccionCobroPersuasivoResponse> => {
  try {


    // Validaciones básicas
    if (!payload.nombre || payload.nombre.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    if (!payload.descripcion || payload.descripcion.trim() === '') {
      throw new Error('La descripción es requerida');
    }

    const response = await axios.post<CreateAccionCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/acciones-cobro-persuasivo/create/`,
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
    console.error('[createAccionCobroPersuasivo] - Error en la petición:', error);
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || 'Error al crear la acción de cobro persuasivo';
      throw new Error(errorMessage);
    }
    
    throw new Error('Error de conexión al crear la acción de cobro persuasivo');
  }
}; 