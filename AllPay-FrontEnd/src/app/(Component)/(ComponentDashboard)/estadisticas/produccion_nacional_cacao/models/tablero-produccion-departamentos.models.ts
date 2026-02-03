export interface DepartamentoProduccion {
    departamento: string;
    anio_consultado?: number;
    area_total: number;
    area_produccion: number;
    rendimiento_censo: number;
    produccion_ton_censo: number;
    rendimiento_prom_nal: number;
    produccion_kilos: number;
    produccion_ton: number;
}

export interface ParametrosProduccion {
    estimacion: number;
    rendimiento_prom_nal: number;
}

export interface TableroProduccionDepartamentosResponse {
    success: boolean;
    detail: string;
    ano_consultado: number;
    parametros: ParametrosProduccion;
    total_departamentos: number;
    data: DepartamentoProduccion[];
}

export interface ParamsTableroProduccion {
    ano: number;
    estimacion: number;
    rendimiento_prom_nal: number;
}
