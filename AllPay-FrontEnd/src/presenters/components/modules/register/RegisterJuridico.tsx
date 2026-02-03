'use client';

import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import ModalAddress from '../../shared/ModalAddress';
import Swal from 'sweetalert2';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import CreateEntityModal from '@/presenters/components/modules/register/CreateLegalRepresentative';
import { useRouter, useSearchParams } from 'next/navigation';

let date = new Date();

const valid = /^\w+([.-_+]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/;
const validPass = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*\-]).{8,}$/;

const steps = [
  'Datos Empresariales',
  'Notificación Nacional',
  'Representante Legal',
  'Datos de Acceso'
];

const RegisterJuridicoForm = ({
  // tipoUsuario,
  getTiposComprador,
  app,
  currentStep,
  dataPaisNacimiento,
  setTypePerson,
  setTypeDocument,
  setCurrentStep,
  setError,
  typePerson,
  typeDocument,
  document,
  setDocument,
  dataNatureCompany,
  dataCiudadNotificacion,
  dataDepartamentoNotificacion,
  obtenerDepartamento,
  obtenerCiudad,
  dataTypeDocument,
  buscarRepresentante,
  loading,
  handleModalPolitica,
  handleSubmit
}: {
  getTiposComprador: any;
  app?: any;
  tipoUsuario?: any;
  currentStep: number;
  dataPaisNacimiento: any[];
  setTypePerson: any;
  setTypeDocument: any;
  setCurrentStep: any;
  setError: any;
  typePerson: { value: string; error: boolean };
  typeDocument: { value: string; error: boolean };
  document: { value: string; error: boolean };
  setDocument: any;
  dataNatureCompany: any[];
  dataCiudadNotificacion: any[];
  dataDepartamentoNotificacion: any[];
  obtenerDepartamento: any;
  obtenerCiudad: any;
  dataTypeDocument: any;
  buscarRepresentante: any;
  loading: boolean;
  handleModalPolitica: any;
  dataBuyerCode: any[];
  handleSubmit: any;
  address?: { value: string | undefined; error: boolean | undefined };
  addressComplete?: { value: string | undefined; error: boolean };
}) => {
  const [formData, setFormData] = useState<any>({
    companyName: { value: '', error: false },
    tradeName: { value: '', error: false },
    dateInitRepresentant: { value: '', error: false },
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

  const [companyNationality, setCompanyNationality] = useState({ value: '', error: false });
  const [natureCompany, setNatureCompany] = useState({ value: '', error: false });
  const [nameRepresentant, setNameRepresentant] = useState({ value: '', id: null, error: false });

  const [paisComercializacion, setPaisComercializacion] = useState({ value: '', error: false });
  const [ciudadNotificacion, setCiudadNotificacion] = useState({ value: '', error: false });
  const [departamentoNotificacion, setDepartamentoNotificacion] = useState({
    value: '',
    error: false
  });
  const [typeDocumentRepresentant, setTypeDocumentRepresentant] = useState({
    value: '',
    error: false
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const isInterno = searchParams?.get('interno') !== null;

  const [rutFile, setRutFile] = useState<File>();
  const [certificadoFile, setCertificadoFile] = useState<File>();
  const [documentoFile, setDocumentoFile] = useState<File>();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openModalAddress, setModalAddress] = useState(false);

  const [rutName, setRutName] = useState('');
  const [certificadoName, setCertificadoName] = useState('');
  const [documentoName, setDocumentoName] = useState('');

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const { theme } = useTheme();

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

  const removeFile = (type: string) => {
    if (type === 'certificado') {
      setCertificadoFile(undefined);
      setCertificadoName('');
    } else if (type === 'rut') {
      setRutFile(undefined);
      setRutName('');
    } else if (type === 'documento') {
      setDocumentoFile(undefined);
      setDocumentoName('');
    }
  };

  const handleModal = () => {
    setModalAddress(!openModalAddress);
  };

  const buscar = async () => {
    let error: boolean = false;
    let title: string = '';
    setNameRepresentant({ id: null, value: '', error: false });
    if (typeDocumentRepresentant.value === '') {
      error = true;
      title = 'Revise el formulario';
      setTypeDocumentRepresentant({ value: '', error: true });
    }
    if (formData.documentRepresentant.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['documentRepresentant']: { value: '', error: true }
      }));
    }

    if (!error) {
      let data: any = await buscarRepresentante(
        typeDocumentRepresentant.value,
        formData.documentRepresentant.value
      );
      if (data.value) {
        Swal.fire({
          title: 'Oops...',
          text: `No se encontro representante legal`,
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });
      } else {
        setNameRepresentant({ id: data.id, value: data.name, error: false });
        setError('');
      }
    } else {
      Swal.fire({
        title: 'Error',
        text: title,
        icon: 'error',
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });
    }
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

  const handleDropCertificado = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length && validateFileSize(files[0])) {
      setCertificadoFile(files[0]);
      setCertificadoName(files[0].name);
    }
  }, []);

  const handleDragOver = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChangeDrag = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    if (!validateFileSize(file)) {
      return;
    }

    if (e.target.name === 'file-upload') {
      setCertificadoFile(file);
      setCertificadoName(file.name);
    } else if (e.target.name === 'file-upload2') {
      setRutFile(file);
      setRutName(file.name);
    } else if (e.target.name === 'file-upload3') {
      setDocumentoFile(file);
      setDocumentoName(file.name);
    }
  }, []);

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
    } else if (name === 'natureCompany') {
      setNatureCompany({ value: value, error: false });
    } else if (name === 'companyNationality') {
      setCompanyNationality({ value: value, error: false });
    } else if (name === 'paisComercializacion') {
      setPaisComercializacion({ value: value, error: false });
      obtenerDepartamento(value, currentStep);
    } else if (name === 'departamentoNotificacion') {
      setDepartamentoNotificacion({ value: value, error: false });
      obtenerCiudad(value, currentStep);
    } else if (name === 'ciudadNotificacion') {
      setCiudadNotificacion({ value: value, error: false });
    } else if (name === 'typeDocumentRepresentant') {
      setTypeDocumentRepresentant({ value: value, error: false });
    }
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
    if (formData.companyName.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['companyName']: { value: '', error: true }
      }));
    }
    if (formData.tradeName.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['tradeName']: { value: '', error: true }
      }));
    }
    if (companyNationality.value === '') {
      error = true;
      title = 'Revise el formulario';
      setCompanyNationality({ value: '', error: true });
    }

    if (natureCompany.value === '') {
      error = true;
      title = 'Revise el formulario';
      setNatureCompany({ value: '', error: true });
    }

    if (error) {
      return { error: true, message: title };
    } else {
      return { error: false, message: '' };
    }
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
    } else {
      return { error: false, message: '' };
    }
  };

  const validStep3 = () => {
    let error: boolean = false;
    let title: string = '';
    if (nameRepresentant.id === null) {
      error = true;
      title = 'Revise el formulario';
      setNameRepresentant({ value: '', id: null, error: true });
    }
    if (formData.dateInitRepresentant.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['dateInitRepresentant']: { value: '', error: true }
      }));
    }
    if (new Date(formData.dateInitRepresentant.value) > date) {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['dateInitRepresentant']: { value: '', error: true }
      }));
    }

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

    if (error) {
      return { error: true, message: title };
    } else {
      return { error: false, message: '' };
    }
  };

  const validStep4 = () => {
    let error: boolean = false;
    let title: string = '';
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
    if (
      formData.autTratamientoDatos.value &&
      formData.autPolitica.value &&
      formData.autFacturaUnica.value
    ) {
      if (formData.user.value.trim().length < 6) {
        error = true;
        title = 'El nombre de usuario debe tener mínimo 6 caracteres';
        setFormData((prevFormData: any) => ({
          ...prevFormData,
          ['user']: { value: formData.user.value, error: true }
        }));
      } else if (
        validPass.test(formData.password.value) &&
        formData.password.value.trim().length > 5
      ) {
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
    }

    if (error) {
      return { error: true, message: title };
    } else {
      return { error: false, message: '' };
    }
  };

  const handleNext = () => {
    let error: boolean = false;
    let title: string = '';
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
        title: 'Error',
        text: title,
        icon: 'error',
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });
    }
  };

  useEffect(() => {
    const paisColombia = dataPaisNacimiento.find(
      (pais) => pais.nombre.trim().toUpperCase() === 'COLOMBIA'
    );
    if (paisColombia) {
      setCompanyNationality((prev) => ({ ...prev, value: paisColombia.cod_pais }));
      // setPaisExpedicionDocumento({ value: paisColombia.cod_pais, error: false });
      setPaisComercializacion({ value: paisColombia.cod_pais, error: false });
      obtenerDepartamento(paisColombia.cod_pais, currentStep);
      obtenerDepartamento(paisColombia.cod_pais, 2);
    }
  }, [dataPaisNacimiento]);

  const handleBack = () => {
    setCurrentStep((currentStep: number) => currentStep - 1);
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
  

  const submit = () => {
    const value: any = validStep4();
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    let url = `${protocol}//${host}`;
    if (port) {
      url = `${protocol}//${host}:${port}`;
    }

    // El tipo de comprador ya no es obligatorio
    // ✅ Validar que al menos uno esté seleccionado
    // const isTipoCompradorSelected = formData.cod_tipo_comprador.value;
    // if (!isTipoCompradorSelected) {
    //   Swal.fire({
    //     title: 'Error',
    //     text: 'Debe seleccionar al menos un tipo de comprador  ',
    //     icon: 'error',
    //     confirmButtonColor: '#4D750F',
    //     confirmButtonText: 'Aceptar'
    //   });
    //   return; // 🚨 No continuar si no cumple
    // }

    if (!value.error) {
      let data = new FormData();

      data.append('tipo_persona', typePerson.value);
      data.append('tipo_documento', typeDocument.value);
      data.append('numero_documento', document.value);
      data.append('nombre_comercial', formData.companyName.value);
      data.append('razon_social', formData.tradeName.value);
      data.append('email', formData.email.value);
      data.append(
        'direccion_notificaciones',
        `${formData.address.value} ${formData.addressComplete.value}`
      );

      data.append('cod_pais_nacionalidad_empresa', companyNationality.value);
      data.append('cod_municipio_notificacion_nal', ciudadNotificacion.value);
      data.append('cod_municipio_expedicion_id', ciudadNotificacion.value);
      data.append('cod_municipio_laboral_nal', ciudadNotificacion.value);
      data.append('cod_naturaleza_empresa', natureCompany.value);

      data.append('telefono_empresa', formData.mobile.value);
      data.append('telefono_celular_empresa', formData.mobile.value);

      if (nameRepresentant.id) {
        data.append('representante_legal', nameRepresentant.id);
      }

      data.append('fecha_inicio_cargo_rep_legal', formData.dateInitRepresentant.value);

      data.append('acepta_notificacion_email', formData.autCorreo.value);
      data.append('acepta_notificacion_sms', formData.autSms.value);
      data.append('acepta_tratamiento_datos', formData.autTratamientoDatos.value);
      data.append('proveedor', 'true');

      
      // 🔵 Formatear coordenadas si existen
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

      // Archivos opcionales
      if (rutFile) {
        data.append('archivo_rut', rutFile);
      }
      if (certificadoFile) {
        data.append('camaraComercio', certificadoFile);
      }
      if (documentoFile) {
        data.append('documentoRepresentante', documentoFile);
      }

      data.append('digito_verificacion', '3');
      data.append('redirect_url', `${url}/auth/signin/`);

      setError('');

      // 🚀 Enviar el form
      handleSubmit(data, app);

      // setTimeout(() => {
      //   router.push('/auth/signin/');
      // }, 5000);
    } else {
      Swal.fire({
        title: 'Error',
        text: value.message,
        icon: 'error',
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
          
        <header className="relative mt-6 mt-[55px] mb-6 flex flex-col items-center space-y-6 lg:mb-10 lg:w-full lg:flex-row lg:justify-center lg:space-y-0 lg:px-10 lg:py-4">
            {/* Contenedor del título (realmente centrado) */}
            <div className="w-max text-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:transform">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'} sm:text-3xl`}>
                {AuthResource.RegisterJuridico}
              </h2>
            </div>

            {/* Contenedor del botón (alineado a la derecha en lg) */}
            {!app && (
              <div className="lg:absolute lg:right-10">
                <Button onClick={() => router.push('/auth/signin/')} title="Iniciar sesión" />
              </div>
            )}
          </header>

          <div className="mb-15 flex items-center justify-between" style={{ marginLeft: '15%' }}>
            {typePerson.value === 'J' && (
              <div data-dui-stepper-container data-dui-initial-step="1" className="w-full">
                <div className="flex w-full items-center justify-between">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      aria-disabled="false"
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
                              x="0px"
                              y="0px"
                              width="15"
                              height="15"
                              viewBox="0,0,256,256"
                            >
                              <g
                                fill="#ffffff"
                                fillRule="nonzero"
                                stroke="none"
                                strokeWidth="1"
                                strokeLinecap="butt"
                                strokeLinejoin="miter"
                                strokeMiterlimit="10"
                                strokeDasharray=""
                                strokeDashoffset="0"
                                fontFamily="none"
                                fontWeight="none"
                                fontSize="none"
                                textAnchor="none"
                                style={{ mixBlendMode: 'normal' }}
                              >
                                <g transform="scale(8.53333,8.53333)">
                                  <path d="M26.98047,5.99023c-0.2598,0.00774 -0.50638,0.11632 -0.6875,0.30273l-15.29297,15.29297l-6.29297,-6.29297c-0.25082,-0.26124 -0.62327,-0.36647 -0.97371,-0.27511c-0.35044,0.09136 -0.62411,0.36503 -0.71547,0.71547c-0.09136,0.35044 0.01388,0.72289 0.27511,0.97371l7,7c0.39053,0.39037 1.02353,0.39037 1.41406,0l16,-16c0.29576,-0.28749 0.38469,-0.72707 0.22393,-1.10691c-0.16075,-0.37985 -0.53821,-0.62204 -0.9505,-0.60988z"></path>
                                </g>
                              </g>
                            </svg>
                          )}
                          {currentStep < i + 1 && (
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="50" cy="50" r="30" fill="#ffffff" />
                            </svg>
                          )}
                        </span>
                        {currentStep !== 5 && (
                          <span className={`absolute -start-12 -bottom-6 text-sm whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                            <span className="hidden md:block">{step}</span>
                          </span>
                        )}
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={`h-1 flex-1 bg-[#4D750F] ${currentStep > i + 1 ? 'bg-[#4D750F]' : ''}`}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {currentStep === 1 && (
            <div className="px-6 py-2">
              <label className={`mb-6 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                {AuthResource.RegisterBasicJuridico}
              </label>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <AnimatedInput
                    type="text"
                    id="companyName"
                    name="companyName"
                    label={AuthResource.RegisterBasicRazonSocial}
                    value={formData.companyName.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.companyName.error}
                    darkMode={theme === 'dark'}
                  />
                </div>

                <div>
                  <AnimatedInput
                    type="text"
                    id="tradeName"
                    name="tradeName"
                    label={AuthResource.RegisterBasicTradeName}
                    value={formData.tradeName.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.tradeName.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <AnimatedSelect
                    label="Naturaleza de la empresa"
                    name="natureCompany"
                    value={natureCompany.value}
                    onChange={(e) => handleSelectChange(e)}
                    options={dataNatureCompany.map((value: any, index: number) => ({
                      key: index,
                      value: value[0],
                      title: value[1]
                    }))}
                    error={natureCompany.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div>
                  <AnimatedSelect
                    label="Nacionalidad de la empresa"
                    name="companyNationality"
                    value={companyNationality.value}
                    onChange={(e) => handleSelectChange(e)}
                    options={dataPaisNacimiento.map((value: any, index: number) => ({
                      key: index,
                      value: value.cod_pais,
                      title: value.nombre
                    }))}
                    error={companyNationality.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="mt-4 flow-root justify-end">
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
                    label="País de comercialización"
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
                    id="addressComplete"
                    readOnly
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
                    label="E-mail"
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
                    label="Confirmación de E-mail"
                    value={formData.emailConfirm.value}
                    onChange={(e) => handleChange(e)}
                    error={formData.emailConfirm.error}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
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
              <label className={`mb-2 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                NOTA: Este número de celular se utilizará como medio de recuperación de la cuenta,
                en caso de olvidar los datos de acceso de su cuenta.
              </label>
              <div className="mt-4 flow-root justify-between">
                <Button onClick={() => handleNext()} title="Siguiente" className="float-right" />

                <Button onClick={() => handleBack()} title="Anterior" className="float-left" />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <>
              <div className="px-6 py-2">
                <label className={`mb-6 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                  Representante Legal
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <AnimatedSelect
                      label="Tipo de documento"
                      name="typeDocumentRepresentant"
                      value={typeDocumentRepresentant.value}
                      onChange={(e) => handleSelectChange(e)}
                      options={dataTypeDocument.map((value: any, index: number) => ({
                        key: index,
                        value: value.cod_tipo_documento,
                        title: value.nombre
                      }))}
                      error={typeDocumentRepresentant.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                  <div>
                    <AnimatedInput
                      type="text"
                      id="documentRepresentant"
                      name="documentRepresentant"
                      label="Número de documento"
                      value={formData.documentRepresentant.value}
                      onChange={(e) => handleChange(e)}
                      error={formData.documentRepresentant.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 py-4">
                  <Button onClick={() => buscar()} title="Buscar" loading={loading} />

                  <Button
                    onClick={() => {
                      setIsCreateModalOpen(true);
                    }}
                    title="Crear"
                  />
                </div>

                <CreateEntityModal
                  isOpen={isCreateModalOpen}
                  onClose={() => setIsCreateModalOpen(false)}
                />

                <div className="mb-6 grid gap-4 md:grid-cols-1">
                  <div>
                    <AnimatedInput
                      type="text"
                      id="nameRepresentant"
                      name="nameRepresentant"
                      label="Nombre"
                      value={nameRepresentant.value}
                      onChange={(e) => handleChange(e)}
                      error={nameRepresentant.error}
                      readOnly
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={`mb-4 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      Fecha de Inicio Como Representante
                    </label>

                    <AnimatedInput
                      type="date"
                      id="dateInitRepresentant"
                      name="dateInitRepresentant"
                      label="Fecha de inicio"
                      maxDate={new Date().toISOString().split('T')[0]}
                      value={formData.dateInitRepresentant.value}
                      onChange={(e) => handleChange(e)}
                      error={formData.dateInitRepresentant.error}
                      darkMode={theme === 'dark'}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-2">
              <h3 className={`text-1xl text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                  {AuthResource.RegisterDocumentArchive}
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <>
                    {/* Certificado */}
                    <div>
                      <div className="col-span-full">
                        <label
                          htmlFor="cover-photo"
                          className="block text-sm/6 font-medium text-[#562707]"
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
                              aria-hidden="true"
                              data-slot="icon"
                            >
                              <path
                                fillRule="evenodd"
                                d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div className="mt-4 flex text-sm/6 text-gray-600">
                              {certificadoFile ? (
                                <div className="flex items-center justify-center">
                                  <span className="mr-2">{certificadoName}</span>
                                  <button
                                    type="button"
                                    className="rounded-md bg-[#4D750F] px-2 py-1 text-xs text-white"
                                    onClick={() => removeFile('certificado')}
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer rounded-md bg-white font-semibold text-[#562707] focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 focus-within:outline-hidden hover:text-[#4D750F]"
                                >
                                  <span>{'Arrastre o suelte su documento aquí'}</span>
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={handleChangeDrag}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* RUT */}
                    <div>
                      <div className="col-span-full">
                        <label
                          htmlFor="cover-photo2"
                          className="block text-sm/6 font-medium text-[#562707]"
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
                              aria-hidden="true"
                              data-slot="icon"
                            >
                              <path
                                fillRule="evenodd"
                                d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div className="mt-4 flex text-sm/6 text-gray-600">
                              {rutFile ? (
                                <div className="flex items-center justify-center">
                                  <span className="mr-2">{rutName}</span>
                                  <button
                                    type="button"
                                    className="rounded-md bg-[#4D750F] px-2 py-1 text-xs text-white"
                                    onClick={() => removeFile('rut')}
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="file-upload2"
                                  className="relative cursor-pointer rounded-md bg-white font-semibold text-[#562707] focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 focus-within:outline-hidden hover:text-[#4D750F]"
                                >
                                  <span>{'Arrastre o suelte su documento aquí'}</span>
                                  <input
                                    id="file-upload2"
                                    name="file-upload2"
                                    type="file"
                                    className="sr-only"
                                    onChange={handleChangeDrag}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Documento de Identidad */}
                    <div>
                      <div className="col-span-full">
                        <label
                          htmlFor="cover-photo3"
                          className="block text-sm/6 font-medium text-[#562707]"
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
                              aria-hidden="true"
                              data-slot="icon"
                            >
                              <path
                                fillRule="evenodd"
                                d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div className="mt-4 flex text-sm/6 text-gray-600">
                              {documentoFile ? (
                                <div className="flex items-center justify-center">
                                  <span className="mr-2">{documentoName}</span>
                                  <button
                                    type="button"
                                    className="rounded-md bg-[#4D750F] px-2 py-1 text-xs text-white"
                                    onClick={() => removeFile('documento')}
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="file-upload3"
                                  className="relative cursor-pointer rounded-md bg-white font-semibold text-[#562707] focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 focus-within:outline-hidden hover:text-[#4D750F]"
                                >
                                  <span>{'Arrastre o suelte su documento aquí'}</span>
                                  <input
                                    id="file-upload3"
                                    name="file-upload3"
                                    type="file"
                                    className="sr-only"
                                    onChange={handleChangeDrag}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                </div>

                <div className="mt-4 flow-root justify-between">
                  <Button onClick={() => handleNext()} title="Siguiente" className="float-right" />

                  <Button onClick={() => handleBack()} title="Anterior" />
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              {/* Ocultar sección de Tipo de Comprador si hay ?interno en la URL */}
              {!isInterno && (
                <div className="px-6 py-2">
                  <h3 className={`text-1xl text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>Tipo de Comprador</h3>
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

              <div className="px-6 py-2">
                <h3 className={`text-1xl text-left font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                  Autorización de notificación de datos
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
                        Política de Privaciadad
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
              </div>
              <div className="mt-4 px-6 py-2">
                {/* <h3 className='text-left text-[#562707] text-1xl mb-4 font-bold'>{AuthResource.RegisterDatosAcceso}</h3> */}
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
                  <div className="mb-4">
                    <div className="relative">
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
                  </div>
                  <div className="mb-4">
                    <div className="relative">
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
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <div className="flow-root justify-between">
                    <Button onClick={() => handleBack()} title="Anterior" className="float-left" />

                    <Button
                      onClick={() => submit()}
                      title="Guardar"
                      loading={loading}
                      className="float-right"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 5 && (
            <div className="p-1">
              <div className="rounded-xl bg-white p-4 shadow-xl">
                <div>
                  <h2 className="mb-10 text-center text-3xl font-bold text-[#562707]">
                    {AuthResource.RegisterJuridico}
                  </h2>
                </div>
                <h3 className="text-1xl text-center font-bold text-[#562707]">
                  Proceso de registro culminado exitosamente.
                </h3>
                <p className="text-center text-[#562707]">
                  Espere a que se verifiquen sus datos y se active su ingreso
                </p>
                <p className="mt-4 text-center text-[#562707] md:mt-6">
                  <a href="/auth/signin" className="font-bold">
                    Salir{' '}
                  </a>
                </p>
              </div>
            </div>
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

export default RegisterJuridicoForm;
