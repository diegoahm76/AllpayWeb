'use client';

import React, { useState, useEffect } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { useTypesCocoa } from '../hooks/useTypesCocoa';
import { signIn, useSession } from 'next-auth/react';
import AlertForm from '@/presenters/components/recaudadores/AlertForm';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import { usePorcentajesCobro } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/usePorcentajesCobro';
import { PorcentajeCobro } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/models/collector.porcentage.model';
import { formatCurrency } from '@/utils/formatters';
import { formatNumberWithCommas } from '@/utils/formatters';
import { useTheme } from 'next-themes';

interface FormData {
    tipoCacao: string;
    cantidadKilos: string;
    precioKilo: string;
    valorBruto: string;
    cuotaFomento: string;
    valorNeto: string;
}

interface PurchaseData extends FormData {
    id: string;
}

interface RegisterPurchaseProps {
    isOpen: boolean;
    onClose: () => void;
    onSavePurchases: (purchases: PurchaseData[]) => void;
}

const RegisterPurchase: React.FC<RegisterPurchaseProps> = ({
    isOpen,
    onClose,
    onSavePurchases,
}) => {
    const { theme } = useTheme();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        },
    });

    const valueSesion: any = session;
    const token = valueSesion?.user?.tokens?.access || '';

    const { tiposCacao } = useTypesCocoa(token);

    // Estado local para almacenar los porcentajes una sola vez
    const [porcentajeCuotaFomento, setPorcentajeCuotaFomento] = useState<PorcentajeCobro | null>(null);

    const { porcentajes } = usePorcentajesCobro();


    // Función para convertir comas a puntos para cálculos (para cantidad kilos)
    const parseNumberWithCommas = (value: string): number => {
        if (!value) return 0;
        // Convertir comas a puntos para parseFloat
        return parseFloat(value.replace(/,/g, '.'));
    };

    // Función para formatear números enteros con separadores de miles (para precio)
    const formatIntegerWithThousands = (value: string): string => {
        if (!value) return '';
        // Remover cualquier formato existente y convertir a número
        const numericValue = value.replace(/[^0-9]/g, '');
        if (!numericValue) return '';
        // Formatear con separadores de miles
        return parseInt(numericValue).toLocaleString('es-CO');
    };

    // Función para convertir número formateado a entero (para precio)
    const parseIntegerWithThousands = (value: string): number => {
        if (!value) return 0;
        // Remover separadores de miles y convertir a número
        return parseInt(value.replace(/[^0-9]/g, '')) || 0;
    };

    useEffect(() => {
        if (porcentajes && porcentajes.length > 0) {
            const cuotaFomento = porcentajes.find(p => p.cod_tipo_cobro === 'CF');
            if (cuotaFomento) {
                setPorcentajeCuotaFomento(cuotaFomento);
            }
        }
    }, [porcentajes]);

    const [formData, setFormData] = useState<FormData>({
        tipoCacao: '',
        cantidadKilos: '',
        precioKilo: '',
        valorBruto: '',
        cuotaFomento: '',
        valorNeto: '',
    });

    const [temporaryPurchases, setTemporaryPurchases] = useState<PurchaseData[]>([]);
    const [showAlert, setShowAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

    // Limpiar el estado cuando se cierra el modal
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                tipoCacao: '',
                cantidadKilos: '',
                precioKilo: '',
                valorBruto: '',
                cuotaFomento: '',
                valorNeto: '',
            });
        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        let processedValue = value;

        if (name === 'cantidadKilos') {
            let sanitizedValue = value.replace(/[^0-9,.]/g, '');

            sanitizedValue = sanitizedValue.replace(/,(?=.*[,])/g, '');

            const valueWithoutThousands = sanitizedValue.replace(/\./g, '');
            const [rawIntegerPart = '', decimalPart = ''] = valueWithoutThousands.split(',');
            const hasDecimalSeparator = sanitizedValue.endsWith(',') || sanitizedValue.includes(',');

            let integerPart = rawIntegerPart.replace(/^0+(?=\d)/, '');
            if (!integerPart && rawIntegerPart !== '') {
                integerPart = '0';
            }
            if (!integerPart && hasDecimalSeparator) {
                integerPart = '0';
            }

            processedValue = hasDecimalSeparator
                ? `${integerPart}.${decimalPart}`
                : integerPart;
        } else if (name === 'precioKilo') {
            // Para precio kilo: solo números enteros, sin decimales
            processedValue = value.replace(/[^0-9]/g, '');
        } else {
            // Para otros campos, mantener la lógica original
            processedValue = value.replace(/[^0-9.]/g, '');
        }

        setFormData((prev) => ({
            ...prev,
            [name]: processedValue,
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {

        const selectedOption = tiposCacao.find((option) => option.value === e.target.value);

        if (selectedOption) {
            setFormData((prev) => {
                return {
                    ...prev,
                    tipoCacao: selectedOption.value, 
                };
            });
        }
    };

    // Efecto para calcular valores siempre que cambie la cantidad, precio o los porcentajes
    useEffect(() => {
        if (formData.cantidadKilos && formData.precioKilo && porcentajeCuotaFomento) {
            const cantidadKilos = parseNumberWithCommas(formData.cantidadKilos);
            const precioKilo = parseIntegerWithThousands(formData.precioKilo);
            if (isNaN(cantidadKilos) || isNaN(precioKilo)) return;

            const valorBruto = cantidadKilos * precioKilo;

            // Buscamos el porcentaje que tenga cod_tipo_cobro "CF"
            const porcentajeObj = porcentajeCuotaFomento;
            if (!porcentajeObj) {
                console.error('No se encontró el porcentaje de cobro para "CF". Verifica la data:', porcentajeCuotaFomento);
                return;
            }

            const porcentajeFomento = parseFloat(porcentajeObj.valor || '0');
            if (isNaN(porcentajeFomento)) {
                console.error('El valor de porcentaje de cobro no es un número:', porcentajeObj.valor);
                return;
            }

            const cuotaFomento = (valorBruto * porcentajeFomento);
            const valorNeto = valorBruto - cuotaFomento;

            setFormData((prev) => ({
                ...prev,
                valorBruto: valorBruto.toFixed(2),
                cuotaFomento: cuotaFomento.toFixed(2),
                valorNeto: valorNeto.toFixed(2),
            }));
        }
    }, [formData.cantidadKilos, formData.precioKilo, porcentajeCuotaFomento]);

    const handleGuardar = () => {
        if (!formData.tipoCacao) {
            return;
        }

        // Encontrar el título del tipo de cacao seleccionado
        const selectedOption = tiposCacao.find((option) => option.value === formData.tipoCacao);
        if (!selectedOption) return;

        const newPurchase: PurchaseData = {
            ...formData,
            tipoCacao: selectedOption.title, 
            id: Date.now().toString(),
        };

        setTemporaryPurchases((prev) => [...prev, newPurchase]);
        setShowAlert(true);
    };

    const handleAlertConfirm = () => {
        setFormData({
            tipoCacao: '',
            cantidadKilos: '',
            precioKilo: '',
            valorBruto: '',
            cuotaFomento: '',
            valorNeto: '',
        });
        setShowAlert(false);
    };

    const handleAlertCancel = () => {
        onSavePurchases(temporaryPurchases);
        setShowSuccessAlert(true);
        setTemporaryPurchases([]);
        setShowAlert(false);
        onClose();
    };

    const handleSuccessClose = () => {
        setShowSuccessAlert(false);
        onClose();
    };

    const handleLimpiar = () => {
        setFormData({
            tipoCacao: '',
            cantidadKilos: '',
            precioKilo: '',
            valorBruto: '',
            cuotaFomento: '',
            valorNeto: '',
        });
    };

    const handleClose = () => {
        if (temporaryPurchases.length > 0) {
            setShowCloseConfirmation(true);
        } else {
            onClose();
        }
    };

    const handleConfirmClose = () => {
        setTemporaryPurchases([]);
        setShowCloseConfirmation(false);
        onClose();
    };

    const handleCancelClose = () => {
        setShowCloseConfirmation(false);
    };

    return (
        <>
            <AlertForm
                isOpen={isOpen}
                onClose={handleClose}
                onSave={handleGuardar}
                onClear={handleLimpiar}
                size="md"
                title="REGISTRAR COMPRA"
            >
                <div className="space-y-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <AnimatedSelect
                                    label="TIPO DE CACAO"
                                    name="tipoCacao"
                                    value={formData.tipoCacao}
                                    onChange={handleSelectChange}
                                    options={tiposCacao}
                                    darkMode={theme === 'dark'}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <AnimatedInput
                                    label="CANTIDAD KILOS"
                                    name="cantidadKilos"
                                    value={formatNumberWithCommas(formData.cantidadKilos.toString())}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={theme === 'dark'}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <AnimatedInput
                                    label="PRECIO KILO"
                                    name="precioKilo"
                                    value={formatIntegerWithThousands(formData.precioKilo)}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={theme === 'dark'}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <AnimatedInput
                                    label="VALOR DE BRUTO"
                                    name="valorBruto"
                                    value={formatCurrency(formData.valorBruto)}
                                    onChange={handleInputChange}
                                    type="text"
                                    disabled
                                    darkMode={theme === 'dark'}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <AnimatedInput
                                    label="CUOTA DE FOMENTO"
                                    name="cuotaFomento"
                                    value={formatCurrency(formData.cuotaFomento)}
                                    onChange={handleInputChange}
                                    type="text"
                                    disabled
                                    darkMode={theme === 'dark'}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <AnimatedInput
                                    label="VALOR NETO"
                                    name="valorNeto"
                                    value={formatCurrency(formData.valorNeto)}
                                    onChange={handleInputChange}
                                    type="text"
                                    disabled
                                    darkMode={theme === 'dark'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </AlertForm>

            <AlertQuestion
                isOpen={showAlert}
                onClose={handleAlertCancel}
                onConfirm={handleAlertConfirm}
                questionText="¿Desea registrar otra compra de cacao a la misma factura única nacional?"
            />

            <AlertQuestion
                isOpen={showCloseConfirmation}
                onClose={handleCancelClose}
                onConfirm={handleConfirmClose}
                questionText="¿Está seguro que desea cerrar el modal? Se perderán las compras no guardadas."
            />

            <AlertNotification
                isOpen={showSuccessAlert}
                onClose={handleSuccessClose}
                notificationText="Registro de compra de cacao exitoso"
            />
        </>
    );
};

export default RegisterPurchase;
