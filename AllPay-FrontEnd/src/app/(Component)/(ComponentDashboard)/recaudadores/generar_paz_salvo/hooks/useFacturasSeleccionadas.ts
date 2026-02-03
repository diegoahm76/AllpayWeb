import { useState, useEffect, useCallback, useRef } from 'react';
import { FacturaSeleccionada } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/models/facturas.seleccionadas.model';
import { getFacturasSeleccionadas } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/adapters/facturas.seleccionadas.adapter';

interface UseFacturasSeleccionadasProps {
    token: string;
    idsFacturas: number[];
    onSuccess?: (data: FacturaSeleccionada[]) => void;
    onError?: (message: string) => void;
}

export const useFacturasSeleccionadas = ({
    token,
    idsFacturas,
    onSuccess,
    onError
}: UseFacturasSeleccionadasProps) => {
    const [facturas, setFacturas] = useState<FacturaSeleccionada[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [intentos, setIntentos] = useState<number>(0);
    const [shouldFetch, setShouldFetch] = useState<boolean>(true);
    const [idsValidos, setIdsValidos] = useState<number[]>([]);
    const MAX_INTENTOS = 3;
    
    // Usar ref para evitar re-renderizados innecesarios al comparar arrays
    const idsRef = useRef<number[]>([]);

    // Efecto para validar y almacenar los IDs recibidos
    useEffect(() => {
        // Comparar si los IDs son los mismos para evitar actualizaciones innecesarias
        const idsActualesJSON = JSON.stringify(idsFacturas);
        const idsAnterioresJSON = JSON.stringify(idsRef.current);
        
        if (idsActualesJSON === idsAnterioresJSON) {
            // Si son los mismos IDs, no hacer nada
            return;
        }
        
        // Actualizar la referencia con los nuevos IDs
        idsRef.current = [...idsFacturas];
        
        if (idsFacturas && idsFacturas.length > 0) {
            // Filtrar IDs válidos (números positivos)
            const ids = idsFacturas.filter(id => typeof id === 'number' && id > 0);
            
            if (ids.length > 0) {
                console.log('IDs válidos para consulta:', ids);
                setIdsValidos(ids);
                setIntentos(0);
                setError(null);
                setShouldFetch(true);
            } else {
                console.error('No se recibieron IDs válidos');
                setError('No se recibieron IDs válidos para consultar');
                setIdsValidos([]);
                if (onError) onError('No se recibieron IDs válidos para consultar');
            }
        }
    }, [idsFacturas, onError]);

    // Usar useCallback para evitar recrear la función en cada renderizado
    const obtenerFacturasSeleccionadas = useCallback(async () => {
        // Evitar consultas adicionales si ya se está cargando
        if (isLoading) return;

        if (!token) {
            console.error('No hay token disponible');
            const msg = 'No se pudo autenticar al usuario. Por favor, inicie sesión nuevamente.';
            setError(msg);
            if (onError) onError(msg);
            return;
        }
        
        if (!idsValidos || idsValidos.length === 0) {
            console.error('No hay IDs de facturas para consultar');
            const msg = 'No se encontraron facturas seleccionadas para generar el paz y salvo.';
            setError(msg);
            if (onError) onError(msg);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            console.log(`Intentando obtener facturas seleccionadas. Intento ${intentos + 1}/${MAX_INTENTOS}`);
            console.log('IDs de facturas a consultar:', idsValidos);
            
            const response = await getFacturasSeleccionadas(token, idsValidos);
            
            if (response.success) {
                console.log(`Facturas obtenidas exitosamente: ${response.data.length} facturas`);
                setFacturas(response.data);
                setShouldFetch(false); // Detener consultas adicionales después de éxito
                if (onSuccess) {
                    onSuccess(response.data);
                }
            } else {
                const errorMsg = response.detail || 'Error al obtener las facturas seleccionadas';
                console.error('Error en la respuesta:', errorMsg);
                setError(errorMsg);
                
                // Solo intentar de nuevo automáticamente si es un error de red o timeout
                if (intentos < MAX_INTENTOS - 1 && (errorMsg.includes('timeout') || errorMsg.includes('red'))) {
                    setIntentos(prev => prev + 1);
                    // Programar el próximo intento con un retraso creciente (backoff exponencial)
                    const delay = Math.pow(2, intentos) * 1000; // 1s, 2s, 4s...
                    setTimeout(() => setShouldFetch(true), delay);
                } else {
                    // Si no es error de red o ya se intentó suficientes veces, notificar al usuario
                    if (onError) {
                        onError(errorMsg);
                    }
                    setShouldFetch(false);
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error al obtener las facturas seleccionadas';
            console.error('Error al obtener facturas seleccionadas:', error);
            setError(errorMsg);
            
            // Intentar nuevamente sólo para errores de red
            if (intentos < MAX_INTENTOS - 1 && 
                (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('red'))) {
                setIntentos(prev => prev + 1);
                // Programar el próximo intento con un retraso creciente
                const delay = Math.pow(2, intentos) * 1000;
                setTimeout(() => setShouldFetch(true), delay);
            } else {
                if (onError) {
                    onError(errorMsg);
                }
                setShouldFetch(false);
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, idsValidos, onSuccess, onError, intentos, isLoading, MAX_INTENTOS]);

    // Obtener facturas cuando se debe realizar una consulta
    useEffect(() => {
        if (shouldFetch && idsValidos.length > 0 && !isLoading) {
            obtenerFacturasSeleccionadas();
        }
    }, [obtenerFacturasSeleccionadas, shouldFetch, idsValidos, isLoading]);

    // Función para recargar los datos manualmente
    const refetch = useCallback(() => {
        setIntentos(0); // Resetear el contador de intentos
        setShouldFetch(true);
    }, []);

    return {
        facturas,
        isLoading,
        error,
        refetch
    };
}; 