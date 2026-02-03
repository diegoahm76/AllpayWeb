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
import CrearMunicipioModal from './CrearMunicipio';
import EditarMunicipioModal from './EditarMunicipioModal';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import useGetMunicipios from '../hooks/useGetMunicipios';
import useDeleteMunicipio from '../hooks/useDeleteMunicipio';
import { Municipio } from '../models/municipio.types';
import { IconButton } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { getMunicipios } from '../adapters/municipio.get';


interface FormData {
    nombre: string;
    descripcion: string;
    activo: boolean;
}

const Port: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [itemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMunicipio, setSelectedMunicipio] = useState<Municipio | null>(null);
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
    const [questionData, setQuestionData] = useState<{message: string; callback: () => Promise<void>}>({ 
        message: '', 
        callback: async () => {} 
    });
    const [showLoaderAlert] = useState(false);
    const [loaderMessage] = useState('');

    // Hook para obtener municipios con paginación
    const { municipios, pagination, isLoading, fetchMunicipios } = useGetMunicipios();
    
    // Hook para eliminar municipios
    const { isLoading: isDeleting, removeMunicipio } = useDeleteMunicipio();

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Cargar municipios al montar el componente
    useEffect(() => {
        if (token) {
            fetchMunicipios(token, { page: currentPage, page_size: itemsPerPage });
        }
    }, [token, fetchMunicipios, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Recargar datos con la nueva página
        if (token) {
            fetchMunicipios(token, { page, page_size: itemsPerPage });
        }
    };

    const handleEditMunicipio = (municipio: Municipio) => {
        setSelectedMunicipio(municipio);
        setShowEditModal(true);
    };

    const handleEditSuccess = () => {
        // Recargar datos después de editar
        if (token) {
            fetchMunicipios(token, { page: currentPage, page_size: itemsPerPage });
        }
    };

    const handleDeleteMunicipio = async (municipio: Municipio) => {
        setQuestionData({
            message: `¿Desea eliminar el municipio "${municipio.nombre}"?`,
            callback: async () => {
                try {
                    await removeMunicipio(token, municipio.cod_municipio);
                    
                    // Mostrar mensaje de éxito
                    setSuccessMessage('El municipio ha sido eliminado correctamente.');
                    setShowSuccessAlert(true);
                    
                    // Recargar datos después de eliminar
                    if (token) {
                        fetchMunicipios(token, { page: currentPage, page_size: itemsPerPage });
                    }
                } catch (error) {
                    // Mostrar mensaje de error
                    setErrorMessage('No se pudo eliminar el municipio.');
                    setShowErrorAlert(true);
                }
            }
        });
        setShowQuestionAlert(true);
    };

    const columns = [
        {
            key: 'cod_municipio',
            label: 'Código municipio',
            render: (value: string) => value || '-'
        },
        {
            key: 'nombre',
            label: 'Nombre de municipio',
            render: (value: string) => value || '-'
        },
        {
            key: 'cod_departamento',
            label: 'Código departamento',
            render: (value: string) => value || '-'
        },
        {
            key: 'nombre_departamento',
            label: 'Nombre de departamento',
            render: (value: string) => value || '-'
        },
        {
            key: 'es_cacaotero',
            label: 'Cacaotero',
            render: (value: boolean) => value ? 'Sí' : 'No'
        }
    ];

    const actions = useMemo(() => [
        {
            label: 'Acciones',
            render: (row: Municipio) => (
                <div className="flex gap-2">
                    <IconButton
                        onClick={() => handleEditMunicipio(row)}
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

                    <button
                        onClick={() => handleDeleteMunicipio(row)}
                        className={`p-1 rounded-full transition-colors ${
                            isDarkMode 
                                ? 'hover:bg-white/10' 
                                : 'hover:bg-gray-100'
                        }`}
                    >
                        <img src="/images/icons/delete.png" className="w-5 h-5" alt="Eliminar" />
                    </button>
                   
                </div>
            )
        }
    ], [isDarkMode, isDeleting]);

    // Función para obtener todos los municipios sin paginación para Excel
    const fetchDataForExcel = useMemo(() => {
        return async () => {
            if (!token) {
                throw new Error('No hay token disponible');
            }
            const response = await getMunicipios(token, { sin_paginacion: true });
            return {
                data: response.data || [],
                total_pages: response.total_pages || 1
            };
        };
    }, [token]);

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
                answerAfirmative="Sí, eliminar"
                answerNegative="Cancelar"
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
                                    PARAMETRICA DE MUNICIPIOS
                                </h3>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={municipios}
                                    currentPage={pagination.currentPage}
                                    totalPages={pagination.totalPages}
                                    onPageChange={handlePageChange}
                                    actions={actions}
                                    isLoading={isLoading}
                                    downloadButtonPosition="top"
                                    darkMode={isDarkMode}
                                    fetchDataForExcel={fetchDataForExcel}
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
                        Editar Municipio
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

            <CrearMunicipioModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    // Recargar datos después de crear
                    if (token) {
                        fetchMunicipios(token, { page: currentPage, page_size: itemsPerPage });
                    }
                }}
                token={token}
            />

            <EditarMunicipioModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                municipio={selectedMunicipio}
                token={token}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default Port;
