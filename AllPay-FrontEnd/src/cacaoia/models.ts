export interface CacaoIAAskRequest {
  question: string;
}

export interface CacaoIAAskResponse {
  answer: string;
  sources: unknown[];
  processing_time: number;
}

export interface CacaoIAErrorResponse {
  detail?: string;
  error?: string;
}


