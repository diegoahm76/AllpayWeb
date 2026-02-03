import axios from 'axios';
import { ComprasTotalesResponse } from '../models/compras-totales.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getComprasTotales = async (
    token: string,
    searchParams?: {
        id_departamento_cacao?: string;
        id_municipio_cacao?: string;
        nro_documento_soporte?: string;
        nro_factura_unica?: number;
        fecha_desde?: string;
        fecha_hasta?: string;
        ids_recaudador?: string;
        [key: string]: any;
    }
): Promise<ComprasTotalesResponse> => {
    try {
        const params: any = {
            ...searchParams
        };

        const response = await axios.get(`${baseApiUrl}recaudos/compras-totales/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los totales de compras');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getComprasTotales:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener los totales de compras');
        }
        throw new Error('Error inesperado al obtener los totales de compras');
    }
};
