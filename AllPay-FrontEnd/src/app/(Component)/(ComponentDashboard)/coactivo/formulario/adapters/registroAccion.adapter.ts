import axios from 'axios';
import { CreateCobroPersuasivoResponse } from '../models/registroAccion.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Crea una nueva acción de cobro persuasivo
 */
export interface CreateAccionCoactivoPayload {
  cobro_coactivo_id: number;
  descripcion: string;
  id_accion_cobro_persuasivo: number;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
  valor_intereses: number;
  valor_costas_procesales: number;
}

export const createCobroPersuasivo = async (
  token: string,
  payload: CreateAccionCoactivoPayload
): Promise<CreateCobroPersuasivoResponse> => {
  try {

    const response = await axios.post<CreateCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/acciones-cobro-coactivo/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      }
    );


    // Validar estructura de respuesta
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error en la respuesta del servidor');
    }

    return response.data;
  } catch (error) {
    console.error('[createCobroPersuasivo] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Datos inválidos. Verifique la información ingresada');
      }
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para registrar acciones de cobro');
      }
      if (error.response?.status === 404) {
        throw new Error('Factura no encontrada');
      }
      throw new Error(error.response?.data?.message || 'Error al crear la acción de cobro persuasivo');
    }
    throw new Error('Error de conexión al crear la acción de cobro persuasivo');
  }
}; 