import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { convertirMultiplePersuasivoCoactivo } from '../adapters/conversionMultiple.adapter';
import {
  ConversionMultiplePayload,
  ConversionMultipleResponse,
  ConversionAlertState
} from '../models/conversionMultiple.model';

// Hook personalizado para manejar la conversión múltiple persuasivo-coactivo
export const useConversionMultiple = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFacturas, setSelectedFacturas] = useState<number[]>([]);

  // Estados para alertas
  const [alertState, setAlertState] = useState<ConversionAlertState>({
    showAlertNotification: false,
    alertMessage: '',
    showErrorAlert: false,
    errorAlertMessage: '',
    showAlertSuccess: false
  });

  // Función para manejar la selección de facturas
  const handleFacturaSelect = useCallback((facturaId: number) => {
    setSelectedFacturas(prev => {
      const newSelection = [...prev];
      const index = newSelection.indexOf(facturaId);
      
      if (index > -1) {
        // Si ya está seleccionada, la removemos
        newSelection.splice(index, 1);
      } else {
        // Si no está seleccionada, la agregamos
        newSelection.push(facturaId);
      }
      
      return newSelection;
    });
  }, []);

  // Función para seleccionar múltiples facturas
  const handleMultipleFacturasSelect = useCallback((facturasIds: number[]) => {
    setSelectedFacturas(facturasIds);
  }, []);

  // Función para limpiar selección
  const handleClearSelection = useCallback(() => {
    setSelectedFacturas([]);
  }, []);

  // Función para verificar si una factura está seleccionada
  const isFacturaSelected = useCallback((facturaId: number): boolean => {
    return selectedFacturas.includes(facturaId);
  }, [selectedFacturas]);

  // Función para obtener el número de facturas seleccionadas
  const getSelectedCount = useCallback((): number => {
    return selectedFacturas.length;
  }, [selectedFacturas]);

  // Función principal para convertir facturas
  const handleConvertirFacturas = useCallback(async (facturasIds?: number[]): Promise<ConversionMultipleResponse | null> => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'No se ha encontrado el token de autenticación. Por favor, inicie sesión nuevamente.',
        showAlertSuccess: false
      });
      return null;
    }

    // Usar las facturas pasadas como parámetro o las seleccionadas
    const facturasToConvert = facturasIds || selectedFacturas;

    if (facturasToConvert.length === 0) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Debe seleccionar al menos una factura para convertir.',
        showAlertSuccess: false
      });
      return null;
    }

    setIsLoading(true);

    try {
      const payload: ConversionMultiplePayload = {
        facturas: facturasToConvert
      };

      const response = await convertirMultiplePersuasivoCoactivo(token, payload);

      if (response.success) {
        setAlertState({
          showAlertNotification: false,
          alertMessage: response.message || 'Conversión realizada exitosamente.',
          showErrorAlert: false,
          errorAlertMessage: '',
          showAlertSuccess: true
        });

        // Limpiar selección después de conversión exitosa solo si no se pasaron facturas específicas
        if (!facturasIds) {
          setSelectedFacturas([]);
        }

        return response;
      } else {
        setAlertState({
          showAlertNotification: false,
          alertMessage: '',
          showErrorAlert: true,
          errorAlertMessage: response.message,
          showAlertSuccess: false
        });
        return response;
      }

    } catch (error) {
      console.error('[useConversionMultiple] - Error en conversión:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al convertir las facturas. Intente nuevamente.';
      
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: errorMessage,
        showAlertSuccess: false
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedFacturas]);

  // Funciones para cerrar alertas
  const closeAlertNotification = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertNotification: false
    }));
  }, []);

  const closeErrorAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showErrorAlert: false
    }));
  }, []);

  const closeAlertSuccess = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertSuccess: false
    }));
  }, []);

  // Función para formatear mensajes de éxito
  const formatSuccessMessage = useCallback((response: ConversionMultipleResponse): string => {
    if (response.success && response.data) {
      return `Conversión exitosa: ${response.message}. Código de acción: ${response.data.cod_accion_registrada}`;
    }
    return 'Conversión realizada exitosamente.';
  }, []);

  // Función para formatear valores monetarios
  const formatCurrency = useCallback((value: number | string): string => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return '$0';
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(numericValue);
  }, []);

  // Función para formatear fechas
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return {
    // Estados
    isLoading,
    selectedFacturas,
    alertState,

    // Funciones de selección
    handleFacturaSelect,
    handleMultipleFacturasSelect,
    handleClearSelection,
    isFacturaSelected,
    getSelectedCount,

    // Función principal
    handleConvertirFacturas,

    // Funciones de utilidad
    formatSuccessMessage,
    formatCurrency,
    formatDate,

    // Funciones para cerrar alertas
    closeAlertNotification,
    closeErrorAlert,
    closeAlertSuccess
  };
};
