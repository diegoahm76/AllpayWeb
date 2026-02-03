import axios from 'axios';
import {
  UpdateCobroPersuasivoPayload,
  UpdateCobroPersuasivoResponse,
  UpdateCobroPersuasivoParams
} from '../models/updateCobroPersuasivo.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Actualiza un cobro persuasivo específico
 */
export const updateCobroPersuasivo = async (
  token: string,
  params: UpdateCobroPersuasivoParams
): Promise<UpdateCobroPersuasivoResponse> => {
  try {
    const { id, payload } = params;

    // Validar que el ID sea válido
    if (!id || id <= 0) {
      throw new Error('ID de cobro persuasivo inválido');
    }

    // Validar payload requerido
    if (!payload) {
      throw new Error('Datos de actualización requeridos');
    }

    // Validar campos obligatorios del payload
    const requiredFields = [
      'descripcion',
      'fecha_registro',
      'id_accion_cobro_persuasivo',
      'nombre_recaudador',
      'email_recaudador',
      'celular_recaudador'
    ];

    for (const field of requiredFields) {
      if (!payload[field as keyof UpdateCobroPersuasivoPayload]) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email_recaudador)) {
      throw new Error('Formato de email inválido');
    }

    // Validar formato de celular (asumiendo formato colombiano)
    const celularRegex = /^[0-9]{10}$/;
    if (!celularRegex.test(payload.celular_recaudador.replace(/\s/g, ''))) {
      throw new Error('Formato de celular inválido. Debe tener 10 dígitos');
    }

    // Realizar la petición PUT
    const response = await axios.put<UpdateCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/cobros-persuasivos/${id}/update/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Validar estructura de respuesta
    if (response.data.success === undefined || response.data.data === undefined) {
      throw new Error('Estructura de respuesta inválida del servidor');
    }

    // Validar que la respuesta sea exitosa
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al actualizar el cobro persuasivo');
    }

    return response.data;
  } catch (error) {
    console.error('[updateCobroPersuasivo] - Error:', error);
    
    if (axios.isAxiosError(error)) {
      // Manejar errores específicos de HTTP
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           'Datos de entrada inválidos';
        throw new Error(errorMessage);
      }
      
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para actualizar este cobro persuasivo');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Cobro persuasivo no encontrado');
      }
      
      if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.detail || 
                           'Error de validación en los datos enviados';
        throw new Error(errorMessage);
      }
      
      // Error genérico de respuesta
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Error al actualizar el cobro persuasivo';
      throw new Error(errorMessage);
    }
        
    // Re-lanzar errores de validación personalizada
    if (error instanceof Error) {
      throw error;
    }
    
    // Error genérico
    throw new Error('Error inesperado al actualizar el cobro persuasivo');
  }
};
