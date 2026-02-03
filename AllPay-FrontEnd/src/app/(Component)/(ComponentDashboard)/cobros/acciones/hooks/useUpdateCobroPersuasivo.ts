import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { updateCobroPersuasivo } from '../adapters/updateCobroPersuasivo.adapter';
import {
  UpdateCobroPersuasivoPayload,
  UpdateCobroPersuasivoResponse,
  CobroPersuasivoUpdatedData
} from '../models/updateCobroPersuasivo.model';

// Interface para el estado de alertas
export interface UpdateAlertState {
  showSuccessAlert: boolean;
  successMessage: string;
  showErrorAlert: boolean;
  errorMessage: string;
}

// Interface para el estado del hook
export interface UseUpdateCobroPersuasivoState {
  isUpdating: boolean;
  updateSuccess: boolean;
  updatedData: CobroPersuasivoUpdatedData | null;
  alertState: UpdateAlertState;
}

// Hook personalizado para manejar la actualización de cobros persuasivos
export const useUpdateCobroPersuasivo = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [state, setState] = useState<UseUpdateCobroPersuasivoState>({
    isUpdating: false,
    updateSuccess: false,
    updatedData: null,
    alertState: {
      showSuccessAlert: false,
      successMessage: '',
      showErrorAlert: false,
      errorMessage: ''
    }
  });

  // Función principal para actualizar cobro persuasivo
  const handleUpdateCobroPersuasivo = useCallback(async (
    id: number,
    payload: UpdateCobroPersuasivoPayload
  ): Promise<UpdateCobroPersuasivoResponse | null> => {
    // Validar token de autenticación
    if (!token) {
      setState(prev => ({
        ...prev,
        alertState: {
          showSuccessAlert: false,
          successMessage: '',
          showErrorAlert: true,
          errorMessage: 'Token de autenticación no disponible. Por favor, inicie sesión nuevamente'
        }
      }));
      return null;
    }

    // Validar ID
    if (!id || id <= 0) {
      setState(prev => ({
        ...prev,
        alertState: {
          showSuccessAlert: false,
          successMessage: '',
          showErrorAlert: true,
          errorMessage: 'ID de cobro persuasivo inválido'
        }
      }));
      return null;
    }

    // Iniciar proceso de actualización
    setState(prev => ({
      ...prev,
      isUpdating: true,
      updateSuccess: false,
      updatedData: null,
      alertState: {
        showSuccessAlert: false,
        successMessage: '',
        showErrorAlert: false,
        errorMessage: ''
      }
    }));

    try {
      // Llamar al adapter para actualizar
      const response = await updateCobroPersuasivo(token, { id, payload });

      if (response.success) {
        // Actualización exitosa
        setState(prev => ({
          ...prev,
          isUpdating: false,
          updateSuccess: true,
          updatedData: response.data,
          alertState: {
            showSuccessAlert: true,
            successMessage: response.message || 'Cobro persuasivo actualizado exitosamente',
            showErrorAlert: false,
            errorMessage: ''
          }
        }));

        return response;
      } else {
        throw new Error(response.message || 'Error al actualizar el cobro persuasivo');
      }
    } catch (error: any) {
      console.error('[useUpdateCobroPersuasivo] - Error al actualizar:', error);
      
      // Manejar error
      setState(prev => ({
        ...prev,
        isUpdating: false,
        updateSuccess: false,
        updatedData: null,
        alertState: {
          showSuccessAlert: false,
          successMessage: '',
          showErrorAlert: true,
          errorMessage: error.message || 'Error inesperado al actualizar el cobro persuasivo'
        }
      }));

      return null;
    }
  }, [token]);

  // Función para limpiar el estado después de una actualización exitosa
  const resetUpdateState = useCallback(() => {
    setState(prev => ({
      ...prev,
      updateSuccess: false,
      updatedData: null,
      alertState: {
        showSuccessAlert: false,
        successMessage: '',
        showErrorAlert: false,
        errorMessage: ''
      }
    }));
  }, []);

  // Función para cerrar alerta de éxito
  const closeSuccessAlert = useCallback(() => {
    setState(prev => ({
      ...prev,
      alertState: {
        ...prev.alertState,
        showSuccessAlert: false,
        successMessage: ''
      }
    }));
  }, []);

  // Función para cerrar alerta de error
  const closeErrorAlert = useCallback(() => {
    setState(prev => ({
      ...prev,
      alertState: {
        ...prev.alertState,
        showErrorAlert: false,
        errorMessage: ''
      }
    }));
  }, []);

  // Función para validar payload antes de enviar
  const validatePayload = useCallback((payload: UpdateCobroPersuasivoPayload): string[] => {
    const errors: string[] = [];

    // Validar descripción
    if (!payload.descripcion || payload.descripcion.trim().length === 0) {
      errors.push('La descripción es requerida');
    } else if (payload.descripcion.trim().length < 10) {
      errors.push('La descripción debe tener al menos 10 caracteres');
    } else if (payload.descripcion.trim().length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
    }

    // Validar fecha de registro
    if (!payload.fecha_registro) {
      errors.push('La fecha de registro es requerida');
    } else {
      const fechaRegistro = new Date(payload.fecha_registro);
      if (isNaN(fechaRegistro.getTime())) {
        errors.push('Formato de fecha de registro inválido');
      }
    }

    // Validar ID de acción
    if (!payload.id_accion_cobro_persuasivo || payload.id_accion_cobro_persuasivo <= 0) {
      errors.push('ID de acción de cobro persuasivo inválido');
    }

    // Validar nombre del recaudador
    if (!payload.nombre_recaudador || payload.nombre_recaudador.trim().length === 0) {
      errors.push('El nombre del recaudador es requerido');
    } else if (payload.nombre_recaudador.trim().length < 2) {
      errors.push('El nombre del recaudador debe tener al menos 2 caracteres');
    }

    // Validar email del recaudador
    if (!payload.email_recaudador || payload.email_recaudador.trim().length === 0) {
      errors.push('El email del recaudador es requerido');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email_recaudador)) {
        errors.push('Formato de email inválido');
      }
    }

    // Validar celular del recaudador
    if (!payload.celular_recaudador || payload.celular_recaudador.trim().length === 0) {
      errors.push('El celular del recaudador es requerido');
    } else {
      const celularLimpio = payload.celular_recaudador.replace(/\s/g, '');
      const celularRegex = /^[0-9]{10}$/;
      if (!celularRegex.test(celularLimpio)) {
        errors.push('El celular debe tener exactamente 10 dígitos');
      }
    }

    // Validar aplicar_plantilla (debe ser booleano)
    if (typeof payload.aplicar_plantilla !== 'boolean') {
      errors.push('El campo aplicar plantilla debe ser verdadero o falso');
    }

    return errors;
  }, []);

  // Función helper para formatear fecha para el payload
  const formatDateForPayload = useCallback((date: Date | string): string => {
    let targetDate: Date;
    
    if (typeof date === 'string') {
      // Si es un string (formato YYYY-MM-DD del input date), parsearlo correctamente
      const [year, month, day] = date.split('-').map(Number);
      // Crear la fecha en la zona horaria local para evitar conversiones UTC
      targetDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    } else {
      // Si es un objeto Date, crear una nueva instancia para evitar modificar la original
      targetDate = new Date(date);
      // Establecer la hora a mediodía (12:00 PM) para evitar conflictos de zona horaria
      targetDate.setHours(12, 0, 0, 0);
    }
    
    return targetDate.toISOString();
  }, []);

  // Función helper para limpiar número de celular
  const cleanPhoneNumber = useCallback((phone: string): string => {
    return phone.replace(/\D/g, '');
  }, []);

  return {
    // Estados
    isUpdating: state.isUpdating,
    updateSuccess: state.updateSuccess,
    updatedData: state.updatedData,
    alertState: state.alertState,

    // Funciones principales
    handleUpdateCobroPersuasivo,
    resetUpdateState,

    // Funciones de alertas
    closeSuccessAlert,
    closeErrorAlert,

    // Funciones de validación y helpers
    validatePayload,
    formatDateForPayload,
    cleanPhoneNumber
  };
};
