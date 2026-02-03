import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

import { InvoiceDetail, ApiResponse } from '@/domain/models/recaudadores/invoice.details.model';

const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Fecha inválida:', dateString);
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return '';
    }
};

export const getInvoiceDetails = async (token: string, id: string): Promise<ApiResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}recaudos/factura-detalles/${id}/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error('La respuesta del servidor no fue exitosa');
        }
        // Formatear las fechas en la respuesta
        const formattedData = response.data.data.map((item: InvoiceDetail) => ({
            ...item,
            recaudador_info: {
                ...item.recaudador_info,
                fecha_compra: formatDate(item.recaudador_info.fecha_compra),
                fecha_registro: formatDate(item.recaudador_info.fecha_registro)
            }
        }));

        return {
            ...response.data,
            data: formattedData
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener detalles de la factura: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
};

