# Intent Brief — feature-new — Redirect old links when catalog entities are renamed

Pick: BS-NF-12 · Base commit `f20fd9b59828` · Branch `BS-NF-12/opus55-plus-flash38`

Seed description (command text): Remember an entity's former names in the Backstage catalog and redirect old entity-page and TechDocs links to the renamed entity, with a notice.

## Context

Problem: A catalog entity's URL is built from its kind, namespace and name, so renaming a service (or moving it to another namespace) breaks every bookmark, wiki link and chat message that pointed at it, and the user just sees "Entity not found". Other plugins that key on the entity name, such as TechDocs URLs, break the same way. Request open since 2021 (backstage/backstage#5231).

Before: opening an old link such as /catalog/default/component/old-name shows the "Entity not found" page.

## Goal

After: the same link lands on /catalog/default/component/new-name with a notice that the entity was renamed from old-name.

Where the work lands: packages/catalog-model (a way to declare former names, for example an annotation), plugins/catalog-backend (index former refs, resolve them in lookups without letting one entity hijack another's name, and handle conflicts), packages/catalog-client (lookup method), and plugins/catalog plus plugins/techdocs (redirect from the not-found path with a "this entity was renamed" notice).

Design questions to answer: who may claim a former name, what happens when a new entity takes an old name, permission checks on the redirect target, and keeping existing lookups fast.

## Files in scope

- `packages/catalog-model/**` — declare former names (annotation constant, schema/validation, well-known annotation registration)
- `packages/catalog-client/**` — lookup method for resolving a former ref
- `plugins/catalog-backend/**` — index former refs, resolve in lookups, conflict handling, permissioned lookup (includes `src/tests/performance/query-battery/` per that package's CLAUDE.md if queries/indexes change)
- `plugins/catalog/**` — entity-page redirect from the not-found path + renamed notice (old `src/components` and new `src/alpha` frontend systems)
- `plugins/techdocs/**` — docs-route redirect + renamed notice (old and new frontend systems)
- `docs/features/software-catalog/**`, `docs/features/techdocs/**` — documentation of the annotation and redirect behaviour
- `.changeset/*.md` — new changesets for affected published packages

## Files off-limits

Project defaults from `.sdlc/project.json` plus discovery's proposal: `.git/**`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.env*`, `.devcontainer/devcontainer.env`, `.mcp.json`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `.yarn/**`, `.sdlc/**`, `docs/releases/**`, `**/CHANGELOG.md`, `**/report*.api.md`, `**/report*.sql.md`, ESLint/Prettier/TS config files.

## Acceptance criteria

Acceptance criteria: backend tests for former-name indexing, conflict handling and permissioned lookup; jsdom tests for the redirect and notice on the entity and docs routes; yarn tsc and lint pass.

Check commands: `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`

## Non-goals

- Automatic rename detection is not required by the brief (former names are declared).
- No generated API reports or CHANGELOG edits by hand.
- No changes to ESLint, Prettier or TypeScript config, or to release notes.

Tests: unit tests in the backend plus jsdom tests in the frontend plugins.

## Gate 0 — approved scope (2026-10-29)

- Stack: node-typescript (accepted)
- Test command: `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`
- Auth mode: estimated
- Policy: opus55-plus-flash38
- Existing AI setup: all OFF-LIMITS
- Allowlist and off-limits: as frozen in `.sdlc/local/write-contract.json` (8 allowlist, 37 off-limits patterns)
- `.gitignore` `.sdlc/` entry: no (runner force-adds `.sdlc` at the end)
