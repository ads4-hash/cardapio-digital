import { HttpContextToken } from '@angular/common/http';

export const REQUISICAO_PUBLICA = new HttpContextToken<boolean>(() => false);
