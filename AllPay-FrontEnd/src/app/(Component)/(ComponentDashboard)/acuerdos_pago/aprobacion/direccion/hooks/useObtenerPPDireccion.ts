import { useState, useEffect, useCallback } from 'react';
import { getSolicitudesAprobacionDireccion, SolicitudesAprobacionDireccionFilters } from '../adapters/solicitudesAprobacionDireccion.adapter';
import { SolicitudAprobacion } from '../models/solicitudesAprobacion.model';

export const useObtenerPPDireccion = (
    token: string,
    initialPage = 1,
    pageSize = 10,
    shouldFetch = true // Nuevo parámetro para controlar si debe hacer la petición automáticamente
) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SolicitudAprobacion[]>([]);
    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<SolicitudesAprobacionDireccionFilters>({});

    const fetchData = useCallback(
        async (pageToFetch = page, extraFilters: SolicitudesAprobacionDireccionFilters = filters) => {
            
            if (!token) {
                setData([]);
                setError(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const merged: SolicitudesAprobacionDireccionFilters = {
                    ...extraFilters,
                    page: pageToFetch,
                    page_size: pageSize,
                };
                const resp = await getSolicitudesAprobacionDireccion(token, merged);
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
        const merged: SolicitudesAprobacionDireccionFilters = {
            ...filters,
            page: pageToFetch,
            page_size: pageSize,
        };
        const resp = await getSolicitudesAprobacionDireccion(token, merged);
        const items = resp.data?.data ?? [];
        
        // Formatear los datos para el Excel igual que en el componente
        const formattedData = items.map((item: any) => ({
            numero_solicitud: item.nro_solicitud,
            fecha_solicitud: item.fecha_solicitud,
            estado: item.estado_display || item.estado,
            nit_recaudador: item.numero_documento,
            valor_a_pagar: item.valor_a_pagar,
            observaciones: item.observaciones
        }));
        
        return {
            data: formattedData,
            total_pages: resp.total_pages ?? 1
        };
    };

    useEffect(() => {
        // Hacer la petición automáticamente si shouldFetch es true
        if (shouldFetch) {
            fetchData(page, filters);
        }
    }, [fetchData, page, filters, shouldFetch]);

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