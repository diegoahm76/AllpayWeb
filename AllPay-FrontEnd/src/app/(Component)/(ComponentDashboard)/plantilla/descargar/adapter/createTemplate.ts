// services/createTemplate.ts
import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

interface CreateTemplateData {
    nombre: string;
    descripcion: string;
    observaciones: string;
    documento: File;
    activo: boolean;
    id_consecutivo?: string;
}

export const createTemplate = async (
    token: string,
    data: CreateTemplateData
): Promise<boolean> => {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    formData.append('descripcion', data.descripcion);
    formData.append('observacion', data.observaciones);
    const activa = data.activo ? 'T' : 'F';
    formData.append('activa', activa);
    formData.append('doc_plantilla', data.documento);

    if (data.id_consecutivo) {
        formData.append('id_config_consecutivo', data.id_consecutivo);
    }

    const response = await axios.post(`${baseApiUrl}documentos/plantilla_documento/`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    });

    if (response.data.success === false) {
        throw new Error(response.data.detail || 'Error al crear la plantilla.');
    }

    return true;
};
