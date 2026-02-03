import axios, { AxiosRequestConfig } from 'axios';
import { RecaudadorCuotaPseResponse } from '../models/RecaudadorCuotaPseTypes';

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

export const getRecaudadorCuotaPse = async (
  token: string,
  id_plan_pago: number,
  nro_cuota: number
): Promise<RecaudadorCuotaPseResponse> => {
  try {
    if (!token) throw new Error('Token no proporcionado');
    const baseApiUrl = getBaseApiUrl();
    const url = `${baseApiUrl}recaudos/acuerdos-pago/externo-pago/info-recaudador-cuota-pse/?id_plan_pago=${id_plan_pago}&nro_cuota=${nro_cuota}`;
    const config = getRequestConfig(token);
    const response = await axios.get<RecaudadorCuotaPseResponse>(url, config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || error.message);
    }
    throw error;
  }
}; 