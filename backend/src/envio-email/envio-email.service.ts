import { Injectable, Logger } from '@nestjs/common';
import {
  createTransport,
  type Mail,
  type SendMailOptions,
  type SentMessageInfo,
} from 'nodemailer';

// Envio de e-mails via SMTP para o fluxo de recuperação de senha.
// Sem SMTP_HOST configurado o serviço fica inativo (configurado() = false)
// e a aplicação usa o fallback de devolver o código pela própria API.
@Injectable()
export class EnvioEmailService {
  private readonly logger = new Logger(EnvioEmailService.name);
  private readonly transporte: Mail<SentMessageInfo> | null;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) {
      this.transporte = null;
      return;
    }
    this.transporte = createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  configurado(): boolean {
    return this.transporte !== null;
  }

  async enviarEmail(
    destinatario: string,
    assunto: string,
    corpoHtml: string,
  ): Promise<boolean> {
    if (!this.transporte) return false;

    const opcoes: SendMailOptions = {
      from: process.env.SMTP_FROM ?? 'App Cardápio <noreply@localhost>',
      to: destinatario,
      subject: assunto,
      html: corpoHtml,
      // Bloqueia leitura de arquivos/URLs no conteúdo (mitigação de SSRF)
      disableFileAccess: true,
      disableUrlAccess: true,
    };

    try {
      await this.transporte.sendMail(opcoes);
      return true;
    } catch (erro) {
      this.logger.error(`Falha ao enviar e-mail para ${destinatario}:`, erro);
      return false;
    }
  }
}
