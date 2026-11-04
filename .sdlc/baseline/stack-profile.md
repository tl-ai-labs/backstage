# Stack profile: learned from repo scan

- Built: 2026-11-04 for run `20261104-210402-refactor-require-react18` (Tier 2b; trigger: no pre-authored adapter fits Backstage React + Express)
- Source: this branch's working tree only (HEAD `f20fd9b59828`)

## Language & runtime

The repo is TypeScript ~5.7 on Node 22 or 24, managed with Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`) and the `node-modules` linker. The root `tsconfig.json` uses `"jsx": "react-jsx"`, the automatic runtime. Almost no source file imports React for JSX: 1 of 1,058 `plugins/*/src/**/*.tsx` files has `import React`. The published adopter base config `packages/cli/config/tsconfig.json` still says `"jsx": "react"`, with `module: ES2020`, `moduleResolution: bundler`, `isolatedModules`, `strict`, `noUnusedLocals`/`Parameters` and `noImplicitReturns`. Source is ESM-style TypeScript. Backend knex migrations are CommonJS `.js` files with `// @ts-check`. Every source file starts with a 15-line Apache 2.0 header (`Copyright <year> The Backstage Authors`). Do not change the year on existing files.

## Framework

Backstage, an in-repo framework with four families:
- **Old frontend system:** `@backstage/core-*` with `createPlugin` and `createRoutableExtension`.
- **New frontend system:** `@backstage/frontend-*` with `createFrontendPlugin` and the blueprints `PageBlueprint`, `ApiBlueprint`, `SubPageBlueprint` and so on.
- **Backend system:** `@backstage/backend-*` with `createBackendPlugin`, `coreServices` and Express routers.
- **CLI / bundler:** `packages/cli*`, which owns webpack/rspack config and Jest config.

Frontend packages use React 18 in development (devDependencies `react ^18.0.2`, `@testing-library/react ^16`) but declare `"^17.0.0 || ^18.0.0"` as the peer range. Material UI v4 is the dominant UI library (`@material-ui/core`). `@backstage/ui` is the newer design system.

## Conventions detected

### File naming
- React components use PascalCase files in a feature folder, with a co-located test: `plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.tsx` and `DirectionFilter.test.tsx`.
- Plugin definitions:
  - Old system: `src/plugin.ts` (`plugins/devtools/src/plugin.ts`)
  - New system: `src/alpha.tsx` or `src/alpha/plugin.tsx` (`plugins/devtools/src/alpha/plugin.tsx`), exported through the `./alpha` subpath
  - Backend: `src/plugin.ts`
- Backend HTTP code lives in `src/service/router.ts` (camelCase). Classes get PascalCase files: `src/database/DatabaseNotificationsStore.ts`.
- Migrations are named `migrations/YYYYMMDD_camelCaseName.js`.
- Config schema lives in `config.d.ts` at the package root (72 plugins have one).
- Tests are `*.test.ts` or `*.test.tsx` next to the source. There are no `__tests__` folders in samples.

### Handler / controller shape
Backend plugin (`plugins/example-todo-list-backend/src/plugin.ts`):
```ts
export const exampleTodoListPlugin = createBackendPlugin({
  pluginId: 'todolist',
  register(env) {
    env.registerInit({
      deps: {
        httpAuth: coreServices.httpAuth,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
      },
      async init({ httpAuth, logger, httpRouter }) {
        httpRouter.use(await createRouter({ httpAuth, logger }));
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
```
Router (`plugins/example-todo-list-backend/src/service/router.ts`). It uses `express-promise-router`, throws `InputError` from `@backstage/errors`, and gets credentials through `httpAuth`:
```ts
const router = Router();
router.use(express.json());
router.post('/todos', async (req, res) => {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  if (!isTodoCreateRequest(req.body)) {
    throw new InputError('Invalid payload');
  }
  ...
});
```

### Frontend component shape
Function components are arrow-function `const` exports with a `Props` type. There are no default exports (ADR003), no `React.FC`, and no React import for JSX. Hooks are named imports from `'react'`. MUI v4 is imported per-component path. Example from `plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.tsx`:
```tsx
import Box from '@material-ui/core/Box';
import { useCallback } from 'react';
import { useTranslationRef } from '@backstage/frontend-plugin-api';

export type Props = { value: Direction; onChange: (value: Direction) => void };

export const DirectionFilter = ({ value, onChange }: Props) => {
  const { t } = useTranslationRef(catalogGraphTranslationRef);
  const handleChange = useCallback(
    (v: SelectedItems) => onChange(v as Direction),
    [onChange],
  );
  return (<Box pb={1} pt={1}><Select ... onChange={handleChange} /></Box>);
};
```

### Plugin / service shape (frontend)
Old system (`plugins/devtools/src/plugin.ts`):
```ts
export const devToolsPlugin = createPlugin({
  id: 'devtools',
  apis: [createApiFactory({ api: devToolsApiRef, deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) => new DevToolsClient({ discoveryApi, fetchApi }) })],
  routes: { root: rootRouteRef },
});
export const DevToolsPage = devToolsPlugin.provide(createRoutableExtension({
  name: 'DevToolsPage',
  component: () => import('./components/DevToolsPage').then(m => m.DevToolsPage),
  mountPoint: rootRouteRef,
}));
```
New system (`plugins/devtools/src/alpha/plugin.tsx`). Exports carry `/** @alpha */`, and pages lazy-load through `loader: async () => ...`:
```tsx
/** @alpha */
export const devToolsApi = ApiBlueprint.make({
  params: defineParams => defineParams({
    api: devToolsApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) => new DevToolsClient({ discoveryApi, fetchApi }),
  }),
});
```
Every exported symbol carries a TSDoc release tag (`@public`, `@alpha`). The API Extractor reports (`report*.api.md`) depend on these tags.

### React DOM rendering (shim pattern relevant to this run's intent)
The same conditional-import shim appears in `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx` and `plugins/techdocs/src/reader/transformers/renderReactElement.ts`:
```ts
let ReactDOMPromise: Promise<
  typeof import('react-dom') | typeof import('react-dom/client')
>;
if (process.env.HAS_REACT_DOM_CLIENT) {
  ReactDOMPromise = import('react-dom/client');
} else {
  ReactDOMPromise = import('react-dom');
}
// later: if ('createRoot' in ReactDOM) { ReactDOM.createRoot(el).render(...) } else { ReactDOM.render(<X />, el) }
```
`HAS_REACT_DOM_CLIENT` is defined by the bundler in `packages/cli-module-build/src/lib/bundler/config.ts` (via `hasReactDomClient()` in two define-plugin blocks) and by Jest in `packages/cli-module-test-jest/config/jest.js` (via `require.resolve('react-dom/client')` in a try/catch). The example app entry `packages/app/src/index.tsx` already calls `ReactDOM.createRoot(document.getElementById('root')!).render(app)` directly from `react-dom/client`.

### Test shape
- **Frontend, old system:** Jest + RTL plus `renderInTestApp` from `@backstage/test-utils`, with `describe('<Component/>')` and `test(...)` (`plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.test.tsx`):
```tsx
await renderInTestApp(<DirectionFilter value={Direction.RIGHT_LEFT} onChange={onChange} />);
expect(screen.getByText('Right to left')).toBeInTheDocument();
await userEvent.click(within(screen.getByTestId('select')).getByRole('button'));
```
- **Frontend, new system:** `createExtensionTester` and `renderInTestApp` from `@backstage/frontend-test-utils`, plus `withLogCollector` from `@backstage/test-utils` (`plugins/app-react/src/blueprints/NavContentBlueprint.test.tsx`).
- **Backend:** supertest against a bare `express()` with `mockServices.*.mock()` from `@backstage/backend-test-utils` (`plugins/example-todo-list-backend/src/service/router.test.ts`). Plugin-level tests use `startTestBackend` (`plugins/app-backend/src/service/appPlugin.test.ts`).
- **CLAUDE.md test style:** prefer fewer, thorough tests; prefer `screen` and `findBy*` over `waitFor`; do not add test IDs to implementation code. Some older tests still use `waitFor` and `getByTestId`, so do not copy that.
- **Runner:** `CI=1 yarn test <path>` (Jest 30 through `backstage-cli repo test`, with `--experimental-vm-modules`).

### Config
Config is declared through a `config.d.ts` `export interface Config { ... }` with TSDoc on every field (`plugins/devtools-backend/config.d.ts`). It is read at runtime through `coreServices.rootConfig` (`config.has(...)` and `config.getOptionalString(...)`), never through raw `process.env` in plugin code. App config lives in `app-config*.yaml`.

### Data layer
Data access uses Knex through `DatabaseService`. Stores are classes with a static async `create` that runs migrations (`plugins/notifications-backend/src/database/DatabaseNotificationsStore.ts`):
```ts
const migrationsDir = resolvePackagePath('@backstage/plugin-notifications-backend', 'migrations');
static async create({ database, skipMigrations }) {
  const client = await database.getClient();
  if (!database.migrations?.skip && !skipMigrations) {
    await client.migrate.latest({ directory: migrationsDir });
  }
  return new DatabaseNotificationsStore(client);
}
```
Migrations (`plugins/notifications-backend/migrations/20260621_addMetadata.js`) are CommonJS with `// @ts-check` and `exports.up` / `exports.down` using `knex.schema.alterTable`.

### Framework-owned wiring
- **Backend:** `packages/backend/src/index.ts` calls `createBackend()`, then `backend.add(import('@backstage/plugin-xyz-backend'))`, then `backend.start()`. Grouped features use `createBackendFeatureLoader({ deps, *loader() { yield import(...) } })`. Each plugin's `src/index.ts` default-exports the plugin (the one sanctioned default export).
- **New frontend app:** `packages/app/src/App.tsx` calls `createApp({ features: [...] })` from `@backstage/frontend-defaults`, with plugins imported as default exports from `@backstage/plugin-xyz/alpha`. Legacy extensions are bridged with `convertLegacy*` helpers from `@backstage/core-compat-api` and `@backstage/plugin-catalog-react/alpha`.
- **Legacy app:** `packages/app-legacy/src/` uses `createApp` from `@backstage/app-defaults` with route elements.

### Package manifest shape (relevant to peer ranges)
Example from `plugins/catalog-graph/package.json`:
```json
"peerDependencies": {
  "@types/react": "^17.0.0 || ^18.0.0",
  "react": "^17.0.0 || ^18.0.0",
  "react-dom": "^17.0.0 || ^18.0.0",
  "react-router-dom": "^6.30.2"
},
"peerDependenciesMeta": { "@types/react": { "optional": true } },
"devDependencies": { "@types/react": "^18.0.0", "react": "^18.0.2", "react-dom": "^18.0.2", ... }
```
56 workspace manifests carry `"^17.0.0 || ^18.0.0"`. `packages/ui` already uses `"^18.0.0"`. The range is also enforced by `yarn lint:peer-deps` (`packages/repo-tools/src/commands/peer-deps/peer-deps.ts`). `package.json` files are kept sorted (`scripts/sort-package-json.mjs` runs from lint-staged).

### Changesets
Changesets are `.changeset/<kebab-slug>.md` files, written directly and never with the CLI:
```md
---
'@backstage/plugin-catalog-backend-module-unprocessed': patch
---

Fixed pending entities being returned without their entity ID and entity ref.
```
Messages are plain-language and adopter-facing, with no internal symbol names. For packages below 1.0.0 a breaking change is `minor`; at 1.0.0 or above it is `major`.

## Sample files inspected
- packages/backend/src/index.ts (kind: entry point / backend wiring)
- packages/app/src/index.tsx, packages/app/src/App.tsx (kind: entry point / frontend wiring)
- plugins/example-todo-list-backend/src/plugin.ts (kind: backend plugin)
- plugins/example-todo-list-backend/src/service/router.ts (kind: controller / router)
- plugins/example-todo-list-backend/src/service/router.test.ts (kind: backend test)
- plugins/devtools/src/plugin.ts (kind: frontend plugin, old system)
- plugins/devtools/src/alpha/plugin.tsx (kind: frontend plugin, new system)
- plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.tsx (kind: React component)
- plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.test.tsx (kind: frontend test, old system)
- plugins/app-react/src/blueprints/NavContentBlueprint.test.tsx (kind: frontend test, new system)
- plugins/devtools-backend/config.d.ts (kind: config schema)
- plugins/notifications-backend/src/database/DatabaseNotificationsStore.ts (kind: service / data layer)
- plugins/notifications-backend/migrations/20260621_addMetadata.js (kind: migration)
- packages/dev-utils/src/devApp/render.tsx, packages/frontend-dev-utils/src/createDevApp.tsx, plugins/techdocs/src/reader/transformers/renderReactElement.ts (kind: React DOM render shim)
- packages/cli-module-build/src/lib/bundler/config.ts, packages/cli-module-test-jest/config/jest.js (kind: build/test config defining HAS_REACT_DOM_CLIENT)
- tsconfig.json, packages/cli/config/tsconfig.json (kind: compiler config)
- plugins/catalog-graph/package.json (kind: package manifest)
- .changeset/*.md, two most recent (kind: changeset)

## Notes for downstream codegen
- Match each package's local style first (CLAUDE.md). The new and old frontend systems coexist; never move code between them as a side effect.
- Do not add `import React from 'react'` for JSX. Import hooks and types as named imports from `'react'`.
- Any new `.ts`, `.tsx` or `.js` file needs the Apache 2.0 header with the current year (2026). Existing files keep their year.
- No default exports, except the plugin default export in `src/index.ts` and `alpha` entry points that already do it.
- Exported API needs a TSDoc release tag (`@public` or `@alpha`). Changing exported signatures changes `report*.api.md`, which must be regenerated with `yarn build:api-reports`, never hand-edited.
- When dropping the React 17 branch of the render shim:
  - The `react-dom/client` path is the one to keep: `createRoot(el).render(...)`.
  - `process.env.HAS_REACT_DOM_CLIENT` is defined in two bundler define blocks and in the Jest config.
  - Those definitions are a public build contract for adopters' tooling, so changing them affects published CLI packages and needs changesets.
- Peer-range edits touch many `package.json` files:
  - Keep key order: the sort script runs on commit.
  - Keep `peerDependenciesMeta` for `@types/react`.
  - Expect `yarn lint:peer-deps` to encode the allowed range.
  - `yarn.lock` workspace entries may change.
- `packages/cli/config/tsconfig.json` is a TypeScript config file. CLAUDE.md forbids editing ESLint, Prettier or TS configs unless explicitly requested.
- `packages/create-app/templates/**` ship package.json files to new adopters. Check them for React 17 ranges as part of scope decisions.
- `docs-ui/` and `microsite/` are already on React 19 and outside the root workspaces. Leave them out of a React 18 peer-range sweep.
- Changesets: one per distinct adopter-facing message. A peer-range narrowing is a breaking change for adopters still on React 17: `minor` below 1.0.0, `major` at 1.0.0 or above, per CLAUDE.md.
