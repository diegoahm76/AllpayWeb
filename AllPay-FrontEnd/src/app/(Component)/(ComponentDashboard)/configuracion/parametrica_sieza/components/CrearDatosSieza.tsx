'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import useCreateSiezaData from '../hooks/useCreateSiezaData';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface CrearDatosSiezaProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    token: string;
}

const CrearDatosSieza: React.FC<CrearDatosSiezaProps> = ({
    isOpen,
    onClose,
    onSuccess,
    token
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { addSiezaData, isLoading, error } = useCreateSiezaData();

    const [formData, setFormData] = useState({
        descripcion: '',
        auxiliar: '',
        compania: '',
        centro: '',
        unidad: '',
        sucursal: '',
        tipo_documento: ''
    });

    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Resetear formulario cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setFormData({
                descripcion: '',
                auxiliar: '',
                compania: '',
                centro: '',
                unidad: '',
                sucursal: '',
                tipo_documento: ''
            });
            setShowErrorAlert(false);
            setShowSuccessAlert(false);
        }
    }, [isOpen]);

    // Mostrar error si hay alguno
    useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]);



    const handleSubmit = async () => {
        // Validar campos requeridos
        if (!formData.descripcion.trim() || !formData.auxiliar.trim() || 
            !formData.compania.trim() || !formData.centro.trim() || 
            !formData.unidad.trim() || !formData.sucursal.trim() || !formData.tipo_documento.trim()) {
            setErrorMessage('Todos los campos son obligatorios');
            setShowErrorAlert(true);
            return;
        }
        
        if (!token) {
            setErrorMessage('Token de autenticación no disponible');
            setShowErrorAlert(true);
            return;
        }

        try {
            const response = await addSiezaData(token, formData);
            
            if (response.success) {
                setSuccessMessage('Registro del sistema contable creado exitosamente');
                setShowSuccessAlert(true);
                
                // Cerrar modal después de un breve delay
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (err: any) {
            console.error('Error al crear registro del sistema contable:', err);
            // El error ya se maneja en el hook
        }
    };

    return (
        <>
            <AlertError 
                isOpen={showErrorAlert} 
                onClose={() => setShowErrorAlert(false)} 
                message={errorMessage} 
            />
            
            <AlertSuccess 
                isOpen={showSuccessAlert} 
                onClose={() => setShowSuccessAlert(false)} 
                message={successMessage} 
            />
            
            <AlertLoader
                isOpen={isLoading}
                loadingText="Creando registro del sistema contable, por favor espere..."
            />

            <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
                <div className="space-y-4 p-2 sm:p-4">
                    <h3 className={`mb-4 text-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        CREAR DATOS SISTEMA CONTABLE
                    </h3>
                    
                    <div className="space-y-4">
                        <AnimatedInput
                            label="Descripción"
                            type="text"
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <AnimatedInput
                            label="Auxiliar"
                            type="text"
                            name="auxiliar"
                            value={formData.auxiliar}
                            onChange={(e) => setFormData({ ...formData, auxiliar: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <AnimatedInput
                            label="Compañía"
                            type="text"
                            name="compania"
                            value={formData.compania}
                            onChange={(e) => setFormData({ ...formData, compania: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <AnimatedInput
                            label="Centro"
                            type="text"
                            name="centro"
                            value={formData.centro}
                            onChange={(e) => setFormData({ ...formData, centro: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <AnimatedInput
                            label="Unidad"
                            type="text"
                            name="unidad"
                            value={formData.unidad}
                            onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <AnimatedInput
                            label="Sucursal"
                            type="text"
                            name="sucursal"
                            value={formData.sucursal}
                            onChange={(e) => setFormData({ ...formData, sucursal: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <AnimatedInput
                            label="Tipo Documento"
                            type="text"
                            name="tipo_documento"
                            value={formData.tipo_documento}
                            onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                            required
                            darkMode={isDarkMode}
                        />
                        
                        <div className="flex flex-wrap justify-center gap-2 mt-6">
                            <Button 
                                type="button"
                                onClick={handleSubmit}
                                title="Crear" 
                                disabled={isLoading}
                            />

                            <Button 
                                type="button"
                                onClick={onClose} 
                                title="Cancelar" 
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
            </ModalContainer>
        </>
    );
};

export default CrearDatosSieza;
