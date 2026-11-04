# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

You can add an unread notifications card to your Backstage home page to show the latest unread notifications for the signed-in user.

### New frontend system

In the new frontend system, the unread notifications widget is available as an extension of the notifications plugin:

```ts
import notificationsPlugin from '@backstage/plugin-notifications/alpha';

// The 'home-page-widget:notifications/unread-notifications' extension is registered automatically.
```

You can configure or place the widget using your `app-config.yaml`:

```yaml
app:
  extensions:
    - home-page-widget:notifications/unread-notifications:
        config:
          limit: 5
```

### Legacy frontend system

In the legacy frontend system, import and add `HomePageUnreadNotifications` to your home page:

```tsx
import { HomePageUnreadNotifications } from '@backstage/plugin-notifications';

export const homePage = (
  <CustomHomepageGrid>
    <HomePageUnreadNotifications limit={5} />
  </CustomHomepageGrid>
);
```
