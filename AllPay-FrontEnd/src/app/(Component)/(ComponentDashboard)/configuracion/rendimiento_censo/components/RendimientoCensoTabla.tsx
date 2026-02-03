'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRendimientoCenso } from '../hooks/useRendimientoCenso';
import { useTheme } from 'next-themes';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import EditarRendimientoCensoModal from './EditarRendimientoCensoModal';
import { getRendimientoCenso } from '../adapters/rendimientoCenso.adapter';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { RendimientoCenso } from '../models/rendimientoCenso.model';
import Image from 'next/image';

function RendimientoCensoTabla() {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });

    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    // const [yearFilter, ] = useState<string>(''); // No se usa para rendimiento censo
    const [departmentFilter, ] = useState<string>('');
    const router = useRouter();

    // Estados para los modales
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRegistro, setSelectedRegistro] = useState<RendimientoCenso | null>(null);

    // Estados para alertas personalizadas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const { data, loading, initialLoading, error, totalPages, refetch } = useRendimientoCenso(token || '', {
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
    const handleEdit = (registro: RendimientoCenso, _index: number) => {
        setSelectedRegistro(registro);
        setIsEditModalOpen(true);
    };

    // Filtrar datos por departamento si se especifica un filtro
    const filteredData = data.filter(item => {
        const matchesDepartment = departmentFilter ? 
            item.nombre_departamento.toLowerCase().includes(departmentFilter.toLowerCase()) ||
            item.codigo_departamento.includes(departmentFilter) : true;
        return matchesDepartment;
    });

    const columns = [
        { key: 'nombre_departamento', label: 'Departamento' },
        { 
            key: 'rendimiento_censo', 
            label: 'Rendimiento Censo',
            render: (value: string) => `${parseFloat(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`
        },
        {
            key: 'fecha_actualizacion',
            label: 'Fecha Actualización',
            render: (value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString('es-CO');
            }
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, registro: RendimientoCenso) => {
                const index = filteredData.findIndex(item => 
                    item.codigo_departamento === registro.codigo_departamento
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
            const response = await getRendimientoCenso(token || '');
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
                    }`}>RENDIMIENTO CENSO</h1>
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
                        <Button onClick={() => router.push('/')} title="Salir" />
                    </div>
                </div>
            </div>

            {/* Modal de Edición */}
            <EditarRendimientoCensoModal
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

export default RendimientoCensoTabla;
