export interface PazSalvo {
    id_paz_y_salvo: number;
    id?: number;
    nombre_tipo_paz_y_salvo: string;
    nombre_puerto: string;
    archivo: string;
    estado: string;
    nro_paz_y_salvo: string;
    es_actualizacion: boolean | null;
    aprueba_actualizacion: boolean | null;
    fecha_generacion: string;
    fecha_actualizacion?: string;
    tipo_paz_y_salvo: string;
    total_kilos_paz_y_salvo: number;
    razon_social?: string;
    nro_doc_id?: number;
    id_puerto_exportacion: number;
    id_persona_genera: number;
    id_tipo_doc_id?: string;
    doc_paz_y_salvo: number | string;
    descripcion?: string;
    valor?: number;
    nit?: string;
    nombre_recaudador?: string;
    documento_recaudador?: string;
    nombre_tipo_doc_recaudador?: string;
    razon_social_tercero?: string;
    nro_doc_tercero?: string;
    id_tipo_doc_tercero?: number | null;
    tipo_documento_tercero?: string;
    numero_documento_tercero?: number;
}

export interface PazSalvoPaginadoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: {
        success: boolean;
        detail: string;
        data: PazSalvo[];
    };
}

export interface PazSalvoResponse {
    success: boolean;
    detail: string;
    data: PazSalvo[];
    count?: number;
    total_pages?: number;
    current_page?: number;
    next?: string | null;
    previous?: string | null;
}

export interface PazSalvoSearchParams {
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    nro_documento?: string;
}

export enum TipoUsuario {
    INTERNO = 'INTERNO',
    EXTERNO = 'EXTERNO'
} 