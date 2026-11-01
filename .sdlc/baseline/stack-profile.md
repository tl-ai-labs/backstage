# Stack profile — learned from repo scan

## Language & runtime

The code is TypeScript (~5.7) with React 18 JSX. It uses ESM-style `import` and runs on Node 22/24 under Yarn 4 workspaces. Packages export source directly (`"main": "src/index.ts"`), so other packages consume source without a build step. Tests run on Jest 30 through `backstage-cli package test`, with `@testing-library/react` and jsdom.

## Framework

This is Backstage's new frontend system. An app is a tree of **extensions**. Each extension declares an `attachTo: { id, input }`, typed `inputs` (`createExtensionInput`), `output` data refs (`coreExtensionData.*`), and a `factory`. **Blueprints** (`createExtensionBlueprint`) are reusable extension kinds. Route refs (`createRouteRef`) are opaque objects that the app binds to paths by walking the extension tree.

## Conventions detected

### File naming

- Use PascalCase for files that export a class, component, or blueprint: `AppRootElementBlueprint.tsx`, `RouteResolver.ts`, `RouteRef.ts`.
- Use camelCase for files that export a function: `extractRouteInfoFromAppNode.ts`, `collectRouteIds.ts`, `resolveRouteBindings.ts`, `joinPaths.ts`.
- Tests live next to the code as `<name>.test.ts(x)`. Folders such as `routing/`, `wiring/`, `blueprints/`, and `tree/` each have an `index.ts` barrel.

### Header (mandatory)

Every source file starts with an Apache-2.0 block: `/*\n * Copyright <YEAR> The Backstage Authors\n * ... */`. New files use 2026. Never change the year on existing files.

### Extension / blueprint shape

From `packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx`:

```tsx
export const AppRootElementBlueprint = createExtensionBlueprint({
  kind: 'app-root-element',
  attachTo: { id: 'app/root', input: 'elements' },
  output: [coreExtensionData.reactElement],
  *factory(params: { element: JSX.Element }, { node }) {
    yield coreExtensionData.reactElement(
      <ExtensionBoundary node={node} errorPresentation="error-api">
        {params.element}
      </ExtensionBoundary>,
    );
  },
});
```

From `packages/frontend-app-api/src/extensions/Root.ts`:

```ts
export const Root = createExtension({
  attachTo: { id: 'ignored', input: 'ignored' },
  inputs: {
    app: createExtensionInput([coreExtensionData.reactElement], {
      singleton: true,
    }),
    apis: createExtensionInput([ApiBlueprint.dataRefs.factory], {
      replaces: [{ id: 'app', input: 'apis' }],
    }),
  },
  output: [coreExtensionData.reactElement],
  factory: ({ inputs }) => inputs.app,
});
```

### Route ref shape

`packages/frontend-plugin-api/src/routing/RouteRef.ts`: the public interface is a minimal marker (`$$type: '@backstage/RouteRef'`, `T`). The implementation is built through `OpaqueRouteRef.createInstance('v1', {...})` from `@internal/frontend` (`packages/frontend-internal`). It has `getParams`, `getDescription`, `alias`, `setId`, and `toString`. `setId` throws when the same ref gets two different ids.

### Routing internals (frontend-app-api)

`extractRouteInfoFromAppNode(node, routeAliasResolver)` does a recursive `visit` over `node.edges.attachments`. It reads `coreExtensionData.routePath` and `coreExtensionData.routeRef` from `node.instance` and builds `routePaths`, `routeParents`, `routeObjects` (each object gets a `MATCH_ALL_ROUTE` child), and alias mappings. Long explanatory `//` comments sit above each step. Keep that style.

### App root wiring

- `plugins/app/src/extensions/AppRoot.tsx` (`name: 'root'`, attaches to `app` input `root`) defines the `app/root` inputs `children` (singleton, optional), `elements` (multiple reactElements), `router`, `signInPage`, and `wrappers`.
- `packages/frontend-app-api/src/wiring/treeLifecycle.tsx` special-cases `node.spec.id === 'app/root'`:
  - `elements` keeps its bootstrap instances during finalization.
  - `children` is the session boundary (`isSessionBoundaryAttachment`).

### Test shape

`describe`/`it` (Jest). Blueprint tests use `X.make({ params })`, `toMatchInlineSnapshot` for the definition, then `createExtensionTester(ext)` and `renderInTestApp(tester.reactElement(), { apis: [[errorApiRef, mockApi]] })` from `@backstage/frontend-test-utils`. Errors are captured with `withLogCollector(['error'], ...)`. Routing unit tests build refs at module scope (`const ref1 = createRouteRef(); const subRef1 = createSubRouteRef({ parent: ref1, path: '/foo' })`) and assert on the resolver output. Repo guidance: prefer fewer thorough tests and `screen` with `findBy*` over `waitFor`. Don't add test IDs.

### Config

App config comes through `@backstage/config` and per-package `config.d.ts` (`packages/frontend-app-api/config.d.ts`). There is no env-driven config in the focus packages beyond `NODE_ENV`/`APP_CONFIG`.

### Data layer

None in the focus packages; they are pure frontend runtime.

### Framework-owned wiring

- Extensions register by being passed to `createFrontendPlugin({ extensions: [...] })` / `createFrontendModule`, or to `createApp({ features })` in `packages/frontend-defaults/src/createApp.tsx`.
- `createSpecializedApp` / `prepareSpecializedApp` in frontend-app-api resolve the tree, instantiate nodes, and extract route info.

## Sample files inspected

- packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx (blueprint)
- packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.test.tsx (test)
- packages/frontend-plugin-api/src/routing/RouteRef.ts (domain)
- packages/frontend-app-api/src/extensions/Root.ts (extension)
- packages/frontend-app-api/src/routing/extractRouteInfoFromAppNode.ts (service/internal)
- packages/frontend-app-api/src/routing/RouteResolver.test.ts (test)
- packages/frontend-app-api/src/wiring/treeLifecycle.tsx (wiring, lines 175-245)
- plugins/app/src/extensions/AppRoot.tsx (extension, app/root definition)

## Notes for downstream codegen

- Match each package's style. Keep the Apache header and don't touch existing years.
- Public API changes in these packages change `report.api.md`. Regenerate it with `yarn build:api-reports` rather than hand-editing.
- A bugfix in a public package below 1.0 needs a `patch` changeset in `.changeset/`. Write it for adopters, without code symbol names unless they are public API.
- Mark internal exports with `/** @internal */` and public ones with `@public` TSDoc.
- Validate with `CI=1 yarn test packages/frontend-app-api packages/frontend-plugin-api packages/frontend-defaults` (green at HEAD: 464 tests), plus `yarn tsc` from the root.
