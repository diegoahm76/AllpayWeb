export interface VariablesDocumento {
    [key: string]: string | number | boolean | any[];
}

export interface DocumentoGenerado {
    id_documento_generado: number;
    ruta_documento: string;
    variables_por_llenar: string[];
    consecutivo: string | null;
    fecha_consecutivo: string | null;
    finalizado: boolean;
    variables: VariablesDocumento;
    cargado: boolean;
    documento_generado: string;
    documento_generado_copia: string | null;
    id_plantilla_doc: number;
    id_persona_genera: number;
}

export interface GeneradorDocumentoResponse {
    success: boolean;
    detail: string;
    data: DocumentoGenerado;
} 