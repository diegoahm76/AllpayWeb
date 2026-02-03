import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface TaxCollectorData {
    id_persona: number;
    tipo_documento: string;
    numero_documento: string;
    nombres: string;
    apellidos: string;
    razon_social: string | null;
    tipo_persona: string;
    email: string;
    direccion_notificaciones: string;
    direccion_residencia: string;
    proveedor: boolean;
    cod_municipio_expedicion_id: string;
    nombre_municipio_expedicion: string;
    cod_departamento_expedicion: string;
    nombre_departamento_expedicion: string;
    codigo_municipio_residencial_laboral: string | null;
    nombre_municipio_residencial_laboral: string | null;
    cod_departamento_residencial_laboral: string | null;
    nombre_departamento_residencial_laboral: string | null;
    nombre_comercial: string | null;
    cod_tipo_comprador: string;
    tipo_persona_display?: string;
    pais_nacimiento: string | null;
    municipio_residencia: string | null;
    departamento_residencia: string | null;
    celular_persona: string;
}

export interface TaxCollectorResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: TaxCollectorData[];
}

export interface TaxCollectorFilters {
    tipo_documento?: string;
    numero_documento?: string;
}

export const getTaxCollectors = async (
    token: string,
    filters?: TaxCollectorFilters
): Promise<TaxCollectorResponse> => {
    try {
        const queryParams = new URLSearchParams();

        if (filters?.tipo_documento) {
            queryParams.append('cod_tipo_documento', filters.tipo_documento);
        }
        if (filters?.numero_documento) {
            queryParams.append('numero_documento', filters.numero_documento);
        }

        const url = `${baseApiUrl}recaudos/get-recaudadores/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los recaudadores');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener recaudadores: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};
