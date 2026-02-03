import axios from 'axios';
import { 
  DistribucionMensualResponse, 
  ParamsDistribucionMensual 
} from '../models/distribucion-mensual.models';

const baseApiUrl = process.env.BASE_API_URL;

export async function fetchDistribucionMensual(
  token: string, 
  params: ParamsDistribucionMensual
): Promise<DistribucionMensualResponse> {
  try {
    const response = await axios.get(
      `${baseApiUrl}reportes/api/tablero11/distribucion-mensual/`, 
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        params: {
          anio_actual: params.anio_actual,
          periodos_estadisticos: params.periodos_estadisticos
        }
      }
    );

    if (response.data.success === false) {
      throw new Error(response.data.detail || 'Error al obtener la distribución mensual');
    }

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {

      if (error.response?.status === 404) {
        throw new Error('No se encontró información de distribución mensual para el año especificado');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Error interno del servidor');
      }
    }
    
    throw new Error('No se pudo obtener la distribución mensual');
  }
}
