// Envia um e-mail de teste com a MESMA configuração SMTP que a API usa na
// recuperação de senha, para validar o .env antes de depender dele.
//
// Uso (dentro de backend/):
//   npm run email:teste -- voce@exemplo.com
// Sem destinatário, usa o SMTP_USER (ou o endereço de SMTP_FROM).
import 'dotenv/config';
import { createTransport } from 'nodemailer';

const host = process.env.SMTP_HOST?.trim();
if (!host) {
  console.error(
    'SMTP_HOST não definido. Preencha as variáveis SMTP_* no backend/.env ' +
      '(veja backend/.env.example).',
  );
  process.exit(1);
}

const porta = Number(process.env.SMTP_PORT ?? 587);
const seguro = process.env.SMTP_SECURE === 'true';
const usuario = process.env.SMTP_USER?.trim();
const remetente = process.env.SMTP_FROM ?? 'App Cardápio <noreply@localhost>';

const destinatario =
  process.argv[2]?.trim() ||
  usuario ||
  remetente.replace(/.*<|>.*/g, '').trim();

const transporte = createTransport({
  host,
  port: porta,
  secure: seguro,
  auth: usuario ? { user: usuario, pass: process.env.SMTP_PASS } : undefined,
});

async function main(): Promise<void> {
  console.log(
    `Enviando e-mail de teste via ${host}:${porta} (secure=${seguro})`,
  );
  console.log(`De:   ${remetente}`);
  console.log(`Para: ${destinatario}`);

  const info = await transporte.sendMail({
    from: remetente,
    to: destinatario,
    subject: 'Teste de envio — Cardápio Digital',
    html: '<p>Se você recebeu este e-mail, o SMTP está configurado corretamente.</p>',
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  console.log('✅ E-mail enviado. messageId:', info.messageId);
}

main()
  .catch((erro) => {
    console.error('❌ Falha ao enviar e-mail:', erro);
    process.exit(1);
  })
  .finally(() => {
    transporte.close();
  });
