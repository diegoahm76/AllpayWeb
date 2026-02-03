'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useHistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/hooks/useHistoricoProduccionCacao';
import { useProduccionCacaoUpdate } from '@/app/(Component)/(ComponentDashboard)/estadisticas/produccion_nacional_cacao/hooks/useProduccionCacaoUpdate';
import { useTheme } from 'next-themes';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { getHistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/adapters/getHistoricoProduccionCacao';
import CreateRegistroHistorico from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/components/crearRegistroHistorico';
import EditRegistroHistorico from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/components/editarRegistroHistorico';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { HistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/historicoProduccionCacao.model';

function historicoProduccionCacaoTabla() {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });

    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedHistorico, setSelectedHistorico] = useState<HistoricoProduccionCacao | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, ] = useState(10);
    const [yearFilter, ] = useState<string>('');
    const router = useRouter();

    // Estados para edición inline
    const [editingCell, setEditingCell] = useState<{ rowId: number; column: string } | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');

    // Estados para alertas personalizadas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const { data, loading, initialLoading, error, totalPages, refetch } = useHistoricoProduccionCacao(token || '', {
        page: currentPage,
        page_size: itemsPerPage
    });

    const { updateProduccionCacao, isUpdating, updateError } = useProduccionCacaoUpdate();

    // Filtrar datos por año si se especifica un filtro
    const filteredData = yearFilter 
        ? data.filter(item => item.ano.toString().includes(yearFilter))
        : data;

    // Funciones helper para mostrar alertas
    const showError = (message: string) => {
        setAlertMessage(message);
        setShowErrorAlert(true);
    };

    const showSuccess = (message: string) => {
        setAlertMessage(message);
        setShowSuccessAlert(true);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Efecto para manejar errores del hook de actualización
    useEffect(() => {
        if (updateError) {
            showError(updateError);
        }
    }, [updateError]);


    // Función para iniciar la edición inline
    const handleCellDoubleClick = (rowId: number, column: string, currentValue: string | number | null) => {
        setEditingCell({ rowId, column });
        setEditingValue(currentValue?.toString() || '');
    };

    // Función para guardar la edición
    const handleSaveEdit = async () => {
        if (!editingCell || !token) return;

        const { rowId, column } = editingCell;
        const numericValue = parseFloat(editingValue);

        // Validar que el valor sea un número válido
        if (isNaN(numericValue)) {
            showError('Por favor ingrese un valor numérico válido');
            return;
        }

        // Crear el payload dinámicamente
        const payload: any = {};
        payload[column] = numericValue;

        try {
            const result = await updateProduccionCacao(token, rowId, payload);
            
            if (result) {
                showSuccess('Registro actualizado correctamente');
                
                // Refrescar los datos
                refetch();
            }
        } catch (error) {
            showError('Error al actualizar el registro');
        } finally {
            // Limpiar el estado de edición
            setEditingCell(null);
            setEditingValue('');
        }
    };

    // Función para cancelar la edición
    const handleCancelEdit = () => {
        setEditingCell(null);
        setEditingValue('');
    };

    // Función para manejar el Enter y Escape
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    // Función para renderizar celdas editables
    const renderEditableCell = (value: string | number | null, row: HistoricoProduccionCacao, column: string) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.column === column;
        
        if (isEditing) {
            return (
                <input
                    type="number"
                    step="0.01"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className={`w-full px-2 py-1 border border-[rgb(var(--green))] rounded focus:outline-none focus:ring-2 focus:ring-[rgb(var(--green))] ${
                        isDarkMode 
                            ? 'bg-[#260f00] text-white border-white/30' 
                            : 'bg-white text-black'
                    }`}
                    autoFocus
                    disabled={isUpdating}
                />
            );
        }

        return (
            <div
                className={`cursor-pointer px-2 py-1 rounded transition-colors min-h-[32px] flex items-center ${
                    isDarkMode 
                        ? 'hover:bg-white/10 text-white' 
                        : 'hover:bg-gray-100'
                }`}
                onDoubleClick={() => handleCellDoubleClick(row.id, column, value)}
                title="Doble clic para editar"
            >
                {value || '-'}
            </div>
        );
    };

    const columns = [
        { key: 'ano', label: 'Año' },
        { 
            key: 'enero', 
            label: 'Enero',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'enero')
        },
        { 
            key: 'febrero', 
            label: 'Febrero',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'febrero')
        },
        { 
            key: 'marzo', 
            label: 'Marzo',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'marzo')
        },
        { 
            key: 'abril', 
            label: 'Abril',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'abril')
        },
        { 
            key: 'mayo', 
            label: 'Mayo',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'mayo')
        },
        { 
            key: 'junio', 
            label: 'Junio',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'junio')
        },
        { 
            key: 'julio', 
            label: 'Julio',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'julio')
        },
        { 
            key: 'agosto', 
            label: 'Agosto',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'agosto')
        },
        { 
            key: 'septiembre', 
            label: 'Septiembre',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'septiembre')
        },
        { 
            key: 'octubre', 
            label: 'Octubre',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'octubre')
        },
        { 
            key: 'noviembre', 
            label: 'Noviembre',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'noviembre')
        },
        { 
            key: 'diciembre', 
            label: 'Diciembre',
            render: (value: string | number | null, row: HistoricoProduccionCacao) => renderEditableCell(value, row, 'diciembre')
        },
        { key: 'pano', label: 'Total Año' },	

    ];

    const fetchAllData = async () => {
        try {
            const response = await getHistoricoProduccionCacao(token || '');
            return {
                data: response.data,
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            showError('Ocurrió un error al obtener los datos para exportar. Por favor, intente nuevamente.');
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    if (!mounted) return null;

    // Solo mostrar spinner de carga completa en la primera carga
    if (initialLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className={`animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 ${
                    isDarkMode ? 'border-white/30' : 'border-[rgb(var(--green))]'
                }`} />
            </div>
        );
    }

    // Solo mostrar error si es la primera carga y hay error
    if (error && data.length === 0) {
        return (
            <>
                <AlertError
                    isOpen={true}
                    message={error}
                    onClose={() => router.push('/')}
                />
            </>
        );
    }

    return (
        <div className="w-full max-w-full mx-auto">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
            <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${
                        isDarkMode 
                            ? 'text-white hover:text-red-400' 
                            : 'text-[rgb(var(--brown))] hover:text-red-700'
                    }`}
                >
                    &times; 
                </button>
                <div className="flex justify-center items-center mb-4 mt-[39px]">
                    <h1 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold ${
                        isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'
                    }`}>HISTORICO DE PRODUCCION DE CACAO</h1>
                </div>
                
                    <DynamicTable
                        columns={columns}
                        data={filteredData}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        fetchAllData={fetchAllData}
                        isLoading={loading}
                        darkMode={isDarkMode}
                    />

                    <div className="flex justify-center mt-6 gap-4">
                        <Button
                            title="Crear Registro"
                            onClick={() => setIsCreateModalOpen(true)}
                        />
                        <Button onClick={() => router.push('/')} title="Salir" />

                    </div>
                </div>
            </div>

            <CreateRegistroHistorico
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    refetch();
                    setIsCreateModalOpen(false);
                }}
            />

            {selectedHistorico && (
                <EditRegistroHistorico
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedHistorico(null);
                    }}
                    historico={selectedHistorico}
                    onSuccess={() => {
                        refetch();
                        setIsEditModalOpen(false);
                        setSelectedHistorico(null);
                    }}
                />
            )}

            {/* Alertas personalizadas */}
            <AlertError
                isOpen={showErrorAlert}
                message={alertMessage}
                onClose={() => setShowErrorAlert(false)}
            />

            <AlertSuccess
                isOpen={showSuccessAlert}
                message={alertMessage}
                onClose={() => setShowSuccessAlert(false)}
                autoCloseMs={3000}
            />
        </div>
    );
}

export default historicoProduccionCacaoTabla;
