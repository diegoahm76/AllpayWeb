'use client';

// react
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import ToggleSwitch from '@/presenters/components/ui/ToggleSwitch';
import CompactTable from '@/presenters/components/ui/CompactTable';
import type { CompactTableColumn } from '@/presenters/components/ui/CompactTable.types';

import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, ToolboxComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import useTableroControlSicex from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTableroControlSicex';
import usePosiciones from '@/application/choices/usePosiciones';
import useAduanas from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useAduanas';
import useContinentes from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useContinentes';
import useVias from '@/application/choices/useVias';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import { usePaises } from '@/application/choices/usePaises';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, ToolboxComponent, BarChart, CanvasRenderer]);

    

function ExportacionConsolidadoPartida() {

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    const { 
        data, 
        isLoading, 
        error, 
        fetchTableroControl, 
        clearData, 
        validateParams 
    } = useTableroControlSicex();
    const { posiciones, isLoading: isLoadingPosiciones, fetchPosiciones } = usePosiciones();
    const { aduanas, isLoading: isLoadingAduanas, fetchAduanas } = useAduanas();
    const { continentes, isLoading: isLoadingContinentes, fetchContinentes } = useContinentes();
    const { vias, isLoading: isLoadingVias, fetchVias } = useVias();
    const { tiposCargue, isLoading: isLoadingTiposCargue, fetchTiposCargue } = useTiposCargue();
    
    // Hook para obtener países
    const { paisesData, isLoading: isLoadingPaises, fetchPaises, getOpcionesSelect } = usePaises(token);
    
    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [posicionSeleccionada, setPosicionSeleccionada] = useState<string>('');
    const [aduanaSeleccionada, setAduanaSeleccionada] = useState<string>('');
    const [continenteSeleccionado, setContinenteSeleccionado] = useState<string>('');
    const [viaSeleccionada, setViaSeleccionada] = useState<string>('');
    const [paisSeleccionado, setPaisSeleccionado] = useState<string>('');
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('');
    const [tipoCargueSeleccionado, setTipoCargueSeleccionado] = useState<string>('EXP');
    const [toggleEnabled, setToggleEnabled] = useState<boolean>(false);
    const [isClient, setIsClient] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);

    // Hook para verificar que estamos en el lado del cliente
    useEffect(() => {
        setIsClient(true);
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar posiciones arancelarias (una sola vez)
    useEffect(() => {
        if (token && !isLoadingPosiciones && posiciones.length === 0) {
            fetchPosiciones(token);
        }
    }, [token]); // Solo depende del token

    // Cargar aduanas de embarque (una sola vez)
    useEffect(() => {
        if (token && !isLoadingAduanas && aduanas.length === 0) {
            fetchAduanas(token);
        }
    }, [token]); // Solo depende del token

    // Cargar continentes (una sola vez)
    useEffect(() => {
        if (token && !isLoadingContinentes && continentes.length === 0) {
            fetchContinentes(token);
        }
    }, [token]); // Solo depende del token

    // Cargar vías de transporte (una sola vez)
    useEffect(() => {
        if (token && !isLoadingVias && vias.length === 0) {
            fetchVias(token);
        }
    }, [token]); // Solo depende del token

    // Cargar tipos de cargue (una sola vez)
    useEffect(() => {
        if (token && !isLoadingTiposCargue && tiposCargue.length === 0) {
            fetchTiposCargue(token);
        }
    }, [token]); // Solo depende del token

    // Cargar países (una sola vez)
    useEffect(() => {
        if (token && !isLoadingPaises && paisesData.paises.length === 0) {
            fetchPaises();
        }
    }, [token]); // Solo depende del token, no de fetchPaises ni isLoadingPaises

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error) setShowErrorAlert(true);
    }, [error]);

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {
        if (!token) {
            setShowErrorAlert(true);
            return;
        }

        // Crear objeto de parámetros
        const params = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
            tipo_cargue: tipoCargueSeleccionado || 'EXP',
            posicion: posicionSeleccionada || undefined,
            aduana_embarque: aduanaSeleccionada || undefined,
            continente: continenteSeleccionado || undefined,
            via: viaSeleccionada || undefined,
            pais: paisSeleccionado || undefined,
            empresa: empresaSeleccionada || undefined,
            comparativo_agno: toggleEnabled ? 'SI' : undefined
        };

        // Validar parámetros antes de hacer la consulta
        const validation = validateParams(params);
        if (!validation.isValid) {
            setShowErrorAlert(true);
            return;
        }

        try {
            await fetchTableroControl(token, params);
        } catch (error) {
            console.error('[ExportacionConsolidadoPartida] - Error al consultar:', error);
        }
    };

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFinal('');
        setPosicionSeleccionada('');
        setAduanaSeleccionada('');
        setContinenteSeleccionado('');
        setViaSeleccionada('');
        setPaisSeleccionado('');
        setEmpresaSeleccionada('');
        setTipoCargueSeleccionado('EXP');
        setToggleEnabled(false);
        clearData();
    };

    // Datos para tablas a partir del hook
    const datosPorPais = (data?.tabla_pais || []).map((item, idx) => ({
        no: idx + 1,
        pais: item.pais,
        toneladas: Math.round(item.total_toneladas_neto),
        participacion: Math.round(item.porcentaje)
    }));

    const datosPorEmpresa = (data?.tabla_empresa || []).map((item, idx) => ({
        no: idx + 1,
        empresa: item.empresa_declarante,
        toneladas: Math.round(item.total_toneladas_neto),
        participacion: Math.round(item.porcentaje)
    }));

    // Total de toneladas y datos para gráficas
    const totalToneladas = data?.total_toneladas || '0';
    const parseToneladas = (valor: string): number => {
        const str = (valor || '').trim();
        // Formato: 12.345,67 (puntos miles, coma decimal)
        if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.'));
        }
        // Formato: 12,345.67 (comas miles, punto decimal)
        if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
            return parseFloat(str.replace(/,/g, ''));
        }
        // Formato: 12345,67 (solo coma decimal)
        if (/^\d+(,\d+)$/.test(str)) {
            return parseFloat(str.replace(',', '.'));
        }
        // Formato estándar 12345.67 o entero
        return parseFloat(str) || 0;
    };

    const totalToneladasNumerico = data ? parseToneladas(totalToneladas) : 0;
    
    // Datos para gráficas - mostrar comparativa cuando esté activado
    const datosGraficaPaises = useMemo(() => {
        if (toggleEnabled && data?.data_agno_comparativo) {
            // Modo comparativo: mostrar año anterior vs año actual (cambiado el orden)
            return [
                { year: 'AÑO ANTERIOR', value: Math.round(parseToneladas(data.data_agno_comparativo.total_toneladas)) },
                { year: 'AÑO ACTUAL', value: Math.round(totalToneladasNumerico) }
            ];
        } else {
            // Modo normal: mostrar solo el total
            return [
                { year: 'TOTAL', value: Math.round(totalToneladasNumerico) }
            ];
        }
    }, [toggleEnabled, data, totalToneladasNumerico]);

    const datosGraficaEmpresas = useMemo(() => {
        if (toggleEnabled && data?.data_agno_comparativo) {
            // Modo comparativo: mostrar año anterior vs año actual (cambiado el orden)
            return [
                { year: 'AÑO ANTERIOR', value: Math.round(parseToneladas(data.data_agno_comparativo.total_toneladas)) },
                { year: 'AÑO ACTUAL', value: Math.round(totalToneladasNumerico) }
            ];
        } else {
            // Modo normal: mostrar solo el total
            return [
                { year: 'TOTAL', value: Math.round(totalToneladasNumerico) }
            ];
        }
    }, [toggleEnabled, data, totalToneladasNumerico]);

    const columnasPaises: CompactTableColumn[] = [
        { key: 'no', label: 'No', align: 'center' },
        { key: 'pais', label: 'PAÍS',  align: 'left', truncate: true },
        { 
            key: 'toneladas', 
            label: 'TONELADAS', 
            align: 'right',
            render: (value: number) => new Intl.NumberFormat('es-CO', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value)
        },
        { 
            key: 'participacion', 
            label: '%', 
            align: 'right', 
            render: (value: number) => `${value}%` 
        }
    ];

    const columnasEmpresas: CompactTableColumn[] = [
        { key: 'no', label: 'No', align: 'center' },
        { key: 'empresa', label: 'EMPRESA',  align: 'left', truncate: true },
        { 
            key: 'toneladas', 
            label: 'TONELADAS', 
            align: 'right',
            render: (value: number) => new Intl.NumberFormat('es-CO', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value)
        },
        { 
            key: 'participacion', 
            label: '%', 
            align: 'right', 
            render: (value: number) => `${value}%` 
        }
    ];

    // Función para descargar un PPTX con SOLO la gráfica de países
    const handleDescargarGrafica = async () => {
        if (!isClient) return;

        try {
            const mod = await import('pptxgenjs');
            // @ts-ignore
            const PptxGen = (mod as any).default ?? mod;
            const pptx = new PptxGen();

            // Función utilitaria para convertir una imagen a Base64
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

            // Cargamos el logo para insertarlo en las diapositivas
            const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
            const slide = pptx.addSlide();
            // Insertamos logo en la esquina superior izquierda
            slide.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            // Calcular totales dinámicamente basándose en los datos filtrados
            const totalToneladasPaises = datosPorPais.reduce((sum, item) => sum + item.toneladas, 0);
            const totalToneladasEmpresas = datosPorEmpresa.reduce((sum, item) => sum + item.toneladas, 0);

            // Usar datos dinámicos para la gráfica
            const labels = datosGraficaPaises.map(d => d.year);
            const values = datosGraficaPaises.map(d => d.value);
            const chartData = [
                { name: 'Toneladas', labels, values }
            ];
           
            // Título dinámico basado en el tipo de cargue seleccionado
            const tituloSlide1 = tipoCargueSeleccionado === 'IMP' 
                ? 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN PAÍS DESTINO Y COMPAÑÍA'
                : 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN PAÍS DESTINO Y COMPAÑÍA';

            slide.addText(tituloSlide1, {
                x: 2.2,
                y: 0.3,
                w: 7.4,
                h: 0.6,
                fontSize: 20,
                bold: true,
                align: 'center',
                color: '562707',
            });

            // Gráfica con eje Y dinámico
            const maxValuePaises = Math.max(...values);
            slide.addChart('bar', chartData, {
                x: 0.2, y: 1, w: 4.8, h: 4.3,
                barDir: 'col',
                chartColors: toggleEnabled && data?.data_agno_comparativo ? ['156183', '156183'] : ['156183'], // Azul primero, luego verde
                showValue: true,
                title: toggleEnabled && data?.data_agno_comparativo ? 'Comparativa Años (t)' : 'Por País (t)',
                valAxisMinVal: 0,
                valAxisMaxVal: maxValuePaises * 1.2, // 20% de margen
            });

            // Tabla dinámica con totales calculados
            const tablaRows: any[][] = [
                ['No', 'PAÍS', 'TONELADAS', '%'],
                ...datosPorPais.map((row) => [
                    row.no,
                    row.pais,
                    new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(row.toneladas)),
                    `${row.participacion}%`,
                ]),
                ['', 'TOTAL', new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(totalToneladasPaises)), '100%'],
            ];
            
            slide.addTable(tablaRows, {
                x: 5.4,
                y: 1.3,
                w: 4.2,
                colW: [0.5, 1.5, 1.0, 0.9],
                fontSize: 10,
                border: { pt: 1, color: 'e5e7eb' },
                valign: 'middle',
                align: 'center',
            });

            // ------------ SLIDE 2: Empresas ----------------
            const slide2 = pptx.addSlide();
            // Insertamos logo en la esquina superior izquierda
            slide2.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            // Título dinámico para slide 2
            const tituloSlide2 = tipoCargueSeleccionado === 'IMP' 
                ? 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN COMPAÑÍA'
                : 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN COMPAÑÍA';

            slide2.addText(tituloSlide2, {
                x: 2.2,
                y: 0.3,
                w: 7.4,
                h: 0.6,
                fontSize: 20,
                bold: true,
                align: 'center',
                color: '562707',
            });

            const chartData2 = [
                {
                    name: 'Toneladas',
                    labels: datosGraficaEmpresas.map(d => d.year),
                    values: datosGraficaEmpresas.map(d => d.value),
                },
            ];

            // Gráfica con eje Y dinámico
            const maxValueEmpresas = Math.max(...datosGraficaEmpresas.map(d => d.value));
            slide2.addChart('bar', chartData2, {
                x: 0.2,
                y: 1,
                w: 4.8,
                h: 4.3,
                barDir: 'col',
                chartColors: toggleEnabled && data?.data_agno_comparativo ? ['156183', '156183'] : ['156183'], // Azul primero, luego verde
                showValue: true,
                title: toggleEnabled && data?.data_agno_comparativo ? 'Comparativa Años (t)' : 'Por Empresa (t)',
                valAxisMinVal: 0,
                valAxisMaxVal: maxValueEmpresas * 1.2, // 20% de margen
            });

            // Tabla dinámica con totales calculados
            const tablaEmp = [
                ['No', 'EMPRESA', 'TONELADAS', '%'],
                ...datosPorEmpresa.map(r => [
                    r.no,
                    r.empresa,
                    new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(r.toneladas)),
                    `${r.participacion}%`,
                ]),
                ['', 'TOTAL', new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(totalToneladasEmpresas)), '100%'],
            ];

            slide2.addTable(tablaEmp, {
                x: 5.4,
                y: 1.3,
                w: 4.2,
                colW: [0.5, 2.0, 1.0, 0.7],
                fontSize: 10,
                border: { pt: 1, color: 'e5e7eb' },
                valign: 'middle',
                align: 'center',
            });

            // Guardar presentación
            await pptx.writeFile({ fileName: 'Exportaciones_PPTX.pptx' });
        } catch (error) {
            console.error('Error al generar PPTX con gráfica:', error);
            alert('No se pudo generar el PPTX con la gráfica');
        }
    };


    // Componente TinyBarChart basado en ECharts
    const TinyBarChart = ({ data, title, isComparativo, isDark }: { data: any[], title: string, isComparativo: boolean, isDark: boolean }) => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;

            // Inicializar el gráfico
            chartInstance.current = echarts.init(chartRef.current);

            if (isComparativo) {
                // Modo comparativo: dos series (año anterior vs año actual) en la misma categoría
                const options = {
                    grid: { top: 60, left: 40, right: 10, bottom: 40 },
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
                                name: 'exportacion_partida_comparativo',
                                pixelRatio: 2
                            }
                        }
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: (params: any) => {
                            return params.map((param: any) => {
                                return `${param.seriesName}: ${new Intl.NumberFormat('es-CO', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 0 
                                }).format(Math.round(param.value))} toneladas`;
                            }).join('<br/>');
                        }
                    },
                    legend: {
                        data: ['Año Anterior', 'Año Actual'],
                        top: 35,
                        textStyle: { 
                            fontSize: 10,
                            color: isDark ? '#ffffff' : '#374151'
                        }
                    },
                    xAxis: {
                        type: 'category' as const,
                        data: ['COMPARATIVA'],
                        axisLine: { lineStyle: { color: isDark ? '#4a4a4a' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: { 
                            color: isDark ? '#ffffff' : '#374151', 
                            fontSize: 10, 
                            fontWeight: 600
                        },
                    },
                    yAxis: {
                        type: 'value' as const,
                        axisLine: { lineStyle: { color: isDark ? '#4a4a4a' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            fontSize: 9,
                            formatter: (value: number) => {
                                const roundedValue = Math.round(value);
                                if (roundedValue >= 1000000) {
                                    return `${Math.round(roundedValue / 1000000)}M`;
                                } else if (roundedValue >= 1000) {
                                    return `${Math.round(roundedValue / 1000)}k`;
                                } else {
                                    return roundedValue.toString();
                                }
                            },
                        },
                        splitLine: { lineStyle: { color: isDark ? '#3d3d3d' : '#f3f4f6' } },
                    },
                    series: [
                        {
                            name: 'Año Anterior',
                            type: 'bar' as const,
                            data: [data.find(d => d.year === 'AÑO ANTERIOR')?.value || 0],
                            barWidth: '30%',
                            itemStyle: { color: '#ff8c04', borderRadius: [4, 4, 0, 0] }, 
                            label: {
                                show: true,
                                position: 'top' as const,
                                formatter: ({ value }: any) => new Intl.NumberFormat('es-CO', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 0 
                                }).format(Math.round(value)),
                                color: isDark ? '#ffffff' : '#1f2937',
                                fontSize: 11,
                                fontWeight: 600,
                            },
                            emphasis: {
                                focus: 'series'
                            }
                        },
                        {
                            name: 'Año Actual',
                            type: 'bar' as const,
                            data: [data.find(d => d.year === 'AÑO ACTUAL')?.value || 0],
                            barWidth: '30%',
                            itemStyle: { color: '#156183', borderRadius: [4, 4, 0, 0] }, // Verde para año actual
                            label: {
                                show: true,
                                position: 'top' as const,
                                formatter: ({ value }: any) => new Intl.NumberFormat('es-CO', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 0 
                                }).format(Math.round(value)),
                                color: isDark ? '#ffffff' : '#1f2937',
                                fontSize: 11,
                                fontWeight: 600,
                            },
                            emphasis: {
                                focus: 'series'
                            }
                        }
                    ],
                    animation: true,
                };

                chartInstance.current.setOption(options);
            } else {
                // Modo normal: una sola serie (total)
                const formattedData = data.map((d: any, index: number) => ({
                    value: d.value,
                    itemStyle: {
                        color: index === 0 ? '#156183' : '#156183',
                        borderRadius: [4, 4, 0, 0],
                    },
                }));

                // Calcular el valor máximo para ajustar el eje Y dinámicamente
                const maxValue = Math.max(...data.map(d => d.value));
                const minValue = Math.min(...data.map(d => d.value));
                
                // Ajustar el rango del eje Y con un margen del 20%
                const yAxisMin = minValue > 0 ? minValue * 0.8 : 0;
                const yAxisMax = maxValue * 1.2;

                const options = {
                    grid: { top: 60, left: 40, right: 10, bottom: 40 },
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
                                name: 'exportacion_partida_consolidado',
                                pixelRatio: 2
                            }
                        }
                    },
                    xAxis: {
                        type: 'category' as const,
                        data: data.map((d: any) => d.year),
                        axisLine: { lineStyle: { color: isDark ? '#4a4a4a' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: { 
                            color: isDark ? '#ffffff' : '#374151', 
                            fontSize: 10, 
                            fontWeight: 600,
                            // Rotar etiquetas si son muy largas
                            rotate: data.some(d => d.year.length > 10) ? 45 : 0
                        },
                    },
                    yAxis: {
                        type: 'value' as const,
                        axisLine: { lineStyle: { color: isDark ? '#4a4a4a' : '#e5e7eb' } },
                        axisTick: { show: false },
                        // Configurar el eje Y para que se ajuste dinámicamente
                        min: yAxisMin,
                        max: yAxisMax,
                        axisLabel: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            fontSize: 9,
                            formatter: (value: number) => {
                                const roundedValue = Math.round(value);
                                if (roundedValue >= 1000000) {
                                    return `${Math.round(roundedValue / 1000000)}M`;
                                } else if (roundedValue >= 1000) {
                                    return `${Math.round(roundedValue / 1000)}k`;
                                } else {
                                    return roundedValue.toString();
                                }
                            },
                        },
                        splitLine: { lineStyle: { color: isDark ? '#3d3d3d' : '#f3f4f6' } },
                    },
                    series: [
                        {
                            type: 'bar' as const,
                            data: formattedData,
                            barWidth: '40%',
                            label: {
                                show: true,
                                position: 'top' as const,
                                formatter: ({ value }: any) => new Intl.NumberFormat('es-CO', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 0 
                                }).format(Math.round(value)),
                                color: isDark ? '#ffffff' : '#1f2937',
                                fontSize: 11,
                                fontWeight: 600,
                            },
                        },
                    ],
                    animation: true,
                    // Agregar tooltip para mejor interactividad
                    tooltip: {
                        trigger: 'axis',
                        formatter: (params: any) => {
                            const data = params[0];
                            return `${data.name}: ${new Intl.NumberFormat('es-CO', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            }).format(Math.round(data.value))} toneladas`;
                        }
                    }
                };

                chartInstance.current.setOption(options);
            }

            // Cleanup
            return () => {
                if (chartInstance.current) {
                    chartInstance.current.dispose();
                }
            };
        }, [data, isClient, isComparativo, isDark]);

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
                <h4 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 lg:mt-4 text-center ${isDark ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    {title}
                </h4>
                <div className="h-[280px] sm:h-[350px] lg:h-[500px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
                <div className="text-center mt-1 sm:mt-2">
                    <div className={`text-xs sm:text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {isComparativo ? 'Modo comparativo activo' : 'Total consolidado (toneladas)'}
                    </div>
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
                        TABLERO CONSOLIDADO DE {tipoCargueSeleccionado === 'IMP' ? 'IMPORTACIÓN' : 'EXPORTACIÓN'} DE PARTIDA
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}></h3>

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
                            label='Posición arancelaria'
                            name='posicion_arancelaria'
                            value={posicionSeleccionada}
                            onChange={(e) => setPosicionSeleccionada(e.target.value)}
                            options={[
                                ...posiciones.map(pos => ({
                                    key: pos,
                                    value: pos,
                                    title: pos
                                }))
                            ]}
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label='Puerto o Aeropuerto'
                            name='puerto_o_aeropuerto'
                            value={aduanaSeleccionada}
                            onChange={(e) => setAduanaSeleccionada(e.target.value)}
                            options={[
                                ...aduanas.map(aduana => ({
                                    key: aduana,
                                    value: aduana,
                                    title: aduana
                                }))
                            ]}
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label='Continente'
                            name='continente'
                            value={continenteSeleccionado}
                            onChange={(e) => setContinenteSeleccionado(e.target.value)}
                            options={[
                                ...continentes.map(continente => ({
                                    key: continente,
                                    value: continente,
                                    title: continente
                                }))
                            ]}
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label='Vía'
                            name='via'
                            value={viaSeleccionada}
                            onChange={(e) => setViaSeleccionada(e.target.value)}
                            options={[
                                ...vias.map(via => ({
                                    key: via,
                                    value: via,
                                    title: via
                                }))
                            ]}
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label='Tipo de Cargue'
                            name='tipo_cargue'
                            value={tipoCargueSeleccionado}
                            onChange={(e) => setTipoCargueSeleccionado(e.target.value)}
                            options={[
                                ...tiposCargue.map(tipo => ({
                                    key: tipo.codigo,
                                    value: tipo.codigo,
                                    title: tipo.nombre
                                }))
                            ]}
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label={isLoadingPaises ? 'País (Cargando...)' : 'País'}
                            name='pais'
                            value={paisSeleccionado}
                            onChange={(e) => setPaisSeleccionado(e.target.value)}
                            disabled={isLoadingPaises}
                            options={[
                                { key: 'todos', value: '', title: 'Todos los países' },
                                ...(isLoadingPaises ? [] : getOpcionesSelect())
                            ]}
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label='Empresa'
                            name='empresa'
                            value={empresaSeleccionada}
                            onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                            darkMode={isDarkMode}
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
                            disabled={isLoading || !fechaInicio || !fechaFinal}
                        />
                        <Button title='Limpiar' onClick={handleLimpiar} />
                        <Button 
                            title='PPTX Gráfica' 
                            onClick={handleDescargarGrafica} 
                            disabled={!data || isLoading}
                        />
                        
                        <Button title='Salir' onClick={() => router.push('/')} />
                    </div>
                    
                </div>

                {/* Sección de resultados con gráficas y tablas */}
                    <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-4 sm:my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                        {tipoCargueSeleccionado === 'IMP' ? 'IMPORTACIONES' : 'EXPORTACIONES'} DE CACAO EN GRANO (TONELADAS) SEGÚN PAÍS DESTINO Y COMPAÑÍA
                    </h2>

                    {/* Filtros Activos */}
                <div className="mt-4 sm:mt-6">
                    <div className="mb-6 ">
    
                        <div className="flex flex-wrap justify-center gap-4">
                            {/* Puerto/Aduana */}
                            <div className={`rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                                <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    PUERTO O ADUANA
                                </div>
                                <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {aduanaSeleccionada || 'TODOS'}
                                </div>
                            </div>

                            {/* Vía */}
                            <div className={`rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                                <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    VÍA
                                </div>
                                <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {viaSeleccionada || 'TODOS'}
                                </div>
                            </div>

                            {/* Continente */}
                            <div className={`rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                                <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    CONTINENTE
                                </div>
                                <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {continenteSeleccionado || 'TODOS'}
                                </div>
                            </div>
                           
                        </div>
                    </div>

                    <AlertError 
                        isOpen={showErrorAlert}
                        message={error || ''}
                        onClose={() => setShowErrorAlert(false)}
                        autoCloseMs={8000}
                    />

                    {/* Layout principal: Contenedores separados */}
                    <div className="space-y-4 sm:space-y-6">

                        {/* Contenedor 1: Países */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:h-[600px]">
                                {/* Gráfica países */}
                                <div className="flex flex-col">
                                    <TinyBarChart 
                                        data={datosGraficaPaises}
                                        title="CONSOLIDADO EXPORTACIÓN"
                                        isComparativo={!!(toggleEnabled && data?.data_agno_comparativo)}
                                        isDark={isDarkMode}
                                    />
                                </div>
                                
                                {/* Tabla países */}
                                <div className="flex flex-col ">
                                    <CompactTable
                                        title="EXPORTACIÓN POR PAÍS DESTINO"
                                        columns={columnasPaises}
                                        data={datosPorPais}
                                        total={{
                                            values: ['TOTAL', '', Math.round(totalToneladasNumerico), '100%']
                                        }}
                                        maxHeight="500px"
                                        theme={theme as 'light' | 'dark'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor 2: Empresas */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 lg:h-[600px] ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                {/* Gráfica empresas */}
                                <div className="flex flex-col">
                                    <TinyBarChart 
                                        data={datosGraficaEmpresas}
                                        title="CONSOLIDADO EXPORTACIÓN"
                                        isComparativo={!!(toggleEnabled && data?.data_agno_comparativo)}
                                        isDark={isDarkMode}
                                    />
                                </div>
                                
                                {/* Tabla empresas */}
                                <div className="flex flex-col">
                                    <CompactTable
                                        title="EXPORTACIÓN POR EMPRESA"
                                        columns={columnasEmpresas}
                                        data={datosPorEmpresa}
                                        total={{
                                            values: ['TOTAL', '', Math.round(totalToneladasNumerico), '100%']
                                        }}
                                        maxHeight="500px"
                                        theme={theme as 'light' | 'dark'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default ExportacionConsolidadoPartida;
  