'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useTableroMunicipios from '../hooks/useTableroMunicipios';

const TestMunicipios: React.FC = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access || '';
  
  const { data: municipiosData, isLoading, error, fetchTablero } = useTableroMunicipios();
  
  // Estado para el código del departamento
  const [codigoDepartamento, setCodigoDepartamento] = useState<string>('08'); // ATLÁNTICO por defecto

  useEffect(() => {
    if (token && codigoDepartamento) {
      fetchTablero(token, { codigo_departamento: codigoDepartamento });
    }
  }, [token, codigoDepartamento, fetchTablero]);

  const handleDepartamentoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCodigoDepartamento(event.target.value);
  };

  return (
    <div className="p-4 border-2 border-blue-500 bg-blue-50">
      <h3 className="text-lg font-bold mb-4 text-blue-700">TestMunicipios - Debug Municipios por Departamento</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-700 mb-2">
          Seleccionar Departamento:
        </label>
        <select 
          value={codigoDepartamento} 
          onChange={handleDepartamentoChange}
          className="w-full p-2 border border-blue-300 rounded-md"
        >
          <option value="08">08 - ATLÁNTICO</option>
          <option value="11">11 - BOGOTÁ D.C.</option>
          <option value="13">13 - BOLÍVAR</option>
          <option value="15">15 - BOYACÁ</option>
          <option value="17">17 - CALDAS</option>
          <option value="18">18 - CAQUETÁ</option>
          <option value="19">19 - CAUCA</option>
          <option value="20">20 - CESAR</option>
          <option value="23">23 - CÓRDOBA</option>
          <option value="25">25 - CUNDINAMARCA</option>
          <option value="27">27 - CHOCÓ</option>
          <option value="41">41 - HUILA</option>
          <option value="44">44 - LA GUAJIRA</option>
          <option value="47">47 - MAGDALENA</option>
          <option value="50">50 - META</option>
          <option value="52">52 - NARIÑO</option>
          <option value="54">54 - NORTE DE SANTANDER</option>
          <option value="63">63 - QUINDÍO</option>
          <option value="66">66 - RISARALDA</option>
          <option value="68">68 - SANTANDER</option>
          <option value="70">70 - SUCRE</option>
          <option value="73">73 - TOLIMA</option>
          <option value="76">76 - VALLE DEL CAUCA</option>
          <option value="81">81 - ARAUCA</option>
          <option value="85">85 - CASANARE</option>
          <option value="86">86 - PUTUMAYO</option>
          <option value="88">88 - SAN ANDRÉS</option>
          <option value="91">91 - AMAZONAS</option>
          <option value="94">94 - GUAINÍA</option>
          <option value="95">95 - GUAVIARE</option>
          <option value="97">97 - VAUPÉS</option>
          <option value="99">99 - VICHADA</option>
        </select>
      </div>
      
      <div className="mb-2">
        <strong>Token:</strong> {token ? '✅ Disponible' : '❌ No disponible'}
      </div>
      
      <div className="mb-2">
        <strong>Loading:</strong> {isLoading ? '🔄 Cargando...' : '✅ No cargando'}
      </div>
      
      <div className="mb-2">
        <strong>Error:</strong> {error ? `❌ ${error}` : '✅ Sin errores'}
      </div>
      
      <div className="mb-2">
        <strong>Data existe:</strong> {municipiosData ? '✅ Sí' : '❌ No'}
      </div>
      
      <div className="mb-2">
        <strong>Municipios existe:</strong> {municipiosData?.municipios ? '✅ Sí' : '❌ No'}
      </div>
      
      <div className="mb-2">
        <strong>Es Array:</strong> {Array.isArray(municipiosData?.municipios) ? '✅ Sí' : '❌ No'}
      </div>
      
      <div className="mb-2">
        <strong>Cantidad de Municipios:</strong> {municipiosData?.municipios?.length || 0}
      </div>
      
      <div className="mb-2">
        <strong>Departamento:</strong> {municipiosData?.departamento ? `${municipiosData.departamento.codigo} - ${municipiosData.departamento.nombre}` : 'No disponible'}
      </div>
      
      {municipiosData?.municipios && Array.isArray(municipiosData.municipios) && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">Primeros 5 municipios:</h4>
          <div className="space-y-1 text-sm">
            {municipiosData.municipios.slice(0, 5).map((municipio, index) => (
              <div key={index} className="bg-white p-2 rounded border">
                <strong>{municipio.codigo}</strong> - {municipio.nombre}: {municipio.total_valor_neto.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} | {municipio.total_kilos} kg
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <h4 className="font-bold mb-2">Data completa (JSON):</h4>
        <pre className="bg-white p-2 rounded border text-xs overflow-auto max-h-40">
          {JSON.stringify(municipiosData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default TestMunicipios;
