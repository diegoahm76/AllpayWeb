export interface ConsecutiveConfig {
    id_config_consecutivo: number;
    consecutivo_inicial: number;
    anio_consecutivo: number;
    cantidad_digitos: number;
    prefijo_consecutivo: string;
    consecutivo_actual: number;
    fecha_consecutivo_actual: string;
    fecha_configuracion: string;
    id_persona_configura: number;
}

export interface ConsecutiveConfigResponse {
    success: boolean;
    detail: string;
    data: ConsecutiveConfig[];
} 