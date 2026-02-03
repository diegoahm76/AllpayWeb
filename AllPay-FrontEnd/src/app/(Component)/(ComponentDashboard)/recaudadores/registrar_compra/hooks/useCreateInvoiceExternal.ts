import { useState } from 'react';
import { createInvoice, CreateInvoiceResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/adapter/invoices.createExternal';
import Swal from 'sweetalert2';

interface UseCreateInvoiceReturn {
    createNewInvoice: (formData: FormData, token: string) => Promise<CreateInvoiceResponse | undefined>;
    isLoading: boolean;
    error: string | null;
}

export const useCreateInvoice = (): UseCreateInvoiceReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createNewInvoice = async (formData: FormData, token: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await createInvoice(formData, token);
            return response;
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear la factura';
            setError(errorMessage);

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#4D750F',
            });
            return undefined;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createNewInvoice,
        isLoading,
        error
    };
}; 