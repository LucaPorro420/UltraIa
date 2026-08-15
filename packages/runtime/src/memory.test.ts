import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MemoryManager, JsonFileMemoryPersistence } from './memory';
import { UltraEventBus } from './event-bus';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-memory-'));
}

describe('MemoryManager', () => {
  it('stores entries with default importance/confidence', () => {
    const manager = new MemoryManager();
    const entry = manager.store({ type: 'DECISION', source: 'arch', content: 'Use Tauri' });
    expect(entry.importance).toBe(0.5);
    expect(entry.confidence).toBe(0.7);
    expect(manager.count()).toBe(1);
    expect(manager.get(entry.id)).toBe(entry);
  });

  it('deduplicates identical content by hash (bumping importance)', () => {
    const manager = new MemoryManager();
    const first = manager.store({ type: 'LEARNING', source: 'run', content: 'same', importance: 0.4 });
    const second = manager.store({ type: 'LEARNING', source: 'run', content: 'same', importance: 0.9 });
    expect(manager.count()).toBe(1);
    expect(first.id).toBe(second.id);
    expect(manager.get(first.id)?.importance).toBe(0.9);
  });

  it('searches with scoring: keyword matches beat stale low-importance entries', () => {
    const manager = new MemoryManager();
    manager.store({ type: 'ERROR', source: 'video', content: 'gpu out of memory', importance: 0.9 });
    manager.store({ type: 'SOLUTION', source: 'video', content: 'render on cpu fallback', importance: 0.4 });
    manager.store({ type: 'DECISION', source: 'arch', content: 'adopt tauri shell', importance: 0.8 });
    const results = manager.search({ query: 'gpu' });
    expect(results[0].content).toBe('gpu out of memory');
    const byType = manager.search({ types: ['SOLUTION'], limit: 10 });
    expect(byType).toHaveLength(1);
    const filtered = manager.search({ importanceMin: 0.5, limit: 10 });
    expect(filtered.every((e) => e.importance >= 0.5)).toBe(true);
  });

  it('only persists entries above the threshold', async () => {
    const file = path.join(tmpDir(), 'entries.json');
    const manager = new MemoryManager(new UltraEventBus(), undefined, {
      persistence: new JsonFileMemoryPersistence(file),
      persistThreshold: 0.5,
    });
    await manager.init();
    manager.store({ type: 'TASK', source: 'x', content: 'transient detail', importance: 0.2 });
    manager.store({ type: 'DECISION', source: 'arch', content: 'keep sqlite', importance: 0.9 });
    await manager.persist();
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{ importance: number }>;
    expect(raw).toHaveLength(1);
    expect(raw[0].importance).toBe(0.9);
  });

  it('restores persisted entries on init', async () => {
    const file = path.join(tmpDir(), 'entries.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const manager = new MemoryManager(new UltraEventBus(), undefined, {
      persistence: new JsonFileMemoryPersistence(file),
    });
    manager.store({ type: 'DECISION', source: 'a', content: 'persisted fact' });
    await manager.persist();
    const reloaded = new MemoryManager(new UltraEventBus(), undefined, {
      persistence: new JsonFileMemoryPersistence(file),
    });
    await reloaded.init();
    expect(reloaded.search({ query: 'persisted', limit: 10 })[0].content).toBe('persisted fact');
  });

  it('evicts lowest-score entries when over the cap', () => {
    const manager = new MemoryManager(new UltraEventBus(), undefined, { maxEntries: 3 });
    manager.store({ type: 'TASK', source: 'a', content: 'low value 1', importance: 0.3 });
    manager.store({ type: 'TASK', source: 'a', content: 'low value 2', importance: 0.3 });
    manager.store({ type: 'TASK', source: 'a', content: 'low value 3', importance: 0.3 });
    manager.store({ type: 'DECISION', source: 'a', content: 'critical call', importance: 0.95 });
    expect(manager.count()).toBe(3);
    expect(manager.list().some((e) => e.content === 'critical call')).toBe(true);
  });

  it('generates a report grouped by type with recommendations', () => {
    const manager = new MemoryManager(new UltraEventBus(), undefined, { persistThreshold: 0 });
    manager.store({ type: 'ERROR', source: 't', content: 'ffmpeg missing', importance: 0.8 });
    manager.store({ type: 'SOLUTION', source: 't', content: 'installed ffmpeg', importance: 0.8 });
    manager.store({ type: 'LEARNING', source: 't', content: 'winget install Gyan.FFmpeg', importance: 0.9 });
    manager.store({ type: 'PERFORMANCE', source: 't', content: 'render took 4s', importance: 0.6 });
    const report = manager.generateReport();
    expect(report.sections.ERROR).toEqual(['ffmpeg missing']);
    expect(report.sections.SOLUTION).toEqual(['installed ffmpeg']);
    expect(report.recommendations).toContain('winget install Gyan.FFmpeg');
    expect(report.entryCount).toBe(4);
  });

  it('filters report by project', () => {
    const manager = new MemoryManager(new UltraEventBus(), undefined, { persistThreshold: 0 });
    manager.store({ type: 'DECISION', source: 'a', content: 'for p1', importance: 0.7, projectId: 'p1' });
    manager.store({ type: 'DECISION', source: 'a', content: 'for p2', importance: 0.7, projectId: 'p2' });
    const report = manager.generateReport({ projectId: 'p1' });
    expect(report.entryCount).toBe(1);
  });

  it('remove and clear work', () => {
    const manager = new MemoryManager();
    const entry = manager.store({ type: 'TASK', source: 'a', content: 'x' });
    expect(manager.remove(entry.id)).toBe(true);
    expect(manager.remove(entry.id)).toBe(false);
    manager.store({ type: 'TASK', source: 'a', content: 'y' });
    manager.clear();
    expect(manager.count()).toBe(0);
  });

  it('emits memory.updated on new entries', () => {
    const bus = new UltraEventBus();
    const updated = vi.fn();
    bus.on('memory.updated', updated);
    const manager = new MemoryManager(bus);
    manager.store({ type: 'LEARNING', source: 's', content: 'fresh' });
    expect(updated).toHaveBeenCalledTimes(1);
  });
});