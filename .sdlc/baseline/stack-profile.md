# Stack profile — learned from repo scan

Built during run `20261101-141015-refactor-drop-react-17` at commit `cb8b07905b`. Files were chosen as small, representative examples of each kind. File modification times from a fresh checkout say little about recency, so this is not a most-recent-first sample.

## Language & runtime

TypeScript ~5.7 in strict mode, target ES2022, module ES2020 with `bundler` resolution, from `packages/cli/config/tsconfig.json`. The root `tsconfig.json` sets `jsx: react-jsx`, so JSX files do not import `React`. Node 22 or 24, Yarn 4.18.1 with `node-modules` linker. ESM syntax in TypeScript source; Knex migrations are CommonJS JavaScript. Every new source file starts with the Apache 2.0 header, using the current year.

## Framework

Backstage's own framework, on React 18 (Material UI v4 plus `@backstage/ui` for the frontend) and Express with Knex for the backend. There are two frontend systems side by side: `core-*` packages are the old one, `frontend-*` packages the new one. New-system plugin definitions live in `src/alpha.tsx` or `src/alpha/plugin.tsx`.

## Conventions detected

### File naming

- React components use a PascalCase folder and file with a sibling test: `plugins/catalog-graph/src/components/CatalogGraphPage/MaxDepthFilter.tsx`, `MaxDepthFilter.test.tsx`.
- Backend classes use one PascalCase class per file with a role suffix, and `Default*` or `Authorized*` prefixes for implementations and decorators: `plugins/catalog-backend/src/service/AuthorizedRefreshService.ts`.
- Backend wiring sits at fixed paths: `src/plugin.ts`, `src/service/router.ts`.
- Migrations are `migrations/<timestamp>_<name>.js`: `plugins/user-settings-backend/migrations/20220824183000_init.js`.
- API reports are `report*.api.md` in most packages and are generated.

### Handler / controller shape

Backend plugins declare service dependencies and mount an Express router from `plugins/signals-backend/src/plugin.ts`:

```ts
export const signalsPlugin = createBackendPlugin({
  pluginId: 'signals',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        httpRouter.use(await createRouter({ logger, config }));
      },
    });
  },
});
```

The snippet is shortened to three of the file's dependencies. Routers use `express-promise-router` and take a typed `RouterOptions` interface (`plugins/signals-backend/src/service/router.ts`).

### Service shape

From `plugins/catalog-backend/src/service/AuthorizedRefreshService.ts`:

```ts
export class AuthorizedRefreshService implements RefreshService {
  private readonly service: RefreshService;
  private readonly permissionApi: PermissionsService;

  constructor(service: RefreshService, permissionApi: PermissionsService) {
    this.service = service;
    this.permissionApi = permissionApi;
  }
```

Dependencies arrive through the constructor. Errors come from `@backstage/errors`, for example `NotAllowedError`.

### Frontend component and plugin shape

Components are named exports of arrow functions with a `Props` type; `React.FC` is avoided (ADR006). New-system extensions use blueprints with `zod/v4` config and lazy loaders, from `plugins/catalog-graph/src/alpha.tsx`:

```tsx
const CatalogGraphEntityCard = EntityCardBlueprint.makeWithOverrides({
  name: 'relations',
  configSchema: {
    kinds: z.array(z.string()).optional(),
  },
  factory(originalFactory, { config }) {
    return originalFactory({
      loader: async () =>
        import('./components/CatalogGraphCard').then(m => (
          <m.CatalogGraphCard {...config} />
        )),
    });
  },
});
```

The `configSchema` is shortened to one field here.

### Test shape

Jest with `describe` and `test`, next to the source. Frontend tests use `renderInTestApp`, `screen` and `user-event`, from `plugins/catalog-graph/src/components/CatalogGraphPage/MaxDepthFilter.test.tsx`:

```tsx
describe('<MaxDepthFilter/>', () => {
  test('should display current value', async () => {
    await renderInTestApp(<MaxDepthFilter value={5} onChange={() => {}} />);

    expect(screen.getByLabelText('maxp')).toBeInTheDocument();
    expect(screen.getByLabelText('maxp')).toHaveValue(5);
  });
});
```

The repo prefers fewer thorough tests with several assertions, `.findBy*` over `waitFor`, and no added test IDs.

### Config

Backend config comes from `coreServices.rootConfig` and methods such as `getOptionalString`. Public config shapes are declared in per-package `config.d.ts` files (83 tracked). Frontend extension config is declared inline as a `configSchema` with `zod/v4`.

### Data layer

Knex, in 17 packages. Migrations are hand-written CommonJS with `// @ts-check`, from `plugins/user-settings-backend/migrations/20220824183000_init.js`:

```js
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('user_settings', table => {
    table.comment('The table of user related settings');
```

Changes to catalog database queries, indexes or schema also fall under `plugins/catalog-backend/CLAUDE.md`, which requires the query performance battery.

### Framework-owned wiring

Backend features are added to the backend instance, from `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
backend.add(import('@backstage/plugin-auth-backend'));
```

The frontend root renders through `react-dom/client`, from `packages/app/src/index.tsx`:

```tsx
import ReactDOM from 'react-dom/client';
import app from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(app);
```

Dev tools and TechDocs keep a dual path for React 17, from `plugins/techdocs/src/reader/transformers/renderReactElement.ts`:

```ts
if (process.env.HAS_REACT_DOM_CLIENT) {
  ReactDOMPromise = import('react-dom/client');
} else {
  ReactDOMPromise = import('react-dom');
}
```

## Sample files inspected

- `plugins/signals-backend/src/plugin.ts` (kind: backend plugin)
- `plugins/signals-backend/src/service/router.ts` (kind: handler)
- `plugins/catalog-backend/src/service/AuthorizedRefreshService.ts` (kind: service)
- `plugins/catalog-graph/src/alpha.tsx` (kind: frontend plugin)
- `packages/frontend-dev-utils/src/createDevApp.tsx` (kind: entry point)
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts` (kind: frontend utility)
- `packages/test-utils/src/testUtils/testingLibrary.ts` (kind: test utility)
- `plugins/catalog-graph/src/components/CatalogGraphPage/MaxDepthFilter.test.tsx` (kind: test)
- `plugins/user-settings-backend/migrations/20220824183000_init.js` (kind: migration)
- `packages/backend/src/index.ts` (kind: entry point)
- `packages/app/src/index.tsx` (kind: entry point)
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (kind: tooling)

## Notes for downstream codegen

- Match the style of the individual package over the rest of the repo; `AGENTS.md` makes this explicit.
- Do not add `import React`. Do not use `React.FC` or add default exports, except the plugin default exports the repo already uses.
- Leave copyright years on existing files unchanged.
- Generated files stay untouched: `**/generated/**` and `report*.api.md`. Regenerate API reports with `yarn build:api-reports`.
- `package.json` key order is enforced by a script run from lint-staged, so keep existing ordering.
- Published-package changes need a changeset written for adopters, with no internal symbol names.
