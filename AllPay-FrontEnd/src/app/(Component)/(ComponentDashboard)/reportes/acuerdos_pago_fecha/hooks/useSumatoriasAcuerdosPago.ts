import { useState, useCallback } from 'react';
import { getSumatoriasAcuerdosPago } from '../adapters/sumatoriasAcuerdosPago.adapter';
import { 
    SumatoriasAcuerdosPagoMapped, 
    SumatoriasAcuerdosPagoParams 
} from '../models/sumatoriasAcuerdosPago.model';

/**
 * Hook personalizado para manejar las sumatorias del reporte consolidado de acuerdos de pago
 * @param token Token de autenticación JWT
 * @returns Objeto con estado y funciones para obtener sumatorias
 */
export const useSumatoriasAcuerdosPago = (token: string) => {
    // Estados para las sumatorias
    const [sumatoriasData, setSumatoriasData] = useState<SumatoriasAcuerdosPagoMapped>({
        success: false,
        sumatorias: {
            total_cuotas_fomento: 0,
            total_intereses: 0
        },
        detail: ''
    });

    // Estados de carga y error
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para alertas
    const [showAlertNotification, setShowAlertNotification] = useState<boolean>(false);
    const [alertMessage, setAlertMessage] = useState<string>('');
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState<string>('');

    /**
     * Obtiene las sumatorias del reporte consolidado de acuerdos de pago
     * @param params Parámetros opcionales de filtro
     */
    const fetchSumatorias = useCallback(async (params?: SumatoriasAcuerdosPagoParams) => {
        if (!token) {
            console.error('[useSumatoriasAcuerdosPago] - No hay token disponible');
            setError('No hay token de autenticación disponible');
            return;
        }

        setIsLoading(true);
        setError(null);
        clearAlerts();

        try {

            const response = await getSumatoriasAcuerdosPago(token, params);


            setSumatoriasData(response);
            showSuccessAlert(response.detail || 'Sumatorias obtenidas exitosamente');

        } catch (error) {
            
            const errorMessage = error instanceof Error ? error.message : 'Error inesperado al obtener las sumatorias';
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    /**
     * Limpia los datos de las sumatorias
     */
    const clearSumatorias = useCallback(() => {
        setSumatoriasData({
            success: false,
            sumatorias: {
                total_cuotas_fomento: 0,
                total_intereses: 0
            },
            detail: ''
        });
        setError(null);
        clearAlerts();
    }, []);

    /**
     * Muestra una alerta de éxito
     */
    const showSuccessAlert = useCallback((message: string) => {
        setAlertMessage(message);
        setShowAlertNotification(true);
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            setShowAlertNotification(false);
        }, 5000);
    }, []);

    /**
     * Muestra una alerta de error
     */
    const showErrorAlertMessage = useCallback((message: string) => {
        setErrorAlertMessage(message);
        setShowErrorAlert(true);
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            setShowErrorAlert(false);
        }, 5000);
    }, []);

    /**
     * Limpia todas las alertas
     */
    const clearAlerts = useCallback(() => {
        setShowAlertNotification(false);
        setShowErrorAlert(false);
        setAlertMessage('');
        setErrorAlertMessage('');
    }, []);

    return {
        // Estados
        sumatoriasData,
        isLoading,
        error,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,

        // Funciones
        fetchSumatorias,
        clearSumatorias,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 