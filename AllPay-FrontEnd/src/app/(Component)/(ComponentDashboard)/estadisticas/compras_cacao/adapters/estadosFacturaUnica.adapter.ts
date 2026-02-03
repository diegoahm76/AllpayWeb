import axios from 'axios';
import { EstadosFacturaUnicaResponse, EstadosFacturaUnicaRawData, EstadoFacturaUnica } from '../models/estadosFacturaUnica.model';

const baseApiUrl = process.env.BASE_API_URL; // Debe terminar con '/apii/'

export const obtenerEstadosFacturaUnica = async (token: string): Promise<EstadosFacturaUnicaResponse> => {
  try {
    const url = `${baseApiUrl}choices/cod-estado-factura-unica/`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.data?.success) {
      throw new Error(response.data?.detail || 'Error al obtener los estados de factura única');
    }

    // Debug: Log para ver la respuesta del API
    
    // Transformar el array de arrays a un array de objetos
    const rawData: EstadosFacturaUnicaRawData = response.data.data;
    
    const estadosTransformados: EstadoFacturaUnica[] = rawData.map(([codigo, nombre]) => ({
      codigo,
      nombre
    }));
    

    // Retornar la respuesta transformada
    return {
      success: response.data.success,
      detail: response.data.detail,
      data: estadosTransformados
    };

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Adapter obtenerEstadosFacturaUnica error:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.detail || 'No se pudieron obtener los estados de factura única');
    }
    throw new Error('Error inesperado al obtener los estados de factura única');
  }
};
