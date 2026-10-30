# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

In the new frontend system the plugin provides the `home-page-widget:notifications/unread-notifications`
extension, enabled by default, which appears in the home page **Add Widget** dialog
and can be placed through `page:home` `defaultConfig` with component `HomePageUnreadNotifications`:

```yaml
app:
  extensions:
    - page:home:
        config:
          defaultConfig:
            - component: HomePageUnreadNotifications
              column: 0
              row: 0
              width: 6
              height: 4
```

The card lists your five newest unread notifications, lets you mark each one as
read, refreshes live when `@backstage/plugin-signals` is installed and otherwise
checks for new notifications every 60 seconds. To turn it off:

```yaml
app:
  extensions:
    - home-page-widget:notifications/unread-notifications: false
```

## Linking to a notification

Opening `/notifications?id=<notification id>` opens the notifications page and
highlights that notification when it is in the displayed list. Opening the link
does not mark the notification as read.
