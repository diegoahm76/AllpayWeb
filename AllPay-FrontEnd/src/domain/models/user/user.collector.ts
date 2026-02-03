export interface SearchCollector {
    id_persona: number;
    tipo_documento: string;
    numero_documento: string;
    nombres: string;
    apellidos: string;
    razon_social: string | null;
    tipo_persona: string;
    email: string;
    direccion_notificaciones: string | null;
    proveedor: boolean;
    cod_municipio_expedicion_id: string | null;
    nombre_municipio_expedicion: string | null;
    cod_departamento_expedicion: string | null;
    nombre_departamento_expedicion: string | null;
    codigo_municipio_residencial_laboral: string | null;
    nombre_municipio_residencial_laboral: string | null;
    cod_departamento_residencial_laboral: string | null;
    nombre_departamento_residencial_laboral: string | null;
    pais_nacimiento: string | null;
    municipio_residencia: string | null;
    departamento_residencia: string | null;
    celular_persona: string;
}

export interface SearchCollectorResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: SearchCollector[];
}

export interface SearchCollectorFilters {
    tipoDocumento?: string;
    documentoIdentificacion?: string;
    razonSocial?: string;
    primer_nombre?: string;
    segundo_nombre?: string;
    primer_apellido?: string;
    segundo_apellido?: string;
    departamento?: string;
    municipio?: string;
    fechaInicio?: string;
    fechaFin?: string;
    email?: string;
    direccion?: string;
    telefono?: string;
    nroFacturaUnica?: string;
    tipoComprador?: string[];
} 