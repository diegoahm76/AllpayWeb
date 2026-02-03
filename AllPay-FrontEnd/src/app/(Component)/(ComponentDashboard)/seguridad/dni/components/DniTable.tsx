'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { getAllDni } from '@/app/api/dni/getAllDni';
import { deleteDni } from '@/app/api/dni/deleteDni';
import { updateDni } from '@/app/api/dni/updateDni';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import CreateDniModal from './CreateDniModal';
import Swal from 'sweetalert2';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';


interface TipoDocumento {
    cod_tipo_documento: string;
    nombre: string;
}

interface FormData {
    cod_tipo_documento: string;
    nombre: string;
    activo: boolean;
}

const DniTable: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dniData, setDniData] = useState<TipoDocumento[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDni, setSelectedDni] = useState<TipoDocumento | null>(null);
    const [formData, setFormData] = useState<FormData>({
        cod_tipo_documento: '',
        nombre: '',
        activo: true
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const valueSesion: any = session;

    const fetchDniData = async () => {
        try {
            setIsLoading(true);
            const response = await getAllDni(valueSesion?.user?.tokens?.access);
            setDniData(response.data);
            setTotalPages(1);
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al obtener los tipos de documento'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (row: TipoDocumento) => {
        try {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: `¿Deseas eliminar el tipo de documento "${row.nombre}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#4D750F',
                cancelButtonColor: '#4D750F',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                await deleteDni(valueSesion?.user?.tokens?.access, row.cod_tipo_documento);

                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El tipo de documento ha sido eliminado correctamente',
                    confirmButtonColor: '#4D750F'
                });

                fetchDniData();
            }
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al eliminar el tipo de documento',
                confirmButtonColor: '#4D750F'
            });
        }
    };

    const handleEdit = (row: TipoDocumento) => {
        setSelectedDni(row);
        setFormData({
            cod_tipo_documento: row.cod_tipo_documento,
            nombre: row.nombre,
            activo: true
        });
        setShowModal(true);
    };

    const handleUpdate = async () => {
        try {
            if (!selectedDni) return;

            await updateDni(
                valueSesion?.user?.tokens?.access,
                selectedDni.cod_tipo_documento,
                {
                    nombre: formData.nombre,
                    activo: formData.activo
                }
            );

            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'El tipo de documento ha sido actualizado correctamente',
                confirmButtonColor: '#4D750F'
            });

            setShowModal(false);
            fetchDniData();
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al actualizar el tipo de documento',
                confirmButtonColor: '#4D750F'
            });
        }
    };


    const fetchAllData = async () => {
        try {
            const response = await getAllDni(valueSesion?.user?.tokens?.access);
            return {
                data: response.data,
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    useEffect(() => {
        if (valueSesion?.user?.tokens?.access) {
            fetchDniData();
        }
    }, [valueSesion]);

    const columns = [
        {
            key: 'cod_tipo_documento',
            label: 'Código'
        },
        {
            key: 'nombre',
            label: 'Nombre'
        }
    ];

    const actions = [
        {
            label: 'Editar',
            render: (row: TipoDocumento) => (
                <button
                    onClick={() => handleEdit(row)}
                >
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
            render: (row: TipoDocumento) => (
                <button
                    onClick={() => handleDelete(row)}
                >
                    <img
                        src="/images/icons/delete.png"
                        alt="Eliminar"
                        className="h-6 w-6"
                    />
                </button>
            )
        }
    ];

    return (
        <div className="w-full">
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px] ">
                                <h3
                                    className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    TIPOS DE DOCUMENTO
                                </h3>
                            </div>

                            <DynamicTable
                                columns={columns}
                                data={dniData}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                actions={actions}
                                isLoading={isLoading}
                                fetchAllData={fetchAllData}
                            />

                            <div className="flex justify-center mt-6 space-x-4">
                                
                                <Button onClick={() => setShowCreateModal(true)} title="Crear" />
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ModalContainer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            >
                <div className="space-y-4">
                    <h3 className={`mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Editar Tipo de Documento
                    </h3>
                    <AnimatedInput
                        label="Código"
                        type="text"
                        name="cod_tipo_documento"
                        value={formData.cod_tipo_documento}
                        onChange={(e) => setFormData({ ...formData, cod_tipo_documento: e.target.value })}
                        readOnly
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Nombre"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        darkMode={isDarkMode}
                    />
                    <div className="flex justify-center space-x-4 mt-6">

                        <Button onClick={handleUpdate} title="Guardar" />
                        <Button onClick={() => setShowModal(false)} title="Cancelar" />

                    </div>
                </div>
            </ModalContainer>

            <CreateDniModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchDniData}
            />
        </div>
    );
};

export default DniTable; 