'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import RegistroAccionesCobroPesuasivo from './components/RegistroAccionesCobroPesuasivo';

const RegistroAccionesCobroPage: React.FC = () => {
    const searchParams = useSearchParams();
    
    // Obtener parámetros de la URL
    const facturaId = searchParams.get('facturaId');
    const nroFactura = searchParams.get('nroFactura');

    return (
        <div className="w-full max-w-full mx-auto ">
            <RegistroAccionesCobroPesuasivo 
                facturaId={facturaId}
                nroFactura={nroFactura}
            />
        </div>
    );
};

export default RegistroAccionesCobroPage;