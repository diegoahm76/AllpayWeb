import { useState, useEffect, useCallback } from 'react';
import { getSolicitudesLiquidacionExterno, SolicitudesLiquidacionFilters } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/adapters/externo/solicitudesLiquidacionExterno.adapter';
import { SolicitudLiquidacion } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/models/extrerno/solicitudesLiquidacion.model';
import { formatCurrency } from '@/utils/formatters';
import { formatearFechaDMY } from '@/utils/dateUtils';
import { getSolicitudesLiquidacionInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/adapters/interno/solicitudesLiquidacionInterno.adapter';

export const useSolicitudesLiquidacion = (  
    token: string,
    initialPage = 1,
    pageSize = 10,
    isInternalUser: boolean | null
) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SolicitudLiquidacion[]>([]);
    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<SolicitudesLiquidacionFilters>({});

    const fetchData = useCallback(
        async (pageToFetch = page, extraFilters: SolicitudesLiquidacionFilters = filters) => {
            
            if (!token || isInternalUser === null) {
                setData([]);
                setError(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const merged: SolicitudesLiquidacionFilters = {
                    ...extraFilters,
                    page: pageToFetch,
                    page_size: pageSize,
                };
                                
                const resp = isInternalUser 
                ? await getSolicitudesLiquidacionInterno(token, merged)
                : await getSolicitudesLiquidacionExterno(token, merged);

                const items = resp.data?.data ?? [];
                setData(items);
                setTotalPages(resp.total_pages ?? 1);
                setError(null);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : 'Error al consultar solicitudes de liquidación'
                );
                setData([]);
            } finally {
                setLoading(false);
            }
        },
        [token, page, pageSize, filters, isInternalUser]
    );

    const fetchAllData = useCallback(async (pageToFetch: number) => {
        if (!token || isInternalUser === null) {
            return {
                data: [],
                total_pages: 1
            };
        }

        const merged: SolicitudesLiquidacionFilters = {
            ...filters,
            page: pageToFetch,
            page_size: pageSize,
        };

        const resp = isInternalUser 
        ? await getSolicitudesLiquidacionInterno(token, merged) 
        : await getSolicitudesLiquidacionExterno(token, merged);

        const items = resp.data?.data ?? [];
                
        // Formatear los datos para el Excel (nombres deben coincidir con las columnas)
        const formattedData = items.map((item: any) => {
            const mapped = {
                numero_solicitud: item.nro_solicitud,
                numero_plan_pago: item.nro_plan_pago,
                fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
                estado: item.estado_display,                    // ✅ Cambiado: estado_solicitud -> estado
                estado_plan_pago_display: item.estado_plan_pago_display, // ✅ Corregido el nombre
                nit_recaudador: item.numero_documento,
                nombre_recaudador: item.nombre_recaudador,
                total_pagar: isInternalUser                     // ✅ Cambiado: valor_total_pagar -> total_pagar
                    ? formatCurrency(item.valor_a_pagar || 0)
                    : formatCurrency(item.valor_total_pagar || 0),
                cuota_fomento: formatCurrency(item.cuota_fomento_total || 0),
                intereses: formatCurrency(item.intereses_total || 0),
                facturas_asociadas: item.facturas_asociadas || '',
                observaciones: item.observaciones
            };
            
            return mapped;
        });
        
        return {
            data: formattedData,
            total_pages: resp.total_pages ?? 1
        };
    }, [token, isInternalUser, filters, pageSize]);

    useEffect(() => {
        if (isInternalUser !== null) {
            fetchData(page, filters);
        }
    }, [fetchData, page, filters, isInternalUser]);

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