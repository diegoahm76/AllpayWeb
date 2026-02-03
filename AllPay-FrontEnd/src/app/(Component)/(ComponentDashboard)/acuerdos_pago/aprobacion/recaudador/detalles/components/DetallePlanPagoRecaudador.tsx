'use client'

// react
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

// hooks
import { useDetallePlanPagoRecaudador } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/detalles/hooks/useDetallePPRecaudador';

// utils
import { formatCurrency } from '@/utils/formatters';
import { formatearFechaDMY } from '@/utils/dateUtils';

// presenters
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';

export default function DetallePlanPagoRecaudador() {

    const { data: session } = useSession();
    const router = useRouter();
    const token = (session as any)?.user?.tokens?.access;
    const searchParams = useSearchParams();
    const idSolicitud = searchParams.get('id');
    const { theme } = useTheme();

    const {
        loading,
        error,
        data,
        fetchAllData
    } = useDetallePlanPagoRecaudador(idSolicitud || '', token || '');

    const tableData = data.map(item => ({
        numero_solicitud: item.nro_solicitud,
        tipo_documento: item.tipo_documento_recaudador,
        numero_documento: item.numero_documento_recaudador,
        nombre_recaudador: item.nombre_recaudador,
        fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
        estado: item.estado,
        numero_plan_pago: item.numero_plan_pago,
        estado_plan_pago: item.estado_plan_pago_display,
        numero_cuota: item.numero_cuota,
        fecha_pago: item.fecha_pago ? formatearFechaDMY(new Date(item.fecha_pago)) : 'Pendiente',
        nro_factura: item.Nro_factura,
        cuota_fomento: formatCurrency(item.cuota_fomento),
        valor_factura: formatCurrency(item.valor_factura)
    }));

    const columns = [
        {
            key: 'numero_cuota',
            label: 'NÚMERO CUOTA',
        },
        
        {
            key: 'numero_documento',
            label: 'NÚMERO DOCUMENTO',
        },
        {
            key: 'nombre_recaudador',
            label: 'NOMBRE RECAUDADOR',
        },
        {
            key: 'fecha_solicitud',
            label: 'FECHA SOLICITUD',
        },
        {
            key: 'numero_solicitud',
            label: 'NÚMERO DE SOLICITUD',
        },    
        {
            key: 'estado_plan_pago',
            label: 'ESTADO PLAN PAGO',
        },
        
        {
            key: 'fecha_pago',
            label: 'FECHA PAGO',
        },
        {
            key: 'nro_factura',
            label: 'NÚMERO FACTURA',
        },
        {
            key: 'cuota_fomento',
            label: 'CUOTA FOMENTO',
        },
        {
            key: 'valor_factura',
            label: 'VALOR FACTURA',
        }
    ];

    return (
        <div className="w-full max-w-full mx-auto p-6">
            <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>                    
                    <h3 className={`text-2xl text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                        Detalle de las Cuotas del Plan de Pago
                    </h3>

                    {loading && (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                        </div>
                    )}

                    {error && (
                        <div className="text-center text-red-600 py-4">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <DynamicTable
                            columns={columns}
                            data={tableData}
                            currentPage={1}
                            totalPages={1}
                            fetchAllData={fetchAllData}
                            onPageChange={() => {}}
                            isLoading={loading}
                        />
                    )}

<div className="flex justify-center items-center mt-6">
                        <Button
                            onClick={() => router.back()}
                            title="Regresar"
                        />        
                    </div>
                </div>
            </div>
        </div>
    );
}

