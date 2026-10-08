# Kubernetes Reference Architecture App

React + PatternFly application that renders Kubernetes reference-architecture YAML into interactive d3.js diagrams, with SVG/PNG export and GitHub Pages deployment.

Licensed under the [Apache License 2.0](LICENSE).

## Features

- Load architecture definitions from YAML fixtures under `content/`
- Load node/edge/group visual styles from YAML under `styles/` (logos, fonts, light/dark colors)
- PatternFly UI with light/dark theme toggle
- Static grid-aligned d3 diagrams (zones as columns, hierarchy top→bottom) with groups, pan/zoom, and PNG/SVG export
- Node and group names support inline Markdown (`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, `~sub~`, `^sup^`)
- Repository abstraction ready for a future Kubernetes API (CRDs / ConfigMaps)

## Quick start

The React/PatternFly app lives in [`application/`](application/). Architecture YAML stays at the repository root under `content/` and `styles/`.

```bash
cd application
npm install
npm run dev
```

Open the local Vite URL (typically http://localhost:5173).

```bash
cd application
npm test
npm run build
npm run preview
```

## Content and styles

| Path | Role | Future source |
|------|------|---------------|
| `content/**/*.yaml` | Architecture documents (metadata + diagram graph). Groups may list `nodes` and nested `groups`. | Kubernetes CRDs / API |
| `styles/{nodes,groups,edges}/*.yaml` | Visual style definitions (`id` referenced by nodes, edges, and groups), grouped by `kind` | ConfigMaps / API |
| `logo/**` | Local logo files referenced by `logo.type: url` | ConfigMaps / API |

Style logos:

- `logo.type: patternfly` + icon name (e.g. `LockIcon`, `DatabaseIcon`, `CubeIcon`) — PatternFly-safe defaults
- `logo.type: url` + relative path or absolute URL — custom logos (`valueDark` optional for dark theme)

Example style:

```yaml
id: vault-application
kind: node
logo:
  type: patternfly
  value: LockIcon
colors:
  light: { fill: '#e7f1fa', stroke: '#0066cc', text: '#151515' }
  dark:  { fill: '#1b3a55', stroke: '#92c5f9', text: '#f0f0f0' }
font:
  family: 'RedHatText, Overpass, sans-serif'
  size: 12
```

Application source lives under [`application/src/`](application/src/). The local repositories in `application/src/data/local/` implement `ArchitectureRepository` and `StyleRepository`; swap those implementations for a Kubernetes client later without changing the UI.

YAML files whose names contain `:` (for example `hashicorp-vault:dev.yaml`) are loaded through [`application/vite-plugin-fixtures.ts`](application/vite-plugin-fixtures.ts) so Vite’s module graph does not treat the colon as a URL scheme. The plugin reads fixtures from the repository root (`../content`, `../styles`).

## GitHub Pages

The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds and deploys on pushes to `main`/`master`.

1. Push this repository to GitHub.
2. Under **Settings → Pages**, set the source to **GitHub Actions** (not “Deploy from a branch”). Branch deploys publish the README instead of the Vite app.
3. After the workflow succeeds, the app is at `https://<user>.github.io/<repo>/`.

The git folder `application/` is only the source tree. It is not a path on the Pages site. `https://<user>.github.io/<repo>/application/` is rewritten to the app via the SPA `404.html` fallback.

Override the Vite base path with `VITE_BASE` if needed (the workflow sets it from the repository name).

## License & Attribution

This project is licensed under the [Apache License 2.0](LICENSE).

It also uses permissive open-source dependencies:

| Package | License |
|---------|---------|
| React, React DOM, React Router | MIT |
| PatternFly (`@patternfly/*`) | MIT |
| d3 | ISC |
| js-yaml | MIT |
| Vite, Vitest, TypeScript | MIT |

Node icons use PatternFly-safe geometric icons by default. Where a style sets `logo.type: url`, artwork is loaded from that URL (for example the official cert-manager icon from [CNCF artwork](https://github.com/cncf/artwork)). HashiCorp Vault nodes use the **Vault Community** marks from the [HCP product logos](https://www.hashicorp.com/en/brand/hcp-product-logos) pack, stored under [`logo/vault/`](logo/vault/). This project is not affiliated with HashiCorp, IBM, CNCF, or the Linux Foundation. Use of third-party trademarks and logos is subject to each project’s trademark policy.

## Filtering

The architecture list supports query filters:

| Param | Meaning | Example |
|-------|---------|---------|
| `name` | Case-insensitive substring against architecture name (`*` → any) | `/?name=cert-manager` |
| `usage` | Exact usage label | `/?usage=OpenShift` |
| `tag` | Exact tag | `/?tag=certificates` |

Deployment method is tagged as exactly one of `deploy:helm`, `deploy:operator`, or `deploy:both`.

Dependency values in YAML are the same name patterns; clicking a dependency on a detail page opens the list with `?name=<pattern>`.
