# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

The plugin provides a home page card that lists the signed-in user's latest unread notifications, newest first. Each notification has a mark-as-read button and a link that opens the notification on the notifications page and highlights it.

### New frontend system

The `home-page-widget:notifications/unread-notifications` widget is enabled by default. When the notifications and home plugins are installed, the widget is provided to the home page widgets. It shows 5 items and, when signals are not available, refreshes every 60 seconds.

To disable the widget, set its extension ID to `false` in your `app-config.yaml` file:

```yaml
app:
  extensions:
    - home-page-widget:notifications/unread-notifications: false
```

### Old frontend system

Import `UnreadNotificationsCard` from `@backstage/plugin-notifications` and render it on your home page:

```tsx
import { UnreadNotificationsCard } from '@backstage/plugin-notifications';

<UnreadNotificationsCard limit={10} pollingIntervalMs={30000} />;
```

The card accepts the following props:

- `limit`: The maximum number of notifications to show. Defaults to `5`.
- `pollingIntervalMs`: How often, in milliseconds, the card refetches when signals are not available. Defaults to `60000`.

### Live refresh

When the `@backstage/plugin-signals` package is installed, the card refreshes whenever your notifications change. Without signals, the card refetches every polling interval.
