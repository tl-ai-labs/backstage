# Brownfield discovery — Backstage monorepo

- **Run id:** `20261029-162244-feature-extend-scaffolder-conditional-fields`
- **Mode:** `first-time` (full scan)
- **Built at:** 2026-10-29T10:54:43Z
- **Plugin version:** 0.9.3
- **Repo root:** `/Users/macbook/Documents/GitHub/Google-Projects/backstage`

## Group 1 — git state

| Field | Value |
|---|---|
| HEAD | `f20fd9b598285c88401406b3812fe00d7708136c` |
| Branch | `BS-FE-08/flash-agsdk-only-v38` (not `master`) |
| Dirty | No — clean tree |
| `origin` | `https://github.com/tl-ai-labs/backstage.git` (fork) |
| `upstream` | `https://github.com/backstage/backstage.git` |
| `.gitignore` covers `.sdlc/` | **No** |

`.sdlc/` is excluded by `.git/info/exclude` line 7 instead of `.gitignore`. That keeps run artifacts out of
`git add -A` in this clone, but the exclude file is local-only and is not shared with any other clone of the fork.
Gate 0 may still want `.gitignore` in the allowlist so the entry becomes durable.

## Group 2 — directory topology

327 directories at depth 2. Top level:

```
.changeset  .claude   .cursor   .devcontainer  .github  .husky  .lighthouseci
.patches    .storybook  .yarn   beps    contrib  dist-types  docs  docs-ui
microsite   packages  plugins   scripts  workspaces
```

12,364 tracked files, 235 workspace packages. Large but not large enough to need sampled discovery for
stack manifests — there is exactly one root manifest.

### Scaffolder frontend surface (targeted for this job)

The form wizard lives in two packages, with the JSON-schema contract in a third:

| Package | Path | Role |
|---|---|---|
| `@backstage/plugin-scaffolder-react` | `plugins/scaffolder-react` | `web-library` — the form/wizard engine, **where conditional visibility logic belongs** |
| `@backstage/plugin-scaffolder` | `plugins/scaffolder` | frontend plugin — pages, routing, field extensions |
| `@backstage/plugin-scaffolder-common` | `plugins/scaffolder-common` | shared template schema types (`TemplatePresentationV1beta3`, v1beta3 manifest) |
| `@backstage/plugin-scaffolder-backend` | `plugins/scaffolder-backend` | serves the parameter manifest to the frontend |

The live wizard implementation is under `plugins/scaffolder-react/src/next/`:

```
next/components/Stepper/      Stepper.tsx (362 lines), utils.ts, createAsyncValidators.ts
next/components/Form/         Form.tsx (RJSF withTheme wrapper, mui + bui themes)
next/components/Workflow/     Workflow.tsx
next/components/ReviewState/  review step rendering
next/hooks/                   useTemplateSchema.ts, useTransformSchemaToProps.ts,
                              useFilteredSchemaProperties.ts, useTemplateParameterSchema.ts
next/lib/                     schema.ts (extractSchemaFromStep)
```

Notes that matter for conditional fields:

- The form is **react-jsonschema-form (RJSF)** — `withTheme(MuiTheme)` / `withTheme(generateBuiTheme())`
  in `next/components/Form/Form.tsx`. So JSON Schema `dependencies` / `allOf` / `if-then` are the
  native mechanism already available, and `plugins/scaffolder-react/src/next/lib/schema.ts` plus
  `Stepper/createAsyncValidators.ts` already reference `dependencies` / `oneOf` / `allOf`.
- `next/hooks/useTemplateSchema.ts` already does per-property *filtering* — but keyed on **feature flags**
  (`uiSchema[key]['ui:backstage'].featureFlag`), not on earlier answers. It has an explicit
  `if (step.schema?.properties || !step.schema?.dependencies)` guard, i.e. it deliberately skips property
  stripping when `dependencies` are present. That guard is the nearest existing analogue to the requested
  feature and the likely integration point.
- `next/hooks/useFilteredSchemaProperties.ts` is a second, separate filtering hook — worth reading before
  adding a third filtering mechanism.
- Cross-step answer state is held by the `Stepper`, so "driven by answers from earlier steps" needs
  state that the per-step RJSF instance does not have by default. That is the real design question for
  the architect.
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage` is the new-frontend-system wizard host;
  `plugins/scaffolder/src/components/fields` and `src/alpha/fields` hold the custom field extensions.

Entry points: `packages/app/src/index.tsx`, `packages/backend/src/index.ts`,
`plugins/scaffolder/src/index.ts`, `plugins/scaffolder-react/src/index.ts`.

## Group 3 — detected stacks

One root manifest: `package.json`.

- **Stack:** `node-typescript` (React frontend + Node backend in one repo)
- **Package manager:** `yarn@4.18.1` (Yarn Berry, `.yarnrc.yml`, `yarn.lock`, patches under `.yarn/patches`)
- **Node:** engines `22 || 24`
- **TypeScript:** `~5.7.0`
- **Frameworks / tooling detected:** React 18 (`@types/react ^18`), **RJSF** (`@rjsf/core`, `@rjsf/utils`,
  `@rjsf/material-ui`), Material UI v4 + the newer `@backstage/ui` ("bui"), Jest 30
  (`--experimental-vm-modules`), Playwright, Storybook 10, Vite 7, Changesets, Husky + lint-staged,
  ESLint 8 + Prettier 2, `backstage-cli` as the build/test/lint driver.

No Python, Go, Rust, Java, Ruby, PHP, or Elixir manifest at root.

**No pre-authored adapter matches.** The plugin ships `generic.md`, `nest.md`, `python.md`; the dominant
stack here is React/TypeScript. Tier 2b stack profile was therefore built — see
`.sdlc/baseline/stack-profile.md`.

## Group 4 — test / build / run commands

**Proposed test command:** `CI=1 yarn test <path>`

Source: `.claude/CLAUDE.md` § Development Flow, which overrides the bare root script. The root script is
`"test": "NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test"`, but project instructions
require always passing a path — a full-repo run across 235 packages is not viable.

Likely scoped command for this job: `CI=1 yarn test plugins/scaffolder-react/src/next`

Adjacent commands Gate 0 should know about:

| Purpose | Command | Constraint |
|---|---|---|
| Type check | `yarn tsc` | root only, no options |
| Lint | `yarn lint --fix` | root |
| Format | `yarn prettier --write <paths>` | named paths only, never whole folders |
| API reports | `yarn build:api-reports` | **required before PR** if a package's public API changes |
| Changeset | hand-write a file in `/.changeset` | never use the changeset CLI |
| Forbidden | `yarn build`, `yarn changesets version`, `yarn release` | explicitly banned by project instructions |

`yarn install` must have been run for any of these to work. `node_modules/` exists at root, so an install
has happened at some point; freshness unverified.

**Pre-existing failing tests: unknown.** Tier 1 is read-only, so nothing was executed. Gate 0 must capture
a green baseline on the scoped path before Phase 7 treats any failure as caused by the change.

## Group 5 — docs present

`README.md` (+ fr/ja/ko/zh translations), `.claude/CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `STYLE.md`,
`REVIEWING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `OWNERS.md`, `ADOPTERS.md`, `LABELS.md`.

ADRs live in `docs/architecture-decisions/`. Enhancement proposals live in `beps/` — note
`beps/0010-scaffolder-templating-in-parameters` and `beps/0004-scaffolder-task-idempotency`, both
directly adjacent to this job's subject matter and worth reading before design.

Doc style guide: `docs/contribute/doc-style-guide.md`. Structure guide:
`docs/contribute/project-structure.md`.

## Group 6 — detected AI / agent setup

| Path | Type |
|---|---|
| `.claude/` | Claude Code project config |
| `.claude/CLAUDE.md` | project instructions (checked in) |
| `.claude/settings.local.json` | local settings (gitignored) |
| `.claude/skills/catalog-db-performance.md` | Claude skill |
| `.claude/skills/backstage-release-notes/SKILL.md` | Claude skill |
| `.cursor/rules/backstage-project.mdc` | Cursor rule, `alwaysApply: true` |
| `.cursor/rules/tests/test-utils.mdc` | Cursor rule |
| `.cursor/rules/tests/backend-test-utils.mdc` | Cursor rule |
| `.github/copilot-instructions.md` | GitHub Copilot instructions |
| `AGENTS.md` | agents.md convention (mirrors `.claude/CLAUDE.md`) |

Absent: `.mcp.json`, `.cursorrules`, `.aider.conf.*`, `.continue/`, `.roo/`, `CLAUDE.local.md`,
repo-local `routing-policy.yaml`.

## Group 7 — env file keys

**No `.env`, `.env.example`, `.env.local`, or `.env.*` file exists.** Backstage configures itself through
`app-config.yaml` / `app-config.docker.yaml`, not dotenv. `.gitignore` already pre-empts `.env`,
`.env.test`, `.envrc`.

Env names referenced in code (names only; no value was read): `APP_CONFIG`, `BACKSTAGE_*` family,
`CI`, `NODE_ENV`, `NODE_OPTIONS`, `LOG_LEVEL`, `PORT`, `POSTGRES_{HOST,PORT,USER,PASSWORD}`, `AWS_*`
credential chain vars, `PLAYWRIGHT_URL`, `YARN_*`. Full list in `baseline.json`.

The grep was bounded to the first 4,000 tracked TS/TSX files out of 12,364 — representative, not exhaustive.

## Group 8 — monorepo, submodules, LFS, infra

**Monorepo:** Yarn workspaces (Yarn Berry 4.18.1). Globs `packages/*` and `plugins/*` → 235 packages
(73 under `packages/`, 162 under `plugins/`). No pnpm/Nx/Turbo/Lerna/Rush manifest. A nested workspace
root exists at `workspaces/ui`.

**Submodules:** none (`.gitmodules` absent).

**Git LFS:** not in use — no `.gitattributes` at all.

**Infra:** `.github/workflows/` with 49 workflows, `docker-compose.deps.yml` (local Postgres etc.),
Husky hooks, lint-staged, Changesets, Playwright (`playwright.config.ts`), Storybook, Lighthouse CI,
MkDocs (`mkdocs.yml`). No Dockerfile at root, no Terraform, no GitLab CI / CircleCI / Jenkins.

## Group 9 — regulated-repo signals

Only `SECURITY.md` matched, which is standard for any OSS project and carries no compliance obligation.
No `HIPAA`/`PCI`/`SOC2`/`GDPR`/`PRIVACY`/`COMPLIANCE` file or directory. CODEOWNERS has no
security/compliance/privacy/legal team entries.

`regulated_repo_warning_required: false` — no Gate 0 warning needed.

## Coexistence risks

> **Cursor rules detected.** You have Cursor rules at `.cursor/rules/` (`backstage-project.mdc`,
> `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`). The plugin will never touch them, but if you
> have Cursor's auto-lint running on save, changes we make may trigger it.

> **GitHub Copilot instructions detected.** `.github/copilot-instructions.md` delegates to `AGENTS.md`
> and adds PR-review scoring rules. Untouched by default; it only affects Copilot's own PR reviews.

> **Claude Code project config detected.** `.claude/` carries `CLAUDE.md`, a gitignored
> `settings.local.json`, and two skills. Untouched by default.

> **No custom `.mcp.json`.** Nothing registered at repo level; the plugin uses its own bundled
> model-dispatch server.

> **No repo-local `routing-policy.yaml`.** But `.sdlc/project.json` pins
> `default_policy: flash-agsdk-only-v38`. Confirm that is the policy you want for this run, or pass
> `--policy <name>`.

> **`.sdlc/` not gitignored.** Your `.gitignore` doesn't cover `.sdlc/` — it is excluded via
> `.git/info/exclude` instead, which is local to this clone only. Run artifacts under `.sdlc/` (packets,
> backups, telemetry) stay invisible to `git add -A` here, but not for anyone else who clones the fork.
> Gate 0 will offer to add `.gitignore` to this run's allowlist so the plugin can add the entry.

> **Husky + lint-staged are live.** Any commit runs `eslint --fix` and `prettier --write` over staged
> JS/TS, regenerates `catalog-info.yaml` when `package.json` or CODEOWNERS change, and dedupes
> `yarn.lock`. Expect the hook to rewrite files after the plugin writes them — that is desirable here,
> but it means post-commit content can differ from what was written.

## Proposed off-limits

```
.env                       .env.*                   .envrc
.claude/**                 .cursor/**               .github/copilot-instructions.md
AGENTS.md                  .mcp.json                routing-policy.yaml
.git/**                    .sdlc/**                 node_modules/**
dist/**                    dist-types/**            dist-workspace/**
dist-storybook/**          build/**                 coverage/**
.yarn/**                   yarn.lock                **/CHANGELOG.md
**/api-report*.md          docs/reference/**        microsite/**
docs-ui/**                 .eslintrc.js             .prettierignore
tsconfig.json              **/*-credentials.yaml
```

Rationale for the non-obvious entries:

- `yarn.lock` — regenerated by yarn; hand edits corrupt installs. `scripts/verify-lockfile-duplicates`
  gates it.
- `**/CHANGELOG.md` — produced by the Changesets release workflow. Write a `.changeset/*.md` entry instead.
- `**/api-report*.md` — produced by `yarn build:api-reports`. Run the command; never hand-edit.
- `tsconfig.json`, `.eslintrc.js` — project instructions forbid touching TS/ESLint/Prettier config
  unless explicitly asked.
- `microsite/**`, `docs-ui/**` — separate site builds, unrelated to this job.
- `dist-types/**` — build output that currently exists at repo root.

### Suggested write scope for this job (Gate 0 to confirm)

```
plugins/scaffolder-react/src/next/**
plugins/scaffolder-react/src/types.ts
plugins/scaffolder-common/src/**
plugins/scaffolder/src/**
.changeset/*.md
docs/features/software-templates/**
```

A changeset **is** required: `@backstage/plugin-scaffolder-react` is public and non-private. Documentation
is also required for new behavior — `docs/features/software-templates/` is the natural home, with TSDoc on
any new exported type.

## Repo-state risks summary

| Risk | Status |
|---|---|
| Dirty working tree | Clean |
| Submodules | None |
| Git LFS | Not in use |
| Pre-existing failing tests | **Unknown — not probed.** Gate 0 must baseline. |
| Aggressive `.gitignore` | **Yes.** Ignores `dist`, `dist-types`, `coverage`, `**/.yarn/*`, `*.local.yaml`, `*-credentials.yaml`, `docs/**/*.api.mdx`, `docs/**/sidebar.ts`. New files landing under those patterns would be silently untracked. |
| `.sdlc/` in `.gitignore` | No — only in `.git/info/exclude` (local-only) |
| On default branch | No — on `BS-FE-08/flash-agsdk-only-v38`; PRs target `master` |
| Fork topology | `origin` = `tl-ai-labs/backstage`, `upstream` = `backstage/backstage` |
| Install freshness | `node_modules/` present; currency unverified |

## Scan notes

Tier 1 completed within budget. The only bound hit was the Group 7 code grep, capped at 4,000 of 12,364
tracked files. Tier 2b stack profile was built because no shipped adapter matches React/TypeScript.
