'use client';

// react
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signIn, useSession } from 'next-auth/react';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// hooks
import { useDepartamentosColombia } from '@/application/address/useDeparmentsLogged';
import { useGetCities } from '@/application/address/useGetCities';
import { useReportePrecioNacional } from '../hooks/useReportePrecioNacional';
import { useDocumentoPrecioNacional } from '../hooks/useDocumentoPrecioNacional';
import { formatNumberWithCommas } from '@/utils/formatters';

const VerReportePrecioNacional = () => {

    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
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

    // Hook del reporte de precio nacional
    const {
        reporteData,
        isLoading: isLoadingReporte,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        fetchReporte,
        clearFilters: clearFiltersReporte,
        handlePageChange,
        clearAlerts,
        fetchAllData
    } = useReportePrecioNacional(token || '');

    // Hook para generar documentos PDF
    const {
        documentoData,
        //isLoading: isLoadingDocumento,
        //generarDocumento,
        showAlertNotification: showAlertDocumento,
        alertMessage: alertMessageDocumento,
        showErrorAlert: showErrorDocumento,
        errorAlertMessage: errorMessageDocumento,
        clearAlerts: clearAlertsDocumento
    } = useDocumentoPrecioNacional(token || '');

    useEffect(() => {
      if (!valueSesion?.user?.tipo_usuario) return; 
      if (valueSesion.user.tipo_usuario === 'I') {
        setIsInternalUser(true);
      } else if (valueSesion.user.tipo_usuario === 'E') {
        setIsInternalUser(false);
      }
    }, [valueSesion?.user?.tipo_usuario]);

    // Limpiar municipio cuando cambia el departamento
    useEffect(() => {
        setIdMunicipioCacao('');
    }, [idDepartamentoCacao]);

    // Función para generar documento PDF con los parámetros actuales
    // const handleGenerarDocumento = () => {
    //     const params: any = {
    //         fecha_inicio: fechaInicio,
    //         fecha_final: fechaFinal
    //     };
        
    //     if (idDepartamentoCacao) params.departamento = idDepartamentoCacao;
    //     if (idMunicipioCacao) params.municipio = idMunicipioCacao;
        
    //     generarDocumento(params);
    // };

    // Efecto para abrir automáticamente el PDF cuando se genere exitosamente
    useEffect(() => {
        if (documentoData.success && documentoData.url_documento) {
            window.open(documentoData.url_documento, '_blank');
        }
    }, [documentoData.success, documentoData.url_documento]);

    const columns = [
        {
            key: 'nit_cc_recaudador',
            label: 'N° DOCUMENTO RECAUDADOR',
            render: (value: any) => value
        },
        {   
            key: 'nombre_recaudador', 
            label: 'NOMBRE RECAUDADOR', 
            render: (value: any) => value
        },
        {
            key: 'tipo_recaudador',
            label: 'TIPO RECAUDADOR',
            render: (value: any) => value
        },
        {   
            key: 'total_kilos', 
            label: 'TOTAL KILOS', 
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'precio_promedio', 
            label: 'PRECIO PROMEDIO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))
        },
        {
            key: 'total_valor_cuota_fomento', 
            label: 'TOTAL VALOR CUOTA FOMENTO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))
        },
        { 
            key: 'total_valor_intereses', 
            label: 'TOTAL VALOR INTERESES',
            render: (value: any) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))
        },
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

          <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>REPORTE PRECIO NACIONAL</h2>



                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Consulta por fecha de registro</h3>

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

                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR LUGAR DE PROCEDENCIA</h3>

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

                </div>

                {/* Mostrar error de municipios si existe */}
                {errorMunicipios && (
                    <div className={`mt-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        Error al cargar municipios: {errorMunicipios}
                    </div>
                )}

                {/* Alertas del reporte */}
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

                {/* Alertas del documento */}
                {showAlertDocumento && (
                    <AlertSuccess
                        isOpen={showAlertDocumento}
                        message={alertMessageDocumento}
                        onClose={clearAlertsDocumento}
                    />
                )}

                {showErrorDocumento && (
                    <AlertError
                        isOpen={showErrorDocumento}
                        message={errorMessageDocumento}
                        onClose={clearAlertsDocumento}
                    />
                )}

                <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                  <Button title='Limpiar' onClick={() => {
                    setFechaInicio('');
                    setFechaFinal('');
                    setIdDepartamentoCacao('');
                    setIdMunicipioCacao('');
                    clearFiltersReporte();
                  }} />
                  <Button title='Consultar' onClick={() => {
                    const params: any = {
                      page: 1,
                      page_size: 10
                    };
                    
                    if (fechaInicio) params.fecha_inicio = fechaInicio;
                    if (fechaFinal) params.fecha_final = fechaFinal;
                    if (idDepartamentoCacao) params.departamento = idDepartamentoCacao;
                    if (idMunicipioCacao) params.municipio = idMunicipioCacao;
                    
                    fetchReporte(params);
                  }} />
                  <Button title='Salir' onClick={() => router.push('/')} />
                </div>
                
          </div>

          {/* Tabla de resultados */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              REPORTE CONSOLIDADO DE DEMANDA NACIONAL DE CACAO
            </h2>
  
            <DynamicTable
              columns={columns}
              data={reporteData.recaudadores}
              isLoading={isLoadingReporte}
              currentPage={reporteData.current_page}
              totalPages={reporteData.total_pages}
              onPageChange={handlePageChange}
              fetchAllData={fetchAllData}
              // actionsTop={
              //    <button
              //      className="flex items-center gap-1 rounded-xl bg-[rgb(var(--gray-20))] px-4 py-1.5 text-center text-sm font-semibold text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90"                 
              //      onClick={handleGenerarDocumento}
              //      disabled={isLoadingDocumento || !fechaInicio || !fechaFinal}
              //    >
              //      <span className="mr-1">
              //        <img
              //          src="/images/icons/more.png"
              //          alt="icon-masivo"
              //          className="h-4 w-4"
              //        />
              //      </span>
              //      {isLoadingDocumento ? 'GENERANDO...' : 'DESCARGAR REPORTE'}
              //    </button>
              //  }
            />

            <div className='flex flex-col md:flex-row justify-center gap-4 mt-6 col-span-8 w-full md:w-auto'>
              

                <div className='w-full'>
                <AnimatedInput
                  label='TOTAL KILOS'
                  type='text'
                  value={reporteData.totales.total_kilos ? reporteData.totales.total_kilos.toLocaleString('es-CO') : '0'}
                  onChange={() => {}}
                  name='total_kilos'
                  readOnly
                  darkMode={isDarkMode}
                />
                </div>

                <div className='w-full'>
                <AnimatedInput
                  label='TOTAL CF'
                  type='text'
                  value={reporteData.totales.total_valor_cuota_fomento ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(reporteData.totales.total_valor_cuota_fomento)) : '$ 0'}
                  onChange={() => {}}
                  name='total_cuota_fomento'
                  readOnly
                  darkMode={isDarkMode}
                />
                </div>

                <div className='w-full'>
                <AnimatedInput
                  label='PRECIO PROMEDIO TOTAL'
                  type='text'
                  value={reporteData.totales.precio_promedio_total ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(reporteData.totales.precio_promedio_total)) : '$ 0'}
                  onChange={() => {}}
                  name='precio_promedio_total'
                  readOnly
                  darkMode={isDarkMode}
                />
                </div>

            </div>


  
          </div>
        </div>
      </div>
    );
  };
  
  export default VerReportePrecioNacional;
  