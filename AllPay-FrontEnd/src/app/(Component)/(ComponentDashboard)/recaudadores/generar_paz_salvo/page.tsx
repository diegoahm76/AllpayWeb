'use client';

import React, { Suspense } from 'react';
import GeneratePeace from './components/GeneratePeace';

// Componente sencillo para mostrar mientras se carga el GeneratePeace
const LoadingFallback = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
    </div>
  );
};

const GenerarPazSalvo = () => {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<LoadingFallback />}>
        <GeneratePeace />
      </Suspense>
    </div>
  );
};

export default GenerarPazSalvo;