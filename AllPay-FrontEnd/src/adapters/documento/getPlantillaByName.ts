import axios from 'axios';
import { PlantillasResponse } from '@/domain/models/plantilla/plantillaDocumento';

interface GetPlantillaByNameParams {
    token: string;
    nombre?: string;
}

const baseApiUrl = process.env.BASE_API_URL;

export const getPlantillaByName = async ({ token, nombre }: GetPlantillaByNameParams): Promise<PlantillasResponse> => {
    let url = `${baseApiUrl}documentos/plantillas_documentos/get/`;
    if (nombre) {
        url += `?nombre=${encodeURIComponent(nombre)}`;
    }

    const response = await axios.get<PlantillasResponse>(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
};
