'use client';

import React from 'react';
import Image from 'next/image';

import Modal from '@/presenters/components/modules/auth/components/Modal';
import RegisterNaturalForm from '@/presenters/components/modules/register/RegisterNatural';
import RegisterJuridicoForm from '@/presenters/components/modules/register/RegisterJuridico';
import FirstStep from '@/app/(Component)/(ComponentDashboard)/seguridad/crear_usuario/components/FirstStep';

import { MainResource } from '@/application/shared/resources/main-resource';

import { useRegisterForm } from '@/presenters/components/modules/register/hooks/useRegisterForm';

interface RegisterFormProps {
  baseApiUrl: string;
  tipoUsuario?: any;
  app?: any;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ baseApiUrl, tipoUsuario, app }) => {
  const {
    openModalPolitica,
    loading,
    formData,
    currentStep,
    currentStepJuridica,
    persona,
    isExpanded,
    typePerson,
    dataTypePerson,
    typeDocument,
    dataTypeDocument,
    document,
    dataPaisNacimiento,
    dataGenero,
    dataCiudad,
    dataDepartamento,
    dataCiudadNotificacion,
    dataDepartamentoNotificacion,
    dataNatureCompany,
    dataBuyerCode,

    setCurrentStep,
    setCurrentStepJuridica,
    setTypePerson,
    setTypeDocument,
    setDocument,
    handleSelectChange,
    buscarPersona,
    buscarRepresentante,
    handleModalPolitica,
    handleSubmit,
    getTiposComprador,
    obtenerDepartamento,
    obtenerCiudad
  } = useRegisterForm({ baseApiUrl });

  return (
    <form>
      {currentStep === 1 && currentStepJuridica === 1 && (
        <div className="p-1">
          <FirstStep
            typePerson={typePerson}
            setTypePerson={setTypePerson}
            dataTypePerson={dataTypePerson}
            document={document}
            setDocument={setDocument}
            handleSelectChange={handleSelectChange}
            buscarPersona={buscarPersona}
            loading={loading}
            isExpanded={isExpanded}
          />
        </div>
      )}

      {typePerson.value === 'N' && persona && (
        <RegisterNaturalForm
          app={app}
          tipoUsuario={tipoUsuario}
          document={document}
          setDocument={setDocument}
          setTypePerson={setTypePerson}
          setTypeDocument={setTypeDocument}
          currentStep={currentStep}
          dataPaisNacimiento={dataPaisNacimiento}
          dataGenero={dataGenero}
          dataDepartamento={dataDepartamento}
          dataCiudad={dataCiudad}
          obtenerDepartamento={obtenerDepartamento}
          obtenerCiudad={obtenerCiudad}
          setError={() => {}}
          setCurrentStep={setCurrentStep}
          typeDocument={typeDocument}
          typePerson={typePerson}
          dataCiudadNotificacion={dataCiudadNotificacion}
          dataDepartamentoNotificacion={dataDepartamentoNotificacion}
          handleModalPolitica={handleModalPolitica}
          loading={loading}
          handleSubmit={handleSubmit}
          address={formData.address}
          getTiposComprador={getTiposComprador}
          addressComplete={formData.addressComplete}
        />
      )}

      {typePerson.value === 'J' && persona && (
        <RegisterJuridicoForm
          app={app}
          tipoUsuario={tipoUsuario}
          currentStep={currentStepJuridica}
          dataPaisNacimiento={dataPaisNacimiento}
          setError={() => {}}
          setCurrentStep={setCurrentStepJuridica}
          typePerson={typePerson}
          typeDocument={typeDocument}
          document={document}
          setDocument={setDocument}
          dataNatureCompany={dataNatureCompany}
          dataCiudadNotificacion={dataCiudadNotificacion}
          dataDepartamentoNotificacion={dataDepartamentoNotificacion}
          obtenerDepartamento={obtenerDepartamento}
          obtenerCiudad={obtenerCiudad}
          dataTypeDocument={dataTypeDocument}
          buscarRepresentante={buscarRepresentante}
          loading={loading}
          handleModalPolitica={handleModalPolitica}
          dataBuyerCode={dataBuyerCode}
          handleSubmit={handleSubmit}
          getTiposComprador={getTiposComprador}
          setTypePerson={setTypePerson}
          setTypeDocument={setTypeDocument}
        />
      )}

      {openModalPolitica && (
        <Modal
          title=""
          button={
            <button
              type="button"
              className="float-right mr-4 rounded-2xl bg-[#4D750F] px-6 py-2 text-sm text-white"
              onClick={handleModalPolitica}
            >
              Aceptar
            </button>
          }
        >
          <div className='flex flex-col md:flex-row'>
            <div style={{ width: '100%',  height: '110px' }} className='flex justify-center items-center'>
              <Image width={150} height={32} src="/images/corporate/logo.png" alt="Logo" priority />
            </div>
            <div
              className="text-2xl font-bold text-[#562707] text-center mt-4 "
              style={{ width: '100%', float: 'right', height: '100px', textAlign: 'center' }}
            >
              <h3 className='text-sm md:text-2xl'>POLITICA DE TRATAMIENTO DE DATOS PERSONALES</h3>
            </div>
          </div>
          <p style={{ marginBottom: '20px', textAlign: 'justify' }}>{MainResource.Politica1}</p>
          <p style={{ marginBottom: '20px', textAlign: 'justify' }}>{MainResource.Politica2}</p>
          <p style={{ marginBottom: '20px', textAlign: 'justify' }}>{MainResource.Politica3}</p>
          <p style={{ textAlign: 'justify' }}>{MainResource.Politica4}</p>
        </Modal>
      )}
    </form>
  );
};

export default RegisterForm;
