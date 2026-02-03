'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { JSX, useCallback, useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { useRouter } from 'next/navigation';

const baseApiUrl = process.env.BASE_API_URL;
const User: React.FC = () => {
  const router = useRouter();
  interface FormData {
    searchUser1: string;
    searchUser2: string;
    documentNumber: string;
    tipoPersona: string;
    documentType: string;
    fechainico: any;
    fechafin: Date | any;
    username: any;
  }

  const initialFormData: FormData = {
    searchUser1: '',
    searchUser2: '',
    documentNumber: '',
    tipoPersona: '',
    documentType: '',
    fechainico: '',
    fechafin: '',
    username: ''
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const valueSesion: any = session;

  // const [openModalCreate, setModalCreate] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [user, setUser] = useState<any[]>([]);

  const buscarPersonasAll = async (page = 1): Promise<void> => {
    // Verificar que la sesión esté disponible antes de continuar
    if (!valueSesion?.user?.tokens?.access) {
      return;
    }

    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber < 1) {
      console.error('El valor de "page" no es un número válido:', page);
      Swal.fire({
        icon: 'warning',
        title: 'Página inválida',
        text: 'El número de página debe ser un número válido mayor a 0.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton:
            'rounded-2xl bg-[#4D750F] px-6 py-2 text-white transition hover:bg-green-800'
        },
        buttonsStyling: false
      });
      return;
    }

    const { fechainico, fechafin, tipoPersona } = formData;

    // Validamos fechas
    const fechaInicioValida = fechainico?.length === 10 && !isNaN(new Date(fechainico).getTime());
    const fechaFinValida = fechafin?.length === 10 && !isNaN(new Date(fechafin).getTime());

    if (fechaInicioValida && fechaFinValida) {
      const fechaInicio = new Date(fechainico);
      const fechaFin = new Date(fechafin);

      const diffInMs = fechaFin.getTime() - fechaInicio.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays > 31 || diffInDays < 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Rango de fechas inválido',
          text: 'La diferencia entre las fechas debe ser máximo 1 mes y la fecha final no debe ser menor que la inicial.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton:
              'rounded-2xl bg-[#4D750F] px-6 py-2 text-white transition hover:bg-green-800'
          },
          buttonsStyling: false
        });
        return;
      }
    }

    try {
      const url = `${baseApiUrl}auditorias/get-list/?fecha_inicio=${fechainico}&fecha_fin=${fechafin}&page=${pageNumber}&id_modulo=${tipoPersona}`;

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

      Swal.fire({
        icon: 'error',
        title: 'Error al obtener los datos',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton:
            'rounded-2xl bg-[#4D750F] px-6 py-2 text-white transition hover:bg-green-800'
        },
        buttonsStyling: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  interface Modulo {
    id_modulo: number;
    nombre_modulo: string;
  }
  const [dataTypePerson, setDataTypePerson] = useState<Modulo[]>([]);
const obtenerTiposPersona = useCallback(async () => {
  // Verificar que la sesión esté disponible antes de continuar
  if (!valueSesion?.user?.tokens?.access) {
    return;
  }

  try {
    const response = await axios
      .get(`${baseApiUrl}permisos/modulos/get-list/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      })
      .catch(function (error) {
        return error.response;
      });

    if (response.data.success === false) {
      throw response.data.detail;
    }

    const sortedData = response.data.data.sort((a: any, b: any) =>
      a.nombre_modulo.localeCompare(b.nombre_modulo, 'es', { sensitivity: 'base' })
    );

    setDataTypePerson(sortedData);
  } catch (error) {
    console.log(error);
  }
}, [valueSesion?.user?.tokens?.access]);


  const [, setDocumentTypes] = useState([]);
  const obtenerTiposDocumento = useCallback(async () => {
    // Verificar que la sesión esté disponible antes de continuar
    if (!valueSesion?.user?.tokens?.access) {
      return;
    }

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
  }, [valueSesion?.user?.tokens?.access]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Solo ejecutar cuando el componente esté montado, la sesión esté autenticada y el token esté disponible
    if (mounted && status === 'authenticated' && valueSesion?.user?.tokens?.access) {
      obtenerTiposPersona();
      obtenerTiposDocumento();
    }
  }, [mounted, obtenerTiposPersona, obtenerTiposDocumento, status, valueSesion?.user?.tokens?.access]);

  const handleBuscarClick = () => {
    buscarPersonasAll(1);
  };
  
  useEffect(() => {
    // Solo ejecutar cuando el componente esté montado, la sesión esté autenticada y el token esté disponible
    if (mounted && status === 'authenticated' && valueSesion?.user?.tokens?.access) {
      buscarPersonasAll(currentPage);
    }
  }, [mounted, currentPage, status, valueSesion?.user?.tokens?.access]);

  const fetchAllData = async (page: number) => {
    // Verificar que la sesión esté disponible antes de continuar
    if (!valueSesion?.user?.tokens?.access) {
      return {
        data: [],
        total_pages: 0
      };
    }

    try {
      const url = `${baseApiUrl}auditorias/get-list/?fecha_inicio=${formData.fechainico}&fecha_fin=${formData.fechafin}&page=${page}&id_modulo=${formData.tipoPersona}`;

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

  const [openModal, setOpenModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const handleOpenModal = (rowData: any) => {
    setSelectedRow(rowData);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedRow(null);
  };

  const formatDescripcionForTable = (descripcion: string): JSX.Element => {
    try {
      const parsed = JSON.parse(descripcion);

      const lines = [];

      // Si tiene "Mensaje", lo ponemos primero
      if (parsed.Mensaje) {
        lines.push(`Mensaje: ${parsed.Mensaje}`);
        delete parsed.Mensaje;
      }

      // El resto de campos
      for (const [key, value] of Object.entries(parsed)) {
        lines.push(`${key}: ${value}`);
      }

      // Retornamos un <div> con cada línea separada
      return (
        <div>
          {lines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      );
    } catch (error) {
      // Si no es JSON válido, lo mostramos tal cual
      return <div>{descripcion}</div>;
    }
  };

  const formatDescripcionForModal = (descripcion: string): JSX.Element => {
    try {
      const parsed = JSON.parse(descripcion);

      const lines = [];

      // Mostrar primero el Mensaje, si existe
      if (parsed.Mensaje) {
        lines.push(`Mensaje: ${parsed.Mensaje}`);
        delete parsed.Mensaje;
      }

      // El resto de campos
      for (const [key, value] of Object.entries(parsed)) {
        lines.push(`${key}: ${value}`);
      }

      return (
        <div className="space-y-1">
          {lines.map((line, index) => (
            <p key={index}>-- {line}</p>
          ))}
        </div>
      );
    } catch (error) {
      // Si no es JSON válido, lo mostramos tal cual
      return <p>{descripcion}</p>;
    }
  };

  const columns = [
    {
      key: 'nombre_de_usuario',
      label: 'Nombre de Usuario'
    },
    {
      key: 'nombre_completo',
      label: 'Nombre Completo'
    },
    {
      key: 'nombre_modulo',
      label: 'Nombre Módulo'
    },
    {
      key: 'fecha_accion',
      label: 'Fecha Acción',
      render: (value: string) => {
        return value
          ? new Date(value).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
          : 'Fecha no disponible';
      }
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) => formatDescripcionForTable(value)
    }
  ];

  const isDarkMode = mounted && theme === 'dark';

  const actions = [
    {
      label: 'Ver',
      render: (row: any) => (
        <IconButton
          onClick={() => handleOpenModal(row)}
          sx={{
            color: isDarkMode ? 'white' : '#562707',
            '&:hover': {
              backgroundColor:
                isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(86, 39, 7, 0.1)'
            }
          }}
        >
          <VisibilityIcon />
        </IconButton>
      )
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full">
      <>
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                  <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                  >
                    &times;
                  </button>

                  <div>
                    <h3
                      className={`mt-[39px] mb-10 text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      AUDITORÍA
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div></div>
                  </div>

                  <Grid container spacing={2} className="mb-4">
                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="date"
                        name="fechainico"
                        id="fechainico"
                        label="Fecha de inicio"
                        value={formData.fechainico}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="date"
                        name="fechafin"
                        id="fechafin"
                        label="Fecha de finalización"
                        value={formData.fechafin}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <div>
                        <AnimatedSelect
                          label="Búsqueda por módulo"
                          name="tipoPersona"
                          value={formData.tipoPersona}
                          onChange={handleChange}
                          darkMode={isDarkMode}
                          options={dataTypePerson.map((value: any, index: number) => ({
                            key: index,
                            value: value.id_modulo,
                            title: value.nombre_modulo
                          }))}
                        />
                      </div>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                    <Grid item>
                      <Button title="Buscar" onClick={() => handleBuscarClick()} />
                    </Grid>

                    <Grid item>
                      <Button title="Limpiar" onClick={() => setFormData(initialFormData)} />
                    </Grid>

                    <Grid item>
                      <Button title="Salir" onClick={() => router.push('/')} />
                    </Grid>
                  </Grid>
                </div>

                <div className={`mt-7 rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                  <h3
                    className={`mt-[39px] mb-10 text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                  >
                    RESULTADOS CONSULTA DE AUDITORÍA
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
                    />
                  </Grid>

                  <ModalContainer isOpen={openModal} onClose={() => setOpenModal(false)}>
                    <div className="space-y-4">
                      <div>
                        <h3
                          className={`mb-10 text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                        >
                          AUDITORÍA
                        </h3>
                      </div>
                      {selectedRow && (
                        <div className={`space-y-2 ${isDarkMode ? 'text-white' : ''}`}>
                          <p>
                            <strong>Nombre Usuario:</strong> {selectedRow.nombre_de_usuario}
                          </p>
                          <p>
                            <strong>Nombre Completo:</strong> {selectedRow.nombre_completo}
                          </p>
                          <p>
                            <strong>Nombre Módulo:</strong> {selectedRow.nombre_modulo}
                          </p>
                          <p>
                            <strong>Fecha Acción:</strong>{' '}
                            {selectedRow.fecha_accion
                              ? new Date(selectedRow.fecha_accion).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })
                              : 'Fecha no disponible'}
                          </p>
                          <div>
                            <strong>Descripción:</strong>
                            <div className="mt-1">
                              {formatDescripcionForModal(selectedRow.descripcion)}
                            </div>
                          </div>
                        </div>
                      )}{' '}
                      <Grid
                        container
                        direction="row"
                        marginTop={2}
                        sx={{
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Button title="Cerrar" onClick={handleCloseModal} />
                      </Grid>
                    </div>
                  </ModalContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      </>
    </div>
  );
};

export default User;
