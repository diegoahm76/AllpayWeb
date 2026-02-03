import axios from 'axios';
import Swal from 'sweetalert2';

const baseApiUrl = process.env.BASE_API_URL;

export const fetchAuthenticationMethodsg = async (token: string) => {
  const estiloBoton = `
    ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
    py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
    hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
    disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
    outline-none focus:outline-none
  `;

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

    if (response.data && !response.data.data) {
      return { success: true, data: [] }; // No tiene métodos de 2FA
    }

    return response.data;
  } catch (error: any) {
    console.error("Error en fetchAuthenticationMethods:", error);

    let errorMessage = 'No se pudieron obtener los métodos de autenticación';
    if (axios.isAxiosError(error)) {
      errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        errorMessage;
    }

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

