"use client";
import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import AnimatedSelect from "@/presenters/components/ui/AnimatedSelect";
import SignatureUpload from "./signatureUpload";
import { useFormUserData } from "./hooks/useFormUserData";
import useGetDepartmentsCacaotero from "@/application/address/useGetDepartmentsCacao";
import { useGetCities } from "@/application/address/useGetCities";
import { useSession } from "next-auth/react";

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

const UserDetailsForm: React.FC<UserDetailsFormProps> = ({
  userData,
  setUserData,
  selectedSignatureFile,
  handleSignatureFileChange,
  onOpenAddressModal,
  selectedDepartment: propSelectedDepartment,
  setSelectedDepartment: propSetSelectedDepartment,
  selectedMunicipioResidencia: propSelectedMunicipioResidencia,
  setSelectedMunicipioResidencia: propSetSelectedMunicipioResidencia,
}) => {
  const { data: session } = useSession();
  const valueSesion: any = session;
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  // Usar estados del padre si están disponibles, sino usar estados locales como fallback
  const [localSelectedDepartment, setLocalSelectedDepartment] = useState<number | null>(null);
  const [localSelectedMunicipioResidencia, setLocalSelectedMunicipioResidencia] = useState<string>('');
  
  // Usar props del padre si están disponibles, sino usar estados locales
  const selectedDepartment = propSelectedDepartment !== undefined ? propSelectedDepartment : localSelectedDepartment;
  const setSelectedDepartment = propSetSelectedDepartment || setLocalSelectedDepartment;
  const selectedMunicipioResidencia = propSelectedMunicipioResidencia !== undefined ? propSelectedMunicipioResidencia : localSelectedMunicipioResidencia;
  const setSelectedMunicipioResidencia = propSetSelectedMunicipioResidencia || setLocalSelectedMunicipioResidencia;

  // Refs para evitar que los useEffect pisen la selección del usuario
  const hasUserPickedMunicipio = useRef(false);
  const hasUserPickedDepartment = useRef(false);

  // Hooks para departamentos y municipios
  const { departments, fetchDepartments } = useGetDepartmentsCacaotero();
  const { cities, loading: loadingCities } = useGetCities({
    departamentoId: selectedDepartment || 0,
    token: valueSesion?.user?.tokens?.access || ''
  });

  // Si no se proporcionan las props, usamos el hook
  const {
    selectedSignatureFile: hookSelectedSignatureFile,
    handleSignatureFileChange: hookHandleSignatureFileChange
  } = useFormUserData({
    userData,
    setUserData,
    personaType: "N",
    municipioResidencia: selectedMunicipioResidencia
  });


  const finalSelectedSignatureFile = selectedSignatureFile || hookSelectedSignatureFile;
  const finalHandleSignatureFileChange = handleSignatureFileChange || hookHandleSignatureFileChange;


  // Cargar departamentos al montar el componente
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Inicializar departamento seleccionado basado en los datos del usuario (solo si el usuario no ha elegido)
  useEffect(() => {
    // Solo inicializar si NO hay selección del usuario
    if (hasUserPickedDepartment.current) return;
    
    if (userData?.departamento && departments.length > 0 && !selectedDepartment) {
      const dept = departments.find(d => d.nombre === userData.departamento);
      if (dept) {
        const deptId = parseInt(dept.cod_departamento);
        setSelectedDepartment(deptId);
      }
    }
  }, [userData?.departamento, departments, selectedDepartment]);

  // Inicializar municipio seleccionado basado en los datos del usuario (solo si el usuario no ha elegido)
  useEffect(() => {
    // Solo inicializar si NO hay selección del usuario
    if (hasUserPickedMunicipio.current) return;
    
    if (!selectedMunicipioResidencia && userData?.ciudad && cities.length > 0 && selectedDepartment) {
      const city = cities.find(c => c.nombre === userData.ciudad);
      if (city) {
        setSelectedMunicipioResidencia(String(city.cod_municipio)); // forzar string
      }
    }
  }, [userData?.ciudad, cities, selectedDepartment, selectedMunicipioResidencia]);

  // Manejar cambio de departamento
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;                            // string
    const deptId = value ? parseInt(value, 10) : null;       // number | null para el hook
    
    // Marcar que el usuario ha seleccionado un departamento
    hasUserPickedDepartment.current = true;
    setSelectedDepartment(deptId);

    // Si cambiaste de depto, permite re-inicializar municipio:
    hasUserPickedMunicipio.current = false; // opcional: permitir re-inicializar con el nuevo depto
    setSelectedMunicipioResidencia('');     // limpia municipio

    // Actualiza nombre del depto en userData
    const dept = departments.find(d => String(d.cod_departamento) === value);
    if (dept) {
      setUserData({ ...userData, departamento: dept.nombre });
    }
  };

  // Manejar cambio de municipio de residencia
  const handleMunicipioResidenciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    hasUserPickedMunicipio.current = true; // 👈 evita reinicializaciones posteriores
    setSelectedMunicipioResidencia(value);

    if (value) {
      const city = cities.find(c => String(c.cod_municipio) === value); // 👈 string
      if (city) {
        setUserData({ ...userData, ciudad: city.nombre });
      }
    }
  };


  // Obtener opciones de departamentos
  const getDepartmentOptions = () => {
    return departments
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((dept) => ({
        key: String(dept.cod_departamento),
        value: String(dept.cod_departamento), // 👈 string
        title: dept.nombre
      }));
  };

  // Obtener opciones de municipios
  const getCityOptions = () => {
    if (loadingCities) {
      return [{ key: '', value: '', title: 'Cargando...' }];
    }
    return cities
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(city => ({
        key: String(city.cod_municipio),
        value: String(city.cod_municipio), // 👈 string
        title: city.nombre
      }));
  };

  return (
    <>

      <div className={`grid md:grid-cols-2 gap-4 mt-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
        <AnimatedInput
          label="Primer Nombre"
          name="primer_nombre"
          value={userData.primerNombre}
          onChange={(e) =>
            setUserData({ ...userData, primerNombre: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />
        <AnimatedInput
          label="Segundo Nombre"
          name="segundo_nombre"
          value={userData.segundoNombre}
          onChange={(e) =>
            setUserData({ ...userData, segundoNombre: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />
        <AnimatedInput
          label="Primer Apellido"
          name="primer_apellido"
          value={userData.primerApellido}
          onChange={(e) =>
            setUserData({ ...userData, primerApellido: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />
        <AnimatedInput
          label="Segundo Apellido"
          name="segundo_apellido"
          value={userData.segundoApellido}
          onChange={(e) =>
            setUserData({ ...userData, segundoApellido: e.target.value })
          }
          readOnly
          darkMode={isDarkMode}
        />
      </div>
      <div className={`grid md:grid-cols-3 gap-4 mt-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
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
          label="País"
          name="pais"
          value={userData.pais}
          onChange={(e) =>
            setUserData({ ...userData, pais: e.target.value })
          }
          readOnly
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
          label="Municipio de Residencia"
          name="municipio_residencia"
          value={selectedMunicipioResidencia}
          onChange={handleMunicipioResidenciaChange}
          options={getCityOptions()}
          disabled={!selectedDepartment}
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
            value={userData.direccion }
            onChange={(e) =>
              setUserData({ ...userData, direccion: e.target.value })
            }
            readOnly
            darkMode={isDarkMode}
          />
        </div>
      </div>

      <SignatureUpload
        userData={userData}
        selectedFile={finalSelectedSignatureFile}
        handleFileChange={finalHandleSignatureFileChange}
      />
    </>
  );
};

export default UserDetailsForm;
