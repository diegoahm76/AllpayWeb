import { useState, useEffect, useCallback } from 'react';
import { getConsultaAcuerdoPagoExterno, ConsultaAcuerdoPagoExternoFilters } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/consultaAcuerdoPagoExterno.adapter';
import { getConsultaAcuerdoPagoInterno, ConsultaAcuerdoPagoInternoFilters } from '@/adapters/acuerdos_pago/consultaAcuerdoPagoInterno.adapter';
import { AcuerdoPago, ApiResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/consultaAcuerdoPago.model';

export const useConsultaAcuerdoPago = (
  token: string,
  isInternalUser: boolean | null,
  initialPage = 1,
  pageSize = 10
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AcuerdoPago[]>([]);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<any>({});

  const fetchData = useCallback(
    async (pageToFetch = page, extraFilters: any = filters) => {
      if (!token || isInternalUser === null) {
        setData([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        if (isInternalUser) {
            const merged: ConsultaAcuerdoPagoInternoFilters = {
                ...extraFilters,
                page: pageToFetch,
                page_size: pageSize,
            };

            const resp = await getConsultaAcuerdoPagoInterno(token, merged) as unknown as ApiResponse;
            const items = resp.data?.data ?? [];
  
            const normalizedItems: AcuerdoPago[] = items.map((item: any) => ({
                id_solicitud_acuerdo_pago: item.id_solicitud_acuerdo_pago,
                nro_solicitud: item.nro_solicitud,
                fecha_solicitud: item.fecha_solicitud,
                estado: item.estado,
                estado_display: item.estado_display,
                estado_plan_pago: item.estado_plan_pago,
                estado_plan_pago_display: item.estado_plan_pago_display,
                numero_documento: item.numero_documento,
                recaudador: item.recaudador,
                valor_total_pagar: item.valor_total_pagar,
                observaciones: item.observaciones
            }));

            setData(normalizedItems);
            setTotalPages(resp.total_pages ?? 1);
        } else {
            const merged: ConsultaAcuerdoPagoExternoFilters = {
                ...extraFilters,
                page: pageToFetch,
                page_size: pageSize,
            };

            const resp = await getConsultaAcuerdoPagoExterno(
                token,
                pageToFetch,
                pageSize,
                merged
            ) as unknown as ApiResponse;

            const items = resp.data?.data ?? [];
            setData(items);
            setTotalPages(resp.total_pages ?? 1);
        }

        setError(null);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Error al consultar acuerdos de pago'
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [token, isInternalUser, page, pageSize, filters]
  );

  const fetchAllData = async (pageToFetch: number) => {
    if (isInternalUser) {
      const merged: ConsultaAcuerdoPagoInternoFilters = {
        ...filters,
        page: pageToFetch,
        page_size: pageSize,
      };

      const resp = await getConsultaAcuerdoPagoInterno(token, merged);

      const normalized = (resp.data?.data ?? []).map((item: any) => ({
        numero_solicitud: item.nro_solicitud,
        fecha_solicitud: item.fecha_solicitud,
        estado: item.estado_display,
        nit_recaudador: item.recaudador?.numero_documento ?? item.numero_documento ?? '',
        total_pagar: item.valor_total_pagar,
        observacion: item.observaciones,
        estado_plan_pago_display: item.estado_plan_pago_display || 'Pendiente',
      }));
      return {
        data: normalized,
        total_pages: Math.ceil((resp.count ?? 0) / pageSize)
      };
    } else {
      const merged: ConsultaAcuerdoPagoExternoFilters = {
        ...filters,
        page: pageToFetch,
        page_size: pageSize,
      };
      const resp = await getConsultaAcuerdoPagoExterno(token, pageToFetch, pageSize, merged);
      const normalized = (resp.data?.data ?? []).map((item: any) => ({
        numero_solicitud: item.nro_solicitud,
        fecha_solicitud: item.fecha_solicitud,
        estado: item.estado_display,
        nit_recaudador: item.numero_documento ?? '',
        total_pagar: item.valor_total_pagar,
        observacion: item.observaciones,
        estado_plan_pago_display: item.estado_plan_pago_display || 'Pendiente',
      }));
      return {
        data: normalized,
        total_pages: resp.total_pages ?? 1
      };
    }
  };

  useEffect(() => {
    fetchData(page, filters);
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