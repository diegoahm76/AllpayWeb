// hooks/useCreateTemplate.ts
import { useState } from 'react';
import { createTemplate } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/adapter/createTemplate';

interface CreateTemplateData {
    nombre: string;
    descripcion: string;
    observaciones: string;
    documento: File;
    activo: boolean;
    id_consecutivo?: string;
}

export const useCreateTemplate = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleCreateTemplate = async (token: string, data: CreateTemplateData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await createTemplate(token, data);
            setSuccess(result);
            return result;
        } catch (err: any) {
            setError(err.response.data.detail || 'Error al crear la plantilla');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        success,
        handleCreateTemplate,
    };
};
