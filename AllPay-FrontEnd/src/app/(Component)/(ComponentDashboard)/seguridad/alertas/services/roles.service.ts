import axios from 'axios';
// import Swal from 'sweetalert2';
// import { PermisoData, Rol } from '../interfaces/types';
const baseApiUrl = process.env.BASE_API_URL;

const marcarTodasComoLeidas = async ({
  idBandeja,
  valueSesion
}: {
  idBandeja: number;
  valueSesion: any;
}): Promise<void> => {
  try {
    const response = await axios.put(
      `${baseApiUrl}alertas/marcar-alertas-como-leidas/`,
      {
        marcar_todos: true,
        pk: idBandeja
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      }
    );

    if (!response.data.success) {
      throw response.data.detail;
    }
  } catch (error) {
    console.error('Error al marcar todas las alertas como leídas:', error);
  }
};

  const marcarAlertaComoLeida = async ({
  pk,
  valueSesion
}: {
  pk: number;
  valueSesion: any;
}): Promise<void> => {
  try {
    const response = await axios.put(
      `${baseApiUrl}alertas/marcar-alertas-como-leidas/`,
      {
        marcar_todos: false,
        pk
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      }
    );

    if (!response.data.success) {
      throw response.data.detail;
    }
  } catch (error) {
    console.error('Error al marcar alerta como leída:', error);
  }
};

const getAlertasByBandejaPaginated = async ({
  idBandeja,
  valueSesion,
  leido,                    // 'all' | 'read' | 'unread'
}: {
  idBandeja: number;
  valueSesion: any;
  leido?: 'all' | 'read' | 'unread';
}): Promise<{ data: any[]; total_pages: number }> => {
  try {
    const params = new URLSearchParams();

    // convierte 'read'/'unread' en el query param "leidos"
    if (leido === 'read') {
      params.set('leidos', 'True');
    } else if (leido === 'unread') {
      params.set('leidos', 'False');
    }
    // si es 'all' o undefined, no agrega nada

    // construye la URL con o sin params según corresponda
    const queryString = params.toString();
    const url = `${process.env.BASE_API_URL}alertas/get-alertas-by-bandeja/${idBandeja}/` +
                (queryString ? `?${queryString}` : '');

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.detail);
    }

    return {
      data: response.data.data,
      total_pages: response.data.total_pages || 1,
    };
  } catch (error) {
    console.error('Error al obtener alertas paginadas:', error);
    return { data: [], total_pages: 1 };
  }
};

 interface GetAlertasByBandejaOptions {
  idBandeja: number;
  valueSesion: any;
  page?: number;
  leido?: 'read' | 'unread';
}
const getAlertasByBandeja = async ({
  idBandeja,
  valueSesion,
  page,
  leido,
}: GetAlertasByBandejaOptions): Promise<{
  data: any[];
  total_pages: number;
}> => {
  const params: Record<string, any> = {};

  // Solo agregar page si es distinto de 1
  if (page !== undefined && page !== 1) {
    params.page = page;
  }

  if (leido === 'read') {
    params.leido = true;
  } else if (leido === 'unread') {
    params.leido = false;
  }

  const response = await axios.get(
    `${baseApiUrl}alertas/get-alertas-by-bandeja/${idBandeja}/`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
      params,
    }
  );

  if (response.data.success === false) {
    throw new Error(response.data.detail);
  }

  return {
    data: response.data.data,
    total_pages: response.data.total_pages ?? 1,
  };
};


export {
  getAlertasByBandeja , 
  getAlertasByBandejaPaginated, 
  marcarAlertaComoLeida, 
  marcarTodasComoLeidas, 

};