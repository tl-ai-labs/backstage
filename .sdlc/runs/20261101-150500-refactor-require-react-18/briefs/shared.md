## Conventions

- Match each file's own style and change only the lines its sites name. Never change a copyright year. This change adds no new .ts, .tsx, .js or .jsx file.
- Prettier formats every TS, JS, JSON and Markdown file: 80 columns, 2 spaces, semicolons, single quotes in code, trailing commas, arrow parens avoided.
- Import React members in the file's existing `from 'react'` import, alphabetically, as packages/ui/src/components/Slider/Slider.tsx does. Add no second import from 'react'.
- Tests use Jest and React Testing Library. A test changes only where it asserted the React 17 path, and no ID test is added (Gate 1).
- Docs and changesets are written for adopters in plain language. They name no internal function, class or variable. Public API names such as `LegacyRootOption` are allowed. Docs follow docs/contribute/doc-style-guide.md.
- A changeset is written by hand: YAML front matter with one `'<package>': <bump>` line per package, a blank line, then the message. A `@backstage/ui` changeset ends with an `**Affected components:**` line.
- `yarn.lock`, `report*.api.md` and `knip-report.md` are written by their tools and never typed. Manifest key order stays as it is.
- Never run `yarn build`, `yarn changesets version`, `yarn release` or the changeset CLI, and never edit `.changeset/pre.json`, `tsconfig.json` or lint config.

## Decisions

- FR-10: where the startFrontend.ts warning goes: The warning and its import are deleted from startFrontend.ts and replaced by the version check in server.ts, which serveBundle always runs. The check warns for every major below 18, names React 18 as the minimum and links the migration guide. It resolves `react/package.json` from `options.targetDir ?? targetPaths.dir`. (not Move the warning text into startFrontend.ts behind a new version check: two checks would print for one problem; not Keep resolving from targetPaths.rootDir: a React below 18 installed only in the served package would get no diagnostic, which the deleted check caught) — One diagnostic, on the one path every frontend start takes, that sees the React the served package resolves. React 18 users get no output.
- Keep the render paths asynchronous: Each render path keeps a module-level `const ReactDOMPromise = import('react-dom/client');` and its `.then(...)` call. Only the condition, the union type and the `ReactDOM.render` branch go. (not A static `import { createRoot } from 'react-dom/client'`: rendering would become synchronous, which FR-7 forbids, and it would pull react-dom/client out of its lazy chunk) — FR-7 keeps each function's sync or async behaviour.
- The bare `import 'react-dom'` lines: Line 53 of packages/dev-utils/src/devApp/render.tsx and line 24 of packages/frontend-dev-utils/src/createDevApp.tsx stay. (not Remove them: they render nothing, FR-7 does not name them, and removing them would add a change the requirements do not ask for) — A refactor changes only what its requirements name.
- FR-11: the runtime path of legacyRoot: `renderWithEffects` calls `render(nodes, { wrapper: options?.wrapper })` instead of passing `options` on, so a JavaScript or `as any` caller's `legacyRoot` no longer reaches `render`. `renderInTestApp` passes only `wrapper`. (not Change only the types and leave `render(nodes, options)`: the option would still work at runtime) — FR-11 names the runtime path. `wrapper` is the only option the type allows and in-repo callers pass nothing else, and RTL treats a missing `wrapper` the same as `{ wrapper: undefined }`.
- How the 56 manifests change: One tooling unit runs `yarn lint:peer-deps --fix` after peer-deps.ts changes, instead of 56 typed units. packages/repo-tools/bin runs from src in this repo, so the tool uses the new ranges. (not One typed unit per manifest: 56 premium-model edits for one mechanical change; not A sed-style step: it bypasses the check that FR-2 makes the source of truth) — Checked read-only against every manifest at this HEAD: the tool writes 57 packages (the 56 plus @backstage/ui), none of the 56 has a standalone role it skips, each file round-trips byte-identical through its writer, and no branch other than the range branch fires, so peerDependenciesMeta stays as it is.
- Order of the typed manifest edits: The five typed manifest edits run before the peer-deps tool, which runs before `yarn install`. (not Tool first: the typed edits' sites were checked against the manifests as they are now) — The tool rewrites four of those five files, so the typed sites must land first. Each dependency is removed only after the import that used it is gone.
- Deleting hasReactDomClient.ts: A tooling unit runs `rm` on the file after config.ts and startFrontend.ts stop importing it. `rm`, not `git rm`, so the index stays untouched. (not A typed edit that empties the file: FR-9 deletes it) — A typed unit can only create or edit a file.
- useId swap in packages/ui: Plain import swap in Popover, Tooltip, Table and TablePagination, with no other change. react-aria stays a dependency. (not Add a prefix to keep the old format: nothing reads the format) — All four call `useId()` with no argument and use the value only in `id`, `aria-describedby` and `<use href>`, never in a selector. No test or stylesheet reads it. VisuallyHidden and Text take the value through plain props with no mergeProps, so react-aria's id-merge registry is not involved. Under React 18 react-aria's ID is React's ID with a `react-aria-` prefix, so the colons in `<use href>` are not new. Slider already uses React's useId, and react-aria stays used by Combobox, Header, Link, SearchAutocomplete and Select. React 18's client IDs come from one counter per react-dom copy, so IDs stay unique across roots.
- Changeset bumps: `major` for the 17 public packages at or above 1.0.0. `minor` for the 37 public packages below 1.0.0, and for @backstage/repo-tools, @backstage/cli-module-build and @backstage/cli-module-test-jest, which change behaviour their users rely on. `patch` for @backstage/ui, whose peer range is already ^18.0.0, and for @backstage/cli-module-new, whose templates affect only newly created packages. (not `minor` for every package: Gate 1 kept `major` for the 17; not `minor` for @backstage/ui: generated IDs are not API) — The repo rule and FR-16. No existing changeset covers this change. The two private manifests get no changeset.
- Report regeneration: Run the full `yarn build:api-reports` and `yarn build:knip-reports` after `yarn install`, not per-package runs. (not Per-package runs: they do not prove the reports are current) — FR-17 and AC-9. Expected changes: packages/test-utils/report.api.md, and six knip reports where a removed entry or a shifted line number shows. Any other report change is reported to the person, not kept silently.

## Files of this change

- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (U01, edit)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (U02, edit)
- `packages/ui/src/hooks/useBreakpoint.ts` (U03, edit)
- `packages/ui/src/components/Popover/Popover.tsx` (U04, edit)
- `packages/ui/src/components/Tooltip/Tooltip.tsx` (U05, edit)
- `packages/ui/src/components/Table/components/Table.tsx` (U06, edit)
- `packages/ui/src/components/TablePagination/TablePagination.tsx` (U07, edit)
- `packages/dev-utils/src/devApp/render.tsx` (U08, edit)
- `packages/frontend-dev-utils/src/createDevApp.tsx` (U09, edit)
- `packages/frontend-dev-utils/src/createDevApp.test.tsx` (U10, edit)
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts` (U11, edit)
- `packages/cli-module-build/src/lib/bundler/config.ts` (U12, edit)
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` (U13, edit)
- `packages/cli-module-build/src/lib/bundler/server.ts` (U14, edit)
- `packages/cli-module-test-jest/config/jest.js` (U16, edit)
- `packages/test-utils/src/testUtils/testingLibrary.ts` (U17, edit)
  - `function renderWithEffects(nodes: ReactElement, options: Pick<RenderOptions, 'wrapper'> | undefined): Promise<RenderResult>`
- `packages/test-utils/src/testUtils/appWrappers.tsx` (U18, edit)
  - `function renderInTestApp(Component: ComponentType<PropsWithChildren<{}>> | ReactNode, options: TestAppOptions): Promise<RenderResult>`
- `packages/frontend-plugin-api/package.json` (U19, edit)
- `packages/ui/package.json` (U20, edit)
- `plugins/app/package.json` (U21, edit)
- `packages/core-app-api/package.json` (U22, edit)
- `plugins/catalog-react/package.json` (U23, edit)
- `packages/cli-module-new/templates/frontend-plugin/package.json.hbs` (U26, edit)
- `packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs` (U27, edit)
- `packages/cli-module-new/templates/plugin-web-library/package.json.hbs` (U28, edit)
- `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs` (U29, edit)
- `docs/tutorials/react18-migration.md` (U30, edit)
- `docs/tutorials/migrate-to-mui5.md` (U31, edit)
- `docs/tutorials/jsx-transform-migration.md` (U32, edit)
- `.gitignore` (U33, edit)
- `.changeset/require-react-18-major.md` (U34, create)
- `.changeset/require-react-18-minor.md` (U35, create)
- `.changeset/test-utils-remove-legacy-root.md` (U36, create)
- `.changeset/cli-module-build-require-react-18.md` (U37, create)
- `.changeset/cli-module-test-jest-require-react-18.md` (U38, create)
- `.changeset/cli-module-new-react-18-templates.md` (U39, create)
- `.changeset/repo-tools-peer-deps-react-18.md` (U40, create)
- `.changeset/ui-native-react-hooks.md` (U41, create)
