import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { getConsecutivoPazSalvo } from '../adapters/consecutivoPazSalvo.adapter';

interface UseConsecutivoPazSalvoProps {
    onSuccess?: (consecutivo: string) => void;
    onError?: (error: string) => void;
}

export const useConsecutivoPazSalvo = (props?: UseConsecutivoPazSalvoProps) => {
    const { onSuccess, onError } = props || {};
    
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [consecutivo, setConsecutivo] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Referencia para evitar múltiples peticiones
    const hasRequestedInitialConsecutivo = useRef(false);

    // Usar useCallback para evitar recrear la función en cada renderizado
    const fetchConsecutivo = useCallback(async (force = false) => {
        // Validar si hay token disponible
        const token = (session as any)?.user?.tokens?.access;
        if (!token) {
            const errorMsg = 'No hay token disponible';
            console.error(errorMsg);
            setError(errorMsg);
            if (onError) onError(errorMsg);
            setIsLoading(false);
            return;
        }
        
        // Si ya se ha solicitado y no es forzado, no hacer nada
        if (hasRequestedInitialConsecutivo.current && !force) {
            console.log('Ya se ha solicitado el consecutivo y no se ha forzado una nueva solicitud');
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            
            // Llamar al adapter
            console.log('Obteniendo consecutivo de paz y salvo...');
            const response = await getConsecutivoPazSalvo(token);
            
            if (response.success) {
                console.log('Consecutivo obtenido:', response.consecutivo);
                setConsecutivo(response.consecutivo);
                if (onSuccess) onSuccess(response.consecutivo);
            } else {
                const errorMsg = response.detail || 'Error al obtener el consecutivo';
                console.error(errorMsg);
                setError(errorMsg);
                if (onError) onError(errorMsg);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error al obtener el consecutivo';
            console.error('Error en fetchConsecutivo:', errorMsg);
            setError(errorMsg);
            if (onError) onError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [session, onSuccess, onError]);

    // Obtener el consecutivo cuando la sesión esté lista, solo una vez
    useEffect(() => {
        if (status === 'authenticated' && session && !hasRequestedInitialConsecutivo.current) {
            hasRequestedInitialConsecutivo.current = true;
            fetchConsecutivo();
        }
    }, [status, session, fetchConsecutivo]);

    // Función para obtener el consecutivo manualmente
    const refetch = useCallback(() => {
        fetchConsecutivo(true);
    }, [fetchConsecutivo]);

    return {
        consecutivo,
        isLoading,
        error,
        refetch
    };
}; 