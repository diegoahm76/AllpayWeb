import { PseBank, BanksResponse } from '../models/BankTypes';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Obtener credenciales desde variables de entorno
const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn('[getApiKey] - ⚠️ No se ha configurado API_KEY en las variables de entorno');
  }
  return apiKey || '';
};

const getMerchantId = (): string => {
  const merchantId = process.env.MERCHANT_ID;
  if (!merchantId) {
    console.warn('[getMerchantId] - ⚠️ No se ha configurado MERCHANT_ID en las variables de entorno');
  }
  return merchantId || '';
};

/**
 * Configura los headers de la petición con autenticación básica
 * @returns Configuración para la petición Axios
 */
const getRequestConfig = (): AxiosRequestConfig => {
  // Crear un string de autenticación básica con la clave de API como usuario y cadena vacía como contraseña
  const apiKey = getApiKey();
  const authString = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authString
    },
    timeout: 15000 // 15 segundos de timeout
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
      return 'Error de autenticación con la pasarela de pago. Por favor, contacte al administrador.';
    case 403:
      return 'No tiene permisos para acceder a la pasarela de pago.';
    case 404:
      return 'No se encontró el recurso de bancos PSE.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Error en el servidor de la pasarela de pago. Por favor, intente más tarde.';
    default:
      return `Error al obtener bancos: ${errorDetail}`;
  }
};

/**
 * Obtener la lista de bancos PSE
 * @param retryCount - Número de reintentos en caso de error (default: 0)
 * @returns Lista de bancos PSE
 */
export const getBanks = async (
  retryCount: number = 0
): Promise<BanksResponse> => {
  try {
    // Obtener la URL base de la API desde las variables de entorno
    const baseOpenPayUrl = process.env.BASE_OPEN_PAY;
    if (!baseOpenPayUrl) {
      console.warn('[getBanks] - ⚠️ No se ha configurado BASE_OPEN_PAY en las variables de entorno');
    }
    
    const baseApiUrl = baseOpenPayUrl || 'https://sandbox-api.openpay.co/v1/';
    const merchantId = getMerchantId();
    
    // URL del endpoint para obtener los bancos PSE
    const url = `${baseApiUrl}${merchantId}/banks/pse`;
    
    console.log(`[getBanks] - URL de petición: ${url}`);
    console.log(`[getBanks] - Intento #${retryCount + 1}`);

    // Realizar la petición GET al endpoint con la configuración que incluye la autenticación
    const config = getRequestConfig();
    console.log(`[getBanks] - Usando autenticación básica con la clave de API`);
    
    const response = await axios.get<PseBank[]>(url, config);

    console.log(`[getBanks] - Respuesta recibida con ${response.data.length} bancos`);
    
    // Verificar si la respuesta es exitosa
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        data: response.data,
        message: 'Bancos obtenidos correctamente'
      };
    } else {
      // Si la respuesta no es exitosa pero tiene un formato válido
      return {
        success: false,
        data: [],
        error: 'Error al obtener la lista de bancos'
      };
    }
  } catch (error) {
    console.error('[getBanks] - Error en la petición:', error);
    
    // Manejar errores específicos de Axios
    if (axios.isAxiosError(error)) {
      const errorMessage = processApiError(error);
      
      // Si hay reintentos disponibles y es un error de red o 5xx, reintentar
      if (
        retryCount < 3 && 
        (error.code === 'ECONNABORTED' || 
         error.code === 'ETIMEDOUT' || 
         (error.response && error.response.status >= 500) ||
         (error.response && error.response.status === 401)) // También reintentar en caso de error de autenticación
      ) {
        console.log(`[getBanks] - Reintentando petición (${retryCount + 1}/3)...`);
        // Esperar un tiempo antes de reintentar (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return getBanks(retryCount + 1);
      }
      
      return {
        success: false,
        data: [],
        error: errorMessage
      };
    }
    
    // Error genérico
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido al obtener la lista de bancos'
    };
  }
}; 