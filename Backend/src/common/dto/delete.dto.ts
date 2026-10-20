import { IsInt } from 'class-validator';

/** Deletes arrive as POST with the id in the body. */
export class DeleteDto {
  @IsInt({ message: 'A valid id is required' })
  id: number;
}
