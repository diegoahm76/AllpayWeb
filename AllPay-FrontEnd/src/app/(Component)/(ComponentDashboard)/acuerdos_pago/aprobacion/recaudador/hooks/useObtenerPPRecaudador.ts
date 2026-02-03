import { useState, useEffect, useCallback } from 'react';
import { getSolicitudesAprobacionRecaudador, SolicitudesAprobacionFilters } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/adapters/solicitudesAprobacionRecaudador.adapter';
import { SolicitudAprobacion } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/solicitudesAprobacion.model';
import { formatCurrency } from '@/utils/formatters';
import { formatearFechaDMY } from '@/utils/dateUtils'

export const useSolicitudesAprobacion = (
    token: string,
    initialPage = 1,
    pageSize = 10
) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SolicitudAprobacion[]>([]);
    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<SolicitudesAprobacionFilters>({});

    const fetchData = useCallback(
        async (pageToFetch = page, extraFilters: SolicitudesAprobacionFilters = filters) => {
            if (!token) {
                setData([]);
                setError(null);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const merged: SolicitudesAprobacionFilters = {
                    ...extraFilters,
                    page: pageToFetch,
                    page_size: pageSize,
                };
                const resp = await getSolicitudesAprobacionRecaudador(token, merged);
                const items = resp.data?.data ?? [];
                setData(items);
                setTotalPages(resp.total_pages ?? 1);
                setError(null);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : 'Error al consultar solicitudes de aprobación'
                );
                setData([]);
            } finally {
                setLoading(false);
            }
        },
        [token, page, pageSize, filters]
    );

    const fetchAllData = async (pageToFetch: number) => {
        const merged: SolicitudesAprobacionFilters = {
            ...filters,
            page: pageToFetch,
            page_size: pageSize,
        };
        const resp = await getSolicitudesAprobacionRecaudador(token, merged);
        const items = resp.data?.data ?? [];
        
        // Formatear los datos para el Excel igual que en el componente
        const formattedData = items.map((item: any) => ({
            numero_solicitud: item.nro_solicitud,
            fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
            estado: item.estado_display || item.estado,
            estado_plan_pago: item.estado_plan_pago_display || item.estado_plan_pago || 'Pendiente',
            nit_recaudador: item.numero_documento,
            total_pagar: formatCurrency(item.valor_a_pagar) || 0,
            observaciones: item.observaciones
        }));
        
        return {
            data: formattedData,
            total_pages: resp.total_pages ?? 1
        };
    };

    useEffect(() => {
        fetchData(page, filters);
    }, [fetchData, page, filters]);

    return {
        loading,
        error,
        data,
        page,
        totalPages,
        setPage,
        filters,
        setFilters,
        refetch: () => fetchData(page, filters),
        fetchData,
        fetchAllData
    };
}; 