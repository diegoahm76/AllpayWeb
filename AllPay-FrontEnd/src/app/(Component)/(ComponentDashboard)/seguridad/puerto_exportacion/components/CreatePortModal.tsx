'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { createPuertoExportacion } from '../adapters/createPuerto';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface CreatePortModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreatePortModal: React.FC<CreatePortModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { theme } = useTheme();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: ''
    });

    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showLoaderAlert, setShowLoaderAlert] = useState(false);

    // Validar formulario antes de enviar
    const validateForm = () => {
        if (!formData.descripcion || formData.descripcion.trim() === '') {
            
            // Mostrar sólo el mensaje de error sin el nombre del campo
            setErrorMessage("Este campo no puede estar en blanco.");
            setShowErrorAlert(true);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        try {
            // Validar el formulario primero
            if (!validateForm()) {
                return;
            }
            
            setShowLoaderAlert(true);
            
            const token = (session as any)?.user?.tokens?.access;
            await createPuertoExportacion(token, formData);

            setShowLoaderAlert(false);
            
            setShowSuccessAlert(true);

            setFormData({ nombre: '', descripcion: '' });
            onSuccess();
            onClose();
        } catch (error: any) {
            setShowLoaderAlert(false);
            
            // Si el error viene en el formato esperado, mostrarlo formateado
            if (error.response && error.response.data && error.response.data.detail) {
                const errorDetail = error.response.data.detail;
                
                if (typeof errorDetail === 'object') {
                    // Extraemos solo el primer mensaje de error, sin el nombre del campo
                    let mensaje = '';
                    for (const errors of Object.values(errorDetail)) {
                        if (Array.isArray(errors) && errors.length > 0) {
                            mensaje = errors[0];
                            break;
                        }
                    }
                    
                    setErrorMessage(mensaje || 'Error al crear el puerto de exportación');
                } else {
                    setErrorMessage(error.message || 'Error al crear el puerto de exportación');
                }
            } else {
                setErrorMessage(error.message || 'Error al crear el puerto de exportación');
            }
            
            setShowErrorAlert(true);
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
                message="Puerto de exportación creado correctamente" 
            />
            
            <AlertLoader
                isOpen={showLoaderAlert}
                loadingText="Creando puerto de exportación..."
            />
        
            <ModalContainer isOpen={isOpen} onClose={onClose}>
                <div className="space-y-4 p-2 sm:p-4">
                    <h3 className={`mb-4 text-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Crear Puerto de Exportación
                    </h3>
                    <AnimatedInput
                        label="Nombre"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Descripción"
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                        darkMode={isDarkMode}
                    />
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        <Button onClick={handleSubmit} title="Guardar" />
                        <Button onClick={onClose} title="Cancelar" />
                    </div>
                </div>
            </ModalContainer>
        </>
    );
};

export default CreatePortModal;