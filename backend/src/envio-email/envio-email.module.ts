import { Global, Module } from '@nestjs/common';
import { EnvioEmailService } from './envio-email.service';

// Serviço de e-mail (SMTP) usado para a recuperação de senha.
// @Global para que qualquer módulo possa injetar sem importar módulos extras.
@Global()
@Module({
  providers: [EnvioEmailService],
  exports: [EnvioEmailService],
})
export class EnvioEmailModule {}
