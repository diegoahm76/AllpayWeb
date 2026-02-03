'use client';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { Grid, IconButton } from '@mui/material';
import { buscarResumenSicex , fetchAllResumenSicexExcel, openPdfDirectly, fetchAllResumenSicexExcelSinPaginacion } from './services/sicex.service';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
 import Descarga from '@/presenters/components/shared/logo/LogoDescarga';
import Swal from 'sweetalert2';
import { formatNumberWithCommas } from '@/utils/formatters';

const baseApiUrl = process.env.BASE_API_URL;

const Administracion_cargos: React.FC = () => {
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  const router = useRouter();
  type FormDataSicex = {
    fecha_inicio: string;
    fecha_fin: string;
    tipo_cargue: string;
    tipo_cargueb: string;
    fecha_cargue: any;
    archivo: File | any;
  };

  const initialFormDataSicex: FormDataSicex = {
    fecha_inicio: '',
    fecha_fin: '',
    tipo_cargue: '',
    tipo_cargueb: '',

    fecha_cargue: formattedToday,
    archivo: null
  };

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifText, setNotifText] = useState('');

  const [formData, setFormData] = useState<FormDataSicex>(initialFormDataSicex);

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;

    if (name === 'archivo' && files?.length) {
      setFormData((prev) => ({ ...prev, archivo: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const valueSesion: any = session;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resumen_totales, setResumen_totales] = useState<any>({
    total_kilos: 0,
    total_cuota_fomento: 0,
    total_interes: 0
  });

  const [resumen, setResumen] = useState<any[]>([]);

  // Mover filters antes de los useEffect
  const [filters, setFilters] = useState({
    cod_tipo_documento: '',
    numero_documento: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const formattedData = resumen.map((item: any) => ({
    ...item,
    fecha_cargue: new Date(item.fecha_cargue).toLocaleString('es-CO'),
    fecha_inicial: new Date(item.fecha_inicial).toLocaleDateString('es-CO'),
    fecha_final: new Date(item.fecha_final).toLocaleDateString('es-CO')
  }));
  const [totalPages, setTotalPages] = useState(0);

  // Función para ejecutar la búsqueda
  const ejecutarBusqueda = (page: number = 1) => {
    if (valueSesion?.user?.tokens?.access) {
      buscarResumenSicex({
        setResumen_totales,
        setResumen,
        setIsLoading,
        valueSesion,
        filters,
        formData,
        setNotifOpen,
        setNotifText,
        setTotalPages,
        page: page
      });
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // useEffect inicial para cargar datos solo una vez al montar el componente
  useEffect(() => { 
    if (valueSesion?.user?.tokens?.access) {
      ejecutarBusqueda(1);
    }
  }, [valueSesion?.user?.tokens?.access]);

  const isDarkMode = mounted && theme === 'dark';

  // useEffect solo para cambio de página (paginación)
  useEffect(() => { 
    if (valueSesion?.user?.tokens?.access && currentPage > 1) {
      ejecutarBusqueda(currentPage);
    }
  }, [currentPage, valueSesion?.user?.tokens?.access]);

  const columns = [
    { key: 'nro_factura_unica', label: 'N° Factura Única' },
    { key: 'nro_documento_recaudador', label: 'Documento Recaudador' },
    { key: 'razon_social_recaudador', label: 'Recaudador' },
    {
      key: 'fecha_compra',
      label: 'Fecha de Compra',
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
    { key: 'factura_proveedor', label: 'Factura Proveedor' },
    { key: 'nit_proveedor', label: 'NIT Proveedor' },
    { key: 'nombre_proveedor', label: 'Proveedor' },
    { key: 'nombre_municipio_cacao', label: 'Municipio Cacao' },
    { key: 'nombre_departamento_cacao', label: 'Departamento Cacao' },
    {
      key: 'total_kilos',
      label: 'Total Kilos',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    
    {
      key: 'cuota_fomento',
      label: 'Cuota de Fomento',
      render: (value: string | number) => {
        const num = Number(value);
        return isNaN(num)
          ? 'Valor inválido'
          : new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(num);
      }
    },
    {
      key: 'valor_neto',
      label: 'Valor Neto',
      render: (value: string | number) => {
        const num = Number(value);
        return isNaN(num)
          ? 'Valor inválido'
          : new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(num);
      }
    },
    { key: 'dias_mora', label: 'Días de Mora' },
    {
      key: 'valor_intereses',
      label: 'Valor Intereses',
      render: (value: string | number) => {
        const num = Number(value);
        return isNaN(num)
          ? 'Valor inválido'
          : new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(num);
      }
    },
    {
      key: 'nro_acuerdo_pago',
      label: 'N° Acuerdo de Pago',
      render: (value: string | null | undefined) => {
        return value ? value : '----';
      }
    },
    {
      key: 'estado_acuerdo_pago',
      label: 'Estado Acuerdo Pago',
      render: (value: string | null | undefined) => {
        return value ? value : '----';
      }
    }
  ];

  const [
    configurar
    // setConfigurar
  ] = useState(true);

  const fetchAllData = async (page: number) => {
    return await fetchAllResumenSicexExcel({
      valueSesion,
      filters,
      formData,
      page
    });
  };

  // Nueva función para Excel: trae todos los datos con sin_paginacion=true en una sola llamada
  const fetchDataForExcel = async () => {
    return await fetchAllResumenSicexExcelSinPaginacion({
      valueSesion,
      filters
    });
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  
  // Función para formatear moneda sin decimales
  const formatCurrencyNoDecimals = (value: number) =>
    value?.toLocaleString('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

  const actions = React.useMemo(() => [
    {
      label: 'Descargar',
      render: (row: any) => (
        <IconButton
          size="small"
          onClick={async () => {
            
            // 1) Abrimos la alerta con spinner
            Swal.fire({
              title: 'Cargando archivo...',
              text: 'Por favor espera un momento',
              allowOutsideClick: false,
              allowEscapeKey: false,
              showConfirmButton: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
  
            try {
              // Construir la URL del endpoint de descarga
              const downloadUrl = `${baseApiUrl}cartera/cartera-consulta-download/${row.id_factura_unica}/253/`;
              console.log('Download URL:', downloadUrl);
              
              // Usar la función que abre directamente el PDF
              await openPdfDirectly(downloadUrl, valueSesion.user.tokens.access);
              
              // Cerrar la alerta después de un tiempo
              setTimeout(() => {
                Swal.close();
              }, 1000);
            } catch (error) {
              // Si falla, cerramos la alerta de loading y mostramos error
              console.error('Error al descargar:', error);
              Swal.close();
              await Swal.fire({
                icon: 'error',
                title: 'Error al descargar',
                text: 'No se pudo obtener el archivo.',
                confirmButtonText: 'Aceptar',
                buttonsStyling: false,
                customClass: {
                  confirmButton: `
        w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white
        transition-all duration-300 hover:bg-[rgb(var(--green-80))]
        cursor-pointer flex items-center justify-center gap-2
        outline-none focus:outline-none
      `
                }
              });
            }
          }}
          sx={{
            color: isDarkMode ? '#fff' : '#0A4971',
            padding: '2px',
            width: 28,
            height: 28,
            '&:hover': { 
              backgroundColor: isDarkMode 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(10, 73, 113, 0.1)' 
            }
          }}
        >
          <Descarga width={20} height={19} />
        </IconButton>
      )
    }
  ], [isDarkMode, valueSesion]);

  return (
    <div className="w-full">
      <AlertNotification
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notificationText={notifText}
      />
      {configurar ? (
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div
                  className={`rounded-xl p-4 ${isDarkMode ? 'dark' : 'bg-white'} relative`}
                >
                  <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                  >
                    &times;
                  </button>

                  <div className="relative mt-[39px] flex items-center justify-center">
                    <h3
                      className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      CARTERA DE DEUDORES
                    </h3>
                  </div>

                  <Grid container spacing={2} marginTop={2}>
          
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_inicio"
                        label="Fecha Inicio"
                        value={filters.fecha_inicio}
                        onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_fin"
                        label="Fecha Fin"
                        value={filters.fecha_fin}
                        onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                  </Grid>

                  <Grid
                    container
                    direction="row"
                    spacing={2}
                    marginTop={1}
                    sx={{
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                 
            
                    <Grid item>
                      <Button
                        title="Buscar"
                        onClick={() => {
                          if (valueSesion?.user?.tokens?.access) {
                            setCurrentPage(1); // Resetear a la primera página
                            ejecutarBusqueda(1);
                          } else {
                            setNotifText('Sesión no disponible. Por favor, vuelve a iniciar sesión.');
                            setNotifOpen(true);
                          }
                        }}
                      />
                    </Grid>{' '}
                    <Grid item>
                      <Button
                        title="Limpiar"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tipo_cargueb: ''
                          }));
                          setFilters({
                            cod_tipo_documento: '',
                            numero_documento: '',
                            fecha_inicio: '',
                            fecha_fin: ''
                          });
                        }}
                      />
                    </Grid>
                    <Grid item>
                      <Button onClick={() => router.push('/')} title="Salir" />
                    </Grid>
                    <Grid item>
                      {/* <Button
                        title="Buscar"
                        onClick={() =>
                          buscarPersonasAll({ setUser, setIsLoading, valueSesion, filters })
                        }
                      /> */}
                    </Grid>
                  </Grid>
                </div>

                <div
                  className={`mt-4 rounded-xl p-4 ${isDarkMode ? 'dark' : 'bg-white'} relative`}
                >
                  <DynamicTable
                    columns={columns}
                    data={formattedData}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    actions={actions}
                    isLoading={isLoading}
                    fetchAllData={fetchAllData}
                    fetchDataForExcel={fetchDataForExcel}  

                  /> 
                  <Grid container spacing={2} marginTop={2}>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        name="cuota_fomento"
                        label="Valor Total de Cuota Fomento"
                        value={formatCurrencyNoDecimals(resumen_totales?.total_cuota_fomento) ?? ''}
                        onChange={handleChange}
                        disabled
                        darkMode={isDarkMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        name="interes"
                        label="Valor Total de Intereses a la Fecha"
                        value={formatCurrencyNoDecimals(resumen_totales?.total_interes) ?? ''}
                        onChange={handleChange}
                        disabled
                        darkMode={isDarkMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        name="total_kilos"
                        label="Total Kilos"
                        value={
                          resumen_totales?.total_kilos != null
                            ? formatNumberWithCommas(resumen_totales.total_kilos.toString())
                            : '0.00'
                        }
                        onChange={handleChange}
                        disabled
                        darkMode={isDarkMode}
                      />
                    </Grid>
                  </Grid>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

export default Administracion_cargos;
