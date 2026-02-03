import { useState } from 'react';
import { getDocumentoAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/adapters/documentoAcuerdoPago.adapter';
import { DocumentoAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/models/documentoAcuerdoPago.model';

export const useDocumentoAcuerdoPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DocumentoAcuerdoPagoResponse | null>(null);

    const obtenerDocumentoAcuerdoPago = async (token: string, id: number | string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDocumentoAcuerdoPago(token, id);
            setData(response);
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al obtener el documento del acuerdo de pago';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    const clearData = () => {
        setData(null);
    };

    return {
        loading,
        error,
        data,
        obtenerDocumentoAcuerdoPago,
        clearError,
        clearData
    };
}; 