import axios from 'axios';
import { 
    ReporteCuotaFomentoFechaResponse, 
    ReporteCuotaFomentoFechaMapped,
    ReporteCuotaFomentoFechaParams 
} from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/models/reporteCuotaFomentoFecha.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte de recaudo cuota fomento regular
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros de fecha
 * @returns Promise con la respuesta del reporte
 */
export const getReporteCuotaFomentoFecha = async (
    token: string,
    params: ReporteCuotaFomentoFechaParams
): Promise<ReporteCuotaFomentoFechaMapped> => {
    try {
        // Construir parámetros de consulta
        const queryParams: any = {};

        // Agregar paginación o sin_paginacion
        if (params.sin_paginacion) {
            queryParams.sin_paginacion = true;
        } else {
            queryParams.page = params.page;
            queryParams.page_size = params.page_size;
        }

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_fin = params.fecha_final;

        const response = await axios.get<ReporteCuotaFomentoFechaResponse>(
            `${baseApiUrl}reportes/recaudo-cuota-fomento-regular/`,
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
            console.error('[getReporteCuotaFomentoFecha] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.data?.detail || 'Error al obtener el reporte de cuota fomento');
        }

        // Verificar la estructura de los datos
        let registrosData: any[] = [];
        let sumatoriasData: any = {};

        if (params.sin_paginacion) {
            // Cuando se usa sin_paginacion, los datos vienen directamente en response.data.data
            if (!response.data.data || !Array.isArray(response.data.data)) {
                console.error('[getReporteCuotaFomentoFecha] - Los datos no tienen la estructura esperada para sin_paginacion:', response.data);
                throw new Error('Formato de datos incorrecto para sin_paginacion');
            }
            registrosData = response.data.data;
            sumatoriasData = (response.data as any).sumatorias || {};
        } else {
            // Estructura normal con paginación
            if (!response.data.data || !response.data.data.data || !Array.isArray(response.data.data.data)) {
                console.error('[getReporteCuotaFomentoFecha] - Los datos no tienen la estructura esperada:', response.data);
                throw new Error('Formato de datos incorrecto');
            }
            registrosData = response.data.data.data;
            sumatoriasData = response.data.data.sumatorias || {};
        }

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: ReporteCuotaFomentoFechaMapped = {
            success: response.data.success,
            registros: registrosData.map(registro => ({
                ...registro,
                // Asegurar que los campos numéricos sean números
                total_kilos: Number(registro.total_kilos) || 0,
                valor_cuota_fomento: Number(registro.valor_cuota_fomento) || 0,
                precio_promedio: Number(registro.precio_promedio) || 0,
                valor_intereses: Number(registro.valor_intereses) || 0,
                agno_pago: Number(registro.agno_pago) || new Date().getFullYear(),
                // Asegurar que los campos de texto sean strings válidos
                nombre_recaudador: String(registro.nombre_recaudador || ''),
                tipo_documento_recaudador: String(registro.tipo_documento_recaudador || ''),
                numero_documento_recaudador: String(registro.numero_documento_recaudador || ''),
                cod_tipo_comprador_recaudador: String(registro.cod_tipo_comprador_recaudador || ''),
                nombres_tipo_comprador: String(registro.nombres_tipo_comprador || ''),
                nro_doc_pago: String(registro.nro_doc_pago || ''),
                fecha_pago: registro.fecha_pago || null,
                fecha_creacion: String(registro.fecha_creacion || '')
            })),
            sumatorias: sumatoriasData,
            count: response.data.count || registrosData.length,
            total_pages: response.data.total_pages || 1,
            current_page: response.data.current_page || 1,
            next: response.data.next || null,
            previous: response.data.previous || null
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getReporteCuotaFomentoFecha] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error(error.response?.data?.detail || 'Error en la petición');
            }
        }
        
        throw error;
    }
}; 