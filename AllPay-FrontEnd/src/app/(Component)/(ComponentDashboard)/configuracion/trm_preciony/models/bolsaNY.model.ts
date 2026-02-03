export interface BolsaNYRegistro {
    idregistro: number;
    idusuario: number;
    fecha_registro: string;
    anio: number;
    mes: number;
    precio_cierre: string;
}

export interface BolsaNYData {
    registros: BolsaNYRegistro[];
}

export interface BolsaNYResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: BolsaNYRegistro[];
}

export interface BolsaNYParams {
    page?: number;
    page_size?: number;
}

// Interfaces para actualización
export interface BolsaNYUpdatePayload {
    precio_cierre: number;
    anio: number;
    mes: number;
    fecha_registro: string;
}

export interface BolsaNYUpdateResponse {
    success: boolean;
    detail?: string;
    data?: BolsaNYRegistro;
}

// Interfaces para creación
export interface BolsaNYCreatePayload {
    fecha_registro: string;
    precio_cierre: number;
}

export interface BolsaNYCreateResponse {
    success: boolean;
    message: string;
    data?: BolsaNYRegistro;
    error_code?: string;
    fecha_existente?: string;
    registro_existente_id?: number;
}
