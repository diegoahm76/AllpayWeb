import axios from 'axios';
import { 
    SumatoriasAcuerdosPagoResponse, 
    SumatoriasAcuerdosPagoMapped,
    SumatoriasAcuerdosPagoParams 
} from '../models/sumatoriasAcuerdosPago.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene las sumatorias del reporte consolidado de acuerdos de pago
 * @param token Token de autenticación JWT
 * @param params Parámetros opcionales de filtro
 * @returns Promise con las sumatorias calculadas
 */
export const getSumatoriasAcuerdosPago = async (
    token: string,
    params?: SumatoriasAcuerdosPagoParams
): Promise<SumatoriasAcuerdosPagoMapped> => {
    try {
        console.log('[getSumatoriasAcuerdosPago] - Iniciando petición a la API...');
        console.log('[getSumatoriasAcuerdosPago] - URL:', `${baseApiUrl}reportes/sumatorias-reporte-consolidado-acuerdos-pago/`);
        console.log('[getSumatoriasAcuerdosPago] - Parámetros:', params);
        console.log('[getSumatoriasAcuerdosPago] - Token presente:', !!token);

        // Construir parámetros de consulta si están presentes
        const queryParams: any = {};
        if (params?.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params?.fecha_final) queryParams.fecha_fin = params.fecha_final;
        if (params?.estado) queryParams.estado = params.estado;
        if (params?.nombre_recaudador) queryParams.nombre_recaudador = params.nombre_recaudador;

        const response = await axios.get<SumatoriasAcuerdosPagoResponse>(
            `${baseApiUrl}reportes/sumatorias-reporte-consolidado-acuerdos-pago/`,
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
            console.error('[getSumatoriasAcuerdosPago] - La API indicó que la petición no fue exitosa:', response.data);
            // Si no hay datos, mostrar el mensaje del detail
            if (response.data.detail) {
                throw new Error(response.data.detail);
            }
            throw new Error('Error al obtener las sumatorias del reporte consolidado de acuerdos de pago');
        }

        // Verificar la estructura de los datos
        if (!response.data.sumatorias) {
            console.error('[getSumatoriasAcuerdosPago] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        console.log('[getSumatoriasAcuerdosPago] - Sumatorias obtenidas exitosamente:', {
            total_cuotas_fomento: response.data.sumatorias.total_cuotas_fomento,
            total_intereses: response.data.sumatorias.total_intereses
        });

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: SumatoriasAcuerdosPagoMapped = {
            success: response.data.success,
            sumatorias: response.data.sumatorias,
            detail: response.data.detail
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getSumatoriasAcuerdosPago] - Error:', error);
        
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
            } 
            else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error('Error en la petición');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al obtener las sumatorias del reporte consolidado de acuerdos de pago');
    }
}; 