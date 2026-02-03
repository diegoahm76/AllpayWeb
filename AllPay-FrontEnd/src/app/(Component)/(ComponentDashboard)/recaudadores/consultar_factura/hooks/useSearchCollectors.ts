import { useState, useCallback } from 'react';
import { SearchCollector, SearchCollectorFilters } from '@/domain/models/user/user.collector';
import { searchCollectors } from '@/adapters/user/collector/collector.search';

const initialFormState: SearchCollectorFilters = {
  tipoDocumento: '',
  documentoIdentificacion: '',
  razonSocial: '',
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  departamento: '',
  municipio: '',
  nroFacturaUnica: '',
  fechaInicio: '',
  fechaFin: '',
  email: '',
  direccion: '',
  telefono: '',
  tipoComprador: []
};

const useSearchCollectors = () => {
  const [formData, setFormData] = useState<SearchCollectorFilters>(initialFormState);
  const [currentPage, setCurrentPage] = useState(1);
  const [collectors, setCollectors] = useState<SearchCollector[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const clearForm = useCallback(() => {
    setFormData(initialFormState);
    setValidationErrors({});
    setError(null);
  }, []);

  const validateForm = useCallback(() => {
    const errors: { [key: string]: string } = {};

    if (!formData.tipoDocumento && false) {
      errors.tipoDocumento = 'El tipo de documento es requerido';
    }
    if (!formData.documentoIdentificacion && false) {
      errors.documentoIdentificacion = 'El documento de identificación es requerido';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const updateFormField = useCallback((name: string, value: string | string[]) => {
    setFormData(prev => {
      if (prev[name as keyof SearchCollectorFilters] === value) {
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

  // Ejemplo de función para "Buscar" recaudadores
  const handleBuscar = useCallback(async (token: string) => {
    if (!validateForm()) {
      return null;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await searchCollectors(token, formData, currentPage);
      setCollectors(response.data);
      setTotalPages(response.total_pages);
      return response;
    } catch (error: any) {
      setError(error?.message || 'Error al buscar recaudadores');
      console.error('Error searching collectors:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formData, currentPage, validateForm]);

  const handleConsultar = useCallback(() => {
    console.log('Consultar clicked');
  }, []);

  const handleSalir = useCallback(() => {
    console.log('Salir clicked');
  }, []);

  return {
    formData,
    currentPage,
    collectors,
    totalPages,
    isLoading,
    error,
    validationErrors,
    handleInputChange,
    handleSelectChange,
    handleBuscar,
    handleConsultar,
    handleSalir,
    setCurrentPage,
    clearForm,
    updateFormField
  };
};

export default useSearchCollectors;
