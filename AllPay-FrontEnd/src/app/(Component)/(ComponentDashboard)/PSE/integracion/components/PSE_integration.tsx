'use client';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { usePersonaPago } from '../hooks/usePersonaPago';
import useZonaPagos from '../../generar/hooks/useZonaPagos';
import SecureInput from './SecureInput';

import Logo from '@/presenters/components/shared/logo/Logo';
import LogoPSE from '@/presenters/components/shared/logo/LogoPSE';

const PSE_integration: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  


  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  
  // Utilizar el hook para obtener los datos de la persona para el pago
  const {
    isLoading: isLoadingPersona,
    error: personaError,
    resetError: resetPersonaError,
  } = usePersonaPago();
  
  // Utilizar el hook para ZonaPagos
  const {
    isLoading: isLoadingZonaPagos,
    iniciarPago: iniciarPagoZonaPagos
  } = useZonaPagos();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    banco: '',
    tipoPersona: '',
    tipoDocumento: '',
    numeroIdentificacion: '',
    nombres: '',
    apellidos: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
    direccion: '',
    descripcion: '',
    valorTotal: '',
    valorCuota: '',
    valorIntereses: '',
    moneda: 'COP',
    nroDocPago: '',
    idLiqFacturaUnica: null as number | null
  });

  // Estado de errores del formulario
  const [errors, setErrors] = useState({
    tipoPersona: false,
    tipoDocumento: false,
    numeroIdentificacion: false,
    nombres: false,
    apellidos: false,
    telefono: false,
    email: false,
    valorTotal: false
  });

  // Estado para controlar la visibilidad de la alerta de confirmación
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Estado para controlar el loader
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para mostrar errores del API
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Opciones para los selects
  const tipoPersonaOptions = [
    { key: '0', value: '0', title: 'Persona Natural' },
    { key: '1', value: '1', title: 'Persona Jurídica' }
  ];

  const tipoDocumentoOptions = [
    { key: 'CC', value: 'CC', title: 'Cédula de Ciudadanía' },
    { key: 'CE', value: 'CE', title: 'Cédula de Extranjería' },
    { key: 'NIT', value: 'NIT', title: 'NIT Empresa' },
    { key: 'NUIP', value: 'NUIP', title: 'Número Único de Identificación' },
    { key: 'TI', value: 'TI', title: 'Tarjeta de Identidad' },
    { key: 'PP', value: 'PP', title: 'Pasaporte' },
    { key: 'IDC', value: 'IDC', title: 'Identificador Único del Cliente' },
    { key: 'CEL', value: 'CEL', title: 'Número móvil o celular' },
    { key: 'RC', value: 'RC', title: 'Registro Civil de Nacimiento' },
    { key: 'DE', value: 'DE', title: 'Documento de Identificación Extranjero' },
    { key: 'OTRO', value: 'OTRO', title: 'Otro no tipificado' }
  ];
  
  // Cargar datos de pago desde sessionStorage (si existen)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedPaymentData = sessionStorage.getItem('pse_payment_data');
        if (storedPaymentData) {
          const paymentData = JSON.parse(storedPaymentData);
          
          // Establecer los valores en el formulario
          setFormData(prev => ({
            ...prev,
            valorCuota: paymentData.cuota_fomento?.toString() || '',
            valorIntereses: paymentData.valor_intereses?.toString() || '',
            valorTotal: paymentData.valor_pagar?.toString() || '',
            descripcion: `Pago Cuota de Fomento Cacaotero Documento Nro ${paymentData.nro_doc_pago}`,
            nroDocPago: paymentData.nro_doc_pago || '',
            idLiqFacturaUnica: paymentData.id_liq_factura_unica || null
          }));
          
        }
      }
    } catch (error) {
      console.error('Error al cargar datos de pago:', error);
    }
  }, []);
  

  // Mostrar error si hay problemas al cargar los datos de la persona
  useEffect(() => {
    if (personaError) {
      console.error('[PSE_integration] - Error al cargar datos de persona:', personaError);
      // No mostramos este error al usuario para no sobrecargar de alertas
      // Solo lo registramos en consola
    }
  }, [personaError]);

  // Los campos editables quedan vacíos para que el usuario los complete manualmente
  // Solo se mantiene la lógica para campos no editables si es necesario
  
  
  // Manejador de cambios en selects
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Si cambia el tipo de persona, resetear el tipo de documento para evitar valores inválidos
    if (name === 'tipoPersona') {
      
      // Si se selecciona persona jurídica, establecer automáticamente NIT como tipo de documento
      if (value === '1') {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          tipoDocumento: 'NIT' // Establecer NIT para persona jurídica
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          tipoDocumento: '' // Resetear el tipo de documento para persona natural
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpiar error al seleccionar
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  // Función para manejar cambios en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores cuando el usuario empiece a escribir
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  // Obtener las opciones de tipo de documento filtradas según el tipo de persona
  const getFilteredDocumentTypeOptions = () => {
    
    if (formData.tipoPersona === '1') { // Persona Jurídica
      // Solo permitir NIT
      return tipoDocumentoOptions.filter(option => option.value === 'NIT');
    } else if (formData.tipoPersona === '0') { // Persona Natural
      // Permitir todos menos NIT
      return tipoDocumentoOptions.filter(option => option.value !== 'NIT');
    }
    
    // Si no hay tipo de persona seleccionado, mostrar todas las opciones
    return tipoDocumentoOptions;
  };

  // Validar el formulario antes de enviar
  const validateForm = (): boolean => {
    // Validación de seguridad: verificar que los datos no hayan sido manipulados
    try {
      const storedOriginalData = sessionStorage.getItem('pse_payment_data_original');
      if (storedOriginalData) {
        const originalData = JSON.parse(storedOriginalData);
        
        // Verificar que los valores críticos no hayan sido manipulados
        if (
          parseFloat(formData.valorTotal) !== parseFloat(originalData.valor_pagar.toString()) ||
          parseFloat(formData.valorCuota) !== parseFloat(originalData.cuota_fomento.toString()) ||
          parseFloat(formData.valorIntereses) !== parseFloat(originalData.valor_intereses.toString())
        ) {
          setErrorMessage('Se detectó una manipulación de los datos de pago. Por seguridad, la transacción ha sido cancelada.');
          setShowErrorAlert(true);
          return false;
        }
      }
    } catch (error) {
      console.error('Error al validar integridad de datos:', error);
      setErrorMessage('Error al validar la integridad de los datos de pago.');
      setShowErrorAlert(true);
      return false;
    }

    const newErrors = {
      tipoPersona: !formData.tipoPersona,
      tipoDocumento: !formData.tipoDocumento,
      numeroIdentificacion: !formData.numeroIdentificacion,
      nombres: !formData.nombres,
      apellidos: !formData.apellidos,
      telefono: !formData.telefono,
      email: !formData.email || !/\S+@\S+\.\S+/.test(formData.email),
      valorTotal: !formData.valorTotal || isNaN(Number(formData.valorTotal)) || Number(formData.valorTotal) <= 0
    };
    
    // Validación adicional para el tipo de documento según el tipo de persona
    if (formData.tipoPersona === '1' && formData.tipoDocumento !== 'NIT') {
      newErrors.tipoDocumento = true;
      // Mostrar mensaje de error específico
      setErrorMessage('Para Persona Jurídica solo puede seleccionar NIT como tipo de documento.');
      setShowErrorAlert(true);
    } else if (formData.tipoPersona === '0' && formData.tipoDocumento === 'NIT') {
      newErrors.tipoDocumento = true;
      // Mostrar mensaje de error específico
      setErrorMessage('Para Persona Natural no puede seleccionar NIT como tipo de documento.');
      setShowErrorAlert(true);
    }
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  // Manejador de envío del formulario
  const handleSubmit = () => {
  
    if (validateForm()) {
      // Mostrar confirmación antes de proceder
      setShowConfirmation(true);
    } else {
      // Mostrar mensaje de error
      setErrorMessage('Por favor, complete todos los campos requeridos correctamente.');
      setShowErrorAlert(true);
    }
  };

  // Manejador para confirmar el pago
  const handleConfirmPayment = async () => {
    // Cerrar modal de confirmación y mostrar loader
    setShowConfirmation(false);
    setIsLoading(true);
    
    try {
      // Validación de seguridad: verificar que los datos no hayan sido manipulados
      const storedPaymentData = sessionStorage.getItem('pse_payment_data');
      if (storedPaymentData) {
        const paymentData = JSON.parse(storedPaymentData);
        
        // Verificar que los valores críticos no hayan sido manipulados
        const valorTotalForm = parseFloat(formData.valorTotal);
        const valorCuotaForm = parseFloat(formData.valorCuota);
        const valorInteresesForm = parseFloat(formData.valorIntereses);
        
        const valorTotalOriginal = parseFloat(paymentData.valor_pagar.toString());
        const valorCuotaOriginal = parseFloat(paymentData.cuota_fomento.toString());
        const valorInteresesOriginal = parseFloat(paymentData.valor_intereses.toString());
        
        if (
          valorTotalForm !== valorTotalOriginal ||
          valorCuotaForm !== valorCuotaOriginal ||
          valorInteresesForm !== valorInteresesOriginal
        ) {
          setErrorMessage('Se detectó una manipulación de los datos de pago. Por seguridad, la transacción ha sido cancelada.');
          setShowErrorAlert(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Convertir el valor a número y validar
      const amount = parseFloat(formData.valorTotal);
      
      if (isNaN(amount) || amount <= 0) {
        setErrorMessage('El valor del pago debe ser un número mayor a cero.');
        setShowErrorAlert(true);
        setIsLoading(false);
        return;
      }
      
      // Preparar parámetros para ZonaPagos
      const zonaPagosParams = {
        id_liquidacion: formData.idLiqFacturaUnica || 0,
        numero_documento: formData.numeroIdentificacion,
        tipo_documento: formData.tipoDocumento,
        primer_nombre: formData.nombres,
        primer_apellido: formData.apellidos,
        email: formData.email,
        telefono: formData.telefono
      };
          
      // Iniciar pago con ZonaPagos
      const response = await iniciarPagoZonaPagos(token, zonaPagosParams);
      
      if (response.success && response.redirect_url) {
        // Redirigir a ZonaPagos
        window.location.href = response.redirect_url;
      } else {
        setErrorMessage('Error al iniciar el pago con ZonaPagos.');
        setShowErrorAlert(true);
        setIsLoading(false);
      }
      
    } catch (error) {
      setErrorMessage('Ocurrió un error inesperado al procesar el pago.');
      setShowErrorAlert(true);
      setIsLoading(false);
    }
  };

  // Formatear valor a moneda colombiana
  const formatCurrency = (value: string): string => {
    if (!value) return '';
    const number = parseFloat(value);
    if (isNaN(number)) return value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(number);
  };

  // Función para restablecer todos los errores
  const resetErrors = () => {
    resetPersonaError();
    setShowErrorAlert(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  if (!mounted) {
    return null;
  }

  return (
    <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
      <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
      <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                    >
                        &times; 
                    </button>
        <h3 className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
          PAGO EN LÍNEA CUOTA DE FOMENTO CACAOTERO
        </h3>

        {/* Logos */}
        <div className={`mb-10 px-6 py-6 rounded-lg
  ${isDarkMode ? 'bg-opacity-10 bg-transparent border border-white/20' : 'bg-white border border-gray-200 shadow-sm'}`}>

  <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
    {/* Logo AllPay */}
    <div className="w-full md:w-2/5 flex justify-center">
      {/* si Logo acepta className, pásale tamaños responsivos */}
      <Logo className="w-44 md:w-56 h-auto" />
    </div>

    {/* Divisor: horizontal en móvil, vertical en md+ */}
    <div className="md:flex-grow flex justify-center">
      {/* horizontal (móvil) */}
      <div className={`w-24 h-0.5 md:hidden rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
      {/* vertical (md+) */}
      <div className={`hidden md:block w-0.5 h-16 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
    </div>

    {/* Logo PSE */}
    <div className="w-full md:w-2/5 flex justify-center">
      {/* OJO: el truco real es dentro de LogoPSE (paso 2) */}
      <LogoPSE className="w-36 md:w-48 h-auto" />
    </div>
  </div>
</div>
        
        
        {/* Indicador de carga de datos de la persona */}
        {isLoadingPersona && (
          <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-[#3a1a05] text-white' : 'bg-blue-50 text-blue-700'}`}>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
              <p>Cargando sus datos personales...</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Tipo de Persona - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedSelect
              label="Tipo de Persona *"
              labelSize='sm'
              name="tipoPersona"
              value={formData.tipoPersona}
              onChange={handleSelectChange}
              options={tipoPersonaOptions}
              error={errors.tipoPersona}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Tipo de Documento - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedSelect
              label="Tipo de Documento *"
              labelSize='sm'
              name="tipoDocumento"
              value={formData.tipoDocumento}
              onChange={handleSelectChange}
              options={getFilteredDocumentTypeOptions()}
              error={errors.tipoDocumento}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Número de Identificación - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedInput
              label="Nº Identificación *"
              name="numeroIdentificacion"
              value={formData.numeroIdentificacion}
              onChange={handleInputChange}
              type="text"
              error={errors.numeroIdentificacion}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Nombres - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedInput
              label="Nombres *"
              name="nombres"
              value={formData.nombres}
              onChange={handleInputChange}
              type="text"
              error={errors.nombres}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Apellidos - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedInput
              label="Apellidos *"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleInputChange}
              type="text"
              error={errors.apellidos}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Teléfono - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedInput
              label="Teléfono *"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              type="text"
              error={errors.telefono}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Correo Electrónico - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedInput
              label="Correo *"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              type="email"
              error={errors.email}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Número de Documento de Pago - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="Nº DOC. DE PAGO"
              value={formData.nroDocPago}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Descripción - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="DESCRIPCIÓN"
              value={formData.descripcion}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Valor Cuota Fomento - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="VALOR CF"
              value={formData.valorCuota}
              type="currency"
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Intereses de Mora - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="INTERESES DE MORA"
              value={formData.valorIntereses}
              type="currency"
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Total a Pagar - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="TOTAL A PAGAR"
              value={formData.valorTotal}
              type="currency"
              error={errors.valorTotal}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* Moneda (COP) - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="Moneda"
              value={formData.moneda}
              darkMode={isDarkMode}
            />
          </div>
          
          {/* ID Liquidación Factura Única - CAMPO NO EDITABLE (para futuras peticiones) */}
          <div className="col-span-1">
        
          </div>
        </div>
      
        
        {/* Botón de Pagar */}
        <div className="flex justify-center mt-8 gap-4">
          <Button
            title="Pagar"
            onClick={handleSubmit}
            className="bg-[#4D750F] hover:bg-[#3a5a0a] w-40"
            loading={isLoadingZonaPagos}
            disabled={isLoadingZonaPagos}
          />
          <Button title="Salir" onClick={() => router.push('/')} />
        </div>
      </div>

      {/* Alerta de Confirmación */}
      <AlertQuestion
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmPayment}
        questionText={`¿Está seguro que desea realizar el pago por ${formatCurrency(formData.valorTotal)}? Una vez confirmado, será redirigido a la plataforma ZonaPagos.`}
      />
      
      {/* Loader mientras se procesa el pago */}
      <AlertLoader
        isOpen={isLoading}
        loadingText="Procesando su solicitud de pago. Por favor espere mientras lo redirigimos a la plataforma ZonaPagos..."
      />
      
      {/* Alerta de error */}
      <AlertError
        isOpen={showErrorAlert}
        onClose={() => {
          setShowErrorAlert(false);
          resetErrors(); // Reiniciar todos los errores
        }}
        message={errorMessage}
      />
    </div>
  );
};

export default PSE_integration;

