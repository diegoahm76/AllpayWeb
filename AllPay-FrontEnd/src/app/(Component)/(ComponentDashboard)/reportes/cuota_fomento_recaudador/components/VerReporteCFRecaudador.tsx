'use client';

// react
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { InternalUserInfo, InternalUserInfoRef } from '@/presenters/components/recaudadores/InternalUserInfo';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// hooks
import { useReporteConsolidadoPagoCuotaFomento } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/hooks/useReporteConsolidadoPagoCuotaFomento';
import useDocumentoReporteConsolidadoPagoCuotaFomento from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/hooks/useDocumentoReporteConsolidadoPagoCuotaFomento';
import { useDepartamentosColombia } from '@/application/address/useDeparmentsLogged';
import { useGetCities } from '@/application/address/useGetCities';

// utils

const VerReporteCFRecaudador = () => {
    
    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [mounted, setMounted] = useState(false);
    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    
    // Ref para el componente InternalUserInfo
    const internalUserInfoRef = useRef<InternalUserInfoRef>(null);

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [idDepartamentoCacao, setIdDepartamentoCacao] = useState<string>('');
    const [idMunicipioCacao, setIdMunicipioCacao] = useState<string>('');
    const [recaudador, setRecaudador] = useState<string>('');
    const [numeroDocumentoRecaudador, setNumeroDocumentoRecaudador] = useState<string>('');
    const [numeroDocumentoProveedor, setNumeroDocumentoProveedor] = useState<string>('');
    const [nombresProveedor, setNombresProveedor] = useState<string>('');
    const [idRecaudador, setIdRecaudador] = useState<number | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

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
    } = useReporteConsolidadoPagoCuotaFomento(token || '');

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

    // Hook para generar documento PDF
    const {
        documentoGenerado,
        //isLoading: isLoadingDocumento,
        error: errorDocumento,
        success: successDocumento,
        //generarDocumento,
        clearDocumento,
        clearError,
        clearSuccess
    } = useDocumentoReporteConsolidadoPagoCuotaFomento();

    useEffect(() => {
        if (!session?.user) return; 
        const user = session.user as any;
        if (user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [session?.user]);

    useEffect(() => {
        setIdMunicipioCacao('');
    }, [idDepartamentoCacao]);

    useEffect(() => {
        if (successDocumento && documentoGenerado?.archivo) {
            window.open(documentoGenerado.archivo, '_blank');
            clearDocumento();
        }
    }, [successDocumento, documentoGenerado, clearDocumento]);

    // Función para manejar la consulta
    const handleConsultar = async () => {
        const filters: any = {};
        
        if (fechaInicio) filters.fecha_inicio = fechaInicio;
        if (fechaFinal) filters.fecha_final = fechaFinal;
        if (idDepartamentoCacao) filters.id_departamento_cacao = idDepartamentoCacao;
        if (idMunicipioCacao) filters.id_municipio_cacao = idMunicipioCacao;
        if (recaudador) filters.recaudador = recaudador;
        if (numeroDocumentoRecaudador) filters.numero_documento_recaudador = numeroDocumentoRecaudador;
        if (numeroDocumentoProveedor) filters.numero_documento_proveedor = numeroDocumentoProveedor;
        if (nombresProveedor) filters.nombres_proveedor = nombresProveedor;
        if (idRecaudador) filters.id_recaudador = idRecaudador;

        // Resetear a página 1 cuando se aplican nuevos filtros
        filters.page = 1;

        await fetchReporte(filters);
    };

    // Función para limpiar filtros
    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setIdDepartamentoCacao('');
        setIdMunicipioCacao('');
        setRecaudador('');
        setNumeroDocumentoRecaudador('');
        setNumeroDocumentoProveedor('');
        setNombresProveedor('');
        setIdRecaudador(null);
        
        // Limpiar también el formulario de InternalUserInfo
        if (internalUserInfoRef.current) {
            internalUserInfoRef.current.clearForm();
        }
        
        clearFilters(); 
    };

    // Función wrapper para cambio de página
    const handlePageChangeWrapper = (page: number) => {
        handlePageChange(page);
        // El hook ahora maneja automáticamente la consulta cuando se cambia de página
    };

    // Función para generar y descargar documento PDF
    // const handleDescargarReporte = async () => {

    //     try {
    //         const params = {
    //             ...(fechaInicio && { fecha_inicio: fechaInicio }),
    //             ...(fechaFinal && { fecha_final: fechaFinal }),
    //             ...(idDepartamentoCacao && { id_departamento_cacao: idDepartamentoCacao }),
    //             ...(idMunicipioCacao && { id_municipio_cacao: idMunicipioCacao }),
    //             ...(numeroDocumentoRecaudador && { numero_documento_recaudador: numeroDocumentoRecaudador }),
    //             ...(numeroDocumentoProveedor && { numero_documento_proveedor: numeroDocumentoProveedor }),
    //             ...(nombresProveedor && { nombres_proveedor: nombresProveedor }),
    //         };

    //         await generarDocumento(token, params);
    //     } catch (error) {
    //         console.error('Error al generar el documento:', error);
    //     }
    // };

    // Función para limpiar alertas
    const handleClearAlerts = () => {
        clearError();
        clearSuccess();
    };

    // Función para manejar cuando se encuentra un recaudador
    const handleRecaudadorFound = (recaudadorData: any) => {
        if (recaudadorData.id_persona) {
            setNumeroDocumentoRecaudador(recaudadorData.numero_documento);
        }
    };

    // Fechas para Excel (YYYY-MM-DD) y números sin formato para permitir operaciones
    const formatDateForExcel = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Función para formatear datos para Excel
    const formatDataForExcel = (data: any[]) => {
        return data.map(row => ({
            ...row,
            // Exportar fechas en formato compatible con Excel
            fecha_creacion: formatDateForExcel(row.fecha_creacion),
            fecha_compra: formatDateForExcel(row.fecha_compra),
            fecha_pago: row.fecha_pago ? formatDateForExcel(row.fecha_pago) : '',
            // Exportar números como números PUROS (sin $ ni separadores)
            nro_factura_unica: Number(row.nro_factura_unica ?? 0),
            nro_documento_soporte: row.nro_documento_soporte ? row.nro_documento_soporte : '',
            total_kilos: Number(row.total_kilos ?? 0),
            valor_kilo: row.valor_kilo && row.valor_kilo !== '0' && row.valor_kilo !== '0.00' 
                ? Number(row.valor_kilo) 
                : '',
            valor_bruto: Number(row.valor_bruto ?? 0),
            cuota_fomento: Number(row.cuota_fomento ?? 0),
            valor_neto: Number(row.valor_neto ?? 0),
            nro_doc_pago: row.nro_doc_pago ? row.nro_doc_pago : '',
            // Mantener otros campos tal cual
            nro_documento_recaudador: row.nro_documento_recaudador,
            nombre_recaudador: row.nombre_recaudador,
            nombre_tipo_cacao: row.nombre_tipo_cacao,
            nro_documento_proveedor: row.nro_documento_proveedor,
            nombre_proveedor: row.nombre_proveedor,
            municipio_cacao_nombre: row.municipio_cacao_nombre,
            departamento_cacao_nombre: row.departamento_cacao_nombre
        }));
    };

    // Función para obtener datos para Excel (con formateo aplicado)
    const fetchDataForExcel = async () => {
        if (!token) {
            return { data: [], total_pages: 0 };
        }

        try {
            // Usar la misma lógica de filtros que la consulta normal
            const filters: any = {
                page: 1,
                page_size: 10,
                sin_paginacion: true 
            };
            
            if (fechaInicio) filters.fecha_inicio = fechaInicio;
            if (fechaFinal) filters.fecha_final = fechaFinal;
            if (idDepartamentoCacao) filters.id_departamento_cacao = idDepartamentoCacao;
            if (idMunicipioCacao) filters.id_municipio_cacao = idMunicipioCacao;
            if (recaudador) filters.recaudador = recaudador;
            if (numeroDocumentoRecaudador) filters.numero_documento_recaudador = numeroDocumentoRecaudador;
            if (numeroDocumentoProveedor) filters.numero_documento_proveedor = numeroDocumentoProveedor;
            if (nombresProveedor) filters.nombres_proveedor = nombresProveedor;
            if (idRecaudador) filters.id_recaudador = idRecaudador;

            // Llamada directa al adaptador para evitar actualizar la vista
            const { getReporteConsolidadoPagoCuotaFomento } = await import('@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/adapters/reporteConsolidadoPagoCuotaFomento.adapter');
            const response = await getReporteConsolidadoPagoCuotaFomento(token, filters);
            
            // Formatear los datos antes de devolverlos
            return {
                data: formatDataForExcel(response.facturas),
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    const columns = [
        {
            key: 'fecha_creacion',
            label: 'FECHA REGISTRO',
            render: (value: any) => new Date(value).toLocaleDateString('es-CO')
        },
        {
            key: 'nro_documento_recaudador',
            label: 'NIT RECAUDADOR',
            render: (value: any) => value
        },
        {   
            key: 'nombre_recaudador', 
            label: 'NOMBRE RECAUDADOR', 
            render: (value: any) => value
        },
        {
            key: 'nombre_tipo_cacao',
            label: 'TIPO CACAO',
            render: (value: any) => value || 'N/A'
        },
        {
            key: 'fecha_compra',
            label: 'FECHA DE COMPRA',
            render: (value: any) => new Date(value).toLocaleDateString('es-CO')
        },
        {   
            key: 'nro_factura_unica', 
            label: 'N° FACTURA ÚNICA', 
            render: (value: any) => value 
        },
        {
            key: 'nro_documento_soporte',
            label: 'N° DOCUMENTO SOPORTE',
            render: (value: any) => value || '-'
        },
        {
            key: 'nro_documento_proveedor',
            label: 'NIT PROVEEDOR',
            render: (value: any) => value
        },
        {
            key: 'nombre_proveedor', 
            label: 'NOMBRE PROVEEDOR',
            render: (value: any) => value
        },
        { 
            key: 'municipio_cacao_nombre', 
            label: 'MUNICIPIO PROCEDENCIA CACAO',
            render: (value: any) => value
        },
        { 
            key: 'departamento_cacao_nombre', 
            label: 'DEPARTAMENTO PROCEDENCIA CACAO',
            render: (value: any) => value
        },
        {
            key: 'total_kilos',
            label: 'KILOS COMPRADOS',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
        },
        {
            key: 'valor_kilo',
            label: 'PRECIO KILO',
            render: (value: any) => {
                if (value && value !== '0' && value !== '0.00') {
                    return new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(parseFloat(value));
                }
                return '-';
            }
        },
        {
            key: 'valor_bruto',
            label: 'VALOR BRUTO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
        },
        {
            key: 'cuota_fomento',
            label: 'VALOR CUOTA FOMENTO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
        },
        {
            key: 'valor_neto',
            label: 'VALOR NETO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
        },
        {
            key: 'fecha_pago',
            label: 'FECHA DE PAGO',
            render: (value: any) => value ? new Date(value).toLocaleDateString('es-CO') : '-'
        },
        {
            key: 'nro_doc_pago',
            label: 'N° DOCUMENTO PAGO',
            render: (value: any) => value
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

                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        REPORTE CONSOLIDADO DE PAGO DE CUOTA DE FOMENTO
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR RECAUDADOR</h3>

                    <InternalUserInfo ref={internalUserInfoRef} onRecaudadorFound={handleRecaudadorFound} darkMode={isDarkMode} />
                </div>

                <div className={`rounded-xl p-6 relative mt-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR MUNICIPIO Y/O DEPARTAMENTO</h3>

                                         <div className='flex flex-col md:flex-row gap-4 mt-4 col-span-2'>
                        <div className='w-full'>
                        <AnimatedSelect
                             label='Departamentos'
                             value={idDepartamentoCacao}
                             onChange={(e) => setIdDepartamentoCacao(e.target.value)}
                             name='id_departamento_cacao'
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
                             label={loadingMunicipios ? 'Cargando municipios...' : 'Municipios'}
                             value={idMunicipioCacao}
                             onChange={(e) => setIdMunicipioCacao(e.target.value)}
                             name='id_municipio_cacao'
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
                </div>

                <div className={`rounded-xl p-6 relative mt-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR FECHA DE COMPRA</h3>

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
                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR PROVEEDOR</h3>

                    <div className='flex flex-col md:flex-row gap-4 mt-4 col-span-2'>
                        <div className='w-full'>
                        <AnimatedInput
                            label='Nº Documento'
                            type='text'
                            value={numeroDocumentoProveedor}
                            onChange={(e) => setNumeroDocumentoProveedor(e.target.value)}
                            name='numero_documento_proveedor'
                            darkMode={isDarkMode}
                        />
                        </div>

                        <div className='w-full'>
                        <AnimatedInput
                            label='Nombres'
                            type='text'
                            value={nombresProveedor}
                            onChange={(e) => setNombresProveedor(e.target.value)}
                            name='nombres_proveedor'
                            darkMode={isDarkMode}
                        />
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

                    {/* Alertas de error para generación de documentos */}
                    {errorDocumento && (
                        <AlertError
                            isOpen={!!errorDocumento}
                            message={errorDocumento}
                            onClose={handleClearAlerts}
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
                        REPORTE CONSOLIDADO DE PAGO DE CUOTA DE FOMENTO
                    </h2>

                    <div className="overflow-x-auto">
                        <DynamicTable
                            columns={columns}
                            data={reporteData.facturas}
                            isLoading={isLoading}
                            currentPage={reporteData.current_page}
                            totalPages={reporteData.total_pages}
                            onPageChange={handlePageChangeWrapper}
                            fetchAllData={fetchAllData}
                            fetchDataForExcel={fetchDataForExcel}
       
                        />
                    </div>

                    <div className='flex flex-col md:flex-row md:justify-between gap-4 mt-6 col-span-8'>
                    
                        <div className='flex flex-col md:flex-row gap-4 w-full md:w-auto'>

                            <div className='w-full'>
                                <AnimatedInput
                                    label='TOTAL DE KILOS AJUSTADO'
                                    type='text'
                                    value={reporteData.totales?.total_kilos_ajustado ? reporteData.totales.total_kilos_ajustado.toLocaleString('es-CO') : '0'}
                                    onChange={() => {}}
                                    name='total_kilos'
                                    readOnly
                                    darkMode={isDarkMode}
                                />
                            </div>

                            <div className='w-full'>
                                <AnimatedInput
                                    label='TOTAL DE KILOS'
                                    type='text'
                                    value={reporteData.totales?.total_kilos_facturas ? reporteData.totales.total_kilos_facturas.toLocaleString('es-CO') : '0'}
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
                                    value={reporteData.totales?.valor_cuota_fomento_total ? "$ " + Math.floor(reporteData.totales.valor_cuota_fomento_total).toLocaleString('es-CO') : '0'}
                                    onChange={() => {}}
                                    name='total_cuota_fomento'
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
  
export default VerReporteCFRecaudador;
  