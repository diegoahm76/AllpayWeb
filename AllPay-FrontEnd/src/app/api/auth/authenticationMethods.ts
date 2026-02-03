import axios from 'axios';
import Swal from 'sweetalert2';

const baseApiUrl = process.env.BASE_API_URL;

export const fetchAuthenticationMethods = async (token: string) => {
  const estiloBoton = `
    ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
    py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
    hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
    disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
    outline-none focus:outline-none
  `;

  try {
    const response = await axios.get(`${baseApiUrl}users/segundo-facto-autenticacion/usuario/get/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Si la respuesta es exitosa pero no hay datos, significa que el usuario no tiene 2FA habilitado
    if (response.data && !response.data.data) {
      return { success: true, data: [] };
    }

    return response.data;
  } catch (error: any) {
    // Si el error es 404, significa que el usuario no tiene 2FA habilitado
    if (error?.response?.status === 404) {
      return { success: true, data: [] };
    }

    const errorMessage = error?.response?.data?.detail || 'No se pudieron obtener los métodos de autenticación';

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: estiloBoton,
      },
      buttonsStyling: false,
    });

    return null;
  }
};
