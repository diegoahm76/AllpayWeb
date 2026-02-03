// hooks/useTemplateActions.ts
import { useEffect, useState } from 'react';
import { getAllTemplate, GetAllTemplateResponse } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/adapter/getAllTemplates';
import { deleteTemplate } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/adapter/deleteTemplate';

export const useTemplateActions = (token: string) => {
    const [templates, setTemplates] = useState<GetAllTemplateResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);

        try {
            const response = await getAllTemplate(token);
            setTemplates(response);
        } catch (err: any) {
            setError(err.message || 'Error al obtener las plantillas');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (!token) return;
        setIsDeleting(true);
        setError(null);

        try {
            await deleteTemplate(token, id);
            // Refrescamos la lista después de eliminar
            await fetchTemplates();
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la plantilla');
        } finally {
            setIsDeleting(false);
        }
    };

    const getTemplatesForExcel = async () => {
        if (!token) return [];

        try {
            const response = await getAllTemplate(token);
            if (!response.success || !Array.isArray(response.data)) {
                return [];
            }

            return response.data.map((template) => ({
                'Nombre de la Plantilla': template.nombre || '',
                'Descripción': template.descripcion || '',
                'Extensión': template.doc_plantilla ? template.doc_plantilla.split('.').pop() || '' : '',
                'Observación': template.observacion || '',
                'Estado': template.activa ? 'Activa' : 'Inactiva'
            }));
        } catch (err) {
            console.error('Error al obtener datos para Excel:', err);
            return [];
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [token]);

    return {
        templates,
        isLoading,
        isDeleting,
        error,
        refetch: fetchTemplates,
        handleDeleteTemplate,
        getTemplatesForExcel
    };
};
