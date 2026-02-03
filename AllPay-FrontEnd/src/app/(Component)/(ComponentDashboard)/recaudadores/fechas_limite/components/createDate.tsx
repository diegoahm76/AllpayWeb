import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useCreateDate } from '../hooks/useCreateDate';
import { useCollectionTypes } from '@/application/recaudadores/useCollectionTypes';
import { CreateDatePayload } from '../models/date.model';

interface CreateDateProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    onSuccess: () => void;
}

const CreateDate: React.FC<CreateDateProps> = ({ isOpen, onClose, token, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { create, loading } = useCreateDate(token);
    const { loading: typesLoading, data: typesData } = useCollectionTypes(token);
    const [formData, setFormData] = useState<CreateDatePayload>({
        cod_tipo_cobro_fecha: '',
        dias_registro_compra: 0,
        dias_pago: 0,
        dias_pago_interes: 0
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('dias') ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await create(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error al crear la fecha de cierre:', error);
        }
    };

    const handleButtonClick = () => {
        handleSubmit({ preventDefault: () => { } } as React.FormEvent);
    };

    const collectionTypeOptions = typesData?.data.map((type: any) => ({
        key: type.codigo,
        value: type.codigo,
        title: type.descripcion
    })) || [];

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="lg">
            <div className="space-y-6">
                <h2 className={`text-2xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Crear Fecha de Cierre
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatedSelect
                        label="Código de Tipo de Cobro"
                        name="cod_tipo_cobro_fecha"
                        value={formData.cod_tipo_cobro_fecha}
                        onChange={handleInputChange}
                        options={collectionTypeOptions}
                        disabled={typesLoading}
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Días Pago"
                        name="dias_pago"
                        value={formData.dias_pago.toString()}
                        onChange={handleInputChange}
                        type="number"
                        required
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Días Pago Interés"
                        name="dias_pago_interes"
                        value={formData.dias_pago_interes.toString()}
                        onChange={handleInputChange}
                        type="number"
                        required
                        darkMode={isDarkMode}
                    />

                    <div className="flex justify-center gap-4 mt-6">
                       
                        <Button
                            title="Crear"
                            type="submit"
                            loading={loading}
                            disabled={loading}
                            onClick={handleButtonClick}
                        />

                        <Button
                            title="Cancelar"
                            onClick={onClose}
                        />

                    </div>
                </form>
            </div>
        </ModalContainer>
    );
};

export default CreateDate;
