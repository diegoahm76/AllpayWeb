export interface TRMRegistro {
    idregistro: number;
    fecha_registro: string;
    precio_trm: string;
    anio: number;
    mes: number;
    usuario_que_registra: number;
    usuario_que_registra_nombre: string;
    usuario_que_registra_username: string;
}

export interface TRMData {
    registros: TRMRegistro[];
}

export interface TRMResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: TRMRegistro[];
}

export interface TRMParams {
    page?: number;
    page_size?: number;
}

// Interfaces para creación
export interface TRMCreatePayload {
    precio_trm: number;
    fecha_registro: string;
}

export interface TRMCreateResponse {
    success: boolean;
    message: string;
    data?: TRMRegistro;
    error_code?: string;
    fecha_existente?: string;
    registro_existente_id?: number;
}

// Interfaces para actualización
export interface TRMUpdatePayload {
    precio_trm: number;
    fecha_registro: string;
}

export interface TRMUpdateResponse {
    idregistro: number;
    fecha_registro: string;
    precio_trm: number;
    anio: number;
    mes: number;
    usuario_que_registra: number;
    usuario_que_registra_nombre: string;
    usuario_que_registra_username: string;
}
