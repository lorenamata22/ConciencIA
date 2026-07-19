import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// Corpo do PUT /subjects/me/:id/structure — estrutura já editada no review.
// `id` presente = registro existente (atualiza, preserva dados do aluno);
// `id` ausente = criar. O que não vier no payload é removido, se não estiver
// em uso (ver SubjectService.syncStructure).

export class SyncTopicInputDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class SyncModuleInputDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncTopicInputDto)
  topics: SyncTopicInputDto[];
}

export class SyncSubjectStructureDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncModuleInputDto)
  modules: SyncModuleInputDto[];
}
