'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    GraphicComponent,
    CalendarComponent,
    VisualMapComponent,
    ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Tablero8NewYorkData } from '../models/tablero8NewYork.model';

// Registrar componentes necesarios
echarts.use([
    GridComponent, 
    TooltipComponent, 
    LegendComponent, 
    TitleComponent, 
    GraphicComponent, 
    CalendarComponent, 
    VisualMapComponent, 
    ToolboxComponent, 
    HeatmapChart, 
    CanvasRenderer
]);

interface HeatmapPreciosNYProps {
    data: Tablero8NewYorkData | null;
    darkMode?: boolean;
}

const HeatmapPreciosNY: React.FC<HeatmapPreciosNYProps> = ({ data, darkMode = false }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        chartInstance.current = echarts.init(chartRef.current);

        // Función para convertir datos del API a formato de calendario
        const convertApiDataToCalendar = (periodo: any, _year: number) => {
            if (!periodo?.datos?.desglose_por_dia) return [];
            
            const res: Array<[string, number]> = [];
            
            periodo.datos.desglose_por_dia.forEach((dia: any) => {
                // Usar la fecha real del API en lugar de generar una secuencial
                const fecha = dia.fecha; // Usar la fecha que viene del API
                if (fecha) {
                    res.push([fecha, dia.precio_cierre]);
                }
            });
            
            return res;
        };

        // Función para estadísticas mensuales
        const monthlyStats = (periodo: any) => {
            if (!periodo?.datos?.desglose_por_mes) return {};
            
            const stats: {[key: string]: {avg: number, max: number, min: number, varAbs: number, varPct: number}} = {};
            
            periodo.datos.desglose_por_mes.forEach((mes: any) => {
                // Usar el año y mes reales del API
                const k = `${mes.anio}-${String(mes.mes).padStart(2,'0')}`;
                stats[k] = { 
                    avg: mes.promedio, 
                    max: mes.maximo, 
                    min: mes.minimo, 
                    varAbs: mes.var_abs, 
                    varPct: mes.var_porcentual 
                };
            });
            
            return stats;
        };

        // Obtener datos del API o usar datos por defecto
        let dataPeriodo1: Array<[string, number]> = [];
        let dataPeriodo2: Array<[string, number]> = [];
        let allVals: number[] = [];
        let statsByMonth: any = {};
        let yearPeriodo1 = 2024;
        let yearPeriodo2 = 2025;

        if (data) {
            // Usar datos del API
            dataPeriodo1 = convertApiDataToCalendar(data.periodo_1, 0); // El año se determina dinámicamente
            dataPeriodo2 = convertApiDataToCalendar(data.periodo_2, 0); // El año se determina dinámicamente
            
            // Determinar años dinámicamente basado en los datos
            if (data.periodo_1.datos.desglose_por_dia.length > 0) {
                const firstDate1 = data.periodo_1.datos.desglose_por_dia[0].fecha;
                yearPeriodo1 = new Date(firstDate1).getFullYear();
            }
            if (data.periodo_2.datos.desglose_por_dia.length > 0) {
                const firstDate2 = data.periodo_2.datos.desglose_por_dia[0].fecha;
                yearPeriodo2 = new Date(firstDate2).getFullYear();
            }
            
            // Combinar todos los valores para calcular min/max
            allVals = [
                ...data.periodo_1.datos.desglose_por_dia.map((d: any) => d.precio_cierre),
                ...data.periodo_2.datos.desglose_por_dia.map((d: any) => d.precio_cierre)
            ];
            
            // Obtener estadísticas mensuales
            statsByMonth = {
                ...monthlyStats(data.periodo_1),
                ...monthlyStats(data.periodo_2)
            };
        } else {
            // No mostrar datos hasta que se haga la petición al API
            dataPeriodo1 = [];
            dataPeriodo2 = [];
            allVals = [];
            statsByMonth = {};
            yearPeriodo1 = 2024;
            yearPeriodo2 = 2025;
        }

        const vMin = Math.min(...allVals);
        const vMax = Math.max(...allVals);

        // Formateadores
        const nf0 = (n: number) => new Intl.NumberFormat('es-CO', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        }).format(n);
        
        const monthName = (m: number) => [
            '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ][m];

        const containerWidth = chartRef.current.clientWidth || 0;
        const isSmall = containerWidth < 768; // md breakpoint
        const cellBase = isSmall ? 14 : 50;

        const options: echarts.EChartsCoreOption = {
            backgroundColor: darkMode ? '#260f00' : '#ffffff',
            title: { 
                left: 'center',
                textStyle: { 
                    color: darkMode ? '#f3f4f6' : '#562707', 
                    fontSize: 16, 
                    fontWeight: 'bold' 
                }
            },
            tooltip: {
                trigger: 'item',
                confine: true,
                enterable: true,
                borderWidth: 0,
                backgroundColor: darkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255,255,255,0.95)',
                borderColor: darkMode ? '#ffffff40' : 'transparent',
                textStyle: {
                    color: darkMode ? '#f3f4f6' : '#333'
                },
                extraCssText: darkMode 
                    ? 'box-shadow:0 4px 10px rgba(0,0,0,0.3); padding:10px; border-radius:8px;' 
                    : 'box-shadow:0 4px 10px rgba(0,0,0,0.15); padding:10px; border-radius:8px;',
                formatter: function (p: any) {
                    const d = p.data[0];
                    const y = +d.slice(0,4);
                    const m = +d.slice(5,7);
                    const fecha = `${y}-${String(m).padStart(2,'0')}-${d.slice(8,10)}`;
                    const precio = `$${nf0(p.data[1])}`;
                    const st = statsByMonth[`${y}-${String(m).padStart(2,'0')}`] || {avg:0,max:0,min:0,varAbs:0,varPct:0};

                    return `
                        <div style="font-size:12px;">
                            <div style="margin-bottom:6px;"><b>Fecha de registro:</b> ${fecha}<br/><b>Precio de cierre:</b> ${precio}</div>
                            <div style="font-weight:bold; margin:6px 0 4px;">Resumen mensual ${monthName(m)} ${y}</div>
                            <table style="border-collapse:collapse; font-size:12px;">
                                <tr><td style="padding:2px 8px;">Promedio</td><td style="padding:2px 0;"><b>$${nf0(st.avg)}</b></td></tr>
                                <tr><td style="padding:2px 8px;">Máximo</td><td style="padding:2px 0;"><b>$${nf0(st.max)}</b></td></tr>
                                <tr><td style="padding:2px 8px;">Mínimo</td><td style="padding:2px 0;"><b>$${nf0(st.min)}</b></td></tr>
                                <tr><td style="padding:2px 8px;">Var Abs (max−min)</td><td style="padding:2px 0;"><b>$${nf0(st.varAbs)}</b></td></tr>
                                <tr><td style="padding:2px 8px;">Var %</td><td style="padding:2px 0;"><b>${Math.round(st.varPct)}%</b></td></tr>
                            </table>
                        </div>`;
                }
            },
            toolbox: {
                show: true, 
                right: 20, 
                top: 20,
                feature: { 
                    saveAsImage: { 
                        title: 'Descargar', 
                        name: 'heatmap_precios', 
                        pixelRatio: 2 
                    } 
                }
            },
            visualMap: {
                min: vMin, 
                max: vMax, 
                calculable: true, 
                orient: 'vertical', 
                left: isSmall ? 10 : 50, 
                top: isSmall ? 40 : 'center',
                formatter: (v: number) => `$${nf0(v)}`,
                textStyle: {
                    color: darkMode ? '#f3f4f6' : '#374151'
                },
                inRange: { color: ['#FF0000', '#FF7F00', '#FFFF66', '#00B050'] }
            },
            calendar: isSmall ? [
                { 
                    left: 'center', 
                    top: 90, 
                    orient: 'vertical', 
                    range: String(yearPeriodo1), 
                    cellSize: [cellBase,'auto'], 
                    yearLabel: { 
                        show: true,
                        margin: 12,
                        formatter: 'Período 1',
                        textStyle: { 
                            color: darkMode ? '#f3f4f6' : '#562707', 
                            fontSize: 14, 
                            fontWeight: 'bold' 
                        }
                    }, 
                    dayLabel: { 
                        margin: 2,
                        color: darkMode ? '#d1d5db' : '#374151'
                    } 
                },
                { 
                    left: 'center', 
                    top: 90 + cellBase * 7 + 100, 
                    orient: 'vertical', 
                    range: String(yearPeriodo2), 
                    cellSize: [cellBase,'auto'], 
                    yearLabel: { 
                        show: true,
                        margin: 12,
                        formatter: 'Período 2',
                        textStyle: { 
                            color: darkMode ? '#f3f4f6' : '#562707', 
                            fontSize: 14, 
                            fontWeight: 'bold' 
                        }
                    }, 
                    dayLabel: { 
                        margin: 2,
                        color: darkMode ? '#d1d5db' : '#374151'
                    } 
                }
            ] : [
                { 
                    left: 360, 
                    top: 130, 
                    orient: 'vertical', 
                    range: String(yearPeriodo1), 
                    cellSize: [cellBase,'auto'], 
                    yearLabel: { 
                        show: true,
                        margin: 20,
                        formatter: 'Período 1',
                        textStyle: { 
                            color: darkMode ? '#f3f4f6' : '#562707', 
                            fontSize: 14, 
                            fontWeight: 'bold' 
                        }
                    }, 
                    dayLabel: { 
                        margin: 4,
                        color: darkMode ? '#d1d5db' : '#374151'
                    } 
                },
                { 
                    left: 780, 
                    top: 130, 
                    orient: 'vertical', 
                    range: String(yearPeriodo2), 
                    cellSize: [cellBase,'auto'], 
                    yearLabel: { 
                        show: true,
                        margin: 20,
                        formatter: 'Período 2',
                        textStyle: { 
                            color: darkMode ? '#f3f4f6' : '#562707', 
                            fontSize: 14, 
                            fontWeight: 'bold' 
                        }
                    }, 
                    dayLabel: { 
                        margin: 4,
                        color: darkMode ? '#d1d5db' : '#374151'
                    } 
                }
            ],
            series: [
                { 
                    type: 'heatmap', 
                    coordinateSystem: 'calendar', 
                    calendarIndex: 0, 
                    data: dataPeriodo1 
                },
                { 
                    type: 'heatmap', 
                    coordinateSystem: 'calendar', 
                    calendarIndex: 1, 
                    data: dataPeriodo2 
                }
            ]
        };

        chartInstance.current.setOption(options);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
        };
    }, [data, darkMode]);

    // Si no hay datos, mostrar mensaje informativo
    if (!data) {
        return (
            <div className="w-full">
                <div className="h-[600px] sm:h-[700px] lg:h-[800px] flex items-center justify-center">
                    <div className="text-center p-8">
                        <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                            Mapa de Calor de Precios
                        </h3>
                        <p className={`max-w-md ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Seleccione los períodos de fechas y haga clic en <strong>CONSULTAR</strong> para cargar los datos del mapa de calor.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="h-[600px] sm:h-[700px] lg:h-[800px]">
                <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
};

export default HeatmapPreciosNY;
