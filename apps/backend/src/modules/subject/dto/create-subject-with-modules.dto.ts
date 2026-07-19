import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';

// Corpo do POST /subjects — estrutura já editada pelo usuário no review (§14).
// Não confia no que o parse devolveu: revalida aqui e no service.

export class CreateTopicInputDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  // description = ementa fatiada; pode ser vazia (tópico só com título)
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateModuleInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTopicInputDto)
  topics: CreateTopicInputDto[];
}

export class CreateSubjectWithModulesDto {
  @IsString()
  @IsNotEmpty()
  course_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateModuleInputDto)
  modules: CreateModuleInputDto[];
}
