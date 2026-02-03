import axios from 'axios';
import { CreateMassiveInvoiceResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/models/invoice.createMasive.model'

const baseApiUrl = process.env.BASE_API_URL;

export const createMassiveInvoiceExternal = async (
    formData: FormData,
    token: string
): Promise<CreateMassiveInvoiceResponse> => {
    try {
        const response = await axios.post(
            `${baseApiUrl}recaudos/factura-unica-cargue-masivo-externo/create/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            return response.data;
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.data) {
                return {
                    success: false,
                    detail: error.response.data.detail || 'Error al procesar el archivo, por favor revise la estructura del archivo',
                    facturas_creadas: [],
                    errores: error.response.data.errores || []
                };
            }

            return {
                success: false,
                detail: 'Error al procesar el archivo. Por favor, intente nuevamente.',
                facturas_creadas: [],
                errores: []
            };
        }

        return {
            success: false,
            detail: 'Error inesperado al procesar el archivo.',
            facturas_creadas: [],
            errores: []
        };
    }
};
