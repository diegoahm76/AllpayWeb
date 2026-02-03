import axios from 'axios';
import { 
    ReporteLibroComprasCacaoResponse, 
    ReporteLibroComprasCacaoMapped,
    ReporteLibroComprasCacaoParams 
} from '../models/reporteLibroComprasCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte consolidado de libro de compras de cacao
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros de fecha
 * @returns Promise con la respuesta del reporte consolidado
 */
export const getReporteLibroComprasCacao = async (
    token: string,
    params: ReporteLibroComprasCacaoParams
): Promise<ReporteLibroComprasCacaoMapped> => {
    try {
        console.log('[getReporteLibroComprasCacao] - Iniciando petición a la API...');
        console.log('[getReporteLibroComprasCacao] - URL:', `${baseApiUrl}reportes/reporte-consolidado-libro-compras-cacao/`);
        console.log('[getReporteLibroComprasCacao] - Parámetros:', params);
        console.log('[getReporteLibroComprasCacao] - Token presente:', !!token);

        // Construir parámetros de consulta
        const queryParams: any = {
            page: params.page,
            page_size: params.page_size
        };

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_final = params.fecha_final;
        if (params.sin_paginacion) {
            queryParams.sin_paginacion = 'true';
            // Si sin_paginacion es true, no enviar parámetros de paginación
            delete queryParams.page;
            delete queryParams.page_size;
        }

        const response = await axios.get<ReporteLibroComprasCacaoResponse>(
            `${baseApiUrl}reportes/reporte-consolidado-libro-compras-cacao/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        console.log('[getReporteLibroComprasCacao] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page,
            facturasLength: response.data.data?.facturas?.length || 0
        });

        // Verificar si la respuesta fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener el reporte consolidado de libro de compras de cacao');
        }

        // Extraer y procesar los datos
        const responseData = response.data;
        const facturasData = Array.isArray(responseData.data?.facturas) ? responseData.data.facturas : [];
        const totalesData = responseData.data?.totales || {
            valor_cuota_fomento_total: 0,
            total_kilos: 0,
            total_valor_bruto: 0,
            total_valor_neto: 0
        };

        console.log('[getReporteLibroComprasCacao] - Facturas obtenidas:', facturasData.length);
        console.log('[getReporteLibroComprasCacao] - Totales:', totalesData);

        // Retornar datos mapeados
        return {
            success: true,
            facturas: facturasData,
            totales: {
                valor_cuota_fomento_total: Number(totalesData.valor_cuota_fomento_total) || 0,
                total_kilos: Number(totalesData.total_kilos) || 0,
                total_valor_bruto: Number(totalesData.total_valor_bruto) || 0,
                total_valor_neto: Number(totalesData.total_valor_neto) || 0
            },
            count: responseData.count,
            total_pages: responseData.total_pages,
            current_page: responseData.current_page,
            next: responseData.next,
            previous: responseData.previous
        };

    } catch (error) {
        console.error('[getReporteLibroComprasCacao] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               'Error al obtener el reporte consolidado de libro de compras de cacao';
            throw new Error(errorMessage);
        }
        
        throw new Error('Error inesperado al obtener el reporte consolidado de libro de compras de cacao');
    }
}; 