/**
 * ModalEditarCobro.tsx
 * 
 * Modal para editar cobros persuasivos usando ModalContainer de @ui
 * Permite editar: descripción, acción y fecha de registro
 */
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
// Importar hooks y adapters
import { useAccionesCobroSimple } from '../../formulario/hooks/useAccionesCobroSimple';
import { useUpdateCobroPersuasivo } from '../hooks/useUpdateCobroPersuasivo';
import { UpdateCobroPersuasivoPayload } from '../models/updateCobroPersuasivo.model';
import { CobroPersuasivoTabla } from '../models/cobroPersuasivoDetail.model';

interface ModalEditarCobroProps {
  isOpen: boolean;
  onClose: () => void;
  cobroData: CobroPersuasivoTabla | null;
  onSuccess: () => void; // Callback para refrescar la tabla
}

interface FormDataEditar {
  descripcion: string;
  accionRegistrar: string;
  fechaRegistro: string;
}

interface FormErrors {
  descripcion: boolean;
  accionRegistrar: boolean;
  fechaRegistro: boolean;
}

const ModalEditarCobro: React.FC<ModalEditarCobroProps> = ({
  isOpen,
  onClose,
  cobroData,
  onSuccess
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  // Estados del formulario
  const [formData, setFormData] = useState<FormDataEditar>({
    descripcion: '',
    accionRegistrar: '',
    fechaRegistro: ''
  });

  // Estados de errores
  const [errors, setErrors] = useState<FormErrors>({
    descripcion: false,
    accionRegistrar: false,
    fechaRegistro: false
  });

  // Estados para alertas
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Ref para controlar si ya se llamó onSuccess
  const hasCalledOnSuccessRef = useRef(false);

  // Hook para manejar acciones de cobro simple
  const {
    isLoading: isLoadingAcciones,
    getAccionOptions
  } = useAccionesCobroSimple();

  // Hook para manejar la actualización de cobros persuasivos
  const {
    isUpdating,
    updateSuccess,
    updatedData,
    alertState,
    handleUpdateCobroPersuasivo,
    resetUpdateState,
    closeSuccessAlert,
    closeErrorAlert,
    validatePayload,
    formatDateForPayload,
    cleanPhoneNumber
  } = useUpdateCobroPersuasivo();

  // Función para limpiar y cerrar modal
  const handleCloseModal = useCallback(() => {
    setFormData({
      descripcion: '',
      accionRegistrar: '',
      fechaRegistro: ''
    });
    setErrors({
      descripcion: false,
      accionRegistrar: false,
      fechaRegistro: false
    });
    setShowErrorAlert(false);
    setShowSuccessAlert(false);
    setAlertMessage('');
    hasCalledOnSuccessRef.current = false;
    
    // Resetear estado del hook
    resetUpdateState();
    
    onClose();
  }, [onClose, resetUpdateState]);

  // Efecto para pre-llenar el formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && cobroData) {
      // Resetear el ref cuando se abre el modal
      hasCalledOnSuccessRef.current = false;
      
      // Buscar el ID de la acción por su nombre
      const opciones = getAccionOptions();
      const accionEncontrada = opciones.find(opt => opt.title === cobroData.accionRegistrar);
      const accionId = accionEncontrada ? accionEncontrada.value : '';

      setFormData({
        descripcion: cobroData.descripcion || '',
        accionRegistrar: accionId,
        fechaRegistro: cobroData.fechaRegistro ? new Date(cobroData.fechaRegistro).toISOString().split('T')[0] : ''
      });

      // Limpiar errores
      setErrors({
        descripcion: false,
        accionRegistrar: false,
        fechaRegistro: false
      });
    }
  }, [isOpen, cobroData, getAccionOptions]);

  // Efecto para manejar el éxito de la actualización
  useEffect(() => {
    if (updateSuccess && updatedData && !hasCalledOnSuccessRef.current) {
      // Marcar que ya se llamó onSuccess para evitar múltiples llamadas
      hasCalledOnSuccessRef.current = true;
      
      // Llamar al callback de éxito para refrescar la tabla una sola vez
      onSuccess();
      
      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        handleCloseModal();
        resetUpdateState();
      }, 2000);
    }
  }, [updateSuccess, updatedData]);

  // Funciones de manejo del formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpiar error del campo si había
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  }, [errors]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpiar error del campo si había
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  }, [errors]);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpiar error del campo si había
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  }, [errors]);

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      descripcion: !formData.descripcion.trim(),
      accionRegistrar: !formData.accionRegistrar,
      fechaRegistro: !formData.fechaRegistro
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  // Función para confirmar edición
  const handleConfirmEdit = useCallback(() => {
    if (!validateForm()) {
      setAlertMessage('Por favor, complete todos los campos obligatorios.');
      setShowErrorAlert(true);
      return;
    }

    setShowConfirmation(true);
  }, [validateForm]);

  // Función para editar cobro
  const handleEditCobro = useCallback(async () => {
    setShowConfirmation(false);

    try {
      if (!cobroData) {
        setAlertMessage('Datos del cobro no disponibles');
        setShowErrorAlert(true);
        return;
      }

      // Validar ID de acción
      const idAccionNumerico = parseInt(formData.accionRegistrar, 10);
      if (isNaN(idAccionNumerico) || idAccionNumerico <= 0) {
        setAlertMessage('ID de acción inválido. Por favor, seleccione una acción válida.');
        setShowErrorAlert(true);
        return;
      }

      // Preparar payload para el hook
      const payload: UpdateCobroPersuasivoPayload = {
        descripcion: formData.descripcion.trim(),
        fecha_registro: formatDateForPayload(formData.fechaRegistro),
        id_accion_cobro_persuasivo: idAccionNumerico,
        nombre_recaudador: cobroData.nombreRecaudador,
        email_recaudador: cobroData.emailRecaudador,
        celular_recaudador: cleanPhoneNumber(cobroData.celularRecaudador),
        aplicar_plantilla: true // Por defecto true, puedes ajustar según necesidad
      };

      // Validar payload antes de enviar
      const validationErrors = validatePayload(payload);
      if (validationErrors.length > 0) {
        setAlertMessage(`Errores de validación: ${validationErrors.join(', ')}`);
        setShowErrorAlert(true);
        return;
      }

      // Llamar al hook para actualizar
      const response = await handleUpdateCobroPersuasivo(cobroData.idCobroPersuasivo, payload);
      
      if (!response) {
        // El hook ya maneja los errores internamente
        return;
      }

      // El éxito se maneja en el useEffect que escucha updateSuccess

    } catch (error: any) {
      console.error('[ModalEditarCobro] - Error:', error);
      setAlertMessage(error.message || 'Error inesperado al actualizar el cobro persuasivo');
      setShowErrorAlert(true);
    }
  }, [
    formData, 
    cobroData, 
    handleUpdateCobroPersuasivo, 
    validatePayload, 
    formatDateForPayload, 
    cleanPhoneNumber
  ]);

  // Función para formatear fecha para mostrar
  const formatDateForDisplay = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  if (!isOpen || !mounted) return null;

  return (
    <>
      {/* Componentes de alertas */}
      <AlertError 
        isOpen={showErrorAlert || alertState.showErrorAlert} 
        onClose={() => {
          setShowErrorAlert(false);
          closeErrorAlert();
        }} 
        message={alertMessage || alertState.errorMessage} 
      />
      
      <AlertNotification
        isOpen={showSuccessAlert || alertState.showSuccessAlert}
        onClose={() => {
          setShowSuccessAlert(false);
          closeSuccessAlert();
        }}
        notificationText={alertMessage || alertState.successMessage}
      />

      <AlertQuestion
        isOpen={showConfirmation}
        onConfirm={handleEditCobro}
        onClose={() => setShowConfirmation(false)}
        questionText="¿Está seguro de que desea actualizar este cobro persuasivo?"
      />
      
      <AlertLoader
        isOpen={isUpdating}
        loadingText="Actualizando cobro persuasivo..."
      />

      <ModalContainer isOpen={isOpen} onClose={handleCloseModal} size="lg">
        <div className="space-y-6">
          {/* Título */}
          <h3 className={`text-2xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
            Editar Cobro Persuasivo
          </h3>

          {/* Información del cobro */}
          {cobroData && (
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-gray-50'}`}>
              <h4 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Información del Cobro
              </h4>
              <div className={`grid grid-cols-2 gap-4 text-sm ${isDarkMode ? 'text-white' : ''}`}>
                <div><strong>Código:</strong> {cobroData.codigoAccion}</div>
                <div><strong>Recaudador:</strong> {cobroData.nombreRecaudador}</div>
                <div><strong>N° Factura:</strong> {cobroData.nroFactura}</div>
                <div><strong>Fecha Compra:</strong> {formatDateForDisplay(cobroData.fechaCompra)}</div>
              </div>
            </div>
          )}

          {/* Formulario de edición */}
          <div className="space-y-4">
            {/* Descripción */}
            <div>
              <AnimatedTextarea
                label="Descripción *"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleTextareaChange}
                rows={4}
                error={errors.descripcion}
                darkMode={isDarkMode}
              />
              {errors.descripcion && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>La descripción es obligatoria</p>
              )}
            </div>

            {/* Acción */}
            <div>
              <AnimatedSelect
                label="Acción a Registrar *"
                name="accionRegistrar"
                value={formData.accionRegistrar}
                onChange={handleSelectChange}
                options={getAccionOptions()}
                error={errors.accionRegistrar}
                disabled={isLoadingAcciones}
                darkMode={isDarkMode}
              />
              {errors.accionRegistrar && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>Debe seleccionar una acción</p>
              )}
              {isLoadingAcciones && (
                <div className={`flex items-center mt-1 text-xs ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                  <div className={`w-3 h-3 mr-1 border-2 border-t-transparent ${isDarkMode ? 'border-white' : 'border-[#562707]'} rounded-full animate-spin`}></div>
                  Cargando acciones...
                </div>
              )}
            </div>

            {/* Fecha de registro */}
            <div>
              <AnimatedInput
                label="Fecha de Registro *"
                name="fechaRegistro"
                type="date"
                value={formData.fechaRegistro}
                onChange={handleInputChange}
                error={errors.fechaRegistro}
                darkMode={isDarkMode}
              />
              {errors.fechaRegistro && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>La fecha de registro es obligatoria</p>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-center space-x-4 mt-6">
            <Button
              onClick={handleConfirmEdit}
              title="Actualizar Cobro"
              disabled={isUpdating}
            />
            <Button
              onClick={handleCloseModal}
              title="Cancelar"
              disabled={isUpdating}
            />
          </div>
        </div>
      </ModalContainer>
    </>
  );
};

export default ModalEditarCobro; 