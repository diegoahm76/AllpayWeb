'use client';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
 import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { Grid, IconButton } from '@mui/material';
import { buscarResumenSicex, handleDownloadExcel } from './services/sicex.service';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import axios from 'axios';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatNumberWithCommas } from '@/utils/formatters';
 
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

  const baseApiUrl = process.env.BASE_API_URL;

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifText, setNotifText] = useState('');

  const [formData, setFormData] = useState<FormDataSicex>(initialFormDataSicex);


  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();

  const valueSesion: any = session;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resumen, setResumen] = useState<any[]>([]);

  useEffect(() => {
    buscarResumenSicex({
      setResumen,
      setIsLoading,
      valueSesion,
      filters,
      formData,
      setNotifOpen,
      setNotifText
    });
  }, []);

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
      render: (value: number) => formatNumberWithCommas(value.toString())
    },
    {
      key: 'valor_bruto',
      label: 'Valor Bruto',
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
  ];

  const formattedData = resumen.map((item: any) => ({
    ...item,
    fecha_cargue: new Date(item.fecha_cargue).toLocaleString('es-CO'),
    fecha_inicial: new Date(item.fecha_inicial).toLocaleDateString('es-CO'),
    fecha_final: new Date(item.fecha_final).toLocaleDateString('es-CO')
  }));

  // Calcular total de páginas (10 elementos por página)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(formattedData.length / itemsPerPage);

  // Obtener los datos de la página actual
  const paginatedData = formattedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const [
    configurar
    // setConfigurar
  ] = useState(true);

  const [
    ,
    // openModalDetalle
    setOpenModalDetalle
  ] = useState(false);
  const [
    ,
    // detalleData
    setDetalleData
  ] = useState<any[]>([]);
  const [
    ,
    // loadingDetalle
    setLoadingDetalle
  ] = useState(false);
  const [
    ,
    // currentPageDetalle
    setCurrentPageDetalle
  ] = useState(1);

  const handleVerDetalle = async (id: number) => {
    try {
      setLoadingDetalle(true);
      const response = await axios.get(`${baseApiUrl}cartera/sicex-cargue/list/${id}/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) throw response.data.detail;
      const lista = response.data.data || [];
      setDetalleData(lista);
      setOpenModalDetalle(true);
      setCurrentPageDetalle(1);
    } catch (error) {
      console.error('Error al obtener detalle:', error);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const actions = [
    {
      label: 'Ver',
      render: (row: any) => (
        <IconButton
          size="small"
          onClick={() => handleVerDetalle(row.consecutivo_sicex)}
          sx={{
            color: '#562707',
            padding: '2px',
            '&:hover': {
              backgroundColor: 'rgba(86, 39, 7, 0.1)'
            }
          }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      )
    }
  ];

  const [filters, setFilters] = useState({
    cod_tipo_documento: '',
    numero_documento: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  // const handleFilterChange = (name: string, value: string) => {
  //   setFilters((prev) => ({ ...prev, [name]: value }));
  // };

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
                className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div
                  className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}
                >
                  <button
                    onClick={() => router.push('/')}
                    className="absolute top-2 right-4 text-2xl text-[rgb(var(--brown))] hover:text-red-700"
                  >
                    &times;
                  </button>

                  <div className="relative mt-[39px] flex items-center justify-center">
                    <h3
                      className={`text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                    >
                      Bandeja de Tareas 
                    </h3>
                  </div>

                  <Grid container spacing={2} marginTop={2}>
               
                    {/* <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_inicio"
                        label="Fecha Inicio"
                        value={filters.fecha_inicio}
                        onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                      />
                    </Grid> */}

                    {/* <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_fin"
                        label="Fecha Fin"
                        value={filters.fecha_fin}
                        onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                      />
                    </Grid> */}
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
                      <Button onClick={() => router.push('/')} title="Leídos" />
                    </Grid>
                    <Grid item>
                      <Button
                        title="No Leídos "
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
                      <Button
                        title="Todos"
                        onClick={() =>
                          buscarResumenSicex({
                            setResumen,
                            setIsLoading,
                            valueSesion,
                            filters,
                            formData,
                            setNotifOpen,
                            setNotifText
                          })
                        }
                      />
                    </Grid>{' '}
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
                  className={`mt-4 rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}
                >
                  <DynamicTable
                    columns={columns}
                    data={paginatedData}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    actions={actions}
                    isLoading={isLoading}
                    onDownloadExcel={() =>
                      handleDownloadExcel({
                        filters,
                        formData,
                        valueSesion
                      })
                    }
                  />
                 
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
