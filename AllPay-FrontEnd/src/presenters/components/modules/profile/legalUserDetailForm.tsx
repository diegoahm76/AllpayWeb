"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from 'next-auth/react';
import { useTheme } from "next-themes";
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import SignatureUpload from "./signatureUpload";
import { useFormUserData } from "./hooks/useFormUserData";
import AnimatedSelect from "@/presenters/components/ui/AnimatedSelect";
import { useGetCities } from "@/application/address/useGetCities";
import useGetDepartments from "@/application/address/useGetDepartments";

interface UserDetailsFormProps {
  userData: any;
  setUserData: (data: any) => void;
  selectedSignatureFile?: File | null;
  handleSignatureFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAddressModal: () => void;
  selectedDepartment?: number | null;
  setSelectedDepartment?: (value: number | null) => void;
  selectedMunicipioResidencia?: string;
  setSelectedMunicipioResidencia?: (value: string) => void;
}

const LegalDetailsForm: React.FC<UserDetailsFormProps> = ({ 
  userData, 
  setUserData,
  selectedSignatureFile,
  handleSignatureFileChange,
  onOpenAddressModal,
  selectedDepartment: propSelectedDepartment,
  setSelectedDepartment: propSetSelectedDepartment,
  selectedMunicipioResidencia: propSelectedMunicipioResidencia,
  setSelectedMunicipioResidencia: propSetSelectedMunicipioResidencia
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  // Estados locales como fallback cuando no vienen desde el padre
  const [localSelectedDepartment, setLocalSelectedDepartment] = useState<number | null>(null);
  const [localSelectedMunicipioResidencia, setLocalSelectedMunicipioResidencia] = useState<string>('');

  // Usar props del padre si están disponibles, sino usar estados locales
  const selectedDepartment = propSelectedDepartment !== undefined ? propSelectedDepartment : localSelectedDepartment;
  const setSelectedDepartment = propSetSelectedDepartment || setLocalSelectedDepartment;
  const selectedMunicipioResidencia = propSelectedMunicipioResidencia !== undefined ? propSelectedMunicipioResidencia : localSelectedMunicipioResidencia;
  const setSelectedMunicipioResidencia = propSetSelectedMunicipioResidencia || setLocalSelectedMunicipioResidencia;
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  const { departments, fetchDepartments } = useGetDepartments();
  const { cities, loading: loadingCities } = useGetCities({
    departamentoId: selectedDepartment || 0,
    token: token
  }); 
  
  // Refs para evitar sobreescrituras de la selección del usuario
  const hasUserPickedMunicipio = useRef(false);
  const hasUserPickedDepartment = useRef(false);
  // Si no se proporcionan las props, usamos el hook
  const {
    selectedSignatureFile: hookSelectedSignatureFile,
    handleSignatureFileChange: hookHandleSignatureFileChange
  } = useFormUserData({
    userData,
    setUserData,
    personaType: "J"
  });

  const finalSelectedSignatureFile = selectedSignatureFile || hookSelectedSignatureFile;
  const finalHandleSignatureFileChange = handleSignatureFileChange || hookHandleSignatureFileChange;

  // Cargar departamentos al montar
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Inicializar departamento seleccionado basado en datos del usuario (si el usuario no ha elegido)
  useEffect(() => {
    if (hasUserPickedDepartment.current) return;
    if (departments.length > 0 && !selectedDepartment) {
      // Priorizar código si existe en userData
      const deptCode = userData?.cod_departamento_residencia || userData?.cod_departamento_notificacion;

      if (deptCode) {
        const deptId = parseInt(String(deptCode), 10);
        setSelectedDepartment(deptId);
        const found = departments.find((d: any) => parseInt(String(d.cod_departamento), 10) === deptId);
        if (found) {
          setUserData({ ...userData, departamento: found.nombre });
        }
        return;
      }
      // Fallback por nombre
      if (userData?.departamento) {
        const dept = departments.find((d: any) => d.nombre === userData.departamento);
        if (dept) {
          const deptId = parseInt(dept.cod_departamento, 10);
          setSelectedDepartment(deptId);
        }
      }
    }
  }, [userData?.departamento, departments, selectedDepartment]);

  // Inicializar municipio seleccionado basado en datos del usuario (si el usuario no ha elegido)
  useEffect(() => {
    if (hasUserPickedMunicipio.current) return;
    if (!selectedMunicipioResidencia && cities.length > 0 && selectedDepartment) {
      // Priorizar código si existe en userData
      const muniCode = userData?.cod_municipio_residencia || userData?.cod_municipio_notificacion_nal || userData?.cod_municipio_expedicion_id;
     
      if (muniCode) {
        const muniCodeStr = String(muniCode);
        setSelectedMunicipioResidencia(muniCodeStr);
        const city = cities.find((c: any) => String(c.cod_municipio) === muniCodeStr);
        if (city) {
          setUserData({ ...userData, ciudad: city.nombre });
        }
        return;
      }
      // Fallback por nombre
      if (userData?.ciudad) {
        const city = cities.find((c: any) => c.nombre === userData.ciudad);
        if (city) {
          setSelectedMunicipioResidencia(String(city.cod_municipio));
        }
      }
    }
  }, [userData?.ciudad, cities, selectedDepartment, selectedMunicipioResidencia]);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;                          // string
    const deptId = value ? parseInt(value, 10) : null;    // number | null
    
    hasUserPickedDepartment.current = true;
    setSelectedDepartment(deptId);

    // Al cambiar depto, permitir re-inicializar municipio y limpiar selección
    hasUserPickedMunicipio.current = false;
    setSelectedMunicipioResidencia('');

    // Actualiza el nombre del departamento en userData
    const dept = departments.find((d: any) => String(d.cod_departamento) === value);
    if (dept) {
  
      setUserData({ 
        ...userData, 
        departamento: dept.nombre,
        cod_departamento_residencia: String(dept.cod_departamento)
      });
    }
  };

  const handleMunicipioResidenciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    hasUserPickedMunicipio.current = true;
    setSelectedMunicipioResidencia(value);

    if (value) {
      const city = cities.find((c: any) => String(c.cod_municipio) === value);
      if (city) {
 
        setUserData({ 
          ...userData, 
          ciudad: city.nombre,
          cod_municipio_residencia: String(city.cod_municipio),
          cod_municipio_notificacion_nal: String(city.cod_municipio)
        });
      }
    }
  };

  const getDepartmentOptions = () => {
    return departments
      .slice()
      .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
      .map((dept: { cod_departamento: string; nombre: string }) => ({
        key: String(dept.cod_departamento),
        value: String(dept.cod_departamento),
        title: dept.nombre
      }));
  };

  const getCityOptions = () => {
    if (loadingCities) {
      return [{ key: '', value: '', title: 'Cargando...' }];
    }
    return cities
      .slice()
      .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
      .map((city: any) => ({
        key: String(city.cod_municipio),
        value: String(city.cod_municipio),
        title: city.nombre
      }));
  };

  return (
    <>

      <h2 className={`text-md mb-6 font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Datos legales</h2>
      
      <div className={`grid md:grid-cols-2 gap-4 mb-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
        <AnimatedInput
          label="Razón social"
          name="primer_nombre"
          value={userData.razon_social}
          onChange={(e) =>
            setUserData({ ...userData, primerNombre: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />
        <AnimatedInput
          label="Nombre comercial"
          name="segundo_nombre"
          value={userData.nombre_comercial}
          onChange={(e) =>
            setUserData({ ...userData, segundoNombre: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />
      
        <AnimatedInput
          label="Naturaleza de la empresa"
          name="segundo_apellido"
          value={userData.nombre_naturaleza_empresa}
          onChange={(e) =>
            setUserData({ ...userData, segundoApellido: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />

        <div 
          onClick={onOpenAddressModal}
          className="cursor-pointer"
          title="Haz clic para editar la dirección"
        >
          <AnimatedInput
            label="Dirección de Residencia"
            name="direccion_residencia"
            value={userData.direccion || userData.direccion_notificaciones}
            onChange={(e) =>
              setUserData({ ...userData, direccion: e.target.value })
            }
            readOnly
            darkMode={isDarkMode}
          />
        </div>
      </div>

      <div className={`grid md:grid-cols-2 gap-4 mb-10 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
        <AnimatedInput
          label="Número de Teléfono"
          name="telefono"
          value={userData.telefono}
          onChange={(e) =>
            setUserData({ ...userData, telefono: e.target.value })
          }
          type="number"
          darkMode={isDarkMode}
        />
      
        <AnimatedInput
          label="Correo Electrónico"
          name="email"
          value={userData.email}
          onChange={(e) =>
            setUserData({ ...userData, email: e.target.value })
          }
          darkMode={isDarkMode}
        />

        <AnimatedSelect
          label="Departamento"
          name="departamento"
          value={selectedDepartment != null ? String(selectedDepartment).padStart(2, '0') : ''}
          onChange={handleDepartmentChange}
          options={getDepartmentOptions()}
          darkMode={isDarkMode}
        />

        <AnimatedSelect
          label="Municipio de Residencia"
          name="municipio_residencia"
          value={selectedMunicipioResidencia}
          onChange={handleMunicipioResidenciaChange}
          options={getCityOptions()}
          disabled={!selectedDepartment}
          darkMode={isDarkMode}
        />

      </div>

      <h2 className={`text-md mb-6 font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>Datos representante legal</h2>

      <div className={`grid md:grid-cols-2 gap-4 mt-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
        <AnimatedInput
          label="Primer Nombre"
          name="rep_primer_nombre"
          value={userData.representanteLegal?.primerNombre || ''}
          onChange={(e) =>
            setUserData({
              ...userData,
              representanteLegal: {
                ...userData.representanteLegal,
                primerNombre: e.target.value,
              },
            })
          }
          readOnly
          darkMode={isDarkMode}
        />
         <AnimatedInput
          label="Segundo Nombre"
          name="rep_segundo_nombre"
          value={userData.representanteLegal?.segundoNombre || ''}
          onChange={(e) =>
            setUserData({
              ...userData,
              representanteLegal: {
                ...userData.representanteLegal,
                segundoNombre: e.target.value,
              },
            })
          }
          readOnly
          darkMode={isDarkMode}
        />
        <AnimatedInput
          label="Primer Apellido"
          name="rep_primer_apellido"
          value={userData.representanteLegal?.primerApellido || ''}
          onChange={(e) =>
            setUserData({
              ...userData,
              representanteLegal: {
                ...userData.representanteLegal,
                primerApellido: e.target.value,
              },
            })
          }
          readOnly
          darkMode={isDarkMode}
        />
        <AnimatedInput
          label="Segundo Apellido"
          name="rep_segundo_apellido"
          value={userData.representanteLegal?.segundoApellido || ''}
          onChange={(e) =>
            setUserData({
              ...userData,
              representanteLegal: {
                ...userData.representanteLegal,
                segundoApellido: e.target.value,
              },
            })
          }
          readOnly
          darkMode={isDarkMode}
        />
      </div>
    
      <div className={`grid md:grid-cols-3 gap-4 mt-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
        <AnimatedInput
          label="Número de Teléfono"
          name="telefono"
          value={userData.representanteLegal?.telefono}
          onChange={(e) =>
            setUserData({ ...userData, representanteLegal: {
              ...userData.representanteLegal,
              telefono: e.target.value,
            },
           })
          }
          type="number"
          readOnly
          darkMode={isDarkMode}
        />
      
        <AnimatedInput
          label="Correo Electrónico"
          name="email"
          value={userData.representanteLegal?.email}
          onChange={(e) =>
            setUserData({ ...userData, representanteLegal: {
              ...userData.representanteLegal,
              email: e.target.value,
            },
           })
          }
          readOnly
          darkMode={isDarkMode}
        />

        <AnimatedInput
          label="Dirección de Residencia"
          name="direccion_residencia"
          value={userData.representanteLegal?.direccion || userData.direccion_notificaciones  || 'ND'}
          onChange={(e) =>
            setUserData({ ...userData, representanteLegal: {
              ...userData.representanteLegal,
              direccion: e.target.value,
            },
           })
          }
          readOnly
          darkMode={isDarkMode}
        />

        
      </div>

      <SignatureUpload
        userData={userData}
        selectedFile={finalSelectedSignatureFile}
        handleFileChange={finalHandleSignatureFileChange}
        inputId="signatureInputLegal"
      />

    </>
  );
};

export default LegalDetailsForm;
