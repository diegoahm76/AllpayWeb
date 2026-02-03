import axios from 'axios';
import { 
    DocumentoPrecioNacionalResponse, 
    DocumentoPrecioNacionalMapped,
    DocumentoPrecioNacionalParams 
} from '../models/documentoPrecioNacional.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera un documento PDF del reporte de precio nacional de cacao
 * @param token Token de autenticación JWT
 * @param params Parámetros para la generación del documento
 * @returns Promise con la respuesta del documento generado
 */
export const generarDocumentoPrecioNacional = async (
    token: string,
    params: DocumentoPrecioNacionalParams
): Promise<DocumentoPrecioNacionalMapped> => {
    try {

        // Construir el payload para la petición POST
        const payload: any = {
            fecha_inicio: params.fecha_inicio,
            fecha_final: params.fecha_final
        };

        // Agregar parámetros opcionales si están presentes
        if (params.municipio) payload.municipio = params.municipio;
        if (params.departamento) payload.departamento = params.departamento;

        const response = await axios.post<DocumentoPrecioNacionalResponse>(
            `${baseApiUrl}reportes/documento-reporte-precio-nacional-cacao/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[generarDocumentoPrecioNacional] - La API indicó que la petición no fue exitosa:', response.data);
            // Si no hay datos, mostrar el mensaje del detail
            if (response.data.detail) {
                throw new Error(response.data.detail);
            }
            throw new Error('Error al generar el documento del reporte de precio nacional');
        }

        // Verificar la estructura de los datos
        if (!response.data.data) {
            console.error('[generarDocumentoPrecioNacional] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        console.log('[generarDocumentoPrecioNacional] - Documento generado exitosamente:', {
            id_documento: response.data.data.id_documento,
            total_recaudadores: response.data.data.total_recaudadores,
            periodo: response.data.data.periodo
        });

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: DocumentoPrecioNacionalMapped = {
            success: response.data.success,
            id_documento: response.data.data.id_documento,
            url_documento: response.data.data.url_documento,
            fecha_generacion: response.data.data.fecha_generacion,
            total_recaudadores: response.data.data.total_recaudadores,
            periodo: response.data.data.periodo,
            detail: response.data.detail
        };

        return mappedResponse;

    } catch (error) {
        console.error('[generarDocumentoPrecioNacional] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            // Si la respuesta tiene un detail, usarlo como mensaje de error
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            
            // Si no hay detail, manejar por código de estado
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error('Error en la petición');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al generar el documento del reporte de precio nacional');
    }
}; 