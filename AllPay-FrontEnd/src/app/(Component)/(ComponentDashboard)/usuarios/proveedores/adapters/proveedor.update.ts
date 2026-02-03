import axios from 'axios';
import {
    UpdateProveedorPayload,
    UpdateProveedorResponseApi,
    UpdateProveedorMappedResponse,
    mapProveedorFromApi
} from '../models/proveedor.model';

const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[proveedor.update] - BASE_API_URL no configurada');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const updateProveedor = async (
    token: string,
    idPersona: number | string,
    payload: UpdateProveedorPayload
): Promise<UpdateProveedorMappedResponse> => {
    const url = `${baseApiUrl}personas/proveedores/${idPersona}/update/`;

    try {
        const response = await axios.patch<UpdateProveedorResponseApi>(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        const data = response.data;

        return {
            success: data.success,
            detail: data.detail,
            data: mapProveedorFromApi(data.data)
        };
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status ?? 'NA';
            const detail =
                (error.response?.data as any)?.detail ||
                (error.response?.data as any)?.message ||
                error.message;
            throw new Error(`Error al actualizar proveedor (${status}): ${detail}`);
        }
        throw error;
    }
};


