import axios from 'axios';
import { TableroDepartamentosResponse, TableroDepartamentosParams } from '../models/tableroDepartamentos.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/apii/'

export const obtenerTableroDepartamentos = async (
  token: string,
  params: TableroDepartamentosParams
): Promise<TableroDepartamentosResponse> => {
  try {
    // Filtrar solo los parámetros que tienen valor
    const queryParams: any = {};
    
    if (params.fecha_desde) queryParams.fecha_desde = params.fecha_desde;
    if (params.fecha_hasta) queryParams.fecha_hasta = params.fecha_hasta;

    const url = `${baseApiUrl}reportes/api/tablero9/departamentos/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: queryParams
    });
    
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Error al obtener datos del tablero de departamentos');
    }

    // Devolver la respuesta completa del API
    return response.data as TableroDepartamentosResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroDepartamentos error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.message || 'No se pudo obtener el tablero de departamentos');
    }
    throw new Error('Error inesperado al obtener el tablero de departamentos');
  }
};
