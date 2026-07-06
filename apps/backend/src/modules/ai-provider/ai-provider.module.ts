import { Module } from '@nestjs/common';
import { AIProviderService } from './ai-provider.service';

@Module({
  providers: [AIProviderService],
  exports: [AIProviderService],
})
export class AIProviderModule {}
