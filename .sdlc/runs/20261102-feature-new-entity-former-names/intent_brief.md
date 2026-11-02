# Intent Brief — feature-new — Entity former names and rename redirects

## Context

A catalog entity's URL is built from its kind, namespace and name. Renaming a service, or moving it to
another namespace, breaks every bookmark, wiki link and chat message that pointed at it, and the user
just sees "Entity not found". Other plugins that key on the entity name, such as TechDocs URLs, break
the same way. The request has been open since 2021 (backstage/backstage#5231).

- Before: opening an old link such as `/catalog/default/component/old-name` shows the "Entity not found" page.
- After: the same link lands on `/catalog/default/component/new-name` with a notice that the entity was
  renamed from `old-name`.

Discovery found no entity-level rename concept today: `refresh_state.entity_ref` is unique and a new
name mints a new `entity_id`, so nothing links an old name to a new one. See `discovery.md`, "Run context".

Original seed: "Remember an entity's former names in the Backstage catalog and redirect old entity-page
and TechDocs links to the renamed entity, with a notice."

## Goal

Let an entity declare its former names, have the catalog index and resolve them safely, and redirect old
entity-page and TechDocs links to the current entity with a "this entity was renamed" notice.

Where the work lands:

- `packages/catalog-model`: a way to declare former names, for example an annotation.
- `plugins/catalog-backend`: index former refs, resolve them in lookups without letting one entity hijack
  another's name, and handle conflicts.
- `packages/catalog-client`: a lookup method.
- `plugins/catalog` and `plugins/techdocs`: redirect from the not-found path with a notice.

Design questions the change plan must answer:

1. Who may claim a former name?
2. What happens when a new entity takes an old name?
3. What permission checks apply to the redirect target?
4. How do existing lookups stay fast?

## Gate 0 answers

- Test command: `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`
- Auth mode: `vendor`
- Policy: `argon4-plus-sonnet55`
- Existing AI setup: off-limits
- `plugins/techdocs-backend`: stays out of scope
- Performance battery: no database replica details supplied; record it as not run in the final report
- `.gitignore`: no change

## Files in scope

Confirmed at Gate 0.

- `packages/catalog-model/src/**`, `packages/catalog-model/report*.api.md`
- `packages/catalog-client/src/**` (includes generated OpenAPI client), `packages/catalog-client/report*.api.md`
- `plugins/catalog-backend/src/**` (includes `src/schema/openapi.yaml`, generated OpenAPI code and the query battery docs)
- `plugins/catalog-backend/migrations/**`, `plugins/catalog-backend/report*.api.md`, `plugins/catalog-backend/report.sql.md`
- `plugins/catalog-node/src/**`, `plugins/catalog-node/report*.api.md`
- `plugins/catalog-react/src/**`, `plugins/catalog-react/report*.api.md`
- `plugins/catalog/src/**`, `plugins/catalog/report*.api.md`
- `plugins/techdocs/src/**`, `plugins/techdocs/report*.api.md`
- `docs/features/software-catalog/**`, `docs/features/techdocs/**`
- `.changeset/*.md`

## Files off-limits

- Project defaults from `.sdlc/project.json`.
- Detected AI configs: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`.
- `docs/releases/**`.

## Acceptance criteria

- Backend tests cover former-name indexing, conflict handling and permissioned lookup.
- jsdom tests cover the redirect and notice on the entity and docs routes.
- `yarn tsc` and lint pass.

## Non-goals

- Automatic rename detection: former names are declared.
- Changing the TechDocs backend routes, storage paths or search indexing.
- Editing `docs/releases`, or ESLint, Prettier or TypeScript configuration.
