'use client';

import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import { useSession } from 'next-auth/react';
import AnimatedSelect from "@/presenters/components/ui/AnimatedSelect";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useTheme } from 'next-themes';
import { useTypeDni } from "@/application/dni/useTypeDni";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { useGetTaxCollectors } from "@/application/user/useGetTaxCollectors";

// notifications
import AlertLoader from "@/presenters/components/recaudadores/AlertLoader";
import AlertError from "@/presenters/components/recaudadores/AlertError";
import AlertSuccess from "@/presenters/components/recaudadores/AlertSuccess";

interface FormData {
    tipo_documento_recaudador: string;
    documento_identificacion: string;

    nombre_completo: string;
    razon_social: string;
    numero_documento_recaudador: string;
    tipo_persona: string;
    nombre_comercial: string;
    correo_electronico: string;
    direccion_notificaciones: string;
    nacionalidad: string;
    tipo_persona_display: string;
}

interface RecaudadorData {
    id_persona: number;
    tipo_documento: string;
    numero_documento: string;
    nombres: string;
    apellidos: string;
    celular_persona?: string | null;
    cod_departamento_expedicion?: string | null;
    cod_departamento_residencial_laboral?: string | null;
    cod_municipio_expedicion_id?: string | null;
    cod_tipo_comprador?: string | null;
    codigo_municipio_residencial_laboral?: string | null;
    departamento_residencia?: string | null;
    direccion_notificaciones?: string | null;
    email?: string | null;
    municipio_residencia?: string | null;
    nombre_comercial?: string | null;
    nombre_departamento_expedicion?: string | null;
    nombre_departamento_residencial_laboral?: string | null;
    nombre_municipio_expedicion?: string | null;
    nombre_municipio_residencial_laboral?: string | null;
    pais_nacimiento?: string | null;
    proveedor?: boolean | null;
    razon_social?: string | null;
    tipo_persona?: string | null;
    tipo_persona_display?: string | null;
}

interface InternalUserInfoProps {
    onFoundCollector?: (numero_documento: string) => void;
    onRecaudadorFound?: (recaudadorData: RecaudadorData) => void;
    darkMode?: boolean;
}

interface InternalUserInfoRef {
    clearForm: () => void;
}

export const InternalUserInfo = forwardRef<InternalUserInfoRef, InternalUserInfoProps>(
    ({ onFoundCollector, onRecaudadorFound, darkMode }, ref) => {

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // notificaciones
    const [isSuccess, setIsSuccess] = useState(false);
    const [successText, setSuccessText] = useState<string | React.ReactNode>('');
    const [isError, setIsError] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [isLoading, ] = useState(false);
    const [isLoadingText, ] = useState('');

    const { data: session } = useSession();
    //const token = (session as any)?.user?.tokens?.access;
    const valueSesion: any = session;
    const { types, fetchTypes } = useTypeDni();
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
    
    const {fetchTaxCollectors, isLoading: isLoadingTaxCollectors } = useGetTaxCollectors();

    // Determinar si está en modo oscuro (usar prop si se proporciona, de lo contrario calcular)
    const isDarkMode = darkMode !== undefined ? darkMode : (mounted && theme === 'dark');

    // Estado inicial del formulario
    const initialFormData: FormData = {
        tipo_documento_recaudador: '',
        numero_documento_recaudador: '',
        documento_identificacion: '',
        tipo_persona: '',
        nombre_completo: '',
        nombre_comercial: '',
        correo_electronico: '',
        direccion_notificaciones: '',
        nacionalidad: '',
        tipo_persona_display: '',
        razon_social: ''
    };

    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Función para limpiar el formulario
    const clearForm = () => {
        setFormData(initialFormData);
        setIsSuccess(false);
        setIsError(false);
        setSuccessText('');
        setErrorText('');
    };

    // Exponer la función clearForm al componente padre a través del ref
    useImperativeHandle(ref, () => ({
        clearForm
    }));

    const getFilteredDocumentTypes = () => {
        if (!types || types.length === 0) {
            return [];
        }

        return types.map(type => ({
            key: type.cod_tipo_documento || '',
            value: type.cod_tipo_documento || '',
            title: type.nombre || ''
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;

        const selectedValue = value || '';

        setFormData(prev => {
            const newState = {
                ...prev,
                [name]: selectedValue
            };
            return newState;
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearchRecaudador = async () => {

        if (!formData.tipo_documento_recaudador || !formData.numero_documento_recaudador) {
            setIsError(true);
            setErrorText('Por favor, ingrese el tipo y número de documento para buscar el recaudador');
            return;
        }

        
        setFormData(prev => ({
            ...prev,
            tipo_documento_recaudador: formData.tipo_documento_recaudador,
            numero_documento_recaudador: formData.numero_documento_recaudador,
            documento_identificacion: formData.documento_identificacion,
            tipo_persona: formData.tipo_persona,
            tipo_persona_display: formData.tipo_persona_display,
            nombre_completo: formData.nombre_completo,
            nombre_comercial: formData.nombre_comercial,
            correo_electronico: formData.correo_electronico,
            direccion_notificaciones: formData.direccion_notificaciones,
            nacionalidad: formData.nacionalidad
        }));

        try {

            const token = valueSesion?.user?.tokens?.access || '';

            const response = await fetchTaxCollectors(token, {
                tipo_documento: formData.tipo_documento_recaudador,
                numero_documento: formData.numero_documento_recaudador
            });

            if (response && response.data && response.data.length > 0) {

                const recaudador = response.data[0];
  
                setFormData(prev => ({
                    ...prev,
                    tipo_documento_recaudador: recaudador.tipo_documento,
                    numero_documento_recaudador: recaudador.numero_documento,
                    documento_identificacion: recaudador.numero_documento,
                    tipo_persona: recaudador.tipo_persona,
                    nombre_completo: `${recaudador.nombres} ${recaudador.apellidos}`,
                    razon_social: recaudador.razon_social || '',
                    nombre_comercial: recaudador.nombre_comercial || '',
                    tipo_persona_display: recaudador.tipo_persona_display || '',
                    correo_electronico: recaudador.email,
                    direccion_notificaciones: recaudador.direccion_notificaciones,
                    nacionalidad: recaudador.pais_nacimiento || '',
                }));

                if (onFoundCollector) {
                    onFoundCollector(recaudador.numero_documento);
                }

                // Nuevo callback que devuelve todos los datos del recaudador
                if (onRecaudadorFound) {
                    onRecaudadorFound(recaudador);
                }

                setIsSuccess(true);
                setSuccessText('Recaudador encontrado');
                return;
            }

            setIsError(true);
            setErrorText('No se encontró ningún recaudador con los datos proporcionados');

        } catch (error) {
            console.error('Error al buscar recaudador:', error);
            setIsError(true);
            setErrorText(error instanceof Error ? error.message : 'Ocurrió un error al buscar el recaudador');
        }
    };

    useEffect(() => {
        if (valueSesion?.user?.tokens?.access && !hasFetchedTypes) {
            fetchTypes(valueSesion.user.tokens.access);
            setHasFetchedTypes(true);
        }
    }, [valueSesion, hasFetchedTypes, fetchTypes]);

    if (!mounted) {
        return null;
    }

    return (
        <>
            <AlertError
                isOpen={isError}
                message={errorText}
                onClose={() => setIsError(false)}
            />

            <AlertLoader
                isOpen={isLoading}
                loadingText={isLoadingText}
            />

            <AlertSuccess
                isOpen={isSuccess}
                message={successText as string}
                onClose={() => setIsSuccess(false)}
            />

            <div className='flex flex-col sm:flex-row justify-center mb-4 mt-4 gap-4'>
                <AnimatedSelect
                    label="TIPO DOCUMENTO"
                    name="tipo_documento_recaudador"
                    value={formData.tipo_documento_recaudador}
                    labelSize="sm"
                    onChange={handleSelectChange}
                    options={getFilteredDocumentTypes()}
                    darkMode={isDarkMode}
                />

                <AnimatedInput
                    label="Nº DOCUMENTO"
                    name="numero_documento_recaudador"
                    value={formData.numero_documento_recaudador}
                    onChange={handleInputChange}
                    type="text"
                    darkMode={isDarkMode}
                />
            </div>

            <div className='flex justify-center sm:justify-end mb-6 mt-4 gap-4'>
                <Button
                    title={isLoadingTaxCollectors ? "Buscando..." : "Buscar recaudador"}
                    onClick={handleSearchRecaudador}
                    disabled={isLoadingTaxCollectors}
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-4">     

                {formData.tipo_persona === 'J' ? (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Razón social"
                            name="social_reason"
                            value={formData?.razon_social || ''}
                            type="text"
                            readOnly
                            darkMode={isDarkMode}
                        />
                    </div>
                ) : (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Correo"
                            name="email"
                            value={formData?.correo_electronico || ''}
                            type="text"
                            readOnly
                            darkMode={isDarkMode}
                        />   
                    </div>
                )}
                    <div className="w-full md:flex-1 flex flex-col md:flex-row gap-4">
                        <AnimatedInput
                        label="Nº Documento"
                        name="number_document"
                        value={formData?.documento_identificacion || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />   

                    <AnimatedInput
                        label="Tipo de persona"
                        name="type_person"
                        value={formData?.tipo_persona_display || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />  

                    </div>        
                
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-4">

                {formData.tipo_persona === 'J' ? (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Nombre comercial"
                            name="commercial_name"
                            value={formData?.nombre_comercial || ''}
                            type="text"
                            readOnly
                            darkMode={isDarkMode}
                        />          
                    </div>
                ) : (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Nombres"
                            name="names"
                            value={formData?.nombre_completo || ''}
                            type="text"
                            readOnly
                            darkMode={isDarkMode}
                        />
                    </div>
                )}

            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="w-full md:flex-1">
                    <AnimatedInput
                        label="Dirección"
                        name="address"
                        value={formData?.direccion_notificaciones || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />
                </div>
                
                <div className="w-full md:flex-1">
                    <AnimatedInput
                        label="Nacionalidad"
                        name="nationality"
                        value={formData?.nacionalidad || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />
                </div>      
         
            </div>
        </>
    );
});

// Nombre del componente para debugging
InternalUserInfo.displayName = 'InternalUserInfo';

// Exportar la interface para uso en otros componentes
export type { RecaudadorData, InternalUserInfoRef };

