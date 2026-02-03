import axios, { AxiosRequestConfig } from 'axios';
import { CuotasPagadasApiResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar_pagadas/models/CuotasPagadasTypes';

const getBaseApiUrl = (): string => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const getRequestConfig = (token: string): AxiosRequestConfig => ({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  timeout: 10000
});

export const getCuotasPagadasInterno = async (
  token: string,
  filtros: {
    nro_plan_pago?: string;
    nro_solicitud?: string;
    fecha_pago_desde?: string;
    fecha_pago_hasta?: string;
  } = {}
): Promise<CuotasPagadasApiResponse> => {
  try {
    if (!token) throw new Error('Token no proporcionado');
    const baseApiUrl = getBaseApiUrl();
    const url = `${baseApiUrl}recaudos/acuerdos-pago/interno/consultar-cuotas-pagadas/`;
    const config = {
      ...getRequestConfig(token),
      params: filtros, // <-- aquí pasas los filtros como params
    };
    const response = await axios.get<CuotasPagadasApiResponse>(url, config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || error.message);
    }
    throw error;
  }
}; 