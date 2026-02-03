import axios from 'axios';
import { DepartamentoColombiaResponse } from '@/domain/models/address/department.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDepartamentosColombia = async (): Promise<DepartamentoColombiaResponse> => {
     try {
        const response = await axios.get(`${baseApiUrl}personas/departamento/get-list/CO/`, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail);
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getDepartamentosColombia:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener departamentos: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener departamentos');
    }
}; 