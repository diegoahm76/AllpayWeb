'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import useUpdateSiezaData from '../hooks/useUpdateSiezaData';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface EditarDatosSiezaProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    onSuccess: () => void;
    itemToEdit?: {
        id: number;
        descripcion: string;    
        auxiliar: string;
        compania: string;
        centro: string;
        unidad: string;
        sucursal: string;
    };
}

const EditarDatosSieza: React.FC<EditarDatosSiezaProps> = ({
    isOpen,
    onClose,
    token,
    onSuccess,
    itemToEdit
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { updateSieza, isLoading, error } = useUpdateSiezaData();

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

    // Cargar datos del item a editar cuando se abre el modal
    useEffect(() => {
        if (isOpen && itemToEdit) {
            setFormData({
                descripcion: itemToEdit.descripcion || '',
                auxiliar: itemToEdit.auxiliar || '',
                compania: itemToEdit.compania || '',
                centro: itemToEdit.centro || '',
                unidad: itemToEdit.unidad || '',
              sucursal: itemToEdit.sucursal || '',
              tipo_documento: (itemToEdit as any).tipo_documento || ''
            });
            setShowErrorAlert(false);
            setShowSuccessAlert(false);
        }
    }, [isOpen, itemToEdit]);

    // Mostrar error si hay alguno
    useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]);

    const handleUpdateClick = async () => {
        if (!token) {
            setErrorMessage('Token de autenticación no disponible');
            setShowErrorAlert(true);
            return;
        }

        if (!itemToEdit?.id) {
            setErrorMessage('No se ha seleccionado un elemento para editar');
            setShowErrorAlert(true);
            return;
        }

        try {
            const response = await updateSieza(token, itemToEdit.id, formData);
            
            if (response) {
                setSuccessMessage('Registro del sistema contable actualizado exitosamente');
                setShowSuccessAlert(true);
                
                // Cerrar modal después de un breve delay
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (err: any) {
            console.error('Error al actualizar registro del sistema contable:', err);
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
                loadingText="Actualizando registro del sistema contable, por favor espere..."
            />

            <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
                <div className="space-y-4 p-2 sm:p-4">
                    <h3 className={`mb-6 text-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        EDITAR DATOS SISTEMA CONTABLE
                    </h3>
                    
                    <form className="space-y-4">
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
                    label="Tipo de documento"
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
                                onClick={onClose} 
                                title="Cancelar" 
                                disabled={isLoading}
                            />
                            <Button 
                                type="button"
                                onClick={handleUpdateClick}
                                title="Guardar" 
                                disabled={isLoading}
                            />
                        </div>
                    </form>
                </div>
            </ModalContainer>
        </>
    );
};

export default EditarDatosSieza;
