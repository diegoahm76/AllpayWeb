'use client';

// react
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import DynamicTable from '@/presenters/components/ui/DynamicTable';

import { useSession, signIn } from 'next-auth/react';
import useTableroControlComprasCacao from '../hooks/useTableroControlComprasCacao';
import useTableroControlComprasCacaoDashboard from '../hooks/useTableroControlComprasCacaoDashboard';
import useGetDepartmentsCacaotero from '@/application/address/useGetDepartmentsCacao';
import { useMunicipiosCacaoteros } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/useMunicipiosCacaoteros';
import useEstadosFacturaUnica from '../hooks/useEstadosFacturaUnica';

import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent, DatasetComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';
import * as XLSX from 'xlsx';
import { InternalUserInfo, InternalUserInfoRef, RecaudadorData } from '@/presenters/components/recaudadores/InternalUserInfo';
import { formatCurrency, formatNumber } from '@/utils/formatters';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, TitleComponent, LegendComponent, DatasetComponent, DataZoomComponent, BarChart, CanvasRenderer]);

function TableroComprasCacao() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    const { data: tableroData, isLoading, error, pagination, fetchTablero, clearData } = useTableroControlComprasCacao();

    // Hook para obtener datos del dashboard (estadísticas)
    const { data: dashboardData, isLoading: isLoadingDashboard, fetchTablero: fetchDashboard, clearData: clearDashboard } = useTableroControlComprasCacaoDashboard();

    // Ref para el componente InternalUserInfo
    const internalUserInfoRef = useRef<InternalUserInfoRef>(null);

    // Datos para el gráfico de estadísticas por estado
    const estadoChart = React.useMemo(() => {
        if (!dashboardData?.tabla_estado) return { labels: [], valorBruto: [], cuotaFomento: [], kilos: [] };
        const rows = dashboardData.tabla_estado;
        return {
          labels: rows.map(r => r.estado_factura ?? '-'),
          valorBruto: rows.map(r => Number(r.valor_bruto) || 0),
          cuotaFomento: rows.map(r => Number(r.cuota_fomento) || 0),
          kilos: rows.map(r => Number(r.kilos) || 0),
        };
      }, [dashboardData?.tabla_estado]);
      
      const deptoChart = React.useMemo(() => {
        if (!dashboardData?.tabla_cuota_departamento) return { labels: [], valorBruto: [], cuotaFomento: [] };
        const rows = dashboardData.tabla_cuota_departamento;
        return {
          labels: rows.map(r => r.departamento_cacao ?? '-'),
          valorBruto: rows.map(r => Number(r.valor_bruto) || 0),
          cuotaFomento: rows.map(r => Number(r.cuota_fomento) || 0),
        };
      }, [dashboardData?.tabla_cuota_departamento]);

      // Datos para el gráfico de estadísticas por municipio (kilos)
      const municipioChart = React.useMemo(() => {
        if (!dashboardData?.tabla_kilo_departamento) return { labels: [], kilos: [], cuotaFomento: [] };
        const rows = dashboardData.tabla_kilo_departamento;
        return {
          labels: rows.map(r => r.municipio_cacao ?? '-'),
          kilos: rows.map(r => Number(r.total_kilos) || 0),
          cuotaFomento: rows.map(r => Number(r.cuota_fomento) || 0),
        };
      }, [dashboardData?.tabla_kilo_departamento]);


    // Hook para obtener departamentos de Colombia
    const { departments, isLoading: loadingDepartamentos, fetchDepartments } = useGetDepartmentsCacaotero();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>('');
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<string>('');
    const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string>('');
    const [recaudadorSeleccionado, setRecaudadorSeleccionado] = useState<RecaudadorData | null>(null);
    const [isClient, setIsClient] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [mounted, setMounted] = useState<boolean>(false);

    // Hook para obtener municipios del departamento seleccionado
    const { municipios, loading: loadingMunicipios } = useMunicipiosCacaoteros({ 
        departamentoId: departamentoSeleccionado, 
        token 
    });

    // Hook para obtener estados de factura única
    const { data: estadosFactura, isLoading: loadingEstados } = useEstadosFacturaUnica(token);

    // Estados para la tabla de compras
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Función para manejar cambios de página (siguiendo exactamente el patrón de VerReporteCCRecaudador)
    const onPageChange = (page: number) => {
        
        if (token) {
            // Hacer la consulta al API con la nueva página
            const params = {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFinal,
                estado: estadoSeleccionado || undefined,
                id_departamento: departamentoSeleccionado ? parseInt(departamentoSeleccionado) : undefined,
                id_municipio: municipioSeleccionado ? parseInt(municipioSeleccionado) : undefined,
                id_recaudador: recaudadorSeleccionado?.id_persona || undefined,
                page: page,
                page_size: 10
            };

            fetchTablero(token, params);
            setCurrentPage(page);
        } else {
            console.error('[TableroComprasCacao] - No se encontró el token de autenticación');
        }
    };

    // Función wrapper para fetchAllData que adapta la firma para DynamicTable
    const handleFetchAllData = async (page: number) => {
        if (!token) {
            return { data: [], total_pages: 0 };
        }

        // Validar que tengamos fechas para hacer la consulta
        if (!fechaInicio || !fechaFinal) {
            console.warn('No se pueden obtener datos sin fechas seleccionadas');
            return { data: [], total_pages: 0 };
        }

        const params = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
            estado: estadoSeleccionado || undefined,
            id_departamento: departamentoSeleccionado ? parseInt(departamentoSeleccionado) : undefined,
            id_municipio: municipioSeleccionado ? parseInt(municipioSeleccionado) : undefined,
            id_recaudador: recaudadorSeleccionado?.id_persona || undefined,
            page: page,
            page_size: 10
        };

        try {
            await fetchTablero(token, params);
            return {
                data: tableroData?.facturas || [],
                total_pages: pagination.total_pages
            };
        } catch (error) {
            console.error('Error al cambiar de página:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // Función específica para obtener datos para Excel (sin paginación)
    const fetchDataForExcel = async () => {
        if (!token) {
            return { data: [], total_pages: 0 };
        }

        // Validar que tengamos fechas para hacer la consulta
        if (!fechaInicio || !fechaFinal) {
            console.warn('No se pueden obtener datos sin fechas seleccionadas');
            return { data: [], total_pages: 0 };
        }

        const params = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
            estado: estadoSeleccionado || undefined,
            id_departamento: departamentoSeleccionado ? parseInt(departamentoSeleccionado) : undefined,
            id_municipio: municipioSeleccionado ? parseInt(municipioSeleccionado) : undefined,
            id_recaudador: recaudadorSeleccionado?.id_persona || undefined,
            sin_paginacion: true
            // No incluir page ni page_size para Excel
        };

        try {
            // Importar el adapter directamente para llamarlo sin usar el hook
            const { obtenerTableroControlComprasCacao } = await import('../adapters/tableroControlComprasCacao.adapter');
            const response = await obtenerTableroControlComprasCacao(token, params);
            
            // Expandir las facturas con sus detalles para Excel
            const expandedData = expandFacturasForExcel(response.data?.facturas || []);
            
            return {
                data: expandedData,
                total_pages: 1 // Como no hay paginación, siempre es 1 página
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // Función personalizada para descargar Excel con las columnas correctas
    const handleDownloadExcelPersonalizado = async () => {
        try {
            // Obtener los datos expandidos
            const response = await fetchDataForExcel();
            const expandedData = response.data;

            if (expandedData.length === 0) {
                setErrorMessage('No hay datos disponibles para exportar');
                setShowErrorAlert(true);
                return;
            }

            // Crear el libro de Excel usando las columnas específicas de Excel
            const wb = XLSX.utils.book_new();
            
            // Crear los headers usando las columnas de Excel
            const headerLabels = columnasExcel.map(col => col.label);
            
            // Crear el cuerpo de datos usando las columnas de Excel
            const body = expandedData.map(row => 
                columnasExcel.map(col => {
                    const value = row[col.key];
                    return value !== undefined && value !== null ? value : '';
                })
            );

            // Crear la hoja de trabajo
            const ws = XLSX.utils.aoa_to_sheet([headerLabels, ...body]);
            XLSX.utils.book_append_sheet(wb, ws, 'Compras Cacao');

            // Generar el archivo Excel
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Compras_Cacao_Detallado.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error al generar el Excel:', error);
            setErrorMessage('Ocurrió un error al generar el archivo Excel. Por favor, intente nuevamente.');
            setShowErrorAlert(true);
        }
    };

    // Función para expandir facturas con sus detalles para Excel
    const expandFacturasForExcel = (facturas: any[]) => {
        const expandedData: any[] = [];

        facturas.forEach(factura => {
            // Si la factura no tiene detalles, crear una fila con datos básicos
            if (!factura.detalles || factura.detalles.length === 0) {
                expandedData.push({
                    // Información de la factura
                    fecha_compra: factura.fecha_compra ? new Date(factura.fecha_compra).toLocaleDateString('es-CO') : '',
                    nro_factura_unica: factura.nro_factura_unica || '',
                    recaudador_documento: '-',
                    recaudador_nombre: '-',
                    nit_proveedor: factura.nit_proveedor || '',
                    nombre_proveedor: factura.nombre_proveedor || '',
                    nombre_municipio: factura.nombre_municipio || '',
                    nombre_departamento: factura.nombre_departamento || '',
                    total_kilos: factura.total_kilos || 0,
                    valor_bruto: factura.valor_bruto || 0,
                    cuota_fomento: factura.cuota_fomento || 0,
                    valor_neto: factura.valor_neto || 0,
                    estado_factura_display: factura.estado_factura_display || '',
                    // Detalles vacíos
                    tipo_cacao: '-',
                    kilos_detalle: '-',
                    precio_kilo: '-',
                    valor_bruto_detalle: '-',
                    cuota_fomento_detalle: '-',
                    valor_neto_detalle: '-',
                });
            } else {
                // Si tiene detalles, crear una fila por cada detalle
                factura.detalles.forEach((detalle: any) => {
                    expandedData.push({
                        // Información de la factura (se repite para cada detalle)
                        fecha_compra: factura.fecha_compra ? new Date(factura.fecha_compra).toLocaleDateString('es-CO') : '',
                        nro_factura_unica: factura.nro_factura_unica || '',
                        recaudador_documento: detalle.recaudador_info?.numero_documento || '-',
                        recaudador_nombre: detalle.recaudador_info?.nombre_completo_o_comercial || '-',
                        nit_proveedor: factura.nit_proveedor || '',
                        nombre_proveedor: factura.nombre_proveedor || '',
                        nombre_municipio: detalle.nombre_municipio_cacao || factura.nombre_municipio || '',
                        nombre_departamento: detalle.nombre_departamento_cacao || factura.nombre_departamento || '',
                        // Mantener los totales de la factura en las columnas de totales
                        total_kilos: Number(factura.total_kilos) || 0,
                        valor_bruto: Number(factura.valor_bruto) || 0,
                        cuota_fomento: Number(factura.cuota_fomento) || 0,
                        valor_neto: Number(factura.valor_neto) || 0,
                        estado_factura_display: factura.estado_factura_display || '',
                        // Información del detalle (valores específicos del detalle)
                        tipo_cacao: detalle.nombre_tipo_cacao || '-',
                        kilos_detalle: Number(detalle.nro_kilos) || 0,
                        precio_kilo: Number(detalle.valor_kilo) || 0,
                        valor_bruto_detalle: Number(detalle.valor_bruto) || 0,
                        cuota_fomento_detalle: Number(detalle.cuota_fomento) || 0,
                        valor_neto_detalle: Number(detalle.valor_neto) || 0,
                        estado_liquidacion: detalle.cod_estado_liquidacion_display || 'No liquidado',
                        vereda: detalle.nombre_vereda || '-',
                        finca: detalle.nombre_finca || '-'
                    });
                });
            }
        });

        return expandedData;
    };

    // Hook para verificar que estamos en el lado del cliente
    useEffect(() => {
        setIsClient(true);
        setMounted(true);
    }, []);

    // Cargar departamentos al montar el componente
    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error) setShowErrorAlert(true);
    }, [error]);

    // Sincronizar currentPage local con la paginación del API
    useEffect(() => {
        if (pagination.current_page && pagination.current_page !== currentPage) {
            setCurrentPage(pagination.current_page);
        }
    }, [pagination.current_page, currentPage]);

    // Limpiar municipio seleccionado cuando cambie el departamento
    useEffect(() => {
        setMunicipioSeleccionado('');
    }, [departamentoSeleccionado]);

    // Efecto para manejar cambios de página automáticamente
    useEffect(() => {
        if (tableroData && pagination.current_page !== currentPage) {
            setCurrentPage(pagination.current_page);
        }
    }, [tableroData, pagination.current_page, currentPage]);

    // Definir isDarkMode después de la hidratación
    const isDarkMode = mounted && theme === 'dark';

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {
        // Validar que se tenga al menos un recaudador seleccionado o fechas seleccionadas
        if (!recaudadorSeleccionado && (!fechaInicio || !fechaFinal)) {
            setErrorMessage('Debe seleccionar un recaudador o especificar un rango de fechas para realizar la consulta');
            setShowErrorAlert(true);
            return;
        }

        // Resetear a la primera página cuando se hace una nueva consulta
        setCurrentPage(1);

        // Consultar datos de la tabla
        await fetchTablero(token, {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
            estado: estadoSeleccionado || undefined,
            id_departamento: departamentoSeleccionado ? parseInt(departamentoSeleccionado) : undefined,
            id_municipio: municipioSeleccionado ? parseInt(municipioSeleccionado) : undefined,
            id_recaudador: recaudadorSeleccionado?.id_persona || undefined,
            page: 1,
            page_size: 10
        });

        // Consultar datos del dashboard (estadísticas)
        await fetchDashboard(token, {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
            estado: estadoSeleccionado || undefined,
            id_departamento: departamentoSeleccionado ? parseInt(departamentoSeleccionado) : undefined,
            id_municipio: municipioSeleccionado ? parseInt(municipioSeleccionado) : undefined,
            id_recaudador: recaudadorSeleccionado?.id_persona || undefined
        });
    };

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setEstadoSeleccionado('');
        setDepartamentoSeleccionado('');
        setMunicipioSeleccionado('');
        setRecaudadorSeleccionado(null);
        setCurrentPage(1);
        setErrorMessage('');
        setShowErrorAlert(false);
        clearData();
        clearDashboard();
        
        // Limpiar el formulario del recaudador
        if (internalUserInfoRef.current) {
            internalUserInfoRef.current.clearForm();
        }
    };

    // Handler para cuando se encuentra un recaudador
    const handleRecaudadorFound = (recaudadorData: RecaudadorData) => {
        setRecaudadorSeleccionado(recaudadorData);
    };

    // Función para renderizar filas expandibles con detalles de facturas
    const expandedRowRender = (record: any) => {
      if (!record.detalles || record.detalles.length === 0) return null;
  
      // Calcular totales
      const totalKilos = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.nro_kilos).toFixed(2)) || 0), 0);
      const totalValorBruto = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.valor_bruto).toFixed(2)) || 0), 0);
      const totalCuotaFomento = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.cuota_fomento).toFixed(2)) || 0), 0);
      const totalValorNeto = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.valor_neto).toFixed(2)) || 0), 0);
  
      // Calcular promedio del precio por kilo
      const sumaPrecioKilo = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.valor_kilo).toFixed(2)) || 0), 0);
      const promedioPrecioKilo = record.detalles.length > 0 ? sumaPrecioKilo / record.detalles.length : 0;
  
      return (
        <div className="py-2">
          <div style={{ 
            maxHeight: '400px',
            overflowY: 'scroll',
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #f1f1f1',
            direction: 'rtl'
          }}>
            <div style={{ direction: 'ltr' }}>
              <table className={`w-full ${isDarkMode ? 'divide-y divide-white/20' : 'divide-y divide-gray-200'}`}>
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#3d1a00]' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-2 py-2 text-center text-xs font-medium uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Tipo de Cacao</th>
                    <th className={`px-2 py-2 text-center text-xs font-medium uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Kilos</th>
                    <th className={`px-2 py-2 text-center text-xs font-medium uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Precio x Kilo</th>
                    <th className={`px-2 py-2 text-center text-xs font-medium uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Valor Bruto</th>
                    <th className={`px-2 py-2 text-center text-xs font-medium uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Cuota Fomento</th>
                    <th className={`px-2 py-2 text-center text-xs font-medium uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Valor Neto</th>
                  </tr>
                </thead>
                <tbody className={`${isDarkMode ? 'bg-[#260f00] divide-y divide-white/20' : 'bg-white divide-y divide-gray-200'}`}>
                  {record.detalles.map((detalle: any, idx: number) => (
                    <tr key={idx} className={isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-50'}>
                      <td className={`px-2 py-2 text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        {detalle.nombre_tipo_cacao}
                      </td>
                      <td className={`px-2 py-2 text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        {formatNumber(detalle.nro_kilos, 2)}
                      </td> 
                      <td className={`px-2 py-2 text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        {formatCurrency(detalle.valor_kilo)}
                      </td>
                      <td className={`px-2 py-2 text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        {formatCurrency(detalle.valor_bruto)}
                      </td>
                      <td className={`px-2 py-2 text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        {formatCurrency(detalle.cuota_fomento)}
                      </td>
                      <td className={`px-2 py-2 text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        {formatCurrency(detalle.valor_neto)}
                      </td>
                    </tr>
                  ))}
                  <tr className={`font-semibold sticky bottom-0 ${isDarkMode ? 'bg-[#3d1a00] border-t border-white/20' : 'bg-gray-100'}`}>
                    <td className={`px-2 py-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>TOTALES:</td>
                    <td className={`px-2 py-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatNumber(totalKilos, 2)}
                    </td>
                    <td className={`px-2 py-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(promedioPrecioKilo)}
                    </td>
                    <td className={`px-2 py-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(totalValorBruto)}
                    </td>
                    <td className={`px-2 py-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(totalCuotaFomento)}
                    </td>
                    <td className={`px-2 py-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(totalValorNeto)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };


    // Columnas para la tabla de compras (adaptadas a la estructura del API)
    const columnasCompras = [
        {
            key: 'fecha_compra',
            label: 'FECHA DE COMPRA',
            render: (value: string) => {
                if (!value) return '-';
                const date = new Date(value);
                return date.toLocaleDateString('es-CO');
            }
        },
        {
            key: 'nro_factura_unica',
            label: 'No FACTURA UNICA',
            render: (value: number) => value || '-'
        },
        {
            key: 'recaudador_documento',
            label: 'DOCUMENTO RECAUDADOR',
            render: (_: any, record: any) => {
                const recaudadorDoc = record.detalles?.[0]?.recaudador_info?.numero_documento;
                return recaudadorDoc || '-';
            }
        },
        {
            key: 'recaudador_nombre',
            label: 'NOMBRE RECAUDADOR',
            render: (_: any, record: any) => {
                const recaudadorNombre = record.detalles?.[0]?.recaudador_info?.nombre_completo_o_comercial;
                return recaudadorNombre || '-';
            }
        },
        {
            key: 'nit_proveedor',
            label: 'NIT PROVEEDOR',
            render: (value: string) => value || '-'
        },
        {
            key: 'nombre_proveedor',
            label: 'NOMBRE DEL PROVEEDOR',
            render: (value: string) => value || '-'
        },
        {
            key: 'nombre_municipio',
            label: 'MUNICIPIO PROCEDENCIA CACAO',
            render: (value: string) => value || '-'
        },
        {
            key: 'nombre_departamento',
            label: 'DEPARTAMENTO PROCEDENCIA CACAO',
            render: (value: string) => value || '-'
        },
        {
            key: 'total_kilos',
            label: 'KILOS',
            render: (value: number) => new Intl.NumberFormat('es-CO').format(value || 0)
        },
        {
            key: 'valor_bruto',
            label: 'VALOR BRUTO',
            render: (value: string) => {
                const numValue = parseFloat(value || '0');
                return `$${new Intl.NumberFormat('es-CO').format(numValue)}`
            }
        },
        {
            key: 'cuota_fomento',
            label: 'VALOR CUOTA FOMENTO',
            render: (value: string) => {
                const numValue = parseFloat(value || '0');
                return `$${new Intl.NumberFormat('es-CO').format(numValue)}`
            }
        },
        {
            key: 'valor_neto',
            label: 'VALOR NETO',
            render: (value: string) => {
                const numValue = parseFloat(value || '0');
                return `$${new Intl.NumberFormat('es-CO').format(numValue)}`
            }
        },
        {
            key: 'estado_factura_display',
            label: 'ESTADO FACTURA',
            render: (value: string) => value || '-'
        }
    ];

    // Columnas para Excel (expandidas con detalles)
    const columnasExcel = [
        {
            key: 'fecha_compra',
            label: 'FECHA DE COMPRA'
        },
        {
            key: 'nro_factura_unica',
            label: 'No FACTURA UNICA'
        },
        {
            key: 'recaudador_documento',
            label: 'DOCUMENTO RECAUDADOR'
        },
        {
            key: 'recaudador_nombre',
            label: 'NOMBRE RECAUDADOR'
        },
        {
            key: 'nit_proveedor',
            label: 'NIT PROVEEDOR'
        },
        {
            key: 'nombre_proveedor',
            label: 'NOMBRE DEL PROVEEDOR'
        },
        {
            key: 'nombre_municipio',
            label: 'MUNICIPIO PROCEDENCIA CACAO'
        },
        {
            key: 'nombre_departamento',
            label: 'DEPARTAMENTO PROCEDENCIA CACAO'
        },
        {
            key: 'total_kilos',
            label: 'TOTAL KILOS FACTURA'
        },
        {
            key: 'valor_bruto',
            label: 'TOTAL VALOR BRUTO FACTURA'
        },
        {
            key: 'cuota_fomento',
            label: 'TOTAL CUOTA FOMENTO FACTURA'
        },
        {
            key: 'valor_neto',
            label: 'TOTAL VALOR NETO FACTURA'
        },
        {
            key: 'estado_factura_display',
            label: 'ESTADO FACTURA'
        },
        {
            key: 'tipo_cacao',
            label: 'TIPO DE CACAO'
        },
        {
            key: 'kilos_detalle',
            label: 'KILOS DETALLE'
        },
        {
            key: 'precio_kilo',
            label: 'PRECIO POR KILO'
        },
        {
            key: 'valor_bruto_detalle',
            label: 'VALOR BRUTO DETALLE'
        },
        {
            key: 'cuota_fomento_detalle',
            label: 'CUOTA FOMENTO DETALLE'
        },
        {
            key: 'valor_neto_detalle',
            label: 'VALOR NETO DETALLE'
        },
        {
            key: 'estado_liquidacion',
            label: 'ESTADO LIQUIDACION'
        },
        {
            key: 'vereda',
            label: 'VEREDA'
        },
        {
            key: 'finca',
            label: 'FINCA'
        }
    ];

    // Componente para la gráfica de estadísticas de compra de cacao
  const EstadisticasComprasChart = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  // 1) init una sola vez
  React.useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current, null, {
      renderer: 'canvas',
      useDirtyRect: false
    });
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  // 2) setOption cuando cambian los datos
  React.useEffect(() => {
    if (!chartInstance.current) return;
  

    const source = (estadoChart?.labels?.length ?? 0) > 0
      ? estadoChart.labels.map((label: string, i: number) => ({
          estado: label,
          valorBruto: Number(estadoChart.valorBruto[i] ?? 0),
          cuotaFomento: Number(estadoChart.cuotaFomento[i] ?? 0),
          kilos: Number(estadoChart.kilos[i] ?? 0),
        }))
      : [];
  
    const option: echarts.EChartsCoreOption = {
      backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
      title: {
        text: 'ESTADISTICA DE COMPRA DE CACAO',
        subtext: 'POR ESTADO FACTURA UNICA NACIONAL',
        left: 'center',
        textStyle: { 
          fontSize: 20, 
          fontWeight: 'bold', 
          color: isDarkMode ? '#f3f4f6' : '#562707' 
        },
        subtextStyle: { 
          fontSize: 14, 
          color: isDarkMode ? '#d1d5db' : '#562707' 
        }
      },
      grid: { top: 90 },
      legend: {
        textStyle: {
          color: isDarkMode ? '#f3f4f6' : '#374151'
        }
      },
      color: ['#57ABF7', '#EB8409', '#1caa1d'],
      toolbox: {
        show: true,
        orient: 'horizontal',
        left: 'right',
        top: 'top',
        feature: {
          mark: { show: true },
          dataView: { 
            show: true, 
            readOnly: false,
            title: 'Ver Datos',
            lang: ['Ver Datos', 'Cerrar', 'Actualizar']
          },
          magicType: { 
            show: true, 
            type: ['line', 'bar', 'stack'],
            title: {
              line: 'Cambiar a línea',
              bar: 'Cambiar a barras',
              stack: 'Cambiar a apilado'
            }
          },
          restore: { 
            show: true,
            title: 'Restaurar'
          },
          saveAsImage: { 
            show: true,
            title: 'Guardar como imagen',
            name: 'estadisticas_compras_estado',
            pixelRatio: 2
          }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDarkMode ? '#ffffff40' : '#ccc',
        textStyle: {
          color: isDarkMode ? '#f3f4f6' : '#333'
        },
        valueFormatter: (v: number) => `$${(v ?? 0).toLocaleString('es-CO')}`
      },
      dataset: {
        dimensions: ['estado', 'valorBruto', 'cuotaFomento', 'kilos'],
        source
      },
      xAxis: { 
        type: 'category',
        axisLine: {
          lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
        },
        axisLabel: { 
          color: isDarkMode ? '#f3f4f6' : '#562707', 
          fontWeight: 'bold' 
        } 
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
        },
        splitLine: {
          lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
        },
        axisLabel: { 
          formatter: (val: number) => '$' + (val ?? 0).toLocaleString('es-CO'), 
          color: isDarkMode ? '#f3f4f6' : '#562707', 
          fontWeight: 'bold' 
        }
      },
      series: [
        { type: 'bar', name: 'Valor Bruto', encode: { x: 'estado', y: 'valorBruto' } },
        { type: 'bar', name: 'Cuota Fomento', encode: { x: 'estado', y: 'cuotaFomento' } },
        { type: 'bar', name: 'Kilos', encode: { x: 'estado', y: 'kilos' } }
      ]
    };
  
    chartInstance.current.setOption(option, { notMerge: true, replaceMerge: ['dataset', 'series'] });
  }, [estadoChart, isDarkMode]);
  

  return (
    <div className="bg-transparent rounded-2xl">
      <div className="h-[600px] w-full">
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};


    // Componente para la gráfica de estadísticas por departamento
    const EstadisticasPorDepartamentoChart = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);
      
        React.useEffect(() => {
          if (!chartRef.current) return;
          chartInstance.current = echarts.init(chartRef.current, null, {
            renderer: 'canvas',
            useDirtyRect: false
          });
          const onResize = () => chartInstance.current?.resize();
          window.addEventListener('resize', onResize);
          return () => {
            window.removeEventListener('resize', onResize);
            chartInstance.current?.dispose();
            chartInstance.current = null;
          };
        }, []);
      
        React.useEffect(() => {
            if (!chartInstance.current) return;
          
            const source = (deptoChart?.labels?.length ?? 0) > 0
              ? deptoChart.labels.map((label: string, i: number) => ({
                  departamento: label,
                  valorBruto: Number(deptoChart.valorBruto[i] ?? 0),
                  cuotaFomento: Number(deptoChart.cuotaFomento[i] ?? 0),
                }))
              : [];
          
            const option: echarts.EChartsCoreOption = {
              backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
              title: {
                text: 'ESTADISTICA DE COMPRA DE CACAO',
                subtext: 'POR DEPARTAMENTO',
                left: 'center',
                textStyle: { 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#f3f4f6' : '#562707' 
                }
              },
              legend: { 
                data: ['Valor Bruto', 'Cuota de Fomento'], 
                bottom: 0,
                textStyle: {
                  color: isDarkMode ? '#f3f4f6' : '#374151'
                }
              },
              toolbox: {
                show: true,
                orient: 'horizontal',
                left: 'right',
                top: 'top',
                feature: {
                  mark: { show: true },
                  dataView: { 
                    show: true, 
                    readOnly: false,
                    title: 'Ver Datos',
                    lang: ['Ver Datos', 'Cerrar', 'Actualizar']
                  },
                  magicType: { 
                    show: true, 
                    type: ['line', 'bar', 'stack'],
                    title: {
                      line: 'Cambiar a línea',
                      bar: 'Cambiar a barras',
                      stack: 'Cambiar a apilado'
                    }
                  },
                  restore: { 
                    show: true,
                    title: 'Restaurar'
                  },
                  saveAsImage: { 
                    show: true,
                    title: 'Guardar como imagen',
                    name: 'estadisticas_compras_departamento',
                    pixelRatio: 2
                  }
                }
              },
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                textStyle: {
                  color: isDarkMode ? '#f3f4f6' : '#333'
                },
                valueFormatter: (v: number) => `$${(v ?? 0).toLocaleString('es-CO')}`
              },
              dataset: {
                dimensions: ['departamento', 'valorBruto', 'cuotaFomento'],
                source
              },
              xAxis: {
                type: 'category',
                axisLabel: { 
                  inside: false, 
                  color: isDarkMode ? '#f3f4f6' : '#562707', 
                  rotate: 45 
                },
                axisTick: { show: false },
                axisLine: { 
                  show: true,
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                }
              },
              yAxis: {
                type: 'value',
                axisLine: { 
                  show: true,
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                },
                axisTick: { show: false },
                splitLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
                },
                axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#000', 
                  formatter: (v: number) => `$${(v ?? 0).toLocaleString('es-CO')}` 
                }
              },
              dataZoom: [{ type: 'inside' }],
              series: [
                { 
                  name: 'Valor Bruto', 
                  type: 'bar', 
                  stack: 'total', 
                  encode: { x: 'departamento', y: 'valorBruto' },
                  itemStyle: {
                    color: {
                      type: 'linear',
                      x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: '#8fd3f4' },
                        { offset: 1, color: '#2980b9' }
                      ]
                     
                    }
                  }
                },
                { 
                  name: 'Cuota de Fomento', 
                  type: 'bar', 
                  stack: 'total', 
                  encode: { x: 'departamento', y: 'cuotaFomento' },
                  itemStyle: {
                    color: {
                      type: 'linear',
                      x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: '#f6d365' },
                        { offset: 1, color: '#f39c12' }
                      ]
                    }
                  }
                }
              ]
            };
          
            chartInstance.current.setOption(option, { notMerge: true, replaceMerge: ['dataset', 'series'] });
          }, [deptoChart, isDarkMode]);
          
      
        return (
          <div className="bg-transparent rounded-2xl">
            <div className="h-[600px] w-full">
              <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        );
      };
      
    // Componente para la gráfica de estadísticas por municipio
    const EstadisticasPorMunicipioChart = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        // 1) init una sola vez
        React.useEffect(() => {
            if (!chartRef.current) return;
            chartInstance.current = echarts.init(chartRef.current, null, {
                renderer: 'canvas',
                useDirtyRect: false
            });
            const onResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', onResize);
            return () => {
                window.removeEventListener('resize', onResize);
                chartInstance.current?.dispose();
                chartInstance.current = null;
            };
        }, []);

        // 2) setOption cuando cambian los datos
        React.useEffect(() => {
            if (!chartInstance.current) return;

            const option: echarts.EChartsCoreOption = {
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                title: {
                    text: 'ESTADÍSTICA DE COMPRA DE CACAO POR MUNICIPIO',
                    subtext: 'CUOTA DE FOMENTO Y KILOS',
                    left: 'center',
                    textStyle: { 
                      fontSize: 18, 
                      fontWeight: 'bold', 
                      color: isDarkMode ? '#f3f4f6' : '#562707' 
                    },
                    subtextStyle: { 
                      fontSize: 14, 
                      color: isDarkMode ? '#d1d5db' : '#562707' 
                    }
                },
                grid: { top: 90 },
                legend: { 
                  bottom: 0,
                  textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#374151'
                  }
                },
                color: ['#A87F03', '#8D9761'],
                toolbox: {
                    show: true,
                    orient: 'horizontal',
                    left: 'right',
                    top: 'top',
                    feature: {
                        mark: { show: true },
                        dataView: { 
                            show: true, 
                            readOnly: false,
                            title: 'Ver Datos',
                            lang: ['Ver Datos', 'Cerrar', 'Actualizar']
                        },
                        magicType: { 
                            show: true, 
                            type: ['line', 'bar', 'stack'],
                            title: {
                                line: 'Cambiar a línea',
                                bar: 'Cambiar a barras',
                                stack: 'Cambiar a apilado'
                            }
                        },
                        restore: { 
                            show: true,
                            title: 'Restaurar'
                        },
                        saveAsImage: { 
                            show: true,
                            title: 'Guardar como imagen',
                            name: 'estadisticas_compras_municipio',
                            pixelRatio: 2
                        }
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                    textStyle: {
                      color: isDarkMode ? '#f3f4f6' : '#333'
                    },
                    formatter: function (params: any) {
                        let text = `<b>${params[0].axisValue}</b><br/>`;
                        params.forEach((item: any) => {
                            if (item.seriesName === 'Cuota de Fomento') {
                                text += `${item.marker} ${item.seriesName}: $${item.value.toLocaleString('es-CO')}<br/>`;
                            } else {
                                text += `${item.marker} ${item.seriesName}: ${item.value.toLocaleString('es-CO')} Kg<br/>`;
                            }
                        });
                        return text;
                    }
                },
                xAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01],
                    axisLine: {
                      lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    splitLine: {
                      lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
                    },
                    axisLabel: {
                        fontWeight: 'bold',
                        color: isDarkMode ? '#f3f4f6' : '#374151',
                        formatter: (value: number) => value.toLocaleString('es-CO')
                    }
                },
                yAxis: {
                    type: 'category',
                    axisLine: {
                      lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                      fontWeight: 'bold',
                      color: isDarkMode ? '#f3f4f6' : '#374151'
                    },
                    data: municipioChart.labels
                },
                series: [
                    {
                        name: 'Cuota de Fomento',
                        type: 'bar',
                        data: municipioChart.cuotaFomento,
                        itemStyle: { color: '#A87F03' },
                        label: {
                            show: true,
                            position: 'right',
                            color: isDarkMode ? '#f3f4f6' : '#111827',
                            formatter: (val: any) => `$${val.value.toLocaleString('es-CO')}`
                        }
                    },
                    {
                        name: 'Kilos',
                        type: 'bar',
                        data: municipioChart.kilos,
                        itemStyle: { color: '#8D9761' },
                        label: {
                            show: true,
                            position: 'right',
                            color: isDarkMode ? '#f3f4f6' : '#111827',
                            formatter: (val: any) => `${val.value.toLocaleString('es-CO')} Kg`
                        }
                    }
                ]
            };

            chartInstance.current.setOption(option, { notMerge: true, replaceMerge: ['dataset', 'series'] });
        }, [municipioChart, isDarkMode]);

        return (
            <div className="bg-transparent rounded-2xl">
                <div className="h-[600px] w-full">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // Función para descargar un PPTX con todas las gráficas
    // Reemplaza TODO tu handleDescargarGrafica por este
    // Reemplaza TODO tu handleDescargarGrafica por esto
    const handleDescargarGrafica = async () => {
        if (!isClient) return;
      
        const getBase64FromUrl = async (url: string): Promise<string> => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };
      
        try {
          const pptx = new PptxGenJS();
          const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
          const tituloColor = '562707';
          const rot = (labels: string[]) => (labels?.length ?? 0) > 8 ? 90 : 45;
      
          // ========= SLIDE 1: POR ESTADO =========
          const s1 = pptx.addSlide();
          s1.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
          s1.addText('ESTADISTICA DE COMPRA DE CACAO', { x: 2.2, y: 0.3, w: 7.4, h: 0.6, fontSize: 20, bold: true, align: 'center', color: tituloColor });
          s1.addText('POR ESTADO FACTURA UNICA NACIONAL', { x: 2.2, y: 0.8, w: 7.4, h: 0.4, fontSize: 14, align: 'center', color: tituloColor });
      
          const serieEstado_ValorBruto = estadoChart.valorBruto.map(Number);
          const serieEstado_Cuota = estadoChart.cuotaFomento.map(Number);
          const maxEstado = Math.max(...serieEstado_ValorBruto, ...serieEstado_Cuota, 0);
      
          s1.addChart(pptx.ChartType.bar, [
            { name: 'Valor Bruto', labels: estadoChart.labels, values: serieEstado_ValorBruto },
            { name: 'Cuota Fomento', labels: estadoChart.labels, values: serieEstado_Cuota },
          ], {
            x: 0.2, y: 1.4, w: 9.6, h: 4.6,
            barDir: 'col',
            showLegend: true, legendPos: 'b',
            chartColors: ['57ABF7', 'EB8409'],
            valAxisMaxVal: Math.ceil(maxEstado * 1.15),
            valAxisLabelFormatCode: '$#,##0',
            dataLabelFormatCode: '#,##0',
            dataLabelFontSize: 9,
            dataLabelPosition: 'bestFit',
            catAxisLabelRotate: rot(estadoChart.labels),
          });
      
          // ========= SLIDE 2: DEPARTAMENTO — VALOR BRUTO =========
          const s2 = pptx.addSlide();
          s2.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
          s2.addText('ESTADISTICA DE COMPRA DE CACAO', { x: 2.2, y: 0.3, w: 7.4, h: 0.6, fontSize: 20, bold: true, align: 'center', color: tituloColor });
          s2.addText('POR DEPARTAMENTO — VALOR BRUTO', { x: 2.2, y: 0.8, w: 7.4, h: 0.4, fontSize: 14, align: 'center', color: tituloColor });
      
          const serieDepto_ValorBruto = deptoChart.valorBruto.map(Number);
          const maxValor = Math.max(...serieDepto_ValorBruto, 0);
      
          s2.addChart(pptx.ChartType.bar, [
            { name: 'Valor Bruto', labels: deptoChart.labels, values: serieDepto_ValorBruto },
          ], {
            x: 0.2, y: 1.2, w: 8.5, h: 4.3,
            showLegend: false,
            barDir: 'col',
            chartColors: ['83bff6'],
            valAxisMaxVal: Math.ceil(maxValor * 1.15),
            valAxisLabelFormatCode: '$#,##0',
            dataLabelFormatCode: '#,##0',
            dataLabelPosition: 'bestFit',
            dataLabelFontSize: 9,
            catAxisLabelRotate: rot(deptoChart.labels),
          });
      
          // ========= SLIDE 3: DEPARTAMENTO — CUOTA DE FOMENTO =========
          const s3 = pptx.addSlide();
          s3.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
          s3.addText('ESTADISTICA DE COMPRA DE CACAO', { x: 2.2, y: 0.3, w: 7.4, h: 0.6, fontSize: 20, bold: true, align: 'center', color: tituloColor });
          s3.addText('POR DEPARTAMENTO — CUOTA DE FOMENTO', { x: 2.2, y: 0.8, w: 7.4, h: 0.4, fontSize: 14, align: 'center', color: tituloColor });
      
          const serieDepto_Cuota = deptoChart.cuotaFomento.map(Number);
          const maxCuota = Math.max(...serieDepto_Cuota, 0);
      
          s3.addChart(pptx.ChartType.bar, [
            { name: 'Cuota de Fomento', labels: deptoChart.labels, values: serieDepto_Cuota },
          ], {
            x: 0.2, y: 1.2, w: 8.5, h: 4.3,
            showLegend: false,
            barDir: 'col',
            chartColors: ['F5B305'],
            valAxisMaxVal: Math.ceil(maxCuota * 1.15),
            valAxisLabelFormatCode: '$#,##0',
            dataLabelFormatCode: '#,##0',
            dataLabelPosition: 'bestFit',
            dataLabelFontSize: 9,
            catAxisLabelRotate: rot(deptoChart.labels),
          });
      
          // ========= SLIDE 4: MUNICIPIO — CUOTA DE FOMENTO (HORIZONTAL) =========
          const s4 = pptx.addSlide();
          s4.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
          s4.addText('ESTADISTICA DE COMPRA DE CACAO POR MUNICIPIO', { x: 1.5, y: 0.3, w: 9.3, h: 0.6, fontSize: 18, bold: true, align: 'center', color: tituloColor });
          s4.addText('Cuota de Fomento', { x: 1.5, y: 0.8, w: 9.3, h: 0.4, fontSize: 12, align: 'center', color: tituloColor });
      
          const mpioCuota = municipioChart.cuotaFomento.map(Number);
          const maxMpioCuota = Math.max(...(mpioCuota.length ? mpioCuota : [0]));
      
          s4.addChart(pptx.ChartType.bar, [
            { name: 'Cuota de Fomento', labels: municipioChart.labels, values: mpioCuota },
          ], {
            x: 0.2, y: 1.2, w: 8.5, h: 4.3,
            barDir: 'bar',                 // horizontal (como en la web)
            showLegend: false,
            chartColors: ['A87F03'],
            valAxisLabelFormatCode: '$#,##0',
            dataLabelFormatCode: '$#,##0', // etiqueta con $ como en la página
            dataLabelPosition: 'bestFit',
            dataLabelFontSize: 9,
            barGapWidthPct: 60,
            valAxisMaxVal: Math.ceil(maxMpioCuota * 1.15),
          });
      
          // ========= SLIDE 5: MUNICIPIO — KILOS (HORIZONTAL) =========
          const s5 = pptx.addSlide();
          s5.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
          s5.addText('ESTADISTICA DE COMPRA DE CACAO POR MUNICIPIO', { x: 1.5, y: 0.3, w: 9.3, h: 0.6, fontSize: 18, bold: true, align: 'center', color: tituloColor });
          s5.addText('Kilos', { x: 1.5, y: 0.8, w: 9.3, h: 0.4, fontSize: 12, align: 'center', color: tituloColor });
      
          const mpioKilos = municipioChart.kilos.map(Number);
          const maxMpioKilos = Math.max(...(mpioKilos.length ? mpioKilos : [0]));
      
          s5.addChart(pptx.ChartType.bar, [
            { name: 'Kilos', labels: municipioChart.labels, values: mpioKilos },
          ], {
            x: 0.2, y: 1.2, w: 8.5, h: 4.3,
            barDir: 'bar',
            showLegend: false,
            chartColors: ['8D9761'],
            valAxisLabelFormatCode: '#,##0',
            dataLabelFormatCode: '#,##0" Kg"', // añade " Kg" a la etiqueta
            dataLabelPosition: 'bestFit',
            dataLabelFontSize: 9,
            barGapWidthPct: 60,
            valAxisMaxVal: Math.ceil(maxMpioKilos * 1.15),
          });
      
          await pptx.writeFile({ fileName: 'Estadisticas_Compras_Cacao.pptx' });
        } catch (error) {
          console.error('Error al generar PPTX con gráficas:', error);
        }
      };

    // Prevenir renderizado hasta que el componente esté montado
    if (!mounted) return null;

    return (
        <div className="w-full max-w-full mx-auto p-3 sm:p-4 lg:p-6">
            <div className={`rounded-xl p-3 sm:p-4 lg:p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                    >
                        &times;
                    </button>

                    <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 lg:my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                           
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR RECAUDADOR</h3>
                    
                    <InternalUserInfo 
                            ref={internalUserInfoRef}
                            onFoundCollector={() => {}}
                            onRecaudadorFound={handleRecaudadorFound}
                            darkMode={isDarkMode}
                        />

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR FECHA</h3>

                    {/* Filtros */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4'>

                        <AnimatedInput
                            label='Fecha Inicio'
                            type='date'
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            name='fecha_inicio'
                            required
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label='Fecha Final'
                            type='date'
                            value={fechaFinal}
                            onChange={(e) => setFechaFinal(e.target.value)}
                            name='fecha_final'
                            required
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label={loadingEstados ? 'Estado (Cargando...)' : 'Estado'}
                            name='estado'
                            value={estadoSeleccionado}
                            onChange={(e) => setEstadoSeleccionado(e.target.value)}
                            disabled={loadingEstados}
                            darkMode={isDarkMode}
                            options={[
                                { key: 'todos', value: '', title: 'Todos los estados' },
                                ...(loadingEstados ? [] : estadosFactura.map(estado => ({
                                    key: estado.codigo,
                                    value: estado.codigo,
                                    title: `${estado.codigo} - ${estado.nombre}`
                                })))
                            ]}
                        />

<AnimatedSelect
                            label={loadingDepartamentos ? 'Departamento (Cargando...)' : 'Departamento'}
                            name='departamento'
                            value={departamentoSeleccionado}
                            onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
                            disabled={loadingDepartamentos}
                            darkMode={isDarkMode}
                            options={[
                                { key: 'todos', value: '', title: 'Todos los departamentos' },
                                ...(loadingDepartamentos ? [] : departments
                                    .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                                    .map((dept: any) => ({
                                        key: dept.cod_departamento,
                                        value: dept.cod_departamento,
                                        title: dept.nombre
                                    })))
                            ]}
                        />

                        <AnimatedSelect
                            label={!departamentoSeleccionado ? 'Municipio' : loadingMunicipios ? 'Municipio (Cargando...)' : 'Municipio'}
                            name='municipio'
                            value={municipioSeleccionado}
                            onChange={(e) => setMunicipioSeleccionado(e.target.value)}
                            disabled={!departamentoSeleccionado || loadingMunicipios}
                            darkMode={isDarkMode}
                            options={[
                                { key: 'todos', value: '', title: 'Todos los municipios' },
                                ...(loadingMunicipios ? [] : municipios
                                    .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                                    .map((mun: any) => ({
                                        key: mun.cod_municipio,
                                        value: mun.cod_municipio,
                                        title: mun.nombre
                                    })))
                            ]}
                        />
                       
                    </div>

                    <div className='flex flex-col my-6 sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-4 sm:mt-6'>  
                        <Button 
                            title={'Consultar'} 
                            onClick={handleConsultar} 
                            disabled={isLoading}
                        />
                        <Button title='Limpiar' onClick={handleLimpiar} />
                        <Button title='Excel Detallado' onClick={handleDownloadExcelPersonalizado} />
                        <Button title='PPTX Gráfica' onClick={handleDescargarGrafica} />
                        
                        <Button title='Salir' onClick={() => router.push('/')} />
                    </div>
                </div>

                {/* Filtros Activos */}
                <div className="mt-4 sm:mt-6">
          

                    <AlertError 
                        isOpen={showErrorAlert}
                        message={errorMessage || error || ''}
                        onClose={() => setShowErrorAlert(false)}
                        autoCloseMs={8000}
                    />

                    {/* Layout principal: Contenedores separados */}
                    <div className="space-y-4 sm:space-y-6">

                        {/* Indicador de carga */}
                        {(isLoading || isLoadingDashboard) && (
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-6 text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? 'border-white' : 'border-[rgb(var(--brown))]'}`}></div>
                                <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    {isLoading && isLoadingDashboard ? 'Cargando datos de tabla y dashboard...' : 
                                     isLoading ? 'Cargando datos de tabla...' : 
                                     'Cargando datos de dashboard...'}
                                </p>
                            </div>
                        )}

                        {/* Contenedor 1: Tabla de Compras */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                                                      
                                {!isLoading && !tableroData && (
                                    <DynamicTable
                                        columns={columnasCompras}
                                        data={[]}
                                        currentPage={currentPage}
                                        totalPages={1}
                                        onPageChange={() => {}}
                                        downloadButtonPosition="top"
                                        darkMode={isDarkMode}
                                    />
                                )}
                                {tableroData && (
                                    <DynamicTable
                                        columns={columnasCompras}
                                        data={tableroData.facturas || []}
                                        currentPage={currentPage}
                                        totalPages={pagination.total_pages}
                                        onPageChange={onPageChange}
                                        fetchAllData={handleFetchAllData}                     
                                        fetchDataForExcel={fetchDataForExcel}
                                        customExcelExporter={async () => {
                                            const response = await fetchDataForExcel();
                                            return {
                                                columns: columnasExcel,
                                                data: response.data,
                                                fileName: 'Compras_Cacao_Detallado.xlsx',
                                                sheetName: 'Compras Cacao'
                                            };
                                        }}
                                        downloadButtonPosition="top"
                                        darkMode={isDarkMode}
                                        expandable={{
                                          expandedRowRender,
                                          rowExpandable: (record) => record.detalles && record.detalles.length > 0
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Contenedor 2 */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <EstadisticasComprasChart />
                            </div>
                        </div>

                         {/* Contenedor 3 */}
                         <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <EstadisticasPorDepartamentoChart />
                            </div>
                        </div>

                        {/* Contenedor 4 */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <EstadisticasPorMunicipioChart />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default TableroComprasCacao;
  