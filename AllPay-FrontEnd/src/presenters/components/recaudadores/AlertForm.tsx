'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '../ui/ModalContainer';
import { Button } from '../ui/AnimatedButton';

interface AlertFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onClear: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const AlertForm: React.FC<AlertFormProps> = ({
    isOpen,
    onClose,
    onSave,
    onClear,
    title,
    children,
    size = 'xl'
}) => {
    const { theme } = useTheme();
    
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size={size}>
            <div className="flex flex-col items-center gap-6">
                {/* Título */}
                <h2 className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'} text-2xl font-bold text-center`}>
                    {title}
                </h2>

                {/* Contenido dinámico */}
                <div className="w-full">
                    {children}
                </div>

                {/* Botones fijos */}
                <div className="flex justify-center gap-4 mt-4">
                    <Button
                        title="Guardar"
                        onClick={onSave}
                    />
                    <Button
                        title="Limpiar"
                        onClick={onClear}
                    />
                    <Button
                        title="Salir"
                        onClick={onClose}
                    />
                </div>
            </div>
        </ModalContainer>
    );
};

export default AlertForm;
