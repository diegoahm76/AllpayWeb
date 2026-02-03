import axios from 'axios';
const baseApiUrl = process.env.BASE_API_URL;

export const fetchEditProfile = async (
    token: string, 
    dataPerson: Record<string, any>, 
    personaType: 'N' | 'J', 
) => {

    let url = '';

    if (personaType === 'N') {
        url = `${baseApiUrl}personas/persona-natural/self/update/`;
    } else if (personaType === 'J') {
        url = `${baseApiUrl}personas/persona-juridica/self/update/`;
    } else {
        throw new Error('No se pudo determinar la URL para la actualización del perfil.');
    }

    try {
        const response = await axios.patch(url, dataPerson, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
