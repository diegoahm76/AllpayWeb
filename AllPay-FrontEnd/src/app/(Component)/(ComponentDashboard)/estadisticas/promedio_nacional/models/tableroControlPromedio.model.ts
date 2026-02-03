export interface MesPeriodo {
    mes: number;
    mes_letras: string;
    precio_promedio: number;
}

export interface VariacionMes {
    mes: number;
    mes_letras: string;
    variacion: number;
    porcentaje: number;
}

export interface TableroControlPromedioData {
    promedio_periodo_1: number;
    promedio_periodo_2: number;
    mes_var_mayor: string;
    mes_var_menor: string;
    incremento_max: number;
    periodo_1: MesPeriodo[];
    periodo_2: MesPeriodo[];
    variacion: VariacionMes[];
}

export interface TableroControlPromedioResponse {
    success: boolean;
    detail?: string; // Opcional ya que la respuesta del API no lo incluye
    data: TableroControlPromedioData;
}

export interface TableroControlPromedioParams {
    fecha_inicio_periodo_1: string; // YYYY-MM-DD - Fecha de inicio del período 1
    fecha_fin_periodo_1: string;    // YYYY-MM-DD - Fecha de fin del período 1
    fecha_inicio_periodo_2: string; // YYYY-MM-DD - Fecha de inicio del período 2
    fecha_fin_periodo_2: string;    // YYYY-MM-DD - Fecha de fin del período 2
}
