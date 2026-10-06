import { describe, expect, it } from 'vitest';
import styleFixtures from 'virtual:style-fixtures';
import {
  architectureRepository,
  styleRepository,
  type Architecture,
  type StyleDefinition,
} from './index';
import { parseStyleFile } from './local/loadYaml';
import { validateArchitecture } from './validateArchitecture';

async function loadCatalog(): Promise<{
  summaries: Awaited<ReturnType<typeof architectureRepository.list>>;
  architectures: Architecture[];
  styles: StyleDefinition[];
}> {
  const [summaries, styles] = await Promise.all([
    architectureRepository.list(),
    styleRepository.list(),
  ]);
  const architectures = (
    await Promise.all(summaries.map((item) => architectureRepository.get(item.name)))
  ).filter((arch): arch is Architecture => arch != null);
  return { summaries, architectures, styles };
}

describe('architecture catalog invariants', () => {
  it('lists at least one architecture and get() round-trips each name', async () => {
    const { summaries, architectures } = await loadCatalog();
    expect(summaries.length).toBeGreaterThan(0);
    expect(architectures).toHaveLength(summaries.length);
    expect(new Set(summaries.map((s) => s.name)).size).toBe(summaries.length);

    for (const summary of summaries) {
      const arch = architectures.find((a) => a.name === summary.name);
      expect(arch, `get(${summary.name})`).toBeDefined();
      expect(arch?.description).toBe(summary.description);
    }
  });

  it('every architecture satisfies structural invariants', async () => {
    const { architectures, styles } = await loadCatalog();
    const issues = architectures.flatMap((arch) =>
      validateArchitecture(arch, styles),
    );
    expect(issues).toEqual([]);
  });

  it('every listed style has light and dark colors', async () => {
    const styles = await styleRepository.list();
    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) {
      expect(style.id, 'style id').toBeTruthy();
      expect(['node', 'edge', 'group']).toContain(style.kind);
      expect(style.colors.light.fill).toBeTruthy();
      expect(style.colors.light.stroke).toBeTruthy();
      expect(style.colors.dark.fill).toBeTruthy();
      expect(style.colors.dark.stroke).toBeTruthy();
    }
  });

  it('places each style YAML file under nodes/, groups/, or edges/', () => {
    const folderByKind: Record<string, string> = {
      node: 'nodes',
      group: 'groups',
      edge: 'edges',
    };
    expect(styleFixtures.length).toBeGreaterThan(0);
    for (const fixture of styleFixtures) {
      const style = parseStyleFile(fixture.raw);
      const folder = folderByKind[style.kind];
      expect(folder, `${fixture.path} has kind ${style.kind}`).toBeTruthy();
      expect(
        fixture.path.startsWith(`${folder}/`),
        `${fixture.path} should live under styles/${folder}/`,
      ).toBe(true);
    }
  });
});
