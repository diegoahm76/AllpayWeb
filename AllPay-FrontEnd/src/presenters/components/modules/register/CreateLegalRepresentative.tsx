'use client';

import React, { useEffect } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import ModalAddress from '@/presenters/components/shared/ModalAddress';
import { Button } from '@/presenters/components/ui/AnimatedButton';

// Importa el hook que contiene la lógica
import { useCreateEntity } from '@/presenters/components/modules/register/hooks/useCreateLegalRepresentative';
import ModalContainer from '../../ui/ModalContainer';

interface CreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateEntityModal: React.FC<CreateEntityModalProps> = ({ isOpen, onClose }) => {
  // Utilizamos nuestro hook, pasándole la función onClose
  const {
    dataTypeDocument,
    openModalAddress,
    setOpenModalAddress,
    formData,
    handleSave,
    handleChange,
    handleClean,
    obtenerTiposDocu,
    setFormData
  } = useCreateEntity(onClose);

  // Cada vez que se abra el modal, obtenemos los tipos de documento
  useEffect(() => {
    if (isOpen) {
      obtenerTiposDocu();
    }
  }, [isOpen, obtenerTiposDocu]);

  if (!isOpen) return null;

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
      <div className="m-auto rounded-xl p-6">
        <h2 className="mb-6 text-xl font-bold text-[#562707] text-center md:text-left">Crear Nuevo Representante Legal</h2>
      </div>

          {/* FILA: Tipo documento + Nro documento */}
          <div className="grid mb-4 gap-4 md:grid-cols-2">
        <AnimatedSelect
          label="Tipo de documento"
          name="typeDocument"
          value={formData.typeDocument.value}
          onChange={handleChange}
          options={dataTypeDocument
            .filter((doc: any) => doc.cod_tipo_documento !== 'NT')
            .map((doc) => ({
              key: doc.cod_tipo_documento,
              value: doc.cod_tipo_documento,
              title: doc.nombre
            }))}
        />
        <AnimatedInput
          label="Número de documento"
          name="document"
          value={formData.document.value}
          onChange={handleChange}
          type="number"
        />
      </div>

      {/* FILA: Primer nombre + Segundo nombre */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <AnimatedInput
          label="Primer Nombre"
          name="firstName"
          value={formData.firstName.value}
          onChange={handleChange}
          type="text"
          required={true}
        />
        <AnimatedInput
          label="Segundo Nombre"
          name="secondName"
          value={formData.secondName.value}
          onChange={handleChange}
          type="text"
          required={false}
        />
      </div>

      {/* FILA: Primer apellido + Segundo apellido */}
      <div className="mb-4  grid gap-4 md:grid-cols-2">
        <AnimatedInput
          label="Primer Apellido"
          name="firstLastName"
          value={formData.firstLastName.value}
          onChange={handleChange}
          type="text"
          required={true}
        />
        <AnimatedInput
          label="Segundo Apellido"
          name="secondLastName"
          value={formData.secondLastName.value}
          onChange={handleChange}
          type="text"
          required={false}
        />
      </div>

      {/* FILA: Email + Teléfono Celular */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <AnimatedInput
          label="Correo Electrónico"
          name="email"
          value={formData.email.value}
          onChange={handleChange}
          type="text"
        />
        <AnimatedInput
          label="Teléfono Celular"
          name="phone"
          value={formData.phone.value}
          onChange={handleChange}
          type="number"
        />
      </div>

      {/* FILA: Dirección y complemento */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <AnimatedInput
          label="Dirección"
          name="address"
          value={formData.address.value}
          onChange={handleChange}
          type="text"
          readOnly
        />
        <AnimatedInput
          label="Complemento"
          name="addressComplete"
          value={formData.addressComplete.value}
          onChange={handleChange}
          type="text"
          readOnly
        />
      </div>

      {/* Botón para abrir el ModalAddress */}
      <div className="mb-6 flex justify-center sm:justify-end">
        <Button onClick={() => setOpenModalAddress(true)} title="Generar Dirección" className="flex justify-center md:float-right" />
      </div>

      {/* BOTONES: Limpiar y Guardar */}
      <div className="mt-4 flex justify-center sm:justify-end space-x-4">
        <Button onClick={handleSave} title="Guardar" />
        <Button onClick={handleClean} title="Limpiar" />    
      </div>

      {/* ==== Aquí invocamos el ModalAddress ==== */}
      {openModalAddress && (
        <ModalAddress
          title="Generador de direcciones"
          onClose={() => setOpenModalAddress(false)}
          formData={formData}
          setFormData={setFormData}
        />
      )}

    </ModalContainer>
  );
};

export default CreateEntityModal;
