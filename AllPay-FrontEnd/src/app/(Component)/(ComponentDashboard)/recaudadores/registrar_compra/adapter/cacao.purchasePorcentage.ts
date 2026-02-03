// import axios from 'axios';
// import { PorcentajeCobroResponse } from '../models/percentage';

// // Usar la URL base correcta sin duplicar 'api/'
// const baseApiUrl = process.env.BASE_API_URL;

// export const getPorcentajesCobro = async (token: string): Promise<PorcentajeCobroResponse> => {
//     try {

//         const response = await axios.get(`${baseApiUrl}recaudos/porcentaje-cobro/`, {
//             headers: {
//                 'Content-Type': 'application/json',
//                 Authorization: `Bearer ${token}`
//             }
//         });

//         return response.data;
//     } catch (error: any) {
//         throw new Error(error.response?.data?.detail || 'Error al obtener porcentajes de cobro');
//     }
// };
