"use client";

import React from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { useTheme } from 'next-themes';

import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import AnimatedSelect from "@/presenters/components/ui/AnimatedSelect";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { useModalAddress } from "@/presenters/components/ui/hooks/useModdalAddres";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false
});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false
});
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false
});
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false
});
import { useMapEvents } from "react-leaflet";

interface ModalAddressProps {
  title: string;
  onClose: () => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}
const LocationMarker = ({
  onLocationSelected
}: {
  onLocationSelected: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

const ModalAddress: React.FC<ModalAddressProps> = ({ title, onClose, formData, setFormData }) => {

  const { theme } = useTheme();

  const {
    error,
    mapReady,
    customIcon,
    handleChange,
    clear,
    save
  } = useModalAddress({ onClose, formData, setFormData });

  const addressData = formData.addressData;

  const ub = addressData.ubicacion.value;

  const vp = addressData.viaPrincipal.value;
  const nv = addressData.nombreVia.value;
  const lp = addressData.letraPrincipal.value;
  const lp2 = addressData.letraPrincipal2.value;
  const pfbp = addressData.prefijoBisPrincipal.value;
  const cdp = addressData.cordenadaPrincipal.value;

  const vs = addressData.viaSecundaria.value;
  const nvs = addressData.nombreViaSecundaria.value;
  const lsec = addressData.letraSecundaria.value;
  const lsec2 = addressData.letraSecundaria2.value;
  const pfbs = addressData.prefijoBisSecundaria.value;
  const cds = addressData.cordenadaSecundaria.value;

  const vs2 = addressData.viaTerciaria.value;
  const nvs2 = addressData.nombreViaTerciaria.value;
  const lter = addressData.letraTerciaria.value;
  const lter2 = addressData.letraTerciaria2.value;
  const pfbt = addressData.prefijoBisTerciaria.value;
  const cdt = addressData.cordenadaTerciaria.value;

  const comp = addressData.complemento.value;

  const coordX = addressData.coordenadaX.value;
  const coordY = addressData.coordenadaY.value;
  const location = addressData.location.value;

  if (!mapReady) return null;

  return (
    <div>
      <div
        className="fixed top-0 left-0 w-full h-full backdrop-blur-sm flex justify-center items-center"
        style={{ zIndex: 100 }}
      >
        <div className={`max-w-[900px] mr-10 ml-10 shadow-lg py-2 rounded-md ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}>
          {/* Header */}
          <div className={`text-sm font-medium py-3 px-4 mb-4 h-13 ${theme === 'dark' ? 'text-white border-b border-white/20' : 'text-gray-900 border-b border-gray-300'}`}>
            <h2 className="float-left">{title}</h2>
            <span className={`float-right cursor-pointer ${theme === 'dark' ? 'text-white hover:text-red-300' : ''}`} onClick={onClose}>
              X
            </span>
          </div>

          <div className="px-4 pb-4" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            {/* Error */}
            <div className="mt-10 absolute top-0 right-5">
              {error && (
                <div className="w-50 flex items-center p-4 mb-4 text-sm text-white rounded-lg bg-red-600" role="alert">
                  <svg
                    className="shrink-0 inline w-4 h-4 me-3"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                  </svg>
                  <span className="sr-only">Info</span>
                  <div>
                    <span className="font-medium">¡Error!</span> {error}
                  </div>
                </div>
              )}
            </div>

            {/* Contenido principal */}
            <div className="text-md font-medium" style={{ margin: "0px 20px" }}>
              {/* Ubicación */}
              <div className="grid md:grid-cols-3 mt-6 gap-4">
                <div>
                  <AnimatedSelect
                    label="Ubicación *"
                    name="ubicacion"
                    value={ub}
                    onChange={handleChange}
                    error={addressData.ubicacion.error}
                    options={[
                      { key: "Urbano", value: "Urbano", title: "Urbano" },
                      { key: "Rural", value: "Rural", title: "Rural" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              {/* Datos Dirección Principal */}
              <div className="grid md:grid-cols-1 mb-4 gap-4 mt-4">
                <label className={`block text-sm mb-2 font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>Datos Dirección Principal</label>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <AnimatedSelect
                    label="Via principal *"
                    name="viaPrincipal"
                    value={vp}
                    onChange={handleChange}
                    error={addressData.viaPrincipal.error}
                    options={[
                      { key: "vp", value: "", title: "Vía principal" },
                      { key: "Autopista", value: "Autopista", title: "Autopista" },
                      { key: "Avenida", value: "Avenida", title: "Avenida" },
                      { key: "Boulevar", value: "Boulevar", title: "Boulevar" },
                      { key: "Calle", value: "Calle", title: "Calle" },
                      { key: "Carrera", value: "Carrera", title: "Carrera" },
                      { key: "Circunvalar", value: "Circunvalar", title: "Circunvalar" },
                      { key: "Diagonal", value: "Diagonal", title: "Diagonal" },
                      { key: "Kilómetro", value: "Kilómetro", title: "Kilómetro" },
                      { key: "Sector", value: "Sector", title: "Sector" },
                      { key: "Transversal", value: "Transversal", title: "Transversal" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 mt-4 gap-x-4">
                <div>
                  <AnimatedInput
                    type="number"
                    id="nombreVia"
                    name="nombreVia"
                    label="Número de Vía *"
                    error={addressData.nombreVia.error}
                    value={nv}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4 md:mt-0">
                  <AnimatedSelect
                    label="Letra Principal"
                    name="letraPrincipal"
                    error={addressData.letraPrincipal.error}
                    value={lp}
                    onChange={handleChange}
                    options={[
                      { key: "lp", value: "", title: "Letra" },
                      { key: "A", value: "A", title: "A" },
                      { key: "B", value: "B", title: "B" },
                      { key: "C", value: "C", title: "C" },
                      { key: "D", value: "D", title: "D" },
                      { key: "E", value: "E", title: "E" },
                      { key: "F", value: "F", title: "F" },
                      { key: "G", value: "G", title: "G" },
                      { key: "H", value: "H", title: "H" },
                      { key: "I", value: "I", title: "I" },
                      { key: "J", value: "J", title: "J" },
                      { key: "K", value: "K", title: "K" },
                      { key: "L", value: "L", title: "L" },
                      { key: "M", value: "M", title: "M" },
                      { key: "N", value: "N", title: "N" },
                      { key: "O", value: "O", title: "O" },
                      { key: "P", value: "P", title: "P" },
                      { key: "Q", value: "Q", title: "Q" },
                      { key: "R", value: "R", title: "R" },
                      { key: "S", value: "S", title: "S" },
                      { key: "T", value: "T", title: "T" },
                      { key: "U", value: "U", title: "U" },
                      { key: "V", value: "V", title: "V" },
                      { key: "W", value: "W", title: "W" },
                      { key: "X", value: "X", title: "X" },
                      { key: "Y", value: "Y", title: "Y" },
                      { key: "Z", value: "Z", title: "Z" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4 md:mt-0">
                  <AnimatedInput
                    type="number"
                    id="prefijoBisPrincipal"
                    name="prefijoBisPrincipal"
                    label="Sufijo bis"
                    value={pfbp}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>

                <div></div>

                <div className="mt-4">
                  <AnimatedSelect
                    label="Letra Principal"
                    name="letraPrincipal2"
                    value={lp2}
                    onChange={handleChange}
                    options={[
                      { key: "lp", value: "", title: "Letra" },
                      { key: "A", value: "A", title: "A" },
                      { key: "B", value: "B", title: "B" },
                      { key: "C", value: "C", title: "C" },
                      { key: "D", value: "D", title: "D" },
                      { key: "E", value: "E", title: "E" },
                      { key: "F", value: "F", title: "F" },
                      { key: "G", value: "G", title: "G" },
                      { key: "H", value: "H", title: "H" },
                      { key: "I", value: "I", title: "I" },
                      { key: "J", value: "J", title: "J" },
                      { key: "K", value: "K", title: "K" },
                      { key: "L", value: "L", title: "L" },
                      { key: "M", value: "M", title: "M" },
                      { key: "N", value: "N", title: "N" },
                      { key: "O", value: "O", title: "O" },
                      { key: "P", value: "P", title: "P" },
                      { key: "Q", value: "Q", title: "Q" },
                      { key: "R", value: "R", title: "R" },
                      { key: "S", value: "S", title: "S" },
                      { key: "T", value: "T", title: "T" },
                      { key: "U", value: "U", title: "U" },
                      { key: "V", value: "V", title: "V" },
                      { key: "W", value: "W", title: "W" },
                      { key: "X", value: "X", title: "X" },
                      { key: "Y", value: "Y", title: "Y" },
                      { key: "Z", value: "Z", title: "Z" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4">
                  <AnimatedSelect
                    label="Coordenada"
                    name="cordenadaPrincipal"
                    value={cdp}
                    onChange={handleChange}
                    options={[
                      { key: "coor", value: "", title: "Coordenada" },
                      { key: "Sur", value: "Sur", title: "Sur" },
                      { key: "Norte", value: "Norte", title: "Norte" },
                      { key: "Este", value: "Este", title: "Este" },
                      { key: "Oeste", value: "Oeste", title: "Oeste" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              {/* Datos Dirección Secundaria */}
              <div className="grid md:grid-cols-1 mb-4 gap-4 mt-4">
                <label className={`block text-sm mb-2 font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>#</label>
              </div>

              <div className="grid md:grid-cols-3 mb-4 gap-x-4">
                <div>
                  <AnimatedInput
                    type="number"
                    id="nombreViaSecundaria"
                    name="nombreViaSecundaria"
                    error={addressData.nombreViaSecundaria.error}
                    label="Número de Vía *"
                    value={nvs}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4 md:mt-0">
                  <AnimatedSelect
                    label="Letra Secundaria"
                    name="letraSecundaria"
                    error={addressData.letraSecundaria.error}
                    value={lsec}
                    onChange={handleChange}
                    options={[
                      { key: "lp", value: "", title: "Letra" },
                      { key: "A", value: "A", title: "A" },
                      { key: "B", value: "B", title: "B" },
                      { key: "C", value: "C", title: "C" },
                      { key: "D", value: "D", title: "D" },
                      { key: "E", value: "E", title: "E" },
                      { key: "F", value: "F", title: "F" },
                      { key: "G", value: "G", title: "G" },
                      { key: "H", value: "H", title: "H" },
                      { key: "I", value: "I", title: "I" },
                      { key: "J", value: "J", title: "J" },
                      { key: "K", value: "K", title: "K" },
                      { key: "L", value: "L", title: "L" },
                      { key: "M", value: "M", title: "M" },
                      { key: "N", value: "N", title: "N" },
                      { key: "O", value: "O", title: "O" },
                      { key: "P", value: "P", title: "P" },
                      { key: "Q", value: "Q", title: "Q" },
                      { key: "R", value: "R", title: "R" },
                      { key: "S", value: "S", title: "S" },
                      { key: "T", value: "T", title: "T" },
                      { key: "U", value: "U", title: "U" },
                      { key: "V", value: "V", title: "V" },
                      { key: "W", value: "W", title: "W" },
                      { key: "X", value: "X", title: "X" },
                      { key: "Y", value: "Y", title: "Y" },
                      { key: "Z", value: "Z", title: "Z" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4 md:mt-0">
                  <AnimatedInput
                    type="number"
                    id="prefijoBisSecundaria"
                    name="prefijoBisSecundaria"
                    label="Sufijo bis"
                    value={pfbs}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>

                <div></div>
                <div className="mt-4">
                  <AnimatedSelect
                    label="Letra Secundaria"
                    name="letraSecundaria2"
                    value={lsec2}
                    onChange={handleChange}
                    options={[
                      { key: "lp", value: "", title: "Letra" },
                      { key: "A", value: "A", title: "A" },
                      { key: "B", value: "B", title: "B" },
                      { key: "C", value: "C", title: "C" },
                      { key: "D", value: "D", title: "D" },
                      { key: "E", value: "E", title: "E" },
                      { key: "F", value: "F", title: "F" },
                      { key: "G", value: "G", title: "G" },
                      { key: "H", value: "H", title: "H" },
                      { key: "I", value: "I", title: "I" },
                      { key: "J", value: "J", title: "J" },
                      { key: "K", value: "K", title: "K" },
                      { key: "L", value: "L", title: "L" },
                      { key: "M", value: "M", title: "M" },
                      { key: "N", value: "N", title: "N" },
                      { key: "O", value: "O", title: "O" },
                      { key: "P", value: "P", title: "P" },
                      { key: "Q", value: "Q", title: "Q" },
                      { key: "R", value: "R", title: "R" },
                      { key: "S", value: "S", title: "S" },
                      { key: "T", value: "T", title: "T" },
                      { key: "U", value: "U", title: "U" },
                      { key: "V", value: "V", title: "V" },
                      { key: "W", value: "W", title: "W" },
                      { key: "X", value: "X", title: "X" },
                      { key: "Y", value: "Y", title: "Y" },
                      { key: "Z", value: "Z", title: "Z" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4">
                  <AnimatedSelect
                    label="Coordenada"
                    name="cordenadaSecundaria"
                    value={cds}
                    onChange={handleChange}
                    options={[
                      { key: "coor", value: "", title: "Coordenada" },
                      { key: "Sur", value: "Sur", title: "Sur" },
                      { key: "Norte", value: "Norte", title: "Norte" },
                      { key: "Este", value: "Este", title: "Este" },
                      { key: "Oeste", value: "Oeste", title: "Oeste" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              {/* Datos Dirección Terciaria */}
              <div className="grid md:grid-cols-1 mb-4 gap-4">
                <label className={`block text-sm mb-2 font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>-</label>
              </div>

              <div className="grid md:grid-cols-3 mb-4 gap-x-4">
                <div>
                  <AnimatedInput
                    type="number"
                    id="nombreViaTerciaria"
                    name="nombreViaTerciaria"
                    error={addressData.nombreViaTerciaria.error}
                    label="Número de Vía *"
                    value={nvs2}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>

                <div className="mt-4 md:mt-0">
                  <AnimatedSelect
                    label="Letra Terciaria"
                    name="letraTerciaria"
                    value={lter}
                    onChange={handleChange}
                    options={[
                      { key: "lp", value: "", title: "Letra" },
                      { key: "A", value: "A", title: "A" },
                      { key: "B", value: "B", title: "B" },
                      { key: "C", value: "C", title: "C" },
                      { key: "D", value: "D", title: "D" },
                      { key: "E", value: "E", title: "E" },
                      { key: "F", value: "F", title: "F" },
                      { key: "G", value: "G", title: "G" },
                      { key: "H", value: "H", title: "H" },
                      { key: "I", value: "I", title: "I" },
                      { key: "J", value: "J", title: "J" },
                      { key: "K", value: "K", title: "K" },
                      { key: "L", value: "L", title: "L" },
                      { key: "M", value: "M", title: "M" },
                      { key: "N", value: "N", title: "N" },
                      { key: "O", value: "O", title: "O" },
                      { key: "P", value: "P", title: "P" },
                      { key: "Q", value: "Q", title: "Q" },
                      { key: "R", value: "R", title: "R" },
                      { key: "S", value: "S", title: "S" },
                      { key: "T", value: "T", title: "T" },
                      { key: "U", value: "U", title: "U" },
                      { key: "V", value: "V", title: "V" },
                      { key: "W", value: "W", title: "W" },
                      { key: "X", value: "X", title: "X" },
                      { key: "Y", value: "Y", title: "Y" },
                      { key: "Z", value: "Z", title: "Z" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>

                <div className="mt-4 md:mt-0">
                  <AnimatedInput
                    type="number"
                    id="prefijoBisTerciaria"
                    name="prefijoBisTerciaria"
                    label="Sufijo bis"
                    value={pfbt}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>

                <div></div>
                <div className="mt-4">
                  <AnimatedSelect
                    label="Letra Terciaria"
                    name="letraTerciaria2"
                    value={lter2}
                    onChange={handleChange}
                    options={[
                      { key: "lp", value: "", title: "Letra" },
                      { key: "A", value: "A", title: "A" },
                      { key: "B", value: "B", title: "B" },
                      { key: "C", value: "C", title: "C" },
                      { key: "D", value: "D", title: "D" },
                      { key: "E", value: "E", title: "E" },
                      { key: "F", value: "F", title: "F" },
                      { key: "G", value: "G", title: "G" },
                      { key: "H", value: "H", title: "H" },
                      { key: "I", value: "I", title: "I" },
                      { key: "J", value: "J", title: "J" },
                      { key: "K", value: "K", title: "K" },
                      { key: "L", value: "L", title: "L" },
                      { key: "M", value: "M", title: "M" },
                      { key: "N", value: "N", title: "N" },
                      { key: "O", value: "O", title: "O" },
                      { key: "P", value: "P", title: "P" },
                      { key: "Q", value: "Q", title: "Q" },
                      { key: "R", value: "R", title: "R" },
                      { key: "S", value: "S", title: "S" },
                      { key: "T", value: "T", title: "T" },
                      { key: "U", value: "U", title: "U" },
                      { key: "V", value: "V", title: "V" },
                      { key: "W", value: "W", title: "W" },
                      { key: "X", value: "X", title: "X" },
                      { key: "Y", value: "Y", title: "Y" },
                      { key: "Z", value: "Z", title: "Z" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
                <div className="mt-4">
                  <AnimatedSelect
                    label="Coordenada"
                    name="cordenadaTerciaria"
                    value={cdt}
                    onChange={handleChange}
                    options={[
                      { key: "coor", value: "", title: "Coordenada" },
                      { key: "Sur", value: "Sur", title: "Sur" },
                      { key: "Norte", value: "Norte", title: "Norte" },
                      { key: "Este", value: "Este", title: "Este" },
                      { key: "Oeste", value: "Oeste", title: "Oeste" }
                    ]}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              {/* Complemento */}
              <div className="grid md:grid-cols-1 mb-6 gap-4">
                <div>
                  <AnimatedInput
                    type="text"
                    id="complemento"
                    name="complemento"
                    label="Complemento"
                    value={comp}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              {/* Dirección generada (lectura) */}
              <div className="grid md:grid-cols-1 mb-6 gap-4">
                <div>
                  <AnimatedInput
                    type="text"
                    readOnly
                    id="generatedAddres"
                    name="generatedAddres"
                    label="Dirección generada"
                    value={`
                      ${ub}
                      ${vp}
                      ${nv}
                      ${lp}
                      ${lp2}
                      ${pfbp}
                      ${cdp}
                      #
                      ${vs}
                      ${nvs}
                      ${lsec}
                      ${pfbs}
                      ${lsec2}
                      ${cds}
                      -
                      ${vs2}
                      ${nvs2}
                      ${lter}
                      ${pfbt}
                      ${lter2}
                      ${cdt}
                    `.replace(/\s+/g, " ").trim()}
                    onChange={handleChange}
                    darkMode={theme === 'dark'}
                  />
                </div>
              </div>

              {/* Geolocalización */}
              <div className="grid md:grid-cols-1 gap-4 mb-5">
                <label className={`block text-sm mb-2 font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>Geolocalización</label>
                <input
                  type="checkbox"
                  name="location"
                  onChange={handleChange}
                  checked={location}
                  className="appearance-none relative inline-block rounded-full w-12 h-6 cursor-pointer
                    before:inline-block before:absolute before:top-0 before:left-0 before:w-full 
                    before:h-full before:rounded-full before:bg-stone-200 checked:before:bg-[#4D750F]
                    after:absolute after:top-2/4 after:left-0 after:-translate-y-2/4 after:w-6 after:h-6 
                    after:bg-white after:rounded-full checked:after:translate-x-full transition-all duration-200"
                />
              </div>

              {location && customIcon && (
                <>
                  <div className="grid md:grid-cols-2 mb-4 gap-4">
                    <div>
                      <AnimatedInput
                        type="text"
                        id="coordenadaX"
                        name="coordenadaX"
                        label="Coordenada X"
                        value={coordX}
                        readOnly
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <AnimatedInput
                        type="text"
                        id="coordenadaY"
                        name="coordenadaY"
                        label="Coordenada Y"
                        value={coordY}
                        onChange={handleChange}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-1 gap-4">
                    <MapContainer
                      center={[4.6097, -74.0817]}
                      zoom={13}
                      style={{ width: "100%", height: "500px" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      {location && customIcon && (
                        <Marker position={[coordX, coordY]} icon={customIcon}>
                          <Popup>Aquí está tu ubicación</Popup>
                        </Marker>
                      )}

                      {/* Captura clic en el mapa para actualizar coords */}
                      <LocationMarker
                        onLocationSelected={(lat: number, lng: number) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            addressData: {
                              ...prev.addressData,
                              coordenadaX: { value: lat, error: false },
                              coordenadaY: { value: lng, error: false }
                            }
                          }));
                        }}
                      />
                    </MapContainer>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-between items-center px-4 pt-2 float-right" style={{ margin: "0px 20px" }}>

            <Button onClick={clear} title="Limpiar" className="float-right mr-5" />

            <Button onClick={save} title="Guardar" className="float-right" />

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalAddress;
