import { describe, it, expect } from 'vitest';
import {
  UnifiedOrchestrator,
  getOrchestrator,
  type ConnectedApp,
  type LearningEvent,
  type OrchestrationCommand,
} from './orchestrator-unified';

describe('UnifiedOrchestrator', () => {
  it('registers apps', () => {
    const o = new UnifiedOrchestrator();
    const app: ConnectedApp = {
      type: 'web',
      id: 'web-1',
      status: 'connected',
      lastSeen: Date.now(),
      version: '1.0.0',
      capabilities: ['learning'],
    };
    o.registerApp(app);
    expect(o.getConnectedApps()).toHaveLength(1);
    expect(o.getConnectedApps()[0].id).toBe('web-1');
  });

  it('filters apps by type', () => {
    const o = new UnifiedOrchestrator();
    o.registerApp({ type: 'web', id: 'w1', status: 'connected', lastSeen: 0, version: '1', capabilities: [] });
    o.registerApp({ type: 'mobile', id: 'm1', status: 'connected', lastSeen: 0, version: '1', capabilities: [] });
    o.registerApp({ type: 'runtime', id: 'r1', status: 'disconnected', lastSeen: 0, version: '1', capabilities: [] });
    expect(o.getAppsByType('web')).toHaveLength(1);
    expect(o.getAppsByType('mobile')).toHaveLength(1);
    expect(o.getAppsByType('runtime')).toHaveLength(1);
  });

  it('updates app status', () => {
    const o = new UnifiedOrchestrator();
    o.registerApp({ type: 'web', id: 'w1', status: 'disconnected', lastSeen: 0, version: '1', capabilities: [] });
    o.updateAppStatus('w1', 'connected');
    expect(o.getConnectedApps()[0].status).toBe('connected');
  });

  it('tracks learning events', () => {
    const o = new UnifiedOrchestrator();
    const event: LearningEvent = {
      id: 'e1',
      app: 'web',
      timestamp: Date.now(),
      category: 'improvement',
      description: 'Test event',
      impact: 'high',
      verified: false,
    };
    o.trackLearning(event);
    expect(o.getLearningByApp('web')).toHaveLength(1);
    expect(o.getLearningByCategory('improvement')).toHaveLength(1);
  });

  it('returns priority learning (unverified high-impact)', () => {
    const o = new UnifiedOrchestrator();
    o.trackLearning({ id: 'e1', app: 'web', timestamp: 1, category: 'bug', description: 'x', impact: 'high', verified: false });
    o.trackLearning({ id: 'e2', app: 'web', timestamp: 2, category: 'bug', description: 'y', impact: 'low', verified: false });
    o.trackLearning({ id: 'e3', app: 'web', timestamp: 3, category: 'bug', description: 'z', impact: 'high', verified: true });
    expect(o.getPriorityLearning()).toHaveLength(1);
    expect(o.getPriorityLearning()[0].id).toBe('e1');
  });

  it('sends and retrieves commands', () => {
    const o = new UnifiedOrchestrator();
    const cmd: OrchestrationCommand = {
      id: 'c1',
      from: 'web',
      to: 'mobile',
      action: 'sync',
      payload: { data: 'test' },
      timestamp: Date.now(),
    };
    o.sendCommand(cmd);
    expect(o.getCommandsFor('mobile')).toHaveLength(1);
    expect(o.getCommandsFor('web')).toHaveLength(0);
  });

  it('sends broadcast commands', () => {
    const o = new UnifiedOrchestrator();
    o.sendCommand({ id: 'c1', from: 'web', to: 'all', action: 'ping', payload: {}, timestamp: 1 });
    expect(o.getCommandsFor('mobile')).toHaveLength(1);
    expect(o.getCommandsFor('runtime')).toHaveLength(1);
  });

  it('records metrics', () => {
    const o = new UnifiedOrchestrator();
    o.recordMetric({ name: 'cpu', value: 42, unit: '%', app: 'web', timestamp: Date.now() });
    const dash = o.getDashboard();
    expect(dash.metrics).toHaveLength(1);
  });

  it('returns full dashboard', () => {
    const o = new UnifiedOrchestrator();
    o.registerApp({ type: 'web', id: 'w1', status: 'connected', lastSeen: 0, version: '1', capabilities: [] });
    o.trackLearning({ id: 'e1', app: 'web', timestamp: 1, category: 'insight', description: 'x', impact: 'medium', verified: false });
    const dash = o.getDashboard();
    expect(dash.apps).toHaveLength(1);
    expect(dash.learning.total).toBe(1);
    expect(dash.learning.unverified).toBe(1);
  });

  it('exports and imports learning', () => {
    const o = new UnifiedOrchestrator();
    o.trackLearning({ id: 'e1', app: 'web', timestamp: 1, category: 'insight', description: 'x', impact: 'medium', verified: false });
    const exported = o.exportLearning();
    expect(exported).toHaveLength(1);

    const o2 = new UnifiedOrchestrator();
    o2.importLearning(exported);
    expect(o2.getLearningByApp('web')).toHaveLength(1);
  });

  it('caps learning events at 1000', () => {
    const o = new UnifiedOrchestrator();
    for (let i = 0; i < 1100; i++) {
      o.trackLearning({ id: `e${i}`, app: 'web', timestamp: i, category: 'insight', description: `${i}`, impact: 'low', verified: false });
    }
    expect(o.getLearningByApp('web')).toHaveLength(1000);
  });

  it('singleton getOrchestrator returns same instance', () => {
    const a = getOrchestrator();
    const b = getOrchestrator();
    expect(a).toBe(b);
  });
});
