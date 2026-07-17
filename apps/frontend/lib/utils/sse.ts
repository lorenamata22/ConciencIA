// Parser incremental de frames SSE (text/event-stream) — função pura,
// sem dependência de DOM, para ser testável isoladamente quando o harness
// de testes do frontend for configurado.

export interface SseEvent {
  event: string;
  data: string;
}

// Mantém um buffer interno: chunks de rede podem cortar um frame no meio.
// feed() devolve apenas os frames completos (separados por linha em branco).
export function createSseParser() {
  let buffer = '';

  return {
    feed(text: string): SseEvent[] {
      buffer += text;
      const events: SseEvent[] = [];

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const parsed = parseFrame(frame);
        if (parsed) events.push(parsed);

        separatorIndex = buffer.indexOf('\n\n');
      }

      return events;
    },
  };
}

function parseFrame(frame: string): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}
