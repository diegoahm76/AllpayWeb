import axios from 'axios';
import { TableroControlEstimadosResponse, TableroControlEstimadosParams } from '../models/tableroControlEstimados.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroControlEstimados = async (
  token: string,
  params: TableroControlEstimadosParams
): Promise<TableroControlEstimadosResponse> => {
  try {
    const url = `${baseApiUrl}reportes/tablero-control-estimados/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: {
        fecha_inicio_periodo_1: params.fecha_inicio_periodo_1,
        fecha_fin_periodo_1: params.fecha_fin_periodo_1,
        fecha_inicio_periodo_2: params.fecha_inicio_periodo_2,
        fecha_fin_periodo_2: params.fecha_fin_periodo_2,
        calcular_variacion: params.calcular_variacion
      }
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos del tablero de control estimados');
    }

    return response.data as TableroControlEstimadosResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroControlEstimados error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(
        error.response?.data?.detail || 
        'No se pudo obtener los datos del tablero de control estimados'
      );
    }
    throw new Error('Error inesperado al obtener el tablero de control estimados');
  }
};
