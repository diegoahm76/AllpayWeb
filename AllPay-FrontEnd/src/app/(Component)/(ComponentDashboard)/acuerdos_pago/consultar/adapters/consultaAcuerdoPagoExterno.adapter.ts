import axios from 'axios';
import { ConsultaAcuerdoPagoExternoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/consultaAcuerdoPagoExterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface ConsultaAcuerdoPagoExternoFilters {
  estado?: string;
  nro_solicitud?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export const getConsultaAcuerdoPagoExterno = async (
  token: string,
  page: number = 1,
  pageSize: number = 10,
  filters: ConsultaAcuerdoPagoExternoFilters = {}
): Promise<ConsultaAcuerdoPagoExternoResponse> => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.nro_solicitud) params.append('nro_solicitud', filters.nro_solicitud);
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

    const response = await axios.get<ConsultaAcuerdoPagoExternoResponse>(
      `${baseApiUrl}recaudos/acuerdos-pago/externo/consulta-acuerdo-pago/?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Error al consultar acuerdos de pago externo');
    }
    throw new Error('Error al consultar acuerdos de pago externo');
  }
}; 