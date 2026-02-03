export interface TablaPosPrincipal {
  pos: string;
  total_toneladas_neto: number;
  total_valor_fob: number;
  porcentaje: number;
}

export interface TablaPosPeriodo {
  pos: string;
  total_toneladas_neto: number;
  total_valor_fob: number;
  porcentaje: number;
}

export interface PeriodoData {
  tabla_periodo: TablaPosPeriodo[];
}

export interface DataPeriodos {
  periodo_1: PeriodoData;
  periodo_2: PeriodoData;
  periodo_3: PeriodoData;
  periodo_4: PeriodoData;
}

export interface TableroControlSicexPosData {
  tabla_principal: TablaPosPrincipal[];
  data_periodos: DataPeriodos;
}

export interface TableroControlSicexPosResponse {
  success: boolean;
  detail: string;
  data: TableroControlSicexPosData;
}

export interface TableroControlSicexPosParams {
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  tipo_cargue?: string; // 'EXP' | 'IMP'
  comparativo_periodos?: string; // 'SI' | 'NO'
} 