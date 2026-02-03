'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useTheme } from 'next-themes';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { useProveedores } from '../hooks/useProveedores';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { ProveedoresFilters, Proveedor } from '../models/proveedor.model';
import { useTypeDni } from '@/application/dni/useTypeDni';
import CrearProveedorModal from './CrearProveedorModal';
import EditarProveedorModal from './EditarProveedorModal';
import { IconButton } from '@mui/material';
import Update_icon from '@/presenters/components/ui/Update';

function ProveedoresTabla() {
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
    const router = useRouter();

    // Estados para alertas personalizadas
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const { types, fetchTypes } = useTypeDni();
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);

    // Estados para modales
    const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
    const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);

    const [formData, setFormData] = useState<ProveedoresFilters>({
        page: currentPage,
        page_size: itemsPerPage,
        search: '',
        numero_documento: '',
        tipo_persona: '',
        cod_tipo_documento: '',
    });

    const { data, loading, totalPages, error, refetch } = useProveedores(token, formData, { auto: false });

    useEffect(() => {
        if (token && !hasFetchedTypes) {
            fetchTypes(token);
            setHasFetchedTypes(true);
        }
    }, [token, hasFetchedTypes, fetchTypes]);

    const tipoPersonaOptions = [
        { key: 'N', value: 'N', title: 'Natural' },
        { key: 'J', value: 'J', title: 'Jurídica' },
    ];

    const getFilteredDocumentTypes = () => {
        if (!types || types.length === 0) {
            return [];
        }
        return types.map((type: any) => ({
            key: type.cod_tipo_documento || '',
            value: type.cod_tipo_documento || '',
            title: type.nombre || ''
        }));
    };

    const handleSearch = () => {
        setCurrentPage(1);
        setFormData(prev => ({ ...prev, page: 1 }));
        setTimeout(() => refetch(), 0);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleClear = () => {
        setCurrentPage(1);
        setFormData({
            page: 1,
            page_size: itemsPerPage,
            search: '',
            numero_documento: '',
            tipo_persona: '',
            cod_tipo_documento: ''
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            page: 1,
            [name]: value
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;

        const selectedValue = value || '';

        setFormData(prev => {
            const newState = {
                ...prev,
                page: 1,
                [name]: selectedValue
            };
            return newState;
        });
    };


    const handleEditar = (proveedor: Proveedor) => {
        setSelectedProveedor(proveedor);
        setIsEditarModalOpen(true);
    };

    const handleModalSuccess = () => {
        refetch();
    };

    const columns = [
        { key: 'tipo_persona', label: 'Tipo de persona' },
        { 
            key: 'tipo_documento', 
            label: 'Tipo de documento',
        },
        {
            key: 'numero_documento',
            label: 'Número de documento',
        },
        {
            key: 'razon_social',
            label: 'Razón social',
        },
        {
            key: 'telefono_celular',
            label: 'Teléfono celular',
            render: (_: any, row: Proveedor) => {
                if (row.tipo_persona === 'N' || row.tipo_persona === 'Natural') {
                    return row.telefono_celular || '-';
                }
                return row.telefono_celular_empresa || '-';
            }
        },
        {
            key: 'email',
            label: 'Correo electrónico',
        },
        {
            key: 'departamento',
            label: 'Departamento',
            render: (_: any, row: Proveedor) => {
                if (row.tipo_persona === 'J' || row.tipo_persona === 'Jurídica') {
                    return row.departamento_laboral || '-';
                }
                return row.departamento_residencia || row.departamento_expedicion || '-';
            }
        },
        {
            key: 'municipio',
            label: 'Municipio',
            render: (_: any, row: Proveedor) => {
                if (row.tipo_persona === 'J' || row.tipo_persona === 'Jurídica') {
                    return row.municipio_laboral || '-';
                }
                return row.municipio_residencia || row.municipio_expedicion || '-';
            }
        },
    ];

    const isDarkMode = mounted && theme === 'dark';

    const tableActions = [
        {
            label: 'Editar',
            render: (row: Proveedor) => (
                <IconButton
                    sx={{
                        p: 0.5,
                        color: isDarkMode ? 'white' : '#562707',
                        '&:hover': {
                            backgroundColor: isDarkMode
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(86,39,7,0.1)',
                        },
                    }}
                    onClick={() => handleEditar(row)}
                >
                    <Update_icon />
                </IconButton>
            )
        }
    ];


    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full max-w-full mx-auto">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                    <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                    >
                        &times; 
                    </button>
                <div className="flex justify-center items-center mb-4 mt-[39px]">
                    <h1 className={` text-xl sm:text-2xl lg:text-3xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>PROVEEDORES DE CACAO</h1>
                </div>

                <div className="flex justify-center items-center mb-4 mt-[39px] gap-4">

                <AnimatedSelect 
                    label="Tipo persona"
                    name="tipo_persona"
                    value={formData.tipo_persona || ''}
                    onChange={handleSelectChange}
                    options={tipoPersonaOptions}
                    darkMode={isDarkMode}
                />

                <AnimatedSelect
                    label="Tipo documento"
                    
                    name="cod_tipo_documento"
                    value={formData.cod_tipo_documento || ''}
                    labelSize="sm"
                    onChange={handleSelectChange}
                    options={getFilteredDocumentTypes()}
                    darkMode={isDarkMode}
                />

                <AnimatedInput
                    label="Número documento"
                    name="numero_documento"
                    value={formData.numero_documento || ''}
                    onChange={handleInputChange}
                    darkMode={isDarkMode}
                />

                </div>
            
                <div className="flex justify-center items-center gap-3 mb-2">
                    <Button title={loading ? "Buscando..." : "Buscar"} onClick={handleSearch} disabled={!token || loading} />
                    <Button title="Limpiar" onClick={handleClear} />

                </div>
 
                                                
                    <DynamicTable
                        columns={columns}
                        data={data}
                        currentPage={currentPage}
                        totalPages={totalPages || 1}
                        onPageChange={(page: number) => {
                            setCurrentPage(page);
                            setFormData(prev => ({ ...prev, page }));
                            setTimeout(() => refetch(), 0);
                        }}
                        isLoading={loading}
                        actions={tableActions}
                    />

                    <div className="flex justify-center mt-6 gap-4">
                        <Button title="Crear Proveedor" onClick={() => setIsCrearModalOpen(true)} />
                        <Button onClick={() => router.push('/')} title="Salir" />
                    </div>
                </div>
            </div>


            {/* Alertas personalizadas */}
            <AlertError
                isOpen={showErrorAlert}
                message={error || ''}
                onClose={() => setShowErrorAlert(false)}
            />

            <AlertSuccess
                isOpen={showSuccessAlert}
                message={''}
                onClose={() => setShowSuccessAlert(false)}
                autoCloseMs={3000}
            />

            {/* Modales */}
            <CrearProveedorModal
                isOpen={isCrearModalOpen}
                onClose={() => setIsCrearModalOpen(false)}
                onSuccess={handleModalSuccess}
            />

            <EditarProveedorModal
                isOpen={isEditarModalOpen}
                onClose={() => setIsEditarModalOpen(false)}
                proveedor={selectedProveedor}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}

export default ProveedoresTabla;
