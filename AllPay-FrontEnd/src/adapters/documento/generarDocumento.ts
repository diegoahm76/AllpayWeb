import axios from 'axios';
import { GeneradorDocumentoResponse, VariablesDocumento } from '@/domain/models/plantilla/generadorDocumento';

interface GenerarDocumentoParams {
    token: string;
    id_plantilla_doc: number;
    variables: VariablesDocumento;
    variable?: string;
    consecutivo?: boolean;
}

export const generarDocumento = async ({
    token,
    id_plantilla_doc,
    variables,
    variable = 'B',
    consecutivo = false
}: GenerarDocumentoParams): Promise<GeneradorDocumentoResponse> => {
    const baseApiUrl = process.env.BASE_API_URL;
    const url = `${baseApiUrl}documentos/generador_documentos/`;

    // Construir el cuerpo de forma condicional
    const data: Record<string, any> = {
        variable,
        id_plantilla_doc,
        variables
    };

    if (consecutivo) {
        data.consecutivo = true;
    }

    const response = await axios.post<GeneradorDocumentoResponse>(url, data, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
};
