## Conventions

- Every new .ts/.tsx file opens with the Apache 2.0 header block copied from a sibling file, with the line 'Copyright 2026 The Backstage Authors'; never change the year in an existing file's header.
- Formatting is Prettier with the Backstage config (2-space indent, single quotes, trailing commas, 80-column wrap); the prettier check's write form runs before the check, so do not hand-align.
- Named exports only, plain function components (no React.FC, no default export); the plugin's default export in src/alpha.tsx is the only exception and already exists.
- plugins/notifications uses @backstage/ui (Flex, Text, ButtonIcon), @remixicon/react icons, @backstage/core-components (InfoCard, Link, Progress, ErrorPanel) and CSS modules wrapped in '@layer components { ... }'; it never imports @material-ui/* and never uses makeStyles.
- Do not write raw <span>, <p> or <button> JSX elements (the repo lint warns on them): use Text from @backstage/ui for text and ButtonIcon for icon buttons.
- In plugins/notifications, useTranslationRef is imported from '@backstage/core-plugin-api/alpha' and every user-facing string comes from notificationsTranslationRef in src/translation.ts via t('<dotted key>').
- Inside plugins/notifications, import siblings by relative path: '../../api' (notificationsApiRef, types), '../../hooks' (useNotificationsApi), '../../routes' (rootRouteRef), '../../translation' (notificationsTranslationRef).
- react-use is imported by deep path ('react-use/esm/<hook>'); react-router-dom hooks are imported from 'react-router-dom' (a peer dependency of both packages).
- Tests are Jest via backstage-cli with describe/it, colocated as X.test.tsx; use screen and findBy* queries, never waitFor, never test ids; prefer a few thorough tests with several assertions each.
- Tests mock Utility APIs with TestApiProvider from @backstage/test-utils (apis={[[ref, impl]]}, impl only needs the methods used) and render with renderInTestApp from @backstage/test-utils unless the test is about having no app context; clicks use fireEvent.click from @testing-library/react, and timer advances or signal deliveries are wrapped in act from @testing-library/react.
- Changesets are hand-written markdown files in .changeset/ with front matter `'<package>': patch`, one package per file, written for adopters in plain language with no internal function, component, hook or variable names.
- Docs follow docs/contribute/doc-style-guide.md: present tense, active voice, address the reader as 'you', code style for package names, paths, extension IDs and config keys, sentence-case headings.

## Decisions

- How the card is exposed: Only as a new frontend system home page widget registered in src/alpha.tsx; the component is not re-exported from src/index.ts or src/components/index.ts, so the package's public API gains no new symbol except the new translation keys and one optional NotificationsTable prop. (not export UnreadNotificationsCard from the package index; not also add a legacy createCardExtension card) — The brief scopes a new frontend system widget only; a public component would need its own API surface review and src/components/index.ts is outside the allowlist.
- Card component structure: UnreadNotificationsCard.tsx exports UnreadNotificationsCardContent (list, states and the View all link, no card chrome) and UnreadNotificationsCard (an InfoCard titled t('unreadNotificationsCard.title') wrapping the content); the widget registers UnreadNotificationsCardContent as its Content part and passes the static title 'Unread notifications'. (not one component that renders its own InfoCard and is also the widget Content (double card header inside CardExtension); not widget without a title (FR-10 requires it)) — CardExtension already draws an InfoCard with the widget title, while FR-2 and AC-1 need a translated title when the card renders on its own.
- Refresh mechanics in the card: useNotificationsApi fetches; a boolean refresh state is set true by a new lastSignal, by each polling tick, and after a successful mark-as-read; an effect calls retry() and resets refresh to false only when refresh is true and loading is false (the NotificationsPage pattern, without throttle). (not calling retry() directly from the signal effect (retry is a no-op while loading and its identity changes every render); not a custom hook file for polling) — Keeps every refetch path on one well-tested mechanism and needs no new file.
- Polling fallback: When useSignal reports isSignalsAvailable false, one setInterval with period Math.max(pollingIntervalMs ?? 60000, 10000) sets refresh to true; the effect depends on [isSignalsAvailable, interval] and its cleanup calls clearInterval; when signals are available no interval is created. (not setTimeout chains; not polling even when signals are available) — FR-7, FR-8 and NFR-3: one timer, cleared on unmount, never faster than 10 s.
- Deep link and highlighted row: NotificationsPage reads useSearchParams().get('id') and passes it as highlightedNotificationId to NotificationsTable; the table puts className styles.highlighted and aria-current="true" on the compact-data column's outer Flex of the matching notification only. (not material-table options.rowStyle (inline style, not a CSS module class); not overriding the table's Row component; not auto-scrolling or changing filters to find the id) — FR-12 wants a CSS module class plus an accessible marker with no other behavior change; the content cell is the only place the table renders per-row JSX.
- CardExtension without an app context: A private hook in extensions.tsx calls useApp().getComponents().Progress inside try/catch and returns Progress from @backstage/core-components when useApp throws; CardExtension uses that hook instead of calling useApp directly. (not a hand-written progress element; not a new optional prop on CardExtension) — FR-13 keeps the app's Progress when an app context exists and changes no public signature; @backstage/core-components is already a dependency, and core-plugin-api's useOptionalApiHolder uses the same try/catch hook shape.
- Widget extension name: HomePageWidgetBlueprint.make({ name: 'unread-notifications', params: { name: 'UnreadNotificationsCard', title: 'Unread notifications', description: 'Shows your latest unread notifications.', components: ... } }), giving extension ID home-page-widget:notifications/unread-notifications. — Matches the search plugin's widget naming (name 'search-bar', params.name 'HomePageSearchBar'), and the docs cite the resulting ID.
- New translation keys: Under messages.unreadNotificationsCard: title 'Unread notifications', emptyMessage 'No unread notifications', markAsRead 'Mark as read', viewAll 'View all notifications', errors.fetchFailed 'Failed to load unread notifications', errors.markAsReadFailed 'Failed to mark notification as read'. — One namespace per component, as the file already does for sidebar, table and settings; tests assert these exact English strings.
- Mark-as-read failure handling: On a rejected updateNotifications the card posts toastApi.post({ title: t('unreadNotificationsCard.errors.markAsReadFailed'), status: 'danger' }) via useApi(toastApiRef) from @backstage/frontend-plugin-api and does not refetch; tests provide [toastApiRef, { post: jest.fn() }]. (not alertApi; not swallowing the error) — NotificationsTable and the sidebar item already report notification update failures through the toast API.
- Test dependencies: No @testing-library/user-event: clicks use fireEvent.click, which react-aria treats as a virtual press; plugins/home-react gains devDependencies @backstage/test-utils, @testing-library/dom, @testing-library/jest-dom and @testing-library/react, and its test imports '@testing-library/jest-dom' itself because src/setupTests.ts is outside the allowlist. — Smallest dependency and lockfile change that runs the required jsdom tests.
- API report regeneration: Run `yarn tsc:full && yarn build:api-reports:only plugins/notifications plugins/home-react` after all source changes, then validate with the same command plus --ci; never use build:api-reports (it adds --tsc) with paths. (not yarn build:api-reports plugins/notifications plugins/home-react) — In this repo, paths plus --tsc reorders translation keys and fails the CI check (intent brief).

## Files of this change

- `plugins/notifications/package.json` (U01, edit)
- `plugins/home-react/package.json` (U02, edit)
- `plugins/notifications/src/translation.ts` (U04, edit) — import: `import { notificationsTranslationRef } from '../../translation';`
  - `const (changed) notificationsTranslationRef(): TranslationRef with new keys unreadNotificationsCard.title, .emptyMessage, .markAsRead, .viewAll, .errors.fetchFailed, .errors.markAsReadFailed`
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` (U05, edit)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (U06, edit) — import: `import { NotificationsTable } from '../NotificationsTable';`
  - `optional type field NotificationsTableProps.highlightedNotificationId(): string | undefined`
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` (U07, edit)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx` (U08, create) — import: `import { UnreadNotificationsCard, UnreadNotificationsCardContent } from './UnreadNotificationsCard';`
  - `type UnreadNotificationsCardProps(): { limit?: number; pollingIntervalMs?: number }`
  - `function component UnreadNotificationsCardContent(props: UnreadNotificationsCardProps): JSX.Element`
  - `function component UnreadNotificationsCard(props: UnreadNotificationsCardProps): JSX.Element`
- `plugins/notifications/src/components/UnreadNotificationsCard/index.ts` (U09, create) — import: `import('./components/UnreadNotificationsCard')`
  - `re-export UnreadNotificationsCard(): function component`
  - `re-export UnreadNotificationsCardContent(): function component`
  - `type re-export UnreadNotificationsCardProps(): type`
- `plugins/notifications/src/alpha.tsx` (U10, edit)
- `plugins/home-react/src/extensions.tsx` (U11, edit)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.test.tsx` (U12, create)
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx` (U13, create)
- `plugins/home-react/src/extensions.test.tsx` (U14, create)
- `plugins/notifications/README.md` (U16, edit)
- `docs/notifications/usage.md` (U17, edit)
- `.changeset/notifications-unread-home-card.md` (U18, create)
- `.changeset/home-react-card-without-app-context.md` (U19, create)
