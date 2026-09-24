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
    }
  }
}

export {};
