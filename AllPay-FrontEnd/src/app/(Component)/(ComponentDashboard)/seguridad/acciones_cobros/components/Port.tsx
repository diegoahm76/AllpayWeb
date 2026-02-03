'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { getAccionesCobroPersuasivo } from '../adapters/accionesCobroPersuasivo.adapter';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import CreatePortModal from './CreatePortModal';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { AccionCobroPersuasivo } from '../models/accionesCobroPersuasivo.model';
import { useUpdateAccionCobroPersuasivo } from '../hooks/useUpdateAccionCobroPersuasivo';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface FormData {
    nombre: string;
    descripcion: string;
    tipo_cobro: string;
    activo: boolean;
}

const Port: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [itemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [allData, setAllData] = useState<AccionCobroPersuasivo[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAccion, setSelectedAccion] = useState<AccionCobroPersuasivo | null>(null);
    const [formData, setFormData] = useState<FormData>({
        nombre: '',
        descripcion: '',
        tipo_cobro: '',
        activo: true
    });

    // Opciones para el select de tipo de cobro
    const tipoCobroOptions = [
        { key: '1', value: 'PERSUASIVO', title: 'PERSUASIVO' },
        { key: '2', value: 'COACTIVO', title: 'COACTIVO' }
    ];

    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showQuestionAlert, setShowQuestionAlert] = useState(false);
    const [questionData, setQuestionData] = useState<{message: string; callback: () => Promise<void>}>({ message: '', callback: async () => {} });
    const [showLoaderAlert, setShowLoaderAlert] = useState(false);
    const [loaderMessage, setLoaderMessage] = useState('');

    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;

    // Hook para actualizar acciones
    const { 
        loading: updateLoading, 
        update: updateAccion, 
        clearError: clearUpdateError 
    } = useUpdateAccionCobroPersuasivo();

    const fetchAccionesData = async () => {
        try {
            setIsLoading(true);
            const response = await getAccionesCobroPersuasivo(token);
            
            if (response.success && Array.isArray(response.data)) {
                const processedData = response.data.map((accion: AccionCobroPersuasivo) => ({
                    ...accion,
                    activo: Boolean(accion.activo)
                }));
                
                setAllData(processedData);
                const total = Math.ceil(processedData.length / itemsPerPage);
                
                const validCurrentPage = Math.min(currentPage, total || 1);
                if (validCurrentPage !== currentPage) {
                    setCurrentPage(validCurrentPage);
                }
            } else {
                console.error('Formato de respuesta inesperado:', response);
                setAllData([]);
                setCurrentPage(1);
            }
        } catch (error: any) {
            console.error('Error al obtener datos:', error);
            
            // Verificar si es un error de "no se encontraron registros" (404 o mensaje específico)
            const errorMessage = error?.response?.data?.detail || error?.detail || error?.message || '';
            const isNoRecordsFound = 
                errorMessage.toLowerCase().includes('no se encontraron registros') ||
                errorMessage.toLowerCase().includes('no se encontraron') ||
                errorMessage.toLowerCase().includes('no records found') ||
                errorMessage.includes('404') ||
                !error.response; // También considerar errores de red

            if (isNoRecordsFound) {
                // Para el caso de "no registros", limpiar datos sin mostrar error
                setAllData([]);
                setCurrentPage(1);
                
                // Quitar el focus de cualquier input activo
                if (document.activeElement && document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            } else {
                // Para otros errores, mostrar la alerta
                setAllData([]);
                setCurrentPage(1);
                setErrorMessage(error.message || 'Error al obtener las acciones de cobro persuasivo');
                setShowErrorAlert(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const getCurrentPageData = (data: AccionCobroPersuasivo[], page: number) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const accionesForTable = useMemo(() => {
        return allData.map(accion => {
            const fecha = new Date(accion.fecha_creacion);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });

            return {
                ...accion,
                fecha_formateada: fechaFormateada
            };
        });
    }, [allData]);

    const handleEdit = (row: AccionCobroPersuasivo) => {
        setSelectedAccion(row);
        setFormData({
            nombre: row.nombre,
            descripcion: row.descripcion,
            tipo_cobro: row.tipo_cobro,
            activo: row.activo
        });
        setShowModal(true);
    };

    const handleDelete = async (row: AccionCobroPersuasivo) => {
        try {
            if (row.item_ya_usado) {
                setErrorMessage('No se puede eliminar una acción que ya está en uso.');
                setShowErrorAlert(true);
                return;
            }

            setQuestionData({
                message: `¿Deseas eliminar la acción "${row.nombre}"?`,
                callback: async () => {
                    // Aquí irá la función de eliminar cuando esté implementada
                    setSuccessMessage('Acción eliminada correctamente');
                    setShowSuccessAlert(true);
                }
            });
            setShowQuestionAlert(true);
        } catch (error: any) {
            console.error('Error al eliminar:', error);
            setErrorMessage(error.message || 'Error al eliminar la acción');
            setShowErrorAlert(true);
        }
    };

    const handleSave = async () => {
        try {
            if (!selectedAccion) {
                setErrorMessage('No hay acción seleccionada para actualizar');
                setShowErrorAlert(true);
                return;
            }

            // Validar formulario
            if (!formData.nombre || formData.nombre.trim() === '') {
                setErrorMessage('El nombre es requerido');
                setShowErrorAlert(true);
                return;
            }

            if (!formData.descripcion || formData.descripcion.trim() === '') {
                setErrorMessage('La descripción es requerida');
                setShowErrorAlert(true);
                return;
            }

            if (!formData.tipo_cobro || formData.tipo_cobro.trim() === '') {
                setErrorMessage('El tipo de cobro es requerido');
                setShowErrorAlert(true);
                return;
            }

            setLoaderMessage('Actualizando acción de cobro persuasivo...');
            setShowLoaderAlert(true);

            const response = await updateAccion(selectedAccion.id_accion_cobro_persuasivo, {
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                tipo_cobro: formData.tipo_cobro,
                activo: formData.activo
            });

            if (response.success) {
                setSuccessMessage('Acción actualizada correctamente');
                setShowSuccessAlert(true);
                setShowModal(false);
                fetchAccionesData(); // Recargar datos
            }

        } catch (error: any) {
            console.error('Error al actualizar:', error);
            setErrorMessage(error.message || 'Error al actualizar la acción');
            setShowErrorAlert(true);
        } finally {
            setShowLoaderAlert(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedAccion(null);
        setFormData({
            nombre: '',
            descripcion: '',
            tipo_cobro: '',
            activo: true
        });
        clearUpdateError();
    };

    const fetchAllData = async (page: number) => {
        try {
            if (page === 0) {
                return {
                    data: accionesForTable.map(accion => ({
                        'ID': accion.id_accion_cobro_persuasivo,
                        'Nombre': accion.nombre || '',
                        'Descripción': accion.descripcion || '',
                        'Tipo de Cobro': accion.tipo_cobro || '',
                        'Estado': accion.activo ? 'Activo' : 'Inactivo',
                        'Creado por': accion.persona_crea_nombre || '',
                        'Fecha de Creación': accion.fecha_formateada,
                        'En Uso': accion.item_ya_usado ? 'Sí' : 'No'
                    })),
                    total_pages: 1
                };
            }
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageData = accionesForTable.slice(startIndex, endIndex);
            
            return {
                data: pageData,
                total_pages: Math.ceil(accionesForTable.length / itemsPerPage)
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            setErrorMessage('Error al generar el archivo Excel');
            setShowErrorAlert(true);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Solo ejecutar cuando el componente esté montado, la sesión esté autenticada y el token esté disponible
        if (mounted && status === 'authenticated' && token) {
            fetchAccionesData();
        }
    }, [mounted, status, token]);

    const columns = [
        {
            key: 'nombre',
            label: 'Nombre',
            render: (value: string) => value || '-'
        },
        {
            key: 'descripcion',
            label: 'Descripción',
            render: (value: string) => value || '-'
        },
        {
            key: 'tipo_cobro',
            label: 'Tipo de Cobro',
            render: (value: string) => value || '-'
        },
        {
            key: 'activo',
            label: 'Estado',
            render: (value: boolean) => (
                <span className={value ? 'text-black-600' : 'text-black-600'}>
                    {value ? 'Activo' : 'Inactivo'}
                </span>
            )
        }
    ];

    const isDarkMode = mounted && theme === 'dark';

    const actions = [
        {
            label: 'Editar',
            render: (row: AccionCobroPersuasivo) => (
                <button onClick={() => handleEdit(row)}>
                    <img
                        src="https://i.postimg.cc/hPVKjZ05/Grupo-1126.png"
                        alt="Editar"
                        className="h-6 w-6"
                    />
                </button>
            )
        },
        {
            label: 'Eliminar',
            render: (row: AccionCobroPersuasivo) => (
                <div className="relative group">
                    <button 
                        onClick={() => handleDelete(row)}
                        className={`p-2 rounded-full transition-colors ${
                            row.item_ya_usado 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-[rgb(var(--green))]/10'
                        }`}
                        disabled={row.item_ya_usado}
                        title={
                            row.item_ya_usado 
                            ? "No se puede eliminar una acción en uso" 
                            : "Eliminar acción"
                        }
                    >
                        <img
                            src="/images/icons/delete.png"
                            alt="Eliminar"
                            className="h-6 w-6"
                        />
                    </button>
                    {row.item_ya_usado && (
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                            No se puede eliminar una acción en uso
                        </div>
                    )}
                </div>
            )
        }
    ];

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full">
            <AlertError 
                isOpen={showErrorAlert} 
                onClose={() => setShowErrorAlert(false)} 
                message={errorMessage} 
            />
            
            <AlertSuccess 
                isOpen={showSuccessAlert} 
                onClose={() => setShowSuccessAlert(false)} 
                message={successMessage} 
            />
            
            <AlertQuestion
                isOpen={showQuestionAlert}
                onClose={() => setShowQuestionAlert(false)}
                questionText={questionData.message}
                onConfirm={() => {
                    setShowQuestionAlert(false);
                    questionData.callback();
                }}
            />
            
            <AlertLoader
                isOpen={showLoaderAlert}
                loadingText={loaderMessage}
            />
            
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center  text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    ACCIONES DE COBROS
                                </h3>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={getCurrentPageData(accionesForTable, currentPage)}
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(accionesForTable.length / itemsPerPage)}
                                    onPageChange={handlePageChange}
                                    actions={actions}
                                    isLoading={isLoading}
                                    fetchAllData={fetchAllData}
                                    downloadButtonPosition="top"
                                />
                            </div>

                            <div className="flex flex-wrap justify-center gap-2 mt-6">
                                <Button onClick={() => setShowCreateModal(true)} title="Crear" />
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ModalContainer isOpen={showModal} onClose={handleCloseModal}>
                <div className="space-y-4 p-2 sm:p-4">
                    <h3 className={`mb-4 text-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Editar Acción de Cobro Persuasivo
                    </h3>
                    <AnimatedInput
                        label="Nombre"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        disabled={updateLoading}
                        required
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Descripción"
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        disabled={updateLoading}
                        required
                        darkMode={isDarkMode}
                    />
                    <AnimatedSelect
                        label="Tipo de Cobro"
                        name="tipo_cobro"
                        value={formData.tipo_cobro}
                        onChange={(e) => setFormData({ ...formData, tipo_cobro: e.target.value })}
                        disabled={updateLoading}
                        options={tipoCobroOptions}
                        darkMode={isDarkMode}
                    />
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="activo"
                            checked={formData.activo}
                            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                            className="form-checkbox h-5 w-5 text-[#4D750F]"
                            disabled={updateLoading}
                        />
                        <label htmlFor="activo" className={`${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Activo</label>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        <Button 
                            onClick={handleSave} 
                            title="Guardar" 
                            disabled={updateLoading}
                        />
                        <Button 
                            onClick={handleCloseModal} 
                            title="Cancelar" 
                            disabled={updateLoading}
                        />
                    </div>
                </div>
            </ModalContainer>

            <CreatePortModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchAccionesData}
            />
        </div>
    );
};

export default Port;
