'use client'

// react
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from 'react';

// utils
import { formatCurrency } from '@/utils/formatters'
import { formatearFechaDMY } from '@/utils/dateUtils'

// ui
import DynamicTable from "@/presenters/components/ui/DynamicTable";
import { IconButton } from "@mui/material";
import { FileDownload } from "@mui/icons-material";
import { Button } from "@/presenters/components/ui/AnimatedButton";

// notifications
import AlertQuestion from "@/presenters/components/recaudadores/AlertQuestion";

// consulta acuerdos de pago
import { ExternalUserInfo } from "@/presenters/components/recaudadores/ExternalUserInfo";
import { useCuotasPagadas } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar_pagadas/hooks/useCuotasPagadas';

import AnimatedInput from "@/presenters/components/ui/AnimatedInput";

// estados acuerdos de pago

export default function ConsultarCuotasPagadas() {
    
    const { theme } = useTheme();
    const router = useRouter();

    const { data: session } = useSession();
    const valueSesion: any = session;

    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);

    const [isAlertQuestion, setIsAlertQuestion] = useState(false);
    const [alertQuestionText, ] = useState('');

    const [nroPlanPago, setNroPlanPago] = useState<string>('');
    const [nroSolicitud, setNroSolicitud] = useState<string>('');
    const [fechaPagoInicio, setFechaPagoInicio] = useState<string>('');
    const [fechaPagoFin, setFechaPagoFin] = useState<string>('');

    // const [, setNumeroDocumentoRecaudador] = useState<string | null>(null);

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const { data, isLoading, fetchCuotasPagadas } = useCuotasPagadas(isInternalUser);

    // Solo ejecuta la petición cuando isInternalUser ya tiene valor
    useEffect(() => {
        if (isInternalUser !== null) {
            fetchCuotasPagadas();
        }
    }, [isInternalUser, fetchCuotasPagadas]);


    // Solo mostrar loader global si aún no se ha determinado el tipo de usuario
    const showGlobalLoader = isInternalUser === null;

    const tableData = React.useMemo(() => {
        if (!data?.cuotas_pagadas || data.cuotas_pagadas.length === 0) {
            return [];
        }
        return data.cuotas_pagadas.map((item) => {
            // Para usuarios externos, el recaudador está a nivel raíz (data.recaudador)
            // Para usuarios internos, el recaudador está en cada cuota (item.recaudador)
            const recaudador = isInternalUser ? item.recaudador : data.recaudador;
            
            return {
                ...item,
                // Usar el recaudador correspondiente según el tipo de usuario
                nombre_recaudador: recaudador ? `${recaudador.nombres} ${recaudador.apellidos}` : '',
                documento_recaudador: recaudador ? recaudador.numero_documento : '',
            };
        });
    }, [data, isInternalUser]);

    // Fechas para Excel (YYYY-MM-DD) y números sin formato para permitir operaciones
    const formatDateForExcel = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Función para formatear datos para Excel
    const formatDataForExcel = (data: any[]) => {
        return data.map(row => ({
            // Solo incluir las columnas relevantes para Excel (excluir documentos)
            nro_solicitud: Number(row.nro_solicitud ?? 0),
            nro_plan_pago: Number(row.nro_plan_pago ?? 0),
            nro_cuota: Number(row.nro_cuota ?? 0),
            valor_cuota: Number(row.valor_cuota ?? 0),
            nombre_recaudador: row.nombre_recaudador,
            documento_recaudador: row.documento_recaudador,
            fecha_vencimiento: formatDateForExcel(row.fecha_vencimiento),
            fecha_pago: row.fecha_pago ? formatDateForExcel(row.fecha_pago) : '',
            nro_doc_pago: row.nro_doc_pago ? row.nro_doc_pago : '',
        }));
    };

    // Función para obtener datos para Excel
    const fetchDataForExcel = async () => {
        if (!tableData || tableData.length === 0) {
            return { data: [], total_pages: 1 };
        }
        
        return {
            data: formatDataForExcel(tableData),
            total_pages: 1
        };
    };

    // Columnas para la tabla visual (incluye documentos)
    const columns = React.useMemo(() => [
        { key: 'nro_solicitud', label: 'N° Solicitud' },
        { key: 'nro_plan_pago', label: 'N° Plan Pago' },
        { key: 'nro_cuota', label: 'N° Cuota' },
        { key: 'valor_cuota', label: 'Valor Cuota', render: (v: number) => formatCurrency(v) },
        { key: 'nombre_recaudador', label: 'Nombre Recaudador' },
        { key: 'documento_recaudador', label: 'N° Documento Recaudador' },
        { key: 'fecha_vencimiento', label: 'Fecha Vencimiento', render: (v: string) => formatearFechaDMY(new Date(v)) },
        { key: 'fecha_pago', label: 'Fecha Pago', render: (v: string) => v ? formatearFechaDMY(new Date(v)) : '' },
        { key: 'nro_doc_pago', label: 'N° Doc Pago', render: (v: string) => v ? v : '-' },

        { key: 'documento', label: 'Acciones', render: (doc: any) => doc?.archivo ? (
            <IconButton
                onClick={() => window.open(doc.archivo, '_blank')}
                sx={{
                    color: theme === 'dark' ? '#fff' : '#4D750F',
                    '&:hover': {
                        backgroundColor: theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(77, 117, 15, 0.1)'
                    }
                }}
            >
                <FileDownload />
            </IconButton>
        ) : '-' },

        { key: 'documento', label: 'Acciones', render: (doc: any) => doc?.comprobante_pago ? (
            <IconButton
                onClick={() => window.open(doc.comprobante_pago, '_blank')}
                sx={{
                    color: theme === 'dark' ? '#fff' : '#4D750F',
                    '&:hover': {
                        backgroundColor: theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(77, 117, 15, 0.1)'
                    }
                }}
            >
                <FileDownload />
            </IconButton>
        ) : '-' }
    ], []);


    return (
        showGlobalLoader ? (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
            </div>
        ) : (
            <div>

                <AlertQuestion
                    isOpen={isAlertQuestion}
                    questionText={alertQuestionText}
                    onClose={() => setIsAlertQuestion(false)}
                    onConfirm={() => setIsAlertQuestion(true)}
                />

                <div className="w-full max-w-full mx-auto">
                    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-6 relative ${theme === 'dark' ? 'dark' : 'bg-white'}`}>

                            <button
                                onClick={() => router.push('/')}
                                className="absolute top-2 right-4 text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                            >
                                &times;
                            </button>

                            {isInternalUser === true ? (                            
                                <h2 className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]' }`} >CONSULTA DE CUOTAS PAGADAS </h2>                                                   
                            ) : (
                                <h2 className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]' }`} >CONSULTA DE CUOTAS PAGADAS </h2>                      
                            )}
                            
                            <h3 className={`text-md text-[rgb(var(--brown))] text-left font-bold mt-4 ${theme === 'dark' ? 'text-white' : 'text-[#562707]' }`}>Datos Empresariales</h3>

                            {isInternalUser === true ? (
                                // <InternalUserInfo onFoundCollector={handleFoundCollector} />
                                <ExternalUserInfo />
                            ) : (
                                <ExternalUserInfo />
                            )}

                        </div>

                        {isInternalUser ? (
                        <div className={`rounded-xl p-6 mt-6 relative ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                            <div className="grid md:grid-cols-2 gap-4"> 
                                <AnimatedInput
                                    label="N° Plan Pago"
                                    name="nro_plan_pago"
                                    type="number"
                                    value={nroPlanPago}
                                    onChange={(e) => setNroPlanPago(e.target.value)}
                                    darkMode={theme === 'dark'}
                                />
                                <AnimatedInput
                                    label="N° Solicitud"
                                    name="nro_solicitud"
                                    type="number"
                                    value={nroSolicitud}
                                    onChange={(e) => setNroSolicitud(e.target.value)}
                                    darkMode={theme === 'dark'}
                                />

                                <AnimatedInput
                                    label="Fecha Inicio"
                                    name="fecha_pago_inicio"
                                    type="date"
                                    value={fechaPagoInicio}
                                    onChange={(e) => setFechaPagoInicio(e.target.value)}
                                    darkMode={theme === 'dark'}
                                />

                                <AnimatedInput
                                    label="Fecha Fin"
                                    name="fecha_pago_fin"
                                    type="date"
                                    value={fechaPagoFin}
                                    onChange={(e) => setFechaPagoFin(e.target.value)}
                                    darkMode={theme === 'dark'}
                                />  
                            </div>

                                <div className="flex justify-center mt-4 gap-4 flex-wrap">
                                    <Button
                                        title="Consultar"
                                        onClick={() => {
                                            fetchCuotasPagadas({
                                                nro_plan_pago: nroPlanPago || undefined,
                                                nro_solicitud: nroSolicitud || undefined,
                                                fecha_pago_desde: fechaPagoInicio || undefined,
                                                fecha_pago_hasta: fechaPagoFin || undefined,
                                            });
                                        }}
                                    />
                                    <Button
                                        title="Limpiar"
                                        onClick={() => {
                                            setNroPlanPago('');
                                            setNroSolicitud('');
                                            setFechaPagoInicio('');
                                            setFechaPagoFin('');
                                            fetchCuotasPagadas({});
                                        }}
                                    />
                                    <Button
                                        title="Salir"
                                        onClick={() => router.push('/')}
                                    />
                                </div>

                        </div>
                        ) : null }
                        

                        <div className={`rounded-xl p-6 mt-6 relative ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                            <DynamicTable
                                columns={columns}
                                data={tableData}
                                isLoading={isLoading}
                                currentPage={1}
                                totalPages={1}
                                onPageChange={() => {}}
                                fetchDataForExcel={fetchDataForExcel}
                            />
                        </div>
                    </div>
                </div>   
            </div>
        )
    );
}