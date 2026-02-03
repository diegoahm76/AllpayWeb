'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { SeriesAnualesResponse } from '../models/series-anuales.models';
import { usePronosticoLineal } from '../hooks/usePronosticoLineal';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import * as echarts from 'echarts';
import PptxGenJS from 'pptxgenjs';

interface Tablero3Props {
    seriesAnualesData?: SeriesAnualesResponse | null;
    isLoadingSeriesAnuales?: boolean;
    anoActual?: string;
    periodosEstadisticos?: string;
}

export interface Tablero3Ref {
    fetchTablero3Data: () => void;
    downloadPPT: () => Promise<void>;
}

const Tablero3 = forwardRef<Tablero3Ref, Tablero3Props>(({ 
    anoActual,
    periodosEstadisticos 
}, ref) => {
    const { theme } = useTheme();
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.EChartsType | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Función toNum para manejar formato de números europeos
    const toNum = (v: unknown): number => {
        if (typeof v === 'number') return isFinite(v) ? v : 0;
        if (typeof v === 'string') {
            let clean = v.replace(/\s/g, ''); // Remover espacios
            
            // Si tiene punto y coma (formato europeo completo)
            if (clean.includes('.') && clean.includes(',')) {
                const parts = clean.split(',');
                const integerPart = parts[0].replace(/\./g, '');
                clean = integerPart;
            }
            // Si solo tiene punto y exactamente 3 dígitos después
            else if (/^\d{1,3}\.\d{3}$/.test(clean)) {
                clean = clean.replace('.', '');
            }
            // Para números más grandes como 1.234.567
            else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
                clean = clean.replace(/\./g, '');
            }
            // Si solo tiene coma
            else if (clean.includes(',') && !clean.includes('.')) {
                clean = clean.split(',')[0];
            }
            
            const n = Number(clean);
            return isFinite(n) ? n : 0;
        }
        return 0;
    };

    // Hook para pronóstico lineal
    const {
        data: pronosticoLinealData,
        loading: isLoadingPronosticoLineal,
        fetchData: fetchPronosticoLinealData
    } = usePronosticoLineal();

    // Función para obtener datos del Tablero 3
    const handleFetchTablero3Data = () => {
        if (token && anoActual && periodosEstadisticos) {
            const ano = parseInt(anoActual);
            const periodos = parseInt(periodosEstadisticos);
            if (!isNaN(ano) && !isNaN(periodos)) {
                // Llamar al API de pronóstico lineal
                fetchPronosticoLinealData(token, {
                    anio_actual: ano,
                    periodos_estadisticos: periodos
                });
            }
        }
    };

    const downloadPPT = async (): Promise<void> => {
        try {
            const pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_WIDE';
      
        // Helpers locales para que sea drop-in
        const fmt = (n: unknown) => toNum(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
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
        const addBrandHeader = (slide: PptxGenJS.Slide, logoBase64: string, title: string, subtitle?: string) => {
          slide.addImage({ data: logoBase64, x: 0.2, y: 0.2, w: 1.4, h: 0.8 });
          slide.addText(title, { x: 1.8, y: 0.25, w: 7.8, h: 0.6, fontSize: 20, bold: true, color: '562707', align: 'center' });
          if (subtitle) slide.addText(subtitle, { x: 2.2, y: 0.75, w: 7.0, h: 0.4, fontSize: 12, color: '6B7280', align: 'center' });
        };
      
        const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
      
        const rowsApi = pronosticoLinealData?.data?.pronostico_lineal ?? [];
        // Fallback vacío seguro
        const rows = rowsApi.length
          ? rowsApi
          : [{ anio: Number(anoActual) || new Date().getFullYear(), meses: { ene:0,feb:0,mar:0,abr:0,may:0,jun:0,jul:0,ago:0,sep:0,oct:0,nov:0,dic:0 }, produccion_anual: 0 } as any];
      
        // ======= SLIDE 1: Tabla completa (valores absolutos) =======
        {
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Pronóstico lineal – Tabla', `Año base: ${anoActual ?? '—'}  |  Períodos: ${periodosEstadisticos ?? '—'}`);
      
          const H: PptxGenJS.TableRow = [
            { text: 'AÑO', options: { bold: true } },
            { text: 'ENE' }, { text: 'FEB' }, { text: 'MAR' }, { text: 'ABR' }, { text: 'MAY' }, { text: 'JUN' },
            { text: 'JUL' }, { text: 'AGO' }, { text: 'SEP' }, { text: 'OCT' }, { text: 'NOV' }, { text: 'DIC' },
            { text: 'PRODUCCIÓN ANUAL', options: { bold: true } },
          ];
      
          const body: PptxGenJS.TableRow[] = rows.map((r: any) => ([
            { text: String(r.anio) },
            { text: fmt(r.meses?.ene) }, { text: fmt(r.meses?.feb) }, { text: fmt(r.meses?.mar) }, { text: fmt(r.meses?.abr) },
            { text: fmt(r.meses?.may) }, { text: fmt(r.meses?.jun) }, { text: fmt(r.meses?.jul) }, { text: fmt(r.meses?.ago) },
            { text: fmt(r.meses?.sep) }, { text: fmt(r.meses?.oct) }, { text: fmt(r.meses?.nov) }, { text: fmt(r.meses?.dic) },
            { text: fmt(r.produccion_anual) },
          ]));
      
          slide.addTable([H, ...body], {
            x: 0.7, y: 2.3, w: 9.9, fontSize: 9,
            border: { type: 'solid', color: '000000', pt: 1 },
            colW: [0.9,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,1.3],
          });
        }
      
        // Prepara arreglos numéricos (en miles) para gráficas
        const xLabels = rows.map((r: any) => String(r.anio));
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      
        const perMonthSeries = months.map((_, idx) => rows.map((r: any) => toNum(
          [r.meses?.ene, r.meses?.feb, r.meses?.mar, r.meses?.abr, r.meses?.may, r.meses?.jun, r.meses?.jul, r.meses?.ago, r.meses?.sep, r.meses?.oct, r.meses?.nov, r.meses?.dic][idx]
        ) / 1000));
      
        const totalsK = rows.map((r: any) => toNum(r.produccion_anual) / 1000);
      
        // ======= SLIDE 2: Barras apiladas por año (miles) =======
        {
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Pronóstico lineal – Distribución mensual (miles)');
      
          const chartData = months.map((m, i) => ({
            name: m,
            labels: xLabels,
            values: perMonthSeries[i],
          }));
      
          slide.addChart(pptx.ChartType.bar, chartData, {
            x: 1.0, y: 2.2, w: 9.8, h: 4.4,
            barGrouping: 'stacked',
            legendPos: 'b',
            showValue: false,
            dataLabelFormatCode: '#,##0',
            catAxisLabelColor: '562707',
            valAxisLabelColor: '562707',
          });
        }
      
        // ======= SLIDE 3: Línea del total anual (miles) =======
        {
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Pronóstico lineal – Total anual (miles)');
      
          slide.addChart(
            pptx.ChartType.line,
            [{ name: 'Total anual', labels: xLabels, values: totalsK }],
            {
              x: 1.0, y: 2.2, w: 9.8, h: 4.4,
              legendPos: 'b',
              showValue: false,
              dataLabelFormatCode: '#,##0',
              catAxisLabelColor: '562707',
              valAxisLabelColor: '562707',
            }
          );
        }
      
        // ======= SLIDE 4..6: Último año y dos anteriores (detalle mensual en miles) =======
        {
          if (rows.length > 0) {
            const ultimos = rows.slice(-3); // hasta 3 años
            const mesesLabels = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
      
            ultimos.forEach((r: any) => {
              const slide = pptx.addSlide();
              addBrandHeader(slide, logoBase64, `Detalle mensual ${r.anio} (miles)`);
      
              const m = r.meses || {};
              const vals = [
                toNum(m.ene), toNum(m.feb), toNum(m.mar), toNum(m.abr),
                toNum(m.may), toNum(m.jun), toNum(m.jul), toNum(m.ago),
                toNum(m.sep), toNum(m.oct), toNum(m.nov), toNum(m.dic)
              ].map(v => v / 1000);
      
              slide.addChart(
                pptx.ChartType.bar,
                [{ name: `Meses ${r.anio}`, labels: mesesLabels, values: vals }],
                {
                  x: 1.0, y: 2.2, w: 9.8, h: 4.4,
                  barGrouping: 'clustered',
                  legendPos: 'b',
                  dataLabelFormatCode: '#,##0',
                }
              );
            });
          }
        }
      
        const fileName = `Pronostico_Lineal_${anoActual || 'NA'}_${periodosEstadisticos || 'N'}.pptx`;
        await pptx.writeFile({ fileName });
        } catch (error) {
            console.error('Error generando PPT:', error);
            throw error;
        }
    };

    // Exponer las funciones al componente padre
    useImperativeHandle(ref, () => ({
        fetchTablero3Data: handleFetchTablero3Data,
        downloadPPT
    }));

    // Función para inicializar la gráfica
    const initChart = () => {
        if (!chartRef.current) return;
        // Evita instancias duplicadas
        const prev = echarts.getInstanceByDom(chartRef.current);
        if (prev) prev.dispose();
        chartInstanceRef.current = echarts.init(chartRef.current);
    };

    // Configuración de la gráfica con datos reales o por defecto
    const setupChart = () => {
        if (!chartInstanceRef.current) return;

        // Usar datos de la API si están disponibles, sino usar datos por defecto
        let rows: any[] = [];

        if (pronosticoLinealData?.data?.pronostico_lineal) {
            // Transformar datos de la API al formato esperado por la gráfica
            rows = pronosticoLinealData.data.pronostico_lineal.map(pronostico => ({
                year: pronostico.anio,
                m: [
                    toNum(pronostico.meses.ene) / 1000, 
                    toNum(pronostico.meses.feb) / 1000,
                    toNum(pronostico.meses.mar) / 1000,
                    toNum(pronostico.meses.abr) / 1000,
                    toNum(pronostico.meses.may) / 1000,
                    toNum(pronostico.meses.jun) / 1000,
                    toNum(pronostico.meses.jul) / 1000,
                    toNum(pronostico.meses.ago) / 1000,
                    toNum(pronostico.meses.sep) / 1000,
                    toNum(pronostico.meses.oct) / 1000,
                    toNum(pronostico.meses.nov) / 1000,
                    toNum(pronostico.meses.dic) / 1000
                ],
                total: toNum(pronostico.produccion_anual) / 1000 // Convertir a miles usando toNum
            }));
        } else {
            // Datos por defecto si no hay datos de la API
            rows = [
                { year: 2015, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2016, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2017, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2018, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2019, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2020, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2021, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 }, 
                { year: 2022, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2023, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2024, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2025, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 },
                { year: 2026, m: [0,0,0,0,0,0,0,0,0,0,0,0], total: 0 }
            ];
        }

        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const xAxisData = rows.map(r => String(r.year));

        // Paleta base (barras por mes, azul profesional)
        const barPalette = ['#0A3D62','#0E507F','#136397','#1A78B0','#2B8EC5','#45A2D0','#62B6DA','#7FC7E3','#9BD5EA','#B8E2F0','#D3EEF6','#ECF7FB'];

        // Escala OLIVA/VERDE derivada de #8D9761 (oscuro → claro) para la ÚLTIMA barra
        const greenScale = [
            '#40451F','#4E5725','#5D6930','#6C7B3B','#7B8D46',
            '#8D9761','#98A272','#A6AF84','#B5BC97','#C5CAA9',
            '#D6D9BD','#E8E9D3'
        ];

        const lastIdx = rows.length - 1;
        const emphasisStyle = { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } };

        const monthSeries = months.map((mName, idx) => ({
            name: mName,
            type: 'bar',
            stack: 'mensual',
            emphasis: emphasisStyle,
            data: rows.map((r, i) =>
                i === lastIdx
                    ? { value: r.m[idx], itemStyle: { color: greenScale[idx] } }
                    : r.m[idx]
            )
        }));

        const totalSeries = {
            name: 'Total Anual',
            type: 'line',
            smooth: true,
            showSymbol: false,
            emphasis: { focus: 'series' },
            lineStyle: { width: 3, color: '#FA9C05' },
            itemStyle: { color: '#FA9C05' },
            data: rows.map(r => r.total)
        };

        const option = {
            backgroundColor: isDarkMode ? '#260f00' : 'transparent',
            title: {
                text: 'Pronóstico Lineal de Producción de Cacao',
                subtext: 'Proyección Próximo Año',
                left: 'center',
                top: 10,
                textStyle: { 
                    color: isDarkMode ? '#f3f4f6' : '#000',
                    fontSize: 18,
                    fontWeight: 'bold'
                },
                subtextStyle: { 
                    color: isDarkMode ? '#d1d5db' : '#555',
                    fontSize: 14
                }
            },
            legend: {
                type: 'scroll',
                data: [...months, 'Total Anual'],
                top: 95,
                left: 'center',
                textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#000'
                }
            },
            toolbox: {
                right: 10,
                feature: {
                    magicType: { type: ['stack'] },
                    dataView: {},
                    saveAsImage: {
                        backgroundColor: isDarkMode ? '#260f00' : '#ffffff'
                    }
                },
                iconStyle: {
                    borderColor: isDarkMode ? '#f3f4f6' : '#000'
                },
                emphasis: {
                    iconStyle: {
                        borderColor: isDarkMode ? '#ffffff' : '#111827'
                    }
                }
            },
            color: barPalette,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                confine: true,
                backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#333'
                },
                formatter: (params: any) => {
                    const lines = [];
                    const axis = params[0].axisValueLabel || params[0].axisValue;
                    lines.push('<b>' + axis + '</b>');
                    params.forEach((p: any) => {
                        const val = (p.value == null || p.value === '-') ? '-' : Number(p.value).toFixed(3);
                        lines.push(p.marker + p.seriesName + ': ' + val);
                    });
                    return lines.join('<br/>');
                }
            },
            grid: { left: 50, right: 30, bottom: 80, top: 150, containLabel: true },
            xAxis: { 
                type: 'category', 
                data: xAxisData, 
                name: 'Año',
                axisLabel: {
                    color: isDarkMode ? '#f3f4f6' : '#000'
                },
                axisLine: {
                    lineStyle: {
                        color: isDarkMode ? '#ffffff40' : '#000'
                    }
                },
                nameTextStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#000'
                }
            },
            yAxis: { 
                type: 'value', 
                name: 'Valor (Miles)', 
                boundaryGap: [0, 0.02],
                axisLabel: {
                    color: isDarkMode ? '#f3f4f6' : '#000'
                },
                nameTextStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#000'
                },
                axisLine: {
                    lineStyle: {
                        color: isDarkMode ? '#ffffff40' : '#000'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: isDarkMode ? '#ffffff20' : '#f3f4f6'
                    }
                }
            },
            series: [...monthSeries, totalSeries]
        };

        chartInstanceRef.current.setOption(option as any, true);
        chartInstanceRef.current.resize();
    };

    // Datos transformados para la tabla
    const datosTablaPronosticoLineal = useMemo(() => {
        if (pronosticoLinealData?.data?.pronostico_lineal && pronosticoLinealData.data.pronostico_lineal.length > 0) {
            // Transformar los datos de la API al formato esperado por la tabla
            return pronosticoLinealData.data.pronostico_lineal.map(pronostico => ({
                anio: pronostico.anio,
                enero: toNum(pronostico.meses.ene),
                febrero: toNum(pronostico.meses.feb),
                marzo: toNum(pronostico.meses.mar),
                abril: toNum(pronostico.meses.abr),
                mayo: toNum(pronostico.meses.may),
                junio: toNum(pronostico.meses.jun),
                julio: toNum(pronostico.meses.jul),
                agosto: toNum(pronostico.meses.ago),
                septiembre: toNum(pronostico.meses.sep),
                octubre: toNum(pronostico.meses.oct),
                noviembre: toNum(pronostico.meses.nov),
                diciembre: toNum(pronostico.meses.dic),
                produccion_anual: toNum(pronostico.produccion_anual)
            }));
        } else {
            // Datos vacíos si no hay datos de la API
            return [];
        }
    }, [pronosticoLinealData]);

    const headerColumnsPronosticoLineal = useMemo(() => {
        // Encontrar el año máximo para identificar la última fila
        const maxYear = datosTablaPronosticoLineal.length > 0 
            ? Math.max(...datosTablaPronosticoLineal.map(item => item.anio))
            : 0;

        return [
            {
                key: 'anio',
                label: 'AÑO',
                render: (value: number) => {
                    const isLastRow = value === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value}
                        </span>
                    );
                }
            },
            {
                key: 'enero',
                label: 'ENERO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'febrero',
                label: 'FEBRERO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'marzo',
                label: 'MARZO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'abril',
                label: 'ABRIL',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'mayo',
                label: 'MAYO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'junio',
                label: 'JUNIO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'julio',
                label: 'JULIO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'agosto',
                label: 'AGOSTO',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'septiembre',
                label: 'SEPTIEMBRE',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'octubre',
                label: 'OCTUBRE',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'noviembre',
                label: 'NOVIEMBRE',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'diciembre',
                label: 'DICIEMBRE',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
            {
                key: 'produccion_anual',
                label: 'PRODUCCIÓN ANUAL',
                render: (value: number, row: any) => {
                    const isLastRow = row.anio === maxYear;
                    return (
                        <span className={isLastRow ? 'font-bold' : ''}>
                            {value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                    );
                }
            },
        ];
    }, [datosTablaPronosticoLineal]);

    // Función para obtener todos los datos para Excel
    const fetchPronosticoLinealForExcel = async () => {
        try {
            return {
                data: datosTablaPronosticoLineal,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos de pronóstico lineal para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // Efecto con ResizeObserver para inicializar cuando el contenedor tenga ancho > 0
    useEffect(() => {
        // No hacer nada hasta que el componente esté montado y el ref exista
        if (!mounted || !chartRef.current) return;

        const el = chartRef.current;
        const ro = new ResizeObserver((entries) => {
            const cr = entries[0].contentRect;
            const hasSize = cr.width > 0 && cr.height > 0;
            
            if (hasSize) {
                if (!chartInstanceRef.current || chartInstanceRef.current.isDisposed()) {
                    initChart();
                    setupChart();
                } else {
                    // Si ya existe, solo resize
                    chartInstanceRef.current.resize();
                }
            }
        });

        ro.observe(el);

        // Init "por si acaso" si ya hay tamaño
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && !chartInstanceRef.current) {
            initChart();
            setupChart();
        }

        return () => {
            ro.disconnect();
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                chartInstanceRef.current.dispose();
                chartInstanceRef.current = null;
            }
        };
    }, [mounted, isDarkMode]); // Dependencias para reconfigurar al montarse o cambiar el tema

    // Efecto para actualizar la gráfica cuando cambien los datos
    useEffect(() => {
        if (chartInstanceRef.current && !isLoadingPronosticoLineal) {
            setupChart();
        }
    }, [pronosticoLinealData, isDarkMode, isLoadingPronosticoLineal]);

    if (!mounted) return null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center my-4 sm:my-6">
                <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                    ESCENARIO DE PRONOSTICO LINEAL
                </h2>
            </div>

             {/* Contenedor 1 - Tabla */}
             <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                {isLoadingPronosticoLineal ? (
                    <div className="flex justify-center items-center py-8">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[#562707]'}`}></div>
                        <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Cargando pronóstico lineal...</span>
                    </div>
                ) : (
                    <>
                        <DynamicTable
                            columns={headerColumnsPronosticoLineal}
                            data={datosTablaPronosticoLineal}
                            currentPage={1}
                            totalPages={1}
                            onPageChange={() => {}}
                            fetchDataForExcel={fetchPronosticoLinealForExcel}
                            downloadButtonPosition="top"
                            darkMode={isDarkMode}
                        />
                    </>
                )}
            </div>
 
               {/* Contenedor 2 - Gráfica de Pronóstico Lineal */}
               <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                   <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                       GRÁFICA DE PRONÓSTICO LINEAL
                   </h3>
                   
                   {isLoadingPronosticoLineal ? (
                       <div className="flex justify-center items-center py-8">
                           <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[#562707]'}`}></div>
                           <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Cargando gráfica...</span>
                       </div>
                   ) : (
                       <div 
                           ref={chartRef} 
                           style={{ 
                               width: '100%', 
                               height: '600px',
                               minHeight: '400px'
                           }}
                       />
                   )}
               </div>
         
        </div>
    );
});

Tablero3.displayName = 'Tablero3';

export default Tablero3;
