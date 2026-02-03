import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface CreateAccionCoactivoPorFacturaPayload {
  factura_id: number;
  descripcion: string;
  id_accion_cobro_persuasivo: number;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
  documento_adjunto?: File;
}

export interface CreateAccionCoactivoPorFacturaResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export const createAccionCoactivoPorFactura = async (
  token: string,
  payload: CreateAccionCoactivoPorFacturaPayload
): Promise<CreateAccionCoactivoPorFacturaResponse> => {
  try {
    // Crear FormData para manejar archivos
    const formData = new FormData();
    
    // Agregar campos básicos
    formData.append('factura_id', payload.factura_id.toString());
    formData.append('descripcion', payload.descripcion);
    formData.append('id_accion_cobro_persuasivo', payload.id_accion_cobro_persuasivo.toString());
    formData.append('nombre_recaudador', payload.nombre_recaudador);
    formData.append('email_recaudador', payload.email_recaudador);
    formData.append('celular_recaudador', payload.celular_recaudador);
    formData.append('aplicar_plantilla', payload.aplicar_plantilla.toString());
    
    // Agregar archivo si existe
    if (payload.documento_adjunto) {
      formData.append('documento_adjunto', payload.documento_adjunto);
    }

    const response = await axios.post<CreateAccionCoactivoPorFacturaResponse>(
      `${baseApiUrl}cartera/acciones-cobro-coactivo/`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error en la respuesta del servidor');
    }

    return response.data;
  } catch (error) {
    console.error('[createAccionCoactivoPorFactura] - Error:', error);
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
      throw new Error(error.response?.data?.message || 'Error al crear la acción de cobro coactivo');
    }
    throw new Error('Error de conexión al crear la acción de cobro coactivo');
  }
};


