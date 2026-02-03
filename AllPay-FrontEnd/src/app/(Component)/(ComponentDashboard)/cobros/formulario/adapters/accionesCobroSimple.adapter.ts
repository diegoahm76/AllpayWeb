import axios from 'axios';
import { AccionesCobroSimpleResponse } from '../models/accionesCobroSimple.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene las acciones de cobro persuasivo simples para usar en select
 * @param token Token de autenticación JWT
 * @returns Promise con la respuesta de acciones de cobro persuasivo simples
 */
export const getAccionesCobroSimple = async (token: string): Promise<AccionesCobroSimpleResponse> => {
  try {

    const response = await axios.get<AccionesCobroSimpleResponse>(
      `${baseApiUrl}cartera/acciones-cobro-persuasivo/simple/`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Validar estructura de respuesta
    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al obtener las acciones de cobro persuasivo');
    }

    // Verificar que los datos sean un array
    if (!Array.isArray(response.data.data)) {
      console.error('[getAccionesCobroSimple] - Los datos no son un array:', response.data);
      throw new Error('Formato de datos incorrecto');
    }

    return response.data;

  } catch (error) {
    console.error('[getAccionesCobroSimple] - Error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para acceder a esta información');
      }
      if (error.response?.status === 404) {
        throw new Error('No se encontraron acciones de cobro persuasivo');
      }
      throw new Error(error.response?.data?.detail || 'Error al obtener las acciones de cobro persuasivo');
    }
    
    throw new Error('Error de conexión al obtener las acciones de cobro persuasivo');
  }
}; 