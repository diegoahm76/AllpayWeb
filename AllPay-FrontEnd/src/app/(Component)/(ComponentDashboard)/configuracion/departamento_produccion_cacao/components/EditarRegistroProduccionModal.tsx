'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { useUpdateDepartamentoProduccionCacao } from '../hooks/useUpdateDepartamentoProduccionCacao';
import { DepartamentoProduccionCacao } from '../models/departamentoProduccionCacao.model';

interface EditarRegistroProduccionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    registro: DepartamentoProduccionCacao | null;
}

const EditarRegistroProduccionModal: React.FC<EditarRegistroProduccionModalProps> = ({
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
    const [produccion, setProduccion] = useState<string>('');

    // Estados para alertas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Hook
    const { updateRecord, isUpdating } = useUpdateDepartamentoProduccionCacao();

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
            setProduccion(registro.produccion.toString());
        }
    }, [isOpen, registro]);

    // Manejar cambios en el input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProduccion(e.target.value);
    };

    // Validar formulario
    const validateForm = (): boolean => {
        if (!produccion.trim()) {
            showError('La producción es requerida');
            return false;
        }

        const produccionNum = parseFloat(produccion);
        if (isNaN(produccionNum) || produccionNum < 0) {
            showError('La producción debe ser un número mayor o igual a 0');
            return false;
        }

        return true;
    };

    // Manejar envío del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || !registro || !registro.id) {
            if (!registro?.id) {
                showError('Error: No se puede actualizar el registro sin ID');
            }
            return;
        }

        try {
            const payload = {
                produccion: parseFloat(produccion)
            };
            
            const response = await updateRecord(token, registro.id, payload);
            
            // Si llegamos aquí, la actualización fue exitosa
            const successMsg = response.message || 'Registro actualizado exitosamente';
            showSuccess(successMsg);
            
            // Llamar callback de éxito después de un delay para mostrar la alerta
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
            
        } catch (error: any) {
            console.error('Error al actualizar el registro de producción:', error);
            // Extraer mensaje de error específico de la respuesta
            let errorMsg = 'Error al actualizar el registro de producción';
            
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
            setProduccion('');
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
                        Editar Registro de Producción
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
                                label="Año"
                                name="ano"
                                type="text"
                                value={registro.ano.toString()}
                                onChange={() => {}} 
                                disabled={true}
                                required
                                darkMode={isDarkMode}
                            />
                        </div>

                        {/* Input de Producción */}
                        <div>
                            <AnimatedInput
                                label="Producción Actual (toneladas)"
                                name="produccion"
                                type="number"
                                step="0.001"
                                value={produccion}
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

export default EditarRegistroProduccionModal;
