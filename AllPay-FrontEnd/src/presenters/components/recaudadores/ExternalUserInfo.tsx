'use client';

import { useState, useEffect } from 'react';
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useLoggedUser } from '@/application/acuerdos_pago/useLoggedUserPaymentAgreement';

export const ExternalUserInfo = () => {

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const { data: userData, loading: loadingUser, error: errorUser } = useLoggedUser(token);

    // Determinar si está en modo oscuro
    const isDarkMode = mounted && theme === 'dark';

    if (!mounted) {
        return null;
    }

    if (loadingUser) {
        return <div className={`text-center py-8 ${isDarkMode ? 'text-white' : ''}`}>Cargando datos del usuario...</div>;
    }
    if (errorUser) {
        return <div className={`text-center py-8 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{errorUser}</div>;
    }

    return (
        <>
            <div className="flex flex-col md:flex-row gap-4 mt-4">    

                {userData?.data?.tipo_persona === 'Juridica' ? (
                <div className="w-full md:flex-1">
                    <AnimatedInput
                        label="Razón social"
                        name="social_reason"
                        value={userData?.data?.razon_social || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />
                </div>
                ) :  (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Correo electrónico"
                            name="email"
                            value={userData?.data?.email || ''}
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
                        value={userData?.data?.numero_documento || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />   

                    <AnimatedInput
                        label="Tipo de persona"
                        name="type_person"
                        value={userData?.data?.tipo_persona || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />  

                </div>        
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-4">

                {userData?.data?.tipo_persona === 'Juridica' ? (
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="w-full md:flex-1">
                            <AnimatedInput
                                label="Nombre comercial"
                                name="commercial_name"
                                value={userData?.data?.nombre_comercial || ''}
                                type="text"
                                readOnly
                                darkMode={isDarkMode}
                            />          
                        </div>

                        <div className="w-full md:flex-1">
                            <AnimatedInput
                                label="Correo electrónico"
                                name="email"
                                value={userData?.data?.email || ''}
                                type="text"
                                readOnly
                                darkMode={isDarkMode}
                            />
                        </div>
                    </div>   
                ) : (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Nombres"
                            name="names"
                            value={userData?.data?.nombre_completo || ''}
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
                        value={userData?.data?.direccion_notificaciones || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />
                </div>

                {userData?.data?.tipo_persona === 'Juridica' ? (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                        label="Nacionalidad"
                        name="nationality"
                        value={userData?.data?.pais_nacionalidad_empresa || ''}
                        type="text"
                        readOnly
                        darkMode={isDarkMode}
                    />
                    </div>            
                ) : (
                    <div className="w-full md:flex-1">
                        <AnimatedInput
                            label="Nacionalidad"
                            name="nationality"
                            value={userData?.data?.pais_nacimiento || ''}
                            type="text"
                            readOnly
                            darkMode={isDarkMode}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

