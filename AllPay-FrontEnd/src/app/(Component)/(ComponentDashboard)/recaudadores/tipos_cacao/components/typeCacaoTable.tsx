'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useTypesCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/hooks/useTypesCacao';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import { getTypesCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/adapters/getTypesCacao';
import CreateTypeCacao from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/components/createTypeCacao';
import EditTypeCacao from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/components/editTypeCacao';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { TypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/typeCacao.model';
import Image from 'next/image';
import { useDeleteTypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/hooks/useDeleteTypeCacao';
import { formatCurrency } from '@/utils/formatters';

function TypeCacaoTable() {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });

    const token = (session as any)?.user?.tokens?.access;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTypeCacao, setSelectedTypeCacao] = useState<TypeCacao | null>(null);
    const { deleteTypeCacaoById } = useDeleteTypeCacao();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const { types, loading, error, refetch } = useTypesCacao(token || '');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const router = useRouter();

    const handleDelete = async (id: number) => {
        try {
            await deleteTypeCacaoById(id);
            refetch();
        } catch {
            /* manejado en el hook */
        }
    };

    const columns = [
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Activo', render: (value: boolean) => value ? 'Sí' : 'No' },
        { key: 'item_ya_usado', label: 'Usado', render: (value: boolean) => value ? 'Sí' : 'No' },
        { key: 'valor_minimo', label: 'Valor mínimo de referencia', render: (value: number) => formatCurrency(value) },	
        { key: 'valor_maximo', label: 'Valor máximo de referencia', render: (value: number) => formatCurrency(value) },	
        { key: 'fecha_creacion', label: 'Fecha Creación', render: (value: string) => value.split('T')[0] },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, row: TypeCacao) => (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => {                  
                            setSelectedTypeCacao(row);
                            setIsEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-[rgb(var(--green))]/10 rounded-full transition-colors"
                    >
                        <Image
                            src="/images/icons/update.png"
                            alt="Editar"
                            width={24}
                            height={24}
                        />
                    </button>
                    <button
                        onClick={() => {
                            Swal.fire({
                                title: '¿Estás seguro?',
                                text: "Esta acción no se puede deshacer",
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: 'rgb(var(--green))',
                                confirmButtonText: 'Sí, eliminar',
                                cancelButtonColor: 'rgb(var(--green))',
                                cancelButtonText: 'Cancelar'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    handleDelete(row.id_tipo_cacao);
                                }
                            });
                        }}
                        className="p-2 hover:bg-[rgb(var(--green))]/10 rounded-full transition-colors"
                        disabled={row.item_ya_usado}
                    >
                        <Image
                            src="/images/icons/delete.png"
                            alt="Eliminar"
                            width={24}
                            height={24}
                        />
                    </button>
                </div>
            )
        }
    ];

    const totalPages = Math.ceil(types.length / itemsPerPage);
    const paginatedData = types.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const fetchAllData = async () => {
        try {
            const response = await getTypesCacao(token || '');
            const formattedData = response.data.map(item => ({
                ...item,
                fecha_creacion: item.fecha_creacion.split('T')[0]
            }));
            return {
                data: formattedData,
                total_pages: Math.ceil(response.data.length / itemsPerPage)
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            Swal.fire({
                title: 'Error',
                text: 'Ocurrió un error al obtener los datos para exportar. Por favor, intente nuevamente.',
                icon: 'error',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#4D750F'
            });
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    if (loading)
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
            </div>
        );

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error,
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            router.push('/');
        });
        return null;
    }

    return (
        <div className="w-full max-w-full mx-auto">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
            <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                >
                    &times; 
                </button>
                    <div className="flex justify-center items-center mb-4 mt-[39px]">
                        <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>TIPOS DE CACAO</h1>
                    </div>
                    <DynamicTable
                        columns={columns}
                        data={paginatedData}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        fetchAllData={fetchAllData}
                        isLoading={loading}
                        darkMode={isDarkMode}
                    />

                    <div className="flex justify-center mt-6 gap-4">
                        <Button
                            title="Crear Tipo de Cacao"
                            onClick={() => setIsCreateModalOpen(true)}
                        />
                        <Button onClick={() => router.push('/')} title="Salir" />

                    </div>
                </div>
            </div>

            <CreateTypeCacao
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    refetch();
                    setIsCreateModalOpen(false);
                }}
            />

            {selectedTypeCacao && (
                <EditTypeCacao
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedTypeCacao(null);
                    }}
                    typeCacao={selectedTypeCacao}
                    onSuccess={() => {
                        refetch();
                        setIsEditModalOpen(false);
                        setSelectedTypeCacao(null);
                    }}
                />
            )}
        </div>
    );
}

export default TypeCacaoTable;
