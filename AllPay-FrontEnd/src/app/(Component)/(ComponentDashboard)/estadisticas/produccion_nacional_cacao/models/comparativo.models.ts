export interface FiltrosComparativo {
    modo: string;
    rango1: {
      fecha_inicio: string;
      fecha_fin: string;
    };
    rango2: {
      fecha_inicio: string;
      fecha_fin: string;
    };
  }
  
  export interface MesComparativo {
    mes: number;
    label: string;
    nal_cop: number;
    usd_ton_nal: number | null;
    usd_ton_ny: number;
    diferencia_pct: number | null;
    trm_promedio: number | null;
  }
  
  export interface TotalesComparativo {
    nal_cop: number;
    usd_ton_nal: number | null;
    usd_ton_ny: number;
    diferencia_pct: number | null;
    trm_promedio: number;
  }
  
  export interface AnioComparativo {
    anio: number;
    meses: MesComparativo[];
    totales: TotalesComparativo;
  }
  
  export interface ComparativoInternacionalResponse {
    success: boolean;
    message: string;
    data: {
      filtros: FiltrosComparativo;
      anio1: AnioComparativo;
      anio2: AnioComparativo;
    };
  }
  
  export interface ParamsComparativo {
    page: number;
    page_size: number;
    fecha_inicio1: string;
    fecha_fin1: string;
    fecha_inicio2: string;
    fecha_fin2: string;
  }