import axios from 'axios';
import { TableroControlPromedioResponse, TableroControlPromedioParams } from '../models/tableroControlPromedio.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/apii/'

export const obtenerTableroControlPromedio = async (
  token: string,
  params: TableroControlPromedioParams
): Promise<TableroControlPromedioResponse> => {
  try {
    const queryParams = {
      fecha_inicio_periodo_1: params.fecha_inicio_periodo_1,
      fecha_fin_periodo_1: params.fecha_fin_periodo_1,
      fecha_inicio_periodo_2: params.fecha_inicio_periodo_2,
      fecha_fin_periodo_2: params.fecha_fin_periodo_2,
    };

    const url = `${baseApiUrl}reportes/tablero-control-promedio/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: queryParams
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos del tablero de control de promedio');
    }

    return response.data as TableroControlPromedioResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroControlPromedio error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.detail || 'No se pudo obtener el tablero de control de promedio');
    }
    throw new Error('Error inesperado al obtener el tablero de control de promedio');
  }
};
