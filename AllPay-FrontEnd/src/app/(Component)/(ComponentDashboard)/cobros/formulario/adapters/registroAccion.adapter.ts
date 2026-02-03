import axios from 'axios';
import { CreateCobroPersuasivoPayload, CreateCobroPersuasivoResponse } from '../models/registroAccion.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Crea una nueva acción de cobro persuasivo
 */
export const createCobroPersuasivo = async (
  token: string,
  payload: CreateCobroPersuasivoPayload
): Promise<CreateCobroPersuasivoResponse> => {
  try {

    // Crear FormData para enviar archivos si es necesario
    const formData = new FormData();
    
    // Agregar todos los campos del payload
    formData.append('factura', payload.factura.toString());
    formData.append('descripcion', payload.descripcion);
    formData.append('fecha_registro', payload.fecha_registro);
    formData.append('id_accion_cobro_persuasivo', payload.id_accion_cobro_persuasivo.toString());
    formData.append('nombre_recaudador', payload.nombre_recaudador);
    formData.append('email_recaudador', payload.email_recaudador);
    formData.append('celular_recaudador', payload.celular_recaudador);
    formData.append('aplicar_plantilla', payload.aplicar_plantilla.toString());
    
    // Agregar documento si existe
    if (payload.documento_adjunto) {
      formData.append('documento_adjunto', payload.documento_adjunto);
    }

    const response = await axios.post<CreateCobroPersuasivoResponse>(
      `${baseApiUrl}cartera/cobros-persuasivos/create/`,
      formData,
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