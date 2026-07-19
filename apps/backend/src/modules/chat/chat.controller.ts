import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ConversationService } from '../conversation/conversation.service';
import { MessageService } from '../message/message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { SkipResponseWrapper } from '../../common/decorators/skip-response-wrapper.decorator';

@Controller('chat')
@UseGuards(RolesGuard)
@Roles('student')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  // Retoma (ou cria) a conversa do tópico e devolve o histórico —
  // 1 conversa contínua por (aluno, matéria, tópico): cada tópico é uma sessão
  @Get('conversations')
  async getConversation(
    @CurrentUser() user: JwtPayload,
    @Query('subject_id') subjectId: string,
    @Query('topic_id') topicId: string,
  ) {
    if (!subjectId) {
      throw new BadRequestException('subject_id es obligatorio');
    }
    if (!topicId) {
      throw new BadRequestException('topic_id es obligatorio');
    }

    const conversation = await this.conversationService.resumeOrCreateByUser(
      user.userId,
      user.institutionId,
      subjectId,
      topicId,
    );
    const messages = await this.messageService.findByConversation(
      conversation.id,
    );

    return { conversation, messages };
  }

  // Streaming SSE do Modo Estudo. Depois que os headers são enviados não dá
  // mais para mudar o status HTTP — qualquer erro vira "event: error" no
  // próprio stream, e a response SEMPRE é encerrada no finally.
  @Post('study/stream')
  @SkipResponseWrapper()
  async streamStudy(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Desliga buffering de proxies (nginx) — chunks devem chegar em tempo real
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      const result = await this.chatService.sendStudyMessage(
        dto,
        user.userId,
        user.institutionId,
        (text) => this.writeEvent(res, 'chunk', { text }),
      );

      this.writeEvent(res, 'done', {
        conversation_id: dto.conversation_id,
        prompt_tokens: result.promptTokens,
        response_tokens: result.responseTokens,
      });
    } catch (error) {
      const statusCode =
        error instanceof HttpException ? error.getStatus() : 500;
      const message =
        error instanceof Error ? error.message : 'Error inesperado';
      this.writeEvent(res, 'error', { message, statusCode });
    } finally {
      res.end();
    }
  }

  private writeEvent(res: Response, event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
