'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useDepartamentoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/departamento_produccion_cacao/hooks/useDepartamentoProduccionCacao';
import { useTheme } from 'next-themes';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import CrearRegistroProduccionModal from './CrearRegistroProduccionModal';
import EditarRegistroProduccionModal from './EditarRegistroProduccionModal';
import { getDepartamentoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/departamento_produccion_cacao/adapters/getDepartamentoProduccionCacao';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { DepartamentoProduccionCacao } from '../models/departamentoProduccionCacao.model';
import Image from 'next/image';

function departamentoProduccionCacaoTabla() {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });

    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [yearFilter, ] = useState<string>('');
    const [departmentFilter, ] = useState<string>('');
    const router = useRouter();

    // Estados para los modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRegistro, setSelectedRegistro] = useState<DepartamentoProduccionCacao | null>(null);

    // Estados para alertas personalizadas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const { data, loading, initialLoading, error, totalPages, refetch } = useDepartamentoProduccionCacao(token || '', {
        page: currentPage,
        page_size: itemsPerPage
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Función helper para mostrar alertas de error
    const showError = (message: string) => {
        setAlertMessage(message);
        setShowErrorAlert(true);
    };

    // Función para manejar la edición de un registro
    const handleEdit = (registro: DepartamentoProduccionCacao, index: number) => {
        // Si el registro no tiene ID, generar uno temporal basado en índice global
        if (!registro.id) {
            // Crear una copia del registro para no mutar el original
            const registroConId = {
                ...registro,
                id: index + 1 + (currentPage - 1) * itemsPerPage
            };
            console.warn('[handleEdit] - Registro sin ID del backend, usando ID temporal:', registroConId.id);
            console.warn('[handleEdit] - Datos del registro:', {
                departamento: registro.nombre_departamento,
                ano: registro.ano,
                produccion: registro.produccion,
                index: index,
                currentPage: currentPage,
                itemsPerPage: itemsPerPage
            });
            setSelectedRegistro(registroConId);
        } else {
            setSelectedRegistro(registro);
        }
        setIsEditModalOpen(true);
    };

    // Filtrar datos por año y departamento si se especifica un filtro
    const filteredData = data.filter(item => {
        const matchesYear = yearFilter ? item.ano.toString().includes(yearFilter) : true;
        const matchesDepartment = departmentFilter ? 
            item.nombre_departamento.toLowerCase().includes(departmentFilter.toLowerCase()) ||
            item.codigo_departamento.includes(departmentFilter) : true;
        return matchesYear && matchesDepartment;
    });

    const columns = [
        { key: 'nombre_departamento', label: 'Departamento' },
        { key: 'ano', label: 'Año' },
        { 
            key: 'produccion', 
            label: 'Producción',
            render: (value: number) => `${value.toLocaleString('es-CO')}`
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, registro: DepartamentoProduccionCacao) => {
                const index = filteredData.findIndex(item => 
                    item.codigo_departamento === registro.codigo_departamento && 
                    item.ano === registro.ano
                );
                return (
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => handleEdit(registro, index)}
                            className={`p-2 transition-colors ${
                                isDarkMode 
                                    ? 'text-blue-400 hover:text-blue-300' 
                                    : 'text-blue-600 hover:text-blue-800'
                            }`}
                            title="Editar registro"
                        >
                            <Image
                                src="/images/icons/update.png"
                                alt="Editar"
                                width={20}
                                height={20}
                            />
                        </button>
                    </div>
                );
            }
        }
    ];

    const fetchAllData = async () => {
        try {
            const response = await getDepartamentoProduccionCacao(token || '');
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
                    <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center ${
                        isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'
                    }`}>HISTÓRICO DE PRODUCCIÓN POR DEPARTAMENTO</h1>
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

            {/* Modal de Creación */}
            <CrearRegistroProduccionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    refetch();
                }}
            />

            {/* Modal de Edición */}
            <EditarRegistroProduccionModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedRegistro(null);
                }}
                onSuccess={() => {
                    refetch();
                }}
                registro={selectedRegistro}
            />

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

export default departamentoProduccionCacaoTabla;
