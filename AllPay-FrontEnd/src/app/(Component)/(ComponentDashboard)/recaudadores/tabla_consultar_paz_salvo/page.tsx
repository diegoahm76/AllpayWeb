'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const RedirectToPazSalvoPage: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Obtener los parámetros de la URL actual
        const fechaInicio = searchParams.get('fechaInicio');
        const fechaFin = searchParams.get('fechaFin');
        
        // Construir la nueva URL con los mismos parámetros
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fechaInicio', fechaInicio);
        if (fechaFin) params.append('fechaFin', fechaFin);
        
        // Redirigir a la nueva ruta
        const queryString = params.toString();
        const redirectUrl = `/recaudadores/consultar_paz_salvo${queryString ? `?${queryString}` : ''}`;
        
        router.replace(redirectUrl);
    }, [router, searchParams]);

    // Mostrar un mensaje de carga mientras se redirige
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#78390e]" />
            <p className="ml-4 text-xl">Redirigiendo...</p>
        </div>
    );
};

export default RedirectToPazSalvoPage;