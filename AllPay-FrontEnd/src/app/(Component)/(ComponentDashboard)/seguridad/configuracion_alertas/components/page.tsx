'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { Grid, IconButton } from '@mui/material';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import AddIcon from '@mui/icons-material/Add'; // Ícono de agregar

// import { useRouter } from 'next/navigation';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { agregarPersonaAlertar } from '../services/roles.service';
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

  interface Props {
    claseSeleccionada: any;
    setShowModal:any;
  }
  
const baseApiUrl = process.env.BASE_API_URL;
const Busqueda_usuario: React.FC <Props>= ({claseSeleccionada , setShowModal }) => {
  // const router = useRouter();
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const isDarkMode = mounted && theme === 'dark';

  const valueSesion: any = session;

  const [user, setUser] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const buscarPersonasAll = async (page = 1): Promise<void> => {
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
      const url = `${baseApiUrl}personas/get-personas-filters-admin-user/?interno=true&primer_nombre=${formData.firstName}&primer_apellido=${formData.lastName}&nombre_de_usuario=${formData.username}&numero_documento=${formData.documentNumber}&page=${pageNumber}&tipo_documento=${formData.documentType}&tipo_persona=${formData.tipoPersona}`;

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
      setDataTypePerson(response.data.data);
    } catch (error) {}
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
    } catch (error) {}
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

  const fetchAllData = async (page: number) => {
    try {
      const url = `${baseApiUrl}personas/get-personas-filters-admin-user/?primer_nombre=${formData.firstName}&primer_apellido=${formData.lastName}&nombre_de_usuario=${formData.username}&numero_documento=${formData.documentNumber}&tipo_documento=${formData.documentType}&tipo_persona=${formData.tipoPersona}&page=${page}`;

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
      key: 'cargo',
      label: 'Cargo',
      render: (val: any) => val ? val : 'Sin cargo'
    },
    {
      key: 'tipo_documento',
      label: 'Tipo Documento'
    },
    {
      key: 'numero_documento',
      label: 'N° Documento'
    }
  ];

  const actions = [
    {
      label: 'Agregar',
      render: (row: any) => (
        <IconButton
          onClick={async () => {
            try {
              await agregarPersonaAlertar({
                valueSesion,
                id_persona: row?.id_persona,
                cod_clase_alerta: claseSeleccionada?.cod_clase_alerta,
                perfil_sistema: ''
              });
  
              const confirmar = await Swal.fire({
                icon: 'success',
                title: 'Persona agregada correctamente',
                text: '¿Deseas agregar otra persona a la alerta?',
                showCancelButton: true,
                confirmButtonText: 'Sí, agregar más',
                cancelButtonText: 'No, cerrar',
                reverseButtons: true,
                customClass: {
                  actions: 'flex gap-4 justify-end',
                  confirmButton: `
                    w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
                    hover:bg-[rgb(var(--green-80))] cursor-pointer flex items-center justify-center gap-2 
                    outline-none focus:outline-none
                  `,
                  cancelButton: `
                    w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
                    hover:bg-[rgb(var(--green-80))] cursor-pointer flex items-center justify-center gap-2 
                    outline-none focus:outline-none
                  `
                },
                buttonsStyling: false
              });
               
              if (!confirmar.isConfirmed) {
                setShowModal(false);
              }
            } catch (error: any) {
              const errorMessage =
                error?.response?.data?.detail || 'No se pudo agregar la persona a la alerta.';
  
              await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonText: 'Aceptar',
                customClass: {
                  confirmButton: `
                    w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
                    hover:bg-[rgb(var(--green-80))] cursor-pointer flex items-center justify-center gap-2 
                    outline-none focus:outline-none
                  `
                },
                buttonsStyling: false
              });
            }
          }}
          sx={{
            backgroundColor: 'rgb(var(--green))',
            color: 'white',
            borderRadius: '16px',
            transition: 'all 0.3s',
            '&:hover': {
              backgroundColor: 'rgb(var(--green-80))'
            },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed'
            },
            padding: '8px'
          }}
        >
          <AddIcon />
        </IconButton>
      )
    }
  ];
  
  
  
  


  return (
    // <div className="w-full">
    
        <>
          <>
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
              <div className="w-full p-1"> 
                    <div>
                      <h3
                        className={`mt-[39px] mb-10 text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                      >
                        Búsqueda  de Personas 
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div></div>
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
                          darkMode={isDarkMode}
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
                          darkMode={isDarkMode}
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
                          darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                        <div>
                          <AnimatedSelect
                            label="Tipo de Persona"
                            name="tipoPersona"
                            value={formData.tipoPersona}
                            onChange={handleChange}
                            darkMode={isDarkMode}
                            options={dataTypePerson.map((value: any, index: number) => ({
                              key: index,
                              value: value[0],
                              title: value[1]
                            }))}
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
                            darkMode={isDarkMode}
                            options={documentTypes.map((value: any, index: number) => ({
                              key: index,
                              value: value.cod_tipo_documento,
                              title: value.nombre
                            }))}
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
                            darkMode={isDarkMode}
                          />
                        </div>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
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

                      {/* <Grid item>
                        <div className="">
                          <Button title="Salir" onClick={() => router.push('/')} />
                        </div>
                      </Grid> */}
                    </Grid>
                  

                  <div className={`mt-7 rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <h3
                      className={`mt-[39px] text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      BÚSQUEDA AVANZADA POR PERSONA
                    </h3>

                    <Grid
                      container
                      spacing={2}
                      marginTop={2}
                      marginLeft={-1}
                      direction="row"
                      sx={{
                        justifyContent: 'space-around',
                        alignItems: 'center'
                      }}
                    >
                      <DynamicTable
                        columns={columns}
                        data={user}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        actions={actions}
                        isLoading={isLoading}
                        fetchAllData={fetchAllData}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                  </div>
                
              </div>
            </div>
          </>
        </>
  
    // </div>
  );
};

export default Busqueda_usuario;
