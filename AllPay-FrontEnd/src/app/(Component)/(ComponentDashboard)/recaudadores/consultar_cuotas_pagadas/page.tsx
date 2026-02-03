import React from 'react';
import SearchPaid from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_cuotas_pagadas/components/SearchPaid';

interface ConsultarCuotasPagadasPageProps {
    searchParams: Promise<{
        liquidacionId?: string;
        liquidacionIds?: string;
    }>;
}

const ConsultarCuotasPagadasPage: React.FC<ConsultarCuotasPagadasPageProps> = async ({ searchParams }) => {
    // Await searchParams antes de usar sus propiedades
    const resolvedSearchParams = await searchParams;
    const { liquidacionId, liquidacionIds } = resolvedSearchParams;

    return (
        <div className="w-full max-w-full mx-auto p-6">
            <SearchPaid 
                liquidacionId={liquidacionId} 
                liquidacionIds={liquidacionIds} 
            />
        </div>
    );
};

export default ConsultarCuotasPagadasPage;