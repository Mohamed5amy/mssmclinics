import { IsInt, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Service name is required' })
  @MaxLength(120)
  name: string;

  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;
}

export class UpdateServiceDto extends CreateServiceDto {
  @IsInt({ message: 'A valid id is required' })
  id: number;
}
