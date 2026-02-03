export interface RegistroNoComprasData {
    id_no_compras: number;
    descripcion: string;
    fecha_registro: string;
    fecha_actualizacion: string;
    doc_soporte: string | null;
    doc_soporte_url?: string | null;
    id_recaudador: number;
}

export interface RegistroNoComprasResponse {
    success: boolean;
    detail: string;
    data: RegistroNoComprasData[];
    total_pages?: number;
    current_page?: number;
    page_size?: number;
    total_count?: number;
}

export interface CreateRegistroNoComprasPayload {
    descripcion: string;
    id_recaudador: number;
    doc_soporte?: File | null;
}

export interface CreateRegistroNoComprasResponse {
    success: boolean;
    detail: string;
    data: RegistroNoComprasData;
}

export interface GetRegistroNoComprasByIdResponse {
    success: boolean;
    detail: string;
    data: RegistroNoComprasData;
}

export interface UpdateRegistroNoComprasPayload {
    descripcion: string;
    id_recaudador: number;
    doc_soporte?: File | null;
}

export interface UpdateRegistroNoComprasResponse {
    success: boolean;
    detail: string;
    data: RegistroNoComprasData;
}

