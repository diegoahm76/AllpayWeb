import { useState, useEffect } from 'react';
import { useWordToPdf } from '@/application/documento/useWordToPdf';
import { usePlantillasDocumento } from '@/application/documento/usePlantillasDocumento';
import { useGeneradorDocumento } from '@/application/documento/useGeneradorDocumento';
import { downloadOrOpen } from '@/utils/forceDownload';

interface UseGenerarYDescargarDocumentoProps {
  token: string;
  nombrePlantilla: string;
  variables: any;
}

export function useGenerarYDescargarDocumento({ token, nombrePlantilla, variables }: UseGenerarYDescargarDocumentoProps) {
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [isAlertError, setIsAlertError] = useState(false);
  const [alertErrorText, setAlertErrorText] = useState('');
  const { convertToPdf } = useWordToPdf();

  const { plantillas, error: errorPlantillas } = usePlantillasDocumento({
    token,
    nombre: nombrePlantilla
  });

  const [idPlantilla, setIdPlantilla] = useState<number | null>(null);
  const [shouldGenerate, setShouldGenerate] = useState(false);

  useEffect(() => {
    if (plantillas?.success && plantillas?.data?.length > 0) {
      setIdPlantilla(plantillas.data[0].id_plantilla_doc);
    }
  }, [plantillas]);

  const { generarDocumento } = useGeneradorDocumento({
    token,
    id_plantilla_doc: idPlantilla || 0
  });

  // Efecto que observa shouldGenerate, idPlantilla y variables
  useEffect(() => {
    const generar = async () => {
      
      if (idPlantilla === null) {
        return;
      }

      if (errorPlantillas) {
        setIsAlertError(true);
        setAlertErrorText('No se encontró la plantilla necesaria para la liquidación');
        return;
      }
      if (!idPlantilla) {
        setIsAlertError(true);
        setAlertErrorText('No se encontró la plantilla necesaria para la liquidación');
        return;
      }
      if (!variables || Object.keys(variables).length === 0) {
        setIsAlertError(true);
        setAlertErrorText('No hay datos suficientes para generar el documento');
        return;
      }
      setLoadingDoc(true);
      try {
        const response = await generarDocumento({ variables });
        if (!response?.success) {
          throw new Error('Error al generar el documento');
        }
        const docId = response?.data?.id_documento_generado;
        if (!docId) {
          throw new Error('Respuesta sin id_documento_generado');
        }
        const pdfResponse = await convertToPdf(token, docId);
        if (!pdfResponse?.success || !pdfResponse?.data?.ruta_documento) {
          throw new Error('No se pudo obtener la ruta del documento');
        }
        await downloadOrOpen(
          pdfResponse.data.ruta_documento,
          `factura_${variables.Ndocumento}.pdf`,
        );
        setSuccess(true);
        setSuccessText('Ha descargado exitosamente el documento');
      } catch (error) {
        setIsAlertError(true);
        setAlertErrorText(error instanceof Error ? error.message : 'Ocurrió un error al generar o descargar el documento');
      } finally {
        setLoadingDoc(false);
      }
    };
    if (shouldGenerate && idPlantilla && variables && Object.keys(variables).length > 0) {
      generar();
      setShouldGenerate(false);
    }
  }, [shouldGenerate, idPlantilla, variables, errorPlantillas, generarDocumento, convertToPdf, token]);

  // Esta función la usas en el componente para disparar la generación
  const triggerGenerarDocumento = () => setShouldGenerate(true);

  return {
    loadingDoc,
    success,
    successText,
    isAlertError,
    alertErrorText,
    setSuccess,
    setIsAlertError,
    triggerGenerarDocumento,
    idPlantilla
  };
} 