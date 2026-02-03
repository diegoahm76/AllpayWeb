'use client';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { Grid, IconButton, Checkbox } from '@mui/material';
import {
  buscarResumenSicex,
  fetchAllResumenSicexExcel,
  obtenerDepartamentos,
  obtenerMunicipios
} from './services/sicex.service';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import Descarga from '@/presenters/components/shared/logo/LogoDescarga';
import Swal from 'sweetalert2';
import axios from 'axios';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { obtenerTiposDocumento } from '@/presenters/components/modules/plantilla/services/services.service';
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
  const [
    // resumen_totales
    , setResumen_totales] = useState<any>({
    total_kilos: 0,
    total_cuota_fomento: 0,
    total_interes: 0
  });

  const [resumen, setResumen] = useState<any[]>([]);

  const formattedData = resumen.map((item: any) => ({
    ...item,
    fecha_cargue: new Date(item.fecha_cargue).toLocaleString('es-CO'),
    fecha_inicial: new Date(item.fecha_inicial).toLocaleDateString('es-CO'),
    fecha_final: new Date(item.fecha_final).toLocaleDateString('es-CO')
  }));
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
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
      page: currentPage
    });
  }, [currentPage]);

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
      render: (value: string | number) => {
        return formatNumberWithCommas(value.toString());
      }
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

  const [configurar, setConfigurar] = useState(true);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const fetchAllData = async (page: number) => {
    return await fetchAllResumenSicexExcel({
      valueSesion,
      filters,
      formData,
      page
    });
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, row: any) => {
    if (e.target.checked) {
      setSelectedRows((prev) => [...prev, row]);
    } else {
      setSelectedRows((prev) =>
        prev.filter((item) => item.nro_factura_unica !== row.nro_factura_unica)
      );
    }
  };
  const actions = [
    {
      key: 'select',
      label: '',
      render: (row: any) => {
        const isSelected = selectedRows.some(
          (item: any) => item.nro_factura_unica === row.nro_factura_unica
        );
        return (
          <Checkbox
            checked={isSelected}
            onChange={(e) => handleSelectRow(e, row)}
            sx={{ color: '#4D750F', '&.Mui-checked': { color: '#4D750F' } }}
          />
        );
      }
    },
    {
      label: 'Descargar',
      render: (row: any) => (
        <IconButton
          size="small"
          onClick={async () => {
            // 1) Abrimos la alerta con spinner y botón Aceptar
            Swal.fire({
              title: 'Cargando archivo...',
              text: 'Por favor espera un momento',
              allowOutsideClick: false,
              allowEscapeKey: false,
              allowEnterKey: false,
              showConfirmButton: true,
              confirmButtonText: 'Aceptar',
              buttonsStyling: false,
              customClass: {
                confirmButton: `
                  w-[120px] py-2 rounded-2xl
                  bg-[rgb(var(--green))] text-white
                  transition-all duration-300
                  hover:bg-[rgb(var(--green-80))]
                `
              },
              didOpen: () => {
                Swal.showLoading();
              }
            });

            try {
              // 2) Pedimos la URL firmada
              const { data } = await axios.get(row.archivo, {
                headers: { Authorization: `Bearer ${valueSesion.user.tokens.access}` }
              });
              const finalUrl = data.archivo;
              if (!finalUrl) throw new Error();

              // 3) Abrimos el link en nueva pestaña – la descarga/browser handling queda por su cuenta
              window.open(finalUrl, '_blank');
            } catch (error) {
              // 4) Si falla, cerramos la alerta de loading y mostramos error
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
              return;
            }

            // 5) Cuando ya hemos abierto el link, cerramos la alerta (si el usuario no la cerró antes)
            Swal.close();
          }}
          sx={{
            color: '#0A4971',
            padding: '2px',
            width: 28,
            height: 28,
            '&:hover': { backgroundColor: 'rgba(10, 73, 113, 0.1)' }
          }}
        >
          <Descarga width={20} height={19} />
        </IconButton>
      )
    }
  ];

  const [filters, setFilters] = useState({
    razon_social: '',
    numero_documento: '',
    nombre_comercial: '',
    correo: '',
    direccion: '',
    municipio: '',
    departamento: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const [generarData, setGenerarData] = useState({
    numero_paz_salvo: '',
    fecha_generacion: '',
    tipo_paz_salvo: '',
    puerto_exportacion: '',
    razon_social: '',
    documeto_identificacion: '',
    tipo_documeto: ''
  });

  const handleGenerarChange = (name: string, value: string) => {
    setGenerarData((prev) => ({ ...prev, [name]: value }));
  };

  const [documentTypes, setDocumentTypes] = useState([]);

  useEffect(() => {
    obtenerTiposDocumento({
      setDocumentTypes,
      valueSesion
    });
  }, [obtenerTiposDocumento]);

  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);

  useEffect(() => {
    obtenerDepartamentos({ setDepartamentos, valueSesion });
    obtenerMunicipios({
      cod_departamento: filters?.departamento,
      setMunicipios
    });
  }, [obtenerDepartamentos, filters?.departamento]);

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
                      Generar Paz y Salvo
                    </h3>
                  </div>
                 
                  <Grid container spacing={2} marginTop={2}>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="razon_social"
                        label="Razón Social"
                        value={filters.razon_social}
                        onChange={(e) => handleFilterChange('razon_social', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="numero_documento"
                        label="Número de Documento"
                        value={filters.numero_documento}
                        onChange={(e) => handleFilterChange('numero_documento', e.target.value)}
                        type="number"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="nombre_comercial"
                        label="Nombre Comercial"
                        value={filters.nombre_comercial}
                        onChange={(e) => handleFilterChange('nombre_comercial', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="correo"
                        label="Correo"
                        value={filters.correo}
                        onChange={(e) => handleFilterChange('correo', e.target.value)}
                        type="email"
                      />
                    </Grid>
                    {/* <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="direccion"
                        label="Dirección"
                        value={filters.direccion}
                        onChange={(e) => handleFilterChange('direccion', e.target.value)}
                      />
                    </Grid> */}

                    <Grid item xs={12} sm={6}>
                      <AnimatedSelect
                        name="departamento"
                        label="Departamento"
                        value={filters.departamento}
                        onChange={(e) => handleFilterChange('departamento', e.target.value)}
                        options={departamentos.map((dep: any) => ({
                          key: dep.cod_departamento,
                          value: dep.cod_departamento,
                          title: dep.nombre
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedSelect
                        name="municipio"
                        label="Municipio"
                        value={filters.municipio}
                        onChange={(e) => handleFilterChange('municipio', e.target.value)}
                        options={municipios.map((mun: any) => ({
                          key: mun.cod_municipio,
                          value: mun.cod_municipio,
                          title: mun.nombre
                        }))}
                      />
                    </Grid>
                
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="fecha_inicio"
                        label="Fecha Inicio"
                        value={filters.fecha_inicio}
                        onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        type="date"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="fecha_fin"
                        label="Fecha Fin"
                        value={filters.fecha_fin}
                        onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        type="date"
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
                      <Button onClick={() => router.push('/')} title="Salir" />
                    </Grid>
                    <Grid item>
                      <Button
                        title="Limpiar"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tipo_cargueb: ''
                          }));
                          setFilters({
                            razon_social: '',
                            numero_documento: '',
                            nombre_comercial: '',
                            correo: '',
                            direccion: '',
                            municipio: '',
                            fecha_inicio: '',
                            fecha_fin: '',
                            departamento: ''
                          });
                        }}
                      />
                    </Grid>
                    <Grid item>
                      <Button
                        title="Buscar"
                        onClick={() =>
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
                            page: 1
                          })
                        }
                      />
                    </Grid>{' '}
                  </Grid>
                </div>
                <div
                  className={`mt-4 rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}
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
                  />

                  <Grid container spacing={2} marginTop={2} justifyContent="flex-end">
                    <Grid item>
                      <Button
                        title="Nuevo Paz y Salvo"
                        onClick={() => {
                          setConfigurar(false);
                        }}
                      />
                    </Grid>

                    <Grid item>
                      <Button onClick={() => router.push('/')} title="Salir" />
                    </Grid>
                  </Grid>
                </div>
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
                      Nuevo Paz y Salvo
                    </h3>
                  </div>

                  <Grid container spacing={2} marginTop={2}>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="numero_paz_salvo"
                        label="Número Paz y Salvo"
                        value={generarData.numero_paz_salvo}
                        onChange={(e) => handleGenerarChange('numero_paz_salvo', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="fecha_generacion"
                        label="Fecha Generación"
                        value={generarData.fecha_generacion}
                        onChange={(e) => handleGenerarChange('fecha_generacion', e.target.value)}
                        type="date"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="tipo_paz_salvo"
                        label="Tipo Paz y Salvo"
                        value={generarData.tipo_paz_salvo}
                        onChange={(e) => handleGenerarChange('tipo_paz_salvo', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="puerto_exportacion"
                        label="Puerto Exportación"
                        value={generarData.puerto_exportacion}
                        onChange={(e) => handleGenerarChange('puerto_exportacion', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={12}>
                      <AnimatedInput
                        name="razon_social"
                        label="Razón Social"
                        value={generarData.razon_social}
                        onChange={(e) => handleGenerarChange('razon_social', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <AnimatedSelect
                        name="tipo_documeto"
                        label="Tipo Documento"
                        value={generarData.tipo_documeto}
                        onChange={(e) => handleGenerarChange('tipo_documeto', e.target.value)}
                        options={documentTypes.map((value: any, index: number) => ({
                          key: index,
                          value: value.cod_tipo_documento,
                          title: value.nombre
                        }))}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <AnimatedInput
                        name="documeto_identificacion"
                        label="Documento Identificación"
                        value={generarData.documeto_identificacion}
                        onChange={(e) =>
                          handleGenerarChange('documeto_identificacion', e.target.value)
                        }
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
                        title="Generar"
                        onClick={() =>
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
                            page: 1
                          })
                        }
                      />
                    </Grid>
                    <Grid item>
                      <Button
                        title="Limpiar"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tipo_cargueb: ''
                          }));
                          setFilters({
                            razon_social: '',
                            numero_documento: '',
                            nombre_comercial: '',
                            correo: '',
                            direccion: '',
                            municipio: '',
                            fecha_inicio: '',
                            fecha_fin: '',
                            departamento: ''
                          });
                        }}
                      />
                    </Grid>
                  
                      <Grid item>
                      <Button onClick={() => router.push('/')} title="Salir" />
                    </Grid>
                  </Grid>
                </div>
                <div
                  className={`mt-4 rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}
                >
                  <DynamicTable
                    columns={columns}
                    data={selectedRows || []}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    actions={actions}
                    isLoading={isLoading}
                    fetchAllData={fetchAllData}
                  />
                  <Grid container spacing={2} marginTop={2} justifyContent="flex-end">
                    <Grid item>
                      <Button
                        title="Regresar  "
                        onClick={() => {
                          setConfigurar(true);
                        }}
                      />
                    </Grid>
                  </Grid>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Administracion_cargos;
