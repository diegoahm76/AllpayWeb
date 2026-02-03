'use client';

// react

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signIn, useSession } from 'next-auth/react';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { InternalUserInfo, RecaudadorData, InternalUserInfoRef } from '@/presenters/components/recaudadores/InternalUserInfo';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// hooks
import useReporteLibroCompras from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/hooks/useReporteLibroCompras';
import useDocumentoReporteLibroCompras from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/hooks/useDocumentoReporteLibroCompras';
import { formatNumberWithCommas } from '@/utils/formatters';

// utils

const VerReporteCCRecaudador = () => {

    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [idRecaudador, setIdRecaudador] = useState<number | null>(null);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [mounted, setMounted] = useState(false);
    
    // Ref para el componente InternalUserInfo
    const internalUserInfoRef = useRef<InternalUserInfoRef>(null);

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

    // Hook para el reporte de libro de compras
    const {
        facturas,
        valorCuotaFomentoTotal,
        totalKilos,
        isLoading,
        error: errorReporte,
        currentPage,
        totalPages,
        fetchReporte,
        handlePageChange,
        clearReporte,
        clearError: clearErrorReporte,
        fetchAllData
    } = useReporteLibroCompras();

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
    } = useDocumentoReporteLibroCompras();

    useEffect(() => {
      if (!valueSesion?.user?.tipo_usuario) return; 
      if (valueSesion.user.tipo_usuario === 'I') {
        setIsInternalUser(true);
      } else if (valueSesion.user.tipo_usuario === 'E') {
        setIsInternalUser(false);
      }
    }, [valueSesion?.user?.tipo_usuario]);


    const handleRecaudadorData = (recaudadorData: RecaudadorData) => {
        if (recaudadorData.id_persona) {
            setIdRecaudador(recaudadorData.id_persona);
        }
    };

    // Función para manejar cambios en las fechas
    const handleFechaInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFechaInicio(e.target.value);
    };

    const handleFechaFinalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFechaFinal(e.target.value);
    };

    // Función para consultar el reporte
    const handleConsultarReporte = async () => {
        
        if (!idRecaudador) {
            return;
        }

        if (!valueSesion?.user?.tokens?.access) {
            return;
        }

        try {
            
            const params = {
                page: 1,
                page_size: 10,
                id_recaudador: idRecaudador,
                ...(fechaInicio && { fecha_inicio: fechaInicio }),
                ...(fechaFinal && { fecha_final: fechaFinal })
            };

            await fetchReporte(valueSesion.user.tokens.access, params);
        } catch (error) {
            console.error('Error al consultar el reporte:', error);
        
        }
    };

    // Función para limpiar datos
    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setIdRecaudador(null);
        clearReporte();
        
        // Limpiar también el formulario de InternalUserInfo
        if (internalUserInfoRef.current) {
            internalUserInfoRef.current.clearForm();
        }
    };

    // Función para salir
    const handleSalir = () => {
        router.push('/');
    };

    // Función para manejar cambios de página
    const onPageChange = (page: number) => {
        if (valueSesion?.user?.tokens?.access) {
            handlePageChange(page, valueSesion.user.tokens.access);
        } else {
            console.error('[VerReporteCCRecaudador] - No se encontró el token de autenticación');
        }
    };

    // Función para generar y descargar documento PDF
    // const handleDescargarReporte = async () => {
        
    //     if (!valueSesion?.user?.tokens?.access) {
    //         return;
    //     }

    //     try {
    //         const params = {
    //             ...(idRecaudador && { id_recaudador: idRecaudador }),
    //             ...(fechaInicio && { fecha_inicio: fechaInicio }),
    //             ...(fechaFinal && { fecha_final: fechaFinal })
    //         };

    //         await generarDocumento(valueSesion.user.tokens.access, params);
    //     } catch (error) {
    //         console.error('Error al generar el documento:', error);
    //     }
    // };

    // Efecto para manejar la respuesta exitosa del documento
    useEffect(() => {
        if (successDocumento && documentoGenerado?.archivo) {
            // Abrir el documento en una nueva pestaña
            window.open(documentoGenerado.archivo, '_blank');
            // Limpiar el estado después de abrir
            clearDocumento();
        }
    }, [successDocumento, documentoGenerado, clearDocumento]);

    // Función para limpiar alertas de documento
    const handleClearAlerts = () => {
        clearError();
        clearSuccess();
    };

    // Función para limpiar alerta de error del reporte
    const handleClearReporteError = () => {
        clearErrorReporte();
    };

    // Función para obtener datos para Excel (con formateo aplicado)
    const fetchDataForExcel = async () => {
        if (!valueSesion?.user?.tokens?.access) {
            return { data: [], total_pages: 0 };
        }

        try {
            const params = {
                page: 1,
                page_size: 10,
                sin_paginacion: true, 
                ...(idRecaudador && { id_recaudador: idRecaudador }),
                ...(fechaInicio && { fecha_inicio: fechaInicio }),
                ...(fechaFinal && { fecha_final: fechaFinal })
            };

            // Llamada directa al adaptador para evitar actualizar la vista
            const { obtenerReporteLibroCompras } = await import('@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/adapters/reporteLibroCompras.adapter');
            const response = await obtenerReporteLibroCompras(params, valueSesion.user.tokens.access);
            
            // Aplicar el cálculo de promedio y formateo para Excel
            const facturasConPromedioForExcel = response.data.facturas.map(factura => ({
                ...factura,
                precio_promedio_kilo: calcularPromedio(factura.valores_kilo)
            }));

            // Formatear los datos antes de devolverlos
            return {
                data: formatDataForExcel(facturasConPromedioForExcel),
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // Función wrapper para fetchAllData que adapta la firma para DynamicTable
    const handleFetchAllData = async (page: number) => {
        if (!valueSesion?.user?.tokens?.access) {
            return { data: [], total_pages: 0 };
        }

        const params = {
            page: 1,
            page_size: 10,
            ...(idRecaudador && { id_recaudador: idRecaudador }),
            ...(fechaInicio && { fecha_inicio: fechaInicio }),
            ...(fechaFinal && { fecha_final: fechaFinal })
        };

        return await fetchAllData(page, valueSesion.user.tokens.access, params);
    };

    // Función auxiliar para calcular el promedio de un arreglo
    const calcularPromedio = (valores: number[]): number => {
        if (!valores || valores.length === 0) return 0;
        const suma = valores.reduce((acc, valor) => acc + valor, 0);
        return suma / valores.length;
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
            fecha_compra: formatDateForExcel(row.fecha_compra),
            // Exportar números como números PUROS (sin $ ni separadores)
            nro_factura_unica: Number(row.nro_factura_unica ?? 0),
            nro_documento_proveedor: Number(row.nro_documento_proveedor ?? 0),
            total_kilos: Number(row.total_kilos ?? 0),
            precio_promedio_kilo: Number(row.precio_promedio_kilo ?? 0),
            valor_bruto: Number(row.valor_bruto ?? 0),
            cuota_fomento: Number(row.cuota_fomento ?? 0),
            valor_neto: Number(row.valor_neto ?? 0),
            // Mantener otros campos tal cual
            nombre_proveedor: row.nombre_proveedor,
            municipio_cacao_nombre: row.municipio_cacao_nombre,
            departamento_cacao_nombre: row.departamento_cacao_nombre
        }));
    };

    // Procesar los datos antes de pasarlos a la tabla
    const facturasConPromedio = facturas.map(factura => ({
        ...factura,
        precio_promedio_kilo: calcularPromedio(factura.valores_kilo)
    }));

    const columns = [
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
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'precio_promedio_kilo',
            label: 'PRECIO KILO',
            render: (value: any) => `$${value.toLocaleString('es-CO')}`
        },
        {
            key: 'valor_bruto',
            label: 'VALOR BRUTO',
            render: (value: any) => `$${parseFloat(value || 0).toLocaleString('es-CO')}`
        },
        {
            key: 'cuota_fomento',
            label: 'VALOR CUOTA FOMENTO',
            render: (value: any) => `$${parseFloat(value || 0).toLocaleString('es-CO')}`
        },
        {
            key: 'valor_neto',
            label: 'VALOR NETO',
            render: (value: any) => `$${parseFloat(value || 0).toLocaleString('es-CO')}`
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

                <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>REPORTE DE LIBRO DE COMPRAS DE CACAO POR RECAUDADOR</h2>

                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>DATOS DEL RECAUDADOR</h3>
                       
                <InternalUserInfo 
                    ref={internalUserInfoRef}
                    onFoundCollector={() => {}}
                    onRecaudadorFound={handleRecaudadorData}
                />
                
            </div>

            <div className={`rounded-xl p-6 relative mt-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
       
                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR FECHA</h3>

                <div className='flex flex-col sm:flex-row gap-4 mt-4 col-span-2'>

                  <AnimatedInput
                      label='Fecha Inicio'
                      type='date'
                      value={fechaInicio}
                      onChange={handleFechaInicioChange}
                      name='fecha_inicio'
                      darkMode={isDarkMode}
                  />

                  <AnimatedInput
                      label='Fecha Final'
                      type='date'
                      value={fechaFinal}
                      onChange={handleFechaFinalChange}
                      name='fecha_final'
                      darkMode={isDarkMode}
                  />

                </div>
  
                <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                  <Button title='Limpiar' onClick={handleLimpiar} />
                  <Button 
                    title={isLoading ? 'Consultando...' : 'Consultar'} 
                    onClick={handleConsultarReporte}
                    disabled={isLoading || !idRecaudador}
                  />
                  <Button title='Salir' onClick={handleSalir} />
                </div>
  
            </div>
  
                    {/* Tabla de resultados */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2
              className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
            >
              REPORTE DE LIBROS DE COMPRAS DE CACAO
            </h2>

            <DynamicTable
                columns={columns}
                data={facturasConPromedio}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                fetchAllData={handleFetchAllData}
                fetchDataForExcel={fetchDataForExcel}
             />

                <div className='flex flex-col md:flex-row md:justify-between gap-4 mt-6 col-span-8'>
                    
                    <h4 className={`text-md font-bold mt-4 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>TOTALES:</h4>

                <div className='flex flex-col md:flex-row gap-4 w-full md:w-auto'>

                    <div className='w-full'>
                    <AnimatedInput
                        label='TOTAL DE KILOS'
                        type='text'
                        value={totalKilos ? totalKilos.toLocaleString('es-CO') : '0'}
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
                        value={valorCuotaFomentoTotal ? "$ " + Math.floor(valorCuotaFomentoTotal).toLocaleString('es-CO') : '0'}
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

        {/* Alertas de error para generación de documentos */}
        {errorDocumento && (
          <AlertError
            isOpen={!!errorDocumento}
            message={errorDocumento}
            onClose={handleClearAlerts}
          />
        )}

        {/* Alertas de error para consulta del reporte */}
        {errorReporte && (
          <AlertError
            isOpen={!!errorReporte}
            message={errorReporte}
            onClose={handleClearReporteError}
          />
        )}
      </div>
    );
  };
  
  export default VerReporteCCRecaudador;
  