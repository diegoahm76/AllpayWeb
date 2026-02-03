import axios from 'axios';
import { 
  ConversionMultiplePayload, 
  ConversionMultipleResponse 
} from '../models/conversionMultiple.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Convierte múltiples facturas de persuasivo a coactivo
 * @param token Token de autenticación JWT
 * @param payload Datos de las facturas a convertir
 * @returns Promise con la respuesta de la conversión
 */
export const convertirMultiplePersuasivoCoactivo = async (
  token: string, 
  payload: ConversionMultiplePayload
): Promise<ConversionMultipleResponse> => {
  try {
    const response = await axios.post<ConversionMultipleResponse>(
      `${baseApiUrl}cartera/convertir-multiple-persuasivo-coactivo/`,
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
      console.error('[convertirMultiplePersuasivoCoactivo] - La respuesta no tiene el campo success:', response.data);
      throw new Error('Formato de respuesta incorrecto');
    }

    // Si la respuesta indica éxito, validar que tenga data
    if (response.data.success && !response.data.data) {
      console.error('[convertirMultiplePersuasivoCoactivo] - Respuesta exitosa sin datos:', response.data);
      throw new Error('Respuesta exitosa sin datos');
    }

    return response.data;

  } catch (error) {
    console.error('[convertirMultiplePersuasivoCoactivo] - Error:', error);
    
    if (axios.isAxiosError(error)) {
      // Si la respuesta tiene un mensaje, usarlo como mensaje de error
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      // Si no hay mensaje, manejar por código de estado
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
      } else if (error.response?.status === 403) {
        throw new Error('No tiene permisos para realizar esta operación.');
      } else if (error.response?.status === 404) {
        throw new Error('El servicio no fue encontrado.');
      } else if (error.response?.status === 400) {
        throw new Error('Datos de entrada inválidos. Verifique las facturas seleccionadas.');
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
    
    throw new Error('Error inesperado al convertir facturas a cobro coactivo');
  }
};
