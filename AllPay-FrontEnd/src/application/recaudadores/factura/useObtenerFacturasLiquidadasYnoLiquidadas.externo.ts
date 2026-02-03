import { useState } from 'react';
import { obtenerFacturasLiquidadasYnoLiquidadasExterno } from '@/adapters/recaudadores/facturas/buscarFacturasLiquidadasYnoLiquidadas.externo';

interface FacturaExterna {
    id_factura_unica: number;
    nombre_persona_recaudador: string;
    nombre_persona_proveedor: string;
    nro_documento_proveedor: string;
    tipo_documento_proveedor: string;
    nombre_municipio_cacao: string;
    nombre_departamento_cacao: string;
    id_porcentaje_cobro: number;
    valor_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    cod_tipo_comprador: string;
    nombre_cod_tipo_comprador: string;
    fecha_compra: string;
    nro_factura_unica: number;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    doc_soporte: string;
    doc_soporte_url: string;
    fecha_doc_soporte: string;
    fecha_creacion: string;
    id_persona_recaudador: number;
    id_liq_factura_unica: number | null;
    id_persona_proveedor: number;
    id_municipio_cacao: string;
    id_departamento_cacao: string;
    id_persona_crea: number;
}

interface SearchParams {
    nro_factura_unica?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    [key: string]: any;
}

const useObtenerFacturasLiquidadasYnoLiquidadasExterno = () => {
    const [fullInvoices, setFullInvoices] = useState<FacturaExterna[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [previousPage, setPreviousPage] = useState<string | null>(null);
    const [currentCollectorIds, setCurrentCollectorIds] = useState<number[]>([]);
    const [currentToken, setCurrentToken] = useState<string>('');

    const fetchInvoices = async (token: string, collectorIds: number[], page: number = 1, searchParams?: SearchParams) => {
        setIsLoading(true);
        setError(null);
        setCurrentToken(token);
        setCurrentCollectorIds(collectorIds);

        try {
            const response = await obtenerFacturasLiquidadasYnoLiquidadasExterno(token, collectorIds, page, searchParams);
            setFullInvoices(response.data);
            setTotalPages(response.total_pages);
            setCurrentPage(response.current_page);
            setTotalCount(response.count);
            setNextPage(response.next);
            setPreviousPage(response.previous);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener las facturas';
            setError(errorMessage);
            return {
                success: false,
                count: 0,
                total_pages: 0,
                current_page: 1,
                next: null,
                previous: null,
                data: [],
                detail: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = async (newPage: number) => {
        if (currentToken && !isLoading) {
            await fetchInvoices(currentToken, currentCollectorIds, newPage);
        }
    };

    const setInvoicesData = (data: FacturaExterna[]) => {
        setFullInvoices(data);
    };

    const clearInvoices = () => {
        setFullInvoices([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(0);
        setNextPage(null);
        setPreviousPage(null);
        setError(null);
        setCurrentCollectorIds([]);
        setCurrentToken('');
    };

    const refetchCurrentData = async (searchParams?: SearchParams) => {
        if (currentToken && currentCollectorIds.length > 0) {
            try {
                await fetchInvoices(currentToken, currentCollectorIds, 1, searchParams);
            } catch (error) {
                console.error('Error al refetch de facturas externas:', error);
            }
        }
    };

    return {
        fullInvoices,
        isLoading,
        error,
        currentPage,
        totalPages,
        totalCount,
        nextPage,
        previousPage,
        fetchInvoices,
        handlePageChange,
        setInvoicesData,
        clearInvoices,
        refetchCurrentData
    };
};

export default useObtenerFacturasLiquidadasYnoLiquidadasExterno;
