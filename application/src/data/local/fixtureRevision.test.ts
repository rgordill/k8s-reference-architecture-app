import { describe, expect, it } from 'vitest';
import { hashFixtures } from './fixtureRevision';

describe('hashFixtures', () => {
  it('changes when content changes without changing length', () => {
    const before = hashFixtures([
      { path: 'a.yaml', raw: "name: 'Zone~0~'\n" },
    ]);
    const after = hashFixtures([
      { path: 'a.yaml', raw: "name: 'Zone~a~'\n" },
    ]);
    expect(before).not.toBe(after);
  });

  it('is stable for identical fixtures', () => {
    const fixtures = [{ path: 'a.yaml', raw: 'id: zone\n' }];
    expect(hashFixtures(fixtures)).toBe(hashFixtures(fixtures));
  });
});
