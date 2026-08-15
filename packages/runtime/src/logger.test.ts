import { describe, expect, it } from 'vitest';
import { UltraLogger, ConsoleLogSink, MemoryLogSink } from './logger';

describe('UltraLogger', () => {
  it('writes to sinks with level + category', () => {
    const sink = new MemoryLogSink();
    const logger = new UltraLogger({ sinks: [sink] });
    logger.info('SYSTEM', 'boot ok');
    logger.error('TASK', 'boom', { id: 1 });
    expect(sink.entries).toHaveLength(2);
    expect(sink.entries[0]).toMatchObject({ level: 'INFO', category: 'SYSTEM', message: 'boot ok' });
    expect(sink.entries[1].meta).toEqual({ id: 1 });
  });

  it('respects minLevel', () => {
    const sink = new MemoryLogSink();
    const logger = new UltraLogger({ sinks: [sink], minLevel: 'WARN' });
    logger.info('SYSTEM', 'hidden');
    logger.warn('SYSTEM', 'shown');
    expect(sink.entries.map((e) => e.level)).toEqual(['WARN']);
  });

  it('child logger pre-fills the module field', () => {
    const sink = new MemoryLogSink();
    const logger = new UltraLogger({ sinks: [sink] });
    const video = logger.child('video');
    video.info('MODULE', 'started');
    expect(sink.entries[0].module).toBe('video');
  });

  it('a failing sink never breaks logging', () => {
    const broken = { write: () => { throw new Error('sink down'); } };
    const sink = new MemoryLogSink();
    const logger = new UltraLogger({ sinks: [broken, sink] });
    logger.info('SYSTEM', 'still logged');
    expect(sink.entries).toHaveLength(1);
  });

  it('ConsoleLogSink supports JSON mode without throwing', () => {
    const sink = new ConsoleLogSink({ json: true });
    const logger = new UltraLogger({ sinks: [sink] });
    expect(() => logger.info('AI', 'hello')).not.toThrow();
  });

  it('MemoryLogSink tail and byCategory', () => {
    const sink = new MemoryLogSink();
    const logger = new UltraLogger({ sinks: [sink] });
    logger.info('TASK', 'a');
    logger.info('TASK', 'b');
    logger.info('MEMORY', 'c');
    expect(sink.tail(2).map((e) => e.message)).toEqual(['b', 'c']);
    expect(sink.byCategory('TASK')).toHaveLength(2);
    sink.clear();
    expect(sink.entries).toHaveLength(0);
  });
});