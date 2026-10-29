# SDLC state — this project

Maintained by the MMO plugin. See [`ledger.md`](./ledger.md) for the run history
(machine mirror: [`ledger.json`](./ledger.json)).

## Project fingerprint

- Stack: `node-typescript` — TypeScript ~5.7, Node 22||24, Yarn 4.18.1
- Monorepo: Yarn workspaces, globs `packages/*` + `plugins/*`, 235 packages
- Three independent nested workspaces outside the root globs: `microsite/`, `docs-ui/`, `workspaces/ui/`
- React: **18 required** as of run `20261029-refactor-react18` (React 17 support removed)
- Default policy: `flash-agsdk-only-v38`
- Baseline: `.sdlc/baseline/current.json` at `f20fd9b598285c88401406b3812fe00d7708136c`
- Stack profile: `.sdlc/baseline/stack-profile.md` (Tier 2b; no pre-authored adapter matches this repo)

## Verification commands

```
yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test <paths>
```

CI runs the stricter `yarn tsc:full` (`--skipLibCheck false --incremental false`), so a green
`yarn tsc` is necessary but not sufficient. Scope test runs to changed paths — an unscoped
`yarn test` spans all 235 packages, and `AGENTS.md` asks for a path.

## Conventions that bite

- The React peer ranges in all 56 affected manifests are **generated** from constants in
  `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`; propagate with
  `backstage-repo-tools peer-deps --fix`, never hand-edit. CI enforces agreement.
- `report.api.md` and `knip-report.md` are generated and `.prettierignore`d. Regenerate via
  `yarn build:api-reports` (with `LANG=en_US.UTF-8`) and `yarn build:knip-reports`.
- Copyright headers are eslint-enforced (`notice/notice`, `onNonMatchingHeader: 'replace'`).
  Do not update years on existing files.
- `import React from 'react'` is a lint error — default and namespace imports are banned.
- Test idioms are deliberately package-local; match the file being edited.
- husky + lint-staged rewrite staged files on commit (`eslint --fix`, `prettier --write`,
  `sort-package-json.mjs`, `generate-catalog-info`).

## Open follow-ups

Carried from `20261029-refactor-react18`, all left unrouted by write-contract design:

1. `docs/tutorials/react18-migration.md:13` still claims v17–v18 compatibility — now
   contradicted. Belongs with the deferred PR covering `jsx-transform-migration.md` and the four
   React Aria `useId` call sites in `packages/ui/src/components/`.
2. `packages/cli-module-build/knip-report.md:15` — stale row for the deleted
   `hasReactDomClient.ts`.
3. `plugins/app/knip-report.md:8` — stale `use-sync-external-store` row.
