import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecaudadorPazSalvoData } from '../adapters/recaudadorPazSalvo.adapter';
import { RecaudadorPazSalvoData, ConsultaPazSalvoFormData } from '../models/recaudadorPazSalvo.model';

const EMPTY_FORM: ConsultaPazSalvoFormData = {
    razonSocial: '',
    nombreComercial: '',
    idPersonaGenera: 0,
    direccionNotificacion: '',
    fechaInicio: '',
    documentoIdentificacion: '',
    correoElectronico: '',
    municipio: '',
    fechaFinalizacion: '',
    // Asegurarse de que no falte ningún campo del modelo
};

export const useRecaudadorPazSalvo = (token: string) => {
    const [recaudadorData, setRecaudadorData] = useState<RecaudadorPazSalvoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<ConsultaPazSalvoFormData>({...EMPTY_FORM});
    const [isInternal, setIsInternal] = useState<boolean>(false);
    
    // Estado para evitar múltiples llamadas
    const [dataFetched, setDataFetched] = useState(false);
    
    // Referencia para controlar las peticiones en curso
    const isFetchingRef = useRef(false);

    // Añadimos un efecto para el debugging, pero solo cuando cambia isInternal
    useEffect(() => {
        console.log("[useRecaudadorPazSalvo] - Estado isInternal actualizado:", isInternal);
        
        // Si se actualiza a internal, limpiar los campos inmediatamente
        if (isInternal) {
            console.log("[useRecaudadorPazSalvo] - Usuario interno detectado, limpiando todos los campos");
            setFormData({...EMPTY_FORM});
        }
    }, [isInternal]);

    // Función para establecer directamente el valor de isInternal
    const setIsInternalDirectly = useCallback((value: boolean) => {
        console.log("[useRecaudadorPazSalvo] - Estableciendo isInternal directamente a:", value);
        
        if (value === isInternal) {
            console.log("[useRecaudadorPazSalvo] - El valor ya es", value, "- No se hace nada");
            return; // Evitar re-renders innecesarios
        }
        
        setIsInternal(value);
        
        // Si se establece como interno, limpiar los campos inmediatamente
        if (value) {
            console.log("[useRecaudadorPazSalvo] - Limpiando campos automáticamente por cambio a usuario interno");
            setFormData({...EMPTY_FORM});
        }
    }, [isInternal]);

    // Usar useCallback para evitar múltiples recreaciones de la función
    const fetchRecaudadorData = useCallback(async () => {
        // Si el usuario es interno, no cargar datos
        if (isInternal) {
            console.log("[useRecaudadorPazSalvo] - Usuario interno: omitiendo carga de datos del recaudador");
            setFormData({...EMPTY_FORM});
            setIsLoading(false);
            return;
        }
        
        // Evitar peticiones simultáneas
        if (isFetchingRef.current) {
            console.log("[useRecaudadorPazSalvo] - Ya hay una petición en curso, omitiendo");
            return;
        }
        
        // Evitar múltiples llamadas si ya tenemos datos
        if (dataFetched && recaudadorData) {
            console.log("[useRecaudadorPazSalvo] - Datos ya obtenidos, verificando si se deben usar:");
            
            // Si el usuario es interno, no necesitamos rellenar los campos
            if (isInternal) {
                console.log("[useRecaudadorPazSalvo] - Usuario interno: manteniendo campos vacíos");
                setFormData({...EMPTY_FORM});
                return;
            }
            
            // Si es usuario externo, verificar si ya tenemos los datos en el formulario
            if (formData.razonSocial && formData.documentoIdentificacion) {
                console.log("[useRecaudadorPazSalvo] - Ya tenemos datos en el formulario, no se hace nada");
                return;
            }
            
            // Si llegamos aquí, rellenamos el formulario con los datos que ya tenemos
            console.log("[useRecaudadorPazSalvo] - Rellenando formulario con datos existentes");
            fillFormWithRecaudadorData(recaudadorData);
            return;
        }
        
        try {
            console.log("[useRecaudadorPazSalvo] - Iniciando petición de datos del recaudador");
            isFetchingRef.current = true;
            setIsLoading(true);
            setError(null);
            
            if (!token) {
                throw new Error('No hay token disponible');
            }

            const response = await getRecaudadorPazSalvoData(token);
            setRecaudadorData(response.data);
            setDataFetched(true);
            
            console.log("[useRecaudadorPazSalvo] - Datos recibidos:", response.data);
            console.log("[useRecaudadorPazSalvo] - isInternal actual:", isInternal);
            
            // Si no es usuario interno, actualizar el formulario con los datos del recaudador
            if (!isInternal) {
                console.log("[useRecaudadorPazSalvo] - Usuario externo: completando formulario con datos del recaudador");
                fillFormWithRecaudadorData(response.data);
            } else {
                console.log("[useRecaudadorPazSalvo] - Usuario interno: manteniendo campos vacíos");
                // Asegurar que los campos estén vacíos para usuarios internos
                setFormData({...EMPTY_FORM});
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar los datos del recaudador');
            console.error('[useRecaudadorPazSalvo] - Error:', err);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [token, isInternal, dataFetched, recaudadorData, formData.razonSocial, formData.documentoIdentificacion]);

    // Función auxiliar para rellenar el formulario con los datos del recaudador
    const fillFormWithRecaudadorData = useCallback((data: RecaudadorPazSalvoData) => {
        // No llenar el formulario si el usuario es interno
        if (isInternal) {
            console.log("[useRecaudadorPazSalvo] - fillFormWithRecaudadorData: Usuario interno, no se llenan campos");
            return;
        }
        
        console.log("[useRecaudadorPazSalvo] - fillFormWithRecaudadorData: Llenando campos para usuario externo");
        setFormData(prev => ({
            ...prev,
            razonSocial: data.razon_social || '',
            nombreComercial: data.nombre_comercial || '',
            direccionNotificacion: data.direccion_notificaciones || '',
            documentoIdentificacion: data.numero_documento || '',
            correoElectronico: data.email || '',
            municipio: data.nombre_municipio || '',
            idPersonaGenera: data.id_persona || 0,
        }));
    }, [isInternal]);

    // Efecto para detectar tipo de usuario de localStorage solo al inicio
    useEffect(() => {
        // Detectar si el usuario es interno basado en la información de la sesión
        try {
            const sessionStr = localStorage.getItem('session');
            if (sessionStr) {
                const sessionData = JSON.parse(sessionStr);
                const tipoUsuario = sessionData?.user?.tipo_usuario;
                console.log("[useRecaudadorPazSalvo] - Session data tipo_usuario:", tipoUsuario);
                
                // Mejorar la detección de usuario interno
                const esInterno = tipoUsuario === 'INTERNO' || 
                                 tipoUsuario === 'I' || 
                                 tipoUsuario?.startsWith('I') || 
                                 tipoUsuario?.startsWith('INTERNO');
                
                console.log("[useRecaudadorPazSalvo] - Usuario interno detectado:", esInterno);
                
                // Si es usuario interno, limpiar los campos
                if (esInterno) {
                    setFormData({...EMPTY_FORM});
                }
                
                setIsInternal(esInterno);
            }
        } catch (err) {
            console.error('[useRecaudadorPazSalvo] - Error al verificar tipo de usuario:', err);
        }
    }, []); // Solo se ejecuta una vez al montar el componente

    // Efecto para cargar datos cuando cambia el token
    useEffect(() => {
        if (token) {
            // Si es usuario interno, asegurar que los campos estén vacíos antes de cualquier operación
            if (isInternal) {
                console.log("[useRecaudadorPazSalvo] - Detectado usuario interno, limpiando campos antes de cargar datos");
                setFormData({...EMPTY_FORM});
                return; // No cargar datos de recaudador para usuarios internos
            }
            
            // Solo cargar datos para usuarios externos
            fetchRecaudadorData();
        }
    }, [token, fetchRecaudadorData, isInternal]); // Incluir isInternal en las dependencias

    const updateFormDates = useCallback((fechaInicio: string, fechaFinalizacion: string) => {
        setFormData(prev => ({
            ...prev,
            fechaInicio,
            fechaFinalizacion
        }));
    }, []);
    
    const updateFormField = useCallback((name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const clearFormData = useCallback(() => {
        console.log("[useRecaudadorPazSalvo] - Limpiando todos los campos del formulario manualmente");
        // Asegurarse de que TODOS los campos se vacían, no solo algunos
        const emptyForm = { ...EMPTY_FORM };
        
        // Verificación adicional para asegurar que todos los campos están vacíos
        Object.keys(emptyForm).forEach(key => {
            if (emptyForm[key as keyof ConsultaPazSalvoFormData] !== '') {
                console.warn(`[useRecaudadorPazSalvo] - Campo ${key} no está vacío en EMPTY_FORM`);
                (emptyForm as any)[key] = '';
            }
        });
        
        // Establecer el formulario completamente vacío
        setFormData(emptyForm);
    }, []);

    return {
        recaudadorData,
        formData,
        isLoading,
        error,
        updateFormDates,
        updateFormField,
        clearFormData,
        isInternal,
        setIsInternalDirectly,
        refetch: fetchRecaudadorData
    };
}; 