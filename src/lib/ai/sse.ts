export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Incremental SSE parser: feed arbitrary chunks (frames may be split anywhere, CRLF or LF) and get complete events.
 * Comment lines (": ping") are ignored; `event` defaults to 'message'. Same behaviour as the backend's parser
 * in JournalAWSSetup src/features/ai/sse.ts.
 */
export class SseParser {
  private buf = '';
  private event = '';
  private data: string[] = [];

  push(chunk: string): SseEvent[] {
    this.buf += chunk;
    const out: SseEvent[] = [];
    let nl: number;
    while ((nl = this.buf.search(/\r\n|\n|\r/)) >= 0) {
      const line = this.buf.slice(0, nl);
      const sepLen = this.buf.startsWith('\r\n', nl) ? 2 : 1;
      if (sepLen === 1 && this.buf[nl] === '\r' && nl === this.buf.length - 1) break; // a CRLF may be split across chunks
      this.buf = this.buf.slice(nl + sepLen);
      if (line === '') {
        if (this.data.length) out.push({ event: this.event || 'message', data: this.data.join('\n') });
        this.event = '';
        this.data = [];
        continue;
      }
      if (line.startsWith(':')) continue;
      const i = line.indexOf(':');
      const field = i < 0 ? line : line.slice(0, i);
      const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '');
      if (field === 'event') this.event = value;
      else if (field === 'data') this.data.push(value);
    }
    return out;
  }

  /** Flush a final event that was not terminated by a blank line. */
  end(): SseEvent[] {
    const out = this.push('\n\n');
    this.buf = '';
    return out;
  }
}
