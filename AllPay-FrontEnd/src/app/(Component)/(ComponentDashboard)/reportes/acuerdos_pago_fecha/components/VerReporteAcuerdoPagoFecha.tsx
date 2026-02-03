'use client';

// react
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// hooks
import { useReporteAcuerdosPago } from '../hooks/useReporteAcuerdosPago';
import { useSumatoriasAcuerdosPago } from '../hooks/useSumatoriasAcuerdosPago';
import { useDocumentoReporteAcuerdosPago } from '../hooks/useDocumentoReporteAcuerdosPago';
import { InternalUserInfo } from '@/presenters/components/recaudadores/InternalUserInfo';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { useEstadosAcuerdoPago } from '@/application/estados/useEstadosAcuerdoPago';

const VerReporteAcuerdoPagoFecha = () => {
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const router = useRouter();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>('');
    const [isConsulting, setIsConsulting] = useState<boolean>(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';
    
    // Estado para almacenar información del recaudador
    const [recaudadorInfo, setRecaudadorInfo] = useState<{
        nombre_completo: string;
        numero_documento: string;
        tipo_persona: string;
    } | null>(null);
    
    // Estado centralizado para manejo de errores
    const [globalError, setGlobalError] = useState<string>('');
    const [showGlobalError, setShowGlobalError] = useState<boolean>(false);

    // Hook del reporte
    const {
        reporteData,
        isLoading,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        fetchReporte,
        clearFilters,
        handlePageChange,
        clearAlerts,
        fetchAllData
    } = useReporteAcuerdosPago(token || '');

    // Hook de sumatorias
    const {
        sumatoriasData,
        isLoading: isLoadingSumatorias,
        error: sumatoriasError,
        showErrorAlert: showSumatoriasErrorAlert,
        errorAlertMessage: sumatoriasErrorAlertMessage,
        clearAlerts: clearSumatoriasAlerts,
        fetchSumatorias,
        clearSumatorias
    } = useSumatoriasAcuerdosPago(token || '');

    // Hook de documento
    const {
        //generarYDescargarDocumento,
        //isLoading: isLoadingDocumento,
        showErrorAlert: showDocumentoErrorAlert,
        errorAlertMessage: documentoErrorAlertMessage,
        clearAlerts: clearDocumentoAlerts
    } = useDocumentoReporteAcuerdosPago(token || '');

    // Hook de estados de acuerdos de pago
    const {
        estados,
        loading: loadingEstados,
        error: errorEstados
    } = useEstadosAcuerdoPago(token);


    // Función callback para recibir información del recaudador desde InternalUserInfo
    const handleRecaudadorFound = useCallback((recaudadorData: any) => {

        // Almacenar la información del recaudador
        setRecaudadorInfo({
            nombre_completo: recaudadorData.nombre_completo || `${recaudadorData.nombres} ${recaudadorData.apellidos}`,
            numero_documento: recaudadorData.numero_documento,
            tipo_persona: recaudadorData.tipo_persona
        });

    }, []);

    // Función para mostrar error global
    const showGlobalErrorMessage = useCallback((message: string) => {
        // Limpiar todos los errores individuales primero
        clearAlerts();
        clearSumatoriasAlerts();
        clearDocumentoAlerts();
        
        // Mostrar error global
        setGlobalError(message);
        setShowGlobalError(true);
    }, [clearAlerts, clearSumatoriasAlerts, clearDocumentoAlerts]);

    // Función para limpiar error global
    const clearGlobalError = useCallback(() => {
        setGlobalError('');
        setShowGlobalError(false);
    }, []);

    // Función para manejar la consulta
    const handleConsultar = async () => {
        // Limpiar errores previos
        clearGlobalError();
        clearAlerts();
        clearSumatoriasAlerts();
        clearDocumentoAlerts();

        setIsConsulting(true);
        const filters: any = {};
        
        if (fechaInicio) filters.fecha_inicio = fechaInicio;
        if (fechaFinal) filters.fecha_final = fechaFinal;
        if (estadoSeleccionado) filters.estado = estadoSeleccionado;
        if (recaudadorInfo?.nombre_completo) filters.nombre_recaudador = recaudadorInfo.nombre_completo;

        // Resetear a página 1 cuando se aplican nuevos filtros
        filters.page = 1;

   
        try {

            const results = await Promise.allSettled([
                fetchReporte(filters),
                fetchSumatorias(filters)
            ]);

            // Verificar si alguna consulta falló
            const failedResults = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
            
            if (failedResults.length > 0) {
                // Mostrar solo el primer error para evitar múltiples modales
                const firstError = failedResults[0].reason;
                const errorMessage = firstError instanceof Error ? firstError.message : 'Error en la consulta';
                showGlobalErrorMessage(errorMessage);
            } 
            

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error inesperado en las consultas';
            showGlobalErrorMessage(errorMessage);
        } finally {
            setIsConsulting(false);
        }
    };

    // Función para limpiar filtros
    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setEstadoSeleccionado('');
        setRecaudadorInfo(null);
        setIsConsulting(false);
        clearFilters();
        clearSumatorias();
        clearGlobalError();
        clearAlerts();
        clearSumatoriasAlerts();
        clearDocumentoAlerts();
        
    };

    // Función wrapper para cambio de página
    const handlePageChangeWrapper = (page: number) => {
        handlePageChange(page); 
    };

    // Función para manejar la descarga del documento
    // const handleDescargarReporte = async () => {
    //     const filters: any = {};
        
    //     if (fechaInicio) filters.fecha_inicio = fechaInicio;
    //     if (fechaFinal) filters.fecha_fin = fechaFinal; // Nota: el endpoint usa fecha_fin, no fecha_final
    //     if (estadoSeleccionado) filters.estado = estadoSeleccionado;
    //     if (recaudadorInfo?.nombre_completo) filters.nombre_recaudador = recaudadorInfo.nombre_completo;

    //     console.log('📥 Descargando reporte con filtros:', filters);
    //     console.log('👤 Información del recaudador incluida en descarga:', {
    //         nombre_completo: recaudadorInfo?.nombre_completo,
    //         numero_documento: recaudadorInfo?.numero_documento,
    //         tipo_persona: recaudadorInfo?.tipo_persona
    //     });
        
    //     await generarYDescargarDocumento(filters);
    // };

    // Formatear el total de cuotas de fomento para mostrar en el input
    const formatTotalCuotasFomento = () => {

        // Si está cargando o consultando, mostrar "Cargando..."
        if (isLoadingSumatorias || isConsulting) {
            return 'Cargando...';
        }
        
        // Si hay un error, limpiar el input
        if (sumatoriasError) {
            return '';
        }
        
        // Si hay datos exitosos y el valor es mayor a 0
        if (sumatoriasData.success && sumatoriasData.sumatorias.total_cuotas_fomento > 0) {
            // Redondear el valor para eliminar decimales
            const roundedValue = Math.round(sumatoriasData.sumatorias.total_cuotas_fomento);
            const formattedValue = new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(roundedValue);
            return formattedValue;
        }
        
        return '';
    };

    // Formatear el total de intereses para mostrar en el input
    const formatTotalIntereses = () => {

        // Si está cargando o consultando, mostrar "Cargando..."
        if (isLoadingSumatorias || isConsulting) {
            return 'Cargando...';
        }
        
        // Si hay un error, limpiar el input
        if (sumatoriasError) {
            return '';
        }
        
        // Si hay datos exitosos y el valor es mayor a 0
        if (sumatoriasData.success && sumatoriasData.sumatorias.total_intereses > 0) {
            // Redondear el valor para eliminar decimales
            const roundedValue = Math.round(sumatoriasData.sumatorias.total_intereses);
            const formattedValue = new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(roundedValue);
            return formattedValue;
        }
        
        // Si no hay datos o el valor es 0, retornar cadena vacía
        return '';
    };

    const columns = [
        {
            key: 'numero_solicitud',
            label: 'N° SOLICITUD',
            render: (value: any) => value
        },
        {   
            key: 'fecha_solicitud', 
            label: 'FECHA DE SOLICITUD', 
            render: (value: any) => new Date(value).toLocaleDateString('es-CO')
        },
        {
            key: 'estado_display',
            label: 'ESTADO',
            render: (value: any) => value
        },
        {
            key: 'tipo_documento_recaudador',
            label: 'TIPO DOCUMENTO',
            render: (value: any) => value
        },
        {
            key: 'nombre_recaudador', 
            label: 'NOMBRE RECAUDADOR',
            render: (value: any) => value
        },
        {
            key: 'numero_plan_pago', 
            label: 'N° PLAN DE PAGO',
            render: (value: any) => value
        },
        { 
            key: 'numero_cuotas', 
            label: 'N° CUOTAS',
            render: (value: any) => value
        },
        { 
            key: 'facturas_asociadas', 
            label: 'FACTURAS ASOCIADAS',
            render: (value: any) => value
        },
        {
            key: 'total_pagar_cuotas_fomento',
            label: 'TOTAL CUOTAS FOMENTO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
        },
        {
            key: 'total_pagar_intereses',
            label: 'TOTAL INTERESES',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
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

                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        REPORTE CONSOLIDADO DE ACUERDOS DE PAGO
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        CONSULTA POR RECAUDADOR
                    </h3>


                    <InternalUserInfo onRecaudadorFound={handleRecaudadorFound} darkMode={isDarkMode} />

                    <h3 className={`text-md text-left font-bold mt-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        CONSULTA POR FECHA DE SOLICITUD
                    </h3>

                    {/* Filtros */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
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

                        <div className='w-full'>
                        <AnimatedSelect
                            label={loadingEstados ? 'Estado (Cargando...)' : 'Estado'}
                            name='estado'
                            value={estadoSeleccionado}
                            onChange={(e) => setEstadoSeleccionado(e.target.value)}
                            options={estados.map((estado, index) => ({
                                key: index,
                                value: estado.value,
                                title: estado.label
                            }))}
                            disabled={loadingEstados}
                            darkMode={isDarkMode}
                        />
                        </div>
                        {errorEstados && (
                            <div className={`text-sm mt-1 md:col-span-2 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
                                Error al cargar estados: {errorEstados}
                            </div>
                        )}
                        {!loadingEstados && !errorEstados && estados.length === 0 && (
                            <div className="text-gray-500 text-sm mt-1 md:col-span-2">
                                No hay estados disponibles
                            </div>
                        )}
                    </div>

                    {/* Alertas de éxito */}
                    {showAlertNotification && !showGlobalError && (
                        <AlertSuccess
                            isOpen={showAlertNotification}
                            message={alertMessage}
                            onClose={clearAlerts}
                        />
                    )}

                    {/* ✅ PRIORIDAD MÁXIMA - Error global centralizado */}
                    {showGlobalError && (
                        <AlertError
                            isOpen={showGlobalError}
                            message={globalError}
                            onClose={clearGlobalError}
                        />
                    )}

                    {/* Alertas de error del reporte principal - Solo si no hay error global */}
                    {showErrorAlert && !showGlobalError && (
                        <AlertError
                            isOpen={showErrorAlert}
                            message={errorAlertMessage}
                            onClose={clearAlerts}
                        />
                    )}

                    {/* Alertas de error de sumatorias - Solo si no hay error global */}
                    {showSumatoriasErrorAlert && !showGlobalError && (
                        <AlertError
                            isOpen={showSumatoriasErrorAlert}
                            message={sumatoriasErrorAlertMessage}
                            onClose={clearSumatoriasAlerts}
                        />
                    )}

                    {/* Alertas de error de documento - Solo si no hay error global */}
                    {showDocumentoErrorAlert && !showGlobalError && (
                        <AlertError
                            isOpen={showDocumentoErrorAlert}
                            message={documentoErrorAlertMessage}
                            onClose={clearDocumentoAlerts}
                        />
                    )}

                    <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                        <Button title='Limpiar' onClick={handleLimpiar} />
                        <Button title='Consultar' onClick={handleConsultar} />
                        <Button title='Salir' onClick={() => router.push('/')} />
                    </div>
                </div>

                {/* Tabla de resultados */}
                <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        REPORTE CONSOLIDADO DE ACUERDOS DE PAGO
                    </h2>

                    <DynamicTable
                        columns={columns}
                        data={reporteData.acuerdos}
                        isLoading={isLoading}
                        currentPage={reporteData.current_page}
                        totalPages={reporteData.total_pages}
                        onPageChange={handlePageChangeWrapper}
                        fetchAllData={fetchAllData}
                    />

                    <div className='flex justify-between gap-4 mt-6 col-span-8'>

                      <div className='flex flex-col md:flex-row justify-center gap-4 w-full md:w-auto'>
                            <div className='w-full'>
                            <AnimatedInput
                                key={`total-cuota-fomento-${isLoadingSumatorias}-${sumatoriasData.success}-${!!sumatoriasError}`}
                                label='TOTAL CF'
                                type='text'
                                labelSize="sm"
                                value={formatTotalCuotasFomento()}
                                onChange={() => {}}
                                name='total_cuota_fomento'
                                readOnly
                                darkMode={isDarkMode}
                             />
                            </div>
                             
                            <div className='w-full'>
                            <AnimatedInput
                                 key={`total-intereses-${isLoadingSumatorias}-${sumatoriasData.success}-${!!sumatoriasError}`}
                                 label='TOTAL INTERESES'
                                 type='text'
                                 labelSize="sm"
                                 value={formatTotalIntereses()}
                                 onChange={() => {}}
                                 name='total_intereses'
                                 readOnly
                                 darkMode={isDarkMode}
                             />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
  
export default VerReporteAcuerdoPagoFecha;
  