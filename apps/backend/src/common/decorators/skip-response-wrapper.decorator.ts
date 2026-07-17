import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_WRAPPER_KEY = 'skipResponseWrapper';

// Exceção mínima ao envelope { data, message, statusCode } do
// ResponseInterceptor — usada apenas em rotas de streaming (SSE), onde o
// envelope quebraria o formato text/event-stream
export const SkipResponseWrapper = () =>
  SetMetadata(SKIP_RESPONSE_WRAPPER_KEY, true);
