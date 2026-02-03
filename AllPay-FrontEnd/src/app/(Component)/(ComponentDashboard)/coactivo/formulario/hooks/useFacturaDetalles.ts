import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getFacturaDetalles } from '../adapters/facturaDetalles.adapter';
import { DetalleFactura } from '../models/facturaDetalles.model';

// Interface para el estado de alertas
export interface AlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
  showAlertSuccess: boolean;
}

// Hook personalizado para manejar los detalles de factura
export const useFacturaDetalles = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [facturaDetalles, setFacturaDetalles] = useState<DetalleFactura | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para alertas
  const [alertState, setAlertState] = useState<AlertState>({
    showAlertNotification: false,
    alertMessage: '',
    showErrorAlert: false,
    errorAlertMessage: '',
    showAlertSuccess: false
  });

  // Función para cargar detalles de factura
  const loadFacturaDetalles = useCallback(async (facturaId: string | number) => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Token de autenticación no disponible',
        showAlertSuccess: false
      });
      return null;
    }

    setIsLoading(true);

    try {
      const response = await getFacturaDetalles(token, facturaId);

      if (response.success && response.data.length > 0) {
        // Tomar el primer elemento de los detalles (puede haber múltiples registros)
        const detalles = response.data[0];
        setFacturaDetalles(detalles);

        setAlertState({
          showAlertNotification: false,
          alertMessage: '',
          showErrorAlert: false,
          errorAlertMessage: '',
          showAlertSuccess: false
        });

        return detalles;
      } else {
        throw new Error('No se encontraron detalles para esta factura');
      }
    } catch (error: any) {
      console.error('[useFacturaDetalles] - Error al cargar detalles:', error);
      
      setFacturaDetalles(null);
      
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error.message || 'Error al cargar los detalles de la factura',
        showAlertSuccess: false
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Función para formatear fecha
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD para inputs date
  }, []);

  // Función para extraer datos del formulario desde detalles de factura
  const extractFormDataFromDetalles = useCallback((detalles: DetalleFactura) => {
    const recaudador = detalles.recaudador_info;
    
    return {
      nroFacturaUnica: recaudador.nro_factura_unica.toString(),
      fechaCompra: formatDate(recaudador.fecha_compra),
      nombreRecaudador: recaudador.nombre_completo_o_comercial,
      correoRecaudador: recaudador.email,
      celularRecaudador: recaudador.telefono.replace(/\D/g, ''), // Solo números
      fechaRegistro: new Date().toISOString().split('T')[0], // Fecha actual
      accionRegistrar: '',
      descripcionAccion: '',
      documento: null,
      aplicarPlantilla: ''
    };
  }, [formatDate]);

  // Funciones para alertas
  const closeAlertNotification = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertNotification: false,
      alertMessage: ''
    }));
  }, []);

  const closeErrorAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showErrorAlert: false,
      errorAlertMessage: ''
    }));
  }, []);

  const closeAlertSuccess = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertSuccess: false,
      alertMessage: ''
    }));
  }, []);

  return {
    // Estados
    facturaDetalles,
    isLoading,
    alertState,

    // Funciones
    loadFacturaDetalles,
    extractFormDataFromDetalles,
    formatDate,

    // Funciones de alertas
    closeAlertNotification,
    closeErrorAlert,
    closeAlertSuccess
  };
}; 