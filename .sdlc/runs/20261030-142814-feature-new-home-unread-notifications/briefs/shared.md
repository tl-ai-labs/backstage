## Conventions

- Every new .ts/.tsx file starts with the Apache 2.0 header block exactly as in existing files, with the line 'Copyright 2026 The Backstage Authors'; never change the year on existing files.
- Formatting is Prettier with the Backstage config (@backstage/cli/config/prettier): 2-space indent, single quotes, trailing commas, 80-column wrap, arrow-function parameters without parentheses when single (e.g. m => m.Content).
- Never import React as a default import; import named hooks and types from 'react' (e.g. import { useCallback, useEffect, useState } from 'react').
- plugins/notifications UI uses @backstage/ui (Flex, Text, ButtonIcon) and @remixicon/react icons, plus @backstage/core-components (Link, Progress); it does not add new Material UI imports.
- plugins/notifications components translate with: import { useTranslationRef } from '@backstage/core-plugin-api/alpha'; and import { notificationsTranslationRef } from '../../translation'; then const { t } = useTranslationRef(notificationsTranslationRef).
- plugins/notifications components read APIs with useApi from '@backstage/core-plugin-api', build routes with useRouteRef(rootRouteRef)() from '@backstage/core-plugin-api' and '../../routes', and post toasts through toastApiRef from '@backstage/frontend-plugin-api'.
- plugins/home-react keeps Material UI v4 path imports (e.g. '@material-ui/core/IconButton') and @backstage/core-components; it adds no new runtime dependency.
- Tests use Jest with React Testing Library: describe/it, jest.fn(), screen with findBy*/getBy*/queryBy* queries, fireEvent and act from '@testing-library/react'; prefer findBy* over waitFor; never add data-testid or test ids to implementation code; prefer fewer thorough tests with several assertions.
- plugins/notifications tests render with renderInTestApp and TestApiProvider from '@backstage/test-utils' and mount rootRouteRef at '/notifications' through the mountedRoutes option; jest-dom matchers come from the package's src/setupTests.ts.
- Every API a component under test calls is mocked through TestApiProvider (the repo rejects frontend network requests in tests).
- Tests that use jest.useFakeTimers() restore real timers in an afterEach(() => jest.useRealTimers()).
- Public exports carry a TSDoc release tag; nothing new is added to src/index.ts of either package; the generated report\*.api.md, CHANGELOG.md and docs/releases files are never edited.
- Changesets are hand-written .changeset/<kebab-slug>.md files with front matter '<package name>': patch and one or two sentences addressed to Backstage adopters that name no internal function, class or variable.
- Documentation follows docs/contribute/doc-style-guide.md: present tense, active voice, address the reader as 'you', code style for package names, extension IDs, paths and query parameters, bold for UI elements, yaml/tsx language tags on code blocks.

## Decisions

- Card placement and naming: The card lives in plugins/notifications/src/components/UnreadNotificationsCard/ (UnreadNotificationsCard.tsx exporting UnreadNotificationsCardContent, plus an index.ts barrel) and is not re-exported from src/components/index.ts or src/index.ts. (not a src/homePageComponents/<Name>/Content.tsx folder as in plugins/home; not a public root export or legacy createCardExtension export) — Matches the notifications package's own components/<Name>/ layout, and Q1 keeps the card new-frontend-system only with no public API addition.
- Widget registration identity: HomePageWidgetBlueprint.make with name 'unread-notifications' (extension ID home-page-widget:notifications/unread-notifications), params.name 'HomePageUnreadNotifications', params.title 'Unread notifications', params.description 'Shows your latest unread notifications', enabled by default, no settings schema and no layout hints. (not disabled: true by default; not configurable item limit or polling interval through card settings) — Follows the search-bar and home widgets (enabled, HomePage\* component name) and Q2 fixes the limit and interval as constants.
- Fixed limits: Item limit is the exported constant UNREAD_NOTIFICATIONS_LIMIT = 5 and the polling interval is the exported constant UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS = 60000, both declared in UnreadNotificationsCard.tsx. (not props or app-config values) — Q2 resolved to fixed constants; exporting them from the module (not the package) lets tests refer to the same numbers.
- How the card refreshes: A numeric refreshKey state is the only dependency of the card's useNotificationsApi call; a stable refresh callback (useCallback with []) increments it; signals, the polling timer and mark-as-read all call refresh. (not calling useAsyncRetry's retry from an effect; not the page's throttled refresh-flag pattern) — retry changes identity whenever loading flips and is a no-op while loading, so effects depending on it loop or drop refreshes; a dependency change re-runs the fetch, discards stale results and never sets state after unmount.
- Signals versus polling: useSignal<NotificationSignal>('notifications') from '@backstage/plugin-signals-react'; an effect on [lastSignal, refresh] calls refresh when lastSignal?.action is set; a second effect on [isSignalsAvailable, refresh] starts setInterval(refresh, UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS) only when isSignalsAvailable is false and returns a cleanup that clears it. (not polling in addition to signals; not throttling signal refreshes) — FR-6 to FR-8 and NFR-3: no polling when signals exist, one request per interval otherwise, timer cleared on unmount or when signals appear.
- Card title translation: The blueprint's params.title stays the literal 'Unread notifications' (blueprint params are static and cannot call hooks, as in every plugins/home widget); the translated unreadNotificationsCard.title is the aria-label of the card's list. (not dropping the InfoCard title and rendering a translated heading inside Content; not a custom Renderer through componentProps) — Keeps the widget catalog listing and the home grid heading working while every string the card renders comes from notificationsTranslationRef.
- New translation keys: notificationsTranslationRef gains unreadNotificationsCard: { title: 'Unread notifications', emptyMessage: 'You have no unread notifications', markAsRead: 'Mark as read', errorMessage: 'Failed to load unread notifications', markAsReadFailed: 'Failed to mark notification as read' }, inserted between the sidebar and settings blocks; severity labels reuse the existing filters.severity.\* keys. (not reusing sidebar.errors.markAsReadFailed; not new severity label keys) — One namespace per UI surface as the ref already does; severity words already exist.
- Deep-link highlight mechanics: NotificationsPage reads id with useSearchParams from 'react-router-dom' and passes it as a new optional NotificationsTable prop highlightedNotificationId; the table marks the matching row's content Flex with aria-current="true" and the CSS module class highlighted, and scrolls it into view once per id through a ref callback that calls element.scrollIntoView?.({ block: 'center' }). (not the table reading the URL itself; not material-table rowStyle; not a data-testid on the row) — The table is a public component other pages reuse, so the URL stays the page's concern; aria-current gives tests and assistive technology a semantic marker; the optional chaining keeps jsdom (no scrollIntoView) from throwing.
- Public API report drift: The new optional NotificationsTableProps field, the new translation messages and the new alpha widget change report.api.md and report-alpha.api.md of @backstage/plugin-notifications; this run does not regenerate them and the person runs yarn build:api-reports before a PR. (not hand-editing report files) — Report files are off-limits and generated (Q3).
- Mark-as-read failure: The card's mark-as-read calls notificationsApi.updateNotifications({ ids: [id], read: true }), then refresh when still mounted; on rejection it posts toastApi.post({ title: t('unreadNotificationsCard.markAsReadFailed'), status: 'danger' }). (not rendering an inline error; not optimistic removal before the request resolves) — Matches NotificationsSidebarItem's toast handling and keeps the list sourced from the server.
- Card extension loading fallback: CardExtension in plugins/home-react uses Progress from '@backstage/core-components' as both Suspense fallbacks and no longer imports or calls useApp. (not Progress swappable component from '@backstage/frontend-plugin-api'; not try/catch around useApp) — core-components is already a dependency and its Progress needs only a MUI theme, so a card renders with no app context and no API beyond what useTranslationRef needs; no export changes (FR-15).
- home-react test dependencies: plugins/home-react/package.json gains devDependencies @backstage/test-utils workspace:^, @testing-library/dom ^10.0.0, @testing-library/jest-dom ^6.0.0 and @testing-library/react ^16.0.0, and its test file imports '@testing-library/jest-dom' itself; no setupTests.ts is added. (not adding src/setupTests.ts; not testing through plugins/home) — home-react has no test tooling today; the lint rule for undeclared imports needs these declared, and one test file does not justify a setup file.
- Dependency install: After both package.json edits, one tooling step runs yarn install from the repo root and writes yarn.lock. — yarn.lock is the package manager's file, never typed.

## Files of this change

- `plugins/home-react/src/extensions.tsx` (U01, edit)
- `plugins/home-react/package.json` (U02, edit)
- `plugins/notifications/package.json` (U03, edit)
- `plugins/home-react/src/extensions.test.tsx` (U05, create)
- `plugins/notifications/src/translation.ts` (U06, edit)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx` (U07, create) — import: `import { UnreadNotificationsCardContent, UNREAD_NOTIFICATIONS_LIMIT, UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS } from './UnreadNotificationsCard';`
  - `function component UnreadNotificationsCardContent(): JSX.Element`
  - `const UNREAD_NOTIFICATIONS_LIMIT(): number`
  - `const UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS(): number`
- `plugins/notifications/src/components/UnreadNotificationsCard/index.ts` (U08, create) — import: `import('./components/UnreadNotificationsCard')`
  - `re-export UnreadNotificationsCardContent(): JSX.Element`
- `plugins/notifications/src/alpha.tsx` (U09, edit)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.test.tsx` (U10, create)
- `plugins/notifications/src/alpha.test.ts` (U11, create)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` (U12, edit)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (U13, edit)
  - `type (changed) NotificationsTableProps(): adds highlightedNotificationId?: string`
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` (U14, edit)
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx` (U15, create)
- `plugins/notifications/README.md` (U16, edit)
- `docs/notifications/usage.md` (U17, edit)
- `.changeset/notifications-unread-home-card.md` (U18, create)
- `.changeset/home-react-card-fallback-without-app-context.md` (U19, create)
