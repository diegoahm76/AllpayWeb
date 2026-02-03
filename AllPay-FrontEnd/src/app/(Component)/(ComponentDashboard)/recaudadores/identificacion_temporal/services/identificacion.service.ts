import axios from 'axios';
import Swal from 'sweetalert2';
const baseApiUrl = process.env.BASE_API_URL;



const buscarPersonasAll = async ({
  setUser,
  setIsLoading,
  valueSesion,
  filters
}: {
  setUser: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
  valueSesion: any;
  filters: {
    cod_tipo_documento?: string;
    numero_documento?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  };
}): Promise<void> => {
  try {
    if (filters.fecha_inicio && filters.fecha_fin) {
      const inicio = new Date(filters.fecha_inicio);
      const fin = new Date(filters.fecha_fin);
      if (inicio > fin) {
        await Swal.fire({
          icon: 'warning',
          title: 'Fechas inválidas',
          text: 'La fecha de inicio no puede ser mayor que la fecha de fin.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
                ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
                py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
                hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
                disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
                outline-none focus:outline-none
              `
          },
          buttonsStyling: false
        });
        return;
      }
    }

    setIsLoading(true);

    const queryParams = new URLSearchParams();
    if (filters.fecha_inicio) queryParams.append('fecha_inicio', filters.fecha_inicio);
    if (filters.fecha_fin) queryParams.append('fecha_fin', filters.fecha_fin);
    if (filters.cod_tipo_documento) queryParams.append('cod_tipo_documento', filters.cod_tipo_documento);
    if (filters.numero_documento) queryParams.append('numero_documento', filters.numero_documento);

    const url = `${baseApiUrl}personas/identificacion-temporal/?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`
      }
    });

    if (!response.data.success) {
      throw response.data.detail || 'Error desconocido en la API';
    }

    // 🔥 Aquí convertimos el dato a array si no lo es
    const datosNormalizados = Array.isArray(response.data.data)
      ? response.data.data
      : [response.data.data];

    setUser(datosNormalizados);
  } catch (error: any) {
    console.error('Error en buscarPersonasAll:', error);
  } finally {
    setIsLoading(false);
  }
};





const handleCrearPersonaTemporal = async ({
  formData,
  setConfigurar,
  setFormData,
  initialFormData,
  valueSesion,
  setUser,
  setIsLoading,
  buscarPersonasAll,
  
}: {
  formData: any;
  setConfigurar:any;
  setFormData: (data: any) => void;
  initialFormData: any;
  valueSesion: any;
  setUser: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
  buscarPersonasAll?: (params: {
    setUser: (data: any) => void;
    setIsLoading: (loading: boolean) => void;
    valueSesion: any;
  }) => Promise<void>;
}): Promise<void> => {


if (
  formData.email.trim() &&
  formData.confirmar_email.trim() &&
  formData.email !== formData.confirmar_email
) {
  await Swal.fire({
    icon: 'warning',
    title: 'Correo inválido',
    text: 'Los correos electrónicos deben coincidir si se ingresan ambos.',
    confirmButtonText: 'Aceptar',
    customClass: {
      confirmButton: `
        ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
        hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
        flex items-center justify-center gap-2
      `,
    },
    buttonsStyling: false,
  });
  return;
}

if (
  formData.tel_celular.trim() &&
  formData.confirmar_tel_celular.trim() &&
  formData.tel_celular !== formData.confirmar_tel_celular
) {
  await Swal.fire({
    icon: 'warning',
    title: 'Teléfono inválido',
    text: 'Los números de teléfono deben coincidir si se ingresan ambos.',
    confirmButtonText: 'Aceptar',
    customClass: {
      confirmButton: `
        ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
        hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
        flex items-center justify-center gap-2
      `,
    },
    buttonsStyling: false,
  });
  return;
}


  const payload = {
    cod_tipo_documento: formData?.cod_tipo_documento,
    numero_documento: formData?.numero_documento,
    nombre: formData?.nombre,
    direccion: formData?.direccion,
    cod_municipio: formData?.cod_municipio,
    cod_departamento: formData?.cod_departamento,
    email: formData?.email,
    tel_fijo: formData?.tel_fijo,
    tel_celular: formData?.tel_celular, 
    numero_documento_contacto: formData?.numero_documento_contacto,
    nombre_contacto: formData?.nombre_contacto,
    apellido_contacto: formData?.apellido_contacto,
  };

  try {
    const response = await axios.post(`${baseApiUrl}personas/identificacion-temporal/`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: '¡Persona Registrada!',
        text: 'La persona a sido registrada correctamente.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `,
        },
        buttonsStyling: false,
      });

      if (buscarPersonasAll) {
        await buscarPersonasAll({ setUser, setIsLoading, valueSesion });
      }
      setConfigurar(true);
      setFormData(initialFormData);
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.data.detail || 'Ocurrió un error al crear la persona.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `,
        },
        buttonsStyling: false,
      });
    }
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || 'Ocurrió un error al crear la persona.';
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: mensaje,
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `,
      },
      buttonsStyling: false,
    });
  }
};

const handleActualizarPersonaTemporal = async ({
  editId,
  formData,
  setFormData,
  initialFormData,
  valueSesion,
  setEditId,
  setConfigurar,
  setUser,
  setIsLoading,
  buscarPersonasAll
}: {
  editId: number | string | null;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  initialFormData: any;
  valueSesion: any;
  setEditId: any;
  setConfigurar: (value: boolean) => void;
  setUser: (data: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  buscarPersonasAll: (args: {
    setUser: (data: any[]) => void;
    setIsLoading: (loading: boolean) => void;
    valueSesion: any;
  }) => Promise<void>;
}): Promise<void> => {
  if (!editId) return;

  const estiloBoton = `
      ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
      py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
      hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
      disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
      outline-none focus:outline-none
    `;

  const alerta = async (icon: any, title: string, text: string) => {
    await Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: 'Aceptar',
      customClass: { confirmButton: estiloBoton },
      buttonsStyling: false
    });
  };
 
if (
  formData.email.trim() &&
  formData.confirmar_email.trim() &&
  formData.email !== formData.confirmar_email
) {
  return alerta('warning', 'Correo inválido', 'Los correos electrónicos deben coincidir si se ingresan ambos.');
}

if (
  formData.tel_celular.trim() &&
  formData.confirmar_tel_celular.trim() &&
  formData.tel_celular !== formData.confirmar_tel_celular
) {
  return alerta('warning', 'Teléfono inválido', 'Los números de teléfono deben coincidir si se ingresan ambos.');
}


  const payload = {
    numero_documento: formData?.numero_documento,
    nombre: formData?.nombre,
    direccion: formData?.direccion,
    email: formData?.email,
    tel_fijo: formData?.tel_fijo,
    tel_celular: formData?.tel_celular,
    cod_tipo_documento: formData?.cod_tipo_documento,
    cod_municipio: formData?.cod_municipio,
    cod_departamento: formData?.cod_departamento,
    numero_documento_contacto: formData?.numero_documento_contacto,
    nombre_contacto: formData?.nombre_contacto,
    apellido_contacto: formData?.apellido_contacto,

  };

  try {
    const response = await axios.put(
      `${baseApiUrl}personas/identificacion-temporal/update/${editId}/`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      }
    );

    if (response.data.success) {
      await alerta('success', '¡Persona Actualizada!', 'La información se actualizó correctamente.');
      setFormData(initialFormData);
      setEditId(null);
      setConfigurar(true);
      buscarPersonasAll({ setUser, setIsLoading, valueSesion });
    } else {
      await alerta('error', 'Error', response.data.detail || 'No se pudo actualizar la persona.');
    }
  } catch (error: any) {
    await alerta('error', 'Error', error?.response?.data?.detail || 'No se pudo actualizar la persona.');
  }
};

const obtenerMunicipios = async ({
  cod_departamento,
  setMunicipios
}: {
  cod_departamento: string | number;
  setMunicipios: React.Dispatch<React.SetStateAction<any[]>>;
}): Promise<void> => {
  if (!cod_departamento) return;

  try {
    const response = await axios.get(
      `${baseApiUrl}personas/municipio/get-list/${cod_departamento}/`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success === false) {
      throw response.data.detail;
    }

    setMunicipios(response.data.data);
  } catch (error) {
    console.error('Error al obtener municipios:', error);
  }
};
const handleDownloadExcel = async ({
  filters,
  valueSesion
}: {
  filters: {
    cod_tipo_documento?: string;
    numero_documento?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  };
  valueSesion: any;
}): Promise<any[]> => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.cod_tipo_documento) {
      queryParams.append('cod_tipo_documento', filters.cod_tipo_documento);
    }
    if (filters.numero_documento) {
      queryParams.append('numero_documento', filters.numero_documento);
    }
    if (filters.fecha_inicio) {
      queryParams.append('fecha_inicio', filters.fecha_inicio);
    }
    if (filters.fecha_fin) {
      queryParams.append('fecha_fin', filters.fecha_fin);
    }

    const url = `${baseApiUrl}personas/identificacion-temporal/?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error desconocido en la API');
    }

    const data = response.data.data;
    if (!data || data.length === 0) return [];

    return data.map((item: any) => ({
      Nombre: item.nombre,
      Documento: item.numero_documento,
      Dirección: item.direccion,
      Email: item.email,
      Fecha: new Date(item.fecha_creacion).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }));
  } catch (error) {
    console.error('Error al obtener datos para Excel:', error);
    return [];
  }
};


export {
  handleDownloadExcel,
  obtenerMunicipios,
  buscarPersonasAll,
  handleCrearPersonaTemporal,
  handleActualizarPersonaTemporal,

};