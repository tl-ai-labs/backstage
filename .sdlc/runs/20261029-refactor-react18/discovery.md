# Discovery — Backstage (brownfield Tier 1)

- **Run id:** `20261029-refactor-react18`
- **Mode:** first-time (full Tier 1 scan; no prior `.sdlc/baseline/current.json`)
- **Intent hint:** refactor
- **Built at:** 2026-10-29T05:55:46.149Z
- **Plugin version:** 0.9.3
- **Scope:** Tier 1 only — cheap local reads. Tier 2 (test-command confirmation, file-scope allowlist, off-limits confirmation) belongs to Gate 0. Tier 2b (adaptive stack profile) was **not** run (`adaptive_profile: false`) but **is required** — see _Stack adapter gap_.

> **Scale note.** This is a very large monorepo: 12,364 tracked files, 324 directories at depth 2, 278 tracked `package.json` files, 235 workspace packages. Groups 2, 3 and 8 were deliberately truncated to manifest- and glob-level reads to stay inside the timebox. Truncations are listed under _Truncation and bounds_.

---

## Group 1 — git state

| Field              | Value                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| HEAD               | `f20fd9b598285c88401406b3812fe00d7708136c`                                                                              |
| Branch             | `BS-RF-10/flash-agsdk-only-v38`                                                                                         |
| Dirty              | false (0 lines from `git status --short`)                                                                               |
| Remotes            | `origin` → https://github.com/tl-ai-labs/backstage.git (fork) · `upstream` → https://github.com/backstage/backstage.git |
| `.sdlc` gitignored | **false** (but locally excluded — see below)                                                                            |

This is a **fork** working on a feature branch (`BS-RF-10/flash-agsdk-only-v38`), with upstream pointing at the canonical Backstage repo. Rollback anchors are available; the tree is clean, so the HEAD SHA above is a valid revert point.

`.gitignore` does not mention `.sdlc` anywhere, so `gitignore_covers_sdlc` is **false**. However `.sdlc/` _is_ currently ignored — by `.git/info/exclude` line 7. That file is local to this clone and is never committed, so the protection does not travel: any other clone, any fresh clone and CI would see `.sdlc/` artifacts as untracked-but-addable by `git add -A`. The committed `.gitignore` already ignores `.claude/settings.local.json` and `.claude/worktrees/`, so there is clear precedent for ignoring agent-local state in it.

## Group 2 — directory topology (bounded)

Top-level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`

Shape in brief:

- `packages/` — 74 core framework packages (`@backstage/*`)
- `plugins/` — 161 plugin packages (`@backstage/plugin-*`)
- `workspaces/ui` — a _separate_ Backstage workspace with its own lockfile
- `microsite/`, `docs-ui/` — independent nested front-ends (Docusaurus, Next.js)
- `contrib/`, `beps/`, `scripts/`, `docs/`, `.changeset/`, `.patches/`, `.storybook/`

Entry points found: `packages/app/src/index.tsx`, `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.

## Group 3 / 4 — Detected stacks, and the test command

### Detected stacks

Single-language repo: **node-typescript**, end to end. No `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `Gemfile`, `composer.json` or `mix.exs` is tracked anywhere in the repo.

- `package.json` → **node-typescript** · frameworks: `react`, `backstage`, `jest`, `storybook`, `playwright`, `vite`
  - Root of the Yarn 4 workspace. TypeScript ~5.7, Node 22||24, React 18 pinned via resolutions (@types/react ^18). Build/test/lint all go through @backstage/cli (backstage-cli repo \*).
- `packages/app/package.json` → **node-typescript** · frameworks: `react`, `react-router`, `material-ui-v4`, `backstage-frontend-system`
  - Example app on the new frontend system; react ^18.0.2.
- `packages/backend/package.json` → **node-typescript** · frameworks: `backstage-backend-system`
  - Example backend wired from @backstage/backend-defaults.
- `microsite/package.json` → **node-typescript** · frameworks: `docusaurus`
  - Independent nested workspace with its own yarn.lock; not part of the root workspace globs.
- `docs-ui/package.json` → **node-typescript** · frameworks: `next`, `mdx`, `base-ui`
  - Independent nested workspace with its own yarn.lock.
- `workspaces/ui/package.json` → **node-typescript** · frameworks: `backstage`, `react`
  - Independent nested Backstage workspace (own yarn.lock, own packages/\* glob); packages not checked out on disk.

Key versions from the root manifest: TypeScript `~5.7.0`, Node `22 || 24`, Yarn `4.18.1`, jest `^30.5.0`, React **18** (pinned through `resolutions`: `@types/react: ^18.0.0`, `@types/react-dom: ^18.0.0`; `packages/app` declares `react: ^18.0.2`). Root `tsconfig.json` extends `@backstage/cli/config/tsconfig.json` with `"jsx": "react-jsx"`.

### Proposed test command

- **`test_command_proposed`:** `yarn test`
- **`test_command_source`:** `package.json#scripts.test`

It resolves to `NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test`. **Gate 0 must narrow this.** Reasons:

- Root scripts.test resolves to: NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test (jest 30 under the hood).
- Repo AGENTS.md (symlinked as .claude/CLAUDE.md) instructs: "Use CI=1 yarn test <path> ... Always provide a path, avoid running all tests."
- Unscoped `yarn test` across 235 workspace packages is impractical as a per-run verification gate. Gate 0 should confirm a scoped form, e.g. `CI=1 yarn test <changed-path>`.
- CI uses: yarn backstage-cli repo test --maxWorkers=3 --workerIdleMemoryLimit=1300M --since origin/master (.github/workflows/ci.yml:312).
- Type check is a separate gate: `yarn tsc` from the repo root.
- node_modules is installed and node_modules/.bin/backstage-cli + jest resolve, so the command is runnable without a prior yarn install.

Recommended confirmation target for a React-18 refactor: `CI=1 yarn test <changed-paths>`, plus `yarn tsc` from the repo root as a separate type gate.

## Group 5 — docs

- `README.md` — readme
- `AGENTS.md` — agent-instructions
- `.claude/CLAUDE.md` — claude-instructions (symlink -> ../AGENTS.md)
- `CONTRIBUTING.md` — contributing
- `STYLE.md` — style-guide
- `REVIEWING.md` — review-guide
- `SECURITY.md` — security-policy
- `docs/architecture-decisions/` — adr-directory (17 ADR files)
- `docs/contribute/doc-style-guide.md` — doc-style-guide
- `docs/features/search/README.md` — docs-readme
- `docs/features/techdocs/README.md` — docs-readme

Absent: `ARCHITECTURE.md`, `CLAUDE.md (repo root — only .claude/CLAUDE.md symlink exists)`, `CLAUDE.local.md`.

The repo's authoring rules live in `AGENTS.md` (not a root `CLAUDE.md`) and are reached by Claude Code through the `.claude/CLAUDE.md` symlink. They are directly relevant to a refactor run: Apache-2.0 headers on new source files, no copyright-year bumps on existing files, per-package style consistency over repo-wide consistency, changeset coverage for published packages, and a hard prohibition on `yarn build` / `yarn changesets version` / `yarn release`.

## Detected AI/agent setup (Group 6 — presence only)

- `.claude/` — `claude-code-project-config`
- `.claude/settings.local.json` — `claude-code-local-settings`
- `.claude/CLAUDE.md` — `claude-instructions` (symlink -> ../AGENTS.md)
- `.claude/skills/catalog-db-performance.md` — `claude-skill`
- `.claude/skills/backstage-release-notes/SKILL.md` — `claude-skill`
- `AGENTS.md` — `agent-instructions` (symlink target of .claude/CLAUDE.md; has alwaysApply: true frontmatter so Cursor also consumes it)
- `.cursor/rules/backstage-project.mdc` — `cursor`
- `.cursor/rules/tests/test-utils.mdc` — `cursor`
- `.cursor/rules/tests/backend-test-utils.mdc` — `cursor`
- `.github/copilot-instructions.md` — `github-copilot`

Not present: `.mcp.json`, `.cursorrules`, `.aider.conf.yml`, `.aider.conf.yaml`, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

Notably **no `.mcp.json`** and **no repo-local `routing-policy.yaml`** — nothing silently redirects dispatch or routing.

## Group 7 — env keys (names only)

**No env files exist** — no `.env`, `.env.example`, `.env.local` or `.env.*` on disk or in git. `.gitignore` does pre-emptively ignore `.env`, `.env.test` and `.envrc`. Configuration is YAML instead: `app-config.yaml` and `app-config.docker.yaml`.

`env_keys_by_file`: `{}` · `env_keys_all`: `[]`

`env_keys_referenced_in_code` — 67 names grepped from `packages/**/src`, `plugins/**/src`, `scripts/**` (names only; no value was ever read):

```
APPDATA APP_CONFIG AWS_ACCESS_KEY_ID AWS_CONFIG_FILE AWS_CREDENTIAL_EXPIRATION AWS_DEFAULT_REGION AWS_REGION AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_SHARED_CREDENTIALS_FILE AZURE_CLIENT_ID AZURE_CLIENT_SECRET AZURE_TENANT_ID BACKSTAGE_APP_NAME BACKSTAGE_CLI_BUILD_PARALLEL BACKSTAGE_CLI_CHANNEL BACKSTAGE_CLI_CONCURRENCY BACKSTAGE_ENV BACKSTAGE_MANIFEST_FILE BACKSTAGE_TEST_DISABLE_DOCKER BACKSTAGE_TEST_DOCKER_REGISTRY BACKSTAGE_VERSIONS_BASE_URL BUILD_INFO CI COMMIT_SHA_BEFORE CUSTOM_VAR EXPERIMENTAL_LAZY_COMPILATION EXPERIMENTAL_TRIM_NEXT_ENTRY FORCE_COLOR FOSSA_API_KEY GITHUB_BASE_REF GITHUB_OUTPUT GITHUB_REF GITHUB_TOKEN HAS_REACT_DOM_CLIENT HOME KUBERNETES_CA_FILE_PATH KUBERNETES_SERVICE_HOST KUBERNETES_SERVICE_PORT LEGACY_WEBPACK_BUILD LOG_LEVEL MYSQL_CONNECTION MY_SECRET NODE_ENV NODE_PATH NO_COLOR PATCH_RELEASE_BRANCH PATH PERFORMANCE_TEST PERFORMANCE_TRACE PORT POSTGRES_HOST POSTGRES_PASSWORD POSTGRES_PORT POSTGRES_USER RUNNER_TEMP SUBSTITUTE_ME TECHDOCS_TEST_SECRET TZ WEBSITE_AUTH_DEFAULT_PROVIDER WEBSITE_AUTH_ENABLED WEBSITE_AUTH_TOKEN_STORE WEBSITE_SKU XDG_CONFIG_HOME XDG_DATA_HOME YARN_ENABLE_IMMUTABLE_INSTALLS YARN_PLUGINS
```

Of these, the cloud-credential shaped names (`AWS_*`, `AZURE_*`, `POSTGRES_*`, `GITHUB_TOKEN`, `FOSSA_API_KEY`) appear in integration packages and CI scripts, which is expected for this codebase. `MY_SECRET`, `CUSTOM_VAR`, `SUBSTITUTE_ME` and `TECHDOCS_TEST_SECRET` are test fixtures.

## Group 8 — monorepo, submodules, LFS, infra

### Monorepo

- **Type:** `yarn-workspaces` · package manager `yarn@4.18.1`
- **Workspace globs:** `packages/*`, `plugins/*`
- **Packages:** 235 (74 under `packages/`, 161 under `plugins/`)
- **Per-package test command:** `CI=1 yarn test <package-path>   # or: yarn backstage-cli repo test --since origin/master`
- **No** `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json` or `rush.json`. Orchestration is `@backstage/cli`'s own `repo` subcommands.

**Three independent nested workspaces** — each has its own `yarn.lock` and is _not_ covered by the root globs. A root-level `yarn test` will not touch them, and changes in them will not be verified by the root test command:

- `microsite` (lockfile `microsite/yarn.lock`) — Docusaurus site; not in root workspace globs.
- `docs-ui` (lockfile `docs-ui/yarn.lock`) — Next.js docs UI; not in root workspace globs.
- `workspaces/ui` (lockfile `workspaces/ui/yarn.lock`) — Separate Backstage workspace with its own packages/\* glob; packages not present on disk.

Extra tooling in play: `changesets (.changeset/, 39 pending changeset files)`, `husky + lint-staged pre-commit hooks`, `storybook 10`, `playwright e2e`, `madge circular-dep lint`, `.patches/ yarn patch workflow`.

### Submodules

**None.** No `.gitmodules`, and `git ls-files -s` reports zero gitlink (mode 160000) entries.

### Git-LFS

**Not in use.** No root `.gitattributes`, and no tracked `.gitattributes` anywhere with `filter=lfs` / `diff=lfs` / `merge=lfs`.

### Infra hints

- Dockerfiles: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `contrib/docker/*`, plus create-app templates
- Compose: `docker-compose.deps.yml` (root), `plugins/auth-backend/examples/docker-compose.oauth2-proxy.yaml`
- Terraform: `contrib/terraform/techdocs-s3-storage/terraform.tf`
- GitHub Actions: **49 workflows** under `.github/workflows/`
- No GitLab CI, no CircleCI, no Jenkinsfile

## Regulated-repo signals

`regulated_repo_warning_required: **true**` — on one weak signal.

- `security-policy` → `SECURITY.md`

Single weak signal: a root SECURITY.md, which is standard for any CNCF open-source project and here only points at the upstream versioning policy. No HIPAA/PCI/SOC2/GDPR/compliance/regulated paths, and no security-team / compliance-team / privacy-team / legal entries in .github/CODEOWNERS (all ownership is @backstage/\* maintainer groups).

Gate 0 will print the standard warning. Given it fires on a root `SECURITY.md` in a CNCF-incubation open-source project, this is very likely a false positive and can be dismissed consciously.

## Coexistence risks

- Cursor rules detected at .cursor/rules/backstage-project.mdc, .cursor/rules/tests/test-utils.mdc and .cursor/rules/tests/backend-test-utils.mdc. The plugin will never touch them, but if you have Cursor auto-lint-on-save running, changes we make may trigger it.
- AGENTS.md carries `alwaysApply: true` frontmatter and is symlinked in as .claude/CLAUDE.md, so it is simultaneously the Claude Code project instructions and a Cursor always-on rule. It is off-limits by default; a refactor that "updates the docs" must not land there.
- .github/copilot-instructions.md detected — GitHub Copilot review instructions. Untouched by default.
- No .mcp.json: no repo-local MCP servers registered. The repo does depend on @storybook/addon-mcp as a devDependency, which is a Storybook addon rather than a dispatcher target.
- No repo-local routing-policy.yaml: the shipped/default policy applies.
- Your .gitignore does not cover .sdlc/. Run artifacts under .sdlc/ (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add .gitignore to this run's allowlist so the plugin can append the entry as part of the run.
- husky + lint-staged are active (scripts.prepare = husky, .husky/ present). Any commit made during a run triggers eslint --fix, prettier --write, catalog-info regeneration and lockfile dedupe checks on staged files, so files may be rewritten after the plugin writes them.
- Yarn 4 with .yarn/patches and a repo-local yarn plugin — do not regenerate yarn.lock as part of a refactor.
- 39 pending changeset files in .changeset/. AGENTS.md requires changeset coverage for published packages/_ and plugins/_ changes, and forbids using the changeset CLI (edit .changeset/ files directly).

## Stack adapter gap (Tier 2b not run)

- Available pre-authored adapters: `generic.md`, `nest.md`, `python.md`
- Matched adapter: **none**
- `adaptive_profile_required`: **true** · `adaptive_profile_built`: **false**

Primary stack is a React 18 + TypeScript Backstage monorepo driven entirely by @backstage/cli. Tier 2b trigger condition 1 applies (no pre-authored adapter matches; generic.md would be the fallback). The caller passed adaptive_profile:false, so the profile was NOT built and .sdlc/baseline/stack-profile.md does not exist. The orchestrator should invoke Tier 2b before Phase 3/4 for a React refactor intent.

For `intent_hint: refactor` against React 18 in a repo whose conventions are strongly package-local ("consistency within a package is more important than consistency across the repo", per `AGENTS.md`), a generic adapter is a poor substitute. Recommend the orchestrator run Tier 2b (or the caller re-run with `--adaptive-profile`) before the architect writes the change spec. `.sdlc/baseline/stack-profile.md` does not exist.

## Pre-existing test health

`measured: false`.

Running the suite is outside the Tier 1 ~10s timebox: `backstage-cli repo test` over 235 packages with jest 30 takes many minutes and CI itself caps it at --maxWorkers=3 with a 1300M idle memory limit. No cheap signal (no cached jest results, no committed test report) was available.

Before Phase 7 trusts a green/red signal, capture a scoped pre-change baseline on the confirmed allowlist, e.g. `CI=1 yarn test packages/app packages/core-components`.

## Proposed off-limits

Default off-limits for this run (user may override individual entries at Gate 0):

```
.git/**
.claude/**
AGENTS.md
.cursor/**
.github/copilot-instructions.md
.env
.env.*
.envrc
node_modules/**
**/node_modules/**
dist/**
**/dist/**
dist-types/**
dist-storybook/**
dist-workspace/**
build/**
.next/**
coverage/**
.yarn/**
yarn.lock
**/yarn.lock
docs/reference/**
docs/**/*.api.mdx
docs/**/*.info.mdx
**/api-report.md
**/CHANGELOG.md
packages/create-app/templates/**
.patches/**
docs/releases/**
```

Non-obvious entries and why:

- `AGENTS.md` — Symlink target of .claude/CLAUDE.md — editing it rewrites the active Claude Code project instructions.
- `**/api-report.md` — Generated by `yarn build:api-reports`; never hand-edited.
- `**/CHANGELOG.md` — Generated by changesets during release.
- `docs/reference/**, docs/**/*.api.mdx, docs/**/*.info.mdx` — Listed in .gitignore as generated API docs output.
- `packages/create-app/templates/**` — Scaffolding templates; a React refactor here changes what new adopters generate, not this app.
- `docs/releases/**` — AGENTS.md forbids editing past release notes.
- `.patches/**` — Patch-release automation; .patches/create-pr-patch.js drives git operations.

## Truncation and bounds

- Group 2: depth-2 listing returned 324 directories (235 of them workspace package roots). Recorded top-level layout plus package inventory instead of the full depth-2 dump.
- Group 3: read the root package.json, root tsconfig.json and 5 representative workspace manifests. Did not read all 278 tracked package.json files.
- Group 8: monorepo packages enumerated from the workspaces globs rather than per-package manifest reads.
- Group 7's source grep was bounded to `packages/**/src`, `plugins/**/src` and `scripts/**` and run under a 40s timeout. `os.environ` / `os.getenv` / `System.getenv` patterns were skipped — there is no Python or Java source in the repo.
- Group 9 scanned root-level compliance filenames, depth-≤3 compliance-named directories, and `.github/CODEOWNERS` team names. It did not grep document bodies.

## Gate 0 follow-ups

1. Tier 2: confirm the test command. Proposal `yarn test` is repo-wide across 235 packages; the repo itself mandates a scoped `CI=1 yarn test <path>`.
2. Tier 2: confirm the file-scope allowlist. For intent_hint=refactor on React 18, the likely scope is packages/app/src, packages/app-legacy/src, packages/core-components/src and specific plugins/\* — not the whole workspace.
3. Tier 2: confirm off-limits (see off_limits_proposed), especially AGENTS.md and packages/create-app/templates/\*\*.
4. Add `.sdlc/` to `.gitignore` — it is presently ignored only through `.git/info/exclude`, which is local to this clone and not shared.
5. Regulated-repo warning is flagged on a single weak signal (SECURITY.md); confirm or dismiss.
6. Tier 2b adaptive stack profile is required but was not built (adaptive_profile:false).
7. Pre-existing test health was NOT measured — see test_baseline.
