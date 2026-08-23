import { describe, it, expect } from 'vitest';
import { parseAuditJson, auditDeps, type DepAuditResult } from './deps';

const SAMPLE = JSON.stringify({
  vulnerabilities: {
    'lodash': {
      name: 'lodash',
      severity: 'high',
      title: 'Prototype Pollution',
      url: 'https://npmjs.com/advisories/1065',
      via: [{ name: 'lodash', title: 'Prototype Pollution' }],
      fixAvailable: true,
    },
    'minimist': {
      name: 'minimist',
      severity: 'critical',
      title: 'Prototype Pollution',
      url: 'https://npmjs.com/advisories/1179',
      via: 'minimist',
      fixAvailable: '>=1.2.6',
    },
  },
  metadata: { dependencies: 1234 },
});

describe('deps.parseAuditJson', () => {
  it('parses a vulnerable audit payload', () => {
    const r = parseAuditJson(SAMPLE);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(2);
    expect(r.dependencies).toBe(1234);
    const lodash = r.vulns.find((v) => v.name === 'lodash');
    expect(lodash?.severity).toBe('high');
    expect(lodash?.via).toBe('lodash');
    expect(lodash?.fixAvailable).toBe(true);
    const mini = r.vulns.find((v) => v.name === 'minimist');
    expect(mini?.severity).toBe('critical');
    expect(mini?.via).toBe('minimist');
    expect(mini?.fixAvailable).toBe('>=1.2.6');
  });

  it('returns ok with empty list when no vulnerabilities', () => {
    const r = parseAuditJson(JSON.stringify({ vulnerabilities: {}, metadata: { dependencies: 5 } }));
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
    expect(r.vulns).toEqual([]);
  });

  it('fails soft on invalid JSON', () => {
    const r = parseAuditJson('not json');
    expect(r.ok).toBe(false);
    expect(r.note).toMatch(/not valid JSON/);
    expect(r.vulns).toEqual([]);
  });
});

describe('deps.auditDeps', () => {
  it('uses the injected runner (no real spawn)', async () => {
    const r: DepAuditResult = await auditDeps({ runAudit: async () => SAMPLE });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(2);
  });

  it('fails soft when the runner throws', async () => {
    const r = await auditDeps({ runAudit: async () => { throw new Error('spawn ENOENT'); } });
    expect(r.ok).toBe(false);
    expect(r.note).toMatch(/spawn ENOENT/);
    expect(r.vulns).toEqual([]);
  });
});
