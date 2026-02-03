import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface PersonaData {
    id_persona: number;
    tipo_persona: string;
    tipo_persona_desc: string;
    tipo_documento: string;
    numero_documento: string;
    primer_nombre: string;
    segundo_nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    nombre_completo: string;
    email: string;
    email_empresarial: string;
    telefono_celular: string;
    telefono_empresa: string | null;
    telefono_fijo_residencial: string;
    direccion_residencia: string;
    direccion_notificaciones: string;
    razon_social: string | null;
    nombre_comercial: string;
    digito_verificacion: string | null;
    cod_naturaleza_empresa: string | null;
    nombre_naturaleza_empresa: string | null;
    tiene_usuario: boolean;
    tipo_usuario: string;
    is_active: boolean;
    archivo_rut: string;
    camaraComercio: string;
    documentoRepresentante: string;
    image_profile: string;
    representante_legal: string | null;
    municipio: string;
    departamento: string;
    pais: string;
    usuarios: Array<{
        id_usuario: number;
        nombre_de_usuario: string;
    }>;
    justificacion_cambio: string;
}

export interface GetPersonaByDocumentResponse {
    success: boolean;
    detail: string;
    data: PersonaData;
}

export const getPersonaByDocument = async (
    token: string,
    codTipoDocumento: string,
    numeroDocumento: string

): Promise<GetPersonaByDocumentResponse> => {
    try {
        const response = await axios.get(
            `${baseApiUrl}personas/get-personas-by-document-admin-user/${codTipoDocumento}/${numeroDocumento}/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener datos de la persona');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener datos de la persona: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};
