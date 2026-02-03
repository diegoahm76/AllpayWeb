import { useState, useEffect } from 'react';
import { getPuertosExportacion } from '../adapters/puertoExportacion.adapter';
import { PuertoExportacionData } from '../models/puertoExportacion.model';

export const usePuertosExportacion = (token: string) => {
    const [puertosExportacion, setPuertosExportacion] = useState<PuertoExportacionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPuertosExportacion = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                if (!token) {
                    throw new Error('No hay token disponible');
                }

                const response = await getPuertosExportacion(token);
                setPuertosExportacion(response.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar los puertos de exportación');
                console.error('Error en usePuertosExportacion:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPuertosExportacion();
    }, [token]);

    // Transformar los datos para el formato requerido por AnimatedSelect
    const puertosParaSelect = puertosExportacion
        .filter(puerto => puerto.activo) // Solo puertos activos
        .map(puerto => ({
            key: puerto.id_puerto_exportacion.toString(),
            value: puerto.id_puerto_exportacion.toString(),
            title: puerto.nombre
        }));

    return {
        puertosExportacion,
        puertosParaSelect,
        isLoading,
        error
    };
}; 