import axios from 'axios';
import { PazSalvoResponse, PazSalvoSearchParams, PazSalvoPaginadoResponse } from '../models/types';

// Asegurar que la URL base termina con barra
const getBaseApiUrl = () => {
    // Usar el endpoint configurado en variables de entorno
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

// Endpoints para consultar paz y salvos
const ENDPOINT_REGULAR = 'cartera/paz-salvo-lista';
const ENDPOINT_INTERNO = 'cartera/paz-salvo-lista-interno';

// Procesar respuesta paginada
const procesarRespuestaPaginada = (response: PazSalvoPaginadoResponse): PazSalvoResponse => {
    console.log('[getPazSalvos] - 🔍 Procesando respuesta paginada:', {
        success: response.success,
        count: response.count,
        totalPages: response.total_pages,
        currentPage: response.current_page
    });
    
    // Si la respuesta no tiene success, devolver error
    if (!response.success) {
        console.error('[getPazSalvos] - ❌ La respuesta no tiene success:', response);
        return {
            success: false,
            detail: response.data?.detail || 'Error al obtener los paz y salvos',
            data: []
        };
    }
    
    // Verificar si la respuesta tiene la estructura esperada
    if (!response.data) {
        console.error('[getPazSalvos] - ❌ Respuesta sin propiedad data:', response);
        return {
            success: false,
            detail: 'Datos recibidos con formato inesperado',
            data: []
        };
    }
    
    // Extraer los datos de la estructura anidada
    if (Array.isArray(response.data.data)) {
        console.log(`[getPazSalvos] - ✅ Datos obtenidos: ${response.data.data.length} registros`);
        return {
            success: true,
            detail: response.data.detail || 'Paz y salvos obtenidos correctamente',
            data: response.data.data || [],
            // Agregar información de paginación
            count: response.count,
            total_pages: response.total_pages,
            current_page: response.current_page,
            next: response.next,
            previous: response.previous
        };
    } else {
        console.error('[getPazSalvos] - ❌ response.data.data no es un array:', response.data);
        return {
            success: false,
            detail: 'Formato de datos inesperado',
            data: []
        };
    }
};

export const getPazSalvos = async (
    token: string,
    params?: PazSalvoSearchParams,
    page?: number,
    isInternal?: boolean
): Promise<PazSalvoResponse> => {
    // Validación previa de fechas para evitar errores en la API
    if (params?.fecha_inicio && params?.fecha_fin) {
        const fechaInicio = new Date(params.fecha_inicio);
        const fechaFin = new Date(params.fecha_fin);
        
        if (fechaInicio > fechaFin) {
            console.log('[getPazSalvos] - ❌ Validación local: La fecha de inicio no puede ser mayor que la fecha de fin');
            return {
                success: false,
                detail: "La fecha de inicio no puede ser mayor que la fecha de fin.",
                data: []
            };
        }
    }
    
    // Determinar qué endpoint usar según el tipo de usuario
    const endpoint = isInternal ? ENDPOINT_INTERNO : ENDPOINT_REGULAR;
    
    // Mostrar información sobre el entorno y la URL base
    console.log('[getPazSalvos] - 🔎 Información de la petición:');
    console.log('  URL base:', baseApiUrl);
    console.log('  Endpoint:', endpoint);
    console.log('  TOKEN presente:', !!token);
    console.log('  Parámetros de búsqueda:', params);
    console.log('  Es usuario interno:', isInternal);
    
    try {
        // Construir la URL
        let url = `${baseApiUrl}${endpoint}/`;
        
        // Asegurar que no hay doble barra
        if (url.endsWith('//')) {
            url = url.slice(0, -1);
        }
        
        // Añadir parámetros de consulta
        const queryParams = new URLSearchParams();
        
        // Añadir parámetros de filtro si se proporcionaron
        if (params?.fecha_inicio) queryParams.append('fecha_inicio', params.fecha_inicio);
        if (params?.fecha_fin) queryParams.append('fecha_fin', params.fecha_fin);
        if (params?.nro_documento) queryParams.append('nro_documento', params.nro_documento);
        
        // Si hay un número de página específico, usarlo
        if (page) {
            queryParams.append('page', page.toString());
        } else if (params?.page) {
            queryParams.append('page', params.page.toString());
        }
        
        // Solo añadir el signo de interrogación si hay parámetros
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        console.log(`[getPazSalvos] - 📡 URL FINAL DE PETICIÓN: ${url}`);
        console.log(`[getPazSalvos] - 📡 PARÁMETROS ENVIADOS: ${queryParams.toString()}`);
        
        // Realizar la petición con tiempo de espera ampliado para usuarios internos
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            timeout: isInternal ? 30000 : 15000 // Mayor tiempo de espera para usuarios internos
        });
        
        console.log('[getPazSalvos] - ✅ Respuesta recibida con status:', response.status);
        // Mostrar parte de la respuesta para depuración (limitado para no saturar la consola)
        console.log('[getPazSalvos] - 📊 Resumen de respuesta:', {
            status: response.status,
            statusText: response.statusText,
            dataType: typeof response.data,
            hasData: !!response.data,
            dataSize: JSON.stringify(response.data).length
        });
        
        // Mostrar los primeros 100 caracteres de la respuesta para verificar la estructura
        console.log('[getPazSalvos] - 📄 Muestra de la respuesta:', 
            JSON.stringify(response.data).substring(0, 100) + '...');
        
        // Verificar si la respuesta tiene la estructura esperada
        if (response.data && response.data.success) {
            // Añadir logs para depuración
            console.log('[getPazSalvos] - ✅ RESPUESTA EXITOSA:', {
                statusCode: response.status,
                responseSize: response.data ? JSON.stringify(response.data).length : 0,
                count: response.data.count,
                totalPages: response.data.total_pages,
                currentPage: response.data.current_page
            });
            
            // Mostrar los primeros registros para depuración
            if (response.data.data && Array.isArray(response.data.data.data) && response.data.data.data.length > 0) {
                console.log('[getPazSalvos] - 📊 PRIMEROS REGISTROS:', 
                    JSON.stringify(response.data.data.data.slice(0, 2)).substring(0, 200) + '...');
            } else {
                console.log('[getPazSalvos] - ⚠️ No hay registros en la respuesta');
            }
            
            // Procesar la respuesta según su estructura
            return procesarRespuestaPaginada(response.data);
        } else {
            // Si no tiene la estructura esperada, devolver un error
            console.error('[getPazSalvos] - ❌ RESPUESTA SIN ESTRUCTURA ESPERADA:', response.data);
            return {
                success: false,
                detail: response.data?.detail || 'Formato de respuesta inesperado',
                data: []
            };
        }
    } catch (error) {
        // Manejo de errores
        console.error('[getPazSalvos] - 🚨 Error al obtener paz y salvos:', error);
        
        if (axios.isAxiosError(error)) {
            // Errores específicos de Axios
            const status = error.response?.status;
            const errorData = error.response?.data;
            
            console.error('[getPazSalvos] - 🚨 Error Axios:', {
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
            } else if (status === 404 || status === 400) {
                // Para errores 404 y 400, devolver exactamente el mensaje del API
                const detail = errorData?.detail !== undefined 
                    ? (typeof errorData.detail === 'string' 
                        ? errorData.detail 
                        : JSON.stringify(errorData.detail))
                    : (status === 404 
                        ? 'No se encontraron registros dentro del rango de fechas especificado.' 
                        : 'Error en la solicitud');
                
                console.log('[getPazSalvos] - ⚠️ Detail extraído del error:', detail);
                        
                return {
                    success: false,
                    detail,
                    data: []
                };
            } else {
                return {
                    success: false,
                    detail: `Error al obtener los paz y salvos: ${error.message}`,
                    data: []
                };
            }
        } else {
            // Otros tipos de errores
            return {
                success: false,
                detail: error instanceof Error ? error.message : 'Error desconocido al obtener los paz y salvos',
                data: []
            };
        }
    }
}; 