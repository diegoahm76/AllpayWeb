import axios from 'axios';
// import Swal from 'sweetalert2';
// import { PermisoData, Rol } from '../interfaces/types';
const baseApiUrl = process.env.BASE_API_URL;


const getClasesAlertas = async (valueSesion: any) => {
  if (!valueSesion?.user?.tokens?.access) {
    throw new Error('Token de acceso no disponible');
  }

  const url = `${baseApiUrl}alertas/configuracion-clase-alerta/`;

  try {
    
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`
      },
      timeout: 10000 // 10 segundos de timeout
    });


    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al obtener clases de alerta');
    }

    if (!Array.isArray(response.data.data)) {
      throw new Error('La respuesta no contiene un array válido de clases de alerta');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('Error en getClasesAlertas:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tiempo de espera agotado. Verifique su conexión a internet.');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Token de acceso expirado. Por favor, inicie sesión nuevamente.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para acceder a esta información.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Error del servidor. Intente nuevamente en unos momentos.');
    }
    
    // Manejar errores 404 y otros que pueden tener detail en el JSON
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    
    // Si no hay detail específico, usar el mensaje de error genérico
    throw new Error(error.message || 'Error desconocido al obtener clases de alerta');
  }
};
const getPersonasAlertar = async (codigoClase: string, token: string) => {
  const response = await axios.get(`${baseApiUrl}alertas/personas-a-alertar/${codigoClase}/`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.detail || 'Error desconocido al obtener personas a alertar');
  }

  return response.data.data;
};

const getPersonasAlertarPaginated = async ({
  codClaseAlerta,
  valueSesion,
  page = 1
}: {
  codClaseAlerta: string;
  valueSesion: any;
  page?: number;
}): Promise<{ data: any[]; total_pages: number }> => {
  try {
    const response = await axios.get(
      `${baseApiUrl}alertas/personas-a-alertar/${codClaseAlerta}/?page=${page}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      }
    );

    if (!response.data.success) throw response.data.detail;

    return {
      data: response.data.data,
      total_pages: response.data.total_pages || 1
    };
  } catch (error) {
    console.error('Error al obtener personas a alertar paginadas:', error);
    return { data: [], total_pages: 1 };
  }
};

const agregarPersonaAlertar = async ({
  valueSesion,
  id_persona,
  cod_clase_alerta,
  perfil_sistema
}: {
  valueSesion: any;
  id_persona: number;
  cod_clase_alerta: string;
  perfil_sistema: string;
}) => {
  const url = `${baseApiUrl}alertas/personas-a-alertar/`;

  const body = {
    id_persona,
    cod_clase_alerta,
    perfil_sistema
  };

  const response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${valueSesion.user.tokens.access}`
    }
  });

  return response.data;
};
const guardarPersonaAlertar = async ({
  perfil_sistema,
  cod_clase_alerta,
  id_persona,
  valueSesion
}: {
  perfil_sistema: string;
  cod_clase_alerta: string;
  id_persona: any;
  valueSesion: any;
}) => {
  const response = await axios.post(
    `${process.env.BASE_API_URL}alertas/personas-a-alertar/`,
    {
      perfil_sistema,
      cod_clase_alerta,
      id_persona
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`
      }
    }
  );
  if (!response.data.success) throw response.data.detail;
  return response.data;
};
const getPerfilesSistema = async (valueSesion: any) => {
  const response = await axios.get(`${process.env.BASE_API_URL}choices/tipo-perfil/`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${valueSesion.user.tokens.access}`
    }
  });
  if (!response.data.success) throw response.data.detail;
  return response.data.data;
};


const eliminarPersonaAlertar = async (id_persona_alertar: number, valueSesion: any) => {
  try {
    const response = await axios.delete(
      `${process.env.BASE_API_URL}alertas/personas-a-alertar/${id_persona_alertar}/`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      }
    );

    if (!response.data.success) throw response.data.detail;
    return response.data;
  } catch (error) {
    console.error('Error al eliminar persona a alertar:', error);
    throw error;
  }
};
const getNivelesPrioridad = async (valueSesion: any) => {
  const response = await axios.get(`${process.env.BASE_API_URL}choices/nivel-prioridad/`, {
    headers: {
      Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.data.success) throw new Error(response.data.detail);
  return response.data.data;
};
const putActualizarClaseAlerta = async ({
  codClaseAlerta,
  data,
  valueSesion
}: {
  codClaseAlerta: string;
  data: {
    nivel_prioridad: string;
    activa: boolean;
    envios_email: boolean;
  };
  valueSesion: any;
}) => {
  const url = `${process.env.BASE_API_URL}alertas/configuracion-clase-alerta/${codClaseAlerta}/`;

  const response = await axios.put(url, data, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${valueSesion.user.tokens.access}`
    }
  });

  if (!response.data.success) throw new Error(response.data.detail);
  return response.data;
};


const postFechaClaseAlerta = async ({
  cod_clase_alerta,
  dia_cumplimiento,
  mes_cumplimiento,
  age_cumplimiento,
  valueSesion
}: {
  cod_clase_alerta: string;
  dia_cumplimiento: number;
  mes_cumplimiento: number;
  age_cumplimiento: number | null;
  valueSesion: any;
}) => {
  const response = await axios.post(
    `${process.env.BASE_API_URL}alertas/fecha-clase-alerta/`,
    {
      cod_clase_alerta,
      dia_cumplimiento,
      mes_cumplimiento,
      age_cumplimiento
    },
    {
      headers: {
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.data.success) throw new Error(response.data.detail);
  return response.data;
};


const getFechasClaseAlerta = async ({
  codClaseAlerta,
  accessToken
}: {
  codClaseAlerta: string;
  accessToken: string;
}) => {
  const url = `${process.env.BASE_API_URL}alertas/fecha-clase-alerta/${codClaseAlerta}/`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.data.success) throw new Error(response.data.detail);
  return response.data.data;
};

const deleteFechaClaseAlerta = async ({
  idFecha,
  accessToken
}: {
  idFecha: number;
  accessToken: string;
}) => {
  const url = `${process.env.BASE_API_URL}alertas/fecha-clase-alerta/${idFecha}/`;
  const response = await axios.delete(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.data.success) throw new Error(response.data.detail);
  return response.data;
};
export {
  getClasesAlertas,
  agregarPersonaAlertar,
  getPersonasAlertar,
  getPersonasAlertarPaginated,
  guardarPersonaAlertar,
  getPerfilesSistema,
  eliminarPersonaAlertar,
  getNivelesPrioridad,
  putActualizarClaseAlerta,
  postFechaClaseAlerta,
  getFechasClaseAlerta,
  deleteFechaClaseAlerta,
  
};