'use client';

import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  deleteFechaClaseAlerta,
  eliminarPersonaAlertar,
  getClasesAlertas,
  getFechasClaseAlerta,
  getNivelesPrioridad,
  getPerfilesSistema,
  getPersonasAlertar,
  getPersonasAlertarPaginated,
  guardarPersonaAlertar,
  postFechaClaseAlerta,
  putActualizarClaseAlerta
} from './services/roles.service';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Grid } from '@mui/material';
import { signIn, useSession } from 'next-auth/react';
import Busqueda_usuario from './components/page';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import Swal from 'sweetalert2';
import Delet_icon from '@/presenters/components/shared/logo/logodelet';
import AnimatedSwitch from '@/presenters/components/ui/AnimatedSwitch';
import AlertError from '@/presenters/components/recaudadores/AlertError';

const Configuracion_alertas: React.FC = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const valueSesion: any = session;

  interface FormData {
    Tipo_configuracion: string;
  }

  const initialFormData: FormData = {
    Tipo_configuracion: ''
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      agno_consecutivo: 23
    }));
  }, []);

  const [claseSeleccionada, setClaseSeleccionada] = useState<any | null>(null);
  const [isLoadingClases, setIsLoadingClases] = useState<boolean>(false);
  const [errorClases, setErrorClases] = useState<string | null>(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));

    // Buscar el objeto completo seleccionado
    const seleccion = clasesAlertas.find((item) => item.cod_clase_alerta === value);

    if (seleccion) {
      setClaseSeleccionada(seleccion);
    }
  };

  const [clasesAlertas, setClasesAlertas] = useState<any[]>([]);

  const obtenerClases = async () => {
    if (!valueSesion?.user?.tokens?.access) {
      console.warn('No hay token de acceso disponible');
      return;
    }

    setIsLoadingClases(true);
    setErrorClases(null);
    
    try {
      const data = await getClasesAlertas(valueSesion);
      
      if (data && Array.isArray(data)) {
        setClasesAlertas(data);
        setErrorClases(null); // Limpiar errores previos
      } else {
        console.warn('Los datos recibidos no son válidos:', data);
        const errorMsg = 'Datos inválidos recibidos del servidor';
        setErrorClases(errorMsg);
        setErrorMessage(errorMsg);
        setShowErrorAlert(true);
      }
    } catch (error: any) {
      // El servicio getClasesAlertas ya extrae el detail del error
      const errorMsg = error?.message || 'Error desconocido al cargar clases de alerta';
      console.error('Error al cargar clases de alerta:', errorMsg);
      setErrorClases(errorMsg);
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
    } finally {
      setIsLoadingClases(false);
    }
  };

  // useEffect principal para cargar clases cuando la sesión esté disponible (solo una vez)
  useEffect(() => {
    if (valueSesion?.user?.tokens?.access && clasesAlertas.length === 0 && !isLoadingClases) {
      obtenerClases();
    }
  }, [valueSesion?.user?.tokens?.access]); // Solo depende del token

  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    {
      key: 'datos_reordenados.destinatario',
      label: 'Perfil',
      render: (_: any, row: any) => row.datos_reordenados?.destinatario || '-----------'
    },
    {
      key: 'nombre_completo',
      label: 'Nombre',
      render: (val: any) => (val ? val : '-----------')
    },
    // {
    //   key: 'numero_documento',
    //   label: 'Documento',
    //   render: (val: any) => val ? val : '-------'
    // },
    {
      key: 'cargo' ,
      label: 'Cargo',
      render: (_: any, row: any) => row?.cargo || 'Sin cargo'
    },
    {
      key: 'datos_reordenados.detalle',
      label: 'Detalle',
      render: (_: any, row: any) => row.datos_reordenados?.detalle || '-------'
    },
   
    {
      key: 'es_responsable_directo',
      label: 'Responsable',
      render: (val: boolean) => (val ? 'Sí' : 'No')
    }
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await getPersonasAlertar(
        claseSeleccionada?.cod_clase_alerta,
        valueSesion?.user?.tokens?.access
      );
      setData(result);
    } catch (error) {
      console.error('Error al obtener personas a alertar:', error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (claseSeleccionada?.cod_clase_alerta) {
      fetchData();
    }
  }, [claseSeleccionada, showModal, showModal2]);

  const fetchAllPersonasAlertar = async (page: number) => {
    const codClase = claseSeleccionada?.cod_clase_alerta;
    if (!valueSesion) return { data: [], total_pages: 1 };

    return await getPersonasAlertarPaginated({
      codClaseAlerta: codClase,
      valueSesion,
      page
    });
  };

  const [perfiles, setPerfiles] = useState<{ key: number; value: string; title: string }[]>([]);
  const [selectedPerfil, setSelectedPerfil] = useState<string>('');

  useEffect(() => {
    const cargarPerfiles = async () => {
      try {
        const data = await getPerfilesSistema(valueSesion);
        const options = data.map((item: [string, string], index: number) => ({
          key: index,
          value: item[0],
          title: item[1]
        }));
        setPerfiles(options);
      } catch (error) {
        console.error('Error al cargar perfiles:', error);
      }
    };

    if (valueSesion?.user?.tokens?.access) cargarPerfiles();
  }, []);

  const [nivelesPrioridad, setNivelesPrioridad] = useState<
    { key: number; value: string; title: string }[]
  >([]);
  const [selectedNivel, setSelectedNivel] = useState<string>('');

  useEffect(() => {
    const cargarNiveles = async () => {
      try {
        const data = await getNivelesPrioridad(valueSesion);
        const opciones = data.map((item: [string, string], idx: number) => ({
          key: idx,
          value: item[0],
          title: item[1]
        }));
        setNivelesPrioridad(opciones);
      } catch (error) {
        console.error('Error al cargar niveles de prioridad:', error);
      }
    };

    if (valueSesion?.user?.tokens?.access) cargarNiveles();
  }, []);

  const [activa, setActiva] = useState<boolean>(true);
  const [enviosEmail, setEnviosEmail] = useState<boolean>(true);

  const handleActualizarClase = async () => {
    try {
      await putActualizarClaseAlerta({
        codClaseAlerta: claseSeleccionada?.cod_clase_alerta,
        data: {
          nivel_prioridad: selectedNivel,
          activa: activa,
          envios_email: enviosEmail
        },
        valueSesion
      });

      await obtenerClases(); // 🔄 Recargar clases

      await Swal.fire({
        icon: 'success',
        title: 'Actualizado correctamente',
        text: 'La configuración fue guardada exitosamente.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: error?.message || 'No se pudo completar la operación.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    }
  };

  const handleGuardar = async () => {
    try {
      await guardarPersonaAlertar({
        perfil_sistema: selectedPerfil,
        cod_clase_alerta: claseSeleccionada?.cod_clase_alerta,
        id_persona: null,
        valueSesion
      });

      await Swal.fire({
        icon: 'success',
        title: 'Guardado correctamente',
        text: 'La persona fue agregada a la alerta',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
      setShowModal2(false);
      fetchData(); // 🔄 Recargar la tabla
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || error?.message || 'No se pudo completar la operación.';

      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    }
  };

  const actions = [
    {
      label: 'Eliminar',
      render: (row: any) => (
        <button
          onClick={async () => {
            const confirmar = await Swal.fire({
              title: '¿Estás seguro?',
              text: `Vas a eliminar a ${row.nombre_completo} de la lista`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, eliminar',
              cancelButtonText: 'Cancelar',
              reverseButtons: true, // 🔁 para que "Cancelar" esté a la izquierda
              customClass: {
                actions: 'flex gap-4 justify-end', // ✅ separación entre botones
                confirmButton: `
                  ${'Sí, eliminar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
                  py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
                  hover:bg-[rgb(var(--green-80))] cursor-pointer flex items-center justify-center gap-2 
                  outline-none focus:outline-none
                `,
                cancelButton: `
                  ${'Cancelar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
                  py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
                  hover:bg-[rgb(var(--green-80))] cursor-pointer flex items-center justify-center gap-2 
                  outline-none focus:outline-none
                `
              },
              buttonsStyling: false
            });

            if (confirmar.isConfirmed) {
              try {
                await eliminarPersonaAlertar(row.id_persona_alertar, valueSesion);

                await Swal.fire({
                  icon: 'success',
                  title: 'Eliminado',
                  text: 'La persona ha sido eliminada',
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

                fetchData(); // Actualiza la tabla
              } catch (error) {
                await Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'No se pudo eliminar',
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
            }
          }}
          className="p-2 hover:opacity-80"
        >
          <Delet_icon />
        </button>
      )
    }
  ];

  useEffect(() => {
    if (claseSeleccionada) {
      setSelectedNivel(claseSeleccionada.nivel_prioridad || '');
      setActiva(claseSeleccionada.activa ?? true);
      setEnviosEmail(claseSeleccionada.envios_email ?? true);
    }
  }, [claseSeleccionada]);

  const [dia, setDia] = useState<string>('');
  const [mes, setMes] = useState<string>('');
  const [anio, setAnio] = useState<string>(''); // opcional

  const handleGuardarFecha = async () => {
    if (!claseSeleccionada?.cod_clase_alerta || !dia || !mes) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Debes seleccionar , día y mes',
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
      return;
    }

    try {
      await postFechaClaseAlerta({
        cod_clase_alerta: claseSeleccionada.cod_clase_alerta,
        dia_cumplimiento: parseInt(dia),
        mes_cumplimiento: parseInt(mes),
        age_cumplimiento: anio ? parseInt(anio) : null,
        valueSesion
      });

      await Swal.fire({
        icon: 'success',
        title: 'Fecha guardada',
        text: 'La fecha se registró correctamente',
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
      setDia('');
      setMes('');
      setAnio('');
      fetchFechas(); // 🔄 Recargar tabla
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error?.response?.data?.detail || error.message || 'No se pudo guardar la fecha',
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
  };

  const [fechas, setFechas] = useState<any[]>([]);
  const [currentPageFecha, setCurrentPageFecha] = useState(1);
  const itemsPerPageFecha = 10;
  const totalPagesFecha = Math.ceil(fechas.length / itemsPerPageFecha);
  const paginatedFechas = fechas.slice(
    (currentPageFecha - 1) * itemsPerPageFecha,
    currentPageFecha * itemsPerPageFecha
  );

  const columnasFecha = [
    { key: 'dia_cumplimiento', label: 'Día' },
    { key: 'mes_cumplimiento', label: 'Mes' },
    { key: 'age_cumplimiento', label: 'Año' }
  ];
  const fetchFechas = async () => {
    try {
      const data = await getFechasClaseAlerta({
        codClaseAlerta: claseSeleccionada?.cod_clase_alerta,
        accessToken: valueSesion.user.tokens.access
      });
      setFechas(data);
    } catch (error) {
      console.error('Error al cargar fechas:', error);
    }
  };

  useEffect(() => {
    if (claseSeleccionada?.cod_clase_alerta) {
      fetchFechas();
    }
  }, [claseSeleccionada]);
  const fetchAllFechasClaseAlerta = async (_page: number) => {
    try {
      const data = await getFechasClaseAlerta({
        codClaseAlerta: claseSeleccionada?.cod_clase_alerta,
        accessToken: valueSesion.user.tokens.access
      });

      return {
        data,
        total_pages: 1
      };
    } catch (error) {
      console.error('Error al obtener todas las fechas:', error);
      return { data: [], total_pages: 1 };
    }
  };
  const actionsFecha = [
    {
      label: 'Eliminar',
      render: (row: any) => (
        <button
          onClick={async () => {
            const confirmar = await Swal.fire({
              title: '¿Eliminar fecha?',
              text: `Día ${row.dia_cumplimiento}/${row.mes_cumplimiento}/${row.age_cumplimiento}`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, eliminar',
              cancelButtonText: 'Cancelar',
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

            if (confirmar.isConfirmed) {
              try {
                await deleteFechaClaseAlerta({
                  idFecha: row.id_fecha,
                  accessToken: valueSesion.user.tokens.access
                });

                await Swal.fire({
                  icon: 'success',
                  title: 'Fecha eliminada',
                  text: 'La fecha fue eliminada correctamente',
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

                fetchFechas(); // 🔄 recargar los datos
              } catch (error: any) {
                await Swal.fire({
                  icon: 'error',
                  title: 'Error al eliminar',
                  text: error?.message || 'No se pudo eliminar la fecha',
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
            }
          }}
          className="p-2 hover:opacity-80"
        >
          <Delet_icon />
        </button>
      )
    }
  ];

  return (
    <>
      <AlertError 
        isOpen={showErrorAlert} 
        onClose={() => setShowErrorAlert(false)} 
        message={errorMessage} 
      />
      
      <ModalContainer isOpen={showModal2} onClose={() => setShowModal2(false)}>
        <div className="relative mt-[39px] flex items-center justify-center">
          <h3
            className={`text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
          >
            Configuración de Perfil
          </h3>
        </div>
        <Grid container spacing={2} direction="row" marginTop={2} justifyContent="center">
          <Grid item xs={12} sm={6}>
            <AnimatedSelect
              name="perfil_sistema"
              label="Perfil del Sistema"
              value={selectedPerfil}
              onChange={(e) => setSelectedPerfil(e.target.value)}
              options={perfiles}
              darkMode={isDarkMode}
            />
          </Grid>
        </Grid>

        <Grid container direction="row" marginTop={2} justifyContent="center">
          <Grid item>
            <Button title="Guardar" onClick={handleGuardar} disabled={!selectedPerfil} />
          </Grid>
        </Grid>
      </ModalContainer>

      <ModalContainer isOpen={showModal} onClose={() => setShowModal(false)} size="6xl">
        <Busqueda_usuario claseSeleccionada={claseSeleccionada} setShowModal={setShowModal} />
      </ModalContainer>
      <div className="w-full">
        <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
          <div className="w-full p-1">
            <div
              className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
            >
              <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                <button
                  onClick={() => router.push('/')}
                  className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                >
                  &times;
                </button>

                <div className="relative mt-[39px] flex items-center justify-center">
                  <h3
                    className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                  >
                    CONFIGURACIÓN DE ALERTAS
                  </h3>
                </div>

                <Grid container direction="row" spacing={2} marginTop={2} justifyContent="center">
                  <Grid item xs={12} sm={5}>
                    <AnimatedSelect
                      name="Tipo_configuracion"
                      label={isLoadingClases ? "Cargando clases..." : errorClases ? "Error al cargar" : "Clase de Alerta"}
                      value={formData.Tipo_configuracion}
                      onChange={handleSelectChange}
                      disabled={isLoadingClases || !!errorClases}
                      darkMode={isDarkMode}
                      options={
                        isLoadingClases
                          ? [{ key: 0, value: '', title: 'Cargando...' }]
                          : errorClases
                          ? [{ key: 0, value: '', title: 'Error al cargar datos' }]
                          : clasesAlertas.length > 0
                          ? [
                              ...clasesAlertas.map((item, idx) => ({
                                key: idx,
                                value: item.cod_clase_alerta,
                                title: item.nombre_clase_alerta
                              }))
                            ]
                          : [{ key: 0, value: '', title: 'No hay clases disponibles' }]
                      }
                    />
                    {errorClases && (
                      <div className={`mt-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {errorClases}
                        <button
                          onClick={obtenerClases}
                          className={`ml-2 underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                  </Grid>
                </Grid>
              </div>
              {claseSeleccionada ? (
                <>
                  <div
                    className={`mt-4 rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}
                  >
                    <>
                      <div className="relative mt-[39px] flex items-center justify-center">
                        <h3
                          className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                        >
                          CONFIGURACIÓN DE ALERTAS
                        </h3>
                      </div>

                      <Grid
                        container
                        direction="row"
                        spacing={2}
                        marginTop={2}
                        justifyContent="center"
                      >
                        <Grid item>
                          <Button title="Personas" onClick={() => setShowModal(true)} />
                        </Grid>

                        <Grid item>
                          <Button title="Perfil" onClick={() => setShowModal2(true)} />
                        </Grid>
                        <Grid item xs={12}>
                          <DynamicTable
                            columns={columns}
                            data={paginatedData || []}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            fetchAllData={fetchAllPersonasAlertar}
                            isLoading={isLoading}
                            actions={actions}
                            darkMode={isDarkMode}
                          />
                        </Grid>
                      </Grid>
                    </>
                  </div>
                  {claseSeleccionada?.cod_tipo_clase_alerta === 'FF' && (
                    <>
                      <div
                        className={`mt-4 rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}
                      >
                        <div className="relative mt-[39px] flex items-center justify-center">
                          <h3
                            className={`text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                          >
                            CONFIGURACIÓN DE FECHAS
                          </h3>
                        </div>
                        <Grid
                          container
                          direction="row"
                          spacing={2}
                          marginTop={4}
                          justifyContent="center"
                        >
                          <Grid item xs={12} sm={3}>
                            <AnimatedSelect
                              name="dia"
                              label="Día"
                              value={dia}
                              onChange={(e) => setDia(e.target.value)}
                              darkMode={isDarkMode}
                              options={Array.from({ length: 31 }, (_, i) => ({
                                key: i + 1,
                                value: String(i + 1),
                                title: String(i + 1)
                              }))}
                            />
                          </Grid>

                          <Grid item xs={12} sm={3}>
                            <AnimatedSelect
                              name="mes"
                              label="Mes"
                              value={mes}
                              onChange={(e) => setMes(e.target.value)}
                              darkMode={isDarkMode}
                              options={Array.from({ length: 12 }, (_, i) => ({
                                key: i + 1,
                                value: String(i + 1),
                                title: String(i + 1)
                              }))}
                            />
                          </Grid>

                          <Grid item xs={12} sm={3}>
                            <AnimatedSelect
                              name="anio"
                              label="Año "
                              value={anio}
                              onChange={(e) => setAnio(e.target.value)}
                              darkMode={isDarkMode}
                              options={Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return { key: i, value: String(year), title: String(year) };
                              })}
                            />
                          </Grid>
                        </Grid>
                        <Grid
                          container
                          direction="row"
                          spacing={2}
                          marginTop={4}
                          justifyContent="center"
                        >
                          <Grid item margin={-1}>
                            <Button title="Guardar Fecha" onClick={handleGuardarFecha} />
                          </Grid>
                        </Grid>
                        <DynamicTable
                          columns={columnasFecha}
                          data={paginatedFechas}
                          currentPage={currentPageFecha}
                          totalPages={totalPagesFecha}
                          onPageChange={setCurrentPageFecha}
                          isLoading={false}
                          fetchAllData={fetchAllFechasClaseAlerta}
                          actions={actionsFecha}
                          darkMode={isDarkMode}
                        />
                      </div>
                    </>
                  )}

                  <div
                    className={`mt-4 rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}
                  >
                    <div className="relative mt-[39px] flex items-center justify-center">
                      <h3
                        className={`text-center text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                      >
                        CONFIGURACIÓN DE PRIORIDAD
                      </h3>
                    </div>
                    <Grid
                      container
                      direction="row"
                      spacing={2}
                      marginTop={4}
                      justifyContent="center"
                    >
                      <Grid item xs={12} sm={3}>
                        <AnimatedSelect
                          name="nivel_prioridad"
                          label="Nivel de Prioridad"
                          value={selectedNivel}
                          onChange={(e: any) => setSelectedNivel(e.target.value)}
                          options={nivelesPrioridad}
                          darkMode={isDarkMode}
                        />
                      </Grid>
                      <Grid item>
                        <AnimatedSwitch label="Activa" checked={activa} onChange={setActiva} darkMode={isDarkMode} />
                      </Grid>

                      <Grid item>
                        <AnimatedSwitch
                          label="Envíos por email"
                          checked={enviosEmail}
                          onChange={setEnviosEmail}
                          darkMode={isDarkMode}
                        />
                      </Grid>
                    </Grid>

                    <Grid
                      container
                      direction="row"
                      spacing={2}
                      marginTop={2}
                      justifyContent="center"
                    >
                      <Grid item>
                        <Button title="Guardar " onClick={() => handleActualizarClase()} />
                      </Grid>
                    </Grid>
                  </div>
                </>
              ) : (
                <></>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Configuracion_alertas;
