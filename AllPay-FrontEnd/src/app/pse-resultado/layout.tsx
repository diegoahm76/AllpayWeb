import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resultado de Pago PSE | Federación Nacional de Cacaoteros',
  description: 'Resultado de la transacción de pago PSE',
};

export default function PSEResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
} 