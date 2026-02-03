import { useState } from 'react';
import { getComprasTotales } from '../adapters/compras-totales.adapter';
import { ComprasTotalesData } from '../models/compras-totales.model';

interface SearchParams {
    id_departamento_cacao?: string;
    id_municipio_cacao?: string;
    nro_documento_soporte?: string;
    nro_factura_unica?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    ids_recaudador?: string;
    [key: string]: any;
}

const useComprasTotales = () => {
    const [comprasTotales, setComprasTotales] = useState<ComprasTotalesData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentToken, setCurrentToken] = useState<string>('');

    const fetchComprasTotales = async (token: string, searchParams?: SearchParams) => {
        setIsLoading(true);
        setError(null);
        setCurrentToken(token);

        try {
            const response = await getComprasTotales(token, searchParams);
            setComprasTotales(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los totales de compras';
            setError(errorMessage);
            return {
                success: false,
                detail: errorMessage,
                data: {
                    total_cuota_fomento: 0,
                    total_kilos: 0,
                    total_valor_bruto: 0,
                    total_intereses: 0
                }
            };
        } finally {
            setIsLoading(false);
        }
    };

    const clearComprasTotales = () => {
        setComprasTotales(null);
        setError(null);
        setCurrentToken('');
    };

    const refetchComprasTotales = async (searchParams?: SearchParams) => {
        if (currentToken) {
            try {
                await fetchComprasTotales(currentToken, searchParams);
            } catch (error) {
                console.error('Error al refetch de compras totales:', error);
            }
        }
    };

    return {
        comprasTotales,
        isLoading,
        error,
        fetchComprasTotales,
        clearComprasTotales,
        refetchComprasTotales
    };
};

export default useComprasTotales;
