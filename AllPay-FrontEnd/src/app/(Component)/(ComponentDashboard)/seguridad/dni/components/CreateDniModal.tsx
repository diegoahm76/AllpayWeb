'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { createDni } from '@/adapters/dni/createDni';
import Swal from 'sweetalert2';
import { Button } from '@/presenters/components/ui/AnimatedButton';

interface CreateDniModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateDniModal: React.FC<CreateDniModalProps> = ({ isOpen, onClose, onSuccess }) => {

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        cod_tipo_documento: '',
        nombre: ''
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const valueSesion: any = session;

    const handleSubmit = async () => {
        try {
            await createDni(valueSesion?.user?.tokens?.access, formData);

            Swal.fire({
                icon: 'success',
                title: 'Creado',
                text: 'El tipo de documento ha sido creado correctamente',
                confirmButtonColor: '#4D750F'
            });

            onSuccess();
            onClose();
            setFormData({ cod_tipo_documento: '', nombre: '' });
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al crear el tipo de documento',
                confirmButtonColor: '#4D750F'
            });
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <h3 className={`mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Crear Tipo de Documento
                </h3>
                <AnimatedInput
                    label="Código"
                    type="text"
                    name="cod_tipo_documento"
                    value={formData.cod_tipo_documento}
                    onChange={(e) => setFormData({ ...formData, cod_tipo_documento: e.target.value })}
                    darkMode={isDarkMode}
                />
                <AnimatedInput
                    label="Nombre"
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    darkMode={isDarkMode}
                />
                <div className="flex justify-center space-x-4 mt-6">
     
                    <Button onClick={handleSubmit} title="Crear" />
                    <Button onClick={onClose} title="Cancelar" />

                </div>
            </div>
        </ModalContainer>
    );
};

export default CreateDniModal; 