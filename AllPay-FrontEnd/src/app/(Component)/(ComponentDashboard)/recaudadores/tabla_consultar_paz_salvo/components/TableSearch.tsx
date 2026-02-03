'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';

interface PazSalvoData {
    numero_paz_salvo: string;
    fecha_generacion: string;
    tipo: string;
    puerto_exportacion: string;
    total_kg: number;
    razon_social: string;
    tipo_documento: string;
    numero_documento: string;
}

const TableSearch: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [isLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [pazSalvoData] = useState<PazSalvoData[]>([]);

    const columns = [
        {
            key: 'numero_paz_salvo',
            label: 'Número de Paz y Salvo',
            render: (value: string) => value || '-'
        },
        {
            key: 'fecha_generacion',
            label: 'Fecha de Generación',
            render: (value: string) => {
                const fecha = new Date(value);
                return fecha.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        },
        {
            key: 'tipo',
            label: 'Tipo',
            render: (value: string) => value || '-'
        },
        {
            key: 'puerto_exportacion',
            label: 'Puerto Exportación',
            render: (value: string) => value || '-'
        },
        {
            key: 'total_kg',
            label: 'Total KG Paz y Salvo',
            render: (value: number) => value.toLocaleString('es-ES') || '-'
        },
        {
            key: 'razon_social',
            label: 'Razón Social',
            render: (value: string) => value || '-'
        },
        {
            key: 'tipo_documento',
            label: 'Tipo Documento',
            render: (value: string) => value || '-'
        },
        {
            key: 'numero_documento',
            label: 'Número Documento',
            render: (value: string) => value || '-'
        }
    ];

    const actions = [
        {
            label: 'Ver',
            render: (row: PazSalvoData) => (
                <button onClick={() => handleView(row)}>
                    <img
                        src="https://i.postimg.cc/hPVKjZ05/Grupo-1126.png"
                        alt="Ver"
                        className="h-6 w-6"
                    />
                </button>
            )
        },
        {
            label: 'Descargar',
            render: (row: PazSalvoData) => (
                <button onClick={() => handleDownload(row)}>
                    <img
                        src="https://i.postimg.cc/nh3rCVxb/cancel-33dp-EA3323-FILL0-wght400-GRAD0-opsz40.png"
                        alt="Descargar"
                        className="h-6 w-6"
                    />
                </button>
            )
        }
    ];

    const handleView = (row: PazSalvoData) => {
        // Implementar la lógica para ver el detalle
        console.log('Ver detalle:', row);
    };

    const handleDownload = (row: PazSalvoData) => {
        // Implementar la lógica para descargar
        console.log('Descargar:', row);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const getCurrentPageData = (data: PazSalvoData[], page: number) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const fetchAllData = async (page: number) => {
        try {
            if (page === 0) {
                // Para descarga completa
                return {
                    data: pazSalvoData,
                    total_pages: 1
                };
            }
            
            // Para paginación normal
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageData = pazSalvoData.slice(startIndex, endIndex);
            
            return {
                data: pageData,
                total_pages: Math.ceil(pazSalvoData.length / itemsPerPage)
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    return (
        <div className="w-full">
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}>
                            <button
                                onClick={() => router.push('/')}
                                className="absolute top-2 right-4 text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    CONSULTA DE PAZ Y SALVO GENERADO
                                </h3>
                            </div>
                            <div className="mt-6">
                                <DynamicTable
                                    columns={columns}
                                    data={getCurrentPageData(pazSalvoData, currentPage)}
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(pazSalvoData.length / itemsPerPage)}
                                    onPageChange={handlePageChange}
                                    actions={actions}
                                    isLoading={isLoading}
                                    fetchAllData={fetchAllData}
                                    downloadButtonPosition="top"
                                />
                            </div>
                            <div className="flex justify-center gap-4 mt-6">
                                <Button 
                                    onClick={() => console.log('Consultar')} 
                                    title="Consultar" 
                                />
                                <Button 
                                    onClick={() => router.push('/recaudadores/consultar_cuotas_pagadas')} 
                                    title="Nuevo Paz y Salvo" 
                                />
                                <Button 
                                    onClick={() => router.push('/')} 
                                    title="Salir" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableSearch;