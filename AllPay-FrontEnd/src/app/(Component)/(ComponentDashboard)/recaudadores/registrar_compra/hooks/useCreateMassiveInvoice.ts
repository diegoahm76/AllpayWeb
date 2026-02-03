import { useState } from 'react';
import { createMassiveInvoiceInternal } from '../adapter/invoice.createMasive.internal';
import { createMassiveInvoiceExternal } from '../adapter/invoice.createMasive.External';
import { CreateMassiveInvoiceResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/models/invoice.createMasive.model'
import Swal from 'sweetalert2';

interface UseCreateMassiveInvoiceReturn {
    createNewMassiveInvoice: (formData: FormData, token: string, isInternalUser: boolean) => Promise<CreateMassiveInvoiceResponse | undefined>;
    isLoading: boolean;
    error: string | null;
}

export const useCreateMassiveInvoice = (): UseCreateMassiveInvoiceReturn => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const createNewMassiveInvoice = async (formData: FormData, token: string, isInternalUser: boolean): Promise<CreateMassiveInvoiceResponse | undefined> => {
        setIsLoading(true);
        setError(null);

        try {
            if (isInternalUser) {
                var response = await createMassiveInvoiceInternal(formData, token);
            } else {
                var response = await createMassiveInvoiceExternal(formData, token);
            }
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al crear las facturas masivas';
            setError(errorMessage);

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonText: 'Aceptar',
                confirmButtonColor: 'rgb(var(--green))',
            });

            return undefined;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createNewMassiveInvoice,
        isLoading,
        error,
    };
}; 