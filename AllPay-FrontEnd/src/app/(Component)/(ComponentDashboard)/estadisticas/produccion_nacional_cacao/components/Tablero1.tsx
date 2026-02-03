'use client';

import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from 'next-themes';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { TableroProduccionDepartamentosResponse } from '../models/tablero-produccion-departamentos.models';
import PptxGenJS from 'pptxgenjs'; 

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, BarChart, CanvasRenderer, DataZoomComponent]);

interface Tablero1Props {
    transformarDatosParaTabla: any[];
    tableroProduccionData: TableroProduccionDepartamentosResponse | null;
    isLoadingTablero: boolean;
    seriesAnualesData?: any;
    isLoadingSeriesAnuales?: boolean;
    onConsultar?: () => void | Promise<void>; 
  }

export type Tablero1Handle = {
    downloadPPT: () => Promise<void>;
  };

// Componente de gráfica extraído fuera para evitar problemas con hooks condicionales
interface ProduccionDepartamentosChartProps {
    tableroProduccionData: TableroProduccionDepartamentosResponse | null;
    isDarkMode: boolean;
}

const ProduccionDepartamentosChart: React.FC<ProduccionDepartamentosChartProps> = ({ tableroProduccionData, isDarkMode }) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstance = React.useRef<echarts.ECharts | null>(null);

    React.useEffect(() => {
        if (!chartRef.current) return;
        chartInstance.current = echarts.init(chartRef.current, null, {
            renderer: 'canvas',
            useDirtyRect: false
        });

        // Usar datos de la API si están disponibles, sino usar datos en 0
        let departamentos: string[] = [];
        let prodKilos: number[] = [];
        let prodTon: number[] = [];
        let prodTonCenso: number[] = [];

        if (tableroProduccionData?.data && tableroProduccionData.data.length > 0) {
            // Filtrar los datos para excluir "TOTALES" de la gráfica
            const datosParaGrafica = tableroProduccionData.data.filter(item => 
                item.departamento.toLowerCase() !== 'totales'
            );
            
            // Usar datos reales de la API (sin totales)
            departamentos = datosParaGrafica.map(item => item.departamento);
            prodKilos = datosParaGrafica.map(item => item.produccion_kilos);
            prodTon = datosParaGrafica.map(item => item.produccion_ton);
            prodTonCenso = datosParaGrafica.map(item => item.produccion_ton_censo);
        } else {
            // Datos en 0 si no hay datos de la API
            departamentos = ['Sin datos'];
            prodKilos = [0];
            prodTon = [0];
            prodTonCenso = [0];
        }

        const option: echarts.EChartsCoreOption = {
            backgroundColor: isDarkMode ? '#260f00' : 'transparent',
            title: {
                text: 'Producción Estimada de Cacao por Departamento',
                subtext: 'Kilos vs Toneladas',
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
            color: ['#8D9761', '#FA9C05', '#085599'],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                textStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#333'
                },
                formatter: (params: any) => {
                    let t = `<b>${params[0].axisValue}</b><br/>`;
                    params.forEach((p: any) => {
                        if (p.seriesName.includes('Kilos')) {
                            t += `${p.marker} ${p.seriesName}: <b>${Number(p.value).toLocaleString('es-CO')}</b> kg<br/>`;
                        } else {
                            t += `${p.marker} ${p.seriesName}: <b>${Number(p.value).toLocaleString('es-CO')}</b> ton<br/>`;
                        }
                    });
                    return t;
                }
            },
            legend: {
                top: 80,
                data: ['Producción Kilos', 'Producción Toneladas', 'Toneladas (Rend. Censo)'],
                textStyle: { color: isDarkMode ? '#f3f4f6' : '#562707' }
            },
            grid: { left: 70, right: 80, bottom: 100, top: 120 },
            toolbox: {
                show: true,
                orient: 'horizontal',
                left: 'right',
                top: 'top',
                iconStyle: {
                    borderColor: isDarkMode ? '#f3f4f6' : '#562707'
                },
                emphasis: {
                    iconStyle: {
                        borderColor: isDarkMode ? '#ffffff' : '#111827'
                    }
                },
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
                        name: 'produccion_cacao_departamentos',
                        pixelRatio: 2,
                        backgroundColor: isDarkMode ? '#260f00' : '#ffffff'
                    }
                }
            },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                { 
                    type: 'slider', 
                    bottom: 20, 
                    start: 0, 
                    end: 100,
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#562707'
                    },
                    borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                    handleStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#562707',
                        borderColor: isDarkMode ? '#ffffff40' : '#ccc'
                    },
                    dataBackground: {
                        lineStyle: {
                            color: isDarkMode ? '#ffffff40' : '#ccc'
                        },
                        areaStyle: {
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    selectedDataBackground: {
                        lineStyle: {
                            color: isDarkMode ? '#f3f4f6' : '#562707'
                        },
                        areaStyle: {
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(86, 39, 7, 0.2)'
                        }
                    }
                }
            ],
            xAxis: {
                type: 'category',
                data: departamentos,
                axisLabel: {
                    rotate: 45,
                    fontWeight: 'bold',
                    color: isDarkMode ? '#f3f4f6' : '#562707'
                },
                axisLine: {
                    lineStyle: {
                        color: isDarkMode ? '#ffffff40' : '#666'
                    }
                }
            },
            yAxis: { 
                type: 'value', 
                name: 'Producción',
                axisLabel: { 
                    color: isDarkMode ? '#f3f4f6' : '#562707',
                    fontWeight: 'bold'
                },
                nameTextStyle: {
                    color: isDarkMode ? '#f3f4f6' : '#562707'
                },
                axisLine: {
                    lineStyle: {
                        color: isDarkMode ? '#ffffff40' : '#666'
                    }
                },
                splitLine: { lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' } }
            },
            series: [
                {
                    name: 'Producción Kilos',
                    type: 'bar',
                    data: prodKilos
                },
                {
                    name: 'Producción Toneladas',
                    type: 'bar',
                    data: prodTon
                },
                {
                    name: 'Toneladas (Rend. Censo)',
                    type: 'bar',
                    data: prodTonCenso
                }
            ]
        };

        chartInstance.current.setOption(option);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
        };
    }, [tableroProduccionData, isDarkMode]);

    return (
        <div className="w-full">
            <div className="h-[600px] w-full">
                <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
};

const Tablero1 = forwardRef<Tablero1Handle, Tablero1Props>(
    ({ tableroProduccionData, isLoadingTablero }, ref) => {
    const { theme } = useTheme();
    const [paginaConsolidado, setPaginaConsolidado] = useState<number>(1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const downloadPPT = async () => {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';

        const toNum = (v: unknown): number => {
          if (typeof v === 'number') return isFinite(v) ? v : 0;
          if (typeof v === 'string') {
            // elimina separadores comunes 1.234.567,89 o 1,234,567.89
            const clean = v.replace(/\s/g, '').replace(/[,](?=\d{3}\b)/g, '').replace(/[.](?=\d{3}\b)/g, '').replace(',', '.');
            const n = Number(clean);
            return isFinite(n) ? n : 0;
          }
          return 0;
        };

        const fmt = (n: unknown) => toNum(n).toLocaleString('es-CO');

        // 1) Normaliza, excluye 'TOTALES'
        const rowsRaw = (tableroProduccionData?.data ?? [])
          .filter(d => d && typeof d.departamento === 'string' && d.departamento.toLowerCase() !== 'totales')
          .map(d => ({
            ...d,
            produccion_kilos: toNum(d.produccion_kilos),
            produccion_ton: toNum(d.produccion_ton),
            produccion_ton_censo: toNum(d.produccion_ton_censo),
          }));

        // 2) TOP 10 por kilos (ya son numbers)
        const top10 = rowsRaw
          .slice()
          .sort((a, b) => b.produccion_kilos - a.produccion_kilos)
          .slice(0, 10);

        const safeTop10 = top10.length
          ? top10
          : [{ departamento: 'Sin datos', produccion_kilos: 0, produccion_ton: 0, produccion_ton_censo: 0 }];

        // ⬇️  Buscar TOTALES desde el API o calcularlo como suma
        const totApi = (tableroProduccionData?.data ?? []).find(
          (d) => d && typeof d.departamento === 'string' && d.departamento.toLowerCase() === 'totales'
        );

        const totals = totApi
          ? {
              departamento: 'TOTALES',
              produccion_kilos: toNum((totApi as any).produccion_kilos),
              produccion_ton: toNum((totApi as any).produccion_ton),
              produccion_ton_censo: toNum((totApi as any).produccion_ton_censo),
            }
          : rowsRaw.reduce(
              (acc, d) => ({
                departamento: 'TOTALES',
                produccion_kilos: acc.produccion_kilos + toNum(d.produccion_kilos),
                produccion_ton: acc.produccion_ton + toNum(d.produccion_ton),
                produccion_ton_censo: acc.produccion_ton_censo + toNum(d.produccion_ton_censo),
              }),
              { departamento: 'TOTALES', produccion_kilos: 0, produccion_ton: 0, produccion_ton_censo: 0 }
            );

        // ⬇️  Construir la fila TOTALES para la tabla (con estilo en negrita)
        const totalesRow: PptxGenJS.TableRow = [
          { text: 'TOTALES', options: { bold: true } },
          { text: fmt(totals.produccion_kilos), options: { bold: true } },
          { text: fmt(totals.produccion_ton), options: { bold: true } },
          { text: fmt(totals.produccion_ton_censo), options: { bold: true } },
        ];

        // 3) Tabla (usa strings en celdas pero formateadas a partir de number)
        {
          const slide = pptx.addSlide();
          slide.addText('Producción estimada de cacao por departamento (TOP 10)', {
            x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 20, bold: true, color: '562707'
          });
          slide.addText('Incluye solo los 10 mayores por Producción (Kilos)', {
            x: 0.5, y: 1.0, w: 9, h: 0.4, fontSize: 12, color: '6B7280'
          });

          const headerRow: PptxGenJS.TableRow = [
            { text: 'DEPARTAMENTO', options: { bold: true } },
            { text: 'PRODUCCIÓN KILOS', options: { bold: true } },
            { text: 'PRODUCCIÓN TONELADAS', options: { bold: true } },
            { text: 'TONELADAS (REND. CENSO)', options: { bold: true } },
          ];

          const bodyRows: PptxGenJS.TableRow[] = safeTop10.map(d => ([
            { text: d.departamento ?? '' },
            { text: fmt(d.produccion_kilos) },
            { text: fmt(d.produccion_ton) },
            { text: fmt(d.produccion_ton_censo) },
          ]));

          slide.addTable([headerRow, ...bodyRows, totalesRow], {
            x: 1.5, y: 2.5, w: 9.5, fontSize: 10,
            border: { type: 'solid', color: '000000', pt: 1 },
            colW: [3.6, 2.0, 2.0, 2.0],
          });
        }

        // 4) Gráfica (asegúrate de pasar **numbers**)
        {
          const slide = pptx.addSlide();
          slide.addText('Comparativa por departamento (TOP 10)', {
            x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 20, bold: true, color: '562707'
          });
          slide.addText('Producción Kilos vs Toneladas vs Toneladas (Rend. Censo)', {
            x: 0.5, y: 1.0, w: 9, h: 0.4, fontSize: 12, color: '6B7280'
          });

          const categorias = safeTop10.map(d => d.departamento ?? '');
          const kilos = safeTop10.map(d => d.produccion_kilos);    // numbers
          const ton = safeTop10.map(d => d.produccion_ton);        // numbers
          const tonCenso = safeTop10.map(d => d.produccion_ton_censo); // numbers

          slide.addChart(
            pptx.ChartType.bar,
            [
              { name: 'Producción Kilos', labels: categorias, values: kilos },
              { name: 'Producción Toneladas', labels: categorias, values: ton },
              { name: 'Toneladas (Rend. Censo)', labels: categorias, values: tonCenso },
            ],
            {
              x: 1.5, y: 2.5, w: 9.0, h: 4.4,
              barGrouping: 'clustered',
              legendPos: 'b',
              showValue: false,
              dataLabelFormatCode: '#,##0',
              catAxisLabelColor: '562707',
              valAxisLabelColor: '562707',
            }
          );
        }

        await pptx.writeFile({ fileName: 'Tablero1_Produccion_TOP10.pptx' });
      };

    useImperativeHandle(ref, () => ({ downloadPPT }));

    // Columnas de la tabla consolidada
    const headerColumnsConsolidado = useMemo(() => {
        return [
            {
                key: 'departamento',
                label: 'DEPARTAMENTO',
                render: (value: string, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {value}
                    </span>
                )
            },
            {
                key: 'anio_consultado',
                label: 'PRODUCCION ANUAL',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {value.toLocaleString('es-CO')}
                    </span>
                )
            },
            {
                key: 'area_produccion',
                label: 'ÁREA PRODUCCIÓN (Ha)',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {value.toLocaleString('es-CO')}
                    </span>
                )
            },
            {
                key: 'rendimiento_censo',
                label: 'RENDIMIENTO CENSO',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {`${value.toFixed(2)} kg/ha`}
                    </span>
                )
            },
            {
                key: 'produccion_ton_censo',
                label: 'PRODUCCIÓN TON CENSO',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {`${value.toLocaleString('es-CO')} ton`}
                    </span>
                )
            },
            {
                key: 'rendimiento_prom_nal',
                label: 'RENDIMIENTO PROM. NAL',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {`${value.toFixed(2)} kg/ha`}
                    </span>
                )
            },
            {
                key: 'produccion_kilos',
                label: 'PRODUCCIÓN KILOS',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {`${value.toLocaleString('es-CO')} kg`}
                    </span>
                )
            },
            {
                key: 'produccion_ton',
                label: 'PRODUCCIÓN TONELADAS',
                render: (value: number, row: any) => (
                    <span className={row.departamento?.toLowerCase() === 'totales' ? 'font-bold' : ''}>
                        {`${value.toLocaleString('es-CO')} ton`}
                    </span>
                )
            },
        ];
    }, []);

    // Datos para la tabla
    const datosTabla = useMemo(() => {
        if (tableroProduccionData?.data && tableroProduccionData.data.length > 0) {
            // Retornar todos los datos incluyendo TOTALES para la tabla
            return tableroProduccionData.data;
        } else {
            // Retornar un registro con datos en 0 si no hay datos de la API
            return [];
        }
    }, [tableroProduccionData]);

    // Función para obtener todos los datos para Excel
    const fetchAllDataForExcel = async () => {
        try {
            // Retornar todos los datos disponibles
            return {
                data: datosTabla,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return { data: [], total_pages: 0 };
        }
    };

    if (!mounted) return null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center my-4 sm:my-6">
                <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                    ESCENARIO POR AREAS DE PRODUCCIÓN
                </h2>
            </div>

            {/* Contenedor 1 - Tabla */}
            <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                {isLoadingTablero ? (
                    <div className="flex justify-center items-center py-8">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[#562707]'}`}></div>
                        <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Cargando datos...</span>
                    </div>
                ) : (
                    <>
                        <DynamicTable
                            columns={headerColumnsConsolidado}
                            data={datosTabla}
                            currentPage={paginaConsolidado}
                            totalPages={1}
                            onPageChange={setPaginaConsolidado}
                            fetchDataForExcel={fetchAllDataForExcel}
                            downloadButtonPosition="top"
                            darkMode={isDarkMode}
                        />
                    </>
                )}
            </div>

            {/* Contenedor 2 - Gráfica */}
            <div className={`${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="col-span-1 lg:col-span-2">
                        <ProduccionDepartamentosChart tableroProduccionData={tableroProduccionData} isDarkMode={isDarkMode} />
                    </div>
                </div>
            </div>
        </div>
    );
});

Tablero1.displayName = 'Tablero1';

export default Tablero1;
