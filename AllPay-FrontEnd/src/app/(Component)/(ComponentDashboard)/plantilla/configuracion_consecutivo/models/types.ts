interface ConfiguracionConsecutivoAPI {
    id_config_consecutivo: number;
    cantidad_digitos: number;
    cod_tipo_cobro: string;
    consecutivo_inicial: number;
    anio_consecutivo: number;
    prefijo_consecutivo: string;
    consecutivo_actual: number;
    fecha_consecutivo_actual: string | null;
    fecha_configuracion: string;
    id_persona_configura: number;
}

interface ConfiguracionConsecutivoResponse {
    success: boolean;
    detail?: string;
    data: ConfiguracionConsecutivoAPI[];
}

interface ConfiguracionConsecutivoUpdateResponse {
    success: boolean;
    detail: string;
    data: ConfiguracionConsecutivoAPI;
}

interface ConfiguracionConsecutivoUpdatePayload {
    consecutivo_inicial: number;
    cantidad_digitos: number;
    prefijo_consecutivo: string;
}
  interface FormData {
    tipoPersona: string;
    fechainico: any;
    fechafin: Date | any;
    cantidad_digitos: any;
    activo: boolean;
    // cod_tipo_cobro: string;
    prefijo_consecutivo: string;
    consecutivo_inicial: any;
  }
export type { 
    ConfiguracionConsecutivoAPI, 
    ConfiguracionConsecutivoResponse, 
    ConfiguracionConsecutivoUpdateResponse,
    ConfiguracionConsecutivoUpdatePayload,
    FormData 
};