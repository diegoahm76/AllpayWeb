// adapters/createProvider.ts
import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface NaturalPayload {
  tipo_persona: 'N';
  tipo_documento: string;
  numero_documento: string;
  cod_municipio_expedicion_id: string;
  municipio_residencia: string;
  email: string;
  direccion_notificaciones: string;
  coordenada_x: string;
  coordenada_y: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  telefono_celular: string;
}

export interface JuridicaPayload {
  tipo_persona: 'J';
  tipo_documento: string;
  numero_documento: string;
  cod_municipio_expedicion_id: string;
  cod_municipio_laboral_nal: string;
  email: string;
  direccion_notificaciones: string;
  coordenada_x: string;
  coordenada_y: string;
  nombre_comercial: string;
  razon_social: string;
  telefono_celular_empresa: string;
}

type ProviderPayload = NaturalPayload | JuridicaPayload;

export const createProvider = async (payload: ProviderPayload, token: string): Promise<any> => {
  try {
    // Validar que el payload tenga todos los campos requeridos según el tipo de persona
    if (payload.tipo_persona === 'N') {
      const naturalPayload = payload as NaturalPayload;
      if (!naturalPayload.primer_nombre || !naturalPayload.primer_apellido) {
        throw new Error('Faltan campos requeridos para persona natural');
      }
    } else {
      const juridicaPayload = payload as JuridicaPayload;
      if (!juridicaPayload.nombre_comercial || !juridicaPayload.razon_social) {
        throw new Error('Faltan campos requeridos para persona jurídica');
      }
    }

    const response = await axios.post(`${baseApiUrl}personas/proveedores/create/`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.data.success) {
      throw new Error('Error al crear proveedor: respuesta no exitosa');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error al crear proveedor:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Error en la creación del proveedor: ${error.response?.data?.detail || error.message}`);
    }
    throw error;
  }
};
