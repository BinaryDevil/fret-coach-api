import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class RegisterDto {
  @ApiProperty({ example: 'learner@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) password!: string;
  @ApiProperty({ example: 'Alex', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}
