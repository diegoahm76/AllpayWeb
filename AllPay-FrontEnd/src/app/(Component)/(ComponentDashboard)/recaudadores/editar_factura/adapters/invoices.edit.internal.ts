import axios from 'axios';
import { UpdateInvoiceData, UpdateInvoiceResponse } from '../models/invoice.edit.internal.model';

const baseApiUrl = process.env.BASE_API_URL;

// Interfaces para los detalles de la factura
export interface InvoiceDetail {
    id_detalle_factura_unica: number;
    nro_kilos: number;
    valor_kilo: number;
    id_tipo_cacao: number;
    valor_bruto: number;
    cuota_fomento: number;
    valor_neto: number;
}

export const updateInternalInvoice = async (
    token: string,
    invoiceId: number,
    data: UpdateInvoiceData
): Promise<UpdateInvoiceResponse> => {
    try {
        // Crear FormData si hay archivo
        const formData = new FormData();

        // Agregar campos al FormData
        if (data.cod_tipo_comprador) {
            formData.append('cod_tipo_comprador', data.cod_tipo_comprador);
        }
        if (data.nro_documento_soporte) {
            formData.append('nro_documento_soporte', data.nro_documento_soporte);
        }
        if (data.doc_soporte) {
            formData.append('doc_soporte', data.doc_soporte);
        }

        // Asegurarse de que los detalles de la factura tengan todos los campos requeridos
        if (data.detalles_factura) {
            // Verificar que cada detalle tenga todos los campos requeridos
            const detallesCompletos = data.detalles_factura.map(detalle => {
                // Asegurarse de que todos los campos requeridos estén presentes
                if (!detalle.nro_kilos || !detalle.valor_kilo || !detalle.id_tipo_cacao) {
                    console.error('Detalle incompleto:', detalle);
                    throw new Error('Los campos nro_kilos, valor_kilo e id_tipo_cacao son obligatorios para cada detalle');
                }

                return {
                    id_detalle_factura_unica: detalle.id_detalle_factura_unica,
                    nro_kilos: detalle.nro_kilos,
                    valor_kilo: detalle.valor_kilo,
                    id_tipo_cacao: detalle.id_tipo_cacao,
                    valor_bruto: detalle.valor_bruto || 0,
                    cuota_fomento: detalle.cuota_fomento || 0,
                    valor_neto: detalle.valor_neto || 0
                };
            });

            formData.append('detalles_factura', JSON.stringify(detallesCompletos));
        }

        const response = await axios.patch(
            `${baseApiUrl}recaudos/factura-unica-user-interno/update/${invoiceId}/`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Error al actualizar la factura');
    }
};

export default {
    updateInternalInvoice
};
