'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { AnimatedTextarea } from '../../../../../../presenters/components/ui/AnimatedTextarea';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useCreateTemplate } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/hooks/useCreateTemplate';
import { useConsecutiveConfig } from '../hooks/useConsecutiveConfig';
import Swal from 'sweetalert2';

interface CargarPlantillaProps {
    onSubmit?: (data: FormData) => void;
    onClose: () => void;
    onSuccess: () => void;
}

const CargarPlantilla: React.FC<CargarPlantillaProps> = ({ onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        },
    });
    const valueSesion: any = session;

    const { handleCreateTemplate, isLoading, error } = useCreateTemplate();
    const { loading: loadingConsecutives, config: consecutives, fetchConsecutiveConfig } = useConsecutiveConfig();

    const [formData, setFormData] = useState({
        numeroPlantilla: '',
        descripcion: '',
        observaciones: '',
        activo: true,
        idConsecutivo: '',
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar los consecutivos al montar el componente
    useEffect(() => {
        const loadConsecutives = async () => {
            if (valueSesion?.user?.tokens?.access) {
                try {
                    await fetchConsecutiveConfig(valueSesion.user.tokens.access);
                } catch (error) {
                    console.error('Error al cargar los consecutivos:', error);
                }
            }
        };

        loadConsecutives();
    }, [valueSesion?.user?.tokens?.access, fetchConsecutiveConfig]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Debe seleccionar un archivo',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: 'rgb(var(--green))',
            });
            return;
        }

        if (!formData.idConsecutivo) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Debe seleccionar un consecutivo',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: 'rgb(var(--green))',
            });
            return;
        }

        const token = valueSesion?.user?.tokens?.access;
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'No se encontró el token de autenticación',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: 'rgb(var(--green))',
            });
            return;
        }

        const payload = {
            nombre: formData.numeroPlantilla,
            descripcion: formData.descripcion,
            observaciones: formData.observaciones,
            activo: formData.activo,
            documento: selectedFile,
            id_consecutivo: formData.idConsecutivo,
        };

        const result = await handleCreateTemplate(token, payload);
        if (result) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Plantilla creada correctamente',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: 'rgb(var(--green))',
            });
            handleLimpiar();
            onSuccess();
            onClose();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Error al crear la plantilla: ' + error,
                confirmButtonText: 'Aceptar',
                confirmButtonColor: 'rgb(var(--green))',
            });
        }
    };

    const handleLimpiar = () => {
        setFormData({
            numeroPlantilla: '',
            descripcion: '',
            observaciones: '',
            activo: true,
            idConsecutivo: '',
        });
        setSelectedFile(null);
        // Limpia el valor del input file usando el ref
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Preparar las opciones para el AnimatedSelect
    const consecutiveOptions = consecutives.map(consecutive => ({
        key: consecutive.id_config_consecutivo,
        value: consecutive.id_config_consecutivo,
        title: consecutive.prefijo_consecutivo
    }));

    return (
        <div className="w-full p-6">
            <h2 className={`text-2xl text-center font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Cargar Plantilla
            </h2>

            <h3 className={`text-md text-left font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Seleccionar Archivos
            </h3>

            <div className="space-y-6">

                <div className="grid grid-cols-1  gap-6">
                    <AnimatedSelect
                        label="Consecutivo"
                        name="idConsecutivo"
                        value={formData.idConsecutivo}
                        onChange={handleInputChange}
                        options={consecutiveOptions}
                        disabled={loadingConsecutives}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <AnimatedInput
                        label="Nombre de la Plantilla"
                        type="text"
                        name="numeroPlantilla"
                        value={formData.numeroPlantilla}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <AnimatedInput
                        label="Descripción"
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className="w-full rounded-xl">
                    <div className="flex flex-col w-[300px] float-right text-center justify-end">
                        <Button
                            icon="/images/icons/upload.png"
                            title="Seleccionar un documento"
                            onClick={() => fileInputRef.current?.click()}
                        />

                        <input
                            ref={fileInputRef}
                            id="fileInput"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {selectedFile && (
                            <p className={`text-sm float-right ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Archivo seleccionado: {selectedFile.name}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-25">
                    <AnimatedTextarea
                        label="Observaciones"
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Activo</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.activo}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, activo: e.target.checked }))
                            }
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4D750F]/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4D750F]"></div>
                    </label>
                </div>

                <div className="flex justify-end gap-4">
                    <Button title="Guardar" onClick={handleSubmit} loading={isLoading} />
                    <Button title="Limpiar" onClick={handleLimpiar} />                  
                    <Button title="Cerrar" onClick={onClose} />
                </div>
            </div>
        </div>
    );
};

export default CargarPlantilla;
