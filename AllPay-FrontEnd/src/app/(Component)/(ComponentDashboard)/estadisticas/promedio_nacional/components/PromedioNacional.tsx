'use client';

// react
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ConsolidatedTable from '@/presenters/components/ui/ConsolidatedTable';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, HeatmapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import useTableroControlPromedio from '../hooks/useTableroControlPromedio';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';

// Registrar componentes necesarios
echarts.use([
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    GraphicComponent,
    VisualMapComponent,
    BarChart,
    PieChart,
    LineChart,
    HeatmapChart,
    CanvasRenderer
]);

    

function PromedioNacional() {

  const { theme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const token = (session as any)?.user?.tokens?.access || '';

  // Hook principal para tablero de control de promedio
  const { data: tableroData, isLoading, error, fetchTablero, clearData } = useTableroControlPromedio();

  // Estados locales para filtros
  const [fechaInicioPeriodo1, setFechaInicioPeriodo1] = useState<string>('');
  const [fechaFinalPeriodo1, setFechaFinalPeriodo1] = useState<string>('');
  const [fechaInicioPeriodo2, setFechaInicioPeriodo2] = useState<string>('');
  const [fechaFinalPeriodo2, setFechaFinalPeriodo2] = useState<string>('');
  const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
      setMounted(true);
  }, []);

  useEffect(() => {
      if (error) setShowErrorAlert(true);
  }, [error]);

  // Definir isDarkMode después de la hidratación
  const isDarkMode = mounted && theme === 'dark';

    // Handlers para consultar y limpiar
  const handleConsultar = async () => {

    await fetchTablero(token, {
      fecha_inicio_periodo_1: fechaInicioPeriodo1,
      fecha_fin_periodo_1: fechaFinalPeriodo1,
      fecha_inicio_periodo_2: fechaInicioPeriodo2,
      fecha_fin_periodo_2: fechaFinalPeriodo2,
    });
  };

  const handleLimpiar = () => {
    setFechaInicioPeriodo1('');
    setFechaFinalPeriodo1('');
    setFechaInicioPeriodo2('');
    setFechaFinalPeriodo2('');
    clearData();
  };

  const MESES_DISPLAY = [ 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MESES_NUM = [1,2,3,4,5,6,7,8,9,10,11,12]; 
  const mesesOrden = [ 'Enero','Febrero','Marzo','Abril','Mayo','Junio', 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre' ];

  const precios2024: Record<string, number> = { Enero: 0, Febrero: 0, Marzo: 0, Abril: 0, Mayo: 0, Junio: 0, Julio: 0, Agosto: 0, Septiembre: 0, Octubre: 0, Noviembre: 0, Diciembre: 0 };
  const precios2025: Record<string, number> = { Enero: 0, Febrero: 0, Marzo: 0, Abril: 0, Mayo: 0, Junio: 0, Julio: 0, Agosto: 0, Septiembre: 0, Octubre: 0, Noviembre: 0, Diciembre: 0 };

  const formatCOP = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v); 
  const formatPct = (v: number) => `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}%`;

  const headerColumnsPrecios = [
    { key: 'mesGroup', label: 'MES', subColumns: [ { key: 'mes', label: '' } ] },
    { key: 'periodo1', label: 'PERIODO 1', subColumns: [ { key: 'promedio1', label: 'PRECIO PROMEDIO', render: (v: number) => formatCOP(v) } ] },
    { key: 'periodo2', label: 'PERIODO 2', subColumns: [ { key: 'promedio2', label: 'PRECIO PROMEDIO', render: (v: number) => formatCOP(v) } ] },
    { key: 'porcentualGroup', label: 'PORCENTUAL', subColumns: [ { key: 'porcentual', label: '' } ] },
    { key: 'incrementoGroup', label: 'INCREMENTO', subColumns: [ { key: 'incremento', label: '', render: (v: number) => formatCOP(v) } ] }
  ];

  const datosTablaPrecios = React.useMemo(() => {
    
    if (!tableroData) return [];
      
    // Mapear por número de mes -> precio/variación
    const p1 = new Map<number, number>();
    const p2 = new Map<number, number>();
    const varMap = new Map<number, { variacion: number; porcentaje: number }>();
      
    tableroData.periodo_1?.forEach(it =>
      p1.set(Number(it.mes), Number(it.precio_promedio) || 0)
    );
        
    tableroData.periodo_2?.forEach(it =>
      p2.set(Number(it.mes), Number(it.precio_promedio) || 0)
    );

    tableroData.variacion?.forEach(it =>
      varMap.set(Number(it.mes), {
        variacion: Number(it.variacion) || 0,
        porcentaje: Number(it.porcentaje) || 0
      })
    );
      
    // Construir filas en orden Enero..Diciembre
    const rows = MESES_NUM.map(n => {
    const promedio1 = p1.get(n) ?? 0;
    const promedio2 = p2.get(n) ?? 0;
    const v = varMap.get(n);
    const inc = v?.variacion ?? (promedio2 - promedio1);
    const pct = v?.porcentaje ?? (promedio1 > 0 ? ((inc / promedio1) * 100) : 0);
      
    return {
      mes: MESES_DISPLAY[n - 1],
      promedio1,
      promedio2,
      porcentual: formatPct(pct),
      incremento: inc
    };

    });
      
    // Fila de totales (usa los promedios del API)
    if (
      typeof tableroData.promedio_periodo_1 === 'number' &&
      typeof tableroData.promedio_periodo_2 === 'number'
    ) {
      const totalInc = tableroData.promedio_periodo_2 - tableroData.promedio_periodo_1;
      const totalPct =
      tableroData.promedio_periodo_1 > 0
        ? (totalInc / tableroData.promedio_periodo_1) * 100
        : 0;
      
      rows.push({
        mes: 'TOTALES',
        promedio1: Number(tableroData.promedio_periodo_1.toFixed(0)),
        promedio2: Number(tableroData.promedio_periodo_2.toFixed(0)),
        porcentual: formatPct(totalPct),
        incremento: Number(totalInc.toFixed(0))
      } as any);
    }
      
    return rows;
  }, [tableroData]);

  // =================== Gráfica precios (barras) vs variación (línea) ===================
  const PreciosVsVariacionChart: React.FC = () => {
    
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstance = React.useRef<echarts.ECharts | null>(null);
    const { labels, p1, p2, varPct } = buildPromedioChartData(tableroData);

        // Renombramos para que coincida con tu option actual
    let meses = labels;     // ['Ene','Feb',...]
    let p24 = p1;           // PERIODO 1
    let p25 = p2;           // PERIODO 2
    let variacion = varPct; // %

    if (meses.length === 0) {
      meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    }

    p24 = p24.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));
    p25 = p25.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));
    variacion = variacion.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));

    React.useEffect(() => {
      
      if (!chartRef.current) return;
          
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
          
      chartInstance.current = echarts.init(chartRef.current);
          
      const { labels, p1, p2, varPct } = buildPromedioChartData(tableroData);
          
      const meses = labels.length ? labels : ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const p24 = p1.map(v => (Number.isFinite(v) ? v : 0));
      const p25 = p2.map(v => (Number.isFinite(v) ? v : 0));
      const variacion = varPct.map(v => (Number.isFinite(v) ? v : 0));
          
      const option: echarts.EChartsCoreOption = {
        backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
        color: ['#083c6c', '#f8b404', '#572707'],
        tooltip: { 
          trigger: 'axis', 
          axisPointer: { type: 'cross' },
          backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDarkMode ? '#ffffff40' : '#ccc',
          textStyle: {
            color: isDarkMode ? '#f3f4f6' : '#333'
          }
        },
        title: { 
          text: 'ESTADISTICA PRECIO PROMEDIO NACIONAL POR KILOGRAMO DE CACAO', 
          left: 'center', 
          top: 10, 
          textStyle: { 
            color: isDarkMode ? '#f3f4f6' : '#562707', 
            fontSize: 16, 
            fontWeight: 'bold' 
          } 
        },
        grid: { right: '12%', left: '6%', top: 50, bottom: 80 },
        legend: { 
          data: ['PERIODO 1', 'PERIODO 2', 'Variación'], 
          bottom: 20,
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
              name: 'precios_vs_variacion',
              pixelRatio: 2
            }
          }
        },
        xAxis: [{ 
          type: 'category', 
          axisTick: { alignWithLabel: true }, 
          data: meses,
          axisLine: {
            lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
          },
          axisLabel: {
            color: isDarkMode ? '#f3f4f6' : '#374151'
          }
        }],
        yAxis: [{
            type: 'value',
            name: 'Variación',
            position: 'left',
            alignTicks: true,
            axisLine: { 
              show: true, 
              lineStyle: { color: isDarkMode ? '#ffffff40' : '#572707' } 
            },
            splitLine: {
              lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
            },
            axisLabel: { 
              formatter: '{value} %',
              color: isDarkMode ? '#f3f4f6' : '#374151'
            },
            nameTextStyle: {
              color: isDarkMode ? '#f3f4f6' : '#374151'
            },
            min: 'dataMin'
          },{
            type: 'value',
            name: 'Precio',
            position: 'right',
            alignTicks: true,
            axisLine: { 
              show: true, 
              lineStyle: { color: isDarkMode ? '#ffffff40' : '#083c6c' } 
            },
            splitLine: {
              lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
            },
            axisLabel: { 
              formatter: (v: number) => new Intl.NumberFormat('es-CO').format(v),
              color: isDarkMode ? '#f3f4f6' : '#374151'
            },
            nameTextStyle: {
              color: isDarkMode ? '#f3f4f6' : '#374151'
            }
        }],
        series: [
          { 
            name: 'PERIODO 1', 
            type: 'bar', 
            yAxisIndex: 1, 
            data: p24, 
            itemStyle: { color: '#083c6c' },
            label: {
              show: false
            }
          },
          { 
            name: 'PERIODO 2', 
            type: 'bar', 
            yAxisIndex: 1, 
            data: p25, 
            itemStyle: { color: '#f8b404' },
            label: {
              show: false
            }
          },
          {
            name: 'Variación',
            type: 'line',
            yAxisIndex: 0,
            data: variacion,
            smooth: true,
            label: { 
              show: true, 
              position: 'top', 
              formatter: '{c}%', 
              fontSize: 10, 
              color: isDarkMode ? '#f3f4f6' : '#572707', 
              fontWeight: 'bold' 
            },
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#572707', width: 2 },
            itemStyle: { color: '#572707' }
          }
        ]
            };
          
            try {
              chartInstance.current.setOption(option, true); // notMerge=true
            } catch (err) {
              console.error('Error al renderizar PreciosVsVariacionChart:', err);
            }
          
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => {
              window.removeEventListener('resize', handleResize);
              chartInstance.current?.dispose();
              chartInstance.current = null;
            };
          }, [tableroData, isDarkMode]);

        return (
            <div className="w-full">
                <div className="h-[300px] sm:h-[380px] lg:h-[600px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    // =================== Gráfica de líneas - Evolución comparativa del precio ===================
    const EvolucionComparativaChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current) return;

  // Evita fugas y duplicados al re-renderizar
  if (chartInstance.current) chartInstance.current.dispose();
  chartInstance.current = echarts.init(chartRef.current);

  const { labels, serie1, serie2 } = buildEvolucionComparativaData(tableroData);

  // Saneo
  const meses = labels.length ? labels : [...MESES_DISPLAY];
  const datosP1 = serie1.map(v => (Number.isFinite(v) ? v : 0));
  const datosP2 = serie2.map(v => (Number.isFinite(v) ? v : 0));

  const option: echarts.EChartsCoreOption = {
    backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
    color: ['#5470c6', '#91cc75'],
    title: {
      text: 'Evolución Comparativa del Precio Nacional Promedio de Cacao',
      left: 'center',
      top: 10,
      textStyle: { 
        fontSize: 18, 
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
      }
    },
    legend: { 
      data: ['Periodo 1', 'Periodo 2'], 
      top: '10%', 
      textStyle: { 
        color: isDarkMode ? '#f3f4f6' : '#562707' 
      } 
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '25%', containLabel: true },
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
          name: 'evolucion_comparativa_precio',
          pixelRatio: 2
        }
      }
    },
    xAxis: { 
      type: 'category', 
      boundaryGap: false, 
      data: meses, 
      axisLabel: { 
        color: isDarkMode ? '#f3f4f6' : '#562707' 
      },
      axisLine: {
        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => '$' + value.toLocaleString('es-CO'),
        color: isDarkMode ? '#f3f4f6' : '#562707'
      },
      axisLine: { 
        lineStyle: { color: isDarkMode ? '#ffffff40' : '#562707' } 
      },
      splitLine: {
        lineStyle: { color: isDarkMode ? '#ffffff20' : '#f3f4f6' }
      }
    },
    series: [
      {
        name: 'Periodo 1',
        type: 'line',
        data: datosP1,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#5470c6', width: 3 },
        itemStyle: { color: '#5470c6' },
        label: {
          show: false
        }
      },
      {
        name: 'Periodo 2',
        type: 'line',
        data: datosP2,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#91cc75', width: 3 },
        itemStyle: { color: '#91cc75' },
        label: {
          show: false
        }
      }
    ]
  };

  try {
    chartInstance.current.setOption(option, true); // notMerge
  } catch (e) {
    console.error('Error al renderizar EvolucionComparativaChart:', e);
  }

  const onResize = () => chartInstance.current?.resize();
  window.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('resize', onResize);
    chartInstance.current?.dispose();
    chartInstance.current = null;
  };
}, [tableroData, isDarkMode]);

        return (
            <div className="w-full">
                <div className="h-[300px] sm:h-[380px] lg:h-[600px]">
                    <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };
    
    // Funcionalidad: exportar todo a PPTX (cada contenedor => 1 slide)
    const handleDownloadPPT = async () => {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
      
        const titleColor = '562707';
        const padX = 0.6;
      
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
      
        const addHeader = (slide: any, title: string) => {
          slide.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.6, h: 0.8 });
          slide.addText(title, {
            x: 2.1, y: 0.3, w: 8.8, h: 0.6,
            fontSize: 20, bold: true, color: titleColor, align: 'center'
          });
        };
      
        // -------- Helpers para extraer arrays limpios para el PPT --------
        const getPptSeries = () => {
          const mesesFull = [...MESES_DISPLAY];
          let p1 = new Array(12).fill(0);
          let p2 = new Array(12).fill(0);
      
          if (tableroData) {
            tableroData.periodo_1?.forEach((it: any) => {
              const i = Number(it.mes) - 1;
              if (i >= 0 && i < 12) p1[i] = Number(it.precio_promedio) || 0;
            });
            tableroData.periodo_2?.forEach((it: any) => {
              const i = Number(it.mes) - 1;
              if (i >= 0 && i < 12) p2[i] = Number(it.precio_promedio) || 0;
            });
          } else {
            mesesFull.forEach((m, i) => {
              p1[i] = precios2024[m] || 0;
              p2[i] = precios2025[m] || 0;
            });
          }
      
          const idxActivos = mesesFull.map((_, i) => i).filter(i => (p1[i] ?? 0) > 0 || (p2[i] ?? 0) > 0);
          const idx = idxActivos.length ? idxActivos : mesesFull.map((_, i) => i);
      
          const labels = idx.map(i => mesesFull[i]);
          const serie1 = idx.map(i => Number(p1[i]) || 0);
          const serie2 = idx.map(i => Number(p2[i]) || 0);
          const variacion = idx.map(i => {
            const a = Number(p1[i]) || 0, b = Number(p2[i]) || 0;
            return a > 0 ? Number((((b - a) / a) * 100).toFixed(2)) : 0;
          });
      
          return { labels, serie1, serie2, variacion };
        };
      
        const cop = (v: number) =>
          new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);
      
        // ===================== SLIDE 1: Tabla =====================
        try {
          const slide1 = pptx.addSlide();
          addHeader(slide1, 'Precios promedio (PERIODO 1 vs PERIODO 2)');
      
          const { labels, serie1, serie2, variacion } = getPptSeries();
      
          const headers = ['Mes', 'PERIODO 1', 'PERIODO 2', 'Variación %', 'Incremento'];
      
          // Usa datosTablaPrecios si existen; si no, arma las filas con el helper
          const rows =
            (Array.isArray(datosTablaPrecios) && datosTablaPrecios.length > 0)
              ? (datosTablaPrecios as any[]).map(r => [
                  r.mes,
                  cop(r.promedio1),
                  cop(r.promedio2),
                  r.porcentual ?? '0.00%',
                  cop(r.incremento ?? 0),
                ])
              : labels.map((m, i) => [
                  m,
                  cop(serie1[i]),
                  cop(serie2[i]),
                  `${(variacion[i] ?? 0).toFixed(2)}%`,
                  cop((serie2[i] ?? 0) - (serie1[i] ?? 0)),
                ]);
      
          slide1.addTable(
            [headers, ...rows],
            {
              x: padX, y: 2, w: 11.6, fontSize: 10,
              border: { type: 'solid', color: '000000', pt: 1 },
              colW: [2.2, 2.4, 2.4, 2.2, 2.4],
            }
          );
        } catch {}
      
        // ===================== SLIDE 2: Barras comparativas =====================
        try {
          const slide2 = pptx.addSlide();
          addHeader(slide2, 'Estadística precio promedio nacional por kilogramo de cacao');
      
          const { labels, serie1, serie2 } = getPptSeries();
      
          slide2.addChart(
            pptx.ChartType.bar,
            [
              { name: 'PERIODO 1', labels, values: serie1 },
              { name: 'PERIODO 2', labels, values: serie2 },
            ],
            {
              x: padX, y: 2, w: 11.6, h: 4.5,
              legendPos: 'b',
              showValue: true,
              catAxisLabelFontSize: 10,
              valAxisLabelFontSize: 10,
              chartColors: ['083c6c', 'f8b404'],
            }
          );
        } catch {}
      
        // ===================== SLIDE 3: Línea – Evolución comparativa =====================
        try {
          const slide3 = pptx.addSlide();
          addHeader(slide3, 'Evolución comparativa del precio nacional promedio de cacao');
      
          const { labels, serie1, serie2 } = getPptSeries();
      
          slide3.addChart(
            pptx.ChartType.line,
            [
              { name: 'PERIODO 1', labels, values: serie1 },
              { name: 'PERIODO 2', labels, values: serie2 },
            ],
            {
              x: padX, y: 2, w: 11.6, h: 4.5,
              legendPos: 'b',
              showValue: true,
              catAxisLabelFontSize: 10,
              valAxisLabelFontSize: 10,
              chartColors: ['5470c6', '91cc75'],
            }
          );
        } catch {}
      
        // ===================== SLIDE 4: Mapas de calor (tablas coloreadas) =====================
        try {
          const slide4 = pptx.addSlide();
          addHeader(slide4, 'Mapas de calor — Precio ($) y Variación (%)');
      
          const { labels, serie1, serie2, variacion } = getPptSeries();
      
          // Escala de color simple (azules)
          const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
          const hex = (n: number) => n.toString(16).padStart(2, '0');
          const colorScale = (t: number) => {
            const c1 = { r: 0xE3, g: 0xEC, b: 0xFF }, c2 = { r: 0x3B, g: 0x6B, b: 0xDB };
            const r = lerp(c1.r, c2.r, t), g = lerp(c1.g, c2.g, t), b = lerp(c1.b, c2.b, t);
            return `${hex(r)}${hex(g)}${hex(b)}`;
          };
      
          // Precio
          const minPrecio = Math.min(...serie1, ...serie2);
          const maxPrecio = Math.max(...serie1, ...serie2);
          const norm = (v: number) => (v - minPrecio) / Math.max(1, maxPrecio - minPrecio);
      
          const tblPrecio: any[] = [];
          tblPrecio.push(['', ...labels]);
          const filaP1: any[] = ['PERIODO 1'];
          serie1.forEach(v => filaP1.push({ text: cop(v), options: { fill: colorScale(norm(v)), color: 'FFFFFF' } }));
          const filaP2: any[] = ['PERIODO 2'];
          serie2.forEach(v => filaP2.push({ text: cop(v), options: { fill: colorScale(norm(v)), color: 'FFFFFF' } }));
          tblPrecio.push(filaP1, filaP2);
      
          slide4.addTable(tblPrecio, { x: padX, y: 2, w: 11.6, fontSize: 10, border: { type: 'none' } });
      
          // Variación
          const minV = Math.min(...variacion);
          const maxV = Math.max(...variacion);
          const normV = (v: number) => (v - minV) / Math.max(1, maxV - minV);
      
          const tblVar: any[] = [];
          tblVar.push(['', ...labels]);
          const filaVar: any[] = ['Variación'];
          variacion.forEach(v => filaVar.push({ text: `${v.toFixed(2)}%`, options: { fill: colorScale(normV(v)), color: 'FFFFFF' } }));
          tblVar.push(filaVar);
      
          slide4.addTable(tblVar, { x: padX, y: 3 + 2.4, w: 11.6, fontSize: 10, border: { type: 'none' } });
        } catch {}
      
        const safeInicio = fechaInicioPeriodo1 || 'sin_fecha';
        const safeFin = fechaFinalPeriodo1 || 'sin_fecha';
        const fileName = `Promedio_Nacional_${safeInicio}_a_${safeFin}.pptx`;
        await pptx.writeFile({ fileName });
    };

    // Contenedor 3: Mapas de calor (precios y variación) como la imagen
    const HeatmapsPrecioVariacion: React.FC = () => {
        const heatmap1Ref = React.useRef<HTMLDivElement>(null);
        const heatmap2Ref = React.useRef<HTMLDivElement>(null);
        const chart1 = React.useRef<echarts.ECharts | null>(null);
        const chart2 = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!heatmap1Ref.current || !heatmap2Ref.current) return;
          
            // limpia instancias previas
            chart1.current?.dispose();
            chart2.current?.dispose();
            chart1.current = echarts.init(heatmap1Ref.current);
            chart2.current = echarts.init(heatmap2Ref.current);
          
            // ---------- MAPA DE CALOR: PRECIO ----------
            const { labels, serie1, serie2 } = buildHeatmapPrecioData(tableroData);
            const meses = labels.length ? labels : [...mesesOrden];
          
            // Queremos Periodo 2 arriba, Periodo 1 abajo (visual)
            const yCatsPrecio = ['Periodo 2', 'Periodo 1'];
          
            // datos [xIndex, yIndex, value]
            const dataPrecio: number[][] = [];
            meses.forEach((_m, i) => {
              dataPrecio.push([i, 1, Number.isFinite(serie1[i]) ? serie1[i] : 0]); // fila 1 => Periodo 1
              dataPrecio.push([i, 0, Number.isFinite(serie2[i]) ? serie2[i] : 0]); // fila 0 => Periodo 2
            });
          
            // dominio robusto (ignora 0 / NaN)
            const preciosValid = [...serie1, ...serie2].filter(v => Number.isFinite(v) && v > 0);
            const minPrecio = preciosValid.length ? Math.min(...preciosValid) : 0;
            const maxPrecio = preciosValid.length ? Math.max(...preciosValid) : 1;
          
            const fmtCOP = (v: number) => '$' + v.toLocaleString('es-CO');
          
            const optionPrecio: echarts.EChartsCoreOption = {
              backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
              title: {
                text: 'MAPA DE CALOR — PRECIO PROMEDIO NACIONAL ($)',
                left: 'center',
                top: 6,
                textStyle: { 
                  fontSize: 13, 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#f3f4f6' : '#562707' 
                }
              },
              grid: { top: 40, left: 60, right: 40, bottom: 110 },
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
                  restore: { 
                    show: true,
                    title: 'Restaurar'
                  },
                  saveAsImage: { 
                    show: true,
                    title: 'Guardar como imagen',
                    name: 'heatmap_precio_promedio',
                    pixelRatio: 2
                  }
                }
              },
              tooltip: {
                backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                textStyle: {
                  color: isDarkMode ? '#f3f4f6' : '#333'
                },
                formatter: (p: any) => {
                  const val = p.data[2] as number;
                  return `${yCatsPrecio[p.data[1]]} - ${meses[p.data[0]]}: ${fmtCOP(val)}`;
                }
              },
              xAxis: {
                type: 'category',
                data: meses,
                splitArea: { show: true },
                axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#666', 
                  margin: 14 
                },
                axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                }
              },
              yAxis: { 
                type: 'category', 
                data: yCatsPrecio, 
                axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#666' 
                },
                axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                }
              },
              visualMap: {
                min: minPrecio,
                max: maxPrecio,
                orient: 'horizontal',
                left: 'center',
                bottom: 8,
                calculable: true,
                inRange: { color: ['#e3ecff', '#7aa6ff', '#3b6bdb'] }
                // (Opcional) para formatear etiquetas del control:
                // formatter: (v: number) => fmtCOP(v)
              },
              series: [{
                name: 'Precio',
                type: 'heatmap',
                data: dataPrecio,
                label: {
                  show: true,
                  formatter: (p: any) => fmtCOP(p.data[2] as number),
                  color: '#fff',
                  fontSize: 10
                },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)' } }
              }]
            };
          
            // ---------- MAPA DE CALOR: VARIACIÓN (%) ----------
            // Reutilizamos los mismos meses para alinear
            let variacion = meses.map((_m, i) => {
              const a = Number(serie1[i]) || 0; // periodo 1
              const b = Number(serie2[i]) || 0; // periodo 2
              return a > 0 ? Number((((b - a) / a) * 100).toFixed(2)) : 0;
            });
          
            // Si API trae variación por mes, la priorizamos
            if (tableroData?.variacion?.length) {
              const mapVar = new Map<string, number>();
              tableroData.variacion.forEach((v: any) => {
                const idx = Number(v.mes) - 1;
                if (idx >= 0 && idx < 12) {
                  const mes = MESES_DISPLAY[idx];
                  mapVar.set(mes, Number(v.porcentaje) || 0);
                }
              });
              variacion = meses.map(m => Number.isFinite(mapVar.get(m)!) ? (mapVar.get(m) as number) : 0);
            }
          
            const varValid = variacion.filter(v => Number.isFinite(v));
            const minVar = varValid.length ? Math.min(...varValid) : 0;
            const maxVar = varValid.length ? Math.max(...varValid) : 1;
          
            const yCatsVar = ['Variación'];
            const dataVar: number[][] = [];
            meses.forEach((_m, i) => dataVar.push([i, 0, Number.isFinite(variacion[i]) ? variacion[i] : 0]));
          
            const optionVar: echarts.EChartsCoreOption = {
              backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
              title: {
                text: 'MAPA DE CALOR — VARIACIÓN PROMEDIO NACIONAL (%)',
                left: 'center',
                top: 6,
                textStyle: { 
                  fontSize: 13, 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#f3f4f6' : '#562707' 
                }
              },
              grid: { top: 40, left: 60, right: 40, bottom: 110 },
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
                  restore: { 
                    show: true,
                    title: 'Restaurar'
                  },
                  saveAsImage: { 
                    show: true,
                    title: 'Guardar como imagen',
                    name: 'heatmap_variacion_promedio',
                    pixelRatio: 2
                  }
                }
              },
              tooltip: {
                backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                textStyle: {
                  color: isDarkMode ? '#f3f4f6' : '#333'
                },
                formatter: (p: any) => `${meses[p.data[0]]}: ${(p.data[2] as number).toFixed(2)}%`
              },
              xAxis: {
                type: 'category',
                data: meses,
                splitArea: { show: true },
                axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#666', 
                  margin: 14 
                },
                axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                }
              },
              yAxis: { 
                type: 'category', 
                data: yCatsVar, 
                axisLabel: { 
                  color: isDarkMode ? '#f3f4f6' : '#666' 
                },
                axisLine: {
                  lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                }
              },
              visualMap: {
                min: Math.floor(minVar),
                max: Math.ceil(maxVar),
                orient: 'horizontal',
                left: 'center',
                bottom: 8,
                calculable: true,
                inRange: { color: ['#e3ecff', '#7aa6ff', '#3b6bdb'] }
                // (Opcional: escala divergente si hay negativos)
                // inRange: { color: ['#c0392b', '#e3ecff', '#3b6bdb'] }
              },
              series: [{
                name: 'Variación',
                type: 'heatmap',
                data: dataVar,
                label: {
                  show: true,
                  formatter: (p: any) => `${(p.data[2] as number).toFixed(2)}%`,
                  color: '#fff',
                  fontSize: 10
                },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)' } }
              }]
            };
          
            // Render
            try { chart1.current.setOption(optionPrecio, true); } catch (e) { console.error(e); }
            try { chart2.current.setOption(optionVar, true); } catch (e) { console.error(e); }
          
            const handleResize = () => { chart1.current?.resize(); chart2.current?.resize(); };
            window.addEventListener('resize', handleResize);
            return () => {
              window.removeEventListener('resize', handleResize);
              chart1.current?.dispose();
              chart2.current?.dispose();
            };
          }, [tableroData, isDarkMode]);

        return (
            <div className="w-full space-y-6">
                <div className="h-[260px] sm:h-[300px] lg:h-[320px]">
                    <div ref={heatmap1Ref} style={{ width: '100%', height: '100%' }} />
                </div>
                <div className="h-[220px] sm:h-[260px] lg:h-[280px]">
                    <div ref={heatmap2Ref} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>
        );
    };

    const buildPromedioChartData = (data?: any) => {
        // Abreviaturas para el eje X del chart
        const labels = MESES_NUM.map(n => MESES_DISPLAY[n - 1].slice(0, 3));
      
        // Series iniciales de 12 meses
        let p1 = new Array(12).fill(0);        // PERIODO 1
        let p2 = new Array(12).fill(0);        // PERIODO 2
        let varPct = new Array(12).fill(0);    // Variación %
      
        if (data) {
          data.periodo_1?.forEach((it: any) => {
            const i = Number(it.mes) - 1;
            if (i >= 0 && i < 12) p1[i] = Number(it.precio_promedio) || 0;
          });
          data.periodo_2?.forEach((it: any) => {
            const i = Number(it.mes) - 1;
            if (i >= 0 && i < 12) p2[i] = Number(it.precio_promedio) || 0;
          });
      
          if (Array.isArray(data.variacion) && data.variacion.length) {
            data.variacion.forEach((it: any) => {
              const i = Number(it.mes) - 1;
              if (i >= 0 && i < 12) varPct[i] = Number(it.porcentaje) || 0;
            });
          } else {
            // Si la API no trae 'variacion', la calculamos
            varPct = p1.map((v1, i) => (v1 > 0 ? Number((((p2[i] - v1) / v1) * 100).toFixed(2)) : 0));
          }
        } else {
          // Fallback con tus datos de ejemplo (si no hay respuesta aún)
          const meses = MESES_DISPLAY;
          p1 = meses.map(m => precios2024[m] || 0);
          p2 = meses.map(m => precios2025[m] || 0);
          varPct = meses.map(m => {
            const a = precios2024[m] || 0, b = precios2025[m] || 0;
            return a > 0 ? Number((((b - a) / a) * 100).toFixed(2)) : 0;
          });
        }
      
        return { labels, p1, p2, varPct };
    };

    const buildEvolucionComparativaData = (data?: any) => {
        // Arreglos base (12 meses)
        let pPeriodo1 = new Array(12).fill(0);
        let pPeriodo2 = new Array(12).fill(0);
      
        if (data) {
          data.periodo_1?.forEach((it: any) => {
            const i = Number(it.mes) - 1;
            if (i >= 0 && i < 12) pPeriodo1[i] = Number(it.precio_promedio) || 0;
          });
          data.periodo_2?.forEach((it: any) => {
            const i = Number(it.mes) - 1;
            if (i >= 0 && i < 12) pPeriodo2[i] = Number(it.precio_promedio) || 0;
          });
        } else {
          // Fallback de demo (si no hay data del API)
          MESES_DISPLAY.forEach((m, i) => {
            pPeriodo1[i] = precios2024[m] || 0;
            pPeriodo2[i] = precios2025[m] || 0;
          });
        }
      
        // Etiquetas con NOMBRES completos (Enero... Diciembre)
        const labelsFull = [...MESES_DISPLAY];
      
        // Filtramos a solo los meses que tengan algún valor (>0) en cualquiera de los periodos
        const activos = labelsFull
          .map((_, i) => i)
          .filter(i => (pPeriodo1[i] ?? 0) > 0 || (pPeriodo2[i] ?? 0) > 0);
      
        // Si hay meses activos, usamos solo esos; si no, usamos los 12 (todo cero)
        const labels = activos.length ? activos.map(i => labelsFull[i]) : labelsFull;
        const serie1 = activos.length ? activos.map(i => Number(pPeriodo1[i]) || 0) : pPeriodo1.map(v => Number(v) || 0);
        const serie2 = activos.length ? activos.map(i => Number(pPeriodo2[i]) || 0) : pPeriodo2.map(v => Number(v) || 0);
      
        return { labels, serie1, serie2 };
    };

    const buildHeatmapPrecioData = (data?: any) => {
        // series base
        const p1 = new Array(12).fill(0); // PERIODO 1
        const p2 = new Array(12).fill(0); // PERIODO 2
      
        if (data) {
          data.periodo_1?.forEach((it: any) => {
            const i = Number(it.mes) - 1;
            if (i >= 0 && i < 12) p1[i] = Number(it.precio_promedio) || 0;
          });
          data.periodo_2?.forEach((it: any) => {
            const i = Number(it.mes) - 1;
            if (i >= 0 && i < 12) p2[i] = Number(it.precio_promedio) || 0;
          });
        } else {
          // fallback demo si aún no hay API
          MESES_DISPLAY.forEach((m, i) => {
            p1[i] = precios2024[m] || 0;
            p2[i] = precios2025[m] || 0;
          });
        }
      
        // Índices de meses que tienen algún dato (>0) en cualquiera de los períodos
        const activosIdx = MESES_NUM.map(n => n - 1)
          .filter(i => (p1[i] ?? 0) > 0 || (p2[i] ?? 0) > 0);
      
        const idx = activosIdx.length ? activosIdx : MESES_NUM.map(n => n - 1);
      
        const labels = idx.map(i => MESES_DISPLAY[i]);         // meses (Enero..)
        const serie1 = idx.map(i => Number(p1[i]) || 0);       // Periodo 1
        const serie2 = idx.map(i => Number(p2[i]) || 0);       // Periodo 2
      
        return { labels, serie1, serie2 };
      };
      
      

    // (Se elimina el contenedor 4 original con pie/linea)

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

                    <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 lg:my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    TABLERO DE ESTADISTICA PRECIO PROMEDIO NACIONAL POR KILOGRAMO DE CACAO 
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}></h3>

                    {/* Filtros para el servicio - Dos períodos */}
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4'>
                        {/* Periodo 1 */}
                        <div className={`border rounded-xl p-4 w-full mx-auto ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}>
                            <div className={`text-center font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                PERIODO 1
                            </div>
                            <div className='grid grid-cols-1 gap-3'>
                                <AnimatedInput
                                    label='Fecha de Inicio'
                                    type='date'
                                    value={fechaInicioPeriodo1}
                                    onChange={(e) => setFechaInicioPeriodo1(e.target.value)}
                                    name='fecha_inicio_periodo_1'
                                    required
                                    darkMode={isDarkMode}
                                />
                                <AnimatedInput
                                    label='Fecha Final'
                                    type='date'
                                    value={fechaFinalPeriodo1}
                                    onChange={(e) => setFechaFinalPeriodo1(e.target.value)}
                                    name='fecha_final_periodo_1'
                                    required
                                    darkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        {/* Periodo 2 */}
                        <div className={`border rounded-xl p-4 w-full mx-auto ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}>
                            <div className={`text-center font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                PERIODO 2
                            </div>
                            <div className='grid grid-cols-1 gap-3'>
                                <AnimatedInput
                                    label='Fecha de Inicio'
                                    type='date'
                                    value={fechaInicioPeriodo2}
                                    onChange={(e) => setFechaInicioPeriodo2(e.target.value)}
                                    name='fecha_inicio_periodo_2'
                                    required
                                    darkMode={isDarkMode}
                                />
                                <AnimatedInput
                                    label='Fecha Final'
                                    type='date'
                                    value={fechaFinalPeriodo2}
                                    onChange={(e) => setFechaFinalPeriodo2(e.target.value)}
                                    name='fecha_final_periodo_2'
                                    required
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
                    <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 sm:my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                    COMPARATIVO PRODUCCION ESTIMADA VS REGISTRADA
                    </h2>

                    {/* Nuevos cuadros de métricas - 3 por fila */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                            {/* PRECIO PROMEDIO AÑO 1 */}
                            <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    PRECIO PROMEDIO PERIODO 1
                                </div>
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {tableroData?.promedio_periodo_1 ? 
                                        new Intl.NumberFormat('es-CO', { 
                                            style: 'currency', 
                                            currency: 'COP', 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 0 
                                        }).format(tableroData.promedio_periodo_1) : 
                                        '$0'
                                    }
                                </div>
                            </div>

                            {/* PRECIO PROMEDIO AÑO 2 */}
                            <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    PRECIO PROMEDIO PERIODO 2
                                </div>
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {tableroData?.promedio_periodo_2 ? 
                                        new Intl.NumberFormat('es-CO', { 
                                            style: 'currency', 
                                            currency: 'COP', 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 0 
                                        }).format(tableroData.promedio_periodo_2) : 
                                        '$0'
                                    }
                                </div>
                            </div>

                            {/* VARIACION PROMEDIO COMPARATIVA */}
                            <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    VARIACION PROMEDIO COMPARATIVA
                                </div>
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {tableroData?.promedio_periodo_1 && tableroData?.promedio_periodo_2 ? 
                                        `${new Intl.NumberFormat('es-CO', { 
                                            minimumFractionDigits: 1, 
                                            maximumFractionDigits: 1 
                                        }).format(((tableroData.promedio_periodo_2 - tableroData.promedio_periodo_1) / tableroData.promedio_periodo_1) * 100)}%` : 
                                        '0%'
                                    }
                                </div>
                            </div>

                            {/* MES DE MENOR VARIACIÓN */}
                            <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    MES DE MENOR VARIACIÓN
                                </div>
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {tableroData?.mes_var_menor || 'N/A'}
                                </div>
                            </div>

                            {/* MES DE MAYOR VARIACIÓN */}
                            <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    MES DE MAYOR VARIACIÓN
                                </div>
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {tableroData?.mes_var_mayor || 'N/A'}
                                </div>
                            </div>

                            {/* INCREMENTO MAXIMO ABSOLUTO */}
                            <div className={`border rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border-white/20' : 'bg-white border-gray-300'}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    INCREMENTO MAXIMO ABSOLUTO
                                </div>
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {tableroData?.incremento_max ? 
                                        new Intl.NumberFormat('es-CO', { 
                                            style: 'currency', 
                                            currency: 'COP', 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 0 
                                        }).format(tableroData.incremento_max) : 
                                        '$0'
                                    }
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
   
                        {/* Indicador de carga */}
                        {isLoading && (
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-6 text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? 'border-white' : 'border-[rgb(var(--brown))]'}`}></div>
                                <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando datos...</p>
                            </div>
                        )}

                        {/* Contenedor 1: Tabla de Precios (imagen) */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                       
                            {tableroData ? (
                                <ConsolidatedTable
                                    headerColumns={headerColumnsPrecios as any}
                                    data={datosTablaPrecios as any}
                                    currentPage={1}
                                    totalPages={1}
                                    onPageChange={() => {}}
                                />
                            ) : (
                                <>
                                <ConsolidatedTable
                                    headerColumns={headerColumnsPrecios as any}
                                    data={[]}
                                    currentPage={1}
                            totalPages={1}
                            onPageChange={() => {}}
                            />
                            </>
                            )} 
                        </div>

                        {/* Contenedor 2: Barras (2024/2025) + Línea (variación) */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>                       
                            <PreciosVsVariacionChart />
                        </div>

                        {/* Contenedor 3: Gráfico de líneas - Evolución comparativa del precio */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>          
                            <EvolucionComparativaChart />
                        </div>

                        {/* Contenedor 4: Mapas de calor (precios y variación) */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>                       
                            <HeatmapsPrecioVariacion />
                        </div>

                        {/* Contenedor 4 eliminado por solicitud */}



                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default PromedioNacional;
  