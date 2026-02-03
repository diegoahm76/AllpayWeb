import axios from 'axios';

export interface ProviderResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: ProviderData[];
}

export interface ProviderData {
  id_persona: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
  tipo_persona: string;
  email: string;
  direccion_notificaciones: string;
  proveedor: boolean;
  cod_municipio_expedicion_id: string;
  nombre_municipio_expedicion: string;
  cod_departamento_expedicion: string;
  nombre_departamento_expedicion: string;
  codigo_municipio_residencial_laboral: string;
  nombre_municipio_residencial_laboral: string;
  cod_departamento_residencial_laboral: string;
  nombre_departamento_residencial_laboral: string;
}

export interface GetProviderParams {
  tipo_documento: string;
  numero_documento: string;
}

const baseApiUrl = process.env.BASE_API_URL;

export const getProvider = async (params: GetProviderParams, token: string): Promise<ProviderResponse> => {
  try {
    const response = await axios.get(`${baseApiUrl}recaudos/get-proveedores/`, {
      params,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error al obtener proveedor:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Error al obtener el proveedor: ${error.response?.data?.detail || error.message}`);
    }
    throw error;
  }
};
