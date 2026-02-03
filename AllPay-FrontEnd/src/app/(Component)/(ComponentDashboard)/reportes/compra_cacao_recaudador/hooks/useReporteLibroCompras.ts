import { useState, useCallback } from 'react';
import {
    FacturaLibroCompra,
    ReporteLibroComprasResponse,
    ReporteLibroComprasParams,
} from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/models/reporteLibroCompras.model';
import { obtenerReporteLibroCompras } from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/adapters/reporteLibroCompras.adapter';

const cleanParams = (params: ReporteLibroComprasParams): ReporteLibroComprasParams =>
    Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    ) as ReporteLibroComprasParams;

interface UseReporteLibroComprasReturn {
    facturas: FacturaLibroCompra[];
    valorCuotaFomentoTotal: number;
    totalKilos: number;
    isLoading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    fetchReporte: (token: string, params?: ReporteLibroComprasParams) => Promise<ReporteLibroComprasResponse>;
    handlePageChange: (page: number, token: string) => void;
    clearReporte: () => void;
    clearError: () => void;
    resetSearchParams: () => void;
    refetchCurrentData: (token: string, searchParams?: ReporteLibroComprasParams) => Promise<void>;
    fetchAllData: (page: number, token: string, params?: ReporteLibroComprasParams) => Promise<{ data: FacturaLibroCompra[]; total_pages: number }>;
}

const useReporteLibroCompras = (): UseReporteLibroComprasReturn => {
    const [facturas, setFacturas] = useState<FacturaLibroCompra[]>([]);
    const [valorCuotaFomentoTotal, setValorCuotaFomentoTotal] = useState<number>(0);
    const [totalKilos, setTotalKilos] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(0);

    // Almacena los parámetros de búsqueda usados (filtros, paginación, etc.)
    const [searchParams, setSearchParams] = useState<ReporteLibroComprasParams>({
        page: 1,
        page_size: 10
    });

    const fetchReporte = useCallback(
        async (token: string, params?: ReporteLibroComprasParams): Promise<ReporteLibroComprasResponse> => {
            try {
                setIsLoading(true);
                setError(null);

                // Usa params nuevos si los hay; de lo contrario, los guardados en searchParams
                const queryParams: ReporteLibroComprasParams = params || searchParams;

                // Limpia los valores vacíos o undefined
                const cleanedParams = cleanParams(queryParams);

                const response = await obtenerReporteLibroCompras(cleanedParams, token);

                // Actualiza el estado (React) con los datos devueltos
                setFacturas(response.data.facturas);
                setValorCuotaFomentoTotal(response.data.Valor_cuota_fomento_total);
                setTotalKilos(response.data.total_kilos || 0);
                setCurrentPage(response.current_page);
                setTotalPages(response.total_pages);
                setTotalCount(response.count);
                setSearchParams(queryParams);

                return response;
            } catch (err) {
                // Manejo de error: deja facturas vacío
                const errorMessage = err instanceof Error ? err.message : 'Error al obtener el reporte de libro de compras';
                console.error('Error en fetchReporte:', errorMessage);
                setError(errorMessage);
                setFacturas([]);
                setValorCuotaFomentoTotal(0);
                setTotalKilos(0);

                return {
                    success: false,
                    data: {
                        facturas: [],
                        Valor_cuota_fomento_total: 0,
                        total_kilos: 0
                    },
                    count: 0,
                    total_pages: 1,
                    current_page: 1,
                    next: null,
                    previous: null
                };
            } finally {
                setIsLoading(false);
            }
        },
        [searchParams]
    );

    const handlePageChange = useCallback(
        (page: number, token: string) => {
            const newParams = { ...searchParams, page };
            setSearchParams(newParams);
            // Llamar directamente a la función del adapter para evitar problemas de timing
            const fetchWithNewParams = async () => {
                try {
                    setIsLoading(true);
                    setError(null);

                    const cleanedParams = cleanParams(newParams);
                    
                    const response = await obtenerReporteLibroCompras(cleanedParams, token);

                    setFacturas(response.data.facturas);
                    setValorCuotaFomentoTotal(response.data.Valor_cuota_fomento_total);
                    setTotalKilos(response.data.total_kilos || 0);
                    setCurrentPage(response.current_page);
                    setTotalPages(response.total_pages);
                    setTotalCount(response.count);
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Error al obtener el reporte de libro de compras';
                    console.error('Error en handlePageChange:', errorMessage);
                    setError(errorMessage);
                    setFacturas([]);
                    setValorCuotaFomentoTotal(0);
                    setTotalKilos(0);
                } finally {
                    setIsLoading(false);
                }
            };
            
            fetchWithNewParams();
        },
        [searchParams]
    );

    const clearReporte = useCallback(() => {
        setFacturas([]);
        setValorCuotaFomentoTotal(0);
        setTotalKilos(0);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(0);
        setError(null);
        setSearchParams({
            page: 1,
            page_size: 10,
            id_recaudador: undefined,
            fecha_inicio: undefined,
            fecha_final: undefined
        });
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const resetSearchParams = useCallback(() => {
        setSearchParams({
            page: 1,
            page_size: 10
        });
    }, []);

    const refetchCurrentData = useCallback(async (token: string, searchParams?: ReporteLibroComprasParams) => {
        try {
            // Usa los parámetros de búsqueda actuales si no se proporcionan nuevos
            const paramsToUse = searchParams || { page: 1, page_size: 10 };
            await fetchReporte(token, paramsToUse);
        } catch (error) {
            console.error('Error al refetch del reporte de libro de compras:', error);
        }
    }, [fetchReporte]);

    const fetchAllData = useCallback(async (page: number, token: string, params?: ReporteLibroComprasParams) => {
        try {
            // Usa los parámetros proporcionados o los guardados en searchParams
            const queryParams: ReporteLibroComprasParams = params || searchParams;
            
            // Limpia los valores vacíos o undefined
            const cleanedParams = cleanParams(queryParams);
            
            // Agregar la página específica solicitada
            const paramsWithPage = { ...cleanedParams, page };
            
            const response = await obtenerReporteLibroCompras(paramsWithPage, token);
            
            // Función auxiliar para calcular el promedio de un arreglo
            const calcularPromedio = (valores: number[]): number => {
                if (!valores || valores.length === 0) return 0;
                const suma = valores.reduce((acc, valor) => acc + valor, 0);
                return suma / valores.length;
            };

            // Procesar los datos para incluir el precio promedio calculado
            const facturasConPromedio = response.data.facturas.map(factura => ({
                ...factura,
                precio_promedio_kilo: calcularPromedio(factura.valores_kilo)
            }));
            
            return {
                data: facturasConPromedio,
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    }, [searchParams]);

    return {
        facturas,
        valorCuotaFomentoTotal,
        totalKilos,
        isLoading,
        error,
        currentPage,
        totalPages,
        totalCount,
        fetchReporte,
        handlePageChange,
        clearReporte,
        clearError,
        resetSearchParams,
        refetchCurrentData,
        fetchAllData
    };
};

export default useReporteLibroCompras; 