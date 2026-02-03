'use client';

import React, { useState, } from 'react';
import { useUserProfile } from '@/application/user/useUserProfile';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { formatCurrency, formatNumberWithCommas } from '@/utils/formatters';
import RegisterOnePurchase from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/components/RegisterOnePurchase';

interface DetalleCompra {
    tipoCacao: string;
    cantidadKilos: number;
    precioKilo: number;
    valorBruto: number;
    cuotaFomento: number;
    valorNeto: number;
}

interface InitialData {
    recaudador_info: {
        fecha_compra: string;
        fecha_registro: string;
        numero_documento: string;
        nombre_completo_o_comercial: string;
        telefono: string;
        municipio: string;
        tipo_comprador: string;
        direccion_notificaciones: string;
        email: string;
        nro_factura_unica: string;
    };
    proveedor_info: {
        numero_documento: string;
        nombre_completo_o_comercial: string;
        departamento: string;
        municipio: string;
    };
}

const RegistrarCompra = () => {
    
    const [valorTotal, setValorTotal] = useState('');

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const valueSesion: any = session;

    const { profile } = useUserProfile(valueSesion?.user?.tokens?.access);

    const initialData: InitialData = {
        recaudador_info: {
            fecha_compra: new Date().toISOString().split('T')[0],
            fecha_registro: new Date().toISOString().split('T')[0],
            numero_documento: profile?.persona?.numero_documento || '',
            nombre_completo_o_comercial: profile?.persona?.nombre_comercial || 
                                        profile?.persona?.razon_social || 
                                        `${profile?.persona?.primer_nombre || ''} ${profile?.persona?.segundo_nombre || ''} ${profile?.persona?.primer_apellido || ''} ${profile?.persona?.segundo_apellido || ''}`.trim() || '',
            telefono: profile?.persona?.telefono_celular || profile?.persona?.telefono_empresa || '',
            municipio: profile?.persona?.nombre_municipio_laboral || profile?.persona?.nombre_municipio_residencia || '',
            tipo_comprador: profile?.persona?.cod_tipo_comprador || '',
            direccion_notificaciones: profile?.persona?.direccion_residencia || profile?.persona?.direccion_notificaciones || '',
            email: profile?.persona?.email || '',
            nro_factura_unica: 'Pendiente'
        },
        proveedor_info: {
            numero_documento: '',
            nombre_completo_o_comercial: '',
            departamento: '',
            municipio: ''
        }
    };

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

    const data: DetalleCompra[] = [];

    return (
        <div className="w-full">
            <RegisterOnePurchase
                contentProps={{
                    columns,
                    data,
                    valorTotal,
                    onValorTotalChange: setValorTotal,
                }}
                invoiceData={initialData}
            />
        </div>
    );
};

export default RegistrarCompra;
