import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const deleteAuthenticationMethod = async (id: number, token: string): Promise<boolean> => {
    try {
        const response = await axios.delete(`${baseApiUrl}users/segundo-facto-autenticacion/usuario/delete/${id}/`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error eliminando el método de autenticación:', error);
        return false;
    }
};
