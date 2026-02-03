import axios from 'axios';

export interface DetallesFactura {
    id_tipo_cacao: number;
    cantidad_kilos: number;
    precio_kilo: number;
    valor_bruto: number;
    cuota_fomento: number;
    valor_neto: number;
}

export interface CreateInvoicePayload {
    id_persona_proveedor: string;
    id_departamento_cacao: string;
    id_municipio_cacao: string;
    cod_tipo_comprador: string;
    fecha_compra: string;
    numero_factura: string;
    detalles_factura: DetallesFactura[];
    archivo_factura?: File;
}

export interface CreateInvoiceResponse {
    success: boolean;
    detail?: string;
    data?: any;
}

const baseApiUrl = process.env.BASE_API_URL;

export const createInvoice = async (formData: FormData, token: string): Promise<CreateInvoiceResponse> => {

    try {
        const response = await axios.post(
            `${baseApiUrl}recaudos/factura-unica-user-externo/create/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al crear la factura');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al crear factura:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al crear factura: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 