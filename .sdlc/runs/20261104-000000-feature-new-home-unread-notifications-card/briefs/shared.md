## Conventions

- Every new TypeScript/TSX source file must start with the standard Backstage Apache-2.0 license header dated 2026; existing modified files must keep their original copyright year.
- Use Prettier formatting (@backstage/cli/config/prettier: single quotes, trailing commas, 2-space indentation) and pass ESLint (@backstage/eslint-plugin rules including @backstage/no-undeclared-imports and react-hooks/rules-of-hooks).
- All user-facing strings in @backstage/plugin-notifications must be defined in notificationsTranslationRef (plugins/notifications/src/translation.ts) and accessed via useTranslationRef from @backstage/core-plugin-api/alpha.
- Unit tests run in Jest (jsdom) via backstage-cli package test; in plugins/notifications use @testing-library/react screen/findBy* queries and renderInTestApp/TestApiProvider from @backstage/test-utils without data-testid attributes or real network calls; in plugins/home-react only import packages declared in plugins/home-react/package.json (such as react and react-dom/client).

## Decisions

- AppContext-free CardExtension rendering in @backstage/plugin-home-react: In plugins/home-react/src/extensions.tsx, import Progress as DefaultProgress from @backstage/core-components and translationApiRef/useApiHolder from @backstage/frontend-plugin-api, falling back to DefaultProgress when useApp() throws and to default 'Settings' text when translationApiRef is absent from ApiHolder. (not Requiring legacy AppContext via unconditional useApp() call; not Adding @backstage/test-utils to plugins/home-react/package.json (out of allowlist scope)) — Allows CardExtension and HomePageWidgetBlueprint widgets to render in environments and tests without legacy AppContext or full ApiProvider while preserving custom Progress override when AppContext is present.
- Unread notifications card component structure and exports: Create plugins/notifications/src/components/HomePageUnreadNotifications/HomePageUnreadNotifications.tsx exporting Content and HomePageUnreadNotificationsProps, re-exported via HomePageUnreadNotifications/index.ts, wired as HomePageUnreadNotifications via createCardExtension in src/plugin.ts (and src/index.ts) and as homePageUnreadNotificationsWidget via HomePageWidgetBlueprint.make({ name: 'unread-notifications', ... }) in src/alpha.tsx. (not Exporting only a raw InfoCard component without createCardExtension or HomePageWidgetBlueprint; not Creating a separate hook file for signal/polling refresh only used by one component) — Follows the exact @backstage/plugin-home-react card extension and alpha widget blueprint conventions used in @backstage/plugin-home while keeping the file set minimal.
- Live refresh via signals with polling fallback and cleanup: Inside HomePageUnreadNotifications Content, subscribe with useSignal<NotificationSignal>('notifications'); when isSignalsAvailable is true and lastSignal updates, invoke retryRef.current(); when isSignalsAvailable is false and pollingIntervalMs > 0 (default 10000), run setInterval calling retryRef.current() and clearInterval on unmount or dependency change. (not Polling unconditionally even when signals are available; not Putting retry directly in useEffect dependency arrays causing re-subscription loops) — Satisfies real-time signal refresh when signalApiRef is registered, degrades gracefully to timer polling when unavailable, and guarantees subscription and timer cleanup on unmount.
- Deep-link URL format and highlight handling on NotificationsPage and NotificationsTable: Each card item links to `${notificationsRoute}?id=${encodeURIComponent(notification.id)}`; NotificationsPage and NotificationsTable readsearchParams.get('id') via useSearchParams from react-router-dom (plus optional highlightedId prop on NotificationsTableProps) and highlight the matching row with styles.highlightedRow, aria-current='true', and Table rowStyle. (not Using route path parameters (/notifications/:id) which would break existing rootRouteRef mounting; not Highlighting only in NotificationsPage without support in NotificationsTable) — Preserves the existing /notifications route structure while enabling both NotificationsPage and standalone NotificationsTable renders to visually and semantically highlight the targeted notification.
- Translation keys for the unread notifications card: Add homePageCard: { title: 'Unread notifications', emptyMessage: 'No unread notifications', markAsRead: 'Mark as read', errors: { markAsReadFailed: 'Failed to mark notification as read' } } to notificationsTranslationRef in plugins/notifications/src/translation.ts. (not Hardcoding English strings in HomePageUnreadNotifications.tsx) — Centralizes all card text, accessible button labels, and error toast messages in notificationsTranslationRef.

## Files of this change

- `plugins/home-react/src/extensions.tsx` (U01, edit) — import: `import { CardExtension, createCardExtension } from './extensions';`
  - `function createCardExtension(options: { title?: string; components: () => Promise<ComponentParts>; name?: string; description?: string; layout?: CardLayout; settings?: CardSettings }): Extension<(props: CardExtensionProps<T>) => JSX.Element>`
  - `function CardExtension(props: CardExtensionComponentProps<T>): JSX.Element`
- `plugins/notifications/package.json` (U02, edit)
- `plugins/notifications/src/translation.ts` (U04, edit) — import: `import { notificationsTranslationRef } from './translation';`
  - `const notificationsTranslationRef(): TranslationRef`
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` (U05, edit)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (U06, edit) — import: `import { NotificationsTable } from '../NotificationsTable';`
  - `const NotificationsTable(props: NotificationsTableProps): JSX.Element`
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` (U07, edit) — import: `import { NotificationsPage, NfsNotificationsPage } from './components/NotificationsPage';`
  - `const NotificationsPage(props: NotificationsPageProps): JSX.Element`
  - `const NfsNotificationsPage(props: NotificationsPageProps): JSX.Element`
- `plugins/notifications/src/components/HomePageUnreadNotifications/HomePageUnreadNotifications.tsx` (U08, create) — import: `import { Content, type HomePageUnreadNotificationsProps } from './HomePageUnreadNotifications';`
  - `type HomePageUnreadNotificationsProps(): { limit?: number; pollingIntervalMs?: number }`
  - `const Content(props: HomePageUnreadNotificationsProps): JSX.Element`
- `plugins/notifications/src/components/HomePageUnreadNotifications/index.ts` (U09, create) — import: `import { Content, type HomePageUnreadNotificationsProps } from './components/HomePageUnreadNotifications';`
  - `const Content(props: HomePageUnreadNotificationsProps): JSX.Element`
  - `type HomePageUnreadNotificationsProps(): { limit?: number; pollingIntervalMs?: number }`
- `plugins/notifications/src/components/index.ts` (U10, edit) — import: `import type { HomePageUnreadNotificationsProps } from './components';`
  - `type HomePageUnreadNotificationsProps(): { limit?: number; pollingIntervalMs?: number }`
- `plugins/notifications/src/plugin.ts` (U11, edit) — import: `import { HomePageUnreadNotifications } from './plugin';`
  - `const HomePageUnreadNotifications(props: CardExtensionProps<HomePageUnreadNotificationsProps>): JSX.Element`
- `plugins/notifications/src/index.ts` (U12, edit) — import: `import { HomePageUnreadNotifications } from '@backstage/plugin-notifications';`
  - `const HomePageUnreadNotifications(props: CardExtensionProps<HomePageUnreadNotificationsProps>): JSX.Element`
- `plugins/notifications/src/alpha.tsx` (U13, edit) — import: `import notificationsPlugin from '@backstage/plugin-notifications/alpha';`
  - `const default(): OverridableFrontendPlugin`
- `plugins/home-react/src/extensions.test.tsx` (U16, create)
- `plugins/notifications/src/components/HomePageUnreadNotifications/HomePageUnreadNotifications.test.tsx` (U17, create)
- `plugins/notifications/README.md` (U18, edit)
- `docs/notifications/usage.md` (U19, edit)
- `.changeset/unread-notifications-home-card.md` (U20, create)
- `.changeset/home-react-card-extension-context.md` (U21, create)
