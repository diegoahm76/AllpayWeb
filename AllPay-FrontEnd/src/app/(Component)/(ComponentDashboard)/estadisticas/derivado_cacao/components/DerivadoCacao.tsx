'use client';

// react
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import ToggleSwitch from '@/presenters/components/ui/ToggleSwitch';
import DynamicTable from '@/presenters/components/ui/DynamicTable';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import useTableroControlSicexPos from '@/app/(Component)/(ComponentDashboard)/estadisticas/derivado_cacao/hooks/useTableroControlSicexPos';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, BarChart, PieChart, CanvasRenderer]);

    

function DerivadoCacao() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    // Hook principal (POS) - reemplaza al mensual
    const { data, isLoading, error, fetchTablero, clearData } = useTableroControlSicexPos();
    const { tiposCargue, isLoading: isLoadingTiposCargue, fetchTiposCargue } = useTiposCargue();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [tipoCargueSeleccionado, setTipoCargueSeleccionado] = useState<string>('EXP');
    const [toggleEnabled, setToggleEnabled] = useState<boolean>(false);
    const [isClient, setIsClient] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // Hook para verificar que estamos en el lado del cliente
    useEffect(() => {
        setIsClient(true);
        setMounted(true);
    }, []);

    // Cargar tipos de cargue (una sola vez)
    useEffect(() => {
        if (token && !isLoadingTiposCargue) {
            fetchTiposCargue(token);
        }
    }, [token, fetchTiposCargue, isLoadingTiposCargue]);

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error) setShowErrorAlert(true);
    }, [error]);

    // Datos de prueba para la tabla tipo "Consolidado por Partidas"
    const [paginaTablaPartidas, setPaginaTablaPartidas] = useState<number>(1);

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

        await fetchTablero(token, {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
            tipo_cargue: tipoCargueSeleccionado || 'EXP',
            comparativo_periodos: toggleEnabled ? 'SI' : undefined
        });
    };

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setTipoCargueSeleccionado('EXP');
        setToggleEnabled(false);
        clearData();
    };
    
    // Función para descargar un PPTX completo (neutralizada en esta vista)
    const handleDescargarGraficaCompleta = async () => {
        if (!isClient) return;

        const principal = data?.tabla_principal || [];
        const periodos = data?.data_periodos;
        const p1 = periodos?.periodo_1?.tabla_periodo || [];
        const p2 = periodos?.periodo_2?.tabla_periodo || [];
        const p3 = periodos?.periodo_3?.tabla_periodo || [];
        const p4 = periodos?.periodo_4?.tabla_periodo || [];

        const hasPrincipal = principal.length > 0;
        const hasPeriodos = [p1, p2, p3, p4].some(arr => arr.length > 0);

        if (!hasPrincipal && !hasPeriodos) {
            return;
        }

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

        const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
        const pptx = new PptxGenJS();
        const tituloColor = '562707'; // hex without '#'
        const titleExport = tipoCargueSeleccionado === 'IMP' ? 'Importaciones' : 'Exportaciones';

        // Slide 1: Consolidado por Posición (tabla_principal)
        if (hasPrincipal) {
            const slide1 = pptx.addSlide();

            slide1.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            slide1.addText(`Consolidado por Posición - ${titleExport}`, {
                x: 2.2, y: 0.3, fontSize: 20, bold: true, color: tituloColor, align: 'center'
            });

            const categorias = principal.map((i: any) => i.pos);
            const valores = principal.map((i: any) => Number(i.total_toneladas_neto) || 0);
            const maxVal = valores.length ? Math.max(...valores) : 0;
            const valAxisMaxVal = maxVal > 0 ? Math.ceil(maxVal * 1.2) : 10;

            slide1.addChart(pptx.ChartType.bar, [
                { name: 'Toneladas', labels: categorias, values: valores }
            ], {
                x: 0.5, y: 1.5, w: 9, h: 3.2,
                showLegend: false,
                chartColors: ['50a42c'],
                valAxisMaxVal,
                valAxisLabelFormatCode: '0',
                dataLabelFormatCode: '0',
                dataLabelPosition: 'outEnd'
            });

            // Tabla de posiciones (No., Posición, Toneladas, %)
            const total = valores.reduce((a, b) => a + b, 0);

            const numFmt = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const rows = principal.map((row: any, idx: number) => [
                idx + 1,
                row.pos,
                numFmt.format(Math.round(Number(row.total_toneladas_neto) || 0)),
                `${Math.round(Number(row.porcentaje) || 0)}%`
            ]);
            rows.push([
                { text: 'TOTAL', options: { bold: true } },
                '',
                { text: numFmt.format(Math.round(total)), options: { bold: true } },
                ''
            ]);

        }

        // Preparar categorías para períodos (orden como en tabla_principal y luego restantes)
        const baseCats = (data?.tabla_principal || []).map((r: any) => r.pos);
        const setCats = new Set<string>(baseCats);
        [p1, p2, p3, p4].forEach(arr => arr.forEach((r: any) => setCats.add(r.pos)));
        const extras = Array.from(setCats).filter(c => !baseCats.includes(c)).sort();
        const categoriasOrdenadas = [...baseCats, ...extras];

        // Slide 2: Comparativo por Posición (Períodos)
        if (hasPeriodos && categoriasOrdenadas.length > 0) {
            const slide2 = pptx.addSlide();

            slide2.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            slide2.addText('Comparativo por Posición (Períodos)', {
                x: 2.2, y: 0.3, fontSize: 20, bold: true, color: tituloColor, align: 'center'
            });

            const mapToValues = (src: any[]) => categoriasOrdenadas.map(pos => {
                const found = src.find((r: any) => r.pos === pos);
                return found ? Number(found.total_toneladas_neto) || 0 : 0;
            });

            const series: any[] = [];
            if (p1.length) series.push({ name: 'Período 1', labels: categoriasOrdenadas, values: mapToValues(p1) });
            if (p2.length) series.push({ name: 'Período 2', labels: categoriasOrdenadas, values: mapToValues(p2) });
            if (p3.length) series.push({ name: 'Período 3', labels: categoriasOrdenadas, values: mapToValues(p3) });
            if (p4.length) series.push({ name: 'Período 4', labels: categoriasOrdenadas, values: mapToValues(p4) });

            const allVals = series.flatMap(s => s.values);
            const maxVal = allVals.length ? Math.max(...allVals) : 0;
            const valAxisMaxVal = maxVal > 0 ? Math.ceil(maxVal * 1.2) : 10;

            slide2.addChart(pptx.ChartType.bar, series, {
                x: 0.5, y: 0.9, w: 9, h: 3.4,
                showLegend: true,
                legendPos: 't',
                chartColors: ['f59e0b', '3b82f6', '22c55e', 'eab308'],
                valAxisMaxVal,
                valAxisLabelFormatCode: '0'
            });
        }

        // Slide 3: Tabla comparativa (TON y FOB por período)
        // Utilizamos las estructuras ya calculadas en el componente: periodosTabla, categoriasTabla, datosPartidasDemo
        const tieneTablaPeriodos = Array.isArray(datosPartidasDemo) && datosPartidasDemo.length > 0;
        if (tieneTablaPeriodos) {
            const slide3 = pptx.addSlide();

            slide3.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            slide3.addText('Comparativo por Posición (Tabla)', {
                x: 2.2, y: 0.3, fontSize: 20, bold: true, color: tituloColor, align: 'center'
            });

            // Encabezados dinámicos: PARTIDA + (TON pX, FOB (US$) pX)*
            const headers: any[] = [{ text: 'PARTIDA', options: { bold: true } }];
            periodosTabla.forEach((_p: any, idx: number) => {
                const suf = `p${idx + 1}`;
                headers.push({ text: `TON ${suf}`, options: { bold: true } });
                headers.push({ text: `FOB (US$) ${suf}`, options: { bold: true } });
            });

            const tonFmt = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const usdFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

            const body = datosPartidasDemo.map((row: any) => {
                const cells: any[] = [row.partida];
                periodosTabla.forEach((_p: any, idx: number) => {
                    const suf = `p${idx + 1}`;
                    cells.push(tonFmt.format(Math.round(Number(row[`ton_${suf}`]) || 0)));
                    cells.push(usdFmt.format(Math.round(Number(row[`fob_${suf}`]) || 0)));
                });
                return cells;
            });

            slide3.addTable([headers, ...body], {
                x: 0.6, y: 1.5, w: 9,
                fontSize: 9,
                border: { type: 'solid', color: '000000', pt: 1 }
            });
        }

        const safeInicio = fechaInicio || 'sin_fecha';
        const safeFin = fechaFinal || 'sin_fecha';
        const fileName = `Derivados_Cacao_${titleExport}_${safeInicio}_a_${safeFin}.pptx`;
        await pptx.writeFile({ fileName });
    };

    // Gráfico de barras para contenedor 1 usando data.tabla_principal
    const TestPositionsBarChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;
            chartInstance.current = echarts.init(chartRef.current);

            const principal = data?.tabla_principal || [];
            const categorias = principal.map((i: any) => i.pos);
            const valores = principal.map((i: any) => i.total_toneladas_neto);

            if (categorias.length === 0) {
                const options: echarts.EChartsCoreOption = {
                    grid: { top: 50, left: 60, right: 20, bottom: 60 },
                    xAxis: { type: 'category', data: [] },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: [] }],
                    graphic: { type: 'text', left: 'center', top: 'middle', style: { text: 'No hay datos disponibles', fontSize: 16, fill: '#999' } }
                };
                chartInstance.current.setOption(options);
                return;
            }

            const options: echarts.EChartsCoreOption = {
                grid: { top: 50, left: 60, right: 20, bottom: 60 },
                title: {
                    text: 'CONSOLIDADO POR POSICIONES',
                    left: 'center',
                    top: 10,
                    textStyle: { color: isDarkMode ? '#ffffff' : '#562707', fontSize: 14, fontWeight: 'bold' }
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
                                line: 'Cambiar a Línea',
                                bar: 'Cambiar a Barras',
                                stack: 'Cambiar a Apilado'
                            }
                        },
                        restore: { 
                            show: true,
                            title: 'Restaurar'
                        },
                        saveAsImage: { 
                            show: true,
                            title: 'Descargar como Imagen',
                            name: 'consolidado_posiciones_derivados'
                        }
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'line' },
                    formatter: (params: any) => {
                        const p = params[0];
                        return `${p.name}: ${new Intl.NumberFormat('es-CO', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(Math.round(p.value))} t`;
                    }
                },
                xAxis: {
                    type: 'category',
                    data: categorias,
                    axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                    axisTick: { show: false },
                    axisLabel: { color: isDarkMode ? '#ffffff' : '#374151', fontSize: 10, fontWeight: 600, rotate: 0 }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                    axisTick: { show: false },
                    splitLine: { lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } },
                    axisLabel: {
                        color: isDarkMode ? '#ffffff' : '#6b7280',
                        fontSize: 10,
                        formatter: (value: number) => new Intl.NumberFormat('es-CO', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(value)
                    }
                },
                series: [
                    {
                        name: 'Toneladas',
                        type: 'bar',
                        data: valores,
                        barWidth: '40%',
                        itemStyle: { color: '#50a42c', borderRadius: [4, 4, 0, 0] },
                        label: {
                            show: true,
                            position: 'top',
                            color: isDarkMode ? '#ffffff' : '#111827',
                            fontSize: 10,
                            formatter: ({ value }: any) => new Intl.NumberFormat('es-CO', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(Math.round(value))
                        }
                    }
                ],
                animation: true
            };

            chartInstance.current.setOption(options);
            return () => { chartInstance.current?.dispose(); };
        }, [data, isClient, isDarkMode]);

        React.useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="w-full">
                <div className="h-[280px] sm:h-[350px] lg:h-[600px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // Gráfica multiserie para contenedor intermedio usando data.data_periodos
    const MultiSeriesComparisonChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;
            chartInstance.current = echarts.init(chartRef.current);

            const periodos = data?.data_periodos;
            const p1 = periodos?.periodo_1?.tabla_periodo || [];
            const p2 = periodos?.periodo_2?.tabla_periodo || [];
            const p3 = periodos?.periodo_3?.tabla_periodo || [];
            const p4 = periodos?.periodo_4?.tabla_periodo || [];

            // Categorías: basadas en tabla_principal (orden visible) y completadas con posiciones de periodos
            const baseCats = (data?.tabla_principal || []).map((r: any) => r.pos);
            const setCat = new Set<string>(baseCats);
            [p1, p2, p3, p4].forEach(arr => arr.forEach((r: any) => setCat.add(r.pos)));
            const categorias = Array.from(setCat);
            // Mantener el orden de baseCats primero y luego el resto ordenado
            const resto = categorias.filter(c => !baseCats.includes(c)).sort();
            const categoriasOrdenadas = [...baseCats, ...resto];

            if (categoriasOrdenadas.length === 0) {
                const options: echarts.EChartsCoreOption = {
                    grid: { top: 60, left: 60, right: 20, bottom: 60 },
                    xAxis: { type: 'category', data: [] },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: [] }],
                    graphic: { type: 'text', left: 'center', top: 'middle', style: { text: 'No hay datos disponibles', fontSize: 16, fill: '#999' } }
                };
                chartInstance.current.setOption(options);
                return;
            }

            const mapToValues = (src: any[]) => categoriasOrdenadas.map(pos => {
                const found = src.find((r: any) => r.pos === pos);
                return found ? found.total_toneladas_neto : 0;
            });

            const posiblesSeries = [
                { name: 'Período 1', data: mapToValues(p1), length: p1.length },
                { name: 'Período 2', data: mapToValues(p2), length: p2.length },
                { name: 'Período 3', data: mapToValues(p3), length: p3.length },
                { name: 'Período 4', data: mapToValues(p4), length: p4.length }
            ];
            const seriesData = posiblesSeries.filter(s => s.length > 0);

            const LABEL_DISTANCE_PX = 15;
            const labelOption: any = {
                show: true,
                position: 'insideBottom',
                distance: LABEL_DISTANCE_PX,
                align: 'left',
                verticalAlign: 'middle',
                rotate: 90,
                fontSize: 12,
                color: isDarkMode ? '#ffffff' : '#111827',
                // Similar al ejemplo: '{c}  {name|{a}}'
                formatter: ({ value, seriesName }: any) => `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))}  ${seriesName}`,
                rich: { name: {} }
            };

            const options: echarts.EChartsCoreOption = {
                grid: { top: 60, left: 60, right: 20, bottom: 60 },
                title: { text: 'COMPARATIVO POR POSICIÓN (PERÍODOS)', left: 'center', top: 10, textStyle: { color: isDarkMode ? '#ffffff' : '#562707', fontSize: 16, fontWeight: 'bold' } },
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
                                line: 'Cambiar a Línea',
                                bar: 'Cambiar a Barras',
                                stack: 'Cambiar a Apilado'
                            }
                        },
                        restore: { 
                            show: true,
                            title: 'Restaurar'
                        },
                        saveAsImage: { 
                            show: true,
                            title: 'Descargar como Imagen',
                            name: 'comparativo_posiciones_periodos_derivados'
                        }
                    }
                },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => params.map((p: any) => `${p.marker} ${p.seriesName}: ${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(p.value))} t`).join('<br/>') },
                legend: { data: seriesData.map(s => s.name), top: 34, textStyle: { color: isDarkMode ? '#ffffff' : '#374151', fontSize: 11 } },
                xAxis: [{ type: 'category', axisTick: { show: false }, data: categoriasOrdenadas, axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } }, axisLabel: { color: isDarkMode ? '#ffffff' : '#374151', fontSize: 10, fontWeight: 600 } }],
                yAxis: [{ type: 'value', axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } }, axisLabel: { color: isDarkMode ? '#ffffff' : '#6b7280', fontSize: 10, formatter: (v: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v) }, splitLine: { lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } } }],
                series: seriesData.map((s, idx) => ({
                    name: s.name,
                    type: 'bar' as const,
                    barGap: 0,
                    label: labelOption,
                    labelLayout: { hideOverlap: true },
                    emphasis: { focus: 'series' },
                    data: s.data,
                    itemStyle: { color: ['#f59e0b', '#3b82f6', '#22c55e', '#eab308'][idx % 4], borderRadius: [4, 4, 0, 0] }
                }))
            };

            chartInstance.current.setOption(options);
            return () => { chartInstance.current?.dispose(); };
        }, [data, isClient, isDarkMode]);

        React.useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="w-full">
                <div className="h-[280px] sm:h-[350px] lg:h-[600px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    const formatTon = (v: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v || 0));
    const formatUsd = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v || 0));

    // Construcción dinámica de columnas y datos basados en data_periodos
    const periodosTabla = (() => {
        const periodos = data?.data_periodos;
        return [
            { key: 'periodo_1', label: 'Período 1', rows: periodos?.periodo_1?.tabla_periodo || [] },
            { key: 'periodo_2', label: 'Período 2', rows: periodos?.periodo_2?.tabla_periodo || [] },
            { key: 'periodo_3', label: 'Período 3', rows: periodos?.periodo_3?.tabla_periodo || [] },
            { key: 'periodo_4', label: 'Período 4', rows: periodos?.periodo_4?.tabla_periodo || [] },
        ].filter(p => p.rows.length > 0);
    })();

    // Categorías (posiciones) tomando el orden de tabla_principal y completando con faltantes
    const categoriasTabla = (() => {
        const base = (data?.tabla_principal || []).map((r: any) => r.pos);
        const set = new Set<string>(base);
        periodosTabla.forEach(p => p.rows.forEach((r: any) => set.add(r.pos)));
        const rest = Array.from(set).filter(pos => !base.includes(pos)).sort();
        return [...base, ...rest];
    })();

    const columnasPartidas = (() => {
        const cols: any[] = [{ key: 'partida', label: 'PARTIDA' }];
        periodosTabla.forEach((_p, idx) => {
            const suf = `p${idx + 1}`;
            cols.push({ key: `ton_${suf}`, label: 'TON', render: (v: number) => formatTon(v) });
            cols.push({ key: `fob_${suf}`, label: 'FOB (US$)', render: (v: number) => formatUsd(v) });
        });
        return cols;
    })();

    const datosPartidasDemo = (() => {
        const rows = categoriasTabla.map(pos => {
            const row: any = { partida: pos };
            periodosTabla.forEach((p, idx) => {
                const suf = `p${idx + 1}`;
                const found = p.rows.find((r: any) => r.pos === pos);
                row[`ton_${suf}`] = found ? found.total_toneladas_neto : 0;
                row[`fob_${suf}`] = found ? found.total_valor_fob : 0;
            });
            return row;
        });
        if (rows.length > 0) {
            const total: any = { partida: 'TOTAL' };
            periodosTabla.forEach((_p, idx) => {
                const suf = `p${idx + 1}`;
                total[`ton_${suf}`] = rows.reduce((sum, r) => sum + (r[`ton_${suf}`] || 0), 0);
                total[`fob_${suf}`] = rows.reduce((sum, r) => sum + (r[`fob_${suf}`] || 0), 0);
            });
            rows.push(total);
        }
        return rows;
    })();

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
                        TABLERO  ESTADISTICA DE EXPORTACION CONSOLIDADO MENSUAL POR PARTIDA
                    </h2>

                    <h3 className='text-md text-[rgb(var(--brown))] text-left font-bold mt-4'></h3>

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
                
                        <AnimatedSelect
                            label='Tipo de Cargue'
                            name='tipo_cargue'
                            value={tipoCargueSeleccionado}
                            onChange={(e) => setTipoCargueSeleccionado(e.target.value)}
                            darkMode={isDarkMode}
                            options={[
                                ...tiposCargue.map(tipo => ({
                                    key: tipo.codigo,
                                    value: tipo.codigo,
                                    title: tipo.nombre
                                }))
                            ]}
                        />

                        <div className="col-span-1 sm:col-span-2 mt-3 sm:mt-4">
                            <ToggleSwitch
                                checked={toggleEnabled}
                                onChange={setToggleEnabled}
                                label="Comparativa año anterior"
                                variant="success"
                                labelPosition='left'
                                darkMode={isDarkMode}
                            />
                        </div>

                    </div>

                    <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-4 sm:mt-6'>  
                        <Button 
                            title='Consultar' 
                            onClick={handleConsultar} 
                            disabled={isLoading}
                        />
                        <Button title='Limpiar' onClick={handleLimpiar} />
                        <Button title='PPTX Gráfica' onClick={handleDescargarGraficaCompleta} />
                        
                        <Button title='Salir' onClick={() => router.push('/')} />
                    </div>
                </div>

                {/* Sección de resultados con gráficas y tablas */}
                <div className="mt-4 sm:mt-6">
                    <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 sm:my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                        EXPORTACIONES DE DERIVADOS DE CACAO COMPARATIVO 
                    </h2>

                                         {/* Seccion ver filtros */}
                     <div className="mb-6">
                 
                         {/* Cuadrados de Posiciones y Año de Consulta */}
                         {data?.tabla_principal && data.tabla_principal.length > 0 && (
                             <div className="mb-6">
                                 
                                 {/* Fila superior: 6 posiciones (responsivo) */}
                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-4 w-full">
                                      {data.tabla_principal.map((item: any, _index: number) => (
                                          <div key={item.pos} className={`${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'} border rounded-lg px-4 py-3 shadow-sm text-center`}>
                                              <div className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                                  {item.pos}
                                              </div>
                                              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                  ${new Intl.NumberFormat('es-CO', { 
                                                      minimumFractionDigits: 0, 
                                                      maximumFractionDigits: 0 
                                                  }).format(Math.round(item.total_valor_fob))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>

                                 {/* Fila inferior: Año de Consulta */}
                                 <div className="flex justify-center">
                                     <div className={`${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'} border rounded-lg px-4 py-3 shadow-sm max-w-[250px] text-center`}>
                                         <div className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                             AÑO DE CONSULTA
                                         </div>
                                         <div className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                              {fechaInicio ? (() => {
                                                  // Crear fecha en zona horaria local para evitar problemas de UTC
                                                  const [year] = fechaInicio.split('-');
                                                  return year || 'NO SELECCIONADO';
                                              })() : 'NO SELECCIONADO'}
                                          </div>
                                     </div>
                                 </div>
                             </div>
                         )}
                     </div>

                    <AlertError 
                        isOpen={showErrorAlert}
                        message={error || ''}
                        onClose={() => setShowErrorAlert(false)}
                        autoCloseMs={8000}
                    />

                    {/* Layout principal: Contenedores separados */}
                    <div className="space-y-4 sm:space-y-6">
   
                        {/* Contenedor 1*/}
                        <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                <div className="col-span-1 lg:col-span-2">
                                    <TestPositionsBarChart />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor intermedio (similar al contenedor 1) */}
                        <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                <div className="col-span-1 lg:col-span-2">
                                    <MultiSeriesComparisonChart />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor de tabla (al final) */}
                        <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                            <h4 className={`text-center font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>COMPARATIVO POR POSICIÓN (TABLA)</h4>
                            <DynamicTable
                                columns={columnasPartidas as any}
                                data={datosPartidasDemo as any}
                                currentPage={paginaTablaPartidas}
                                totalPages={1}
                                onPageChange={setPaginaTablaPartidas}
                                darkMode={isDarkMode}
                                fetchAllData={async (_page: number) => {
                                    const rows = (datosPartidasDemo as any[]).map((row: any) => {
                                        const formatted: any = {};
                                        (columnasPartidas as any[]).forEach((c: any) => {
                                            const key = c.key as string;
                                            const val = row[key];
                                            if (key.startsWith('ton_')) formatted[key] = formatTon(val || 0);
                                            else if (key.startsWith('fob_')) formatted[key] = formatUsd(val || 0);
                                            else formatted[key] = val ?? '';
                                        });
                                        return formatted;
                                    });
                                    return { data: rows, total_pages: 1 };
                                }}
                                actionsTop={null}
                            />
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default DerivadoCacao;
  