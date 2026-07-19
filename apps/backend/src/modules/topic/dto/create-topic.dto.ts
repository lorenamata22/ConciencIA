import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTopicDto {
  @IsUUID()
  module_id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  // description = ementa (contexto de escopo, §8); pode faltar (tópico só-título)
  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  order: number;
}
