"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import AnimatedSelect from "@/presenters/components/ui/AnimatedSelect";
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import { useTipoDocumento } from "@/app/(Component)/(ComponentDashboard)/seguridad/crear_usuario/hooks/useTipoDocumento";
import { useTheme } from 'next-themes';

interface FirstStepProps {
  typePerson: { value: string; error: boolean };
  setTypePerson: (value: { value: string; error: boolean }) => void;
  dataTypePerson: any[];
  document: { value: string; error: boolean };
  setDocument: (value: { value: string; error: boolean }) => void;
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  buscarPersona: () => void;
  loading: boolean;
  isExpanded: boolean;
}

const FirstStep: React.FC<FirstStepProps> = ({
  typePerson,
  setTypePerson,
  dataTypePerson,
  document,
  loading,
  isExpanded,
  handleSelectChange,
  buscarPersona
}) => {

  const { tiposDocumento, loading: loadingTiposDocumento } = useTipoDocumento();
  const [tipoDocumento, setTipoDocumento] = useState({ value: '', error: false });
  const { theme } = useTheme();

  // Función para detectar y establecer el tipo de persona basado en la URL
  const detectAndSetPersonType = () => {
    if (dataTypePerson.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.has('natural')) {
        setTypePerson({ value: 'N', error: false });
      } else if (urlParams.has('juridico')) {
        setTypePerson({ value: 'J', error: false });
      } else {
        // Si no hay parámetros específicos, limpiar la selección
        setTypePerson({ value: '', error: false });
      }
    }
  };

  // Efecto para detectar parámetros de URL iniciales y cambios
  useEffect(() => {
    detectAndSetPersonType();
  }, [dataTypePerson, setTypePerson]);

  // Efecto para detectar cambios en la URL
  useEffect(() => {
    const handlePopState = () => {
      detectAndSetPersonType();
    };

    // Detectar cambios en la URL usando popstate
    window.addEventListener('popstate', handlePopState);

    // También detectar cambios manuales en la URL
    const handleUrlChange = () => {
      detectAndSetPersonType();
    };

    // Crear un observer para detectar cambios en la URL
    let currentUrl = window.location.href;
    const urlChangeInterval = setInterval(() => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        handleUrlChange();
      }
    }, 100);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(urlChangeInterval);
    };
  }, [dataTypePerson, setTypePerson]);

  const handleTipoDocumentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoDocumento({ value: e.target.value, error: false });
    handleSelectChange(e);
  };

  const filteredDocumentOptions = useMemo(() => {
    if (typePerson.value === "J") {
      return tiposDocumento.filter((doc) => doc.cod_tipo_documento === "NT");
    } else if (typePerson.value === "N") {
      return tiposDocumento.filter((doc) => doc.cod_tipo_documento !== "NT");
    } else {
      return tiposDocumento;
    }
  }, [typePerson.value, tiposDocumento]);

  const documentOptions = filteredDocumentOptions.map((doc, index) => ({
    key: index,
    value: doc.cod_tipo_documento,
    title: doc.nombre
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarPersona();
  };

  return (
    <div className="p-1">
      <div
        className={`p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'} rounded-2xl m-auto w-full shadow-lg transition-all duration-700 ease-in-out ${isExpanded ? "max-w-md lg:max-w-full " : "max-w-md"
          }`}
      >
        <form onSubmit={handleSubmit} className={`${theme === 'dark' ? 'bg-[#260f00] text-white ' : 'bg-white'} py-4 sm:px-4 rounded-xl relative`}>
          <button
            onClick={() => window.location.href = '/'}
            type="button"
            className={`${theme === 'dark' ? 'text-white hover:text-red-300' : 'text-[rgb(var(--brown))] hover:text-red-700'} absolute top-2 right-4 text-2xl`}
          >
            &times;
          </button>

          <div className="m-6">
            <div
              className={`gap-4 transition-all ${isExpanded ? "flex flex-col lg:grid lg:grid-cols-3" : "flex flex-col"
                }`}
            >
              {/* Tipo de Persona */}
              <div>
                <AnimatedSelect
                  label="Tipo de persona"
                  name="tipoPersona"
                  value={typePerson.value}
                  onChange={handleSelectChange}
                  darkMode={theme === 'dark'}
                  options={dataTypePerson.map((value: any, index: number) => ({
                    key: index,
                    value: value[0],
                    title: value[1]
                  }))}
                  error={typePerson.error}
                />
              </div>

              {/* Tipo de Documento */}
              <div>
                <AnimatedSelect
                  label="Tipo de documento"
                  name="tipoDocumento"
                  value={tipoDocumento.value}
                  onChange={handleTipoDocumentoChange}
                  darkMode={theme === 'dark'}
                  options={documentOptions}
                  error={tipoDocumento.error}
                  disabled={loadingTiposDocumento}
                />
              </div>

              {/* Documento */}
              <div>
                <AnimatedInput
                  type="number"
                  name="document"
                  label="Número de documento"
                  value={document.value}
                  onChange={handleSelectChange}
                  darkMode={theme === 'dark'}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between mt-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
              {typePerson.value === "J" ? (
                <h3 className="mr-auto">NIT sin dígito de verificación</h3>
              ) : (
                <div className="flex-1" />
              )}

              <Button onClick={buscarPersona} loading={loading} title="Buscar" />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FirstStep;
