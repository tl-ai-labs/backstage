# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

You can display the signed-in user's latest unread notifications on the home page. The card refreshes automatically when notification signals arrive, and falls back to polling when the signals plugin is not available.

### New frontend system

The unread notifications widget is registered automatically by the notifications plugin (`home-page-widget:notifications/unread-notifications`) and will appear on the home page when `@backstage/plugin-home` is installed.

### Legacy frontend system

Import `UnreadNotificationsCard` from `@backstage/plugin-notifications` and add it to your home page layout:

```tsx
import { UnreadNotificationsCard } from '@backstage/plugin-notifications';

// Inside your HomePage grid:
<Grid item xs={12} md={6}>
  <UnreadNotificationsCard limit={5} pollingIntervalMs={60000} />
</Grid>;
```

Both `limit` (defaults to `5`) and `pollingIntervalMs` (defaults to `60000`) are optional.

## Deep-linking to notifications

Each item in the unread notifications card links to `/notifications?id=<notificationId>`. When opened with an `id` query parameter, the notifications page highlights and scrolls to that notification, or fetches and pins it at the top of the table if it is not in the currently loaded list.

