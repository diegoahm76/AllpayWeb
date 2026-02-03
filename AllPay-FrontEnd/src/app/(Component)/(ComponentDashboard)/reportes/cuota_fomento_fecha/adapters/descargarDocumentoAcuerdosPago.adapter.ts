import axios from 'axios';
import { 
    DescargarDocumentoAcuerdosPagoParams,
    DescargarDocumentoAcuerdosPagoResponse 
} from '../models/descargarDocumentoAcuerdosPago.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera el documento del reporte de acuerdos de pago en formato PDF
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta para el reporte
 * @returns Promise con la respuesta del documento
 */
export const descargarDocumentoAcuerdosPago = async (
    token: string,
    params: DescargarDocumentoAcuerdosPagoParams
): Promise<DescargarDocumentoAcuerdosPagoResponse> => {
    try {
        console.log('[descargarDocumentoAcuerdosPago] - Iniciando generación del documento...');
        console.log('[descargarDocumentoAcuerdosPago] - URL:', `${baseApiUrl}reportes/documento-recaudo-por-acuerdos-pago/`);
        console.log('[descargarDocumentoAcuerdosPago] - Parámetros:', params);
        console.log('[descargarDocumentoAcuerdosPago] - Token presente:', !!token);

        // Construir parámetros de consulta
        const queryParams: any = {};

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_fin) queryParams.fecha_fin = params.fecha_fin;

        const response = await axios.get<DescargarDocumentoAcuerdosPagoResponse>(
            `${baseApiUrl}reportes/documento-recaudo-por-acuerdos-pago/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        console.log('[descargarDocumentoAcuerdosPago] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            detail: response.data.detail
        });

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[descargarDocumentoAcuerdosPago] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.detail || 'Error al generar el documento del reporte de acuerdos de pago');
        }

        // Verificar que se haya generado el documento
        if (!response.data.data || !response.data.data.archivo) {
            console.error('[descargarDocumentoAcuerdosPago] - No se encontró la URL del archivo en la respuesta:', response.data);
            throw new Error('No se pudo generar el documento del reporte');
        }

        console.log('[descargarDocumentoAcuerdosPago] - Documento generado exitosamente:', response.data.data.archivo);

        return response.data;

    } catch (error) {
        console.error('[descargarDocumentoAcuerdosPago] - Error:', error);
        
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
                throw new Error('Error en la petición de generación del documento');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al generar el documento del reporte de acuerdos de pago');
    }
}; 