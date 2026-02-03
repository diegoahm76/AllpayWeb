// components/DescargarPlantilla.tsx
'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRouter } from 'next/navigation';
import { useDate } from '../hooks/useDate';
import EditDate from './editDate';
import Image from 'next/image';
import CreateDate from './createDate';
import { usePazSalvoDate } from '../hooks/usePazSalvoDate';
import EditPazSalvoDate from './editPazSalvoDate';
import { PazSalvoDateData } from '../models/pazSalvoDate.model';
import EditFacturasPagadasDate from './editFacturasPagadasDate';
import { useFacturasPagadasDates } from '../hooks/useFacturasPagadasDates';

interface DateData {
    id_fecha_cierre: number;
    cod_tipo_cobro_fecha: string;
    cod_tipo_cobro_fecha_display: string;
    dias_registro_compra: number;
    dias_pago: number;
    dias_pago_interes: number;
    fecha_actualizacion: string;
}

const DateTable: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [currentPage, setCurrentPage] = useState(1);
    const [pazSalvoCurrentPage, setPazSalvoCurrentPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<DateData | null>(null);
    
    // Estado para Paz y Salvo
    const [isEditPazSalvoModalOpen, setIsEditPazSalvoModalOpen] = useState(false);
    const [selectedPazSalvoDate, setSelectedPazSalvoDate] = useState<PazSalvoDateData | null>(null);
    
    // Estado para Facturas Pagadas
    const [isEditFacturasPagadasModalOpen, setIsEditFacturasPagadasModalOpen] = useState(false);
    const [selectedFacturasPagadasDate, setSelectedFacturasPagadasDate] = useState<PazSalvoDateData | null>(null);

    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });

    const token = (session as any)?.user?.tokens?.access;
    
    // Hooks para obtener datos
    const { loading, data, refetch } = useDate(token);
    const { 
        loading: pazSalvoLoading, 
        // error: pazSalvoError, 
        data: pazSalvoData, 
        refetch: pazSalvoRefetch 
    } = usePazSalvoDate(token);
    
    // Hook para facturas pagadas
    const { 
        loading: facturasPagadasLoading, 
        // error: facturasPagadasError, 
        refetch: facturasPagadasRefetch 
    } = useFacturasPagadasDates(token);

    // Columnas para la tabla de Cuota de Fomento
    const columns = [
        {
            key: 'cod_tipo_cobro_fecha_display',
            label: 'Tipo de Cobro',
        },
        {
            key: 'dias_pago',
            label: 'Máximo Día de Pago',
        },
        {
            key: 'dias_pago_interes',
            label: 'Máximo Día de Pago Interés',
        },
        {
            key: 'fecha_actualizacion',
            label: 'Fecha de Actualización',
            render: (value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, row: DateData) => (
                <button
                    onClick={() => handleEdit(row)}
                    className="p-2 hover:bg-[rgb(var(--green))]/10 rounded-full transition-colors"
                >
                    <Image
                        src="/images/icons/update.png"
                        alt="Editar"
                        width={24}
                        height={24}
                    />
                </button>
            )
        }
    ];

    // Columnas para la tabla de Paz y Salvo
    const pazSalvoColumns = [
        {
            key: 'descripcion',
            label: 'Descripción',
        },
        {
            key: 'dias_vigencia',
            label: 'Días de Vigencia',
        },
        {
            key: 'fecha_actualizacion',
            label: 'Fecha de Actualización',
            render: (value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, row: PazSalvoDateData) => (
                <button
                    onClick={() => handleEditPazSalvo(row)}
                    className="p-2 hover:bg-[rgb(var(--green))]/10 rounded-full transition-colors"
                >
                    <Image
                        src="/images/icons/update.png"
                        alt="Editar"
                        width={24}
                        height={24}
                    />
                </button>
            )
        }
    ];
    

    const handleEdit = (row: DateData) => {
        setSelectedDate(row);
        setIsEditModalOpen(true);
    };

    const handleEditPazSalvo = (row: PazSalvoDateData) => {
        setSelectedPazSalvoDate(row);
        setIsEditPazSalvoModalOpen(true);
    };

    const fetchAllData = async () => {
        try {
            await refetch();
            return {
                data: data?.data || [],
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

    const fetchAllPazSalvoData = async () => {
        try {
            await pazSalvoRefetch();
            return {
                data: pazSalvoData?.data || [],
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos de Paz y Salvo para Excel:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };
    
    if (loading && pazSalvoLoading && facturasPagadasLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
            </div>
        );
    }

    

    return (
        <div className="w-full max-w-full mx-auto">
            <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
      
                {/* Tabla de Fechas Límites Cuota de Fomento */}
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                <button
                    onClick={() => router.push('/')}
                    className="absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                >
                    &times; 
                </button>
                    <div className="space-y-6">
                        <div className="mt-8">
                            <div className="flex justify-center items-center mb-6">
                                <h3 className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                                    FECHAS LÍMITES CUOTA DE FOMENTO
                                </h3>
                            </div>

                            <DynamicTable
                                columns={columns}
                                data={data?.data || []}
                                currentPage={currentPage}
                                totalPages={1}
                                onPageChange={setCurrentPage}
                                fetchAllData={fetchAllData}
                            />

                            <div className="flex mt-6 justify-center gap-4">
                                <Button title="Crear Fecha" onClick={() => setIsCreateModalOpen(true)} />
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            
                {/* Tabla de Fechas Límites Paz y Salvo */}
                <div className={`mt-6 rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                    <div className="flex justify-center items-center mb-6">
                        <h3 className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                            FECHAS LÍMITES PAZ Y SALVO
                        </h3>
                    </div>

                    {pazSalvoLoading ? (
                        <div className="flex justify-center items-center p-8">
                            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]"></div>
                        </div>
                    ) : (
                        <DynamicTable
                            columns={pazSalvoColumns}
                            data={pazSalvoData?.data || []}
                            currentPage={pazSalvoCurrentPage}
                            totalPages={1}
                            onPageChange={setPazSalvoCurrentPage}
                            fetchAllData={fetchAllPazSalvoData}
                        />
                    )}
                </div>
            </div>

            {/* Modales para Cuota de Fomento */}
            <CreateDate
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                token={token}
                onSuccess={refetch}
            />

            {selectedDate && (
                <EditDate
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedDate(null);
                    }}
                    token={token}
                    date={selectedDate}
                    onSuccess={() => {
                        refetch();
                        setIsEditModalOpen(false);
                        setSelectedDate(null);
                    }}
                />
            )}

            {/* Modal para editar Paz y Salvo */}
            {selectedPazSalvoDate && (
                <EditPazSalvoDate
                    isOpen={isEditPazSalvoModalOpen}
                    onClose={() => {
                        setIsEditPazSalvoModalOpen(false);
                        setSelectedPazSalvoDate(null);
                    }}
                    token={token}
                    date={selectedPazSalvoDate}
                    onSuccess={() => {
                        pazSalvoRefetch();
                        setIsEditPazSalvoModalOpen(false);
                        setSelectedPazSalvoDate(null);
                    }}
                />
            )}
            
            {/* Modal para editar Facturas Pagadas */}
            {selectedFacturasPagadasDate && (
                <EditFacturasPagadasDate
                    isOpen={isEditFacturasPagadasModalOpen}
                    onClose={() => {
                        setIsEditFacturasPagadasModalOpen(false);
                        setSelectedFacturasPagadasDate(null);
                    }}
                    token={token}
                    date={selectedFacturasPagadasDate}
                    onSuccess={() => {
                        facturasPagadasRefetch();
                        setIsEditFacturasPagadasModalOpen(false);
                        setSelectedFacturasPagadasDate(null);
                    }}
                />
            )}
        </div>
    );
};

export default DateTable;
