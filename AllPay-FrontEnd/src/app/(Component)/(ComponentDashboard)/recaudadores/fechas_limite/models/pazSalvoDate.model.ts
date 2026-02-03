export interface PazSalvoDateData {
    id_fecha_vigencia: number;
    cod_tipo_fecha: string;
    descripcion: string;
    dias_vigencia: number;
    fecha_actualizacion: string;
    id_persona_actualiza: number;
}

export interface PazSalvoDateResponse {
    success: boolean;
    detail: string;
    data: PazSalvoDateData[];
}

export interface UpdatePazSalvoDatePayload {
    descripcion: string;
    dias_vigencia: number;
}

export interface UpdatePazSalvoDateResponse {
    success: boolean;
    detail: string;
    data: PazSalvoDateData;
} 