'use client';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useRef, useState } from 'react';
import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { Grid, IconButton } from '@mui/material';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import {
  buscarResumenSicex,
  buscarResumenSicexAll,
  handleActualizarSicex,
  handleCrearSicex,
  obtenerTiposCargue
} from './services/sicex.service';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import axios from 'axios';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Descarga from '@/presenters/components/shared/logo/LogoDescarga';
import { useDeleteSicexCargue } from './hooks/useDeleteSicexCargue';
import Image from 'next/image';

const Administracion_cargos: React.FC = () => {
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  const router = useRouter();
  type FormDataSicex = {
    fecha_inicio: string;
    fecha_fin: string;
    tipo_cargue: string;
    tipo_cargueb: string;
    fecha_cargue: any;
    archivo: File | any;
  };

  const initialFormDataSicex: FormDataSicex = {
    fecha_inicio: '',
    fecha_fin: '',
    tipo_cargue: '',
    tipo_cargueb: '',

    fecha_cargue: formattedToday,
    archivo: null
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cantidadRegistros, setCantidadRegistros] = useState<any>();

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  const baseApiUrl = process.env.BASE_API_URL;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Actualiza el formData con el archivo
    setFormData((prev) => ({
      ...prev,
      archivo: file
    }));
    if (!formData.fecha_inicio) {
      setNotifText('Por favor ingrese la fecha de inicio.');
      setNotifOpen(true);
      return;
    }

    if (!formData.fecha_fin) {
      setNotifText('Por favor ingrese la fecha de fin.');
      setNotifOpen(true);
      return;
    }

    if (!formData.tipo_cargue) {
      setNotifText('Por favor seleccione el tipo de cargue.');
      setNotifOpen(true);
      return;
    }

    // Ejecuta la validación automática
    try {
      const payload = new FormData();
      payload.append('fecha_inicio', formData.fecha_inicio);
      payload.append('fecha_fin', formData.fecha_fin);
      payload.append('tipo_cargue', formData.tipo_cargue);
      payload.append('archivo', file);

      setIsLoading(true);

      const response = await axios.post(`${baseApiUrl}cartera/sicex-cargue/validate/`, payload, {
        headers: {
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error en validación');
      }

      const cantidad = response.data.data?.cantidad_registros ?? null;
      setCantidadRegistros(cantidad);

      setNotifText('Archivo validado correctamente.');
      setNotifOpen(true);
    } catch (error: any) {
      console.error(error);
      setNotifText(error?.response?.data?.detail || error.message);
      setNotifOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const [formData, setFormData] = useState<FormDataSicex>(initialFormDataSicex);

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;

    if (name === 'archivo' && files?.length) {
      setFormData((prev) => ({ ...prev, archivo: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      if (name === 'tipo_cargueb') {
        setFilters((prev) => ({ ...prev, tipo_cargueb: value }));
      }
    }
  };

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const valueSesion: any = session;
  const token = (session as any)?.user?.tokens?.access;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resumen, setResumen] = useState<any[]>([]);
  
  // Hook para eliminar registros de SICEX
  const { deleteSicexCargueByConsecutivo, loading: deletingLoading, error: deleteError, successMessage } = useDeleteSicexCargue();
  
  // Estados para el modal de confirmación de eliminación
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ consecutivo: number; cantidad: number } | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Solo ejecutar si la sesión está disponible
    if (valueSesion?.user?.tokens?.access) {
      // Usar la versión simplificada que ya existía
      buscarResumenSicex({ 
        setResumen, 
        setIsLoading, 
        valueSesion, 
        filters 
      });
    }
  }, [currentPage, valueSesion?.user?.tokens?.access]);
  const fetchAllResumenData = async () // page: number
  : Promise<{ data: any[]; total_pages: number }> => {
    const result = await buscarResumenSicexAll({ valueSesion, filters });
    return result;
  };
  const columns = [
    { key: 'consecutivo_sicex', label: 'Consecutivo' },
    { key: 'cantidad_registros', label: 'Cantidad Registros' },
    { key: 'nombre_tipo_cargue', label: 'Tipo de Cargue' },
    { key: 'fecha_inicial', label: 'Fecha Inicial' },
    { key: 'fecha_final', label: 'Fecha Final' },
    { key: 'fecha_cargue', label: 'Fecha Cargue' }
  ];
  // Columnas para Exportación
  const columnsDetalleExportacion = [
    { key: 'agno', label: 'Año', width: '80px' },
    { key: 'aduana_embarque', label: 'Aduana Embarque', width: '150px' },
    { key: 'auto_embarque', label: 'Auto Embarque', width: '200px' },
    { key: 'continente', label: 'Continente', width: '100px' },
    { key: 'descripcion_arancel', label: 'Descripción Arancelaria', width: '400px' },
    { key: 'empresa_declarante', label: 'Empresa Declarante', width: '200px' },
    { key: 'empresa_operadora', label: 'Empresa Operadora', width: '230px' },
    {
      key: 'fecha',
      label: 'Fecha',
      width: '150px',
      render: (v: string) => {
        const fecha = new Date(v);
        const fechaStr = fecha.toLocaleDateString('es-CO');
        const horaStr = fecha.toLocaleTimeString('es-CO', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return `${fechaStr}, ${horaStr}`;
      }
    },
    { key: 'nit', label: 'NIT', width: '120px' },
    { key: 'nro_declaracion', label: 'Nro. Declaración', width: '150px' },
    { key: 'pais', label: 'País', width: '100px' },
    { key: 'posicion', label: 'Posición', width: '100px' },
    { key: 'pos', label: 'Pos', width: '80px' },
    { key: 'total_peso_bruto', label: 'Total Peso Bruto', width: '140px' },
    { key: 'total_toneladas_bruto', label: 'Total Toneladas Bruto', width: '160px' },
    { key: 'total_peso_neto', label: 'Total Peso Neto', width: '140px' },
    { key: 'total_toneladas_neto', label: 'Total Toneladas Neto', width: '160px' },
    { key: 'factor_conversion', label: 'Factor Conversión', width: '140px' },
    { key: 'total_valor_cif', label: 'Total Valor CIF', width: '140px' },
    { key: 'total_valor_fob', label: 'Total Valor FOB', width: '140px' },
    { key: 'via', label: 'Vía', width: '140px' },
    {
      key: 'fecha_cargue',
      label: 'Fecha de Cargue',
      width: '150px',
      render: (v: string) => {
        const fecha = new Date(v);
        const fechaStr = fecha.toLocaleDateString('es-CO');
        const horaStr = fecha.toLocaleTimeString('es-CO', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return `${fechaStr}, ${horaStr}`;
      }
    }
  ];

  // Columnas para Importación
  const columnsDetalleImportacion = [
    { key: 'agno', label: 'Año', width: '80px' },
    { key: 'aduana_embarque', label: 'Aduana Embarque', width: '150px' },
    { key: 'ciudad_ingreso', label: 'Ciudad Ingreso', width: '150px' },
    { key: 'continente', label: 'Continente', width: '130px' },
    { key: 'departamento', label: 'Departamento', width: '150px' },
    { key: 'descripcion_arancel', label: 'Descripción Arancelaria', width: '400px' },
    { key: 'empresa_declarante', label: 'Empresa Declarante', width: '200px' },
    { key: 'empresa_operadora', label: 'Empresa Operadora', width: '200px' },
    {
      key: 'fecha',
      label: 'Fecha',
      width: '150px',
      render: (v: string) => {
        const fecha = new Date(v);
        const fechaStr = fecha.toLocaleDateString('es-CO');
        const horaStr = fecha.toLocaleTimeString('es-CO', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return `${fechaStr}, ${horaStr}`;
      }
    },
    { key: 'nit', label: 'NIT', width: '120px' },
    { key: 'nro_declaracion', label: 'Nro. Declaración', width: '150px' },
    { key: 'pais', label: 'País', width: '100px' },
    { key: 'posicion', label: 'Posición', width: '100px' },
    { key: 'pos', label: 'Pos', width: '80px' },
    { key: 'proveedor', label: 'Proveedor', width: '200px' },
    { key: 'total_peso_bruto', label: 'Total Peso Bruto', width: '140px' },
    { key: 'total_toneladas_bruto', label: 'Total Toneladas Bruto', width: '160px' },
    { key: 'total_peso_neto', label: 'Total Peso Neto', width: '140px' },
    { key: 'total_toneladas_neto', label: 'Total Toneladas Neto', width: '160px' },
    { key: 'factor_conversion', label: 'Factor Conversión', width: '140px' },
    { key: 'total_valor_cif', label: 'Total Valor CIF', width: '140px' },
    { key: 'total_valor_fob', label: 'Total Valor FOB', width: '140px' },
    { key: 'via', label: 'Vía', width: '140px' },
    {
      key: 'fecha_cargue',
      label: 'Fecha de Cargue',
      width: '150px',
      render: (v: string) => {
        const fecha = new Date(v);
        const fechaStr = fecha.toLocaleDateString('es-CO');
        const horaStr = fecha.toLocaleTimeString('es-CO', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return `${fechaStr}, ${horaStr}`;
      }
    }
  ];

  // Función para obtener las columnas según el tipo de cargue
  const getColumnsDetalle = (tipoCargue: string) => {
    

    if (!tipoCargue) {
      return columnsDetalleExportacion;
    }
    
    const tipoLower = tipoCargue.toLowerCase();
    
    if (tipoLower.includes('exportacion') || tipoLower.includes('exportación')) {

      return columnsDetalleExportacion;
    } else if (tipoLower.includes('importacion') || tipoLower.includes('importación') || tipoLower.includes('imp')) {

      return columnsDetalleImportacion;
    }
    
    return columnsDetalleExportacion;
  };

  const formattedData = resumen.map((item: any) => ({
    ...item,
    fecha_cargue: new Date(item.fecha_cargue).toLocaleString('es-CO'),
    fecha_inicial: new Date(item.fecha_inicial).toLocaleDateString('es-CO'),
    fecha_final: new Date(item.fecha_final).toLocaleDateString('es-CO')
  }));

  // Calcular total de páginas (10 elementos por página)
  const itemsPerPage = 10;
  const totalPagesTable = Math.ceil(formattedData.length / itemsPerPage);

  // Obtener los datos de la página actual
  const paginatedData = formattedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const [configurar, setConfigurar] = useState(true);
  const [openModalDetalle, setOpenModalDetalle] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [currentPageDetalle, setCurrentPageDetalle] = useState(1);
  const [detalleData, setDetalleData] = useState<any[]>([]);
  const [tipoCargueSeleccionado, setTipoCargueSeleccionado] = useState<string>('');
  const isDarkMode = mounted && theme === 'dark';

  const [idSeleccionadoDetalle, setIdSeleccionadoDetalle] = useState<number | null>(null);

  const fetchAllDetalleData = async (page: number) => {
    if (!idSeleccionadoDetalle || !valueSesion) return { data: [], total_pages: 1 };

    try {
      const response = await axios.get(
        `${baseApiUrl}cartera/sicex-cargue/list/${idSeleccionadoDetalle}/?page=${page}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );

      if (!response.data.success) throw response.data.detail;

      return {
        data: response.data.data || [],
        total_pages: response.data.total_pages || 1
      };
    } catch (error) {
      console.error('Error al obtener todos los detalles:', error);
      return { data: [], total_pages: 1 };
    }
  };

  const handleVerDetalle = async (id: number, tipoCargue: string) => {
    try {
      setLoadingDetalle(true);
      setIdSeleccionadoDetalle(id); // Guardar el ID para usar en fetchAllData
      setTipoCargueSeleccionado(tipoCargue); // Guardar el tipo de cargue
      
      const response = await axios.get(`${baseApiUrl}cartera/sicex-cargue/list/${id}/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) throw response.data.detail;
      const lista = response.data.data || [];
      setDetalleData(lista);
      setOpenModalDetalle(true);
      setCurrentPageDetalle(1);
    } catch (error) {
      console.error('Error al obtener detalle:', error);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleDeleteClick = (consecutivo: number, cantidad: number) => {
    setItemToDelete({ consecutivo, cantidad });
    setDeleteAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteSicexCargueByConsecutivo(itemToDelete.consecutivo);
      setDeleteAlertOpen(false);
      setItemToDelete(null);

      // Recargar la tabla
      buscarResumenSicex({
        setResumen,
        setIsLoading,
        valueSesion,
        filters
      });

      // Mostrar mensaje de éxito
      if (successMessage) {
        setNotifText(successMessage);
        setNotifOpen(true);
      }
    } catch (error) {
      setDeleteAlertOpen(false);
      setItemToDelete(null);
      
      // Mostrar mensaje de error
      if (deleteError) {
        setNotifText(deleteError);
        setNotifOpen(true);
      }
    }
  };

  const actions = [
    {
      label: 'Ver',
      render: (row: any) => (
        <IconButton
          size="small"
          onClick={() => handleVerDetalle(row.consecutivo_sicex, row.tipo_cargue)}
          sx={{
            color: isDarkMode ? '#fff' : '#562707',
            padding: '2px',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(86, 39, 7, 0.1)'
            },
            width: 28,
            height: 24
          }}
        >
          <VisibilityIcon sx={{ width: 17, height: 16 }} />
        </IconButton>
      )
    },
    {
      label: 'Eliminar',
      render: (row: any) => (
        <button
          onClick={() => handleDeleteClick(row.consecutivo_sicex, row.cantidad_registros)}
          className="p-2 hover:bg-[rgb(var(--green))]/10 rounded-full transition-colors"
          disabled={deletingLoading}
        >
          <Image
            src="/images/icons/delete.png"
            alt="Eliminar"
            width={24}
            height={24}
          />
        </button>
      )
    },
    {
      label: 'Descargar',
      render: (row: any) => (
        <a
          href={row.archivo}
          onClick={(e) => {
            e.preventDefault();
            // Abre la URL en una nueva pestaña en lugar de intentar descargarla
            window.open(row.archivo, '_blank', 'noopener,noreferrer');
          }}
          className="flex h-[26px] w-[26px] items-center justify-center p-[2px] transition hover:opacity-80"
          title="Ver archivo"
        >
          <Descarga width={17} height={16} />
        </a>
      )
    }
  ];

  const [editId, setEditId] = useState<number | null>(null);

  const handleClick = () => {
    setConfigurar(!configurar);
    buscarResumenSicex({ setResumen, setIsLoading, valueSesion, filters });
    setCantidadRegistros('');
    if (!configurar) {
      setFormData(initialFormDataSicex);
      setEditId(null);
    }
  };

  const [filters, setFilters] = useState({
    cod_tipo_documento: '',
    numero_documento: '',
    fecha_inicio: '',
    fecha_fin: '',
    tipo_cargueb: ''
  });
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const [tiposCargue, setTiposCargue] = useState<any[]>([]);
  const [isLoadingTiposCargue, setIsLoadingTiposCargue] = useState(false);
  
  useEffect(() => {
    if (token) {
      setIsLoadingTiposCargue(true);
      obtenerTiposCargue({ setTiposCargue, token })
        .finally(() => setIsLoadingTiposCargue(false));
    }
  }, [token]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [onConfirmCreate, setOnConfirmCreate] = useState<(() => void) | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifText, setNotifText] = useState('');

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');

    link.href = '/documents/plantilla/EXCEL_EXPORTACION.xlsx';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplatee = () => {
    const link = document.createElement('a');

    link.href = '/documents/plantilla/EXCEL_IMPRTACION.xlsx';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Alert de confirmación de eliminación */}
      <AlertQuestion
        isOpen={deleteAlertOpen}
        onClose={() => {
          setDeleteAlertOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        questionText={
          itemToDelete
            ? `¿Está seguro que desea eliminar el cargue con consecutivo ${itemToDelete.consecutivo}? Esto eliminará aproximadamente ${itemToDelete.cantidad} registro(s). Esta acción no se puede deshacer.`
            : ''
        }
        answerAfirmative="Sí, eliminar"
        answerNegative="Cancelar"
      />

      <ModalContainer
        isOpen={openModalDetalle}
        onClose={() => {
          setOpenModalDetalle(false);
          setTipoCargueSeleccionado('');
          setDetalleData([]);
        }}
        size="full"
      >
        <h3
          className={`mt-[39px] mb-10 text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
        >
          Consulta Datos de Cargue 2 - {tipoCargueSeleccionado ? tipoCargueSeleccionado.toUpperCase() : 'EXPORTACIÓN'}
        </h3>
        {(() => {
          const cols = getColumnsDetalle(tipoCargueSeleccionado);

          return (
            <DynamicTable
              columns={cols}
              data={detalleData.slice((currentPageDetalle - 1) * 10, currentPageDetalle * 10)}
              currentPage={currentPageDetalle}
              totalPages={Math.ceil(detalleData.length / 10)}
              onPageChange={setCurrentPageDetalle}
              isLoading={loadingDetalle}
              fetchAllData={fetchAllDetalleData}
            />
          );
        })()}
      </ModalContainer>

      {configurar ? (
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div
                  className={`relative rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}
                >
                  <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                  >
                    &times;
                  </button>

                  <div className="relative mt-[39px] flex items-center justify-center">
                    <h3
                      className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      CONSULTA DATOS SICEX
                    </h3>
                  </div>

                  <Grid container spacing={2} marginTop={2}>
                                          <Grid item xs={12} sm={4}>
                        <AnimatedSelect
                          name="tipo_cargueb"
                          label="Tipo de Cargue"
                          value={formData?.tipo_cargueb}
                          onChange={handleChange}
                          options={tiposCargue}
                          disabled={isLoadingTiposCargue}
                          darkMode={isDarkMode}
                        />
                        {isLoadingTiposCargue && (
                          <div className="mt-1 text-xs text-gray-500">Cargando tipos de cargue...</div>
                        )}
                      </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_inicio"
                        label="Fecha Inicio"
                        value={filters.fecha_inicio}
                        onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_fin"
                        label="Fecha Fin"
                        value={filters.fecha_fin}
                        onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                  </Grid>

                  <Grid
                    container
                    direction="row"
                    spacing={2}
                    marginTop={1}
                    sx={{
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                   
                  
                    <Grid item>
                      <Button
                        title="Buscar"
                        onClick={() =>
                          buscarResumenSicex({ setResumen, setIsLoading, valueSesion, filters })
                        }
                      />
                    </Grid>
                      <Grid item>
                      <Button
                        title="Limpiar"
                        onClick={() => {
                          setFilters({
                            cod_tipo_documento: '',
                            numero_documento: '',
                            fecha_inicio: '',
                            fecha_fin: '',
                            tipo_cargueb: ''
                          });

                          setFormData((prev) => ({
                            ...prev,
                            tipo_cargueb: ''
                          }));
                        }}
                      />
                    </Grid> 
                     <Grid item>
                      <Button onClick={() => router.push('/')} title="Salir" />
                    </Grid>
                  </Grid>

                  <DynamicTable
                    columns={columns}
                    data={paginatedData}
                    currentPage={currentPage}
                    totalPages={totalPagesTable}
                    onPageChange={setCurrentPage}
                    actions={actions}
                    isLoading={isLoading}
                    fetchAllData={fetchAllResumenData}
                  />

                  <div className="mt-6 flex justify-center space-x-4">
                    <div>{/* <Button onClick={() => router.push('/')} title="Salir" /> */}</div>
           
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div
                  className={`relative rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}
                >
                  <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                  >
                    &times;
                  </button>

                  <div className="space-y-4">
                    <h3
                      className={`mt-9 mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      Cargue Masivo de Datos del Sicex+
                    </h3>

                    <Grid
                      container
                      spacing={2}
                      marginTop={2}
                      direction="row"
                      sx={{
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Grid item>
                        <button
                          className={`flex items-center gap-1 rounded-xl px-4 py-1.5 text-center text-sm font-semibold transition ${
                            isDarkMode
                              ? 'bg-[#78390e] text-white hover:bg-[#925126]'
                              : 'bg-[rgb(var(--gray-20))] text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90'
                          }`}
                          onClick={handleDownloadTemplate}
                        >
                          <span className="mr-1">
                            <img
                              src="/images/icons/more.png"
                              alt="icon-masivo"
                              className="h-4 w-4"
                            />
                          </span>
                          DESCARGAR PLANTILLA EXPORTACION
                        </button>
                      </Grid>
                      <Grid item>
                        <button
                          className={`flex items-center gap-1 rounded-xl px-4 py-1.5 text-center text-sm font-semibold transition ${
                            isDarkMode
                              ? 'bg-[#78390e] text-white hover:bg-[#925126]'
                              : 'bg-[rgb(var(--gray-20))] text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90'
                          }`}
                          onClick={handleDownloadTemplatee}
                        >
                          <span className="mr-1">
                            <img
                              src="/images/icons/more.png"
                              alt="icon-masivo"
                              className="h-4 w-4"
                            />
                          </span>
                          DESCARGAR PLANTILLA IMPORTACIÓN
                        </button>
                      </Grid>
                    </Grid>

                    <Grid container marginTop={2} spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          type="date"
                          name="fecha_inicio"
                          label="Fecha Inicio"
                          value={formData.fecha_inicio}
                          onChange={handleChange}
                          darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          type="date"
                          name="fecha_fin"
                          label="Fecha Fin"
                          value={formData.fecha_fin}
                          onChange={handleChange}
                          darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedSelect
                          name="tipo_cargue"
                          label="Tipo de Cargue"
                          value={formData?.tipo_cargue}
                          onChange={handleChange}
                          options={tiposCargue}
                          disabled={isLoadingTiposCargue}
                          darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          type="date"
                          name="fecha_cargue"
                          disabled
                          label="Fecha de Cargue"
                          value={formData?.fecha_cargue}
                          onChange={handleChange}
                          darkMode={isDarkMode}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          name="cantidad_registros"
                          label="Cantidad de Registros"
                          value={cantidadRegistros?.toString() || ''}
                          onChange={() => {}}
                          disabled
                          darkMode={isDarkMode}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Button
                          icon="/images/icons/upload.png"
                          title="Seleccionar un documento"
                          onClick={handleFileButtonClick}
                          disabled={
                            !formData.fecha_inicio?.trim?.() ||
                            !formData.fecha_fin?.trim?.() ||
                            !formData.tipo_cargue?.trim?.()
                          }
                        />

                        <input
                          ref={fileInputRef}
                          id="fileInput"
                          name="archivo"
                          type="file"
                          accept=".xlsx"
                          className="hidden"
                          onChange={handleFileChange}
                        />

                        {formData.archivo && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm">Archivo: {formData.archivo.name}</span>
                            <button
                              onClick={() => {
                                // Limpia el estado
                                setFormData((prev) => ({
                                  ...prev,
                                  archivo: null
                                }));
                                // Limpia el input file
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="text-lg font-bold text-red-600 hover:text-red-800"
                              aria-label="Eliminar archivo"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </Grid>

                      {/* <Grid item xs={12} sm={6}>
                        <label className="mb-1 block font-semibold">Archivo (.xlsx)</label>
                        <input
                          type="file"
                          name="archivo"
                          accept=".xlsx"
                          onChange={handleChange}
                          className="w-full rounded border p-2"
                        />
                      </Grid> */}
                    </Grid>
                  </div>
                </div>

                <div
                  className={`mt-6 rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} relative`}
                >
                  <Grid container spacing={2}>
                    <Grid
                      container
                      direction="row"
                      sx={{
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <div className="mt-6 flex justify-center space-x-4">
                        <Button
                          title={editId ? 'Actualizar' : 'Crear'}
                          onClick={() =>
                            editId
                              ? handleActualizarSicex({
                                  editId,
                                  formData,
                                  setFormData,
                                  initialFormData: initialFormDataSicex,
                                  valueSesion,
                                  setEditId,
                                  setIsLoading,
                                  buscarResumenSicex: () =>
                                    buscarResumenSicex({
                                      setResumen,
                                      setIsLoading,
                                      valueSesion,
                                      filters
                                    }),
                                  setNotifText,
                                  setNotifOpen
                                })
                              : handleCrearSicex({
                                  formData,
                                  setNotifText,
                                  setNotifOpen,
                                  setAlertOpen,
                                  setOnConfirmCreate,
                                  setFormData,
                                  initialFormData: initialFormDataSicex,
                                  valueSesion,
                                  setIsLoading,
                                  buscarResumenSicex: () =>
                                    buscarResumenSicex({
                                      setResumen,
                                      setIsLoading,
                                      valueSesion,
                                      filters
                                    }),
                                  setCantidadRegistros
                                })
                          }
                        />

                        <Button title="Cancelar" onClick={handleClick}></Button>
                      </div>
                      <AlertNotification
                        isOpen={notifOpen}
                        onClose={() => setNotifOpen(false)}
                        notificationText={notifText}
                      />

                      <AlertQuestion
                        isOpen={alertOpen}
                        onClose={() => {
                          setAlertOpen(false);
                          setOnConfirmCreate(null);
                        }}
                        onConfirm={() => {
                          if (onConfirmCreate) onConfirmCreate();
                        }}
                        questionText="Se ha validado correctamente la información. ¿Desea continuar con la creación del registro?"
                      />
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

export default Administracion_cargos;
