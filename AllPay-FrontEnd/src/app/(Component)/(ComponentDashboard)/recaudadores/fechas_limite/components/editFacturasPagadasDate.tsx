import React, { useState } from 'react';
import { PazSalvoDateData } from '../models/pazSalvoDate.model';
import { updatePazSalvoFechaVigente } from '../adapters/pazSalvoDate.update';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';

// Componentes de alerta personalizados
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';

interface EditFacturasPagadasDateProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    date: PazSalvoDateData;
    onSuccess: () => void;
}

const EditFacturasPagadasDate: React.FC<EditFacturasPagadasDateProps> = ({ isOpen, onClose, token, date, onSuccess }) => {
    const [descripcion, setDescripcion] = useState(date.descripcion);
    const [diasVigencia, setDiasVigencia] = useState(date.dias_vigencia);
    
    // Estados para las alertas
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [successText, setSuccessText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

        setIsLoading(true);

        try {
            // Siempre usar 'FP' como código para facturas pagadas
            await updatePazSalvoFechaVigente(
                'FP',
                {
                    descripcion,
                    dias_vigencia: diasVigencia
                },
                token
            );

            setIsLoading(false);
            setIsSuccess(true);
            setSuccessText('Fecha de vigencia de facturas pagadas actualizada correctamente');
            
            // Llamar a onSuccess después de cerrar la alerta
            setTimeout(() => {
                setIsSuccess(false);
                onSuccess();
            }, 1500);
        } catch (error) {
            setIsLoading(false);
            setIsError(true);
            setErrorText(error instanceof Error ? error.message : 'Error al actualizar la fecha de vigencia de facturas pagadas');
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

            {/* Spinner de carga */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]"></div>
                </div>
            )}

            <h2 className="mb-6 text-xl font-bold text-center text-[#562707]">
                Editar Fecha de Vigencia de Facturas Pagadas
            </h2>

            <div className="mb-4">
                <AnimatedInput
                    label="Descripción"
                    name="descripcion"
                    value={descripcion}
                    onChange={handleDescripcionChange}
                    required
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
                />
            </div>

            <div className="mt-6 flex justify-center space-x-4">
                <Button 
                    onClick={handleSubmit}
                    title="Guardar" 
                    disabled={isLoading}
                />
                <Button 
                    onClick={onClose}
                    title="Cancelar" 
                    disabled={isLoading}
                />
            </div>
        </ModalContainer>
    );
};

export default EditFacturasPagadasDate; 