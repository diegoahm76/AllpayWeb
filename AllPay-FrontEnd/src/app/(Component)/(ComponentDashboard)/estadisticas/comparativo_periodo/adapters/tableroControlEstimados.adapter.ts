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
        fecha_inicio: params.fecha_inicio_periodo_1,
        fecha_fin: params.fecha_fin_periodo_1,
      }
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos del tablero de control estimados');
    }

    // Transformar la nueva respuesta al formato esperado por el componente
    const newData = response.data.data;
    const transformedData = {
      // Datos nuevos de la respuesta
      fecha_inicio: newData.fecha_inicio,
      fecha_fin: newData.fecha_fin,
      total_toneladas: newData.total_toneladas,
      total_cuota_fomento: newData.total_cuota_fomento,
      detalle_por_meses: newData.detalle_por_meses,
      
      // Mapear a la estructura existente para compatibilidad
      total_toneladas_periodo_1: newData.total_toneladas,
      total_cuota_periodo_1: newData.total_cuota_fomento,
      total_toneladas_periodo_2: 0, // No hay período 2 en la nueva respuesta
      total_cuota_periodo_2: 0,
      total_toneladas_variacion: 0,
      total_cuota_variacion: 0,
      total_porcentaje_ton_variacion: 0,
      total_toneladas_periodo_e: 0,
      total_cuota_periodo_e: 0,
      tabla_meses_periodo_1: newData.detalle_por_meses,
      tabla_meses_periodo_2: [],
      tabla_meses_variacion: [],
      tabla_meses_periodo_e: []
    };

    return {
      success: response.data.success,
      detail: response.data.detail,
      data: transformedData
    } as TableroControlEstimadosResponse;
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
