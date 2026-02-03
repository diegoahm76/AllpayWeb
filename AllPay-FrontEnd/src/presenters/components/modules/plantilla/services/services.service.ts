import axios from 'axios';
import Swal from 'sweetalert2';
import { isTokenExpiredError, showSessionExpiredAlert } from '@/utils/sessionExpiredHandler';
const baseApiUrl = process.env.BASE_API_URL;


const obtenerPlantillas = async ({
  setPlantillas,
  setPlantillasData,
  valueSesion,
}: {
  setPlantillas: (data: any) => void;
  setPlantillasData: (data: any) => void;
  valueSesion: any;
}): Promise<void> => {
  try {

    if (!valueSesion || !valueSesion.user || !valueSesion.user.tokens?.access) {
      throw new Error('Sesión de usuario no disponible');  
    }
    
    const response = await axios
      .get(`${baseApiUrl}documentos/plantillas_documentos/get/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user?.tokens?.access}`,
        },
      })
      .catch((error) => error.response);

    if (response.data.success === false) {
      throw response.data.detail;
    }

    const fullData = response.data.data;
    const options = fullData.map((plantilla: any) => ({
      value: plantilla.id_plantilla_doc,
      label: plantilla.nombre,
    }));

    setPlantillas(options); // esto lo usás en el <AnimatedSelect>
    setPlantillasData(fullData); // esta es toda la info de cada plantilla
  } catch (error) {
    if (axios.isAxiosError(error) && isTokenExpiredError(error)) {
      showSessionExpiredAlert();
      throw new Error('Sesión expirada');
    }

    console.error('Error al obtener plantillas:', error);
  }
};

const obtenerUsuarioActual = async ({
  setAgregados,
  valueSesion,
  setIdPersonaAuto // 👈 se recibe como prop
}: {
  setAgregados: (callback: (prev: any[]) => any[]) => void;
  valueSesion: any;
  setIdPersonaAuto: (id: number) => void; // 👈 nuevo parámetro
}): Promise<void> => {
  try {
    const response = await axios.get(`${baseApiUrl}users/profile/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`
      }
    });

    const usuario = response.data;
    const persona = usuario.persona;

    const personaAgregada = {
      id_persona: persona.id_persona,
      tipo_documento: persona.tipo_documento,
      numero_documento: persona.numero_documento,
      nombres: `${persona.primer_nombre} ${persona.segundo_nombre ?? ''}`.trim(),
      apellidos: `${persona.primer_apellido} ${persona.segundo_apellido ?? ''}`.trim(),
      firma: true,
      puede_reasignar: true
    };

    setAgregados((prev: { id_persona: any }[]) => {
      const yaExiste = prev.some((p) => p.id_persona === personaAgregada.id_persona);
      return yaExiste ? prev : [...prev, personaAgregada];
    });

    setIdPersonaAuto(persona.id_persona); // 👈 importante: guardar el ID auto
  } catch (error) {
    if (axios.isAxiosError(error) && isTokenExpiredError(error)) {
      showSessionExpiredAlert();
      throw new Error('Sesión expirada');
    }

    console.error('Error al obtener el usuario actual:', error);
  }
};

const generarDocumento = async ({
  buildPayload,
  formData,
  idDocumentoGenerado,
  setIdDocumentoGenerado,
  setFile,
  setPlantillaSeleccionada,
  valueSesion,
}: {
  buildPayload: () => any;
  formData: any;
  idDocumentoGenerado: number | null;
  setIdDocumentoGenerado: (id: number) => void;
  setFile: (url: string) => void;
  setPlantillaSeleccionada: (prev: any) => void;
  valueSesion: any;
}): Promise<void> => {
  try {
    const dataFinal = buildPayload();
    if (!dataFinal) return;

    let payloadToSend;

    if (idDocumentoGenerado) {
      payloadToSend = {
        variable: 'A',
        ...(formData?.radicado ? { consecutivo: formData.radicado } : {}),
        id_documento_generado: idDocumentoGenerado,
        variables: dataFinal?.variables
      };

    } else {
      payloadToSend = dataFinal;
    }

    const response = await axios
      .post(`${baseApiUrl}documentos/generador_documentos/`, payloadToSend, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      })
      .catch((error) => error.response);

    if (!response?.data?.success) {
      throw response?.data?.detail || 'Error en la respuesta del servidor';
    }

    const data = response.data.data;

    setIdDocumentoGenerado(data.id_documento_generado);

    if (data?.ruta_documento) {
      setFile(data.ruta_documento);
    }

    if (data?.variables_por_llenar) {
      setPlantillaSeleccionada((prev: any) => ({
        ...prev,
        variables: data.variables_por_llenar,
      }));
    }
  } catch (error) {
    console.error('Error al generar el borrador:', error);
  }
};




const obtenerPersonasFirma = async ({
  formData,
  setPersonasFirma,
  valueSesion,
}: {
  formData: any;
  setPersonasFirma: (data: any) => void;
  valueSesion: any;
}): Promise<void> => {
  try {
    const response = await axios
      .get(
        `${baseApiUrl}personas/persona-firma-documento/?nro_documento=${formData?.numerodocumento}&tipo_documento=${formData?.tipodocumento}&primer_nombre=${formData?.nombre}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`,
          },
        }
      )
      .catch((error) => error.response);

    if (!response?.data?.success) {
      throw response?.data?.detail || 'Error en la respuesta del servidor';
    }

    setPersonasFirma(response.data.data);
  } catch (error) {
    if (axios.isAxiosError(error) && isTokenExpiredError(error)) {
      showSessionExpiredAlert();
      throw new Error('Sesión expirada');
    }

    console.error('Error al obtener personas firma:', error);
  }
};


const handleArchivoChange = async ({
  e,
  idPlantillaDoc,
  idDocumentoGenerado,
  setFile,
  setIdDocumentoGenerado,
  setPlantillaSeleccionada,
  valueSesion,
}: {
  e: React.ChangeEvent<HTMLInputElement>;
  idPlantillaDoc: number | null;
  idDocumentoGenerado: number | null;
  setFile: (url: string) => void;
  setIdDocumentoGenerado: (id: number) => void;
  setPlantillaSeleccionada: (prev: any) => void;
  valueSesion: any;
}): Promise<void> => {
  const file = e.target.files?.[0];
  if (!file || !idPlantillaDoc) {
    await Swal.fire({
      icon: 'warning',
      title: 'Faltan datos',
      text: 'Selecciona una plantilla y un archivo',
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
    return;
  }

  const formData = new FormData();
  formData.append('id_plantilla_doc', idPlantillaDoc.toString());
  formData.append('documento_generado', file);
  if (idDocumentoGenerado) {
    formData.append('id_documento_generado', idDocumentoGenerado.toString());
  }

  try {
    const response = await axios
      .post(`${baseApiUrl}documentos/generador_documentos/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      })
      .catch((error) => error.response);

    if (!response?.data?.success) {
      throw response?.data?.detail || 'Error al cargar documento';
    }

    const data = response.data.data;

    setFile(data.ruta_documento);
    setIdDocumentoGenerado(data.id_documento_generado);
    setPlantillaSeleccionada((prev: any) => ({
      ...prev,
      variables: data.variables_por_llenar || [],
    }));

    await Swal.fire({
      icon: 'success',
      title: 'Documento cargado',
      text: 'Documento cargado con éxito',
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
  } catch (error) {
    console.error('Error al cargar documento:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cargar el documento',
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


 const obtenerTiposDocumento = async ({
  setDocumentTypes,
  valueSesion,
}: {
  setDocumentTypes: (data: any) => void;
  valueSesion: any;
}): Promise<void> => {
  try {
    const response = await axios
      .get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        },
      })
      .catch((error) => error.response);

    if (!response?.data?.success) {
      throw response?.data?.detail || 'Error en la respuesta del servidor';
    }

    setDocumentTypes(response.data.data);
  } catch (error) {
    console.error('Error al obtener tipos de documento:', error);
  }
};

const handleVerificarCodigo = async ({
  codigo,
  idVerificacion2FA,
  idDocumentoGenerado,
  token,
  setFile // 👈 nuevo parámetro
}: {
  codigo: string;
  idVerificacion2FA: any;
  idDocumentoGenerado: number | null;
  token: string;
  setFile: (url: string) => void; // 👈 tipo esperado
}): Promise<void> => {
  try {
    const response = await axios
      .put(
        `${baseApiUrl}users/verificar-codigo-segundo-facto-autenticacion/`,
        {
          codigo,
          id_verificacion_2fa: idVerificacion2FA,
          id_documento_generado: idDocumentoGenerado,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      .catch((error) => error.response);

    if (!response?.data?.success) {
      throw response?.data?.detail || 'Error al verificar el código.';
    }


    // ✅ Obtener la ruta del documento y asignarla
    const ruta = response.data?.data?.documento?.ruta_documento;
    if (ruta) {
      setFile(ruta);
    }

    await Swal.fire({
      icon: 'success',
      title: 'Código verificado',
      text: 'El código fue verificado correctamente.',
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
  } catch (error) {
    console.error('Error al verificar código:', error);

    const errorMessage =
      (error as any)?.response?.data?.detail || 'Ocurrió un error al verificar el código.';

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



const asignarDocumentos = async ({
  agregados,
  idDocumentoGenerado,
  valueSesion,
  idPersonaAuto,
  setIdAsignacionAuto
}: {
  agregados: {
    firma: boolean;
    puede_reasignar: boolean;
    id_persona: number;
  }[];
  idDocumentoGenerado: any;
  valueSesion: any;
  idPersonaAuto: number | null;
  setIdAsignacionAuto: (id: number) => void;
}): Promise<void> => {
  try {
    const peticiones = agregados.map((persona) => {
      const payload = {
        id_documento_generado: idDocumentoGenerado,
        firma: persona.firma,
        puede_reasignar: persona.puede_reasignar,
        id_persona_asignada: persona.id_persona
      };

      return axios
        .post(`${baseApiUrl}documentos/asignacion_documentos/`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        })
        .catch((error) => error.response); // atrapa errores por persona
    });

    const respuestas = await Promise.all(peticiones);

    // ✅ Buscar asignación para la persona auto
    const respuestaAuto = respuestas.find(
      (res) =>
        res?.data?.data?.id_persona_asignada === idPersonaAuto &&
        res?.data?.data?.id_asignacion_doc
    );

    if (respuestaAuto) {
      setIdAsignacionAuto(respuestaAuto.data.data.id_asignacion_doc);
    }

    // ⛔ Verifica errores y toma los detalles
    const errores = respuestas.filter((res) => !res?.data?.success);
    if (errores.length > 0) {
      const mensajes = errores
        .map((err) => err?.data?.detail)
        .filter(Boolean)
        .join('\n');

      throw new Error(mensajes || 'Una o más asignaciones fallaron.');
    }

    // ✅ Éxito
    await Swal.fire({
      icon: 'success',
      title: 'Asignación completada',
      text: 'Los documentos fueron asignados correctamente.',
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
  } catch (error: any) {
    console.error('Error al asignar documentos:', error);

    const errorMessage =
      error?.message || 'Ocurrió un error al asignar los documentos.';

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
        `
      },
      buttonsStyling: false
    });
  }
};




const finalizarDocumento = async ({
  idDocumentoGenerado,
  valueSesion,
  setFile
}: {
  idDocumentoGenerado: any;
  valueSesion: any;
  setFile: any;
}): Promise<void> => {
  const estiloBoton = `
    ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
    py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
    hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
    disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
    outline-none focus:outline-none
  `;

  try {
    const response = await axios.post(
      `${baseApiUrl}documentos/convert_word_to_pdf/`,
      { documento_generado: idDocumentoGenerado },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al finalizar el documento');
    }

    setFile(response.data.data.ruta_documento);

    await Swal.fire({
      icon: 'success',
      title: 'Documento finalizado',
      text: 'Se generó correctamente el PDF.',
      confirmButtonText: 'Aceptar',
      customClass: { confirmButton: estiloBoton },
      buttonsStyling: false
    });

  } catch (error: any) {
    console.error('Error en la conversión a PDF:', error);

    const errorMessage = error?.response?.data?.detail || error.message || 'Error al finalizar el documento';

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonText: 'Aceptar',
      customClass: { confirmButton: estiloBoton },
      buttonsStyling: false
    });

    throw error; // Si necesitas que el error suba a quien lo llama
  }
};


export {
  finalizarDocumento,
  obtenerUsuarioActual,
  obtenerPlantillas,
  generarDocumento,
  obtenerPersonasFirma,
  handleArchivoChange,
  obtenerTiposDocumento,
  handleVerificarCodigo,
  asignarDocumentos,

};