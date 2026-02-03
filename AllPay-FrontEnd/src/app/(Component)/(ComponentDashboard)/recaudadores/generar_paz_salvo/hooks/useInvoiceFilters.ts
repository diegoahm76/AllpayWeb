'use client';

import { useState, useCallback } from 'react';

const initialFormState = {
  // campos que ya usas en GeneratePeace
  pazSalvo: '',
  fechaGeneracion: '',
  tipoPazSalvo: '',
  puertoExportacion: '',
  tipoDocumento: '',
  documentoIdentificacion: '',
  departamento: '',
  municipio: '',
  razonSocial: '',
  nroFacturaUnica: '',
  fechaInicio: '',
  fechaFin: ''
};

export default function useInvoiceFilters() {
  const [formData, setFormData] = useState(initialFormState);

  const updateFormField = useCallback(
    (name: string, value: string) =>
      setFormData(prev => ({ ...prev, [name]: value })),
    []
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateFormField(e.target.name, e.target.value),
    [updateFormField]
  );

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      updateFormField(e.target.name, e.target.value),
    [updateFormField]
  );

  const clearForm = useCallback(() => setFormData(initialFormState), []);

  return { formData, handleInputChange, handleSelectChange, clearForm };
}
