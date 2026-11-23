# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page unread notifications card

This plugin provides an **Unread notifications** home page card that lists the signed-in user's latest unread notifications, supports marking individual items as read, and links each item directly to the highlighted notification on the notifications page. When `@backstage/plugin-signals` is installed the card refreshes live; otherwise it automatically falls back to polling (every 60 seconds by default).

### Legacy frontend system

Import `HomePageUnreadNotifications` and place it in your home page layout:

```tsx
import { HomePageUnreadNotifications } from '@backstage/plugin-notifications';

// Inside your HomePage grid:
<HomePageUnreadNotifications limit={5} pollingIntervalMs={60000} />;
```

### New frontend system

The widget is registered automatically by the notifications plugin (`@backstage/plugin-notifications/alpha`) via `HomePageWidgetBlueprint` with the extension ID `home-page-widget:notifications/unread-notifications`, so it is available to your home page once the notifications plugin is installed.
