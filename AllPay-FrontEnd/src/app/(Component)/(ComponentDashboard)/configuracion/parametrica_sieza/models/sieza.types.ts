export interface SiezaItem {
    id: number;
    descripcion: string;
    auxiliar: string;
    compania: string;
    centro: string;
    unidad: string | null;
    sucursal: string;
    tipo_documento: string;
}

export interface SiezaResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: {
        success: boolean;
        detail: string;
        data: SiezaItem[];
    };
}
