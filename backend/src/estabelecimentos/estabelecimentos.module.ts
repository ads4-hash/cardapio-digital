import { Global, Module } from '@nestjs/common';
import { EstabelecimentosService } from './estabelecimentos.service';

// Global: qualquer módulo pode injetar EstabelecimentosService para resolver
// o tenant a partir do slug (URL pública) sem criar dependências circulares.
@Global()
@Module({
  providers: [EstabelecimentosService],
  exports: [EstabelecimentosService],
})
export class EstabelecimentosModule {}
