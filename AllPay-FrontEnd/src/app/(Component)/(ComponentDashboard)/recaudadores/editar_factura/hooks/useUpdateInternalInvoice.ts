import { useState, useCallback } from 'react';
import { updateInternalInvoice } from '../adapters/invoices.edit.internal';
import { updateExternalInvoice } from '../adapters/invoices.edit.external';
import { UpdateInvoiceData, UpdateInvoiceResponse } from '../models/invoice.edit.internal.model';

interface UseUpdateInternalInvoiceReturn {

    updateInvoice: (invoiceId: number, data: UpdateInvoiceData, isInternalUser: boolean) => Promise<UpdateInvoiceResponse>;
    isLoading: boolean;
    error: string | null;
    success: boolean;
}

export const useUpdateInternalInvoice = (token: string): UseUpdateInternalInvoiceReturn => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const updateInvoice = useCallback(async (invoiceId: number, data: UpdateInvoiceData, isInternalUser: boolean): Promise<UpdateInvoiceResponse> => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {

            if (isInternalUser) {
                var response = await updateInternalInvoice(token, invoiceId, data);
            } else {
                var response = await updateExternalInvoice(token, invoiceId, data);
            }

            if (response?.success) {
                setSuccess(true);
            } else {
                setError(response?.detail || 'Error desconocido en la API');
            }

            // Devolvemos toda la respuesta para usarla en el componente
            return response;

        } catch (err: any) {
            setError(err.message || 'Error al actualizar la factura');
            setSuccess(false);
            throw err; // vuelve a lanzar el error para manejarlo en el componente
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    return {
        updateInvoice,
        isLoading,
        error,
        success
    };
};

export default useUpdateInternalInvoice;
