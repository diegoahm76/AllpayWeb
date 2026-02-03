export interface UpdateTemplateData {
    id_plantilla_doc: number;
    ruta_documento: string;
    nombre: string;
    descripcion: string;
    observacion: string;
    activa: boolean;
    fecha_creacion: string;
    doc_plantilla: string;
    id_persona_crea_plantilla: number;
    id_config_consecutivo: number;
}

export interface UpdateTemplateResponse {
    success: boolean;
    detail: string;
    data: UpdateTemplateData;
}

export interface UpdateTemplatePayload {
    nombre: string;
    descripcion: string;
    observacion: string;
    activa: boolean;
    doc_plantilla?: File;
    id_config_consecutivo: number;
}

