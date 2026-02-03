import React, { useEffect, useState } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { useUpdateInternalInvoice } from '../hooks/useUpdateInternalInvoice';
import { useSession } from 'next-auth/react';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { useTypesCocoa } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/useTypesCocoa';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { useTheme } from 'next-themes';

// notificaciones
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';


interface PurchaseDetailsTableProps {
    columns: Array<{ key: string; label: string }>;
    data: any[];
    valorTotal: string;
    onValorTotalChange: (value: string) => void;
    onSalir: () => void;
    invoiceId: number;
    formData: any;
}

const PurchaseDetailsTable: React.FC<PurchaseDetailsTableProps> = ({
    columns,
    data: initialData,
    valorTotal,
    onValorTotalChange,
    invoiceId,
    formData
}) => {

    const router = useRouter();
    const { data: session } = useSession();
    const valueSesion: any = session;
    const token = valueSesion?.user?.tokens?.access || '';
    const [data, setData] = useState<any[]>(initialData);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const { tiposCacao, loading: loadingTipos, error: errorTipos } = useTypesCocoa(token);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(false);
    const [canEdit, ] = useState<boolean>(true);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // notificaciones
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(false);
    const [successText, setSuccessText] = useState('');
    const [errorText, setErrorText] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const { updateInvoice, isLoading } = useUpdateInternalInvoice(token);
    const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        if (data && data.length > 0) {
            const total = data.reduce((sum, item) => {
                const cuotaFomento = parseFloat(item.cuotaFomento) || 0;
                return sum + cuotaFomento;
            }, 0);
            onValorTotalChange(total.toFixed(2));
        } else {
            onValorTotalChange('0.00');
        }
    }, [data, onValorTotalChange]);

    useEffect(() => {
        if (updateSuccess) {
            setSuccess(true);
            setSuccessText('La factura se ha actualizado correctamente');
            setUpdateSuccess(false);
        }
        

        if (updateError) {
            setError(true);
            setErrorText(updateError);
            setUpdateError(null);
        }
    }, [updateSuccess, updateError]);

    const handleEditClick = (item: any) => {
        setEditingItem({ ...item });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingItem) return;
        const { name, value } = e.target;

        if (name === 'tipoCacao') {
            const selectedOption = tiposCacao.find(option => option.value === value);
            if (selectedOption) {
                setEditingItem((prev: any) => ({
                    ...prev!,
                    tipoCacao: selectedOption.title,
                    id_tipo_cacao: selectedOption.value
                }));
            }
            return;
        }

        setEditingItem((prev: any) => ({
            ...prev!,
            [name]: value
        }));

        if (name === 'cantidadKilos' || name === 'precioKilo') {
            const updatedItem = {
                ...editingItem,
                [name]: value
            };

            const cantidadKilos = parseFloat(updatedItem.cantidadKilos) || 0;
            const precioKilo = parseFloat(updatedItem.precioKilo) || 0;
            const valorBruto = (cantidadKilos * precioKilo).toFixed(2);
            const cuotaFomento = ((parseFloat(valorBruto) * 0.03)).toFixed(2);
            const valorNeto = (parseFloat(valorBruto) - parseFloat(cuotaFomento)).toFixed(2);

            setEditingItem((prev: any) => ({
                ...prev!,
                valorBruto,
                cuotaFomento,
                valorNeto
            }));
        }
    };

    const handleEditSave = () => {
        if (!editingItem) return;

        setData(prev => {
            const updatedList = prev.map(item =>
                item.id_detalle_factura_unica === editingItem.id_detalle_factura_unica ? editingItem : item
            );
            return updatedList;
        });

        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    const handleUpdate = async () => {
        if (!canEdit) {
            setError(true);
            setErrorText('No es posible editar esta factura porque el plazo ha vencido.');
            return;
        }

        try {
            // Construir detalles_factura
            if (!data || data.length === 0) {
                throw new Error('No hay detalles de factura para actualizar');
            }

            const detalles_factura = data.map(item => {
                if (!item.cantidadKilos || !item.precioKilo || !item.id_tipo_cacao) {
                    console.error('Detalle incompleto:', item);
                    throw new Error('Los campos cantidadKilos, precioKilo e id_tipo_cacao son obligatorios');
                }

                return {
                    id_detalle_factura_unica: item.id_detalle_factura_unica,
                    nro_kilos: parseFloat(item.cantidadKilos),
                    valor_kilo: parseFloat(item.precioKilo),
                    id_tipo_cacao: item.id_tipo_cacao,
                    valor_bruto: parseFloat(item.valorBruto),
                    cuota_fomento: parseFloat(item.cuotaFomento),
                    valor_neto: parseFloat(item.valorNeto)
                };
            });

            // Armas el objeto updateData para enviarlo
            const updateData = {
                nro_documento_soporte: formData.nro_documento_soporte,
                doc_soporte: formData.doc_soporte,
                detalles_factura: detalles_factura
            };

            const response = await updateInvoice(invoiceId, updateData, isInternalUser ?? false);

            // Verificas response.success
            if (response?.success) {
                setSuccess(true);
                setSuccessText(response?.detail || 'La factura se ha actualizado correctamente');
                setUpdateSuccess(false);
            } else {
                setError(true);
                setErrorText(response?.detail || 'Hubo un problema inesperado');
                setUpdateError(null);
            }

        } catch (err) {
            setError(true);
            setErrorText(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
            setUpdateError(null);
        }
    };

    const formattedValorTotal = formatCurrency(parseFloat(valorTotal));

    const totalPages = Math.ceil(data.length / itemsPerPage);

    const getPageData = (page: number) => {
        const start = (page - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
    };

    const getCurrentPageData = () => {
        return getPageData(currentPage);
    };

    const fetchAllData = async (page: number) => {
        // Descarga completa (page === 0)
        if (page === 0) {
            const formattedData = data.map(item => {
                const row: Record<string, any> = {};
                columns.forEach(({ key, label }) => {
                    if (key === 'actions') return; // Excluir columna de acciones
                    const value = item[key];
                    if (key === 'cantidadKilos') {
                        row[label] = formatNumber(+value, 4);
                    } else if (['precioKilo', 'valorBruto', 'cuotaFomento', 'valorNeto'].includes(key)) {
                        row[label] = formatCurrency(+value);
                    } else {
                        row[label] = value;
                    }
                });
                return row;
            });
            return { data: formattedData, total_pages: 1 };
        }

        // Paginación normal
        const pageData = getPageData(page);
        if (currentPage !== page) setCurrentPage(page);
        return { data: pageData, total_pages: totalPages };
    };

    const tableColumns = [
        ...columns,
        {
            key: 'actions',
            label: 'Acciones',
            render: (_val: any, row: any) => (
                <button
                    onClick={() => handleEditClick(row)}
                    className="text-blue-500 hover:text-blue-700"
                >
                    <img src="/images/icons/update.png" alt="Editar" className="w-5 h-5" />
                </button>
            )
        }
    ];

    const isDarkMode = mounted && theme === 'dark';
    const cardClass = isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white';
    const headingTextClass = isDarkMode ? 'text-white' : 'text-[#562707]';

    if (!mounted) {
        return null;
    }

    return (
        <div className={`${cardClass} rounded-3xl p-4`}>

            {/* Notificaciones */}
            <AlertSuccess
                isOpen={success}
                message={successText}
                onClose={() => setSuccess(false)}
            />
            <AlertError
                isOpen={error}
                message={errorText}
                onClose={() => setError(false)}
            />

            <AlertLoader
                isOpen={isLoading}
                loadingText="Actualizando..."
            />
            
            {/* Tabla de detalles */}
            <div className="mb-6">
                <h2 className={`text-2xl mt-[39px] text-center font-bold mb-4 ${headingTextClass}`}>
                    DETALLE DE COMPRA
                </h2>
                <DynamicTable
                    columns={tableColumns}
                    data={getCurrentPageData()}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    fetchAllData={fetchAllData}
                    downloadButtonPosition="top"
                />
                <p className={`mt-4 text-md ${headingTextClass}`}>Si usted desea eliminar o agregar una compra, debe comunicarse con el administrador.</p>
            </div>

            {/* Valor a pagar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-64">
                    <AnimatedInput
                        label="VALOR A PAGAR"
                        name="valorTotal"
                        value={formattedValorTotal}
                        onChange={(e) => onValorTotalChange(e.target.value)}
                        type="text"
                        disabled
                        darkMode={isDarkMode}
                    />
                </div>

                <div className='flex flex-col items-center md:justify-start md:flex-row gap-4 w-full md:w-auto'>
                    <Button
                        title="Actualizar"
                        onClick={handleUpdate}
                        disabled={!canEdit || isLoading}
                    />
                    <Button
                        title="Regresar"
                        onClick={() => router.back()}
                    />
                    <Button
                        title="Salir"
                        onClick={() => router.push('/')}
                    />
                </div>
            </div>

            {/* Modal de Edición */}
            {isEditModalOpen && editingItem && (
                <ModalContainer
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingItem(null);
                    }}
                    size="md"
                >
                    <h2 className={`text-2xl font-bold mb-6 text-center ${headingTextClass}`}>EDITAR COMPRA</h2>
                    <div className="space-y-4">
                        <AnimatedSelect
                            label="TIPO DE CACAO"
                            name="tipoCacao"
                            value={tiposCacao.find(t => t.title === editingItem.tipoCacao)?.value || ''}
                            onChange={handleEditChange}
                            options={tiposCacao}
                            darkMode={isDarkMode}
                        />
                        {loadingTipos && <p className="text-gray-500 text-sm mt-1">Cargando tipos de cacao...</p>}
                        {errorTipos && <p className="text-red-500 text-sm mt-1">{errorTipos}</p>}
                        <AnimatedInput
                            label="Cantidad de Kilos"
                            name="cantidadKilos"
                            value={editingItem.cantidadKilos}
                            onChange={handleEditChange}
                            type="text"
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Precio por Kilo"
                            name="precioKilo"
                            value={editingItem.precioKilo}
                            onChange={handleEditChange}
                            type="text"
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Valor Bruto"
                            name="valorBruto"
                            value={formatCurrency(editingItem.valorBruto)}
                            onChange={handleEditChange}
                            type="text"
                            disabled
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Cuota de Fomento"
                            name="cuotaFomento"
                            value={formatCurrency(editingItem.cuotaFomento)}
                            onChange={handleEditChange}
                            type="text"
                            disabled
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Valor Neto"
                            name="valorNeto"
                            value={formatCurrency(editingItem.valorNeto)}
                            onChange={handleEditChange}
                            type="text"
                            disabled
                            darkMode={isDarkMode}
                        />
                    </div>
                    <div className="mt-6 flex justify-center space-x-4">
                        <Button
                            title="Cancelar"
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditingItem(null);
                            }}
                        />
                        <Button
                            title="Guardar"
                            onClick={handleEditSave}
                        />
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default PurchaseDetailsTable;
