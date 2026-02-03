// Interfaces para las tablas de meses
export interface TablaMes {
  mes: string;
  total_toneladas: number;
  total_cuota_fomento: number;
}

export interface TablaMesVariacion {
  mes: string;
  variacion_toneladas: number;
  variacion_cuota_fomento: number;
  porc_variacion_toneladas: number;
  porc_variacion_cuota_fomento: number;
}

// Interface principal para los datos de respuesta (nueva estructura)
export interface TableroControlEstimadosData {
  fecha_inicio: string;
  fecha_fin: string;
  total_toneladas: number;
  total_cuota_fomento: number;
  detalle_por_meses: TablaMes[];
  
  // Campos para compatibilidad con el código existente (se calcularán)
  total_toneladas_periodo_1: number;
  total_cuota_periodo_1: number;
  total_toneladas_periodo_2: number;
  total_cuota_periodo_2: number;
  total_toneladas_variacion: number;
  total_cuota_variacion: number;
  total_porcentaje_ton_variacion: number;
  total_toneladas_periodo_e: number;
  total_cuota_periodo_e: number;
  tabla_meses_periodo_1: TablaMes[];
  tabla_meses_periodo_2: TablaMes[];
  tabla_meses_variacion: TablaMesVariacion[];
  tabla_meses_periodo_e: TablaMes[];
}

// Interface para la respuesta completa del API
export interface TableroControlEstimadosResponse {
  success: boolean;
  detail: string;
  data: TableroControlEstimadosData;
}

// Interface para los parámetros de la petición
export interface TableroControlEstimadosParams {
  fecha_inicio_periodo_1: string;      // YYYY-MM-DD
  fecha_fin_periodo_1: string;         // YYYY-MM-DD
  fecha_inicio_periodo_2: string;      // YYYY-MM-DD
  fecha_fin_periodo_2: string;         // YYYY-MM-DD
  calcular_variacion: boolean;         // true/false
}
