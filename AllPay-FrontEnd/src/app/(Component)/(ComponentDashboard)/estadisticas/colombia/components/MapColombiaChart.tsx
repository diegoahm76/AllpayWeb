'use client';
import React from 'react';
import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, VisualMapComponent, GeoComponent, ToolboxComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, VisualMapComponent, MapChart, CanvasRenderer, GeoComponent, ToolboxComponent,]);

type MapProps = {
  token: string;
  departamentosData: any; // tipa si lo tienes
  municipiosData: any;
  fetchMunicipios: (token: string, params: any) => Promise<void>;
  clearMunicipios: () => void;
  fechaInicio?: string;
  fechaFinal?: string;
  darkMode?: boolean;
};

export type MapColombiaChartHandle = {
  exportPNG: (opts?: { pixelRatio?: number; backgroundColor?: string }) => string | null;
};

const MapColombiaChart = React.forwardRef<MapColombiaChartHandle, MapProps>((
  { token, departamentosData, municipiosData, fetchMunicipios, clearMunicipios, fechaInicio, fechaFinal, darkMode = false },
  ref
) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<echarts.EChartsType | null>(null);

  React.useImperativeHandle(ref, () => ({
    exportPNG: ({ pixelRatio = 3, backgroundColor = '#FFFFFF' } = {}) => {
      if (!chartRef.current) return null;
      try {
        return chartRef.current.getDataURL({
          type: 'png',
          pixelRatio,
          backgroundColor, // 'transparent' si lo quieres sin fondo
        });
      } catch {
        return null;
      }
    },
  }), []);

  
  

  const [deptos, setDeptos] = React.useState<any | null>(null);
  const [munis, setMunis] = React.useState<any | null>(null);

  const [vista, setVista] = React.useState<'colombia' | 'munis'>('colombia');
  const [dptoSel, setDptoSel] = React.useState<{ codigo: string; nombre: string } | null>(null);

  const tokenRef = React.useRef(token);
  React.useEffect(() => { tokenRef.current = token; }, [token]);

  

  // init echarts once
  React.useEffect(() => {
    if (!containerRef.current || chartRef.current) return;
    chartRef.current = echarts.init(containerRef.current);
    const onResize = () => chartRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  // load geojson once
  React.useEffect(() => {
    (async () => {
      try {
        const [g1, g2] = await Promise.all([
          fetch('/geo/colombia-deptos.geojson').then(r => r.json()),
          fetch('/geo/colombia-munis.geojson').then(r => r.json()),
        ]);
        setDeptos(g1); setMunis(g2);
      } catch (e) { console.error('Error cargando GeoJSON:', e); }
    })();
  }, []);

  const PALETA = ['#3471a8', '#f0ad3f', '#a1a981'];
  const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const statsDeptoByCode = React.useMemo<Record<string, number>>(() => {
    if (!departamentosData?.departamentos) return {};
    const stats: Record<string, number> = {};
    departamentosData.departamentos.forEach((d: any) => { stats[d.codigo] = d.total_valor_neto; });
    return stats;
  }, [departamentosData?.departamentos]);

  const statsMuniByCode = React.useMemo<Record<string, number>>(() => {
    if (!municipiosData?.municipios) return {};
    const stats: Record<string, number> = {};
    municipiosData.municipios.forEach((m: any) => { stats[m.codigo] = m.total_valor_neto; });
    return stats;
  }, [municipiosData?.municipios]);

  const renderColombia = React.useCallback(() => {
    if (!deptos || !chartRef.current) return;
    echarts.registerMap('co-deptos', deptos);

    const nombreToCodigo = new Map<string, string>();
    const dataSerie = (deptos.features || []).map((f: any) => {
      const codigo = String(f.properties?.DPTO_CCDGO ?? '');
      const nombre = String(f.properties?.DPTO_CNMBR ?? '');
      nombreToCodigo.set(nombre, codigo);
      return { name: nombre, value: Number(statsDeptoByCode[codigo] ?? 0), dptoCodigo: codigo, dptoNombre: nombre };
    });

    const maxVal = Math.max(1, ...dataSerie.map((d: any) => Number(d.value || 0)));
    const MAINLAND_BOUNDS: [[number, number], [number, number]] = [[-79.5, 13.5], [-66.0, -4.5]];

    chartRef.current.setOption({
      backgroundColor: darkMode ? '#260f00' : '#ffffff',
      title: { 
        text: `Valor Neto por Departamento (${departamentosData?.departamentos?.length || 0})`, 
        left: 'center', 
        top: 8,
        textStyle: { 
          color: darkMode ? '#f3f4f6' : '#562707', 
          fontSize: 16, 
          fontWeight: 'bold' 
        } 
      },
        toolbox: {
          right: 10,
          top: 10,
          feature: {
            saveAsImage: {
              type: 'png',                          // 'png' | 'jpeg'
              name: `Mapa_${vista === 'munis' ? (dptoSel?.nombre ?? 'Depto') : 'Colombia'}`,
              pixelRatio: 3,                        // más nitidez
              backgroundColor: darkMode ? '#260f00' : '#FFFFFF',           // usa 'transparent' si quieres sin fondo
            },
            // otros features opcionales:
            // restore: {},
            // dataView: {},
          },
          iconStyle: { borderColor: darkMode ? '#f3f4f6' : '#374151' },
          emphasis: { iconStyle: { borderColor: darkMode ? '#ffffff' : '#111827' } },
        },
      tooltip: {
        trigger: 'item',
        backgroundColor: darkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: darkMode ? '#ffffff40' : '#ccc',
        textStyle: {
          color: darkMode ? '#f3f4f6' : '#333'
        },
        formatter: (p: any) => {
          const d = departamentosData?.departamentos?.find((x: any) => x.codigo === p.data?.dptoCodigo);
          return d
            ? `<b>${p.name}</b><br/>Valor Bruto: <b>${formatCOP(d.total_valor_bruto)}</b><br/>Valor Neto: <b>${formatCOP(d.total_valor_neto)}</b><br/>Kilos: <b>${new Intl.NumberFormat('es-CO').format(d.total_kilos)} Kg</b><br/>Cuota: <b>${formatCOP(d.total_cuota_fomento)}</b>`
            : `Departamento: <b>${p.name}</b><br/>Valor Neto: <b>${formatCOP(Number(p.value || 0))}</b>`;
        },
      },
      visualMap: { 
        min: 0, 
        max: maxVal, 
        left: 'left', 
        bottom: 20, 
        calculable: true, 
        text: ['Alto','Bajo'],
        textStyle: { 
          color: darkMode ? '#f3f4f6' : '#374151' 
        }, 
        inRange: { color: PALETA }, 
        formatter: (v: number) => `${formatCOP(v)}` 
      },
      series: [{
        type: 'map', map: 'co-deptos', nameProperty: 'DPTO_CNMBR', roam: true,
        left: 0, right: 0, top: 30, bottom: 10, layoutCenter: ['50%','55%'], layoutSize: '125%', aspectScale: 0.85, boundingCoords: MAINLAND_BOUNDS,
        label: { show: false }, itemStyle: { areaColor: '#e5e7eb', borderColor: '#1f4e79', borderWidth: 1.2 },
        emphasis: { itemStyle: { areaColor: 'rgba(255,215,0,0.35)', borderColor: '#f59e0b', borderWidth: 2 }, label: { show: true, color: '#111827', fontWeight: 'bold' } },
        data: dataSerie,
      }],
    } as echarts.EChartsCoreOption, { notMerge: true });

    chartRef.current.off('click');
    chartRef.current.on('click', (p: any) => {
      const codigo = p?.data?.dptoCodigo || nombreToCodigo.get(String(p?.name ?? ''));
      const nombre = p?.data?.dptoNombre || String(p?.name ?? '');
      if (!codigo) return;

      // Cambiar vista y cargar municipios sin perder el estado
      setVista('munis');
      setDptoSel({ codigo, nombre });

      if (tokenRef.current) {
        const params: any = { codigo_departamento: codigo };
        
        // Incluir filtros de fecha si están disponibles
        if (fechaInicio) {
          params.fecha_inicio = fechaInicio;
        }
        if (fechaFinal) {
          params.fecha_fin = fechaFinal;
        }
        
        fetchMunicipios(tokenRef.current, params);
      }
    });
  }, [deptos, statsDeptoByCode, departamentosData?.departamentos, fetchMunicipios, darkMode]);

  const renderMunis = React.useCallback(() => {
    if (!munis || !dptoSel || !chartRef.current) return;

    const subset = {
      type: 'FeatureCollection',
      features: (munis.features || []).filter(
        (f: any) => String(f.properties?.DPTO_CCDGO ?? '') === String(dptoSel.codigo)
      ),
    };
    const mapName = `co-munis-${dptoSel.codigo}`;
    echarts.registerMap(mapName, subset as any);

    const dataSerie = (subset.features || []).map((f: any) => {
      const codMpio = String(f.properties?.MPIO_CCNCT ?? '');
      const nombre  = String(f.properties?.MPIO_CNMBR ?? '');
      return { name: nombre, value: Number(statsMuniByCode[codMpio] ?? 0), mpioCodigo: codMpio };
    });
    const maxVal = Math.max(1, ...dataSerie.map((d: any) => Number(d.value || 0)));

    chartRef.current.setOption({
      backgroundColor: darkMode ? '#260f00' : '#ffffff',
      title: { 
        text: `Municipios de ${dptoSel.nombre} - Valor Neto (${municipiosData?.municipios?.length || 0})`, 
        left: 'center', 
        top: 8,
        textStyle: { 
          color: darkMode ? '#f3f4f6' : '#562707', 
          fontSize: 16, 
          fontWeight: 'bold' 
        } 
      },
        toolbox: {
          right: 10,
          top: 10,
          feature: {
            saveAsImage: {
              type: 'png',                          // 'png' | 'jpeg'
              name: `Mapa_${vista === 'munis' ? (dptoSel?.nombre ?? 'Depto') : 'Colombia'}`,
              pixelRatio: 3,                        // más nitidez
              backgroundColor: darkMode ? '#260f00' : '#FFFFFF',           // usa 'transparent' si quieres sin fondo
            },
            // otros features opcionales:
            // restore: {},
            // dataView: {},
          },
          iconStyle: { borderColor: darkMode ? '#f3f4f6' : '#374151' },
          emphasis: { iconStyle: { borderColor: darkMode ? '#ffffff' : '#111827' } },
        },
      tooltip: {
        trigger: 'item',
        backgroundColor: darkMode ? 'rgba(38, 15, 0, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: darkMode ? '#ffffff40' : '#ccc',
        textStyle: {
          color: darkMode ? '#f3f4f6' : '#333'
        },
        formatter: (p: any) => {
          const m = municipiosData?.municipios?.find((x: any) => x.codigo === p.data?.mpioCodigo);
          return m
            ? `<b>${p.name}</b><br/>Valor Bruto: <b>${formatCOP(m.total_valor_bruto)}</b><br/>Valor Neto: <b>${formatCOP(m.total_valor_neto)}</b><br/>Kilos: <b>${new Intl.NumberFormat('es-CO').format(m.total_kilos)} Kg</b><br/>Cuota: <b>${formatCOP(m.total_cuota_fomento)}</b>`
            : `Municipio: <b>${p.name}</b><br/>Valor Neto: <b>${formatCOP(Number(p.value || 0))}</b>`;
        },
      },
      visualMap: { 
        min: 0, 
        max: maxVal, 
        left: 'left', 
        bottom: 20, 
        calculable: true, 
        text: ['Alto','Bajo'],
        textStyle: { 
          color: darkMode ? '#f3f4f6' : '#374151' 
        }, 
        inRange: { color: PALETA }, 
        formatter: (v: number) => `${formatCOP(v)}` 
      },
      series: [{
        type: 'map', map: mapName, nameProperty: 'MPIO_CNMBR', roam: true,
        left: 0, right: 0, top: 30, bottom: 10, layoutCenter: ['50%','55%'], layoutSize: '125%', aspectScale: 0.85,
        label: { show: false }, itemStyle: { areaColor: '#e5e7eb', borderColor: '#1f4e79', borderWidth: 1.2 },
        emphasis: { itemStyle: { areaColor: 'rgba(255,215,0,0.35)', borderColor: '#f59e0b', borderWidth: 2 }, label: { show: true, color: '#111827', fontWeight: 'bold' } },
        data: dataSerie,
      }],
    } as echarts.EChartsCoreOption, { notMerge: true });

    chartRef.current.off('click'); // si luego quieres click por municipio, lo agregas aquí
  }, [munis, dptoSel, statsMuniByCode, municipiosData?.municipios, darkMode]);

  // decidir qué renderizar
  React.useEffect(() => {
    if (vista === 'colombia') renderColombia();
    else renderMunis();
  }, [vista, renderColombia, renderMunis, municipiosData?.municipios, dptoSel]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div />
        {vista === 'munis' && (
          <button
            onClick={() => { setVista('colombia'); setDptoSel(null); clearMunicipios(); }}
            className={`px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90 ${darkMode ? 'bg-[rgb(var(--green))]' : 'bg-[rgb(var(--green))]'}`}
          >
            ← Volver a Colombia
          </button>
        )}
      </div>

      <div className="h-[280px] sm:h-[350px] lg:h-[800px]">
        {vista === 'munis' && !municipiosData?.municipios ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${darkMode ? 'border-white' : 'border-[rgb(var(--green))]'}`}></div>
              <p className={darkMode ? 'text-white' : 'text-[rgb(var(--green))]'}>Cargando municipios de {dptoSel?.nombre}...</p>
            </div>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        )}
      </div>
    </div>
  );
});

export default React.memo(MapColombiaChart);
