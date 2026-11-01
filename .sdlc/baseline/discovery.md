# Discovery baseline

Project-wide copy from run `20261101-102810-feature-new-home-notifications-card`, built 2026-11-01. HEAD `fe6ace679f34`.

## Git state
- HEAD `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on `BS-NF-09/opus55-only`. No tracked changes; only `.sdlc/` is untracked.
- Remotes: `origin` is `tl-ai-labs/backstage`, `upstream` is `backstage/backstage`.
- Linked worktree of `/Users/apple/Documents/GitHub/backstage`, one of seven sharing that git directory and stash.
- HEAD is 952 commits behind `origin/master`, with none ahead. `yarn lint` runs with `--since origin/master`, so its
  base is wide here.
- `gitignore_covers_sdlc: false`.

## Directory topology
TypeScript monorepo. 71 directories under `packages/`, 160 under `plugins/`, plus `docs/`, `docs-ui/`, `microsite/`,
`beps/`, `contrib/`, `scripts/` and `workspaces/ui/`.

## Detected stacks
- `package.json`: node-typescript. Backstage, React (60 workspace packages), Express (45). Yarn 4.8.1, Node 22 or 24
  (local Node is v24.22.1).
- `docs-ui/package.json`: Next.js and React, outside the root workspaces.
- `microsite/package.json`: Docusaurus and React, outside the root workspaces.
- No pre-authored adapter fits, so the Tier 2b profile was built at `.sdlc/baseline/stack-profile.md`.

## Test command
Proposed `CI=1 yarn test <path>`, for example `CI=1 yarn test plugins/notifications`. Source: `package.json#scripts.test`,
with the path-scoped form required by `.claude/CLAUDE.md`. Not run during discovery; Gate 0 should confirm it.

## Docs
`README.md` and four translations, `AGENTS.md` (the canonical instructions), `.claude/CLAUDE.md` (symlink to it),
`CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/`.

## Detected AI/agent setup
- `.claude/`, `.claude/skills/`, `.claude/settings.local.json` (gitignored)
- `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`, both symlinks to `AGENTS.md` inside the repo
- `.cursor/`, `.cursor/rules/` (including `tests/*.mdc`)
- `.github/copilot-instructions.md`
- `plugins/catalog-backend/CLAUDE.md`
- Not found: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*` config

## Env files
No `.env*` files exist anywhere outside ignored build and dependency folders, so `env_keys_by_file` is empty. 71
env variable names are referenced in code, names only, recorded in `baseline.json`.

## Monorepo, submodules, LFS
- Yarn workspaces `packages/*` and `plugins/*`: 230 packages. `docs-ui`, `microsite` and `workspaces/ui` sit outside.
- Submodules: none. LFS: none in the repo (no `.gitattributes`). The `filter.lfs.*` settings come from git config, not
  from repo patterns.
- Encrypted secrets: none found. No `.gitattributes`, no git-crypt or SOPS markers, no tracked key or vault files. Name
  matches were limited to `plugins/kubernetes-react/src/__fixtures__/{1,2}-secrets.json`, which were not opened.
- Infra: `packages/backend/Dockerfile`, `docker-compose.deps.yml`, `contrib/terraform`, 49 GitHub workflow entries.

## .gitignore review
Conventional, not aggressive for this work. No nested `.gitignore` in the home, notifications or signals plugins.
Broad patterns to keep in mind when naming new paths: `logs`, `site`, `dist`, `coverage`, `.cache`, `typings/`,
`docs.json`, `knip.json`, `*.local.yaml`, `*-credentials.yaml`, `docs/**/sidebar.ts`, `docs/reference`. Two tracked
files match ignore rules, both ESLint fixtures under `packages/eslint-plugin/src/__fixtures__/`.

## Other repo-state notes
- `node_modules` was installed 2026-10-29, while `yarn.lock` was last written 2026-11-01. The lockfile matches HEAD, but
  whether the install is current was not verified.
- `dist-types/` at the root is ignored output from 2026-10-29.
- The commit hook is `yarn lint-staged`, through `core.hooksPath` `.husky/_`. It can rewrite staged files, regenerate
  `catalog-info.yaml` and sort `package.json`.
- `.changeset/pre.json` is present with mode `exit` and tag `next`.

## Regulated-repo signals
- `security-policy-doc`: `SECURITY.md`. It is a vulnerability-reporting policy, not evidence of regulation, but the flag
  is set by rule. No other signals were found, and CODEOWNERS has no matching teams.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.

## Proposed off-limits
`.env`, `.env.*`, `.env.local`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`,
`plugins/catalog-backend/CLAUDE.md`, `node_modules/**`, `packages/*/node_modules/**`, `plugins/*/node_modules/**`,
`dist/**`, `packages/*/dist/**`, `plugins/*/dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`,
`third_party/**`, `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `.git/**`.

Patterns are anchored because `dist` and `build` also appear as tracked fixture and source folders, such as
`packages/cli-module-build/src/commands/package/build`. `AGENTS.md` is included because two AI config files link to it.
`report*.api.md` is left out because `yarn build:api-reports` must regenerate it.

Also from `.claude/CLAUDE.md`, recorded in `project_write_constraints`: do not change `docs/releases/**` or ESLint,
Prettier and TypeScript config unless asked.
