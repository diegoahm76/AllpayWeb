'use client';

// react
import React, { useEffect, useState } from 'react';
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
import { useReporteLibroComprasCacao } from '../hooks/useReporteLibroComprasCacao';
import useDocumentoReporteLibroComprasCacao from '../hooks/useDocumentoReporteLibroComprasCacao';
import { formatNumberWithCommas } from '@/utils/formatters';

// utils

const VerReporteCFFecha = () => {
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const router = useRouter();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [mounted, setMounted] = useState(false);

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
    } = useReporteLibroComprasCacao(token || '');

    // Hook para generar documento PDF
    const {
        documentoGenerado,
        //isLoading: isLoadingDocumento,
        error: errorDocumento,
        success: successDocumento,
        //generarDocumento,
        clearDocumento,
        clearError,
    } = useDocumentoReporteLibroComprasCacao();

    useEffect(() => {
        if (successDocumento && documentoGenerado?.archivo) {
            // Abrir el documento en una nueva pestaña
            window.open(documentoGenerado.archivo, '_blank');
            // Limpiar el estado después de abrir
            clearDocumento();
        }
    }, [successDocumento, documentoGenerado, clearDocumento]);

    // Función para manejar la consulta
    const handleConsultar = async () => {
        const filters: any = {};
        
        if (fechaInicio) filters.fecha_inicio = fechaInicio;
        if (fechaFinal) filters.fecha_final = fechaFinal;

        // Resetear a página 1 cuando se aplican nuevos filtros
        filters.page = 1;

        await fetchReporte(filters);
    };

    // Función para limpiar filtros
    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        clearFilters();
    };

    // Función wrapper para cambio de página
    const handlePageChangeWrapper = (page: number) => {
        handlePageChange(page);
        // El hook ahora maneja automáticamente la consulta cuando se cambia de página
    };

    // Función para descargar reporte
    // const handleDescargarReporte = async () => {
    //     if (!token) {
    //         alert('No se encontró el token de autenticación');
    //         return;
    //     }

    //     try {
    //         const params = {
    //             ...(fechaInicio && { fecha_inicio: fechaInicio }),
    //             ...(fechaFinal && { fecha_final: fechaFinal })
    //         };

    //         await generarDocumento(token, params);
    //     } catch (error) {
    //         console.error('Error al generar el documento:', error);
    //     }
    // };

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
            fecha_compra: formatDateForExcel(row.fecha_compra),
            // Exportar números como números PUROS (sin $ ni separadores)
            nro_factura_unica: Number(row.nro_factura_unica ?? 0),
            kilos_comprados: Number(row.kilos_comprados ?? 0),
            precio_kilo: Number(row.precio_kilo ?? 0),
            valor_bruto: Number(row.valor_bruto ?? 0),
            cuota_fomento: Number(row.cuota_fomento ?? 0),
            valor_neto: Number(row.valor_neto ?? 0),
            // Mantener otros campos tal cual
            nombre_recaudador: row.nombre_recaudador,
            nombreproveedor: row.nombreproveedor,
            municipio_cacao_nombre: row.municipio_cacao_nombre,
            departamento_cacao_nombre: row.departamento_cacao_nombre,
            numero_doc_recaudador: row.numero_doc_recaudador,
            numero_doc_proveedor: row.numero_doc_proveedor,
            estado_factura_display: row.estado_factura_display
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
                sin_paginacion: true // ✅ Parámetro para obtener todos los datos
            };
            
            if (fechaInicio) filters.fecha_inicio = fechaInicio;
            if (fechaFinal) filters.fecha_final = fechaFinal;

            // Llamada directa al adaptador para evitar actualizar la vista
            const { getReporteLibroComprasCacao } = await import('../adapters/reporteLibroComprasCacao.adapter');
            const response = await getReporteLibroComprasCacao(token, filters);
            
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
            key: 'numero_doc_recaudador',
            label: 'NIT RECAUDADOR',
            render: (value: any) => value
        },
        {   
            key: 'nombre_recaudador', 
            label: 'NOMBRE RECAUDADOR', 
            render: (value: any) => value
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
            key: 'numero_doc_proveedor',
            label: 'NIT PROVEEDOR',
            render: (value: any) => value
        },
        {
            key: 'nombreproveedor',
            label: 'NOMBRE PROVEEDOR',
            render: (value: any) => {
                console.log('[VerReporteCFFecha] - Valor nombreproveedor:', value);
                return value;
            }
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
            key: 'kilos_comprados',
            label: 'KILOS COMPRADOS',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'precio_kilo',
            label: 'PRECIO KILO CACAO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value)
        },
        {
            key: 'valor_bruto',
            label: 'VALOR BRUTO CACAO',
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
            label: 'VALOR NETO CACAO',
            render: (value: any) => new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(value))
        },
        {
            key: 'estado_factura_display',
            label: 'ESTADO FACTURA',
            render: (value: any) => value
        }
    ];
  
    return (
        <div className="w-full max-w-full mx-auto ">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                    >
                        &times;
                    </button>

                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        REPORTE CONSOLIDADO DE LIBRO DE COMPRAS DE CACAO
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        CONSULTA POR FECHA DE COMPRA DE CACAO
                    </h3>

                    {/* Filtros */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
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
                            onClose={clearError}
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
                        REPORTE CONSOLIDADO DE LIBRO DE COMPRAS DE CACAO
                    </h2>

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



                    <div className='flex justify-between gap-4 mt-6 col-span-8'>
                    
                        <div className='flex flex-col md:flex-row justify-center gap-4 w-full md:w-auto'>

                            <div className='w-full'>
                                <AnimatedInput
                                label='TOTAL DE KILOS'
                                type='text'
                                value={reporteData.totales?.total_kilos ? reporteData.totales.total_kilos.toLocaleString('es-CO') : '0'}
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
  
export default VerReporteCFFecha;
  