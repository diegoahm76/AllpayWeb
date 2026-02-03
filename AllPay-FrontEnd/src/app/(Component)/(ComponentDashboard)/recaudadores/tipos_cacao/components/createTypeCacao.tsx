import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useCreateTypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/hooks/useCreateTypeCacao';
import { CreateTypeCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/createTypeCacao.model';
import Swal from 'sweetalert2';

interface CreateTypeCacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateTypeCacao: React.FC<CreateTypeCacaoProps> = ({ isOpen, onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { createNewTypeCacao, loading } = useCreateTypeCacao();
    const [formData, setFormData] = useState<CreateTypeCacaoPayload>({
        nombre: '',
        activo: true,
        valor_minimo: 0,
        valor_maximo: 0
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
        }));
    };

    const validateForm = () => {
        if (!formData.nombre.trim()) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El campo nombre es requerido',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return false;
        }
        
        if (formData.valor_minimo < 0 || formData.valor_maximo < 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Los valores mínimo y máximo deben ser mayores o iguales a 0',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return false;
        }
        
        if (formData.valor_minimo > formData.valor_maximo) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El valor mínimo no puede ser mayor al valor máximo',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await createNewTypeCacao(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error al crear el tipo de cacao:', error);
        }
    };

    const handleButtonClick = () => {
        handleSubmit({ preventDefault: () => { } } as React.FormEvent);
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
            <div className="space-y-6">
                <h2 className={`text-2xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Crear Tipo de Cacao
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatedInput
                        label="Nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Valor Mínimo"
                        name="valor_minimo"
                        type="number"
                        value={formData.valor_minimo.toString()}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Valor Máximo"
                        name="valor_maximo"
                        type="number"
                        value={formData.valor_maximo.toString()}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        darkMode={isDarkMode}
                    />

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="activo"
                            name="activo"
                            checked={formData.activo}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-[rgb(var(--green))] focus:ring-[rgb(var(--green))] border-gray-300 rounded"
                        />
                        <label
                            htmlFor="activo"
                            className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                        >
                            Activo
                        </label>
                    </div>

                    <div className="flex justify-center gap-4 mt-6">
                        
                        <Button
                            title="Crear"
                            type="submit"
                            loading={loading}
                            disabled={loading}
                            onClick={handleButtonClick}
                        />
                        <Button
                            title="Cancelar"
                            onClick={onClose}
                        />
                    </div>
                </form>
            </div>
        </ModalContainer>
    );
};

export default CreateTypeCacao;
