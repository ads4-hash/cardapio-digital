import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

const SEGREDO = process.env.JWT_SECRET ?? 'dev-change-this-secret';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: SEGREDO,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [JwtModule, AuthGuard, AuthService],
})
export class AuthModule {}