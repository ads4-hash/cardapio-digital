import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Corpo de `POST /auth/refresh` e `POST /auth/logout`. */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token devolvido no login/refresh.',
    example: 'G7hN4u8y0pHnV3Xz...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
