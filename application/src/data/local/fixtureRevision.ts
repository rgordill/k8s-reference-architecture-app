type Listener = () => void;

let revision = 0;
const listeners = new Set<Listener>();

/** Bumps when content/ or styles/ fixtures hot-reload. */
export function getFixtureRevision(): number {
  return revision;
}

export function bumpFixtureRevision(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeFixtureRevision(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Cheap content fingerprint so same-length edits still invalidate caches. */
export function hashFixtures(
  fixtures: ReadonlyArray<{ path: string; raw: string }>,
): string {
  let hash = fixtures.length;
  for (const fixture of fixtures) {
    hash = Math.imul(hash ^ fixture.path.length, 0x9e3779b1);
    const raw = fixture.raw;
    hash = Math.imul(hash ^ raw.length, 0x85ebca77);
    // Sample ends + middle so renames like Zone~0~ → Zone~a~ are detected.
    for (let i = 0; i < raw.length; i += Math.max(1, Math.floor(raw.length / 32))) {
      hash = Math.imul(hash ^ raw.charCodeAt(i), 0xc2b2ae3d);
    }
    if (raw.length > 0) {
      hash = Math.imul(hash ^ raw.charCodeAt(raw.length - 1), 0x27d4eb2d);
    }
  }
  return `${fixtures.length}:${hash >>> 0}`;
}
