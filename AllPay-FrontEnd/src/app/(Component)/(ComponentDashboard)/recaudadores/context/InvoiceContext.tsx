'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface InvoiceContextType {
    selectedInvoice: any;
    setSelectedInvoice: (invoice: any) => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider = ({ children }: { children: ReactNode }) => {
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    return (
        <InvoiceContext.Provider value={{ selectedInvoice, setSelectedInvoice }}>
            {children}
        </InvoiceContext.Provider>
    );
};

export const useInvoice = () => {
    const context = useContext(InvoiceContext);
    if (context === undefined) {
        throw new Error('useInvoice must be used within an InvoiceProvider');
    }
    return context;
}; 