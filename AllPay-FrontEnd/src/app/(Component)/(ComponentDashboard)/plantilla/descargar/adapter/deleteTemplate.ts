import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const deleteTemplate = async (token: string, id: number): Promise<boolean> => {
    const response = await axios.delete(
        `${baseApiUrl}documentos/plantilla_documento/${id}/`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (response.status === 204 || response.data?.success === true) {
        return true;
    }

    // Lanza un error si no fue exitosa
    throw new Error('Error al eliminar la plantilla');
};
