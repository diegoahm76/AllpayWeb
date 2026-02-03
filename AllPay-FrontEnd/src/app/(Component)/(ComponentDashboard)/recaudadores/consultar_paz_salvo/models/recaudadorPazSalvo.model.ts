export interface RecaudadorPazSalvoData {
    id_persona: number;
    razon_social: string;
    numero_documento: string;
    nombre_comercial: string;
    email: string;
    direccion_notificaciones: string;
    nombre_municipio: string;
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

export interface ConsultaPazSalvoFormData {
    razonSocial: string;
    nombreComercial: string;
    direccionNotificacion: string;
    fechaInicio: string;
    idPersonaGenera: number;
    documentoIdentificacion: string;
    correoElectronico: string;
    municipio: string;
    fechaFinalizacion: string;
} 