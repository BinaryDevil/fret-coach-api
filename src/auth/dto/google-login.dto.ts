import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google Identity Services ID token from CredentialResponse.credential',
  })
  @IsString()
  @MinLength(20)
  credential!: string;
}
