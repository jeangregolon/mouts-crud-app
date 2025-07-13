import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    example: 'John Updated',
    description: 'Full name of the user',
    required: false
  })
  name?: string;

  @ApiProperty({
    example: 'updated.email@example.com',
    description: 'Email address of the user',
    required: false,
    uniqueItems: true
  })
  email?: string;
}