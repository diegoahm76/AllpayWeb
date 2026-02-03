import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface CreateInvoicePayload {
    id_persona_recaudador: number;
    id_persona_proveedor: number;
    id_departamento_cacao: string;
    id_municipio_cacao: string;
    cod_tipo_comprador: string;
    id_porcentaje_cobro: number;
    doc_soporte: File;
    fecha_compra: string;
    fecha_doc_soporte: string;
    detalles_factura: string;
}

export interface CreateInvoiceResponse {
    success: boolean;
    detail: string;
    data?: {
        id_factura_unica: number;
        nombre_persona_recaudador: string;
        nombre_persona_proveedor: string;
        nro_documento_proveedor: string;
        tipo_documento_proveedor: string;
        nombre_municipio_cacao: string;
        nombre_departamento_cacao: string;
        id_porcentaje_cobro: number;
        valor_porcentaje_cobro: number;
        cod_tipo_cobro: string;
        fecha_compra: string;
        nro_factura_unica: number;
        total_kilos: number;
        valor_bruto: string;
        cuota_fomento: string;
        valor_neto: string;
        doc_soporte: string;
        fecha_doc_soporte: string;
        fecha_creacion: string;
        detalles: Array<{
            id_detalle_factura_unica: number;
            id_factura_unica: number;
            id_tipo_cacao: number;
            nro_kilos: number;
            valor_kilo: string;
            nombre_tipo_cacao: string;
            valor_bruto: number;
            cuota_fomento: number;
            valor_neto: number;
        }>;
    };
}

export const createInvoice = async (
    formData: FormData,
    token: string
): Promise<CreateInvoiceResponse> => {
    try {

        const response = await axios.post(
            `${baseApiUrl}recaudos/factura-unica-user-interno/create/`,
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
