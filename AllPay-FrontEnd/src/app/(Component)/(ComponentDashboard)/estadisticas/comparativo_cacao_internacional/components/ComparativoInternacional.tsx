'use client';

// react
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
// import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ConsolidatedTable from '@/presenters/components/ui/ConsolidatedTable';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import { useComparativoInternacional } from '../hooks/useComparativoInternacional';
import { useSerieNalNy } from '../hooks/useSerieNalNy';
import { ParamsComparativo } from '../models/comparativo.models';
import { ParamsSerieNalNy } from '../models/serie-nal-ny.models';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, BarChart, PieChart, LineChart, CanvasRenderer]);

// Tipo para las variaciones digitadas por el usuario
interface VariacionDigitada {
    mes: string;
    var_ton_pct: number;
    var_abs: number;
    var_pct: number;
}

function ComparativoInternacional() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    // Hook principal para comparativo internacional
    const { data: comparativoData, loading: isLoading, error, fetchData, resetData } = useComparativoInternacional();
    
    // Hook para serie NAL vs N.Y.
    const { data: serieNalNyData, loading: isLoadingSerie, error: errorSerie, fetchData: fetchSerieData, resetData: resetSerieData } = useSerieNalNy();
    
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

    // Nuevos estados para variaciones digitadas
    const [, setVariacionesDigitadas] = useState<VariacionDigitada[]>([]);
    const [, setUsarVariacionesDigitadas] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // (sin uso por ahora)
    const MONTHS_ORDER = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

    const normMonth3 = (s: string) => (s || '').slice(0,3).toUpperCase();



    // A partir de la respuesta, construye la unión de meses presentes en categorias y en todas las series.values
    const buildUnifiedCategories = (serieNalNyData?: any): string[] => {
        const set = new Set<string>();

        // 1) categorias del API (si vienen)
        (serieNalNyData?.data?.categorias || []).forEach((m: string) => set.add(normMonth3(m)));

        // 2) todas las claves de las series.values
        (serieNalNyData?.data?.series || []).forEach((serie: any) => {
            Object.keys(serie?.values || {}).forEach((k) => set.add(normMonth3(k)));
        });

        // 3) ordenar por MONTHS_ORDER y devolver
        const union = MONTHS_ORDER.filter((m) => set.has(m));
        return union.length ? union : MONTHS_ORDER; // fallback si no hay nada
    };

    // Alinea una serie de valores (objeto { ene: number|null, ... }) al eje 'cats'
    const alignValuesToCats = (values: Record<string, any> | undefined, cats: string[]) => {
        const byLower = Object.fromEntries(
            Object.entries(values || {}).map(([k, v]) => [normMonth3(k).toLowerCase(), v])
        );
        return cats.map((m) => {
            const v = byLower[m.toLowerCase()];
            return v === undefined || v === null ? null : Number(v);
        });
    };


    // Cargar tipos de cargue (una sola vez)
    useEffect(() => {
        if (token && !isLoadingTiposCargue) {
            fetchTiposCargue(token);
        }
    }, [token, fetchTiposCargue, isLoadingTiposCargue]);

    // Hidratación
    useEffect(() => {
        setMounted(true);
    }, []);

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error || errorSerie) setShowErrorAlert(true);
    }, [error, errorSerie]);

    // Definir isDarkMode después de la hidratación
    const isDarkMode = mounted && theme === 'dark';

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

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {
        if (!fechaInicio || !fechaFinal) {
            setShowErrorAlert(true);
            return;
        }

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
        resetData(); // Limpia los datos del hook
        resetSerieData(); // Limpia los datos de la serie
    };


    // Función para transformar los datos del API a la tabla
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

        // Agregar fila de totales
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
        // Logo arriba-izquierda
        slide.addImage({ data: logoBase64, x: 0.2, y: 0.2, w: 1.4, h: 0.8 });
      
        // Título centrado
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
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE'; // 10 x 5.625
        const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
      
        // Rango de fechas para subtítulos
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
      };
      
    // Nueva gráfica de evolución mensual del precio de cacao (contenedor 2)
    const MultiSeriesComparisonChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current) return;
            chartInstance.current = echarts.init(chartRef.current, null, {
                renderer: 'canvas',
                useDirtyRect: false
            });

            

            let categorias: string[] = [];
let series: any[] = [];

if (serieNalNyData?.data) {
  categorias = buildUnifiedCategories(serieNalNyData);

  series = (serieNalNyData.data.series || []).map((s: any) => ({
    name: s.label,
    type: 'line',
    data: alignValuesToCats(s.values, categorias),
    markPoint: {
      symbol: 'pin',
      symbolSize: 75,
      label: {
        fontWeight: 'bold',
        color: '#FFFFFF',
        formatter: (p: any) => `$${Number(p.value).toLocaleString('en-US')}`
      },
      data: [{ type: 'max', name: 'Máximo' }, { type: 'min', name: 'Mínimo' }]
    },
    markLine: { label: { formatter: (p: any) => `$${Number(p.value).toLocaleString('en-US')}` }, data: [{ type: 'average' }] }
  }));
} else {
  categorias = MONTHS_ORDER;
  series = [{
    name: 'USD/TON NAL (US$) 1P',
    type: 'line',
    data: Array(12).fill(0),
    markPoint: {
      symbol: 'pin',
      symbolSize: 75,
      label: { fontWeight: 'bold', color: '#FFFFFF', formatter: (p: any) => `$${Number(p.value).toLocaleString('en-US')}` },
      data: [{ type: 'max', name: 'Máximo' }, { type: 'min', name: 'Mínimo' }]
    },
    markLine: { label: { formatter: (p: any) => `$${Number(p.value).toLocaleString('en-US')}` }, data: [{ type: 'average' }] }
  }];
}

            const option: echarts.EChartsCoreOption = {
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                title: { 
                    text: 'EVOLUCIÓN MENSUAL DEL PRECIO DE CACAO',
                    subtext: 'USD/TON NAL vs BOLSA N.Y.',
                    left: 'center',
                    textStyle: {
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    subtextStyle: {
                        fontSize: 16,
                        color: isDarkMode ? '#d1d5db' : '#562707',
                        fontWeight: 'bold'
                    }
                },
                tooltip: { 
                    trigger: 'axis',
                    backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#333'
                    },
                    formatter: (params: any) => {
                        let t = `<b>${params[0].axisValue}</b><br/>`;
                        params.forEach((p: any) => {
                            t += `${p.marker} ${p.seriesName}: <b>$${Number(p.value).toLocaleString('en-US')}</b><br/>`;
                        });
                        return t;
                    }
                },
                legend: {
                    top: 70,
                    data: series.map(s => s.name),
                    textStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#562707' 
                    }
                },
                color: ['#FA9C05','#57ABF7','#A633B8','#8D9761'],
                grid: { left: '3%', right: '7%', top: '20%', bottom: '3%', containLabel: true }, 
                toolbox: { feature: { saveAsImage: {} } },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: categorias,
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
                    axisLabel: { 
                        formatter: (v: number) => `$${Number(v).toLocaleString('en-US')}`,
                        color: isDarkMode ? '#f3f4f6' : '#562707',
                        fontWeight: 'bold'
                    },
                    splitLine: { 
                        lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } 
                    }
                },
                series: series
            };

            chartInstance.current.setOption(option);

            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                chartInstance.current?.dispose();
            };
        }, [serieNalNyData, isDarkMode]);

        return (
            <div className="w-full">
                <div className="h-[600px] w-full">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

        // Nueva gráfica de barras comparativas para contenedor 3
    const BarComparisonChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);
        const [showMP, setShowMP] = React.useState<boolean>(true);

        React.useEffect(() => {
            if (!chartRef.current) return;
            chartInstance.current = echarts.init(chartRef.current, null, {
                renderer: 'canvas',
                useDirtyRect: false
            });

            let meses: string[] = [];
            let seriesRaw: any[] = [];
            
            if (serieNalNyData?.data) {
              meses = buildUnifiedCategories(serieNalNyData);
              seriesRaw = (serieNalNyData.data.series || []).map((s: any) => ({
                name: s.label,
                data: alignValuesToCats(s.values, meses)
              }));
            } else {
              meses = MONTHS_ORDER;
              seriesRaw = [
                { name: 'USD/TON NAL (US$) 1P', data: Array(12).fill(0) },
                { name: 'USD/TON N.Y. (US$) 1P', data: Array(12).fill(0) },
                { name: 'USD/TON NAL (US$) 2P', data: Array(12).fill(0) },
                { name: 'USD/TON N.Y. (US$) 2P', data: Array(12).fill(0) }
              ];
            }
            

            // Estilo de pin para máx/mín
            const mp = {
                symbol: 'pin',
                symbolSize: 75,
                label: {
                    formatter: (p: any) => `$${Number(p.value).toLocaleString('en-US')}`,
                    color: '#fff',
                    fontWeight: 'bold'
                },
                data: [{ type: 'max', name: 'Max' }, { type: 'min', name: 'Min' }]
            };

            // Helper: arma las series con o sin markPoint
            const getSeries = (useMP: boolean) => {
                const base = (name: string, data: (number|null)[], barGap0: boolean = false) => ({
                  name,
                  type: 'bar',
                  data,
                  emphasis: { focus: 'series' },
                  label: { show: false },
                  ...(barGap0 ? { barGap: 0 } : {}),
                  ...(useMP ? { markPoint: mp } : {}),
                });
              
                return seriesRaw.map((s, index) => base(s.name, s.data, index === 0));
              };

            const option: echarts.EChartsCoreOption = {
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                title: {
                    text: 'ESTADISTICA COMPARATIVA PRECIO DEL CACAO',
                    subtext: 'USD/TON NAL vs BOLSA DE N.Y.',
                    left: 'center',
                    top: '2%',
                    textStyle: {
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    subtextStyle: {
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: isDarkMode ? '#d1d5db' : '#562707'
                    }
                },
                color: ['#8D9761','#085599','#ECAE4D','#7DA9E5','#F5D505', '#5B3521'],
                tooltip: { 
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#333'
                    },
                    formatter: function (params: any) {
                        let t = `<b>${params[0].axisValue}</b><br/>`;
                        params.forEach((p: any) => {
                            t += `${p.marker} ${p.seriesName}: <b>$${Number(p.value).toLocaleString('en-US')}</b><br/>`;
                        });
                        return t;
                    }
                },
                legend: { 
                    top: '70',
                    data: seriesRaw.map(s => s.name),
                    textStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#562707' 
                    }
                },
                toolbox: {
                    show: true, 
                    orient: 'vertical', 
                    left: 'right', 
                    top: 'center',
                    feature: {
                        myToggleMP: {
                            show: true,
                            title: 'Mostrar/Ocultar Máx-Mín',
                            icon: 'path://M3,10 H21 M7,6 A4,4 0 1 0 7,14 A4,4 0 1 0 7,6 Z M17,6 A4,4 0 1 1 17,14 A4,4 0 1 1 17,6 Z',
                            onclick: function () {
                                setShowMP(!showMP);
                                if (chartInstance.current) {
                                    chartInstance.current.setOption({ series: getSeries(!showMP) });
                                }
                            }
                        },
                        dataView: { show: true, readOnly: false },
                        magicType: { show: true, type: ['line','bar','stack'] },
                        restore: { show: true },
                        saveAsImage: { show: true }
                    }
                },
                grid: { top: '20%', left: '4%', right: '2%', bottom: '2%', containLabel: true },
                xAxis: [{ 
                    type: 'category', 
                    axisTick: { show: false },
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    data: meses,
                    axisLabel: { 
                        color: isDarkMode ? '#f3f4f6' : '#562707', 
                        fontWeight: 'bold' 
                    }
                }],
                yAxis: [{
                    type: 'value',
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                        formatter: (v: number) => `$${Number(v).toLocaleString('en-US')}`,
                        color: isDarkMode ? '#f3f4f6' : '#562707',
                        fontWeight: 'bold'
                    },
                    splitLine: { 
                        lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } 
                    }
                }],
                series: getSeries(showMP)
            };

            chartInstance.current.setOption(option);

            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                chartInstance.current?.dispose();
            };
        }, [showMP, serieNalNyData, isDarkMode]);

        return (
            <div className="w-full">
                <div className="h-[600px] w-full">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    const [paginaConsolidado, setPaginaConsolidado] = useState<number>(1);

    const formatCurrency = (v: number, digits = 0) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v || 0);
    const formatPercent = (v: number, digits = 1) => `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v || 0)}%`;
    const formatUSD = (v: number, digits = 3) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v || 0);

    // Función para renderizar valores con manejo de nulos
    const renderValue = (value: any, formatter: (v: number) => string) => {
        if (value === null || value === undefined) return '-';
        return formatter(value);
    };

    // Columnas de la nueva tabla consolidada
    const headerColumnsConsolidado = useMemo(() => {
        return [
            { key: 'mes', label: 'Mes' },
            {
                key: 'periodo_2024',
                label: 'PERIODO 1',
                subColumns: [
                    { key: 'nal_2024', label: 'NAL ($ COP)', render: (v: any) => renderValue(v, formatCurrency) },
                    { key: 'usd_ton_nal_2024', label: 'USD/TON NAL (US$)', render: (v: any) => renderValue(v, formatUSD) },
                    { key: 'usd_ton_ny_2024', label: 'USD/TON N.Y. (US$)', render: (v: any) => renderValue(v, formatUSD) },
                    { key: 'diferencia_2024', label: 'Diferencia (%)', render: (v: any) => renderValue(v, formatPercent) },
                    { key: 'trm_promedio_2024', label: 'TRM Promedio ($ COP)', render: (v: any) => renderValue(v, formatUSD) }
                ]
            },
            {
                key: 'periodo_2025',
                label: 'PERIODO 2',
                subColumns: [
                    { key: 'nal_2025', label: 'NAL ($ COP)', render: (v: any) => renderValue(v, formatCurrency) },
                    { key: 'usd_ton_nal_2025', label: 'USD/TON NAL (US$)', render: (v: any) => renderValue(v, formatUSD) },
                    { key: 'usd_ton_ny_2025', label: 'USD/TON N.Y. (US$)', render: (v: any) => renderValue(v, formatUSD) },
                    { key: 'diferencia_2025', label: 'Diferencia (%)', render: (v: any) => renderValue(v, formatPercent) },
                    { key: 'trm_promedio_2025', label: 'TRM Promedio ($ COP)', render: (v: any) => renderValue(v, formatUSD) }
                ]
            }
        ];
    }, []);

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

                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-4 lg:my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    TABLERO DE PRECIO PROMEDIO DE CACAO BOLSA NY VS USD NACIONAL
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}></h3>

                    {/* Filtros - versión inspirada en la maqueta de la imagen */}
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4'>
                        {/* Periodo de producción Año 1 */}
                        <div className={`border rounded-xl p-4 w-full mx-auto ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}>
                            <div className={`text-center font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                PERIODO DE PRODUCCIÓN 1
                            </div>
                            <div className='grid grid-cols-1 gap-3 '>
                        <AnimatedInput
                                    label='Fecha de Inicio'
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
                        </div>

                        {/* Periodo de producción Año 2 */}
                        <div className={`border rounded-xl p-4 w-full mx-auto ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}>
                            <div className={`text-center font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                PERIODO DE PRODUCCIÓN 2
                            </div>
                            <div className='grid grid-cols-1 gap-3'>
                                                                 <AnimatedInput
                                     label='Fecha de Inicio'
                                     type='date'
                                     value={fechaInicio2}
                                     onChange={(e) => setFechaInicio2(e.target.value)}
                                     name='fecha_inicio_2'
                                     darkMode={isDarkMode}
                                 />
                                 <AnimatedInput
                                     label='Fecha Final'
                                     type='date'
                                     value={fechaFinal2}
                                     onChange={(e) => setFechaFinal2(e.target.value)}
                                     name='fecha_final_2'
                                     darkMode={isDarkMode}
                                 />
                            </div>
                        </div>
                    </div>

                    <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-4 sm:mt-6'>  
                        <Button 
                            title='CONSULTAR'
                            onClick={handleConsultar} 
                            disabled={isLoading}
                        />
                        <Button title='LIMPIAR' onClick={handleLimpiar} />
                        <Button title='PPT' onClick={handleDownloadPPT} />
                        <Button title='SALIR' onClick={() => router.push('/')} />
                    </div>

                </div>

                {/* Sección de resultados con gráficas y tablas */}
                <div className="mt-4 sm:mt-6">
                    <div className="text-center my-4 sm:my-6">
                        <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                        COMPARATIVO PRECIO PROMEDIO DE CACAO NACIONAL vs N.Y
                        </h2>
               
                    </div>

                 {/* Valores resultado */}

                 <div className="mb-6">
      
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
                         {/* Promedio Bolsa N.Y. */}
                         <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 PROMEDIO BOLSA N.Y
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (USD)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#562707]'}`}>
                             {serieNalNyData?.data.cards.promedio_bolsa_ny ? 
                                     new Intl.NumberFormat('en-US', { 
                                         style: 'currency', 
                                         currency: 'USD', 
                                         minimumFractionDigits: 0, 
                                         maximumFractionDigits: 0 
                                     }).format(serieNalNyData.data.cards.promedio_bolsa_ny) : 
                                     '$0'
                                 }
                             </div>
                         </div>

                         {/* Máximo */}
                         <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 MAXIMO
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (USD)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#562707]'}`}>
                             {serieNalNyData?.data.cards.maximo_ny ? 
                                     new Intl.NumberFormat('en-US', { 
                                         style: 'currency', 
                                         currency: 'USD', 
                                         minimumFractionDigits: 0, 
                                         maximumFractionDigits: 0 
                                     }).format(serieNalNyData.data.cards.maximo_ny) : 
                                     '$0'
                                 }
                             </div>
                         </div>

                         {/* Mínimo */}
                         <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 MINIMO
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (USD)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#562707]'}`}>
                                {serieNalNyData?.data.cards.minimo_ny ? 
                                     new Intl.NumberFormat('en-US', { 
                                         style: 'currency', 
                                         currency: 'USD', 
                                         minimumFractionDigits: 0, 
                                         maximumFractionDigits: 0 
                                     }).format(serieNalNyData.data.cards.minimo_ny) : 
                                     '$0'
                                 }
                             </div>
                         </div>

                         {/* Valor Absoluto */}
                         <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 VALOR ABS
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (USD)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#562707]'}`}>
                                 {serieNalNyData?.data.cards.valor_abs ? 
                                     new Intl.NumberFormat('en-US', { 
                                         style: 'currency', 
                                         currency: 'USD', 
                                         minimumFractionDigits: 0, 
                                         maximumFractionDigits: 0 
                                     }).format(serieNalNyData.data.cards.valor_abs) : 
                                     '$0'
                                 }
                             </div>
                         </div>

                         {/* Variación Porcentual */}
                         <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 VARIACION
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (%)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#562707]'}`}>
                                 {serieNalNyData?.data.cards.variacion_pct ? 
                                     `${serieNalNyData.data.cards.variacion_pct.toFixed(1)}%` : 
                                     '0%'
                                 }
                             </div>
                         </div>
                     </div>
                 </div>



                    <AlertError 
                         isOpen={showErrorAlert}
                         message={error || errorSerie || 'No puede tener activos ambos switches "Calcular Variación" y "Digitar Variación" al mismo tiempo. Desactive uno antes de activar el otro.'}
                         onClose={() => setShowErrorAlert(false)}
                         autoCloseMs={8000}
                     />

                    {/* Layout principal: Contenedores separados */}
                    <div className="space-y-4 sm:space-y-6">
   
                        {/* Indicador de carga */}
                        {(isLoading || isLoadingSerie) && (
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-6 text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? 'border-white' : 'border-[rgb(var(--brown))]'}`}></div>
                                <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando datos...</p>
                            </div>
                        )}

                        {/* Contenedor 1 */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                     
                            <ConsolidatedTable
                                headerColumns={headerColumnsConsolidado as any}
                                data={transformarDatosParaTabla as any}
                                currentPage={paginaConsolidado}
                                totalPages={1}
                                onPageChange={setPaginaConsolidado}
                               
                            />
                        </div>

                        {/* Contenedor 2 */}
                        
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="col-span-1 lg:col-span-2">
                                        <MultiSeriesComparisonChart />
                                    </div>
                                </div>
                            </div>
                        

                        {/* Contenedor 3: */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <BarComparisonChart />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default ComparativoInternacional;
  