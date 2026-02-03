import { UserProfile, UserProfileResponse } from '../models/UserTypes';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Configura los headers de la petición con el token JWT
 * @param token Token JWT para la autenticación
 * @returns Configuración para la petición Axios
 */
const getRequestConfig = (token: string): AxiosRequestConfig => {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    timeout: 10000 // 10 segundos de timeout
  };
};

/**
 * Procesa un error de la API y devuelve un mensaje amigable
 * @param error - Error de Axios
 * @returns Mensaje de error
 */
const processApiError = (error: AxiosError): string => {
  const status = error.response?.status || 0;
  const errorData = error.response?.data as Record<string, any> | undefined;
  const errorDetail = errorData?.detail || error.message;
  
  switch (status) {
    case 401:
      return 'Error de autenticación. Por favor, inicie sesión nuevamente.';
    case 403:
      return 'No tiene permisos para acceder a esta información.';
    case 404:
      return 'No se encontró la información del perfil.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Error en el servidor. Por favor, intente más tarde.';
    default:
      return `Error al obtener perfil: ${errorDetail}`;
  }
};

/**
 * Obtener los datos del perfil del usuario
 * @param token - Token JWT para la autenticación
 * @param retryCount - Número de reintentos en caso de error (default: 0)
 * @returns Datos del perfil del usuario
 */
export const getUserProfile = async (
  token: string,
  retryCount: number = 0
): Promise<UserProfileResponse> => {
  try {
    if (!token) {
      console.error('[getUserProfile] - Token no proporcionado');
      return {
        success: false,
        data: {},
        error: 'Token no proporcionado'
      };
    }

    // URL del endpoint para obtener el perfil del usuario
    const url = '/api/user/profile';
    
    console.log(`[getUserProfile] - URL de petición: ${url}`);
    console.log(`[getUserProfile] - Intento #${retryCount + 1}`);

    // Realizar la petición GET al endpoint con la configuración que incluye el token
    const config = getRequestConfig(token);
    
    const response = await axios.get<UserProfile>(url, config);

    console.log(`[getUserProfile] - Respuesta recibida para el usuario`);
    
    // Verificar si la respuesta es exitosa
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        data: response.data,
        message: 'Perfil obtenido correctamente'
      };
    } else {
      // Si la respuesta no es exitosa pero tiene un formato válido
      return {
        success: false,
        data: {},
        error: 'Error al obtener el perfil de usuario'
      };
    }
  } catch (error) {
    console.error('[getUserProfile] - Error en la petición:', error);
    
    // Manejar errores específicos de Axios
    if (axios.isAxiosError(error)) {
      const errorMessage = processApiError(error);
      
      // Si hay reintentos disponibles y es un error de red o 5xx, reintentar
      if (
        retryCount < 3 && 
        (error.code === 'ECONNABORTED' || 
         error.code === 'ETIMEDOUT' || 
         (error.response && error.response.status >= 500))
      ) {
        console.log(`[getUserProfile] - Reintentando petición (${retryCount + 1}/3)...`);
        // Esperar un tiempo antes de reintentar (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return getUserProfile(token, retryCount + 1);
      }
      
      return {
        success: false,
        data: {},
        error: errorMessage
      };
    }
    
    // Error genérico
    return {
      success: false,
      data: {},
      error: error instanceof Error ? error.message : 'Error desconocido al obtener el perfil'
    };
  }
};

/**
 * Extrae los datos del usuario de la sesión sin necesidad de hacer una petición API
 * Esta función sirve como fallback cuando no hay conectividad o cuando 
 * la información básica es suficiente
 * 
 * @param session Objeto de sesión del usuario
 * @returns Datos básicos del perfil extraídos de la sesión
 */
export const extractProfileFromSession = (session: any): UserProfile => {
  if (!session || !session.user) {
    return {};
  }

  // Extraer los datos disponibles en la sesión
  const { user } = session;

  return {
    nombre: user.nombre || user.name || '',
    email: user.email || '',
    // Otros campos que puedan estar disponibles en la sesión
    // Si no están presentes, se dejarán indefinidos
    apellido: user.apellido || '',
    telefono: user.telefono || '',
    direccion: user.direccion || '',
    tipoDocumento: user.tipoDocumento || '',
    numeroDocumento: user.numeroDocumento || user.documento || '',
    tipoPersona: user.tipoPersona || (user.tipo_usuario === 'empresa' ? 'juridica' : 'natural') || ''
  };
}; 