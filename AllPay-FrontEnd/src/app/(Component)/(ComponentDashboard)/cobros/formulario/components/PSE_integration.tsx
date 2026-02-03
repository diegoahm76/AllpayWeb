'use client';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { useBanks } from '@/app/(Component)/(ComponentDashboard)/PSE/integracion/hooks/useBanks';
import { usePersonaPago } from '@/app/(Component)/(ComponentDashboard)/PSE/integracion/hooks/usePersonaPago';
import { usePsePayment, CreatePsePaymentParams } from '@/app/(Component)/(ComponentDashboard)/PSE/integracion/hooks/usePsePayment';
import SecureInput from './SecureInput';

import Logo from '@/presenters/components/shared/logo/Logo';
import LogoPSE from '@/presenters/components/shared/logo/LogoPSE';

const PSE_integration: React.FC = () => {
  const { theme } = useTheme();
  
  // Obtener la sesión y el token - solo para autenticación
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  
  // Utilizar el hook para obtener los bancos
  const { 
    isLoading: isLoadingBanks,
    error: banksError,
    getBankOptions,
    resetError: resetBanksError,
    refreshBanks
  } = useBanks();
  
  // Utilizar el hook para obtener los datos de la persona para el pago
  const {
    persona,
    isLoading: isLoadingPersona,
    error: personaError,
    getFormData,
    resetError: resetPersonaError,
  } = usePersonaPago();
  
  // Utilizar el hook para los pagos PSE
  const {
    error: paymentError,
    redirectUrl,
    createPayment,
    redirectToPayment,
    resetError: resetPaymentError
  } = usePsePayment();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    banco: '',
    tipoPersona: '',
    tipoDocumento: '',
    numeroIdentificacion: '',
    nombre: '',
    apellido: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
    direccion: '',
    descripcion: '',
    valorTotal: '',
    valorCuota: '',
    valorIntereses: '',
    moneda: 'COP',
    nroDocPago: ''
  });

  // Estado de errores del formulario
  const [errors, setErrors] = useState({
    banco: false,
    tipoPersona: false,
    tipoDocumento: false,
    numeroIdentificacion: false,
    nombre: false,
    apellido: false,
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
    { key: '01', value: '01', title: 'Registro Civil Nacimiento' },
    { key: '02', value: '02', title: 'Tarjeta de Identidad' },
    { key: '03', value: '03', title: 'Cédula de Ciudadanía' },
    { key: '04', value: '04', title: 'Tarjeta Extranjería' },
    { key: '05', value: '05', title: 'Cédula Extranjería' },
    { key: '06', value: '06', title: 'NIT' },
    { key: '07', value: '07', title: 'Pasaporte' },
    { key: '08', value: '08', title: 'Documento Identificación Extranjero' }
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
            descripcion: `Pago Cuota de Fomento Cacaotero Factura Nro ${paymentData.nro_factura_unica}`,
            nroDocPago: paymentData.nro_doc_pago || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error al cargar datos de pago:', error);
    }
  }, []);
  
  // Mostrar error si hay problemas al cargar los bancos
  useEffect(() => {
    if (banksError) {
      console.error('[PSE_integration] - Error al cargar bancos:', banksError);
      setErrorMessage(`Error al cargar los bancos: ${banksError}`);
      setShowErrorAlert(true);
    }
  }, [banksError]);

  // Mostrar error si hay problemas al cargar los datos de la persona
  useEffect(() => {
    if (personaError) {
      console.error('[PSE_integration] - Error al cargar datos de persona:', personaError);
      // No mostramos este error al usuario para no sobrecargar de alertas
      // Solo lo registramos en consola
    }
  }, [personaError]);

  // Llenar el formulario con los datos de la persona cuando estén disponibles
  useEffect(() => {
    if (persona) {
      
      const personaFormData = getFormData();
      
      if (personaFormData) {
        // Ajustar el tipo de documento basado en el tipo de persona para evitar combinaciones inválidas
        let validDocType = personaFormData.tipoDocumento;
        
        // Si es persona jurídica, solo permitir NIT
        if (personaFormData.tipoPersona === '1' && personaFormData.tipoDocumento !== '06') {
          validDocType = '06'; // Establecer a NIT
        }
        
        // Si es persona natural, no permitir NIT
        if (personaFormData.tipoPersona === '0' && personaFormData.tipoDocumento === '06') {
          validDocType = '03'; // Establecer a Cédula de Ciudadanía por defecto
        }
        
        setFormData(prev => {
          const nombre = personaFormData.nombre || prev.nombre;
          const apellido = personaFormData.apellido || prev.apellido;
          const nombreCompleto = `${nombre} ${apellido}`.trim();

          return {
            ...prev,
            tipoPersona: personaFormData.tipoPersona || prev.tipoPersona,
            tipoDocumento: validDocType || prev.tipoDocumento,
            numeroIdentificacion: personaFormData.numeroIdentificacion || prev.numeroIdentificacion,
            nombre: nombre,
            apellido: apellido,
            nombreCompleto: nombreCompleto,
            telefono: personaFormData.telefono || prev.telefono,
            email: personaFormData.email || prev.email,
            direccion: personaFormData.direccion || prev.direccion
          };
        });
      }
    }
  }, [persona, getFormData]);
  
  // Mostrar error si hay problemas al procesar el pago
  useEffect(() => {
    if (paymentError) {
      console.error('[PSE_integration] - Error al procesar pago:', paymentError);
      setErrorMessage(`Error al procesar el pago: ${paymentError}`);
      setShowErrorAlert(true);
      setIsLoading(false); // Asegurarse de ocultar el loader
    }
  }, [paymentError]);
  
  // Redireccionar automáticamente cuando se recibe la URL
  useEffect(() => {
    if (redirectUrl && isLoading) {
      // Pequeña demora para asegurar una buena experiencia de usuario
      const redirectTimer = setTimeout(() => {
        redirectToPayment();
      }, 1000);
      
      return () => clearTimeout(redirectTimer);
    }
    
    // Devolver una función vacía cuando no se cumple la condición
    return () => {};
  }, [redirectUrl, isLoading, redirectToPayment]);
  
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
          tipoDocumento: '06' // Establecer NIT para persona jurídica
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
    
    
    if (name === 'nombreCompleto') {
      // Separar nombre completo en nombre y apellido
      const partes = value.trim().split(' ');
      const nombre = partes[0] || '';
      const apellido = partes.slice(1).join(' ') || '';
      
      setFormData(prev => ({
        ...prev,
        nombreCompleto: value,
        nombre: nombre,
        apellido: apellido
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Limpiar errores cuando el usuario empiece a escribir
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
    
    // Limpiar errores de nombre y apellido cuando se edita nombreCompleto
    if (name === 'nombreCompleto') {
      setErrors(prev => ({
        ...prev,
        nombre: false,
        apellido: false
      }));
    }
  };

  // Obtener las opciones de tipo de documento filtradas según el tipo de persona
  const getFilteredDocumentTypeOptions = () => {
    
    
    if (formData.tipoPersona === '1') { // Persona Jurídica
      // Solo permitir NIT
      return tipoDocumentoOptions.filter(option => option.value === '06');
    } else if (formData.tipoPersona === '0') { // Persona Natural
      // Permitir todos menos NIT
      return tipoDocumentoOptions.filter(option => option.value !== '06');
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
      banco: !formData.banco,
      tipoPersona: !formData.tipoPersona,
      tipoDocumento: !formData.tipoDocumento,
      numeroIdentificacion: !formData.numeroIdentificacion,
      nombre: !formData.nombre,
      apellido: !formData.apellido,
      telefono: !formData.telefono,
      email: !formData.email || !/\S+@\S+\.\S+/.test(formData.email),
      valorTotal: !formData.valorTotal || isNaN(Number(formData.valorTotal)) || Number(formData.valorTotal) <= 0
    };
    
    // Validación adicional para el tipo de documento según el tipo de persona
    if (formData.tipoPersona === '1' && formData.tipoDocumento !== '06') {
      newErrors.tipoDocumento = true;
      // Mostrar mensaje de error específico
      setErrorMessage('Para Persona Jurídica solo puede seleccionar NIT como tipo de documento.');
      setShowErrorAlert(true);
    } else if (formData.tipoPersona === '0' && formData.tipoDocumento === '06') {
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
     
    // Obtener datos del sessionStorage para comparación 
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
      
      
      // Preparar parámetros para el pago PSE
      const paymentParams: CreatePsePaymentParams = {
        amount,
        bankCode: formData.banco,
        personType: formData.tipoPersona as '0' | '1',
        documentType: formData.tipoDocumento,
        documentNumber: formData.numeroIdentificacion,
        name: formData.nombre,
        lastName: formData.apellido,
        email: formData.email,
        phoneNumber: formData.telefono,
        address: formData.direccion || 'Sin dirección',
        description: formData.descripcion || 'Pago Federación Nacional de Cacaoteros'
      };
         
      // Obtener el nro_doc_pago para usar como order_id
      // let orderIdToUse = `FEDECACAO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // if (storedPaymentData) {
      //   const paymentData = JSON.parse(storedPaymentData);
      //   if (paymentData.nro_doc_pago) {
      //     orderIdToUse = paymentData.nro_doc_pago;
      //   }
      // }
      
      
      // Calcular IVA
      // const ivaCalculado = Math.round(paymentParams.amount * 19 / 119);
      
        // // Mostrar cómo se verá exactamente el payload final que se enviará a OpenPay
        // const finalPayload = {
        //   method: 'bank_account',
        //   amount: paymentParams.amount,
        //   description: paymentParams.description,
        //   order_id: orderIdToUse,
        //   currency: 'COP',
        //   iva: ivaCalculado.toString(),
        //   customer: {
        //     name: paymentParams.name,
        //     last_name: paymentParams.lastName,
        //     email: paymentParams.email,
        //     phone_number: paymentParams.phoneNumber,
        //     address: paymentParams.address
        //   },
        //   redirect_url: `${window.location.origin}/pse-resultado?reference=${orderIdToUse}`,
        //   capture: {
        //     bankCode: paymentParams.bankCode,
        //     document: {
        //       person_type: paymentParams.personType,
        //       document_type: paymentParams.documentType,
        //       document_number: paymentParams.documentNumber
        //     }
        //   }
        // };
         
      // Crear el pago PSE usando el hook
      const success = await createPayment(paymentParams);
      
      if (!success) {
        setIsLoading(false);
      } 
    } catch (error) {
      console.error('💥 ERROR INESPERADO AL PROCESAR PAGO:', error);
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
    resetBanksError();
    resetPersonaError();
    resetPaymentError(); // Agregar reset de errores de pago
    setShowErrorAlert(false);
  };

  // Si aún está cargando la sesión, mostrar un loader
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className="w-12 h-12 border-4 border-[#4D750F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
        <h3 className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
          PAGO EN LÍNEA CUOTA DE FOMENTO CACAOTERO
        </h3>
        
        {/* Logos */}
        <div className={`flex justify-between items-center mb-10 px-8 py-6 rounded-lg ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e] border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="w-2/5 flex flex-col items-center">
            <Logo />
          </div>
          <div className="flex-grow flex justify-center">
            <div className={`h-16 w-0.5 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
          </div>
          <div className="w-2/5 flex flex-col items-center">
            <LogoPSE />
          </div>
        </div>
        
        {/* Muestra mensaje cuando hay error al cargar los bancos pero con opción de reintento */}
        {banksError && (
          <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-[#3a1a05] text-white' : 'bg-red-50 text-red-700'}`}>
            <div className="flex flex-wrap items-center justify-between">
              <p>
                <span className="font-bold">Error:</span> No se pudieron cargar los bancos.
              </p>
              <button 
                onClick={refreshBanks}
                className={`px-3 py-1 rounded-md ${theme === 'dark' ? 'bg-white text-[#3a1a05]' : 'bg-white text-red-700 border border-red-300'} hover:opacity-90`}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
        
        {/* Indicador de carga de datos de la persona */}
        {isLoadingPersona && (
          <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-[#3a1a05] text-white' : 'bg-blue-50 text-blue-700'}`}>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
              <p>Cargando sus datos personales...</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Banco - CAMPO EDITABLE */}
          <div className="col-span-1 relative">
            <AnimatedSelect
              label="Banco *"
              name="banco"
              value={formData.banco}
              onChange={handleSelectChange}
              options={getBankOptions()}
              error={errors.banco}
            />
            {isLoadingBanks ? (
              <div className="flex items-center mt-1 text-xs text-[#562707]">
                <div className="w-3 h-3 mr-1 border-2 border-t-transparent border-[#562707] rounded-full animate-spin"></div>
                Cargando bancos...
              </div>
            ) : null}
          </div>
          
          {/* Tipo de Persona - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedSelect
              label="Tipo de Persona *"
              name="tipoPersona"
              value={formData.tipoPersona}
              onChange={handleSelectChange}
              options={tipoPersonaOptions}
              error={errors.tipoPersona}
            />
          </div>
          
          {/* Tipo de Documento - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedSelect
              label="Tipo de Documento *"
              name="tipoDocumento"
              value={formData.tipoDocumento}
              onChange={handleSelectChange}
              options={getFilteredDocumentTypeOptions()}
              error={errors.tipoDocumento}
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
            />
          </div>
          
          {/* Nombres y Apellidos - CAMPO EDITABLE UNIFICADO */}
          <div className="col-span-1">
            <AnimatedInput
              label="Nombres y Apellidos *"
              name="nombreCompleto"
              value={`${formData.nombre} ${formData.apellido}`.trim()}
              onChange={handleInputChange}
              type="text"
              error={errors.nombre || errors.apellido}
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
            />
          </div>
          
          {/* Correo Electrónico - CAMPO EDITABLE */}
          <div className="col-span-1">
            <AnimatedInput
              label="Correo Electrónico *"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              type="email"
              error={errors.email}
            />
          </div>
          
          {/* Número de Documento de Pago - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="Nº DOCUMENTO DE PAGO"
              value={formData.nroDocPago}
            />
          </div>
          
          {/* Descripción - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="DESCRIPCIÓN"
              value={formData.descripcion}
            />
          </div>
          
          {/* Valor Cuota Fomento - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="VALOR CUOTA FOMENTO CACAOTERO"
              value={formData.valorCuota}
              type="currency"
            />
          </div>
          
          {/* Intereses de Mora - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="INTERESES DE MORA"
              value={formData.valorIntereses}
              type="currency"
            />
          </div>
          
          {/* Total a Pagar - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="TOTAL A PAGAR"
              value={formData.valorTotal}
              type="currency"
              error={errors.valorTotal}
            />
          </div>
          
          {/* Moneda (COP) - CAMPO NO EDITABLE (por seguridad) */}
          <div className="col-span-1">
            <SecureInput
              label="Moneda"
              value={formData.moneda}
            />
          </div>
        </div>
      
        
        {/* Botón de Pagar */}
        <div className="flex justify-center mt-8">
          <Button
            title="Pagar"
            onClick={handleSubmit}
            className="bg-[#4D750F] hover:bg-[#3a5a0a] w-40"
            loading={isLoadingBanks}
            disabled={isLoadingBanks}
          />
        </div>
      </div>

      {/* Alerta de Confirmación */}
      <AlertQuestion
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmPayment}
        questionText={`¿Está seguro que desea realizar el pago por ${formatCurrency(formData.valorTotal)}? Una vez confirmado, será redirigido a la pasarela de pago PSE.`}
      />
      
      {/* Loader mientras se procesa el pago */}
      <AlertLoader
        isOpen={isLoading}
        loadingText="Procesando su solicitud de pago. Por favor espere mientras lo redirigimos a la plataforma PSE..."
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

