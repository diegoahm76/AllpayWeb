"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import axios from "axios";
import { Exception } from "@/adapters/shared/exception";
import { getFullLoginUrl } from "@/utils/authRedirect";
import Swal from "sweetalert2";

export interface Permisos {
  crear: boolean;
  actualizar?: boolean;
  consultar: boolean;
  borrar?: boolean;
}

export interface Modulo {
  id_modulo: number;
  nombre_modulo: string;
  descripcion: string;
  ruta_formulario: string;
  nombre_icono: string;
  id_menu: number;
  permisos: Permisos;
}

export interface Subsistema {
  subsistema: string;
  desc_subsistema: string;
  modulos: Modulo[];
}

export interface SidebarState {
  menu: Subsistema[];
  loading: boolean;
  moduloActivo: number | null;
  setModuloActivo: (modulo: number | null) => void;
}

const baseApiUrl = process.env.BASE_API_URL;

export const useSidebar = (entorno: string): SidebarState => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  
  const token = (session as any)?.user?.tokens?.access;
  const [loading, setLoading] = useState<boolean>(false);
  const [menu, setMenu] = useState<Subsistema[]>([]);
  const [moduloActivo, setModuloActivo] = useState<number | null>(null);
  const hasFetched = useRef<boolean>(false);

  const obtenerMenu = useCallback(async (value: string) => {
    // Evitar recargas innecesarias
    if (!value || !token || hasFetched.current) {
      return;
    }

    hasFetched.current = true;
    setLoading(true);
    
    try {
      const response = await axios.get(`${baseApiUrl}permisos/permisos-rol/get-by-entorno/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }).catch((error) => error.response);
      
      if (response?.data?.success === false) throw response.data.detail;
      
      setMenu(response.data.data);

      const savedModulo = localStorage.getItem("moduloActivo");
      if (savedModulo) {
        setModuloActivo(Number(savedModulo));
      } else if (response.data.data.length > 0) {
        const primerSubsistema = response.data.data[0];
        if (primerSubsistema.modulos.length > 0) {
          const primerModulo = primerSubsistema.modulos[0];
          setModuloActivo(primerModulo.id_modulo);
          localStorage.setItem("moduloActivo", String(primerModulo.id_modulo));
        }
      }
    } catch (error) {
      console.error('[useSidebar] - Error al cargar menú:', error);

      if (error == "NO SE LE PERMITIRÁ TRABAJAR EN ENTORNO LABORAL, dado que la persona no está actualmente vinculada o la fecha final del cargo ha vencido") {
        await Swal.fire({
          title: 'Acceso Denegado',
          text: error as string,
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: 'Aceptar'
        });
        
        await signOut({ redirect: false, callbackUrl: getFullLoginUrl() });
      }

      throw new Exception(error as string);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (entorno && token) {
      obtenerMenu(entorno);
    }
  }, [obtenerMenu, entorno, token]);

  return { menu, loading, moduloActivo, setModuloActivo };
};
