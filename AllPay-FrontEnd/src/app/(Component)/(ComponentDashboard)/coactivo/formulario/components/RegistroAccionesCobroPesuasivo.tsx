/**
 * RegistroAccionesCobroPesuasivo.tsx
 * 
 * Componente para registrar acciones de cobro persuasivo.
 * 
 * Funcionalidades:
 * - Formulario con campos específicos para registrar acciones de cobro
 * - Validación de datos
 * - Integración con plantillas
 * - Carga de documentos
 * - Pre-llenado completo de datos desde servicio de detalles de factura
 */
'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import SecureInput from './SecureInput';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
// Importar el hook de detalles de factura
import { useFacturaDetalles } from '../hooks/useFacturaDetalles';
// Importar el hook de acciones de cobro simple
import { useAccionesCobroCoactivoSimple } from '../hooks/useAccionesCobroCoactivoSimple';
// Importar el adaptador de registro de acciones
import { createAccionCoactivoPorFactura, CreateAccionCoactivoPorFacturaPayload } from '../adapters/registroAccionCoactivoFactura.adapter';

// Props del componente
interface RegistroAccionesCobroPesuasivoProps {
  facturaId?: string | null;
  nroFactura?: string | null;
}

// Interfaces
interface FormDataAccionesCobroPesuasivo {
  nroFacturaUnica: string;
  fechaCompra: string;
  nombreRecaudador: string;
  correoRecaudador: string;
  celularRecaudador: string;
  fechaRegistro: string;
  accionRegistrar: string;
  descripcionAccion: string;
  documento: File | null;
  aplicarPlantilla: string;
  valorIntereses: string;
  valorCostasProcesales: string;
}

interface FormErrors {
  nroFacturaUnica: boolean;
  fechaCompra: boolean;
  nombreRecaudador: boolean;
  correoRecaudador: boolean;
  celularRecaudador: boolean;
  fechaRegistro: boolean;
  accionRegistrar: boolean;
  descripcionAccion: boolean;
}

const RegistroAccionesCobroPesuasivo: React.FC<RegistroAccionesCobroPesuasivoProps> = ({ 
  facturaId, 
  nroFactura 
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  // Obtener token de sesión
  const token = (session as any)?.user?.tokens?.access;

  const [mounted, setMounted] = useState(false);
  // Estados para modo edición
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';
  // const [cobroIdToEdit, setCobroIdToEdit] = useState<string | null>(null); // No usado actualmente

  // Estados del formulario
  const [formData, setFormData] = useState<FormDataAccionesCobroPesuasivo>({
    nroFacturaUnica: '',
    fechaCompra: '',
    nombreRecaudador: '',
    correoRecaudador: '',
    celularRecaudador: '',
    fechaRegistro: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    accionRegistrar: '',
    descripcionAccion: '',
    documento: null,
    aplicarPlantilla: '',
    valorIntereses: '',
    valorCostasProcesales: ''
  });

  // Hook para manejar detalles de factura
  const {
    facturaDetalles,
    isLoading: isLoadingDetalles,
    alertState: alertStateDetalles,
    loadFacturaDetalles,
    extractFormDataFromDetalles,
    closeErrorAlert: closeErrorAlertDetalles,
    closeAlertSuccess: closeAlertSuccessDetalles
  } = useFacturaDetalles();

  // Hook para manejar acciones de cobro simple
  const {
    isLoading: isLoadingAcciones,
    error: accionesError,
    getAccionOptions,
    getAccionNombre,
    resetError: resetAccionesError
  } = useAccionesCobroCoactivoSimple();

  // Effect para capturar parámetros de edición de la URL
  useEffect(() => {
    // No procesar si aún están cargando las acciones
    if (isLoadingAcciones) {
      return;
    }

    const editMode = searchParams.get('editMode');
    const cobroId = searchParams.get('cobroId');
    const descripcion = searchParams.get('descripcion');
    const accionRegistrar = searchParams.get('accionRegistrar');
    const aplicarPlantilla = searchParams.get('aplicarPlantilla');
    const fechaRegistro = searchParams.get('fechaRegistro');

    if (editMode === 'true' && cobroId) {
      setIsEditMode(true);

      // Si el valor de accionRegistrar es un nombre, buscar el ID correspondiente
      let accionId = accionRegistrar || '';
      
      // Si es texto (no número), buscar el ID por nombre
      if (accionRegistrar && isNaN(Number(accionRegistrar))) {
        // Buscar el ID por nombre
        const opciones = getAccionOptions();
        const encontrada = opciones.find(opt => opt.title === accionRegistrar);
        if (encontrada) {
          accionId = encontrada.value;
        }
      }


      // Pre-llenar formulario con datos de edición
      setFormData(prev => ({
        ...prev,
        descripcionAccion: descripcion || '',
        accionRegistrar: accionId,
        aplicarPlantilla: aplicarPlantilla === 'Sí' ? 'si' : 'no',
        fechaRegistro: fechaRegistro ? new Date(fechaRegistro).toISOString().split('T')[0] : prev.fechaRegistro
      }));
    }
  }, [searchParams, getAccionOptions, isLoadingAcciones]);

  // Effect para pre-llenar datos de la factura
  useEffect(() => {
    if (nroFactura) {
      setFormData(prev => ({
        ...prev,
        nroFacturaUnica: nroFactura
      }));
    }
  }, [nroFactura]);

  // Effect para cargar detalles de factura automáticamente
  useEffect(() => {
    const loadDetalles = async () => {
      if (facturaId && !facturaDetalles) {
        const detalles = await loadFacturaDetalles(facturaId);
        
        if (detalles) {
          // Pre-llenar el formulario con los datos de la factura
          const formDataFromDetalles = extractFormDataFromDetalles(detalles);
          setFormData(prev => ({
            ...prev,
            ...formDataFromDetalles
          }));
          
        }
      }
    };

    loadDetalles();
  }, [facturaId, facturaDetalles, loadFacturaDetalles, extractFormDataFromDetalles]);

  // Estado de errores
  const [errors, setErrors] = useState<FormErrors>({
    nroFacturaUnica: false,
    fechaCompra: false,
    nombreRecaudador: false,
    correoRecaudador: false,
    celularRecaudador: false,
    fechaRegistro: false,
    accionRegistrar: false,
    descripcionAccion: false
  });

  // Estados para alertas
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Opciones para los selects
  const plantillasOptions = [
    { key: '0', value: 'no', title: 'No' },
    { key: '1', value: 'si', title: 'Sí' }
  ];

  // Effect para manejar errores de carga de acciones
  useEffect(() => {
    if (accionesError) {
      console.error('[RegistroAccionesCobroPesuasivo] - Error al cargar acciones:', accionesError);
      setAlertMessage(`Error al cargar acciones de cobro: ${accionesError}`);
      setShowErrorAlert(true);
    }
  }, [accionesError]);

  // Función para manejar cierre de alertas de error con reset de errores
  const handleCloseErrorAlert = () => {
    setShowErrorAlert(false);
    setAlertMessage('');
    if (accionesError) {
      resetAccionesError();
    }
    closeErrorAlertDetalles();
  };

  // Funciones de manejo del formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target as any;
    
    // Manejo especial para archivos
    if (name === 'documento' && files) {
      const selectedFile = files[0] || null;
      setFormData(prev => ({ ...prev, documento: selectedFile }));
      return;
    }
    
    // Validaciones específicas
    if (name === 'nroFacturaUnica') {
      // Solo permitir números para factura
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else if (name === 'celularRecaudador') {
      // Solo permitir números para celular
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else if (name === 'correoRecaudador') {
      // Convertir a minúsculas para email
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

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

    // Ya no modificar la descripción automáticamente al cambiar aplicarPlantilla
  }, [errors, getAccionNombre]);

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      nroFacturaUnica: false, // Ya no se valida porque es readonly
      fechaCompra: false, // Ya no se valida porque es readonly
      nombreRecaudador: false, // Ya no se valida porque es readonly
      correoRecaudador: false, // Ya no se valida porque es readonly
      celularRecaudador: false, // Ya no se valida porque es readonly
      fechaRegistro: !formData.fechaRegistro,
      accionRegistrar: !formData.accionRegistrar,
      descripcionAccion: !formData.descripcionAccion.trim()
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  // Manejo del envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setAlertMessage('Por favor, complete todos los campos obligatorios correctamente.');
      setShowErrorAlert(true);
      return;
    }

    setShowConfirmation(true);
  }, [validateForm]);

  // Nueva función para manejar el click del botón
  const handleButtonSubmit = useCallback(() => {
    if (!validateForm()) {
      setAlertMessage('Por favor, complete todos los campos obligatorios correctamente.');
      setShowErrorAlert(true);
      return;
    }

    setShowConfirmation(true);
  }, [validateForm]);

  // Limpiar formulario
  const handleClearForm = useCallback(() => {
    setFormData({
      nroFacturaUnica: '',
      fechaCompra: '',
      nombreRecaudador: '',
      correoRecaudador: '',
      celularRecaudador: '',
      fechaRegistro: new Date().toISOString().split('T')[0],
      accionRegistrar: '',
      descripcionAccion: '',
      documento: null,
      aplicarPlantilla: '',
      valorIntereses: '',
      valorCostasProcesales: ''
    });

    setErrors({
      nroFacturaUnica: false,
      fechaCompra: false,
      nombreRecaudador: false,
      correoRecaudador: false,
      celularRecaudador: false,
      fechaRegistro: false,
      accionRegistrar: false,
      descripcionAccion: false
    });

    // Limpiar el input de archivo
    const fileInput = document.getElementById('documento') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    setShowConfirmation(false);
    setIsLoading(true);

    try {
      // Verificar que tengamos el facturaId
      if (!facturaId) {
        throw new Error('ID de factura no disponible');
      }

      if (!token) {
        throw new Error('Token de autenticación no disponible. Por favor, inicie sesión nuevamente.');
      }

      // Validar que se haya seleccionado una acción
      if (!formData.accionRegistrar || formData.accionRegistrar === '') {
        throw new Error('Debe seleccionar una acción de cobro persuasivo');
      }

      // Convertir el ID de acción a número y validar
      const idAccionNumerico = parseInt(formData.accionRegistrar, 10);
      if (isNaN(idAccionNumerico) || idAccionNumerico <= 0) {
        throw new Error('ID de acción inválido. Por favor, seleccione una acción válida.');
      }

      // Construir payload por factura
      const payloadFactura: CreateAccionCoactivoPorFacturaPayload = {
        factura_id: parseInt(facturaId, 10),
        descripcion: formData.descripcionAccion,
        id_accion_cobro_persuasivo: idAccionNumerico,
        nombre_recaudador: formData.nombreRecaudador,
        email_recaudador: formData.correoRecaudador,
        celular_recaudador: formData.celularRecaudador,
        aplicar_plantilla: formData.aplicarPlantilla === 'si',
        documento_adjunto: formData.documento || undefined
      };

      // Log del payload para debugging (incluye información del archivo)
      console.log('[RegistroAccionesCobroPesuasivo] - Payload a enviar:', {
        ...payloadFactura,
        documento_adjunto: formData.documento ? {
          name: formData.documento.name,
          size: formData.documento.size,
          type: formData.documento.type
        } : null
      });

      // Llamar al servicio de creación por factura
      const response = await createAccionCoactivoPorFactura(token, payloadFactura);
      
      const successMessage = formData.documento 
        ? `Acción de cobro registrada exitosamente con documento adjunto. Consecutivo: ${response.data.consecutivo}`
        : `Acción de cobro registrada exitosamente. Consecutivo: ${response.data.consecutivo}`;
      
      setAlertMessage(successMessage);
      setShowSuccessAlert(true);
      handleClearForm();

      // Navegar de vuelta a @acciones después de 3 segundos
      setTimeout(() => {
        if (facturaId && nroFactura) {
          router.push(`/coactivo/acciones?facturaId=${facturaId}&nroFactura=${nroFactura}`);
        } else {
          router.push('/coactivo/acciones');
        }
      }, 3000);
      
    } catch (error: any) {
      console.error('[RegistroAccionesCobroPesuasivo] - Error completo:', error);
      setAlertMessage(error.message || 'Error al registrar la acción de cobro. Intente nuevamente.');
      setShowErrorAlert(true);
    } finally {
      setIsLoading(false);
    }
  }, [formData, facturaId, token, router, nroFactura, handleClearForm]);

  // Función para formatear fecha a DD/MM/YYYY
  const formatDateForDisplay = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full max-w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Componentes de alertas */}
      <AlertError 
        isOpen={showErrorAlert} 
        onClose={handleCloseErrorAlert} 
        message={alertMessage} 
      />
      
      {/* Alertas para detalles de factura */}
      <AlertError 
        isOpen={alertStateDetalles.showErrorAlert} 
        onClose={closeErrorAlertDetalles} 
        message={alertStateDetalles.errorAlertMessage} 
      />
      
      <AlertNotification
        isOpen={showSuccessAlert}
        onClose={() => setShowSuccessAlert(false)}
        notificationText={alertMessage}
      />

      {/* Notificación para detalles de factura */}
      <AlertSuccess
        isOpen={alertStateDetalles.showAlertSuccess}
        onClose={closeAlertSuccessDetalles}
        message={alertStateDetalles.alertMessage}
        autoCloseMs={3000}
      />

      <AlertQuestion
        isOpen={showConfirmation}
        onConfirm={handleConfirmSubmit}
        onClose={() => setShowConfirmation(false)}
        questionText={isEditMode ? "¿Está seguro de que desea actualizar esta acción de cobro persuasivo?" : "¿Está seguro de que desea registrar esta acción de cobro persuasivo?"}
      />
      
      <AlertLoader
        isOpen={isLoading || isLoadingDetalles}
        loadingText={isLoadingDetalles ? "Cargando datos de la factura..." : isEditMode ? "Actualizando acción de cobro..." : "Registrando acción de cobro..."}
      />

      <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
        <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
          <h3 className={`text-2xl font-bold text-center mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
            {isEditMode ? 'Editar Acción Cobro Coactivo' : 'Registrar Acciones Cobro Coactivo'}
          </h3>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Sección 1: Datos de la Factura */}
            <div className="space-y-4">
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Datos de la Factura
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SecureInput
                  label="N° Factura Única *"
                  value={formData.nroFacturaUnica}
                  type="text"
                  darkMode={isDarkMode}
                />

                <SecureInput
                  label="Fecha de Compra *"
                  value={formatDateForDisplay(formData.fechaCompra)}
                  type="text"
                  darkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Sección 2: Datos del Recaudador */}
            <div className="space-y-4">
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Datos del Recaudador
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <SecureInput
                  label="Nombre del Recaudador (Razón Social) *"
                  value={formData.nombreRecaudador}
                  type="text"
                  darkMode={isDarkMode}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SecureInput
                  label="Correo Electrónico Recaudador *"
                  value={formData.correoRecaudador}
                  type="text"
                  darkMode={isDarkMode}
                />

                <SecureInput
                  label="N° Celular Recaudador *"
                  value={formData.celularRecaudador}
                  type="text"
                  darkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Sección 3: Datos del Registro */}
            <div className="space-y-4">
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Datos del Registro
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatedInput
                  label="Fecha de Registro *"
                  name="fechaRegistro"
                  type="date"
                  value={formData.fechaRegistro}
                  onChange={handleInputChange}
                  required
                  error={errors.fechaRegistro}
                  darkMode={isDarkMode}
                />

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
                {isLoadingAcciones && (
                  <div className={`flex items-center mt-1 text-xs ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    <div className={`w-3 h-3 mr-1 border-2 border-t-transparent ${isDarkMode ? 'border-white' : 'border-[#562707]'} rounded-full animate-spin`}></div>
                    Cargando acciones de cobro...
                  </div>
                )}
              </div>
            </div>

            {/* Sección 4: Plantilla y Descripción */}
            <div className="space-y-4">
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Descripción de la Acción
              </h4>
              

              <div className="grid grid-cols-1 gap-4">
                <AnimatedTextarea
                  label="Descripción de la Acción *"
                  name="descripcionAccion"
                  value={formData.descripcionAccion}
                  onChange={handleTextareaChange}
                  rows={4}
                  error={errors.descripcionAccion}
                  darkMode={isDarkMode}
                />
                {errors.descripcionAccion && (
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>La descripción de la acción es obligatoria</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                <AnimatedSelect
                  label="Aplicar Plantilla"
                  name="aplicarPlantilla"
                  value={formData.aplicarPlantilla}
                  onChange={handleSelectChange}
                  options={plantillasOptions}
                  darkMode={isDarkMode}
                />
               
              </div>
            </div>

            {/* Sección 5: Documento */}
            <div className="space-y-4">
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Documento Adjunto
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <AnimatedInput
                  label="Documento (Opcional)"
                  name="documento"
                  type="file"
                  value={formData.documento?.name || ''}
                  onChange={handleInputChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  darkMode={isDarkMode}
                />
                {formData.documento && (
                  <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    Archivo seleccionado: {formData.documento.name}
                  </p>
                )}
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Formatos permitidos: PDF, DOC, DOCX, JPG, JPEG, PNG (Máx. 10MB)
                </p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button
                onClick={handleButtonSubmit}
                title={isLoading ? (isEditMode ? "Actualizando..." : "Registrando...") : (isEditMode ? "Actualizar Acción" : "Registrar Acción")}
                disabled={isLoading}
              />
              <Button
                onClick={handleClearForm}
                title="Limpiar Formulario"
                disabled={isLoading}
              />
              <Button
                onClick={() => {
                  if (facturaId && nroFactura) {
                    router.push(`/cobros/acciones?facturaId=${facturaId}&nroFactura=${nroFactura}`);
                  } else {
                    router.push('/cobros/acciones');
                  }
                }}
                title="Volver a Acciones"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistroAccionesCobroPesuasivo; 