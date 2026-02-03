export interface FiltrosSerieNalNy {
  rango1: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  rango2: {
    fecha_inicio: string;
    fecha_fin: string;
  };
}

export interface ValoresMensuales {
  ene: number | null;
  feb: number | null;
  mar: number | null;
  abr: number | null;
  may: number | null;
  jun: number | null;
  jul: number | null;
  ago: number | null;
  sep: number | null;
  oct: number | null;
  nov: number | null;
  dic: number | null;
}

export interface Serie {
  key: string;
  label: string;
  values: ValoresMensuales;
}

export interface KpisNy {
  promedio_1p: number;
  promedio_2p: number;
  maximo: number;
  minimo: number;
  valor_abs: number;
  variacion_pct: number;
}

export interface PromediosNal {
  promedio_1p: number | null;
  promedio_2p: number | null;
}

export interface Kpis {
  ny: KpisNy;
  promedios_nal: PromediosNal;
}

export interface Cards {
  base: string;
  promedio_bolsa_ny: number;
  maximo_ny: number;
  minimo_ny: number;
  valor_abs: number;
  variacion_pct: number;
}

export interface AnotacionLinea {
  series: string;
  value: number | null;
  label: string | null;
  style: string;
  arrow: string;
}

export interface Anotaciones {
  avg_lines: AnotacionLinea[];
  markers: any[];
}

export interface SerieNalNyResponse {
  success: boolean;
  message: string;
  data: {
    filtros: FiltrosSerieNalNy;
    categorias: string[];
    series: Serie[];
    kpis: Kpis;
    cards: Cards;
    anotaciones: Anotaciones;
  };
}

export interface ParamsSerieNalNy {
  fecha_inicio1: string;
  fecha_fin1: string;
  fecha_inicio2: string;
  fecha_fin2: string;
}
