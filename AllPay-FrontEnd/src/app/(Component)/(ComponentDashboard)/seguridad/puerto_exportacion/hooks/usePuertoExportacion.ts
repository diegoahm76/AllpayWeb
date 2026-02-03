import { useState } from 'react';
import { getAllPuertosExportacion } from '../adapters/puerto.getAllType';
import { PuertoExportacion } from '../models/types';

export const usePuertoExportacion = () => {
    const [puertos, setPuertos] = useState<PuertoExportacion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPuertos = async (token: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getAllPuertosExportacion(token);
            setPuertos(response.data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al obtener puertos de exportación');
            console.error('Error fetching export ports:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Transformar los datos para el formato requerido por AnimatedSelect si es necesario
    const puertosParaSelect = puertos
        .filter(puerto => puerto.activo)
        .map(puerto => ({
            key: puerto.id_puerto_exportacion.toString(),
            value: puerto.id_puerto_exportacion.toString(),
            title: puerto.nombre
        }));

    return {
        puertos,
        puertosParaSelect,
        isLoading,
        error,
        fetchPuertos
    };
};