import axios from 'axios';
import Swal from 'sweetalert2';
const baseApiUrl = process.env.BASE_API_URL;



const buscarResumenSicex = async ({
  setResumen_totales,
  setResumen,
  setIsLoading,
  valueSesion,
  filters,
  formData,
  setNotifOpen,
  setNotifText,
  setTotalPages,
  page = 1
}: {
  setResumen_totales: any;
  setResumen: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
  valueSesion: any;
  filters: {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
  };
  formData: any;
  setNotifOpen: (val: boolean) => void;
  setNotifText: (text: string) => void;
  setTotalPages: (pages: number) => void;
  page?: number;
}): Promise<void> => {
  try {
    if (filters.fecha_inicio && filters.fecha_fin) {
      const inicio = new Date(filters.fecha_inicio);
      const fin = new Date(filters.fecha_fin);
      if (inicio > fin) {
        setNotifText('La fecha de inicio no puede ser mayor que la fecha de fin.');
        setNotifOpen(true);
        return;
      }
    }

    setIsLoading(true);

    const queryParams = new URLSearchParams();
    if (filters?.numero_documento) queryParams.append('numero_documento', filters.numero_documento);
    if (filters?.fecha_inicio) queryParams.append('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) queryParams.append('fecha_fin', filters.fecha_fin);
    queryParams.append('page', page.toString());

    const url = `${baseApiUrl}cartera/cartera-consulta-interno/?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`
      }
    });

    const result = response.data?.results;

    if (!result?.success) {
      throw result?.detail || 'Error desconocido en la API';
    }
    console.log(formData);
    setResumen_totales(result.totales);
    const datos = Array.isArray(result.data) ? result.data : [result.data];
    setResumen(datos);

    const totalItems = response.data?.count || 0;
    const itemsPerPage = 10;
    setTotalPages(Math.ceil(totalItems / itemsPerPage));
  } catch (error: any) {
    console.error('Error en buscarResumenInterno:', error);
    setNotifText(error?.response?.data?.detail || 'Ocurrió un problema, intenta nuevamente');
    setNotifOpen(true);
  } finally {
    setIsLoading(false);
  }
};


const fetchAllResumenSicexExcel = async ({
  valueSesion,
  filters,
  formData,
  page
}: {
  valueSesion: any;
  filters: {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
  };
  formData: any;
  page: number;
}): Promise<{ data: any[]; total_pages: number }> => {
  const queryParams = new URLSearchParams();
  if (filters?.numero_documento) queryParams.append('numero_documento', filters.numero_documento);
  if (filters?.fecha_inicio) queryParams.append('fecha_inicio', filters.fecha_inicio);
  if (filters?.fecha_fin) queryParams.append('fecha_fin', filters.fecha_fin);
  queryParams.append('page', page.toString());

  const url = `${baseApiUrl}cartera/cartera-consulta-interno/?${queryParams.toString()}`;
  console.log(formData);

  const response = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${valueSesion.user.tokens.access}`
    }
  });

  const result = response.data?.results;
  const totalItems = response.data?.count || 0;
  const total_pages = Math.ceil(totalItems / 10);

  return {
    data: result?.data || [],
    total_pages
  };
};

  const obtenerDepartamentos = async ({
setDepartamentos,
valueSesion,
  }:{
setDepartamentos:any ;
valueSesion:any;
  }) => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/departamento/get-list/CO/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success === false) {
        throw response.data.detail;
      }

      setDepartamentos(response.data.data);
    } catch (error) {
      console.error('Error al obtener departamentos:', error);
    }
  };

export const buscarResumenSicexAll = async ({
  valueSesion,
  filters,
  formData,
}: {
  valueSesion: any;
  filters: {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
  };
  formData: any;
}): Promise<{ data: any[]; total_pages: number }> => {
  try {
    const queryParams = new URLSearchParams();
    if (formData?.tipo_cargueb) queryParams.append('numero_documento', formData.tipo_cargueb);
    if (filters?.fecha_inicio) queryParams.append('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) queryParams.append('fecha_fin', filters.fecha_fin);

    const url = `${baseApiUrl}cartera/cartera-consulta-interno/?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    const datos = Array.isArray(response.data.data)
      ? response.data.data
      : [response.data.data];

    return {
      data: datos,
      total_pages: 1, // No hay paginación desde el backend
    };
  } catch (error) {
    console.error('Error en buscarResumenSicexAll:', error);
    return { data: [], total_pages: 1 };
  }
};



const handleCrearPersonaTemporal = async ({
  formData,
  setFormData,
  initialFormData,
  valueSesion,
  setUser,
  setIsLoading,
  buscarPersonasAll,
}: {
  formData: any;
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
    cod_tipo_documento: formData.cod_tipo_documento,
    numero_documento: formData.numero_documento,
    nombre: formData.nombre,
    direccion: formData.direccion,
    cod_municipio: formData.cod_municipio,
    cod_departamento: formData.cod_departamento,
    email: formData.email,
    tel_fijo: formData.tel_fijo,
    tel_celular: formData.tel_celular,
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
        title: '¡Persona registrada!',
        text: 'La persona temporal se ha registrado correctamente.',
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
    cod_departamento: formData?.cod_departamento
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
      await alerta('success', '¡Persona actualizada!', 'La información se actualizó correctamente.');
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
  formData,
  valueSesion
}: {
  filters: {
    fecha_inicio?: string;
    fecha_fin?: string;
  };
  formData: {
    tipo_cargueb?: string;
  };
  valueSesion: any;
}): Promise<any[]> => {
  try {
    const queryParams = new URLSearchParams();

    if (formData?.tipo_cargueb) {
      queryParams.append('numero_documento', formData.tipo_cargueb);
    }
    if (filters.fecha_inicio) {
      queryParams.append('fecha_inicio', filters.fecha_inicio);
    }
    if (filters.fecha_fin) {
      queryParams.append('fecha_fin', filters.fecha_fin);
    }

    const url = `${baseApiUrl}cartera/cartera-consulta-interno/?${queryParams.toString()}`;

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

    // Formato de exportación
    return data.map((item: any) => ({
      'N° Factura Única': item.nro_factura_unica,
      'Documento Recaudador': item.nro_documento_recaudador,
      'Recaudador': item.razon_social_recaudador,
      'Fecha de Compra': new Date(item.fecha_compra).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      'Factura Proveedor': item.factura_proveedor,
      'NIT Proveedor': item.nit_proveedor,
      'Proveedor': item.nombre_proveedor,
      'Municipio Cacao': item.nombre_municipio_cacao,
      'Departamento Cacao': item.nombre_departamento_cacao,
      'Total Kilos': Number(item.total_kilos).toLocaleString('es-CO'),
      'Valor Bruto': Number(item.valor_bruto).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }),
      'Cuota de Fomento': Number(item.cuota_fomento).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }),
      'Valor Neto': Number(item.valor_neto).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }),
      'Días de Mora': item.dias_mora,
      'N° Acuerdo de Pago': item.nro_acuerdo_pago || '-',
      'Valor Intereses': Number(item.valor_intereses).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }),
      'Estado Acuerdo Pago': item.estado_acuerdo_pago || '-'
    }));
  } catch (error) {
    console.error('Error al obtener datos para Excel:', error);
    return [];
  }
};


type FormDataSicex = {
  fecha_inicio: string;
  fecha_fin: string;
  tipo_cargue: string;
  tipo_cargueb: string;

  archivo: File | null;
  fecha_cargue: any;
};

const handleCrearSicex = async ({

  formData,
  setNotifText,
  setNotifOpen,
  setAlertOpen,            // 👈 agrégalo como prop
  setOnConfirmCreate,
  setFormData,
  initialFormData,
  valueSesion,
  setIsLoading,
  buscarResumenSicex,
  setCantidadRegistros,
}: {
  setAlertOpen: any;
  setNotifText: any;
  setNotifOpen: any;
  setOnConfirmCreate: any;
  formData: FormDataSicex;
  setFormData: (data: FormDataSicex) => void;
  initialFormData: FormDataSicex;
  valueSesion: any;
  setIsLoading: (loading: boolean) => void;
  buscarResumenSicex: () => void;
  setCantidadRegistros: (n: number | null) => void;
}) => {
  try {
    if (!formData.fecha_inicio) {
      setNotifText('Por favor ingrese la fecha de inicio.');
      setNotifOpen(true);
      return;
    }

    if (!formData.fecha_fin) {
      setNotifText('Por favor ingrese la fecha de fin.');
      setNotifOpen(true);
      return;
    }

    if (!formData.tipo_cargue) {
      setNotifText('Por favor seleccione el tipo de cargue.');
      setNotifOpen(true);
      return;
    }

    if (!formData.archivo) {
      setNotifText('Por favor selecciona un archivo Excel.');
      setNotifOpen(true);
      return;
    }



    const payload = new FormData();
    payload.append('fecha_inicio', formData.fecha_inicio);
    payload.append('fecha_fin', formData.fecha_fin);
    payload.append('tipo_cargue', formData.tipo_cargue);
    payload.append('archivo', formData.archivo);

    setIsLoading(true);

    const response = await axios.post(
      `${baseApiUrl}cartera/sicex-cargue/validate/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error en validación');
    }

    const cantidad = response.data.data?.cantidad_registros ?? null;
    setCantidadRegistros(cantidad);

    // 🔐 Configurar confirmación personalizada
    setOnConfirmCreate(() => async () => {
      try {
        const createResponse = await axios.post(
          `${baseApiUrl}cartera/sicex-cargue/create/`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${valueSesion.user.tokens.access}`,
            },
          }
        );

        if (!createResponse.data.success) {
          throw new Error(createResponse.data.detail || 'Error al guardar');
        }

        setFormData(initialFormData);
        setCantidadRegistros(null);
        await buscarResumenSicex();

        setNotifText('Registro creado correctamente');
        setNotifOpen(true);
      } catch (error: any) {
        setNotifText(error?.response?.data?.detail || error.message);
        setNotifOpen(true);
      } finally {
        setIsLoading(false);
        setAlertOpen(false);
      }
    });

    setAlertOpen(true); // Mostrar alerta personalizada
  } catch (error: any) {
    console.error(error);
    setNotifText(error?.response?.data?.detail || error.message);
    setNotifOpen(true);
  }
};




const handleActualizarSicex = async ({
  editId,
  formData,
  setFormData,
  initialFormData,
  valueSesion,
  setEditId,
  setIsLoading,
  buscarResumenSicex,
  setNotifText,
  setNotifOpen
}: any) => {
  try {


    if (!formData.archivo) {
      setNotifText('Por favor cargue un archivo.');
      setNotifOpen(true);
      return;
    }

    const payload = new FormData();
    payload.append('fecha_inicio', formData.fecha_inicio);
    payload.append('fecha_fin', formData.fecha_fin);
    payload.append('tipo_cargue', formData.tipo_cargue);
    if (formData.archivo instanceof File) {
      payload.append('archivo', formData.archivo);
    }

    setIsLoading(true);

    const response = await axios.put(
      `${baseApiUrl}cartera/sicex-cargue/update/${editId}/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (response.data.success) {
      setFormData(initialFormData);
      setEditId(null);
      await buscarResumenSicex();

      setNotifText('Registro actualizado correctamente');
      setNotifOpen(true);
    }
  } catch (error: any) {
    console.error(error);
    setNotifText(error?.response?.data?.detail || 'No se pudo actualizar');
    setNotifOpen(true);
  } finally {
    setIsLoading(false);
  }
};


const obtenerTiposCargue = async ({
  setTiposCargue
}: {
  setTiposCargue: React.Dispatch<React.SetStateAction<any[]>>;
}): Promise<void> => {
  try {
    const response = await axios.get(`${baseApiUrl}choices/cod-tipo-cargue/`);
    if (response.data.success && Array.isArray(response.data.data)) {
      const opciones = response.data.data.map(([value, label]: [string, string]) => ({
        key: value,
        value: value,
        title: label
      }));
      setTiposCargue(opciones);
    } else {
      throw new Error('Respuesta inesperada del servidor');
    }
  } catch (error) {
    console.error('Error al obtener tipos de cargue:', error);
  }
};

export {
  obtenerTiposCargue,
  handleCrearSicex,
  handleActualizarSicex,
  handleDownloadExcel,
  obtenerMunicipios,
  buscarResumenSicex,
  handleCrearPersonaTemporal,
  handleActualizarPersonaTemporal,
  fetchAllResumenSicexExcel,
  obtenerDepartamentos,

};