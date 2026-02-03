import { useState, useCallback, useRef, useEffect } from 'react';
import { getPazSalvos } from '../adapters/getPazSalvos';
import { PazSalvo, PazSalvoSearchParams } from '../models/types';

// Eliminamos la importación de Swal ya que usaremos nuestras propias alertas
// import Swal from 'sweetalert2';

// Interfaz para el control de la petición actual
interface RequestControl {
    inProgress: boolean;
    lastRequestKey: string;
    timestamp: number;
}

export const usePazSalvos = () => {
    const [pazSalvos, setPazSalvos] = useState<PazSalvo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noRecordsMessage, setNoRecordsMessage] = useState<string | null>(null);
    const [fechasConsulta, setFechasConsulta] = useState<{inicio?: string, fin?: string} | null>(null);
    
    // Estados para manejar las alertas personalizadas
    const [showAlertNotification, setShowAlertNotification] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    
    // Estado para el componente de error
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState('');
    
    // Estado para mostrar error de validación de fechas
    const [fechaValidationError, setFechaValidationError] = useState<string | null>(null);
    
    // Estados para manejar la paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    
    // Estado para almacenar si el usuario es interno
    const [isInternalUser, setIsInternalUser] = useState(false);

    // Control mejorado de peticiones en progreso
    const requestControl = useRef<RequestControl>({
        inProgress: false,
        lastRequestKey: '',
        timestamp: 0
    });

    // Limpiar alertas cuando el componente se desmonta
    useEffect(() => {
        return () => {
            // Limpiar estados cuando el componente se desmonta
            setShowAlertNotification(false);
            setShowErrorAlert(false);
        };
    }, []);

    // Función para mostrar alerta cuando no hay registros
    const showNoRecordsAlert = useCallback((message: string) => {
        // Lista de mensajes que NUNCA deben mostrarse como alertas
        const mensajesIgnorados = [
            "SEÑOR(A) RECAUDOR(A)",
            "SEÑOR(A) RECAUDADOR(A)",
            "Buscando paz y salvos",
            "Actualización exitosa",
            "Paz y Salvo actualizado",
            "actualizado correctamente",
            "actualización exitosa"
        ];
        
        // Verificar si el mensaje contiene alguna de las frases ignoradas (sin distinguir mayúsculas/minúsculas)
        for (const fraseIgnorada of mensajesIgnorados) {
            if (message.toLowerCase().includes(fraseIgnorada.toLowerCase())) {
                console.log('[usePazSalvos] - Mensaje BLOQUEADO explícitamente:', message);
                return; // No hacer nada con este mensaje
            }
        }
        
        // Si llegamos aquí, el mensaje es seguro para mostrar
        console.log('[usePazSalvos] - Mostrando alerta:', message);
        setAlertMessage(message);
        setShowAlertNotification(true);
        
        // Ocultar la alerta después de 5 segundos
        setTimeout(() => {
            setShowAlertNotification(false);
        }, 5000);
    }, []);
    
    // Función para mostrar alerta de error
    const showError = useCallback((message: string) => {
        // Evitar mostrar alertas redundantes como "Buscando paz y salvos..."
        if (message.includes("Buscando paz y salvos")) {
            console.log('[usePazSalvos] - Omitiendo alerta de búsqueda:', message);
            return;
        }
        
        // Para errores de "No se encontraron registros", solo guardar el mensaje sin mostrar alerta
        if (message.includes("No se encontraron registros")) {
            console.log('[usePazSalvos] - Estableciendo mensaje de no registros sin alerta:', message);
            setNoRecordsMessage(message);
            return;
        }
        
        // Para otros errores, mostrar la alerta completa
        setErrorAlertMessage(message);
        setShowErrorAlert(true);
        
        // Ocultar la alerta después de 8 segundos
        setTimeout(() => {
            setShowErrorAlert(false);
        }, 8000);
    }, []);

    // Función para validar fechas localmente
    const validateDates = useCallback((fechaInicio?: string, fechaFin?: string): boolean => {
        if (!fechaInicio || !fechaFin) return true;
        
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        return inicio <= fin;
    }, []);
    
    // Función para formatear mensajes de error
    const formatErrorMessage = useCallback((detail: any): string => {
        if (Array.isArray(detail)) {
            return detail.join(' ');
        }
        
        if (typeof detail === 'string') {
            // Eliminar corchetes y comillas si están presentes
            return detail.replace(/[\[\]']/g, '');
        }
        
        return 'Error al procesar la solicitud';
    }, []);

    const fetchPazSalvos = useCallback(async (
        token: string, 
        params?: PazSalvoSearchParams, 
        page: number = 1, 
        isInternal: boolean = false
    ) => {
        // Crear una cadena única que represente la petición
        const requestKey = `${token}-${JSON.stringify(params)}-${page}-${isInternal}`;
        
        // Verificar si es la misma petición que ya está en progreso
        if (requestControl.current.inProgress) {
            console.log('[usePazSalvos] - 🚫 Ya hay una petición en progreso desde hace', 
                (Date.now() - requestControl.current.timestamp)/1000, 'segundos');
                
            // Si han pasado más de 10 segundos, consideramos que la petición anterior falló
            if (Date.now() - requestControl.current.timestamp > 10000) {
                console.log('[usePazSalvos] - ⏱️ La petición anterior ha estado en progreso por mucho tiempo, posible fallo');
                // Reiniciar el control de peticiones
                requestControl.current = {
                    inProgress: false,
                    lastRequestKey: '',
                    timestamp: 0
                };
            } else {
                console.log('[usePazSalvos] - ⏱️ Esperando a que termine la petición en curso');
                return;
            }
        }
        
        // Verificar si es una petición duplicada reciente (menos de 500ms)
        if (requestKey === requestControl.current.lastRequestKey && 
            Date.now() - requestControl.current.timestamp < 500) {
            console.log('[usePazSalvos] - 🔄 Petición idéntica muy reciente, ignorando duplicado');
            return;
        }
        
        try {
            console.log('[usePazSalvos] - 🔍 Iniciando búsqueda de paz y salvos:');
            console.log('  - Parámetros:', params);
            console.log('  - Página:', page);
            console.log('  - Usuario interno:', isInternal);
            
            // Actualizar el control de peticiones
            requestControl.current = {
                inProgress: true,
                lastRequestKey: requestKey,
                timestamp: Date.now()
            };
            
            // Actualizar el estado de usuario interno
            setIsInternalUser(isInternal);
            
            // Limpiar estados previos
            setNoRecordsMessage(null);
            setError(null);
            setFechaValidationError(null);
            
            // Actualizar la página actual
            setCurrentPage(page);
            
            // Validación local de fechas antes de hacer la petición
            if (params?.fecha_inicio && params?.fecha_fin) {
                if (!validateDates(params.fecha_inicio, params.fecha_fin)) {
                    const errorMsg = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
                    console.error('[usePazSalvos] - ❌ Error de validación local:', errorMsg);
                    
                    // Mostrar alerta de error
                    showError(errorMsg);
                    
                    // Guardar el error de validación de fechas específicamente
                    setFechaValidationError(errorMsg);
                    
                    // Actualizar estados
                    setPazSalvos([]);
                    setTotalPages(1);
                    setTotalCount(0);
                    
                    // Finalizar el estado de petición en progreso
                    requestControl.current.inProgress = false;
                    return;
                }
            }
            
            // Guardar fechas de consulta para referencia
            setFechasConsulta({
                inicio: params?.fecha_inicio,
                fin: params?.fecha_fin
            });
            
            // Iniciar la carga
            setIsLoading(true);
            
            // Añadir el parámetro page a la consulta
            const searchParams = {
                ...params,
                page
            };
            
            console.log('[usePazSalvos] - 📡 Realizando petición a la API...');
            
            // Obtener los datos desde el adaptador, pasando el flag isInternal
            const response = await getPazSalvos(token, searchParams, page, isInternal);
            
            console.log('[usePazSalvos] - 📥 Respuesta recibida:', { 
                success: response.success,
                totalRegistros: response.data?.length,
                totalPaginas: response.total_pages,
                paginaActual: response.current_page
            });
            
            // Verificar si la respuesta fue exitosa
            if (!response.success) {
                // Mostrar siempre el mensaje exacto del detail sin importar el tipo de error
                const errorMessage = formatErrorMessage(response.detail || 'Error al obtener paz y salvos');
                console.error('[usePazSalvos] - ❌ Error en la respuesta:', errorMessage);
                setError(errorMessage);
                
                // Si el error incluye "No se encontraron registros dentro del rango de fechas"
                if (errorMessage.includes('No se encontraron registros dentro del rango de fechas')) {
                    console.log('[usePazSalvos] - ℹ️ No se encontraron registros en el rango de fechas');
                    // Mostrar alerta informativa
                    setAlertMessage("No se encontraron registros dentro del rango de fechas especificado.");
                    setShowAlertNotification(true);
                    
                    // Ocultar la alerta después de 5 segundos
                    setTimeout(() => {
                        setShowAlertNotification(false);
                    }, 5000);
                } 
                // Si el error incluye "No se encontraron registros" pero no es específico de fechas
                else if (errorMessage.includes('No se encontraron registros')) {
                    console.log('[usePazSalvos] - ℹ️ No se encontraron registros');
                    // No mostrar alerta emergente para este caso
                } else {
                    // Para otros errores, mostrar alerta de error
                    showError(errorMessage);
                }
                
                // Establecer el arreglo de paz y salvos vacío
                setPazSalvos([]);
                setTotalPages(1);
                setTotalCount(0);
                
                return;
            }
            
            // Si la respuesta es exitosa pero no hay datos
            if (response.data.length === 0) {
                const mensaje = "No se encontraron registros que coincidan con los criterios de búsqueda.";
                console.log('[usePazSalvos] - ℹ️ No se encontraron registros');
                
                // Mostrar alerta informativa
                setAlertMessage(mensaje);
                setShowAlertNotification(true);
                
                // Ocultar la alerta después de 5 segundos
                setTimeout(() => {
                    setShowAlertNotification(false);
                }, 5000);
                
                // No mostrar alerta, solo establecer el mensaje para la tabla vacía
                setPazSalvos([]);
                setTotalPages(1);
                setTotalCount(0);
                
                return;
            }
            
            // Actualizar información de paginación
            if (response.total_pages !== undefined) {
                setTotalPages(response.total_pages);
            }
            
            if (response.count !== undefined) {
                setTotalCount(response.count);
            }
            
            // Si hay datos, actualizarlos
            console.log(`[usePazSalvos] - ✅ Paz y salvos encontrados: ${response.data.length}`);
            console.log(`  - Total: ${response.count}`);
            console.log(`  - Páginas: ${response.total_pages}`);
            console.log(`  - Página actual: ${response.current_page}`);
            
            setPazSalvos(response.data);
        } catch (error) {
            // Manejo de errores genéricos
            const errorMessage = error instanceof Error ? error.message : 'Error al obtener paz y salvos';
            console.error('[usePazSalvos] - ❌ Error general:', errorMessage);
            
            setError(errorMessage);
            setPazSalvos([]);
            setTotalPages(1);
            setTotalCount(0);
            
            // Mostrar alerta de error
            showError(errorMessage);
        } finally {
            // Finalizar la carga independientemente del resultado
            setIsLoading(false);
            // Marcar que ya no hay petición en progreso
            requestControl.current.inProgress = false;
        }
    }, [validateDates, formatErrorMessage, showError, showNoRecordsAlert]);

    // Función para cambiar de página
    const changePage = useCallback((newPage: number, token: string, isInternal: boolean = false) => {
        if (newPage < 1 || newPage > totalPages) {
            console.log(`[usePazSalvos] - 🚫 Página ${newPage} fuera de rango (1-${totalPages})`);
            return;
        }
        
        console.log(`[usePazSalvos] - 📄 Cambiando a página ${newPage}, usuario interno: ${isInternal}`);
        fetchPazSalvos(token, {
            fecha_inicio: fechasConsulta?.inicio || '',
            fecha_fin: fechasConsulta?.fin || ''
        }, newPage, isInternal);
    }, [fechasConsulta, totalPages, fetchPazSalvos]);

    // Función para limpiar los resultados
    const clearPazSalvos = useCallback(() => {
        console.log('[usePazSalvos] - 🧹 Limpiando datos de paz y salvos');
        setPazSalvos([]);
        setError(null);
        setNoRecordsMessage(null);
        setFechasConsulta(null);
        setShowAlertNotification(false);
        setShowErrorAlert(false);
        setFechaValidationError(null);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(0);
    }, []);

    return {
        pazSalvos,
        isLoading,
        error,
        noRecordsMessage,
        fechasConsulta,
        fetchPazSalvos,
        clearPazSalvos,
        showAlertNotification,
        setShowAlertNotification,
        alertMessage,
        setAlertMessage,
        showErrorAlert,
        setShowErrorAlert,
        errorAlertMessage,
        fechaValidationError,
        // Datos de paginación
        currentPage,
        totalPages,
        totalCount,
        changePage,
        isInternalUser
    };
};