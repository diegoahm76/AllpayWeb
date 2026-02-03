
import axios from 'axios';
import Swal from 'sweetalert2';
import { ConfiguracionConsecutivoResponse } from '../models/types';
const baseApiUrl = process.env.BASE_API_URL;


const post_configuracion_consecutivo = async ({
  formData,
  token,
  buscarPersonasAll,
}: {
  formData: {
    // cod_tipo_cobro: string;
    prefijo_consecutivo: string;
    consecutivo_inicial: string | number;
    cantidad_digitos: string | number;
  };
  token: string;
  buscarPersonasAll: any;
}): Promise<void> => {
  try {
    const payload = {
      // cod_tipo_cobro: formData?.cod_tipo_cobro,
      prefijo_consecutivo: formData?.prefijo_consecutivo,
      consecutivo_inicial: Number(formData?.consecutivo_inicial),
      cantidad_digitos: Number(formData?.cantidad_digitos), 
    };

    const url = `${baseApiUrl}documentos/configuracion_consecutivo/`;

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Registro exitoso',
        text: response.data.detail || 'Configuración guardada correctamente.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
            outline-none focus:outline-none
          `,
        },
        buttonsStyling: false,
      });
      buscarPersonasAll(); // Llama a la función para buscar personas después de guardar la configuración
    } else {
      throw new Error(response.data.detail || 'Error en la respuesta de la API');
    }
  } catch (error: any) {
    console.error('Error al guardar configuración:', error);

    const errorMessage =
      error?.response?.data?.detail || error?.message || 'No se pudo guardar la configuración. Intenta nuevamente.';

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: `
          ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
          py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
          hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
          disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
          outline-none focus:outline-none
        `,
      },
      buttonsStyling: false,
    });
  }
};

const obtenerDatosExcelConfiguracion = async ({
  token,
  data,
}: {
  token: string;
  data?: any[];
}): Promise<
  {
    'Tipo Cobro': string;
    'Consecutivo Inicial': number;
    'cantidad_digitos': number;
    'Año Consecutivo': number;
    Prefijo: string;
    'Consecutivo Actual': number;
    'Fecha Configuración': string;

  }[]
> => {
  try {
    let responseData: any[];

    if (data) {
      // Usar los datos proporcionados
      responseData = data;
    } else {
      // Hacer la petición con sin_paginacion=true
      const url = `${baseApiUrl}documentos/configuracion_consecutivo/`;

      const response = await axios.get<ConfiguracionConsecutivoResponse>(url, {
        params: {
          sin_paginacion: true
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      responseData = response.data?.data ?? [];
    }

    if (responseData.length === 0) return [];

    return responseData.map((item) => ({
      'Tipo Cobro': item.cod_tipo_cobro,
      'Consecutivo Inicial': item.consecutivo_inicial,
      'cantidad_digitos': item.cantidad_digitos,
      'Año Consecutivo': item.anio_consecutivo,
      Prefijo: item.prefijo_consecutivo,
      'Consecutivo Actual': item.consecutivo_actual,
      'Fecha Configuración': new Date(item.fecha_configuracion).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    }));
  } catch (error) {
    console.error('Error al obtener datos para Excel:', error);
    return [];
  }
};



// Obtener tipos de cobro
const getTiposCobro = async (token: string): Promise<{ key: number; value: string; title: string }[]> => {
  try {
    const url = `${baseApiUrl}choices/cod-tipo-cobro/`;
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.data.success) throw new Error(response.data.detail || 'Error al obtener tipos de cobro');

    return response.data.data.map(([value, title]: [string, string], index: number) => ({
      key: index,
      value,
      title,
    }));
  } catch (error) {
    console.error('Error al cargar tipos de cobro:', error);
    return [];
  }
};

const deleteConfiguracionConsecutivo = async (
  id: number,
  token: string,
  buscarPersonasAll: any,
): Promise<boolean> => {
  const confirm = await Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esta acción eliminará la configuración seleccionada.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    customClass: {
      actions: 'flex gap-4 justify-end', // 👈 Añade espacio entre los botones
      confirmButton: `
        ${'Sí, eliminar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
        py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
        hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed
        cursor-pointer flex items-center justify-center gap-2 outline-none focus:outline-none
      `,
      cancelButton: `
        ${'Cancelar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
        py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
        hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed
        cursor-pointer flex items-center justify-center gap-2 outline-none focus:outline-none
      `,
    },
    buttonsStyling: false,
  });

  if (!confirm.isConfirmed) return false;

  try {
    const url = `${baseApiUrl}documentos/configuracion_consecutivo/${id}/`;
    await axios.delete(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    await Swal.fire({
      icon: 'success',
      title: 'Eliminado',
      text: 'El registro ha sido eliminado correctamente.',
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: `
          ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
          py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
          hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed
          cursor-pointer flex items-center justify-center gap-2 outline-none focus:outline-none
        `,
      },
      buttonsStyling: false,
    });
    buscarPersonasAll(); // Llama a la función para buscar personas después de eliminar la configuración
    return true;
  } catch (error) {
    console.error('Error al eliminar configuración:', error);

    // Extraer mensaje detallado si viene del backend
    let errorMessage = 'Ocurrió un error al intentar eliminar el registro.';
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    await Swal.fire({
      icon: 'error',
      title: 'Error al eliminar',
      text: errorMessage,
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: `
          ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
          py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
          hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed
          cursor-pointer flex items-center justify-center gap-2 outline-none focus:outline-none
        `,
      },
      buttonsStyling: false,
    });

    return false;
  }

};


const patch_configuracion_consecutivo = async ({
  id,
  formData,
  token,
  buscarPersonasAll,
}: {
  id: number;
  formData: any;
  token: string;
  buscarPersonasAll: () => void;
}) => {
  try {
    const url = `${baseApiUrl}documentos/configuracion_consecutivo/${id}/`;

    await axios.patch(url, formData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    await Swal.fire({
      icon: 'success',
      title: 'Actualizado correctamente',
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: `
          ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
          py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
          hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
          disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
          outline-none focus:outline-none
        `,
      },
      buttonsStyling: false,
    });

    buscarPersonasAll();
  } catch (error) {
    console.error('Error al editar:', error);

    let errorMessage = 'No se pudo editar el registro.';
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: `
          ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
          py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
          hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
          disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
          outline-none focus:outline-none
        `,
      },
      buttonsStyling: false,
    });
  }
};


export {
  patch_configuracion_consecutivo,
  getTiposCobro,
  deleteConfiguracionConsecutivo,
  post_configuracion_consecutivo,
  obtenerDatosExcelConfiguracion,
};