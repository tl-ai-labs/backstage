## Conventions

- Run constraint: do not look at upstream backstage/backstage#34869, its merge commit, or master, and do not base anything on that PR. Work only from this branch's code and the brief.
- Formatting is Prettier with @backstage/cli/config/prettier: single quotes, 2 spaces, trailing commas, arrow functions without parentheses around a single parameter, 80 columns. Never change ESLint, Prettier or TypeScript config.
- Every new .ts or .tsx file starts with the 15-line Apache 2.0 block reading `Copyright 2026 The Backstage Authors`. Existing headers stay as they are. Generated, config, CSS and markdown files carry no new header.
- plugins/notifications uses @backstage/ui, @remixicon/react and CSS modules (`*.module.css`, inside `@layer components`, BUI `--bui-*` tokens). New code there adds no Material UI import.
- plugins/home-react uses Material UI per-path imports only; its lint rule forbids top-level `@material-ui/*` imports.
- In plugins/notifications import `useTranslationRef` from '@backstage/core-plugin-api/alpha' and `notificationsTranslationRef` from the relative translation file. Text the card renders itself goes through `t()`.
- Import react-use as 'react-use/esm/<hook>'. Import from '@backstage/ui' and '@remixicon/react' by name. Exported public symbols carry a TSDoc release tag.
- Tests run on Jest through backstage-cli with describe/it, in `*.test.ts(x)` next to the source. Prefer fewer thorough tests with several assertions, `screen` and `findBy*` over `waitFor`, and never add a test id to the implementation (the `progress` test id that core-components already renders may be queried).
- Tests click with `fireEvent` from '@testing-library/react', because @testing-library/user-event is not a dev dependency of either package. Mocks are plain objects passed through `TestApiProvider` or the `apis` option; signals are a plain object with `subscribe` under `signalApiRef`, since no signal test helper exists.
- Docs follow docs/contribute/doc-style-guide.md: U.S. English, friendly and precise, bold for user interface elements, code style for file names, paths and identifiers. Nothing under docs/releases changes.
- Changesets are hand-written markdown in .changeset/, one per changed published package, `patch` for these 0.x packages, written for adopters, naming no internal symbols. Never use the changeset CLI.
- Never run `yarn build`, `yarn changesets version` or `yarn release`. Never touch plugins/signals*, plugins/home, plugins/notifications-backend, plugins/notifications-common, plugins/notifications-node, packages/app, packages/app-legacy or app-config.yaml.

## Decisions

- How many items the card lists: 5 items, the newest unread notifications (not 10 items; not a configurable count) — 5 matches the notifications page's default page size and fits a home page card without scrolling; a setting would add a config schema no requirement asks for.
- Polling interval when the signal API is not installed: 60 seconds (60000 ms) (not 15 or 30 seconds; not a configurable interval) — NFR-8 asks for light polling, and one fetch a minute per open home page keeps unread items reasonably fresh; the card does nothing else on that timer.
- What switches between signals and polling: `isSignalsAvailable` from `useSignal`, read once when the card mounts and held in a `useState` initial value, so the card either always polls or never polls for its whole life (not falling back to polling when the signal connection drops; not starting or stopping the timer at runtime) — Gate 1 decided the switch is whether the signal API is installed. `isSignalsAvailable` reports only that (`!!signals` in useSignal.ts), not the connection, and docs/notifications/usage.md states the consequence for a dropped connection.
- How the card serializes refreshes: The notifications page's existing pattern: a `refresh` state flag and one effect that calls `retry()` only when `!loading`; signals, the timer and mark-as-read only set the flag (not lodash throttle as on the page; not calling retry() directly from each trigger) — react-use's retry() is a no-op during a fetch, so direct calls lose requests; the flag gives no overlap plus one trailing fetch (NFR-8) with no timer of its own to release at unmount (FR-7), which a throttle would have.
- Where a failed mark-as-read is shown: A danger toast through `toastApiRef`; the item stays in the list (not an inline error inside the card; not the card's error state) — NotificationsTable and NotificationsSidebarItem already report this failure through toastApiRef, and the card's error state belongs to a failed fetch.
- How the card reaches apps: Only as the `home-page-widget:notifications/unread-notifications` extension in src/alpha.tsx; the component is not exported from src/index.ts or src/components/index.ts (not a public component export; not createCardExtension in src/plugin.ts) — The old frontend system is out of scope, so a public export would be API surface with no consumer.
- Where the deep-linked notification is shown: In a highlighted block above the table inside NotificationsTable, with its row actions, and removed from the rows passed to the table so it never shows twice (not prepending it to the table's data; not a separate one-row table) — Prepending loses a row: @material-table/core keeps its data manager on page 0 with paging on, and DataManager.pageData slices to pageSize, so a sixth row pushes the page's last notification out with no way to reach it.
- How the highlight is marked: `aria-current="true"` on the block plus a `.highlightedNotification` CSS module class using BUI info tokens (not material-table `rowStyle`; not a test id) — aria-current tells assistive technology which notification the link pointed to, and it gives tests a semantic query, as AGENTS.md asks.
- CardExtension without app context: A local `useOptionalApp` hook wrapping `useApp()` in try/catch, then `app?.getComponents().Progress ?? CoreProgress` (not swapping to Progress from @backstage/frontend-plugin-api; not a new optional hook in @backstage/core-plugin-api) — Gate 0 accepted this fallback. useApp runs all its hooks before it throws, so the hook order is stable, and packages/core-plugin-api/src/app/useApp.tsx uses the same try/catch shape in useOptionalApiHolder.
- Findings in the brief's Context section: All findings this plan relies on hold at this branch; no correction was needed — Checked against the files: plugins/home-react has no test file, no setupTests.ts and no testing dev dependency; plugins/notifications has no dependency on @backstage/plugin-home-react; useApp throws as stated; useTranslationRef needs the error and translation APIs; useSignal, the page's initial state and error panel, the three signal actions, and app-config.yaml's `packages: all` and `page:home.defaultConfig` are as reported.
- Dev dependencies the tests need: plugins/home-react gains @backstage/test-utils, @testing-library/dom, @testing-library/jest-dom and @testing-library/react; plugins/notifications gains @backstage/frontend-test-utils; all added through package.json edits and one `yarn install --no-immutable` (not adding @testing-library/user-event) — AC-8 needs the first set and a setupTests.ts. The card's title comes from CardExtension, so AC-1's title assertion must render the real widget, which needs createExtensionTester. Adds only, per NFR-6; `--no-immutable` keeps Yarn from refusing the lockfile change when CI is set.
- API report step: `yarn build:api-reports plugins/notifications plugins/home-react` as a tooling unit after the code it reports on (not the unscoped command) — The command's own path arguments limit it to the two changed packages, so the step, which the write contract does not govern, cannot rewrite a report outside the allowlist.
- Project check baseline: `test-suite` is expected to exit 1 with exactly the two known failures, "DatabaseNotificationsStore (POSTGRES_9) settings should save and load notification settings" and its POSTGRES_11 twin, in plugins/notifications-backend; the measured baseline is 914 passed, 2 failed, 916 total — AC-9 keeps them out of scope. Any other failure is this run's. The three checks are separate entries so `yarn tsc` and `yarn lint:all` still run (AC-12).

## Files of this change

- `plugins/home-react/package.json` (U01, edit)
- `plugins/notifications/package.json` (U02, edit)
- `plugins/home-react/src/extensions.tsx` (U04, edit)
- `plugins/home-react/src/setupTests.ts` (U05, create)
- `plugins/home-react/src/extensions.test.tsx` (U06, create)
- `plugins/notifications/src/translation.ts` (U07, edit)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx` (U08, create) — import: `import { UnreadNotificationsCard } from './UnreadNotificationsCard';`
  - `const UnreadNotificationsCard(): JSX.Element`
- `plugins/notifications/src/components/UnreadNotificationsCard/index.ts` (U09, create) — import: `import { UnreadNotificationsCard } from './components/UnreadNotificationsCard';`
  - `const UnreadNotificationsCard(): JSX.Element`
- `plugins/notifications/src/alpha.tsx` (U10, edit)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` (U11, edit)
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (U12, edit)
  - `type NotificationsTableProps(): gains optional `highlightedNotification?: Notification``
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` (U13, edit)
- `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.test.tsx` (U14, create)
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx` (U15, create)
- `plugins/notifications/src/alpha.test.tsx` (U16, create)
- `docs/notifications/usage.md` (U17, edit)
- `docs/getting-started/homepage.md` (U18, edit)
- `plugins/notifications/README.md` (U19, edit)
- `.changeset/unread-notifications-card.md` (U20, create)
- `.changeset/home-card-without-app-context.md` (U21, create)
