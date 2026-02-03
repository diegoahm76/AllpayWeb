export interface DocumentoAcuerdoPagoResponse {
    success: boolean;
    detail: string;
    data: DocumentoAcuerdoPagoData;
}

export interface DocumentoAcuerdoPagoData {
    id_documento_generado: number;
    ruta_documento: string;
    variables_por_llenar: any | null;
    consecutivo: any | null;
    fecha_consecutivo: any | null;
    finalizado: boolean;
    variables: DocumentoVariables;
    cargado: boolean;
    documento_generado: string;
    documento_generado_copia: any | null;
    id_plantilla_doc: number;
    id_persona_genera: number;
}

export interface DocumentoVariables {
    items: string;
    ciudad: string;
    ncuotas: string;
    ccrecuda: string;
    fechaano: string;
    fechadia: string;
    fechames: string;
    letrasano: string;
    iddocumento: string;
    emailrecauda: string;
    fechafinalap: string;
    NOMBRERECAUDA: string;
    ciudadrecauda: string;
    fechainicioap: string;
    letrasncuotas: string;
    celularrecauda: string;
    fechasolicitud: string;
    firmafedecacao: string;
    fechaaprobacion: string;
    firmarecaudador: string;
    valortotalpagar: string;
    NOMBRERECAUDADOR: string;
    TITULARFEDECACAO: string;
    direccionrecauda: string;
    titularfedecacao: string;
} 