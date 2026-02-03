'use client';

import React, { useState } from 'react';
import PurchaseDetails from '@/presenters/components/recaudadores/PurchaseDetails';
import PurchaseDetailsTable from './components/ButtonsEditPurchase';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatCurrency, formatNumberWithCommas } from '@/utils/formatters';
import { useInvoiceDetails } from '@/application/recaudadores/factura/useInvoiceDetailts';

interface DetalleCompra {
    tipoCacao: string;
    cantidadKilos: number;
    precioKilo: number;
    valorBruto: number;
    cuotaFomento: number;
    valorNeto: number;
}

const DetalleCompra = () => {
    const searchParams = useSearchParams();
    const [valorTotal, setValorTotal] = useState('');
    const id = searchParams.get('id');
    const { data: session } = useSession();
    const valueSesion: any = session;
    const { data } = useInvoiceDetails(valueSesion?.user?.tokens?.access || '', id);

    const columns = [
        { key: 'tipoCacao', label: 'TIPO DE CACAO' },
        {
            key: 'cantidadKilos',
            label: 'CANTIDAD KILOS',
            render: (value: any) => formatNumberWithCommas(value)
        },
        {
            key: 'precioKilo',
            label: 'PRECIO DE KILO',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'valorBruto',
            label: 'VALOR BRUTO (KG X PRECIO DE KG)',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'cuotaFomento',
            label: 'CUOTA DE FOMENTO (3%)',
            render: (value: any) => formatCurrency(value)
        },
        {
            key: 'valorNeto',
            label: 'VALOR NETO',
            render: (value: any) => formatCurrency(value)
        }
    ];

    const dataTable = data?.data?.map((item: any) => ({
        id_detalle_factura_unica: item.id_detalle_factura_unica,
        tipoCacao: item.nombre_tipo_cacao,
        cantidadKilos: item.nro_kilos,
        precioKilo: parseFloat(item.valor_kilo),
        valorBruto: item.valor_bruto,
        cuotaFomento: item.cuota_fomento,
        valorNeto: item.valor_neto,
        id_tipo_cacao: item.id_tipo_cacao
    })) || [];


    if (!id) {
        return <div>Error: No se encontró el ID de la factura</div>;
    }

    if (!data?.data || data.data.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
            </div>
        );
    }

    const firstItem = data.data[0];
    const invoiceData = {
        ...firstItem,
        ...firstItem.recaudador_info,
        ...firstItem.proveedor_info
    };

    return (
        <div className="w-full">
            <PurchaseDetails
                ContentComponent={PurchaseDetailsTable}
                contentProps={{
                    columns,
                    data: dataTable,
                    valorTotal,
                    onValorTotalChange: setValorTotal,
                    invoiceId: parseInt(id),
                    formData: invoiceData
                }}
                invoiceData={invoiceData}
            />
        </div>
    );
};

export default DetalleCompra;
