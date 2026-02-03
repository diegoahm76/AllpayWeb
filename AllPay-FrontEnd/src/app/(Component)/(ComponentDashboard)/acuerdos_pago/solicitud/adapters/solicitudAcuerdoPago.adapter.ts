import axios from 'axios';
import { SolicitudAcuerdoPagoResponse, SolicitudAcuerdoPagoPreviewResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/models/solicitudAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface SolicitudAcuerdoPagoPayload {
    id_facturas: number[];
    observaciones: string;
    doc_solicitud: File;
}

export const createSolicitudAcuerdoPago = async (
    token: string,
    payload: SolicitudAcuerdoPagoPayload
): Promise<SolicitudAcuerdoPagoResponse> => {
    try {
        const formData = new FormData();
        formData.append('id_facturas', JSON.stringify(payload.id_facturas));
        formData.append('observaciones', payload.observaciones);
        formData.append('doc_solicitud', payload.doc_solicitud);

        const response = await axios.post(
            `${baseApiUrl}recaudos/acuerdos-pago/create/solicitud-acuerdo-pago/`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al crear la solicitud de acuerdo de pago');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al crear la solicitud de acuerdo de pago');
        }
        throw error;
    }
};

export const getSolicitudAcuerdoPagoPreview = async (
    token: string,
    id_facturas: number[]
): Promise<SolicitudAcuerdoPagoPreviewResponse> => {
    try {
        const params = { id_facturas: JSON.stringify(id_facturas) };
        const response = await axios.get(
            `${baseApiUrl}recaudos/acuerdos-pago/get/solicitud-acuerdo-pago/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                params
            }
        );
        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener la vista previa de la solicitud de acuerdo de pago');
        }
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener la vista previa de la solicitud de acuerdo de pago');
        }
        throw error;
    }
}; 