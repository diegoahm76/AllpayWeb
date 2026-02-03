import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const verify2FACode = async (token: string, codigo: string, idVerificacion2FA: number) => {
  try {
    const response = await axios.put(
      `${baseApiUrl}users/verificar-codigo-segundo-facto-autenticacion/`,
      {
        codigo: codigo,
        id_verificacion_2fa: idVerificacion2FA
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al verificar el código 2FA');
    }

    return response.data; 
  } catch (error) {
    throw error;
  }
};
