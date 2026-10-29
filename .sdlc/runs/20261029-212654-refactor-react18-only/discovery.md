# Discovery — run 20261029-212654-refactor-react18-only

Mode: first-time (full Tier 1 scan, plus Tier 2b stack profile). Built 2026-10-29T16:00Z. Scan took about 15 s, most of it the `git grep` for env refs (12,364 tracked files, 324 dirs at depth 2, so no sampling fallback was needed).

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-RF-10/opus55-plus-sonnet55` (this is a git worktree; `master` is the main branch).
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git.
- Dirty: yes, but the only change is the untracked `.sdlc/` folder. No tracked file is modified.
- `.gitignore` covers `.sdlc/`: **no**.

## Topology

Top-level folders: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types` (generated), `docs`, `docs-ui`, `microsite`, `packages` (74), `plugins` (161), `scripts`, `workspaces/ui` (nested project).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`.

## Detected stacks

- `package.json` (root): **node-typescript**, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`), Node `22 || 24`, TypeScript `~5.7.0`. Frameworks: Backstage (its own in-house plugin framework), React 18 (apps), Express + Knex (backend), Jest 30 + React Testing Library, Material UI v4 + `@backstage/ui`, react-router-dom v6, Storybook 10, Playwright.
- `workspaces/ui/package.json`: a separate nested Backstage project with its own `yarn.lock`. The root workspace globs don't include it.
- No Python, Go, Rust, JVM, Ruby, PHP or Elixir manifests.
- No pre-authored adapter matches the stack (only `generic`, `nest` and `python` ship), so **Tier 2b ran**: see `.sdlc/baseline/stack-profile.md`.

## Test / build / run

- Proposed test command: `CI=1 yarn test <path>`. The root `scripts.test` is `NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test`, and AGENTS.md says to always pass a path and never run the whole suite. Per package: `CI=1 yarn test packages/<name>` or `plugins/<name>`. **Gate 0 must confirm.**
- Type check: `yarn tsc` (root only, no options). Lint: `yarn lint --fix`. Format: `yarn prettier --write <files>`. API reports: `yarn build:api-reports`.
- Forbidden by AGENTS.md: `yarn build`, `yarn changesets version`, `yarn release`, and the changeset CLI.

## Docs

README.md (plus 4 translations), AGENTS.md (`.claude/CLAUDE.md` is a symlink to it), `plugins/catalog-backend/CLAUDE.md`, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, ADRs in `docs/architecture-decisions/` (adr000–adr015), `beps/`, `docs/contribute/doc-style-guide.md`.
Key rules from AGENTS.md:

- New source files need an Apache-2.0 header with the current year. Don't change the year on existing files.
- Changes to published packages need changesets. Edit `.changeset/` by hand: 42 entries exist, so check them first.
- A breaking change on a package below 1.0 is `minor`; at 1.0 or above it is `major`.
- Changes need docs (TSDoc, a README or `/docs`).
- Never touch ESLint, Prettier or TS config, or `docs/releases`.

## Detected AI/agent setup

| Path                                | Type                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `.claude/`                          | Claude Code project config: `CLAUDE.md` symlink, `skills/` (`catalog-db-performance.md`, `backstage-release-notes/`) |
| `.claude/settings.local.json`       | local settings, gitignored, has an `env` block (values not read)                                                     |
| `AGENTS.md`                         | agent instructions (front matter `alwaysApply: true`)                                                                |
| `plugins/catalog-backend/CLAUDE.md` | package-level Claude instructions                                                                                    |
| `.cursor/rules/`                    | Cursor rules: `backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`                        |
| `.github/copilot-instructions.md`   | Copilot instructions                                                                                                 |

No `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, repo-local `routing-policy.yaml`, or `gemini*` config.

## Env keys

- No `.env*` files exist in the repo (to depth 4).
- 137 env-var names are referenced in code, all in `baseline.json` → `env_keys_referenced_in_code`. Names only: for example `NODE_ENV`, `CI`, `HAS_REACT_DOM_CLIENT`, `BACKSTAGE_ENV`, `GITHUB_TOKEN`, `POSTGRES_*`, `AWS_*`, `AZURE_*`.
- `HAS_REACT_DOM_CLIENT` is the build-time flag behind the React 17/18 dual-render shim. It matters for this refactor.

## Monorepo, submodules, LFS

- Yarn workspaces: 235 packages (74 in `packages/`, 161 in `plugins/`), each listed in `baseline.json` with its role, privacy and `react` peer range.
- `react` peer ranges: 56 packages use `^17.0.0 || ^18.0.0`, 60 use `^18.0.2`, 1 uses `^18.0.0`.
- Submodules: none. LFS: none (no `.gitattributes`). The git-lfs filters come only from the user's global `~/.gitconfig` and have no effect on this repo.
- Encrypted secrets: none found (no sops, git-crypt or `.gpg`/`.enc` files).
- Generated code:
  - `*/src/schema/openapi/generated/**` in 10 packages, plus `plugins/events-node/src/generated/**`.
  - 296 API-Extractor `report*.api.md` files, regenerated by `yarn build:api-reports`.
- Tracked files that are gitignored: 2 fixtures under `packages/eslint-plugin/src/__fixtures__/monorepo/packages/node_modules/`. There are also tracked `dist/` fixtures under `packages/backend-dynamic-feature-service/src/features/__fixtures__/`. The `dist` gitignore rule is broad, so new files in folders named `dist` will be silently ignored.

## Infra

- Dockerfiles: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, two under `contrib/docker/`. There is also `docker-compose.deps.yml`.
- `.github/workflows/` holds 49 workflows. No GitLab, CircleCI, Jenkins or Terraform.
- Husky with lint-staged runs `eslint --fix` and `prettier` on commit. On a `package.json` change it also regenerates `catalog-info.yaml` and runs `sort-package-json`.

## Regulated-repo signals

- `SECURITY.md` (kind `security-policy`). This is a standard OSS vulnerability-reporting policy, not a compliance regime. There are no HIPAA, PCI, SOC2 or GDPR markers, and no compliance owners in CODEOWNERS. `regulated_repo_warning_required: true` is set because the rule says to, but the signal is weak.

## Refactor context (react18-only), observed facts

- Root `resolutions` already pin `@types/react` and `@types/react-dom` to `^18.0.0`. The example apps already call `ReactDOM.createRoot` from `react-dom/client`.
- React 17 compatibility shims, which switch on `process.env.HAS_REACT_DOM_CLIENT`:
  - `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` and `config.ts`, which inject the define.
  - `packages/cli-module-test-jest/config/jest.js`.
  - `packages/dev-utils/src/devApp/render.tsx`.
  - `plugins/techdocs/src/reader/transformers/renderReactElement.ts`.
- 56 published packages declare `react`/`react-dom`/`@types/react` peers of `^17.0.0 || ^18.0.0`. Narrowing these changes published peer ranges, so changesets and version-bump rules apply.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- You have Copilot instructions at `.github/copilot-instructions.md` and Claude Code config under `.claude/` (including skills). They stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- Husky pre-commit hooks rewrite staged files (eslint --fix, prettier, catalog-info regeneration, package.json sorting). Commits will not be byte-identical to what was staged.

## Proposed off-limits

`.git/**`, `.sdlc/**`, `.env`, `.env.*`, `.env.local`, `.envrc`, `*-credentials.yaml`, `*.local.yaml`, `.claude/**`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.mcp.json`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/releases/**`, `.yarn/patches/**`, `.yarn/plugins/**`, `yarn.lock`, `packages/*/src/schema/openapi/generated/**`, `plugins/*/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `docs/releases/**`, `.eslintrc.js`, `**/.eslintrc.js`, `tsconfig.json`, `.prettierignore`, `.eslintignore`.
Notes:

- `yarn.lock`: a peer-range refactor may need `yarn install`. Gate 0 decides.
- The last group (ESLint, TS and Prettier config files plus `docs/releases`) is off-limits because AGENTS.md says so.
