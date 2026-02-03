import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { HistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/historicoProduccionCacao.model';
import Swal from 'sweetalert2';

interface EditHistoricoProduccionProps {
    isOpen: boolean;
    onClose: () => void;
    historico: HistoricoProduccionCacao;
    onSuccess: (updated: any) => void;
}

const EditHistoricoProduccion: React.FC<EditHistoricoProduccionProps> = ({ isOpen, onClose, historico, onSuccess }) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        ano: historico.ano,
        enero: historico.enero,
        febrero: historico.febrero,
        marzo: historico.marzo,
        abril: historico.abril,
        mayo: historico.mayo,
        junio: historico.junio,
        julio: historico.julio,
        agosto: historico.agosto,
        septiembre: historico.septiembre,
        octubre: historico.octubre,
        noviembre: historico.noviembre,
        diciembre: historico.diciembre,
        pano: historico.pano
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    useEffect(() => {
        setFormData({
            ano: historico.ano,
            enero: historico.enero,
            febrero: historico.febrero,
            marzo: historico.marzo,
            abril: historico.abril,
            mayo: historico.mayo,
            junio: historico.junio,
            julio: historico.julio,
            agosto: historico.agosto,
            septiembre: historico.septiembre,
            octubre: historico.octubre,
            noviembre: historico.noviembre,
            diciembre: historico.diciembre,
            pano: historico.pano
        });
    }, [historico]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'ano' ? Number(value) : value
        }));
    };

    const validateForm = () => {
        if (!formData.ano || formData.ano < 1900 || formData.ano > new Date().getFullYear() + 10) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El año debe ser válido',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return false;
        }
        
        return true;
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            // TODO: Implementar actualización cuando esté disponible el endpoint
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Registro actualizado correctamente',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            onSuccess(formData);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar el registro',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} size="lg">
            <div className="space-y-4">
                <h3 className={`text-xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Editar Histórico de Producción de Cacao
                </h3>

                <AnimatedInput
                    label="Año"
                    name="ano"
                    type="number"
                    value={formData.ano.toString()}
                    onChange={handleInputChange}
                    required
                    darkMode={isDarkMode}
                />

                <div className="grid grid-cols-2 gap-4">
                    <AnimatedInput
                        label="Enero"
                        name="enero"
                        value={formData.enero}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Febrero"
                        name="febrero"
                        value={formData.febrero}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Marzo"
                        name="marzo"
                        value={formData.marzo}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Abril"
                        name="abril"
                        value={formData.abril}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Mayo"
                        name="mayo"
                        value={formData.mayo}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Junio"
                        name="junio"
                        value={formData.junio}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Julio"
                        name="julio"
                        value={formData.julio}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Agosto"
                        name="agosto"
                        value={formData.agosto}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Septiembre"
                        name="septiembre"
                        value={formData.septiembre}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Octubre"
                        name="octubre"
                        value={formData.octubre}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Noviembre"
                        name="noviembre"
                        value={formData.noviembre}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Diciembre"
                        name="diciembre"
                        value={formData.diciembre}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                </div>

                <AnimatedInput
                    label="Total Año"
                    name="pano"
                    value={formData.pano}
                    onChange={handleInputChange}
                    darkMode={isDarkMode}
                />

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

export default EditHistoricoProduccion; 