export interface PuertoExportacion {
    id_puerto_exportacion: number;
    nombre: string;
    descripcion: string;
    activo: boolean;
    item_ya_usado: boolean;
    fecha_creacion: string;
    id_persona_crea: number;
}

export interface PuertoExportacionResponse {
    success: boolean;
    detail: string;
    data: PuertoExportacion[];
}

export interface CreatePuertoExportacionData {
    nombre: string;
    descripcion: string;
}

export interface UpdatePuertoExportacionData {
    nombre: string;
    descripcion: string;
    activo: boolean;
}