import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TitleDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(120)
  title: string;
}
