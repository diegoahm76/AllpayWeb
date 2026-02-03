// components/DescargarPlantilla.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRouter } from 'next/navigation';
import { useTemplateActions } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/hooks/useGetAllTemplate';
import Swal from 'sweetalert2';
import { PlantillaInfo } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/components/PlantillaInfo';
import ModalContainer from "@/presenters/components/ui/ModalContainer";
import { IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CargarPlantilla from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/components/CargarPlantilla';
import EditarPlantilla from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/components/EditarPlantilla';

interface PlantillaData {
    id: number;
    nombrePlantilla: string;
    descripcion: string;
    extension: string;
    doc_plantilla: string;
    observacion: string;
    estado: string;
    id_config_consecutivo: number | null;
}

const DescargarPlantilla: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        },
    });
    const valueSesion: any = session;
    const token = valueSesion?.user?.tokens?.access;

    const {
        templates,
        isLoading,
        isDeleting,
        // error,
        refetch,
        handleDeleteTemplate,
        getTemplatesForExcel
    } = useTemplateActions(token);

    const [formData, setFormData] = useState({
        numeroPlantilla: '',
        extension: '',
        descripcion: '',
        doc_plantilla: '',
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [filteredTemplates, setFilteredTemplates] = useState<PlantillaData[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [, setShowInfo] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PlantillaData | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);

    useEffect(() => {
        if (templates && Array.isArray(templates.data)) {
            const plantillas = templates.data.map((template) => {
                const extensionMatch = template.doc_plantilla
                    .toLowerCase()
                    .match(/\.([^.?]+)(\?|$)/);
                let fileExtension = 'otro';
                if (extensionMatch && extensionMatch[1]) {
                    fileExtension = extensionMatch[1];
                }

                return {
                    id: template.id_plantilla_doc,
                    nombrePlantilla: template.nombre,
                    descripcion: template.descripcion,
                    extension: fileExtension,
                    doc_plantilla: template.doc_plantilla,
                    observacion: template.observacion || '',
                    estado: template.activa ? 'Activa' : 'Inactiva',
                    id_config_consecutivo: template.id_config_consecutivo
                };
            });

            setFilteredTemplates(plantillas);
            setTotalPages(Math.ceil(plantillas.length / pageSize));
        } else {
            setFilteredTemplates([]);
            setTotalPages(1);
        }
    }, [templates, pageSize]);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredTemplates.slice(startIndex, endIndex);
    };

    const handleLimpiar = () => {
        setFormData({
            numeroPlantilla: '',
            extension: '',
            descripcion: '',
            doc_plantilla: '',
        });
        setShowInfo(false);

        // Restaurar la lista original
        if (templates && Array.isArray(templates.data)) {
            const plantillas = templates.data.map((template) => {
                const extensionMatch = template.doc_plantilla
                    .toLowerCase()
                    .match(/\.([^.?]+)(\?|$)/);
                let fileExtension = 'otro';
                if (extensionMatch && extensionMatch[1]) {
                    fileExtension = extensionMatch[1];
                }

                return {
                    id: template.id_plantilla_doc,
                    nombrePlantilla: template.nombre,
                    descripcion: template.descripcion,
                    extension: fileExtension,
                    doc_plantilla: template.doc_plantilla,
                    observacion: template.observacion || '',
                    estado: template.activa ? 'Activa' : 'Inactiva',
                    id_config_consecutivo: template.id_config_consecutivo
                };
            });

            setFilteredTemplates(plantillas);
        }
    };


    const handleViewTemplate = (template: PlantillaData) => {
        setSelectedTemplate(template);
        setFormData({
            numeroPlantilla: template.nombrePlantilla,
            extension: template.extension,
            descripcion: template.descripcion,
            doc_plantilla: template.doc_plantilla,
        });
        setShowModal(true);
        setIsDocumentViewerOpen(false); // Reset document viewer state
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTemplate(null);
        setIsDocumentViewerOpen(false);
    };

    const handleDescargar = async () => {
        try {
            if (selectedTemplate && selectedTemplate.doc_plantilla) {
                // Abrir el enlace en una nueva pestaña
                window.open(selectedTemplate.doc_plantilla, '_blank');
            } else {
                throw new Error('No se encontró el enlace del archivo');
            }
        } catch (error) {
            console.error('Error al abrir la plantilla:', error);
            await Swal.fire({
                title: 'Error',
                text: 'Error al abrir la plantilla',
                icon: 'error',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar',
            });
        }
    };

    const handleEliminar = async (row: PlantillaData) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará la plantilla seleccionada.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: 'Si, eliminar',
            cancelButtonColor: 'rgb(var(--green))',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                await handleDeleteTemplate(row.id);
                Swal.fire({
                    title: 'Plantilla eliminada',
                    text: 'La plantilla ha sido eliminada correctamente.',
                    icon: 'success',
                    confirmButtonColor: 'rgb(var(--green))',
                    confirmButtonText: 'Aceptar',
                });
            }
        });
    };


    const fetchAllData = async () => {
        try {
            const response = await getTemplatesForExcel();

            // Mapear los datos a la estructura esperada por la tabla
            const formattedData = response.map((template: any) => {
                // Extraer la extensión del campo Extensión

                return {
                    nombrePlantilla: template['Nombre de la Plantilla'],
                    descripcion: template.Descripción,
                };
            });

            return {
                data: formattedData,
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

    const handleCreateSuccess = async () => {
        setShowCreateModal(false);
        // Refrescar los datos de la tabla en lugar de recargar la página
        await refetch();
    };

    const handleEditTemplate = (template: PlantillaData) => {
        setSelectedTemplate(template);
        setShowEditModal(true);
    };

    const handleEditSuccess = async () => {
        setShowEditModal(false);
        setSelectedTemplate(null);
        // Refrescar los datos de la tabla después de editar
        await refetch();
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedTemplate(null);
    };

    const columns = [
        {
            key: 'nombrePlantilla',
            label: 'Nombre de la Plantilla',
        },
        {
            key: 'descripcion',
            label: 'Descripción',
        },
        {
            key: 'extension',
            label: 'Extensión',
            render: (value: string) => {
                // Según la extensión, mostramos un ícono u otro
                if (value.includes('pdf')) {
                    return (
                        <img
                            src="/images/icons/pdf.png"
                            alt="PDF"
                            className="h-6 w-6"
                            title="Archivo PDF"
                        />
                    );
                } else if (value.includes('doc')) {
                    return (
                        <img
                            src="/images/icons/word.png"
                            alt="Word"
                            className="h-6 w-6"
                            title="Archivo Word"
                        />
                    );
                }
                // Fallback: otro ícono
                return (
                    <img
                        src="https://i.postimg.cc/HnnrXHHJ/file.png"
                        alt="Archivo"
                        className="h-6 w-6"
                        title="Otro tipo de archivo"
                    />
                );
            },
        },
    ];

    // DEFINIR ACCIONES (columna final)
    const actions = [
        {
            label: 'Ver',
            render: (row: PlantillaData) => (
                <IconButton
                    onClick={() => handleViewTemplate(row)}
                    sx={{
                        color: theme === 'dark' ? 'white' : '#562707',
                        '&:hover': {
                            backgroundColor:
                                theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(86, 39, 7, 0.1)'
                        }
                    }}
                >
                    <VisibilityIcon sx={{ fontSize: 18 }} />
                </IconButton>
            ),
        },
        {
            label: 'Editar',
            render: (row: PlantillaData) => (
                <button onClick={() => handleEditTemplate(row)} className="p-1" title="Editar">
                    <img src="/images/icons/update.png" alt="Editar" className="h-6 w-6" />
                </button>
            ),
        },
        {
            label: 'Eliminar',
            render: (row: PlantillaData) => (
                <button onClick={() => handleEliminar(row)} className="p-1" title="Eliminar">
                    <img src="/images/icons/delete.png" alt="Eliminar" className="h-6 w-6" />
                </button>
            ),
        },
    ];

    return (
        <div className="w-full max-w-full mx-auto ">
            <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                    <div className="space-y-6">
                        {/* Sección de la tabla */}
                        <div className="mt-8">
                            <div className="flex justify-center items-center">
                                <h3 className={` text-xl sm:text-2xl lg:text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                                    PLANTILLAS
                                </h3>
                            </div>

                            <DynamicTable
                                columns={columns}
                                data={getCurrentPageData()}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                actions={actions}
                                isLoading={isLoading || isDeleting}
                                fetchAllData={fetchAllData}
                            />

                            {/* Botones */}
                            <div className="flex mt-6 justify-center gap-4">                        
                                <Button title="Crear" onClick={() => setShowCreateModal(true)} />
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Ver Plantilla */}
            {showModal && selectedTemplate && (
                <ModalContainer
                    isOpen={showModal}
                    onClose={handleCloseModal}
                >
                    <PlantillaInfo
                        formData={formData}
                        onLimpiar={handleLimpiar}
                        onDescargar={handleDescargar}
                        onClose={handleCloseModal}
                        isDocumentViewerOpen={isDocumentViewerOpen}
                        onDocumentViewerToggle={setIsDocumentViewerOpen}
                    />
                </ModalContainer>
            )}

            {/* Modal de Crear Plantilla */}
            {showCreateModal && (
                <ModalContainer
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                >
                    <CargarPlantilla
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={handleCreateSuccess}
                    />
                </ModalContainer>
            )}

            {/* Modal de Editar Plantilla */}
            {showEditModal && selectedTemplate && (
                <ModalContainer
                    isOpen={showEditModal}
                    onClose={handleCloseEditModal}
                >
                    <EditarPlantilla
                        template={selectedTemplate}
                        token={token}
                        onClose={handleCloseEditModal}
                        onSuccess={handleEditSuccess}
                    />
                </ModalContainer>
            )}
        </div>
    );
};

export default DescargarPlantilla;
