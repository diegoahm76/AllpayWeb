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
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';

// hooks
import { useTiposCargue } from '../hooks/useTiposCargue';
import { useReporteSicex } from '../hooks/useReporteSicex';
import { useDescargarReporteSicex } from '../hooks/useDescargarReporteSicex';
import { usePaises } from '@/application/choices/usePaises';
import usePosiciones from '@/application/choices/usePosiciones';
import useVias from '@/application/choices/useVias';

// utils
import {formatearFechaDMYUTC} from "@/utils/dateUtils"
import { formatCurrency, formatNumber } from '@/utils/formatters';

const VerReporteSicexFecha = () => {

    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [tipoCargueSeleccionado, setTipoCargueSeleccionado] = useState('');
    const [paisSeleccionado, setPaisSeleccionado] = useState('');
    const [posicionSeleccionada, setPosicionSeleccionada] = useState('');
    const [viaSeleccionada, setViaSeleccionada] = useState('');
    const [empresaDeclarante, setEmpresaDeclarante] = useState('');
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
    const token = (session as any)?.user?.tokens?.access || '';

    // Hook para los tipos de cargue
    const {
        isLoading: isLoadingTiposCargue,
        fetchTiposCargue,
        getOpcionesSelect
    } = useTiposCargue(token);

    // Hook para países
    const {
        isLoading: isLoadingPaises,
        fetchPaises,
        getOpcionesSelect: getOpcionesSelectPaises,
        getPaisByCode
    } = usePaises(token);

    // Hook para posiciones arancelarias
    const {
        posiciones,
        isLoading: isLoadingPosiciones,
        fetchPosiciones
    } = usePosiciones();

    // Hook para vías de transporte
    const {
        vias,
        isLoading: isLoadingVias,
        fetchVias
    } = useVias();

    // Hook del reporte SICEX
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
    } = useReporteSicex(token);

    // Hook para descargar el reporte SICEX
    const {
        //isLoading: isLoadingDescarga,
        //descargarReporte,
        clearAlerts: clearAlertsDescarga,
        showAlertNotification: showAlertNotificationDescarga,
        alertMessage: alertMessageDescarga,
        showErrorAlert: showErrorAlertDescarga,
        errorAlertMessage: errorAlertMessageDescarga
    } = useDescargarReporteSicex(token);

    useEffect(() => {
      if (!valueSesion?.user?.tipo_usuario) return; 
      if (valueSesion.user.tipo_usuario === 'I') {
        setIsInternalUser(true);
      } else if (valueSesion.user.tipo_usuario === 'E') {
        setIsInternalUser(false);
      }
    }, [valueSesion?.user?.tipo_usuario]);

    // Cargar tipos de cargue, países, posiciones y vías al montar el componente
    useEffect(() => {
      if (token && token.trim() !== '') {
        fetchTiposCargue();
        fetchPaises();
        fetchPosiciones(token);
        fetchVias(token);
      }
    }, [token, fetchTiposCargue, fetchPaises, fetchPosiciones, fetchVias]);

    // Limpiar datos cuando cambie el tipo de cargue para que las columnas se actualicen
    useEffect(() => {
      if (tipoCargueSeleccionado) {
        clearFiltersReporte();
      }
    }, [tipoCargueSeleccionado, clearFiltersReporte]);

        // Columnas para Exportación (EXP)
    const columnsExportacion = [
        {
            key: 'agno',
            label: 'AÑO',
            render: (value: any) => value
        },
        {
            key: 'aduana_embarque',
            label: 'ADUANA EMBARQUE',
            render: (value: any) => value
        },
        {
            key: 'auto_embarque',
            label: 'AUTO EMBARQUE',
            render: (value: any) => value || "Sin auto embarque"
        },
        {
            key: 'continente',
            label: 'CONTINENTE',
            render: (value: any) => value
        },
        {
            key: 'descripcion_arancel', 
            label: 'DESCRIPCIÓN ARANCELARIA',
            render: (value: any) => value
        },
        {
            key: 'empresa_declarante', 
            label: 'EMPRESA DECLARANTE',
            render: (value: any) => value
        },
        {
            key: 'empresa_operadora',
            label: 'EMPRESA IMPORTADORA',
            render: (value: any) => value
        },
        { 
            key: 'fecha', 
            label: 'FECHA',
            render: (value: any) => formatearFechaDMYUTC(value)
        },
        {
            key: 'mes',
            label: 'MES',
            render: (value: any) => value
        },
        { 
            key: 'nit', 
            label: 'NIT',
            render: (value: any) => value
        },
        {
            key: 'nro_declaracion',
            label: 'N° DECLARACIÓN',
            render: (value: any) => value
        },
        {
            key: 'pais',
            label: 'PAÍS DESTINO',
            render: (value: any) => value
        },
        {
            key: 'posicion',
            label: 'POSICIÓN',
            render: (value: any) => value
        },
        {
            key: 'pos',
            label: 'POS',
            render: (value: any) => value
        },
        {
            key: 'total_peso_bruto',
            label: 'TOTAL PESO BRUTO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_toneladas_bruto',
            label: 'TOTAL EN TONELADAS',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_peso_neto',
            label: 'TOTAL PESO NETO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_toneladas_neto',
            label: 'TOTAL EN TONELADAS',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'factor_conversion',
            label: 'FACTOR DE CONVERSIÓN A GRANO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_valor_cif',
            label: 'TOTAL VALOR CIF',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'total_valor_fob',
            label: 'TOTAL VALOR FOB',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'via',
            label: 'VÍA',
            render: (value: any) => value
        }
    ];

    // Columnas para Importación (IMP)
    const columnsImportacion = [
        {
            key: 'agno',
            label: 'AÑO',
            render: (value: any) => value
        },
        {
            key: 'aduana_embarque',
            label: 'ADUANA EMBARQUE',
            render: (value: any) => value
        },
        {
            key: 'ciudad_ingreso',
            label: 'CIUDAD DE INGRESO',
            render: (value: any) => value || "Sin ciudad"
        },
        {
            key: 'continente',
            label: 'CONTINENTE',
            render: (value: any) => value
        },
        {
            key: 'departamento',
            label: 'DEPARTAMENTO',
            render: (value: any) => value || "Sin departamento"
        },
        {
            key: 'descripcion_arancel', 
            label: 'DESCRIPCIÓN ARANCELARIA',
            render: (value: any) => value
        },
        {
            key: 'empresa_declarante', 
            label: 'EMPRESA DECLARANTE',
            render: (value: any) => value
        },
        {
            key: 'empresa_operadora',
            label: 'EMPRESA EXPORTADORA',
            render: (value: any) => value
        },
        { 
            key: 'fecha', 
            label: 'FECHA',
            render: (value: any) => formatearFechaDMYUTC(value)
        },
        {
            key: 'mes',
            label: 'MES',
            render: (value: any) => value
        },
        { 
            key: 'nit', 
            label: 'NIT',
            render: (value: any) => value
        },
        {
            key: 'nro_declaracion',
            label: 'N° DECLARACIÓN',
            render: (value: any) => value
        },
        {
            key: 'pais',
            label: 'PAÍS ORIGEN',
            render: (value: any) => value
        },
        {
            key: 'posicion',
            label: 'POSICIÓN',
            render: (value: any) => value
        },
        {
            key: 'pos',
            label: 'POS',
            render: (value: any) => value
        },
        {
            key: 'proveedor',
            label: 'PROVEEDOR',
            render: (value: any) => value || "Sin proveedor"
        },
        {
            key: 'total_peso_bruto',
            label: 'TOTAL PESO BRUTO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_toneladas_bruto',
            label: 'TOTAL EN TONELADAS',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_peso_neto',
            label: 'TOTAL PESO NETO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_toneladas_neto',
            label: 'TOTAL EN TONELADAS NETO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'factor_conversion',
            label: 'FACTOR DE CONVERSIÓN A GRANO',
            render: (value: any) => formatNumber(value)
        },
        {
            key: 'total_valor_cif',
            label: 'TOTAL VALOR CIF',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'total_valor_fob',
            label: 'TOTAL VALOR FOB',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'via',
            label: 'VÍA',
            render: (value: any) => value
        }
    ];

    // Función para obtener las columnas según el tipo de cargue seleccionado
    const getColumnsForTipoCargue = () => {
        if (tipoCargueSeleccionado === 'EXP') {
            return columnsExportacion;
        } else if (tipoCargueSeleccionado === 'IMP') {
            return columnsImportacion;
        }
        // Si no hay tipo seleccionado, mostrar todas las columnas por defecto
        return columnsExportacion;
    };


    
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

                <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>REPORTE BASE DE DATOS SICEX</h2>

                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Consulta por fecha</h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 col-span-2'>

                  <AnimatedInput
                      label='Fecha Inicio'
                      type='date'
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      name='fecha_inicio'
                      darkMode={isDarkMode}
                  />

                  <AnimatedInput
                      label='Fecha Final'
                      type='date'
                      value={fechaFinal}
                      onChange={(e) => setFechaFinal(e.target.value)}
                      name='fecha_final'
                      darkMode={isDarkMode}
                  />

                  <AnimatedSelect
                      label={isLoadingTiposCargue ? 'Base de datos (Cargando...)' : 'Base de datos'}
                      options={getOpcionesSelect().map((opcion, index) => ({
                        key: index.toString(),
                        value: opcion.value,
                        title: opcion.label
                      }))}
                      value={tipoCargueSeleccionado}
                      onChange={(e) => setTipoCargueSeleccionado(e.target.value)}
                      name='tipo_cargue'
                      disabled={isLoadingTiposCargue}
                      darkMode={isDarkMode}
                  />

                                     <AnimatedSelect
                       label={isLoadingPaises ? 'País (Cargando...)' : 'País'}
                       options={getOpcionesSelectPaises().map((opcion, index) => ({
                         key: index.toString(),
                         value: opcion.value,
                         title: opcion.title
                       }))}
                       value={paisSeleccionado}
                       onChange={(e) => setPaisSeleccionado(e.target.value)}
                       name='pais'
                       disabled={isLoadingPaises}
                       darkMode={isDarkMode}
                   />  

                  <AnimatedSelect
                      label={isLoadingPosiciones ? 'Posición (Cargando...)' : 'Posición'}
                      options={posiciones.map((posicion, index) => ({
                        key: index.toString(),
                        value: posicion,
                        title: posicion
                      }))}
                      value={posicionSeleccionada}
                      onChange={(e) => setPosicionSeleccionada(e.target.value)}
                      name='posicion'
                      disabled={isLoadingPosiciones}
                      darkMode={isDarkMode}
                  />  

                  <AnimatedInput
                      label='Empresa declarante'
                      labelSize='sm'
                      type='text'
                      value={empresaDeclarante}
                      onChange={(e) => setEmpresaDeclarante(e.target.value)}
                      name='empresa_declarante'
                      darkMode={isDarkMode}
                  />

                                     <AnimatedSelect
                       label={isLoadingVias ? 'Vía (Cargando...)' : 'Vía'}
                       options={vias.map((via, index) => ({
                         key: index.toString(),
                         value: via,
                         title: via
                       }))}
                       value={viaSeleccionada}
                       onChange={(e) => setViaSeleccionada(e.target.value)}
                       name='via'
                       disabled={isLoadingVias}
                       darkMode={isDarkMode}
                   />


                </div>

                <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                  <Button title='Limpiar' onClick={() => {
                    setFechaInicio('');
                    setFechaFinal('');
                    setTipoCargueSeleccionado('');
                    setPaisSeleccionado('');
                    setPosicionSeleccionada('');
                    setViaSeleccionada('');
                    setEmpresaDeclarante('');
                    clearFiltersReporte();
                  }} />
                  <Button title='Consultar' onClick={() => {
                    const params: any = {
                      page: 1,
                      page_size: 10
                    };
                    
                    if (fechaInicio) params.fecha_inicio = fechaInicio;
                    if (fechaFinal) params.fecha_fin = fechaFinal;
                    if (tipoCargueSeleccionado) params.tipo_cargue = tipoCargueSeleccionado;
                    
                    // Agregar filtro de país si está seleccionado
                    if (paisSeleccionado) {
                      const paisEncontrado = getPaisByCode(paisSeleccionado);
                      if (paisEncontrado) {
                        params.pais = paisEncontrado.nombre;
                      }
                    }
                    
                    // Agregar filtro de posición si está seleccionada
                    if (posicionSeleccionada) {
                      params.posicion = posicionSeleccionada;
                    }
                    
                    // Agregar filtro de vía si está seleccionada
                    if (viaSeleccionada) {
                      params.via = viaSeleccionada;
                    }
                    
                    // Agregar filtro de empresa declarante si está ingresada
                    if (empresaDeclarante.trim()) {
                      params.empresa_declarante = empresaDeclarante.trim();
                    }
                    
                    fetchReporte(params);
                  }} />
                  <Button title='Salir' onClick={() => router.push('/')} />
                </div>
                
            </div>

          {/* Tabla de resultados */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              REPORTE SABANA DE EXPORTACION / IMPORTACION DE CACAO
            </h2>

            <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Reporte SICEX</h3>
  
            <DynamicTable
              columns={getColumnsForTipoCargue()}
              data={reporteData.registros}
              isLoading={isLoadingReporte}
              currentPage={reporteData.current_page}
              totalPages={reporteData.total_pages}
              onPageChange={handlePageChange}
              fetchAllData={fetchAllData}
  
            />

            <div className='flex flex-col md:flex-row justify-center gap-4 mt-6 w-full md:w-auto'>
                <div className='w-full'>
                    <AnimatedInput
                        label='Total de toneladas'
                        value={reporteData.total_toneladas}
                        name='total_toneladas'
                        disabled={true}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className='w-full'>
                    <AnimatedInput
                        label='Total de valor CIF'
                        value={reporteData.total_valor_cif}
                        name='total_valor_cif'
                        disabled={true}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className='w-full'>
                    <AnimatedInput
                        label='Total de valor FOB'
                        value={reporteData.total_valor_fob}
                        name='total_valor_fob'
                        disabled={true}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className='w-full'>
                    <AnimatedInput
                        label='Total de peso neto'
                        value={reporteData.total_peso}
                        name='total_peso'
                        disabled={true}
                        darkMode={isDarkMode}
                    />
                </div>
            </div>

         
 
          </div>

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

          {/* Alertas de descarga */}
          {showAlertNotificationDescarga && (
              <AlertSuccess
                  isOpen={showAlertNotificationDescarga}
                  message={alertMessageDescarga}
                  onClose={clearAlertsDescarga}
              />
          )}

          {showErrorAlertDescarga && (
              <AlertError
                  isOpen={showErrorAlertDescarga}
                  message={errorAlertMessageDescarga}
                  onClose={clearAlertsDescarga}
              />
          )}
        </div>
      </div>
    );
  };
  
  export default VerReporteSicexFecha;
  