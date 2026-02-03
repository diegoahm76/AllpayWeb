import axios from 'axios';
import { PazSalvoUpdatePayload, PazSalvoUpdateResponse } from '../models/pazSalvoUpdate.model';

// Asegurar que la URL base termina con barra
const getBaseApiUrl = () => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

// Endpoint para actualizar un paz y salvo
const ENDPOINT = 'cartera/paz-salvo-update';

export const updatePazSalvo = async (
  token: string,
  pazSalvoId: number,
  payload: PazSalvoUpdatePayload
): Promise<PazSalvoUpdateResponse> => {
  try {
    // Construir la URL
    const url = `${baseApiUrl}${ENDPOINT}/${pazSalvoId}/`;
    
    console.log(`Realizando petición de actualización de paz y salvo a: ${url}`);
    console.log('Payload:', payload);
    
    // Realizar la petición
    const response = await axios.put(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });
    
    console.log('Respuesta recibida con status:', response.status);
    
    // Verificar la estructura de la respuesta
    if (response.data && response.data.success) {
      return response.data;
    } else {
      // Si no tiene la estructura esperada pero es exitosa, formatear la respuesta
      return {
        success: true,
        detail: response.data?.detail || 'Paz y Salvo actualizado correctamente'
      };
    }
  } catch (error) {
    // Manejo de errores
    console.error('Error al actualizar el paz y salvo:', error);
    
    if (axios.isAxiosError(error)) {
      // Errores específicos de Axios
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.error('Error Axios:', {
        status,
        data: errorData,
        message: error.message
      });
      
      // Respuestas de error comunes
      if (status === 401) {
        return {
          success: false,
          detail: 'Sesión expirada. Por favor, inicie sesión nuevamente.'
        };
      } else if (status === 403) {
        return {
          success: false,
          detail: 'No tiene permisos para actualizar este paz y salvo.'
        };
      } else if (status === 404) {
        return {
          success: false,
          detail: 'No se encontró el paz y salvo solicitado.'
        };
      } else {
        return {
          success: false,
          detail: `Error al actualizar el paz y salvo: ${errorData?.detail || error.message}`
        };
      }
    } else {
      // Otros tipos de errores
      return {
        success: false,
        detail: error instanceof Error ? error.message : 'Error desconocido al actualizar el paz y salvo'
      };
    }
  }
}; 