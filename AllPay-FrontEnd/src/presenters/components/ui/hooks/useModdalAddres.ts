"use client";

import { useMemo, useState, useEffect } from "react";

let L: any = null;
if (typeof window !== "undefined") {
  L = require("leaflet");
}

export interface UseModalAddressProps {
  onClose: () => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function useModalAddress({ onClose, formData, setFormData }: UseModalAddressProps) {
  const [error, setError] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);

  const customIcon = useMemo(() => {
    if (!L) return null;
    return new L.Icon({
      iconUrl: "/images/corporate/marker.png",
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -40]
    });
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev: any) => ({
            ...prev,
            addressData: {
              ...prev.addressData,
              coordenadaX: { value: position.coords.latitude, error: false },
              coordenadaY: { value: position.coords.longitude, error: false }
            }
          }));
        },
        (error) => {
          console.error("Error al obtener la ubicación: ", error);
        }
      );
    }
    setMapReady(true);
  }, [setFormData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev: any) => ({
      ...prev,
      addressData: {
        ...prev.addressData,
        [name]: {
          ...prev.addressData[name],
          value: newValue,
          error: false
        }
      }
    }));
    setError("");
  };

  const clear = () => {
    setFormData((prev: any) => ({
      ...prev,
      addressData: {
        ubicacion: { value: "", error: false },
        viaPrincipal: { value: "", error: false },
        nombreVia: { value: "", error: false },
        letraPrincipal: { value: "", error: false },
        letraPrincipal2: { value: "", error: false },
        prefijoBisPrincipal: { value: "", error: false },
        cordenadaPrincipal: { value: "", error: false },

        viaSecundaria: { value: "", error: false },
        nombreViaSecundaria: { value: "", error: false },
        letraSecundaria: { value: "", error: false },
        letraSecundaria2: { value: "", error: false },
        prefijoBisSecundaria: { value: "", error: false },
        cordenadaSecundaria: { value: "", error: false },

        viaTerciaria: { value: "", error: false },
        nombreViaTerciaria: { value: "", error: false },
        letraTerciaria: { value: "", error: false },
        letraTerciaria2: { value: "", error: false },
        prefijoBisTerciaria: { value: "", error: false },
        cordenadaTerciaria: { value: "", error: false },

        complemento: { value: "", error: false },

        coordenadaX: { value: 4.7, error: false },
        coordenadaY: { value: -74.09, error: false },
        location: { value: false, error: false }
      }
    }));
    setError("");
  };

  const save = () => {
    const {
      ubicacion,
      viaPrincipal,
      nombreVia,
      letraPrincipal,
      letraPrincipal2,
      prefijoBisPrincipal,
      cordenadaPrincipal,
      viaSecundaria,
      nombreViaSecundaria,
      letraSecundaria,
      letraSecundaria2,
      prefijoBisSecundaria,
      cordenadaSecundaria,
      viaTerciaria,
      nombreViaTerciaria,
      letraTerciaria,
      letraTerciaria2,
      prefijoBisTerciaria,
      cordenadaTerciaria,
      complemento: comp
    } = formData.addressData;

    // Verificar si hay campos obligatorios vacíos
    const hayCamposVacios = !ubicacion.value || !viaPrincipal.value || !nombreVia.value || 
                           !nombreViaSecundaria.value || !nombreViaTerciaria.value;

    // Si hay campos vacíos, establecer error en los inputs correspondientes
    if (hayCamposVacios) {
      // Crear una copia del objeto addressData
      const newAddressData = { ...formData.addressData };
      
      // Actualizar los campos con error
      if (!ubicacion.value) newAddressData.ubicacion = { ...newAddressData.ubicacion, error: true };
      if (!viaPrincipal.value) newAddressData.viaPrincipal = { ...newAddressData.viaPrincipal, error: true };
      if (!nombreVia.value) newAddressData.nombreVia = { ...newAddressData.nombreVia, error: true };
      if (!nombreViaSecundaria.value) newAddressData.nombreViaSecundaria = { ...newAddressData.nombreViaSecundaria, error: true };
      if (!nombreViaTerciaria.value) newAddressData.nombreViaTerciaria = { ...newAddressData.nombreViaTerciaria, error: true };
      
      // Actualizar el estado con los errores
      setFormData((prev: any) => ({
        ...prev,
        addressData: newAddressData
      }));
      
      return; // No continuar con el guardado si hay errores
    }

    // Construir la dirección principal solo con los campos que tengan valor
    const direccionPrincipal = [
      ubicacion.value,
      viaPrincipal.value,
      nombreVia.value,
      letraPrincipal.value,
      letraPrincipal2.value,
      prefijoBisPrincipal.value,
      cordenadaPrincipal.value
    ].filter(Boolean).join(' ');

    // Construir la dirección secundaria solo si tiene al menos un campo con valor
    const tieneSecundaria = [viaSecundaria.value, nombreViaSecundaria.value, letraSecundaria.value, 
      letraSecundaria2.value, prefijoBisSecundaria.value, cordenadaSecundaria.value].some(Boolean);
    
    const direccionSecundaria = tieneSecundaria ? ' # ' + [
      viaSecundaria.value,
      nombreViaSecundaria.value,
      letraSecundaria.value,
      letraSecundaria2.value,
      prefijoBisSecundaria.value,
      cordenadaSecundaria.value
    ].filter(Boolean).join(' ') : '';

    // Construir la dirección terciaria solo si tiene al menos un campo con valor
    const tieneTerciaria = [viaTerciaria.value, nombreViaTerciaria.value, letraTerciaria.value,
      letraTerciaria2.value, prefijoBisTerciaria.value, cordenadaTerciaria.value].some(Boolean);
    
    const direccionTerciaria = tieneTerciaria ? ' - ' + [
      viaTerciaria.value,
      nombreViaTerciaria.value,
      letraTerciaria.value,
      letraTerciaria2.value,
      prefijoBisTerciaria.value,
      cordenadaTerciaria.value
    ].filter(Boolean).join(' ') : '';

    const finalAddress = `${direccionPrincipal}${direccionSecundaria}${direccionTerciaria}`;
    
    setFormData((prev: any) => ({ 
      ...prev,
      address: { value: finalAddress, error: false },
      addressComplete: { value: comp.value, error: false },
      direccion: finalAddress, // ✅ Agregar esta línea para usuarios jurídicos
      coordenadaX: { value: formData.addressData.coordenadaX.value, error: false },
      coordenadaY: { value: formData.addressData.coordenadaY.value, error: false },
      addressData: {
        ...formData.addressData,
        location: { ...formData.addressData.location, value: true }
      }
    }));

    setTimeout(() => {
      onClose();
    }, 100);
  };

  return {
    error,
    mapReady,
    customIcon,
    handleChange,
    clear,
    save
  };
}
