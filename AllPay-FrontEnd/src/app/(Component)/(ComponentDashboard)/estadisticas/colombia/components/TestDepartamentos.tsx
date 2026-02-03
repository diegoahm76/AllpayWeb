'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useTableroDepartamentos from '../hooks/useTableroDepartamentos';

const TestDepartamentos: React.FC = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access || '';
  
  const { data: departamentosData, isLoading, error, fetchTablero } = useTableroDepartamentos();

  useEffect(() => {
    if (token) {
      fetchTablero(token, {});
    }
  }, [token, fetchTablero]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Test Departamentos</h2>
      
      <div className="mb-4">
        <strong>Token:</strong> {token ? 'Disponible' : 'No disponible'}
      </div>
      
      <div className="mb-4">
        <strong>Loading:</strong> {isLoading ? 'Sí' : 'No'}
      </div>
      
      <div className="mb-4">
        <strong>Error:</strong> {error || 'Ninguno'}
      </div>
      
      <div className="mb-4">
        <strong>Data:</strong>
        <pre className="bg-gray-100 p-2 mt-2 text-xs overflow-auto">
          {JSON.stringify(departamentosData, null, 2)}
        </pre>
      </div>
      
      <div className="mb-4">
        <strong>Departamentos:</strong>
        {departamentosData?.departamentos ? (
          <div>
            <p>Array: {Array.isArray(departamentosData.departamentos) ? 'Sí' : 'No'}</p>
            <p>Length: {departamentosData.departamentos.length}</p>
            <ul className="list-disc list-inside">
              {departamentosData.departamentos.slice(0, 3).map((depto, index) => (
                <li key={index}>
                  {depto.nombre} - {depto.total_kilos} kg
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No hay datos de departamentos</p>
        )}
      </div>
    </div>
  );
};

export default TestDepartamentos;
