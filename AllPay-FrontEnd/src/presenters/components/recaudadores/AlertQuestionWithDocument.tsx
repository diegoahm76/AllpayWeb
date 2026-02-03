'use client'

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '../ui/ModalContainer';
import { Button } from '../ui/AnimatedButton';
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";

interface AlertQuestionWithDocumentProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    questionText: string;
    documentUrl?: string;
}

const AlertQuestionWithDocument: React.FC<AlertQuestionWithDocumentProps> = ({
    isOpen,
    onClose,
    onConfirm,
    questionText,
    documentUrl
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (documentUrl) {
            setIsLoading(true);
            setError(null);
            // Simulamos un tiempo de carga para dar feedback visual
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
        return () => {
            setIsLoading(false);
            setError(null);
        };
    }, [documentUrl]);

    const isDarkMode = mounted && theme === 'dark';

    if (!mounted) return null;

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="3xl">
            <div className="flex flex-col h-[90vh]">
                {/* Documento */}
                <div className="flex-1 mb-4">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Cargando documento...</p>
                        </div>
                    )}
                    {!isLoading && error && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-lg text-red-600">{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && documentUrl && (
                        <DocViewer
                            pluginRenderers={DocViewerRenderers}
                            documents={[{ uri: documentUrl, fileType: 'docx' }]}
                            style={{
                                height: '100%',
                                width: '100%'
                            }}
                        />
                    )}
                    {!isLoading && !error && !documentUrl && (
                        <div className="flex items-center justify-center h-full">
                            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>No se pudo cargar el documento</p>
                        </div>
                    )}
                </div>

                {/* Pregunta y botones */}
                <div className={`flex flex-col items-center gap-6 pt-4 border-t ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}>
                    <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        SEÑOR(A) RECAUDOR(A)
                    </h2>

                    <p className={`text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        {questionText}
                    </p>

                    <div className="flex gap-4 mt-4">
                        <Button
                            title="Si"
                            onClick={onConfirm}
                            className="bg-[#4D750F] hover:bg-[#3a5a0a] w-24"
                        />
                        <Button
                            title="No"
                            onClick={onClose}
                            className="bg-[#4D750F] hover:bg-[#3a5a0a] w-24"
                        />
                    </div>
                </div>
            </div>
        </ModalContainer>
    );
};

export default AlertQuestionWithDocument;
