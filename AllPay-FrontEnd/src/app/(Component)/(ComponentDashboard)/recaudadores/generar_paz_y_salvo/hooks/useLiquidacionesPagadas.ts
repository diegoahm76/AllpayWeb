import { useState, useCallback } from 'react';
import { LiquidacionPagada } from '../models/liquidaciones.pagadas.model';
import { getLiquidacionesPagadas, LiquidacionesPagadasFilters } from '../adapters/liquidaciones.pagadas.adapter';

export const useLiquidacionesPagadas = (token?: string) => {
    const [liquidaciones, setLiquidaciones] = useState<LiquidacionPagada[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchLiquidaciones = useCallback(async (filters?: LiquidacionesPagadasFilters) => {
        if (!token || typeof token !== 'string' || token.length === 0) {
            setError('No se encontró el token de acceso');
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            
            console.log('[useLiquidacionesPagadas] - Obteniendo liquidaciones:', filters);
            
            const response = await getLiquidacionesPagadas(token, filters);
            
            if (response.success) {
                const datosLiquidaciones = Array.isArray(response.data) ? response.data : [];
                setLiquidaciones(datosLiquidaciones);
                setCurrentPage(response.current_page);
                setTotalPages(response.total_pages);
                setTotalCount(response.count);
                
                console.log('[useLiquidacionesPagadas] - Liquidaciones cargadas:', {
                    count: datosLiquidaciones.length,
                    totalPages: response.total_pages,
                    currentPage: response.current_page,
                    totalCount: response.count
                });
            } else {
                setError('Error al cargar las liquidaciones pagadas');
                setLiquidaciones([]);
                setTotalPages(0);
                setTotalCount(0);
            }
        } catch (error) {
            console.error('[useLiquidacionesPagadas] - Error al cargar liquidaciones:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Error al cargar las liquidaciones pagadas';
            
            // Verificar si es un error de "no se encontraron registros" (404 o mensaje específico)
            const isNoRecordsFound = 
                errorMessage.toLowerCase().includes('no se encontraron registros') ||
                errorMessage.toLowerCase().includes('no se encontraron') ||
                errorMessage.toLowerCase().includes('no records found') ||
                errorMessage.includes('404');

            if (isNoRecordsFound) {
                // Para el caso de "no registros", limpiar datos sin mostrar error
                setError(null);
                setLiquidaciones([]);
                setTotalPages(0);
                setTotalCount(0);
                
                // Quitar el focus de cualquier input activo
                if (document.activeElement && document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            } else {
                // Para otros errores, mostrar el error
                setError(errorMessage);
                setLiquidaciones([]);
                setTotalPages(0);
                setTotalCount(0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Función para obtener liquidaciones (cargar inicialmente)
    const obtenerLiquidaciones = useCallback((filters?: Omit<LiquidacionesPagadasFilters, 'page'>) => {
        setCurrentPage(1);
        fetchLiquidaciones({ ...filters, page: 1 });
    }, [fetchLiquidaciones]);

    // Función para cambiar de página
    const cambiarPagina = useCallback(async (nuevaPagina: number, filters?: Omit<LiquidacionesPagadasFilters, 'page'>) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPages) {
            await fetchLiquidaciones({ ...filters, page: nuevaPagina });
        }
    }, [fetchLiquidaciones, totalPages]);

    // Función para refrescar los datos
    const refetch = useCallback((filters?: Omit<LiquidacionesPagadasFilters, 'page'>) => {
        fetchLiquidaciones({ ...filters, page: currentPage });
    }, [fetchLiquidaciones, currentPage]);

    // Función para limpiar datos
    const limpiarDatos = useCallback(() => {
        setLiquidaciones([]);
        setCurrentPage(1);
        setTotalPages(0);
        setTotalCount(0);
        setError(null);
    }, []);

    return {
        liquidaciones,
        isLoading,
        error,
        currentPage,
        totalPages,
        totalCount,
        obtenerLiquidaciones,
        cambiarPagina,
        refetch,
        limpiarDatos
    };
}; 