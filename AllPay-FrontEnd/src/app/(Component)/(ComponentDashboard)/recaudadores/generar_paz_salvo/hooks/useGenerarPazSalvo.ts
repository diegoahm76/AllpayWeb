import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { 
    GenerarPazSalvoRequest, 
    PazSalvoGenerado, 
    FacturaSeleccionada 
} from '../models/generarPazSalvo.model';
import { generarPazSalvo } from '../adapters/generarPazSalvo.adapter';

interface UseGenerarPazSalvoProps {
    onSuccess?: (data: PazSalvoGenerado) => void;
    onError?: (error: string) => void;
}

export const useGenerarPazSalvo = (props?: UseGenerarPazSalvoProps) => {
    const { onSuccess, onError } = props || {};
    
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pazSalvoGenerado, setPazSalvoGenerado] = useState<PazSalvoGenerado | null>(null);

    // Obtener las facturas seleccionadas del localStorage
    const getFacturasSeleccionadas = (): FacturaSeleccionada[] => {
        try {
            // Intentar recuperar las facturas seleccionadas del localStorage
            const facturasSeleccionadasJson = localStorage.getItem('facturasSeleccionadasPazSalvo');
            if (facturasSeleccionadasJson) {
                const facturasData = JSON.parse(facturasSeleccionadasJson);
                
                if (!Array.isArray(facturasData) || facturasData.length === 0) {
                    console.error('Formato inválido o no hay facturas en localStorage');
                    return [];
                }
                
                // Validar cada factura y extraer datos relevantes
                const facturasSeleccionadas = facturasData
                    .filter(factura => {
                        // Verificar que la factura tenga los campos necesarios
                        return factura && 
                               typeof factura.id_factura_unica === 'number' && 
                               (typeof factura.kilos_paz_y_salvo === 'number' || 
                                typeof factura.total_kilos === 'number');
                    })
                    .map(factura => {
                        // Usar kilos_paz_y_salvo si está disponible, este campo se actualiza cuando el usuario
                        // modifica los kilos para reportar en la interfaz
                        const kilosReportar = factura.kilos_paz_y_salvo !== undefined 
                            ? factura.kilos_paz_y_salvo 
                            : factura.total_kilos;
                        
                        // Ya no necesitamos forzar un valor mínimo porque permitimos 0
                        return {
                            id_factura: factura.id_factura_unica,
                            kilos_reportar: kilosReportar
                        };
                    });
                    
                console.log(`Facturas procesadas para enviar: ${facturasSeleccionadas.length}`);
                
                // Validar que exista al menos una factura con kilos reportados
                const hayFacturasConKilos = facturasSeleccionadas.some(f => f.kilos_reportar > 0);
                if (!hayFacturasConKilos) {
                    console.error('Ninguna factura tiene kilos para reportar');
                    return [];
                }
                
                return facturasSeleccionadas;
            }
            console.error('No se encontraron facturas en localStorage');
            return [];
        } catch (error) {
            console.error('Error al recuperar facturas seleccionadas:', error);
            return [];
        }
    };

    const generarNuevoPazSalvo = async (datos: {
        tipo_paz_y_salvo: string;
        total_kilos_paz_y_salvo: string;
        id_puerto_exportacion: number;
        id_persona_genera?: number;
        razon_social: string;
        id_tipo_doc_id: string;
        nro_doc_id: string;
        doc_paz_y_salvo?: number;
    }) => {
        const token = (session as any)?.user?.tokens?.access;
        if (!token) {
            const errorMsg = 'No hay token disponible';
            setError(errorMsg);
            onError?.(errorMsg);
            return null;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Obtener las facturas seleccionadas
            const facturasSeleccionadas = getFacturasSeleccionadas();
            
            if (facturasSeleccionadas.length === 0) {
                const errorMsg = 'No hay facturas seleccionadas para generar el paz y salvo';
                setError(errorMsg);
                onError?.(errorMsg);
                setIsLoading(false);
                return null;
            }
            
            // Validar campos obligatorios
            if (!datos.tipo_paz_y_salvo || !datos.total_kilos_paz_y_salvo) {
                const errorMsg = 'Faltan campos obligatorios para generar el paz y salvo';
                setError(errorMsg);
                onError?.(errorMsg);
                setIsLoading(false);
                return null;
            }

            // Verificar que total_kilos_paz_y_salvo sea un valor numérico válido
            const totalKilos = parseFloat(datos.total_kilos_paz_y_salvo);
            if (isNaN(totalKilos) || totalKilos <= 0) {
                const errorMsg = 'El total de kilos para paz y salvo debe ser un número positivo';
                setError(errorMsg);
                onError?.(errorMsg);
                setIsLoading(false);
                return null;
            }

            // Verificar que la suma de kilos_reportar coincida con total_kilos_paz_y_salvo (con un pequeño margen de error)
            const sumKilosReportar = facturasSeleccionadas.reduce((acc, f) => acc + f.kilos_reportar, 0);
            const diferencia = Math.abs(sumKilosReportar - totalKilos);
            
            if (diferencia > 0.1) { // Permitir un pequeño margen de error por redondeo
                console.warn(`Discrepancia en kilos: suma=${sumKilosReportar}, total=${totalKilos}`);
                // Ajustar los kilos para que coincidan si es necesario
                const facturasMayorPeso = [...facturasSeleccionadas].sort((a, b) => b.kilos_reportar - a.kilos_reportar);
                if (facturasMayorPeso.length > 0) {
                    facturasMayorPeso[0].kilos_reportar = facturasMayorPeso[0].kilos_reportar + (totalKilos - sumKilosReportar);
                }
            }

            // Determinar si es de tipo tercero (PT - exportación a tercero) o venta nacional (PV)
            // En ambos casos, el usuario ingresa manualmente los datos del tercero/comprador
            const esTipoTerceroOVentaNacional = datos.tipo_paz_y_salvo === 'PT' || datos.tipo_paz_y_salvo === 'PV';
            
            // Preparar la solicitud completa con los valores formateados correctamente
            const requestData: GenerarPazSalvoRequest = {
                tipo_paz_y_salvo: datos.tipo_paz_y_salvo,
                total_kilos_paz_y_salvo: totalKilos.toString(),
                id_puerto_exportacion: typeof datos.id_puerto_exportacion === 'string' 
                    ? parseInt(datos.id_puerto_exportacion, 10) 
                    : datos.id_puerto_exportacion,
                // Si es tipo tercero (PT) o venta nacional (PV), usar los datos ingresados por el usuario
                // Para otros tipos (propio), enviar vacío
                razon_social_tercero: esTipoTerceroOVentaNacional ? datos.razon_social : '',
                id_tipo_doc_tercero: esTipoTerceroOVentaNacional ? datos.id_tipo_doc_id : '',
                nro_doc_tercero: esTipoTerceroOVentaNacional ? datos.nro_doc_id : '',
                id_persona_genera: datos.id_persona_genera || 0,
                doc_paz_y_salvo: datos.doc_paz_y_salvo || 0,
                facturas: facturasSeleccionadas
            };

            console.log('Datos a enviar para generar paz y salvo:', requestData);

            // Realizar la petición
            const response = await generarPazSalvo(token, requestData);
            
            if (response.success) {
                setPazSalvoGenerado(response.data);
                onSuccess?.(response.data);
                
                // Limpiar el localStorage después de generar el paz y salvo exitosamente
                localStorage.removeItem('facturasSeleccionadasPazSalvo');
                
                return response.data;
            } else {
                const errorMsg = response.detail || 'Error al generar el paz y salvo';
                setError(errorMsg);
                onError?.(errorMsg);
                return null;
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error al generar el paz y salvo';
            setError(errorMsg);
            onError?.(errorMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        generarPazSalvo: generarNuevoPazSalvo,
        isLoading,
        error,
        pazSalvoGenerado
    };
}; 