import axios from 'axios';
import { AccionesCobroPersuasivoResponse } from '../models/accionesCobroPersuasivo.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene las acciones de cobro persuasivo
 * @param token Token de autenticación JWT
 * @returns Promise con la respuesta de acciones de cobro persuasivo
 */
export const getAccionesCobroPersuasivo = async (token: string): Promise<AccionesCobroPersuasivoResponse> => {
  try {


    const response = await axios.get<AccionesCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/acciones-cobro-persuasivo/`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );


    if (!response.data.success) {
      console.error('[getAccionesCobroPersuasivo] - La API indicó que la petición no fue exitosa:', response.data);
      throw new Error(response.data.detail || 'Error al obtener las acciones de cobro persuasivo');
    }

    // Verificar la estructura de los datos
    if (!Array.isArray(response.data.data)) {
      console.error('[getAccionesCobroPersuasivo] - Los datos no son un array:', response.data);
      throw new Error('Formato de datos incorrecto');
    }


    // Procesar los datos para asegurar el formato correcto
    const processedData = {
      ...response.data,
      data: response.data.data.map((accion) => {
        return {
          ...accion,
          activo: accion.activo === true,
          item_ya_usado: accion.item_ya_usado === true
        };
      })
    };
    return processedData;

  } catch (error) {
    console.error('[getAccionesCobroPersuasivo] - Error en la petición:', error);
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || 'Error al obtener las acciones de cobro persuasivo';
      throw new Error(errorMessage);
    }
    
    throw new Error('Error de conexión al obtener las acciones de cobro persuasivo');
  }
}; 