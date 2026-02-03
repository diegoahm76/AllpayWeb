'use client';

import React, { useState } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useTheme } from 'next-themes';

interface FirmarDocumentoProps {
    onFirmar: () => void;
    onLimpiar: () => void;
    onDescargar: () => void;
    onEnviar: () => void;
    onBuscar: () => void;
}

const FirmarDocumento: React.FC<FirmarDocumentoProps> = ({
    onFirmar,
    onLimpiar,
    onDescargar,
    onEnviar,
    onBuscar
}) => {
    const [formData, setFormData] = useState({
        tipoDocumento: '',
        numeroDocumento: '',
        nombre: ''
    });

    const { theme } = useTheme();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
            <div className="flex flex-col space-y-6 p-6 bg-white rounded-lg shadow-md">
                {/* Área de visualización del documento */}

                <div className="flex flex-col-2 space-y-2 gap-[10%]  justify-center items-center">
                    <div className=" max-w-lg w-full h-[600px] border border-gray-300 rounded-lg p-4 bg-white">
                        <div className="w-full h-full flex items-center justify-center text-gray-500">

                            <embed
                                src="/path-to-document.pdf"
                                type="application/pdf"
                                width="100%"
                                height="100%"
                                className="rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Button
                            onClick={onFirmar}
                            title="Firmar Documento"
                        />

                        <Button
                            onClick={onLimpiar}
                            title="Limpiar"
                        />

                        <Button
                            onClick={onDescargar}
                            title="Descargar"
                        />

                    </div>

                </div>

                {/* Sección de destinatario */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-[#562707] text-center">Destinatario Documento</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <AnimatedInput
                            label="Tipo de documento"
                            name="tipoDocumento"
                            value={formData.tipoDocumento}
                            onChange={handleChange}
                            type="text"
                        />
                        <AnimatedInput
                            label="Número de Documento"
                            name="numeroDocumento"
                            value={formData.numeroDocumento}
                            onChange={handleChange}
                            type="text"
                        />
                        <AnimatedInput
                            label="Nombre"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            type="text"
                        />
                    </div>
                    <div className="flex justify-end space-x-4">

                        <Button
                            onClick={onEnviar}
                            title="Enviar"
                        />

                        <Button
                            onClick={onBuscar}
                            title="Buscar"
                        />

                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirmarDocumento; 