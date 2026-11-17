# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Unread notifications card for the home page

The plugin provides an "Unread notifications" card for the home page. It lists the latest unread notifications with a mark as read action, links each one to the highlighted notification on the notifications page, and updates live when signals are installed. Without signals, it refreshes every 60 seconds.

### New frontend system

The card is registered as a home page widget by the plugin. Once the plugin and the home plugin are installed, add the "Unread notifications" widget to your home page layout.

### Old frontend system

Add the card to your home page:

```tsx
import { HomePageUnreadNotificationsCard } from '@backstage/plugin-notifications';

<Grid item xs={12} md={6}>
  <HomePageUnreadNotificationsCard />
</Grid>;
```

If you want to use the card on its own, without the home page card wrapper, you can use `NotificationsHomePageCard` instead. It accepts a `limit` for the number of notifications shown, which defaults to 5, and a `pollIntervalMs` for the refresh interval used when signals are not available, which defaults to 60000.

### Linking to a notification

The notifications page highlights the notification whose ID is given in the `id` query parameter, for example `/notifications?id=<notification-id>`.
