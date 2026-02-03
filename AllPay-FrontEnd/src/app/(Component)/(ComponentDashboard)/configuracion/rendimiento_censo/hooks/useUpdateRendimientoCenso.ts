import { useState } from 'react';
import { 
    updateRendimientoCenso, 
    UpdateRendimientoCensoPayload, 
    UpdateRendimientoCensoResponse 
} from '../adapters/updateRendimientoCenso.adapter';

export const useUpdateRendimientoCenso = () => {
    const [isUpdating, setIsUpdating] = useState(false);

    const updateRecord = async (
        token: string,
        codigoDepartamento: string,
        payload: UpdateRendimientoCensoPayload
    ): Promise<UpdateRendimientoCensoResponse> => {
        setIsUpdating(true);
        try {
            const response = await updateRendimientoCenso(token, codigoDepartamento, payload);
            return response;
        } catch (error) {
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        updateRecord,
        isUpdating
    };
};
