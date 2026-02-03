// useEmailVerification.ts
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { fetchAuthenticationMethods } from '@/app/api/auth/authenticationMethods';
import { deleteAuthenticationMethod } from '@/app/api/twoFactorAuthentication/delete2fa';
import axios from 'axios';
import Swal from 'sweetalert2';

const baseApiUrl = process.env.BASE_API_URL;

export const useEmailVerification = (initialEmail: string) => {

    const [email, setEmail] = useState(initialEmail);
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        },
    });

    const valueSesion: any = session;

    const handleSaveEmailFactor = async (onClose: () => void) => {
        const validate = await validations();
        if (!validate) return;

        try {
            const response = await axios.post(
                `${baseApiUrl}users/segundo-facto-autenticacion/usuario/create/`,
                {
                    id_2fa: 1,
                    email_verificacion: email,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${valueSesion?.user?.tokens.access}`,
                    },
                }
            );

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Autenticación de correo habilitada',
                    showConfirmButton: false,
                    timer: 5000,
                });
                onClose();
                window.dispatchEvent(new Event('refresh2fa'));
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error habilitando el 2FA por correo',
                    text: response.data?.detail || 'No se pudo habilitar el segundo factor de autenticación por correo',
                    showConfirmButton: false,
                    timer: 5000,
                });
            }
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error habilitando el 2FA por correo',
                text: error?.response?.data?.detail || 'No se pudo procesar la solicitud',
                showConfirmButton: false,
                timer: 4000,
            });
        }
    };

    const validations = async () => {
        if (!email) return false;

        const has2fa = await fetchAuthenticationMethods(valueSesion?.user?.tokens.access);

        if (has2fa.data.length === 0) return true;

        const type2fa = has2fa.data[0]?.tipo_2fa;

        if (isEmailAlreadyEnabled(type2fa)) return false;


        return await confirmAuthenticationChange(has2fa.data[0]?.id_2fa_persona);
    };

    const isEmailAlreadyEnabled = (type2fa: string) => {
        if (type2fa === 'VEMAIL') {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Ya tienes habilitado el segundo factor de autenticación por correo',
                showConfirmButton: false,
                timer: 5000,
            });
            return true;
        }
        return false;
    };

    const confirmAuthenticationChange = async (authMethodId: number) => {
        const result = await Swal.fire({
            title: '¿Quieres cambiar tu método de autenticación?',
            text: 'Actualmente tienes otro método de autenticación habilitado. ¿Deseas cambiarlo a correo electrónico?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: "#4D750F",
            cancelButtonColor: "#4D750F",
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'No, mantener actual',
        });

        if (result.isConfirmed) {

            const deletionSuccess = await deleteAuthenticationMethod(authMethodId, valueSesion?.user?.tokens.access);

            if (!deletionSuccess) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error eliminando el método de autenticación anterior',
                    text: 'No se pudo eliminar el método de autenticación previo, por favor inténtalo de nuevo.',
                    showConfirmButton: true,
                });
                return false;
            }
        }

        return result.isConfirmed;
    };

    return { email, setEmail, handleSaveEmailFactor };
};
