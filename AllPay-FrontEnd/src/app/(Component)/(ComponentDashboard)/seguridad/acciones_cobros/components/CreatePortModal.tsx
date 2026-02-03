'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import { useCreateAccionCobroPersuasivo } from '../hooks/useCreateAccionCobroPersuasivo';
import { CreateAccionCobroPersuasivoPayload } from '../models/accionesCobroPersuasivo.model';

interface CreateAccionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreatePortModal: React.FC<CreateAccionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [formData, setFormData] = useState<CreateAccionCobroPersuasivoPayload>({
        nombre: '',
        descripcion: '',
        tipo_cobro: '',
        activo: true
    });

    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);

    const { loading, create, clearError } = useCreateAccionCobroPersuasivo();

    // Opciones para el select de tipo de cobro
    const tipoCobroOptions = [
        { key: '1', value: 'PERSUASIVO', title: 'PERSUASIVO' },
        { key: '2', value: 'COACTIVO', title: 'COACTIVO' }
    ];

    // Validar formulario antes de enviar
    const validateForm = () => {
        if (!formData.nombre || formData.nombre.trim() === '') {
            setErrorMessage("El nombre es requerido.");
            setShowErrorAlert(true);
            return false;
        }

        if (!formData.descripcion || formData.descripcion.trim() === '') {
            setErrorMessage("La descripción es requerida.");
            setShowErrorAlert(true);
            return false;
        }

        if (!formData.tipo_cobro || formData.tipo_cobro.trim() === '') {
            setErrorMessage("El tipo de cobro es requerido.");
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
            
            
            const response = await create(formData);

            if (response.success) {
                setShowSuccessAlert(true);
                setFormData({ nombre: '', descripcion: '', tipo_cobro: '', activo: true });
                onSuccess();
                
                // Cerrar modal después de mostrar el éxito
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
            
        } catch (error: any) {
            console.error('[CreatePortModal] - Error al crear acción:', error);
            setErrorMessage(error.message || 'Error al crear la acción de cobro persuasivo');
            setShowErrorAlert(true);
        }
    };

    const handleClose = () => {
        setFormData({ nombre: '', descripcion: '', tipo_cobro: '', activo: true });
        clearError();
        setShowErrorAlert(false);
        setShowSuccessAlert(false);
        onClose();
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
                message="Acción de cobro persuasivo creada correctamente" 
            />
            
            <AlertLoader
                isOpen={loading}
                loadingText="Creando acción de cobro persuasivo..."
            />
        
            <ModalContainer isOpen={isOpen} onClose={handleClose}>
                <div className="space-y-4 p-2 sm:p-4">
                    <h3 className={`mb-4 text-center text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                        Crear Acción de Cobro Persuasivo
                    </h3>
                    <AnimatedInput
                        label="Nombre"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        disabled={loading}
                        darkMode={theme === 'dark'}
                    />
                    <AnimatedInput
                        label="Descripción"
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                        disabled={loading}
                        darkMode={theme === 'dark'}
                    />
                    <AnimatedSelect
                        label="Tipo de Cobro"
                        name="tipo_cobro"
                        value={formData.tipo_cobro}
                        onChange={(e) => setFormData({ ...formData, tipo_cobro: e.target.value })}
                        disabled={loading}
                        options={tipoCobroOptions}
                        darkMode={theme === 'dark'}
                    />
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="activo"
                            checked={formData.activo}
                            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                            className="form-checkbox h-5 w-5 text-[#4D750F]"
                            disabled={loading}
                        />
                        <label htmlFor="activo" className={`${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Activo</label>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        <Button 
                            onClick={handleSubmit} 
                            title="Guardar" 
                            disabled={loading}
                        />
                        <Button 
                            onClick={handleClose} 
                            title="Cancelar" 
                            disabled={loading}
                        />
                    </div>
                </div>
            </ModalContainer>
        </>
    );
};

export default CreatePortModal;