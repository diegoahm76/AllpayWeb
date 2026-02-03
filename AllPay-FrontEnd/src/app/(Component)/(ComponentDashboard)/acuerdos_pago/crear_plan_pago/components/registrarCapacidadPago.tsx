import React, { useState, useEffect } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { useTheme } from 'next-themes';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useInfoAcuerdoPago } from '../hooks/useInfoAcuerdoPago';
import { useFacturasPorSolicitud } from '../hooks/useFacturasPorSolicitud';
import { useCrearPlanPago } from '../hooks/useCrearPlanPago';
import { useSession } from 'next-auth/react';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { formatCurrency } from '@/utils/formatters';
import { formatearFecha } from '@/utils/dateUtils';

interface RegistrarCapacidadPagoProps {
    idSolicitud: string;
    hasPlanPago: boolean;
    onClose: () => void;
}

export default function RegistrarCapacidadPago({ idSolicitud, hasPlanPago, onClose }: RegistrarCapacidadPagoProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;

    const [nroSolicitud, setNroSolicitud] = useState('');
    const [nroCuotas, setNroCuotas] = useState('');
    const [valorFactura, setValorFactura] = useState('');
    const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<number[]>([]);
    const [fechaPago, setFechaPago] = useState('');
    const [showLoader, setShowLoader] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showQuestion, setShowQuestion] = useState(false);
    const [questionText, ] = useState('');
    const [answerAfirmative, ] = useState('');
    const [answerNegative, ] = useState('');
    const [currentFacturaIndex, ] = useState(0);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const { data, idPlanPago, fetchInfoAcuerdoPago } = useInfoAcuerdoPago();
    
    const {
        loading: loadingFacturas,
        data: dataFacturas,
        fetchFacturasPorSolicitud
    } = useFacturasPorSolicitud();

    const { loading: loadingCrearPlan, fetchCrearPlanPago } = useCrearPlanPago();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (data && data.data) {
            setNroCuotas(data.data.nro_cuotas.toString());
            setNroSolicitud(data.data.nro_solicitud.toString());
        }
    }, [data]);

    useEffect(() => {
        if (token && idSolicitud) {
            fetchInfoAcuerdoPago(hasPlanPago, token, idSolicitud);
            fetchFacturasPorSolicitud(token, idSolicitud);
        }
    }, [token, idSolicitud, fetchInfoAcuerdoPago, fetchFacturasPorSolicitud]);

    useEffect(() => {
        if (!dataFacturas?.data) {
            setValorFactura('');
            return;
        }
        const seleccionadas = dataFacturas.data.filter(factura =>
            facturasSeleccionadas.includes(factura.id_factura_unica)
        );
        if (seleccionadas.length === 0) {
            setValorFactura('');
        } else if (seleccionadas.length === 1) {
            setValorFactura(
                seleccionadas[0].valor_factura.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
            );
        } else {
            const total = seleccionadas.reduce((acc, curr) => acc + curr.valor_factura, 0);
            setValorFactura(
                total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
            );
        }
    }, [facturasSeleccionadas, dataFacturas]);

    const handleCreateQuota = async () => {
        if (facturasSeleccionadas.length === 0 || !fechaPago) {
            setErrorMessage(
                facturasSeleccionadas.length === 0 && !fechaPago
                    ? 'Debe seleccionar al menos una factura y digitar la fecha de pago.'
                    : facturasSeleccionadas.length === 0
                        ? 'Debe seleccionar al menos una factura.'
                        : 'Debe digitar la fecha de pago.'
            );
            setShowError(true);
            return;
        }
        setShowLoader(true);
        setShowSuccess(false);
        setShowQuestion(false);

        try {
            let payload: any = {
                id_solicitud_acuerdo_pago: parseInt(idSolicitud),
                id_facturas: facturasSeleccionadas,
                fecha_pago: fechaPago,
            };

            if(!hasPlanPago){
                await fetchCrearPlanPago(hasPlanPago, token, payload);
            } else {
                if (!idPlanPago) {
                    throw new Error('No se encontró el ID del plan de pago');
                }
                payload = {
                    ...payload,
                    id_plan_pago: idPlanPago
                };
                await fetchCrearPlanPago(hasPlanPago, token,  payload);
            }

            setShowLoader(false);
            setSuccessMessage('¡Plan de pago creado exitosamente!');
            setShowSuccess(true);
        } catch (error: any) {
            console.error('Error al crear plan de pago:', error);
            setShowLoader(false);
            setErrorMessage(error?.message || 'Ocurrió un error al crear el plan de pago.');
            setShowError(true);
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        onClose();
        window.location.reload();
    };

    const handleCloseQuestion = () => {
        setShowQuestion(false);
    };


    const columns = [
        { key: 'nro_factura_unica', label: 'No. Factura Única' },
        { key: 'dias_mora', label: 'Días Mora' },
        { key: 'fecha_limite_pago', label: 'Fecha Limite Pago', render: (value: string) => formatearFecha(new Date(value)) },
        { key: 'valor_factura', label: 'Valor Factura', render: (value: number) => formatCurrency(value) }
    ];

    const actions = [
        {
            label: 'Seleccionar',
            render: (row: any) => (
                <input
                    type="checkbox"
                    checked={facturasSeleccionadas.includes(row.id_factura_unica)}
                    onChange={() => {
                        if (facturasSeleccionadas.includes(row.id_factura_unica)) {
                            setFacturasSeleccionadas(facturasSeleccionadas.filter(id => id !== row.id_factura_unica));
                        } else {
                            setFacturasSeleccionadas([...facturasSeleccionadas, row.id_factura_unica]);
                        }
                    }}
                />
            )
        }
    ];

    const fetchAllData = async (page: number) => {
        try {
            const facturas = dataFacturas?.data || [];
            
            if (page === 0) {
                return {
                    data: facturas,
                    total_pages: 1
                };
            }
            
            return {
                data: facturas,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    const isDarkMode = mounted && theme === 'dark';
    const headingClass = isDarkMode ? 'text-white' : 'text-[#562707]';

    if (!mounted) {
        return null;
    }

    return (
        <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>     
            <AlertLoader
                isOpen={showLoader}
                loadingText={`Procesando factura ${currentFacturaIndex + 1} de ${facturasSeleccionadas.length}`}
            />
            <AlertSuccess
                isOpen={showSuccess}
                message={successMessage}
                onClose={handleCloseSuccess}
            />
            <AlertQuestion
                isOpen={showQuestion}
                questionText={questionText}
                answerAfirmative={answerAfirmative}
                answerNegative={answerNegative}
                onConfirm={handleCloseQuestion}
                onClose={handleCloseQuestion}
            />
            <AlertError
                isOpen={showError}
                message={errorMessage}
                onClose={() => setShowError(false)}
            />

            <h3 className={`text-2xl text-center font-bold ${headingClass}`}>
                Crear el Plan de Pagos - Registrar Capacidad de Pago
            </h3>

            <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {/* Número solicitud (2 columnas) */}
                <div className="col-span-1 md:col-span-2">
                    <AnimatedInput
                        label="Número solicitud"
                        name="nro_solicitud"
                        type="text"
                        value={nroSolicitud}
                        onChange={() => {}}
                        disabled
                        darkMode={isDarkMode}
                    />
                </div>
                {/* Número Plan de Pago (1 columna) */}
                <div className="col-span-1">
                    <AnimatedInput
                        label="Número Cuotas a Pagar"
                        name="nro_cuotas"
                        type="text"
                        value={nroCuotas}
                        onChange={e => setNroCuotas(e.target.value)}
                        disabled
                        darkMode={isDarkMode}
                    />
                </div>
                {/* Número Cuotas a Pagar (2 columnas) */}
                <div className="col-span-1 md:col-span-2">
                    <AnimatedInput
                        label="Fecha de Pago"
                        name="fecha_pago"
                        type="date"
                        value={fechaPago}
                        onChange={e => setFechaPago(e.target.value)}
                        minDate={new Date().toISOString().split('T')[0]}
                        darkMode={isDarkMode}
                    />
                </div>
                {/* Valor Factura Única (1 columna) */}
                <div className="col-span-1">
                    <AnimatedInput
                        label="Valor Factura Única"
                        name="valor_factura"
                        type="text"
                        value={valorFactura}
                        onChange={e => setValorFactura(e.target.value)}
                        disabled
                        darkMode={isDarkMode}
                    />
                </div>
                {/* Fecha de Pago (2 columnas) */}
                <div className="col-span-1 md:col-span-2">
                 
                </div>
          
            </form>

            {dataFacturas?.data && dataFacturas.data.length > 0 ? (
                <DynamicTable
                    data={dataFacturas.data}
                    columns={columns}
                    currentPage={1}
                    fetchAllData={fetchAllData}
                    totalPages={1}
                    onPageChange={() => {}}
                    actions={actions}
                />
            ) : (
                <div className={`text-center py-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                    {loadingFacturas ? 'Cargando facturas...' : 'No hay facturas disponibles'}
                </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
                <Button
                    title="Crear Cuota"
                    onClick={handleCreateQuota}
                    loading={loadingCrearPlan}
                    disabled={facturasSeleccionadas.length === 0}
                />
         
                <Button
                    title="Salir"
                    onClick={onClose}
                />
            </div>

        </div>
    );
}
