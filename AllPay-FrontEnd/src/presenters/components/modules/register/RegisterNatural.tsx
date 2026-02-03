'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import ModalAddress from '../../shared/ModalAddress';
import Swal from 'sweetalert2';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter, useSearchParams } from 'next/navigation';

let date = new Date();
date.setFullYear(date.getFullYear() - 0);

const valid = /^\w+([.-_+]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/;
const validPass = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*\-]).{8,}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const steps = ['Datos Básicos', 'Notificación Nacional', 'Notificación', 'Datos de Acceso'];

const RegisterNaturalForm = ({
  app,
  tipoUsuario,
  currentStep,
  dataPaisNacimiento,
  dataGenero,
  dataDepartamento,
  dataCiudad,
  setTypePerson,
  setTypeDocument,
  obtenerDepartamento,
  obtenerCiudad,
  setCurrentStep,
  setError,
  typePerson,
  typeDocument,
  document,
  setDocument,
  dataDepartamentoNotificacion,
  dataCiudadNotificacion,
  handleModalPolitica,
  loading,
  handleSubmit,
  getTiposComprador
}: {
  getTiposComprador: any;
  app?: any;
  tipoUsuario?: any;
  currentStep: number;
  dataPaisNacimiento: any[];
  dataGenero: any[];
  dataDepartamento: any[];
  dataCiudad: any[];
  setTypePerson: any;
  setTypeDocument: any;
  obtenerDepartamento: any;
  obtenerCiudad: any;
  setCurrentStep: any;
  setError: any;
  typePerson: { value: string; error: boolean };
  typeDocument: { value: string; error: boolean };
  document: { value: string; error: boolean };
  setDocument: any;
  dataDepartamentoNotificacion: any[];
  dataCiudadNotificacion: any[];
  handleModalPolitica: any;
  loading: boolean;
  handleSubmit: any;
  address?: { value: string | undefined; error: boolean | undefined };
  addressComplete?: { value: string | undefined; error: boolean };
}) => {
  const [formData, setFormData] = useState<any>({
    firstName: { value: '', error: false },
    secondName: { value: '', error: false },
    secondLastName: { value: '', error: false },
    firstLastName: { value: '', error: false },
    birthdate: { value: '', error: false },
    email: { value: '', error: false },
    emailConfirm: { value: '', error: false },
    mobile: { value: '', error: false },
    mobileConfirm: { value: '', error: false },
    address: { value: '', error: false },
    addressComplete: { value: '', error: false },
    documentRepresentant: { value: '', error: false },
    autCorreo: { value: false, error: false },
    autSms: { value: false, error: false },
    autFacturaUnica: { value: false, error: false },
    autPolitica: { value: false, error: false },
    autTratamientoDatos: { value: false, error: false },
    user: { value: '', error: false },
    password: { value: '', error: false },
    password_confirm: { value: '', error: false },
    coordenadaX: { value: '', error: false },
    coordenadaY: { value: '', error: false },
    cod_tipo_comprador: { value: '', error: false },

    addressData: {
      ubicacion: { value: '', error: false },

      viaPrincipal: { value: '', error: false },
      nombreVia: { value: '', error: false },
      letraPrincipal: { value: '', error: false },
      letraPrincipal2: { value: '', error: false },
      prefijoBisPrincipal: { value: '', error: false },
      cordenadaPrincipal: { value: '', error: false },

      viaSecundaria: { value: '', error: false },
      nombreViaSecundaria: { value: '', error: false },
      letraSecundaria: { value: '', error: false },
      letraSecundaria2: { value: '', error: false },
      prefijoBisSecundaria: { value: '', error: false },
      cordenadaSecundaria: { value: '', error: false },

      viaTerciaria: { value: '', error: false },
      nombreViaTerciaria: { value: '', error: false },
      letraTerciaria: { value: '', error: false },
      letraTerciaria2: { value: '', error: false },
      prefijoBisTerciaria: { value: '', error: false },
      cordenadaTerciaria: { value: '', error: false },

      complemento: { value: '', error: false },
      location: { value: false, error: false },
      coordenadaX: { value: '', error: false },
      coordenadaY: { value: '', error: false }
    }
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isInterno = searchParams?.get('interno') !== null;

  const [paisNacimiento, setPaisNacimiento] = useState({ value: '', error: false });
  const [paisComercializacion, setPaisComercializacion] = useState({ value: '', error: false });
  const [paisExpedicionDocumento, setPaisExpedicionDocumento] = useState({
    value: '',
    error: false
  });
  const [genero, setGenero] = useState({ value: '', error: false });

  const [ciudad, setCiudad] = useState({ value: '', error: false });
  const [departamento, setDepartamento] = useState({ value: '', error: false });
  const [ciudadNotificacion, setCiudadNotificacion] = useState({ value: '', error: false });
  const [departamentoNotificacion, setDepartamentoNotificacion] = useState({
    value: '',
    error: false
  });

  const [rutFile, setRutFile] = useState<File | null>(null);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);

  const [rutName, setRutName] = useState('');
  const [certificadoName, setCertificadoName] = useState('');
  const [documentoName, setDocumentoName] = useState('');

  const [openModalAddress, setModalAddress] = useState(false);
  const handleModal = () => {
    setModalAddress(!openModalAddress);
  };

  const handleDragOver = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFileSize = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({
        icon: 'error',
        title: 'Archivo demasiado grande',
        text: 'El archivo no debe ser mayor a 5MB',
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });
      return false;
    }
    return true;
  };

  const handleDropDocumento = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length && validateFileSize(files[0])) {
      setDocumentoFile(files[0]);
      setDocumentoName(files[0].name);
    }
  }, []);

  const handleDropRut = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length && validateFileSize(files[0])) {
      setRutFile(files[0]);
      setRutName(files[0].name);
    }
  }, []);

  const handleDropCertificado = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files.length) return;
    if (validateFileSize(files[0])) {
      setCertificadoFile(files[0]);
      setCertificadoName(files[0].name);
    }
  };

  const handleChangeDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    if (e.target.name === 'file-upload') {
      if (validateFileSize(files[0])) {
        setCertificadoFile(files[0]);
        setCertificadoName(files[0].name);
      }
    } else if (e.target.name === 'file-upload2') {
      if (validateFileSize(files[0])) {
        setRutFile(files[0]);
        setRutName(files[0].name);
      }
    } else if (e.target.name === 'file-upload3') {
      if (validateFileSize(files[0])) {
        setDocumentoFile(files[0]);
        setDocumentoName(files[0].name);
      }
    }
  };

  const removeFile = (type: string) => {
    if (type === 'certificado') {
      setCertificadoFile(null);
      setCertificadoName('');
    } else if (type === 'rut') {
      setRutFile(null);
      setRutName('');
    } else if (type === 'documento') {
      setDocumentoFile(null);
      setDocumentoName('');
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      [e.target.name]: {
        ...prevFormData[e.target.name],
        value: e.target.checked,
        error: false
      }
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = e.target;
    if (name === 'tipoPersona') {
      setTypePerson({ value: value, error: false });
    } else if (name === 'tipoDocumento') {
      setTypeDocument({ value: value, error: false });
    } else if (name === 'paisNacimiento') {
      setPaisNacimiento({ ...paisNacimiento, value: e.target.value, error: false });
    } else if (name === 'genero') {
      setGenero({ value: value, error: false });
    } else if (name === 'paisExpedicionDocumento') {
      setPaisExpedicionDocumento({ value: value, error: false });
      obtenerDepartamento(value, currentStep);
    } else if (name === 'departamento') {
      setDepartamento({ value: value, error: false });
      obtenerCiudad(value, currentStep);
    } else if (name === 'ciudad') {
      setCiudad({ value: value, error: false });
    } else if (name === 'paisComercializacion') {
      setPaisComercializacion({ value: value, error: false });
      obtenerDepartamento(value, currentStep);
    } else if (name === 'departamentoNotificacion') {
      setDepartamentoNotificacion({ value: value, error: false });
      obtenerCiudad(value, currentStep);
    } else if (name === 'ciudadNotificacion') {
      setCiudadNotificacion({ value: value, error: false });
    }
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      [name]: {
        ...prevFormData[name],
        value: value,
        error: false
      }
    }));
    setError('');
  };

  

  const validStep1 = () => {
    let error: boolean = false;
    let title: string = '';

    if (document.value === '') {
      error = true;
      title = 'Revise el formulario';
      setDocument({ value: '', error: true });
    }
    if (formData.firstName.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['firstName']: { value: '', error: true }
      }));
    }
    if (formData.firstLastName.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['firstLastName']: { value: '', error: true }
      }));
    }

    if (formData.birthdate.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['birthdate']: { value: '', error: true }
      }));
    }
    if (new Date(formData.birthdate.value) > date) {
      error = true;
      title = 'Fecha no puede ser futura';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['birthdate']: { value: formData.birthdate.value, error: true }
      }));
    }
    if (typeDocument.value === '') {
      error = true;
      title = 'Revise el formulario';
      setTypeDocument({ value: '', error: true });
    }
    if (typePerson.value === '') {
      error = true;
      title = 'Revise el formulario';
      setTypePerson({ value: '', error: true });
    }
    if (paisNacimiento.value === '') {
      error = true;
      title = 'Revise el formulario';
      setPaisNacimiento({ value: '', error: true });
    }
    if (genero.value === '') {
      error = true;
      title = 'Revise el formulario';
      setGenero({ value: '', error: true });
    }
    if (paisExpedicionDocumento.value === '') {
      error = true;
      title = 'Revise el formulario';
      setPaisExpedicionDocumento({ value: '', error: true });
    }
    if (departamento.value === '') {
      error = true;
      title = 'Revise el formulario';
      setDepartamento({ value: '', error: true });
    }
    if (ciudad.value === '') {
      error = true;
      title = 'Revise el formulario';
      setCiudad({ value: '', error: true });
    }

    if (error) {
      return { error: true, message: title };
    }
    return { error: false, message: '' };
  };

  const validStep2 = () => {
    let error: boolean = false;
    let title: string = '';
    if (!valid.test(formData.email.value)) {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['email']: { value: formData.email.value, error: true }
      }));
    }
    if (formData.email.value !== formData.emailConfirm.value) {
      error = true;
      title = 'Los email no son inguales';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['emailConfirm']: { value: formData.emailConfirm.value, error: true }
      }));
    }
    if (formData.coordenadaX.value === '' && formData.coordenadaY.value === '') {
      if (formData.address.value === '' || formData.address.value.trim().length < 8) {
        error = true;
        title = 'Revise el formulario';
        setFormData((prevFormData: any) => ({
          ...prevFormData,
          ['address']: { value: '', error: true }
        }));
      }
    }
    if (formData.mobile.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['mobile']: { value: '', error: true }
      }));
    }
    if (formData.mobile.value !== formData.mobileConfirm.value) {
      error = true;
      title = 'Confirmación de celular no es igual';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['mobileConfirm']: { value: formData.mobileConfirm.value, error: true }
      }));
    }
    if (paisComercializacion.value === '') {
      error = true;
      title = 'Revise el formulario';
      setPaisComercializacion({ value: '', error: true });
    }
    if (ciudadNotificacion.value === '') {
      error = true;
      title = 'Revise el formulario';
      setCiudadNotificacion({ value: '', error: true });
    }
    if (departamentoNotificacion.value === '') {
      error = true;
      title = 'Revise el formulario';
      setDepartamentoNotificacion({ value: '', error: true });
    }
    if (error) {
      return { error: true, message: title };
    }
    return { error: false, message: '' };
  };

  const validStep3 = () => {
    let error: boolean = false;
    let title: string = '';

    // El tipo de comprador ya no es obligatorio
    // if (!formData.cod_tipo_comprador.value) {
    //   error = true;
    //   title = 'Debe seleccionar al menos un tipo de comprador';
    // }
    if (!formData.autTratamientoDatos.value) {
      error = true;
      title = 'Para continuar debe autorizar tratamiento de datos';
    }
    if (!formData.autPolitica.value) {
      error = true;
      title = 'Para continuar debe aceptar la Política de Privacidad';
    }
    if (!formData.autFacturaUnica.value) {
      error = true;
      title = 'Para continuar debe autorizar el uso de la factura única Nacional';
    }

    // SOLO validar archivos si tipoUsuario !== 'I'
    if (tipoUsuario !== 'I') {
      if (!rutFile) {
        error = true;
        title = 'Debe cargar RUT';
      } else if (!certificadoFile) {
        error = true;
        title = 'Debe cargar Certificado';
      } else if (!documentoFile) {
        error = true;
        title = 'Debe cargar Documento';
      }
    }

    if (error) {
      return { error: true, message: title };
    }
    return { error: false, message: '' };
  };

  const validStep4 = () => {
    let error: boolean = false;
    let title: string = '';

    if (formData.user.value.trim().length < 6) {
      error = true;
      title = 'El nombre de usuario debe tener mínimo 6 caracteres';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['user']: { value: formData.user.value, error: true }
      }));
    }

    if (validPass.test(formData.password.value) && formData.password.value.trim().length > 5) {
      if (formData.password.value !== formData.password_confirm.value) {
        error = true;
        title = 'Contraseñas no son iguales';
        setFormData((prevFormData: any) => ({
          ...prevFormData,
          ['password']: { value: formData.password.value, error: true },
          ['password_confirm']: { value: formData.password_confirm.value, error: true }
        }));
      }
    } else {
      error = true;
      title = 'Contraseña no cumple con los requisitos minimos';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['password']: { value: formData.password.value, error: true },
        ['password_confirm']: { value: formData.password_confirm.value, error: true }
      }));
    }

    if (error) {
      return { error: true, message: title };
    }
    return { error: false, message: '' };
  };

  const handleNext = () => {
    let error = false;
    let title = '';
    if (currentStep === 1) {
      const value = validStep1();
      error = value.error;
      title = value.message;
    } else if (currentStep === 2) {
      const value = validStep2();
      error = value.error;
      title = value.message;
    } else if (currentStep === 3) {
      const value = validStep3();
      error = value.error;
      title = value.message;
    }
    if (!error) {
      setCurrentStep((currentStep: number) => currentStep + 1);
      setError('');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: title,
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });
    }
  };

  const handleBack = () => {
    setCurrentStep((currentStep: number) => currentStep - 1);
  };

  useEffect(() => {
    const paisColombia = dataPaisNacimiento.find(
      (pais) => pais.nombre.trim().toUpperCase() === 'COLOMBIA'
    );
    if (paisColombia) {
      setPaisNacimiento((prev) => ({ ...prev, value: paisColombia.cod_pais }));
      setPaisExpedicionDocumento({ value: paisColombia.cod_pais, error: false });
      setPaisComercializacion({ value: paisColombia.cod_pais, error: false });
      obtenerDepartamento(paisColombia.cod_pais, currentStep);
      obtenerDepartamento(paisColombia.cod_pais, 2);
    }
  }, [dataPaisNacimiento]);

  const submit = () => {
    const value: any = validStep4();

    // let url = `${protocol}//${host}`;

    // El tipo de comprador ya no es obligatorio
    // const isTipoCompradorSelected = formData.cod_tipo_comprador.value;
    // if (!isTipoCompradorSelected) {
    //   Swal.fire({
    //     title: 'Error',
    //     text: 'Debe seleccionar al menos un tipo de comprador  ',
    //     icon: 'error',
    //     confirmButtonColor: '#4D750F',
    //     confirmButtonText: 'Aceptar'
    //   });
    //   return; 
    // }
    if (!value.error) {
      let data = new FormData();
      data.append('numero_documento', document.value);
      data.append('municipio_residencia', ciudadNotificacion.value);
      data.append('cod_municipio_notificacion_nal', ciudadNotificacion.value);
      data.append(
        'direccion_notificaciones',
        `${formData.address.value} ${formData.addressComplete.value}`
      );
      data.append('tipo_documento', typeDocument.value);
      data.append('tipo_persona', typePerson.value);
      data.append('primer_nombre', formData.firstName.value);
      if (formData.secondName.value) {
        data.append('segundo_nombre', formData.secondName.value);
      }
      data.append('primer_apellido', formData.firstLastName.value);
      if (formData.secondLastName.value) {
        data.append('segundo_apellido', formData.secondLastName.value);
      }
      data.append('fecha_nacimiento', formData.birthdate.value);
      data.append('pais_nacimiento', paisNacimiento.value);
      data.append('sexo', genero.value);
      data.append(
        'direccion_residencia',
        `${formData.address.value} ${formData.addressComplete.value}`
      );

      const formatCoordinate = (value: any) => {
        if (!value) return '';
        let num = parseFloat(value);
        if (isNaN(num)) return '';
        return num.toFixed(6);
      };

      if (formData.coordenadaX.value) {
        const coordenadaXFormatted = formatCoordinate(formData.coordenadaX.value);
        data.append('coordenada_x', coordenadaXFormatted);
      }

      if (formData.coordenadaY.value) {
        const coordenadaYFormatted = formatCoordinate(formData.coordenadaY.value);
        data.append('coordenada_y', coordenadaYFormatted);
      }

      data.append('email', formData.email.value);
      data.append('telefono_celular', formData.mobile.value);
      data.append('acepta_notificacion_email', formData.autCorreo.value);
      data.append('acepta_notificacion_sms', formData.autSms.value);
      data.append('acepta_tratamiento_datos', formData.autTratamientoDatos.value);
      data.append('cod_municipio_expedicion_id', ciudad.value);
      data.append('nombre_de_usuario', formData.user.value);
      data.append('password', formData.password.value);
      data.append('confirmar_password', formData.password_confirm.value);

      // 🔥 Agregar los tipos de comprador seleccionados
      // Si es interno, enviar como null; de lo contrario, enviar el valor si existe
      if (isInterno) {
        data.append('cod_tipo_comprador', 'null');
      } else if (formData.cod_tipo_comprador.value) {
        data.append('cod_tipo_comprador', formData.cod_tipo_comprador.value);
      }

      // 👉 SOLO enviamos archivos si tipoUsuario !== 'I'
      if (tipoUsuario !== 'I') {
        if (rutFile) {
          data.append('archivo_rut', rutFile);
        }
        if (certificadoFile) {
          data.append('camaraComercio', certificadoFile);
        }
        if (documentoFile) {
          data.append('documentoRepresentante', documentoFile);
        }
      }

      // data.append('redirect_url', `${url}/auth/signin/`);

      // handleSubmit(data);
      handleSubmit(data, app);

      Swal.fire({
        icon: 'warning',
        title: 'Registro en proceso',
        text: 'Se estan verificando sus datos, espere un momento.',
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });

    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: value.message,
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });
    }
  };

  const [tiposComprador, setTiposComprador] = useState<{ code: string; label: string }[]>([]);

  useEffect(() => {
    const cargarTiposComprador = async () => {
      try {
        const data = await getTiposComprador();
        setTiposComprador(data);
      } catch (error) {
        console.error('Error al cargar tipos de comprador:', error);
      }
    };

    cargarTiposComprador();
  }, []);
  const handleTipoCompradorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    let seleccionados = formData.cod_tipo_comprador.value.split('|').filter(Boolean);

    if (checked) {
      if (!seleccionados.includes(value)) {
        seleccionados.push(value);
      }
    } else {
      seleccionados = seleccionados.filter((item: string) => item !== value);
    }

    setFormData((prev: any) => ({
      ...prev,
      cod_tipo_comprador: { value: seleccionados.join('|'), error: false }
    }));
  };

  return (
    <div className="p-1">
      <div className={`m-auto w-full rounded-2xl p-6 shadow-lg ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
        <div className={`rounded-xl p-4 shadow-xl ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}>
          <header className="relative mt-[55px] mb-6 flex flex-col items-center space-y-6 lg:mb-10 lg:w-full lg:flex-row lg:justify-center lg:space-y-0 lg:px-10 lg:py-4">
            {/* Contenedor del título (realmente centrado) */}
            <div className="w-max text-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:transform">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'} sm:text-3xl`}>
                {AuthResource.RegisterNatural}
              </h2>
            </div>

            {/* Contenedor del botón (alineado a la derecha en lg) */}
            {!app && (
              <div className="lg:absolute lg:right-10">
                <Button onClick={() => router.push('/auth/signin/')} title="Iniciar sesión" />
              </div>
            )}
          </header>

          {/* barra de progreso */}
          <div
            className="mb-10 flex items-center justify-between md:mb-15"
            style={{ marginLeft: '15%' }}
          >
            {typePerson.value === 'N' && (
              <div data-dui-stepper-container data-dui-initial-step="1" className="w-full">
                <div className="flex w-full items-center justify-between">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      data-dui-step
                      className={`group flex w-full items-center ${currentStep === i + 1 ? 'data-[active=true]' : ''} ${currentStep > i + 1 ? 'data-[completed=true]' : ''}`}
                    >
                      <div className="relative">
                        <span
                          className={`relative grid h-5 w-5 place-items-center rounded-full bg-[#4D750F] ${currentStep === i + 1 ? 'text-white' : ''} ${currentStep > i + 1 ? 'text-white' : ''}`}
                        >
                          {currentStep > i + 1 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="15"
                              height="15"
                              viewBox="0,0,256,256"
                            >
                              <g fill="#ffffff">
                                <g transform="scale(8.53333,8.53333)">
                                  <path d="M26.98047,5.99023c-0.2598,0.00774-0.50638,0.11632-0.6875,0.30273l-15.29297,15.29297l-6.29297-6.29297c-0.25082-0.26124-0.62327-0.36647-0.97371-0.27511c-0.35044,0.09136-0.62411,0.36503-0.71547,0.71547c-0.09136,0.35044 0.01388,0.72289 0.27511,0.97371l7,7c0.39053,0.39037 1.02353,0.39037 1.41406,0l16-16c0.29576-0.28749 0.38469-0.72707 0.22393-1.10691c-0.16075-0.37985-0.53821-0.62204-0.9505-0.60988z" />
                                </g>
                              </g>
                            </svg>
                          )}
                          {currentStep < i + 1 && (
                            <svg viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="30" fill="#ffffff" />
                            </svg>
                          )}
                        </span>
                        {currentStep !== 5 && (
                          <span className={`absolute -start-8 -bottom-6 text-sm whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                            <span className="hidden lg:block">{step}</span>
                          </span>
                        )}
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={`h-1 flex-1 bg-[#4D750F] ${currentStep > i + 1 ? 'bg-[#4D750F]' : ''}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* formulario */}
          {currentStep === 1 && (
            <div className="px-6 py-2">
              <div className="mb-6">
                <label className={`mb-6 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                  {AuthResource.RegisterBasic}
                </label>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <AnimatedInput
                      type="text"
                      id="firstName"
                      name="firstName"
                      label={AuthResource.RegisterBasicFirstName}
                      value={formData.firstName.value}
                      onChange={(e) => handleChange(e)}
                      error={formData.firstName.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                  <div>
                    <AnimatedInput
                      type="text"
                      id="secondName"
                      name="secondName"
                      label={AuthResource.RegisterBasicSecondName}
                      value={formData.secondName.value}
                      onChange={(e) => handleChange(e)}
                      error={formData.secondName.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <AnimatedInput
                      type="text"
                      id="firstLastName"
                      name="firstLastName"
                      label={AuthResource.RegisterBasicFirstLastName}
                      value={formData.firstLastName.value}
                      onChange={(e) => handleChange(e)}
                      error={formData.firstLastName.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                  <div>
                    <AnimatedInput
                      type="text"
                      id="secondLastName"
                      name="secondLastName"
                      label={AuthResource.RegisterBasicSecondLastName}
                      value={formData.secondLastName.value}
                      onChange={(e) => handleChange(e)}
                      error={formData.secondLastName.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 md:gap-4">
                  <div>
                    <AnimatedSelect
                      label="Pais de nacimiento"
                      name="paisNacimiento"
                      value={paisNacimiento.value}
                      onChange={handleSelectChange}
                      options={dataPaisNacimiento.map((value, index) => ({
                        key: index,
                        value: value.cod_pais,
                        title: value.nombre
                      }))}
                      error={paisNacimiento.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                  <div className="mt-4 md:mt-0">
                    <AnimatedSelect
                      label="Género"
                      name="genero"
                      value={genero.value}
                      onChange={(e) => handleSelectChange(e)}
                      options={dataGenero.map((item) => ({
                        key: item.cod_sexo,
                        value: item.cod_sexo,
                        title: item.nombre
                      }))}
                      error={genero.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className={`mb-6 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                  Lugar de expedición del documento
                </label>

                <div className="grid md:grid-cols-3 md:gap-4">
                  <div>
                    <AnimatedSelect
                      label="Pais de expedición"
                      name="paisExpedicionDocumento"
                      value={paisExpedicionDocumento.value}
                      onChange={(e) => handleSelectChange(e)}
                      options={dataPaisNacimiento.map((item) => ({
                        key: item.cod_pais,
                        value: item.cod_pais,
                        title: item.nombre
                      }))}
                      error={paisExpedicionDocumento.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>

                  <div className="mt-4 md:mt-0">
                    <AnimatedSelect
                      label="Departamento"
                      name="departamento"
                      value={departamento.value}
                      onChange={(e) => handleSelectChange(e)}
                      options={dataDepartamento
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                        .map((item) => ({
                        key: item.cod_departamento,
                        value: item.cod_departamento,
                        title: item.nombre
                      }))}
                      error={departamento.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>

                  <div className="mt-4 md:mt-0">
                    <AnimatedSelect
                      label="Ciudad"
                      name="ciudad"
                      value={ciudad.value}
                      onChange={(e) => handleSelectChange(e)}
                      options={dataCiudad
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                        .map((item) => ({
                        key: item.cod_municipio,
                        value: item.cod_municipio,
                        title: item.nombre
                      }))}
                      error={ciudad.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  className={`mb-6 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                  htmlFor="birthdate"
                >
                  Fecha de nacimiento
                </label>

                <AnimatedInput
                  type="date"
                  id="birthdate"
                  name="birthdate"
                  label={AuthResource.Birthdate}
                  value={formData.birthdate.value}
                  onChange={(e) => handleChange(e)}
                  error={formData.birthdate.error}
                  maxDate={new Date().toISOString().split('T')[0]}
                  darkMode={theme === 'dark'}
                />
              </div>

              <div className="mt-4 flow-root justify-between">
                <Button onClick={() => handleNext()} title="Siguiente" className="float-right" />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="px-6 py-2">
              <h3 className={`text-1xl mb-6 text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                {AuthResource.RegisterNational}
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <AnimatedSelect
                    label="Pais de comercialización"
                    name="paisComercializacion"
                    value={paisComercializacion.value}
                    onChange={(e) => handleSelectChange(e)}
                    options={dataPaisNacimiento.map((value: any, index: number) => ({
                      key: index,
                      value: value.cod_pais,
                      title: value.nombre
                    }))}
                    error={paisComercializacion.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedSelect
                    label="Departamento"
                    name="departamentoNotificacion"
                    value={departamentoNotificacion.value}
                    onChange={(e) => handleSelectChange(e)}
                    options={dataDepartamentoNotificacion
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map((value: any, index: number) => ({
                      key: index,
                      value: value.cod_departamento,
                      title: value.nombre
                    }))}
                    error={departamentoNotificacion.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedSelect
                    label="Ciudad"
                    name="ciudadNotificacion"
                    value={ciudadNotificacion.value}
                    onChange={(e) => handleSelectChange(e)}
                    options={dataCiudadNotificacion
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map((value: any, index: number) => ({
                      key: index,
                      value: value.cod_municipio,
                      title: value.nombre
                    }))}
                    error={ciudadNotificacion.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="mt-4 mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <AnimatedInput
                    type="text"
                    id="address"
                    readOnly
                    name="address"
                    label={AuthResource.RegisterBasicAddress}
                    value={formData.address.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.address.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedInput
                    type="text"
                    readOnly
                    id="addressComplete"
                    name="addressComplete"
                    label={AuthResource.RegisterBasicAddressComp}
                    value={formData.addressComplete.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.addressComplete.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-1">
                <div>
                  <Button
                    onClick={() => handleModal()}
                    title="Generar Dirección"
                    className="float-right"
                  />
                </div>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <AnimatedInput
                    type="text"
                    id="email"
                    name="email"
                    label={AuthResource.RegisterBasicEmail}
                    value={formData.email.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.email.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedInput
                    type="text"
                    id="emailConfirm"
                    name="emailConfirm"
                    label={AuthResource.RegisterBasicEmailConfirm}
                    value={formData.emailConfirm.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.emailConfirm.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <AnimatedInput
                    type="number"
                    id="mobile"
                    name="mobile"
                    label={AuthResource.RegisterBasicCelular}
                    value={formData.mobile.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.mobile.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedInput
                    type="number"
                    id="mobileConfirm"
                    name="mobileConfirm"
                    label={AuthResource.RegisterBasicCelularConfirm}
                    value={formData.mobileConfirm.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.mobileConfirm.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="mt-4 md:flow-root justify-between hidden">
                <Button onClick={() => handleNext()} title="Siguiente" className="float-right" />

                <Button onClick={() => handleBack()} title="Anterior" className="float-left" />
              </div>

              <div className="mt-4 flow-root justify-between md:hidden">
                <Button onClick={() => handleNext()} title="Siguiente" className="float-right" />

                <Button onClick={() => handleBack()} title="Volver" className="float-left" />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="px-6 py-2">
              <div className="mb-6">
                {tipoUsuario !== 'I' && (
                  <h3 className={`text-1xl text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                    {AuthResource.RegisterDocumentArchive}
                  </h3>
                )}
                <div className="grid gap-4 md:grid-cols-3">
                  {tipoUsuario !== 'I' && (
                    <>
                      {/* Certificado */}
                      <div>
                        <div className="col-span-full">
                          <label
                            htmlFor="cover-photo"
                            className={`block text-sm/6 font-medium ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                          >
                            Certificado de existencia y representante legal
                          </label>
                          <div
                            className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10"
                            onDrop={handleDropCertificado}
                            onDragOver={handleDragOver}
                          >
                            <div className="text-center">
                              <svg
                                className="mx-auto size-12 text-gray-300"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {!certificadoFile ? (
                                <div className="mt-4 flex items-center text-sm/6 text-gray-600">
                                  <label
                                    htmlFor="file-upload"
                                    className="relative cursor-pointer rounded-md bg-white font-semibold text-[#562707] focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 focus-within:outline-hidden hover:text-[#4D750F]"
                                  >
                                    <span>
                                      {certificadoName
                                        ? certificadoName
                                        : 'Arrastre o suelte su documento aquí'}
                                    </span>
                                    <input
                                      id="file-upload"
                                      name="file-upload"
                                      type="file"
                                      className="sr-only"
                                      onChange={handleChangeDrag}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="mt-4 flex items-center text-sm text-gray-600">
                                  <span className="mr-2">{certificadoName}</span>
                                  <button
                                    type="button"
                                    className="rounded-md bg-[#4D750F] px-2 py-1 text-xs text-white"
                                    onClick={() => removeFile('certificado')}
                                  >
                                    X
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RUT */}
                      <div>
                        <div className="col-span-full">
                          <label
                            htmlFor="cover-photo2"
                            className={`block text-sm/6 font-medium ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                          >
                            Registro Único Tributario - RUT
                          </label>
                          <div
                            className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10"
                            onDrop={handleDropRut}
                            onDragOver={handleDragOver}
                          >
                            <div className="text-center">
                              <svg
                                className="mx-auto size-12 text-gray-300"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {!rutFile ? (
                                <div className="mt-4 flex items-center text-sm/6 text-gray-600">
                                  <label
                                    htmlFor="file-upload2"
                                    className="relative cursor-pointer rounded-md bg-white font-semibold text-[#562707] focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 focus-within:outline-hidden hover:text-[#4D750F]"
                                  >
                                    <span>
                                      {rutName ? rutName : 'Arrastre o suelte su documento aquí'}
                                    </span>
                                    <input
                                      id="file-upload2"
                                      name="file-upload2"
                                      type="file"
                                      className="sr-only"
                                      onChange={handleChangeDrag}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="mt-4 flex items-center text-sm text-gray-600">
                                  <span className="mr-2">{rutName}</span>
                                  <button
                                    type="button"
                                    className="rounded-md bg-[#4D750F] px-2 py-1 text-xs text-white"
                                    onClick={() => removeFile('rut')}
                                  >
                                    X
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Documento Identidad */}
                      <div>
                        <div className="col-span-full">
                          <label
                            htmlFor="cover-photo3"
                            className={`block text-sm/6 font-medium ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                          >
                            Documento Identidad Representante Legal
                          </label>
                          <div
                            className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10"
                            onDrop={handleDropDocumento}
                            onDragOver={handleDragOver}
                          >
                            <div className="text-center">
                              <svg
                                className="mx-auto size-12 text-gray-300"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {!documentoFile ? (
                                <div className="mt-4 flex items-center text-sm/6 text-gray-600">
                                  <label
                                    htmlFor="file-upload3"
                                    className="relative cursor-pointer rounded-md bg-white font-semibold text-[#562707] focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 focus-within:outline-hidden hover:text-[#4D750F]"
                                  >
                                    <span>
                                      {documentoName
                                        ? documentoName
                                        : 'Arrastre o suelte su documento aquí'}
                                    </span>
                                    <input
                                      id="file-upload3"
                                      name="file-upload3"
                                      type="file"
                                      className="sr-only"
                                      onChange={handleChangeDrag}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="mt-4 flex items-center text-sm text-gray-600">
                                  <span className="mr-2">{documentoName}</span>
                                  <button
                                    type="button"
                                    className="rounded-md bg-[#4D750F] px-2 py-1 text-xs text-white"
                                    onClick={() => removeFile('documento')}
                                  >
                                    X
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Ocultar sección de Tipo de Comprador si hay ?interno en la URL */}
              {!isInterno && (
                <div>
                  <h3 className={`text-1xl mb-4 text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                    Tipo de Comprador
                  </h3>
                  <div className="grid gap-1 md:grid-cols-1">
                    {tiposComprador?.map((tipo) => (
                      <div key={tipo?.code} className="ml-4">
                        <input
                          type="checkbox"
                          id={tipo?.code}
                          value={tipo?.code}
                          onChange={handleTipoCompradorChange}
                          checked={formData?.cod_tipo_comprador?.value.split('|').includes(tipo?.code)}
                          className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          style={{ marginRight: '10px', marginTop: '10px' }}
                        />
                        <label htmlFor={tipo?.code} className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                          {tipo?.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className={`text-1xl mt-4 mb-4 text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                  {AuthResource.RegisterAutorization}
                </h3>
                <div className="grid gap-1 md:grid-cols-1">
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      name="autCorreo"
                      id="autCorreo"
                      onChange={(e) => handleCheckboxChange(e)}
                      checked={formData.autCorreo.value}
                      className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      style={{ marginRight: '10px', marginTop: '10px' }}
                    />
                    <label htmlFor="autCorreo" className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      ¿Autoriza notificación por correo electrónico?
                    </label>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      name="autSms"
                      id="autSms"
                      onChange={(e) => handleCheckboxChange(e)}
                      checked={formData.autSms.value}
                      className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      style={{ marginRight: '10px' }}
                    />
                    <label htmlFor="autSms" className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      ¿Autoriza notificación informativas a través de mensaje de texto?
                    </label>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      name="autTratamientoDatos"
                      id="autTratamientoDatos"
                      onChange={(e) => handleCheckboxChange(e)}
                      checked={formData.autTratamientoDatos.value}
                      className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      style={{ marginRight: '10px' }}
                    />
                    <label htmlFor="autTratamientoDatos" className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      ¿Autoriza tratamiento de datos?
                    </label>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      name="autPolitica"
                      id="autPolitica"
                      onChange={(e) => handleCheckboxChange(e)}
                      checked={formData.autPolitica.value}
                      className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      style={{ marginRight: '10px' }}
                    />
                    <label htmlFor="autPolitica" className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      ¿Leí y acepto la{' '}
                      <a
                        className={`font-bold underline ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                        onClick={() => handleModalPolitica()}
                      >
                        Política de Privacidad
                      </a>
                      ?
                    </label>
                  </div>

                  <h3 className={`text-1xl text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                    ¿{AuthResource.RegisterFactUnica}?
                  </h3>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      name="autFacturaUnica"
                      id="autFacturaUnica"
                      onChange={(e) => handleCheckboxChange(e)}
                      checked={formData.autFacturaUnica.value}
                      className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      style={{ marginRight: '10px', marginTop: '10px' }}
                    />
                  <label htmlFor="autFacturaUnica" className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      ¿Autoriza uso de la Factura Única Nacional?
                    </label>
                  </div>
                </div>

                <div className="mt-4 flow-root justify-between">
                  <Button onClick={() => handleNext()} title="Siguiente" className="float-right" />

                  <Button onClick={() => handleBack()} title="Anterior" className="float-left" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="px-6 py-2">
              {/* <h3 className='text-left text-[#562707] text-1xl font-bold'>
                {AuthResource.RegisterDatosAcceso}
              </h3> */}
              <p className={`mb-1 text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                {AuthResource.RegisterDatosDescription}
              </p>

              <ul className={`my-6 ml-10 list-disc ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                <li className="mt-1 mb-1">Debe tener mínimo 8 caracteres</li>
                <li className="mt-1 mb-1">Debe tener 1 carácter en mayúscula</li>
                <li className="mt-1 mb-1">Debe tener 1 carácter numérico</li>
                <li className="mt-1 mb-1">Debe tener 1 carácter simbólico (#*%.)</li>
              </ul>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <AnimatedInput
                    type="text"
                    id="user"
                    name="user"
                    label={AuthResource.RegisterBasicUserName}
                    value={formData.user.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.user.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedInput
                    type="password"
                    id="password"
                    name="password"
                    label={AuthResource.Password}
                    value={formData.password.value}
                    onChange={handleChange}
                    error={formData.password.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mb-4">
                  <AnimatedInput
                    type="password"
                    id="password_confirm"
                    name="password_confirm"
                    label={AuthResource.PasswordConfirm}
                    value={formData.password_confirm.value}
                    onChange={handleChange}
                    error={formData.password_confirm.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div className="mt-4 flow-root justify-between">
                  <Button onClick={() => handleBack()} title="Anterior" className="float-left" />

                  <Button
                    onClick={() => submit()}
                    title="Guardar"
                    className="float-right"
                    loading={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <>
              <h3 className={`text-1xl text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                Proceso de registro culminado exitosamente.
              </h3>
              <p className={`text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                Espere a que se verifiquen sus datos y se active su ingreso
              </p>
              <p className={`mt-4 text-center md:mt-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                <a href="/auth/signin" className="font-bold">
                  Salir
                </a>
              </p>
            </>
          )}

          {openModalAddress && (
            <ModalAddress
              title="Generador de direcciones"
              onClose={handleModal}
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterNaturalForm;
