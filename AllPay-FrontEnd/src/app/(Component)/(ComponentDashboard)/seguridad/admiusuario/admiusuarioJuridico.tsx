'use client';

import CreateEntityModal from '@/presenters/components/modules/register/CreateLegalRepresentative';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import ModalAddress from '@/presenters/components/shared/ModalAddress';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';

const baseApiUrl = process.env.BASE_API_URL; // Accede a la variable de entorno aquí
const AdmiusuarioJuridico: React.FC<{
  selectedUser: any;
  setconfigurar: any;
  tipousuario: any;
  tipoUsuario: any;
  setEditar: any;
}> = ({
  selectedUser,
  tipousuario,
  tipoUsuario,
  setEditar
  // setconfigurar
}) => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();

  const valueSesion: any = session;

  const fieldTypes: { [key: string]: 'string' | 'file' } = {
    cod_naturaleza_empresa: 'string',
    email_empresarial: 'string',
    direccionEmpresa: 'string',
    telefono_empresa: 'string',
    telefono_celular: 'string',
    segundoApellido: 'string',
    documentNumber: 'string',
    primerApellido: 'string',
    segundoNombre: 'string',
    tipodocumento: 'string',
    nombreusuario: 'string',
    primerNombre: 'string',
    razon_social: 'string',
    tipoPersona: 'string',
    direccion: 'string',
    email: 'string',
    numerodocumento: 'string',
    archivo_rut: 'file',
    selectedFile: 'file',
    camaraComercio: 'file',
    documentoRepresentante: 'file'
  };

  const [formData, setFormData] = useState<{ [key: string]: string | File | any }>({});
  const [filePreview, setFilePreview] = useState<{ [key: string]: string | any }>({});
  const [fileName, setFileName] = useState<{ [key: string]: string | any }>({});

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;

    if (fieldTypes[name] === 'file' && files && files.length > 0) {
      const file = files[0];
      setFormData((prevData) => ({ ...prevData, [name]: file }));
      setFileName((prevNames) => ({ ...prevNames, [name]: file.name }));
      setFilePreview((prevPreviews) => ({ ...prevPreviews, [name]: URL.createObjectURL(file) }));
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  // Drag & Drop: Permitir soltar archivo
  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  // Manejar archivo soltado
  const handleDrop = (e: any, field: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));
      setFileName((prev) => ({ ...prev, [field]: file.name }));
      setFilePreview((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  // Eliminar archivo (cuando presionas la X)
  const removeFile = (field: string) => {
    setFilePreview((prev) => ({ ...prev, [field]: '' }));
    setFormData((prev) => ({ ...prev, [field]: '' }));
    setFileName((prev) => ({ ...prev, [field]: '' }));
  };

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        cod_naturaleza_empresa: selectedUser.cod_naturaleza_empresa || '',
        email_empresarial: selectedUser.email_empresarial || '',
        telefono_empresa: selectedUser.telefono_empresa || '',
        documentNumber: selectedUser.numero_documento || '',
        direccionEmpresa: selectedUser.direccion_notificaciones || '',
        nombreusuario: selectedUser.nombre_comercial || '',

        primerNombre: selectedUser?.representante_legal.primer_nombre || '',
        segundoNombre: selectedUser?.representante_legal?.segundo_nombre || '',
        primerApellido: selectedUser?.representante_legal?.primer_apellido || '',
        segundoApellido: selectedUser?.representante_legal?.segundo_apellido || '',
        telefono_celular: selectedUser?.representante_legal?.telefono_celular || '',

        tipodocumento: selectedUser?.representante_legal?.tipo_documento || '',
        numerodocumento: selectedUser?.representante_legal.numero_documento || '',

        selectedFile: selectedUser.image_profile || '',
        tipoPersona: selectedUser.tipo_persona || '',
        razon_social: selectedUser.razon_social || '',
        direccion: selectedUser?.representante_legal?.direccion_laboral || '',
        email: selectedUser?.representante_legal?.email || '',
        // archivos
        archivo_rut: selectedUser.archivo_rut || '',
        camaraComercio: selectedUser.camaraComercio || '',
        documentoRepresentante: selectedUser.documentoRepresentante || ''
      });
    }
  }, [selectedUser]);

  const actualizarPersona = async (
    formData: { [key: string]: string | File | null },
    idPersona: number,
    tipoUsuario: string
  ): Promise<void> => {
    try {
      const data = new FormData();

      // ✅ Función para agregar solo si no está vacío
      const appendIfNotEmpty = (key: string, value: any) => {
        if (value !== undefined && value !== null && value !== '') {
          data.append(key, value);
        }
      };

      // ✅ Nuevos campos actualizados (solo si no están vacíos)
      appendIfNotEmpty('razon_social', formData.razon_social);
      appendIfNotEmpty('nombre_comercial', formData.nombreusuario);
      appendIfNotEmpty('cod_naturaleza_empresa', formData.cod_naturaleza_empresa);
      // appendIfNotEmpty('telefono_celular_empresa', formData.telefono_celular);
      appendIfNotEmpty('email', formData.email_empresarial);
      appendIfNotEmpty('cod_municipio_notificacion_nal', municipioSeleccionado);
      appendIfNotEmpty('direccion_notificaciones', formData.direccionEmpresa);
      appendIfNotEmpty('telefono_celular', formData.telefono_empresa);

      // ✅ Si personaData tiene `id_persona`, lo enviamos como `representante_legal`
      appendIfNotEmpty('representante_legal', personaData?.id_persona?.toString());

      // ✅ Verificar si los archivos han cambiado antes de enviar
      if (formData.selectedFile && formData.selectedFile !== selectedUser.image_profile) {
        data.append('image_profile', formData.selectedFile);
      }

      if (
        formData.documentoRepresentante &&
        formData.documentoRepresentante !== selectedUser.documentoRepresentante
      ) {
        data.append('documentoRepresentante', formData.documentoRepresentante);
      }

      if (formData.camaraComercio && formData.camaraComercio !== selectedUser.camaraComercio) {
        data.append('camaraComercio', formData.camaraComercio);
      }

      if (formData.archivo_rut && formData.archivo_rut !== selectedUser.archivo_rut) {
        data.append('archivo_rut', formData.archivo_rut);
      }

      // ✅ Normalizamos tipoUsuario para evitar problemas
      const url =
        tipoUsuario.toLowerCase() === 'interno'
          ? `${baseApiUrl}personas/update-persona-juridica-admin-personas/${idPersona}/`
          : `${baseApiUrl}personas/persona-juridica/self/update/`;

      // ✅ Enviamos la actualización a la API
      const response = await axios.patch(url, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success === false) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      // 🎉 Éxito al actualizar
      await Swal.fire({
        icon: 'success',
        title: 'Persona actualizada correctamente',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
              ${
                'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'
              } py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
        },
        buttonsStyling: false
      });
    } catch (error: unknown) {
      console.error('Error al actualizar la persona:', error);

      let errorMessage = 'Ocurrió un problema al actualizar la persona';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      // ❌ Error personalizado
      await Swal.fire({
        icon: 'error',
        title: 'Error al actualizar la persona',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
              ${
                'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'
              } py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
        },
        buttonsStyling: false
      });
    }
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [naturalezasEmpresa, setNaturalezasEmpresa] = useState<{ value: string; label: string }[]>(
    []
  );

  const obtenerNaturalezasEmpresa = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}choices/cod-naturaleza-empresa/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success) {
        const options = response.data.data.map(([value, label]: [string, string]) => ({
          value,
          label
        }));
        setNaturalezasEmpresa(options);
      }
    } catch (error) {
      console.error('Error al obtener las naturalezas de empresa:', error);
    }
  }, []);

  useEffect(() => {
    obtenerNaturalezasEmpresa();
  }, [obtenerNaturalezasEmpresa]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [personaData, setPersonaData] = useState<any>(null);

  // Obtener tipos de documento desde la API
  const obtenerTiposDocumento = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
          headers:  {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        })
        .catch(function (error) {
          return error.response;
        });

      if (response.data.success === false) {
        throw response.data.detail;
      }

      // Establecer opciones para el select
      setDocumentTypes(response.data.data);
    } catch (error) {
      console.error('Error al obtener los tipos de documento:', error);
    }
  }, []);

  // Obtener tipos de documento al cargar el componente
  useEffect(() => {
    obtenerTiposDocumento();
  }, [obtenerTiposDocumento]);

  // Manejador para cambiar el tipo de documento
  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDocumentType(e.target.value);
  };

  // Manejador para cambiar el número de documento
  const handleDocumentNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentNumber(e.target.value);
  };
  const buscarPersona = async () => {
    if (!documentType || !documentNumber) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor, selecciona el tipo de documento y escribe el número de documento.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
      return;
    }

    try {
      const url = `${baseApiUrl}personas/get-personas-by-document/${documentType}/${documentNumber}/`;
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success === false) {
        throw response.data.detail;
      }

      // Establecer la data de la persona si existe
      setPersonaData(response.data.data);
      await Swal.fire({
        icon: 'success',
        title: 'Persona encontrada',
        text: 'Persona encontrada con éxito.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    } catch (error) {
      console.error('Error al buscar persona:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error al buscar persona',
        text: 'No se encontró la persona o hubo un error.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    }
  };
  useEffect(() => {
    if (selectedUser && personaData) {
      setFormData({
        primerNombre: personaData.primer_nombre || '',
        segundoNombre: personaData.segundo_nombre || '',
        primerApellido: personaData.primer_apellido || '',
        segundoApellido: personaData.segundo_apellido || '',
        telefono_celular: personaData.telefono_celular || '',
        email: personaData.email || '',
        tipodocumento: personaData.tipo_documento || '',
        numerodocumento: personaData.numero_documento || ''
      });
    }
  }, [personaData]);

  type Departamento = {
    cod_departamento: string;
    nombre: string;
  };

  type Municipio = {
    cod_municipio: string;
    nombre: string;
  };

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState('');
  const obtenerDepartamentos = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/departamento/get-list/CO/`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success === false) {
        throw response.data.detail;
      }

      setDepartamentos(response.data.data);
    } catch (error) {
      console.error('Error al obtener departamentos:', error);
    }
  }, []);
  const obtenerMunicipios = useCallback(async (codDepartamento: string) => {
    if (!codDepartamento) return;

    try {
      const response = await axios.get(
        `${baseApiUrl}personas/municipio/get-list/${codDepartamento}/`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success === false) {
        throw response.data.detail;
      }

      setMunicipios(response.data.data);
    } catch (error) {
      console.error('Error al obtener municipios:', error);
    }
  }, []);
  const handleDepartamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setDepartamentoSeleccionado(selectedValue);
    obtenerMunicipios(selectedValue);
  };

  const handleMunicipioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMunicipioSeleccionado(e.target.value);
  };
  useEffect(() => {
    obtenerDepartamentos();
  }, [obtenerDepartamentos]);

  useEffect(() => {
    if (departamentos.length > 0 && selectedUser?.departamento) {
      const departamentoEncontrado = departamentos.find(
        (dep) => dep.nombre.toUpperCase() === selectedUser.departamento.toUpperCase()
      );

      if (departamentoEncontrado) {
        setDepartamentoSeleccionado(departamentoEncontrado.cod_departamento);
        obtenerMunicipios(departamentoEncontrado.cod_departamento);
      }
    }
  }, [departamentos, selectedUser]);

  // 2. Cuando los municipios se actualicen, buscar el municipio
  useEffect(() => {
    if (municipios.length > 0 && selectedUser?.municipio) {
      const municipioEncontrado = municipios.find(
        (mun) => mun.nombre.toUpperCase() === selectedUser.municipio.toUpperCase()
      );

      if (municipioEncontrado) {
        setMunicipioSeleccionado(municipioEncontrado.cod_municipio);
      }
    }
  }, [municipios, selectedUser]);

  const [openModalAddress, setModalAddress] = useState(false);

  // Función para abrir/cerrar el modal
  const handleModal = () => {
    setModalAddress(!openModalAddress); // Alterna entre abrir/cerrar
  };
  const [formDataa, setFormDataa] = useState<any>({
    addressData: {
      ubicacion: { value: '' },
      viaPrincipal: { value: '' },
      nombreVia: { value: '' },
      letraPrincipal: { value: '' },
      letraPrincipal2: { value: '' },
      prefijoBisPrincipal: { value: '' },
      cordenadaPrincipal: { value: '' },
      viaSecundaria: { value: '' },
      nombreViaSecundaria: { value: '' },
      letraSecundaria: { value: '' },
      letraSecundaria2: { value: '' },
      prefijoBisSecundaria: { value: '' },
      cordenadaSecundaria: { value: '' },
      viaTerciaria: { value: '' },
      nombreViaTerciaria: { value: '' },
      letraTerciaria: { value: '' },
      letraTerciaria2: { value: '' },
      prefijoBisTerciaria: { value: '' },
      cordenadaTerciaria: { value: '' },
      complemento: { value: '' },
      coordenadaX: { value: '' },
      coordenadaY: { value: '' },
      location: { value: '' }
    }
  });

  const getGeneratedAddress = (addressData: any) => {
    const addressParts = Object.values(addressData)
      .map((field: any) => field.value)
      .filter((val) => val !== '') // Filtra valores vacíos
      .join(' '); // Une todos los valores

    return addressParts.replace(/\s+/g, ' ').trim(); // Limpia espacios
  };
  const generatedAddress = getGeneratedAddress(formDataa.addressData);
  useEffect(() => {
    if (
      generatedAddress &&
      generatedAddress !== selectedUser?.direccion_notificaciones &&
      generatedAddress !== formData.direccionEmpresa // evita sobreescribir manual
    ) {
      setFormData((prevData: any) => ({
        ...prevData,
        direccionEmpresa: generatedAddress
      }));
    }
  }, [generatedAddress]);
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
        <div className="w-full p-1">
          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
            <Grid container spacing={2} alignItems="center" className="mb-4" marginTop={-1}>
              {/* Imagen */}
              <Grid item xs={12} sm="auto">
                <div className="flex justify-center sm:justify-start">
                  {selectedUser?.image_profile && (
                    <img
                      src={selectedUser.image_profile}
                      alt="Vista previa"
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                  )}
                </div>
              </Grid>

              {/* Título */}
              <Grid item xs={12} sm>
                <div className="flex justify-center sm:-ml-6">
                  <h3
                    className={`text-center text-2xl font-bold sm:text-3xl ${
                      theme === 'dark' ? 'text-white' : 'text-[#562707]'
                    }`}
                  >
                    Administración de usuarios jurídico
                  </h3>
                </div>
              </Grid>
            </Grid>

            <Grid container spacing={2} marginTop={2}>
              <Grid item>
                <div>
                  <h3
                    className={`mb-9 text-center text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-[#562707]'
                    }`}
                  >
                    Datos Legales
                  </h3>
                </div>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedInput
                  type="text"
                  id="razon_social"
                  name="razon_social"
                  label="Razón Social"
                  onChange={handleChange}
                  value={formData.razon_social}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedInput
                  type="text"
                  id="nombreusuario"
                  name="nombreusuario"
                  onChange={handleChange}
                  label="Nombre  comercial"
                  value={formData.nombreusuario}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedSelect
                  label="Naturaleza de Empresa"
                  name="cod_naturaleza_empresa"
                  value={formData.cod_naturaleza_empresa}
                  onChange={handleChange}
                  options={naturalezasEmpresa.map((item, index) => ({
                    key: index,
                    value: item.value,
                    title: item.label
                  }))}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedInput
                  type="text"
                  id="telefono_empresa"
                  name="telefono_empresa"
                  onChange={handleChange}
                  label="Numero de Teléfono "
                  value={formData.telefono_empresa}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedInput
                  type="text"
                  id="email_empresarial"
                  onChange={handleChange}
                  name="email_empresarial"
                  label="Correo Electrónico "
                  value={formData.email_empresarial}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedSelect
                  label="Departamento"
                  name="departamento"
                  value={departamentoSeleccionado}
                  onChange={handleDepartamentoChange}
                  options={departamentos.map((dep: any) => ({
                    key: dep.cod_departamento,
                    value: dep.cod_departamento,
                    title: dep.nombre
                  }))}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedSelect
                  label="Municipio"
                  name="municipio"
                  value={municipioSeleccionado}
                  onChange={handleMunicipioChange}
                  options={municipios.map((mun: any) => ({
                    key: mun.cod_municipio,
                    value: mun.cod_municipio,
                    title: mun.nombre
                  }))}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <AnimatedInput
                  type="text"
                  disabled
                  id="direccionEmpresa"
                  onChange={handleChange}
                  name="direccionEmpresa"
                  label="Dirección Empresa "
                  value={formData.direccionEmpresa}
                />
              </Grid>
            </Grid>
            <Grid
              container
              marginTop={3}
              direction="row"
              sx={{
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}
            >
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6} marginTop={-2}>
                <button
                  onClick={() => handleModal()}
                  type="button"
                  className="float-right m-auto mt-1 mb-6 block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                >
                  Generar Dirección
                </button>
              </Grid>
            </Grid>
            {openModalAddress && (
              <ModalAddress
                title="Generador de direcciones"
                onClose={handleModal}
                formData={formDataa}
                setFormData={setFormDataa}
              />
            )}
            <CreateEntityModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
            />
          </div>
          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} mt-4`}>
            <Grid container spacing={2} className="mb-4">
              <Grid item>
                <div>
                  <h3
                    className={`mb-10 text-center text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-[#562707]'
                    }`}
                  >
                    Datos representante legal
                  </h3>
                </div>
              </Grid>
            </Grid>
            <Grid container spacing={2} className="mb-4">
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedSelect
                    label="Tipo de Documento"
                    name="documentType"
                    value={documentType}
                    onChange={handleDocumentTypeChange}
                    options={documentTypes.map((value: any, index: number) => ({
                      key: index,
                      value: value.cod_tipo_documento,
                      title: value.nombre
                    }))}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    type="text"
                    name="documentNumber"
                    id="documentNumber"
                    label="Número de Documento"
                    value={documentNumber}
                    onChange={handleDocumentNumberChange}
                  />
                </div>
              </Grid>
            </Grid>

            <Grid
              container
              direction="row"
              spacing={2}
              marginTop={-2}
              sx={{
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}
            >
              <Grid item>
                <Button title="Buscar" onClick={buscarPersona}></Button>
              </Grid>
              <Grid item>
                <Button
                  title="Crear"
                  onClick={() => {
                    setIsCreateModalOpen(true);
                  }}
                ></Button>
              </Grid>
            </Grid>

            <Grid container spacing={2} marginTop={1}>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    type="text"
                    disabled
                    id="tipodocumento"
                    name="tipodocumento"
                    label="Tipo de Documento  "
                    onChange={handleChange}
                    value={formData.tipodocumento}
                  />
                </div>
              </Grid>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    type="text"
                    disabled
                    id="numerodocumento"
                    name="numerodocumento"
                    label="Numero de Documento "
                    onChange={handleChange}
                    value={formData.numerodocumento}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    type="text"
                    disabled
                    id="primerNombre"
                    name="primerNombre"
                    label="Primer Nombre"
                    onChange={handleChange}
                    value={formData.primerNombre}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    disabled
                    type="text"
                    id="segundoNombre"
                    name="segundoNombre"
                    label="Segundo Nombre"
                    onChange={handleChange}
                    value={formData.segundoNombre}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    disabled
                    type="text"
                    id="primerApellido"
                    name="primerApellido"
                    label="Primer Apellido"
                    onChange={handleChange}
                    value={formData.primerApellido}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    disabled
                    type="text"
                    id="segundoApellido"
                    name="segundoApellido"
                    onChange={handleChange}
                    label="Segundo Apellido"
                    value={formData.segundoApellido}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    disabled
                    type="text"
                    id="telefono_celular"
                    name="telefono_celular"
                    onChange={handleChange}
                    label="Numero de Teléfono "
                    value={formData.telefono_celular}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <div>
                  <AnimatedInput
                    disabled
                    id="email"
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    label="Correo Electrónico"
                  />
                </div>
              </Grid>

              {/* <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <div>
                  <AnimatedInput
                    type="text"
                    id="direccion"
                    name="direccion"
                    label="Dirección"
                    onChange={handleChange}
                    value={formData.direccion}
                  />
                </div>
              </Grid> */}
              {(tipoUsuario === null || tipoUsuario === 'I') && (
                <Grid
                  container
                  direction="row"
                  marginTop={2}
                  spacing={2}
                  sx={{
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Grid item>
                    <Button title="Salir" onClick={() => setEditar(false)}></Button>
                  </Grid>
                  <Grid item>
                    <Button
                      title=" Actualizar "
                      onClick={() =>
                        actualizarPersona(formData, selectedUser.id_persona, tipousuario)
                      }
                    ></Button>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </div>
          {tipoUsuario !== null && tipoUsuario !== 'I' && (
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} mt-4`}>
              {tipoUsuario !== null && tipoUsuario !== 'I' && (
                <Grid container spacing={2} className="mb-4">
                  <Grid item>
                    <div>
                      <h3
                        className={`mb-10 text-center text-2xl font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-[#562707]'
                        }`}
                      >
                        Documentos Solicitados
                      </h3>
                    </div>
                  </Grid>
                </Grid>
              )}
              {tipoUsuario !== null && tipoUsuario !== 'I' && (
                <Grid container spacing={2} className="mb-4" marginTop={2}>
                  {['documentoRepresentante', 'camaraComercio', 'archivo_rut'].map((field) => (
                    <Grid item xs={12} sm={4} md={4} lg={4} xl={4} key={field}>
                      <label
                        htmlFor={field}
                        className={`block text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-[#562707]'
                        }`}
                      >
                        {field === 'documentoRepresentante'
                          ? 'Documento Representante'
                          : field === 'camaraComercio'
                            ? 'Cámara de Comercio'
                            : field === 'archivo_rut'
                              ? 'Archivo RUT'
                              : ''}
                      </label>

                      <div
                        className={`relative mt-2 flex w-full justify-center rounded-lg border border-dashed ${
                          theme === 'dark'
                            ? 'border-white bg-gray-800'
                            : 'border-gray-900/25 bg-white'
                        } min-h-[192px] overflow-auto px-6 py-3`} // ✅ Cambio: Altura mínima + overflow para contenido dinámico
                        onDrop={(e) => handleDrop(e, field)}
                        onDragOver={handleDragOver}
                        style={{
                          backgroundImage: filePreview[field]
                            ? `url(${filePreview[field]})`
                            : 'none',
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          backgroundColor: filePreview[field]
                            ? 'rgba(255, 255, 255, 0.5)'
                            : theme === 'dark'
                              ? '#333'
                              : 'transparent'
                        }}
                      >
                        <div className="flex w-full max-w-full flex-col items-center gap-4 text-center">
                          <svg
                            className={`mx-auto size-12 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-300'
                            }`}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                              clipRule="evenodd"
                            />
                          </svg>

                          {fileName[field] ? (
                            <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                              <span className="mr-2">{fileName[field]}</span>

                              {/* ✅ Botón para quitar el archivo */}
                              <button
                                type="button"
                                style={{ backgroundColor: '#4D750F' }}
                                className="rounded-md px-2 py-1 text-xs text-white"
                                onClick={() => removeFile(field)}
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                              <label
                                htmlFor={field}
                                className={`relative cursor-pointer rounded-md font-semibold focus-within:ring-2 focus-within:ring-[#4D750F] focus-within:ring-offset-2 hover:text-[#4D750F] ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-white text-[#562707]'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  Arrastre o suelte su documento aquí
                                  <img src="/images/icons/update.png" className="h-4 w-4" />
                                </span>

                                <input
                                  id={field}
                                  name={field}
                                  type="file"
                                  className="sr-only"
                                  onChange={(e) => handleChange(e)}
                                />
                              </label>
                            </div>
                          )}

                          {/* ✅ Botón de Descargar Ajustado */}
                          {formData[field] && !fileName[field] && (
                            <div className="mt-4 flex w-full justify-center">
                              <div className="w-[120px]">
                                <Button
                                  title="Descargar"
                                  onClick={() => {
                                    if (formData[field]) {
                                      window.open(formData[field], '_blank');
                                    }
                                  }}
                                  className="w-full" // ✅ Asegura el mismo tamaño
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Grid
                container
                direction="row"
                marginTop={2}
                spacing={2}
                sx={{
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Grid item>
                  <Button title="Salir" onClick={() => setEditar(false)}></Button>
                </Grid>
                <Grid item>
                  <Button
                    title=" Actualizar "
                    onClick={() =>
                      actualizarPersona(formData, selectedUser.id_persona, tipousuario)
                    }
                  ></Button>
                </Grid>
              </Grid>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmiusuarioJuridico;
