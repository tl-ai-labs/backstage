# Discovery — 20261031-162121-bugfix-approot-routeref

Mode: first-time. Built 2026-10-31T10:53:04Z. Plugin mmo 0.9.3. Intent: bugfix (new frontend system: route refs / app root elements).

## Git state

- HEAD `554df45cad9a64df66eccabe9deea1fb8377c47f` on branch `BS-BF-08/opus55-plus-flash38` (not master).
- Working tree: clean.
- Remote: `origin` -> `git@github.com:tl-ai-labs/backstage.git` (a fork, not upstream backstage/backstage).
- `.gitignore` does NOT contain `.sdlc`, but `.git/info/exclude` has `.sdlc/`, so run artifacts are already invisible to `git add -A` on this clone.

## Topology

Top-level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types`, `docs`, `docs-ui`, `microsite`, `packages` (74), `plugins` (160), `scripts`, `workspaces`. About 12.3k tracked files, so the full scan was used (no sampling needed).

Run focus:

- `packages/frontend-plugin-api` (@backstage/frontend-plugin-api 0.18.2-next.0, public): `src/blueprints/AppRootElementBlueprint.tsx` (attaches to `app/root` input `elements`), `src/routing/RouteRef.ts`, `SubRouteRef.ts`, `ExternalRouteRef.ts`, `useRouteRef.tsx`, `useRouteRefParams.ts`.
- `packages/frontend-app-api` (@backstage/frontend-app-api 0.16.9-next.0, public): `src/routing/*` (extractRouteInfoFromAppNode, RouteResolver, collectRouteIds, resolveRouteBindings, RouteAliasResolver, RouteTracker), `src/extensions/Root.ts`, `src/wiring/treeLifecycle.tsx` (special-cases `app/root` `elements` / `children`), `src/wiring/prepareSpecializedApp.tsx`.
- `packages/frontend-defaults` (@backstage/frontend-defaults 0.5.7-next.0, public): `src/createApp.tsx`.
- Related, outside the three: `plugins/app/src/extensions/AppRoot.tsx` defines the `app/root` extension itself (inputs `children`, `elements`, `router`, `signInPage`, `wrappers`); it imports `RouteTracker` and `getBasePath` from frontend-app-api source through relative monorepo paths.

## Detected stacks

- `package.json` (root, Yarn 4.18.0 workspaces `packages/*`, `plugins/*`): node-typescript (TS ~5.7), React 18, Backstage new and legacy frontend systems, backend system, Jest 30 via `backstage-cli repo test`.
- `docs-ui/package.json` and `microsite/package.json`: separate subprojects outside the workspaces.
- Node v22.23.3 local; `node_modules` installed.

## Test / build commands

- Proposed: `CI=1 yarn test <path>` (source: `package.json#scripts.test` plus the Development Flow section of AGENTS.md). Always pass a path.
- For this run: `CI=1 yarn test packages/frontend-app-api packages/frontend-plugin-api packages/frontend-defaults`.
- Observed baseline at HEAD: 53/53 suites, 464/464 tests, 50 snapshots passing, about 11 s.
- Typecheck `yarn tsc` (root only, no options). Lint `yarn lint --fix`. Format `yarn prettier --write <files>`. API reports `yarn build:api-reports`.
- Never run `yarn build`, `yarn changesets version`, or `yarn release`.

## Docs

README.md (plus 4 translations), AGENTS.md (with `.claude/CLAUDE.md` symlinked to it), CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (17 ADRs), `docs/frontend-system/`, `beps/`, and READMEs for each focus package.

## Detected AI/agent setup

- `.claude/` with `CLAUDE.md` (symlink to `../AGENTS.md`), `settings.local.json` (tracked; sets `CLAUDE_CODE_SUBAGENT_MODEL`), and `skills/`
- `AGENTS.md`
- `.cursor/rules/` (`backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`)
- `.github/copilot-instructions.md`
- Not found: `.mcp.json`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs.

## Env keys

- No `.env*` files at the repo root.
- Referenced in focus packages: `APP_CONFIG`, `NODE_ENV`.
- The repo-wide list of names referenced in code (about 130) is in baseline.json. Only names were recorded, never values.

## Monorepo / submodules / LFS

- Yarn workspaces, 233 packages (listed in baseline.json). Per-package tests: `CI=1 yarn test <package-root>`.
- Submodules: none. Git LFS: none (no `.gitattributes`).

## Infra hints

- `.github/workflows/` (49 files), `docker-compose.deps.yml`, Dockerfiles (`packages/backend`, `.devcontainer`, `contrib/docker/*`), devcontainer.
- No terraform, GitLab CI, CircleCI, or Jenkins.

## Regulated-repo signals

- `SECURITY.md` at the repo root. This is the standard OSS vulnerability-disclosure policy, not a compliance marker.
- No HIPAA/PCI/SOC2/compliance directories. CODEOWNERS does not mention security, compliance, privacy, or legal teams.
- `regulated_repo_warning_required: true` (set by rule; low real risk).

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Claude Code project config (`.claude/`, AGENTS.md) and Copilot instructions are present and stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. On this clone `.git/info/exclude` already hides `.sdlc/` from `git add -A`, so there is no immediate leak. Gate 0 may still offer to add the entry to `.gitignore`. For this study the recommendation is to leave `.gitignore` alone.
- The Husky pre-commit hook (lint-staged) runs `eslint --fix` and `prettier` on staged files and regenerates `catalog-info.yaml` when `package.json` changes.
- Repo rules from AGENTS.md:
  - New source files need an Apache-2.0 header with the current year (2026). Don't change the year on existing files.
  - Public package changes need a changeset in `.changeset/` (edit the files directly; never use the changeset CLI). All three focus packages are public and below 1.0, so a bugfix takes a `patch` bump.
  - Public API changes require regenerating the `report.api.md` files.
  - Don't touch ESLint, Prettier, or TS configs, or `docs/releases/`.

## Proposed off-limits

`.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.env`, `.env.*`, `.env.local`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `**/report.api.md`, `**/report-*.api.md` (generated; regenerate via `yarn build:api-reports`, never hand-edit), `**/knip-report.md`, `**/catalog-info.yaml`, `docs/releases/**`, `.eslintrc.js`, `**/.eslintrc.js`, `tsconfig.json`, `.prettierignore`, `**/__fixtures__/**`, `.git/**`.

## Stack profile

Tier 2b triggered: the stack is TypeScript/React and has no matching adapter. The profile is at `.sdlc/baseline/stack-profile.md`.
