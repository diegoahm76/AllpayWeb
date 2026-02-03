import { useTheme } from "next-themes";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
import { useState, useEffect, useMemo, memo } from "react";
import ModalContainer from "@/presenters/components/ui/ModalContainer";

// Componente memoizado para evitar re-renders innecesarios del DocViewer
const MemoizedDocViewer = memo(({ documents }: { documents: any[] }) => (
    <DocViewer
        pluginRenderers={DocViewerRenderers}
        documents={documents}
        style={{
            height: '100%',
            width: '100%'
        }}
    />
));

MemoizedDocViewer.displayName = 'MemoizedDocViewer';

interface PlantillaInfoProps {
    formData: {
        numeroPlantilla: string;
        extension: string;
        descripcion: string;
        doc_plantilla?: string;  // Cambiamos a doc_plantilla que es el nombre correcto
    };
    onLimpiar: () => void;
    onDescargar: () => void;
    onClose: () => void;
    isDocumentViewerOpen: boolean;
    onDocumentViewerToggle: (isOpen: boolean) => void;
}

export const PlantillaInfo = ({ formData, onDescargar, onClose, isDocumentViewerOpen, onDocumentViewerToggle }: PlantillaInfoProps) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [documentUrl, setDocumentUrl] = useState<string>('');
    const [cachedDocument, setCachedDocument] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    useEffect(() => {
        // Usamos doc_plantilla directamente
        const url = formData.doc_plantilla;
        if (url && url !== documentUrl) {
            setDocumentUrl(url);
            
            // Crear el documento cacheado solo si es diferente
            const fileExtension = url.split('.').pop()?.toLowerCase();
            let fileType = 'docx'; // default
            
            if (fileExtension === 'pdf') {
                fileType = 'pdf';
            } else if (fileExtension === 'doc') {
                fileType = 'doc';
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                fileType = 'xlsx';
            }
            
            setCachedDocument([{ uri: url, fileType }]);
        }
    }, [formData.doc_plantilla, documentUrl]);

    // Memoizar el documento para evitar recargas innecesarias
    const memoizedDocument = useMemo(() => {
        return cachedDocument.length > 0 ? cachedDocument : null;
    }, [cachedDocument]);

    const handleVerPlantilla = () => {
        if (formData.doc_plantilla) {
            onDocumentViewerToggle(true);
        } else {
            onDescargar();
        }
    };

    return (
        <>
            <div className="w-full p-6">
                <h2 className={`text-2xl text-center font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    Información de la Plantilla
                </h2>

                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatedInput
                        label="Número de Plantilla"
                        name="numeroPlantilla"
                        value={formData.numeroPlantilla}
                        readOnly
                        type="text"
                        darkMode={isDarkMode}
                    />
                    <AnimatedInput
                        label="Extensión de la Plantilla"
                        name="extension"
                        value={formData.extension}
                        readOnly
                        type="text"
                        darkMode={isDarkMode}
                    />
                </div>

                <div className="w-full mt-6">
                    <AnimatedInput
                        label="Descripción"
                        name="descripcion"
                        value={formData.descripcion}
                        readOnly
                        type="text"
                        darkMode={isDarkMode}
                    />
                </div>

                {/* Botones */}
                <div className="flex justify-center gap-4 mt-6">
                    <Button onClick={handleVerPlantilla} title="Ver plantilla" />
                    <Button onClick={onClose} title="Cerrar" />
                </div>
            </div>

            {/* Modal para mostrar el documento - Mantenido montado para evitar recargas */}
            <ModalContainer
                isOpen={isDocumentViewerOpen}
                onClose={() => onDocumentViewerToggle(false)}
                size="3xl"
            >
                <div 
                    className={`h-[90vh] w-full ${isDocumentViewerOpen ? '' : 'hidden'}`}
                >
                    {memoizedDocument ? (
                        <MemoizedDocViewer documents={memoizedDocument} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No se pudo cargar el documento</p>
                        </div>
                    )}
                </div>
            </ModalContainer>
        </>
    );
}; 