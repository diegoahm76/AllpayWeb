import axios from 'axios';
import { isTokenExpiredError, showSessionExpiredAlert } from '@/utils/sessionExpiredHandler';

export interface UserProfileResponse {
  success: boolean;
  persona?: {
    tipo_persona?: 'N' | 'J' | '';
    id_persona?: number;
    primer_nombre?: string;
    segundo_nombre?: string;
    primer_apellido?: string;
    segundo_apellido?: string;
    telefono_celular?: string;
    telefono_empresa?: string;
    nombre_pais?: string;
    nombre_departamento_residencia?: string;
    email?: string;
    nombre_municipio_residencia?: string;
    direccion_residencia?: string;
    direccion_notificaciones?: string;
    razon_social?: string;
    nombre_comercial?: string;
    nombre_naturaleza_empresa?: string;
    representante_legal_data?: {
      primer_nombre?: string;
      segundo_nombre?: string;
      primer_apellido?: string;
      segundo_apellido?: string;
      telefono_celular?: string;
      email?: string;
      nombre_pais?: string;
      nombre_departamento_residencia?: string;
      nombre_municipio_residencia?: string;
      direccion_residencia?: string;
    };
  };
  image_profile?: string;
  firma_usuario?: string;
  detail?: string;
  tiene_2fa?: boolean;
}

const baseApiUrl = process.env.BASE_API_URL;

export async function fetchUserData(token: string): Promise<UserProfileResponse> {
  try {
    const response = await axios.get(`${baseApiUrl}users/profile/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data.success === false) {
      throw new Error(response.data.detail || 'Error fetching user data');
    }

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && isTokenExpiredError(error)) {
      showSessionExpiredAlert();
      throw new Error('Sesión expirada');
    }

    throw new Error('No se pudo cargar la información de usuario');
  }
}

export async function validateImageUrl(url: string): Promise<string> {
  if (!url) {
    return '/images/user.jpg';
  }

  if (url.includes('s3.amazonaws.com')) {
    return url;
  }

  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return url;
  } catch {
    return '/images/user.jpg';
  }
}

