import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useCreatePercentage } from '../hooks/useCreatePercentage';
import { useCollectionTypes } from '../../../../../../application/recaudadores/useCollectionTypes';
import Swal from 'sweetalert2';

interface CreatePercentageProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    onSuccess: () => void;
}

const CreatePercentage: React.FC<CreatePercentageProps> = ({ isOpen, onClose, token, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        cod_tipo_cobro: '',
        valor: ''
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const { create, loading: createLoading } = useCreatePercentage(token);
    const { loading: typesLoading, data: typesData } = useCollectionTypes(token);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreate = async () => {
        try {
            const payload = {
                cod_tipo_cobro: formData.cod_tipo_cobro,
                valor: parseFloat(formData.valor)
            };

            const response = await create(payload);

            if (response?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: response?.detail || 'Operación exitosa',
                    confirmButtonColor: 'rgb(var(--green))',
                    confirmButtonText: 'Aceptar'
                });
                onClose();
                setFormData({
                    cod_tipo_cobro: '',
                    valor: ''
                });
                onSuccess();
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Error al crear el porcentaje',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
        }
    };

    const collectionTypeOptions = typesData?.data.map((type: any) => ({
        key: type.codigo,
        value: type.codigo,
        title: type.descripcion
    })) || [];

    return (
        <ModalContainer
            isOpen={isOpen}
            onClose={onClose}
            size="md"
        >
            <div className="space-y-4">
                <h3 className={`text-xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Crear Porcentaje de Cobro
                </h3>

                <AnimatedSelect
                    label="Código de Tipo de Cobro"
                    name="cod_tipo_cobro"
                    value={formData.cod_tipo_cobro}
                    onChange={handleInputChange}
                    options={collectionTypeOptions}
                    disabled={typesLoading}
                    darkMode={isDarkMode}
                />

                <AnimatedInput
                    label="Valor"
                    name="valor"
                    value={formData.valor}
                    onChange={handleInputChange}
                    type="number"
                    darkMode={isDarkMode}
                />

                <div className="flex justify-center gap-4 mt-4">
            
                    <Button
                        onClick={handleCreate}
                        title="Guardar"
                        loading={createLoading}
                    />

<Button
                        onClick={onClose}
                        title="Cancelar"
                    />
                </div>
            </div>
        </ModalContainer>
    );
};

export default CreatePercentage; 