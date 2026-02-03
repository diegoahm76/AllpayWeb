'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import useEditMunicipio from '../hooks/useEditMunicipio';
import useGetDepartmentsCacaotero from '@/application/address/useGetDepartmentsCacao';
import { Municipio } from '../models/municipio.types';

interface EditarMunicipioModalProps {
    isOpen: boolean;
    onClose: () => void;
    municipio: Municipio | null;
    token: string;
    onSuccess: () => void;
}

const EditarMunicipioModal: React.FC<EditarMunicipioModalProps> = ({
    isOpen,
    onClose,
    municipio,
    token,
    onSuccess
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { departments, fetchDepartments } = useGetDepartmentsCacaotero();
    const { isLoading, updateMunicipio } = useEditMunicipio();

    const [formData, setFormData] = useState({
        nombre: '',
        es_cacaotero: false,
        cod_departamento: ''
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar departamentos al montar el componente
    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    // Inicializar formulario cuando se abre el modal
    useEffect(() => {
        if (isOpen && municipio) {
            setFormData({
                nombre: municipio.nombre,
                es_cacaotero: municipio.es_cacaotero,
                cod_departamento: municipio.cod_departamento
            });
        }
    }, [isOpen, municipio]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!municipio) return;

        try {
            await updateMunicipio(token, municipio.cod_municipio, formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error al actualizar municipio:', error);
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
                    Editar Municipio
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            type="button"
                            onClick={onClose} 
                            title="Cancelar" 
                        />
                        <Button 
                            type="submit"
                            onClick={handleButtonClick}
                            title={isLoading ? "Guardando..." : "Guardar"} 
                            disabled={isLoading}
                        />
                    </div>
                </form>
            </div>
        </ModalContainer>
    );
};

export default EditarMunicipioModal;
