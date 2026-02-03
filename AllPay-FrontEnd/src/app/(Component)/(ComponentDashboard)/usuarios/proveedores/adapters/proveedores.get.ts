import axios from 'axios';
import {
    ProveedoresFilters,
    ProveedoresMappedResponse,
    ProveedoresResponseApi,
    mapProveedorFromApi
} from '../models/proveedor.model';

const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[proveedores.get] - BASE_API_URL no configurada');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const getProveedores = async (
    token: string,
    params?: ProveedoresFilters
): Promise<ProveedoresMappedResponse> => {
    const url = `${baseApiUrl}personas/proveedores/`;

    try {
        const response = await axios.get<ProveedoresResponseApi>(url, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            params: {
                page: params?.page ?? 1,
                page_size: params?.page_size ?? 10,
                search: params?.search,
                numero_documento: params?.numero_documento,
                cod_tipo_documento: params?.cod_tipo_documento,
                tipo_persona: params?.tipo_persona,
                nombre: params?.nombre,
                apellido: params?.apellido,
                razon_social: params?.razon_social
            }
        });

        const payload = response.data;

        return {
            success: payload.success,
            count: payload.count,
            total_pages: payload.total_pages,
            current_page: payload.current_page,
            next: payload.next,
            previous: payload.previous,
            data: (payload.data || []).map(mapProveedorFromApi)
        };
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status ?? 'NA';
            const detail =
                (error.response?.data as any)?.detail ||
                (error.response?.data as any)?.message ||
                error.message;
            throw new Error(`Error al obtener proveedores (${status}): ${detail}`);
        }
        throw error;
    }
};


