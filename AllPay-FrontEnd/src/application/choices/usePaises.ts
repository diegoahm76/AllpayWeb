import { useState, useCallback } from 'react';
import { getPaises } from '@/adapters/choices/paises.adapter';
import { 
    PaisesMapped,
    Pais,
    PaisSelectOption
} from '@/domain/models/choices/paises.model';

// Estado inicial para los datos de países
const INITIAL_DATA: PaisesMapped = {
    success: false,
    paises: [],
    detail: ''
};

/**
 * Hook personalizado para manejar la lista de países
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar países
 */
export const usePaises = (token: string) => {
    // Estados principales
    const [paisesData, setPaisesData] = useState<PaisesMapped>(INITIAL_DATA);
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

    // Función principal para obtener países
    const fetchPaises = useCallback(async () => {
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

            const response = await getPaises(token);

            setPaisesData(response);
            
            if (response.paises.length === 0) {
                showSuccessAlert('No se encontraron países disponibles.');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener los países';
            console.error('[usePaises] - Error:', err);
            
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
            
            // Limpiar datos en caso de error
            setPaisesData(INITIAL_DATA);
        } finally {
            setIsLoading(false);
        }
    }, [token, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para limpiar los datos
    const clearPaises = useCallback(() => {
        setPaisesData(INITIAL_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función para obtener opciones del select
    const getOpcionesSelect = useCallback((): PaisSelectOption[] => {
        if (!paisesData.paises || paisesData.paises.length === 0) {
            return [];
        }

        return paisesData.paises.map((pais: Pais) => ({
            key: pais.cod_pais,
            value: pais.cod_pais,
            title: pais.nombre
        }));
    }, [paisesData.paises]);

    // Función para buscar un país por código
    const getPaisByCode = useCallback((codPais: string): Pais | undefined => {
        return paisesData.paises.find(pais => pais.cod_pais === codPais);
    }, [paisesData.paises]);

    // Función para buscar países por nombre (búsqueda parcial)
    const searchPaisesByName = useCallback((searchTerm: string): Pais[] => {
        if (!searchTerm || searchTerm.length < 2) {
            return paisesData.paises;
        }

        return paisesData.paises.filter(pais => 
            pais.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [paisesData.paises]);

    return {
        // Estados
        paisesData,
        isLoading,
        error,
        
        // Estados de alertas
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        
        // Funciones
        fetchPaises,
        clearPaises,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage,
        getOpcionesSelect,
        getPaisByCode,
        searchPaisesByName
    };
};
