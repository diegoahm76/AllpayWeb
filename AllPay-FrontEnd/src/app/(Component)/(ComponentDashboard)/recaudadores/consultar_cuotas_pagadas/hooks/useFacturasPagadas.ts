import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { FacturaPagada } from '../models/facturas.pagadas.model';
import { getFacturasPagadas, getFacturasPagadasByMultipleIds } from '../adapters/facturas.pagadas.adapter';

export const useFacturasPagadas = (liquidacionId?: string, liquidacionIds?: string) => {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [facturas, setFacturas] = useState<FacturaPagada[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados de paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [previousUrl, setPreviousUrl] = useState<string | null>(null);

    const fetchFacturas = async (page: number = 1) => {
        const token = (session as any)?.user?.tokens?.access;
        if (!token) {
            setError('No se encontró el token de acceso');
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            
            // Debug: Mostrar parámetros recibidos
            console.log('[useFacturasPagadas] - INICIO DE fetchFacturas:', {
                liquidacionId,
                liquidacionIds,
                page,
                tieneToken: !!token
            });
            
            let response;
            
            // Determinar qué función usar según los parámetros disponibles
            if (liquidacionIds && liquidacionIds.trim().length > 0) {
                // Múltiples IDs - usar el endpoint de múltiples IDs
                const idsArray = liquidacionIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
                console.log('[useFacturasPagadas] - MÚLTIPLES IDs detectados:', idsArray, 'página:', page);
                response = await getFacturasPagadasByMultipleIds(token, idsArray, page);
            } else if (liquidacionId && liquidacionId.trim().length > 0) {
                // Un solo ID - TAMBIÉN usar el endpoint de múltiples IDs (el individual no existe)
                console.log('[useFacturasPagadas] - ID INDIVIDUAL detectado, usando endpoint múltiples:', liquidacionId, 'página:', page);
                response = await getFacturasPagadasByMultipleIds(token, [liquidacionId], page);
            } else {
                // Sin parámetros - obtener todas las facturas (sin paginación)
                console.log('[useFacturasPagadas] - SIN PARÁMETROS - consultando todas las facturas');
                response = await getFacturasPagadas(token);
            }
            
            console.log('[useFacturasPagadas] - RESPUESTA RECIBIDA:', {
                success: response.success,
                cantidadDatos: Array.isArray(response.data) ? response.data.length : 0,
                paginacion: {
                    count: response.count,
                    total_pages: response.total_pages,
                    current_page: response.current_page
                },
                response
            });
            
            if (response.success) {
                const datosFacturas = Array.isArray(response.data) ? response.data : [];
                setFacturas(datosFacturas);
                
                // Actualizar estados de paginación
                setCurrentPage(response.current_page || 1);
                setTotalPages(response.total_pages || 1);
                setTotalCount(response.count || 0);
                setNextUrl(response.next || null);
                setPreviousUrl(response.previous || null);
                
            } else {

            }
        } catch (error) {
            console.error('[useFacturasPagadas] - EXCEPCIÓN CAPTURADA:', {
                error,
                message: error instanceof Error ? error.message : 'Error desconocido',
                liquidacionId,
                liquidacionIds
            });
            
            if (error instanceof Error && error.message === "No se encontraron registros.") {
                setError(null);
                setFacturas([]);
            } else {
                setError(error instanceof Error ? error.message : 'Error al cargar las facturas pagadas');
                setFacturas([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchFacturas(1); // Siempre empezar en la página 1 cuando cambian los parámetros
            setCurrentPage(1); // Resetear página actual
        }
    }, [session, liquidacionId, liquidacionIds]);

    const refetch = () => {
        fetchFacturas(currentPage);
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            fetchFacturas(page);
        }
    };

    const nextPage = () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    };

    const previousPage = () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    };

    return {
        // Datos
        facturas,
        isLoading,
        error,
        
        // Paginación
        currentPage,
        totalPages,
        totalCount,
        nextUrl,
        previousUrl,
        
        // Funciones
        refetch,
        goToPage,
        nextPage,
        previousPage
    };
}; 