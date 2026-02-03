import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useUpdateDate } from '../hooks/useUpdateDate';
import { UpdateDatePayload } from '../models/updateDate.model';

interface EditDateProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    date: {
        id_fecha_cierre: number;
        cod_tipo_cobro_fecha: string;
        dias_registro_compra: number;
        dias_pago: number;
        dias_pago_interes: number;
    };
    onSuccess: (updated: any) => void;
}

const EditDate: React.FC<EditDateProps> = ({
    isOpen,
    onClose,
    token,
    date,
    onSuccess,
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    /** 1️⃣  Mantén el formulario sincronizado con la fila seleccionada  */
    const [formData, setFormData] = useState<UpdateDatePayload>({
        dias_registro_compra: date.dias_registro_compra,
        dias_pago: date.dias_pago,
        dias_pago_interes: date.dias_pago_interes
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setFormData({
            dias_registro_compra: date.dias_registro_compra,
            dias_pago: date.dias_pago,
            dias_pago_interes: date.dias_pago_interes
        });
    }, [date]);

    const isDarkMode = mounted && theme === 'dark';

    const { update, loading: updateLoading } = useUpdateDate(token);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    };

    const handleUpdate = async () => {
        try {
            const resp = await update(date.id_fecha_cierre.toString(), formData);
            if (resp?.success) onSuccess(resp.data);
        } catch {
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
                    Editar Fecha de Cierre
                </h3>

                <p className={isDarkMode ? 'text-white' : 'text-[#562707]'}>
                    Tipo de Cobro: {date.cod_tipo_cobro_fecha}
                </p>

                <AnimatedInput
                    label="Días Pago"
                    name="dias_pago"
                    value={formData.dias_pago.toString()}
                    onChange={handleInputChange}
                    type="number"
                    darkMode={isDarkMode}
                />

                <AnimatedInput
                    label="Días Pago Interés"
                    name="dias_pago_interes"
                    value={formData.dias_pago_interes.toString()}
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

export default EditDate; 