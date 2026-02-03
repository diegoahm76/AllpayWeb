import axios from 'axios';
import { FacturaDetallesResponse } from '../models/facturaDetalles.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene los detalles de una factura específica
 */
export const getFacturaDetalles = async (
  token: string,
  facturaId: string | number
): Promise<FacturaDetallesResponse> => {
  try {

    const response = await axios.get<FacturaDetallesResponse>(
      `${baseApiUrl}recaudos/factura-detalles/${facturaId}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );


    // Validar estructura de respuesta
    if (!response.data.success || !response.data.data) {
      throw new Error('Estructura de respuesta inválida');
    }

    return response.data;
  } catch (error) {
    console.error('[getFacturaDetalles] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Factura no encontrada');
      }
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para acceder a esta información');
      }
      throw new Error(error.response?.data?.detail || 'Error al obtener los detalles de la factura');
    }
    throw new Error('Error de conexión al obtener los detalles de la factura');
  }
}; 