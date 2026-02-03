export interface PermisoData {
    id: number;
    value: boolean;
};

export interface Modulo {
    id_modulo: number;
    descripcion: string;
    nombre_icono: string;
    nombre_modulo: string;
    ruta_formulario: string;
    permisos: Record<string, PermisoData>;
};

export interface Rol {
    modulos: Modulo[];
    subsistema: string;
    desc_subsistema: string;
};

export interface RolesCrearProps {
    selectedRolId?: any;
    setShowMessage?: any;
}


export interface FormData {
    nombrerol: string;
    searchUser1: string;
    searchUser2: string;
    tipoPersona: string;
    descripcion: string;
}