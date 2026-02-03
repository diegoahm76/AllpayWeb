import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useCreateHistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/hooks/useCreateHistoricoProduccionCacao';
import { CreateHistoricoProduccionCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/createHistoricoProduccionCacao.model';

interface CreateHistoricoProduccionCacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateHistoricoProduccionCacao: React.FC<CreateHistoricoProduccionCacaoProps> = ({ isOpen, onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';
    const { createNewHistoricoProduccionCacao, loading } = useCreateHistoricoProduccionCacao();
    const [formData, setFormData] = useState<CreateHistoricoProduccionCacaoPayload>({
        ano: new Date().getFullYear(),
        enero: undefined,
        febrero: undefined,
        marzo: undefined,
        abril: undefined,
        mayo: undefined,
        junio: undefined,
        julio: undefined,
        agosto: undefined,
        septiembre: undefined,
        octubre: undefined,
        noviembre: undefined,
        diciembre: undefined
    });
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [monthValue, setMonthValue] = useState<string>('');
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'ano') {
            setFormData(prev => ({
                ...prev,
                ano: Number(value)
            }));
        }
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(e.target.value);
    };

    const monthOptions = [
        { key: 'enero', value: 'enero', title: 'Enero' },
        { key: 'febrero', value: 'febrero', title: 'Febrero' },
        { key: 'marzo', value: 'marzo', title: 'Marzo' },
        { key: 'abril', value: 'abril', title: 'Abril' },
        { key: 'mayo', value: 'mayo', title: 'Mayo' },
        { key: 'junio', value: 'junio', title: 'Junio' },
        { key: 'julio', value: 'julio', title: 'Julio' },
        { key: 'agosto', value: 'agosto', title: 'Agosto' },
        { key: 'septiembre', value: 'septiembre', title: 'Septiembre' },
        { key: 'octubre', value: 'octubre', title: 'Octubre' },
        { key: 'noviembre', value: 'noviembre', title: 'Noviembre' },
        { key: 'diciembre', value: 'diciembre', title: 'Diciembre' }
    ];

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMonthValue(e.target.value);
    };

    const validateForm = () => {
        if (!formData.ano) {
            setErrorMessage('El campo año es requerido');
            setShowErrorAlert(true);
            return false;
        }
        
        if (!selectedMonth) {
            setErrorMessage('Debe seleccionar un mes');
            setShowErrorAlert(true);
            return false;
        }
        
        if (!monthValue || Number(monthValue) <= 0) {
            setErrorMessage('El valor del mes debe ser mayor a 0');
            setShowErrorAlert(true);
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            // Crear el payload con el mes seleccionado y su valor
            const payload: CreateHistoricoProduccionCacaoPayload = {
                ano: formData.ano,
                [selectedMonth]: Number(monthValue)
            };
            
            await createNewHistoricoProduccionCacao(payload);
            onSuccess();
            onClose();
            // Limpiar formulario
            setFormData({
                ano: new Date().getFullYear(),
                enero: undefined,
                febrero: undefined,
                marzo: undefined,
                abril: undefined,
                mayo: undefined,
                junio: undefined,
                julio: undefined,
                agosto: undefined,
                septiembre: undefined,
                octubre: undefined,
                noviembre: undefined,
                diciembre: undefined
            });
            setSelectedMonth('');
            setMonthValue('');
        } catch (error: any) {
            console.error('Error al crear el registro histórico:', error);
            // Extraer mensaje de error específico de la respuesta
            let errorMsg = 'Error al crear el registro histórico';
            
            if (error?.response?.data?.errors) {
                const errors = error.response.data.errors;
                if (errors.ano && Array.isArray(errors.ano) && errors.ano.length > 0) {
                    errorMsg = errors.ano[0];
                } else {
                    // Si hay otros tipos de errores, tomar el primero disponible
                    const firstErrorKey = Object.keys(errors)[0];
                    if (firstErrorKey && Array.isArray(errors[firstErrorKey])) {
                        errorMsg = errors[firstErrorKey][0];
                    }
                }
            } else if (error?.response?.data?.detail) {
                errorMsg = error.response.data.detail;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            
            setErrorMessage(errorMsg);
            setShowErrorAlert(true);
        }
    };

    const handleButtonClick = () => {
        handleSubmit({ preventDefault: () => { } } as React.FormEvent);
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
            <div className="space-y-6">
                <h2 className={`text-2xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Crear Registro
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatedInput
                        label="Año"
                        name="ano"
                        type="number"
                        value={formData.ano.toString()}
                        onChange={handleInputChange}
                        required
                        darkMode={isDarkMode}
                    />

                    <AnimatedSelect
                        label="Mes *"
                        name="mes"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        options={monthOptions}
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Valor de Producción"
                        name="valor"
                        type="number"
                        value={monthValue}
                        onChange={handleValueChange}
                        required
                        step="0.01"
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
            
            <AlertError
                isOpen={showErrorAlert}
                message={errorMessage}
                onClose={() => {
                    setShowErrorAlert(false);
                    setErrorMessage('');
                }}
            />
        </ModalContainer>
    );
};

export default CreateHistoricoProduccionCacao;
