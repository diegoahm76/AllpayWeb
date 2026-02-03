import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useUpdatePercentage } from '../hooks/useUpdatePercentage';

interface EditPercentageProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    percentage: {
        id_porcentaje_cobro: number;
        cod_tipo_cobro: string;
        valor: string;
    };
    onSuccess: (updated: any) => void;
}

const EditPercentage: React.FC<EditPercentageProps> = ({
    isOpen,
    onClose,
    token,
    percentage,
    onSuccess,
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [formData, setFormData] = useState({ valor: '' });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Convierte el valor decimal a porcentaje para mostrar en el input
        const formattedValue = (parseFloat(percentage.valor)).toFixed(4);
        setFormData({ valor: formattedValue });
    }, [percentage]);

    const isDarkMode = mounted && theme === 'dark';

    const { update, loading: updateLoading } = useUpdatePercentage(token);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        try {

            const resp = await update(percentage.id_porcentaje_cobro, {
                valor: formData.valor,
            });
            if (resp?.success) onSuccess(resp.data);
        } catch (error) {
            console.error('Error al actualizar el porcentaje:', error);
            /* manejado en el hook */
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
            <div className="space-y-4">
                <h3
                    className={`text-xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'
                        }`}
                >
                    Editar Porcentaje de Cobro
                </h3>

                <p className={isDarkMode ? 'text-white' : 'text-[#562707]'}>
                    Tipo de Cobro: {percentage.cod_tipo_cobro}
                </p>

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
                        onClick={handleUpdate}
                        title="Guardar"
                        loading={updateLoading}
                    />
                    <Button onClick={onClose} title="Cancelar" />

                </div>
            </div>
        </ModalContainer>
    );
};

export default EditPercentage;
