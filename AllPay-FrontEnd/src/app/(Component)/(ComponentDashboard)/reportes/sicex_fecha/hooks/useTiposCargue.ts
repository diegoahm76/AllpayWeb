import { useState, useCallback } from 'react';
import { getTiposCargue, getTiposCargueStructured } from '../adapters/tiposCargue.adapter';
import { 
    TiposCargueMapped,
    TiposCargueStructuredMapped,
    TipoCargueStructured
} from '../models/tiposCargue.model';

// Estado inicial para los datos de tipos de cargue
const INITIAL_DATA: TiposCargueMapped = {
    success: false,
    tiposCargue: []
};

// Estado inicial para los datos estructurados
const INITIAL_STRUCTURED_DATA: TiposCargueStructuredMapped = {
    success: false,
    tiposCargue: []
};

/**
 * Hook personalizado para manejar los tipos de cargue
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar los tipos de cargue
 */
export const useTiposCargue = (token: string) => {
    // Estados principales
    const [tiposCargueData, setTiposCargueData] = useState<TiposCargueMapped>(INITIAL_DATA);
    const [tiposCargueStructuredData, setTiposCargueStructuredData] = useState<TiposCargueStructuredMapped>(INITIAL_STRUCTURED_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para alertas
    const [showAlertNotification, setShowAlertNotification] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState('');

    // Función para limpiar alertas
    const clearAlerts = useCallback(() => {
        setShowAlertNotification(false);
        setShowErrorAlert(false);
        setAlertMessage('');
        setErrorAlertMessage('');
    }, []);

    // Función para mostrar alerta de éxito
    const showSuccessAlert = useCallback((message: string) => {
        clearAlerts();
        setAlertMessage(message);
        setShowAlertNotification(true);
    }, [clearAlerts]);

    // Función para mostrar alerta de error
    const showErrorAlertMessage = useCallback((message: string) => {
        clearAlerts();
        setErrorAlertMessage(message);
        setShowErrorAlert(true);
    }, [clearAlerts]);

    // Función principal para obtener los tipos de cargue
    const fetchTiposCargue = useCallback(async () => {
        if (!token) {
            const errorMsg = 'No hay token de autenticación disponible';
            setError(errorMsg);
            showErrorAlertMessage(errorMsg);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            clearAlerts();


            const response = await getTiposCargue(token);
            const responseStructured = await getTiposCargueStructured(token);

            setTiposCargueData(response);
            setTiposCargueStructuredData(responseStructured);
            
            if (response.tiposCargue.length === 0) {
                showSuccessAlert('No se encontraron tipos de cargue disponibles.');
            } else {
                showSuccessAlert(`Se encontraron ${response.tiposCargue.length} tipos de cargue.`);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener los tipos de cargue';
            console.error('[useTiposCargue] - Error:', err);
            
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
            
            // Limpiar datos en caso de error
            setTiposCargueData(INITIAL_DATA);
            setTiposCargueStructuredData(INITIAL_STRUCTURED_DATA);
        } finally {
            setIsLoading(false);
        }
    }, [token, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para limpiar los datos
    const clearTiposCargue = useCallback(() => {
        setTiposCargueData(INITIAL_DATA);
        setTiposCargueStructuredData(INITIAL_STRUCTURED_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función para obtener un tipo de cargue por código
    const getTipoCargueByCodigo = useCallback((codigo: string): TipoCargueStructured | undefined => {
        return tiposCargueStructuredData.tiposCargue.find(tipo => tipo.codigo === codigo);
    }, [tiposCargueStructuredData.tiposCargue]);

    // Función para obtener un tipo de cargue por descripción
    const getTipoCargueByDescripcion = useCallback((descripcion: string): TipoCargueStructured | undefined => {
        return tiposCargueStructuredData.tiposCargue.find(tipo => tipo.descripcion === descripcion);
    }, [tiposCargueStructuredData.tiposCargue]);

    // Función para verificar si existe un tipo de cargue
    const tipoCargueExists = useCallback((codigo: string): boolean => {
        return tiposCargueStructuredData.tiposCargue.some(tipo => tipo.codigo === codigo);
    }, [tiposCargueStructuredData.tiposCargue]);

    // Función para obtener las opciones para un select/dropdown
    const getOpcionesSelect = useCallback(() => {
        return tiposCargueStructuredData.tiposCargue.map(tipo => ({
            value: tipo.codigo,
            label: tipo.descripcion
        }));
    }, [tiposCargueStructuredData.tiposCargue]);

    return {
        // Estados
        tiposCargueData,
        tiposCargueStructuredData,
        isLoading,
        error,
        
        // Estados de alertas
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        
        // Funciones
        fetchTiposCargue,
        clearTiposCargue,
        getTipoCargueByCodigo,
        getTipoCargueByDescripcion,
        tipoCargueExists,
        getOpcionesSelect,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 