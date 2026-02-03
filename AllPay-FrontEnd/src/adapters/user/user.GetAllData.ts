import axios from 'axios';
import { UserProfileData } from '@/domain/models/user/user.models';
import { isTokenExpiredError, showSessionExpiredAlert } from '@/utils/sessionExpiredHandler';

const baseApiUrl = process.env.BASE_API_URL;


export const getUserProfile = async (token: string): Promise<UserProfileData> => {
    try {
        const response = await axios.get(`${baseApiUrl}users/profile/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (isTokenExpiredError(error)) {
                showSessionExpiredAlert();
                throw new Error('Sesión expirada');
            }

            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener el perfil del usuario: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
};
