export interface LoggedUserData {
    tipo_documento: string;
    numero_documento: string;
    tipo_persona: string;
    email: string;
    direccion_notificaciones: string;
    nombre_completo: string;
    pais_nacimiento: string;
    razon_social: string | null;
    nombre_comercial: string | null;
    pais_nacionalidad_empresa: string | null;
}

export interface LoggedUserResponse {
    success: boolean;
    detail: string;
    data: LoggedUserData;
} 