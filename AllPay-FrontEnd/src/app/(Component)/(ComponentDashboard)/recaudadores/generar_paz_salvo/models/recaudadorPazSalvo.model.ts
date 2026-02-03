export interface RecaudadorPazSalvoData {
    id_persona: number;
    razon_social: string | null;
    nombre_recaudador: string | null; // Nuevo campo para nombre completo cuando tipo_documento no es NIT
    numero_documento: string; // Este es el documento de identificación
    nombre_comercial: string | null;
    email: string;
    direccion_notificaciones: string;
    nombre_municipio: string;
    tipo_documento: string; // Tipo de documento (CC, NIT, etc.)
    nombre_documento: string; // Nombre descriptivo del tipo de documento
}

export interface RecaudadorPazSalvoResponse {
    success: boolean;
    detail: string;
    data: RecaudadorPazSalvoData;
}

export interface RecaudadorPazSalvoMapped {
    success: boolean;
    detail: string;
    data: RecaudadorPazSalvoData;
} 