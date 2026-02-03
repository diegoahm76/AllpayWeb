"use client";
  import { useState, useCallback } from "react";
  import axios from "axios";
import { createLegalRepresentative, LegalRepresentativePayload } from "@/app/api/register/createRepresentativeLegal";


interface AddressData {
  ubicacion: { value: string; error: boolean };
  viaPrincipal: { value: string; error: boolean };  
  nombreVia: { value: string; error: boolean };
  letraPrincipal: { value: string; error: boolean };
  letraPrincipal2: { value: string; error: boolean };
  prefijoBisPrincipal: { value: string; error: boolean };
  cordenadaPrincipal: { value: string; error: boolean };

  viaSecundaria: { value: string; error: boolean };
  nombreViaSecundaria: { value: string; error: boolean };
  letraSecundaria: { value: string; error: boolean };
  letraSecundaria2: { value: string; error: boolean };
  prefijoBisSecundaria: { value: string; error: boolean };
  cordenadaSecundaria: { value: string; error: boolean };

  viaTerciaria: { value: string; error: boolean };
  nombreViaTerciaria: { value: string; error: boolean };
  letraTerciaria: { value: string; error: boolean };
  letraTerciaria2: { value: string; error: boolean };
  prefijoBisTerciaria: { value: string; error: boolean };
  cordenadaTerciaria: { value: string; error: boolean };

  complemento: { value: string; error: boolean };
  location: { value: boolean; error: boolean };

  coordenadaX: { value: number; error: boolean };
  coordenadaY: { value: number; error: boolean };
}

interface FormData {
  typeDocument: { value: string; error: boolean };
  document: { value: string; error: boolean };
  firstName: { value: string; error: boolean };
  secondName: { value: string; error: boolean }; 
  firstLastName: { value: string; error: boolean };
  secondLastName: { value: string; error: boolean };
  email: { value: string; error: boolean };
  phone: { value: string; error: boolean };
  address: { value: string; error: boolean };
  addressComplete: { value: string; error: boolean };
  addressData: AddressData;
}

interface TypeDocument {
  id: string | number;
  nombre: string;
  cod_tipo_documento: string;
  [key: string]: any; 
}

export const useCreateEntity = (onClose: () => void) => {


  const baseApiUrl = process.env.BASE_API_URL;

  const [dataTypeDocument, setDataTypeDocument] = useState<TypeDocument[]>([]);

  const [openModalAddress, setOpenModalAddress] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    typeDocument: { value: "", error: false },
    document: { value: "", error: false },
    firstName: { value: "", error: false },
    secondName: { value: "", error: false },
    firstLastName: { value: "", error: false },
    secondLastName: { value: "", error: false },
    email: { value: "", error: false },
    phone: { value: "", error: false },
    address: { value: "", error: false },
    addressComplete: { value: "", error: false },
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
      location: { value: false, error: false },
      coordenadaX: { value: 4.7, error: false },
      coordenadaY: { value: -74.09, error: false },
    },
  });

  const manejarError = (error: any) => {
    console.error("Ocurrió un error:", error);
  };

  const obtenerTiposDocu = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/tipos-documento/get-list-register/?activo=True`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch((error) => error.response);

      if (response.data.success === false) {
        throw response.data.detail;
      }

      const filteredDocs = response.data.data.filter(
        (doc: TypeDocument) =>
          doc.cod_tipo_documento === "CC" || doc.cod_tipo_documento === "CE"
      );

      setDataTypeDocument(filteredDocs);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]);

  const validateFields = () => {
    let isValid = true;
    const newFormData = { ...formData };

    // Campos obligatorios (excluyendo secondName y secondLastName)
    const requiredFields: (keyof Omit<FormData, "addressData" | "secondName" | "secondLastName">)[] = [
      "typeDocument",
      "document",
      "firstName",
      "firstLastName",
      "email",
      "phone",
      "address",
    ];

    requiredFields.forEach((field) => {
      if (
        typeof formData[field].value === "string" &&
        !formData[field].value.trim()
      ) {
        newFormData[field].error = true;
        isValid = false;
      }
    });

    setFormData(newFormData);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateFields()) {
      return;
    }

    const payload: LegalRepresentativePayload = {
      tipo_documento: formData.typeDocument.value,
      numero_documento: formData.document.value,
      primer_nombre: formData.firstName.value,
      primer_apellido: formData.firstLastName.value,
      segundo_apellido: formData.secondLastName.value,
      email: formData.email.value,
      telefono_celular: formData.phone.value,
      direccion_residencia: formData.address.value,
    };
    
    if (formData.secondName.value.trim()) {
      payload.segundo_nombre = formData.secondName.value.trim();
    }

    if (formData.addressData.coordenadaX) {
      payload.coordenada_x = formData.addressData.coordenadaX.value.toString();
    }

    if (formData.addressData.coordenadaY) {
      payload.coordenada_y = formData.addressData.coordenadaY.value.toString();
    }

    try {
      await createLegalRepresentative(payload);
      onClose();
    } catch (err) {
      manejarError(err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        error: false,
      },
    }));
  };

  const handleClean = () => {
    setFormData({
      typeDocument: { value: "", error: false },
      document: { value: "", error: false },
      firstName: { value: "", error: false },
      secondName: { value: "", error: false },
      firstLastName: { value: "", error: false },
      secondLastName: { value: "", error: false },
      email: { value: "", error: false },
      phone: { value: "", error: false },
      address: { value: "", error: false },
      addressComplete: { value: "", error: false },
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
        location: { value: false, error: false },
        coordenadaX: { value: 4.7, error: false },
        coordenadaY: { value: -74.09, error: false },
      },
    });
  };

  return {
    dataTypeDocument,      
    openModalAddress,
    setOpenModalAddress,
    formData,
    setFormData,
    handleSave,
    handleChange,
    handleClean,
    obtenerTiposDocu,
  };
};
