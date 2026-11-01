# Discovery — run 20261101-153026-docs-catalog-model-tsdoc

Mode: first-time (full Tier 1 scan). Built 2026-11-01T10:02:27Z. Plugin 0.9.3.
Intent context: docs. Write TSDoc for the undocumented exports of `@backstage/catalog-model` (`packages/catalog-model`).

## Git state

- HEAD `cb8b07905b900ecb57e5c4b77fe299ff5b83de43` on branch `BS-DOC-04/opus55-plus-flash38` (not master)
- Working tree clean (`git_dirty: false`)
- Remote `origin` -> `git@github.com:tl-ai-labs/backstage.git` (a fork, not upstream backstage/backstage)
- 12,365 tracked files. Full scan, no sampling needed.
- `.gitignore` has no `.sdlc` entry (`gitignore_covers_sdlc: false`), but `.git/info/exclude` line 7 ignores
  `.sdlc/` in this clone only (confirmed with `git check-ignore`).

## Directory topology

Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`,
`.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages` (74 workspaces), `plugins`
(161 workspaces), `scripts`, `workspaces` (`workspaces/ui`).

Target package `packages/catalog-model` (v1.10.2, role `common-library`, public):
`src/{entity,kinds,location,model,validation,schema}`, entry points `src/index.ts` (`.`) and `src/alpha.ts` (`./alpha`),
API reports `report.api.md` and `report-alpha.api.md`, `examples/` (YAML), `README.md`, `CHANGELOG.md`, `knip-report.md`.
About 9k lines of non-test TS.

## Detected stacks

- `package.json` -> **node-typescript**. TypeScript ~5.7, Node 22|24, Yarn 4.18.1 workspaces.
  Frameworks: Backstage (in-house platform framework), React (60 workspaces), Express (45), Knex (17), Material UI v4 (39) / MUI (4), Jest 30, Storybook, Playwright.
- No Python, Go, Rust, JVM, Ruby, PHP or Elixir manifests at the root.

## Test / build commands

- `test_command_proposed`: **`CI=1 yarn test packages/catalog-model`**
  (source: root `package.json#scripts.test` = `backstage-cli repo test`. AGENTS.md requires `CI=1` and an explicit path.)
- Type check: `yarn tsc` (root only, no options). Format: `yarn prettier --write <paths>`. API reports: `yarn build:api-reports`.
- Forbidden by AGENTS.md: `yarn build`, `yarn changesets version`, `yarn release`.
- Gate 0 should confirm the test command. Prerequisite: `yarn install` must already have run (`node_modules/` is present).

## Docs present

README.md (+ 4 translations), AGENTS.md (also `.claude/CLAUDE.md` via symlink), CONTRIBUTING.md, STYLE.md (TSDoc
guidance at lines 170-240), REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADRs 000-015),
`docs/contribute/doc-style-guide.md`, `packages/catalog-model/README.md`.

## Detected AI/agent setup

| Path                              | Type                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.claude/`                        | Claude Code project dir (tracked)                                                              |
| `.claude/CLAUDE.md`               | symlink -> `../AGENTS.md`                                                                      |
| `.claude/settings.local.json`     | tracked in git even though `.gitignore` lists it. Sets an env override for the subagent model. |
| `.claude/skills/`                 | `backstage-release-notes/SKILL.md`, `catalog-db-performance.md`                                |
| `AGENTS.md`                       | agent instructions (canonical)                                                                 |
| `.cursor/rules/`                  | `backstage-project.mdc` (symlink -> AGENTS.md), `tests/*.mdc`                                  |
| `.github/copilot-instructions.md` | Copilot instructions                                                                           |

Not present: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, any `routing-policy.yaml`, any `gemini*.{yaml,json}`.

## Env files

No `.env*` files in the repo (outside `node_modules/`). `env_keys_by_file` is empty.
The code references about 120 env names (names only), mostly CLI, CI, cloud SDK and test vars. None are in `packages/catalog-model`.

## Monorepo, submodules, LFS

- Monorepo: **yarn-workspaces** (`packages/*`, `plugins/*`). There is no pnpm, Nx, Turbo, Lerna or Rush. Per-package test: `CI=1 yarn test <path>`.
- Submodules: none.
- Git LFS: none (`.gitattributes` has no LFS filters).
- Infra: 49 GitHub workflows, `docker-compose.deps.yml`, `.devcontainer/`, Husky + lint-staged pre-commit. No Dockerfile at the root, no Terraform.

## Regulated-repo signals

- `SECURITY.md` (kind: security-policy-file)

`regulated_repo_warning_required: true`. This is very likely a false positive. SECURITY.md is the standard OSS
vulnerability-disclosure policy, and there are no HIPAA/PCI/SOC2/compliance folders and no security, compliance or legal CODEOWNERS entries.

## Intent-specific findings (catalog-model TSDoc)

- **The API reports will not show the gaps.** The root `build:api-reports` runs with `-o ae-undocumented`, so
  `report.api.md` / `report-alpha.api.md` have no "undocumented" warnings (0 `Warning` lines in either). Use the
  reports to find what is public (74 / 69 tagged symbols). Do not use them to find missing docs.
- Source heuristic: 27 top-level `export` declarations have no TSDoc block before them. Most are **internal**
  and are not in either report: `opsFromCatalogModel*` (14 files in `src/model/modelActions/`),
  `ajvCompiledJsonSchemaValidator`, `throwAjvError`, `compileAjvSchema`, `jsonObjectSchema`, `jsonSchemaSchema`,
  `wellKnownAnnotationsModel`. The `alpha.ts` re-export lists also matched, but they are not declarations.
- The likely real gaps in the public surface are **member-level**: for example, the `spec.*` fields of the kind interfaces
  (`ComponentEntityV1alpha1.spec.type/lifecycle/owner/...`) and undocumented option or callback members such as
  `createCatalogModelLayer`'s `builder`. The architect should run a member-level scan, or run API Extractor without
  `-o ae-undocumented`, before scoping the units.
- Changeset: catalog-model is public (1.10.2). By AGENTS.md, a TSDoc-only change may still need `patch` changeset
  coverage. Check `.changeset/` for an existing entry first. Gate 0 decides.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
  - Mitigation already in place in this clone: `.git/info/exclude` ignores `.sdlc/`, so `git add -A` will not pick up run artifacts here. Editing `.gitignore` would also be an unrelated change in an upstream-tracking fork, so leaving it alone is reasonable.
- `.claude/` and `.github/copilot-instructions.md` are tracked agent configs. They stay untouched.
- Husky pre-commit runs lint-staged (`eslint --fix`, `prettier --write`, `scripts/check-docs-quality` on `*.md`). Commits may reformat staged files.
- Memory note (orchestrator context): a synced `sdlc` plugin hook has denied `.sdlc/runs` writes before. Writes in this discovery step succeeded.

## Proposed off-limits

- `.git/**`
- AI configs: `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`
- Env: `.env`, `.env.*`, `.env.local`, `.envrc` (none exist)
- Build/generated: `**/node_modules/**`, `**/dist/**`, `dist-types/**`, `**/build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/{releases,plugins,patches}/**`, `yarn.lock`
- Generated reports: `**/report.api.md`, `**/report-*.api.md`, `**/knip-report.md`, `**/CHANGELOG.md`
- Repo rules (AGENTS.md): `docs/releases/**`, ESLint/Prettier/TS config (`.eslintrc.js`, `tsconfig.json`, `.prettierignore`)

Note: if the run should refresh the API reports after the TSDoc change, move `packages/catalog-model/report*.api.md`
into scope at Gate 0 and regenerate them with `yarn build:api-reports` instead of editing them by hand.

## Stack profile

Triggered: node-typescript / Backstage has no pre-authored adapter (only generic, nest, python ship). Written to
`.sdlc/baseline/stack-profile.md`. It is sampled for catalog-model TSDoc conventions only.
