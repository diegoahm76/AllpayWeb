'use client';

// react

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signIn, useSession } from 'next-auth/react';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ConsolidatedTable from '@/presenters/components/ui/ConsolidatedTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';

// hooks
import { useReporteProduccionNacionalCacao } from '../hooks/useReporteProduccionNacionalCacao';
import { useDescargarReporteConsolidado } from '../hooks/useDescargarReporteConsolidado';
import { useDepartamentosColombia } from '@/application/address/useDeparmentsLogged';
import { useGetCities } from '@/application/address/useGetCities';
import { formatNumberWithCommas } from '@/utils/formatters';

const VerReporteLibroCompra = () => {

    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFinal, setFechaFinal] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, ] = useState(10);
    const [idDepartamentoCacao, setIdDepartamentoCacao] = useState<string>('');
    const [idMunicipioCacao, setIdMunicipioCacao] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    const { theme } = useTheme();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const { data: session } = useSession({
      required: true,
      onUnauthenticated() {
        signIn();
      }
    });

    const valueSesion: any = session;
    const token = (session as any)?.user?.tokens?.access;

    // Hook para el reporte de producción nacional de cacao
    const {
        reporteData,
        isLoading,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        fetchReporte,
        handlePageChange,
        clearFilters,
        clearAlerts,
        fetchAllData
    } = useReporteProduccionNacionalCacao(token);

    // Hook para la descarga del reporte consolidado
    const {
        isLoading: isLoadingDescargaConsolidado,
        showAlertNotification: showAlertNotificationDescargaConsolidado,
        alertMessage: alertMessageDescargaConsolidado,
        showErrorAlert: showErrorAlertDescargaConsolidado,
        errorAlertMessage: errorAlertMessageDescargaConsolidado,
        descargarReporte: descargarReporteConsolidado,
        clearAlerts: clearAlertsDescargaConsolidado
    } = useDescargarReporteConsolidado(token);

    // Hook para departamentos
    const {
        departamentos,
        loading: loadingDepartamentos,
    } = useDepartamentosColombia();

    // Hook para municipios
    const {
        cities: municipios,
        loading: loadingMunicipios,
        error: errorMunicipios
    } = useGetCities({ 
        departamentoId: idDepartamentoCacao ? parseInt(idDepartamentoCacao) : 0, 
        token: token || '' 
    });

    useEffect(() => {
      if (!valueSesion?.user?.tipo_usuario) return; 
      if (valueSesion.user.tipo_usuario === 'I') {
        setIsInternalUser(true);
      } else if (valueSesion.user.tipo_usuario === 'E') {
        setIsInternalUser(false);
      }
    }, [valueSesion?.user?.tipo_usuario]);

    useEffect(() => {
      setIdMunicipioCacao('');
    }, [idDepartamentoCacao]);

    // Función wrapper para fetchAllData que incluye los parámetros actuales
    const handleFetchAllData = async (page: number) => {
        const params = {
            page,
            page_size: pageSize,
            fecha_inicio: fechaInicio || undefined,
            fecha_final: fechaFinal || undefined,
            id_departamento_cacao: idDepartamentoCacao || undefined,
            id_municipio_cacao: idMunicipioCacao || undefined
        };
        return await fetchAllData(page, params);
    };

    // Configuración de columnas consolidadas para el reporte
    const headerColumns = [
        {
            key: 'info_general',
            label: '',
            subColumns: [
                {
                    key: 'departamento',
                    label: 'DEPARTAMENTO',
                    render: (value: any) => value || '-'
                },
                {
                    key: 'municipio',
                    label: 'MUNICIPIO', 
                    render: (value: any) => value || '-'
                },
            ]
        },
        {
            key: 'enero',
            label: 'ENERO',
            subColumns: [
                {
                    key: 'enero_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'enero_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'febrero',
            label: 'FEBRERO',
            subColumns: [
                {
                    key: 'febrero_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'febrero_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'marzo',
            label: 'MARZO',
            subColumns: [
                {
                    key: 'marzo_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: any) => value ? parseInt(value).toLocaleString('es-CO') : '0'
                },
                {
                    key: 'marzo_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'abril',
            label: 'ABRIL',
            subColumns: [
                {
                    key: 'abril_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'abril_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'mayo',
            label: 'MAYO',
            subColumns: [
                {
                    key: 'mayo_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'mayo_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'junio',
            label: 'JUNIO',
            subColumns: [
                {
                    key: 'junio_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'junio_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'julio',
            label: 'JULIO',
            subColumns: [
                {
                    key: 'julio_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'julio_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'agosto',
            label: 'AGOSTO',
            subColumns: [
                {
                    key: 'agosto_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'agosto_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'septiembre',
            label: 'SEPTIEMBRE',
            subColumns: [
                {
                    key: 'septiembre_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'septiembre_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'octubre',
            label: 'OCTUBRE',
            subColumns: [
                {
                    key: 'octubre_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'octubre_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'noviembre',
            label: 'NOVIEMBRE',
            subColumns: [
                {
                    key: 'noviembre_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'noviembre_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'diciembre',
            label: 'DICIEMBRE',
            subColumns: [
                {
                    key: 'diciembre_total_kilos',
                    label: 'TOTAL KILOS',
                    render: (value: any) => value ? parseInt(value).toLocaleString('es-CO') : '0'
                },
                {
                    key: 'diciembre_total_cuota_fomento',
                    label: 'TOTAL CUOTA FOMENTO',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        },
        {
            key: 'totales_anuales',
            label: 'TOTALES ANUALES',
            subColumns: [
                {
                    key: 'total_kilos_anual',
                    label: 'TOTAL KILOS ANUAL',
                      render: (value: number) => formatNumberWithCommas(value.toString())
                },
                {
                    key: 'total_cuota_fomento_anual',
                    label: 'TOTAL CUOTA FOMENTO ANUAL',
                    render: (value: any) => value ? new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseInt(value)) : '$0'
                }
            ]
        }
    ];

    return (
      <div className="w-full max-w-full mx-auto">
  
        <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>

          <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>

            <button
                onClick={() => router.push('/')}
                className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
            >
                &times;
            </button>

            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>REPORTE CONSOLIDADO DE PRODUCCION NACIONAL DE CACAO</h2>

            <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Consulta por fecha de pago</h3>

                <div className='flex flex-col md:flex-row gap-4 mt-4 col-span-2'>

                  <div className='w-full'>
                  <AnimatedInput
                      label='Fecha Inicio'
                      type='date'
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      name='fecha_inicio'
                      darkMode={isDarkMode}
                  />
                  </div>

                  <div className='w-full'>
                  <AnimatedInput
                      label='Fecha Final'
                      type='date'
                      value={fechaFinal}
                      onChange={(e) => setFechaFinal(e.target.value)}
                      name='fecha_final'
                      darkMode={isDarkMode}
                  />
                  </div>

                </div>
              
          </div>

          <div className={`rounded-xl p-6 relative mt-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>

                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Consulta por lugar de procedencia</h3>

                <div className='flex flex-col md:flex-row gap-4 mt-4 col-span-2'>

                                    <div className='w-full'>
                                    <AnimatedSelect
                       label='DEPARTAMENTO'
                       value={idDepartamentoCacao}
                       onChange={(e) => setIdDepartamentoCacao(e.target.value)}
                       name='departamento'
                       options={departamentos.map(dept => ({
                           key: dept.cod_departamento,
                           value: dept.cod_departamento,
                           title: dept.nombre
                       }))}
                       disabled={loadingDepartamentos}
                       darkMode={isDarkMode}
                   />
                   </div>

                   <div className='w-full'>
                   <AnimatedSelect
                       label={loadingMunicipios ? 'Cargando municipios...' : 'MUNICIPIO'}
                       value={idMunicipioCacao}
                       onChange={(e) => setIdMunicipioCacao(e.target.value)}
                       name='municipio'
                       options={municipios.map(municipio => ({
                           key: municipio.cod_municipio,
                           value: municipio.cod_municipio,
                           title: municipio.nombre
                       }))}
                       disabled={!idDepartamentoCacao || loadingMunicipios}
                       darkMode={isDarkMode}
                   />
                   </div>

                     {/* Mostrar error de municipios si existe */}
                     {errorMunicipios && (
                        <div className={`mt-2 text-sm w-full ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                             Error al cargar municipios: {errorMunicipios}
                         </div>
                     )}
                </div>

                <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                  <Button title='Limpiar' onClick={() => {
                    setFechaInicio('');
                    setFechaFinal('');
                    setIdDepartamentoCacao('');
                    setIdMunicipioCacao('');
                    setPage(1);
                    clearFilters();
                  }} />
                  <Button title='Consultar' onClick={() => {
                    fetchReporte({
                      page: page,
                      page_size: pageSize,
                      fecha_inicio: fechaInicio || undefined,
                      fecha_final: fechaFinal || undefined,
                      id_departamento_cacao: idDepartamentoCacao || undefined,
                      id_municipio_cacao: idMunicipioCacao || undefined
                    });
                  }} />
                  <Button title='Salir' onClick={() => router.push('/')} />
                </div>
                
          </div>

          {/* Tabla de resultados consolidados */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            
            <ConsolidatedTable
              headerColumns={headerColumns}
              data={reporteData.consolidado}
              isLoading={isLoading}
              currentPage={reporteData.current_page}
              totalPages={reporteData.total_pages}
              onPageChange={(newPage) => handlePageChange(newPage, {
                 page: newPage,
                 page_size: pageSize,
                 fecha_inicio: fechaInicio || undefined,
                 fecha_final: fechaFinal || undefined,
                 id_departamento_cacao: idDepartamentoCacao || undefined,
                 id_municipio_cacao: idMunicipioCacao || undefined
               })}
              fetchAllData={handleFetchAllData}
              actionsTop={
                 <button
                 className="flex items-center rounded-xl bg-[rgb(var(--gray-20))] px-2 py-1.5 text-center text-sm font-semibold text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90"                 
                 onClick={() => descargarReporteConsolidado({
                   page: page,
                   page_size: pageSize,
                   fecha_inicio: fechaInicio || undefined,
                   fecha_final: fechaFinal || undefined,
                   id_departamento_cacao: idDepartamentoCacao || undefined,
                   id_municipio_cacao: idMunicipioCacao || undefined
                 })}
                 disabled={isLoadingDescargaConsolidado}
              >
               <span className="mr-1">
                         <img
                           src="/images/icons/more.png"
                           alt="icon-masivo"
                           className="h-4 w-4"
                         />
                       </span>
                {isLoadingDescargaConsolidado ? 'GENERANDO...' : 'DESCARGAR REPORTE'}
              </button>
               }
            />

            {/* Totales de Kilos por Mes */}
            <h5 className={`text-sm font-semibold mt-4 mb-6 text-left ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>TOTALES KILOS:</h5>

            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-2 justify-center'>
              
              <AnimatedInput
                label='ENERO'
                type='text'
                value={reporteData.totales_por_mes.enero.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='enero_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='FEBRERO'
                type='text'
                value={reporteData.totales_por_mes.febrero.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='febrero_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='MARZO'
                type='text'
                value={reporteData.totales_por_mes.marzo.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='marzo_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='ABRIL'
                type='text'
                value={reporteData.totales_por_mes.abril.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='abril_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='MAYO'
                type='text'
                value={reporteData.totales_por_mes.mayo.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='mayo_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='JUNIO'
                type='text'
                value={reporteData.totales_por_mes.junio.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='junio_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='JULIO'
                type='text'
                value={reporteData.totales_por_mes.julio.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='julio_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='AGOSTO'
                type='text'
                value={reporteData.totales_por_mes.agosto.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='agosto_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='SEPTIEMBRE'
                type='text'
                value={reporteData.totales_por_mes.septiembre.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='septiembre_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='OCTUBRE'
                type='text'
                value={reporteData.totales_por_mes.octubre.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='octubre_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='NOVIEMBRE'
                type='text'
                value={reporteData.totales_por_mes.noviembre.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='noviembre_kilos'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='DICIEMBRE'
                type='text'
                value={reporteData.totales_por_mes.diciembre.total_kilos.toLocaleString()}
                onChange={() => {}}
                name='diciembre_kilos'
                readOnly
                darkMode={isDarkMode}
              />

            </div>

            {/* Totales de Cuota de Fomento por Mes */}
            <h5 className={`text-sm font-semibold mt-4 text-left ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>TOTAL CUOTA FOMENTO:</h5>

            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 justify-center'>
              
              <AnimatedInput
                label='ENERO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.enero.total_cuota_fomento)}
                onChange={() => {}}
                name='enero_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='FEBRERO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.febrero.total_cuota_fomento)}
                onChange={() => {}}
                name='febrero_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='MARZO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.marzo.total_cuota_fomento)}
                onChange={() => {}}
                name='marzo_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='ABRIL'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.abril.total_cuota_fomento)}
                onChange={() => {}}
                name='abril_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='MAYO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.mayo.total_cuota_fomento)}
                onChange={() => {}}
                name='mayo_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='JUNIO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.junio.total_cuota_fomento)}
                onChange={() => {}}
                name='junio_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='JULIO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.julio.total_cuota_fomento)}
                onChange={() => {}}
                name='julio_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='AGOSTO'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.agosto.total_cuota_fomento)}
                onChange={() => {}}
                name='agosto_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='SEPTIEMBRE'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.septiembre.total_cuota_fomento)}
                onChange={() => {}}
                name='septiembre_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='OCTUBRE'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.octubre.total_cuota_fomento)}
                onChange={() => {}}
                name='octubre_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='NOVIEMBRE'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.noviembre.total_cuota_fomento)}
                onChange={() => {}}
                name='noviembre_cuota'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='DICIEMBRE'
                type='text'
                value={new Intl.NumberFormat('es-CO', { 
                  style: 'currency', 
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(reporteData.totales_por_mes.diciembre.total_cuota_fomento)}
                onChange={() => {}}
                name='diciembre_cuota'
                readOnly
                darkMode={isDarkMode}
              />

            </div>

            {/* Totales de Toneladas por Mes */}
              <h5 className={`text-sm font-semibold mt-4 mb-6 text-left ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>TOTALES TONELADAS:</h5>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-2 justify-center'>
              
              <AnimatedInput
                label='ENERO'
                type='text'
                value={reporteData.totales_por_mes.enero.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='enero_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='FEBRERO'
                type='text'
                value={reporteData.totales_por_mes.febrero.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='febrero_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='MARZO'
                type='text'
                value={reporteData.totales_por_mes.marzo.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='marzo_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='ABRIL'
                type='text'
                value={reporteData.totales_por_mes.abril.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='abril_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='MAYO'
                type='text'
                value={reporteData.totales_por_mes.mayo.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='mayo_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='JUNIO'
                type='text'
                value={reporteData.totales_por_mes.junio.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='junio_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='JULIO'
                type='text'
                value={reporteData.totales_por_mes.julio.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='julio_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='AGOSTO'
                type='text'
                value={reporteData.totales_por_mes.agosto.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='agosto_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='SEPTIEMBRE'
                type='text'
                value={reporteData.totales_por_mes.septiembre.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='septiembre_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='OCTUBRE'
                type='text'
                value={reporteData.totales_por_mes.octubre.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='octubre_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='NOVIEMBRE'
                type='text'
                value={reporteData.totales_por_mes.noviembre.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='noviembre_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              <AnimatedInput
                label='DICIEMBRE'
                type='text'
                value={reporteData.totales_por_mes.diciembre.total_toneladas.toLocaleString()}
                onChange={() => {}}
                name='diciembre_toneladas'
                readOnly
                darkMode={isDarkMode}
              />

              </div>

          </div>
        </div>

        {/* Alertas */}
        {showAlertNotification && (
          <AlertSuccess
            isOpen={showAlertNotification}
            message={alertMessage}
            onClose={clearAlerts}
          />
        )}

        {showErrorAlert && (
          <AlertError
            isOpen={showErrorAlert}
            message={errorAlertMessage}
            onClose={clearAlerts}
          />
        )}

        {/* Alertas para descarga de reporte consolidado */}
        {showAlertNotificationDescargaConsolidado && (
          <AlertSuccess
            isOpen={showAlertNotificationDescargaConsolidado}
            message={alertMessageDescargaConsolidado}
            onClose={clearAlertsDescargaConsolidado}
          />
        )}

        {showErrorAlertDescargaConsolidado && (
          <AlertError
            isOpen={showErrorAlertDescargaConsolidado}
            message={errorAlertMessageDescargaConsolidado}
            onClose={clearAlertsDescargaConsolidado}
          />
        )}
      </div>
    );
  };
  
  export default VerReporteLibroCompra;
  