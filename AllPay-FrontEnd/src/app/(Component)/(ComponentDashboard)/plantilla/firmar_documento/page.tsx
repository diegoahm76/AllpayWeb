'use client';

import React from 'react';
import FirmarDocumento from '@/presenters/components/modules/plantilla/FirmarDocumento';

const FirmarDocumentoPage = () => {

    const handleFirmar = async () => {
        // Implementar lógica de firma
        console.log('Firmando documento...');
    };

    const handleLimpiar = () => {
        // Implementar lógica de limpieza
        console.log('Limpiando pantalla...');
    };

    const handleDescargar = () => {
        // Implementar lógica de descarga
        console.log('Descargando documento...');
    };

    const handleEnviar = async () => {
        // Implementar lógica de envío
        console.log('Enviando documento...');
    };

    const handleBuscar = async () => {
        // Implementar lógica de búsqueda
        console.log('Buscando documento...');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <FirmarDocumento
                onFirmar={handleFirmar}
                onLimpiar={handleLimpiar}
                onDescargar={handleDescargar}
                onEnviar={handleEnviar}
                onBuscar={handleBuscar}
            />
        </div>
    );
};

export default FirmarDocumentoPage;
