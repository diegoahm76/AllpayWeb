import axios from 'axios';
import { TableroMunicipiosResponse, TableroMunicipiosParams } from '../models/tableroMunicipios.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/apii/'

export const obtenerTableroMunicipios = async (
  token: string,
  params: TableroMunicipiosParams
): Promise<TableroMunicipiosResponse> => {
  try {
    // Filtrar solo los parámetros que tienen valor
    const queryParams: any = {};
    
    // El código del departamento es requerido
    queryParams.codigo_departamento = params.codigo_departamento;
    
    if (params.fecha_desde) queryParams.fecha_desde = params.fecha_desde;
    if (params.fecha_hasta) queryParams.fecha_hasta = params.fecha_hasta;

    const url = `${baseApiUrl}reportes/api/tablero9/municipios-por-departamento/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: queryParams
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Error al obtener datos del tablero de municipios');
    }

    // Devolver la respuesta completa del API
    return response.data as TableroMunicipiosResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroMunicipios error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.message || 'No se pudo obtener el tablero de municipios');
    }
    throw new Error('Error inesperado al obtener el tablero de municipios');
  }
};
