// Interfaces para el desglose por día
export interface DesglosePorDia {
  fecha: string;
  precio_cierre: number;
  anio: number;
  mes: number;
}

// Interfaces para el desglose por mes
export interface DesglosePorMes {
  anio: number;
  mes: number;
  nombre_mes: string;
  num_datos: number;
  promedio: number;
  maximo: number;
  minimo: number;
  var_abs: number;
  var_porcentual: number;
}

// Interfaces para las métricas clave
export interface MetricasClave {
  maximo_valor: number;
  minimo_valor: number;
  tendencia: string;
}

// Interfaces para el resumen de cada período
export interface ResumenPeriodo {
  total_registros: number;
  total_valor: number;
  promedio_diario: number;
}

// Interfaces para los datos de cada período
export interface DatosPeriodo {
  resumen: ResumenPeriodo;
  desglose_por_dia: DesglosePorDia[];
  desglose_por_mes: DesglosePorMes[];
  metricas_clave: MetricasClave;
}

// Interface para cada período
export interface Periodo {
  fecha_inicio: string;
  fecha_fin: string;
  datos: DatosPeriodo;
}

// Interface para la comparación entre períodos
export interface Comparacion {
  variacion_total: number;
  variacion_porcentual: number;
  tendencia: string;
  analisis: string;
  promedio_periodo_1: number;
  promedio_periodo_2: number;
}

// Interface principal para los datos de respuesta
export interface Tablero8NewYorkData {
  periodo_1: Periodo;
  periodo_2: Periodo;
  comparacion: Comparacion;
}

// Interface para la respuesta completa del API
export interface Tablero8NewYorkResponse {
  success: boolean;
  detail: string;
  data: Tablero8NewYorkData;
}

// Interface para los parámetros de la petición
export interface Tablero8NewYorkParams {
  fecha_inicio_periodo_1: string;      // YYYY-MM-DD
  fecha_fin_periodo_1: string;         // YYYY-MM-DD
  fecha_inicio_periodo_2: string;      // YYYY-MM-DD
  fecha_fin_periodo_2: string;         // YYYY-MM-DD
}
