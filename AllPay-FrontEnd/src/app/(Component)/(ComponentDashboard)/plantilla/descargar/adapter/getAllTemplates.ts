// services/getAllTemplate.ts
import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface TemplateItem {
    id_plantilla_doc: number;
    doc_plantilla: string;
    nombre: string;
    descripcion: string;
    observacion: string;
    activa: boolean;
    fecha_creacion: string;
    id_persona_crea_plantilla: number;
    id_config_consecutivo: number | null;
}

export interface GetAllTemplateResponse {
    success: boolean;
    detail: string;
    data: TemplateItem[];
}

export const getAllTemplate = async (
    token: string
): Promise<GetAllTemplateResponse> => {
    const response = await axios.get(`${baseApiUrl}documentos/plantilla_documento/`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
};
