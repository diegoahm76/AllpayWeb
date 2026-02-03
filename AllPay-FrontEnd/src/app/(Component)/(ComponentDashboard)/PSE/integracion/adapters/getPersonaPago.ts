import { PersonaPago, PersonaPagoResponse } from '../models/PersonaTypes';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Función para obtener la URL base de la API
const getBaseApiUrl = (): string => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

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
      return 'No se encontraron datos de la persona para el pago.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Error en el servidor. Por favor, intente más tarde.';
    default:
      return `Error al obtener datos de la persona: ${errorDetail}`;
  }
};

/**
 * Obtener los datos de la persona para el pago PSE
 * @param token - Token JWT para la autenticación
 * @param retryCount - Número de reintentos en caso de error (default: 0)
 * @returns Datos de la persona para el pago
 */
export const getPersonaPago = async (
  token: string,
  retryCount: number = 0
): Promise<PersonaPagoResponse> => {
  try {
    if (!token) {
      console.error('[getPersonaPago] - Token no proporcionado');
      return {
        success: false,
        detail: 'Token no proporcionado',
        data: {} as PersonaPago,
        error: 'Token no proporcionado'
      };
    }

    // Obtener la URL base de la API desde las variables de entorno
    const baseApiUrl = getBaseApiUrl();
    
    // URL del endpoint para obtener los datos de la persona para el pago
    const url = `${baseApiUrl}personas/obtener-datos-persona-pago/`;
    
    console.log(`[getPersonaPago] - URL de petición: ${url}`);
    console.log(`[getPersonaPago] - Intento #${retryCount + 1}`);

    // Realizar la petición GET al endpoint con la configuración que incluye el token
    const config = getRequestConfig(token);
    
    const response = await axios.get<PersonaPagoResponse>(url, config);
    
    console.log(`[getPersonaPago] - Respuesta recibida:`, response.data);
    
    // Verificar si la respuesta es exitosa
    if (response.status >= 200 && response.status < 300 && response.data.success) {
      return response.data;
    } else {
      // Si la respuesta no es exitosa pero tiene un formato válido
      return {
        success: false,
        detail: response.data.detail || 'Error al obtener datos de la persona',
        data: {} as PersonaPago,
        error: 'Error al obtener datos de la persona'
      };
    }
  } catch (error) {
    console.error('[getPersonaPago] - Error en la petición:', error);
    
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
        console.log(`[getPersonaPago] - Reintentando petición (${retryCount + 1}/3)...`);
        // Esperar un tiempo antes de reintentar (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return getPersonaPago(token, retryCount + 1);
      }
      
      return {
        success: false,
        detail: errorMessage,
        data: {} as PersonaPago,
        error: errorMessage
      };
    }
    
    // Error genérico
    return {
      success: false,
      detail: 'Error desconocido al obtener datos de la persona',
      data: {} as PersonaPago,
      error: error instanceof Error ? error.message : 'Error desconocido al obtener datos de la persona'
    };
  }
}; 