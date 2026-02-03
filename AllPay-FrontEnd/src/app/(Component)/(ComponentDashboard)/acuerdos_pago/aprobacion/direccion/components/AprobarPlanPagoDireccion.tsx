'use client'

// react
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// components
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';

// hooks
import { useAprobacionPlanPagoDireccion } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/hooks/useAprobacionPlanPagoDireccion';
import { useInformacionSolicitudDireccion } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/hooks/useInformacionSolicitud';

// utils
import { formatCurrency } from '@/utils/formatters';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';

interface SolicitarAcuerdoPagoProps {
    idSolicitud: string;
    nroSolicitud: string;
    onClose?: () => void;
    onSave?: (data: any) => void;
    onSuccess?: () => void;
}

export default function AprobarPlanPagoDireccion({ nroSolicitud, idSolicitud, onClose, onSave, onSuccess }: SolicitarAcuerdoPagoProps) {
    
    const { theme } = useTheme();
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;

    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        vo_bo_area_recaudo: '',
        vo_bo_juridica: '',
        aprobacion_direccion: 'pendiente',
        fecha_aprobacion: '',
        observacion_direccion: ''
    });

    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { loading: aprobacionLoading,
        //error: aprobacionError,
        aprobarPlanPagoDireccion 
        } = useAprobacionPlanPagoDireccion();

    //const { loading: detalleLoading, error: detalleError, data: detalleData } = useDetallePlanPagoDireccion(idSolicitud, token);
    
    const { 
        loading: informacionLoading, 
        error: informacionError, 
        data: informacionData, 
        obtenerInformacionSolicitud 
    } = useInformacionSolicitudDireccion();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Obtener información de la solicitud cuando se monta el componente
    useEffect(() => {
        if (token && idSolicitud) {
            obtenerInformacionSolicitud(token, idSolicitud);
        }
    }, [token, idSolicitud]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        try {
            const idPlanPago = informacionData?.data?.id_plan_pago;
            const response = await aprobarPlanPagoDireccion(String(idPlanPago), token, formData);
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
    
    // Obtener el primer registro del detalle para mostrar la información
    //const detalleInfo = detalleData?.[0];
    //const valorTotal = detalleData?.reduce((sum, item) => sum + (item.valor_factura || 0), 0) || 0;

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
                Aprobar Plan de Pago Gerencia
            </h3>

            {(informacionLoading || aprobacionLoading) && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                </div>
            )}

            {(informacionError) && (
                <div className={`text-center py-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    {informacionError}
                </div>
            )}

            {!informacionLoading && !informacionError && (
                <div className="grid grid-cols-3 gap-4 mt-8">
                    <AnimatedInput
                        label="Número solicitud"
                        name="numero_solicitud"
                        type="text"
                        value={nroSolicitud}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Número plan de pago"
                        name="numero_plan_pago"
                        type="text"
                        value={String(informacionData?.data?.nro_plan_pago || '')}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Número de cuotas"
                        name="numero_cuotas"
                        type="text"
                        value={String(informacionData?.data?.nro_cuotas || '')}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="Valor Total"
                        name="valor_total"
                        type="text"
                        value={formatCurrency(informacionData?.data?.valor_total_pagar)}
                        readOnly
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="VoBo Área de Recaudo"
                        name="vo_bo_area_recaudo"
                        type="text"
                        value={'Aceptada Recaudo'}
                        disabled={true}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />

                    <AnimatedInput
                        label="VoBo Jurídica"
                        name="vo_bo_juridica"
                        type="text"
                        value={'Aceptada Jurídica'}
                        disabled={true}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />

                    <AnimatedSelect
                        label="Aprobación Gerencia"
                        name="aprobacion_direccion"
                        value={formData.aprobacion_direccion}
                        onChange={handleInputChange}
                        options={[
                            { key: 'pendiente', value: 'Pendiente', title: 'Pendiente' },
                            { key: 'aceptada', value: 'Aceptada Gerencia', title: 'Aceptada Gerencia' }
                        ]}
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
                        name="observacion_direccion"
                        value={formData.observacion_direccion}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />
                </div>
            )}

            <div className="flex justify-end items-center mt-6 gap-4">
                <Button
                    title={aprobacionLoading ? "Guardando..." : "Aprobar"}
                    onClick={handleSave}
                    disabled={aprobacionLoading || informacionLoading || formData.aprobacion_direccion !== 'Aceptada Gerencia'}
                />

                <Button
                    title="Salir"
                    onClick={onClose || (() => {})}
                    disabled={aprobacionLoading || informacionLoading}
                />
            </div>
        </div>
    );
}