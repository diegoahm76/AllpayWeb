'use client'

// react
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// app
import { useAprobacionPlanPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/hooks/useAprobacionPlanPago';

// components
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';

// hooks
import { useInformacionSolicitudJuridica } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/hooks/useInformacionSolicitud';

// utils
import { formatCurrency } from '@/utils/formatters';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';

interface SolicitarAcuerdoPagoProps {
    idSolicitud: string | null;
    idPlanPago: string | null;
    onClose?: () => void;
    onSave?: (data: any) => void;
    onSuccess?: () => void;
}

export default function AprobarPlanPagoJuridico({ idSolicitud, idPlanPago, onClose, onSave, onSuccess }: SolicitarAcuerdoPagoProps) {
    const { theme } = useTheme();
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;

    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        vo_bo_area_recaudo: '',
        vo_bo_juridica: 'Pendiente',
        aprobacion_direccion: '',
        fecha_aprobacion: '',
        observacion_juridica: ''
    });

    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    const [successMessage, setSuccessMessage] = useState('');

    const { loading: aprobacionLoading,
        //error: aprobacionError,
        aprobarPlanPago 
        } = useAprobacionPlanPago();
        
    const { loading: detalleLoading, error: detalleError, data: informacionSolicitud, obtenerInformacionSolicitud } = useInformacionSolicitudJuridica();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar información al montar el componente
    useEffect(() => {
        if (token && idPlanPago) {
            obtenerInformacionSolicitud(token, idPlanPago || 0);
        }
    }, [token, idPlanPago]); // Removí obtenerInformacionSolicitud para evitar bucle infinito

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        try {
            const response = await aprobarPlanPago(String(informacionSolicitud?.data.id_plan_pago), token, formData);
            setSuccessMessage(response.detail);
            setShowSuccess(true);
            
            if (onSave) {
                onSave(response);
            }
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error al aprobar el plan de pago');
            setShowError(true);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        if (onSuccess) {
            onSuccess();
        }
        onClose?.();
    };

    // Datos de la nueva información de solicitud
    const solicitudData = informacionSolicitud?.data;

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full max-w-full mx-auto">
            <AlertSuccess
                isOpen={showSuccess}
                message={successMessage}
                onClose={handleSuccessClose}
            />

            <AlertError
                isOpen={showError}
                message={errorMessage}
                onClose={() => setShowError(false)}
            />
                                
            <h3 className={`text-2xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                Aprobar Plan de Pago Jurídico
            </h3>

            {(detalleLoading || aprobacionLoading) && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                </div>
            )}

            {detalleError && (
                <div className={`text-center py-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    {detalleError}
                </div>
            )}

            {!detalleLoading && !detalleError && (
                <div className="grid grid-cols-3 gap-4 mt-8">
                    <AnimatedInput
                        label="Número solicitud"
                        name="numero_solicitud"
                        disabled={true}
                        type="text"
                        value={idSolicitud || ''}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Número plan de pago"
                        name="numero_plan_pago"
                        disabled={true}
                        type="text"
                        value={String(solicitudData?.nro_plan_pago || '')}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Número de cuotas"
                        name="numero_cuotas"
                        disabled={true}
                        type="text"
                        value={String(solicitudData?.nro_cuotas || '')}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Valor Total"
                        name="valor_total"
                        disabled={true}
                        type="text"
                        value={formatCurrency(solicitudData?.valor_total_pagar || 0)}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="VoBo Área de Recaudo"
                        name="vo_bo_area_recaudo"
                        type="text"
                        disabled={true}
                        value={'Aceptada Recaudo'}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />

                    <AnimatedSelect
                        label="VoBo Jurídica"
                        name="vo_bo_juridica"
                        value={formData.vo_bo_juridica}
                        onChange={handleInputChange}
                        options={[
                            { key: 'pendiente', value: 'Pendiente', title: 'Pendiente' },
                            { key: 'aceptada', value: 'Aceptada Juridica', title: 'Aceptada Jurídica' }
                        ]}
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Aprobación Gerencia"
                        name="aprobacion_direccion"
                        type="text"
                        value={'Pendiente'}
                        disabled={true}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Fecha Aprobación"
                        name="fecha_aprobacion"
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        disabled={true}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />

                    <AnimatedTextarea
                        label="Observaciones"
                        name="observacion_juridica"
                        value={formData.observacion_juridica}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                </div>
            )}

            <div className="flex justify-end items-center mt-6 gap-4">
                <Button
                    title={aprobacionLoading ? "Guardando..." : "Aprobar"}
                    onClick={handleSave}
                    disabled={aprobacionLoading || detalleLoading || formData.vo_bo_juridica !== 'Aceptada Juridica'}
                />

                <Button
                    title="Salir"
                    onClick={onClose || (() => {})}
                    disabled={aprobacionLoading || detalleLoading}
                />
            </div>
        </div>
    );
}