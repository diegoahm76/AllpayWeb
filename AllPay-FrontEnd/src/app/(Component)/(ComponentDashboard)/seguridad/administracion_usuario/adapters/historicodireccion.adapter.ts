import axios from 'axios';
import { HistoricoDireccionResponse } from '../models/historicodireccion.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el historial de direcciones de una persona
 * @param token Token de autenticación JWT
 * @param personaId ID de la persona
 * @returns Promise con la respuesta del historial de direcciones
 */
export const getHistoricoDireccion = async (
  token: string,
  personaId: number
): Promise<HistoricoDireccionResponse> => {
  try {

    const response = await axios.get<HistoricoDireccionResponse>(
      `${baseApiUrl}personas/historico-direccion/${personaId}/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );


    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al obtener el historial de direcciones');
    }

    return response.data;
  } catch (error) {
    console.error('[getHistoricoDireccion] - Error:', error);
    
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || 
        error.message || 
        'Error en la petición al servidor'
      );
    }
    
    throw new Error('Error inesperado al obtener el historial de direcciones');
  }
}; 