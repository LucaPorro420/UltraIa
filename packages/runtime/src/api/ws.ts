import { createHash } from 'node:crypto';
import type { Duplex } from 'node:stream';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME_BYTES = 16 * 1024 * 1024;

/** RFC 6455 handshake accept token: base64(sha1(key + GUID)). */
export function wsAccept(key: string): string {
  return createHash('sha1').update(key + WS_GUID).digest('base64');
}

const OP_TEXT = 0x1;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

/**
 * Minimal server-side WebSocket connection over an upgraded Duplex socket.
 * Parses masked client frames (text/close/ping/pong) and writes unmasked
 * server frames. Zero dependencies — handshake and framing live here.
 */
export class WebSocketConnection {
  private buffer: Buffer = Buffer.alloc(0);
  private closed = false;
  private notified = false;
  private readonly messageCbs = new Set<(data: string) => void>();
  private readonly closeCbs = new Set<() => void>();

  constructor(private readonly socket: Duplex) {
    this.socket.on('data', (chunk: Buffer) => {
      this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
      this.consume();
    });
    this.socket.on('close', () => this.handleClosed());
    this.socket.on('error', () => this.handleClosed());
  }

  onMessage(cb: (data: string) => void): void {
    this.messageCbs.add(cb);
  }

  onClose(cb: () => void): void {
    this.closeCbs.add(cb);
  }

  send(data: string): void {
    if (this.closed) return;
    this.writeFrame(OP_TEXT, Buffer.from(data, 'utf8'));
  }

  ping(): void {
    if (this.closed) return;
    this.writeFrame(OP_PING, Buffer.alloc(0));
  }

  close(code = 1000, reason = ''): void {
    if (this.closed) return;
    const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
    payload.writeUInt16BE(code, 0);
    payload.write(reason, 2, 'utf8');
    this.writeFrame(OP_CLOSE, payload);
    this.closed = true;
    this.socket.end();
  }

  private writeFrame(opcode: number, payload: Buffer): void {
    let header: Buffer;
    if (payload.length < 126) {
      header = Buffer.from([0x80 | opcode, payload.length]);
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }

  private consume(): void {
    while (!this.closed) {
      const frame = this.tryParse();
      if (!frame) return;
      if (frame.opcode === OP_CLOSE) {
        this.closed = true;
        this.writeFrame(OP_CLOSE, frame.payload.subarray(0, 2));
        this.socket.end();
        this.handleClosed();
        return;
      }
      if (frame.opcode === OP_PING) {
        this.writeFrame(OP_PONG, frame.payload);
        continue;
      }
      if (frame.opcode === OP_TEXT) {
        const text = frame.payload.toString('utf8');
        for (const cb of [...this.messageCbs]) cb(text);
      }
    }
  }

  private tryParse(): { opcode: number; payload: Buffer } | undefined {
    if (this.buffer.length < 2) return undefined;
    const b0 = this.buffer[0];
    const b1 = this.buffer[1];
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (this.buffer.length < 4) return undefined;
      len = this.buffer.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (this.buffer.length < 10) return undefined;
      const big = this.buffer.readBigUInt64BE(2);
      if (big > BigInt(MAX_FRAME_BYTES)) {
        this.close(1009, 'frame too large');
        return undefined;
      }
      len = Number(big);
      offset = 10;
    }
    if (len > MAX_FRAME_BYTES) {
      this.close(1009, 'frame too large');
      return undefined;
    }
    const maskLen = masked ? 4 : 0;
    if (this.buffer.length < offset + maskLen + len) return undefined;
    const mask = masked ? this.buffer.subarray(offset, offset + 4) : undefined;
    let payload = this.buffer.subarray(offset + maskLen, offset + maskLen + len);
    if (mask) {
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    }
    this.buffer = this.buffer.subarray(offset + maskLen + len);
    return { opcode: b0 & 0x0f, payload };
  }

  private handleClosed(): void {
    if (this.notified) return;
    this.notified = true;
    this.closed = true;
    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('close');
    this.socket.removeAllListeners('error');
    for (const cb of [...this.closeCbs]) cb();
  }
}