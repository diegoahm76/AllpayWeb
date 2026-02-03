export interface ConfiguracionConsecutivoData {
    id_config_consecutivo: number;
    consecutivo_inicial: number;
    anio_consecutivo: number;
    cantidad_digitos: number;
    prefijo_consecutivo: string;
    consecutivo_actual: number;
    fecha_consecutivo_actual: string | null;
    fecha_configuracion: string;
    id_persona_configura: number;
}

export interface ConfiguracionConsecutivoResponse {
    success: boolean;
    detail: string;
    data: ConfiguracionConsecutivoData;
}

export interface ConfiguracionConsecutivoUpdatePayload {
    consecutivo_inicial: number;
    cantidad_digitos: number;
    prefijo_consecutivo: string;
}

export interface ConfiguracionConsecutivoUpdateParams {
    id: number;
    payload: ConfiguracionConsecutivoUpdatePayload;
    token: string;
}
