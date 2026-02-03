import axios from 'axios';
import { 
    RegistroNoComprasResponse,
    CreateRegistroNoComprasPayload,
    CreateRegistroNoComprasResponse,
    GetRegistroNoComprasByIdResponse,
    UpdateRegistroNoComprasPayload,
    UpdateRegistroNoComprasResponse
} from '../models/registroNoCompras.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface GetRegistroNoComprasParams {
    page?: number;
    page_size?: number;
    sin_paginacion?: boolean;
    id_recaudador?: number;
}

export const getRegistroNoCompras = async (
    token: string,
    params?: GetRegistroNoComprasParams
): Promise<RegistroNoComprasResponse> => {
    try {
        // Construir query params
        const queryParams = new URLSearchParams();
        if (params?.sin_paginacion) {
            queryParams.append('sin_paginacion', 'true');
        } else {
            if (params?.page) {
                queryParams.append('page', params.page.toString());
            }
            if (params?.page_size) {
                queryParams.append('page_size', params.page_size.toString());
            }
        }
        // Agregar id_recaudador si está presente
        if (params?.id_recaudador) {
            queryParams.append('id_recaudador', params.id_recaudador.toString());
        }

        const url = `${baseApiUrl}recaudos/registro-no-compras/list/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            return {
                success: false,
                detail: response.data.detail || 'Error al obtener registros de no compras',
                data: [],
                total_pages: 0
            };
        }

        // Asegurar que data sea un array
        const responseData = response.data;
        let dataArray: any[] = [];
        
        if (Array.isArray(responseData.data)) {
            dataArray = responseData.data;
        } else if (responseData.data?.data && Array.isArray(responseData.data.data)) {
            // Manejar estructura anidada
            dataArray = responseData.data.data;
        } else if (Array.isArray(responseData)) {
            // Si la respuesta es directamente un array
            dataArray = responseData;
        }

        return {
            success: responseData.success !== false,
            detail: responseData.detail || 'Registros obtenidos correctamente',
            data: dataArray,
            total_pages: responseData.total_pages || (params?.sin_paginacion ? 1 : Math.ceil(dataArray.length / (params?.page_size || 10))),
            current_page: responseData.current_page || params?.page || 1,
            page_size: responseData.page_size || params?.page_size || 10,
            total_count: responseData.total_count || dataArray.length
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getRegistroNoCompras:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener registros de no compras: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener registros de no compras');
    }
};

export const createRegistroNoCompras = async (
    token: string,
    payload: CreateRegistroNoComprasPayload
): Promise<CreateRegistroNoComprasResponse> => {
    try {
        // Crear FormData para enviar archivos
        const formData = new FormData();
        
        // Agregar campos al FormData
        formData.append('descripcion', payload.descripcion);
        formData.append('id_recaudador', payload.id_recaudador.toString());
        
        // Agregar archivo si existe
        if (payload.doc_soporte) {
            formData.append('doc_soporte', payload.doc_soporte);
        }

        const response = await axios.post<CreateRegistroNoComprasResponse>(
            `${baseApiUrl}recaudos/registro-no-compras/create/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al crear el registro de no compras');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en createRegistroNoCompras:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al crear registro de no compras: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al crear registro de no compras');
    }
};

export const getRegistroNoComprasById = async (
    token: string,
    id: number
): Promise<GetRegistroNoComprasByIdResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}recaudos/registro-no-compras/get/${id}/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al obtener el registro de no compras');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getRegistroNoComprasById:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener registro de no compras: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener registro de no compras');
    }
};

export const updateRegistroNoCompras = async (
    token: string,
    id: number,
    payload: UpdateRegistroNoComprasPayload
): Promise<UpdateRegistroNoComprasResponse> => {
    try {
        // Crear FormData para enviar archivos
        const formData = new FormData();
        
        // Agregar campos al FormData
        formData.append('descripcion', payload.descripcion);
        formData.append('id_recaudador', payload.id_recaudador.toString());
        
        // Agregar archivo si existe
        if (payload.doc_soporte) {
            formData.append('doc_soporte', payload.doc_soporte);
        }

        const response = await axios.put<UpdateRegistroNoComprasResponse>(
            `${baseApiUrl}recaudos/registro-no-compras/update/${id}/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al actualizar el registro de no compras');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en updateRegistroNoCompras:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al actualizar registro de no compras: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al actualizar registro de no compras');
    }
};

