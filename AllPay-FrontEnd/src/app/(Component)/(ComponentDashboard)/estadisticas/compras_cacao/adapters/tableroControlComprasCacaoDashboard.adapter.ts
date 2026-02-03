import axios from 'axios';
import { TableroControlComprasCacaoDashboardResponse, TableroControlComprasCacaoDashboardParams } from '../models/tableroControlComprasCacaoDashboard.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/apii/'

export const obtenerTableroControlComprasCacaoDashboard = async (
  token: string,
  params: TableroControlComprasCacaoDashboardParams
): Promise<TableroControlComprasCacaoDashboardResponse> => {
  try {
    // Filtrar solo los parámetros que tienen valor
    const queryParams: any = {};
    
    if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
    if (params.fecha_fin) queryParams.fecha_fin = params.fecha_fin;
    if (params.estado) queryParams.estado = params.estado;
    if (params.id_departamento) queryParams.id_departamento = params.id_departamento;
    if (params.id_municipio) queryParams.id_municipio = params.id_municipio;
    if (params.id_recaudador) queryParams.id_recaudador = params.id_recaudador;

    const url = `${baseApiUrl}reportes/tablero-control-compras-cacao/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: queryParams
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos del tablero de control de compras de cacao dashboard');
    }

    // La respuesta ya trae las tablas en la raíz del objeto
    return response.data as TableroControlComprasCacaoDashboardResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroControlComprasCacaoDashboard error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.detail || 'No se pudo obtener el tablero de control de compras de cacao dashboard');
    }
    throw new Error('Error inesperado al obtener el tablero de control de compras de cacao dashboard');
  }
};
