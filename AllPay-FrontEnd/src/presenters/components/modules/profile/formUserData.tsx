"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useFormUserData } from "@/presenters/components/modules/profile/hooks/useFormUserData";
import ProfilePhotoUpload from "@/presenters/components/modules/profile/profilePhotoUpload";
import UserDetailsForm from "@/presenters/components/modules/profile/userDetailForm";
import LegalDetailsForm from "@/presenters/components/modules/profile/legalUserDetailForm";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { useRouter } from "next/navigation";

interface FormUserDataProps {
  userData: any;
  setUserData: (data: any) => void;
  personaType: "N" | "J" | "";
  isLoading: boolean;
  onOpenAddressModal: () => void;
  selectedDepartment?: number | null;
  setSelectedDepartment?: (value: number | null) => void;
  selectedMunicipioResidencia?: string;
  setSelectedMunicipioResidencia?: (value: string) => void;
}

const FormUserData: React.FC<FormUserDataProps> = ({
  userData,
  setUserData,
  personaType,
  isLoading,
  onOpenAddressModal,
  selectedDepartment,
  setSelectedDepartment,
  selectedMunicipioResidencia,
  setSelectedMunicipioResidencia,
}) => {

  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const { 
    selectedFile, 
    selectedSignatureFile, 
    tiposCompradorSeleccionados,
    handleFileChange, 
    handleSignatureFileChange, 
    handleTipoCompradorChange,
    handleUpdate 
  } = useFormUserData({
    userData,
    setUserData,
    personaType,
    municipioResidencia: selectedMunicipioResidencia
  });

  return (
    <div className={`p-6 w-full rounded-xl m-auto ${isDarkMode ? 'bg-[#78390e]' : 'bg-slate-200'}`}>
      <div className={`rounded-xl p-6 shadow-md pt-[55px] relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
        <button
          onClick={() => router.push('/')}
          className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
        >
          &times;
        </button>

        <ProfilePhotoUpload
          userData={userData}
          selectedFile={selectedFile}
          handleFileChange={handleFileChange}
        />

        {isLoading ? (
          <p className={`text-center ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Cargando datos...
          </p>
        ) : personaType === "N" ? (
          <UserDetailsForm
            userData={userData}
            setUserData={setUserData}
            selectedSignatureFile={selectedSignatureFile}
            handleSignatureFileChange={handleSignatureFileChange}
            onOpenAddressModal={onOpenAddressModal}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            selectedMunicipioResidencia={selectedMunicipioResidencia}
            setSelectedMunicipioResidencia={setSelectedMunicipioResidencia}
          />
        ) : personaType === "J" ? (
          <LegalDetailsForm 
            userData={userData} 
            setUserData={setUserData}
            selectedSignatureFile={selectedSignatureFile}
            handleSignatureFileChange={handleSignatureFileChange}
            onOpenAddressModal={onOpenAddressModal}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            selectedMunicipioResidencia={selectedMunicipioResidencia}
            setSelectedMunicipioResidencia={setSelectedMunicipioResidencia}
          />
        ) : null}

        {/* Sección de Tipos de Comprador */}
        {(userData?.cod_tipo_comprador || userData?.persona?.cod_tipo_comprador) && (
          <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-[#260f00]' : 'bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-8">
              {/* Título */}
              <div className="text-center sm:text-left">
                <h3 className={`text-lg font-bold uppercase ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                  Tipo de Comprador
                </h3>
              </div>

              {/* Checkboxes en línea horizontal */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Procesador */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tipo_procesador_profile"
                    value="T"
                    checked={tiposCompradorSeleccionados.includes('T')}
                    onChange={handleTipoCompradorChange}
                    className={`h-5 w-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-500 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}
                  />
                  <label 
                    htmlFor="tipo_procesador_profile" 
                    className={`text-sm font-bold uppercase ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                  >
                    Procesador
                  </label>
                </div>

                {/* Exportador */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tipo_exportador_profile"
                    value="E"
                    checked={tiposCompradorSeleccionados.includes('E')}
                    onChange={handleTipoCompradorChange}
                    className={`h-5 w-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-500 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}
                  />
                  <label 
                    htmlFor="tipo_exportador_profile" 
                    className={`text-sm font-bold uppercase ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                  >
                    Exportador
                  </label>
                </div>

                {/* Comerciante */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tipo_comerciante_profile"
                    value="C"
                    checked={tiposCompradorSeleccionados.includes('C')}
                    onChange={handleTipoCompradorChange}
                    className={`h-5 w-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-500 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}
                  />
                  <label 
                    htmlFor="tipo_comerciante_profile" 
                    className={`text-sm font-bold uppercase ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                  >
                    Comerciante
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-6 mt-10">

          <Button
            onClick={handleUpdate}
            title="Guardar cambios"
            darkMode={isDarkMode}
          />

          <Button
            onClick={() => router.push("/profile/changePassword")}
            title="Cambiar contraseña"
            darkMode={isDarkMode}
          />

        </div>
      </div>
    </div>
  );
};

export default FormUserData;
