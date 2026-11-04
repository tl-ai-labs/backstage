# Intent Brief — feature-new — Unread notifications home page card

## Context

Backstage TypeScript monorepo (Yarn workspaces). The job's brief, verbatim:

> Problem: Backstage notifications are only visible on the notifications page or via a sidebar counter, so people who land on the home page every morning miss alerts that need action (a scaffolder task failed, an entity they own has an error, a broadcast from the platform team). There is no notifications widget for the home page.
>
> Before: the home page shows no notifications; unread items are only visible on the separate notifications page.
> After: the home page shows an "Unread notifications" card listing the latest unread items with mark-as-read, and each item links to the highlighted notification.
>
> Where the work lands: plugins/notifications (new card component; deep-link handling so /notifications?id= highlights the item; live refresh via the signals plugin with a polling fallback when signals are unavailable; new-frontend-system widget registration), plus a small change in plugins/home-react so card extensions can render without app context.
>
> Acceptance criteria: jsdom tests for rendering, mark-as-read, signal-triggered refresh and the polling fallback; subscriptions and timers are cleaned up; yarn tsc and lint pass.
>
> Tests: jsdom unit tests.

What already exists (from discovery and a read of the branch):

- `@backstage/plugin-notifications` (`plugins/notifications`, version 0.5.21-next.2) provides `NotificationsApi`. It can fetch the user's notifications filtered to unread with a limit, get the unread status, and update read state for a list of ids. The `useNotificationsApi` hook wraps it.
- `NotificationsSidebarItem` and `NotificationsPage` already refresh from the `notifications` signal channel through `useSignal` from `@backstage/plugin-signals-react`. That hook also reports whether signals are available, which is what the polling fallback keys on.
- The notifications page (`NotificationsPage.tsx`) holds its filters and paging in component state and does not read the URL. Its table (`NotificationsTable.tsx`) renders each row and has no highlighted-row state. The page lives at `/notifications` (`rootRouteRef` in `src/routes.ts`).
- New frontend system home cards are home page widgets, made with `HomePageWidgetBlueprint` from `@backstage/plugin-home-react/alpha`. The search plugin already adds a widget from its own `alpha.tsx`. `@backstage/plugin-notifications` does not yet depend on `@backstage/plugin-home-react`.
- In `@backstage/plugin-home-react` (version 0.1.42-next.1), `CardExtension` in `src/extensions.tsx` calls `useApp()` to get the `Progress` component for its loading fallback. That call is what needs an app context. The package has no tests and no test dev dependencies.

Repository rules that apply (`.claude/CLAUDE.md`, `STYLE.md`, `REVIEWING.md`):

- New source files carry the Apache 2.0 header with the year 2026. Existing headers keep their year.
- Match each package's existing style.
- Prefer fewer, thorough tests. Use `screen` and `findBy*` over `waitFor`, and add no test IDs to the implementation.
- Published package changes need a changeset written by hand in `.changeset/`, one per package and written for adopters, with no internal symbol names. Both packages are below 1.0.0, so a new feature or a non-breaking fix is a `patch`.
- New behavior needs docs (TSDoc, the package README, or `/docs`), following `docs/contribute/doc-style-guide.md`.
- API reports must be regenerated for changed packages. In this repo, run `yarn tsc:full`, then `yarn build:api-reports:only plugins/notifications plugins/home-react`, then the same with `--ci`, which must exit 0. Regenerating with paths plus `--tsc` reorders translation keys and fails CI.
- Never run `yarn build`, `yarn changesets version` or `yarn release`.

## Goal

The home page shows an "Unread notifications" card listing the signed-in user's latest unread items, with mark-as-read. Each item links to the notifications page with that notification highlighted (`/notifications?id=<id>`). The card refreshes live through the signals plugin and falls back to polling when signals are unavailable. Card extensions in `@backstage/plugin-home-react` render without an app context.

## Files in scope

`plugins/notifications`:

- `plugins/notifications/src/alpha.tsx`: register the card as a new frontend system home page widget.
- `plugins/notifications/src/components/UnreadNotificationsCard/**` (new): the card component, its index and its jsdom tests.
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`: read `?id=` and pass the highlighted notification to the table.
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx` (new): jsdom test for the deep link.
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx`: highlight the requested row.
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css`: the highlighted-row style.
- `plugins/notifications/src/translation.ts`: the card's user-facing strings.
- `plugins/notifications/package.json`: add the `@backstage/plugin-home-react` dependency.
- `plugins/notifications/report-alpha.api.md`, `plugins/notifications/report.api.md`: regenerated API reports.
- `plugins/notifications/README.md`: document the card and the `?id=` deep link.
- `docs/notifications/usage.md`: document adding the card to the home page.
- `.changeset/notifications-unread-home-card.md` (new): changeset for `@backstage/plugin-notifications`.

`plugins/home-react`:

- `plugins/home-react/src/extensions.tsx`: let card extensions render without an app context.
- `plugins/home-react/src/extensions.test.tsx` (new): jsdom test rendering a card extension without an app context.
- `plugins/home-react/package.json`: test dev dependencies for the new test.
- `plugins/home-react/report.api.md`, `plugins/home-react/report-alpha.api.md`: regenerated API reports, only if regeneration changes them.
- `.changeset/home-react-card-without-app-context.md` (new): changeset for `@backstage/plugin-home-react`.

Shared:

- `yarn.lock`: the entries that follow from both `package.json` changes.

## Files off-limits

- Project defaults: `.env`, `.env.*`, `.mcp.json`, `.cursor/rules/**`, `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`.
- AI configuration found by discovery: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`.
- Secrets and local config: `.envrc`, `**/*.local.yaml`, `**/*-credentials.yaml`.
- Release notes and vendored Yarn: `docs/releases/**`, `.yarn/releases/**`, `.yarn/patches/**`.
- Not changed by this job: `plugins/notifications-backend/**`, `plugins/notifications-node/**`, `plugins/notifications-common/**`.

## Acceptance criteria

1. jsdom tests cover rendering, mark-as-read, signal-triggered refresh and the polling fallback.
2. Subscriptions and timers are cleaned up.
3. `yarn tsc` and lint pass.

Test command: `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`

## Non-goals

- No backend, storage or endpoint changes.
- No card for the old frontend system (`packages/app-legacy`, `createCardExtension`).
- No changes to the example app's home page layout (`app-config.yaml`).
- No changes to the home, signals or notifications-common/backend/node packages.
