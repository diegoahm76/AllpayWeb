import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useUpdateTypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/hooks/useUpdateTypeCacao';
import { UpdateTypeCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/updateTypeCacao.model';
import Swal from 'sweetalert2';

interface EditTypeCacaoProps {
    isOpen: boolean;
    onClose: () => void;
    typeCacao: {
        id_tipo_cacao: number;
        nombre: string;
        activo: boolean;
        valor_minimo: number;
        valor_maximo: number;
        item_ya_usado: boolean;
        fecha_creacion: string;
        id_persona_crea: number;
    };
    onSuccess: (updated: any) => void;
}

const EditTypeCacao: React.FC<EditTypeCacaoProps> = ({ isOpen, onClose, typeCacao, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { updateTypeCacaoById, loading } = useUpdateTypeCacao();

    const [formData, setFormData] = useState<UpdateTypeCacaoPayload>({
        nombre: typeCacao.nombre,
        activo: typeCacao.activo,
        valor_minimo: typeCacao.valor_minimo,
        valor_maximo: typeCacao.valor_maximo
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setFormData({
            nombre: typeCacao.nombre,
            activo: typeCacao.activo,
            valor_minimo: typeCacao.valor_minimo,
            valor_maximo: typeCacao.valor_maximo
        });
    }, [typeCacao]);

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

    const handleUpdate = async () => {
        if (!validateForm()) return;
        try {
            const resp = await updateTypeCacaoById(typeCacao.id_tipo_cacao, formData);
            if (resp) onSuccess(resp);
        } catch {
            /* manejado en el hook */
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
            <div className="space-y-4">
                <h3 className={`text-xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Editar Tipo de Cacao
                </h3>

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

                <div className="flex justify-center gap-4 mt-4">
                    <Button
                        onClick={handleUpdate}
                        title="Guardar"
                        loading={loading}
                    />
                    <Button onClick={onClose} title="Cancelar" />

                </div>
            </div>
        </ModalContainer>
    );
};

export default EditTypeCacao; 