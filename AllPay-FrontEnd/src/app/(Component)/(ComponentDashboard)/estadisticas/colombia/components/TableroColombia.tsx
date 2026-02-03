'use client';

// react
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
// import DynamicTable from '@/presenters/components/ui/DynamicTable';

// Importaciones de echarts con manejo de errores
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, MapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, VisualMapComponent, GeoComponent} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession, signIn } from 'next-auth/react';
import useTiposCargue from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/hooks/useTiposCargue';
import useTableroDepartamentos from '../hooks/useTableroDepartamentos';
import useTableroMunicipios from '../hooks/useTableroMunicipios';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import MapColombiaChart, { MapColombiaChartHandle } from './MapColombiaChart';
import PptxGenJS from 'pptxgenjs';
import { useRef } from 'react';

// Registrar componentes necesarios
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent, VisualMapComponent, BarChart, PieChart, LineChart, MapChart, CanvasRenderer, GeoComponent,  ]);

// Tipo para las variaciones digitadas por el usuario
interface VariacionDigitada {
    mes: string;
    var_ton_pct: number;
    var_abs: number;
    var_pct: number;
}

function TableroColombia() {

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
    //const { data: tableroData, isLoading, error, fetchTableroEstimados, clearData } = useTableroControlEstimados();
    const { isLoading: isLoadingTiposCargue, fetchTiposCargue } = useTiposCargue();
    
    // Hook para datos de departamentos
    const { data: tableroData, isLoading, error, fetchTablero: fetchTableroEstimados } = useTableroDepartamentos();
    
    // Hook para datos de municipios por departamento
    const { data: municipiosData, fetchTablero: fetchMunicipios, clearData: clearMunicipios } = useTableroMunicipios();

    // Estados locales para filtros
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [, setTipoCargueSeleccionado] = useState<string>('EXP');
    //const [toggleEnabled, setToggleEnabled] = useState<boolean>(false);
    const [, setDigitarVariacion] = useState<boolean>(false);
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const mapRef = useRef<MapColombiaChartHandle>(null);
    // Nuevos estados para variaciones digitadas
    const [, setVariacionesDigitadas] = useState<VariacionDigitada[]>([]);
    //const [, setUsarVariacionesDigitadas] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // (sin uso por ahora)

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
      

    const handleDownloadPPT = async () => {
        // 1) Pedimos el PNG del mapa al hijo
        const mapDataUrl = mapRef.current?.exportPNG({ pixelRatio: 3, backgroundColor: '#FFFFFF' });
        if (!mapDataUrl) {
          alert('El mapa todavía no está listo para exportar. Intenta de nuevo en unos segundos.');
          return;
        }
      
        // 2) Logo corporativo
        const logoBase64 = await getBase64FromUrl('/images/corporate/logo.png');
      
        // 3) Crear PPT
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE'; // 10" x 5.625"
      
        const slide = pptx.addSlide();
      
        // Logo (arriba-izquierda)
        slide.addImage({ data: logoBase64, x: 0.2, y: 0.2, w: 1.4, h: 0.8 });
      
        // Título (centrado)
        const rango = fechaInicio && fechaFinal ? ` (${fechaInicio} a ${fechaFinal})` : '';
        slide.addText(`Mapa de Valor Neto por Departamentos${rango}`, {
          x: 1.8, y: 0.25, w: 7.8, h: 0.6,
          fontSize: 20, bold: true, color: '562707', align: 'center',
        });
      
        // Imagen del mapa (ajusta w/h si quieres que ocupe más/menos)
        slide.addImage({
          data: mapDataUrl,
          x: 0.4,
          y: 1.1,
          w: 9.2,
          h: 4.2, // puedes omitir h para mantener proporción automática
        });
      
        const fileName = `Mapa_Cacao_${fechaInicio || 'sin_fecha'}_${fechaFinal || 'sin_fecha'}.pptx`;
        await pptx.writeFile({ fileName });
      };
      

    // Cargar tipos de cargue (una sola vez)
    useEffect(() => {
        if (token && !isLoadingTiposCargue) {
            fetchTiposCargue(token);
        }
    }, [token, fetchTiposCargue, isLoadingTiposCargue]);

    // Cargar datos de departamentos al montar el componente
    useEffect(() => {
        if (token) {
            fetchTableroEstimados(token, {});
        }
    }, [token, fetchTableroEstimados]);

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

    // Handlers para consultar y limpiar
    const handleConsultar = async () => {

        const params = {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFinal,
        };

        // Solo hacer una llamada con los parámetros de fecha
        await fetchTableroEstimados(token, params);
    };

         const handleLimpiar = () => {
         setFechaInicio('');
         setFechaFinal('');
         setTipoCargueSeleccionado('EXP');
         setDigitarVariacion(false);
         setVariacionesDigitadas([]);
         setShowErrorAlert(false);
         
         // También limpiar los datos de departamentos y recargar sin filtros
         if (token) {
            fetchTableroEstimados(token, {});
         }
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
                        TABLERO DE CONTROL PRODUCCIÓN DE CACAO
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
                        <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>
                            MAPA DE CALOR - PRODUCCIÓN DE CACAO POR DEPARTAMENTO
                        </h2>
                        {tableroData && (
                            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Visualización del valor neto de cacao por departamentos de Colombia
                            </p>
                        )}
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
                                <div className="display: flex; justify-content: center; align-items: center;">
                                    {!tableroData ? (
                                        <div className="text-center p-8">
                                            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${isDarkMode ? 'border-white' : 'border-[rgb(var(--brown))]'}`}></div>
                                            <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando datos de departamentos...</p>
                                        </div>
                                    ) : (
                                        <MapColombiaChart
                                            token={token}
                                            ref={mapRef}
                                            departamentosData={tableroData}
                                            municipiosData={municipiosData}
                                            fetchMunicipios={fetchMunicipios}
                                            clearMunicipios={clearMunicipios}
                                            fechaInicio={fechaInicio}
                                            fechaFinal={fechaFinal}
                                            darkMode={isDarkMode}
                                        />
                                    )}
                                </div>
                                
                                                                 {/* Resumen de datos de departamentos */}
                                 {tableroData && tableroData.departamentos && tableroData.departamentos.length > 0 && (
                                     <div className={`mt-4 p-3 sm:p-4 rounded-lg ${isDarkMode ? 'bg-[#3d1a00] border border-white/20' : 'bg-gray-50'}`}>
                                         <h4 className={`text-xs sm:text-sm font-medium mb-3 text-center ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                             Resumen de Producción por Departamentos
                                         </h4>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 text-center">
                                             <div className={`p-2 sm:p-3 rounded-lg shadow-sm ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                                 <p className={`text-lg sm:text-xl lg:text-xl font-bold break-all ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                                     ${new Intl.NumberFormat('es-CO').format(
                                                         tableroData.departamentos.reduce((sum, d) => sum + d.total_valor_bruto, 0)
                                                     )}
                                                 </p>
                                                 <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Valor Bruto</p>
                                             </div>
                                             <div className={`p-2 sm:p-3 rounded-lg shadow-sm ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                                 <p className={`text-lg sm:text-xl lg:text-xl font-bold break-all ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                                     ${new Intl.NumberFormat('es-CO').format(
                                                         tableroData.departamentos.reduce((sum, d) => sum + d.total_valor_neto, 0)
                                                     )}
                                                 </p>
                                                 <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Valor Neto</p>
                                             </div>
                                             <div className={`p-2 sm:p-3 rounded-lg shadow-sm ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                                 <p className={`text-lg sm:text-xl lg:text-xl font-bold break-all ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                                     {new Intl.NumberFormat('es-CO').format(
                                                         tableroData.departamentos.reduce((sum, d) => sum + d.total_kilos, 0)
                                                     )}
                                                 </p>
                                                 <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Kilos</p>
                                             </div>
                                             <div className={`p-2 sm:p-3 rounded-lg shadow-sm ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                                                 <p className={`text-lg sm:text-xl lg:text-xl font-bold break-all ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                                     ${new Intl.NumberFormat('es-CO').format(
                                                         tableroData.departamentos.reduce((sum, d) => sum + d.total_cuota_fomento, 0)
                                                     )}
                                                 </p>
                                                 <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Cuota Fomento</p>
                                             </div>
                                         </div>
                                         
                                     </div>
                                 )}
                            </div>
                        
                    </div>

                </div>
            </div>
        </div>
    );
};
  
export default TableroColombia;
  