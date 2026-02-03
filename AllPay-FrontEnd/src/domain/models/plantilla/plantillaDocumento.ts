export interface VariablePlantilla {
    id_plantilla_doc: number;
    variables: string[];
    ruta_documento: string;
    nombre: string;
    descripcion: string;
    observacion: string;
    activa: boolean;
    fecha_creacion: string;
    doc_plantilla: string;
    id_persona_crea_plantilla: number;
    id_config_consecutivo: number | null;
}

export interface PlantillasResponse {
    success: boolean;
    detail: string;
    data: VariablePlantilla[];
} 