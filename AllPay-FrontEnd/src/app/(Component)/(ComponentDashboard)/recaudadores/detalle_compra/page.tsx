'use client';

import React, { useState, useCallback } from 'react';
import PurchaseDetails from '@/presenters/components/recaudadores/PurchaseDetails';
import PurchaseDetailsTable from './components/ButtonsDetailsPurchase';
import { useSearchParams } from 'next/navigation';
import { useInvoiceDetails } from '@/application/recaudadores/factura/useInvoiceDetailts';
import { useSession } from 'next-auth/react';
import { formatCurrency, formatNumberWithCommas } from '@/utils/formatters';

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
    const [valorTotal, setValorTotal] = useState('0');
    const id = searchParams.get('id');
    const { data: session } = useSession();
    const valueSesion: any = session;
    const { data, error } = useInvoiceDetails(valueSesion?.user?.tokens?.access || '', id);

    const handleValorTotalChange = useCallback((newValue: string) => {
        setValorTotal(newValue);
    }, []);

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

    const dataTable: DetalleCompra[] = data?.data?.map(item => ({
        tipoCacao: item.nombre_tipo_cacao,
        cantidadKilos: item.nro_kilos,
        precioKilo: parseFloat(item.valor_kilo),
        valorBruto: item.valor_bruto,
        cuotaFomento: item.cuota_fomento,
        valorNeto: item.valor_neto
    })) || [];

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="w-full">
            <PurchaseDetails
                ContentComponent={PurchaseDetailsTable}
                contentProps={{
                    columns,
                    data: dataTable,
                    valorTotal,
                    onValorTotalChange: handleValorTotalChange,
                }}
                invoiceData={data?.data?.[0]}
            />
        </div>
    );
};

export default DetalleCompra;
