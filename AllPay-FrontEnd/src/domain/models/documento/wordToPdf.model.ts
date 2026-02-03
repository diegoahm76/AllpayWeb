export interface WordToPdfResponse {
    success: boolean;
    detail: string;
    data: {
        id_documento_generado: number;
        ruta_documento: string;
        consecutivo: string;
        fecha_consecutivo: string;
        finalizado: boolean;
        variables: {
            [key: string]: string;
        };
        cargado: boolean;
        documento_generado: string;
        documento_generado_copia: string | null;
        id_plantilla_doc: number;
        id_persona_genera: number;
    };
} 