'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import ModalContainer from '../../ui/ModalContainer';
import { Button } from "@/presenters/components/ui/AnimatedButton";
import useTotp from '@/app/(Component)/(ComponentDashboard)/profile/changePassword/hooks/useTotp';
import useTotpActivate from '@/app/(Component)/(ComponentDashboard)/profile/changePassword/hooks/useTotpActivate';
import Swal from 'sweetalert2';

interface AppAuthenticationSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
}

const AppAuthenticationSetup: React.FC<AppAuthenticationSetupProps> = ({ isOpen, onClose, onBack }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const hasFetchedRef = useRef(false);

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;
    const { data: totpData, isLoading: isLoadingTotp, error: totpError, generateTotp } = useTotp();
    const { activateTotp, isLoading: isActivating, error: activateError } = useTotpActivate();
    const [codigo, setCodigo] = useState<string>('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && token && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            generateTotp(token, { id_2fa: 3 });
        }
    }, [isOpen, token, generateTotp]);

    // Resetear el ref cuando el modal se cierra
    useEffect(() => {
        if (!isOpen) {
            hasFetchedRef.current = false;
            setCodigo('');
        }
    }, [isOpen]);

    const handleContinue = async () => {
        if (!codigo.trim()) {
            Swal.fire({
                title: '¡Atención!',
                text: 'Por favor, ingrese el código de autenticación',
                icon: 'warning',
                confirmButtonColor: "#4D750F",
                confirmButtonText: 'Aceptar',
            });
            return;
        }

        if (!token) {
            Swal.fire({
                title: '¡Error!',
                text: 'No se encontró el token de autenticación',
                icon: 'error',
                confirmButtonColor: "#4D750F",
                confirmButtonText: 'Aceptar',
            });
            return;
        }

        const response = await activateTotp(token, { codigo: codigo.trim() });

        if (response?.success) {
            Swal.fire({
                title: '¡Exitoso!',
                text: response.detail || 'El método TOTP fue activado correctamente',
                icon: 'success',
                confirmButtonColor: "#4D750F",
                confirmButtonText: 'Aceptar',
            }).then(() => {
                onClose();
            });
        } else {
            Swal.fire({
                title: '¡Error!',
                text: activateError || response?.detail || 'Error al activar el método TOTP',
                icon: 'error',
                confirmButtonColor: "#4D750F",
                confirmButtonText: 'Aceptar',
            });
        }
    };

    const isDarkMode = mounted && theme === 'dark';

    return (
        isOpen && (
            <ModalContainer isOpen={isOpen} onClose={onClose}>

                <div className='p-6'>

                    <h2 className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Agregar aplicación de autenticación</h2>

                    <p className={`font-semibold text-left mb-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Aplicaciones de autenticación</p>

                    <p className={`text-left mb-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Con una aplicación como Google Authenticator o Microsoft Authenticator, escanea el código QR. Authy o 1Password, escanea el codigo QR.
                    </p>

                    <p className={`text-left mb-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        se generara un código de 6 dígitos que deberás ingresar a continuación
                    </p>

                    <div className="flex justify-center">
                        {isLoadingTotp ? (
                            <div className={`w-32 h-32 flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                <div className="loader"></div>
                            </div>
                        ) : totpError ? (
                            <div className={`w-32 h-32 flex items-center justify-center text-center p-4 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                                <p className="text-sm">Error al cargar el QR</p>
                            </div>
                        ) : totpData?.qr_base64 ? (
                            <img 
                                src={totpData.qr_base64} 
                                alt="Código QR TOTP" 
                                className="w-32 h-32"
                            />
                        ) : (
                            <div className={`w-32 h-32 flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                <p className="text-sm">No hay código QR disponible</p>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 rounded-md text-left my-4 ${isDarkMode ? 'bg-[#3d1a00] border border-white/20 text-white' : 'bg-[#e0dcdc] text-[#562707]'}`}>
                        {totpData?.secret || (isLoadingTotp ? 'Cargando...' : 'No disponible')}

                        <p className={`text-sm text-left ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                            Si tiene problemas para utilizar el código QR, seleccione la entrada manual en su aplicación.
                        </p>
                    </div>

                    <input
                        type="text"
                        placeholder="Introduzca el código de autenticación"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        disabled={isActivating}
                        maxLength={6}
                        className={`w-full p-3 border rounded-2xl focus:outline-none ${isDarkMode 
                            ? 'bg-[#260f00] border-white/30 text-white placeholder-white/50 focus:border-[rgb(var(--green))] disabled:opacity-50' 
                            : 'bg-white border-gray-300 placeholder-[#562707] focus:border-[rgb(var(--green))] disabled:opacity-50'}`}
                    />

                    <div className="mt-6 flex justify-center space-x-4">
                        <Button
                            onClick={onBack}
                            title="Cancelar"
                            darkMode={isDarkMode}
                            disabled={isActivating}
                        />

                        <Button
                            onClick={handleContinue}
                            title={isActivating ? "Activando..." : "Continuar"}
                            darkMode={isDarkMode}
                            disabled={isActivating || !codigo.trim()}
                        />
                    </div>

                </div>

            </ModalContainer>
        )
    );
};

export default AppAuthenticationSetup;
