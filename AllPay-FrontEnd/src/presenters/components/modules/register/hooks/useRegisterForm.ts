"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { AuthResource } from "@/application/auth/resources/auth.resource";
// import { MainResource } from "@/application/shared/resources/main-resource";

interface FormDataType {
  address: { value: string; error: boolean };
  addressComplete: { value: string; error: boolean };
}

interface UseRegisterFormProps {
  baseApiUrl: string;
}

export function useRegisterForm({ baseApiUrl }: UseRegisterFormProps) {

  const [openModalPolitica, setModalPolitica] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [formData] = useState<FormDataType>({
    address: { value: "", error: false },
    addressComplete: { value: "", error: false },
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [currentStepJuridica, setCurrentStepJuridica] = useState(1);
  const [persona, setPersona] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [typePerson, setTypePerson] = useState({ value: "", error: false });
  const [dataTypePerson, setDataTypePerson] = useState<any[]>([]);

  const [typeDocument, setTypeDocument] = useState({ value: "", error: false });
  const [dataTypeDocument, setDataTypeDocument] = useState<any[]>([]);

  const [document, setDocument] = useState({ value: "", error: false });

  const [dataPaisNacimiento, setDataPaisNacimiento] = useState<any[]>([]);
  const [dataGenero, setDataGenero] = useState<any[]>([]);
  const [dataCiudad, setDataCiudad] = useState<any[]>([]);
  const [dataDepartamento, setDataDepartamento] = useState<any[]>([]);
  const [dataCiudadNotificacion, setDataCiudadNotificacion] = useState<any[]>([]);
  const [dataDepartamentoNotificacion, setDataDepartamentoNotificacion] = useState<any[]>([]);
  const [dataNatureCompany, setDataNatureCompany] = useState<any[]>([]);
  const [dataBuyerCode, setDataBuyerCode] = useState<any[]>([]);

  const [, setError] = useState<string>("");
  const [, setErrorUser] = useState<string>("");
  const [, setMessageUser] = useState<string>("");

  useEffect(() => {
    setIsExpanded(persona);
  }, [persona]);


  const obtenerTiposPersona = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}choices/tipo-persona/`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataTypePerson(response.data.data);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]);

  const obtenerTiposComprador = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}choices/tipo-comprador/`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataBuyerCode(response.data.data);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]);

  const obtenerGeneros = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/sexo/get-list/`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataGenero(response.data.data);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]);

  const obtenerPaises = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/paises/get-list/`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataPaisNacimiento(response.data.data);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]);

  const obtenerTiposDocu = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/tipos-documento/get-list-register/?activo=True`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataTypeDocument(response.data.data);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]); 
  const obtenerNaturalezaEmp = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}choices/cod-naturaleza-empresa/`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataNatureCompany(response.data.data);
    } catch (error: any) {
      manejarError(error);
    }
  }, [baseApiUrl]);

  const obtenerCiudad = useCallback(
    async (value: any, step: number) => {
      if (value !== "") {
        try {
          const response = await axios
            .get(`${baseApiUrl}personas/municipio/get-list/${value}/`, {
              headers: {
                "Content-Type": "application/json",
              },
            })
            .catch(function (error) {
              return error.response;
            });
          if (response.data.success === false) {
            throw response.data.detail;
          }
          if (step === 1) {
            setDataCiudad(response.data.data);
          } else if (step === 2) {
            setDataCiudadNotificacion(response.data.data);
          }
        } catch (error: any) {
          manejarError(error);
        }
      }
    },
    [baseApiUrl]
  );

  const obtenerDepartamento = useCallback(
    async (value: any, step: number) => {
      if (value !== "") {
        try {
          const response = await axios
            .get(`${baseApiUrl}personas/departamento/get-list/${value}/`, {
              headers: {
                "Content-Type": "application/json",
              },
            })
            .catch(function (error) {
              return error.response;
            });
          if (response.data.success === false) {
            throw response.data.detail;
          }
          if (step === 1) {
            setDataDepartamento(response.data.data);
          } else if (step === 2) {
            setDataDepartamentoNotificacion(response.data.data);
          }
        } catch (error: any) {
          manejarError(error);
        }
      }
    },
    [baseApiUrl]
  );

  const manejarError = (error: any) => {
    if (typeof error === "string") {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error,
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Ha ocurrido un error contacte con el administrador",
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      });
    }
  };

  const getPersona = useCallback(
    async (value: any, docum: any) => {

      try {

        const response = await axios
          .get(`${baseApiUrl}personas/get-personas-by-document/${value}/${docum}/`, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          .catch(function (error) {
            return error.response;
          });
        if (response.data.success === false) {
          return { id: null, name: null, value: true };
        }
        return {
          id: response.data.data.id_persona,
          name: response.data.data.nombre_completo,
          value: false,
        };
      } catch (error: any) {
        manejarError(error);
        return false;
      }
    },
    [baseApiUrl]
  );

  const buscarPersona = async () => {
    let error: boolean = false;
    let title: string = "";

    setLoading(true);
    setPersona(false);
    setErrorUser("");
    setError("");
    setMessageUser("");

    if (typePerson.value === "") {
      title = "Por favor, rellene todos los campos";
      error = true;
      setTypePerson({ value: "", error: true });
    }
    if (typeDocument.value === "") {
      title = "Por favor, rellene todos los campos";
      error = true;
      setTypeDocument({ value: "", error: true });
    }
    if (document.value === "") {
      title = "Por favor, rellene todos los campos";
      error = true;
      setDocument({ value: "", error: true });
    }

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: title,
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      });
      setLoading(false);
    } else {
      const data: any = await getPersona(typeDocument.value, document.value);
      if (!data.value) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Parece que el usuario ya se encuentra registrado!",
          footer: '<a href="/">por favor inicie sesión aqui</a>',
          confirmButtonColor: "#4D750F",
          confirmButtonText: AuthResource.Acept,
        });
      } else {
        Swal.fire({
          position: "top-end",
          icon: "warning",
          text: "Por favor diligenciar de manera correcta el formulario de registro",
          background: "#fff",
          showConfirmButton: false,
          timer: 5000,
        });
        setPersona(true);
      }
      setPersona(data.value);
      setLoading(false);
    }
  };

  const buscarRepresentante = async (type: string, valueDocument: number) => {
    setLoading(true);
    const data: any = await getPersona(type, valueDocument);
    setLoading(false);
    return data;
  };

  const handleSelectChange = (e: any) => {
    const { value, name } = e.target;
    if (name === "tipoPersona") {
      setTypePerson({ value: value, error: false });
    } else if (name === "tipoDocumento") {
      setTypeDocument({ value: value, error: false });
    } else if (name === "document") {
      setDocument({ value: value, error: false });
    }
    setPersona(false);
  };

  const handleModalPolitica = () => {
    setModalPolitica(!openModalPolitica);
  };

  const handleSubmit = async (data: any, app?: boolean) => {
    setLoading(true);
  
    const redirigir = () => {
      if (app === true) {
        const currentUrl = window.location.href;
        const newUrl = currentUrl.replace("crear_usuario", "administracion_usuario");
        window.location.href = newUrl;
      } else {
        window.location.href = `${window.location.origin}/auth/signin/`;
      }
    };
  
    const showSuccessAlert = async (text: string) => {
      const timerId = setTimeout(redirigir, 5000);
  
      await Swal.fire({
        icon: "success",
        title: "¡Exitoso!",
        text: `${text}\nSerás redirigido en 5 segundos...`,
        confirmButtonText: AuthResource.Acept,
        customClass: {
          confirmButton: `
            ${AuthResource.Acept.trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} 
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
            outline-none focus:outline-none
          `,
        },
        buttonsStyling: false,
      }).then(() => {
        clearTimeout(timerId);
        redirigir();
      });
    };
  
    try {
      let response;
  
      if (typePerson.value === "N") {
        response = await axios
          .post(`${baseApiUrl}personas/persona-natural-and-usuario/create/`, data, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .catch((error) => error.response);
  
        if (!response || response.data.success === false || response.status >= 400) {
          await Swal.fire({
            icon: "error",
            title: "Oops...",
            text: response?.data?.detail || "Error inesperado.",
            confirmButtonText: AuthResource.Acept,
            customClass: {
              confirmButton: `
                ${AuthResource.Acept.trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} 
                py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
                hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
                disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
                outline-none focus:outline-none
              `,
            },
            buttonsStyling: false,
          });
          setLoading(false);
          return;
        }
  
        setPersona(true);
        setIsExpanded(true);
        setCurrentStep((step: number) => step + 1);
      } else if (typePerson.value === "J") {
        response = await axios
          .post(`${baseApiUrl}personas/persona-juridica-and-usuario/create/`, data, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .catch((error) => error.response);
  
        if (!response || response.data.success === false || response.status >= 400) {
          await Swal.fire({
            icon: "error",
            title: "Oops...",
            text: response?.data?.detail || "Error inesperado.",
            confirmButtonText: AuthResource.Acept,
            customClass: {
              confirmButton: `
                ${AuthResource.Acept.trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} 
                py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
                hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))]
                disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2
                outline-none focus:outline-none
              `,
            },
            buttonsStyling: false,
          });
          setLoading(false);
          return;
        }
  
        setCurrentStepJuridica((prev) => prev + 1);
      }
  
      setLoading(false);
  
      await showSuccessAlert(response.data.detail);
    } catch (error: any) {
      manejarError(error);
      setLoading(false);
    }
  };
  
  
  const getTiposComprador = async (): Promise<{ code: string; label: string }[]> => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/tipos-comprador/get-list/?activo=True`);
  
      if (response.data.success) {
        return response.data.data.map((item: { cod_tipo_comprador: string; nombre: string }) => ({
          code: item.cod_tipo_comprador,
          label: item.nombre
        }));
      } else {
        throw new Error('No se pudieron obtener los tipos de comprador');
      }
    } catch (error) {
      console.error('Error al obtener tipos de comprador:', error);
      throw error;
    }
  };
  
  
  

  useEffect(() => {
    obtenerTiposPersona();
    obtenerPaises();
    obtenerGeneros();
    obtenerNaturalezaEmp();
    obtenerTiposComprador();
    obtenerTiposDocu();
  }, [
    obtenerTiposPersona,
    obtenerPaises,
    obtenerGeneros,
    obtenerNaturalezaEmp,
    obtenerTiposComprador,
    obtenerTiposDocu
  ]);

  return {

    openModalPolitica,
    loading,
    formData,
    currentStep,
    currentStepJuridica,
    persona,
    isExpanded,
    typePerson,
    dataTypePerson,
    typeDocument,
    dataTypeDocument,
    document,
    dataPaisNacimiento,
    dataGenero,
    dataCiudad,
    dataDepartamento,
    dataCiudadNotificacion,
    dataDepartamentoNotificacion,
    dataNatureCompany,
    dataBuyerCode,

    setCurrentStep,
    setCurrentStepJuridica,

    setTypePerson,
    setTypeDocument,
    setDocument,
    handleSelectChange,
    buscarPersona,
    buscarRepresentante,
    handleModalPolitica,
    handleSubmit,
    getTiposComprador,
    obtenerDepartamento,
    obtenerCiudad,
  };
}
