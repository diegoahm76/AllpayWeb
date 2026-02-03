import axios from 'axios';
import { PazSalvoDetalleResponse, PazSalvoDetalle } from '../models/pazSalvoDetalle.model';

// Asegurar que la URL base termina con barra
const getBaseApiUrl = () => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

// Endpoint para obtener el detalle de un paz y salvo
const ENDPOINT = 'cartera/paz-salvo-detalle';

export const getPazSalvoDetalle = async (
  token: string,
  pazSalvoId: number
): Promise<PazSalvoDetalleResponse> => {
  try {
    // Construir la URL
    const url = `${baseApiUrl}${ENDPOINT}/${pazSalvoId}/`;
    
    console.log(`Realizando petición de detalle paz y salvo a: ${url}`);
    
    // Realizar la petición
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });
    
    console.log('Respuesta recibida con status:', response.status);
    
    // Verificar la estructura de la respuesta
    if (response.data && response.data.success) {
      // Asegurarse de que todos los campos requeridos estén presentes
      const processedData = response.data.data.map((item: any): PazSalvoDetalle => {
        return {
          id_paz_y_salvo_factura: item.id_paz_y_salvo_factura || 0,
          numero_paz_y_salvo: item.numero_paz_y_salvo || '',
          fecha_generacion: item.fecha_generacion || '',
          nombre_tipo_paz_y_salvo: item.nombre_tipo_paz_y_salvo || '',
          nombre_puerto: item.nombre_puerto || '',
          fecha_registro_factura: item.fecha_registro_factura || '',
          numero_factura: item.numero_factura || 0,
          departamento: item.departamento || '',
          municipio: item.municipio || '',
          fecha_compra: item.fecha_compra || '',
          kilos_reportados: item.kilos_reportados || 0,
          cuota_fomento: item.cuota_fomento || 0,
          kilos_con_paz_y_salvo: item.kilos_con_paz_y_salvo || 0,
          kilos_a_reportar: item.kilos_a_reportar || 0,
          razon_social_tercero: item.razon_social_tercero,
          numero_documento: item.numero_documento,
          nombre_factura: item.nombre_factura || '',
          // Campos opcionales para mantener compatibilidad
          factura_proveedor: item.factura_proveedor || item.nombre_factura || '',
          kilos_a_generar_paz_y_salvo: item.kilos_a_generar_paz_y_salvo || item.kilos_a_reportar || 0,
          tipo_documento: item.tipo_documento || '',
          id_factura_unica: item.id_factura_unica || 0,
          id_paz_y_salvo: item.id_paz_y_salvo || pazSalvoId
        };
      });
      
      return {
        ...response.data,
        data: processedData
      };
    } else {
      // Si no tiene la estructura esperada, devolver un error
      console.error('Respuesta sin estructura esperada:', response.data);
      return {
        success: false,
        detail: response.data?.detail || 'Formato de respuesta inesperado',
        data: []
      };
    }
  } catch (error) {
    // Manejo de errores
    console.error('Error al obtener detalles del paz y salvo:', error);
    
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
          detail: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
          data: []
        };
      } else if (status === 403) {
        return {
          success: false,
          detail: 'No tiene permisos para acceder a esta información.',
          data: []
        };
      } else if (status === 404) {
        return {
          success: false,
          detail: 'No se encontró el detalle del paz y salvo solicitado.',
          data: []
        };
      } else {
        return {
          success: false,
          detail: `Error al obtener el detalle del paz y salvo: ${error.message}`,
          data: []
        };
      }
    } else {
      // Otros tipos de errores
      return {
        success: false,
        detail: error instanceof Error ? error.message : 'Error desconocido al obtener el detalle del paz y salvo',
        data: []
      };
    }
  }
}; 