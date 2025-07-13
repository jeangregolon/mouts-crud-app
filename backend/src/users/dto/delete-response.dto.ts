import { ApiProperty } from '@nestjs/swagger';

export class DeleteResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the operation was successful'
  })
  success: boolean;

  @ApiProperty({
    example: 'User with ID 1 has been successfully deleted',
    description: 'Confirmation message'
  })
  message: string;
}