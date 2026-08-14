import { describe, expect, it } from 'vitest';
import { createMediaField, addEntity } from './mediafield';
import {
  checkTimelineSync,
  checkpointFromField,
  createMasterTimeline,
  LongTermMemory,
  MemoryCheckpointStore,
  project,
} from './project';

describe('project hierarchy (Project → Act → Sequence → Scene → Shot)', () => {
  it('builds a nested project incrementally', () => {
    const p = project.create('Mi película', 'es');
    const act1 = project.addAct(p, 'Act 1');
    const seq = project.addSequence(act1, 'Introducción');
    const scene = project.addScene(seq, 'Elena llega a la ciudad');
    const shot = project.addShot(scene, 'Elena walking into the city, slow push-in, golden hour', {
      duration: 7,
      motion: 'slow-push-in',
    });

    expect(p.acts).toHaveLength(1);
    expect(act1.sequences[0]).toBe(seq);
    expect(seq.scenes[0]).toBe(scene);
    expect(scene.shots[0]).toBe(shot);
    expect(shot.duration).toBe(7);
    expect(shot.motion).toBe('slow-push-in');
    expect(p.language).toBe('es');
  });

  it('defaults shot fields', () => {
    const p = project.create('X');
    const scene = project.addScene(project.addSequence(project.addAct(p, 'A'), 's'), 'sc');
    const shot = project.addShot(scene, 'prompt');
    expect(shot.duration).toBe(5);
    expect(shot.motion).toBe('zoom-in');
  });
});

describe('MasterTimeline', () => {
  it('creates an empty timeline and detects dialogue/video offsets > 0.1s', () => {
    const tl = createMasterTimeline('proj_x');
    tl.tracks.video.push({ start: 0, end: 5, shotId: 'shot_1' });
    tl.tracks.dialogue.push({ start: 0.05, end: 4, text: 'Hola', voice: 'es-ES-ElviraNeural' });

    expect(checkTimelineSync(tl)).toEqual([]);

    tl.tracks.dialogue[0].start = 1.5;
    const issues = checkTimelineSync(tl);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain('off from its shot');
  });
});

describe('WorldCheckpoint + LongTermMemory', () => {
  it('stores checkpoints and restores the closest state before a time', () => {
    const store = new MemoryCheckpointStore();
    const field = createMediaField();
    addEntity(field, { id: 'elena', type: 'character', identity: { name: 'Elena' } });

    const cp1 = checkpointFromField('cp_00', 'proj_x', 0, field, {}, {});
    store.save(cp1);
    field.time = 120;
    const cp2 = checkpointFromField('cp_02', 'proj_x', 120, field, {}, {});
    store.save(cp2);

    expect(store.latestBefore(60)?.id).toBe('cp_00');
    expect(store.latestBefore(300)?.id).toBe('cp_02');
    expect(store.list()).toHaveLength(2);
  });

  it('remembers characters and scenes across the project', () => {
    const mem = new LongTermMemory();
    const field = createMediaField();
    const elena = addEntity(field, { id: 'elena', type: 'character', identity: { name: 'Elena' } });

    mem.rememberCharacter(elena);
    mem.rememberScene('scene_04', 'Elena recuerda lo sucedido');

    expect(mem.recallCharacter('elena')?.identity).toMatchObject({ name: 'Elena' });
    expect(mem.scenes.get('scene_04')).toContain('recuerda');
  });

  it('restores a checkpoint through the memory facade', () => {
    const store = new MemoryCheckpointStore();
    const mem = new LongTermMemory(store);
    const field = createMediaField();
    store.save(checkpointFromField('cp_00', 'p', 0, field, {}, {}));
    store.save(checkpointFromField('cp_02', 'p', 120, field, {}, {}));

    expect(mem.restoreBefore(60)?.id).toBe('cp_00');
    expect(mem.restoreBefore(60)?.world.world_id).toBeTruthy();
  });
});