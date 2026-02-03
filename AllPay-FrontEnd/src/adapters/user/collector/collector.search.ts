import axios from 'axios';
import { SearchCollectorResponse, SearchCollectorFilters } from '@/domain/models/user/user.collector';

const baseApiUrl = process.env.BASE_API_URL;

export const searchCollectors = async (
    token: string,
    filters: SearchCollectorFilters,
    page: number = 1,
    pageSize: number = 10
): Promise<SearchCollectorResponse> => {
    try {
        const queryParams = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
            ...(filters.tipoDocumento && { cod_tipo_documento: filters.tipoDocumento }),
            ...(filters.documentoIdentificacion && { numero_documento: filters.documentoIdentificacion }),
            ...(filters.razonSocial && { nombres: filters.razonSocial }),
            ...(filters.departamento && { departamento: filters.departamento }),
            ...(filters.municipio && { municipio: filters.municipio }),
            ...(filters.fechaInicio && { fecha_inicio: filters.fechaInicio }),
            ...(filters.fechaFin && { fecha_fin: filters.fechaFin }),
            ...(filters.email && { email: filters.email }),
            ...(filters.direccion && { direccion_notificaciones: filters.direccion }),
            ...(filters.telefono && { celular_persona: filters.telefono }),
            ...(filters.nroFacturaUnica && { nro_factura_unica: filters.nroFacturaUnica })
        });

        const response = await axios.get(`${baseApiUrl}recaudos/get-recaudadores/?${queryParams.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error('La respuesta del servidor no fue exitosa');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al buscar recaudadores: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
}; 