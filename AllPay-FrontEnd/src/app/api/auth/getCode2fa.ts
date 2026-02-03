
import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const getCode2fa = async (token: string) => {
  try {
    const response = await axios.get(
      `${baseApiUrl}users/segundo-facto-autenticacion/usuario/get/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );


    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al obtener el código de autenticación');
    }

    return response.data; 

  } catch (error) {
    throw error;
  }
};
