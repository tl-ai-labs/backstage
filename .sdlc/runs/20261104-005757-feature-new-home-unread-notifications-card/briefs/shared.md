## Conventions

- Begin every newly created .ts or .tsx file with the Backstage Apache-2.0 license header dated 2026 (Copyright 2026 The Backstage Authors).
- Format code with 2-space indentation, single quotes, trailing commas, and semicolons matching @backstage/cli/config/prettier.
- Use named exports with explicit @public or @alpha TSDoc release tags on all exported symbols re-exported from package entrypoints.
- Import useTranslationRef from @backstage/core-plugin-api/alpha in plugins/notifications components and consume notificationsTranslationRef.
- Never add data-testid or test-only attributes or use *ByTestId queries in components or tests; use accessible roles, labels, and text with screen and findBy* queries.
- In the new home card component, clean up any polling timers (clearInterval) and subscriptions created by the card in React useEffect cleanup functions on unmount; do not modify existing throttle or effect code in NotificationsPage or NotificationsTable.
- Only import packages declared in the respective package.json dependencies, devDependencies, or peerDependencies.

## Decisions

- CardExtension Progress fallback outside AppContext: Wrap useApp().getComponents().Progress in a try/catch inside CardExtension and fall back to Progress from @backstage/core-components when useApp() throws (not Requiring callers to wrap CardExtension in TestApp; not Replacing app.getComponents().Progress unconditionally) — Preserves custom app Progress components when inside a Backstage AppContext while allowing CardExtension and createCardExtension cards to render in isolated unit tests without an AppContext.
- Unread notifications home card naming and exports: Place component in plugins/notifications/src/components/HomePageUnreadNotifications, export Content and HomePageUnreadNotificationsProps from its index.ts, export HomePageUnreadNotifications card extension from plugin.ts and src/index.ts, and export type HomePageUnreadNotificationsProps from src/components/index.ts (not Exporting raw non-extension card component from src/index.ts under the same name; not Hardcoding card without createCardExtension) — Matches Backstage home card extension conventions (createCardExtension in plugin.ts, type export in components/index.ts) and avoids duplicate export collisions in src/index.ts.
- New frontend system widget registration: Create unreadNotificationsWidget via HomePageWidgetBlueprint.make in plugins/notifications/src/alpha.tsx with name 'unread-notifications' and params.name 'HomePageUnreadNotifications' and include it in createFrontendPlugin extensions (not Creating a separate home plugin module; not Omitting widget from default extensions array) — Follows plugins/search/src/alpha.tsx pattern for contributing a HomePageWidgetBlueprint from a feature plugin.
- Live signal refresh and polling fallback in HomePageUnreadNotifications: Subscribe via useSignal<NotificationSignal>('notifications'); refresh on new_notification, notification_read, or notification_unread actions; when isSignalsAvailable === false, poll with setInterval (default 10000ms, configurable via pollingIntervalMs prop) and clear interval on unmount (not Polling unconditionally when signals are active; not Ignoring notification_read and notification_unread signal actions) — Satisfies FR-5, FR-6, and NFR-6 by avoiding redundant polling when signals are active and cleaning up intervals on unmount.
- Deep-linking and row highlighting for ?id=<id>: Link card items to `${notificationsRootRoute()}?id=${encodeURIComponent(notification.id)}` via useRouteRef(rootRouteRef); read searchParams.get('id') in NotificationsPage (and as fallback in NotificationsTable via optional highlightedId prop) and apply visual styling via Table options.rowStyle and a CSS class on the matching row (not Hardcoding /notifications path string; not Adding test-only DOM attributes or mutating backend filter API for highlighting) — Resolves routes through Backstage route refs and makes the highlighted row visually distinguishable through user-visible styling without test-only attributes or backend changes.

## Files of this change

- `plugins/home-react/src/extensions.tsx` (U01, edit) — import: `import { CardExtension, createCardExtension } from './extensions';`
  - `function CardExtension(props: CardExtensionComponentProps<T>): JSX.Element`
- `plugins/home-react/src/extensions.test.tsx` (U02, create)
- `plugins/notifications/package.json` (U03, edit)
- `plugins/notifications/src/translation.ts` (U05, edit) — import: `import { notificationsTranslationRef } from '../../translation';`
  - `const notificationsTranslationRef(): TranslationRef<'plugin.notifications', any>`
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` (U06, edit) — import: `import styles from './NotificationsTable.module.css';`
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (U07, edit) — import: `import { NotificationsTable, NotificationsTableProps } from './NotificationsTable';`
  - `type NotificationsTableProps(): NotificationsTableProps`
  - `function NotificationsTable(input: NotificationsTableProps): JSX.Element`
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` (U08, edit) — import: `import { NotificationsPage, NfsNotificationsPage, NotificationsPageProps } from './NotificationsPage';`
  - `type NotificationsPageProps(): NotificationsPageProps`
  - `function NotificationsPage(props: NotificationsPageProps | undefined): JSX.Element`
  - `function NfsNotificationsPage(props: NotificationsPageProps | undefined): JSX.Element`
- `plugins/notifications/src/components/HomePageUnreadNotifications/HomePageUnreadNotifications.tsx` (U09, create) — import: `import { Content, HomePageUnreadNotificationsProps } from './HomePageUnreadNotifications';`
  - `type HomePageUnreadNotificationsProps(): HomePageUnreadNotificationsProps`
  - `function Content(props: HomePageUnreadNotificationsProps): JSX.Element`
- `plugins/notifications/src/components/HomePageUnreadNotifications/index.ts` (U10, create) — import: `import { Content, type HomePageUnreadNotificationsProps } from './components/HomePageUnreadNotifications';`
  - `function Content(props: HomePageUnreadNotificationsProps): JSX.Element`
  - `type HomePageUnreadNotificationsProps(): HomePageUnreadNotificationsProps`
- `plugins/notifications/src/components/index.ts` (U11, edit) — import: `import type { HomePageUnreadNotificationsProps } from './components';`
  - `type HomePageUnreadNotificationsProps(): HomePageUnreadNotificationsProps`
- `plugins/notifications/src/plugin.ts` (U12, edit) — import: `import { notificationsPlugin, NotificationsPage, HomePageUnreadNotifications } from './plugin';`
  - `const HomePageUnreadNotifications(props: CardExtensionProps<HomePageUnreadNotificationsProps>): JSX.Element`
- `plugins/notifications/src/index.ts` (U13, edit) — import: `import { HomePageUnreadNotifications, type HomePageUnreadNotificationsProps } from '@backstage/plugin-notifications';`
  - `const HomePageUnreadNotifications(props: CardExtensionProps<HomePageUnreadNotificationsProps>): JSX.Element`
- `plugins/notifications/src/alpha.tsx` (U14, edit) — import: `import notificationsPlugin from '@backstage/plugin-notifications/alpha';`
  - `const default(): OverridableFrontendPlugin`
- `plugins/notifications/src/components/HomePageUnreadNotifications/HomePageUnreadNotifications.test.tsx` (U15, create)
- `.changeset/notifications-unread-home-card.md` (U18, create)
- `.changeset/home-react-card-fallback.md` (U19, create)
- `plugins/notifications/README.md` (U20, edit)
- `docs/notifications/usage.md` (U21, edit)
- `docs/notifications/usage--old.md` (U22, edit)
