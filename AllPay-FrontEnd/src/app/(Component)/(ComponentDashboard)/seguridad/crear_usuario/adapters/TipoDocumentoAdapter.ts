import axios from 'axios';
import { TipoDocumentoResponse } from '@/app/(Component)/(ComponentDashboard)/seguridad/crear_usuario/models/TipoDocumentoModel';

const baseApiUrl = process.env.BASE_API_URL;

export class TipoDocumentoAdapter {
    
    async getTiposDocumento(): Promise<TipoDocumentoResponse> {
        try {
            const response = await axios.get(
                `${baseApiUrl}personas/tipos-documento/get-list-register/?activo=True`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw new Error('Error al obtener los tipos de documento');
        }
    }
} 