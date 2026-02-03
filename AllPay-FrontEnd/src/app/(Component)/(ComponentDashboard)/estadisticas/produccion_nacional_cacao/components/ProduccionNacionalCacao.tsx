'use client';

// react
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
// import DynamicTable from '@/presenters/components/ui/DynamicTable';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import { useComparativoInternacional } from '../hooks/useComparativoInternacional';
import { useSerieNalNy } from '../hooks/useSerieNalNy';
import { useTableroProduccionDepartamentos } from '../hooks/useTableroProduccionDepartamentos';
import { useSeriesAnuales } from '../hooks/useSeriesAnuales';
import { ParamsComparativo } from '../models/comparativo.models';
import { ParamsSerieNalNy } from '../models/serie-nal-ny.models';
import { ParamsTableroProduccion } from '../models/tablero-produccion-departamentos.models';
import { ParamsSeriesAnuales } from '../models/series-anuales.models';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import Tablero1 from './Tablero1';
import type { Tablero1Handle } from './Tablero1';
import Tablero2 from './Tablero2';
import type { Tablero2Ref } from './Tablero2';
import Tablero3 from './Tablero3';
import type { Tablero3Ref } from './Tablero3';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, BarChart, PieChart, LineChart, CanvasRenderer, DataZoomComponent]);

// Tipo para las variaciones digitadas por el usuario
interface VariacionDigitada {
    mes: string;
    var_ton_pct: number;
    var_abs: number;
    var_pct: number;
}

function ProduccionNacionalCacaoTablero() {

    const { theme } = useTheme();
    const router = useRouter();
    const tablero1Ref = useRef<Tablero1Handle>(null);
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    // Estado para manejar la hidratación
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Hook principal para comparativo internacional
    const { data: comparativoData, loading: isLoading, error, fetchData, resetData } = useComparativoInternacional();
    
    // Hook para serie NAL vs N.Y.
    const { data: serieNalNyData, loading: isLoadingSerie, error: errorSerie, fetchData: fetchSerieData, resetData: resetSerieData } = useSerieNalNy();
    
    // Hook para tablero de producción por departamentos
    const { data: tableroProduccionData, loading: isLoadingTablero, error: errorTablero, fetchData: fetchTableroData, resetData: resetTableroData } = useTableroProduccionDepartamentos();
    
    // Hook para series anuales
    const { data: seriesAnualesData, loading: isLoadingSeriesAnuales, error: errorSeriesAnuales, fetchData: fetchSeriesAnualesData, resetData: resetSeriesAnualesData } = useSeriesAnuales();
    
    const { isLoading: isLoadingTiposCargue, fetchTiposCargue } = useTiposCargue();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [, setTipoCargueSeleccionado] = useState<string>('EXP');
    const [, setToggleEnabled] = useState<boolean>(false);
    // Campos adicionales para la UI tipo "dos periodos"
    const [fechaInicio2, setFechaInicio2] = useState<string>('');
    const [fechaFinal2, setFechaFinal2] = useState<string>('');
    const [digitarVariacion, setDigitarVariacion] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [tableroSeleccionado, setTableroSeleccionado] = useState<string>('ESCENARIO POR AREAS DE PRODUCCION');
    
    // Estados para los parámetros del tablero de producción
    const [anoProduccion, setAnoProduccion] = useState<string>('2024');
    const [estimacionProduccion, setEstimacionProduccion] = useState<string>('0.85');
    const [rendimientoPromedioNacional, setRendimientoPromedioNacional] = useState<string>('448.17');
    
    // Estados para los parámetros del tablero 2
    const [anoActual, setAnoActual] = useState<string>('2024');
    const [periodosEstadisticos, setPeriodosEstadisticos] = useState<string>('5');

    // Nuevos estados para variaciones digitadas
    const [, setVariacionesDigitadas] = useState<VariacionDigitada[]>([]);
    const [, setUsarVariacionesDigitadas] = useState<boolean>(false);

    // Función para extraer datos de TOTALES del tablero de producción
    const getTotalesData = useMemo(() => {
        if (!tableroProduccionData?.data) return null;
        
        const totalesRow = tableroProduccionData.data.find(
            item => item.departamento && item.departamento.toLowerCase() === 'totales'
        );
        
        return {
            totalesRow,
            anoConsultado: tableroProduccionData.ano_consultado || 0
        };
    }, [tableroProduccionData]);

    // Cargar tipos de cargue (una sola vez)
    useEffect(() => {
        if (token && !isLoadingTiposCargue) {
            fetchTiposCargue(token);
        }
    }, [token, fetchTiposCargue, isLoadingTiposCargue]);

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error || errorSerie || errorTablero || errorSeriesAnuales) setShowErrorAlert(true);
    }, [error, errorSerie, errorTablero, errorSeriesAnuales]);

    // Inicializar variaciones digitadas cuando cambien los datos del comparativo
    useEffect(() => {
        if (comparativoData && digitarVariacion) {
            const meses = new Set<string>();
            comparativoData.data.anio1.meses?.forEach((m: any) => meses.add(m.label));
            comparativoData.data.anio2.meses?.forEach((m: any) => meses.add(m.label));
            
            const nuevasVariaciones = Array.from(meses).map(mes => {
                const datosVariacion = comparativoData.data.anio1.meses?.find((m: any) => m.label === mes);
                return {
                    mes,
                    var_ton_pct: datosVariacion?.diferencia_pct || 0,
                    var_abs: datosVariacion?.nal_cop || 0,
                    var_pct: datosVariacion?.diferencia_pct || 0
                };
            });
            
            setVariacionesDigitadas(nuevasVariaciones);
        }
    }, [comparativoData, digitarVariacion]);

    // Refs para los componentes Tablero2 y Tablero3
    const tablero2Ref = useRef<Tablero2Ref>(null);
    const tablero3Ref = useRef<Tablero3Ref>(null);

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {
        // Validar según el tablero seleccionado
        if (tableroSeleccionado === 'ESCENARIO POR TASA DE CRECIMIENTO') {
            if (!anoActual || !periodosEstadisticos) {
                setShowErrorAlert(true);
                return;
            }

            // Petición para series anuales (Tablero 2)
            const paramsSeriesAnuales: ParamsSeriesAnuales = {
                anio_actual: parseInt(anoActual),
                periodos_estadisticos: parseInt(periodosEstadisticos)
            };

            await fetchSeriesAnualesData(token, paramsSeriesAnuales);
            
            // También llamar a las funciones del Tablero2
            if (tablero2Ref.current) {
                if (tablero2Ref.current.fetchDistribucionData) {
                    tablero2Ref.current.fetchDistribucionData();
                }
                if (tablero2Ref.current.fetchProduccionHistorica) {
                    tablero2Ref.current.fetchProduccionHistorica();
                }
            }
        } else if (tableroSeleccionado === 'ESCENARIO DE PRONOSTICO LINEAL') {
            if (!anoActual || !periodosEstadisticos) {
                setShowErrorAlert(true);
                return;
            }

            // Petición para series anuales (Tablero 3 - mismos datos que Tablero 2)
            const paramsSeriesAnuales: ParamsSeriesAnuales = {
                anio_actual: parseInt(anoActual),
                periodos_estadisticos: parseInt(periodosEstadisticos)
            };

            await fetchSeriesAnualesData(token, paramsSeriesAnuales);
            
            // También llamar a las funciones del Tablero3
            if (tablero3Ref.current && tablero3Ref.current.fetchTablero3Data) {
                tablero3Ref.current.fetchTablero3Data();
            }
        } else {
            if (!anoProduccion || !estimacionProduccion || !rendimientoPromedioNacional) {
                setShowErrorAlert(true);
                return;
            }

            // Petición para el tablero de producción por departamentos (Tablero 1)
            const paramsTablero: ParamsTableroProduccion = {
                ano: parseInt(anoProduccion),
                estimacion: parseFloat(estimacionProduccion),
                rendimiento_prom_nal: parseFloat(rendimientoPromedioNacional)
            };

            await fetchTableroData(token, paramsTablero);
        }

        // Peticiones adicionales si se necesitan para otros tableros
        if (fechaInicio && fechaFinal) {
            const params: ParamsComparativo = {
                page: 1,
                page_size: 10,
                fecha_inicio1: fechaInicio,
                fecha_fin1: fechaFinal,
                fecha_inicio2: fechaInicio2 || fechaInicio,
                fecha_fin2: fechaFinal2 || fechaFinal
            };

            // Petición al comparativo internacional
            await fetchData(token, params);

            // Petición a la serie NAL vs N.Y.
            const paramsSerie: ParamsSerieNalNy = {
                fecha_inicio1: fechaInicio,
                fecha_fin1: fechaFinal,
                fecha_inicio2: fechaInicio2 || fechaInicio,
                fecha_fin2: fechaFinal2 || fechaFinal
            };

            await fetchSerieData(token, paramsSerie);
        }
    };

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setTipoCargueSeleccionado('EXP');
        setToggleEnabled(false);
        setFechaInicio2('');
        setFechaFinal2('');
        setDigitarVariacion(false);
        setVariacionesDigitadas([]);
        setUsarVariacionesDigitadas(false);
        setShowErrorAlert(false);
        setTableroSeleccionado('ESCENARIO POR AREAS DE PRODUCCION');
        setAnoProduccion('2024');
        setEstimacionProduccion('0.85');
        setRendimientoPromedioNacional('448.17');
        setAnoActual('2024');
        setPeriodosEstadisticos('5');
        resetData(); // Limpia los datos del hook
        resetSerieData(); // Limpia los datos de la serie
        resetTableroData(); // Limpia los datos del tablero
        resetSeriesAnualesData(); // Limpia los datos de series anuales
    };

    const transformarDatosParaTabla = useMemo(() => {
        if (!comparativoData) return [];

        const datosTransformados = comparativoData.data.anio1.meses.map((mesAnio1: any) => {
            const mesAnio2 = comparativoData.data.anio2.meses.find((m: any) => m.mes === mesAnio1.mes);
            
            return {
                mes: mesAnio1.label,
                nal_2024: mesAnio1.nal_cop || 0,
                usd_ton_nal_2024: mesAnio1.usd_ton_nal || 0,
                usd_ton_ny_2024: mesAnio1.usd_ton_ny || 0,
                diferencia_2024: mesAnio1.diferencia_pct || 0,
                trm_promedio_2024: mesAnio1.trm_promedio || 0,
                nal_2025: mesAnio2?.nal_cop || 0,
                usd_ton_nal_2025: mesAnio2?.usd_ton_nal || 0,
                usd_ton_ny_2025: mesAnio2?.usd_ton_ny || 0,
                diferencia_2025: mesAnio2?.diferencia_pct || 0,
                trm_promedio_2025: mesAnio2?.trm_promedio || 0
            };
        });

        const totales = {
            mes: 'TOTALES',
            nal_2024: comparativoData.data.anio1.totales.nal_cop || 0,
            usd_ton_nal_2024: comparativoData.data.anio1.totales.usd_ton_nal || 0,
            usd_ton_ny_2024: comparativoData.data.anio1.totales.usd_ton_ny || 0,
            diferencia_2024: comparativoData.data.anio1.totales.diferencia_pct || 0,
            trm_promedio_2024: comparativoData.data.anio1.totales.trm_promedio || 0,
            nal_2025: comparativoData.data.anio2.totales.nal_cop || 0,
            usd_ton_nal_2025: comparativoData.data.anio2.totales.usd_ton_nal || 0,
            usd_ton_ny_2025: comparativoData.data.anio2.totales.usd_ton_ny || 0,
            diferencia_2025: comparativoData.data.anio2.totales.diferencia_pct || 0,
            trm_promedio_2025: comparativoData.data.anio2.totales.trm_promedio || 0
        };

        return [...datosTransformados, totales];
    }, [comparativoData]);

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

    const addBrandHeader = (
        slide: PptxGenJS.Slide,
        logoBase64: string,
        title: string,
        subtitle?: string
      ) => {
        slide.addImage({ data: logoBase64, x: 0.2, y: 0.2, w: 1.4, h: 0.8 });
      
        slide.addText(title, {
          x: 1.8, y: 0.25, w: 7.8, h: 0.6,
          fontSize: 20, bold: true, color: '562707', align: 'center',
        });
      
        if (subtitle) {
          slide.addText(subtitle, {
            x: 2.2, y: 0.75, w: 7.0, h: 0.4,
            fontSize: 12, color: '6B7280', align: 'center',
          });
        }
      };


      const handleDownloadPPT = async () => {
        try {
            const pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_WIDE';
            const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
      
        const rango = (fechaInicio || fechaFinal)
          ? `(${fechaInicio || '—'} a ${fechaFinal || '—'})`
          : undefined;
      
        // =================== SLIDE 1: TABLA =================== //
        {
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Tabla consolidada NAL vs N.Y.', rango);
      
          // Cabeceras "planas" para PPT
          const headers = [
            'Mes',
            'NAL 1P ($ COP)',
            'USD/TON NAL 1P',
            'USD/TON N.Y. 1P',
            'Dif. % 1P',
            'TRM 1P',
            'NAL 2P ($ COP)',
            'USD/TON NAL 2P',
            'USD/TON N.Y. 2P',
            'Dif. % 2P',
            'TRM 2P',
          ];
      
          const rows = (transformarDatosParaTabla as any[]).map((r) => [
            r.mes ?? '',
            r.nal_2024 ?? '',
            r.usd_ton_nal_2024 ?? '',
            r.usd_ton_ny_2024 ?? '',
            r.diferencia_2024 ?? '',
            r.trm_promedio_2024 ?? '',
            r.nal_2025 ?? '',
            r.usd_ton_nal_2025 ?? '',
            r.usd_ton_ny_2025 ?? '',
            r.diferencia_2025 ?? '',
            r.trm_promedio_2025 ?? '',
          ]);
      
          slide.addTable([headers, ...rows], {
            x: 0.4, y: 1.15, w: 9.6, fontSize: 9,
            border: { type: 'solid', color: '000000', pt: 1 },
            colW: [1.2, 1.2, 1.1, 1.1, 0.9, 1.0, 1.2, 1.1, 1.1, 0.9, 1.0],
          });
        }
      
        // =================== PREPARAR SERIES PARA GRÁFICAS =================== //
        // Meses/categorías
        const MESES_DEF = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const categorias: string[] = serieNalNyData?.data?.categorias?.length
          ? serieNalNyData.data.categorias
          : MESES_DEF;
      
        // Series del API (sólo las que traen al menos un valor numérico)
        const rawSeries: any[] = serieNalNyData?.data?.series || [];
        const seriesConDatos = rawSeries.filter((s) => {
          const vals = s?.values || {};
          return Object.values(vals).some((v) => typeof v === 'number' && !isNaN(v as number));
        });
      
        // Función para convertir el objeto values a arreglo por meses
        const valuesToArray = (values: any) => ([
          values?.ene ?? 0, values?.feb ?? 0, values?.mar ?? 0, values?.abr ?? 0,
          values?.may ?? 0, values?.jun ?? 0, values?.jul ?? 0, values?.ago ?? 0,
          values?.sep ?? 0, values?.oct ?? 0, values?.nov ?? 0, values?.dic ?? 0,
        ]);
      
        // Paleta (se usa 1 color por slide)
        const palette = ['#FA9C05','#57ABF7','#A633B8','#8D9761','#085599','#ECAE4D','#7DA9E5','#5B3521'];
      
        // =================== SLIDES 2..N: LÍNEA (una serie por slide) =================== //
        seriesConDatos.forEach((serie, idx) => {
          const slide = pptx.addSlide();
          addBrandHeader(
            slide,
            logoBase64,
            `Evolución mensual – ${serie.label}`,
            'USD/TON NAL vs Bolsa N.Y. ' + (rango || '')
          );
      
          const vals = valuesToArray(serie.values || {});
          slide.addChart(
            pptx.ChartType.line,
            [{ name: serie.label, labels: categorias, values: vals, color: palette[idx % palette.length] }],
            {
              x: 1.5, y: 1.8, w: 9.6, h: 4.2,
              legendPos: 'b',
              showValue: false,
              dataLabelFormatCode: '[$$-en-US]#,##0',
              catAxisLabelColor: '562707',
              valAxisLabelColor: '562707',
            }
          );
        });
      
        // =================== SLIDES M..Z: BARRAS (una serie por slide) =================== //
        seriesConDatos.forEach((serie, idx) => {
          const slide = pptx.addSlide();
          addBrandHeader(
            slide,
            logoBase64,
            `Comparativa mensual – ${serie.label}`,
            'USD/TON NAL vs Bolsa N.Y. ' + (rango || '')
          );
      
          const vals = valuesToArray(serie.values || {});
          slide.addChart(
            pptx.ChartType.bar,
            [{ name: serie.label, labels: categorias, values: vals, color: palette[idx % palette.length] }],
            {
                x: 1.5, y: 1.8, w: 9.6, h: 4.2,
              legendPos: 'b',
              showValue: false,
              dataLabelFormatCode: '[$$-en-US]#,##0',
              barGrouping: 'clustered',
            }
          );
        });
      
        // =================== Guardar =================== //
        const fileName = `Comparativo_Cacao_${fechaInicio || 'sin-fecha'}_a_${fechaFinal || 'sin-fecha'}.pptx`;
        await pptx.writeFile({ fileName });
        } catch (error) {
            console.error('Error generando PPT:', error);
            throw error;
        }
      };
      
    // Función para renderizar los filtros según el tablero seleccionado
    const renderFiltrosTablero = () => {
        if (tableroSeleccionado === 'ESCENARIO POR TASA DE CRECIMIENTO' || tableroSeleccionado === 'ESCENARIO DE PRONOSTICO LINEAL') {
            return (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 mb-6'>
                    <AnimatedInput
                        label='Año actual'
                        type='number'
                        value={anoActual}
                        onChange={(e) => setAnoActual(e.target.value)}
                        name='año_actual'
                        required
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label='Períodos estadísticos'
                        type='number'
                        value={periodosEstadisticos}
                        onChange={(e) => setPeriodosEstadisticos(e.target.value)}
                        name='periodos_estadisticos'
                        required
                        darkMode={isDarkMode}
                    />
                </div>
            );
        } else {
            // Filtros para Tablero 1 y otros tableros
            return (
                <>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 mb-6'>
                        <AnimatedInput
                            label='Año de producción'
                            type='number'
                            value={anoProduccion}
                            onChange={(e) => setAnoProduccion(e.target.value)}
                            name='año_produccion'
                            required
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label='% Estimación de producción'
                            type='number'
                            value={estimacionProduccion}
                            onChange={(e) => setEstimacionProduccion(e.target.value)}
                            name='%_estimacion_produccion'
                            step="0.01"
                            required
                            darkMode={isDarkMode}
                        />
                    </div>

                    <AnimatedInput
                        label='Rendimiento de promedio nacional'
                        type='number'
                        value={rendimientoPromedioNacional}
                        onChange={(e) => setRendimientoPromedioNacional(e.target.value)}
                        name='rendimiento_promedio_nacional'
                        step="0.01"
                        required
                        darkMode={isDarkMode}
                    />
                </>
            );
        }
    };

    // Función para renderizar el tablero seleccionado
    const renderTableroSeleccionado = () => {
        const commonProps = { 
            transformarDatosParaTabla,
            tableroProduccionData,
            isLoadingTablero,
            onConsultar: handleConsultar
        };

        const tablero2Props = {
            seriesAnualesData,
            isLoadingSeriesAnuales,
            anoActual,
            periodosEstadisticos: parseInt(periodosEstadisticos) || 10
        };

        const tablero3Props = {
            seriesAnualesData,
            isLoadingSeriesAnuales,
            anoActual,
            periodosEstadisticos
        };

        switch (tableroSeleccionado) {
            case 'ESCENARIO POR AREAS DE PRODUCCION':
                return <Tablero1 {...commonProps} ref={tablero1Ref} />;
            case 'ESCENARIO POR TASA DE CRECIMIENTO':
                return <Tablero2 {...tablero2Props} ref={tablero2Ref} />;
            case 'ESCENARIO DE PRONOSTICO LINEAL':
                return <Tablero3 {...tablero3Props} ref={tablero3Ref} />;
            default:
                return <Tablero1 {...commonProps} ref={tablero1Ref} />;
        }
    };

    // Definir isDarkMode después de todos los hooks
    const isDarkMode = mounted && theme === 'dark';

    // Retorno condicional después de todos los hooks
    if (!mounted) return null;


    return (
        <div className="w-full max-w-full mx-auto p-3 sm:p-4 lg:p-6">
            <div className={`rounded-xl p-3 sm:p-4 lg:p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                    <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'hover:text-red-700 text-[rgb(var(--brown))]'}`}
                    >
                        &times;
                    </button>

                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-4 lg:my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    TABLERO DE ESTADISTICA DE ESTIMACION
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 mb-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Seleccione un tablero</h3>

                    <AnimatedSelect
                        label='Tablero'
                            options={['ESCENARIO POR AREAS DE PRODUCCION', 'ESCENARIO POR TASA DE CRECIMIENTO', 'ESCENARIO DE PRONOSTICO LINEAL'].map((tablero) => ({
                            key: tablero,
                            value: tablero,
                            title: tablero
                        }))}
                        value={tableroSeleccionado}
                        onChange={(e) => setTableroSeleccionado(e.target.value)}
                        name='tableroSeleccionado'
                        darkMode={isDarkMode}
                    />

                    {renderFiltrosTablero()}

                    <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-4 sm:mt-6'>  
                        <Button 
                            title='CONSULTAR'
                            onClick={handleConsultar} 
                            disabled={isLoading || isLoadingSerie || isLoadingTablero || isLoadingSeriesAnuales}
                            darkMode={isDarkMode}
                        />
                        <Button title='LIMPIAR' onClick={handleLimpiar} darkMode={isDarkMode} />
                        <Button
                            title='PPT'
                            onClick={async () => {
                                try {
                                    if (tableroSeleccionado === 'ESCENARIO POR AREAS DE PRODUCCION') {
                                        await tablero1Ref.current?.downloadPPT();
                                    } else if (tableroSeleccionado === 'ESCENARIO POR TASA DE CRECIMIENTO') {
                                        await tablero2Ref.current?.downloadPPT();
                                    } else if (tableroSeleccionado === 'ESCENARIO DE PRONOSTICO LINEAL') {
                                        await tablero3Ref.current?.downloadPPT();
                                    } else {
                                        // Si luego quieres PPT para Tablero3, aquí lo engancharías
                                        await handleDownloadPPT(); // tu PPT previo de NAL vs N.Y., si aún lo usas
                                    }
                                } catch (error) {
                                    console.error('Error descargando PPT:', error);
                                    setShowErrorAlert(true);
                                }
                            }}
                            darkMode={isDarkMode}
                        />
                        <Button title='SALIR' onClick={() => router.push('/')} darkMode={isDarkMode} />
                    </div>

                </div>

                {/* Sección de resultados con tableros dinámicos */}
                <div className="mt-4 sm:mt-6">
                    {/* Tarjetas solo para Tablero 1 */}
                    {tableroSeleccionado === 'ESCENARIO POR AREAS DE PRODUCCION' && (
                        <div className="mb-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                {/* Áreas de Producción */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'} rounded-lg px-4 py-3 shadow-sm text-center`}>
                                    <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        AREAS DE PRODUCCIÓN
                                    </div>
                                    <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        (Hectáreas)
                                    </div>
                                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                        {getTotalesData?.totalesRow?.anio_consultado ? 
                                            new Intl.NumberFormat('es-CO', { 
                                                minimumFractionDigits: 0, 
                                                maximumFractionDigits: 0 
                                            }).format(getTotalesData.totalesRow.anio_consultado) : 
                                            '0'
                                        }
                                    </div>
                                </div>

                                {/* Producción Rendimiento Censo */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'} rounded-lg px-4 py-3 shadow-sm text-center`}>
                                    <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        PRODUCCIÓN RENDIMIENTO CENSO
                                    </div>
                                    <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        (Toneladas)
                                    </div>
                                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                        {getTotalesData?.totalesRow?.produccion_ton_censo ? 
                                            new Intl.NumberFormat('es-CO', { 
                                                minimumFractionDigits: 0, 
                                                maximumFractionDigits: 0 
                                            }).format(getTotalesData.totalesRow.produccion_ton_censo) : 
                                            '0'
                                        }
                                    </div>
                                </div>

                                {/* Producción Estimada Kilos */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'} rounded-lg px-4 py-3 shadow-sm text-center`}>
                                    <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        PRODUCCIÓN ESTIMADA
                                    </div>
                                    <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        (Kilos)
                                    </div>
                                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                        {getTotalesData?.totalesRow?.produccion_kilos ? 
                                            new Intl.NumberFormat('es-CO', { 
                                                minimumFractionDigits: 0, 
                                                maximumFractionDigits: 0 
                                            }).format(getTotalesData.totalesRow.produccion_kilos) : 
                                            '0'
                                        }
                                    </div>
                                </div>

                                {/* Producción Estimada Toneladas */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'} rounded-lg px-4 py-3 shadow-sm text-center`}>
                                    <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        PRODUCCIÓN ESTIMADA
                                    </div>
                                    <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        (Toneladas)
                                    </div>
                                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                        {getTotalesData?.totalesRow?.produccion_ton ? 
                                            new Intl.NumberFormat('es-CO', { 
                                                minimumFractionDigits: 0, 
                                                maximumFractionDigits: 0 
                                            }).format(getTotalesData.totalesRow.produccion_ton) : 
                                            '0'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <AlertError 
                         isOpen={showErrorAlert}
                         message={error || errorSerie || errorTablero || errorSeriesAnuales || 'Por favor complete todos los campos requeridos.'}
                         onClose={() => setShowErrorAlert(false)}
                         autoCloseMs={8000}
                     />
   
                    {/* Indicador de carga */}
                    {(isLoading || isLoadingSerie || isLoadingTablero || isLoadingSeriesAnuales) && (
                        <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-6 text-center mb-6`}>
                            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? 'border-white' : 'border-[rgb(var(--brown))]'}`}></div>
                            <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando datos...</p>
                        </div>
                    )}

                    {/* Renderizado dinámico del tablero seleccionado */}
                    {renderTableroSeleccionado()}
                </div>
            </div>
        </div>
    );
};
  
export default ProduccionNacionalCacaoTablero;
  