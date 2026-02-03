'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useFacturasPagadas } from '../hooks/useFacturasPagadas';
import { FacturaPagada } from '../models/facturas.pagadas.model';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { formatNumberWithCommas } from '@/utils/formatters';

interface CuotaPagadaData {
    fecha_registro_factura: string;
    numero_factura_unica: string;
    nro_documento_pago?: string;
    departamento: string;
    municipio: string;
    nit_proveedor: string;
    fecha_compra: string;
    kilos_reportados: number;
    kilos_certificados: number;
    precio_kilo: number;
    cuota_fomento: number;
    fecha_pago: string;
    kilos_paz_salvo: number;
    selected?: boolean;
}

interface SearchPaidProps {
    liquidacionId?: string;
    liquidacionIds?: string;
}

const SearchPaid: React.FC<SearchPaidProps> = ({ liquidacionId, liquidacionIds }) => {
    const router = useRouter();
    const { theme } = useTheme();
    
    // Debug: Mostrar parámetros recibidos inmediatamente
    console.log('[SearchPaid] - PROPS RECIBIDAS AL INICIALIZAR:', {
        liquidacionId,
        liquidacionIds,
        tipoLiquidacionId: typeof liquidacionId,
        tipoLiquidacionIds: typeof liquidacionIds
    });
    
    // Usar useSession solo para autenticación sin almacenar session
    useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    
    const [formData, setFormData] = useState({
        fechaInicio: '',
        fechaFinalizacion: ''
    });
    
    console.log('[SearchPaid] - ANTES DE LLAMAR useFacturasPagadas:', {
        liquidacionId,
        liquidacionIds
    });
    
    const { 
        facturas, 
        isLoading, 
        error, 
        currentPage: apiCurrentPage, 
        totalPages: apiTotalPages, 
        totalCount, 
        goToPage
    } = useFacturasPagadas(liquidacionId, liquidacionIds);
    
    const [filteredFacturas, setFilteredFacturas] = useState<FacturaPagada[]>([]);
    const [selectedFacturas, setSelectedFacturas] = useState<Set<string>>(new Set());
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isSessionValid] = useState(true);
    
    // Estados locales para paginación (para filtros front-end cuando no hay back-end pagination)
    const [localCurrentPage, setLocalCurrentPage] = useState(1);
    const [localItemsPerPage] = useState(10);

    // Efecto para inicializar las facturas filtradas con todas las facturas
    useEffect(() => {
        // Log de parámetros recibidos
        console.log('[SearchPaid] - Parámetros recibidos:', {
            liquidacionId,
            liquidacionIds,
            tipoConsulta: liquidacionIds ? 'múltiples IDs' : liquidacionId ? 'ID único' : 'todas las facturas'
        });
        
        // Asegurarse de que facturas es un array antes de asignarlo
        console.log('Facturas recibidas en SearchPaid:', {
            cantidad: Array.isArray(facturas) ? facturas.length : 0,
            esArray: Array.isArray(facturas),
            primeraFactura: facturas && Array.isArray(facturas) && facturas.length > 0 ? facturas[0] : null
        });
        
        if (Array.isArray(facturas) && facturas.length > 0) {
            setFilteredFacturas(facturas);
            // Limpiar cualquier mensaje de error previo
            setErrorMessage('');
            setShowErrorAlert(false);
        } else {
            setFilteredFacturas([]);
        }
    }, [facturas, liquidacionId, liquidacionIds]);

    // Efecto para manejar errores de la API y evitar mostrar el mensaje "Error al obtener facturas pagadas: No se encontraron registros."
    useEffect(() => {
        if (error && error !== "No se encontraron registros.") {
            console.log('Error en SearchPaid:', error);
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleBuscar = () => {
        // Validar que ambas fechas estén ingresadas
        if (formData.fechaInicio && formData.fechaFinalizacion) {
            const fechaInicio = new Date(formData.fechaInicio);
            const fechaFin = new Date(formData.fechaFinalizacion);
            
            // Validar que la fecha de inicio no sea mayor que la fecha de fin
            if (fechaInicio > fechaFin) {
                setErrorMessage('La fecha de inicio no puede ser mayor que la fecha de finalización');
                setShowErrorAlert(true);
                return;
            }

            // Asegurarse que facturas es un array antes de filtrar
            if (!Array.isArray(facturas)) {
                setFilteredFacturas([]);
                return;
            }

            console.log('Fechas de filtro - Inicio:', fechaInicio.toISOString(), 'Fin:', fechaFin.toISOString());
            
            // Log para verificar el formato de fecha_pago en las facturas
            const primeraFactura = facturas.length > 0 ? facturas[0] : null;
            if (primeraFactura) {
                console.log('Ejemplo de fecha_pago en factura:', primeraFactura.fecha_pago);
                console.log('Ejemplo de fecha_creacion en factura:', primeraFactura.fecha_creacion);
            }

            // Filtrar las facturas por fecha de pago
            const facturasFiltradasPorFecha = facturas.filter(factura => {
                // Asegurarse de que fecha_pago existe y tiene un formato válido
                if (!factura.fecha_pago) {
                    console.log('Factura sin fecha_pago:', factura.nro_factura_unica);
                    return false; // Excluir facturas sin fecha de pago
                }
                
                try {
                    const fechaPago = new Date(factura.fecha_pago);
                    
                    // Verificar si la fecha es válida
                    if (isNaN(fechaPago.getTime())) {
                        console.log('Fecha de pago inválida:', factura.fecha_pago);
                        return false;
                    }
                    
                    // Para comparación precisa
                    const fechaInicioComparar = new Date(fechaInicio);
                    const fechaFinComparar = new Date(fechaFin);
                    
                    fechaInicioComparar.setHours(0, 0, 0, 0);
                    fechaFinComparar.setHours(23, 59, 59, 999);
                    
                    // Convertir la fecha de pago a fecha local para comparar
                    const fechaPagoLocal = new Date(fechaPago.toDateString());
                    
                    console.log('Comparando fechas - Factura:', factura.nro_factura_unica, 
                                'Fecha pago:', fechaPagoLocal.toISOString(), 
                                'Resultado:', fechaPagoLocal >= fechaInicioComparar && fechaPagoLocal <= fechaFinComparar);
                    
                    return fechaPagoLocal >= fechaInicioComparar && fechaPagoLocal <= fechaFinComparar;
                } catch (error) {
                    console.error('Error al procesar fecha:', error);
                    return false;
                }
            });
            
            console.log('Total facturas filtradas:', facturasFiltradasPorFecha.length);
            setFilteredFacturas(facturasFiltradasPorFecha);
            setLocalCurrentPage(1); // Resetear a la primera página al filtrar
            
            // Mostrar alerta si no se encontraron facturas en el rango de fechas
            if (facturasFiltradasPorFecha.length === 0) {
                const fechaInicioStr = fechaInicio.toLocaleDateString('es-ES');
                const fechaFinStr = fechaFin.toLocaleDateString('es-ES');
                setErrorMessage(`No se encontraron facturas pagadas entre ${fechaInicioStr} y ${fechaFinStr}`);
                setShowErrorAlert(true);
            }
        } else {
            // Si no hay fechas, mostrar todas las facturas
            if (!formData.fechaInicio && !formData.fechaFinalizacion) {
                setFilteredFacturas(Array.isArray(facturas) ? facturas : []);
                setLocalCurrentPage(1);
            } else {
                // Si falta alguna fecha, mostrar error
                setErrorMessage('Por favor, ingrese ambas fechas para realizar la búsqueda');
                setShowErrorAlert(true);
            }
        }
    };

    const handleResetFiltros = () => {
        setFormData({
            fechaInicio: '',
            fechaFinalizacion: ''
        });
        setFilteredFacturas(Array.isArray(facturas) ? facturas : []);
        setLocalCurrentPage(1);
    };

    const formatDate = (value: string) => {
        if (!value) return 'No registrado';
        
        try {
            const fecha = new Date(value);
            
            // Verificar si la fecha es válida
            if (isNaN(fecha.getTime())) {
                console.warn('Fecha inválida:', value);
                return 'Formato inválido';
            }
            
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return 'Error en formato';
        }
    };

    const formatCurrency = (value: number | string) => {
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        
        // Verificar si el valor es NaN o no es un número válido
        if (isNaN(numericValue)) {
            return '$ 0';
        }
        
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numericValue);
    };

    const mapFacturaToCuotaPagada = (factura: FacturaPagada): CuotaPagadaData => {
        // Calcular el precio por kilo solo si los valores son válidos
        let precioKilo = 0;
        if (factura.total_kilos && factura.total_kilos > 0) {
            // Usar el precio_kilo directamente de la API si está disponible
            precioKilo = factura.precio_kilo || 0;
        }
        
        // Convertir la fecha_pago a un formato consistente si existe
        let fechaPagoFormateada = factura.fecha_pago;
        if (fechaPagoFormateada) {
            try {
                // Intentar crear un objeto Date a partir de la cadena
                const fechaPago = new Date(fechaPagoFormateada);
                if (!isNaN(fechaPago.getTime())) {
                    // Solo actualizar si la fecha es válida
                    fechaPagoFormateada = fechaPago.toISOString();
                }
            } catch (error) {
                console.error('Error al formatear fecha de pago:', error);
            }
        }
        
        return {
            fecha_registro_factura: factura.fecha_creacion,
            numero_factura_unica: factura.nro_factura_unica.toString(),
            nro_documento_pago: factura.nro_documento_pago || undefined,
            departamento: factura.nombre_departamento || '-',
            municipio: factura.nombre_municipio || '-',
            nit_proveedor: factura.nit_proveedor || '-',
            fecha_compra: factura.fecha_compra,
            kilos_reportados: factura.total_kilos,
            kilos_certificados: factura.total_kilos_certificados || 0,
            precio_kilo: precioKilo,
            cuota_fomento: parseFloat(factura.cuota_fomento),
            fecha_pago: fechaPagoFormateada || '',
            kilos_paz_salvo: factura.kilos_paz_y_salvo || 0,
            selected: selectedFacturas.has(factura.nro_factura_unica.toString())
        };
    };

    const columns = [
        {
            key: 'fecha_registro_factura',
            label: 'Fecha de Registro',
            render: (value: string) => formatDate(value)
        },
        {
            key: 'numero_factura_unica',
            label: 'Nº Factura Única',
            render: (value: string) => value || '-'
        },
        {
            key: 'nro_documento_pago',
            label: 'Nro de Documento Pago',
            render: (value: string) => value || '-'
        },
        {
            key: 'departamento',
            label: 'Departamento',
            render: (value: string) => value || '-'
        },
        {
            key: 'municipio',
            label: 'Municipio',
            render: (value: string) => value || '-'
        },
        {
            key: 'nit_proveedor',
            label: 'NIT Proveedor',
            render: (value: string) => value || '-'
        },
        {
            key: 'fecha_compra',
            label: 'Fecha de Compra',
            render: (value: string) => formatDate(value)
        },
        {
            key: 'kilos_reportados',
            label: 'Kilos Totales',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'kilos_certificados',
            label: 'Kilos Certificables',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'kilos_paz_salvo',
            label: 'Kilos Con Paz y Salvo',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'precio_kilo',
            label: 'Precio por Kilo',
            render: (value: number) => formatCurrency(value)
        },
        {
            key: 'cuota_fomento',
            label: 'Cuota de Fomento',
            render: (value: number) => formatCurrency(value)
        },
        {
            key: 'fecha_pago',
            label: 'Fecha de Pago',
            render: (value: string) => value ? formatDate(value) : 'No registrado'
        }
    ];

    const handleCheckboxChange = (row: CuotaPagadaData) => {
        const newSelectedFacturas = new Set(selectedFacturas);
        if (selectedFacturas.has(row.numero_factura_unica)) {
            newSelectedFacturas.delete(row.numero_factura_unica);
        } else {
            newSelectedFacturas.add(row.numero_factura_unica);
        }
        setSelectedFacturas(newSelectedFacturas);
    };

    const handleSelectAll = () => {
        if (selectedFacturas.size === filteredFacturas.length) {
            // Si todas están seleccionadas, deseleccionar todas
            setSelectedFacturas(new Set());
        } else {
            // Si no todas están seleccionadas, seleccionar todas
            const allFacturaIds = new Set(filteredFacturas.map(factura => factura.nro_factura_unica.toString()));
            setSelectedFacturas(allFacturaIds);
        }
    };

    const handleSeleccionar = () => {
        if (!isSessionValid) {
            router.push('/auth');
            return;
        }
        
        const facturasSeleccionadas = filteredFacturas
            .filter(factura => selectedFacturas.has(factura.nro_factura_unica.toString()));
        
        if (facturasSeleccionadas.length === 0) {
            setErrorMessage('Por favor, seleccione al menos una factura');
            setShowErrorAlert(true);
            return;
        }

        // Mostrar indicador de carga
        setIsRedirecting(true);

        try {
            // Guardar información completa de las facturas seleccionadas en localStorage
            const facturasParaGuardar = facturasSeleccionadas.map(factura => ({
                id_factura_unica: factura.id_factura_unica,
                total_kilos: factura.total_kilos || 0,
                total_kilos_certificados: factura.total_kilos_certificados || 0,
                kilos_paz_y_salvo: factura.kilos_paz_y_salvo || 0,
                fecha_creacion: factura.fecha_creacion || '',
                nro_factura_unica: factura.nro_factura_unica || 0,
                nombre_departamento: factura.nombre_departamento || '',
                nombre_municipio: factura.nombre_municipio || '',
                nit_proveedor: factura.nit_proveedor || '',
                fecha_compra: factura.fecha_compra || '',
                precio_kilo: factura.precio_kilo || 0,
                cuota_fomento: factura.cuota_fomento || '',
                fecha_pago: factura.fecha_pago || '',
                id_persona_proveedor: factura.id_persona_proveedor || 0
            }));

            // Imprimir para depuración
            console.log('Facturas completas seleccionadas para localStorage:', facturasParaGuardar);
            
            // Validar que todas las facturas tienen id_factura_unica
            const todasConId = facturasParaGuardar.every(f => typeof f.id_factura_unica === 'number' && f.id_factura_unica > 0);
            if (!todasConId) {
                throw new Error('Algunas facturas no tienen ID válido');
            }
            
            localStorage.setItem('facturasSeleccionadasPazSalvo', JSON.stringify(facturasParaGuardar));

            // También guardar una versión para diagnóstico
            localStorage.setItem('facturasSeleccionadasPazSalvo_debug', JSON.stringify({
                timestamp: new Date().toISOString(),
                facturas: facturasParaGuardar
            }));

            // Redirigir a la página de generar paz y salvo
            router.push('/recaudadores/generar_paz_salvo');
        } catch (error) {
            console.error('Error al preparar la redirección:', error);
            setIsRedirecting(false);
            setErrorMessage('Error al preparar la redirección. Por favor intente nuevamente.');
            setShowErrorAlert(true);
        }
    };

    const actions = [
        {
            label: 'Seleccionar',
            render: (row: CuotaPagadaData) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectedFacturas.has(row.numero_factura_unica)}
                        onChange={() => handleCheckboxChange(row)}
                        className="h-4 w-4 text-[#78390e] border-gray-300 rounded cursor-pointer focus:ring-[#78390e]"
                    />
                </div>
            ),
            headerRender: () => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={filteredFacturas.length > 0 && selectedFacturas.size === filteredFacturas.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-[#78390e] border-gray-300 rounded cursor-pointer focus:ring-[#78390e]"
                        title={selectedFacturas.size === filteredFacturas.length ? "Deseleccionar todas" : "Seleccionar todas"}
                    />
                </div>
            )
        }
    ];

    // Determinar si estamos usando filtros locales (fechas) o paginación del backend
    const isUsingLocalFilters = formData.fechaInicio || formData.fechaFinalizacion;
    
    // Debug: Log de información de paginación
    console.log('[SearchPaid] - Estado de paginación:', {
        isUsingLocalFilters,
        apiCurrentPage,
        apiTotalPages,
        totalCount,
        localCurrentPage,
        facturasCount: Array.isArray(facturas) ? facturas.length : 0,
        filteredFacturasCount: Array.isArray(filteredFacturas) ? filteredFacturas.length : 0
    });
    
    const handlePageChange = (newPage: number) => {
        if (isUsingLocalFilters) {
            // Para filtros locales, usar paginación local
            setLocalCurrentPage(newPage);
        } else {
            // Para paginación del backend
            goToPage(newPage);
        }
    };

    const getCurrentPageData = (data: CuotaPagadaData[], page: number) => {
        if (!isUsingLocalFilters) {
            // Si usamos paginación del backend, mostrar todos los datos de la página actual
            return data;
        }
        
        // Para filtros locales, paginar manualmente
        const startIndex = (page - 1) * localItemsPerPage;
        const endIndex = startIndex + localItemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const fetchAllData = async (page: number) => {
        try {
            // Asegurarse de que filteredFacturas es un array antes de mapear
            const dataToMap = Array.isArray(filteredFacturas) ? filteredFacturas : [];
            const mappedData = dataToMap.map(mapFacturaToCuotaPagada);
            
            if (page === 0) {
                // Para descarga completa
                return {
                    data: mappedData,
                    total_pages: 1
                };
            }
            
            return {
                data: mappedData,
                total_pages: isUsingLocalFilters 
                    ? Math.ceil(mappedData.length / localItemsPerPage)
                    : apiTotalPages
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    return (
        <div className="w-full">
            <AlertError 
                isOpen={showErrorAlert} 
                onClose={() => setShowErrorAlert(false)} 
                message={errorMessage} 
            />
            
            {/* Indicador de carga durante redirección */}
            {isRedirecting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]"></div>
                </div>
            )}
            
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}>
                            <button
                                onClick={() => router.push('/')}
                                className="absolute top-2 right-4 text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center text-xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    {(liquidacionId || liquidacionIds)
                                        ? `Cuotas Pagadas`
                                        : 'Consulta de Cuotas Pagadas'
                                    }
                                </h3>
                            </div>
                            

                            {/* Solo mostrar filtros de fecha si no hay liquidación específica */}
                            {!liquidacionId && !liquidacionIds && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <AnimatedInput
                                            label="Fecha de Inicio"
                                            name="fechaInicio"
                                            type="date"
                                            value={formData.fechaInicio}
                                            onChange={handleInputChange}
                                        />
                                        <AnimatedInput
                                            label="Fecha de Finalización"
                                            name="fechaFinalizacion"
                                            type="date"
                                            value={formData.fechaFinalizacion}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                                        <Button 
                                            onClick={handleBuscar} 
                                            title="Buscar" 
                                        />
                                        <Button 
                                            onClick={handleResetFiltros} 
                                            title="Limpiar Filtros" 
                                        />
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md text-center">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 overflow-x-auto">
                                {isLoading ? (
                                    <div className="flex justify-center items-center p-8">
                                        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]"></div>
                                    </div>
                                ) : (
                                    <DynamicTable
                                        columns={columns}
                                        data={Array.isArray(filteredFacturas) 
                                            ? getCurrentPageData(
                                                filteredFacturas.map(mapFacturaToCuotaPagada), 
                                                isUsingLocalFilters ? localCurrentPage : apiCurrentPage
                                              )
                                            : []}
                                        currentPage={isUsingLocalFilters ? localCurrentPage : apiCurrentPage}
                                        totalPages={isUsingLocalFilters 
                                            ? Math.ceil((Array.isArray(filteredFacturas) ? filteredFacturas.length : 0) / localItemsPerPage)
                                            : apiTotalPages}
                                        onPageChange={handlePageChange}
                                        actions={actions}
                                        isLoading={isLoading}
                                        fetchAllData={fetchAllData}
                                        downloadButtonPosition="top"
                                    />
                                )}
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                                <Button 
                                    onClick={handleSelectAll} 
                                    title={selectedFacturas.size === filteredFacturas.length && filteredFacturas.length > 0 
                                        ? "Deseleccionar Todas" 
                                        : "Seleccionar Todas"}
                                    disabled={filteredFacturas.length === 0}
                                />
                                <Button 
                                    onClick={handleSeleccionar} 
                                    title="Seleccionar"
                                    disabled={selectedFacturas.size === 0 || filteredFacturas.length === 0}
                                />
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPaid;