'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { useCreateDepartamentoProduccionCacao } from '../hooks/useCreateDepartamentoProduccionCacao';
import { useDepartamentosColombia } from '@/application/address/useDeparmentsLogged';

interface CrearRegistroProduccionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CrearRegistroProduccionModal: React.FC<CrearRegistroProduccionModalProps> = ({
    isOpen,
    onClose,
    onSuccess
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
    const [formData, setFormData] = useState({
        cod_departamento: '',
        ano: '',
        produccion: ''
    });

    // Estados para alertas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Hooks
    const { createRecord, isCreating } = useCreateDepartamentoProduccionCacao();
    const { departamentos, loading: loadingDepartamentos } = useDepartamentosColombia();

    // Funciones helper para alertas
    const showError = (message: string) => {
        setErrorMessage(message);
        setShowErrorAlert(true);
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setShowSuccessAlert(true);
    };


    // Manejar cambios en el formulario
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Validar formulario
    const validateForm = (): boolean => {
        if (!formData.cod_departamento.trim()) {
            showError('El departamento es requerido');
            return false;
        }

        if (!formData.ano.trim()) {
            showError('El año es requerido');
            return false;
        }

        const year = parseInt(formData.ano);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
            showError('El año debe estar entre 1900 y ' + (new Date().getFullYear() + 10));
            return false;
        }

        if (!formData.produccion.trim()) {
            showError('La producción es requerida');
            return false;
        }

        const produccion = parseFloat(formData.produccion);
        if (isNaN(produccion) || produccion < 0) {
            showError('La producción debe ser un número mayor o igual a 0');
            return false;
        }

        return true;
    };

    // Manejar envío del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const payload = {
                cod_departamento: formData.cod_departamento,
                ano: parseInt(formData.ano),
                produccion: parseFloat(formData.produccion)
            };
            
            const response = await createRecord(token, payload);
            
            // Si llegamos aquí, la creación fue exitosa
            const successMsg = response.message || 'Registro de producción creado exitosamente';
            showSuccess(successMsg);
            
            // Limpiar formulario
            setFormData({
                cod_departamento: '',
                ano: '',
                produccion: ''
            });
            
            // Llamar callback de éxito después de un delay para mostrar la alerta
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
            
        } catch (error: any) {
            console.error('Error al crear el registro de producción:', error);
            // Extraer mensaje de error específico de la respuesta
            let errorMsg = 'Error al crear el registro de producción';
            
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
        if (!isCreating) {
            setFormData({
                cod_departamento: '',
                ano: '',
                produccion: ''
            });
            onClose();
        }
    };

    // Opciones para el select de departamentos
    const departamentoOptions = departamentos.map(dept => ({
        key: dept.cod_departamento,
        value: dept.cod_departamento,
        title: dept.nombre
    }));

    return (
        <>
            <ModalContainer isOpen={isOpen} onClose={handleClose} size="lg">
                <div className="p-6">
                    <h2 className={`text-2xl font-bold mb-6 text-center ${
                        isDarkMode ? 'text-white' : 'text-[#562707]'
                    }`}>
                        Crear Registro de Producción
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Select de Departamento */}
                        <div>
                            <AnimatedSelect
                                label="Departamento"
                                name="cod_departamento"
                                value={formData.cod_departamento}
                                onChange={handleInputChange}
                                options={departamentoOptions}
                                disabled={isCreating || loadingDepartamentos}
                                darkMode={isDarkMode}
                            />
                        </div>

                        {/* Input de Año */}
                        <div>
                            <AnimatedInput
                                label="Año"
                                name="ano"
                                type="number"
                                value={formData.ano}
                                onChange={handleInputChange}
                                disabled={isCreating}
                                required
                                darkMode={isDarkMode}
                            />
                        </div>

                        {/* Input de Producción */}
                        <div>
                            <AnimatedInput
                                label="Producción (toneladas)"
                                name="produccion"
                                type="number"
                                step="0.001"
                                value={formData.produccion}
                                onChange={handleInputChange}
                                disabled={isCreating}
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
                                disabled={isCreating}
                            />
                            <Button
                                title={isCreating ? "Creando..." : "Crear Registro"}
                                type="submit"
                                loading={isCreating}
                                disabled={isCreating}
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

export default CrearRegistroProduccionModal;
