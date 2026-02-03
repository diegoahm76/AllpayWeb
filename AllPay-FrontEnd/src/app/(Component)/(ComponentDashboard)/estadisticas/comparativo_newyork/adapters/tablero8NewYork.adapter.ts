import axios from 'axios';
import { Tablero8NewYorkResponse, Tablero8NewYorkParams } from '../models/tablero8NewYork.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTablero8NewYork = async (
  token: string,
  params: Tablero8NewYorkParams
): Promise<Tablero8NewYorkResponse> => {
  try {
    const url = `${baseApiUrl}reportes/tablero8/`;

    const response = await axios.get(url, {
      params: {
        fecha_inicio_periodo_1: params.fecha_inicio_periodo_1,
        fecha_fin_periodo_1: params.fecha_fin_periodo_1,
        fecha_inicio_periodo_2: params.fecha_inicio_periodo_2,
        fecha_fin_periodo_2: params.fecha_fin_periodo_2
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos del Tablero 8 de New York');
    }

    return response.data as Tablero8NewYorkResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTablero8NewYork error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(
        error.response?.data?.detail || 
        'No se pudo obtener los datos del Tablero 8 de New York'
      );
    }
    throw new Error('Error inesperado al obtener el Tablero 8 de New York');
  }
};
