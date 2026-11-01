# Stack profile — learned from repo scan

Built 2026-11-01 for run `20261101-150500-refactor-require-react-18`, at commit `f20fd9b59828`. Trigger: no dedicated adapter for a React plus Express TypeScript monorepo.

## Language & runtime

TypeScript ~5.7 on Node 22 or 24, with Yarn 4.18.1 workspaces and `nodeLinker: node-modules`. Package manifests point `main` and `types` at `src/index.ts`, so workspace packages resolve from source. React and React DOM are 18.3.1 in `node_modules`, and the local dev range is `^18.0.2`. Frontend code uses the new JSX transform and imports named members from `react`.

## Framework

Backstage's own framework. Frontend code uses `@backstage/frontend-plugin-api` (new system) and `@backstage/core-plugin-api` (old system). Backend code uses `@backstage/backend-plugin-api` on Express. Each workspace package declares a `backstage.role` in `package.json`, such as `frontend-plugin`, `web-library`, `backend-plugin`, `backend-plugin-module`, `cli-module` or `node-library`.

## Conventions detected

### File naming
- React components and classes use PascalCase, as in `plugins/catalog-graph/src/components/CatalogGraphPage/SelectedRelationsFilter.tsx`.
- Hooks and helpers use camelCase, as in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`.
- Tests sit next to their source as `*.test.ts(x)`.
- Plugin layout: `plugins/devtools/src/` has `plugin.ts`, `routes.ts`, `components/`, `hooks/`, `api/`, `alpha/`, `alpha.ts`, `index.ts`. Backends use `plugin.ts`, `service/`, and `api/` or `util/`.
- Exports are named. ADR003 says to avoid default exports, though feature packages can default-export a plugin instance.

### Handler / controller shape
From `plugins/example-todo-list-backend/src/service/router.ts`:

```ts
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth } = options;

  const router = Router();
  router.use(express.json());

  router.post('/todos', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
```

`Router` comes from `express-promise-router`, and errors come from `@backstage/errors`.

### Service shape
From `plugins/example-todo-list-backend/src/plugin.ts`:

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
```

### Frontend component shape
From `SelectedRelationsFilter.tsx`: arrow-function components with a typed `props` argument, per-module Material UI v4 imports, `makeStyles` with a named class key, and text through `useTranslationRef`. ADR006 says to avoid `React.FC`.

```tsx
const useStyles = makeStyles(
  { formControl: { maxWidth: 300 } },
  { name: 'PluginCatalogGraphSelectedRelationsFilter' },
);

export const SelectedRelationsFilter = (props: Props) => {
  const { relations: incomingRelations, value, onChange } = props;
  const classes = useStyles();
```

### Current legacy render fork
This exact pattern appears in `plugins/techdocs/src/reader/transformers/renderReactElement.ts`, and with small differences in `packages/dev-utils/src/devApp/render.tsx` and `packages/frontend-dev-utils/src/createDevApp.tsx`:

```ts
let ReactDOMPromise: Promise<
  typeof import('react-dom') | typeof import('react-dom/client')
>;
if (process.env.HAS_REACT_DOM_CLIENT) {
  ReactDOMPromise = import('react-dom/client');
} else {
  ReactDOMPromise = import('react-dom');
}
```

The target shape is already used in `packages/app/src/index.tsx`:

```tsx
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(app);
```

### Test shape
Jest with React Testing Library. Frontend tests render with `renderInTestApp` from `@backstage/test-utils`, as in `plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.test.tsx`:

```tsx
describe('<DirectionFilter/>', () => {
  test('should display current value', async () => {
    await renderInTestApp(
      <DirectionFilter value={Direction.LEFT_RIGHT} onChange={() => {}} />,
    );

    expect(screen.getByText('Left to right')).toBeInTheDocument();
  });
```

`AGENTS.md` asks for fewer, thorough tests, `screen` with `findBy*` over `waitFor`, and no new test IDs. Older tests do not always follow this; match the package.

### Config
Runtime config uses `app-config.yaml`, declared per package in a typed `config.d.ts` (72 packages have one), as in `plugins/app-backend/config.d.ts`. Build-time flags reach frontend code through the bundler's define step, as `HAS_REACT_DOM_CLIENT` does in `packages/cli-module-build/src/lib/bundler/config.ts`.

### Data layer
Knex, with JavaScript migrations in each plugin's `migrations/` folder. From `plugins/user-settings-backend/src/database/DatabaseUserSettingsStore.ts`:

```ts
const client = await database.getClient();

if (!database.migrations?.skip) {
  await client.migrate.latest({
    directory: migrationsDir,
  });
}
```

### Framework-owned wiring
Backend features register in `packages/backend/src/index.ts`:

```ts
backend.add(import('@backstage/plugin-auth-backend'));
```

Frontend pages register as extensions on the plugin, from `plugins/app-visualizer/src/plugin.tsx`:

```tsx
const appVisualizerPage = PageBlueprint.make({
  params: {
    path: '/visualizer',
    routeRef: rootRouteRef,
    title: 'Visualizer',
    icon: <RiEyeLine />,
  },
});
```

## Sample files inspected
- plugins/example-todo-list-backend/src/service/router.ts (kind: controller)
- plugins/example-todo-list-backend/src/plugin.ts (kind: service)
- plugins/user-settings-backend/src/database/DatabaseUserSettingsStore.ts (kind: data layer)
- plugins/user-settings-backend/migrations/20220824183000_init.js (kind: migration)
- plugins/app-visualizer/src/plugin.tsx (kind: frontend wiring)
- plugins/app-react/src/blueprints/SignInPageBlueprint.tsx (kind: extension blueprint)
- plugins/catalog-graph/src/components/CatalogGraphPage/SelectedRelationsFilter.tsx (kind: component)
- plugins/catalog-graph/src/components/CatalogGraphPage/DirectionFilter.test.tsx (kind: test)
- plugins/auth-backend/src/providers/router.test.ts (kind: test)
- packages/test-utils/src/testUtils/testingLibrary.ts (kind: test utility)
- packages/frontend-plugin-api/src/routing/useRouteRef.tsx (kind: hook)
- plugins/techdocs/src/reader/transformers/renderReactElement.ts (kind: render path)
- plugins/app-backend/config.d.ts (kind: config)
- packages/backend/src/index.ts (kind: entry point)

File recency was not used to pick samples, because worktree mtimes all match the checkout date.

## Notes for downstream codegen
- New `.ts`, `.tsx`, `.js` and `.jsx` files need an Apache 2.0 header with the current year. Never change the year on existing files.
- Match the style of each package. Consistency within a package outranks consistency across the repo.
- Import `useSyncExternalStore` from `react` once the shim is gone, and then drop `use-sync-external-store` and its `@types` package from that manifest if nothing else uses it.
- `package.json` keys are sorted by `scripts/sort-package-json.mjs`, and lint-staged rewrites them on commit.
- Keep `@types/react` optional where `peerDependenciesMeta` already marks it so.
- Regenerate API reports with `yarn build:api-reports` rather than editing them by hand.
- Write changesets by hand in `.changeset/`, in plain language for adopters and without internal symbol names.
