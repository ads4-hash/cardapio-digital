import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { obterSegredo } from './segredo';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: obterSegredo(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  // JwtModule já é global (register({ global: true })) e AuthService só é
  // consumido dentro deste módulo — nenhum dos dois precisa ser exportado.
  exports: [AuthGuard],
})
export class AuthModule {}
