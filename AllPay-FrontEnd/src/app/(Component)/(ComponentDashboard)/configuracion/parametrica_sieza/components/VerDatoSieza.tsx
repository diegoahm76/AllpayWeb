'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import CrearDatosSieza from './CrearDatosSieza';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import useSiezaData from '../hooks/useSiezaData';
import useDeleteSiezaData from '../hooks/useDeleteSiezaData';
import EditarDatosSieza from './EditarDatosSieza';
import { IconButton } from '@mui/material';
import { Edit } from '@mui/icons-material';


interface FormData {
    nombre: string;
    descripcion: string;
    activo: boolean;
}

const VerDatoSieza: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemToDelete, setItemToDelete] = useState<any>(null);
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

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;

    // Hook para obtener datos de SIEZA
    const { siezaData, isLoading, error, fetchSiezaData, clearData } = useSiezaData();
    
    // Hook para eliminar datos de SIEZA
    const { deleteSieza, isLoading: isDeleting, error: deleteError } = useDeleteSiezaData();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar datos al montar el componente
    useEffect(() => {
        if (token) {
            fetchSiezaData(token);
        }
    }, [token, fetchSiezaData]);

    // Mostrar error si hay alguno
    useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]);

    // Mostrar error de eliminación si hay alguno
    useEffect(() => {
        if (deleteError) {
            setErrorMessage(deleteError);
            setShowErrorAlert(true);
        }
    }, [deleteError]);

    // Función para manejar la eliminación
    const handleDelete = (item: any) => {
        setItemToDelete(item);
        setShowQuestionAlert(true);
    };

    // Función para confirmar la eliminación
    const handleDeleteConfirm = async () => {
        if (!itemToDelete || !token) return;

        try {
            await deleteSieza(token, itemToDelete.id);
            setSuccessMessage('Registro del sistema contable eliminado exitosamente');
            setShowSuccessAlert(true);
            
            // Recargar los datos después de eliminar
            clearData();
            if (token) {
                fetchSiezaData(token);
            }
        } catch (err: any) {
            console.error('Error al eliminar registro del sistema contable:', err);
            // El error ya se maneja en el hook
        } finally {
            setItemToDelete(null);
            setShowQuestionAlert(false);
        }
    };


    const columns = [
        {
            key: 'id',
            label: 'ID',
            render: (value: number) => value || '-'
        },
        {
            key: 'descripcion',
            label: 'Descripción',
            render: (value: string) => value || '-'
        },
        {
            key: 'auxiliar',
            label: 'Auxiliar',
            render: (value: string) => value || '-'
        },
        {
            key: 'compania',
            label: 'Compañía',
            render: (value: string) => value || '-'
        },
        {
            key: 'centro',
            label: 'Centro',
            render: (value: string) => value || '-'
        },
        {
            key: 'unidad',
            label: 'Unidad',
            render: (value: string | null) => value || '-'
        },
        {
            key: 'sucursal',
            label: 'Sucursal',
            render: (value: string) => value || '-'
        },
        {
            key: 'tipo_documento',
            label: 'Tipo Documento',
            render: (value: string) => value || '-'
        }
    ];


    const actions = useMemo(() => [
        {
            label: 'Editar',
            render: (row: any) => (
                <IconButton
                        onClick={() =>    {
                            setSelectedItem(row);
                            setShowModal(true);
                        }}
                        sx={{
                            color: isDarkMode ? '#fff' : '#4D750F',
                            '&:hover': {
                                backgroundColor: isDarkMode
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(77, 117, 15, 0.1)'
                            }
                        }}
                        disabled={isDeleting}
                    >
                        <Edit />
                    </IconButton>
            )
        },
        {
            label: 'Eliminar',
            render: (row: any) => (
              
                <button
                onClick={() => handleDelete(row)}
                className={`p-1 rounded-full transition-colors ${
                    isDarkMode 
                        ? 'hover:bg-white/10' 
                        : 'hover:bg-gray-100'
                }`}
            >
                <img src="/images/icons/delete.png" className="w-5 h-5" alt="Eliminar" />
            </button>
            )
        }
    ], [isDarkMode, isDeleting]);


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
                onClose={() => {
                    setShowQuestionAlert(false);
                    setItemToDelete(null);
                }}
                questionText="¿Está seguro que desea eliminar este registro del sistema contable?"
                onConfirm={handleDeleteConfirm}
                answerAfirmative="Sí, eliminar"
                answerNegative="Cancelar"
            />
            
            <AlertLoader
                isOpen={isLoading || isDeleting}
                loadingText={isDeleting ? "Eliminando registro del sistema contable, por favor espere..." : "Cargando datos del sistema contable, por favor espere..."}
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
                                    className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-[#562707]'
                                    }`}
                                >
                                    PARAMETRICA CUENTAS CONTABLES
                                </h3>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={siezaData}
                                    currentPage={1}
                                    totalPages={1}
                                    onPageChange={() => {}}
                                    actions={actions}
                                    isLoading={isLoading || isDeleting}
                                    downloadButtonPosition="top"
                                    fetchAllData={() => Promise.resolve({ data: siezaData, total_pages: 1 })}
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
                        Editar Datos Sistema Contable
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
                        <Button onClick={() => {}} title="Guardar" />
                    </div>
                </div>
            </ModalContainer>

            <CrearDatosSieza
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    // Recargar los datos después de crear el sistema contable
                    clearData();
                    if (token) {
                        fetchSiezaData(token);
                    }
                }}
                token={token}
            />

            <EditarDatosSieza
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedItem(null);
                }}
                token={token}
                onSuccess={() => {
                    // Recargar los datos después de actualizar
                    clearData();
                    if (token) {
                        fetchSiezaData(token);
                    }
                }}
                itemToEdit={selectedItem}
            />

        </div>
    );
};

export default VerDatoSieza;
