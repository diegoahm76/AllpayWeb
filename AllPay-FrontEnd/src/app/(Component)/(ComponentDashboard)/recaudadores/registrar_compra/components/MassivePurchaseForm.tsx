'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useCreateMassiveInvoice } from '../hooks/useCreateMassiveInvoice';
import { useSession } from 'next-auth/react';
import { CreateMassiveInvoiceResponse } from '../models/invoice.createMasive.model';

// notificaciones
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';

interface MassivePurchaseFormProps {

    onSave: (responseData: CreateMassiveInvoiceResponse) => void;
    onClear: () => void;
}

const MassivePurchaseForm: React.FC<MassivePurchaseFormProps> = ({ onSave, onClear }) => {
    const { theme } = useTheme();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const { data: session } = useSession();
    const { createNewMassiveInvoice } = useCreateMassiveInvoice();

    // notificaciones
    const [isAlertError, setIsAlertError] = useState(false);
    const [isAlertSuccess, setIsAlertSuccess] = useState(false);
    const [alertErrorText, setAlertErrorText] = useState('');
    const [alertSuccessText, setAlertSuccessText] = useState('');

    const [isAlertQuestion, setIsAlertQuestion] = useState(false);            // ✅
    const questionText = '¿Desea cargar masivamente las compras de cacao?';

    const valueSesion: any = session;

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.match(/\.(xlsx|xls)$/)) {
            setIsAlertError(true);
            setAlertErrorText('Por favor, seleccione un archivo Excel válido (.xlsx o .xls)');
            return;
        }

        setSelectedFile(file);
    };

    const handleSave = async () => {

        if (!selectedFile) {
            setIsAlertError(true);
            setAlertErrorText('Por favor, seleccione un archivo');
            return;
        }

        if (!valueSesion?.user?.tokens?.access) {
            setIsAlertError(true);
            setAlertErrorText('No se encontró el token de autenticación');
            return;
        }

        setIsLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('archivo', selectedFile);

            var responseData = await createNewMassiveInvoice(
                formDataToSend,
                valueSesion.user.tokens.access,
                isInternalUser ? true : false
            );

            if (responseData) {
                // Solo mostrar el Swal de éxito si success es true
                if (responseData.success) {
                    setIsAlertSuccess(true);
                    setAlertSuccessText('Registro de libro de compra de cacao exitoso');
                }
                onSave(responseData);
            }
        } catch (error) {
            console.error('Error al crear facturas masivas:', error);
            setIsAlertError(true);
            setAlertErrorText(error instanceof Error ? error.message : 'Error al crear las facturas masivas');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveClick = () => {
        // Validaciones básicas antes de preguntar
        if (!selectedFile) {
          setIsAlertError(true);
          setAlertErrorText('Por favor, seleccione un archivo');
          return;
        }
        setIsAlertQuestion(true);                                              // ✅ abre confirmación
      };
    

    const handleClear = () => {
        setSelectedFile(null);
        // Resetear el input de archivo
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
        onClear();
    };

    return (
        <div id="massivePurchaseForm" className="w-full max-w-md mx-auto">

            <AlertError
                isOpen={isAlertError}
                message={alertErrorText}
                onClose={() => setIsAlertError(false)}
            />

            <AlertSuccess
                isOpen={isAlertSuccess}
                message={alertSuccessText}
                onClose={() => setIsAlertSuccess(false)}
            />

                <AlertQuestion                                                   // ✅ nuevo
                    isOpen={isAlertQuestion}
                    questionText={questionText}
                    onClose={() => setIsAlertQuestion(false)}                      // “No”
                    onConfirm={() => {
                        setIsAlertQuestion(false);                                   // cierra
                        handleSave();                                               // y procede
                    }}
                />

            <div className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                    <label className={`${theme === 'dark' ? 'text-white' : 'text-[#562707]'} font-medium`}>
                        Cargar Documento
                    </label>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => document.getElementById('fileInput')?.click()}
                            className={`px-4 py-2 rounded-xl font-semibold text-center flex items-center gap-2 ${
                                theme === 'dark' 
                                    ? 'bg-[#260f00] text-white border border-white/20 hover:bg-[#3a1a00]' 
                                    : 'bg-[rgb(var(--gray-20))] hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]'
                            }`}
                            disabled={isLoading}
                        >
                            <img src="/images/icons/upload.png" alt="upload" className="w-5 h-5" />
                            CARGAR LIBRO DE COMPRA
                        </button>

                        <input
                            id="fileInput"
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isLoading}
                        />
                    </div>

                    {selectedFile && (
                        <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                            Archivo seleccionado: {selectedFile.name}
                        </p>
                    )}

                    {isLoading && (
                        <div className="w-full mt-4">
                            <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5`}>
                                <div
                                    className="bg-[rgb(var(--green))] h-2.5 rounded-full animate-pulse"
                                    style={{ width: '100%' }}
                                ></div>
                            </div>
                            <p className={`text-center text-sm mt-2 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                                Procesando archivo...
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <button
                type="submit"
                className="hidden"
                onClick={handleSaveClick}
            ></button>
            <button
                type="reset"
                className="hidden"
                onClick={handleClear}
            ></button>
        </div>
    );
};

export default MassivePurchaseForm;
