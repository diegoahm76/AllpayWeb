'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { getAllPuertosExportacion } from '../adapters/puerto.getAllType';
import { deletePuertoExportacion } from '../adapters/deletePuerto';
import { updatePuertoExportacion } from '../adapters/updatePuerto';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import CreatePortModal from './CreatePortModal';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { PuertoExportacion } from '../models/types';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface FormData {
    nombre: string;
    descripcion: string;
    activo: boolean;
}

const Port: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [itemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [allData, setAllData] = useState<PuertoExportacion[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPort, setSelectedPort] = useState<PuertoExportacion | null>(null);
    const [formData, setFormData] = useState<FormData>({
        nombre: '',
        descripcion: '',
        activo: true
    });

    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showQuestionAlert, setShowQuestionAlert] = useState(false);
    const [questionData, setQuestionData] = useState<{message: string; callback: () => Promise<void>}>({ message: '', callback: async () => {} });
    const [showLoaderAlert, setShowLoaderAlert] = useState(false);
    const [loaderMessage, setLoaderMessage] = useState('');

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;

    const fetchPortData = async () => {
        try {
            setIsLoading(true);
            const response = await getAllPuertosExportacion(token);
            
            if (response.success && Array.isArray(response.data)) {
                const processedData = response.data.map(puerto => ({
                    ...puerto,
                    activo: Boolean(puerto.activo)
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
            setAllData([]);
            setCurrentPage(1);
            setErrorMessage(error.message || 'Error al obtener los puertos de exportación');
            setShowErrorAlert(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const getCurrentPageData = (data: PuertoExportacion[], page: number) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const puertosForTable = useMemo(() => {
        return allData.map(puerto => {
            const fecha = new Date(puerto.fecha_creacion);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });

            return {
                ...puerto,
                fecha_formateada: fechaFormateada
            };
        });
    }, [allData]);

    const deletePort = async (id: number) => {
        try {
            setLoaderMessage('Eliminando...');
            setShowLoaderAlert(true);

            await deletePuertoExportacion(token, id);
            
            setShowLoaderAlert(false);
            
            setSuccessMessage('El puerto ha sido eliminado correctamente');
            setShowSuccessAlert(true);
            
            await fetchPortData();
        } catch (error: any) {
            setShowLoaderAlert(false);
            setErrorMessage(error.message || 'Error al eliminar el puerto');
            setShowErrorAlert(true);
        }
    };

    const handleDelete = async (row: PuertoExportacion) => {
        try {
            if (row.item_ya_usado) {
                setErrorMessage('No se puede eliminar un puerto que ya está en uso.');
                setShowErrorAlert(true);
                return;
            }

            setQuestionData({
                message: `¿Deseas eliminar el puerto "${row.nombre}"?`,
                callback: async () => {
                    await deletePort(row.id_puerto_exportacion);
                }
            });
            setShowQuestionAlert(true);
        } catch (error: any) {
            console.error('Error al eliminar:', error);
            setErrorMessage(error.message || 'Error al eliminar el puerto');
            setShowErrorAlert(true);
        }
    };

    const handleEdit = (row: PuertoExportacion) => {
        setSelectedPort(row);
        setFormData({
            nombre: row.nombre,
            descripcion: row.descripcion,
            activo: row.activo
        });
        setShowModal(true);
    };

    const handleUpdate = async () => {
        try {
            if (!selectedPort) return;

            if (!formData.descripcion || formData.descripcion.trim() === '') {
                
                setErrorMessage("Este campo no puede estar en blanco.");
                setShowErrorAlert(true);
                return;
            }

            await updatePuertoExportacion(
                token,
                selectedPort.id_puerto_exportacion,
                formData
            );

            setSuccessMessage('El puerto ha sido actualizado correctamente');
            setShowSuccessAlert(true);

            setShowModal(false);
            fetchPortData();
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.detail) {
                const errorDetail = error.response.data.detail;
                
                if (typeof errorDetail === 'object') {
                    let mensaje = '';
                    for (const errors of Object.values(errorDetail)) {
                        if (Array.isArray(errors) && errors.length > 0) {
                            mensaje = errors[0];
                            break;
                        }
                    }
                    
                    setErrorMessage(mensaje || 'Error al actualizar el puerto');
                } else {
                    setErrorMessage(error.message || 'Error al actualizar el puerto');
                }
            } else {
                setErrorMessage(error.message || 'Error al actualizar el puerto');
            }
            setShowErrorAlert(true);
        }
    };

    const fetchAllData = async (page: number) => {
        try {
            if (page === 0) {
                return {
                    data: puertosForTable.map(puerto => ({
                        'ID': puerto.id_puerto_exportacion,
                        'Nombre': puerto.nombre || '',
                        'Descripción': puerto.descripcion || '',
                        'Estado': puerto.activo ? 'Activo' : 'Inactivo',
                        'Fecha de Creación': puerto.fecha_formateada,
                        'En Uso': puerto.item_ya_usado ? 'Sí' : 'No'
                    })),
                    total_pages: 1
                };
            }
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageData = puertosForTable.slice(startIndex, endIndex);
            
            return {
                data: pageData,
                total_pages: Math.ceil(puertosForTable.length / itemsPerPage)
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

    const isDarkMode = mounted && theme === 'dark';

    useEffect(() => {
        if (token) {
            fetchPortData();
        }
    }, [token]);

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
            key: 'activo',
            label: 'Estado',
            render: (value: boolean) => (
                <span className={value ? 'text-black-600' : 'text-black-600'}>
                    {value ? 'Activo' : 'Inactivo'}
                </span>
            )
        }
    ];

    const actions = useMemo(() => [
        {
            label: 'Editar',
            render: (row: PuertoExportacion) => (
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
            render: (row: PuertoExportacion) => (
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
                            ? "No se puede eliminar un puerto en uso" 
                            : "Eliminar puerto"
                        }
                    >
                        <img
                            src="/images/icons/delete.png"
                            alt="Eliminar"
                            className="h-6 w-6"
                        />
                    </button>
                    {row.item_ya_usado && (
                        <div className={`absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs rounded whitespace-nowrap ${
                            isDarkMode 
                                ? 'bg-white/20 text-white border border-white/30' 
                                : 'bg-gray-900 text-white'
                        }`}>
                            No se puede eliminar un puerto en uso
                        </div>
                    )}
                </div>
            )
        }
    ], [isDarkMode]);

    if (!mounted) return null;

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
                        <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl ${
                                    isDarkMode 
                                        ? 'text-white hover:text-red-400' 
                                        : 'text-[rgb(var(--brown))] hover:text-red-700'
                                }`}
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center text-xl sm:text-3xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-[#562707]'
                                    }`}
                                >
                                    PUERTOS DE EXPORTACIÓN
                                </h3>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={getCurrentPageData(puertosForTable, currentPage)}
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(puertosForTable.length / itemsPerPage)}
                                    onPageChange={handlePageChange}
                                    actions={actions}
                                    isLoading={isLoading}
                                    fetchAllData={fetchAllData}
                                    downloadButtonPosition="top"
                                    darkMode={isDarkMode}
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

            <ModalContainer isOpen={showModal} onClose={() => setShowModal(false)}>
                <div className="space-y-4 p-2 sm:p-4">
                    <h3 className={`mb-4 text-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Editar Puerto de Exportación
                    </h3>
                    <AnimatedInput
                        label="Nombre"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Descripción"
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                        darkMode={isDarkMode}
                    />
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="activo"
                            checked={formData.activo}
                            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                            className="form-checkbox h-5 w-5 text-[#4D750F]"
                        />
                        <label htmlFor="activo" className={isDarkMode ? 'text-white' : 'text-gray-700'}>Activo</label>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        <Button onClick={() => setShowModal(false)} title="Cancelar" />
                        <Button onClick={handleUpdate} title="Guardar" />
                    </div>
                </div>
            </ModalContainer>

            <CreatePortModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchPortData}
            />
        </div>
    );
};

export default Port;
