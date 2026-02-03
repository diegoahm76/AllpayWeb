export interface FacturaSeleccionada {
    id_factura: number;
    kilos_reportar: number;
}

export interface GenerarPazSalvoRequest {
    tipo_paz_y_salvo: string;
    total_kilos_paz_y_salvo: string;
    id_puerto_exportacion: number;
    razon_social_tercero: string;
    id_tipo_doc_tercero: string;
    nro_doc_tercero: string;
    id_persona_genera: number;
    doc_paz_y_salvo: number;
    facturas: FacturaSeleccionada[];
}

export interface PazSalvoGenerado {
    id_paz_y_salvo: number;
    nro_paz_y_salvo: string;
    es_actualizacion: boolean | null;
    aprueba_actualizacion: boolean | null;
    fecha_generacion: string;
    tipo_paz_y_salvo: string;
    total_kilos_paz_y_salvo: number;
    razon_social: string;
    nro_doc_id: number;
    id_puerto_exportacion: number;
    id_persona_genera: number;
    id_tipo_doc_id: string;
    doc_paz_y_salvo: number;
}

export interface GenerarPazSalvoResponse {
    success: boolean;
    detail: string;
    data: PazSalvoGenerado;
}

export interface GenerarPazSalvoMapped {
    success: boolean;
    detail: string;
    data: PazSalvoGenerado;
} 