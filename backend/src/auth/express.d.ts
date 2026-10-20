import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        nome: string;
        email: string;
        estabelecimentoId: string;
      };
      /**
       * Identificador da requisição, gerado/repassado pelo
       * RegistroHttpInterceptor (também devolvido como X-Request-Id). Permite
       * amarrar o log de um erro ao log de acesso da mesma requisição.
       */
      requisicaoId?: string;
    }
  }
}

export {};
