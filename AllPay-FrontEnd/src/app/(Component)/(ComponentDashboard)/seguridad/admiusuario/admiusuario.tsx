'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import axios from 'axios';
import { useTheme } from 'next-themes';
import '@/presenters/css/background.css';
import Swal from 'sweetalert2';
import { Grid } from '@mui/material';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';

const baseApiUrl = process.env.BASE_API_URL;
const Usuarioadmi: React.FC<{
  selectedUser: any;
  setconfigurar: any;
  tipousuario: any;
  tipoUsuario: any;
  setEditar: any;
}> = ({
  selectedUser,
  tipousuario,
  // setconfigurar
  tipoUsuario,
  setEditar
}) => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();

  const valueSesion: any = session;

  const obtenerTiposPersona = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}choices/tipo-persona/`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
    } catch (error) {}
  }, []);

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
    } catch (error) {}
  }, []);

  useEffect(() => {
    obtenerTiposPersona();
    obtenerTiposDocumento();
  }, [obtenerTiposPersona, obtenerTiposDocumento]);

  const fieldTypes: { [key: string]: 'string' | 'file' } = {
    documentNumber: 'string',
    tipoPersona: 'string',
    selectedFile: 'file',
    documentoRepresentante: 'file',
    camaraComercio: 'file',
    archivo_rut: 'file',
    tipodocumento: 'string',
    primerNombre: 'string',
    segundoNombre: 'string',
    primerApellido: 'string',
    segundoApellido: 'string',
    nombreusuario: 'string',
    email: 'string', // Nuevo campo
    telefono_celular: 'string', // Nuevo campo
    fecha_nacimiento: 'string'
  };

  const [formData, setFormData] = useState<{ [key: string]: string | File | any }>({});
  const [filePreview, setFilePreview] = useState<{ [key: string]: string | any }>({});
  const [fileName, setFileName] = useState<{ [key: string]: string | any }>({});
  const [tiposCompradorSeleccionados, setTiposCompradorSeleccionados] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;

    if (fieldTypes[name] === 'file' && files && files.length > 0) {
      const file = files[0];
      setFormData((prevData) => ({ ...prevData, [name]: file }));
      setFileName((prevNames) => ({ ...prevNames, [name]: file.name }));
      setFilePreview((prevPreviews) => ({ ...prevPreviews, [name]: URL.createObjectURL(file) }));
    } else {
      // Si es campo email, validamos con regex
      if (name === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value) && value !== '') {
          // Opcional: Puedes mostrar error aquí si quieres.
        }
      }
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
    setFormData((prev) => ({ ...prev, [field]: '' }));
    setFileName((prev) => ({ ...prev, [field]: '' }));
    setFilePreview((prev) => ({ ...prev, [field]: '' }));
  };

  // Manejar cambios en tipos de comprador
  const handleTipoCompradorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      if (!tiposCompradorSeleccionados.includes(value)) {
        setTiposCompradorSeleccionados(prev => [...prev, value]);
      }
    } else {
      setTiposCompradorSeleccionados(prev => prev.filter(tipo => tipo !== value));
    }
  };

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        documentNumber: selectedUser?.numero_documento || '',
        tipoPersona: selectedUser?.tipo_persona || '',
        tipodocumento: selectedUser?.tipo_documento || '',
        primerNombre: selectedUser?.primer_nombre || '',
        segundoNombre: selectedUser?.segundo_nombre || '',
        primerApellido: selectedUser?.primer_apellido || '',
        segundoApellido: selectedUser?.segundo_apellido || '',
        nombreusuario: selectedUser?.nombre_comercial || '',
        selectedFile: selectedUser?.image_profile || '',
        email: selectedUser?.email || '',
        telefono_celular: selectedUser?.telefono_celular || '',
        fecha_nacimiento: selectedUser?.fecha_nacimiento || '',
        documentoRepresentante: selectedUser?.documentoRepresentante || '',
        archivo_rut: selectedUser?.archivo_rut || '',
        camaraComercio: selectedUser?.camaraComercio || ''
      });

      // Procesar tipos de comprador
      if (selectedUser?.cod_tipo_comprador) {
        const tiposArray = selectedUser.cod_tipo_comprador.split('|').filter(Boolean);
        setTiposCompradorSeleccionados(tiposArray);
      } else {
        setTiposCompradorSeleccionados([]);
      }
    }
  }, [selectedUser]);

  const actualizarPersona = async (
    formData: { [key: string]: string | File | null },
    idPersona: number,
    tipoUsuario: string
  ): Promise<void> => {
    try {
      const data = new FormData();

      if (formData?.primerNombre) data.append('primer_nombre', formData.primerNombre as string);
      if (formData?.segundoNombre) data.append('segundo_nombre', formData.segundoNombre as string);
      if (formData?.primerApellido)
        data.append('primer_apellido', formData.primerApellido as string);
      if (formData?.segundoApellido)
        data.append('segundo_apellido', formData.segundoApellido as string);
      if (formData?.email) data.append('email', formData.email as string);
      if (formData?.telefono_celular)
        data.append('telefono_celular', formData.telefono_celular as string);

      // Agregar tipos de comprador seleccionados
      if (tiposCompradorSeleccionados.length > 0) {
        data.append('cod_tipo_comprador', tiposCompradorSeleccionados.join('|'));
      }

      if (
        formData.documentoRepresentante &&
        formData.documentoRepresentante !== selectedUser?.documentoRepresentante
      ) {
        data.append('documentoRepresentante', formData.documentoRepresentante);
      }

      if (formData.camaraComercio && formData.camaraComercio !== selectedUser?.camaraComercio) {
        data.append('camaraComercio', formData.camaraComercio);
      }

      if (formData.archivo_rut && formData.archivo_rut !== selectedUser?.archivo_rut) {
        data.append('archivo_rut', formData.archivo_rut);
      }

      // 👇 URL condicional según tipoUsuario
      const url =
        tipoUsuario.toLowerCase() === 'interno'
          ? `${baseApiUrl}personas/update-persona-natural-admin-personas/${idPersona}/`
          : `${baseApiUrl}personas/persona-natural/self/update/`;

      const response = await axios.patch(url, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success === false) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      // ✅ Alerta de éxito con botón personalizado
      await Swal.fire({
        icon: 'success',
        title: 'Persona actualizada correctamente',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
              py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
              disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
              outline-none focus:outline-none
            `
        },
        buttonsStyling: false
      });
    } catch (error: unknown) {
      console.error('Error al actualizar la persona:', error);

      let errorMessage = 'Ocurrió un problema al actualizar la persona';
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      // ❌ Alerta de error con botón personalizado
      await Swal.fire({
        icon: 'error',
        title: 'Error al actualizar la persona',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
              py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
              disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
              outline-none focus:outline-none
            `
        },
        buttonsStyling: false
      });
    }
  };

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
        <div className="w-full p-1">
          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}>
          <Grid container spacing={2} alignItems="center" className="mb-4" marginTop={3}>
  {/* Imagen */}
 

  {/* Título */}
  <Grid item xs={12} sm>
    <div className="flex justify-center">
      <h3
        className={`text-center text-2xl font-bold sm:text-3xl ${
          theme === 'dark' ? 'text-white' : 'text-[#562707]'
        }`}
      >
        ADMINISTRACIÓN DE USUARIOS
      </h3>
    </div>
  </Grid>
</Grid>
<Grid item xs={12} sm="auto">
    <div className="flex justify-center sm:justify-start">
      <img
        src={selectedUser?.image_profile || '/images/user.jpg'}
        alt="Vista previa"
        className="h-24 w-24 rounded-2xl object-cover"
      />
    </div>
  </Grid>

            <Grid container spacing={2} className="mb-4" marginTop={-1}>
              <Grid item>
                <div>
                  <h3
                    className={`mb-10 text-center text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-[#562707]'
                    }`}
                  >
                    DATOS PERSONALES
                  </h3>
                </div>
              </Grid>
            </Grid>

            <Grid container spacing={2} className="mb-4" marginTop={-6}>
              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <div>
                  <AnimatedInput
                    type="text"
                    name="primerNombre"
                    id="primerNombre"
                    label="Primer Nombre"
                    value={formData.primerNombre}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <div>
                  <AnimatedInput
                    type="text"
                    name="segundoNombre"
                    id="segundoNombre"
                    label="Segundo Nombre"
                    value={formData.segundoNombre}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <div>
                  <AnimatedInput
                    type="text"
                    name="primerApellido"
                    id="primerApellido"
                    label="Primer Apellido"
                    value={formData.primerApellido}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <div>
                  <AnimatedInput
                    type="text"
                    name="segundoApellido"
                    id="segundoApellido"
                    label="Segundo Apellido"
                    value={formData.segundoApellido}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </Grid>

              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <AnimatedInput
                  type="text"
                  name="nombreusuario"
                  id="nombreusuario"
                  label="Nombre de comercial "
                  value={formData.nombreusuario}
                  onChange={handleChange}
                  darkMode={theme === 'dark'}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <AnimatedInput
                  type="email"
                  id="email"
                  name="email"
                  label="Correo Electrónico"
                  value={formData.email}
                  onChange={handleChange}
                  darkMode={theme === 'dark'}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                <AnimatedInput
                  type="number"
                  id="telefono_celular"
                  name="telefono_celular"
                  label="Teléfono Celular"
                  value={formData.telefono_celular}
                  onChange={handleChange}
                  darkMode={theme === 'dark'}
                />
              </Grid>
            </Grid>

            {/* Sección de Tipos de Comprador */}
            <Grid container spacing={2} className="mb-4" marginTop={2}>
              <Grid item xs={12}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-8">
                  {/* Título */}
                  <div className="text-center sm:text-left">
                    <h3
                      className={`text-lg font-bold uppercase ${
                        theme === 'dark' ? 'text-white' : 'text-[#562707]'
                      }`}
                    >
                      Tipo de Comprador
                    </h3>
                  </div>

                  {/* Checkboxes en línea horizontal */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Procesador */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tipo_procesador"
                        value="T"
                        checked={tiposCompradorSeleccionados.includes('T')}
                        onChange={handleTipoCompradorChange}
                        className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <label 
                        htmlFor="tipo_procesador" 
                        className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                      >
                        Procesador
                      </label>
                    </div>

                    {/* Exportador */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tipo_exportador"
                        value="E"
                        checked={tiposCompradorSeleccionados.includes('E')}
                        onChange={handleTipoCompradorChange}
                        className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <label 
                        htmlFor="tipo_exportador" 
                        className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                      >
                        Exportador
                      </label>
                    </div>

                    {/* Comerciante */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tipo_comprador"
                        value="C"
                        checked={tiposCompradorSeleccionados.includes('C')}
                        onChange={handleTipoCompradorChange}
                        className="h-5 w-5 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <label 
                        htmlFor="tipo_comprador" 
                        className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                      >
                        Comerciante
                      </label>
                    </div>
                  </div>
                </div>
              </Grid>
            </Grid>

            <Grid container spacing={2} className="mb-4">
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
                    <Button title="Salir" onClick={() => setEditar(false)} />
                  </Grid>
                  <Grid item>
                    <Button
                      title="Actualizar"
                      onClick={() =>
                        actualizarPersona(formData, selectedUser.id_persona, tipousuario)
                      }
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>
          </div>
          {tipoUsuario !== null && tipoUsuario !== 'I' && (
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'} mt-4`}>
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
                <Grid container spacing={2} marginTop={-2} className="mb-4">
                  {['documentoRepresentante', 'camaraComercio', 'archivo_rut'].map((field) => (
                    <Grid item xs={12} sm={4} md={4} lg={4} xl={4} key={field}>
                      <label
                        htmlFor={field}
                        className={`block text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-[#562707]'
                        }`}
                      >
                        {field === 'documentoRepresentante'
                          ? 'Documento Identidad Representante Legal'
                          : field === 'camaraComercio'
                            ? 'Certificado de existencia y representante legal'
                            : field === 'archivo_rut'
                              ? 'Registro Único Tributario - RUT'
                              : ''}
                      </label>

                      <div
                        className={`relative mt-2 flex h-48 w-full justify-center rounded-lg border border-dashed ${
                          theme === 'dark'
                            ? 'border-white/20 bg-[#260f00]'
                            : 'border-gray-900/25 bg-white'
                        } px-6 py-10`}
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
                            className={`mx-auto size-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-300'}`}
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
                            <>
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

                              {/* ✅ Botón de Descargar si hay archivo anterior y no se ha cargado uno nuevo */}
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
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              )}
                            </>
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
                  <Button
                    title="Actualizar"
                    onClick={() =>
                      actualizarPersona(formData, selectedUser.id_persona, tipousuario)
                    }
                  />
                </Grid>

                <Grid item>
                  <Button title="Salir" onClick={() => setEditar(false)} />
                </Grid>
              </Grid>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Usuarioadmi;
