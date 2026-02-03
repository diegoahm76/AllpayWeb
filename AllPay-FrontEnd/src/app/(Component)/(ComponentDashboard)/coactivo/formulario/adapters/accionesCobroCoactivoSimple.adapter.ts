import axios from 'axios';
import { AccionesCobroSimpleResponse } from '../models/accionesCobroSimple.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene las acciones de cobro coactivo simples para usar en select
 */
export const getAccionesCobroCoactivoSimple = async (token: string): Promise<AccionesCobroSimpleResponse> => {
  try {
    const response = await axios.get<AccionesCobroSimpleResponse>(
      `${baseApiUrl}cartera/acciones-cobro-coactivo/simple/`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al obtener acciones coactivas');
    }
    if (!Array.isArray(response.data.data)) {
      throw new Error('Formato de datos incorrecto');
    }

    return response.data;
  } catch (error) {
    console.error('[getAccionesCobroCoactivoSimple] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para acceder a esta información');
      }
      if (error.response?.status === 404) {
        throw new Error('No se encontraron acciones coactivas');
      }
      throw new Error(error.response?.data?.detail || 'Error al obtener acciones coactivas');
    }
    throw new Error('Error de conexión al obtener acciones coactivas');
  }
};


