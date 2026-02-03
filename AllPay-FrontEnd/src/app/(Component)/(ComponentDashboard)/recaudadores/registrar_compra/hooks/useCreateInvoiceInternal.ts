import { useState } from 'react';
import { createInvoice, CreateInvoiceResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/adapter/invoices.createInternal';
import Swal from 'sweetalert2';

interface UseCreateInternalInvoiceReturn {
    createNewInternalInvoice: (formData: FormData, token: string, id_persona_recaudador: number) => Promise<CreateInvoiceResponse | undefined>;
    isLoading: boolean;
    error: string | null;
}

export const useCreateInternalInvoice = (): UseCreateInternalInvoiceReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createNewInternalInvoice = async (formData: FormData, token: string, id_persona_recaudador: number) => {
        try {
            setIsLoading(true);
            setError(null);

            formData.append('id_persona_recaudador', id_persona_recaudador.toString());

            const response = await createInvoice(formData, token);

            return response;
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear la factura interna';
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
        createNewInternalInvoice,
        isLoading,
        error
    };
}; 