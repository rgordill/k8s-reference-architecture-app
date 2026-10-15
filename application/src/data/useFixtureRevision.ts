import { useSyncExternalStore } from 'react';
import {
  getFixtureRevision,
  subscribeFixtureRevision,
} from './local/fixtureRevision';

/** Re-render and re-fetch when content/styles fixtures hot-reload. */
export function useFixtureRevision(): number {
  return useSyncExternalStore(
    subscribeFixtureRevision,
    getFixtureRevision,
    getFixtureRevision,
  );
}
