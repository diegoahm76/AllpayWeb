"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/presenters/components/ui/AnimatedButton";


interface ProfilePhotoUploadProps {
  userData: any;
  selectedFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  userData,
  selectedFile,
  handleFileChange,
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  return (
    <div className="flex items-center space-x-4 mb-10">

      <div className="flex flex-col items-center">
        <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Foto de perfil</h4>

        <img
          width={150}
          height={150}
          className={`w-24 h-24 rounded-full ${isDarkMode ? 'border-gray-700 border-2' : ''}`}
          src={userData.imageProfile}
          alt="Foto de perfil"
        />
      </div>


      <div className="flex flex-col">

        <Button
          onClick={() => document.getElementById("fileInput")?.click()}
          title="Cargar"
          darkMode={isDarkMode}
        />

        <input
          id="fileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {selectedFile && (
          <p className={`text-md mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            archivo seleccionado: {selectedFile.name}
          </p>
        )}
        <p className={`text-md mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Se permiten archivos JPG o PNG. <br />
          Tamaño máximo de 1 MB.
        </p>
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
