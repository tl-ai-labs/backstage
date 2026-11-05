# Discovery — 20261104-170616-bugfix-routeref-startup

Mode: first-time (full Tier 1 scan + Tier 2b stack profile). Intent: bugfix. Built 2026-11-04.
Repo: Backstage TypeScript monorepo (Yarn 4 workspaces), git worktree at `/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08`.

## Git state
- HEAD `2e8b88268c8ad911d46ee3ad404162eddcc36c8c` on branch `BS-BF-08/argon4-plus-flash38`. The working tree is clean.
- Remote: `origin` -> `git@github.com:tl-ai-labs/backstage.git`.
- This is a worktree of `/Users/macbook/Documents/GitHub/backstage`, with 12,302 tracked files.
- `.gitignore` does **not** list `.sdlc/`, but the parent repo's `.git/info/exclude` (line 7: `.sdlc/`) does, so `.sdlc/` is already ignored here (`git check-ignore` confirms). `gitignore_covers_sdlc: false` is recorded literally.

## Topology
Top-level dirs: `.changeset .claude .cursor .devcontainer .github .husky .lighthouseci .patches .storybook .yarn beps contrib docs docs-ui microsite packages plugins scripts workspaces`.
- `packages/*`: 74 core framework packages. `core-*` belong to the legacy frontend, `frontend-*` to the new frontend, `backend-*` to the backend system.
- `plugins/*`: 159 plugin packages.
- `workspaces/ui`, `microsite/` and `docs-ui/` are separate projects outside the root workspace globs.
- Entry points: `packages/app/src/index.tsx` / `App.tsx` (new frontend system example app), `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.

## Detected stacks
| Manifest | Stack | Frameworks |
|---|---|---|
| `package.json` | node-typescript (Yarn 4.18, Node 22/24) | React 18, react-router-dom 6, Backstage frontend + backend systems, Express, Jest, Storybook, Playwright |

There are no non-JS manifests. Monorepo type: **yarn-workspaces** (`packages/*`, `plugins/*`), with 233 packages listed in `baseline.json`.

## Test command
- Proposed: `CI=1 yarn test <path>`. Root `scripts.test` is `backstage-cli repo test` (Jest), and `.claude/CLAUDE.md` / `AGENTS.md` say to always pass a path and never run the full suite.
- Relevant paths for this bug: `packages/frontend-app-api/src/wiring`, `packages/frontend-app-api/src/routing`, `packages/frontend-plugin-api/src/routing`, `plugins/app/src`.
- Gate 0 should confirm this. `.sdlc/pre-check-status.json` still records `test_command_probe: skip (unknown)`.
- Type check is `yarn tsc` at the repo root with no options. Never run `yarn build`.

## Docs present
README.md (plus 4 translations), AGENTS.md (`.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to it), CONTRIBUTING.md, STYLE.md, REVIEWING.md (changesets), SECURITY.md, `docs/architecture-decisions/` (ADRs 000–015), `docs/frontend-system/architecture/` (including `36-routes.md` and `10-app.md`), `docs/contribute/doc-style-guide.md`, and `beps/`.

## Detected AI/agent setup
- `.claude/`: `CLAUDE.md` (symlink -> `../AGENTS.md`), `settings.local.json` (has an `env` block; values not read), and `skills/` (`backstage-release-notes/`, `catalog-db-performance.md`).
- `.cursor/rules/`: `backstage-project.mdc` (symlink -> `../../AGENTS.md`), `tests/backend-test-utils.mdc`, `tests/test-utils.mdc`.
- `AGENTS.md`: the project's agent instructions.
- Not found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `.github/copilot-instructions.md`, a repo-local `routing-policy.yaml`, and `gemini*.{yaml,json}`.

## Env keys
- No `.env*` files exist at the repo root, so `env_keys_by_file` is empty.
- Code references 131 distinct env var names (names only), e.g. `NODE_ENV`, `CI`, `BACKSTAGE_ENV`, `APP_CONFIG`, `POSTGRES_*`, `AWS_*`, `AZURE_*`, `GITHUB_TOKEN` and many `YARN_*` (from the vendored yarn release). The full list is in `baseline.json`. None are relevant to this frontend bug.

## Source topology, submodules, LFS, infra
- Submodules: none. Git LFS: none (no `.gitattributes`).
- Generated code: 11 `src/**/openapi/generated` / `src/generated` dirs under backend packages (listed in off-limits).
- Infra: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `contrib/docker/*`, `docker-compose.deps.yml`, `contrib/terraform/techdocs-s3-storage`, and 49 GitHub workflows. No GitLab CI, CircleCI or Jenkins.

## Regulated-repo signals
- `SECURITY.md` (repo root). This is the standard OSS vulnerability-disclosure policy. There are no HIPAA/PCI/SOC2/compliance dirs, and `.github/CODEOWNERS` has no security/compliance/privacy/legal team entries. `regulated_repo_warning_required: true` is set per the rule, but this looks like a low-signal hit.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- `.sdlc/` is not in the repo's `.gitignore`, but the parent clone's `.git/info/exclude` already ignores it, so run artifacts will not appear in `git add -A`. There's no need to add `.gitignore` to the allowlist. (Template text, in case the exclude is ever removed: "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.")
- `.claude/settings.local.json` and `.claude/skills/` exist. They stay untouched.
- No `.mcp.json`, no Aider config, and no repo-local `routing-policy.yaml`.

## Proposed off-limits
`.env`, `.env.*`, `.env.local`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.mcp.json`, `routing-policy.yaml`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/releases/**`, `.git/**`, `.sdlc/**`, and the 11 `**/openapi/generated/**` / `plugins/events-node/src/generated/**` dirs.
Project-rule additions (from CLAUDE.md): `docs/releases/**` (never edit past release notes), `.eslintrc.js` / `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json` (never change lint/format/TS config unless asked).

## Project rules worth carrying into the change spec
- New `.ts/.tsx` files need the Apache 2.0 header with the year 2026. Don't touch the year on existing files.
- A fix to a published package needs a hand-written `.changeset/*.md`. Use a `patch` bump for packages below 1.0.0, such as `@backstage/frontend-app-api` 0.16.9-next.0 and `@backstage/frontend-plugin-api` 0.18.2-next.0. Write it for adopters, with no code symbols. Check the 79 existing changesets first.
- Format only changed files with `yarn prettier --write <paths>`. Run `yarn build:api-reports` if the public API changes.

## Bug orientation (context only, not a diagnosis)
- The "No path for <ref>" error is thrown in `packages/frontend-app-api/src/routing/RouteResolver.ts:153`. Legacy equivalents are in `packages/core-plugin-api/src/routing/useRouteRef.tsx:131,146` and `packages/core-app-api/src/routing/RouteResolver.ts:159`.
- New-system `useRouteRef` (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`) calls `routeResolutionApi.resolve(...)`. That API is `RouteResolutionApiProxy` in `packages/frontend-app-api/src/wiring/phaseApis.tsx`, and it is initialized with route info extracted after tree instantiation.
- The bootstrap/finalize split is in `packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`. Recent commits (2026-03-16) touched bootstrap error handling there.
- App root elements come from `AppRootElementBlueprint` (`attachTo app/root, input elements`). The examples are in `plugins/app/src/extensions/elements.tsx`.
- The likely regression-test home is `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`.

## Tier 2b
Triggered because no shipped adapter covers React/TypeScript/Backstage. The profile was written to `.sdlc/baseline/stack-profile.md`.

## Timing
The scan completed within bounds. The repo is large (12k tracked files, 233 workspace packages) but below the sampling threshold, so no sampling was needed.
