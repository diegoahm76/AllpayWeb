'use client';

// react
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';


// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, HeatmapChart } from 'echarts/charts';
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
import { useSession, signIn } from 'next-auth/react';
import useTablero8NewYork from '../hooks/useTablero8NewYork';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';
import HeatmapPreciosNY from './HeatmapPreciosNY';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, CalendarComponent, VisualMapComponent, ToolboxComponent, HeatmapChart,  BarChart, PieChart, LineChart, CanvasRenderer]);

// Tipo para las variaciones digitadas por el usuario
interface VariacionDigitada {
    mes: string;
    var_ton_pct: number;
    var_abs: number;
    var_pct: number;
}

function ComparativoNewYork() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    // Hook principal para tablero 8 de New York
    const { data: tableroData, isLoading, error, fetchTablero8NewYork, clearData } = useTablero8NewYork();
    const { isLoading: isLoadingTiposCargue, fetchTiposCargue } = useTiposCargue();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [, setToggleEnabled] = useState<boolean>(false);
    // Campos adicionales para la UI tipo "dos periodos"
    const [fechaInicio2, setFechaInicio2] = useState<string>('');
    const [fechaFinal2, setFechaFinal2] = useState<string>('');
    const [digitarVariacion, setDigitarVariacion] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);

    // Nuevos estados para variaciones digitadas
    const [, setVariacionesDigitadas] = useState<VariacionDigitada[]>([]);
    const [mounted, setMounted] = useState<boolean>(false);

    // (sin uso por ahora)

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
        if (error) setShowErrorAlert(true);
    }, [error]);

    // Definir isDarkMode después de la hidratación
    const isDarkMode = mounted && theme === 'dark';

    // Inicializar variaciones digitadas cuando cambien los datos del tablero
    useEffect(() => {
        if (tableroData && digitarVariacion) {
            const meses = new Set<string>();
            // Para el tablero 8 de New York, usar los meses de los desgloses por mes
            tableroData.periodo_1.datos.desglose_por_mes?.forEach((m: any) => meses.add(m.nombre_mes));
            tableroData.periodo_2.datos.desglose_por_mes?.forEach((m: any) => meses.add(m.nombre_mes));
            
            const mesesArray = Array.from(meses);
            const variacionesIniciales = mesesArray.map(mes => ({
                mes,
                var_ton_pct: 0,
                var_abs: 0,
                var_pct: 0
            }));
            setVariacionesDigitadas(variacionesIniciales);
        }
    }, [tableroData, digitarVariacion]);

    // Función para consultar datos
    const handleConsultar = async () => {
        if (!token) return;
        if (!fechaInicio || !fechaFinal || !fechaInicio2 || !fechaFinal2) {
            setShowErrorAlert(true);
            return;
        }

        try {
        const params = {
            fecha_inicio_periodo_1: fechaInicio,
            fecha_fin_periodo_1: fechaFinal,
                fecha_inicio_periodo_2: fechaInicio2,
                fecha_fin_periodo_2: fechaFinal2
            };
            await fetchTablero8NewYork(token, params);
        } catch (err) {
            console.error('Error al consultar datos:', err);
            setShowErrorAlert(true);
        }
    };

    // Función para limpiar datos
         const handleLimpiar = () => {
         setFechaInicio('');
         setFechaFinal('');
         setFechaInicio2('');
         setFechaFinal2('');
        setToggleEnabled(false);
         setDigitarVariacion(false);
         setVariacionesDigitadas([]);
        clearData();
    };

    // Función para generar el PPT con la info que llega del API (Tablero8NewYorkData)
    // PPT con 2 slides de heatmap DIARIO (vectorial) para cada período
const handleDownloadPPT = async () => {
    if (!tableroData) {
      alert('Primero consulta datos para poder generar el PPT');
            return;
        }
        
    // ----- Utils de fechas (ISO, semanas desde lunes) -----
    const parseISO = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    };
    const startOfWeekMon = (d: Date) => {
      const dt = new Date(d);
      const day = (dt.getDay() + 6) % 7; // 0 = lunes
      dt.setDate(dt.getDate() - day);
      dt.setHours(0, 0, 0, 0);
      return dt;
    };
    const addDays = (d: Date, n: number) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x;
    };

  
    // ----- Lectura de datos día a día -----
    type Dia = { fecha: string; valor: number };
    const getDaily = (periodo: any): Dia[] => {
      const arr = periodo?.datos?.desglose_por_dia ?? [];
      return arr.map((d: any) => ({
        fecha: String(d.fecha),
        valor: Number(d.precio_cierre ?? 0),
      }));
    };
  
    const d1: Dia[] = getDaily(tableroData.periodo_1);
    const d2: Dia[] = getDaily(tableroData.periodo_2);
  
    // Si el usuario eligió rangos, tomemos los extremos para trazar
    const start1 = d1.length ? parseISO(d1[0].fecha) : new Date();
    const end1   = d1.length ? parseISO(d1[d1.length - 1].fecha) : new Date();
    const start2 = d2.length ? parseISO(d2[0].fecha) : new Date();
    const end2   = d2.length ? parseISO(d2[d2.length - 1].fecha) : new Date();
  
    // Escala de color global (min/max de ambos periodos con datos válidos)
    const allVals = [...d1.map(x => x.valor), ...d2.map(x => x.valor)].filter(v => Number.isFinite(v));
    let vMin = allVals.length ? Math.min(...allVals) : 0;
    let vMax = allVals.length ? Math.max(...allVals) : vMin + 1;
    if (vMax === vMin) vMax = vMin + 1; // evita división por cero
  
    // Paleta y helpers de color (gradiente 4 stops)
    type RGB = { r:number; g:number; b:number };
    const hexToRgb = (hex: string): RGB => {
      const h = hex.replace('#','');
      return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
    };
    const rgbToHex = (c: RGB) =>
      '#' + [c.r,c.g,c.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
    const STOPS = ['#FF0000', '#FF7F00', '#FFFF66', '#00B050'].map(hexToRgb);
    const lerp = (a:number,b:number,t:number)=> a + (b-a)*t;
    const lerpRgb = (a:RGB,b:RGB,t:number): RGB => ({ r: lerp(a.r,b.r,t), g: lerp(a.g,b.g,t), b: lerp(a.b,b.b,t) });
    const colorFor = (value:number|null|undefined) => {
      if (value == null || !Number.isFinite(value)) return '#e5e7eb'; // sin dato
      const t = (value - vMin) / (vMax - vMin);
      const T = Math.max(0, Math.min(1, t));
      const n = STOPS.length - 1;
      const pos = Math.max(0, Math.min(n - 1, Math.floor(T * n)));
      const localT = (T * n) - pos;
      return rgbToHex(lerpRgb(STOPS[pos], STOPS[pos + 1], localT));
    };
  
    // Etiquetas español
    const WD = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  
    // Construye un mapa fecha->valor para acceso O(1)
    const mapDaily = (arr: Dia[]) => {
      const m = new Map<string, number>();
      arr.forEach(x => m.set(x.fecha, x.valor));
      return m;
    };
    const m1 = mapDaily(d1);
    const m2 = mapDaily(d2);
  
    // Dibuja heatmap diario (filas=7 días, columnas=semanas) en un slide
    const drawDailyHeatmap = (
      slide: PptxGenJS.Slide,
      titulo: string,
      data: Map<string, number>,
      startDate: Date,
      endDate: Date
    ) => {
      const titleOpts: PptxGenJS.TextPropsOptions = {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 20, bold: true, color: '#562707', align: 'center',
      };
      slide.addText(titulo, titleOpts);
  
      // Rango exacto de dibujo (alineado al lunes de la semana)
      const s0 = startOfWeekMon(startDate);
      const e0 = startOfWeekMon(endDate);
      // número de semanas a cubrir (inclusive)
      const weeks = Math.floor((+addDays(e0, 7) - +s0) / (7 * 24 * 3600 * 1000));
  
      // Layout
      const left = 0.8;                 // margen izquierdo
      const top = 2;                  // margen superior del grid
      const gridW = 9.0;                // ancho disponible para columnas
      const cellW = Math.min(0.18, gridW / Math.max(1, weeks)); // asegura que quepa
      const cellH = cellW;              // cuadrado
      const gridH = cellH * 7;
  
      // Etiquetas de días (izquierda)
      for (let r = 0; r < 7; r++) {
        slide.addText(WD[r], {
          x: left - 0.35, y: top + r * cellH + (cellH - 0.18) / 2,
          w: 0.3, h: 0.18, fontSize: 9, color: '#6b7280', align: 'right',
        } as PptxGenJS.TextPropsOptions);
      }
  
      // Dibujar las celdas día a día
      let col = 0;
      for (let w = 0; w < weeks; w++) {
        for (let r = 0; r < 7; r++) {
          const d = addDays(s0, w * 7 + r); // lunes + offset
          if (d > endDate) break;
          if (d < startDate) continue;
  
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const key = `${yyyy}-${mm}-${dd}`;
          const val = data.get(key);
          const fill = colorFor(val);
  
          slide.addShape('rect', {
            x: left + col * cellW,
            y: top + r * cellH,
            w: cellW,
            h: cellH,
            fill: { color: fill },
            line: { color: '#ffffff', width: 0.2 },
          } as any);
        }
        col++;
      }
  
      // Etiquetas de meses en la parte superior (al inicio de cada mes)
      let lastMonth = -1;
      col = 0;
      for (let w = 0; w < weeks; w++) {
        const d = addDays(s0, w * 7); 
        if (d < startDate || d > endDate) { col++; continue; }
        const m = d.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          slide.addText(MESES[m], {
            x: left + col * cellW,
            y: top - 0.28,
            w: 0.8,
            h: 0.2,
            fontSize: 9,
            color: '#374151',
          } as PptxGenJS.TextPropsOptions);
        }
        col++;
      }
  
      // Leyenda (gradiente)
      const legendX = left + 1.2;
      const legendY = top + gridH + 1;
      const legendW = 6.8;
      const legendH = 0.22;
      const steps = 24;
      const stepW = legendW / steps;
      for (let s = 0; s < steps; s++) {
        const t = s / (steps - 1);
        const v = vMin + t * (vMax - vMin);
        slide.addShape('rect', {
          x: legendX + s * stepW,
          y: legendY,
          w: stepW,
          h: legendH,
          fill: { color: colorFor(v) },
          line: { color: 'FFFFFF', width: 0 },
        } as any);
      }
      slide.addText(
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(vMin),
        { x: legendX - 0.55, y: legendY, w: 0.5, h: legendH, fontSize: 9, color: '#374151', align: 'right' } as PptxGenJS.TextPropsOptions
      );
      slide.addText(
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(vMax),
        { x: legendX + legendW + 0.05, y: legendY, w: 0.7, h: legendH, fontSize: 9, color: '#374151', align: 'left' } as PptxGenJS.TextPropsOptions
      );
      slide.addText('Menor', { x: legendX - 0.9, y: legendY - 0.18, w: 0.8, h: 0.18, fontSize: 9, color: '#6b7280', align: 'right' } as PptxGenJS.TextPropsOptions);
      slide.addText('Mayor', { x: legendX + legendW + 0.05, y: legendY - 0.18, w: 0.8, h: 0.18, fontSize: 9, color: '#6b7280', align: 'left' } as PptxGenJS.TextPropsOptions);
    };
  
    // ----- Crear PPT: SOLO 2 slides (un período por slide) -----
    const pptx = new PptxGenJS();
  
    const titulo1 = 'HEATMAP DIARIO — PERÍODO 1 (Precio cierre)';
    const titulo2 = 'HEATMAP DIARIO — PERÍODO 2 (Precio cierre)';
  
    const s1 = pptx.addSlide();
    drawDailyHeatmap(s1, titulo1, m1, start1, end1);
  
    const s2 = pptx.addSlide();
    drawDailyHeatmap(s2, titulo2, m2, start2, end2);
  
    // Guardar
    const safeInicio1 = fechaInicio || 'p1_inicio';
    const safeFin1 = fechaFinal || 'p1_fin';
    const safeInicio2 = fechaInicio2 || 'p2_inicio';
    const safeFin2 = fechaFinal2 || 'p2_fin';
    await pptx.writeFile({
      fileName: `Heatmap_NY_Diario_${safeInicio1}_${safeFin1}_vs_${safeInicio2}_${safeFin2}.pptx`,
    });
  };
  
  

    // Componente del mapa de calor usando datos del API
    const renderHeatmap = () => {
        return <HeatmapPreciosNY data={tableroData} darkMode={isDarkMode} />;
    };

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
                        TABLERO DE ESTADISTICA PRECIO BOLSA DE NEW YORK
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
                            MAPA DE CALOR PRECIO DE CIERRE NUEVA YORK
                        </h2>
               
                    </div>

                    <AlertError 
                         isOpen={showErrorAlert}
                         message={error || 'No puede tener activos ambos switches "Calcular Variación" y "Digitar Variación" al mismo tiempo. Desactive uno antes de activar el otro.'}
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

        
                        {/* Contenedor intermedio (similar al contenedor 1) */}
                        
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="col-span-1 lg:col-span-2">
                                        {renderHeatmap()}
                                    </div>
                                </div>
                            </div>
                        
                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default ComparativoNewYork;
  