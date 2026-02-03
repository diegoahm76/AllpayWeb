// components/DescargarPlantilla.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import Image from 'next/image';
import useBolsaNY from '../hooks/useBolsaNY';
import useTRM from '../hooks/useTRM';
import { formatCurrency } from '@/utils/formatters';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button as AnimatedButton } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { useRouter } from 'next/navigation';

const TrmPreciosTable: React.FC = () => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pazSalvoCurrentPage, setPazSalvoCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        fecha: '',
        precio: ''
    });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        id: '',
        fecha: '',
        precio: ''
    });
    const [editingRow, setEditingRow] = useState<any>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Estados para modal de creación de TRM
    const [isTRMModalOpen, setIsTRMModalOpen] = useState(false);
    const [trmFormData, setTrmFormData] = useState({
        fecha: '',
        precio: ''
    });

    // Estados para modal de edición de TRM
    const [isTRMEditModalOpen, setIsTRMEditModalOpen] = useState(false);
    const [trmEditFormData, setTrmEditFormData] = useState({
        id: '',
        fecha: '',
        precio: ''
    });
    const [editingTRMRow, setEditingTRMRow] = useState<any>(null);

    // Estados para alertas de error y éxito
    const [alertError, setAlertError] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ''
    });
    const [alertSuccess, setAlertSuccess] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ''
    });

    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });

    const router = useRouter();

    const token = (session as any)?.user?.tokens?.access;
    
    // Hook para la bolsa de Nueva York
    const { 
        data: bolsaNYData, 
        isLoading: isLoadingBolsaNY, 
        error: errorBolsaNY, 
        fetchBolsaNY, 
        updateBolsaNYRecord,
        isUpdating,
        updateError,
        clearUpdateState,
        isCreating,
        createError,
        createBolsaNYRecord,
        clearCreateState
    } = useBolsaNY();
    
    // Hook para TRM
    const { 
        data: trmData, 
        isLoading: isLoadingTRM, 
        error: errorTRM, 
        fetchTRM,
        // Funciones de creación
        isCreating: isCreatingTRM,
        createError: createErrorTRM,
        createTRMRecord,
        clearCreateState: clearCreateStateTRM,
        // Funciones de actualización
        isUpdating: isUpdatingTRM,
        updateError: updateErrorTRM,
        updateTRMRecord,
        clearUpdateState: clearUpdateStateTRM
    } = useTRM();
    
    // Estado para la respuesta completa del API
    const [apiResponse, setApiResponse] = useState<any>(null);
    
    // Estado para la respuesta completa del API de TRM
    const [trmApiResponse, setTrmApiResponse] = useState<any>(null);

    // Función para mostrar alerta de error
    const showError = (message: string) => {
        setAlertError({ isOpen: true, message });
    };

    // Función para mostrar alerta de éxito
    const showSuccess = (message: string) => {
        setAlertSuccess({ isOpen: true, message });
    };

    // Función para cerrar alerta de error
    const closeError = () => {
        setAlertError({ isOpen: false, message: '' });
    };

    // Función para cerrar alerta de éxito
    const closeSuccess = () => {
        setAlertSuccess({ isOpen: false, message: '' });
    };
    
    // Función para hacer la consulta inicial
    const consultarBolsaNY = async () => {
        if (!token) return;
        
        try {
            const response = await fetchBolsaNY(token, {
                page: currentPage,
                page_size: 10
            });
            
            
            // Guardar la respuesta completa del API para acceder a total_pages, count, etc.
            if (response) {
                setApiResponse(response);
            }
        } catch (error) {
            console.error('Error al consultar bolsa NY:', error);
        }
    };

    // Función para hacer la consulta inicial de TRM
    const consultarTRM = async () => {
        if (!token) return;
        
        try {
            const response = await fetchTRM(token, {
                page: pazSalvoCurrentPage,
                page_size: 10
            });
            
            if (response) {
                setTrmApiResponse(response);
            }
        } catch (error) {
            console.error('Error al consultar TRM:', error);
        }
    };

    // Función para cambiar de página
    const handlePageChange = async (newPage: number) => {
        setCurrentPage(newPage);
        if (token) {
            try {
                const response = await fetchBolsaNY(token, {
                    page: newPage,
                    page_size: 10
                });
                
                // Actualizar la respuesta del API
                if (response) {
                    setApiResponse(response);
                }
            } catch (error) {
                console.error('Error al cambiar de página:', error);
                showError('Error al cambiar de página');
            }
        }
    };

    // Función para cambiar de página de TRM
    const handleTRMPageChange = async (newPage: number) => {
        setPazSalvoCurrentPage(newPage);
        if (token) {
            try {
                const response = await fetchTRM(token, {
                    page: newPage,
                    page_size: 10
                });
                
                // Actualizar la respuesta del API
                if (response) {
                    setTrmApiResponse(response);
                }
            } catch (error) {
                console.error('Error al cambiar de página de TRM:', error);
                showError('Error al cambiar de página de TRM');
            }
        }
    };

    // Consulta inicial cuando el componente se monta
    useEffect(() => {
        if (token) {
            consultarBolsaNY();
            consultarTRM();
        }
    }, [token]); // Solo se ejecuta cuando cambia el token

    // Efectos para manejar errores y éxitos de la bolsa NY
    useEffect(() => {
        if (errorBolsaNY) {
            showError(errorBolsaNY);
        }
    }, [errorBolsaNY]);

    useEffect(() => {
        if (createError) {
            showError(createError);
        }
    }, [createError]);

    useEffect(() => {
        if (updateError) {
            showError(updateError);
        }
    }, [updateError]);

    // Efectos para manejar errores y éxitos de TRM
    useEffect(() => {
        if (errorTRM) {
            showError(errorTRM);
        }
    }, [errorTRM]);

    useEffect(() => {
        if (createErrorTRM) {
            showError(createErrorTRM);
        }
    }, [createErrorTRM]);

    useEffect(() => {
        if (updateErrorTRM) {
            showError(updateErrorTRM);
        }
    }, [updateErrorTRM]);

    // Función para manejar cambios en los inputs del modal
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para abrir el modal
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    // Función para cerrar el modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ fecha: '', precio: '' });
        // Limpiar estados de error y éxito de creación
        clearCreateState();
    };

    // Función para manejar el envío del formulario
    const handleSubmit = async () => {
        if (!token) {
            console.error('Token no disponible');
            showError('Token de autenticación no disponible');
            return;
        }

        try {
            // Preparar los datos para la creación
            const createPayload = {
                fecha_registro: formData.fecha,
                precio_cierre: parseFloat(formData.precio)
            };

            // Ejecutar la creación usando el hook
            const response = await createBolsaNYRecord(token, createPayload);

            if (response) {
                showSuccess('Registro de bolsa de Nueva York creado exitosamente');
                handleCloseModal();
                await consultarBolsaNY();
            } else {
                showError('Error al crear el registro de bolsa de Nueva York');
            }
        } catch (error) {
            console.error('Error en handleSubmit:', error);
            showError('Error al crear el registro de bolsa de Nueva York');
        }
    };

    // Función para abrir el modal de edición
    const handleOpenEditModal = (row: any) => {

        setEditingRow(row);
        setEditFormData({
            id: row.idregistro || row.id || '', // Usar idregistro que es el campo correcto según el modelo
            fecha: row.fecha_registro || '',
            precio: row.precio_cierre?.toString() || ''
        });
        setIsEditModalOpen(true);
    };

    // Función para cerrar el modal de edición
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditFormData({ id: '', fecha: '', precio: '' });
        setEditingRow(null);
        // Limpiar estados de error y éxito
        clearUpdateState();
    };

    // Función para manejar cambios en los inputs del modal de edición
    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para manejar el envío del formulario de edición
    const handleEditSubmit = async () => {
        if (!token || !editingRow) {
            console.error('Token o fila de edición no disponible');
            showError('Token o fila de edición no disponible');
            return;
        }

        // Validar que el ID esté disponible
        const recordId = editingRow.idregistro;
        if (!recordId) {
            console.error('ID del registro no disponible:', editingRow);
            showError('ID del registro no disponible');
            return;
        }

        try {
            // Preparar los datos para la actualización
            const fecha = new Date(editFormData.fecha);
            const updatePayload = {
                fecha_registro: editFormData.fecha,
                precio_cierre: parseFloat(editFormData.precio),
                anio: fecha.getFullYear(),
                mes: fecha.getMonth() + 1
            };

            // Ejecutar la actualización usando el hook
            const response = await updateBolsaNYRecord(
                token,
                recordId, // Usar la variable validada
                updatePayload
            );

            if (response) {
                showSuccess('Registro de bolsa de Nueva York actualizado exitosamente');
                handleCloseEditModal();
                await consultarBolsaNY();
            } 

        } catch (error) {
            console.error('Error en handleEditSubmit:', error);
        }
    };

    // Funciones para modal de creación de TRM
    const handleTRMInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTrmFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleOpenTRMModal = () => {
        setIsTRMModalOpen(true);
    };

    const handleCloseTRMModal = () => {
        setIsTRMModalOpen(false);
        setTrmFormData({ fecha: '', precio: '' });
        // Limpiar estados de error y éxito de creación
        clearCreateStateTRM();
    };

    const handleTRMSubmit = async () => {
        if (!token) {
            console.error('Token no disponible');
            showError('Token de autenticación no disponible');
            return;
        }

        try {
            // Preparar los datos para la creación
            const createPayload = {
                fecha_registro: trmFormData.fecha,
                precio_trm: parseFloat(trmFormData.precio)
            };


            // Ejecutar la creación usando el hook
            const response = await createTRMRecord(token, createPayload);

            if (response) {
                showSuccess('Registro TRM creado exitosamente');
                // Cerrar el modal después de procesar
                handleCloseTRMModal();
                // Recargar los datos de la tabla
                await consultarTRM();
            } else {
                showError('Error al crear el registro TRM');
            }
        } catch (error) {
            console.error('Error en handleTRMSubmit:', error);
            showError('Error al crear el registro TRM');
        }
    };

    // Funciones para modal de edición de TRM
    const handleOpenTRMEditModal = (row: any) => {
        setEditingTRMRow(row);
        setTrmEditFormData({
            id: row.idregistro || row.id || '',
            fecha: row.fecha_registro || '',
            precio: row.precio_trm?.toString() || ''
        });
        setIsTRMEditModalOpen(true);
    };

    const handleCloseTRMEditModal = () => {
        setIsTRMEditModalOpen(false);
        setTrmEditFormData({ id: '', fecha: '', precio: '' });
        setEditingTRMRow(null);
        // Limpiar estados de error y éxito
        clearUpdateStateTRM();
    };

    const handleTRMEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTrmEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTRMEditSubmit = async () => {
        if (!token || !editingTRMRow) {
            console.error('Token o fila de edición TRM no disponible');
            showError('Token o fila de edición TRM no disponible');
            return;
        }

        // Validar que el ID esté disponible
        const recordId = editingTRMRow.idregistro;
        if (!recordId) {
            console.error('ID del registro TRM no disponible:', editingTRMRow);
            showError('ID del registro TRM no disponible');
            return;
        }

        try {
            // Preparar los datos para la actualización
            const updatePayload = {
                fecha_registro: trmEditFormData.fecha,
                precio_trm: parseFloat(trmEditFormData.precio)
            };


            // Ejecutar la actualización usando el hook
            const response = await updateTRMRecord(
                token,
                recordId,
                updatePayload
            );

            if (response) {
                showSuccess('Registro TRM actualizado exitosamente');
                handleCloseTRMEditModal();
                await consultarTRM();
            } 
        } catch (error) {
            console.error('Error en handleTRMEditSubmit:', error);
        }
    };

    // Columnas para la tabla de Cuota de Fomento
    const columnsPrecioNewYork = [
        {
            key: 'fecha_registro',
            label: 'Fecha de Registro',
            render: (value: string) => value
        },
        {
            key: 'anio',
            label: 'Año',
            render: (value: number) => value
        },
        {
            key: 'mes',
            label: 'Mes',
            render: (value: number) => value
        },
        {
            key: 'precio_cierre',
            label: 'Precio de Cierre',
            render: (value: number) => formatCurrency(value)
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, row: any) => (
                <button
                    onClick={() => handleOpenEditModal(row)}
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

    // Columnas para la tabla de TRM
    const columnsTRM = [
        {
            key: 'fecha_registro',
            label: 'Fecha de Registro',
            render: (value: string) => value
        },
        {
            key: 'anio',
            label: 'Año',
            render: (value: number) => value
        },
        {
            key: 'mes',
            label: 'Mes',
            render: (value: number) => value
        },
        {
            key: 'precio_trm',
            label: 'Precio TRM',
            render: (value: string) => formatCurrency(parseFloat(value))
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (_: any, row: any) => (
                <button
                    onClick={() => handleOpenTRMEditModal(row)}
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

    const fetchAllData = async () => {
        try {
            if (token) {
                const response = await fetchBolsaNY(token, {
                    page: currentPage,
                    page_size: 10
                });
                
                if (response) {
                    setApiResponse(response);
                }
            }
            return {
                data: bolsaNYData?.registros || [],
                total_pages: apiResponse?.total_pages || 1
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            showError('Error al obtener datos para Excel');
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    const fetchAllPazSalvoData = async () => {
        try {
            if (token) {
                const response = await fetchTRM(token, {
                    page: pazSalvoCurrentPage,
                    page_size: 10
                });
                
                if (response) {
                    setTrmApiResponse(response);
                }
            }
            return {
                data: trmData?.registros || [],
                total_pages: trmApiResponse?.total_pages || 1
            };
        } catch (error) {
            console.error('Error al obtener datos de TRM para Excel:', error);
            showError('Error al obtener datos de TRM para Excel');
            return {
                data: [],
                total_pages: 0
            };
        }
    };
    
    return (
        <div className="w-full max-w-full mx-auto">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>

              
                {/* Tabla de Fechas Límites Cuota de Fomento */}
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
                <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                >
                    &times; 
                </button>

                    <div className="space-y-6">
                        <div className="mt-8 ">

                     
                    
                            <div className="flex justify-center items-center mb-6">
                                <h3 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                    PRECIO NEW YORK
                                </h3>
                            </div>

                            {isLoadingBolsaNY ? (
                                <div className="flex justify-center items-center h-32">
                                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                                </div>
                            ) : (
                                <>

                                    <DynamicTable
                                        columns={columnsPrecioNewYork as any}
                                        data={bolsaNYData?.registros || []}
                                        currentPage={currentPage}
                                        totalPages={apiResponse?.total_pages || 1}
                                        onPageChange={handlePageChange}
                                        fetchAllData={fetchAllData}
                                        darkMode={isDarkMode}
                                    />
                                </>
                            )}
                            
               
                            <div className="flex mt-6 justify-center gap-4">     
                                <Button title="Crear Registro" onClick={handleOpenModal} />
                                <Button title="Salir" onClick={() => router.push('/')} />
                            </div>
                        </div>
                    </div>
                </div>
            
                {/* Tabla de TRM */}
                <div className={`mt-6 rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
       
                    <div className="flex justify-center items-center mb-6">
                        <h3 className={`text-2xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                            TRM (Tasa de Cambio)
                        </h3>
                    </div>

                    {isLoadingTRM ? (
                        <div className="flex justify-center items-center p-8">
                            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]"></div>
                        </div>
                    ) : (
                        <DynamicTable
                            columns={columnsTRM as any}
                            data={trmData?.registros || []}
                            currentPage={pazSalvoCurrentPage}
                            totalPages={trmApiResponse?.total_pages || 1}
                            onPageChange={handleTRMPageChange}
                            fetchAllData={fetchAllPazSalvoData}
                            darkMode={isDarkMode}
                        />
                    )}
 
                    <div className="flex mt-6 justify-center gap-4">     
                        <Button title="Crear Registro TRM" onClick={handleOpenTRMModal} />
                        <Button title="Salir" onClick={() => router.push('/')} />
                    </div>
                </div>
            </div>

            {/* Modal de Creación PRECIO NY*/}
            <ModalContainer isOpen={isModalOpen} onClose={handleCloseModal}>
                <h2 className={`text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Crear Nuevo Registro</h2>
                
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div className="grid gap-4">
                        <AnimatedInput
                            label="Fecha"
                            type="date"
                            name="fecha"
                            value={formData.fecha}
                            onChange={handleInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Precio"
                            type="number"
                            name="precio"
                            value={formData.precio}
                            onChange={handleInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <div className="flex justify-center">
                            <AnimatedButton 
                                title={isCreating ? "Creando..." : "Crear Registro"} 
                                onClick={handleSubmit}
                                disabled={isCreating}
                            />
                        </div>
                    </div>
                </form>
            </ModalContainer>

            {/* Modal de Edición PRECIO NY*/}
            <ModalContainer isOpen={isEditModalOpen} onClose={handleCloseEditModal}>
                <h2 className={`text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Editar Registro</h2>
                
                <form onSubmit={(e) => { e.preventDefault(); handleEditSubmit(); }}>
                    <div className="grid gap-4">
                        <AnimatedInput
                            label="Fecha"
                            type="date"
                            name="fecha"
                            value={editFormData.fecha}
                            onChange={handleEditInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Precio"
                            type="number"
                            name="precio"
                            value={editFormData.precio}
                            onChange={handleEditInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <div className="flex justify-center gap-4">
                            <AnimatedButton 
                                title={isUpdating ? "Actualizando..." : "Actualizar"} 
                                onClick={handleEditSubmit}
                                disabled={isUpdating}
                            />
                            <AnimatedButton title="Cancelar" onClick={handleCloseEditModal} />
                        </div>
                    </div>
                </form>
            </ModalContainer>

            {/* Modal de Creación TRM */}
            <ModalContainer isOpen={isTRMModalOpen} onClose={handleCloseTRMModal}>
                <h2 className={`text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Crear Nuevo Registro TRM</h2>
                
                <form onSubmit={(e) => { e.preventDefault(); handleTRMSubmit(); }}>
                    <div className="grid gap-4">
                        <AnimatedInput
                            label="Fecha"
                            type="date"
                            name="fecha"
                            value={trmFormData.fecha}
                            onChange={handleTRMInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Precio TRM"
                            type="number"
                            name="precio"
                            value={trmFormData.precio}
                            onChange={handleTRMInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <div className="flex justify-center">
                            <AnimatedButton 
                                title={isCreatingTRM ? "Creando..." : "Crear Registro TRM"} 
                                onClick={handleTRMSubmit}
                                disabled={isCreatingTRM}
                            />
                        </div>
                    </div>
                </form>
            </ModalContainer>

            {/* Modal de Edición TRM */}
            <ModalContainer isOpen={isTRMEditModalOpen} onClose={handleCloseTRMEditModal}>
                <h2 className={`text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Editar Registro TRM</h2>
                
                <form onSubmit={(e) => { e.preventDefault(); handleTRMEditSubmit(); }}>
                    <div className="grid gap-4">
                        <AnimatedInput
                            label="Fecha"
                            type="date"
                            name="fecha"
                            value={trmEditFormData.fecha}
                            onChange={handleTRMEditInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Precio TRM"
                            type="number"
                            name="precio"
                            value={trmEditFormData.precio}
                            onChange={handleTRMEditInputChange}
                            required
                            darkMode={isDarkMode}
                        />
                        <div className="flex justify-center gap-4">
                            <AnimatedButton 
                                title={isUpdatingTRM ? "Actualizando..." : "Actualizar"} 
                                onClick={handleTRMEditSubmit}
                                disabled={isUpdatingTRM}
                            />
                            <AnimatedButton title="Cancelar" onClick={handleCloseTRMEditModal} />
                        </div>
                    </div>
                </form>
            </ModalContainer>

            {/* Alertas de Error y Éxito */}
            <AlertError
                isOpen={alertError.isOpen}
                message={alertError.message}
                onClose={closeError}
                autoCloseMs={5000}
            />

            <AlertSuccess
                isOpen={alertSuccess.isOpen}
                message={alertSuccess.message}
                onClose={closeSuccess}
                autoCloseMs={3000}
            />
        </div>
    );
};

export default TrmPreciosTable;
