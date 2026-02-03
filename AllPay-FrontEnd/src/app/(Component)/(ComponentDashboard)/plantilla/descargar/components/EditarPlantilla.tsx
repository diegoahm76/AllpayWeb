import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useUpdateTemplate } from '../hooks/useUpdateTemplate';
import { useConsecutiveConfig } from '../hooks/useConsecutiveConfig';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';

interface EditarPlantillaProps {
    template: {
        id: number;
        nombrePlantilla: string;
        descripcion: string;
        observacion: string;
        estado: string;
        doc_plantilla: string;
        id_config_consecutivo: number | null;
    };
    token: string;
    onClose: () => void;
    onSuccess: () => void;
}

const EditarPlantilla: React.FC<EditarPlantillaProps> = ({
    template,
    token,
    onClose,
    onSuccess,
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { handleUpdateTemplate, isUpdating } = useUpdateTemplate(token);
    const { config: consecutiveConfigs, loading: isLoadingConfigs, fetchConsecutiveConfig } = useConsecutiveConfig();

    const [formData, setFormData] = useState({
        nombre: template.nombrePlantilla,
        descripcion: template.descripcion,
        observacion: template.observacion,
        activa: template.estado === 'Activa',
        id_config_consecutivo: template.id_config_consecutivo ? template.id_config_consecutivo.toString() : '',
        doc_plantilla: null as File | null,
    });

    const [fileName, setFileName] = useState<string>('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | any) => {
        console.log('🔍 DEBUG - Evento recibido:', e);
        console.log('🔍 DEBUG - e.target:', e.target);
        
        const { name, value, type } = e.target;

        if (type === 'file' || e.target.file !== undefined) {
            // Manejo específico para AnimatedInput de archivos
            const file = e.target.file;
            console.log('🔍 DEBUG - Archivo detectado:', file);
            
            if (file) {
                setFormData((prev) => ({
                    ...prev,
                    doc_plantilla: file,
                }));
                setFileName(file.name);
            } else {
                setFormData((prev) => ({
                    ...prev,
                    doc_plantilla: null,
                }));
                setFileName('');
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSwitchChange = (checked: boolean) => {
        setFormData((prev) => ({
            ...prev,
            activa: checked,
        }));
    };

    const handleSubmit = async () => {
        console.log('🔍 DEBUG - formData antes de enviar:', formData);
        console.log('🔍 DEBUG - doc_plantilla:', formData.doc_plantilla);
        console.log('🔍 DEBUG - fileName:', fileName);

        const payload = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            observacion: formData.observacion,
            activa: formData.activa,
            id_config_consecutivo: parseInt(formData.id_config_consecutivo),
            ...(formData.doc_plantilla && { doc_plantilla: formData.doc_plantilla }),
        };

        console.log('🔍 DEBUG - payload final:', payload);

        const response = await handleUpdateTemplate(template.id, payload);

        if (response) {
            onSuccess();
            onClose();
        }
    };

    // Cargar los consecutivos al montar el componente
    useEffect(() => {
        const loadConsecutives = async () => {
            if (token) {
                try {
                    await fetchConsecutiveConfig(token);
                } catch (error) {
                    console.error('Error al cargar los consecutivos:', error);
                }
            }
        };

        loadConsecutives();
    }, [token, fetchConsecutiveConfig]);

    // Opciones para el select de consecutivos
    const consecutiveOptions = consecutiveConfigs.map((config: any) => ({
        key: config.id_config_consecutivo,
        value: config.id_config_consecutivo.toString(),
        title: config.prefijo_consecutivo,
    }));

    return (
        <div className="space-y-6">
            <h2
                className={`text-2xl font-bold text-center ${
                    isDarkMode ? 'text-white' : 'text-[#562707]'
                }`}
            >
                EDITAR PLANTILLA
            </h2>

            <div className="space-y-4">
                <AnimatedInput
                    label="Nombre de la Plantilla"
                    name="nombre"
                    disabled={true}
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    darkMode={isDarkMode}
                />

                <AnimatedInput
                    label="Descripción"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    required
                    darkMode={isDarkMode}
                />

                <AnimatedInput
                    label="Observación"
                    name="observacion"
                    value={formData.observacion}
                    onChange={handleChange}
                    darkMode={isDarkMode}
                />

                <AnimatedSelect
                    label="Configuración de Consecutivo"
                    name="id_config_consecutivo"
                    value={formData.id_config_consecutivo}
                    onChange={handleChange}
                    options={consecutiveOptions}
                    disabled={isLoadingConfigs}
                    darkMode={isDarkMode}
                />

                <div className="space-y-2">

                <AnimatedInput
                    type="file"
                    name="doc_plantilla"
                    label=""
                    value={fileName}
                    onChange={handleChange}
                    accept=".doc,.docx"
                    multiple={false}
                    darkMode={isDarkMode}
                 />


                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="activa"
                        checked={formData.activa}
                        onChange={(e) => handleSwitchChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    <label
                        htmlFor="activa"
                        className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-700'
                        }`}
                    >
                        Plantilla Activa
                    </label>
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <Button
                    title={isUpdating ? 'Actualizando...' : 'Actualizar'}
                    onClick={handleSubmit}
                    disabled={isUpdating}
                />
                <Button title="Cancelar" onClick={onClose} disabled={isUpdating} />
            </div>
        </div>
    );
};

export default EditarPlantilla;

