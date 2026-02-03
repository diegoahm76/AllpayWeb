export interface ProveedorApi {
    id_persona: number;
    tipo_persona: string | null;
    tipo_documento: string | null;
    numero_documento: string | null;
    primer_nombre: string | null;
    segundo_nombre: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    email: string | null;
    telefono_celular: string | null;
    telefono_celular_empresa: string | null;
    razon_social: string | null;
    nombre_comercial: string | null;
    cod_municipio_expedicion_id: string | null;
    municipio_expedicion: string | null;
    departamento_expedicion: string | null;
    direccion_residencia: string | null;
    direccion_notificaciones: string | null;
    coordenada_x: string | null;
    proveedor: boolean | null;
    coordenada_y: string | null;
    municipio_residencia: string | null;
    departamento_residencia: string | null;
    cod_municipio_laboral_nal: string | null;
    municipio_laboral: string | null;
    departamento_laboral: string | null;
}

export interface ProveedoresResponseApi {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: ProveedorApi[];
}

export interface UpdateProveedorResponseApi {
    success: boolean;
    detail: string;
    data: ProveedorApi;
}

export interface Proveedor {
    id_persona: number;
    tipo_persona: string | null;
    tipo_documento: string | null;
    numero_documento: string | null;
    primer_nombre: string | null;
    segundo_nombre: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    razon_social: string | null;
    nombre_comercial: string | null;
    telefono_celular: string | null;
    telefono_celular_empresa: string | null;
    email: string | null;
    cod_municipio_expedicion_id: string | null;
    municipio_expedicion: string | null;
    departamento_expedicion: string | null;
    departamento_residencia: string | null;
    municipio_residencia: string | null;
    cod_municipio_laboral_nal: string | null;
    departamento_laboral: string | null;
    municipio_laboral: string | null;
    direccion_notificaciones: string | null;
}

export interface ProveedoresMappedResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: Proveedor[];
}

export interface UpdateProveedorMappedResponse {
    success: boolean;
    detail: string;
    data: Proveedor;
}

export interface ProveedoresFilters {
    page?: number;
    page_size?: number;
    search?: string;
    numero_documento?: string;
    cod_tipo_documento?: string;
    tipo_persona?: string;
    nombre?: string;
    apellido?: string;
    razon_social?: string;
}

// Payload base para actualización
interface UpdateProveedorBasePayload {
    tipo_documento: string;
    numero_documento: string;
    email: string | null;
    direccion_notificaciones: string | null;
    cod_municipio_expedicion_id: string | null;
    coordenada_x: string | null;
    coordenada_y: string | null;
}

// Payload para persona natural
export interface UpdateProveedorNaturalPayload extends UpdateProveedorBasePayload {
    tipo_persona: 'N';
    primer_nombre: string;
    segundo_nombre?: string;
    primer_apellido: string;
    segundo_apellido?: string;
    telefono_celular: string | null;
    direccion_residencia?: string | null;
    municipio_residencia: string | null;
}

// Payload para persona jurídica
export interface UpdateProveedorJuridicaPayload extends UpdateProveedorBasePayload {
    tipo_persona: 'J';
    nombre_comercial: string;
    razon_social: string;
    telefono_celular_empresa: string | null;
    cod_municipio_laboral_nal: string | null;
}

// Union type para el payload de actualización
export type UpdateProveedorPayload = 
    | UpdateProveedorNaturalPayload 
    | UpdateProveedorJuridicaPayload;

export const mapProveedorFromApi = (item: ProveedorApi): Proveedor => {
    // Componer razón social según tipo de persona
    let razonSocial = item.razon_social;
    
    if (item.tipo_persona === 'Natural' || item.tipo_persona === 'N') {
        // Para personas naturales: concatenar nombres y apellidos
        const nombres = [
            item.primer_nombre,
            item.segundo_nombre
        ].filter(Boolean).join(' ');
        
        const apellidos = [
            item.primer_apellido,
            item.segundo_apellido
        ].filter(Boolean).join(' ');
        
        razonSocial = [nombres, apellidos].filter(Boolean).join(' ') || null;
    }
    
    return {
        id_persona: item.id_persona,
        tipo_persona: item.tipo_persona,
        tipo_documento: item.tipo_documento,
        numero_documento: item.numero_documento,
        primer_nombre: item.primer_nombre,
        segundo_nombre: item.segundo_nombre,
        primer_apellido: item.primer_apellido,
        segundo_apellido: item.segundo_apellido,
        razon_social: razonSocial,
        nombre_comercial: item.nombre_comercial,
        telefono_celular: item.telefono_celular,
        telefono_celular_empresa: item.telefono_celular_empresa,
        email: item.email,
        cod_municipio_expedicion_id: item.cod_municipio_expedicion_id,
        municipio_expedicion: item.municipio_expedicion,
        departamento_expedicion: item.departamento_expedicion,
        departamento_residencia: item.departamento_residencia,
        municipio_residencia: item.municipio_residencia,
        cod_municipio_laboral_nal: item.cod_municipio_laboral_nal,
        departamento_laboral: item.departamento_laboral,
        municipio_laboral: item.municipio_laboral,
        direccion_notificaciones: item.direccion_notificaciones
    };
}

