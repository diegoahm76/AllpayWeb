'use client';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import IconButton from '@mui/material/IconButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRouter } from 'next/navigation';
import {
  post_configuracion_consecutivo,
  obtenerDatosExcelConfiguracion,
  getTiposCobro,
  deleteConfiguracionConsecutivo,
  patch_configuracion_consecutivo
} from './services/configuracion_consecutivo.service';
import Update_icon from '@/presenters/components/ui/Update';
import { FormData, ConfiguracionConsecutivoAPI } from './models/types';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import Delet_icon from '@/presenters/components/shared/logo/logodelet';
import EditConsecutivoModal from './components/EditConsecutivoModal';

const baseApiUrl = process.env.BASE_API_URL;
const User: React.FC = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const initialFormData: FormData = {
    tipoPersona: '',
    fechainico: '',
    fechafin: '',
    cantidad_digitos: '',
    activo: false,
    // cod_tipo_cobro: '',
    prefijo_consecutivo: '',
    consecutivo_inicial: ''
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editId, setEditId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedConsecutivo, setSelectedConsecutivo] = useState<ConfiguracionConsecutivoAPI | null>(null);
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleEditConsecutivo = (row: ConfiguracionConsecutivoAPI) => {
    setSelectedConsecutivo(row);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedConsecutivo(null);
  };

  const handleEditSuccess = () => {
    buscarPersonasAll(currentPage);
  };


  const { theme } = useTheme();
  const isDarkMode = mounted && theme === 'dark';

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, ] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any[]>([]);
  const [
    // tiposCobro
    , setTiposCobro] = useState<{ key: number; value: string; title: string }[]>([]);

  const buscarPersonasAll = async (page = 1, sinPaginacion = false): Promise<void> => {
    const pageNumber = Number(page);

    if (!sinPaginacion && (isNaN(pageNumber) || pageNumber < 1)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Página inválida',
        text: 'El número de página debe ser un número válido mayor a 0.',
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
      return;
    }

    setIsLoading(true); // ✅ Establecer loading al inicio

    try {
      const url = `${baseApiUrl}documentos/configuracion_consecutivo/`;

      const params: any = {};
      
      if (sinPaginacion) {
        params.sin_paginacion = true;
      } else {
        params.page = pageNumber;
        params.page_size = pageSize;
      }

      const response = await axios.get(url, {
        params,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (
        !response.data.success ||
        !Array.isArray(response.data.data) ||
        response.data.data.length === 0
      ) {
        setUser([]); // ✅ Limpiar si no hay data
        throw new Error(response.data.detail || 'No se encontraron registros.');
      }

      setUser(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error: unknown) {
      console.error('Error en buscarPersonasAll:', error);
      setUser([]) 

      let errorMessage = 'Ocurrió un problema, intenta nuevamente';
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.log(errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Solo cargar datos cuando el componente se monta por primera vez
    if (token) {
      buscarPersonasAll(currentPage);
      // Cargar tipos de cobro
      getTiposCobro(token).then(setTiposCobro);
    }
  }, [token]); // ✅ Dependencia correcta

  useEffect(() => {
    // Recargar datos cuando cambie la página o el tamaño de página
    if (token) {
      buscarPersonasAll(currentPage);
    }
  }, [currentPage, pageSize]);

  // Función para obtener todos los datos para Excel
  const obtenerDatosParaExcel = async (): Promise<any[]> => {
    try {
      const url = `${baseApiUrl}documentos/configuracion_consecutivo/`;
      
      const response = await axios.get(url, {
        params: {
          sin_paginacion: true
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener datos para Excel:', error);
      return [];
    }
  };

  const columns = [
    {
      key: 'consecutivo_inicial',
      label: 'Consecutivo Inicial'
    },
    {
      key: 'cantidad_digitos',
      label: 'Cantidad de Digitos'
    },

    {
      key: 'anio_consecutivo',
      label: 'Año Consecutivo'
    },
    {
      key: 'prefijo_consecutivo',
      label: 'Prefijo'
    },
    {
      key: 'consecutivo_actual',
      label: 'Consecutivo Actual'
    },
    {
      key: 'fecha_configuracion',
      label: 'Fecha Configuración',
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
    }
  ];

  const actions = [
    {
      label: 'Editar',
      render: (row: any) => (
        <IconButton
       
        sx={{
          p: 0.5,                      
          color: isDarkMode ? 'white' : '#562707',

          '&:hover': {
            backgroundColor: isDarkMode
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(86,39,7,0.1)',
          },
        }}
          onClick={() => handleEditConsecutivo(row)}
        >
          <Update_icon />
        </IconButton>
      )
    },
    {
      label: 'Eliminar',
      render: (row: any) => (
        <IconButton
          sx={{
            color: 'red',
            '&:hover': {
              backgroundColor: 'rgba(255, 0, 0, 0.1)'
            }
          }}
          onClick={async () => {
            const success = await deleteConfiguracionConsecutivo(
              row.id_config_consecutivo,
              token,
              buscarPersonasAll
            );
            if (success) buscarPersonasAll(currentPage);
          }}
        >
          <Delet_icon />
        </IconButton>
      )
    }
  ];
 
  return (
    <div className="w-full">
      <>
        <>
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
        <div>
                    <h3
                      className={`mb-10 text-center text-xl sm:text-2xl lg:text-3xl mt-6 font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      CONFIGURACIÓN DE CONSECUTIVOS
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div></div>
                  </div>

                  <Grid container spacing={2} className="mb-4">
                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="number"
                        name="consecutivo_inicial"
                        label="Consecutivo Inicial"
                        value={formData.consecutivo_inicial}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="number"
                        id="cantidad_digitos"
                        name="cantidad_digitos"
                        label="Cantidad de Digitos"
                        value={formData.cantidad_digitos}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    {/* <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedSelect
                        label="Código Tipo Cobro"
                        name="cod_tipo_cobro"
                        value={formData.cod_tipo_cobro}
                        onChange={handleChange}
                        options={tiposCobro}
                      />
                    </Grid> */}

                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="text"
                        name="prefijo_consecutivo"
                        label="Prefijo"
                        value={formData.prefijo_consecutivo}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    {/* <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedSwitch
                        label="Activo"
                        checked={formData.activo}
                        onChange={(val) => setFormData((prev) => ({ ...prev, activo: val }))}
                        disabled={false}
                      />
                    </Grid> */}
                  </Grid>

                  <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                    <Grid item>
                      <Button
                        title={editId ? 'Actualizar' : 'Guardar'}
                        onClick={async () => {
                          if (editId) {
                            await patch_configuracion_consecutivo({
                              id: editId,
                              formData,
                              token,
                              buscarPersonasAll
                            });
                          } else {
                            await post_configuracion_consecutivo({
                              formData,
                              token,
                              buscarPersonasAll
                            });
                          }

                          setFormData(initialFormData);
                          setEditId(null);
                        }}
                      />
                    </Grid>

                    <Grid item>
                      <Button
                        title="Limpiar"
                        onClick={() => {
                          setFormData(initialFormData);
                          setEditId(null);
                        }}
                      />
                    </Grid>

                    <Grid item>
                      <Button title="Salir" onClick={() => router.push('/')} />
                    </Grid>
                  </Grid>
                </div>

                <div className={`mt-7 rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                  <Grid
                    container
                    spacing={2}
                    marginTop={-7}
                    direction="row"
                    sx={{
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Grid item xs={12}>
                      <h3
                        className={`mt-[55px] mb-10 text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                      >
                        HISTÓRICO DE ARCHIVOS
                      </h3>
                    </Grid>
                  </Grid>

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
                      darkMode={isDarkMode}
                      fetchAllData={async (page: number) => {
                        await buscarPersonasAll(page, true);
                        return { data: user, total_pages: totalPages };
                      }}
                      onDownloadExcel={async () => {
                        const datosCompletos = await obtenerDatosParaExcel();
                        return obtenerDatosExcelConfiguracion({ token, data: datosCompletos });
                      }}
                    />
                  </Grid>
                </div>
              </div>
            </div>
          </div>
        </>
      </>

      {/* Modal de edición */}
      <EditConsecutivoModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        consecutivoData={selectedConsecutivo}
        token={token}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default User;
