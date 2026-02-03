import axios from 'axios';
import { LoggedUserResponse } from '@/domain/models/acuerdos_pago/logged.user.payment.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getLoggedUser = async (token: string): Promise<LoggedUserResponse> => {
    try {
        const response = await axios.get<LoggedUserResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/usuario-logueado/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener los datos del usuario');
        }
        throw new Error('Error al obtener los datos del usuario');
    }
};
