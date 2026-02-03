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
import CompactTable from '@/presenters/components/ui/CompactTable';
import type { CompactTableColumn } from '@/presenters/components/ui/CompactTable.types';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, GraphicComponent, TitleComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import useTableroControlSicexMes from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_mensual/hooks/useTableroControlSicexMes';
import usePosiciones from '@/application/choices/usePosiciones';
import useAduanas from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useAduanas';
import useContinentes from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useContinentes';
import useVias from '@/application/choices/useVias';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import { usePaises } from '@/application/choices/usePaises';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, GraphicComponent, TitleComponent, VisualMapComponent, BarChart, PieChart, CanvasRenderer]);

    

function ExportacionConsolidadoMensual() {

    const { theme } = useTheme();
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
    } = useTableroControlSicexMes();
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
    const [mounted, setMounted] = useState<boolean>(false);

    // Hook para verificar que estamos en el lado del cliente
    useEffect(() => {
        setIsClient(true);
        setMounted(true);
    }, []);

    // Cargar posiciones arancelarias (una sola vez)
    useEffect(() => {
        if (token && !isLoadingPosiciones) {
            fetchPosiciones(token);
        }
    }, [token, fetchPosiciones, isLoadingPosiciones]);

    // Cargar aduanas de embarque (una sola vez)
    useEffect(() => {
        if (token && !isLoadingAduanas) {
            fetchAduanas(token);
        }
    }, [token, fetchAduanas, isLoadingAduanas]);

    // Cargar continentes (una sola vez)
    useEffect(() => {
        if (token && !isLoadingContinentes) {
            fetchContinentes(token);
        }
    }, [token, fetchContinentes, isLoadingContinentes]);

    // Cargar vías de transporte (una sola vez)
    useEffect(() => {
        if (token && !isLoadingVias) {
            fetchVias(token);
        }
    }, [token, fetchVias, isLoadingVias]);

    // Cargar tipos de cargue (una sola vez)
    useEffect(() => {
        if (token && !isLoadingTiposCargue) {
            fetchTiposCargue(token);
        }
    }, [token, fetchTiposCargue, isLoadingTiposCargue]);

    // Cargar países (una sola vez)
    useEffect(() => {
        if (token && !isLoadingPaises && paisesData.paises.length === 0) {
            fetchPaises();
        }
    }, [token]); // Solo depende del token

    // Mostrar alerta de error cuando el hook reporte error
    useEffect(() => {
        if (error) setShowErrorAlert(true);
    }, [error]);

    // Definir isDarkMode después de la hidratación
    const isDarkMode = mounted && theme === 'dark';

    // Prevenir renderizado hasta que el componente esté montado
    if (!mounted) return null;

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
            console.error('[ExportacionConsolidadoMensual] - Error al consultar:', error);
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
    const datosPorMes = (data?.tabla_meses || []).map((item: any, idx: number) => ({
        no: idx + 1,
        mes: item.mes,
        toneladas: Math.round(item.total_toneladas_neto),
        participacion: Math.round(item.porcentaje)
    }));

    const datosPorContinente = (data?.tabla_continente || []).map((item: any, idx: number) => ({
        no: idx + 1,
        continente: item.continente,
        toneladas: Math.round(item.total_toneladas_neto),
        participacion: Math.round(item.porcentaje)
    }));

    const datosPorVia = (data?.tabla_via || []).map((item: any, idx: number) => ({
        no: idx + 1,
        via: item.via,
        toneladas: Math.round(item.total_toneladas_neto),
        participacion: Math.round(item.porcentaje)
    }));

    // Total de toneladas y datos para gráficas
    const totalToneladas = data?.total_toneladas || '0';
    
    // Función para parsear y redondear toneladas
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

    // Función para descargar un PPTX completo con todas las gráficas
    const handleDescargarGraficaCompleta = async () => {
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

            // ------------ SLIDE 1: Meses ----------------
            const slide = pptx.addSlide();
            slide.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            // Calcular totales dinámicamente
            const totalToneladasMeses = datosPorMes.reduce((sum: number, item: any) => sum + item.toneladas, 0);

            // Usar datos reales del API para las gráficas
            const labelsMeses = datosPorMes.map(d => d.mes);
            const valuesMeses = datosPorMes.map(d => d.toneladas);
            
            // Determinar si estamos en modo comparativo y hay datos de ambos años
            const isComparativo = toggleEnabled && data?.data_agno_comparativo && data.data_agno_comparativo.tabla_meses && data.data_agno_comparativo.tabla_meses.length > 0;
            
            // Solo mostrar gráfica si hay datos
            if (labelsMeses.length > 0 && valuesMeses.length > 0) {
                if (isComparativo) {
                    // Modo comparativo: dos series (año anterior y año actual)
                    // Solo incluir meses que tienen datos en AMBOS años
                    const mesesComunes = labelsMeses.filter(mes => {
                        const tieneDatosAnterior = data.data_agno_comparativo?.tabla_meses?.some(item => item.mes === mes);
                        const tieneDatosActual = datosPorMes.some(item => item.mes === mes);
                        return tieneDatosAnterior && tieneDatosActual;
                    });
                    
                    // Filtrar datos para solo incluir meses comunes
                    const toneladasAnterior = mesesComunes.map(mes => {
                        const item = data.data_agno_comparativo?.tabla_meses?.find(item => item.mes === mes);
                        return item ? item.total_toneladas_neto : 0;
                    });
                    
                    const toneladasActual = mesesComunes.map(mes => {
                        const item = datosPorMes.find(item => item.mes === mes);
                        return item ? item.toneladas : 0;
                    });
                    
                    const chartData = [
                        { name: 'Año Anterior', labels: mesesComunes, values: toneladasAnterior },
                        { name: 'Año Actual', labels: mesesComunes, values: toneladasActual }
                    ];
                    
                    // Gráfica comparativa con dos series
                    slide.addChart('bar', chartData, {
                        x: 0.2, y: 1, w: 4.8, h: 4.3,
                        barDir: 'col',
                        chartColors: ['ff8c04', '114962'], // Azul para año anterior, verde para año actual
                        showValue: true,
                        title: 'Comparativa Años (t)',
                        valAxisMinVal: 0,
                        valAxisMaxVal: Math.max(...toneladasActual, ...toneladasAnterior) * 1.2,
                    });
                } else {
                    // Modo normal: una sola serie
                    const chartData = [
                        { name: 'Toneladas', labels: labelsMeses, values: valuesMeses }
                    ];
                    
                    // Gráfica normal con una serie
                    slide.addChart('bar', chartData, {
                        x: 0.2, y: 1, w: 4.8, h: 4.3,
                        barDir: 'col',
                        chartColors: ['114962'], // Verde para año actual
                        showValue: true,
                        title: 'Por Mes (t)',
                        valAxisMinVal: 0,
                        valAxisMaxVal: Math.max(...valuesMeses) * 1.2,
                    });
                }
            }

            // Título dinámico
            const tituloSlide1 = tipoCargueSeleccionado === 'IMP' 
                ? (isComparativo 
                    ? 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN MES - COMPARATIVA AÑOS'
                    : 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN MES')
                : (isComparativo 
                    ? 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN MES - COMPARATIVA AÑOS'
                    : 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN MES');

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

            // Tabla dinámica - solo mostrar si hay datos
            if (datosPorMes.length > 0) {
                let datosParaTabla = datosPorMes;
                
                // Si está en modo comparativo, solo mostrar meses que tienen datos en ambos años
                if (isComparativo) {
                    const mesesComunes = labelsMeses.filter(mes => {
                        const tieneDatosAnterior = data.data_agno_comparativo?.tabla_meses?.some(item => item.mes === mes);
                        const tieneDatosActual = datosPorMes.some(item => item.mes === mes);
                        return tieneDatosAnterior && tieneDatosActual;
                    });
                    
                    datosParaTabla = datosPorMes.filter(item => mesesComunes.includes(item.mes));
                }
                
                const tablaRows: any[][] = [
                    ['No', 'MES', 'TONELADAS', '%'],
                    ...datosParaTabla.map((row: any, index: number) => [
                        index + 1,
                        row.mes,
                        new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(row.toneladas)),
                        `${row.participacion}%`,
                    ]),
                    ['', 'TOTAL', new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(datosParaTabla.reduce((sum, item) => sum + item.toneladas, 0))), '100%'],
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
            }

            // ------------ SLIDE 2: Posiciones ----------------
            const slide2 = pptx.addSlide();
            slide2.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            const tituloSlide2 = tipoCargueSeleccionado === 'IMP' 
                ? 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN POSICIÓN ARANCELARIA'
                : 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN POSICIÓN ARANCELARIA';

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

            const colorsPosiciones = [
                '#f97316', '#0ea5e9', '#22c55e', '#92400e', '#3b82f6',
                '#059669', '#dc2626', '#7c3aed', '#ea580c', '#16a34a',
                '#0891b2', '#7c2d12', '#65a30d', '#be185d', '#9333ea'
            ];

            const chartData2 = [
                {
                    name: 'Posiciones',
                    labels: datosPosiciones.map(d => d.pos),
                    values: datosPosiciones.map(d => d.toneladas),
                },
            ];

            // Gráfica de pastel en lugar de barras
            slide2.addChart('pie', chartData2, {
                x: 0.2,
                y: 1,
                w: 4.8,
                h: 4.3,
                showValue: true,
                title: 'Por Posición (t)',
                showLegend: true,
                legendPos: 'r',
                legendFontSize: 10,
                chartColors: colorsPosiciones, // Aplicar la misma paleta de colores
            });

            const tablaPosiciones = [
                ['No', 'POSICION', 'TONELADAS', '%'],
                ...datosPosiciones.map((r, index) => [
                    index + 1,
                    r.pos,
                    new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(r.toneladas)),
                    `${r.participacion}%`,
                ]),
                ['', 'TOTAL', new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(totalToneladasMeses)), '100%'],
            ];

            slide2.addTable(tablaPosiciones, {
                x: 5.4,
                y: 1.3,
                w: 4.2,
                colW: [0.5, 2.0, 1.0, 0.7],
                fontSize: 10,
                border: { pt: 1, color: 'e5e7eb' },
                valign: 'middle',
                align: 'center',
            });

            // ------------ SLIDE 3: Continentes ----------------
            const slide3 = pptx.addSlide();
            slide3.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            const tituloSlide3 = tipoCargueSeleccionado === 'IMP' 
                ? 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN CONTINENTE'
                : 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN CONTINENTE';

            slide3.addText(tituloSlide3, {
                x: 2.2,
                y: 0.3,
                w: 7.4,
                h: 0.6,
                fontSize: 20,
                bold: true,
                align: 'center',
                color: '562707',
            });

            const chartData3 = [
                {
                    name: 'Toneladas',
                    labels: datosPorContinente.map(d => d.continente),
                    values: datosPorContinente.map(d => d.toneladas),
                },
            ];

            const maxValueContinentes = Math.max(...datosPorContinente.map(d => d.toneladas));
            slide3.addChart('bar', chartData3, {
                x: 0.2,
                y: 1,
                w: 4.8,
                h: 4.3,
                barDir: 'col',
                chartColors: ['186484'],
                showValue: true,
                title: 'Por Continente (t)',
                valAxisMinVal: 0,
                valAxisMaxVal: maxValueContinentes * 1.2,
            });

            const tablaContinentes = [
                ['No', 'CONTINENTE', 'TONELADAS', '%'],
                ...datosPorContinente.map((r, index) => [
                    index + 1,
                    r.continente,
                    new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(r.toneladas)),
                    `${r.participacion}%`,
                ]),
                ['', 'TOTAL', new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(parseFloat(totalToneladas))), '100%'],
            ];

            slide3.addTable(tablaContinentes, {
                x: 5.4,
                y: 1.3,
                w: 4.2,
                colW: [0.5, 2.0, 1.0, 0.7],
                fontSize: 10,
                border: { pt: 1, color: 'e5e7eb' },
                valign: 'middle',
                align: 'center',
            });

            // ------------ SLIDE 4: Vías ----------------
            const slide4 = pptx.addSlide();
            slide4.addImage({
                data: logoBase64,
                x: 0.1,
                y: 0.1,
                w: 1.5,
                h: 0.8,
            });

            const tituloSlide4 = tipoCargueSeleccionado === 'IMP' 
                ? 'IMPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN VÍA'
                : 'EXPORTACIONES DE CACAO EN GRANO (TONELADAS) SEGÚN VÍA';

            slide4.addText(tituloSlide4, {
                x: 2.2,
                y: 0.3,
                w: 7.4,
                h: 0.6,
                fontSize: 20,
                bold: true,
                align: 'center',
                color: '562707',
            });

            // Cambiar a gráfica de pastel para vías
            // Usar los colores específicos para cada tipo de vía
            const colorsVias = [
                '#4ea62f', // Terrestre
                '#109cd4', // Marítima
                '#f07434', // Aérea
                '#6b7280'  // Otros (color por defecto)
            ];

            const chartData4 = [
                {
                    name: 'Vías',
                    labels: datosPorVia.map(d => d.via),
                    values: datosPorVia.map(d => d.toneladas),
                },
            ];

            // Gráfica de pastel en lugar de barras
            slide4.addChart('pie', chartData4, {
                x: 0.2,
                y: 1,
                w: 4.8,
                h: 4.3,
                showValue: true,
                title: 'Por Vía (t)',
                showLegend: true,
                legendPos: 'r',
                legendFontSize: 10,
                chartColors: colorsVias, // Aplicar la misma paleta de colores
            });

            // Tabla de vías
            const tablaVias = [
                ['No', 'VÍA', 'TONELADAS', '%'],
                ...datosPorVia.map((r, index) => [
                    index + 1,
                    r.via,
                    new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(r.toneladas)),
                    `${r.participacion}%`,
                ]),
                ['', 'TOTAL', new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(parseFloat(totalToneladas))), '100%'],
            ];

            slide4.addTable(tablaVias, {
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
            await pptx.writeFile({ fileName: `Tablero_Completo_${tipoCargueSeleccionado === 'IMP' ? 'Importaciones' : 'Exportaciones'}.pptx` });
        } catch (error) {
            console.error('Error al generar PPTX completo:', error);
            alert('No se pudo generar el PPTX completo');
        }
    };


    // Gráfico comparativo mensual usando datos reales del API
    const MonthlyComparisonChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;

            chartInstance.current = echarts.init(chartRef.current);

            // Usar datos reales del API si están disponibles, sino datos vacíos
            const meses = data?.tabla_meses?.map(item => item.mes) || [];
            const toneladas = data?.tabla_meses?.map(item => item.total_toneladas_neto) || [];

            // Si no hay datos, mostrar mensaje
            if (meses.length === 0) {
                const options: echarts.EChartsCoreOption = {
                    grid: { top: 60, left: 50, right: 20, bottom: 60 },
                    xAxis: { type: 'category', data: [] },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: [] }],
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: {
                            text: 'No hay datos disponibles',
                            fontSize: 16,
                            fill: '#999'
                        }
                    }
                };
                chartInstance.current.setOption(options);
                return;
            }

            // Determinar si estamos en modo comparativo
            const isComparativo = toggleEnabled && data?.data_agno_comparativo;

            if (isComparativo) {
                // Modo comparativo: mostrar año actual vs año anterior
                const toneladasAnterior = data.data_agno_comparativo?.tabla_meses?.map(item => item.total_toneladas_neto) || [];
                const toneladasActual = toneladas;

                const options: echarts.EChartsCoreOption = {
                    grid: { top: 60, left: 50, right: 20, bottom: 60 },
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
                                name: 'comparativa_mensual_exportaciones'
                            }
                        }
                    },
                    tooltip: { 
                        trigger: 'axis', 
                        axisPointer: { type: 'shadow' },
                        formatter: (params: any) => {
                            return params.map((param: any) => {
                                return `${param.seriesName}: ${new Intl.NumberFormat('es-CO', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(Math.round(param.value))} toneladas`;
                            }).join('<br/>');
                        }
                    },
                    legend: {
                        top: 10,
                        textStyle: { color: isDarkMode ? '#ffffff' : '#374151', fontSize: 11 },
                        data: ['Año Anterior', 'Año Actual'],
                    },
                    xAxis: {
                        type: 'category',
                        data: meses,
                        axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: { 
                            color: isDarkMode ? '#ffffff' : '#374151', 
                            fontSize: 10, 
                            fontWeight: 600,
                            rotate: 0
                        },
                    },
                    yAxis: {
                        type: 'value',
                        axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: {
                            color: isDarkMode ? '#ffffff' : '#6b7280',
                            fontSize: 10,
                            formatter: (value: number) =>
                                new Intl.NumberFormat('es-CO', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(value),
                        },
                        splitLine: { lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } },
                    },
                    series: [
                        {
                            name: 'Año Anterior',
                            type: 'bar',
                            data: toneladasAnterior,
                            barMaxWidth: 18,
                            itemStyle: { color: '#ff8c04', borderRadius: [4, 4, 0, 0] },
                            label: {
                                show: true,
                                position: 'top',
                                color: isDarkMode ? '#ffffff' : '#111827',
                                fontSize: 10,
                                formatter: ({ value }: { value: number }) =>
                                    new Intl.NumberFormat('es-CO', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    }).format(Math.round(value as number)),
                            },
                        },
                        {
                            name: 'Año Actual',
                            type: 'bar',
                            data: toneladasActual,
                            barMaxWidth: 18,
                            itemStyle: { color: '#114962', borderRadius: [4, 4, 0, 0] },
                            label: {
                                show: true,
                                position: 'top',
                                color: isDarkMode ? '#ffffff' : '#111827',
                                fontSize: 10,
                                formatter: ({ value }: { value: number }) =>
                                    new Intl.NumberFormat('es-CO', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    }).format(Math.round(value as number)),
                            },
                        }
                    ],
                    animation: true,
                };

                chartInstance.current.setOption(options);
            } else {
                // Modo normal: una sola serie (año actual)
                const options: echarts.EChartsCoreOption = {
                    grid: { top: 60, left: 50, right: 20, bottom: 60 },
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
                                name: 'exportaciones_mensuales'
                            }
                        }
                    },
                    tooltip: { 
                        trigger: 'axis', 
                        axisPointer: { type: 'shadow' },
                        formatter: (params: any) => {
                            const data = params[0];
                            return `${data.name}: ${new Intl.NumberFormat('es-CO', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            }).format(Math.round(data.value))} toneladas`;
                        }
                    },
                    legend: {
                        top: 10,
                        textStyle: { color: isDarkMode ? '#ffffff' : '#374151', fontSize: 11 },
                        data: ['Toneladas por mes'],
                    },
                    xAxis: {
                        type: 'category',
                        data: meses,
                        axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: { 
                            color: isDarkMode ? '#ffffff' : '#374151', 
                            fontSize: 10, 
                            fontWeight: 600,
                            rotate: 0
                        },
                    },
                    yAxis: {
                        type: 'value',
                        axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                        axisTick: { show: false },
                        axisLabel: {
                            color: isDarkMode ? '#ffffff' : '#6b7280',
                            fontSize: 10,
                            formatter: (value: number) =>
                                new Intl.NumberFormat('es-CO', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(value),
                        },
                        splitLine: { lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } },
                    },
                    series: [
                        {
                            name: 'Toneladas por mes',
                            type: 'bar',
                            data: toneladas,
                            barMaxWidth: 18,
                            itemStyle: { color: '#114962', borderRadius: [4, 4, 0, 0] },
                            label: {
                                show: true,
                                position: 'top',
                                color: isDarkMode ? '#ffffff' : '#111827',
                                fontSize: 10,
                                formatter: ({ value }: { value: number }) =>
                                    new Intl.NumberFormat('es-CO', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    }).format(Math.round(value as number)),
                            },
                        }
                    ],
                    animation: true,
                };

                chartInstance.current.setOption(options);
            }

            return () => {
                chartInstance.current?.dispose();
            };
        }, [data, isClient, toggleEnabled, isDarkMode]);

        React.useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="w-full">
                <h4 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    {data?.tabla_meses && data.tabla_meses.length > 0 
                        ? (toggleEnabled && data?.data_agno_comparativo 
                            ? 'Comparativa mensual: Año Actual vs Año Anterior' 
                            : 'Exportaciones mensuales (datos reales)')
                        : 'Exportaciones mensuales (sin datos)'
                    }
                </h4>
                <div className="h-[280px] sm:h-[350px] lg:h-[600px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // Gráfico de pastel para posiciones arancelarias usando datos reales del API
    const PosicionesPieChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;

            chartInstance.current = echarts.init(chartRef.current);

            // Usar datos reales del API si están disponibles
            const posicionesData = data?.tabla_posicion || [];

            // Si no hay datos, mostrar mensaje
            if (posicionesData.length === 0) {
                const options: echarts.EChartsCoreOption = {
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: {
                            text: 'No hay datos disponibles',
                            fontSize: 16,
                            fill: '#999'
                        }
                    }
                };
                chartInstance.current.setOption(options);
                return;
            }

            // Colores para las posiciones (usar colores del tema)
            const colors = [
                '#f97316', '#0ea5e9', '#22c55e', '#92400e', '#3b82f6',
                '#059669', '#dc2626', '#7c3aed', '#ea580c', '#16a34a',
                '#0891b2', '#7c2d12', '#65a30d', '#be185d', '#9333ea'
            ];

            const chartData = posicionesData.map((item, index) => ({
                value: item.total_toneladas_neto,
                name: item.pos,
                itemStyle: { 
                    color: colors[index % colors.length],
                    borderRadius: 8,
                    borderColor: '#fff',
                    borderWidth: 2
                }
            }));

            const options: echarts.EChartsCoreOption = {
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
                            type: ['pie', 'doughnut'],
                            title: {
                                pie: 'Cambiar a Pastel',
                                doughnut: 'Cambiar a Dona'
                            }
                        },
                        restore: { 
                            show: true,
                            title: 'Restaurar'
                        },
                        saveAsImage: { 
                            show: true,
                            title: 'Descargar como Imagen',
                            name: 'posiciones_arancelarias_exportaciones'
                        }
                    }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: (params: any) => {
                        const percentage = ((params.value / posicionesData.reduce((sum, item) => sum + item.total_toneladas_neto, 0)) * 100).toFixed(2);
                        return `${params.name}<br/>${new Intl.NumberFormat('es-CO', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(Math.round(params.value))} toneladas (${percentage}%)`;
                    }
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    top: 'middle',
                    textStyle: { color: isDarkMode ? '#ffffff' : '#374151', fontSize: 10 },
                    itemWidth: 12,
                    itemHeight: 12,
                    itemGap: 8,
                    formatter: (name: string) => {
                        const item = posicionesData.find(d => d.pos === name);
                        if (item) {
                            const percentage = ((item.total_toneladas_neto / posicionesData.reduce((sum, d) => sum + d.total_toneladas_neto, 0)) * 100).toFixed(1);
                            return `${name} (${percentage}%)`;
                        }
                        return name;
                    }
                },
                series: [
                    {
                        name: 'Posiciones',
                        type: 'pie',
                        radius: ['25%', '45%'],
                        center: ['65%', '50%'],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 6,
                            borderColor: isDarkMode ? '#ffffff40' : '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: true,
                            position: 'outside',
                            formatter: (params: any) => {
                                const percentage = ((params.value / posicionesData.reduce((sum, item) => sum + item.total_toneladas_neto, 0)) * 100).toFixed(1);
                                // Solo mostrar etiquetas para segmentos con más del 3% para evitar sobrecarga
                                if (parseFloat(percentage) > 3) {
                                    return `${params.name}\n${percentage}%`;
                                }
                                return '';
                            },
                            fontSize: 11,
                            fontWeight: 'bold',
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderRadius: 4,
                            padding: [4, 8]
                        },
                        labelLine: {
                            show: true,
                            length: 15,
                            length2: 10,
                            smooth: true,
                            lineStyle: {
                                color: isDarkMode ? '#ffffff60' : undefined
                            }
                        },
                        data: chartData,
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            };

            chartInstance.current.setOption(options);

            return () => {
                chartInstance.current?.dispose();
            };
        }, [data, isClient, isDarkMode]);

        React.useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="w-full h-full p-4">
                <h4 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    {data?.tabla_posicion && data.tabla_posicion.length > 0 
                        ? 'CONSOLIDADO POR POSICIONES (datos reales)' 
                        : 'CONSOLIDADO POR POSICIONES (sin datos)'
                    }
                </h4>
                <div className="h-[280px] sm:h-[320px] lg:h-[380px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // Gráfico de barras para continentes usando datos reales del API
    const ContinentesBarChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;

            chartInstance.current = echarts.init(chartRef.current);

            // Usar datos reales del API si están disponibles
            const continentesData = data?.tabla_continente || [];

            // Si no hay datos, mostrar mensaje
            if (continentesData.length === 0) {
                const options: echarts.EChartsCoreOption = {
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: {
                            text: 'No hay datos disponibles',
                            fontSize: 16,
                            fill: '#999'
                        }
                    }
                };
                chartInstance.current.setOption(options);
                return;
            }

            const continentes = continentesData.map(item => item.continente);
            const toneladas = continentesData.map(item => item.total_toneladas_neto);

            const options: echarts.EChartsCoreOption = {
                grid: { top: 60, left: 60, right: 20, bottom: 60 },
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
                            name: 'continentes_exportaciones'
                        }
                    }
                },
                tooltip: { 
                    trigger: 'axis', 
                    axisPointer: { type: 'shadow' },
                    formatter: (params: any) => {
                        const data = params[0];
                        return `${data.name}: ${new Intl.NumberFormat('es-CO', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                        }).format(Math.round(data.value))} toneladas`;
                    }
                },
                xAxis: {
                    type: 'category',
                    data: continentes,
                    axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                    axisTick: { show: false },
                    axisLabel: { 
                        color: isDarkMode ? '#ffffff' : '#374151', 
                        fontSize: 10, 
                        fontWeight: 600,
                        rotate: 0
                    },
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' } },
                    axisTick: { show: false },
                    axisLabel: {
                        color: isDarkMode ? '#ffffff' : '#6b7280',
                        fontSize: 10,
                        formatter: (value: number) =>
                            new Intl.NumberFormat('es-CO', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            }).format(Math.round(value)),
                    },
                    splitLine: { lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } },
                },
                series: [
                    {
                        type: 'bar',
                        data: toneladas.map((value) => ({
                            value,
                            itemStyle: {
                                color: '#186484',
                                borderRadius: [4, 4, 0, 0],
                            },
                        })),
                        barWidth: '40%',
                        label: {
                            show: true,
                            position: 'top',
                            formatter: ({ value }: any) => new Intl.NumberFormat('es-CO', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            }).format(Math.round(value)),
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            fontSize: 11,
                            fontWeight: 600,
                        },
                    },
                ],
                animation: true,
            };

            chartInstance.current.setOption(options);

            return () => {
                chartInstance.current?.dispose();
            };
        }, [data, isClient, isDarkMode]);

        React.useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="w-full h-full p-4">
                <h4 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    {data?.tabla_continente && data.tabla_continente.length > 0 
                        ? 'CONSOLIDADO POR CONTINENTE (datos reales)' 
                        : 'CONSOLIDADO POR CONTINENTE (sin datos)'
                    }
                </h4>
                <div className="h-[280px] sm:h-[320px] lg:h-[380px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // Gráfico de pastel para vías usando datos reales del API
    const ViasPieChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current || !isClient) return;

            chartInstance.current = echarts.init(chartRef.current);

            // Usar datos reales del API si están disponibles
            const viasData = data?.tabla_via || [];

            // Si no hay datos, mostrar mensaje
            if (viasData.length === 0) {
                const options: echarts.EChartsCoreOption = {
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: {
                            text: 'No hay datos disponibles',
                            fontSize: 16,
                            fill: '#999'
                        }
                    }
                };
                chartInstance.current.setOption(options);
                return;
            }

            // Ordenar datos por valor (de menor a mayor) para mejor efecto visual
            const sortedViasData = [...viasData].sort((a, b) => a.total_toneladas_neto - b.total_toneladas_neto);

            // Colores específicos para cada tipo de vía
            const getColorForVia = (viaName: string) => {
                const viaLower = viaName.toLowerCase();
                if (viaLower.includes('terrestre')) return '#4ea62f';
                if (viaLower.includes('marítima') || viaLower.includes('maritima')) return '#109cd4';
                if (viaLower.includes('aérea') || viaLower.includes('aerea')) return '#f07434';
                // Color por defecto para otras vías
                return '#6b7280';
            };

            const chartData = sortedViasData.map((item, _index) => ({
                value: item.total_toneladas_neto,
                name: item.via,
                itemStyle: { 
                    color: getColorForVia(item.via)
                }
            }));

            const options: echarts.EChartsCoreOption = {
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                title: {
                    text: 'CONSOLIDADO POR VÍA',
                    left: 'center',
                    top: 20,
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#374151',
                        fontSize: 16,
                        fontWeight: 'bold'
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
                            type: ['pie', 'doughnut'],
                            title: {
                                pie: 'Cambiar a Pastel',
                                doughnut: 'Cambiar a Dona'
                            }
                        },
                        restore: { 
                            show: true,
                            title: 'Restaurar'
                        },
                        saveAsImage: { 
                            show: true,
                            title: 'Descargar como Imagen',
                            name: 'vias_exportaciones'
                        }
                    }
                },
                tooltip: {
                    trigger: 'item',
                    backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDarkMode ? '#ffffff40' : '#e5e7eb',
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#374151'
                    },
                    formatter: (params: any) => {
                        const percentage = ((params.value / sortedViasData.reduce((sum, item) => sum + item.total_toneladas_neto, 0)) * 100).toFixed(2);
                        return `<div style="padding: 8px;">
                            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
                            <div>${new Intl.NumberFormat('es-CO', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(Math.round(params.value))} toneladas</div>
                            <div style="color: #6b7280; font-size: 12px;">${percentage}% del total</div>
                        </div>`;
                    }
                },
                visualMap: {
                    show: false,
                    min: Math.min(...sortedViasData.map(d => d.total_toneladas_neto)),
                    max: Math.max(...sortedViasData.map(d => d.total_toneladas_neto)),
                    inRange: {
                        colorLightness: [0.3, 0.8]
                    }
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    top: 'middle',
                    textStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#374151', 
                        fontSize: 11 
                    },
                    itemWidth: 12,
                    itemHeight: 12,
                    itemGap: 8,
                    formatter: (name: string) => {
                        const item = sortedViasData.find(d => d.via === name);
                        if (item) {
                            const percentage = ((item.total_toneladas_neto / sortedViasData.reduce((sum, d) => sum + d.total_toneladas_neto, 0)) * 100).toFixed(1);
                            return `${name} (${percentage}%)`;
                        }
                        return name;
                    }
                },
                series: [
                    {
                        name: 'Vías de Transporte',
                        type: 'pie',
                        radius: '55%',
                        center: ['50%', '50%'],
                        avoidLabelOverlap: false,
                        roseType: 'radius',
                        itemStyle: {
                            borderRadius: 8,
                            borderColor: isDarkMode ? '#ffffff40' : '#ffffff',
                            borderWidth: 2,
                            shadowBlur: 20,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        },
                        label: {
                            show: true,
                            position: 'outside',
                            color: isDarkMode ? 'rgba(243, 244, 246, 0.9)' : 'rgba(55, 65, 81, 0.8)',
                            fontSize: 11,
                            fontWeight: 'bold',
                            formatter: (params: any) => {
                                const percentage = ((params.value / sortedViasData.reduce((sum, item) => sum + item.total_toneladas_neto, 0)) * 100).toFixed(1);
                                return `${params.name}\n${percentage}%`;
                            }
                        },
                        labelLine: {
                            show: true,
                            lineStyle: {
                                color: isDarkMode ? 'rgba(243, 244, 246, 0.5)' : 'rgba(55, 65, 81, 0.3)'
                            },
                            smooth: 0.2,
                            length: 10,
                            length2: 20
                        },
                        data: chartData,
                        animationType: 'scale',
                        animationEasing: 'elasticOut',
                        animationDelay: function () {
                            return Math.random() * 200;
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 30,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)',
                                scale: 1.05
                            }
                        }
                    }
                ]
            };

            chartInstance.current.setOption(options);

            return () => {
                chartInstance.current?.dispose();
            };
        }, [data, isClient, isDarkMode]);

        React.useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
            <div className="w-full h-full p-4">
                <div className="h-[280px] sm:h-[320px] lg:h-[380px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // Datos para la tabla de posiciones arancelarias usando datos reales del API
    const datosPosiciones = (data?.tabla_posicion || []).map((item, idx) => ({
        no: idx + 1,
        pos: item.pos,
        toneladas: Math.round(item.total_toneladas_neto),
        participacion: Math.round(item.porcentaje)
    }));

    const columnasPosiciones: CompactTableColumn[] = [
        { key: 'no', label: 'No',  align: 'center' },
        { key: 'pos', label: 'POSICIÓN', align: 'left', truncate: true },
        { 
            key: 'toneladas', 
            label: 'TONELADAS', 
            align: 'right',
            render: (value: number) => new Intl.NumberFormat('es-CO', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(Math.round(value))
        },
        { 
            key: 'participacion', 
            label: '%',  
            align: 'right', 
            render: (value: number) => `${value}%` 
        }
    ];

    const columnasContinentes: CompactTableColumn[] = [
        { key: 'no', label: 'No', align: 'center' },
        { key: 'continente', label: 'CONTINENTE',  align: 'left', truncate: true },
        { 
            key: 'toneladas', 
            label: 'TONELADAS', 
            align: 'right',
            render: (value: number) => new Intl.NumberFormat('es-CO', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(Math.round(value))
        },
        { 
            key: 'participacion', 
            label: '%', 
            align: 'right', 
            render: (value: number) => `${value}%` 
        }
    ];

    const columnasVias: CompactTableColumn[] = [
        { key: 'no', label: 'No',  align: 'center' },
        { key: 'via', label: 'VÍA',  align: 'left', truncate: true },
        { 
            key: 'toneladas', 
            label: 'TONELADAS', 
            align: 'right',
            render: (value: number) => new Intl.NumberFormat('es-CO', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(Math.round(value))
        },
        { 
            key: 'participacion', 
            label: '%', 
            align: 'right', 
            render: (value: number) => `${value}%` 
        }
    ];

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
                        TABLERO ESTADISTICA DE {tipoCargueSeleccionado === 'IMP' ? 'IMPORTACION' : 'EXPORTACION'} CONSOLIDADO MENSUAL POR PARTIDA
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
                            label='Posición arancelaria'
                            name='posicion_arancelaria'
                            value={posicionSeleccionada}
                            onChange={(e) => setPosicionSeleccionada(e.target.value)}
                            darkMode={isDarkMode}
                            options={[
                                { key: '', value: '', title: 'Todas las posiciones' },
                                ...posiciones.map(pos => ({
                                    key: pos,
                                    value: pos,
                                    title: pos
                                }))
                            ]}
                        />

                        <AnimatedSelect
                            label='Puerto o Aeropuerto'
                            name='puerto_o_aeropuerto'
                            value={aduanaSeleccionada}
                            onChange={(e) => setAduanaSeleccionada(e.target.value)}
                            darkMode={isDarkMode}
                            options={[
                                { key: '', value: '', title: 'Todas las aduanas' },
                                ...aduanas.map(aduana => ({
                                    key: aduana,
                                    value: aduana,
                                    title: aduana
                                }))
                            ]}
                        />

                        <AnimatedSelect
                            label='Continente'
                            name='continente'
                            value={continenteSeleccionado}
                            onChange={(e) => setContinenteSeleccionado(e.target.value)}
                            darkMode={isDarkMode}
                            options={[
                                { key: '', value: '', title: 'Todos los continentes' },
                                ...continentes.map(continente => ({
                                    key: continente,
                                    value: continente,
                                    title: continente
                                }))
                            ]}
                        />

                        <AnimatedSelect
                            label='Vía'
                            name='via'
                            value={viaSeleccionada}
                            onChange={(e) => setViaSeleccionada(e.target.value)}
                            darkMode={isDarkMode}
                            options={[
                                { key: '', value: '', title: 'Todas las vías' },
                                ...vias.map(via => ({
                                    key: via,
                                    value: via,
                                    title: via
                                }))
                            ]}
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
                        
                        <AnimatedSelect
                            label={isLoadingPaises ? 'País (Cargando...)' : 'País'}
                            name='pais'
                            value={paisSeleccionado}
                            onChange={(e) => setPaisSeleccionado(e.target.value)}
                            disabled={isLoadingPaises}
                            darkMode={isDarkMode}
                            options={[
                                { key: 'todos', value: '', title: 'Todos los países' },
                                ...(isLoadingPaises ? [] : getOpcionesSelect())
                            ]}
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
                        <Button title='PPTX Gráfica' onClick={handleDescargarGraficaCompleta} />
                        
                        <Button title='Salir' onClick={() => router.push('/')} />
                    </div>
          
                </div>

                {/* Sección de resultados con gráficas y tablas */}
                <div className="mt-4 sm:mt-6">
                    <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 sm:my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                        {tipoCargueSeleccionado === 'IMP' ? 'IMPORTACIONES' : 'EXPORTACIONES'} DE CACAO EN GRANO (TONELADAS) CONSOLIDADO MENSUAL 
                    </h2>

                    {/* Filtros Activos */}
                    <div className="mt-4 sm:mt-6">
                        <div className="mb-6">
                            <div className="flex flex-wrap justify-center gap-4">
                                {/* Puerto/Aduana */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'} border rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center`}>
                                    <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        PUERTO O ADUANA
                                    </div>
                                    <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {aduanaSeleccionada || 'TODOS'}
                                    </div>
                                </div>

                                {/* Vía */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'} border rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center`}>
                                    <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        VÍA
                                    </div>
                                    <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {viaSeleccionada || 'TODOS'}
                                    </div>
                                </div>

                                {/* Continente */}
                                <div className={`${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'} border rounded-lg px-4 py-3 shadow-sm min-w-[30%] text-center`}>
                                    <div className={`text-md font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                        CONTINENTE
                                    </div>
                                    <div className={`text-md uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {continenteSeleccionado || 'TODOS'}
                                    </div>
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
   
                        {/* Contenedor 1*/}
                        <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                <div className="col-span-1 lg:col-span-2">
                                    <MonthlyComparisonChart />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor 2 */}
                        <div className="">
                            <div className="flex flex-col lg:flex-row gap-4 lg:gap-[3%]">
                                {/* Gráfica de pastel - 48% del ancho */}
                                <div className={`rounded-2xl ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} w-full lg:w-[48%] sm:rounded-3xl shadow-md`}>
                                    <PosicionesPieChart />
                                </div>
                                
                                {/* Tabla de posiciones - 48% del ancho */}
                                <div className={`rounded-2xl ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} w-full lg:w-[48%] sm:rounded-3xl shadow-md p-4 flex flex-col justify-center`}>
                                    <CompactTable
                                        columns={columnasPosiciones}
                                        data={datosPosiciones}
                                        title="POSICIONES ARANCELARIAS"
                                        darkMode={isDarkMode}
                                        total={{
                                            values: ['TOTAL', '', Math.round(totalToneladasNumerico), '100%'],
                                            className: 'bg-gray-100'
                                        }}
                                        maxHeight="100%"
                                        showIndex={false}
                                        className="h-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor 3: Gráfica de barras y tabla de continentes */}
                        <div className="">
                            <div className="flex flex-col lg:flex-row gap-4 lg:gap-[3%]">
                                {/* Gráfica de barras de continentes - 48% del ancho */}
                                <div className={`rounded-2xl ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} w-full lg:w-[48%] sm:rounded-3xl shadow-md`}>
                                    <ContinentesBarChart />
                                </div>
                                
                                {/* Tabla de continentes - 48% del ancho */}
                                <div className={`rounded-2xl ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} w-full lg:w-[48%] sm:rounded-3xl shadow-md p-4 flex flex-col justify-center`}>
                                    <CompactTable
                                        columns={columnasContinentes}
                                        data={datosPorContinente.map((item, index) => ({
                                            ...item,
                                            no: index + 1
                                        }))}
                                        title="CONTINENTES"
                                        darkMode={isDarkMode}
                                        total={{
                                            values: ['TOTAL', '', Math.round(totalToneladasNumerico), '100%'],
                                            className: 'bg-gray-100'
                                        }}
                                        maxHeight="100%"
                                        showIndex={false}
                                        className="h-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contenedor 4: Gráfica de pastel y tabla de vías */}
                        <div className="">
                            <div className="flex flex-col lg:flex-row gap-4 lg:gap-[3%]">
                                {/* Gráfica de pastel de vías - 48% del ancho */}
                                <div className={`rounded-2xl ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} w-full lg:w-[48%] sm:rounded-3xl shadow-md`}>
                                    <ViasPieChart />
                                </div>
                                
                                {/* Tabla de vías - 48% del ancho */}
                                <div className={`rounded-2xl ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} w-full lg:w-[48%] sm:rounded-3xl shadow-md p-4 flex flex-col justify-center`}>
                                    <CompactTable
                                        columns={columnasVias}
                                        data={datosPorVia.map((item, index) => ({
                                            ...item,
                                            no: index + 1
                                        }))}
                                        title="VÍAS"
                                        darkMode={isDarkMode}
                                        total={{
                                            values: ['TOTAL', '', Math.round(totalToneladasNumerico), '100%'],
                                            className: 'bg-gray-100'
                                        }}
                                        maxHeight="100%"
                                        showIndex={false}
                                        className="h-full"
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
  
export default ExportacionConsolidadoMensual;
  