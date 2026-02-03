import axios from 'axios';
import { UpdateTemplateResponse, UpdateTemplatePayload } from '../models/updateTemplate.model';

const baseApiUrl = process.env.BASE_API_URL;

export const updateTemplate = async (
    token: string,
    id: number,
    data: UpdateTemplatePayload
): Promise<UpdateTemplateResponse> => {
    const formData = new FormData();
    
    formData.append('nombre', data.nombre);
    formData.append('descripcion', data.descripcion);
    formData.append('observacion', data.observacion);
    formData.append('activa', data.activa ? 'T' : 'F');
    formData.append('id_config_consecutivo', data.id_config_consecutivo.toString());
    
    // Solo agregar el archivo si se ha seleccionado uno nuevo
    if (data.doc_plantilla) {
        formData.append('doc_plantilla', data.doc_plantilla);
    }

    const response = await axios.patch(
        `${baseApiUrl}documentos/plantilla_documento/${id}/`,
        formData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        }
    );

    if (response.data.success === false) {
        throw new Error(response.data.detail || 'Error al actualizar la plantilla.');
    }

    return response.data;
};

