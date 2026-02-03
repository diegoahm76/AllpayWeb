import axios from 'axios';
import {
    DocumentoReporteConsolidadoPagoCuotaFomentoResponse,
    DocumentoReporteConsolidadoPagoCuotaFomentoParams
} from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/models/documentoReporteConsolidadoPagoCuotaFomento.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera un documento PDF del reporte consolidado de pago de cuota de fomento
 * @param token Token de autenticación JWT
 * @param params Parámetros opcionales para filtrar el documento
 * @returns Promise con la respuesta del documento generado
 */

export const generarDocumentoReporteConsolidadoPagoCuotaFomento = async (
    token: string,
    params: DocumentoReporteConsolidadoPagoCuotaFomentoParams
): Promise<DocumentoReporteConsolidadoPagoCuotaFomentoResponse> => {
    try {
       
        // Construir parámetros de consulta
        const queryParams: any = {};

        // Agregar filtros opcionales si están presentes
        if (params.id_departamento_cacao) queryParams.id_departamento_cacao = params.id_departamento_cacao;
        if (params.id_municipio_cacao) queryParams.id_municipio_cacao = params.id_municipio_cacao;
        if (params.recaudador) queryParams.recaudador = params.recaudador;
        if (params.numero_documento_recaudador) queryParams.numero_documento_recaudador = params.numero_documento_recaudador;
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_final = params.fecha_final;
        if (params.numero_documento_proveedor) queryParams.numero_documento_proveedor = params.numero_documento_proveedor;
        if (params.nombres_proveedor) queryParams.nombres_proveedor = params.nombres_proveedor;
        if (params.page_size) queryParams.page_size = params.page_size;

        const response = await axios.get<DocumentoReporteConsolidadoPagoCuotaFomentoResponse>(
            `${baseApiUrl}reportes/documento-reporte-consolidado-pago-cuota-fomento/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        // Verificar si la respuesta fue exitosa
        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al generar el documento del reporte consolidado de pago de cuota de fomento');
        }

        return response.data;

    } catch (error) {
        console.error('[generarDocumentoReporteConsolidadoPagoCuotaFomento] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               'Error al generar el documento del reporte consolidado de pago de cuota de fomento';
            throw new Error(errorMessage);
        }
        
        throw new Error('Error inesperado al generar el documento del reporte consolidado de pago de cuota de fomento');
    }
}; 