'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import TablaAccionesCobro from './components/TablaAccionesCobro';

const AccionesCobroPage: React.FC = () => {
    const searchParams = useSearchParams();
    const facturaId = searchParams.get('facturaId');
    const nroFactura = searchParams.get('nroFactura');

    return (
        <div className="w-full max-w-full mx-auto p-6">
            <TablaAccionesCobro 
                facturaId={facturaId} 
                nroFactura={nroFactura}
            />
        </div>
    );
};

export default AccionesCobroPage;