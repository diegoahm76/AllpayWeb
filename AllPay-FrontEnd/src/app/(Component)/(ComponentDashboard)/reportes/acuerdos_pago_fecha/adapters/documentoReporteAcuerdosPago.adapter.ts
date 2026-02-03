import axios from 'axios';
import { 
    DocumentoReporteAcuerdosPagoResponse, 
    DocumentoReporteAcuerdosPagoMapped,
    DocumentoReporteAcuerdosPagoParams 
} from '../models/documentoReporteAcuerdosPago.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera y obtiene el documento del reporte consolidado de acuerdos de pago
 * @param token Token de autenticación JWT
 * @param params Parámetros opcionales de filtro de fecha
 * @returns Promise con la respuesta del documento generado
 */
export const getDocumentoReporteAcuerdosPago = async (
    token: string,
    params?: DocumentoReporteAcuerdosPagoParams
): Promise<DocumentoReporteAcuerdosPagoMapped> => {
    try {
        console.log('[getDocumentoReporteAcuerdosPago] - Iniciando petición a la API...');
        console.log('[getDocumentoReporteAcuerdosPago] - URL:', `${baseApiUrl}reportes/documento-reporte-consolidado-acuerdos-pago/`);
        console.log('[getDocumentoReporteAcuerdosPago] - Parámetros:', params);
        console.log('[getDocumentoReporteAcuerdosPago] - Token presente:', !!token);

        // Construir parámetros de consulta si están presentes
        const queryParams: any = {};
        if (params?.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params?.fecha_fin) queryParams.fecha_fin = params.fecha_fin;
        if (params?.estado) queryParams.estado = params.estado;
        if (params?.nombre_recaudador) queryParams.nombre_recaudador = params.nombre_recaudador;

        const response = await axios.get<DocumentoReporteAcuerdosPagoResponse>(
            `${baseApiUrl}reportes/documento-reporte-consolidado-acuerdos-pago/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[getDocumentoReporteAcuerdosPago] - La API indicó que la petición no fue exitosa:', response.data);
            // Si no hay datos, mostrar el mensaje del detail
            if (response.data.detail) {
                throw new Error(response.data.detail);
            }
            throw new Error('Error al generar el documento del reporte consolidado de acuerdos de pago');
        }

        // Verificar la estructura de los datos
        if (!response.data.data) {
            console.error('[getDocumentoReporteAcuerdosPago] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        console.log('[getDocumentoReporteAcuerdosPago] - Documento generado exitosamente:', {
            id_documento: response.data.data.id_documento_generado,
            documento_generado: response.data.data.documento_generado,
            archivo_url: response.data.data.archivo
        });

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: DocumentoReporteAcuerdosPagoMapped = {
            success: response.data.success,
            detail: response.data.detail,
            data: response.data.data
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getDocumentoReporteAcuerdosPago] - Error:', error);
        
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
        
        throw new Error('Error inesperado al generar el documento del reporte consolidado de acuerdos de pago');
    }
}; 