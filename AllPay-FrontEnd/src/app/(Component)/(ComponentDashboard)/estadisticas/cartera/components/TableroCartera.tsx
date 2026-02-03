'use client';

// react
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import type { CompactTableColumn } from '@/presenters/components/ui/CompactTable.types';

import { useSession, signIn } from 'next-auth/react';
import useTableroAcuerdosPago from '../hooks/useTableroAcuerdosPago';
import useTableroAcuerdosPagoResumen from '../hooks/useTableroAcuerdosPagoResumen';
import useTableroDeudoresPorRecaudador from '../hooks/useTableroDeudoresPorRecaudador';
import useTableroCarteraPorEdad from '../hooks/useTableroCarteraPorEdad';
import useTableroDeudoresPorUbicacion from '../hooks/useTableroDeudoresPorUbicacion';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { InternalUserInfo, type InternalUserInfoRef } from '@/presenters/components/recaudadores/InternalUserInfo';
import DynamicTable from '@/presenters/components/ui/DynamicTable';

import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import type { EChartsCoreOption } from 'echarts';
import { 
  GridComponent, 
  TooltipComponent, 
  TitleComponent, 
  LegendComponent, 
  ToolboxComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatCurrency, formatNumberWithCommas } from '@/utils/formatters';

// Registrar componentes necesarios
echarts.use([
    GridComponent,
    TooltipComponent,
    TitleComponent,
    LegendComponent,
    ToolboxComponent,
    BarChart,
    LineChart,
    CanvasRenderer,
    DataZoomComponent,
    PieChart
]);


function TableroCartera() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    const { data, isLoading, error, fetchTableroAcuerdos, clearData } = useTableroAcuerdosPago();
    const { data: resumenData, isLoading: isLoadingResumen, error: errorResumen, fetchTableroAcuerdosResumen, clearData: clearResumenData } = useTableroAcuerdosPagoResumen();
    const { data: recaudadoresData, isLoading: isLoadingRecaudadores, error: errorRecaudadores, fetchTableroDeudoresPorRecaudador, clearData: clearRecaudadoresData } = useTableroDeudoresPorRecaudador();
    const { data: carteraPorEdadData, isLoading: isLoadingCarteraPorEdad, error: errorCarteraPorEdad, fetchTableroCarteraPorEdad, clearData: clearCarteraPorEdadData } = useTableroCarteraPorEdad();
    const { data: deudoresPorUbicacionData, isLoading: isLoadingDeudoresPorUbicacion, error: errorDeudoresPorUbicacion, fetchTableroDeudoresPorUbicacion, clearData: clearDeudoresPorUbicacionData } = useTableroDeudoresPorUbicacion();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [numeroDocumentoRecaudador, setNumeroDocumentoRecaudador] = useState<string>('');
    const [isClient, setIsClient] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
    const [isConsultando, setIsConsultando] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // Estados para la tabla de compras
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Estados para la tabla de Cartera por Edad
    const [currentPageCarteraEdad, setCurrentPageCarteraEdad] = useState<number>(1);

    // Referencia al componente InternalUserInfo para poder limpiar el formulario
    const internalUserInfoRef = React.useRef<InternalUserInfoRef>(null);

    // Datos para la gráfica de estadísticas de cartera (Contenedor 2)
    const datosEstadisticasCartera = {
        categorias: ['Aceptada Recaudo', 'Aprobada', 'Incumplimiento', 'Solicitada', 'VoBo Juridica'],
        dias: [167, 247, 33, 47, 95],
        valorIntereses: [3050000, 4415000, 590000, 796000, 1460000],
        valorCuotaFomento: [14670948, 14169546, 13299972, 8816228, 4649619]
    };

    // Datos para la tabla "CARTERA POR EDAD" (Contenedor 5)
    const datosCarteraPorEdad = [
        {
            edad: '0-15 días',
            cuota_fomento: 8459250,
            interes: 1635000
        },
        {
            edad: '15-30 días',
            cuota_fomento: 55606313,
            interes: 10311000
        },
        {
            edad: '31-45 días',
            cuota_fomento: 37206045,
            interes: 9275000
        },
        {
            edad: '46-60 días',
            cuota_fomento: 6151896,
            interes: 650000
        },
        {
            edad: '61-75 días',
            cuota_fomento: 2411619,
            interes: 900000
        },
        {
            edad: '76-90',
            cuota_fomento: 0,
            interes: 0
        },
        {
            edad: '+91 días',
            cuota_fomento: 11067558,
            interes: 6285000
        }
    ];

    // Columnas para la tabla de reporte de cacao
    const columnasReporteCacao: CompactTableColumn[] = [
        { 
            key: 'no_documento_recaudador', 
            label: 'No DOCUMENTO RECAUDADOR', 
            align: 'center',
            render: (value: string) => value
        },
        { 
            key: 'razon_social', 
            label: 'RAZON SOCIAL', 
            align: 'left',
            truncate: true,
            render: (value: string) => value
        },
        { 
            key: 'no_factura_unica', 
            label: 'No FACTURA UNICA', 
            align: 'center',
            render: (value: number) => value
        },
        { 
            key: 'fecha_compra', 
            label: 'FECHA COMPRA', 
            align: 'center',
            render: (value: string) => value
        },
        { 
            key: 'nit_proveedor', 
            label: 'NIT PROVEEDOR', 
            align: 'center',
            render: (value: string) => value
        },
        { 
            key: 'nombre_proveedor', 
            label: 'NOMBRE DEL PROVEEDOR', 
            align: 'left',
            truncate: true,
            render: (value: string) => value
        },
        { 
            key: 'municipio_procedencia_cacao', 
            label: 'MUNICIPIO PROCEDENCIA CACAO', 
            align: 'left',
            truncate: true,
            render: (value: string) => value
        },
        { 
            key: 'departamento_procedencia_cacao', 
            label: 'DEPARTAMENTO PROCEDENCIA CACAO', 
            align: 'left',
            truncate: true,
            render: (value: string) => value
        },
        { 
            key: 'kilos', 
            label: 'KILOS', 
            align: 'right',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        { 
            key: 'precio_kilo', 
            label: 'PRECIO KILO', 
            align: 'right',
            render: (value: string) => value
        },
        { 
            key: 'valor_bruto', 
            label: 'VALOR BRUTO', 
            align: 'right',
            render: (value: string) => value
        },
        { 
            key: 'valor_cuota_fomento', 
            label: 'VALOR CUOTA FOMENTO', 
            align: 'right',
            render: (value: string) => value
        },
        { 
            key: 'valor_neto', 
            label: 'VALOR NETO', 
            align: 'right',
            render: (value: string) => value
        },
        { 
            key: 'dias_mora', 
            label: 'DIAS DE MORA', 
            align: 'center',
            render: (value: number) => value    
        },
        { 
            key: 'valor_intereses', 
            label: 'VALOR DE INTERES', 
            align: 'right',
            render: (value: string) => value
        },
        { 
            key: 'estado_acuerdo_pago', 
            label: 'ESTADO ACUERDO PAGO', 
            align: 'center',
            render: (value: string) => value
        }
    ];

    // Columnas para la tabla "CARTERA POR EDAD"
    const columnasCarteraPorEdad: CompactTableColumn[] = [
        { 
            key: 'rango', 
            label: 'EDAD', 
            align: 'center',
            render: (value: string) => ( value )
        },
        { 
            key: 'cuotaFomento', 
            label: 'CUOTA FOMENTO', 
            align: 'right',
            render: (value: number) => ( formatCurrency(value) )
        },
        { 
            key: 'intereses', 
            label: 'INTERES', 
            align: 'right',
            render: (value: number) => ( formatCurrency(value) )
        }
    ];

    // Función para obtener todos los datos del API
    const fetchAllReporteData = async (page: number) => {
        if (!token) return { data: [], total_pages: 0 };
        
        try {
          
            // Hacer nueva consulta al API con la página solicitada
            const response = await fetchTableroAcuerdos(token, {
                fecha_inicio: fechaInicio || undefined,
                fecha_fin: fechaFinal || undefined,
                numero_documento: numeroDocumentoRecaudador || undefined,
                page: page,
                page_size: 10
            });
            
            
            if (response && response.data && response.data.data) {
                return {
                    data: response.data.data.registros || [],
                    total_pages: response.total_pages || 1
                };
            }
            
            return { data: [], total_pages: 0 };
        } catch (error) {
            console.error('Error al obtener datos de la página:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // NOTA: Solo se consulta la tabla principal, NO las gráficas
    // Esto evita recargas innecesarias de las gráficas al cambiar de página
    const onPageChange = async (page: number) => {
        if (token) {
            setIsPageLoading(true);
            try {     
                setCurrentPage(page);
                
                await fetchTableroAcuerdos(token, {
                    fecha_inicio: fechaInicio || undefined,
                    fecha_fin: fechaFinal || undefined,
                    numero_documento: numeroDocumentoRecaudador || undefined,
                    page: page,
                    page_size: 10
                });
            } catch (error) {
                console.error('Error al cambiar de página:', error);
            } finally {
                setIsPageLoading(false);
            }
        } else {
            console.error('[TableroCartera] - No se encontró el token de autenticación');
        }
    };

    // Función para obtener todos los datos de Cartera por Edad
    const fetchAllCarteraPorEdadData = async (page: number) => {
        // Usar datos del API si están disponibles, sino usar datos estáticos como fallback
        const datosDisponibles = carteraPorEdadData?.carteraPorEdad || datosCarteraPorEdad;

        // Simular paginación
        const itemsPerPage = 7;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = datosDisponibles.slice(startIndex, endIndex);  
        
        return {
            data: pageData,
            total_pages: Math.ceil(datosDisponibles.length / itemsPerPage)
        };
    };

    // Hook para verificar que estamos en el lado del cliente
    useEffect(() => {
        setIsClient(true);
        setMounted(true);
    }, []);

    // Función para manejar cuando se encuentra un recaudador
    const handleRecaudadorFound = (recaudadorData: any) => {
        if (recaudadorData && recaudadorData.numero_documento) {
            setNumeroDocumentoRecaudador(recaudadorData.numero_documento);
        }
    };

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error) setShowErrorAlert(true);
    }, [error]);

    // Mostrar alerta de error cuando el hook del resumen reporte error
    useEffect(() => {
        if (errorResumen) setShowErrorAlert(true);
    }, [errorResumen]);

    // Mostrar alerta de error cuando el hook de recaudadores reporte error
    useEffect(() => {
        if (errorRecaudadores) setShowErrorAlert(true);
    }, [errorRecaudadores]);

    // Mostrar alerta de error cuando el hook de cartera por edad reporte error
    useEffect(() => {
        if (errorCarteraPorEdad) setShowErrorAlert(true);
    }, [errorCarteraPorEdad]);

    // Mostrar alerta de error cuando el hook de deudores por ubicación reporte error
    useEffect(() => {
        if (errorDeudoresPorUbicacion) setShowErrorAlert(true);
    }, [errorDeudoresPorUbicacion]);  

    // Resetear página cuando cambien los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [fechaInicio, fechaFinal, numeroDocumentoRecaudador]);

    // Comentado: La sincronización automática puede causar conflictos con la paginación manual
    // useEffect(() => {
    //     if (data?.current_page && data.current_page !== currentPage) {
    //         setCurrentPage(data.current_page);
    //     }
    // }, [data?.current_page, currentPage]);

    // Definir isDarkMode después de la hidratación
    const isDarkMode = mounted && theme === 'dark';

    // Prevenir renderizado hasta que el componente esté montado
    if (!mounted) return null;

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {
        if (!token) {
            alert('No se encontró el token de autenticación');
            return;
        }

        setCurrentPage(1);
        setIsConsultando(true);
        
        // OPTIMIZACIÓN: Ejecutar todas las consultas en paralelo usando Promise.all
        // Esto mejora significativamente el rendimiento al no esperar que cada petición termine
        // antes de iniciar la siguiente. Todas se ejecutan simultáneamente.
        // NOTA: Aquí SÍ se consultan todas las gráficas porque es la consulta inicial
        try {
            await Promise.all([
                // Consultar datos principales del tablero
                fetchTableroAcuerdos(token, {
                    fecha_inicio: fechaInicio || undefined,
                    fecha_fin: fechaFinal || undefined,
                    numero_documento: numeroDocumentoRecaudador || undefined,
                    page: 1,
                    page_size: 10
                }),

                // Consultar resumen para la gráfica
                fetchTableroAcuerdosResumen(token, {
                    fecha_inicio: fechaInicio || undefined,
                    fecha_fin: fechaFinal || undefined,
                    numero_documento: numeroDocumentoRecaudador || undefined
                }),

                // Consultar datos de recaudadores para la gráfica
                fetchTableroDeudoresPorRecaudador(token, {
                    fecha_inicio: fechaInicio || undefined,
                    fecha_fin: fechaFinal || undefined,
                    numero_documento: numeroDocumentoRecaudador || undefined
                }),

                // Consultar datos de cartera por edad para la tabla y gráfica
                fetchTableroCarteraPorEdad(token, {
                    fecha_inicio: fechaInicio || undefined,
                    fecha_fin: fechaFinal || undefined,
                    numero_documento: numeroDocumentoRecaudador || undefined
                }),

                // Consultar datos de deudores por ubicación para la gráfica del contenedor 4
                (async () => {
                                 
                    try {
                        const result = await fetchTableroDeudoresPorUbicacion(token, {
                            fecha_inicio: fechaInicio || undefined,
                            fecha_fin: fechaFinal || undefined,
                            numero_documento: numeroDocumentoRecaudador || undefined
                        });
                        return result;
                    } catch (error) {
                        console.error('Error en hook deudores por ubicación:', error);
                        throw error;
                    }
                })()
            ]);

        } catch (error) {
            console.error('Error al ejecutar consultas en paralelo:', error);
        } finally {
            setIsConsultando(false);
        }
    };

    const handleLimpiar = () => {
        // Limpiar filtros de fecha
        setFechaInicio('');
        setFechaFinal('');
        
        // Limpiar filtro de recaudador
        setNumeroDocumentoRecaudador('');
        
        // Limpiar formulario del componente InternalUserInfo
        if (internalUserInfoRef.current) {
            internalUserInfoRef.current.clearForm();
        }
        
        // Resetear páginas
        setCurrentPage(1);
        setCurrentPageCarteraEdad(1);
        
        // Limpiar datos de todos los hooks
        clearData();
        clearResumenData();
        clearRecaudadoresData();
        clearCarteraPorEdadData();
        clearDeudoresPorUbicacionData();
    };

    // Función para descargar un PPTX con todos los contenedores
    // Función para descargar un PPTX con todos los contenedores (ACTUALIZADA)
    // Función para descargar un PPTX con todos los contenedores (ACTUALIZADA: split de la 1ra gráfica)

    const handleDescargarGrafica = async () => {
      if (!isClient) return;
    
      try {
        // 1) Importación robusta para Next.js (evita "is not a constructor")
        const { default: PptxGenJS } = await import('pptxgenjs');
        const pptx = new PptxGenJS();
    
        // 2) Utilidades
        const toNumber = (v: any): number => {
          if (v == null) return 0;
          const n = Number(String(v).replace(/[^\d.-]/g, ''));
          return Number.isFinite(n) ? n : 0;
        };
        const toNumberArray = (arr: any[] | undefined) => (arr ?? []).map(toNumber);
        const safeMax = (arrs: number[][], fallback = 1) => {
          const flat = arrs.flat().filter((n) => Number.isFinite(n));
          return flat.length ? Math.max(...flat) : fallback;
        };
        const getBase64FromUrl = async (url: string): Promise<string> => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        };
    
        // 3) Recursos (logo)
        const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
    
        // 4) DATA (API si hay; fallback estático)
        // ---- ESTADO ACUERDO DE PAGO ----
        const catEstados =
          resumenData?.detalles?.map((d: any) => d.estado) ??
          ['Aceptada Recaudo', 'Aprobada', 'Incumplimiento', 'Solicitada', 'VoBo Juridica'];
    
        const valoresInteresesEstados = toNumberArray(
          resumenData?.detalles?.map((d: any) => d.valorIntereses) ??
            [3050000, 4415000, 590000, 796000, 1460000]
        );
        const valoresCuotaEstados = toNumberArray(
          resumenData?.detalles?.map((d: any) => d.valorCuotaFomento) ??
            [14670948, 14169546, 13299972, 8816228, 4649619]
        );
        const diasMoraEstados = toNumberArray(
          resumenData?.detalles?.map((d: any) => d.diasMora) ?? [167, 247, 33, 47, 95]
        );
    
        // ---- RECAUDADOR ----
        const labelsRecaudador =
          recaudadoresData?.deudoresPorRecaudador?.map((d: any) => d.recaudador) ??
          ['ASOCCACO DEL HUILA', 'FEDECACAO', 'CACAO DEL TOLIMA SA', 'COMPANIA NAL DE CHOCOLATES'];
    
        const interesesRecaudador = toNumberArray(
          recaudadoresData?.deudoresPorRecaudador?.map((d: any) => d.intereses) ??
            [1440000, 2490000, 6381000, 5425000]
        );
        const cuotaRecaudador = toNumberArray(
          recaudadoresData?.deudoresPorRecaudador?.map((d: any) => d.cuotaFomento) ??
            [13900296, 3148308, 38557709, 9875000]
        );
    
        // ---- CARTERA POR EDAD ----
        const rowsEdad = (carteraPorEdadData?.carteraPorEdad ?? [
          { rango: '0-15 días', cuotaFomento: 8459250, intereses: 1635000 },
          { rango: '15-30 días', cuotaFomento: 55606313, intereses: 10311000 },
          { rango: '31-45 días', cuotaFomento: 37206045, intereses: 9275000 },
          { rango: '46-60 días', cuotaFomento: 6151896, intereses: 650000 },
          { rango: '61-75 días', cuotaFomento: 2411619, intereses: 900000 },
          { rango: '76-90 días', cuotaFomento: 0, intereses: 0 },
          { rango: '+91 días', cuotaFomento: 11067558, intereses: 6285000 },
        ]).map((r: any) => ({
          edad: r.rango ?? r.edad,
          cuota: toNumber(r.cuotaFomento ?? r.cuota_fomento),
          interes: toNumber(r.intereses ?? r.interes),
        }));
        const categoriasEdad = rowsEdad.map((r: any) => r.edad);
        const valoresFomentoEdad = rowsEdad.map((r: any) => r.cuota);
        const valoresInteresEdad = rowsEdad.map((r: any) => r.interes);
    
        // ---- DEPARTAMENTOS ----
        const depts = (deudoresPorUbicacionData?.deudoresPorUbicacion ?? []).map((d: any) => ({
          nombre: d.nombre,
          kilos: toNumber(d.kilos),
          cuota: toNumber(d.cuotaFomento),
          interes: toNumber(d.intereses),
        }));
        const deptNombres = depts.map((d) => d.nombre);
        const deptKilos = depts.map((d) => d.kilos);
        const deptCuota = depts.map((d) => d.cuota);
        const deptInteres = depts.map((d) => d.interes);
    
        // 5) SLIDES
        // === Slide A1: Estado → Barras (Intereses + Cuota) ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('ESTADÍSTICA CARTERA POR ACUERDO DE PAGO — VALORES ($)', {
            x: 2.1, y: 0.3, w: 7.6, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [
              { name: 'Valor Intereses', labels: catEstados, values: valoresInteresesEstados },
              { name: 'Valor Cuota Fomento', labels: catEstados, values: valoresCuotaEstados },
            ],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'col',
              chartColors: ['053969', 'E08D07'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([valoresInteresesEstados, valoresCuotaEstados]) * 1.2),
              legendPos: 't',
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide A2: Estado → Línea (Días en mora) ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('ESTADÍSTICA CARTERA POR ACUERDO DE PAGO — DÍAS EN MORA', {
            x: 2.1, y: 0.3, w: 7.6, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'line',
            [{ name: 'Días en Mora', labels: catEstados, values: diasMoraEstados }],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              chartColors: ['08660E'],
              dataLabelFormatCode: '0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '0',
              valAxisMaxVal: Math.round(safeMax([diasMoraEstados]) * 1.2),
              legendPos: 't',
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide B: Recaudador → Intereses ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('ESTADÍSTICA CARTERA POR RECAUDADOR — INTERESES ($)', {
            x: 2.1, y: 0.3, w: 7.6, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [{ name: 'Intereses ($)', labels: labelsRecaudador, values: interesesRecaudador }],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'bar',
              chartColors: ['BA182B'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([interesesRecaudador]) * 1.2),
              legendPos: 't',
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide C: Recaudador → Cuota de Fomento ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('ESTADÍSTICA CARTERA POR RECAUDADOR — CUOTA FOMENTO ($)', {
            x: 2.1, y: 0.3, w: 7.6, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [{ name: 'Cuota Fomento ($)', labels: labelsRecaudador, values: cuotaRecaudador }],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'bar',
              chartColors: ['1786E8'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([cuotaRecaudador]) * 1.2),
              legendPos: 't',
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide D1: Kilos por Departamento ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('DEUDORES MOROSOS — KILOS POR DEPARTAMENTO', {
            x: 1.2, y: 0.3, w: 9.2, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [{ name: 'Kilos', labels: deptNombres, values: deptKilos }],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'bar',
              chartColors: ['8D9761'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([deptKilos]) * 1.2),
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide D2: Cuota de Fomento por Departamento ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('DEUDORES MOROSOS — CUOTA DE FOMENTO POR DEPARTAMENTO ($)', {
            x: 0.8, y: 0.3, w: 9.8, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [{ name: 'Cuota de Fomento ($)', labels: deptNombres, values: deptCuota }],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'bar',
              chartColors: ['ECAE4D'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([deptCuota]) * 1.2),
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide D3: Intereses por Departamento ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('DEUDORES MOROSOS — INTERESES POR DEPARTAMENTO ($)', {
            x: 1.0, y: 0.3, w: 9.4, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [{ name: 'Intereses ($)', labels: deptNombres, values: deptInteres }],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'bar',
              chartColors: ['085599'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([deptInteres]) * 1.2),
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // === Slide E: Tabla Cartera por Edad ===
        {
          const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
          const table = [
            ['EDAD', 'CUOTA FOMENTO', 'INTERÉS'],
            ...rowsEdad.map((r) => [r.edad, COP.format(r.cuota), COP.format(r.interes)]),
          ];
    
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('CARTERA DEUDORES MOROSOS POR EDAD', {
            x: 2.1, y: 0.3, w: 7.6, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addTable(table, {
            x: 0.8, y: 1.2, w: 8.8, h: 3.9,
            fontSize: 12,
            border: { pt: 1, color: 'e5e7eb' },
            valign: 'middle',
            align: 'center',
            colW: [3.4, 2.7, 2.7],
          });
        }
    
        // === Slide F: Barras Cartera por Edad ===
        {
          const slide = pptx.addSlide();
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.15, w: 1.6, h: 0.8 });
          slide.addText('CARTERA DEUDORES MOROSOS POR EDAD — GRÁFICA', {
            x: 2.1, y: 0.3, w: 7.6, h: 0.6, fontSize: 20, bold: true, align: 'center', color: '562707',
          });
    
          slide.addChart(
            'bar',
            [
              { name: 'Cuota Fomento ($)', labels: categoriasEdad, values: valoresFomentoEdad },
              { name: 'Intereses ($)', labels: categoriasEdad, values: valoresInteresEdad },
            ],
            {
              x: 0.4, y: 1.2, w: 8.6, h: 4.0,
              barDir: 'col',
              chartColors: ['83bff6', 'fac858'],
              dataLabelFormatCode: '#,##0',
              dataLabelPosition: 'outEnd',
              valAxisLabelFormatCode: '#,##0',
              valAxisMaxVal: Math.round(safeMax([valoresFomentoEdad, valoresInteresEdad]) * 1.2),
              legendPos: 't',
              catAxisLabelFontFace: 'Calibri',
              valAxisLabelFontFace: 'Calibri',
            }
          );
        }
    
        // 6) Guardar
        await pptx.writeFile({ fileName: 'Estadisticas_Cartera_Deudores_Morosos.pptx' });
      } catch (err: any) {
        console.error('Error al generar PPTX:', err);
        alert('No se pudo generar el PPTX con las gráficas');
      }
    };
    
  


    // Componente EstadisticasCarteraChart para el Contenedor 2
    const EstadisticasCarteraChart = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;

            // Inicializar el gráfico
            chartInstance.current = echarts.init(chartRef.current);

            const colors = ['#053969', '#E08D07', '#08660E'];

            // Usar datos del resumen del API si están disponibles, sino usar datos estáticos
            const categorias = resumenData?.detalles?.map(d => d.estado) || datosEstadisticasCartera.categorias;
            const valorIntereses = resumenData?.detalles?.map(d => d.valorIntereses) || datosEstadisticasCartera.valorIntereses;
            const valorCuotaFomento = resumenData?.detalles?.map(d => d.valorCuotaFomento) || datosEstadisticasCartera.valorCuotaFomento;
            const dias = resumenData?.detalles?.map(d => d.diasMora) || datosEstadisticasCartera.dias;

            // Verificar si hay datos disponibles
            const hasData = (valorIntereses && valorIntereses.length > 0 && valorIntereses.some(v => v > 0)) || 
                           (valorCuotaFomento && valorCuotaFomento.length > 0 && valorCuotaFomento.some(v => v > 0)) ||
                           (dias && dias.length > 0 && dias.some(v => v > 0));

            if (!hasData) {
                // Mostrar mensaje "No hay datos disponibles" centrado en la gráfica
                const option = {
                    backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                    title: {
                        text: 'ESTADISTICA CARTERA DEUDORES MOROSOS POR ACUERDO DE PAGO',
                        left: 'center',
                        textStyle: {
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: isDarkMode ? '#f3f4f6' : '#562707'
                        }
                    },
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: {
                            text: 'No hay datos disponibles',
                            fontSize: 18,
                            fontWeight: 'bold',
                            fill: isDarkMode ? '#f3f4f6' : '#666',
                            textAlign: 'center'
                        }
                    }
                };
                chartInstance.current.setOption(option);
                return;
            }

            const option = {
                color: colors,
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                title: {
                    text: 'ESTADISTICA CARTERA DEUDORES MOROSOS POR ACUERDO DE PAGO',
                    left: 'center',
                    textStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross' },
                    backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#333'
                    },
                    formatter: function (params: any) {
                        const cat = params[0]?.axisValue || '';
                        const fmtMoney = (v: number) => Math.round(v).toLocaleString('es-CO', { 
                            style: 'currency', 
                            currency: 'COP', 
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0 
                        });
                        const rows = params.map((p: any) => {
                            let val = p.seriesName === 'Días en Mora'
                                ? `${p.data} días`
                                : fmtMoney(Number(p.data));
                            return `
                                <div style="display:flex;justify-content:space-between;gap:12px;">
                                    <span>
                                        <span style="display:inline-block;margin-right:6px;width:10px;height:10px;background:${p.color};border-radius:2px;"></span>
                                        ${p.seriesName}
                                    </span>
                                    <span><b>${val}</b></span>
                                </div>`;
                        }).join('');
                        return `
                            <div style="min-width:260px">
                                <div style="text-align:center;font-weight:700;margin-bottom:6px">${cat}</div>
                                ${rows}
                            </div>`;
                    }
                },
                grid: { left: 60, right: 90, top: 90, bottom: 50 },
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
                            name: 'estadisticas_cartera_acuerdos',
                            pixelRatio: 2
                        }
                    }
                },
                legend: { 
                    data: ['Valor Intereses', 'Valor Cuota Fomento', 'Días en Mora'], 
                    top: 40,
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#374151'
                    }
                },
                xAxis: [{
                    type: 'category',
                    axisTick: { alignWithLabel: true },
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                        color: isDarkMode ? '#f3f4f6' : '#6B4F3A', 
                        fontWeight: 'bold' 
                    },
                    data: categorias
                }],
                yAxis: [
                    {
                        type: 'value',
                        name: 'Valores ($)',
                        nameTextStyle: {
                            color: isDarkMode ? '#f3f4f6' : '#6B4F3A'
                        },
                        position: 'right',
                        alignTicks: true,
                        axisLine: { show: true, lineStyle: { color: colors[0] } },
                        axisLabel: {
                            color: isDarkMode ? '#f3f4f6' : '#6B4F3A',
                            fontWeight: 'bold',
                            formatter: (v: number) => Math.round(v).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                        },
                        splitLine: { 
                            show: true,
                            lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
                        }
                    },
                    {
                        type: 'value',
                        name: 'Días en Mora',
                        nameTextStyle: {
                            color: isDarkMode ? '#f3f4f6' : '#6B4F3A'
                        },
                        position: 'left',
                        alignTicks: true,
                        axisLine: { show: true, lineStyle: { color: colors[2] } },
                        axisLabel: { 
                            color: isDarkMode ? '#f3f4f6' : '#6B4F3A', 
                            fontWeight: 'bold', 
                            formatter: '{value} días' 
                        },
                        splitLine: { show: false }
                    }
                ],
                series: [
                    {
                        name: 'Valor Intereses',
                        type: 'bar',
                        barMaxWidth: 26,
                        itemStyle: { borderRadius: [4, 4, 0, 0] },
                        data: valorIntereses
                    },
                    {
                        name: 'Valor Cuota Fomento',
                        type: 'bar',
                        barMaxWidth: 26,
                        itemStyle: { borderRadius: [4, 4, 0, 0] },
                        data: valorCuotaFomento
                    },
                    {
                        name: 'Días en Mora',
                        type: 'line',
                        yAxisIndex: 1,
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: { width: 3, color: colors[2] },
                        data: dias
                    }
                ]
            };

            chartInstance.current.setOption(option);

            // Cleanup
            return () => {
                if (chartInstance.current) {
                    chartInstance.current.dispose();
                }
            };
        }, [isClient, resumenData, isDarkMode]); // Agregar isDarkMode como dependencia

        // Manejar el resize
        React.useEffect(() => {
            const handleResize = () => {
                if (chartInstance.current) {
                    chartInstance.current.resize();
                }
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="bg-transparent rounded-2xl">
                <div className="h-[600px] w-full">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    const EstadisticasPorRecaudadorChart = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);
      
        React.useEffect(() => {
          if (!chartRef.current || !isClient) return;
      
          chartInstance.current = echarts.init(chartRef.current, undefined, {
            renderer: 'canvas',
            useDirtyRect: false,
          });
      
          // Usar datos del API si están disponibles, sino usar datos estáticos como fallback
          const labels = recaudadoresData?.deudoresPorRecaudador?.map(d => d.recaudador) || [
            'ASOCCACO DEL HUILA',
            'FEDECACAO',
            'CACAO DEL TOLIMA SA',
            'COMPANIA NAL DE CHOCOLATES'
          ];
          const intereses = recaudadoresData?.deudoresPorRecaudador?.map(d => d.intereses) || [1440000, 2490000, 6381000, 5425000];
          const cuotaFomento = recaudadoresData?.deudoresPorRecaudador?.map(d => d.cuotaFomento) || [13900296, 3148308, 38557709, 9875000];
      
          // Verificar si hay datos disponibles
          const hasData = (intereses && intereses.length > 0 && intereses.some(v => v > 0)) || 
                         (cuotaFomento && cuotaFomento.length > 0 && cuotaFomento.some(v => v > 0));

          if (!hasData) {
              // Mostrar mensaje "No hay datos disponibles" centrado en la gráfica
              const option: EChartsCoreOption = {
                  backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                  title: {
                      text: 'ESTADISTICA CARTERA DEUDORES MOROSOS POR RECAUDADOR',
                      left: 'center',
                      textStyle: { 
                          fontSize: 20, 
                          fontWeight: 'bold', 
                          color: isDarkMode ? '#f3f4f6' : '#562707' 
                      }
                  },
                  graphic: {
                      type: 'text',
                      left: 'center',
                      top: 'middle',
                      style: {
                          text: 'No hay datos disponibles',
                          fontSize: 18,
                          fontWeight: 'bold',
                          fill: isDarkMode ? '#f3f4f6' : '#666',
                          textAlign: 'center'
                      }
                  }
              };
              chartInstance.current.setOption(option);
              return;
          }
      
          const option: EChartsCoreOption = {
            backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
            title: {
              text: 'ESTADISTICA CARTERA DEUDORES MOROSOS POR RECAUDADOR',
              left: 'center',
              textStyle: { 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#f3f4f6' : '#562707' 
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
                let res = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                  const isMoney = p.seriesName.includes('$');
                  const val = isMoney
                    ? Number(p.value).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    : Math.round(Number(p.value)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  res += `${p.marker} ${p.seriesName}: <b>${val}</b><br/>`;
                });
                return res;
              }
            },
            legend: {
              top: 40,
              textStyle: { 
                  color: isDarkMode ? '#f3f4f6' : '#562707', 
                  fontWeight: 'bold' 
              }
            },
            grid: { left: 90, right: 40, top: 90, bottom: 40 },
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
                  name: 'estadisticas_cartera_recaudadores',
                  pixelRatio: 2
                }
              }
            },
            xAxis: {
              type: 'value',
              boundaryGap: [0, 0.01],
              axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
              },
              axisLabel: {
                color: isDarkMode ? '#f3f4f6' : '#6B4F3A',
                fontWeight: 'bold',
                formatter: (v: number) => Math.round(v).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              },
              splitLine: { 
                  show: true,
                  lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
              }
            },
            yAxis: {
              type: 'category',
              data: labels,
              axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
              },
              axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#6B4F3A', 
                  fontWeight: 'bold' 
              }
            },
            series: [
              {
                name: 'Intereses ($)',
                type: 'bar',
                data: intereses,
                itemStyle: { color: '#BA182B', borderRadius: [0, 6, 6, 0] },
                barMaxWidth: 26
              },
              {
                name: 'Cuota Fomento ($)',
                type: 'bar',
                data: cuotaFomento,
                itemStyle: { color: '#1786E8', borderRadius: [0, 6, 6, 0] },
                barMaxWidth: 26
              }
            ]
          };
      
          chartInstance.current.setOption(option);
      
          return () => chartInstance.current?.dispose();
        }, [isClient, recaudadoresData, isDarkMode]); // Agregar isDarkMode como dependencia
      
        React.useEffect(() => {
          const onResize = () => chartInstance.current?.resize();
          window.addEventListener('resize', onResize);
          return () => window.removeEventListener('resize', onResize);
        }, []);
      
        return (
          <div className="w-full">
            <div className="h-[600px] w-full min-w-[600px]">
              <div ref={chartRef} style={{ width: '100%', height: '100%', minWidth: '600px' }} />
            </div>
          </div>
        );
    };

    const CarteraDeptoMunicipioDonuts = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);
      
        React.useEffect(() => {
          if (!isClient || !chartRef.current) return;
      
          // Limpiar instancia anterior si existe
          if (chartInstance.current) {
            chartInstance.current.dispose();
          }
      
          chartInstance.current = echarts.init(chartRef.current, undefined, { 
            renderer: 'canvas', 
            useDirtyRect: false 
          });
      
          // Verificar si hay datos disponibles
          const hasData = deudoresPorUbicacionData?.deudoresPorUbicacion && deudoresPorUbicacionData.deudoresPorUbicacion.length > 0;
      
          if (!hasData) {
              // Mostrar mensaje "No hay datos disponibles" centrado en la gráfica
              const optionNoData: EChartsCoreOption = {
                  backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                  title: {
                      text: 'ESTADISTICA DEUDORES MOROS CUOTA DE FOMENTO',
                      subtext: 'TOTALIZADA POR DEPARTAMENTOS',
                      left: 'center',
                      top: 10,
                      textStyle: { 
                          fontSize: 18, 
                          fontWeight: 'bold', 
                          color: isDarkMode ? '#f3f4f6' : '#562707' 
                      },
                      subtextStyle: { 
                          fontSize: 14, 
                          fontWeight: 'bold', 
                          color: isDarkMode ? '#d1d5db' : '#555' 
                      }
                  },
                  graphic: {
                      type: 'text',
                      left: 'center',
                      top: 'middle',
                      style: {
                          text: 'No hay datos disponibles',
                          fontSize: 18,
                          fontWeight: 'bold',
                          fill: isDarkMode ? '#f3f4f6' : '#666',
                          textAlign: 'center'
                      }
                  }
              };
      
              chartInstance.current.setOption(optionNoData);
              return;
          }
      
    
          const option: EChartsCoreOption = {
            backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
            title: { 
              text: 'ESTADISTICA DEUDORES MOROS CUOTA DE FOMENTO',
              subtext: 'TOTALIZADA POR DEPARTAMENTOS',
              left: 'center',
              top: 10,
              textStyle: { 
                  color: isDarkMode ? '#f3f4f6' : '#562707' 
              },
              subtextStyle: { 
                  fontSize: 14, 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#d1d5db' : '#555' 
              }
            },
            color: ['#8D9761', '#ECAE4D', '#085599'],
            legend: { 
                top: 80, 
                data: ['Kilos', 'Cuota de Fomento', 'Valor de Intereses'],
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
                  name: 'estadisticas_cartera_departamentos',
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
              formatter: (params: any) => {
                const money = new Set(['Cuota de Fomento', 'Valor de Intereses']);
                let t = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                  const v = money.has(p.seriesName)
                    ? `$${Math.round(Number(p.value)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : Math.round(Number(p.value)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  t += `${p.marker} ${p.seriesName}: <b>${v}</b><br/>`;
                });
                return t;
              }
            },
            grid: { left: 160, right: 24, top: 120, bottom: 20, containLabel: true },
            xAxis: {
              type: 'value',
              boundaryGap: [0, 0.01],
              axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
              },
              axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#6b7280',
                  formatter: (v: number) => `$${Math.round(Number(v)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
              },
              splitLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
              }
            },
            yAxis: {
              type: 'category',
              data: deudoresPorUbicacionData?.deudoresPorUbicacion?.map(d => d.nombre) || [],
              axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
              },
              axisLabel: {
                  color: isDarkMode ? '#f3f4f6' : '#374151'
              }
            },
            series: [
              { name: 'Kilos', type: 'bar', data: deudoresPorUbicacionData?.deudoresPorUbicacion?.map(d => d.kilos) || [] },
              { name: 'Cuota de Fomento', type: 'bar', data: deudoresPorUbicacionData?.deudoresPorUbicacion?.map(d => d.cuotaFomento) || [] },
              { name: 'Valor de Intereses', type: 'bar', data: deudoresPorUbicacionData?.deudoresPorUbicacion?.map(d => d.intereses) || [] }
            ]
          };

          chartInstance.current.setOption(option);
      
          const onResize = () => chartInstance.current?.resize();
          window.addEventListener('resize', onResize);
      
          return () => {
            window.removeEventListener('resize', onResize);
            if (chartInstance.current) {
              chartInstance.current.dispose();
              chartInstance.current = null;
            }
          };
        }, [isClient, deudoresPorUbicacionData, isDarkMode]);
      
        return (
          <div className="w-full">
            <div className="h-[600px] w-full">
              <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        );
      };

    const CarteraPorEdadChart = () => {
        const ref = React.useRef<HTMLDivElement>(null);
        const inst = React.useRef<echarts.ECharts | null>(null);
      
        React.useEffect(() => {
          if (!isClient || !ref.current) return;
      
          inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas', useDirtyRect: false });
      
          const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
      
          // Datos desde tu arreglo datosCarteraPorEdad
          const dataAxis = carteraPorEdadData?.carteraPorEdad?.map(d => d.rango) || datosCarteraPorEdad.map(d => d.edad.replace(/\bDias?\b/i, 'Días'));
          const dataFomento = carteraPorEdadData?.carteraPorEdad?.map(d => d.cuotaFomento) || datosCarteraPorEdad.map(d => d.cuota_fomento);
          const dataIntereses = carteraPorEdadData?.carteraPorEdad?.map(d => d.intereses) || datosCarteraPorEdad.map(d => d.interes);
      
          // Verificar si hay datos disponibles
          const hasData = (dataFomento && dataFomento.length > 0 && dataFomento.some(v => v > 0)) || 
                         (dataIntereses && dataIntereses.length > 0 && dataIntereses.some(v => v > 0));
      
          if (!hasData) {
            // Mostrar mensaje "No hay datos disponibles" centrado en la gráfica
            const option: EChartsCoreOption = {
              backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
              title: { 
                text: 'CARTERA DEUDORES MOROSOS POR EDAD',
                left: 'center',
                textStyle: { 
                    fontSize: 20, 
                    fontWeight: 'bold', 
                    color: isDarkMode ? '#f3f4f6' : '#562707' 
                },
              },
              graphic: {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: {
                  text: 'No hay datos disponibles',
                  fontSize: 18,
                  fontWeight: 'bold',
                  fill: isDarkMode ? '#f3f4f6' : '#666',
                  textAlign: 'center'
                }
              }
            };
            inst.current.setOption(option);
            return;
          }
      
          const option: EChartsCoreOption = {
            backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
            title: { 
              text: 'CARTERA DEUDORES MOROSOS POR EDAD',
              left: 'center',
              textStyle: { 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#f3f4f6' : '#562707' 
              },
            },
            legend: { 
                top: 40, 
                data: ['Cuota Fomento ($)', 'Intereses ($)'],
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
                  name: 'cartera_por_edad',
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
              formatter: (params: any[]) => {
                let s = `<b>${params?.[0]?.axisValue ?? ''}</b><br/>`;
                params.forEach(p => s += `${p.marker} ${p.seriesName}: <b>${COP.format(Number(p.value))}</b><br/>`);
                return s;
              }
            },
            grid: { left: 60, right: 20, bottom: 60, top: 80 },
            xAxis: {
              type: 'category',
              data: dataAxis,
              axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#333' 
              },
              axisTick: { show: false },
              axisLine: { 
                  show: false 
              },
              z: 10
            },
            yAxis: {
              type: 'value',
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#666', 
                  formatter: (v: number) => (v === 0 ? '0' : COP.format(Math.round(v))) 
              },
              splitLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
              }
            },
            dataZoom: [{ type: 'inside' }],
            series: [
              {
                name: 'Cuota Fomento ($)',
                type: 'bar',
                showBackground: true,
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#83bff6' },
                    { offset: 0.5, color: '#188df0' },
                    { offset: 1, color: '#188df0' }
                  ])
                },
                emphasis: {
                  itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#2378f7' },
                      { offset: 0.7, color: '#2378f7' },
                      { offset: 1, color: '#83bff6' }
                    ])
                  }
                },
                data: dataFomento,
                barMaxWidth: 36,
              },
              {
                name: 'Intereses ($)',
                type: 'bar',
                showBackground: true,
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#fac858' },
                    { offset: 0.5, color: '#f39c12' },
                    { offset: 1, color: '#e67e22' }
                  ])
                },
                emphasis: {
                  itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#f5b041' },
                      { offset: 0.7, color: '#f39c12' },
                      { offset: 1, color: '#ffd07a' }
                    ])
                  }
                },
                data: dataIntereses,
                barMaxWidth: 36,
              }
            ]
          };
      
          inst.current.setOption(option);
      
          // click-to-zoom
          const zoomSize = 3;
          inst.current.off('click'); // limpia handlers previos por si se recompone
          inst.current.on('click', (params: any) => {
            const start = Math.max(params.dataIndex - Math.floor(zoomSize / 2), 0);
            const end = Math.min(params.dataIndex + Math.floor(zoomSize / 2), dataAxis.length - 1);
            inst.current?.dispatchAction({
              type: 'dataZoom',
              startValue: dataAxis[start],
              endValue: dataAxis[end],
            });
          });
      
          const onResize = () => inst.current?.resize();
          window.addEventListener('resize', onResize);
      
          return () => {
            window.removeEventListener('resize', onResize);
            inst.current?.dispose();
          };
        }, [isClient, carteraPorEdadData, isDarkMode]);
      
        return (
          <div className="bg-transparent rounded-2xl">
            <div className="h-[600px] w-full">
              <div ref={ref} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        );
    };
      
   
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

                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-4 lg:my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        TABLERO DE ESTADISTICA DE CARTERA DE DEUDORES MOROSOS
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR RECAUDADOR</h3>

                    <InternalUserInfo 
                        ref={internalUserInfoRef}
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

                    <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-4 sm:mt-6'>  
                        <Button 
                            title={isConsultando ? 'Consultando...' : 'Consultar'} 
                            onClick={handleConsultar} 
                            disabled={isConsultando}
                        />
                        <Button 
                            title='Limpiar' 
                            onClick={handleLimpiar}
                        />
                        <Button 
                            title='PPTX Gráfica' 
                            onClick={handleDescargarGrafica}
                        />
                        
                        <Button 
                            title='Salir' 
                            onClick={() => router.push('/')}
                        />
                    </div>
      
                </div>

                {/* Sección de resultados con gráficas y tablas */}
                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-4 sm:my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                        ESTADISTICA CARTERA DE DEUDORES MOROSOS POR ESTADO ACUERDO DE PAGO
                    </h2>

                    {/* Filtros Activos */}
                <div className="mt-4 sm:mt-6">
                    <div className="mb-6">
    
                        <div className="flex flex-wrap justify-center gap-4">
                            {/* Total Kilos */}
                            <div className={`rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                                <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    TOTAL KILOS
                                </div>
                                <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {data?.totales?.total_kilos || '0,00'}
                                </div>
                            </div>

                            {/* Total Cuota de Fomento */}
                            <div className={`rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                                <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    TOTAL CUOTA DE FOMENTO
                                </div>
                                <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {data?.totales?.total_cuota_fomento || '$0,00'}
                                </div>
                            </div>

                            {/* Total Intereses */}
                            <div className={`rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                                <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    VALOR TOTAL DE INTERES
                                </div>
                                <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {data?.totales?.total_intereses || '$0,00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <AlertError 
                        isOpen={showErrorAlert}
                        message={error || errorResumen || errorRecaudadores || errorCarteraPorEdad || ''}
                        onClose={() => setShowErrorAlert(false)}
                        autoCloseMs={8000}
                    />

                    {/* Layout principal: Contenedores separados */}
                    <div className="space-y-4 sm:space-y-6">

                        {/* Contenedor 1 */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-32">
                                        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando datos...</div>
                                    </div>
                                ) : data?.registros && data.registros.length > 0 ? (
                                    <DynamicTable
                                        columns={columnasReporteCacao}
                                        data={data.registros}
                                        currentPage={currentPage}
                                        totalPages={data.total_pages || 1}
                                        onPageChange={onPageChange}
                                        fetchAllData={fetchAllReporteData}
                                        downloadButtonPosition="top"
                                        isLoading={isPageLoading}
                                        darkMode={isDarkMode}
                                    />
                                ) : (
                                    <>
                                    <DynamicTable
                                        columns={columnasReporteCacao}
                                        data={[]}
                                        currentPage={currentPage}
                                        totalPages={1}
                                        onPageChange={() => {}}
                                        downloadButtonPosition="top"
                                        isLoading={isPageLoading}
                                        darkMode={isDarkMode}
                                    />
                                    </>
                                )}

                                <div className='mt-2 flex justify-between'>
                              
                                    <div className='flex flex-col md:flex-row gap-4 w-full md:w-auto'>
                                        <div className='w-full'>
                                        <AnimatedInput
                                            label='TOTAL KILOS'
                                            type='text'
                                            value={data?.totales?.total_kilos || '0,00'}
                                            onChange={() => {}}
                                            name='total_kilos'
                                            readOnly
                                            darkMode={isDarkMode}
                                        />
                                        </div>

                                        <div className='w-full'>
                                        <AnimatedInput
                                            label='TOTAL CUOTA'
                                            type='text'
                                            value={data?.totales?.total_cuota_fomento || '$0,00'}
                                            onChange={() => {}}
                                            name='total_cuota_fomento'
                                            readOnly
                                            darkMode={isDarkMode}
                                        />
                                        </div>

                                        <div className='w-full'>
                                        <AnimatedInput
                                            label='TOTAL INTERESES'
                                            type='text'
                                            value={data?.totales?.total_intereses || '$0,00'}
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

                        {/* Contenedor 2 */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                {isLoadingResumen ? (
                                    <div className="flex justify-center items-center h-[500px]">
                                        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando gráfica...</div>
                                    </div>
                                ) : resumenData?.detalles && resumenData.detalles.length > 0 ? (
                                    <EstadisticasCarteraChart />
                                ) : (
                                    <div className="h-[600px] flex items-center justify-center rounded-lg">
                                        <div className="text-center">
                                            <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No hay datos disponibles</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Contenedor 3 */}
                         <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 w-full ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="w-full overflow-x-auto">
                                {isLoadingRecaudadores ? (
                                    <div className="flex justify-center items-center h-[500px]">
                                        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando gráfica de recaudadores...</div>
                                    </div>
                                ) : recaudadoresData?.deudoresPorRecaudador && recaudadoresData.deudoresPorRecaudador.length > 0 ? (
                                    <EstadisticasPorRecaudadorChart />
                                ) : (
                                     <div className="h-[600px] flex items-center justify-center rounded-lg">
                                         <div className="text-center">
                                             <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No hay datos disponibles</p>
                                         </div>
                                     </div>
                                 )}
                            </div>
                        </div>

                         {/* Contenedor 4 */}
                         <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 w-full ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="w-full overflow-x-auto">
                               
                                {isLoadingDeudoresPorUbicacion ? (
                                    <div className="flex justify-center items-center h-[500px]">
                                        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando gráfica de deudores por ubicación...</div>
                                    </div>
                                ) : (
                                    <CarteraDeptoMunicipioDonuts />
                                )}
                            </div>
                        </div>


                         {/* Contenedor 5 */}
                         <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                {isLoadingCarteraPorEdad ? (
                                    <div className="flex justify-center items-center h-32">
                                        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando tabla de cartera por edad...</div>
                                    </div>
                                     ) : carteraPorEdadData?.carteraPorEdad && carteraPorEdadData.carteraPorEdad.length > 0 ? (
                                     <>
                                        
                                         <DynamicTable
                                             columns={columnasCarteraPorEdad}
                                             data={carteraPorEdadData.carteraPorEdad}
                                             currentPage={currentPageCarteraEdad}
                                             totalPages={Math.ceil(carteraPorEdadData.carteraPorEdad.length / 7)}
                                             onPageChange={setCurrentPageCarteraEdad}
                                             fetchAllData={fetchAllCarteraPorEdadData}
                                             downloadButtonPosition="top"
                                             darkMode={isDarkMode}
                                         />
                                     </>
                                 ) : (
                                  <>
           
                                  <DynamicTable
                                      columns={columnasCarteraPorEdad}
                                      data={[]}
                                      currentPage={currentPageCarteraEdad}
                                      totalPages={1}
                                      onPageChange={setCurrentPageCarteraEdad}
                                      fetchAllData={fetchAllCarteraPorEdadData}
                                      downloadButtonPosition="top"
                                      darkMode={isDarkMode}
                                  />
                              </>
                                 )}               
                            </div>
                        </div>

                                                 {/* Contenedor 6 */}
                         <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 w-full ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                             <div className="w-full overflow-x-auto">
                                 {isLoadingCarteraPorEdad ? (
                                     <div className="flex justify-center items-center h-[480px]">
                                         <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando gráfica de cartera por edad...</div>
                                     </div>
                                 ) : carteraPorEdadData?.carteraPorEdad && carteraPorEdadData.carteraPorEdad.length > 0 ? (
                                     <CarteraPorEdadChart />
                                 ) : (
                                     <div className="h-[600px] flex items-center justify-center rounded-lg">
                                         <div className="text-center">
                                             <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No hay datos disponibles</p>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default TableroCartera;
  