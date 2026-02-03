'use client';

import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import FormRegisterAdmin from '@/presenters/components/modules/auth/RegisterAdmin';
import '@/presenters/css/background.css';
import { Grid, Pagination, TextField } from '@mui/material';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import UsuarioConfi from '../usuario_configuracion/UsuarioConfi';

const baseApiUrl = process.env.BASE_API_URL;

const Administracion_externo: React.FC = () => {
  interface FormData {
    searchUser1: string;
    searchUser2: string;
    documentNumber: string;
    tipoPersona: string;
    documentType: string;
    firstName: any;
    lastName: any;
    username: any;
  }

  const initialFormData: FormData = {
    searchUser1: '',
    searchUser2: '',
    documentNumber: '',
    tipoPersona: '',
    documentType: '',
    firstName: '',
    lastName: '',
    username: ''
  };

  const fieldTypes: { [key: string]: 'string' } = {
    searchUser1: 'string',
    searchUser2: 'string',
    documentNumber: 'string',
    tipoPersona: 'string',
    documentType: 'string',
    firstName: 'string',
    lastName: 'string',
    username: 'string'
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: fieldTypes[name] === 'string' ? value : value
    }));
  };

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const { theme } = useTheme();

  const valueSesion: any = session;

  const [openModalCreate, setModalCreate] = useState(false);

  const handleModalCreate = () => {
    setModalCreate(!openModalCreate);
    setEditar(true);
  };
  const [user, setUser] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const buscarPersonasAll = async (page = 1): Promise<void> => {

    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber < 1) {
      console.error('El valor de "page" no es un número válido:', page);
      Swal.fire({
        icon: 'warning',
        title: 'Página inválida',
        text: 'El número de página debe ser un número válido mayor a 0.'
      });
      return;
    }

    try {
      const url = `${baseApiUrl}personas/get-personas-filters-admin-user/?primer_nombre=${formData.firstName}&primer_apellido=${formData.lastName}&nombre_de_usuario=${formData.username}&numero_documento=${formData.documentNumber}&page=${pageNumber}&tipo_documento=${formData.documentType}&tipo_persona=${formData.tipoPersona}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Datos cargados correctamente',
        showConfirmButton: false,
        timer: 1500
      });

      setUser(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error: unknown) {
      console.error('Error en buscarPersonasAll:', error);

      let errorMessage = 'Ocurrió un problema, intenta nuevamente';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      console.log(errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  const [dataTypePerson, setDataTypePerson] = useState([]);
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
      setDataTypePerson(response.data.data);
    } catch (error) { }
  }, []);

  const [documentTypes, setDocumentTypes] = useState([]);
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
      setDocumentTypes(response.data.data);
    } catch (error) { }
  }, []);

  useEffect(() => {
    obtenerTiposPersona();
    obtenerTiposDocumento();
  }, [obtenerTiposPersona, obtenerTiposDocumento]);

  const handleBuscarClick = () => {
    buscarPersonasAll(1);
  };
  useEffect(() => {
    buscarPersonasAll(currentPage);
  }, [currentPage]);


  const [editar, setEditar] = useState(false);

  const Stilestex = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '0.5rem', // 🔹 Mantiene el borde redondeado en todo momento
      borderColor: theme === 'dark' ? 'white' : '#562707',
      color: theme === 'dark' ? 'white' : '#562707',
      backgroundColor: theme === 'dark' ? '#260E00' : 'white',
      transition: 'all 0.2s ease-in-out',
      overflow: 'hidden', // 🔹 Evita que el borde cambie de forma
      outline: 'none', // 🔹 Elimina cualquier borde extra al enfocarse
      '& fieldset': {
        borderColor: theme === 'dark' ? 'white' : '#562707',
        borderWidth: '1.5px', // Grosor inicial del borde
        borderRadius: '0.5rem' // 🔹 Se asegura que el borde siempre sea redondeado
      },
      '&:hover fieldset': {
        borderColor: theme === 'dark' ? '#fff' : '#562707'
      },
      '&.Mui-focused fieldset': {
        borderColor: '#4D750F', // Color verde cuando está enfocado
        borderWidth: '2px',
        borderRadius: '0.5rem' // 🔹 Se mantiene el radio sin cambios
      }
    },

    // 🔹 Corrige la visibilidad del texto ingresado
    '& .MuiInputBase-input': {
      padding: '10px',
      color: theme === 'dark' ? 'white' : '#562707', // 🔹 Forzar color de texto en modo oscuro
      '&::placeholder': {
        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)', // 🔹 Color del placeholder
        opacity: 1 // 🔹 Asegura que se vea bien en todos los navegadores
      }
    },

    // 🔹 Corrige la visibilidad del label en modo oscuro
    '& .MuiInputLabel-root': {
      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#562707', // 🔹 Color del label
      backgroundColor: theme === 'dark' ? '#260E00' : 'white', // Fondo del label para evitar superposición
      padding: '0 4px', // Ajuste para que el label no se corte
      transform: 'translate(14px, 10px) scale(1)' // Posición inicial del label
    },

    '& .MuiInputLabel-shrink': {
      transform: 'translate(14px, -6px) scale(0.85)' // Ajuste cuando el label se eleva
    }
  };

  const [selectedUser, setSelectedUser] = useState(null);

  const handleEdit = (userData: any) => {
    setSelectedUser(userData);
  };
  const [configurar, setconfigurar] = useState(false);
  const [selectedUserr, setSelectedUserr] = useState<{
    nombre_completo: string;
    isActive: boolean;
    id_persona: any;
  } | null>(null);

  const actualizarEstadoUsuario = async () => {
    try {
      await axios.patch(
        `${baseApiUrl}roles/usuarios/actualizar-estado/${selectedUserr?.id_persona}/`,
        {
          is_active: selectedUserr?.isActive
          // is_blocked: formData.bloqueo
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );
      Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: 'El estado del usuario se actualizó correctamente.'
      });
      handleBuscarClick();
    } catch (error: unknown) {
      let errorMessage = 'Hubo un error al actualizar el estado.';
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar estado',
        text: errorMessage
      });
    }
  };
  useEffect(() => {
    if (selectedUserr) {
      // ✅ Verificas si tiene valor
      actualizarEstadoUsuario();
    }
  }, [selectedUserr]);

  const [
    tipousuario
    // settipousuario
  ] = useState('externo');

  return (
    <div className="w-full">
      {configurar ? (
        <>
          <UsuarioConfi
            tipousuario={tipousuario}
            selectedUser={selectedUser}
            setEditar={setconfigurar}
            tipoUsuario={undefined}
            isSuperUsuario={undefined}
            setIsSuperUsuario={undefined}
          />
        </>
      ) : (
        <>
          {editar ? (
            <>
              <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                  <div
                    className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#562707]' : 'bg-slate-200'}`}
                  >
                    <FormRegisterAdmin setEditar={setEditar} baseApiUrl={baseApiUrl!} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                  <div
                    className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
                  >
                    <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                      <div>
                        <h3
                          className={`mb-10 text-center  text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                        >
                          ADMINISTRAR USUARIOS
                        </h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div></div>
                      </div>

                      <Grid container spacing={2} className="mb-4">
                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <TextField
                            fullWidth
                            id="firstName"
                            name="firstName"
                            label="Primer Nombre"
                            placeholder="Primer Nombre"
                            type="text"
                            variant="outlined"
                            value={formData.firstName}
                            onChange={handleChange}
                            sx={Stilestex}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <TextField
                            fullWidth
                            id="lastName"
                            name="lastName"
                            label="Primer Apellido"
                            placeholder="Primer Apellido"
                            type="text"
                            variant="outlined"
                            value={formData.lastName}
                            onChange={handleChange}
                            sx={Stilestex}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <TextField
                            fullWidth
                            id="username"
                            name="username"
                            label="Nombre de Usuario"
                            placeholder="Nombre de Usuario"
                            type="text"
                            variant="outlined"
                            value={formData.username}
                            onChange={handleChange}
                            sx={Stilestex}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <div>
                            <label
                              className={`mb-2 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                            >
                              Tipo de Persona
                            </label>

                            <select
                              name="tipoPersona"
                              value={formData.tipoPersona}
                              onChange={handleChange}
                              className={`w-full rounded-lg border p-2 ${theme === 'dark'
                                ? 'border-white bg-gray-800 text-white'
                                : 'border-[#562707] text-[#562707]'
                                }`}
                            >
                              <option value="">Tipo de Persona</option>
                              {dataTypePerson.map((value: any, index: number) => (
                                <option key={index} value={value[0]}>
                                  {value[1]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <div>
                            <label
                              className={`mb-2 block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                            >
                              Tipo de Documento
                            </label>
                            <select
                              name="documentType"
                              value={formData.documentType}
                              onChange={handleChange}
                              className={`w-full rounded-lg border p-2 ${theme === 'dark'
                                ? 'border-white bg-gray-800 text-white'
                                : 'border-[#562707] text-[#562707]'
                                }`}
                            >
                              <option value="">Tipo de Documento</option>
                              {documentTypes.map((value: any, index: number) => (
                                <option key={index} value={value.cod_tipo_documento}>
                                  {value.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4} marginTop={3.3}>
                          <div>
                            <TextField
                              fullWidth
                              id="documentNumber"
                              name="documentNumber"
                              label="Número de Documento"
                              placeholder="Número de Documentodddd"
                              type="text"
                              variant="outlined"
                              value={formData.documentNumber}
                              onChange={handleChange}
                              sx={Stilestex}
                            />
                          </div>
                        </Grid>
                      </Grid>

                      <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                        <Grid item>
                          <div>
                            <button
                              type="button"
                              className="float-right m-auto block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                              onClick={() => handleBuscarClick()}
                            >
                              Buscar persona
                            </button>
                          </div>
                        </Grid>

                        <Grid item>
                          <button
                            onClick={() => handleModalCreate()}
                            type="button"
                            className="float-right m-auto block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                          >
                            Crear usuario
                          </button>
                        </Grid>
                      </Grid>
                    </div>

                    <div
                      className={`mt-7 rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'}`}
                    >


                      <h3
                        className={` text-center text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                      >
                        BÚSQUEDA AVANZADA POR PERSONA
                      </h3>

                      <div className="grid grid-cols-1 gap-4 overflow-x-auto">
                        <table className="w-full min-w-300 table-auto">
                          <thead>
                            <tr
                              className={`h-8 ${theme === 'dark' ? 'bg-[##562707] text-white' : 'bg-gray-100'}`}
                            >
                              <th className="text-left">Tipo persona</th>
                              <th className="text-left">Nombre Completo</th>
                              <th className="text-left">Razón Social</th>
                              <th className="text-left">Nombre Comercial</th>
                              <th className="text-left">Tipo Documento</th>
                              <th className="text-left">N° Documento</th>
                              <th className="text-left">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {user.map((value: any, index: number) => (
                              <tr
                                key={index}
                                className={`h-8 border-b-1 border-gray-200 ${theme === 'dark' ? 'text-white' : ''}`}
                              >
                                <td>{value.tipo_persona_desc}</td>
                                <td>{value.nombre_completo}</td>
                                <td>{value.razon_social}</td>
                                <td>{value.nombre_comercial}</td>
                                <td>{value.tipo_documento}</td>
                                <td>{value.numero_documento}</td>
                                <td className="flex items-center gap-2">
                                  <img
                                    onClick={() => {
                                      setSelectedUserr({
                                        id_persona: value?.id_persona,
                                        nombre_completo: value?.nombre_completo,
                                        isActive: !value?.is_active // Mostramos el contrario
                                      });
                                    }}
                                    src={
                                      value.is_active
                                        ? 'https://i.postimg.cc/xCycvywm/Grupo-1127.png'
                                        : 'https://i.postimg.cc/nh3rCVxb/cancel-33dp-EA3323-FILL0-wght400-GRAD0-opsz40.png'
                                    }
                                    alt={value.is_active ? 'Activo' : 'Inactivo'}
                                    className="h-6 w-6 cursor-pointer" // Agregué cursor-pointer para que se note que es clickeable
                                  />

                                  <button
                                    onClick={() => {
                                      setconfigurar(!configurar);
                                      handleEdit(value);
                                    }}
                                  >
                                    <img
                                      src="https://i.postimg.cc/hPVKjZ05/Grupo-1126.png"
                                      alt="Editar"
                                      className="h-6 w-6" // Ajusta el tamaño según lo necesites
                                    />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex justify-center">
                        <Pagination
                          count={totalPages}
                          page={currentPage}
                          disabled={isLoading} // DESHABILITADO mientras carga
                          onChange={(_event, page) => !isLoading && setCurrentPage(page)} // Solo si no está cargando
                          sx={{
                            '& .MuiPaginationItem-root': {
                              color: '#4D750F'
                            },
                            '& .MuiPaginationItem-page.Mui-selected': {
                              backgroundColor: '#4D750F',
                              color: 'white'
                            },
                            '& .MuiPaginationItem-previousNext': {
                              color: '#4D750F'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Administracion_externo;
