"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Swal from "sweetalert2";
import { fetchUserData } from "@/adapters/user/user.getUserData";

interface UseTwoFactorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function useTwoFactorAuthModal({ onClose }: UseTwoFactorAuthModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  const [userData, setUserData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const storedData = sessionStorage.getItem("userData");
      return storedData ? JSON.parse(storedData) : null;
    }
    return null;
  });

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  useEffect(() => {
    const fetchData = async () => {
      if (!userData && valueSesion?.user?.tokens?.access) {
        try {
          const userProfile = await fetchUserData(valueSesion.user.tokens.access);
          if (userProfile) {
            setUserData(userProfile);
          } else {
            throw new Error("No se recibió una respuesta válida del servidor.");
          }
        } catch (error) {
          Swal.fire({
            icon: "error",
            title: "Error al cargar los datos",
            text: "No se pudo obtener la información del usuario. Intente nuevamente más tarde.",
            showConfirmButton: true,
            confirmButtonColor: "rgb(var(--green))"
          });
        }
      }
    };

    fetchData();
  }, [valueSesion, userData]);

  useEffect(() => {
    if (userData?.persona) {
      setEmail(userData.persona.email || "");
      setPhoneNumber(
        userData.persona.tipo_persona === "J"
          ? userData.persona.telefono_empresa
          : userData.persona.telefono_celular
      );
    }
  }, [userData]);

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleContinue = () => {
    onClose();
    setTimeout(() => {
      if (selectedOption === "app") setIsAppModalOpen(true);
      if (selectedOption === "sms") setIsSmsModalOpen(true);
      if (selectedOption === "email") setIsEmailModalOpen(true);
    }, 300);
  };

  return {
    selectedOption,
    isAppModalOpen,
    isSmsModalOpen,
    isEmailModalOpen,
    email,
    phoneNumber,
    userData,
    handleSelectOption,
    handleContinue,
    setIsAppModalOpen,
    setIsSmsModalOpen,
    setIsEmailModalOpen
  };
}
