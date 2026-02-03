import axios from 'axios';
import { CacaoIAAskRequest, CacaoIAAskResponse } from '@cacaoia/models';

const baseApiUrl = process.env.BASE_API_URL; // e.g. http://15.228.164.46/apii/

/**
 * Envía una pregunta al endpoint de IA y retorna la respuesta.
 * Usa Axios y sigue el patrón de otros adapters del proyecto.
 */
export async function cacaoIAAsk(
  payload: CacaoIAAskRequest,
  token?: string
): Promise<CacaoIAAskResponse> {
  try {
    const url = `${baseApiUrl}gpt/ask/`;

    const response = await axios.post<CacaoIAAskResponse>(
      url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      }
    );

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as Partial<CacaoIAAskResponse & { detail?: string }> | undefined;
      const message = data?.answer || data?.detail || error.message;
      throw new Error(`Error CacaoIA (${status ?? 'NA'}): ${message}`);
    }
    throw error as Error;
  }
}


