import { PazSalvoApprovalRequest, PazSalvoApprovalResponse } from '../models/PazSalvoApprovalTypes';
import axios from 'axios';

// Función para obtener la URL base de la API
const getBaseApiUrl = (): string => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

/**
 * Adapter para aprobar o desaprobar un paz y salvo
 * @param pazSalvoId - ID del paz y salvo a aprobar/desaprobar
 * @param isApproved - Indica si se aprueba (true) o desaprueba (false)
 * @param token - Token de autenticación
 * @param observacion - Observación para el rechazo
 * @returns Respuesta con el resultado de la operación
 */
export const approvePazSalvo = async (
  pazSalvoId: number | string,
  isApproved: boolean,
  token: string,
  observacion?: string
): Promise<PazSalvoApprovalResponse> => {
  try {
    // Validar que se proporcionó un ID válido
    if (!pazSalvoId) {
      console.error('[approvePazSalvo] - Error: ID de paz y salvo no proporcionado');
      return {
        success: false,
        detail: 'ID de paz y salvo no proporcionado'
      };
    }

    // Validar que se proporcionó un token
    if (!token) {
      console.error('[approvePazSalvo] - Error: Token de autenticación no proporcionado');
      return {
        success: false,
        detail: 'No se proporcionó un token de autenticación válido'
      };
    }

    // Si es rechazo, validar que se proporcionó observación
    if (!isApproved && !observacion) {
      console.warn('[approvePazSalvo] - Rechazo sin observación');
    }

    // Construir la URL completa
    const baseApiUrl = getBaseApiUrl();
    const url = `${baseApiUrl}cartera/paz-salvo-aprobar/${pazSalvoId}/`;
    
    console.log(`[approvePazSalvo] - URL de petición: ${url}`);
    console.log(`[approvePazSalvo] - Datos: es_aprobacion=${isApproved}, observacion=${observacion || ''}`);

    // Datos para el payload
    const requestData: PazSalvoApprovalRequest = {
      es_aprobacion: isApproved
    };
    
    // Agregar observación si es un rechazo
    if (!isApproved && observacion) {
      requestData.observacion = observacion;
    }

    // Realizar la petición PUT al endpoint
    const response = await axios.put<PazSalvoApprovalResponse>(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`[approvePazSalvo] - Respuesta: ${JSON.stringify(response.data)}`);
    
    // Verificar si la respuesta es exitosa
    if (response.status >= 200 && response.status < 300 && response.data.success) {
      return {
        success: true,
        detail: response.data.detail || (isApproved 
          ? 'Paz y Salvo aprobado correctamente.' 
          : 'Paz y Salvo desaprobado correctamente.')
      };
    } else {
      // Si la respuesta no es exitosa pero tiene un formato válido
      return {
        success: false,
        detail: response.data.detail || 'Error al procesar la solicitud'
      };
    }
  } catch (error) {
    console.error('[approvePazSalvo] - Error en la petición:', error);
    
    // Manejar errores específicos
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 0;
      const errorDetail = error.response?.data?.detail || error.message;
      
      let errorMessage = 'Error al procesar la solicitud';
      
      if (status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
      } else if (status === 403) {
        errorMessage = 'No tiene permisos para realizar esta acción.';
      } else if (status === 404) {
        errorMessage = 'No se encontró el paz y salvo especificado.';
      } else if (status >= 500) {
        errorMessage = 'Error interno del servidor. Por favor, intente más tarde.';
      } else {
        errorMessage = `Error: ${errorDetail}`;
      }
      
      return {
        success: false,
        detail: errorMessage
      };
    }
    
    // Error genérico
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Error desconocido al procesar la solicitud'
    };
  }
}; 