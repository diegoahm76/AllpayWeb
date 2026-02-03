import { useState } from 'react';
import { generateFacturaZip } from '../adapters/factura-zip.adapter';
import { FacturaZipPayload, FacturaZipResponse } from '../models/factura-zip.model';

const useFacturaZip = () => {
    const [zipData, setZipData] = useState<FacturaZipResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateZip = async (token: string, nrosFactura: number[]) => {
        setIsLoading(true);
        setError(null);

        try {
            const payload: FacturaZipPayload = {
                nros_factura: nrosFactura
            };

            const response = await generateFacturaZip(token, payload);
            setZipData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al generar el ZIP';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const clearZipData = () => {
        setZipData(null);
        setError(null);
    };

    return {
        zipData,
        isLoading,
        error,
        generateZip,
        clearZipData
    };
};

export default useFacturaZip;

