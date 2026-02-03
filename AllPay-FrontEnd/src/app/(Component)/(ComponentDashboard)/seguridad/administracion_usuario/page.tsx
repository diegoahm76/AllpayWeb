'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import UsuarioConfi from '../usuario_configuracion/UsuarioConfi';
import RegisterForm from '@/presenters/components/modules/register/Register';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import HistoricoDireccionModal from './components/HistoricoDireccionModal';
import { IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

const baseApiUrl = process.env.BASE_API_URL;
const User: React.FC = () => {
  const router = useRouter();
  interface FormData {
    searchUser1: string;
    searchUser2: string;
    documentNumber: string;
    tipoPersona: string;
    documentType: string;
    firstName: any;
    lastName: any;
    username: any;
    tipoUsuario: string;
  }

  const initialFormData: FormData = {
    searchUser1: '',
    searchUser2: '',
    documentNumber: '',
    tipoPersona: '',
    documentType: '',
    firstName: '',
    lastName: '',
    username: '',
    tipoUsuario: ''
  };

  const fieldTypes: { [key: string]: 'string' } = {
    searchUser1: 'string',
    searchUser2: 'string',
    documentNumber: 'string',
    tipoPersona: 'string',
    documentType: 'string',
    firstName: 'string',
    lastName: 'string',
    username: 'string',
    tipoUsuario: 'string'
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const resetForm = () => {
    setFormData(initialFormData);
  };

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

  const [user, setUser] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para el modal de historial de direcciones
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<{
    id_persona: number;
    nombre_completo: string;
  } | null>(null);

  const buscarPersonasAll = async (page = 1): Promise<void> => {
    // Validar que la sesión esté disponible
    if (!valueSesion?.user?.tokens?.access) {
      console.error('Sesión no disponible');
      return;
    }

    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber < 1) {
      console.error('El valor de "page" no es un número válido:', page);
      await Swal.fire({
        icon: 'warning',
        title: 'Página inválida',
        text: 'El número de página debe ser un número válido mayor a 0.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
        },
        buttonsStyling: false
      });
      return;
    }

    try {
      // Construir parámetros de filtro de usuario
      let userTypeParams = '';
      if (formData.tipoUsuario === 'interno') {
        userTypeParams = '&interno=true';
      } else if (formData.tipoUsuario === 'externo') {
        userTypeParams = '&externo=true';
      }

      const url = `${baseApiUrl}personas/get-personas-filters-admin-user/?primer_nombre=${formData.firstName}&primer_apellido=${formData.lastName}&nombre_de_usuario=${formData.username}&numero_documento=${formData.documentNumber}&page=${pageNumber}&tipo_documento=${formData.documentType}&tipo_persona=${formData.tipoPersona}${userTypeParams}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

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

      await Swal.fire({
        icon: 'error',
        title: 'Error al obtener los datos',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
        },
        buttonsStyling: false
      });
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
    // Validar que la sesión esté disponible
    if (!valueSesion?.user?.tokens?.access) {
      console.error('Sesión no disponible para obtener tipos de documento');
      return;
    }

    try {
      const response = await axios
        .get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
          headers: {
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
  }, [valueSesion]);

  useEffect(() => {
    // Solo ejecutar cuando la sesión esté disponible
    if (valueSesion?.user?.tokens?.access) {
      obtenerTiposPersona();
      obtenerTiposDocumento();
    }
  }, [obtenerTiposPersona, obtenerTiposDocumento, valueSesion]);

  const handleBuscarClick = () => {
    buscarPersonasAll(1);
  };
  useEffect(() => {
    // Solo ejecutar cuando la sesión esté disponible
    if (valueSesion?.user?.tokens?.access) {
      buscarPersonasAll(currentPage);
    }
  }, [currentPage, valueSesion]);

  const fetchAllData = async (page: number) => {
    // Validar que la sesión esté disponible
    if (!valueSesion?.user?.tokens?.access) {
      console.error('Sesión no disponible para fetchAllData');
      return {
        data: [],
        total_pages: 0
      };
    }

    try {
      // Construir parámetros de filtro de usuario
      let userTypeParams = '';
      if (formData.tipoUsuario === 'interno') {
        userTypeParams = '&interno=true';
      } else if (formData.tipoUsuario === 'externo') {
        userTypeParams = '&externo=true';
      } else if (formData.tipoUsuario === 'ambos') {
        userTypeParams = '&interno=true&externo=true';
      }

      const url = `${baseApiUrl}personas/get-personas-filters-admin-user/?primer_nombre=${formData.firstName}&primer_apellido=${formData.lastName}&nombre_de_usuario=${formData.username}&numero_documento=${formData.documentNumber}&tipo_documento=${formData.documentType}&tipo_persona=${formData.tipoPersona}&page=${page}${userTypeParams}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      return {
        data: response.data.data,
        total_pages: response.data.total_pages
      };
    } catch (error) {
      console.error('Error al obtener datos:', error);
      return {
        data: [],
        total_pages: 0
      };
    }
  };

  const [
    editar
    //  setEditar
  ] = useState(false);

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
    // Validar que la sesión esté disponible
    if (!valueSesion?.user?.tokens?.access) {
      console.error('Sesión no disponible para actualizar estado');
      return;
    }

    // Establecer el ID de la fila que se está actualizando
    setUpdatingUserRowId(selectedUserr?.id_persona);

    try {
      await axios.patch(
        `${baseApiUrl}roles/usuarios/actualizar-estado/${selectedUserr?.id_persona}/`,
        {
          is_active: selectedUserr?.isActive
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );

      await Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: 'El estado del usuario se actualizó correctamente.',
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

      handleBuscarClick();
    } catch (error: unknown) {
      let errorMessage = 'Hubo un error al actualizar el estado.';
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      await Swal.fire({
        icon: 'error',
        title: 'Error al actualizar estado',
        text: errorMessage,
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
    } finally {
      // Limpiar el ID de la fila que se estaba actualizando
      setUpdatingUserRowId(null);
    }
  };

  const [tipoUsuario, setTipoUsuario] = useState('');

  const [tipousuario] = useState('interno');

  const [isSuperUsuario, setIsSuperUsuario] = useState<boolean>(false);
  const [updatingUserRowId, setUpdatingUserRowId] = useState<number | null>(null);

  const hasVerified = useRef(false);

  useEffect(() => {
    if (!hasVerified.current) {
      verificarSuperUsuario();
      hasVerified.current = true;
    }
  }, []);

  useEffect(() => {
    if (selectedUserr) {
      // ✅ Verificas si tiene valor
      actualizarEstadoUsuario();
    }
  }, [selectedUserr]);

  const verificarSuperUsuario = async () => {
    // Validar que la sesión esté disponible
    if (!valueSesion?.user?.tokens?.access) {
      console.error('Sesión no disponible para verificar super usuario');
      setIsSuperUsuario(false);
      return;
    }

    try {
      const response = await axios.get(`${baseApiUrl}users/get-superusers/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (
        response?.data?.success &&
        response?.data?.data &&
        Array.isArray(response.data.data) &&
        response.data.data.length > 0
      ) {
        const usuario = response.data.data[0];

        // Guardamos el tipo_usuario en el estado
        setTipoUsuario(usuario.tipo_usuario);

        if (usuario.is_superuser === true) {
          await Swal.fire({
            icon: 'success',
            title: '¡Super usuario detectado!',
            text: 'Usted es super usuario.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'OK',
            customClass: {
              confirmButton: `
                ${'OK'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
                hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
                flex items-center justify-center gap-2 outline-none focus:outline-none
              `
            },
            buttonsStyling: false
          }).then(() => {
            setIsSuperUsuario(true);
          });
        } else {
          setIsSuperUsuario(false);
        }
      } else {
        setIsSuperUsuario(false);
      }
    } catch (error) {
      setIsSuperUsuario(false);
    }
  };

  useEffect(() => {
    if (!hasVerified.current) {
      verificarSuperUsuario();
      hasVerified.current = true;
    }
  }, []);

  useEffect(() => {
    handleBuscarClick();
  }, [configurar]);

  // Función para abrir el modal de historial de direcciones
  const handleOpenHistorialModal = (row: any) => {
    setSelectedPersona({
      id_persona: row.id_persona,
      nombre_completo: row.nombre_completo
    });
    setIsHistorialModalOpen(true);
  };

  // Función para cerrar el modal de historial de direcciones
  const handleCloseHistorialModal = () => {
    setIsHistorialModalOpen(false);
    setSelectedPersona(null);
  };

  const columns = [
    {
      key: 'tipo_persona_desc',
      label: 'Tipo persona'
    },
    {
      key: 'nombre_completo',
      label: 'Nombre Completo'
    },
    {
      key: 'razon_social',
      label: 'Razón Social'
    },
    {
      key: 'nombre_comercial',
      label: 'Nombre Comercial'
    },
    {
      key: 'tipo_documento',
      label: 'Tipo Documento'
    },
    {
      key: 'numero_documento',
      label: 'N° Documento'
    },
    {
      key: 'tipo_usuario',
      label: 'Tipo de Usuario'
    },
    {
      key: 'nombre_de_usuario',
      label: 'Nombre de Usuario',
      render: (_value: any, row: any) => {
        
        // Validación más robusta para el array usuarios
        if (!row || !row.usuarios || !Array.isArray(row.usuarios) || row.usuarios.length === 0) {
          return 'N/A';
        }
        
        const usuario = row.usuarios[0];
        const nombreUsuario = usuario && usuario.nombre_de_usuario ? usuario.nombre_de_usuario : 'N/A';
        
        return nombreUsuario;
      }
    }
  ];

  const actions = [
    {
      label: 'Editar',
      render: (row: any) => {
        // Contar botones habilitados

        
        return (
          <button
            onClick={() => {
              setconfigurar(!configurar);
              handleEdit(row);
            }}
          >
             <img
               src="https://i.postimg.cc/hPVKjZ05/Grupo-1126.png"
               alt="Editar"
               className={`h-4 w-4 cursor-pointer`}
             />
          </button>
        );
      }
    }, 
    {
      label: 'Estado',
      render: (row: any) => {
        if (!row.is_active) {
          const isThisRowUpdating = updatingUserRowId === row.id_persona;
          
          return (
            <div className="relative">
              {isThisRowUpdating ? (
                <div className="h-4 w-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                </div>
              ) : (
                <img
                  onClick={() => {
                    if (!row.is_active && !isThisRowUpdating) {
                      setSelectedUserr({
                        id_persona: row?.id_persona,
                        nombre_completo: row?.nombre_completo,
                        isActive: true
                      });
                    }
                  }}
                  src="https://i.postimg.cc/xCycvywm/Grupo-1127.png"
                  alt="Inactivo"
                  className={`h-4 w-4 ${isThisRowUpdating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                />
              )}
            </div>
          );
        }
        return null;
      }
    },
    {
      label: 'Historial Direcciones',
      render: (row: any) => {
        
        return (
          <IconButton
            className={`h-4  w-4`}
            onClick={() => handleOpenHistorialModal(row)}
            sx={{
              color: theme === 'dark' ? 'white' : '#4D750F',
              '&:hover': {
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(77, 117, 15, 0.1)'
              }
            }}
            title="Ver historial de direcciones"
          >
            <VisibilityIcon />
          </IconButton>
        );
      }
    }
  ];

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      {configurar ? (
        <>
          <UsuarioConfi
            tipoUsuario={tipoUsuario}
            isSuperUsuario={isSuperUsuario}
            setIsSuperUsuario={setIsSuperUsuario}
            selectedUser={selectedUser}
            setEditar={setconfigurar}
            tipousuario={tipousuario}
          />
        </>
      ) : (
        <>
          {editar ? (
            <>
              <RegisterForm baseApiUrl={baseApiUrl!} tipoUsuario={tipoUsuario} />
              {/* <FormRegisterAdmin setEditar={setEditar} baseApiUrl={baseApiUrl!} /> */}
            </>
          ) : (
            <>
              <div className="w-full max-w-full px-2 sm:px-4 lg:px-6">
                <div className="w-full">
                  <div
                    className={`w-full rounded-xl p-3 sm:p-4 lg:p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
                  >
                    <div className={`rounded-xl p-3 sm:p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'} relative`}>
                      <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${theme === 'dark' ? 'text-white hover:text-red-300' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                      >
                        &times;
                      </button>

                      <div>
                        <h3
                          className={`mt-6 sm:mt-[39px] mb-6 sm:mb-10 text-center text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                        >
                          ADMINISTRAR USUARIOS
                        </h3>
                      </div>

                      <Grid container spacing={2} className="mb-4">
                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <AnimatedInput
                            type="text"
                            name="firstName"
                            id="firstName"
                            label="Primer Nombre"
                            value={formData.firstName}
                            onChange={handleChange}
                            darkMode={theme === 'dark'}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <AnimatedInput
                            type="text"
                            name="lastName"
                            id="lastName"
                            label="Primer Apellido"
                            value={formData.lastName}
                            onChange={handleChange}
                            darkMode={theme === 'dark'}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <AnimatedInput
                            type="text"
                            name="username"
                            id="username"
                            label="Nombre de Usuario"
                            value={formData.username}
                            onChange={handleChange}
                            darkMode={theme === 'dark'}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <div>
                            <AnimatedSelect
                              label="Tipo de Persona"
                              name="tipoPersona"
                              value={formData.tipoPersona}
                              onChange={handleChange}
                              options={dataTypePerson.map((value: any, index: number) => ({
                                key: index,
                                value: value[0],
                                title: value[1]
                              }))}
                              darkMode={theme === 'dark'}
                            />
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <div>
                            <AnimatedSelect
                              label="Tipo de Documento"
                              name="documentType"
                              value={formData.documentType}
                              onChange={handleChange}
                              options={documentTypes.map((value: any, index: number) => ({
                                key: index,
                                value: value.cod_tipo_documento,
                                title: value.nombre
                              }))}
                              darkMode={theme === 'dark'}
                            />
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4} marginTop={0}>
                          <div>
                            <AnimatedInput
                              type="text"
                              name="documentNumber"
                              id="documentNumber"
                              label="Número de Documento"
                              value={formData.documentNumber}
                              onChange={handleChange}
                              darkMode={theme === 'dark'}
                            />
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <div>
                            <AnimatedSelect
                              label="Tipo de Usuario"
                              name="tipoUsuario"
                              value={formData.tipoUsuario}
                              onChange={handleChange}
                              options={[
                                { key: 1, value: 'interno', title: 'Interno' },
                                { key: 2, value: 'externo', title: 'Externo' },
                              ]}
                              darkMode={theme === 'dark'}
                            />
                          </div>
                        </Grid>
                      </Grid>

                      <Grid container spacing={2} className="mb-4 justify-center">
                        <Grid item>
                          <div className="">
                            <Button title="Buscar" onClick={() => handleBuscarClick()} />
                          </div>
                        </Grid>

                        <Grid item>
                          <div className="">
                            <Button title="Limpiar" onClick={() => resetForm()} />
                          </div>
                        </Grid>

                        <Grid item>
                          <div className="">
                            <Button title="Salir" onClick={() => router.push('/')}
                            />
                          </div>
                        </Grid>
                      </Grid>
                    </div>

                    <div
                      className={`mt-4 sm:mt-7 rounded-xl p-3 sm:p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}
                    >
                      <h3
                        className={`mt-6 sm:mt-[39px] text-center text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                      >
                        BÚSQUEDA AVANZADA POR PERSONA
                      </h3>

                      <div className="mt-4 sm:mt-6 w-full overflow-x-auto">
                        <div className="admin-user-table min-w-full">
                          <DynamicTable
                            columns={columns}
                            data={user}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            actions={actions}
                            isLoading={isLoading}
                            fetchAllData={fetchAllData}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal de historial de direcciones */}
              {selectedPersona && (
                <HistoricoDireccionModal
                  isOpen={isHistorialModalOpen}
                  onClose={handleCloseHistorialModal}
                  personaId={selectedPersona.id_persona}
                  nombreCompleto={selectedPersona.nombre_completo}
                />
              )}
            </>
          )}
        </>
      )}
      
      {/* CSS personalizado para esta tabla específica */}
      <style jsx>{`
        .admin-user-table {
          width: 100%;
          min-width: 100%;
        }
        
        .admin-user-table th:last-child {
          min-width: 150px !important;
          width: 150px !important;
        }
        
        .admin-user-table td:last-child {
          min-width: 150px !important;
          width: 150px !important;
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .admin-user-table th:last-child {
            min-width: 120px !important;
            width: 120px !important;
          }
          
          .admin-user-table td:last-child {
            min-width: 120px !important;
            width: 120px !important;
          }
        }
        
        @media (max-width: 480px) {
          .admin-user-table th:last-child {
            min-width: 100px !important;
            width: 100px !important;
          }
          
          .admin-user-table td:last-child {
            min-width: 100px !important;
            width: 100px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default User;
