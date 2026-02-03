import axios from 'axios';
import { TableroControlComprasCacaoResponse, TableroControlComprasCacaoParams } from '../models/tableroControlComprasCacao.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/apii/'

export const obtenerTableroControlComprasCacao = async (
  token: string,
  params: TableroControlComprasCacaoParams
): Promise<TableroControlComprasCacaoResponse> => {
  try {
    // Filtrar solo los parámetros que tienen valor
    const queryParams: any = {};
    
    if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
    if (params.fecha_fin) queryParams.fecha_fin = params.fecha_fin;
    if (params.estado) queryParams.estado = params.estado;
    if (params.id_departamento) queryParams.id_departamento = params.id_departamento;
    if (params.id_municipio) queryParams.id_municipio = params.id_municipio;
    if (params.page) queryParams.page = params.page;
    if (params.page_size) queryParams.page_size = params.page_size;
    if (params.id_recaudador) queryParams.id_recaudador = params.id_recaudador;
    if (params.sin_paginacion) queryParams.sin_paginacion = params.sin_paginacion;

    const url = `${baseApiUrl}reportes/tablero-control-compras-cacao-tabla/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params: queryParams
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener datos del tablero de control de compras de cacao');
    }

    return response.data as TableroControlComprasCacaoResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerTableroControlComprasCacao error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.detail || 'No se pudo obtener el tablero de control de compras de cacao');
    }
    throw new Error('Error inesperado al obtener el tablero de control de compras de cacao');
  }
};
