import axios from 'axios';
import { WordToPdfResponse } from '@/domain/models/documento/wordToPdf.model';

const baseApiUrl = process.env.BASE_API_URL;

export const convertWordToPdf = async (token: string, documento_generado: number): Promise<WordToPdfResponse> => {
    try {
        const response = await axios.post<WordToPdfResponse>(
            `${baseApiUrl}documentos/convert_word_to_pdf/`,
            { documento_generado },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al convertir el documento a PDF');
        }
        throw new Error('Error desconocido al convertir el documento a PDF');
    }
};
