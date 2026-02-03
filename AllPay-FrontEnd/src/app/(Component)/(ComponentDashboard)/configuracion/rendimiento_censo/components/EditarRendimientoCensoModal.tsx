'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { useUpdateRendimientoCenso } from '../hooks/useUpdateRendimientoCenso';
import { RendimientoCenso } from '../models/rendimientoCenso.model';

interface EditarRendimientoCensoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    registro: RendimientoCenso | null;
}

const EditarRendimientoCensoModal: React.FC<EditarRendimientoCensoModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    registro
}) => {
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Estados del formulario
    const [rendimientoCenso, setRendimientoCenso] = useState<string>('');

    // Estados para alertas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Hook
    const { updateRecord, isUpdating } = useUpdateRendimientoCenso();

    // Funciones helper para alertas
    const showError = (message: string) => {
        setErrorMessage(message);
        setShowErrorAlert(true);
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setShowSuccessAlert(true);
    };

    // Efecto para cargar datos del registro cuando se abre el modal
    useEffect(() => {
        if (isOpen && registro) {
            setRendimientoCenso(registro.rendimiento_censo);
        }
    }, [isOpen, registro]);

    // Manejar cambios en el input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRendimientoCenso(e.target.value);
    };

    // Validar formulario
    const validateForm = (): boolean => {
        if (!rendimientoCenso.trim()) {
            showError('El rendimiento censo es requerido');
            return false;
        }

        const rendimientoNum = parseFloat(rendimientoCenso);
        if (isNaN(rendimientoNum) || rendimientoNum < 0) {
            showError('El rendimiento censo debe ser un número mayor o igual a 0');
            return false;
        }

        return true;
    };

    // Manejar envío del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || !registro) {
            if (!registro) {
                showError('Error: No se puede actualizar el registro');
            }
            return;
        }

        try {
            const payload = {
                rendimiento_censo: parseFloat(rendimientoCenso)
            };
            
            const response = await updateRecord(token, registro.codigo_departamento, payload);
            
            // Si llegamos aquí, la actualización fue exitosa
            const successMsg = response.detail || 'Registro actualizado exitosamente';
            showSuccess(successMsg);
            
            // Llamar callback de éxito después de un delay para mostrar la alerta
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
            
        } catch (error: any) {
            console.error('Error al actualizar el rendimiento censo:', error);
            // Extraer mensaje de error específico de la respuesta
            let errorMsg = 'Error al actualizar el rendimiento censo';
            
            if (error?.response?.data?.errors) {
                const errors = error.response.data.errors;
                const firstErrorKey = Object.keys(errors)[0];
                if (firstErrorKey && Array.isArray(errors[firstErrorKey])) {
                    errorMsg = errors[firstErrorKey][0];
                }
            } else if (error?.response?.data?.detail) {
                errorMsg = error.response.data.detail;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            
            showError(errorMsg);
        }
    };

    const handleButtonClick = () => {
        handleSubmit({ preventDefault: () => { } } as React.FormEvent);
    };

    // Manejar cierre del modal
    const handleClose = () => {
        if (!isUpdating) {
            setRendimientoCenso('');
            onClose();
        }
    };

    if (!registro) {
        return null;
    }

    return (
        <>
            <ModalContainer isOpen={isOpen} onClose={handleClose} size="lg">
                <div className="p-6">
                    <h2 className={`text-2xl font-bold mb-6 text-center ${
                        isDarkMode ? 'text-white' : 'text-[#562707]'
                    }`}>
                        Editar Rendimiento Censo
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div>
                            <AnimatedInput
                                label="Departamento"
                                name="departamento"
                                type="text"
                                value={registro.nombre_departamento}
                                onChange={() => {}} 
                                disabled={true}
                                required
                                darkMode={isDarkMode}
                            />
                        </div>

                        <div>
                            <AnimatedInput
                                label="Código Departamento"
                                name="codigo_departamento"
                                type="text"
                                value={registro.codigo_departamento}
                                onChange={() => {}} 
                                disabled={true}
                                required
                                darkMode={isDarkMode}
                            />
                        </div>

                        {/* Input de Rendimiento Censo */}
                        <div>
                            <AnimatedInput
                                label="Rendimiento Censo"
                                name="rendimiento_censo"
                                type="number"
                                step="0.01"
                                value={rendimientoCenso}
                                onChange={handleInputChange}
                                disabled={isUpdating}
                                required
                                darkMode={isDarkMode}
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex justify-center gap-4 pt-4">
                            <Button
                                type="button"
                                title="Cancelar"
                                onClick={handleClose}
                                disabled={isUpdating}
                            />
                            <Button
                                title={isUpdating ? "Actualizando..." : "Actualizar Registro"}
                                type="submit"
                                loading={isUpdating}
                                disabled={isUpdating}
                                onClick={handleButtonClick}
                            />
                        </div>
                    </form>
                </div>
            </ModalContainer>

            <AlertError
                isOpen={showErrorAlert}
                message={errorMessage}
                onClose={() => {
                    setShowErrorAlert(false);
                    setErrorMessage('');
                }}
            />

            <AlertSuccess
                isOpen={showSuccessAlert}
                message={successMessage}
                onClose={() => {
                    setShowSuccessAlert(false);
                    setSuccessMessage('');
                }}
                autoCloseMs={3000}
            />
        </>
    );
};

export default EditarRendimientoCensoModal;
