import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getCollectorInvoices, CollectorInvoice } from '@/adapters/recaudadores/facturas/collector.invoices.internal';
import { useSession } from 'next-auth/react';

interface SearchFilters {
    direccion_contacto_recaudador?: string;
    telefono_contacto_recaudador?: string;
    primer_nombre?: string;
    segundo_nombre?: string;
    primer_apellido?: string;
    segundo_apellido?: string;
    nombre_persona_recaudador?: string;
    email_contacto_recaudador?: string;
    tipoDocumento?: string;
    documentoIdentificacion?: string;
    razonSocial?: string;
    departamento?: string;
    municipio?: string;
    email?: string;
    direccion?: string;
    telefono?: string;
    nroFacturaUnica?: string;
    fechaInicio?: string;
    fechaFin?: string;
    liquidadas?: string; // '', 'true', 'false'
}

const useSearchLiquidation = () => {
    const { data: session } = useSession();
    const [formData, setFormData] = useState<SearchFilters>({
        direccion_contacto_recaudador: '',
        telefono_contacto_recaudador: '',
        primer_nombre: '',
        segundo_nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        nombre_persona_recaudador: '',
        email_contacto_recaudador: '',
        tipoDocumento: '',
        documentoIdentificacion: '',
        razonSocial: '',
        departamento: '',
        municipio: '',
        email: '',
        direccion: '',
        telefono: '',
        nroFacturaUnica: '',
        fechaInicio: '',
        fechaFin: '',
        liquidadas: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [invoices, setInvoices] = useState<CollectorInvoice[]>([]);

    const clearForm = useCallback(() => {
        setFormData({
            direccion_contacto_recaudador: '',
            telefono_contacto_recaudador: '',
            primer_nombre: '',
            segundo_nombre: '',
            primer_apellido: '',
            segundo_apellido: '',
            nombre_persona_recaudador: '',
            email_contacto_recaudador: '',
            tipoDocumento: '',
            documentoIdentificacion: '',
            razonSocial: '',
            departamento: '',
            municipio: '',
            email: '',
            direccion: '',
            telefono: '',
            nroFacturaUnica: '',
            fechaInicio: '',
            fechaFin: '',
            liquidadas: ''
        });
        setValidationErrors({});
        setError(null);
        setInvoices([]);
    }, []);

    const validateForm = useCallback(() => {
        const errors: { [key: string]: string } = {};

        if (formData.telefono_contacto_recaudador && !/^\d{10}$/.test(formData.telefono_contacto_recaudador)) {
            errors.telefono_contacto_recaudador = 'El teléfono debe tener 10 dígitos';
        }

        if (formData.email_contacto_recaudador &&
            !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email_contacto_recaudador)) {
            errors.email_contacto_recaudador = 'Email inválido';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    const updateFormField = useCallback((name: string, value: string) => {
        setFormData(prev => {
            if (prev[name as keyof SearchFilters] === value) {
                return prev;
            }
            return {
                ...prev,
                [name]: value
            };
        });
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateFormField(name, value);
    }, [updateFormField]);

    const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateFormField(name, value);
    }, [updateFormField]);

    const handleConsultar = useCallback(async () => {
        if (!validateForm()) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                text: 'Por favor, corrija los errores en el formulario',
                confirmButtonColor: '#4D750F'
            });
            return;
        }

        const token = session?.user?.token;
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Error de autenticación',
                text: 'No se encontró el token de acceso',
                confirmButtonColor: '#4D750F'
            });
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const params = {
                page: currentPage,
                page_size: 10,
                // Parámetros de contacto del recaudador
                ...(formData.direccion_contacto_recaudador && { direccion_contacto_recaudador: formData.direccion_contacto_recaudador }),
                ...(formData.telefono_contacto_recaudador && { telefono_contacto_recaudador: formData.telefono_contacto_recaudador }),
                ...(formData.email_contacto_recaudador && { email_contacto_recaudador: formData.email_contacto_recaudador }),
                // Parámetros del proveedor
                ...(formData.tipoDocumento && { tipo_documento_proveedor: formData.tipoDocumento }),
                ...(formData.documentoIdentificacion && { numero_documento_proveedor: formData.documentoIdentificacion }),
                ...(formData.razonSocial && { nombre_proveedor: formData.razonSocial }),
                // Parámetros de ubicación
                ...(formData.departamento && { id_departamento_cacao: formData.departamento }),
                ...(formData.municipio && { id_municipio_cacao: formData.municipio }),
                // Parámetros de factura
                ...(formData.nroFacturaUnica && { nro_factura_unica: parseInt(formData.nroFacturaUnica, 10) }),
                ...(formData.fechaInicio && { fecha_desde: formData.fechaInicio }),
                ...(formData.fechaFin && { fecha_hasta: formData.fechaFin })
            };

            const response = await getCollectorInvoices(params, token);

            setInvoices(response.data);
            setTotalPages(response.total_pages);

            if (response.data.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin resultados',
                    text: 'No se encontraron facturas con los filtros especificados',
                    confirmButtonColor: '#4D750F'
                });
            }

        } catch (error: any) {
            setError(error?.message || 'Error al consultar las facturas');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.message || 'Error al consultar las facturas',
                confirmButtonColor: '#4D750F'
            });
        } finally {
            setIsLoading(false);
        }
    }, [formData, currentPage, validateForm, session?.user?.token]);

    const handleSalir = useCallback(() => {
        clearForm();
    }, [clearForm]);

    return {
        formData,
        currentPage,
        totalPages,
        isLoading,
        error,
        validationErrors,
        invoices,
        handleInputChange,
        handleSelectChange,
        handleConsultar,
        handleSalir,
        setCurrentPage,
        clearForm,
        updateFormField
    };
};

export default useSearchLiquidation;
