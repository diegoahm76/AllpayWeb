import axios from 'axios';
import { TableroControlSicexPosParams, TableroControlSicexPosResponse } from '../models/tableroControlSicexPos.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/api/'

export const obtenerTableroControlSicexPos = async (
  token: string,
  params: TableroControlSicexPosParams
): Promise<TableroControlSicexPosResponse> => {
  try {
    const queryParams = {
      fecha_inicio: params.fecha_inicio,
      fecha_fin: params.fecha_fin,
      ...(params.tipo_cargue && { tipo_cargue: params.tipo_cargue }),
      ...(params.comparativo_periodos && { comparativo_periodos: params.comparativo_periodos })
    };

    const url = `${baseApiUrl}reportes/tablero-control-sicex-pos/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: queryParams
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos');
    }

    return response.data as TableroControlSicexPosResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroControlSicexPos error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.detail || 'No se pudo obtener el tablero por posición');
    }
    throw new Error('Error inesperado al obtener el tablero por posición');
  }
}; 