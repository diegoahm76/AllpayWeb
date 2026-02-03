'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRouter } from 'next/navigation';
import { usePercentage } from '../hooks/usePercentage';
import CreatePercentage from './createPercentage';
import EditPercentage from './editPercentage';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { HistoryPercentage } from './historyPercentage';
import ModalContainer from '@/presenters/components/ui/ModalContainer';

interface PercentageData {
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    valor: string;
    fecha_actualizacion: string;
    id_persona_actualiza: number;
}

const PercentageTable: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPercentage, setSelectedPercentage] = useState<PercentageData | null>(null);
    const [tableData, setTableData] = useState<PercentageData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedCodeForHistory, setSelectedCodeForHistory] = useState<string | null>(null);

    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });
    const token = (session as any)?.user?.tokens?.access;

    const { loading, error, data, refetch } = usePercentage(token);

    useEffect(() => {
        if (data?.data) setTableData(Array.isArray(data.data) ? data.data : []);
    }, [data]);

    /** 2️⃣  Cerrar ⇒ des‑montar el componente para reiniciar su estado  */
    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedPercentage(null);
    };

    const handleEdit = (row: PercentageData) => {
        setSelectedPercentage(row);
        setShowEditModal(true);
    };

    const handleViewHistory = (row: PercentageData) => {
        setSelectedCodeForHistory(row.cod_tipo_cobro);
        setShowHistoryModal(true);
    };

    const closeHistoryModal = () => {
        setShowHistoryModal(false);
        setSelectedCodeForHistory(null);
    };

    const handleUpdateSuccess = (updated: PercentageData) => {
        setTableData((prev) =>
            prev.map((it) =>
                it.id_porcentaje_cobro === updated.id_porcentaje_cobro ? updated : it
            )
        );
        closeEditModal();
        refetch();
    };

    const fetchAllData = async () => {
        try {
            await refetch();
            const responseData = data?.data || [];
            return {
                data: Array.isArray(responseData) ? responseData : [],
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    const columns = [
        { key: 'cod_tipo_cobro', label: 'Código' },
        { key: 'cod_tipo_cobro_display', label: 'Tipo de Cobro' },
        { key: 'valor', label: 'Valor', render: (v: string) => (parseFloat(v)).toFixed(2) + '%' },
        {
            key: 'ultima_fecha_actualizacion',
            label: 'Fecha de Actualización',
            render: (v: string) =>
                new Date(v).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, row: PercentageData) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 hover:bg-[rgb(var(--green))]/10 rounded-full transition-colors"
                        title="Editar porcentaje"
                    >
                        <Image
                            src="/images/icons/update.png"
                            alt="Editar"
                            width={24}
                            height={24}
                        />
                    </button>
                    <button
                        onClick={() => handleViewHistory(row)}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                        title="Ver historial"
                    >
                        <Image
                            src="/images/icons/descarga.png"
                            alt="Ver historial"
                            width={24}
                            height={24}
                        />
                    </button>
                </div>
            ),
        },
    ];

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
            <div
                className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
                    }`}
            >
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                        <button
                    onClick={() => router.push('/')}
                    className="absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                >
                    &times; 
                </button>
                    <h3
                        className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-6 mt-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                            }`}
                    >
                        CUOTAS DE PORCENTAJE
                    </h3>

                    <DynamicTable
                        columns={columns}
                        data={tableData}
                        currentPage={currentPage}
                        totalPages={1}
                        onPageChange={setCurrentPage}
                        fetchAllData={fetchAllData}
                    />

                    <div className="flex mt-6 justify-center gap-4">
                        <Button onClick={() => setShowCreateModal(true)} title="Crear" />
                        <Button onClick={() => router.push('/')} title="Salir" />
                    </div>
                </div>
            </div>

            <CreatePercentage
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                token={token}
                onSuccess={() => {
                    setShowCreateModal(false);
                    refetch();
                }}
            />

            {selectedPercentage && (
                <EditPercentage
                    key={selectedPercentage.id_porcentaje_cobro}
                    isOpen={showEditModal}
                    onClose={closeEditModal}
                    token={token}
                    percentage={selectedPercentage}
                    onSuccess={handleUpdateSuccess}
                />
            )}

            {showHistoryModal && selectedCodeForHistory && (
                <ModalContainer
                    isOpen={showHistoryModal}
                    onClose={closeHistoryModal}       
                    size="4xl"           
                >
                    <HistoryPercentage codTipoCobro={selectedCodeForHistory} />
                </ModalContainer>
            )}

  
        </div>
    );
};

export default PercentageTable;
