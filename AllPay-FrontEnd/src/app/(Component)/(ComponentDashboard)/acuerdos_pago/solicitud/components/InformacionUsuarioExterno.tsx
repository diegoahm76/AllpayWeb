import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import { useSession } from 'next-auth/react';
import { useLoggedUser } from '@/application/acuerdos_pago/useLoggedUserPaymentAgreement';

export const ExternalUserInfo = () => {
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const { data: userData, loading: loadingUser, error: errorUser } = useLoggedUser(token);

    if (loadingUser) {
        return <div className="text-center py-8">Cargando datos del usuario...</div>;
    }
    if (errorUser) {
        return <div className="text-center text-red-600 py-8">{errorUser}</div>;
    }

    return (
        <>
        <div className='flex flex-col-2 gap-4 w-full mt-6'>
            
            <AnimatedInput 
                label='Documento de identificación' 
                name='documento_identificacion' 
                value={userData?.data?.numero_documento || ''} 
                readOnly
            />
            <AnimatedInput 
                label='Tipo de Persona' 
                name='tipo_persona' 
                value={userData?.data?.tipo_persona || ''} 
                readOnly
            />

        </div>

        <div className='flex flex-col-2 gap-4 w-full mt-4'>

                {userData?.data?.tipo_persona === 'Natural' ? (
                    <AnimatedInput 
                        label='nombre completo' 
                        name='nombre_completo' 
                        value={userData?.data?.nombre_completo || ''} 
                        readOnly
                    />
                ) : (
                <AnimatedInput 
                    label='Razón social' 
                    name='razon_social' 
                    value={userData?.data?.razon_social || ''} 
                    readOnly
                />
                )}
        </div>

        <div className='flex flex-col-2 gap-4 w-full mt-6'>
                <AnimatedInput 
                    label='Nombre comercial' 
                    name='nombre_comercial' 
                    value={userData?.data?.nombre_comercial || ''} 
                    readOnly
                />
                <AnimatedInput 
                    label='Correo electrónico' 
                    name='correo_electronico' 
                    value={userData?.data?.email || ''} 
                    readOnly
                />
        </div>

        <div className='flex flex-col-2 gap-4 w-full mt-6'>
                <AnimatedInput 
                    label='Dirección' 
                    name='direccion' 
                    value={userData?.data?.direccion_notificaciones || ''} 
                    readOnly
                />
                <AnimatedInput 
                    label='Nacionalidad' 
                    name='nacionalidad' 
                    value={userData?.data?.pais_nacimiento || ''} 
                    readOnly
                />
        </div>

    </>
    );
};

