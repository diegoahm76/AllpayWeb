import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { actualizarAccionCoactivo } from '../adapters/actualizarAccionCoactivo.adapter';
import {
  ActualizarAccionCoactivoPayload,
  ActualizarAccionCoactivoResponse,
  ActualizacionAlertState,
  FormDataActualizarAccion
} from '../models/actualizarAccionCoactivo.model';

// Hook personalizado para manejar la actualización de acciones de cobro coactivo
export const useActualizarAccionCoactivo = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState<FormDataActualizarAccion>({
    descripcion: '',
    id_accion_cobro_persuasivo: 0,
    aplicar_plantilla: true,
    nombre_recaudador: '',
    email_recaudador: '',
    celular_recaudador: '',
    fecha_registro: ''
  });

  // Estados para alertas
  const [alertState, setAlertState] = useState<ActualizacionAlertState>({
    showAlertNotification: false,
    alertMessage: '',
    showErrorAlert: false,
    errorAlertMessage: '',
    showAlertSuccess: false
  });

  // Función para manejar cambios en el formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  }, []);

  // Función para establecer datos del formulario
  const setFormDataValues = useCallback((data: Partial<FormDataActualizarAccion>) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  }, []);

  // Función para limpiar el formulario
  const handleClearForm = useCallback(() => {
    setFormData({
      descripcion: '',
      id_accion_cobro_persuasivo: 0,
      aplicar_plantilla: true,
      nombre_recaudador: '',
      email_recaudador: '',
      celular_recaudador: '',
      fecha_registro: ''
    });
  }, []);

  // Función para validar el formulario
  const validateForm = useCallback((): string | null => {
    if (!formData.descripcion.trim()) {
      return 'La descripción es obligatoria';
    }
    
    if (formData.descripcion.trim().length < 5) {
      return 'La descripción debe tener al menos 5 caracteres';
    }

    if (formData.id_accion_cobro_persuasivo <= 0) {
      return 'Debe seleccionar una acción de cobro válida';
    }

    if (!formData.nombre_recaudador.trim()) {
      return 'El nombre del recaudador es obligatorio';
    }

    if (!formData.email_recaudador.trim()) {
      return 'El email del recaudador es obligatorio';
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_recaudador)) {
      return 'El formato del email no es válido';
    }

    if (!formData.fecha_registro) {
      return 'La fecha de registro es obligatoria';
    }

    return null;
  }, [formData]);

  // Función principal para actualizar la acción de cobro coactivo
  const handleActualizarAccion = useCallback(async (cobroCoactivoId: number): Promise<ActualizarAccionCoactivoResponse | null> => {
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

    // Validar formulario
    const validationError = validateForm();
    if (validationError) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: validationError,
        showAlertSuccess: false
      });
      return null;
    }

    if (!cobroCoactivoId || cobroCoactivoId <= 0) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'ID de cobro coactivo no válido.',
        showAlertSuccess: false
      });
      return null;
    }

    setIsLoading(true);

    try {
      const payload: ActualizarAccionCoactivoPayload = {
        descripcion: formData.descripcion.trim(),
        id_accion_cobro_persuasivo: formData.id_accion_cobro_persuasivo,
        aplicar_plantilla: formData.aplicar_plantilla,
        nombre_recaudador: formData.nombre_recaudador.trim(),
        email_recaudador: formData.email_recaudador.trim(),
        celular_recaudador: formData.celular_recaudador.trim(),
        fecha_registro: formData.fecha_registro
      };

      const response = await actualizarAccionCoactivo(token, cobroCoactivoId, payload);

      if (response.success) {
        setAlertState({
          showAlertNotification: false,
          alertMessage: response.message || 'Acción de cobro coactivo actualizada exitosamente.',
          showErrorAlert: false,
          errorAlertMessage: '',
          showAlertSuccess: true
        });

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
      console.error('[useActualizarAccionCoactivo] - Error en actualización:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar la acción de cobro coactivo. Intente nuevamente.';
      
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
  }, [token, formData, validateForm]);

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
  const formatSuccessMessage = useCallback((response: ActualizarAccionCoactivoResponse): string => {
    if (response.success && response.data) {
      return `${response.message} - Código: ${response.data.cod_accion_registrada}`;
    }
    return 'Actualización realizada exitosamente.';
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

  // Función para formatear fecha para input datetime-local
  const formatDateForInput = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  }, []);

  return {
    // Estados
    isLoading,
    formData,
    alertState,

    // Funciones del formulario
    handleInputChange,
    setFormDataValues,
    handleClearForm,
    validateForm,

    // Función principal
    handleActualizarAccion,

    // Funciones de utilidad
    formatSuccessMessage,
    formatCurrency,
    formatDate,
    formatDateForInput,

    // Funciones para cerrar alertas
    closeAlertNotification,
    closeErrorAlert,
    closeAlertSuccess
  };
};
