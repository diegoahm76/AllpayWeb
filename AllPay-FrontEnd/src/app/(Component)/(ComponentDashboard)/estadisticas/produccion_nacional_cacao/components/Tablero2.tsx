'use client';

import React, { useMemo, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { SeriesAnualesResponse } from '../models/series-anuales.models';
import { useDistribucionMensual } from '../hooks/useDistribucionMensual';
import { useProduccionHistorica } from '../hooks/useProduccionHistorica';
import * as echarts from 'echarts';
import PptxGenJS from 'pptxgenjs';

interface Tablero2Props {
    seriesAnualesData?: SeriesAnualesResponse | null;
    isLoadingSeriesAnuales?: boolean;
    anoActual?: string; // Parámetro para el nuevo endpoint
    periodosEstadisticos?: number; // Nuevo parámetro para periodos estadísticos
}

export interface Tablero2Ref {
    fetchDistribucionData: () => void;
    fetchProduccionHistorica: () => void;
    downloadPPT: () => Promise<void>;
}

const Tablero2 = forwardRef<Tablero2Ref, Tablero2Props>(({ 
    seriesAnualesData, 
    isLoadingSeriesAnuales, 
    anoActual,
    periodosEstadisticos = 10 // Valor por defecto
}, ref) => {
    const { theme } = useTheme();
    const chartRef = useRef<HTMLDivElement>(null);
    const historicalChartRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Hook para distribución mensual
    const { 
        data: distribucionMensualData, 
        loading: isLoadingDistribucion, 
        fetchData: fetchDistribucionData 
    } = useDistribucionMensual();

    // Hook para producción histórica
    const {
        data: produccionHistoricaData,
        loading: isLoadingProduccionHistorica,
        fetchData: fetchProduccionHistoricaData
    } = useProduccionHistorica();

    // Función para obtener datos de distribución mensual (solo cuando el usuario consulte)
    const handleFetchDistribucionData = () => {
        if (token && anoActual) {
            const ano = parseInt(anoActual);
            if (!isNaN(ano)) {
                fetchDistribucionData(token, { 
                    anio_actual: ano,
                    periodos_estadisticos: periodosEstadisticos 
                });
            }
        }
    };

    // Función para obtener datos de producción histórica (solo cuando el usuario consulte)
    const handleFetchProduccionHistorica = () => {
        if (token && anoActual) {
            const ano = parseInt(anoActual);
            if (!isNaN(ano)) {
                fetchProduccionHistoricaData(token, { 
                    ano_actual: ano,
                    periodos_estadisticos: periodosEstadisticos 
                });
            }
        }
    };

    // ========= Helpers PPT =========
    const toNum = (v: unknown): number => {
        if (typeof v === 'number') return isFinite(v) ? v : 0;
        if (typeof v === 'string') {
            let clean = v.replace(/\s/g, ''); // Remover espacios
            
            // Formato europeo: punto como separador de miles, coma como decimal
            // Ejemplos: "6.762,000" -> 6762, "1.234,56" -> 1234, "5.248" -> 5248
            
            // Si tiene punto y coma (formato europeo completo)
            if (clean.includes('.') && clean.includes(',')) {
                // "6.762,000" -> remover puntos (miles) y procesar coma (decimal)
                const parts = clean.split(',');
                const integerPart = parts[0].replace(/\./g, ''); // Remover puntos de miles
                // Ignorar decimales para mantener números enteros
                clean = integerPart;
            }
            // Si solo tiene punto y exactamente 3 dígitos después (formato miles sin decimales)
            else if (/^\d{1,3}\.\d{3}$/.test(clean)) {
                clean = clean.replace('.', '');
            }
            // Para números más grandes como "1.234.567" (solo puntos)
            else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
                clean = clean.replace(/\./g, '');
            }
            // Si solo tiene coma (decimal sin miles)
            else if (clean.includes(',') && !clean.includes('.')) {
                // "1234,56" -> tomar solo la parte entera
                clean = clean.split(',')[0];
            }
            
            const n = Number(clean);
            return isFinite(n) ? n : 0;
        }
        return 0;
    };

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
        if (subtitle) {
            slide.addText(subtitle, { x: 2.2, y: 0.75, w: 7.0, h: 0.4, fontSize: 12, color: '6B7280', align: 'center' });
        }
    };

    // ========= Exportar PPT =========
    const downloadPPT = async () => {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
      
        // ---- Helpers extra para PPT ----
        const toPct = (v: unknown): number => {
          if (typeof v === 'number' && isFinite(v)) return v;
          if (typeof v === 'string') {
            // conserva decimales: "1.234,56" -> 1234.56 ; "12,5" -> 12.5 ; "12.5" -> 12.5
            const s = v.replace(/\s/g, '');
            // Si tiene . como miles y , como decimal
            if (s.match(/^\d{1,3}(\.\d{3})+(,\d+)?$/)) {
              return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
            }
            // Si solo tiene coma decimal
            if (s.includes(',') && !s.includes('.')) {
              return Number(s.replace(',', '.')) || 0;
            }
            // Normal
            return Number(s) || 0;
          }
          return 0;
        };
      
        // ---- Slide 1: Tabla Series Anuales
        {
          const slide = pptx.addSlide();
          addBrandHeader(
            slide,
            logoBase64,
            'Tasa de crecimiento – Series anuales',
            `Año base: ${anoActual || '—'}`
          );
      
          const headers: PptxGenJS.TableRow = [
            { text: 'AÑO', options: { bold: true } },
            { text: 'ENE' }, { text: 'FEB' }, { text: 'MAR' }, { text: 'ABR' }, { text: 'MAY' }, { text: 'JUN' },
            { text: 'JUL' }, { text: 'AGO' }, { text: 'SEP' }, { text: 'OCT' }, { text: 'NOV' }, { text: 'DIC' },
            { text: 'PRODUCCIÓN ANUAL', options: { bold: true } },
            { text: '% VAR. AÑO', options: { bold: true } },
          ];
      
          const rows: PptxGenJS.TableRow[] = (seriesAnualesData?.data?.series_anuales ?? []).map((s) => ([
            { text: s.anio?.toString() ?? '' },
            { text: fmt(s.meses?.ene) }, { text: fmt(s.meses?.feb) }, { text: fmt(s.meses?.mar) }, { text: fmt(s.meses?.abr) },
            { text: fmt(s.meses?.may) }, { text: fmt(s.meses?.jun) }, { text: fmt(s.meses?.jul) }, { text: fmt(s.meses?.ago) },
            { text: fmt(s.meses?.sep) }, { text: fmt(s.meses?.oct) }, { text: fmt(s.meses?.nov) }, { text: fmt(s.meses?.dic) },
            { text: fmt(s.produccion_anual) },
            { text: `${(s.variacion_pct ?? 0).toFixed(1)}%` },
          ]));
      
          slide.addTable([headers, ...rows], {
            x: 1, y: 2.5, w: 9.6, fontSize: 9,
            border: { type: 'solid', color: '000000', pt: 1 },
            colW: [0.9,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,1.3,1.0],
          });
        }
      
        // ---- Slide 2: Tabla Datos Adicionales (Proyección, Distribución, Participación %)
        {
          const d = seriesAnualesData?.data;
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Datos adicionales');
      
          const H: PptxGenJS.TableRow = [
            { text: 'TIPO', options: { bold: true } },
            { text: 'ENE' }, { text: 'FEB' }, { text: 'MAR' }, { text: 'ABR' }, { text: 'MAY' }, { text: 'JUN' },
            { text: 'JUL' }, { text: 'AGO' }, { text: 'SEP' }, { text: 'OCT' }, { text: 'NOV' }, { text: 'DIC' },
            { text: 'TOTAL', options: { bold: true } },
          ];
      
          const rowProy: PptxGenJS.TableRow = [
            { text: 'Proyección' },
            { text: fmt(d?.proyeccion?.meses.ene) }, { text: fmt(d?.proyeccion?.meses.feb) }, { text: fmt(d?.proyeccion?.meses.mar) },
            { text: fmt(d?.proyeccion?.meses.abr) }, { text: fmt(d?.proyeccion?.meses.may) }, { text: fmt(d?.proyeccion?.meses.jun) },
            { text: fmt(d?.proyeccion?.meses.jul) }, { text: fmt(d?.proyeccion?.meses.ago) }, { text: fmt(d?.proyeccion?.meses.sep) },
            { text: fmt(d?.proyeccion?.meses.oct) }, { text: fmt(d?.proyeccion?.meses.nov) }, { text: fmt(d?.proyeccion?.meses.dic) },
            { text: fmt(d?.proyeccion?.produccion_anual) },
          ];
      
          const rowDist: PptxGenJS.TableRow = [
            { text: 'Distribución mensual' },
            { text: fmt(d?.distribucion_mensual?.meses.ene) }, { text: fmt(d?.distribucion_mensual?.meses.feb) }, { text: fmt(d?.distribucion_mensual?.meses.mar) },
            { text: fmt(d?.distribucion_mensual?.meses.abr) }, { text: fmt(d?.distribucion_mensual?.meses.may) }, { text: fmt(d?.distribucion_mensual?.meses.jun) },
            { text: fmt(d?.distribucion_mensual?.meses.jul) }, { text: fmt(d?.distribucion_mensual?.meses.ago) }, { text: fmt(d?.distribucion_mensual?.meses.sep) },
            { text: fmt(d?.distribucion_mensual?.meses.oct) }, { text: fmt(d?.distribucion_mensual?.meses.nov) }, { text: fmt(d?.distribucion_mensual?.meses.dic) },
            { text: fmt(d?.distribucion_mensual?.total) },
          ];
      
          const p = d?.participacion_pct || {};
          const rowPart: PptxGenJS.TableRow = [
            { text: 'Participación %' },
            { text: `${toPct((p as any).ene)}%` }, { text: `${toPct((p as any).feb)}%` }, { text: `${toPct((p as any).mar)}%` },
            { text: `${toPct((p as any).abr)}%` }, { text: `${toPct((p as any).may)}%` }, { text: `${toPct((p as any).jun)}%` },
            { text: `${toPct((p as any).jul)}%` }, { text: `${toPct((p as any).ago)}%` }, { text: `${toPct((p as any).sep)}%` },
            { text: `${toPct((p as any).oct)}%` }, { text: `${toPct((p as any).nov)}%` }, { text: `${toPct((p as any).dic)}%` },
            { text: `${toPct((p as any).total)}%` },
          ];
      
          slide.addTable([H, rowProy, rowDist, rowPart], {
            x: 1, y: 2.5, w: 9.6, fontSize: 9,
            border: { type: 'solid', color: '000000', pt: 1 },
            colW: [1.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,1.0],
          });
        }
      
        // ---- Preparación de datos de distribución mensual
        const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const dist = distribucionMensualData?.data?.toneladas?.meses;
        const pct = distribucionMensualData?.data?.participacion_pct;
      
        const labelsMeses = mesesCortos;
        const valsTon = dist ? [
          toNum(dist.ene), toNum(dist.feb), toNum(dist.mar), toNum(dist.abr),
          toNum(dist.may), toNum(dist.jun), toNum(dist.jul), toNum(dist.ago),
          toNum(dist.sep), toNum(dist.oct), toNum(dist.nov), toNum(dist.dic)
        ] : new Array(12).fill(0);
      
        const valsPct = pct ? [
          toPct(pct.ene), toPct(pct.feb), toPct(pct.mar), toPct(pct.abr),
          toPct(pct.may), toPct(pct.jun), toPct(pct.jul), toPct(pct.ago),
          toPct(pct.sep), toPct(pct.oct), toPct(pct.nov), toPct(pct.dic)
        ] : new Array(12).fill(0);
      
        // ---- Slide 3: Barras Toneladas por mes
        {
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Estimación mensual – Toneladas');
      
          slide.addChart(
            pptx.ChartType.bar,
            [{ name: 'Toneladas', labels: labelsMeses, values: valsTon }],
            {
              x: 1.5, y: 2.5, w: 9.6, h: 4.3,
              barGrouping: 'clustered',
              legendPos: 'b',
              dataLabelFormatCode: '#,##0',
            }
          );
        }
      
        // ---- Slide 4: Línea % participación por mes
        {
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Estimación mensual – % de participación');
      
          slide.addChart(
            pptx.ChartType.line,
            [{ name: '% participación', labels: labelsMeses, values: valsPct }],
            {
              x: 1.5, y: 2.5, w: 9.6, h: 4.3,
              legendPos: 'b',
              dataLabelFormatCode: '0.0"%"',
            }
          );
        }
      
        // ---- Slide 5: Producción histórica por año (barras)
        {
          const raw = (produccionHistoricaData?.data?.produccion_historica ?? []);
          const labels = raw.length ? raw.map(r => String(r.anio)) : [];
          const values = raw.length ? raw.map(r => toNum(r.produccion_anual)) : [];
      
          const slide = pptx.addSlide();
          addBrandHeader(slide, logoBase64, 'Producción histórica por año');
      
          slide.addChart(
            pptx.ChartType.bar,
            [{ name: 'Producción', labels, values }],
            {
              x: 1.5, y: 2.5, w: 9.6, h: 4.3,
              barGrouping: 'clustered',
              legendPos: 'b',
              dataLabelFormatCode: '#,##0',
            }
          );
        }
      
        // ---- Slide 6: Producción mensual por año (últimos 3 años) con coerción numérica
        {
          const raw = (produccionHistoricaData?.data?.produccion_historica ?? []);
          if (raw.length > 0) {
            const ultimosAnos = raw.slice(-3);
            const mesesLabels = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
      
            ultimosAnos.forEach(yearData => {
              const slide = pptx.addSlide();
              addBrandHeader(slide, logoBase64, `Producción mensual ${yearData.anio}`);
      
              const m = yearData.meses || {};
              const monthlyValues = [
                toNum(m.ene), toNum(m.feb), toNum(m.mar), toNum(m.abr),
                toNum(m.may), toNum(m.jun), toNum(m.jul), toNum(m.ago),
                toNum(m.sep), toNum(m.oct), toNum(m.nov), toNum(m.dic)
              ];
      
              slide.addChart(
                pptx.ChartType.bar,
                [{ name: `Producción ${yearData.anio}`, labels: mesesLabels, values: monthlyValues }],
                {
                  x: 1.5, y: 2.5, w: 9.6, h: 4.3,
                  barGrouping: 'clustered',
                  legendPos: 'b',
                  dataLabelFormatCode: '#,##0',
                }
              );
            });
          }
        }
      
        await pptx.writeFile({ fileName: `Tasa_Crecimiento_${anoActual || 'NA'}.pptx` });
      };

    // Exponer las funciones al componente padre
    useImperativeHandle(ref, () => ({
        fetchDistribucionData: handleFetchDistribucionData,
        fetchProduccionHistorica: handleFetchProduccionHistorica,
        downloadPPT,
    }));

    // Refs para almacenar las instancias de los charts
    const chartInstanceRef = useRef<echarts.EChartsType | null>(null);
    const historicalChartInstanceRef = useRef<echarts.EChartsType | null>(null);

    const headerColumnsTasaCrecimiento = useMemo(() => {
        return [
            {
                key: 'anio',
                label: 'AÑO',
            },
            {
                key: 'enero',
                label: 'ENERO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'febrero',
                label: 'FEBRERO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'marzo',
                label: 'MARZO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'abril',
                label: 'ABRIL',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'mayo',
                label: 'MAYO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'junio',
                label: 'JUNIO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'julio',
                label: 'JULIO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'agosto',
                label: 'AGOSTO',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'septiembre',
                label: 'SEPTIEMBRE',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'octubre',
                label: 'OCTUBRE',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'noviembre',
                label: 'NOVIEMBRE',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'diciembre',
                label: 'DICIEMBRE',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'produccion_anual',
                label: 'PRODUCCIÓN ANUAL',
                render: (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
            },
            {
                key: 'variacion_pct',
                label: '% VARIACIÓN POR AÑO',
                render: (value: number) => `${value.toFixed(1)}%`
            },
        ];
    }, []);

    const datosTablaTasaCrecimiento = useMemo(() => {
        if (seriesAnualesData?.data?.series_anuales && seriesAnualesData.data.series_anuales.length > 0) {
            // Transformar los datos de la API al formato esperado por la tabla
            return seriesAnualesData.data.series_anuales.map(serie => ({
                anio: serie.anio,
                enero: serie.meses.ene,
                febrero: serie.meses.feb,
                marzo: serie.meses.mar,
                abril: serie.meses.abr,
                mayo: serie.meses.may,
                junio: serie.meses.jun,
                julio: serie.meses.jul,
                agosto: serie.meses.ago,
                septiembre: serie.meses.sep,
                octubre: serie.meses.oct,
                noviembre: serie.meses.nov,
                diciembre: serie.meses.dic,
                produccion_anual: serie.produccion_anual,
                variacion_pct: serie.variacion_pct
            }));
        } else {
            // Datos en 0 si no hay datos de la API
            return [];
        }
    }, [seriesAnualesData]);

    // Columnas para la tabla de datos adicionales (proyección, distribución, participación)
    const headerColumnsDatosAdicionales = useMemo(() => {
        return [
            {
                key: 'tipo',
                label: 'TIPO DE DATO',
            },
            {
                key: 'enero',
                label: 'ENERO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'febrero',
                label: 'FEBRERO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'marzo',
                label: 'MARZO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'abril',
                label: 'ABRIL',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'mayo',
                label: 'MAYO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'junio',
                label: 'JUNIO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'julio',
                label: 'JULIO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'agosto',
                label: 'AGOSTO',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'septiembre',
                label: 'SEPTIEMBRE',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'octubre',
                label: 'OCTUBRE',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'noviembre',
                label: 'NOVIEMBRE',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'diciembre',
                label: 'DICIEMBRE',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
            {
                key: 'total_anual',
                label: 'TOTAL ANUAL',
                render: (value: number | string) => typeof value === 'number' ? value.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : value
            },
        ];
    }, []);

    // Datos para la tabla adicional
    const datosTablaDatosAdicionales = useMemo(() => {
        if (seriesAnualesData?.data) {
            const data = seriesAnualesData.data;
            return [
                // Proyección 2026
                {
                    tipo: 'Proyección',
                    enero: data.proyeccion?.meses.ene || 0,
                    febrero: data.proyeccion?.meses.feb || 0,
                    marzo: data.proyeccion?.meses.mar || 0,
                    abril: data.proyeccion?.meses.abr || 0,
                    mayo: data.proyeccion?.meses.may || 0,
                    junio: data.proyeccion?.meses.jun || 0,
                    julio: data.proyeccion?.meses.jul || 0,
                    agosto: data.proyeccion?.meses.ago || 0,
                    septiembre: data.proyeccion?.meses.sep || 0,
                    octubre: data.proyeccion?.meses.oct || 0,
                    noviembre: data.proyeccion?.meses.nov || 0,
                    diciembre: data.proyeccion?.meses.dic || 0,
                    total_anual: data.proyeccion?.produccion_anual || 0
                },
                // Distribución Mensual
                {
                    tipo: 'Distribución Mensual',
                    enero: data.distribucion_mensual?.meses.ene || 0,
                    febrero: data.distribucion_mensual?.meses.feb || 0,
                    marzo: data.distribucion_mensual?.meses.mar || 0,
                    abril: data.distribucion_mensual?.meses.abr || 0,
                    mayo: data.distribucion_mensual?.meses.may || 0,
                    junio: data.distribucion_mensual?.meses.jun || 0,
                    julio: data.distribucion_mensual?.meses.jul || 0,
                    agosto: data.distribucion_mensual?.meses.ago || 0,
                    septiembre: data.distribucion_mensual?.meses.sep || 0,
                    octubre: data.distribucion_mensual?.meses.oct || 0,
                    noviembre: data.distribucion_mensual?.meses.nov || 0,
                    diciembre: data.distribucion_mensual?.meses.dic || 0,
                    total_anual: data.distribucion_mensual?.total || 0
                },
                // Participación Porcentual
                {
                    tipo: 'Participación %',
                    enero: `${data.participacion_pct?.ene || 0}%`,
                    febrero: `${data.participacion_pct?.feb || 0}%`,
                    marzo: `${data.participacion_pct?.mar || 0}%`,
                    abril: `${data.participacion_pct?.abr || 0}%`,
                    mayo: `${data.participacion_pct?.may || 0}%`,
                    junio: `${data.participacion_pct?.jun || 0}%`,
                    julio: `${data.participacion_pct?.jul || 0}%`,
                    agosto: `${data.participacion_pct?.ago || 0}%`,
                    septiembre: `${data.participacion_pct?.sep || 0}%`,
                    octubre: `${data.participacion_pct?.oct || 0}%`,
                    noviembre: `${data.participacion_pct?.nov || 0}%`,
                    diciembre: `${data.participacion_pct?.dic || 0}%`,
                    total_anual: `${data.participacion_pct?.total || 0}%`
                }
            ];
        } else {
            // Datos en 0 si no hay datos de la API
            return [
               
            ];
        }
    }, [seriesAnualesData]);

    // Datos para la gráfica usando datos del nuevo endpoint de distribución mensual
    const datosGrafica = useMemo(() => {
        if (distribucionMensualData?.data?.toneladas && distribucionMensualData?.data?.participacion_pct) {
            const dist = distribucionMensualData.data.toneladas.meses;
            const pct = distribucionMensualData.data.participacion_pct;
            
            // Convertir datos de string a número usando toNum para manejar formato de miles
            const toneladas = [
                toNum(dist.ene), toNum(dist.feb), toNum(dist.mar), toNum(dist.abr),
                toNum(dist.may), toNum(dist.jun), toNum(dist.jul), toNum(dist.ago),
                toNum(dist.sep), toNum(dist.oct), toNum(dist.nov), toNum(dist.dic)
            ];
            
            const porcentajes = [
                pct.ene, pct.feb, pct.mar, pct.abr,
                pct.may, pct.jun, pct.jul, pct.ago,
                pct.sep, pct.oct, pct.nov, pct.dic
            ];

            return { toneladas, porcentajes };
        }
        
        // Si no hay datos, mostrar valores vacíos
        if (!distribucionMensualData) {
            return {
                toneladas: [],	
                porcentajes: []
            };
        }
        
        // Datos por defecto si no hay datos de la API
        return {
            toneladas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            porcentajes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };
    }, [distribucionMensualData]);

    // Configuración del gráfico histórico con drill-down
    const setupHistoricalChart = (chart: echarts.EChartsType) => {
        if (!chart) return;

        let showLabels = false; // Estado inicial de etiquetas

        // Usar datos de la API si están disponibles, sino usar datos por defecto
        let RAW: any[] = [];

        if (produccionHistoricaData?.data?.produccion_historica) {
            // Transformar datos de la API al formato esperado con datos mensuales reales
            RAW = produccionHistoricaData.data.produccion_historica.map(item => ({
                anio: item.anio.toString(),
                meses: [
                    item.meses.ene, item.meses.feb, item.meses.mar, item.meses.abr,
                    item.meses.may, item.meses.jun, item.meses.jul, item.meses.ago,
                    item.meses.sep, item.meses.oct, item.meses.nov, item.meses.dic
                ],
                total: toNum(item.produccion_anual),
                varPct: item.variacion_pct ? `${item.variacion_pct.toFixed(1)}%` : '0%'
            }));
        } else {
            // Datos por defecto si no hay datos de la API
            RAW = [
                { anio: '2015', meses: [6261,3151,4270,5474,6538,5859,5533,3458,1949,2602,4097,5606], total: 0, varPct: '14,8%' },
                { anio: '2016', meses: [3343,3049,4981,4327,6092,6458,4048,2557,2456,4222,6723,8529], total: 0, varPct: '3,6%'  },
                { anio: '2017', meses: [5505,5138,4049,6489,5685,6862,5378,3425,2320,3884,5451,6349], total: 0, varPct: '6,6%'  },
                { anio: '2018', meses: [5336,4050,3218,4154,6604,5590,5341,2516,2498,2949,6801,7810], total: 0, varPct: '-6,1%' },
                { anio: '2019', meses: [6607,3143,3533,5468,6212,7141,4521,2495,1952,4533,5876,8258], total: 0, varPct: '5,1%'  },
                { anio: '2020', meses: [6250,3796,4127,5863,7730,7105,5077,3152,2514,3940,5777,8084], total: 0, varPct: '6,2%'  },
                { anio: '2021', meses: [7832,7595,5409,5661,5645,6431,6232,3920,3678,4496,5989,6152], total: 0, varPct: '8,9%'  },
                { anio: '2022', meses: [5587,3953,4883,6191,7273,6566,5462,3149,3039,4044,6120,5891], total: 0, varPct: '-10,0%' },
                { anio: '2023', meses: [4338,4226,4974,4809,5758,6814,5239,4170,2844,3043,6197,7420], total: 0, varPct: '-3,7%' },
                { anio: '2024', meses: [8279,3026,2682,5171,8490,5501,4982,2870,2699,5944,9575,8458], total: 0, varPct: '13,1%' },
                { anio: '2025', meses: [10529,5064,3052,3224,5658,4684,5553,3440,2968,4196,6166,7590], total: 0, varPct: '-8,2%' },
                { anio: '2026', meses: [10933,5258,3170,3348,5876,4865,5767,3572,3082,4357,6403,7882], total: 0, varPct: '3,8%'  }
            ];
        }

        // Datos históricos
        const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

        // Transformación a niveles
        const data_root = RAW.map(r => [r.anio, r.total, 'root', `y${r.anio}`, r.varPct]);

        const perYearData: { [key: string]: any[] } = {};
        RAW.forEach(r => {
            perYearData[`y${r.anio}`] = MESES.map((m, i) => [m, r.meses[i], `y${r.anio}`, r.anio]);
        });

        const allLevelData = [data_root, ...Object.values(perYearData)];
        const allOptions: { [key: string]: any } = {};

        allLevelData.forEach((data) => {
            const optionId = data[0][2];
            const isRoot = optionId === 'root';
            const yearText = isRoot ? '' : optionId.replace(/^y/, '');

            const option = {
                id: optionId,
                backgroundColor: isDarkMode ? '#260f00' : 'transparent',
                title: {
                    text: 'Producción Histórica de Cacao',
                    subtext: isRoot ? 'Previsión Próximo Año' : `Producción Año ${yearText}`,
                    left: 'center',
                    top: 8,
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#562707',
                        fontSize: 18,
                        fontWeight: 'bold'
                    },
                    subtextStyle: {
                        color: isDarkMode ? '#d1d5db' : '#666666',
                        fontSize: 14
                    }
                },
                grid: { top: 70, left: 60, right: 30, bottom: 50 },
                xAxis: { 
                    type: 'category',
                    axisLabel: {
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    axisLine: {
                        lineStyle: {
                            color: isDarkMode ? '#ffffff40' : '#562707'
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: 'Producción',
                    min: 0,
                    axisLabel: {
                        formatter: (val: number) => Number(val).toLocaleString('es-CO', { maximumFractionDigits: 0 }),
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    nameTextStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    axisLine: {
                        lineStyle: {
                            color: isDarkMode ? '#ffffff40' : '#562707'
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: isDarkMode ? '#ffffff20' : '#f3f4f6'
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
                        const p = params[0];
                        const v = Number(p.value[1]).toLocaleString('es-CO', { maximumFractionDigits: 0 });
                        const varPct = p.value[4];
                        const year = p.value[3];
                        if (isRoot && varPct != null) {
                            return `<b>Año ${p.axisValue}</b><br/>Producción: <b>${v}</b><br/>% Variación: <b>${varPct}</b>`;
                        }
                        if (!isRoot && year) {
                            return `<b>${p.axisValue} ${year}</b><br/>Producción: <b>${v}</b>`;
                        }
                        return `<b>${p.axisValue}</b><br/>Producción: <b>${v}</b>`;
                    }
                },
                toolbox: {
                    feature: {
                        saveAsImage: { 
                            title: 'Descargar Imagen', 
                            pixelRatio: 2,
                            backgroundColor: isDarkMode ? '#260f00' : '#ffffff'
                        },
                        myLabelToggle: {
                            show: true,
                            title: 'Mostrar/Ocultar etiquetas',
                            icon: 'path://M512 64a448 448 0 1 0 0 896 448 448 0 0 0 0-896z',
                            onclick: function () {
                                showLabels = !showLabels;
                                applyLabelState();
                            }
                        }
                    },
                    right: 20,
                    top: 20,
                    iconStyle: {
                        borderColor: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    emphasis: {
                        iconStyle: {
                            borderColor: isDarkMode ? '#ffffff' : '#111827'
                        }
                    }
                },
                animationDurationUpdate: 500,
                series: {
                    type: 'bar',
                    barMaxWidth: 36,
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: (params: any) => {
                            if (isRoot) {
                                const year = parseInt(params.name);
                                return (year === 2025 || year === 2026) ? '#D4AF37' : '#085599';
                            } else {
                                return '#8D9761';
                            }
                        }
                    },
                    label: {
                        show: showLabels,
                        position: 'top',
                        color: '#FA9C05',
                        fontWeight: 'bold',
                        formatter: (p: any) => Number(p.value[1]).toLocaleString('es-CO', { maximumFractionDigits: 0 })
                    },
                    dimensions: ['x','y','groupId','childGroupId','varPct','anio'],
                    encode: { x: 'x', y: 'y', itemGroupId: 'groupId', itemChildGroupId: 'childGroupId' },
                    data,
                    universalTransition: { enabled: true, divideShape: 'clone' }
                },
                graphic: [
                    {
                        type: 'text',
                        left: 14,
                        top: 18,
                        style: { 
                            text: 'Volver', 
                            fontSize: 14, 
                            fill: isRoot ? (isDarkMode ? '#9ca3af' : '#bbb') : (isDarkMode ? '#60a5fa' : '#085599'), 
                            fontWeight: 600, 
                            cursor: 'pointer' 
                        },
                        onclick: function () { goBack(); }
                    }
                ]
            };

            allOptions[optionId] = option;
        });

        // Funciones de navegación
        const optionStack: string[] = [];
        
        const applyLabelState = () => {
            const current = chart.getOption();
            if (current && current.series && (current.series as any[])[0]) {
                (current.series as any[])[0].label = {
                    show: showLabels,
                    position: 'top',
                    color: '#FA9C05',
                    fontWeight: 'bold',
                    formatter: (p: any) =>
                        Number(p.value[1]).toLocaleString('es-CO', { maximumFractionDigits: 0 })
                };
                chart.setOption(current as any);
            }
        };

        const goForward = (optionId: string) => {
            const currentOption = chart.getOption() as any;
            if (currentOption && currentOption.id) {
                optionStack.push(currentOption.id);
            }
            chart.setOption(allOptions[optionId] as any);
            applyLabelState();
        };

        const goBack = () => {
            if (!optionStack.length) return;
            const prevOptionId = optionStack.pop();
            if (prevOptionId) {
                chart.setOption(allOptions[prevOptionId] as any);
                applyLabelState();
            }
        };

        // Configurar chart inicial
        chart.setOption(allOptions['root'] as any);
        applyLabelState();
        
        // Event listeners
        chart.off('click');
        chart.on('click', 'series', (params: any) => {
            // Solo permitir drill-down desde la vista raíz.
            const currentOption = chart.getOption() as any;
            const currentId = currentOption?.id;
            const dataItem = params?.data;
            const targetOptionId = Array.isArray(dataItem) ? dataItem[3] : undefined;

            if (currentId === 'root' && typeof targetOptionId === 'string' && allOptions[targetOptionId]) {
                goForward(targetOptionId);
            }
            // Si no es la vista raíz (nivel mensual), ignorar clics para evitar bloqueos.
        });
    };

    // Memoizar las opciones del chart para evitar re-renders innecesarios
    const chartOptions = useMemo(() => {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Guard rails para evitar errores con arrays vacíos
        const pct = datosGrafica.porcentajes ?? [];
        const maxPct = pct.length ? Math.max(...pct, 10) : 10;

        return {
            backgroundColor: isDarkMode ? '#260f00' : 'transparent',
            title: { 
                text: 'Estimación de Producción Mensual Próximo Año', 
                left: 'center',
                textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#562707',
                    fontSize: 16,
                    fontWeight: 'bold' as const
                }
            },
            grid: { left: 60, right: 80, bottom: 50, top: 70 },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#333'
                },
                formatter: (params: any) => {
                    const mes = params[0].axisValue;
                    const t = params.find((p: any) => p.seriesName === 'Toneladas')?.value ?? '';
                    const p = params.find((p: any) => p.seriesName === '% de participación')?.value ?? '';
                    // Formatear toneladas con separador de miles
                    const tFmt = typeof t === 'number' ? t.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : t;
                    return `<b>${mes}</b><br/>Toneladas: ${tFmt} t<br/>% de participación: ${p}%`;
                }
            },
            legend: { 
                top: 40, 
                data: ['Toneladas', '% de participación'],
                textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#562707'
                }
            },
            toolbox: {
                feature: {
                    dataView: { show: true, readOnly: false },
                    restore: { show: true },
                    saveAsImage: { 
                        show: true,
                        backgroundColor: isDarkMode ? '#260f00' : '#ffffff'
                    }
                },
                iconStyle: {
                    borderColor: isDarkMode ? '#f3f4f6' : '#562707'
                },
                emphasis: {
                    iconStyle: {
                        borderColor: isDarkMode ? '#ffffff' : '#111827'
                    }
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: true,
                axisTick: { alignWithLabel: true },
                data: meses,
                axisLabel: {
                    color: isDarkMode ? '#f3f4f6' : '#562707'
                },
                axisLine: {
                    lineStyle: {
                        color: isDarkMode ? '#ffffff40' : '#562707'
                    }
                }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Toneladas',
                    position: 'left',
                    axisLine: { show: true, lineStyle: { color: '#8D9761' } },
                    axisLabel: { 
                        formatter: (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 }),
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    nameTextStyle: {
                        color: '#8D9761'
                    },
                    splitLine: {
                        lineStyle: {
                            color: isDarkMode ? '#ffffff20' : '#f3f4f6'
                        }
                    }
                },
                {
                    type: 'value',
                    name: '% de participación',
                    position: 'right',
                    min: 0, 
                    max: maxPct + 2, 
                    interval: 2,
                    axisLine: { show: true, lineStyle: { color: '#FA9C05' } },
                    axisLabel: { 
                        formatter: '{value} %',
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    nameTextStyle: {
                        color: '#FA9C05'
                    },
                    splitLine: {
                        show: false
                    }
                }
            ],
            series: [
                // Barras: Toneladas
                {
                    name: 'Toneladas',
                    type: 'bar',
                    yAxisIndex: 0,
                    barMaxWidth: 28,
                    itemStyle: { color: '#8D9761' },
                    data: datosGrafica.toneladas
                },
                // Línea: % participación con color solicitado
                {
                    name: '% de participación',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: false,
                    symbol: 'circle',
                    symbolSize: 8,
                    showSymbol: true,
                    lineStyle: { width: 3, color: '#FA9C05' },
                    itemStyle: { color: '#FA9C05', borderColor: '#fff', borderWidth: 2 },
                    data: datosGrafica.porcentajes
                }
            ]
        };
    }, [datosGrafica, isDarkMode]);

    // Inicialización simple del gráfico histórico (sin ResizeObserver)
    useEffect(() => {
        if (!mounted || !historicalChartRef.current || isLoadingProduccionHistorica) return;

        // Limpiar instancia previa si existe
        if (historicalChartInstanceRef.current && !historicalChartInstanceRef.current.isDisposed()) {
            try {
                historicalChartInstanceRef.current.dispose();
            } catch (err) {
                console.warn('[Tablero2] Error al limpiar gráfico histórico previo:', err);
            } finally {
                historicalChartInstanceRef.current = null;
            }
        }

        const chart = echarts.init(historicalChartRef.current);
        historicalChartInstanceRef.current = chart;

        setupHistoricalChart(chart);

        const handleResize = () => {
            if (!chart.isDisposed()) {
                chart.resize();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (!chart.isDisposed()) {
                try {
                    chart.dispose();
                } catch (err) {
                    console.warn('[Tablero2] Error al hacer dispose del gráfico histórico:', err);
                }
            }
            if (historicalChartInstanceRef.current === chart) {
                historicalChartInstanceRef.current = null;
            }
        };
    }, [mounted, produccionHistoricaData, isDarkMode, isLoadingProduccionHistorica]);

    // Inicialización simple del gráfico de distribución mensual (sin ResizeObserver)
    useEffect(() => {
        if (!mounted || !chartRef.current) return;

        // Si no hay datos, limpiar cualquier instancia previa y salir
        if (
            (!datosGrafica.toneladas || !datosGrafica.toneladas.length) &&
            (!datosGrafica.porcentajes || !datosGrafica.porcentajes.length)
        ) {
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                try {
                    chartInstanceRef.current.dispose();
                } catch (err) {
                    console.warn('[Tablero2] Error al limpiar gráfico de distribución:', err);
                } finally {
                    chartInstanceRef.current = null;
                }
            }
            return;
        }

        // Limpiar instancia previa si existe
        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
            try {
                chartInstanceRef.current.dispose();
            } catch (err) {
                console.warn('[Tablero2] Error al limpiar instancia previa de distribución:', err);
            }
        }

        const chart = echarts.init(chartRef.current);
        chartInstanceRef.current = chart;

        chart.setOption(chartOptions as any, true);

        const handleResize = () => {
            if (!chart.isDisposed()) {
                chart.resize();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (!chart.isDisposed()) {
                try {
                    chart.dispose();
                } catch (err) {
                    console.warn('[Tablero2] Error al hacer dispose del gráfico de distribución:', err);
                }
            }
            if (chartInstanceRef.current === chart) {
                chartInstanceRef.current = null;
            }
        };
    }, [mounted, chartOptions, datosGrafica]);

    // Configuración de columnas para la tabla consolidada (distribución mensual)
    const headerColumnsDistribucion = useMemo(() => {
        return [
            {
                key: 'mes',
                label: 'MES',
                render: (value: string) => value
            },
            {
                key: 'participacion_pct',
                label: '% DE PARTICIPACIÓN',
                render: (value: number) => `${value}%`
            },
            {
                key: 'toneladas',
                label: 'TONELADAS',
                render: (value: number) => value.toLocaleString('es-CO', { 
                    maximumFractionDigits: 0 
                })
            }
        ];
    }, []);

    // Datos para la tabla consolidada (incluyendo totales)
    const datosTablaDistribucion = useMemo(() => {
        if (distribucionMensualData?.data?.toneladas && distribucionMensualData?.data?.participacion_pct) {
            const dist = distribucionMensualData.data.toneladas.meses;
            const pct = distribucionMensualData.data.participacion_pct;
            
            // Nombres de meses en español
            const mesesNombres = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
                                'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            
            // Datos mensuales
            const datosMensuales = [
                { mes: mesesNombres[0], participacion_pct: pct.ene, toneladas: toNum(dist.ene) },
                { mes: mesesNombres[1], participacion_pct: pct.feb, toneladas: toNum(dist.feb) },
                { mes: mesesNombres[2], participacion_pct: pct.mar, toneladas: toNum(dist.mar) },
                { mes: mesesNombres[3], participacion_pct: pct.abr, toneladas: toNum(dist.abr) },
                { mes: mesesNombres[4], participacion_pct: pct.may, toneladas: toNum(dist.may) },
                { mes: mesesNombres[5], participacion_pct: pct.jun, toneladas: toNum(dist.jun) },
                { mes: mesesNombres[6], participacion_pct: pct.jul, toneladas: toNum(dist.jul) },
                { mes: mesesNombres[7], participacion_pct: pct.ago, toneladas: toNum(dist.ago) },
                { mes: mesesNombres[8], participacion_pct: pct.sep, toneladas: toNum(dist.sep) },
                { mes: mesesNombres[9], participacion_pct: pct.oct, toneladas: toNum(dist.oct) },
                { mes: mesesNombres[10], participacion_pct: pct.nov, toneladas: toNum(dist.nov) },
                { mes: mesesNombres[11], participacion_pct: pct.dic, toneladas: toNum(dist.dic) },
            ];
            
            // Agregar fila de total
            const totalToneladas = toNum(distribucionMensualData.data.toneladas.total);
            const filaTotal = {
                mes: 'TOTAL',
                participacion_pct: pct.total,
                toneladas: totalToneladas
            };
            
            return [...datosMensuales, filaTotal];
        }
        
        // Datos vacíos si no hay información
        return [];
    }, [distribucionMensualData]);

    // Función para obtener datos de la tabla de series anuales para Excel
    const fetchSeriesAnualesForExcel = async () => {
        try {
            return {
                data: datosTablaTasaCrecimiento,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos de series anuales para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // Función para obtener datos de la tabla de datos adicionales para Excel
    const fetchDatosAdicionalesForExcel = async () => {
        try {
            return {
                data: datosTablaDatosAdicionales,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos adicionales para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    // Función para obtener datos de distribución mensual para Excel
    const fetchDistribucionMensualForExcel = async () => {
        try {
            return {
                data: datosTablaDistribucion,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos de distribución mensual para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    if (!mounted) return null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center my-4 sm:my-6">
                <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                    ESCENARIO POR TASA DE CRECIMIENTO
                </h2>
            </div>

            {/* Contenedor 1 - Tabla */}
            <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                {isLoadingSeriesAnuales ? (
                    <div className="flex justify-center items-center py-8">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[#562707]'}`}></div>
                        <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Cargando datos...</span>
                    </div>
                ) : (
                    <>
                        <DynamicTable
                            columns={headerColumnsTasaCrecimiento}
                            data={datosTablaTasaCrecimiento}
                            currentPage={1}
                            totalPages={1}
                            onPageChange={() => {}}
                            fetchDataForExcel={fetchSeriesAnualesForExcel}
                            downloadButtonPosition="top"
                            darkMode={isDarkMode}
                        />
                    </>
                )}
            </div>

            {/* Contenedor 2 - Tabla de Datos Adicionales */}
            <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                {isLoadingSeriesAnuales ? (
                    <div className="flex justify-center items-center py-8">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[#562707]'}`}></div>
                        <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Cargando datos adicionales...</span>
                    </div>
                ) : (
                    <>
                        <h3 className={`text-lg sm:text-md lg:text-lg font-bold mb-[-30px] text-left ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>% DE VARIACIÓN PROMEDIO: {seriesAnualesData?.data?.variacion_promedio_pct}%</h3>
                        <DynamicTable
                            columns={headerColumnsDatosAdicionales}
                            data={datosTablaDatosAdicionales}
                            currentPage={1}
                            totalPages={1}
                            onPageChange={() => {}}
                            fetchDataForExcel={fetchDatosAdicionalesForExcel}
                            downloadButtonPosition="top"
                            darkMode={isDarkMode}
                        />
                    </>
                )}
            </div>

            {/* Contenedor 3 - Gráfica */}
            <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    ESTIMACIÓN DE PRODUCCIÓN MENSUAL PRÓXIMO AÑO
                </h3>
                
                {isLoadingDistribucion ? (
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

            {/* Contenedor 4 - Tabla de Distribución Mensual */}
            <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    DATOS DE DISTRIBUCIÓN MENSUAL
                </h3>
                
                {isLoadingDistribucion ? (
                    <div className="flex justify-center items-center py-8">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[#562707]'}`}></div>
                        <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Cargando datos...</span>
                    </div>
                ) : (
                    <DynamicTable
                        columns={headerColumnsDistribucion}
                        data={datosTablaDistribucion}
                        currentPage={1}
                        totalPages={1}
                        onPageChange={() => {}}
                        fetchDataForExcel={fetchDistribucionMensualForExcel}
                        downloadButtonPosition="top"
                        isLoading={isLoadingDistribucion}
                        darkMode={isDarkMode}
                    />
                )}
            </div>

             {/* Contenedor 5 - Gráfica de Producción Histórica */}
             <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                <div 
                    ref={historicalChartRef} 
                    style={{ 
                        width: '100%', 
                        height: '600px',
                        minHeight: '400px'
                    }}
                />
            </div>


        </div>
    );
});

Tablero2.displayName = 'Tablero2';

export default Tablero2;

