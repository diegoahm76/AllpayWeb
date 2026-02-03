"use client";
import React from "react";
import { Button } from "@/presenters/components/ui/AnimatedButton";

interface SignatureUploadProps {
    userData: any;
    selectedFile: File | null;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputId?: string;
}

const SignatureUpload: React.FC<SignatureUploadProps> = ({
    userData,
    selectedFile,
    handleFileChange,
    inputId = "signatureInput"
}) => {
    return (
        <div className="flex items-center space-x-4 mb-10 mt-4">
            <div className="flex flex-col items-center text-[rgb(var(--brown))]">
                <h4 className="text-lg font-bold">Firma</h4>

                <img
                    width={150}
                    height={150}
                    className="w-24 h-24 dark:border-gray-700"
                    src={userData.firma_usuario}
                    alt="Firma de usuario"
                />
            </div>


            <div className="flex flex-col">
                <Button
                    onClick={() => document.getElementById(inputId)?.click()}
                    title="Cargar"
                />

                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {selectedFile && (
                    <p className="text-md text-gray-600 dark:text-gray-400 mt-2">
                        archivo seleccionado: {selectedFile.name}
                    </p>
                )}

                <p className="text-md text-gray-600 dark:text-gray-400 mt-2">
                    Se permiten archivos JPG o PNG. <br />
                    Tamaño máximo de 1 MB.
                </p>
            </div>
        </div>
    );
};

export default SignatureUpload; 