import axios from 'axios';
import Swal from 'sweetalert2';
import { PermisoData, Rol } from '../interfaces/types';
const baseApiUrl = process.env.BASE_API_URL;


const fetch_roles_sistema = async ({
  setRoles,
  valueSesion,
}: {
  setRoles: any;
  valueSesion: any;
}): Promise<any> => {
  try {
    const response = await axios
      .get(`${baseApiUrl}roles/get-list-rol-sistema/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      })


    if (response.data.success === false) {
      throw response.data.detail;
    }
    
    setRoles(response.data.data);
  } catch (error) {
    console.log("Error al obtener roles:", error as string);
  }
};

const handleDeleteRol = async ({
  id,
  setRoles,
  valueSesion,
}: {
  id: number;
  setRoles: any;
  valueSesion: any;
}) => {
  try {
    const response = await axios.delete(`${baseApiUrl}roles/delete/${id}/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${valueSesion?.user?.tokens?.access}`,
      },
    });

    if (response?.data?.success === false) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: response.data.detail || "No se pudo eliminar el rol",
        confirmButtonText: "Aceptar",
        customClass: {
          confirmButton: `
              ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `,
        },
        buttonsStyling: false,
      });
      return;
    }

    await Swal.fire({
      icon: "success",
      title: "Rol eliminado",
      text: "El rol ha sido eliminado correctamente",
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: `
            ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `,
      },
      buttonsStyling: false,
    });

    await fetch_roles_sistema({ setRoles, valueSesion });
  } catch (error: any) {
    const errorDetail =
      error?.response?.data?.detail || "Error al eliminar el rol";

    await Swal.fire({
      icon: "error",
      title: "Error",
      text: errorDetail,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: `
            ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `,
      },
      buttonsStyling: false,
    });
  }
};

const editarRol = async ({
  formData,
  selectedRolId,
  roles,
  valueSesion,
  setShowMessage,
}: {
  formData: any;
  selectedRolId: any;
  roles: any[];
  valueSesion: any;
  setShowMessage: (value: number) => void;
}): Promise<void> => {
  const errores: string[] = [];

  // Validación de campos obligatorios
  if (!formData.nombrerol || formData.nombrerol.trim() === "") {
    errores.push("Nombre del Rol");
  }
  if (!formData.descripcion || formData.descripcion.trim() === "") {
    errores.push("Descripción del Rol");
  }

  // Si hay errores, muestra alerta
  if (errores.length > 0) {
    Swal.fire({
      icon: "warning",
      title: "Campos obligatorios",
      text: `Debes completar: ${errores.join(", ")}`,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton:
          "rounded-2xl bg-[#4D750F] px-6 py-2 text-white transition hover:bg-green-800 outline-none focus:outline-none",
      },
      buttonsStyling: false,
    });
    return;
  }

  try {
    const url = `${baseApiUrl}permisos/permisos-modulos-rol/update/${selectedRolId.id_rol}/`;

    const permisosSeleccionados: { id_permiso_modulo: number }[] = [];

    roles.forEach((rol: any) => {
      rol.modulos.forEach((modulo: any) => {
        Object.entries(modulo.permisos).forEach(([, permiso]: any) => {
          if (permiso.value) {
            permisosSeleccionados.push({
              id_permiso_modulo: permiso.id,
            });
          }
        });
      });
    });

    const payload = {
      nombre_rol: formData.nombrerol,
      descripcion_rol: formData.descripcion,
      permisos_modulo_rol: permisosSeleccionados,
    };

    const response = await axios.put(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.detail || "Error desconocido en la API");
    }

    Swal.fire({
      icon: "success",
      title: "Rol editado correctamente",
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton:
          "rounded-2xl bg-[#4D750F] px-6 py-2 text-white transition hover:bg-green-800 outline-none focus:outline-none",
      },
      buttonsStyling: false,
    });

    setShowMessage(1);
  } catch (error: any) {
    console.error("Error en editarRol:", error);

    let errorMessage = "Ocurrió un problema al editar el rol";
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    Swal.fire({
      icon: "error",
      title: "Error al editar rol",
      text: errorMessage,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton:
          "rounded-2xl bg-[#4D750F] px-6 py-2 text-white transition hover:bg-green-800 outline-none focus:outline-none",
      },
      buttonsStyling: false,
    });
  }
};

const buscarRoles = async ({
  selectedRolId,
  valueSesion,
  setFormData,
  setRoles,
  setSelectedPermisos,
  setExpandedModulos,
  setExpandedSubsistemas,
}: {
  selectedRolId: any;
  valueSesion: any;
  setFormData: any;
  setRoles: any;
  setSelectedPermisos: any;
  setExpandedModulos: any;
  setExpandedSubsistemas: any;
}): Promise<void> => {
  try {
    const url = `${baseApiUrl}permisos/permisos-modulos/get-list/`;
    const response = await axios.get<{ success: boolean; data: Rol[]; detail?: string }>(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.detail || "Error desconocido en la API");
    }

    // Inicializamos permisos en false
    const rolesModificados = response.data.data.map((rol) => ({
      ...rol,
      modulos: rol.modulos.map((modulo) => ({
        ...modulo,
        permisos: Object.fromEntries(
          Object.entries(modulo.permisos).map(([permisoKey, permisoData]) => [
            permisoKey,
            { ...permisoData, value: false },
          ])
        ),
      })),
    }));

    // 2️⃣ Obtener permisos del rol específico
    const urlPermisosRol = `${baseApiUrl}permisos/permisos-rol/get-by-rol/${selectedRolId.id_rol}/`;
    const permisosRolResponse = await axios.get(urlPermisosRol, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (!permisosRolResponse.data.success) {
      throw new Error(
        permisosRolResponse.data.detail || "Error obteniendo permisos por rol"
      );
    }

    const permisosRolData = permisosRolResponse.data.data;

    // ✅ 3️⃣ Actualizar formData con nombre y descripción del rol
    setFormData((prev: any) => ({
      ...prev,
      nombrerol: selectedRolId?.nombre_rol || "",
      descripcion: selectedRolId?.descripcion_rol || "",
    }));

    // 4️⃣ Actualizar permisos activos del rol
    const rolesActualizados = rolesModificados.map((rol) => {
      const rolEncontrado = permisosRolData.find(
        (r: Rol) => r.subsistema === rol.subsistema
      );

      if (!rolEncontrado) return rol;

      return {
        ...rol,
        modulos: rol.modulos.map((modulo) => {
          const moduloEncontrado = rolEncontrado.modulos.find(
            (m: { id_modulo: number }) => m.id_modulo === modulo.id_modulo
          );

          if (!moduloEncontrado) return modulo;

          const nuevosPermisos = { ...modulo.permisos };
          Object.keys(moduloEncontrado.permisos).forEach((permisoKey) => {
            if (nuevosPermisos[permisoKey]) {
              nuevosPermisos[permisoKey].value = true;
            }
          });

          return {
            ...modulo,
            permisos: nuevosPermisos,
          };
        }),
      };
    });

    // 5️⃣ Inicializar permisos, acordeones y subsistemas
    const permisosIniciales: Record<number, Record<string, boolean>> = {};
    const expandedModulosInicial: { [key: string]: boolean } = {};
    const expandedSubsistemasInicial: { [key: string]: boolean } = {};

    rolesActualizados.forEach((rol, rolIndex) => {
      let algunModuloActivo = false;

      rol.modulos.forEach((modulo, modIndex) => {
        // Guardar permisos iniciales
        permisosIniciales[modulo.id_modulo] = Object.fromEntries(
          Object.entries(modulo.permisos).map(([permiso, permisoData]) => [
            permiso,
            permisoData.value,
          ])
        );

        // Verificar si el módulo tiene permisos activos
        const algunPermisoActivo = Object.values(modulo.permisos).some(
          (permiso) => permiso.value === true
        );

        if (algunPermisoActivo) {
          algunModuloActivo = true;
        }

        // Expandir módulo si tiene permisos activos
        expandedModulosInicial[`${rolIndex}-${modIndex}`] = algunPermisoActivo;
      });

      // Expandir subsistema si algún módulo tiene permisos activos
      expandedSubsistemasInicial[`${rolIndex}`] = algunModuloActivo;
    });

    // Setear estados finales
    setRoles(rolesActualizados);
    setSelectedPermisos(permisosIniciales);
    setExpandedModulos(expandedModulosInicial);
    setExpandedSubsistemas(expandedSubsistemasInicial);
  } catch (error: any) {
    console.error("Error en buscarRoles:", error);

    let errorMessage = "Ocurrió un problema, intenta nuevamente";
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    Swal.fire({
      icon: "error",
      title: "Error al obtener los datos",
      text: errorMessage,
    });
  }
};

const crearRol = async ({
  formData,
  roles,
  valueSesion,
  setShowMessage,
}: {
  formData: any;
  roles: any[];
  valueSesion: any;
  setShowMessage: (value: number) => void;
}): Promise<void> => {
  const errores: string[] = [];

  // Validación de campos obligatorios
  if (!formData.nombrerol || formData.nombrerol.trim() === "") {
    errores.push("Nombre del Rol");
  }
  if (!formData.descripcion || formData.descripcion.trim() === "") {
    errores.push("Descripción del Rol");
  }

  // ✅ Si hay errores, mostrar alerta personalizada
  if (errores.length > 0) {
    await Swal.fire({
      icon: "warning",
      title: "Campos obligatorios",
      text: `Debes completar: ${errores.join(", ")}`,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: `
            ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `,
      },
      buttonsStyling: false,
    });
    return;
  }

  try {
    const url = `${baseApiUrl}permisos/permisos-modulos-rol/create/`;

    const permisosSeleccionados: { id_permiso_modulo: number }[] = [];

    roles.forEach((rol: any) => {
      rol.modulos.forEach((modulo: any) => {
        Object.entries(modulo.permisos).forEach(([, permiso]: any) => {
          if (permiso.value) {
            permisosSeleccionados.push({
              id_permiso_modulo: permiso.id,
            });
          }
        });
      });
    });

    // 🔥 Payload completo para la API
    const payload = {
      nombre_rol: formData.nombrerol,
      descripcion_rol: formData.descripcion,
      permisos_modulo: permisosSeleccionados,
    };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.detail || "Error desconocido en la API");
    }

    await Swal.fire({
      icon: "success",
      title: "Rol creado correctamente",
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: `
            ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `,
      },
      buttonsStyling: false,
    });

    setShowMessage(1);
  } catch (error: any) {
    console.error("Error en crearRol:", error);

    let errorMessage = "Ocurrió un problema al crear el rol";
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    // ❌ Alerta de error personalizada
    await Swal.fire({
      icon: "error",
      title: "Error al crear rol",
      text: errorMessage,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: `
            ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `,
      },
      buttonsStyling: false,
    });
  }
};

const buscarRolesCrear = async ({
  valueSesion,
  setRoles,
  setSelectedPermisos,
}: {
  valueSesion: any;
  setRoles: (roles: any[]) => void;
  setSelectedPermisos: (permisos: Record<number, Record<string, boolean>>) => void;
}): Promise<void> => {
  try {
    const url = `${baseApiUrl}permisos/permisos-modulos/get-list/`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${valueSesion.user.tokens.access}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.detail || "Error desconocido en la API");
    }

    const rolesModificados = response.data.data.map((rol: any) => ({
      ...rol,
      modulos: rol.modulos.map((modulo: any) => ({
        ...modulo,
        permisos: Object.fromEntries(
          Object.entries(modulo.permisos).map(([permisoKey, permisoData]) => [
            permisoKey,
            { ...(permisoData as PermisoData), value: false },
          ])
        ),
      })),
    }));

    const permisosIniciales: Record<number, Record<string, boolean>> = {};
    rolesModificados.forEach((rol: any) => {
      rol.modulos.forEach((modulo: any) => {
        permisosIniciales[modulo.id_modulo] = Object.fromEntries(
          Object.keys(modulo.permisos).map((permiso) => [permiso, false])
        );
      });
    });

    setSelectedPermisos(permisosIniciales);
    setRoles(rolesModificados);
  } catch (error: any) {
    console.error("Error en buscarRolesCrear:", error);

    let errorMessage = "Ocurrió un problema, intenta nuevamente";
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    await Swal.fire({
      icon: "error",
      title: "Error al obtener los datos",
      text: errorMessage,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: `
            ${"Aceptar".trim().split(/\s+/).length === 1 ? "w-[120px]" : "px-6"} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `,
      },
      buttonsStyling: false,
    });
  }
};



export {
  fetch_roles_sistema,
  handleDeleteRol,
  editarRol,
  buscarRoles,
  crearRol,
  buscarRolesCrear,
};