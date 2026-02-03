import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

interface TwoFactorMethod {
  id_2fa_persona: number;
  tipo_2fa: string;
  nombre_tipo_2fa: string;
  descripcion_2fa: string;
  email_verificacion: string | null;
  tel_verificacion: string | null;
  id_persona: number;
  id_2fa: number;
}

export const generate2FACode = async (token: string, tfaMethod: TwoFactorMethod) => {
  try {

    const response = await axios.post(
      `${baseApiUrl}users/enviar-codigo-segundo-facto-autenticacion/${tfaMethod.id_2fa_persona}/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al generar el código de autenticación');
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};
