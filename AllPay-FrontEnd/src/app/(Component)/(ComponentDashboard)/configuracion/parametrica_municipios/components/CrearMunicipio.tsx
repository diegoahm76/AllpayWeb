'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import useCreateMunicipio from '../hooks/useCreateMunicipio';
import useGetDepartmentsCacaotero from '@/application/address/useGetDepartmentsCacao';

interface CrearMunicipioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    token: string;
}

const CrearMunicipioModal: React.FC<CrearMunicipioModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    token
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { departments, fetchDepartments } = useGetDepartmentsCacaotero();
    const { isLoading, addMunicipio } = useCreateMunicipio();

    const [formData, setFormData] = useState({
        cod_municipio: '',
        nombre: '',
        cod_departamento: '',
        es_cacaotero: false
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar departamentos al montar el componente
    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    // Resetear formulario cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setFormData({
                cod_municipio: '',
                nombre: '',
                cod_departamento: '',
                es_cacaotero: false
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar que todos los campos requeridos estén llenos
        if (!formData.cod_municipio || !formData.nombre || !formData.cod_departamento) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        try {
            await addMunicipio(token, formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error al crear municipio:', error);
        }
    };

    const handleButtonClick = () => {
        const syntheticEvent = {
            preventDefault: () => {}
        } as React.FormEvent;
        handleSubmit(syntheticEvent);
    };

    const getDepartmentOptions = () => {
        return departments
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((dept) => ({
                key: String(dept.cod_departamento),
                value: String(dept.cod_departamento),
                title: dept.nombre
            }));
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
            <div className="space-y-4 p-2 sm:p-4">
                <h3 className={`mb-4 text-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    CREAR MUNICIPIO
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatedInput
                        label="Código del Municipio"
                        type="text"
                        name="cod_municipio"
                        value={formData.cod_municipio}
                        onChange={(e) => setFormData({ ...formData, cod_municipio: e.target.value })}
                        required
                        darkMode={isDarkMode}
                    />
                    
                    <AnimatedInput
                        label="Nombre del Municipio"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        darkMode={isDarkMode}
                    />
                    
                    <AnimatedSelect
                        label="Departamento"
                        name="cod_departamento"
                        value={formData.cod_departamento}
                        onChange={(e) => setFormData({ ...formData, cod_departamento: e.target.value })}
                        options={getDepartmentOptions()}
                        darkMode={isDarkMode}
                    />
                    
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="es_cacaotero"
                            checked={formData.es_cacaotero}
                            onChange={(e) => setFormData({ ...formData, es_cacaotero: e.target.checked })}
                            className="form-checkbox h-5 w-5 text-[#4D750F]"
                        />
                        <label htmlFor="es_cacaotero" className={isDarkMode ? 'text-white' : 'text-gray-700'}>Es Cacaotero</label>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        <Button 
                            type="submit"
                            onClick={handleButtonClick}
                            title={isLoading ? "Creando..." : "Crear"} 
                            disabled={isLoading}
                        />

                        <Button 
                            type="button"
                            onClick={onClose} 
                            title="Cancelar" 
                        />
                     
                    </div>
                </form>
            </div>
        </ModalContainer>
    );
};

export default CrearMunicipioModal;
