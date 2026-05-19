import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReplacePeriodOptionsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  labels: string[];
}
