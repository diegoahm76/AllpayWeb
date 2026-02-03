"use client";

import { useTheme } from "next-themes";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { fetchEditProfile } from "@/adapters/user/user.editProfile";
import { fetchAuthenticationMethods } from "@/app/api/auth/authenticationMethods";

interface UseFormUserDataProps {
  userData: any;
  setUserData: (data: any) => void;
  personaType: "N" | "J" | "";
  municipioResidencia?: string;
}

export function useFormUserData({ userData, setUserData, personaType, municipioResidencia }: UseFormUserDataProps) {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSignatureFile, setSelectedSignatureFile] = useState<File | null>(null);
  const [tiposCompradorSeleccionados, setTiposCompradorSeleccionados] = useState<string[]>([]);
  const [municipioResidenciaLocal, setMunicipioResidenciaLocal] = useState<string>('');

  // Debug: capturar cambios en municipioResidencia
  useEffect(() => {
    if (municipioResidencia) {
      setMunicipioResidenciaLocal(municipioResidencia);
    }
  }, [municipioResidencia]);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  // Inicializar tipos de comprador cuando se cargan los datos del usuario
  useEffect(() => {
    const codTipoComprador = userData?.cod_tipo_comprador || userData?.persona?.cod_tipo_comprador;
    if (codTipoComprador) {
      const tiposArray = codTipoComprador.split('|').filter(Boolean);
      setTiposCompradorSeleccionados(tiposArray);
    } else {
      setTiposCompradorSeleccionados([]);
    }
  }, [userData?.cod_tipo_comprador, userData?.persona?.cod_tipo_comprador]);

  // Manejar cambios en tipos de comprador
  const handleTipoCompradorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      if (!tiposCompradorSeleccionados.includes(value)) {
        setTiposCompradorSeleccionados(prev => [...prev, value]);
      }
    } else {
      setTiposCompradorSeleccionados(prev => prev.filter(tipo => tipo !== value));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      if (file.size > 1000000) {
        Swal.fire({
          icon: "error",
          title: "El archivo excede los 1 MB",
          confirmButtonColor: "rgb(var(--green))",
          confirmButtonText: "Aceptar",
          showConfirmButton: false,
          timer: 5000
        });
        return;
      }

      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setUserData((prev: any) => ({ ...prev, imageProfile: previewUrl }));
    }
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const token = valueSesion?.user?.tokens?.access;
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      const authMethods = await fetchAuthenticationMethods(token);
      if (!authMethods?.data || authMethods.data.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "No se puede actualizar la firma si no tiene 2FA activado",
          confirmButtonColor: "rgb(var(--green))",
          confirmButtonText: "Aceptar",
          timer: 5000
        });
        e.target.value = '';
        return;
      }

      const file = e.target.files?.[0] || null;
      if (!file) return;

      if (file.size > 1000000) {
        Swal.fire({
          icon: "error",
          title: "El archivo excede los 1 MB",
          confirmButtonColor: "rgb(var(--green))",
          confirmButtonText: "Aceptar",
          showConfirmButton: false,
          timer: 5000
        });
        e.target.value = ''; // Limpiar el input
        return;
      }

      setSelectedSignatureFile(file);
      const previewUrl = URL.createObjectURL(file);
      setUserData((prev: any) => ({ ...prev, firma_usuario: previewUrl }));

    } catch (error) {
      console.error('Error al verificar 2FA:', error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error al verificar la autenticación de dos factores",
        confirmButtonColor: "rgb(var(--green))",
        confirmButtonText: "Aceptar",
        timer: 5000
      });
      e.target.value = ''; // Limpiar el input
    }
  };

  const handleUpdate = async () => {
    try {
      const dataPerson = {
        [personaType === "N" ? "telefono_celular" : "telefono_empresa"]: userData.telefono,
        email: userData.email,
        direccion_residencia: userData.direccion
      };

      // Para personas jurídicas, también enviar la dirección del representante legal si existe
      if (personaType === "J" && userData.representanteLegal?.direccion) {
        dataPerson.direccion_representante_legal = userData.representanteLegal.direccion;
      }

      // Usar el estado local para los códigos de municipio
      const municipioToUse = municipioResidenciaLocal || municipioResidencia;
      
      if (municipioToUse) {
        dataPerson.municipio_residencia = municipioToUse;
        dataPerson.cod_municipio_notificacion_nal = municipioToUse;
        dataPerson.cod_municipio_expedicion_id = municipioToUse;
      }

      const formData = new FormData();
      Object.keys(dataPerson).forEach((key) => {
        formData.append(key, dataPerson[key]);
      });

      if (selectedFile) {
        formData.append("image_profile", selectedFile);
      }

      if (selectedSignatureFile) {
        formData.append("firma_usuario", selectedSignatureFile);
      }

      // Agregar tipos de comprador seleccionados
      if (tiposCompradorSeleccionados.length > 0) {
        formData.append('cod_tipo_comprador', tiposCompradorSeleccionados.join('|'));
      }

      await fetchEditProfile(valueSesion.user.tokens.access, formData, personaType as "N" | "J");

      Swal.fire({
        icon: "success",
        title: "Datos actualizados",
        showConfirmButton: false,
        timer: 5000
      });

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al actualizar los datos",
        showConfirmButton: false,
        timer: 5000
      });
    }
  };

  return {
    theme,
    selectedFile,
    selectedSignatureFile,
    tiposCompradorSeleccionados,
    setTiposCompradorSeleccionados,
    handleFileChange,
    handleSignatureFileChange,
    handleTipoCompradorChange,
    handleUpdate
  };
}
