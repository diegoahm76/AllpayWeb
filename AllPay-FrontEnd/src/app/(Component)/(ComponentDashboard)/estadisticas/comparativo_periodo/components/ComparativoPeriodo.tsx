'use client';

// react
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import ToggleSwitch from '@/presenters/components/ui/ToggleSwitch';
// import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ConsolidatedTable from '@/presenters/components/ui/ConsolidatedTable';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import useTableroControlEstimados from '../hooks/useTableroControlEstimados';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import PptxGenJS from 'pptxgenjs';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, BarChart, PieChart, LineChart, CanvasRenderer]);

// Tipo para las variaciones digitadas por el usuario
interface VariacionDigitada {
    mes: string;
    est_ton: number;
    est_cuota: number;
    var_ton_pct: number;
    var_abs: number;
    var_pct: number;
}

function ComparativoPeriodo() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access || '';

    // Hook principal para tablero de control estimados
    const { data: tableroData, isLoading, error, fetchTableroEstimados, clearData } = useTableroControlEstimados();
    const { isLoading: isLoadingTiposCargue, fetchTiposCargue } = useTiposCargue();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [, setTipoCargueSeleccionado] = useState<string>('EXP');
    const [toggleEnabled, setToggleEnabled] = useState<boolean>(false);
    // Campos adicionales para la UI tipo "dos periodos"
    const [fechaInicio2, setFechaInicio2] = useState<string>('');
    const [fechaFinal2, setFechaFinal2] = useState<string>('');
    const [digitarVariacion, setDigitarVariacion] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // Nuevos estados para variaciones digitadas
    const [variacionesDigitadas, setVariacionesDigitadas] = useState<VariacionDigitada[]>([]);
    const [, setUsarVariacionesDigitadas] = useState<boolean>(false);

    // (sin uso por ahora)

    // Hook para verificar que estamos en el lado del cliente
    useEffect(() => {
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

    // Inicializar variaciones digitadas cuando cambien los datos del tablero
    useEffect(() => {
        if (tableroData && digitarVariacion) {
            const nuevasVariaciones = tableroData.detalle_por_meses?.map(mesData => {
                // Inicializar con valores en 0 por defecto
                return {
                    mes: mesData.mes,
                    est_ton: 0,
                    est_cuota: 0,
                    var_ton_pct: 0,
                    var_abs: 0,
                    var_pct: 0
                };
            }) || [];
            
            setVariacionesDigitadas(nuevasVariaciones);
        }
    }, [tableroData, digitarVariacion]);

    // Definir isDarkMode después de la hidratación
    const isDarkMode = mounted && theme === 'dark';

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {

        const params = {
            fecha_inicio_periodo_1: fechaInicio,
            fecha_fin_periodo_1: fechaFinal,
            fecha_inicio_periodo_2: fechaInicio2 || fechaInicio, 
            fecha_fin_periodo_2: fechaFinal2 || fechaFinal,
            calcular_variacion: toggleEnabled
        };

        await fetchTableroEstimados(token, params);
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
         clearData(); // Limpia los datos del hook
     };



    // Funciones utilitarias para formatear números
    const formatNumberInput = (value: string): string => {
        if (!value) return '';
        
        // Remover todo excepto números y comas/puntos
        let cleanValue = value.replace(/[^\d.,]/g, '');
        
        // Convertir comas a puntos para normalizar
        cleanValue = cleanValue.replace(/,/g, '.');
        
        // Si tiene múltiples puntos, determinar cuál es decimal
        const parts = cleanValue.split('.');
        
        if (parts.length === 1) {
            // Solo números enteros
            const number = parts[0];
            return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        } else if (parts.length === 2) {
            // Un solo punto - puede ser decimal
            const [integerPart, decimalPart] = parts;
            if (decimalPart.length <= 2 && integerPart.length > 0) {
                // Es decimal
                const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                return `${formattedInteger}.${decimalPart}`;
            } else {
                // Es separador de miles
                const number = parts.join('');
                return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }
        } else {
            // Múltiples puntos
            const lastPart = parts[parts.length - 1];
            if (lastPart.length <= 2 && lastPart.length > 0) {
                // El último es decimal
                const integerPart = parts.slice(0, -1).join('');
                const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                return `${formattedInteger}.${lastPart}`;
            } else {
                // Todos son separadores
                const number = parts.join('');
                return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }
        }
    };

    const parseNumberInput = (formattedValue: string): number => {
        if (!formattedValue) return 0;
        
        // Reemplazar puntos que son separadores de miles
        // Primero, determinar si el último punto es decimal
        const parts = formattedValue.split('.');
        
        if (parts.length <= 1) {
            return parseInt(formattedValue.replace(/\./g, '')) || 0;
        }
        
        const lastPart = parts[parts.length - 1];
        
        if (lastPart.length <= 2 && lastPart.length > 0 && parts.length >= 2) {
            // El último punto es probablemente decimal
            const integerPart = parts.slice(0, -1).join('');
            return parseFloat(`${integerPart}.${lastPart}`) || 0;
        } else {
            // Todos son separadores de miles
            return parseInt(parts.join('')) || 0;
        }
    };

    // Handler para actualizar valores estimados y calcular variaciones automáticamente
    const handleEstimadoChange = (mes: string, campo: 'est_ton' | 'est_cuota', valor: string) => {
        // Parsear el valor formateado a número
        const numValor = parseNumberInput(valor);
        
        setVariacionesDigitadas(prev => 
            prev.map(v => {
                if (v.mes === mes) {
                    const updated = { ...v, [campo]: numValor };
                    
                    // Calcular variaciones automáticamente
                    if (tableroData) {
                        const datosMes = tableroData.detalle_por_meses?.find(m => m.mes === mes);
                        if (datosMes) {
                            // Calcular variación de toneladas
                            if (datosMes.total_toneladas > 0) {
                                updated.var_ton_pct = ((updated.est_ton - datosMes.total_toneladas) / datosMes.total_toneladas) * 100;
                            } else {
                                updated.var_ton_pct = 0;
                            }
                            
                            // Calcular variación de cuota de fomento
                            if (datosMes.total_cuota_fomento > 0) {
                                updated.var_pct = ((updated.est_cuota - datosMes.total_cuota_fomento) / datosMes.total_cuota_fomento) * 100;
                                updated.var_abs = updated.est_cuota - datosMes.total_cuota_fomento;
                            } else {
                                updated.var_pct = 0;
                                updated.var_abs = updated.est_cuota;
                            }
                        }
                    }
                    
                    return updated;
                }
                return v;
            })
        );
    };

    // Handler para validar switches
    const handleToggleChange = (tipo: 'calcular' | 'digitar', valor: boolean) => {
        if (tipo === 'calcular' && valor && digitarVariacion) {
            setShowErrorAlert(true);
            return;
        }
        if (tipo === 'digitar' && valor && toggleEnabled) {
            setShowErrorAlert(true);
            return;
        }
        
        if (tipo === 'calcular') {
            setToggleEnabled(valor);
        } else {
            setDigitarVariacion(valor);
        }
    };

    // Función para obtener totales de variación
    const getTotalesVariacion = useMemo(() => {
        // Si el usuario digitó estimados, calcula con TOTales (no sumes % mensuales)
        if (digitarVariacion && variacionesDigitadas.length > 0 && tableroData?.detalle_por_meses) {
          const regTonTotal = tableroData.detalle_por_meses.reduce((s, m) => s + (m.total_toneladas || 0), 0);
          const regCuotaTotal = tableroData.detalle_por_meses.reduce((s, m) => s + (m.total_cuota_fomento || 0), 0);
      
          const estTonTotal = variacionesDigitadas.reduce((s, v) => s + (v.est_ton || 0), 0);
          const estCuotaTotal = variacionesDigitadas.reduce((s, v) => s + (v.est_cuota || 0), 0);
      
          const deltaTon = estTonTotal - regTonTotal;
          const deltaCuota = estCuotaTotal - regCuotaTotal;
      
          return {
            total_porcentaje_ton_variacion: regTonTotal ? (deltaTon / regTonTotal) * 100 : 0,
            total_cuota_variacion: deltaCuota,
            total_porcentaje_cuota_variacion: regCuotaTotal ? (deltaCuota / regCuotaTotal) * 100 : 0,
          };
        }
      
        // Si NO se digitan, usa los totales del API (tu lógica estaba bien aquí)
        const tTonP1 = tableroData?.total_toneladas_periodo_1 ?? 0;
        const tCuotaP1 = tableroData?.total_cuota_periodo_1 ?? 0;
      
        return {
          total_porcentaje_ton_variacion:
            tTonP1 > 0 ? ((tableroData?.total_toneladas_variacion ?? 0) / tTonP1) * 100 : 0,
          total_cuota_variacion: tableroData?.total_cuota_variacion ?? 0,
          total_porcentaje_cuota_variacion:
            tCuotaP1 > 0 ? ((tableroData?.total_cuota_variacion ?? 0) / tCuotaP1) * 100 : 0,
        };
      }, [digitarVariacion, variacionesDigitadas, tableroData]);
      
    
    // Funcionalidad: exportar todo a PPTX (cada contenedor => 1 slide)
    // Funcionalidad: exportar todo a PPTX (cada contenedor => 1 slide)
const handleDownloadPPT = async () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
  
    const titleColor = '562707';
    const padX = 1.5;        // margen izquierdo
    const contentY = 1.5;    // inicio contenido Y
  
    // Paleta sincronizada con los componentes actuales
    const colors = {
      regTon: '#407c24',       // Producción Registrada (ton)
      estTon: '#ff8c04',       // Producción Estimada (ton)
      cfRegistrada: '#1c5898', // Cuota Registrada
      cfEstimada: '#fbbf24',   // Cuota Estimada
      variacionTon: '#16a34a', // % Variación Ton
      variacionCuota: '#1e90ff'// % Variación Cuota
    };
  
    // Utilitario p/ logo
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
  
    // -------------------------
    // SLIDE 1: Tabla consolidada
    // -------------------------
    try {
      const slide1 = pptx.addSlide();
  
      slide1.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
      slide1.addText('Tabla Consolidada (Estimado vs Registrado)', {
        x: 2.2, y: 0.3, w: 7.4, h: 0.6, fontSize: 20, bold: true, color: titleColor, align: 'center'
      });
  
      const headers = [
        'Mes',
        'Toneladas (Reg.)',
        'Cuota Fomento (Reg.)',
        'Est Ton',
        'Est Cuota',
        'Var Ton %',
        'Var Abs',
        'Var %'
      ];
  
      const rows = (datosConsolidado as any[]).map((r) => [
        r.mes ?? '',
        r.total_toneladas ?? '',
        r.total_cuota_fomento ?? '',
        r.est_ton ?? '',
        r.est_cuota ?? '',
        r.var_ton_pct ?? '',
        r.var_abs ?? '',
        r.var_pct ?? ''
      ]);
  
      slide1.addTable([headers, ...rows], {
        x: padX, y: 1.5, w: 10, fontSize: 9,
        border: { type: 'solid', color: '000000', pt: 1 }
      });
    } catch {}
  
    // ----------------------------------------------
    // SLIDE 2: Barras multiserie (Ton) Reg vs Est
    // ----------------------------------------------
    try {
      const slide2 = pptx.addSlide();
      slide2.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
      slide2.addText('Producción de Cacao: Registrada vs Estimada (Toneladas)', {
        x: 1.6, y: 0.3, w: 8.8, h: 0.6, fontSize: 20, bold: true, color: titleColor, align: 'center'
      });
  
      // Categorías y datos como en MultiSeriesComparisonChart
      let categorias: string[] = [];
      let datosRegistrados: number[] = [];
      let datosEstimados: number[] = [];
  
      if (tableroData?.detalle_por_meses) {
        const ordenMeses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
        const mesesDisponibles = tableroData.detalle_por_meses.map(m => m.mes);
        categorias = ordenMeses.filter(m => mesesDisponibles.includes(m));
  
        categorias.forEach(mes => {
          const datosMes = tableroData.detalle_por_meses!.find(m => m.mes === mes);
          datosRegistrados.push(datosMes?.total_toneladas || 0);
  
          if (digitarVariacion) {
            const v = variacionesDigitadas.find(x => x.mes === mes);
            datosEstimados.push(v?.est_ton || 0);
          } else {
            datosEstimados.push(0);
          }
        });
      } else {
        categorias = ['ENERO', 'FEBRERO', 'MARZO'];
        datosRegistrados = [0, 0, 0];
        datosEstimados = [0, 0, 0];
      }
  
      slide2.addChart(
        pptx.ChartType.bar,
        [
          { name: 'Producción Registrada', labels: categorias, values: datosRegistrados, color: colors.regTon },
          { name: 'Producción Estimada',  labels: categorias, values: datosEstimados, color: colors.estTon  }
        ],
        {
          x: padX, y: contentY, w: 11, h: 6,
          legendPos: 'b',
          barGrouping: 'clustered',
          chartColors: [colors.regTon, colors.estTon]
        }
      );
    } catch {}
  
    // ------------------------------------------------------------
    // SLIDE 3: Barras horizontales (Cuota Fomento) Reg vs Est
    // ------------------------------------------------------------
    try {
      const slide3 = pptx.addSlide();
      slide3.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
      slide3.addText('Cuota de Fomento: Registrada vs Estimada', {
        x: 2.2, y: 0.3, w: 7.4, h: 0.6, fontSize: 20, bold: true, color: titleColor, align: 'center'
      });
  
      let meses: string[] = [];
      let cuotaReg: number[] = [];
      let cuotaEst: number[] = [];
  
      if (tableroData?.detalle_por_meses) {
        const ordenDesc = ['DICIEMBRE','NOVIEMBRE','OCTUBRE','SEPTIEMBRE','AGOSTO','JULIO','JUNIO','MAYO','ABRIL','MARZO','FEBRERO','ENERO'];
        const mesesDisponibles = tableroData.detalle_por_meses.map(m => m.mes);
        meses = ordenDesc.filter(m => mesesDisponibles.includes(m));
  
        meses.forEach(mes => {
          const d = tableroData.detalle_por_meses!.find(x => x.mes === mes);
          cuotaReg.push(d?.total_cuota_fomento || 0);
  
          if (digitarVariacion) {
            const v = variacionesDigitadas.find(x => x.mes === mes);
            cuotaEst.push(v?.est_cuota || 0);
          } else {
            cuotaEst.push(0);
          }
        });
      } else {
        meses = ['Dic','Nov','Oct'];
        cuotaReg = [0,0,0];
        cuotaEst = [0,0,0];
      }
  
      slide3.addChart(
        pptx.ChartType.bar,
        [
          { name: 'Cuota Registrada', labels: meses, values: cuotaReg, color: colors.cfRegistrada },
          { name: 'Cuota Estimada',   labels: meses, values: cuotaEst, color: colors.cfEstimada  }
        ],
        {
          x: padX, y: contentY, w: 11, h: 3.8,
          barGrouping: 'clustered',
          barDir: 'bar',          // horizontal
          legendPos: 'b',
          chartColors: [colors.cfRegistrada, colors.cfEstimada]
        }
      );
    } catch {}
  

    // ------------------------------------------------------------------
    // SLIDE 5: Líneas de variación por meses (Ton% y Cuota%)
    // ------------------------------------------------------------------
    try {
      const slide5 = pptx.addSlide();
      slide5.addImage({ data: logoBase64, x: 0.1, y: 0.1, w: 1.5, h: 0.8 });
      slide5.addText('Variación de Producción por Meses', {
        x: 2.2, y: 0.3, w: 7.4, h: 0.6, fontSize: 20, bold: true, color: titleColor, align: 'center'
      });
  
      let mesesLine: string[] = [];
      let datosTonPct: number[] = [];
      let datosCuotaPct: number[] = [];
  
      if (tableroData) {
        if (digitarVariacion && variacionesDigitadas.length > 0) {
          mesesLine = variacionesDigitadas.map(v => v.mes.slice(0, 3));
          datosTonPct = variacionesDigitadas.map(v => v.var_ton_pct);
          datosCuotaPct = variacionesDigitadas.map(v => v.var_pct);
        } else if (tableroData.detalle_por_meses) {
          mesesLine = tableroData.detalle_por_meses.map(m => m.mes.slice(0, 3));
          datosTonPct = new Array(mesesLine.length).fill(0);
          datosCuotaPct = new Array(mesesLine.length).fill(0);
        } else {
          mesesLine = ['Ene','Feb','Mar'];
          datosTonPct = [0,0,0];
          datosCuotaPct = [0,0,0];
        }
      }
  
      slide5.addChart(
        pptx.ChartType.line,
        [
          { name: 'Variación Toneladas',      labels: mesesLine, values: datosTonPct,   color: colors.variacionTon   },
          { name: 'Variación Cuota Fomento',  labels: mesesLine, values: datosCuotaPct, color: colors.variacionCuota }
        ],
        {
          x: padX, y: contentY, w: 9.2, h: 3.8,
          legendPos: 'b',
          showValue: true,
          chartColors: [colors.variacionTon, colors.variacionCuota],
          dataLabelFormatCode: '0.0"%"'
        }
      );
    } catch {}
  
    const safeInicio = fechaInicio || 'sin_fecha';
    const safeFin = fechaFinal || 'sin_fecha';
    const fileName = `Comparativo_Cacao_${safeInicio}_a_${safeFin}.pptx`;
    await pptx.writeFile({ fileName });
  };
  

    // Gráfica multiserie con focus y datos de prueba (contenedor 2)
    const MultiSeriesComparisonChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current) return;
            chartInstance.current = echarts.init(chartRef.current);

            // Usar datos reales del API si están disponibles
            let categorias: string[] = [];
            let datosRegistrados: number[] = [];
            let datosEstimados: number[] = [];

            if (tableroData && tableroData.detalle_por_meses) {
                // Ordenar meses cronológicamente
                const ordenMeses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                const mesesDisponibles = tableroData.detalle_por_meses.map(m => m.mes);
                categorias = ordenMeses.filter(mes => mesesDisponibles.includes(mes));
                
                // Mapear datos por mes
                categorias.forEach(mes => {
                    const datosMes = tableroData.detalle_por_meses?.find(m => m.mes === mes);
                    datosRegistrados.push(datosMes?.total_toneladas || 0);
                    
                    // Si digitar variación está activo, usar datos estimados digitados
                    if (digitarVariacion) {
                        const variacionDigitada = variacionesDigitadas.find(v => v.mes === mes);
                        datosEstimados.push(variacionDigitada?.est_ton || 0);
                    } else {
                        // Sin digitar variación, no mostrar datos estimados
                        datosEstimados.push(0);
                    }
                });
            } else {
                // Mostrar gráfica vacía cuando no hay datos
                categorias = ['ENERO', 'FEBRERO', 'MARZO'];
                datosRegistrados = [0, 0, 0];
                datosEstimados = [0, 0, 0];
            }

            const maxVal = Math.max(...datosRegistrados, ...datosEstimados);
            // Establecer un mínimo para que la gráfica sea visible incluso cuando esté vacía
            const valAxisMax = maxVal > 0 ? Math.ceil(maxVal * 1.2) : 100;

            const labelStyle = {
                show: true,
                position: 'top' as const,
                color: isDarkMode ? '#f3f4f6' : '#374151',
                fontSize: 12,
                fontWeight: 'bold' as const,
                formatter: ({ value }: any) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))
            };

            const seriesData = [
                { 
                    name: 'Producción Registrada', 
                    type: 'bar', 
                    data: datosRegistrados, 
                    itemStyle: { color: '#407c24', borderRadius: [4,4,0,0] }, 
                    emphasis: { focus: 'series' }, 
                    label: labelStyle,
                    barWidth: '30%'
                }
            ];

            // Si digitar variación está activo, agregar serie de estimados
            if (digitarVariacion) {
                seriesData.push({
                    name: 'Producción Estimada', 
                    type: 'bar', 
                    data: datosEstimados, 
                    itemStyle: { color: '#ff8c04', borderRadius: [4,4,0,0] }, 
                    emphasis: { focus: 'series' }, 
                    label: labelStyle,
                    barWidth: '30%'
                });
            }

            const options: echarts.EChartsCoreOption = {
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                grid: { top: 60, left: 80, right: 40, bottom: 80 },
                title: { 
                    text: digitarVariacion ? 'PRODUCCION DE CACAO REGISTRADA VS ESTIMADA' : 'PRODUCCION DE CACAO REGISTRADA POR MESES', 
                    left: 'center', 
                    top: 10, 
                    textStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#562707', 
                        fontSize: 16, 
                        fontWeight: 'bold' 
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
                    valueFormatter: (v: any) => `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(Number(v)))} Toneladas`
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
                            name: 'produccion_cacao_comparativo',
                            pixelRatio: 2
                        }
                    }
                },
                legend: { 
                    data: digitarVariacion ? ['Producción Registrada', 'Producción Estimada'] : ['Producción Registrada'], 
                    bottom: 6, 
                    textStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#374151' 
                    } 
                },
                xAxis: [{ 
                    type: 'category', 
                    data: categorias, 
                    axisTick: { show: false },
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                        color: isDarkMode ? '#f3f4f6' : '#374151', 
                        fontSize: 12, 
                        fontWeight: 600 
                    } 
                }],
                yAxis: [{ 
                    type: 'value', 
                    max: valAxisMax,
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                        color: isDarkMode ? '#f3f4f6' : '#6b7280', 
                        fontSize: 10,
                        formatter: (value: number) => `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))}`
                    }, 
                    splitLine: { 
                        lineStyle: { 
                            color: isDarkMode ? '#ffffff20' : '#f3f4f6' 
                        } 
                    },
                    name: 'Toneladas',
                    nameLocation: 'middle',
                    nameGap: 50,
                    nameTextStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#374151', 
                        fontSize: 12 
                    }
                }],
                series: seriesData
            };

            chartInstance.current.setOption(options);

            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                chartInstance.current?.dispose();
            };
        }, [tableroData, variacionesDigitadas, digitarVariacion, isDarkMode]);
                 return (
             <div className="w-full">
        
                 <div className="h-[280px] sm:h-[350px] lg:h-[600px]">
                     <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                 </div>
             </div>
         );
    };

    // Gráfica horizontal apilada para contenedor 3 (datos de prueba)
    const StackedHorizontalChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            if (!chartRef.current) return;
            chartInstance.current = echarts.init(chartRef.current);

            // Usar datos reales del API si están disponibles
            let meses: string[] = [];
            let datosRegistrados: number[] = [];
            let datosEstimados: number[] = [];

            if (tableroData && tableroData.detalle_por_meses) {
                // Ordenar meses de forma descendente (como en la imagen)
                const ordenMeses = ['DICIEMBRE', 'NOVIEMBRE', 'OCTUBRE', 'SEPTIEMBRE', 'AGOSTO', 'JULIO', 'JUNIO', 'MAYO', 'ABRIL', 'MARZO', 'FEBRERO', 'ENERO'];
                const mesesDisponibles = tableroData.detalle_por_meses.map(m => m.mes);
                meses = ordenMeses.filter(mes => mesesDisponibles.includes(mes));

                // Mapear datos por mes
                meses.forEach(mes => {
                    const datosMes = tableroData.detalle_por_meses?.find(m => m.mes === mes);
                    datosRegistrados.push(datosMes?.total_cuota_fomento || 0);
                    
                    // Si digitar variación está activo, usar datos estimados digitados
                    if (digitarVariacion) {
                        const variacionDigitada = variacionesDigitadas.find(v => v.mes === mes);
                        datosEstimados.push(variacionDigitada?.est_cuota || 0);
                    } else {
                        // Sin digitar variación, no mostrar datos estimados
                        datosEstimados.push(0);
                    }
                });
            } else {
                // Mostrar gráfica vacía cuando no hay datos
                meses = ['Dic','Nov','Oct','Sep','Ago','Jul','Jun','May','Abr','Mar','Feb','Ene'];
                datosRegistrados = [0,0,0,0,0,0,0,0,0,0,0,0];
                datosEstimados = [0,0,0,0,0,0,0,0,0,0,0,0];
            }

            const formatterMoney = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));

            const seriesData = [
                { 
                    name: 'CUOTA DE FOMENTO REGISTRADA', 
                    type: 'bar', 
                    data: datosRegistrados, 
                    itemStyle: { color: '#1c5898' }, 
                    barWidth: '30%',
                    label: { 
                        show: true, 
                        position: 'inside', 
                        formatter: ({ value }: any) => value > 0 ? formatterMoney(Math.round(Number(value))) : '',
                        color: isDarkMode ? '#f3f4f6' : '#000',
                        fontSize: 8,
                        fontWeight: 'bold'
                    } 
                }
            ];

            // Si digitar variación está activo, agregar serie de estimados
            if (digitarVariacion) {
                seriesData.push({
                    name: 'CUOTA DE FOMENTO ESTIMADA', 
                    type: 'bar', 
                    data: datosEstimados, 
                    itemStyle: { color: '#fbbf24' }, 
                    barWidth: '30%',
                    label: { 
                        show: true, 
                        position: 'inside', 
                        formatter: ({ value }: any) => value > 0 ? formatterMoney(Math.round(Number(value))) : '',
                        color: isDarkMode ? '#f3f4f6' : '#000',
                        fontSize: 8,
                        fontWeight: 'bold'
                    } 
                });
            }

            const options: echarts.EChartsCoreOption = {
                backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                grid: { top: 60, left: 80, right: 30, bottom: 60 },
                title: { 
                    text: digitarVariacion ? 'CUOTA DE FOMENTO REGISTRADA VS ESTIMADA' : 'CUOTA DE FOMENTO REGISTRADA POR MESES', 
                    left: 'center', 
                    top: 10, 
                    textStyle: { 
                        color: isDarkMode ? '#f3f4f6' : '#562707', 
                        fontSize: 14, 
                        fontWeight: 'bold' 
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
                    valueFormatter: (v: any) => formatterMoney(Math.round(Number(v))) 
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
                            name: 'cuota_fomento_comparativo',
                            pixelRatio: 2
                        }
                    }
                },
                legend: { 
                    data: digitarVariacion ? ['CUOTA DE FOMENTO REGISTRADA', 'CUOTA DE FOMENTO ESTIMADA'] : ['CUOTA DE FOMENTO REGISTRADA'], 
                    bottom: 6,
                    textStyle: {
                        color: isDarkMode ? '#f3f4f6' : '#374151'
                    }
                },
                xAxis: [{ 
                    type: 'value',
                    max: (value: any) => {
                        // Establecer un mínimo para que la gráfica sea visible incluso cuando esté vacía
                        return value.max > 0 ? value.max : 1000000000;
                    },
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                        formatter: (v: number) => {
                            if (v >= 1000000000) {
                                return `$${Math.round(v / 1000000000)}B`;
                            } else if (v >= 1000000) {
                                return `$${Math.round(v / 1000000)}M`;
                            }
                            return formatterMoney(v);
                        },
                        color: isDarkMode ? '#f3f4f6' : '#6b7280',
                        fontSize: 9
                    }, 
                    splitLine: { 
                        lineStyle: { 
                            color: isDarkMode ? '#ffffff20' : '#e5e7eb' 
                        } 
                    }
                }],
                yAxis: [{ 
                    type: 'category', 
                    data: meses, 
                    axisTick: { show: false },
                    axisLine: {
                        lineStyle: { color: isDarkMode ? '#ffffff40' : '#e5e7eb' }
                    },
                    axisLabel: { 
                        color: isDarkMode ? '#f3f4f6' : '#374151', 
                        fontSize: 11 
                    } 
                }],
                series: seriesData
            };

            chartInstance.current.setOption(options);
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                chartInstance.current?.dispose();
            };
        }, [tableroData, variacionesDigitadas, digitarVariacion, isDarkMode]); // Depende de tableroData y variaciones para mostrar datos registrados y estimados

                 return (
             <div className="w-full">
       
                 <div className="h-[380px] sm:h-[420px] lg:h-[600px]">
                     <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
                 </div>
             </div>
         );
    };

    // Datos de prueba para la tabla tipo "Consolidado por Partidas"
    // const [paginaTablaPartidas, setPaginaTablaPartidas] = useState<number>(1);
    const [paginaConsolidado, setPaginaConsolidado] = useState<number>(1);


    // Tabla Consolidada (contenedor 1) - estructura similar a la imagen
    const formatNumber = (v: number, digits = 0) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.round(v || 0));
    const formatCurrency = (v: number, digits = 0) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.round(v || 0));
    const formatPercent = (v: number, digits = 0) => `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.round(v || 0))}%`;

    // Columnas de la tabla - mostrar columnas adicionales solo si digitar variación está activo
    const headerColumnsConsolidado = useMemo(() => {
        const baseColumns = [
            { key: 'mes', label: 'Mes' },
            {
                key: 'periodo_registrado',
                label: 'PERIODO REGISTRADO',
                subColumns: [
                    { key: 'total_toneladas', label: 'Toneladas', render: (v: number) => formatNumber(v) },
                    { key: 'total_cuota_fomento', label: 'Cuota de Fomento', render: (v: number) => formatCurrency(v) }
                ]
            }
        ];

        // Si digitar variación está activo, agregar columnas adicionales
        if (digitarVariacion) {
            baseColumns.push(
                {
                    key: 'periodo_estimado',
                    label: 'PERIODO ESTIMADO',
                    subColumns: [
                        { 
                            key: 'est_ton', 
                            label: 'Toneladas', 
                            render: (v: number, row?: any): any => {
                                if (row && row.mes !== 'TOTALES') {
                                    const displayValue = v === 0 ? '' : formatNumberInput(v.toString());
                                    return (
                                        <input
                                            type="text"
                                            className={`w-full text-right px-2 py-1 border rounded ${isDarkMode ? 'bg-[#260f00] text-white border-white/30 focus:border-[rgb(var(--green))]' : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'}`}
                                            value={displayValue}
                                            placeholder="0"
                                            onChange={e => {
                                                const rawValue = e.target.value;
                                                const formattedValue = formatNumberInput(rawValue);
                                                // Actualizar el valor del input inmediatamente
                                                e.target.value = formattedValue;
                                                handleEstimadoChange(row.mes, 'est_ton', formattedValue);
                                            }}
                                            onBlur={e => {
                                                // Asegurar formateo completo al salir del campo
                                                const formattedValue = formatNumberInput(e.target.value);
                                                e.target.value = formattedValue;
                                            }}
                                        />
                                    );
                                }
                                return formatNumber(v);
                            }
                        },
                        { 
                            key: 'est_cuota', 
                            label: 'Cuota de Fomento', 
                            render: (v: number, row?: any): any => {
                                if (row && row.mes !== 'TOTALES') {
                                    const displayValue = v === 0 ? '' : formatNumberInput(v.toString());
                                    return (
                                        <input
                                            type="text"
                                            className={`w-full text-right px-2 py-1 border rounded ${isDarkMode ? 'bg-[#260f00] text-white border-white/30 focus:border-[rgb(var(--green))]' : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'}`}
                                            value={displayValue}
                                            placeholder="0"
                                            onChange={e => {
                                                const rawValue = e.target.value;
                                                const formattedValue = formatNumberInput(rawValue);
                                                // Actualizar el valor del input inmediatamente
                                                e.target.value = formattedValue;
                                                handleEstimadoChange(row.mes, 'est_cuota', formattedValue);
                                            }}
                                            onBlur={e => {
                                                // Asegurar formateo completo al salir del campo
                                                const formattedValue = formatNumberInput(e.target.value);
                                                e.target.value = formattedValue;
                                            }}
                                        />
                                    );
                                }
                                return formatCurrency(v);
                            }
                        }
                    ]
                },
                {
                    key: 'variacion',
                    label: 'VARIACIÓN',
                    subColumns: [
                        {
                            key: 'var_ton_pct',
                            label: 'Toneladas %',
                            render: (v: number) => formatPercent(v)
                        },
                        {
                            key: 'var_abs',
                            label: 'Absoluta',
                            render: (v: number) => formatCurrency(v)
                        },
                        {
                            key: 'var_pct',
                            label: 'Porcentual %',
                            render: (v: number) => formatPercent(v)
                        }
                    ]
                }
            );
        }

        return baseColumns;
    }, [digitarVariacion, isDarkMode]);

    const datosConsolidado = useMemo(() => {
        if (!tableroData) return [];

        // Crear un orden fijo de meses para mantener consistencia
        const ordenMeses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        
        // Obtener los meses disponibles en el orden correcto
        const mesesDisponibles = tableroData.detalle_por_meses?.map(m => m.mes) || [];
        const mesesOrdenados = ordenMeses.filter(mes => mesesDisponibles.includes(mes));

        // Crear las filas manteniendo el orden fijo
        const rows = mesesOrdenados.map((mes, index) => {
            const mesData = tableroData.detalle_por_meses?.find(m => m.mes === mes);
            const baseRow = {
                id: `mes-${index}`, // Key estable para evitar reorganización
                mes: mes,
                total_toneladas: mesData?.total_toneladas || 0,
                total_cuota_fomento: mesData?.total_cuota_fomento || 0
            };

            // Si digitar variación está activo, agregar campos adicionales
            if (digitarVariacion) {
                // Buscar variaciones digitadas para este mes
                const variacionDigitada = variacionesDigitadas.find(v => v.mes === mes);
                
                return {
                    ...baseRow,
                    est_ton: variacionDigitada?.est_ton || 0,
                    est_cuota: variacionDigitada?.est_cuota || 0,
                    var_ton_pct: variacionDigitada?.var_ton_pct || 0,
                    var_abs: variacionDigitada?.var_abs || 0,
                    var_pct: variacionDigitada?.var_pct || 0
                };
            }

            return baseRow;
        });

        // Agregar fila de totales al final
        if (tableroData.total_toneladas !== undefined || tableroData.total_cuota_fomento !== undefined) {
            const totales = {
                id: 'totales', // Key estable para totales
                mes: 'TOTALES',
                total_toneladas: tableroData.total_toneladas || 0,
                total_cuota_fomento: tableroData.total_cuota_fomento || 0
            };

            // Si digitar variación está activo, agregar totales de estimado y variación
            if (digitarVariacion) {
                const totalesVariacion = getTotalesVariacion;
                const totalEstTon = rows.reduce((sum, row) => sum + ((row as any).est_ton || 0), 0);
                const totalEstCuota = rows.reduce((sum, row) => sum + ((row as any).est_cuota || 0), 0);

                Object.assign(totales, {
                    est_ton: totalEstTon,
                    est_cuota: totalEstCuota,
                    var_ton_pct: totalesVariacion.total_porcentaje_ton_variacion,
                    var_abs: totalesVariacion.total_cuota_variacion,
                    var_pct: totalesVariacion.total_porcentaje_cuota_variacion
                });
            }

            rows.push(totales);
        }

        return rows;
    }, [tableroData, digitarVariacion, variacionesDigitadas, getTotalesVariacion]);

    // Prevenir renderizado hasta que el componente esté montado
    if (!mounted) return null;

    // Contenedor 5: línea simple depurada - revisión completa
    const SimpleLineChart: React.FC = () => {
        const chartRef = React.useRef<HTMLDivElement>(null);
        const chartInstance = React.useRef<echarts.ECharts | null>(null);

        React.useEffect(() => {
            
            if (!chartRef.current) {
                console.error('chartRef.current es null');
                return;
            }

            try {
                // Destruir instancia previa si existe
                if (chartInstance.current) {
                    chartInstance.current.dispose();
                }

                chartInstance.current = echarts.init(chartRef.current);

                // Usar datos reales del API si están disponibles
                let meses: string[] = [];
                let datos1: number[] = [];
                let datos2: number[] = [];

                if (tableroData) {
                    if (digitarVariacion && variacionesDigitadas.length > 0) {
                        // Usar datos calculados de las variaciones digitadas
                        meses = variacionesDigitadas.map(v => v.mes.slice(0, 3));
                        datos1 = variacionesDigitadas.map(v => v.var_ton_pct);
                        datos2 = variacionesDigitadas.map(v => v.var_pct);
                    } else {
                        // Sin variaciones, mostrar datos vacíos
                        meses = tableroData.detalle_por_meses?.map(m => m.mes.slice(0, 3)) || [];
                        datos1 = new Array(meses.length).fill(0);
                        datos2 = new Array(meses.length).fill(0);
                    }
                } else {
                    // Mostrar gráfica vacía cuando no hay datos
                    meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    datos1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    datos2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                }


                                 // Calcular el rango dinámico del eje Y basado en los datos
                 const maxValor = Math.max(...datos1, ...datos2);
                 const minValor = Math.min(...datos1, ...datos2);
                 
                 // Establecer límites del eje Y con un margen del 20%
                 const yAxisMax = maxValor > 0 ? Math.ceil(maxValor * 1.2) : 100;
                 const yAxisMin = minValor < 0 ? Math.floor(minValor * 1.2) : 0;
                 
                 const option = {
                     backgroundColor: isDarkMode ? '#260f00' : '#ffffff',
                     animation: false, 
                     grid: {
                         top: 30,
                         left: 60,
                         right: 30,
                         bottom: 100,
                         containLabel: true
                     },
                     tooltip: {
                         trigger: 'axis',
                         backgroundColor: isDarkMode ? 'rgba(38, 15, 0, 0.95)' : '#fff',
                         borderColor: isDarkMode ? '#ffffff40' : '#ccc',
                         textStyle: { 
                             color: isDarkMode ? '#f3f4f6' : '#333' 
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
                                 name: 'variacion_produccion_lineas',
                                 pixelRatio: 2
                             }
                         }
                     },
                     legend: {
                         data: ['Variación Toneladas', 'Variación Cuota Fomento'],
                         bottom: 25,
                         textStyle: { 
                             color: isDarkMode ? '#f3f4f6' : '#333' 
                         }
                     },
                     xAxis: {
                         type: 'category',
                         data: meses,
                         boundaryGap: false,
                         axisLine: { 
                             lineStyle: { 
                                 color: isDarkMode ? '#ffffff40' : '#666' 
                             } 
                         },
                         axisLabel: { 
                             color: isDarkMode ? '#f3f4f6' : '#666' 
                         }
                     },
                     yAxis: {
                         type: 'value',
                         min: yAxisMin,
                         max: yAxisMax,
                         axisLine: { 
                             lineStyle: { 
                                 color: isDarkMode ? '#ffffff40' : '#666' 
                             } 
                         },
                         axisLabel: {
                             color: isDarkMode ? '#f3f4f6' : '#666',
                             formatter: '{value}%'
                         },
                         splitLine: {
                             lineStyle: { 
                                 color: isDarkMode ? '#ffffff20' : '#eee' 
                             }
                         }
                     },
                    series: [
                        {
                            name: 'Variación Toneladas',
                            type: 'line',
                            data: datos1,
                            smooth: true,
                            symbol: 'circle',
                            symbolSize: 6,
                            lineStyle: {
                                color: '#16a34a',
                                width: 2
                            },
                            itemStyle: {
                                color: '#16a34a'
                            }
                        },
                        {
                            name: 'Variación Cuota Fomento',
                            type: 'line',
                            data: datos2,
                            smooth: true,
                            symbol: 'circle',
                            symbolSize: 6,
                            lineStyle: {
                                color: '#1e90ff',
                                width: 2
                            },
                            itemStyle: {
                                color: '#1e90ff'
                            }
                        }
                    ]
                };

                chartInstance.current.setOption(option);

                // Forzar resize después de un pequeño delay
                setTimeout(() => {
                    if (chartInstance.current) {
                        chartInstance.current.resize();
                    }
                }, 100);

            } catch (error) {
                console.error('Error en SimpleLineChart:', error);
            }

            const handleResize = () => {
                if (chartInstance.current) {
                    chartInstance.current.resize();
                }
            };

            window.addEventListener('resize', handleResize);
            
            return () => {
                window.removeEventListener('resize', handleResize);
                if (chartInstance.current) {
                    chartInstance.current.dispose();
                    chartInstance.current = null;
                }
            };
        }, [tableroData, variacionesDigitadas, digitarVariacion, isDarkMode]); // Agregar dependencia para que se actualice cuando cambien los datos

                 return (
             <div className="w-full">
                 <h4 className={`text-center font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                     {digitarVariacion ? 'VARIACIÓN DE PRODUCCIÓN POR MESES (CALCULADA)' : 'VARIACIÓN DE PRODUCCIÓN POR MESES'}
                 </h4>
                 <div 
                     ref={chartRef} 
                     style={{ 
                         width: '100%', 
                         height: '600px'
                     }} 
                 />
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

                    <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 lg:my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    TABLERO DE ESTADISTICA COMPARATIVO DE ESTIMACION VS PRODUCCION DE CACAO
                    </h2>

                    <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR FECHA</h3>

                    {/* Filtros - versión inspirada en la maqueta de la imagen */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4'>
                        
                        <AnimatedInput
                            label='Fecha Inicio'
                            type='date'
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            name='fecha_inicio'
                            required
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label='Fecha Final'
                            type='date'
                            value={fechaFinal}
                            onChange={(e) => setFechaFinal(e.target.value)}
                            name='fecha_final'
                            required
                            darkMode={isDarkMode}
                        />

                    </div>


                    {/* Línea de acciones: switches y select */}
                    <div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
 
                         <div>
                             <ToggleSwitch
                                 checked={digitarVariacion}
                                 onChange={(valor) => handleToggleChange('digitar', valor)}
                                 label='Digitar Variación'
                                 variant='success'
                                 labelPosition='left'
                                 darkMode={isDarkMode}
                             />
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
                            COMPARATIVO PRODUCCION ESTIMADA VS REGISTRADA
                        </h2>
               
                    </div>

                 {/* Valores resultado */}

                 <div className="mb-6">
      
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                         {/* Producción Registrada */}
                         <div className={`rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 PRODUCCION REGISTRADA
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (Toneladas)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                 {tableroData?.total_toneladas ? 
                                     new Intl.NumberFormat('es-CO', { 
                                         minimumFractionDigits: 0, 
                                         maximumFractionDigits: 0 
                                     }).format(Math.round(tableroData.total_toneladas)) : 
                                     '0'
                                 }
                             </div>
                         </div>

                         {/* Cuota de Fomento Registrada */}
                         <div className={`rounded-lg px-4 py-3 shadow-sm text-center ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white border border-gray-300'}`}>
                             <div className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                 CUOTA DE FOMENTO REGISTRADA
                             </div>
                             <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                 (Pesos)
                             </div>
                             <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                 {tableroData?.total_cuota_fomento ? 
                                     new Intl.NumberFormat('es-CO', { 
                                         style: 'currency', 
                                         currency: 'COP', 
                                         minimumFractionDigits: 0, 
                                         maximumFractionDigits: 0 
                                     }).format(tableroData.total_cuota_fomento) : 
                                     '$0'
                                 }
                             </div>
                         </div>
                     </div>
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

                        {/* Contenedor 1: Tabla Consolidada */}
                        <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            {digitarVariacion && (
                                <div className="mb-4">
                                    <h3 className={`text-lg text-center font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Tabla Consolidada - Modo Edición</h3>
                                    <p className={`text-sm text-center mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Puede editar los valores de variación directamente en la tabla. Los cambios se aplican de inmediato.</p>
                                </div>
                            )}
                            <ConsolidatedTable
                                headerColumns={headerColumnsConsolidado as any}
                                data={datosConsolidado as any}
                                currentPage={paginaConsolidado}
                                totalPages={1}
                                onPageChange={setPaginaConsolidado}
                            />
                        </div>

                        {/* Contenedor intermedio (similar al contenedor 1) */}
                        
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="col-span-1 lg:col-span-2">
                                        <MultiSeriesComparisonChart />
                                    </div>
                                </div>
                            </div>
                        

                        {/* Contenedor 3: Gráfica horizontal apilada */}
                        
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <StackedHorizontalChart />
                            </div>
                        

              
                        

                        {/* Contenedor 5: Línea simple (separado) */}
                    
                            <div className={`rounded-2xl sm:rounded-3xl shadow-md p-3 sm:p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                <SimpleLineChart />
                            </div>
                       

                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default ComparativoPeriodo;
  