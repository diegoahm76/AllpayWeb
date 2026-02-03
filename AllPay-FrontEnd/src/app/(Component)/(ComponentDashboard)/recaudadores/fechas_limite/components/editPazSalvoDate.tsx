import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { PazSalvoDateData } from '../models/pazSalvoDate.model';
import { updatePazSalvoFechaVigente } from '../adapters/pazSalvoDate.update';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';

// Componentes de alerta personalizados
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface EditPazSalvoDateProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    date: PazSalvoDateData;
    onSuccess: () => void;
}

const EditPazSalvoDate: React.FC<EditPazSalvoDateProps> = ({ isOpen, onClose, token, date, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [descripcion, setDescripcion] = useState(date.descripcion);
    const [diasVigencia, setDiasVigencia] = useState(date.dias_vigencia);
    
    // Estados para las alertas
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [successText, setSuccessText] = useState('');
    const [isLoadingAlert, setIsLoadingAlert] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const handleDescripcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDescripcion(e.target.value);
    };

    const handleDiasVigenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = parseInt(e.target.value);
        if (!isNaN(valor) && valor > 0) {
            setDiasVigencia(valor);
        }
    };

    const handleSubmit = async () => {
        // Validar que los campos no estén vacíos
        if (!descripcion.trim() || !diasVigencia || diasVigencia <= 0) {
            setIsError(true);
            setErrorText('Por favor complete todos los campos correctamente. Los días de vigencia deben ser mayores a 0.');
            return;
        }

        setIsLoadingAlert(true);

        try {
            await updatePazSalvoFechaVigente(
                date.cod_tipo_fecha,
                {
                    descripcion,
                    dias_vigencia: diasVigencia
                },
                token
            );

            setIsLoadingAlert(false);
            setIsSuccess(true);
            setSuccessText('Fecha de vigencia actualizada correctamente');
            
            // Llamar a onSuccess después de cerrar la alerta
            setTimeout(() => {
                setIsSuccess(false);
                onSuccess();
            }, 1500);
        } catch (error) {
            setIsLoadingAlert(false);
            setIsError(true);
            setErrorText(error instanceof Error ? error.message : 'Error al actualizar la fecha de vigencia');
        }
    };

    const handleSuccessClose = () => {
        setIsSuccess(false);
        onSuccess();
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
            {/* Componentes de alertas */}
            <AlertSuccess
                isOpen={isSuccess}
                message={successText}
                onClose={handleSuccessClose}
            />

            <AlertError
                isOpen={isError}
                onClose={() => setIsError(false)}
                message={errorText}
            />

            <AlertLoader
                isOpen={isLoadingAlert}
                loadingText="Actualizando fecha de vigencia"
            />

            <h2 className={`mb-6 text-xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Editar Fecha de Vigencia de Paz y Salvo
            </h2>

            <div className="mb-4">
                <AnimatedInput
                    label="Descripción"
                    name="descripcion"
                    value={descripcion}
                    onChange={handleDescripcionChange}
                    required
                    darkMode={isDarkMode}
                />
            </div>

            <div className="mb-4">
                <AnimatedInput
                    label="Días de Vigencia"
                    name="dias_vigencia"
                    type="number"
                    value={diasVigencia.toString()}
                    onChange={handleDiasVigenciaChange}
                    required
                    darkMode={isDarkMode}
                />
            </div>

            <div className="mt-6 flex justify-center space-x-4">
                <Button 
                    onClick={handleSubmit}
                    title="Guardar" 
                    disabled={isLoadingAlert}
                />
                <Button 
                    onClick={onClose}
                    title="Cancelar" 
                    disabled={isLoadingAlert}
                />
            </div>
        </ModalContainer>
    );
};

export default EditPazSalvoDate; 