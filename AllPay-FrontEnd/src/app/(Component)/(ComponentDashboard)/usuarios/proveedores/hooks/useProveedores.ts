import { useEffect, useState, useCallback } from 'react';
import { getProveedores } from '../adapters/proveedores.get';
import {
    Proveedor,
    ProveedoresFilters
} from '../models/proveedor.model';

export const useProveedores = (token: string | undefined, filters?: ProveedoresFilters, _options?: { auto?: boolean }) => {
    const [data, setData] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasInitialFetch, setHasInitialFetch] = useState(false);

    const fetchProveedores = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await getProveedores(token, {
                page: filters?.page ?? 1,
                page_size: filters?.page_size ?? 10,
                search: filters?.search,
                numero_documento: filters?.numero_documento,
                cod_tipo_documento: filters?.cod_tipo_documento,
                tipo_persona: filters?.tipo_persona,
                nombre: filters?.nombre,
                apellido: filters?.apellido,
                razon_social: filters?.razon_social
            });
            setData(response.data);
            setTotalPages(response.total_pages);
            setCurrentPage(response.current_page);
            setTotalCount(response.count);
            setError(null);
        } catch (err: any) {
            const message = err?.message || 'Error al cargar proveedores';
            setError(message);
            setData([]);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [token, filters?.page, filters?.page_size, filters?.search, filters?.numero_documento, filters?.cod_tipo_documento, filters?.tipo_persona, filters?.nombre, filters?.apellido, filters?.razon_social]);

    // Efecto para la carga inicial sin filtros
    useEffect(() => {
        if (token && !hasInitialFetch) {
            fetchProveedores();
            setHasInitialFetch(true);
        }
    }, [token, hasInitialFetch, fetchProveedores]);

    return {
        data,
        loading,
        initialLoading,
        error,
        totalPages,
        currentPage,
        totalCount,
        refetch: fetchProveedores
    };
};


