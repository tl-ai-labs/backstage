## Conventions

- Every new .ts, .tsx, and .css source file starts with the 15-line Backstage Apache-2.0 block header with 'Copyright 2026 The Backstage Authors'; existing files keep their original copyright year unchanged.
- Use ESM named exports (except alpha.tsx default export for createFrontendPlugin); keep barrel index.ts files to re-exports only.
- In plugins/notifications, use @backstage/ui components (Flex, Text, ButtonIcon, Tooltip, TooltipTrigger), @backstage/core-components (Link, Progress, ResponseErrorPanel), @remixicon/react icons, CSS Modules wrapped in @layer components using active --bui-* tokens (never deprecated tokens like --bui-bg-info or --bui-bg-solid), and useTranslationRef(notificationsTranslationRef) from @backstage/core-plugin-api/alpha.
- In jsdom unit tests, use describe/it with screen and findBy* queries from @testing-library/react, TestApiProvider / renderInTestApp from @backstage/test-utils, and never add data-testid attributes to implementation files.
- Follow docs/contribute/doc-style-guide.md in Markdown and changesets: U.S. English, sentence-case headings, present tense, active voice, backticks for package/file/code names, no Latin abbreviations (e.g., i.e.), no words like 'new', 'currently', 'just', 'simply', or 'easily', and no internal symbol names in changesets.

## Decisions

- item limit: Default UnreadNotificationsCard item limit to 5 (DEFAULT_LIMIT = 5, configurable via optional limit?: number prop on UnreadNotificationsCardProps), fetching via notificationsApi.getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' }). (not Default limit of 10; not Unbounded fetch without limit; not Hard-coded non-configurable limit) — Matches NotificationsPage.tsx line 88 (pageSize defaults to 5) and lines 85 and 91 (unreadOnly = true and SortByOptions.newest.sortBy).
- polling interval: Default polling fallback interval to 30000 ms (DEFAULT_POLLING_INTERVAL_MS = 30_000, configurable via optional pollingIntervalMs?: number prop on UnreadNotificationsCardProps) when isSignalsAvailable is false, and throttle signal-triggered refreshes with lodash/throttle using ThrottleDelayMs = 2000. (not 60000 ms polling interval; not Polling while signals are available; not Unthrottled signal refresh) — Follows NotificationsSideBarItem.tsx line 176 (TODO noting no polling interval existed yet when signals are unavailable) and NotificationsPage.tsx lines 54 and 143-159 (ThrottleDelayMs = 2000 with lodash/throttle for signal refreshes).
- empty state: Display 'No records to display' (via unreadNotificationsCard.emptyMessage in notificationsTranslationRef) when zero unread notifications are returned, while keeping the 'View all notifications' link (unreadNotificationsCard.viewAll) to useRouteRef(rootRouteRef)() (/notifications) visible. (not Hard-coded English empty string not in translation.ts; not Hiding the link to /notifications when unread list is empty) — Follows translation.ts line 73 (table.emptyMessage: 'No records to display') and NotificationsSideBarItem.tsx line 175 (resolving /notifications via useRouteRef(rootRouteRef)()) so users can still reach read and saved notifications.
- deep-link target not loaded: Read ?id=<notificationId> via useSearchParams() in NotificationsPage.tsx and pass highlightedId?: string to NotificationsTable to highlight the matching row when present in the loaded table under default filters (unreadOnly = true, pageSize = 5, newest-first), without calling getNotification(id) or relaxing filters. (not Fetching a separate getNotification(id) request on NotificationsPage; not Overriding unreadOnly filter to undefined when ?id= is present) — Matches NotificationsPage.tsx lines 85-128 (single Promise.all fetch with default unreadOnly = true, pageSize = 5, newest-first, which matches the card's query so any item clicked from UnreadNotificationsCard is in the loaded page).
- mark-as-read error reporting: Report updateNotifications({ ids: [id], read: true }) failures through useApi(toastApiRef).post({ title: t('unreadNotificationsCard.errorMarkAsRead'), status: 'danger' }) with message 'Failed to mark notification as read'. (not Replacing the card content with ResponseErrorPanel on mark-as-read failure; not Silently swallowing updateNotifications errors) — Matches the error reporting convention in NotificationsTable.tsx lines 84 and 139-142 and NotificationsSideBarItem.tsx lines 102, 173, and 225-228.
- highlighted row styling in NotificationsTable: Add optional highlightedId?: string to NotificationsTableProps and apply className={notification.id === highlightedId ? styles.highlightedRow : undefined} to the row Flex in NotificationsTable.tsx, with .highlightedRow in NotificationsTable.module.css using var(--bui-bg-neutral-2), var(--bui-radius-2), and var(--bui-space-1)/var(--bui-space-2). (not Using deprecated BUI tokens such as --bui-bg-info or --bui-bg-solid; not Adding an unscoped class or data-highlighted attribute alongside styles.highlightedRow) — Matches NotificationsTable.module.css styling conventions, satisfies @backstage/no-deprecated-bui-tokens, and works directly in Jest where CSS modules are mapped through identity-obj-proxy.
- CardExtension app-context independence and test target: Import Progress directly from @backstage/core-components in plugins/home-react/src/extensions.tsx and remove useApp() / app.getComponents() from CardExtension; test CardExtension directly in plugins/home-react/src/extensions.test.tsx using @testing-library/react render and TestApiProvider with errorApiRef and translationApiRef. (not Testing createCardExtension without AppContext (which calls useApp() inside @backstage/core-plugin-api createReactExtension); not Calling useApp() inside a try/catch block in CardExtension) — HomePageWidgetBlueprint renders CardExtension directly, @backstage/core-plugin-api is outside the write contract, and importing Progress from @backstage/core-components avoids conditional hook calls.

## Files of this change

- `plugins/notifications/package.json` (U01, edit)
- `plugins/home-react/package.json` (U02, edit)
- `plugins/home-react/src/extensions.tsx` (U04, edit)
  - `function CardExtension(props: CardExtensionProps<T>): JSX.Element`
- `plugins/notifications/src/translation.ts` (U05, edit)
  - `const notificationsTranslationRef(): TranslationRef`
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` (U06, edit)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (U07, edit)
  - `type NotificationsTableProps(): object`
  - `function NotificationsTable(props: NotificationsTableProps): JSX.Element`
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` (U08, edit)
  - `function NotificationsPage(props: NotificationsPageProps): JSX.Element`
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx` (U09, create) — import: `import { UnreadNotificationsCard, UnreadNotificationsCardProps } from '../UnreadNotificationsCard';`
  - `type UnreadNotificationsCardProps(): object`
  - `function UnreadNotificationsCard(props: UnreadNotificationsCardProps): JSX.Element`
- `plugins/notifications/src/components/UnreadNotificationsCard/index.ts` (U10, create) — import: `import { UnreadNotificationsCard, UnreadNotificationsCardProps } from './components/UnreadNotificationsCard';`
  - `function UnreadNotificationsCard(props: UnreadNotificationsCardProps): JSX.Element`
  - `type UnreadNotificationsCardProps(): object`
- `plugins/notifications/src/alpha.tsx` (U11, edit)
  - `const default(): FrontendPlugin`
- `plugins/home-react/src/extensions.test.tsx` (U14, create)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.test.tsx` (U15, create)
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx` (U16, create)
- `plugins/notifications/README.md` (U17, edit)
- `docs/notifications/usage.md` (U18, edit)
- `.changeset/notifications-unread-home-card.md` (U19, create)
- `.changeset/home-react-card-without-app-context.md` (U20, create)
