'use client';

import '@/presenters/css/background.css';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  FormControlLabel,
  Grid,
  Typography
} from '@mui/material';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { FormData, RolesCrearProps } from '../interfaces/types';
import { buscarRolesCrear, crearRol } from '../services/roles.service';

const Roles_crear: React.FC<RolesCrearProps> = ({ setShowMessage }) => {
  const initialFormData: FormData = {
    searchUser1: '',
    searchUser2: '',
    descripcion: '',
    tipoPersona: '',
    nombrerol: ''
  };

  const fieldTypes: { [key: string]: 'string' } = {
    descripcion: 'string',
    nombrerol: 'string',
    searchUser1: 'string',
    searchUser2: 'string',
    tipoPersona: 'string'
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: fieldTypes[name] === 'string' ? value : value
    }));
  };

  const [roles, setRoles] = useState<any[]>([]);

  const [
    ,
    setSelectedPermisos
  ] = useState<{ [moduloId: number]: { [permiso: string]: boolean } }>({});

  useEffect(() => {
    if (roles.length > 0) {
      const permisosIniciales: { [moduloId: number]: { [permiso: string]: boolean } } = {};

      roles.forEach((rol: any) => {
        rol.modulos.forEach((modulo: any) => {
          permisosIniciales[modulo.id_modulo] = {};
          Object.keys(modulo.permisos).forEach((permisoKey) => {
            permisosIniciales[modulo.id_modulo][permisoKey] = false; // Siempre false por defecto
          });
        });
      });

      setSelectedPermisos(permisosIniciales);
    }
  }, [roles]);

  const togglePermiso = (moduloId: number, permiso: string) => {
    // Actualizas selectedPermisos (checkbox)
    setSelectedPermisos((prevState) => ({
      ...prevState,
      [moduloId]: {
        ...prevState[moduloId],
        [permiso]: !prevState[moduloId]?.[permiso]
      }
    }));

    // También actualizas el value dentro de roles
    setRoles((prevRoles) =>
      prevRoles.map((rol: any) => ({
        ...rol,
        modulos: rol.modulos.map((modulo: any) => {
          if (modulo.id_modulo === moduloId) {
            return {
              ...modulo,
              permisos: {
                ...modulo.permisos,
                [permiso]: {
                  ...modulo.permisos[permiso],
                  value: !modulo.permisos[permiso].value // Cambia el value real en roles
                }
              }
            };
          }
          return modulo;
        })
      }))
    );
  };
  useEffect(() => {
    buscarRolesCrear({ valueSesion, setRoles, setSelectedPermisos });
  }, []);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();

  const valueSesion: any = session;

  const [editar] = useState(false);

  const [expandedModulos, setExpandedModulos] = useState<{ [key: string]: boolean }>({});
  const [expandedSubsistemas, setExpandedSubsistemas] = useState<{ [key: string]: boolean }>({});

  const toggleAllPermisos = (subsistemaIndex: number, checked: boolean) => {
    // Actualiza los permisos en roles
    setRoles((prevRoles) =>
      prevRoles.map((rol: any, index: number) => {
        if (index !== subsistemaIndex) return rol;

        const updatedModulos = rol.modulos.map((modulo: any) => {
          const updatedPermisos = Object.entries(modulo.permisos).reduce(
            (acc: any, [key, permisoObj]: any) => ({
              ...acc,
              [key]: {
                ...permisoObj,
                value: checked
              }
            }),
            {}
          );

          return {
            ...modulo,
            permisos: updatedPermisos
          };
        });

        return {
          ...rol,
          modulos: updatedModulos
        };
      })
    );

    // Opcional: actualiza selectedPermisos
    setSelectedPermisos((prevState) => {
      const updatedState = { ...prevState };
      roles[subsistemaIndex].modulos.forEach((modulo: any) => {
        const permisosActualizados = Object.keys(modulo.permisos).reduce(
          (acc: any, permiso: string) => ({
            ...acc,
            [permiso]: checked
          }),
          {}
        );
        updatedState[modulo.id_modulo] = permisosActualizados;
      });
      return updatedState;
    });

    // 👉🏼 Expande TODOS los módulos del subsistema
    setExpandedModulos((prev) => {
      const updatedExpanded = { ...prev };
      roles[subsistemaIndex].modulos.forEach((_modulo: any, modIndex: number) => {
        const key = `${subsistemaIndex}-${modIndex}`;
        updatedExpanded[key] = true; // expandido
      });
      return updatedExpanded;
    });

    // 👉🏼 Expande también el SUBSISTEMA
    setExpandedSubsistemas((prev) => ({
      ...prev,
      [`${subsistemaIndex}`]: true
    }));
  };

  return (
    <div>
      {editar ? (
        <></>
      ) : (
        <>
          <div>
            <div>
              <div>
                <div>
                  <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'} relative`}>
                    <button
                      onClick={() => setShowMessage(1)}
                      className={`absolute top-2 right-4 text-2xl ${theme === 'dark' ? 'text-white hover:text-red-300' : 'text-[rgb(var(--brown))] hover:text-red-700'} `}
                    >
                      &times;
                    </button>

                    <div>
                      <h3
                        className={`mb-10 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                          }`}
                      >
                        Creación de Roles
                      </h3>
                    </div>

                    <Grid container spacing={2} className="mb-4">
                      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                        <div>
                          <AnimatedInput
                            id="Nombre de rol"
                            name="nombrerol"
                            label="Nombre de rol"
                            type="text"
                            value={formData.nombrerol}
                            onChange={handleChange}
                            darkMode={theme === 'dark'}
                          />
                        </div>
                      </Grid>
                      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                        <div>
                          <AnimatedInput
                            id="Descipción del rol"
                            label="Descipción del rol"
                            type="text"
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            darkMode={theme === 'dark'}
                          />
                        </div>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                      <Grid item className="flex justify-center">
                        <div>
                          <Button title="  Regresar  " onClick={() => setShowMessage(1)}></Button>
                        </div>
                      </Grid>
                      <Grid item className="flex justify-center">
                        <div>
                          <Button
                            title="  Crear Rol"
                            onClick={() =>
                              crearRol({ formData, roles, valueSesion, setShowMessage })
                            }
                          ></Button>
                        </div>
                      </Grid>
                    </Grid>
                  </div>

                  <Grid container spacing={2} className="mb-4 overflow-x-auto">
                    <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                      <div>
                        <div className="w-full">
                          <h3
                            className={`mb-10 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                              }`}
                          >
                            Permisos por Subsistema y Módulo
                          </h3>
                          {roles.length > 0 &&
                            roles.map((rol: any, index: number) => (
                              <Accordion
                                key={index}
                                expanded={!!expandedSubsistemas[`${index}`]}
                                onChange={() =>
                                  setExpandedSubsistemas((prev) => ({
                                    ...prev,
                                    [`${index}`]: !prev[`${index}`]
                                  }))
                                }
                                className={`mb-4 rounded-xl ${theme === 'dark'
                                    ? 'bg-[#260f00] text-white'
                                    : 'bg-white text-[#562707]'
                                  }`}
                                sx={{
                                  backgroundColor: theme === 'dark' ? '#260f00' : undefined,
                                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : undefined,
                                  color: theme === 'dark' ? '#ffffff' : undefined,
                                  '&::before': { display: 'none' }
                                }}
                              >
                                <AccordionSummary
                                  expandIcon={
                                    <ExpandMoreIcon
                                      sx={{ color: theme === 'dark' ? 'white' : '#562707' }}
                                    />
                                  }
                                  aria-controls={`panel${index}-content`}
                                  id={`panel${index}-header`}
                                  sx={{ backgroundColor: theme === 'dark' ? '#260f00' : '#ffffff' }}
                                >
                                  {/* Checkbox manual */}
                                  <Checkbox
                                    checked={rol.modulos.every((modulo: any) =>
                                      Object.values(modulo.permisos).every(
                                        (permiso: any) => permiso.value
                                      )
                                    )}
                                    indeterminate={
                                      rol.modulos.some((modulo: any) =>
                                        Object.values(modulo.permisos).some(
                                          (permiso: any) => permiso.value
                                        )
                                      ) &&
                                      !rol.modulos.every((modulo: any) =>
                                        Object.values(modulo.permisos).every(
                                          (permiso: any) => permiso.value
                                        )
                                      )
                                    }
                                    onChange={(e) => toggleAllPermisos(index, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()} // Solo se activa cuando clicas el checkbox
                                    sx={{
                                      color: '#4D750F',
                                      '&.Mui-checked': { color: '#4D750F' },
                                      marginTop: '-5px'
                                    }}
                                  />
                                  <Typography variant="h6" className="text-lg font-bold">
                                    {rol.desc_subsistema}
                                  </Typography>
                                </AccordionSummary>

                                {/* Detalles con los módulos */}
                                <AccordionDetails sx={{ backgroundColor: theme === 'dark' ? '#260f00' : '#ffffff' }}>
                                  {rol?.modulos?.length > 0 ? (
                                    rol.modulos.map((modulo: any, modIndex: number) => {
                                      const key = `${index}-${modIndex}`;
                                      return (
                                        <Accordion
                                          key={key}
                                          expanded={!!expandedModulos[key]} // Control del expandido del módulo
                                          onChange={() =>
                                            setExpandedModulos((prev) => ({
                                              ...prev,
                                              [key]: !prev[key]
                                            }))
                                          }
                                          className={`mb-4 ml-4 rounded-xl ${theme === 'dark'
                                              ? 'bg-[#260f00] text-white'
                                              : 'bg-gray-50 text-[#562707]'
                                            }`}
                                          sx={{
                                            backgroundColor: theme === 'dark' ? '#260f00' : undefined,
                                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : undefined,
                                            color: theme === 'dark' ? '#ffffff' : undefined,
                                            '&::before': { display: 'none' }
                                          }}
                                        >
                                          <AccordionSummary
                                            expandIcon={
                                              <ExpandMoreIcon
                                                sx={{
                                                  color: theme === 'dark' ? 'white' : '#562707'
                                                }}
                                              />
                                            }
                                            aria-controls={`panel${index}-${modIndex}-content`}
                                            id={`panel${index}-${modIndex}-header`}
                                            sx={{ backgroundColor: theme === 'dark' ? '#260f00' : '#ffffff' }}
                                          >
                                            <Typography className="text-base font-semibold">
                                              {modulo?.nombre_modulo}
                                            </Typography>
                                          </AccordionSummary>

                                          <AccordionDetails sx={{ backgroundColor: theme === 'dark' ? '#260f00' : '#ffffff' }}>
                                            {Object.entries(modulo.permisos).map(([permiso]) => (
                                              <FormControlLabel
                                                key={permiso}
                                                control={
                                                  <Checkbox
                                                    checked={modulo.permisos[permiso].value}
                                                    onChange={() =>
                                                      togglePermiso(modulo.id_modulo, permiso)
                                                    }
                                                    sx={{
                                                      color: '#4D750F',
                                                      '&.Mui-checked': { color: '#4D750F' }
                                                    }}
                                                  />
                                                }
                                                label={permiso.toUpperCase()}
                                              />
                                            ))}
                                          </AccordionDetails>
                                        </Accordion>
                                      );
                                    })
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ ml: 2 }}
                                    >
                                      No hay módulos disponibles
                                    </Typography>
                                  )}
                                </AccordionDetails>
                              </Accordion>
                            ))}
                        </div>
                      </div>
                    </Grid>
                  </Grid>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Roles_crear;
